// ==========================================
// DEAL ANATOMY & PLAYBOOKS (Snap-to-Grid Engine)
// ==========================================

let currentPlaybook = null;
let playbookNetwork = null;
let pbNodes = new vis.DataSet();
let pbEdges = new vis.DataSet();

window.renderPlaybookList = function() {
    const container = document.getElementById("playbookList");
    if (!container) return;
    container.innerHTML = "";

    const playbooks = Object.keys(db.playbooks || {}).sort((a, b) => a.localeCompare(b));
    
    if (playbooks.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic mt-2">No playbooks created yet. Click + Add above.</p>`;
        document.getElementById('playbookCanvas').style.display = 'none';
        document.getElementById('activePlaybookLabel').innerText = "No Playbook Selected";
        return;
    }

    document.getElementById('playbookCanvas').style.display = 'block';

    if (!currentPlaybook || !db.playbooks[currentPlaybook]) {
        currentPlaybook = playbooks[0];
    }

    playbooks.forEach(name => {
        const btn = document.createElement("button");
        const isActive = name === currentPlaybook;
        btn.className = `w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition flex justify-between items-center ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`;
        btn.innerHTML = `<span class="truncate">${name}</span> <span onclick="managePlaybook('${name.replace(/'/g, "\\'")}', event)" class="text-xs opacity-50 hover:opacity-100 shrink-0 ml-2">⚙️</span>`;
        btn.onclick = (e) => {
            if (e.target.closest('span[onclick]')) return;
            currentPlaybook = name;
            renderPlaybookList();
            if (window.innerWidth < 768) document.getElementById('playbooksSidebar').classList.add('-translate-x-full');
        };
        container.appendChild(btn);
    });

    renderPlaybookGraph(currentPlaybook);
};

window.addPlaybook = function() {
    const name = prompt("Enter Playbook Name (e.g., Private M&A):");
    if (name && !db.playbooks[name]) {
        db.playbooks[name] = { nodes: [], edges: [] };
        currentPlaybook = name;
        saveDatabase();
        renderPlaybookList();
    }
};

window.managePlaybook = function(oldName, event) {
    event.stopPropagation();
    const action = prompt(`Manage Playbook: "${oldName}"\n\nType a NEW NAME below to rename it, or type DELETE to remove this playbook entirely.`);
    if (!action) return;
    const input = action.trim();
    if (input.toUpperCase() === "DELETE") {
        if (confirm(`Delete the "${oldName}" playbook?`)) {
            delete db.playbooks[oldName];
            currentPlaybook = Object.keys(db.playbooks)[0] || null;
            saveDatabase(); 
            renderPlaybookList();
        }
    } else if (input !== oldName && !db.playbooks[input]) {
        db.playbooks[input] = db.playbooks[oldName];
        delete db.playbooks[oldName];
        currentPlaybook = input;
        saveDatabase(); 
        renderPlaybookList();
    }
};

// --- SILENT BACKGROUND LAYOUT CALCULATOR ---
window.refreshPlaybookLayout = function() {
    if (!currentPlaybook || !db.playbooks[currentPlaybook]) return;
    
    let nodesMap = new Map();
    pbNodes.forEach(n => nodesMap.set(n.id, { ...n }));
    let edgesList = pbEdges.get();

    // 1. CALCULATE TOP-DOWN ROW LEVELS (BFS fallback for unassigned nodes)
    let adj = new Map();
    let inDegree = new Map();
    nodesMap.forEach((_, id) => { adj.set(id, []); inDegree.set(id, 0); });
    
    edgesList.forEach(e => {
        if (adj.has(e.from)) adj.get(e.from).push(e.to);
        if (inDegree.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    });

    let queue = [];
    nodesMap.forEach((node, id) => {
        if (inDegree.get(id) === 0) {
            node._autoLevel = 1;
            queue.push(id);
        }
    });

    if (queue.length === 0 && nodesMap.size > 0) {
         let first = nodesMap.keys().next().value;
         nodesMap.get(first)._autoLevel = 1;
         queue.push(first);
    }

    while (queue.length > 0) {
        let currId = queue.shift();
        let currNode = nodesMap.get(currId);
        let children = adj.get(currId) || [];
        children.forEach(childId => {
            let childNode = nodesMap.get(childId);
            let nextLevel = (currNode._autoLevel !== undefined ? currNode._autoLevel : 1) + 1;
            if (childNode._autoLevel === undefined || nextLevel > childNode._autoLevel) {
                childNode._autoLevel = nextLevel;
                queue.push(childId);
            }
        });
    }

    // 2. APPLY GRID COORDINATES
    let updates = [];
    let levelXCounters = {};

    nodesMap.forEach((node) => {
        // Obey user overrides, otherwise use BFS auto-level
        let newLevel = (node.manualLevel !== undefined && node.manualLevel !== null) 
                        ? parseInt(node.manualLevel, 10) 
                        : (node._autoLevel !== undefined ? node._autoLevel : 1);
        
        let newY = newLevel * 150;
        let newX = node.x;

        // If it's a legacy node without an X coordinate, space them out safely
        if (newX === undefined || newX === null) {
            if (levelXCounters[newLevel] === undefined) {
                levelXCounters[newLevel] = 0;
            } else {
                levelXCounters[newLevel] += 260; 
            }
            newX = levelXCounters[newLevel];
        }
        
        // Rigid 260px column grid snap
        newX = Math.round(newX / 260) * 260; 

        updates.push({ id: node.id, level: newLevel, manualLevel: newLevel, x: newX, y: newY });
    });

    pbNodes.update(updates);
};

window.renderPlaybookGraph = function(playbookName) {
    document.getElementById('activePlaybookLabel').innerText = playbookName;
    const dataObj = db.playbooks[playbookName] || { nodes: [], edges: [] };
    
    pbNodes.clear();
    pbEdges.clear();
    
    if (dataObj.nodes) pbNodes.add(dataObj.nodes);
    if (dataObj.edges) pbEdges.add(dataObj.edges);

    // Initial silent layout alignment
    window.refreshPlaybookLayout();

    const container = document.getElementById('playbookCanvas');
    const data = { nodes: pbNodes, edges: pbEdges };
    
    const options = {
        layout: { hierarchical: false }, 
        physics: { enabled: false }, 
        // DISABLED DEFAULT NAVIGATION BUTTONS TO FIX UI OVERLAP
        interaction: { hover: true, navigationButtons: false, keyboard: false, dragNodes: true },
        manipulation: {
            enabled: true,
            initiallyActive: true,
            addNode: function(nodeData, callback) {
                nodeData.label = "New Concept";
                nodeData.shape = "box";
                nodeData.color = { background: '#4f46e5', border: '#3730a3', highlight: { background: '#6366f1', border: '#4338ca' } };
                nodeData.font = { color: 'white', size: 14, face: 'Inter, sans-serif' };
                nodeData.timing = "";
                nodeData.advantages = "";
                nodeData.disadvantages = "";
                
                // INFER ROW & COLUMN FROM MOUSE DROP COORDINATES
                let clickedRow = Math.max(1, Math.round((nodeData.y || 150) / 150));
                let targetY = clickedRow * 150;
                let targetX = Math.round((nodeData.x || 0) / 260) * 260;
                
                // OVERLAP PREVENTION: Bump to the right if a node is already in this cell
                let occupied = true;
                while (occupied) {
                    occupied = false;
                    pbNodes.forEach(n => {
                        if (n.y === targetY && n.x === targetX && n.id !== nodeData.id) occupied = true;
                    });
                    if (occupied) targetX += 260;
                }

                nodeData.manualLevel = clickedRow;
                nodeData.level = clickedRow; 
                nodeData.y = targetY;
                nodeData.x = targetX;

                callback(nodeData); 
                syncPlaybookToDb();
                setTimeout(() => openPlaybookDrawer(nodeData.id), 50);
            },
            editNode: function(nodeData, callback) {
                openPlaybookDrawer(nodeData.id);
                callback(nodeData); 
            },
            addEdge: function(edgeData, callback) {
                if (edgeData.from !== edgeData.to) {
                    edgeData.arrows = 'to';
                    edgeData.color = { color: '#94a3b8' };
                    callback(edgeData); 
                    syncPlaybookToDb();
                    window.refreshPlaybookLayout(); // Fast background refresh (No recentering)
                    
                    // Continuous Edge Drawing Mode
                    setTimeout(() => {
                        if (playbookNetwork) playbookNetwork.addEdgeMode();
                    }, 50);
                }
            },
            deleteNode: function(nodeData, callback) {
                callback(nodeData);
                syncPlaybookToDb();
                closePlaybookDrawer();
                window.refreshPlaybookLayout();
            },
            deleteEdge: function(edgeData, callback) {
                callback(edgeData);
                syncPlaybookToDb();
                window.refreshPlaybookLayout();
            }
        },
        nodes: {
            shape: 'box',
            margin: { top: 12, bottom: 12, left: 16, right: 16 },
            color: { background: '#4f46e5', border: '#3730a3', highlight: { background: '#6366f1', border: '#4338ca' } },
            font: { color: 'white', size: 14, face: 'Inter, sans-serif' },
            shadow: true,
            borderWidth: 2
        },
        edges: {
            width: 2,
            smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 }
        }
    };

    if (playbookNetwork !== null) {
        playbookNetwork.destroy();
        playbookNetwork = null;
    }
    
    playbookNetwork = new vis.Network(container, data, options);
    
    // DRAG-AND-DROP ROW SNAPPING
    playbookNetwork.on("dragEnd", function (params) {
        if (params.nodes.length > 0) {
            const positions = playbookNetwork.getPositions(params.nodes);
            const updates = [];
            
            params.nodes.forEach(nodeId => {
                const node = pbNodes.get(nodeId);
                if (node && positions[nodeId]) {
                    // Read physical drop coordinates
                    const rawX = positions[nodeId].x;
                    const rawY = positions[nodeId].y;

                    // Calculate nearest Row & Column
                    const newRow = Math.max(1, Math.round(rawY / 150));
                    const targetY = newRow * 150;
                    const targetX = Math.round(rawX / 260) * 260;

                    updates.push({ 
                        id: nodeId, 
                        x: targetX, 
                        y: targetY,
                        manualLevel: newRow,
                        level: newRow
                    });
                }
            });
            if (updates.length > 0) {
                pbNodes.update(updates);
                syncPlaybookToDb();
            }
        }
    });

    playbookNetwork.on("doubleClick", function (params) {
        if (params.nodes.length > 0) openPlaybookDrawer(params.nodes[0]);
    });
    
    playbookNetwork.once("afterDrawing", function() { playbookNetwork.fit(); });
};

function syncPlaybookToDb() {
    if (!currentPlaybook) return;
    const cleanNodes = pbNodes.get().map(n => {
        let clean = { ...n };
        delete clean._autoLevel; 
        return clean;
    });
    
    db.playbooks[currentPlaybook] = {
        nodes: cleanNodes,
        edges: pbEdges.get()
    };
    saveDatabase();
}

window.openPlaybookDrawer = function(nodeId) {
    const node = pbNodes.get(nodeId);
    if (!node) return;

    document.getElementById('pbNodeId').value = node.id;
    document.getElementById('pbNodeTitle').innerText = node.label || "Unnamed Node";
    document.getElementById('pbNodeLabelInput').value = node.label || "";
    document.getElementById('pbNodeLevel').value = node.manualLevel !== undefined ? node.manualLevel : "";
    document.getElementById('pbNodeTiming').value = node.timing || "";
    document.getElementById('pbNodeAdv').value = node.advantages || "";
    document.getElementById('pbNodeDisadv').value = node.disadvantages || "";

    document.getElementById('playbookDrawer').classList.remove('translate-x-full');
};

window.closePlaybookDrawer = function() {
    document.getElementById('playbookDrawer').classList.add('translate-x-full');
    if (playbookNetwork) playbookNetwork.unselectAll();
};

window.liveUpdateNodeLabel = function() {
    const nodeId = document.getElementById('pbNodeId').value;
    const newLabel = document.getElementById('pbNodeLabelInput').value;
    document.getElementById('pbNodeTitle').innerText = newLabel || "Unnamed Node";
    
    if (nodeId) {
        pbNodes.update({ id: nodeId, label: newLabel });
    }
};

window.saveNodeData = function() {
    const nodeId = document.getElementById('pbNodeId').value;
    if (!nodeId) return;

    const label = document.getElementById('pbNodeLabelInput').value;
    const levelStr = document.getElementById('pbNodeLevel').value;
    
    // Fall back to null if the user clears the box (so BFS can take over)
    const newManualLevel = levelStr !== "" ? parseInt(levelStr, 10) : null;

    pbNodes.update({
        id: nodeId,
        label: label,
        timing: document.getElementById('pbNodeTiming').value,
        advantages: document.getElementById('pbNodeAdv').value,
        disadvantages: document.getElementById('pbNodeDisadv').value,
        manualLevel: newManualLevel,
        level: newManualLevel
    });

    syncPlaybookToDb();
    window.refreshPlaybookLayout(); // Silent coordinate update
    closePlaybookDrawer();
    
    if(typeof showToast === 'function') showToast("Node properties saved.", "success");
};

// Custom Programmatic Zoom Controls
window.zoomPlaybook = function(direction) {
    if (!playbookNetwork) return;
    const currentScale = playbookNetwork.getScale();
    const newScale = direction === 'in' ? currentScale * 1.3 : currentScale / 1.3;
    playbookNetwork.moveTo({
        scale: newScale,
        animation: { duration: 300, easingFunction: "easeInOutQuad" }
    });
};

window.resetPlaybookView = function() {
    if (playbookNetwork) playbookNetwork.fit({ animation: { duration: 800, easingFunction: "easeInOutQuad" } });
};

// --- KMS EXPORT INTEGRATION ---
window.exportPlaybookToConcept = function() {
    if (!currentPlaybook || !playbookNetwork) return;
    
    playbookNetwork.fit({ animation: false });
    
    setTimeout(() => {
        const canvas = document.querySelector('#playbookCanvas canvas');
        if (!canvas) return alert("Canvas not found.");
        
        const imgData = canvas.toDataURL("image/png");
        
        const action = prompt("Export Flowchart to KMS:\n\nType 'NEW' to create a new concept record.\n\nOR type the EXACT title of an existing concept to attach this diagram to it:");
            
        if (!action) return;
        
        if (action.trim().toUpperCase() === 'NEW') {
            switchState('CONCEPTS');
            const sidebar = document.getElementById('conceptLogSidebar');
            sidebar.classList.remove('-translate-x-full');
            
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('md:hidden');
                sidebar.classList.add('md:flex');
            }
            
            document.getElementById('conceptTitle').value = `${currentPlaybook} Flowchart`;
            document.getElementById('conceptSubTag').value = "Deal Anatomy";
            
            if(typeof diagramTempBase64 !== 'undefined') diagramTempBase64 = imgData;
            else window.diagramTempBase64 = imgData;
            
            const preview = document.getElementById("newConceptDiagramPreview");
            if (preview) {
                preview.src = imgData;
                preview.classList.remove("hidden");
                const label = document.getElementById("newConceptDiagramLabel");
                if(label) label.innerText = "Replace Diagram";
            }
            
            if(typeof showToast === 'function') showToast("Playbook captured! You can now log it.", "success");
        } else {
            const targetTitle = action.trim().toLowerCase();
            const targetIndex = db.concepts.findIndex(c => (c.title || "").toLowerCase() === targetTitle);
            
            if (targetIndex > -1) {
                db.concepts[targetIndex].diagram = imgData;
                saveDatabase();
                if(typeof showToast === 'function') showToast(`Successfully attached to "${db.concepts[targetIndex].title}"`, "success");
                if(appState === 'CONCEPTS' && typeof renderConcepts === 'function') renderConcepts();
            } else {
                alert(`Could not find a concept named "${action.trim()}". Please check your spelling.`);
            }
        }
    }, 500);
};