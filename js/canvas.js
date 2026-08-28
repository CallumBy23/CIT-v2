// NATIVE HTML5 DRAWING PAD ENGINE
// ==========================================
function initCanvasEvents() {
    canvas = document.getElementById("diagramCanvas");
    ctx = canvas.getContext("2d");

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerout", stopDrawing);
}

function openDrawingPad(targetIndex) {
    drawingTarget = targetIndex;
    const modal = document.getElementById("drawingModalContainer");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    
    const dpr = window.devicePixelRatio || 1;
    const wrapper = document.getElementById("zoomWrapper");
    
    zoomLevel = 1;
    wrapper.style.transform = `scale(${zoomLevel})`;
    wrapper.style.width = logicalCanvasWidth + "px";
    wrapper.style.height = logicalCanvasHeight + "px";

    canvas.width = logicalCanvasWidth * dpr;
    canvas.height = logicalCanvasHeight * dpr;
    canvas.style.width = logicalCanvasWidth + "px";
    canvas.style.height = logicalCanvasHeight + "px";

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
    setDrawMode('pen');
    undoStack = []; 

    let existingBase64 = "";
    if (targetIndex === "new" && diagramTempBase64) existingBase64 = diagramTempBase64;
    else if (targetIndex !== "new" && db.concepts[targetIndex].diagram) existingBase64 = db.concepts[targetIndex].diagram;

    if (existingBase64) {
        const img = new Image();
        img.onload = () => { 
            ctx.drawImage(img, 0, 0, logicalCanvasWidth, logicalCanvasHeight); 
            saveState(); 
        };
        img.src = existingBase64;
    } else {
        saveState();
    }
}

function closeDrawingPad() {
    document.getElementById("drawingModalContainer").classList.add("hidden");
    document.getElementById("drawingModalContainer").classList.remove("flex");
}

function setDrawMode(mode) {
    drawMode = mode;
    const btnPen = document.getElementById("btnToolPen");
    const btnEraser = document.getElementById("btnToolEraser");
    if (mode === 'pen') {
        btnPen.className = "bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-xs md:text-sm shadow-sm transition shrink-0";
        btnEraser.className = "bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-xs md:text-sm transition shrink-0";
    } else {
        btnEraser.className = "bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-xs md:text-sm shadow-sm transition shrink-0";
        btnPen.className = "bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-xs md:text-sm transition shrink-0";
    }
}

function zoomCanvas(amount) {
    zoomLevel += amount;
    if (zoomLevel < 0.5) zoomLevel = 0.5;
    if (zoomLevel > 3.0) zoomLevel = 3.0;
    document.getElementById("zoomWrapper").style.transform = `scale(${zoomLevel})`;
}

function saveState() {
    if(undoStack.length >= 30) undoStack.shift();
    undoStack.push(canvas.toDataURL("image/png"));
}

function undoDraw() {
    if(undoStack.length > 1) {
        undoStack.pop(); 
        const prevState = undoStack[undoStack.length - 1];
        const img = new Image();
        img.onload = () => {
            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
            ctx.drawImage(img, 0, 0, logicalCanvasWidth, logicalCanvasHeight);
        };
        img.src = prevState;
    }
}

function clearCanvas() {
    if(confirm("Clear entire diagram?")) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
        saveState();
    }
}

function uploadCanvasBackground(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = () => {
            ctx.globalCompositeOperation = "source-over";
            const scale = Math.min(logicalCanvasWidth / img.width, logicalCanvasHeight / img.height);
            const x = (logicalCanvasWidth / 2) - (img.width / 2) * scale;
            const y = (logicalCanvasHeight / 2) - (img.height / 2) * scale;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            saveState();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function startDrawing(e) {
    // Touch support added alongside stylus and mouse
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse' && e.pointerType !== 'touch') return; 
    e.preventDefault();
    isDrawing = true;
    
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX - rect.left) / zoomLevel;
    lastY = (e.clientY - rect.top) / zoomLevel;
}

function draw(e) {
    if (!isDrawing) return;
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse' && e.pointerType !== 'touch') return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoomLevel;
    const currentY = (e.clientY - rect.top) / zoomLevel;

    const pressure = e.pressure !== undefined ? e.pressure : 0.5;
    const baseWidth = drawMode === 'eraser' ? 30 : document.getElementById("drawLineWidth").value;
    
    ctx.lineWidth = drawMode === 'eraser' ? baseWidth : baseWidth * (pressure * 2.0); 
    ctx.globalCompositeOperation = drawMode === 'eraser' ? "destination-out" : "source-over";
    ctx.strokeStyle = drawMode === 'eraser' ? "rgba(0,0,0,1)" : document.getElementById("drawColorPicker").value;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    
    const midX = lastX + (currentX - lastX) / 2;
    const midY = lastY + (currentY - lastY) / 2;
    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
}

function stopDrawing(e) {
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse' && e.pointerType !== 'touch') return;
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

function saveDrawing() {
    const base64Str = canvas.toDataURL("image/png");
    if (drawingTarget === "new") {
        diagramTempBase64 = base64Str;
        document.getElementById("newConceptDiagramPreview").src = base64Str;
        document.getElementById("newConceptDiagramPreview").classList.remove("hidden");
        document.getElementById("newConceptDiagramLabel").innerText = "Edit Diagram";
    } else {
        db.concepts[drawingTarget].diagram = base64Str;
        document.getElementById("editConceptDiagramPreview").src = base64Str;
        document.getElementById("editConceptDiagramPreview").classList.remove("hidden");
        document.getElementById("editConceptDiagramLabel").innerText = "Edit Diagram";
    }
    closeDrawingPad();
}