// ==========================================
// DEAL ANATOMY & PLAYBOOKS (Snap-to-Row Engine)
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

window.renderPlaybookGraph = function(playbookName) {
    document.getElementById('activePlaybookLabel').innerText = playbookName;
    const dataObj = db.playbooks[playbookName] || { nodes: [], edges: [] };
    
    pbNodes.clear();
    pbEdges.clear();
    
    let nodesMap = new Map();
    (dataObj.nodes || []).forEach(n => {
        nodesMap.set(n.id, { ...n });
    });

    let edgesList = dataObj.edges || [];

    // --- 1. CALCULATE TOP-DOWN ROW LEVELS (BFS) ---
    let adj = new Map();
    let inDegree = new Map();
    nodesMap.forEach((_, id) => {
        adj.set(id, []);
        inDegree.set(id, 0);
    });

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

    // --- 2. ANTI-OVERLAP X-COORDINATE SCANNER ---
    let levelXCounters = {};
    nodesMap.forEach(n => {
        if (n.x !== undefined && n.x !== null) {
            const lvl = n.manualLevel !== undefined ? parseInt(n.manualLevel, 10) : (n._autoLevel || 1);
            if (levelXCounters[lvl] === undefined || n.x > levelXCounters[lvl]) {
                levelXCounters[lvl] = n.x;
            }
        }
    });

    // --- 3. APPLY RIGID GRID SNAPPING ---
    let finalNodes = [];
    nodesMap.forEach((node) => {
        if (node.manualLevel !== undefined && node.manualLevel !== "" && node.manualLevel !== null) {
            node.level = parseInt(node.manualLevel, 10);
        } else {
            node.level = node._autoLevel !== undefined ? node._autoLevel : 1;
        }
        
        node.y = node.level * 150;

        if (node.x === undefined || node.x === null) {
            if (levelXCounters[node.level] === undefined) {
                levelXCounters[node.level] = 0;
            } else {
                levelXCounters[node.level] += 260; 
            }
            node.x = levelXCounters[node.level];
        }

        // Force all existing nodes onto the invisible 260px column grid
        node.x = Math.round(node.x / 260) * 260;

        finalNodes.push(node);
    });

    pbNodes.add(finalNodes);
    if (dataObj.edges) pbEdges.add(dataObj.edges);

    const container = document.getElementById('playbookCanvas');
    const data = { nodes: pbNodes, edges: pbEdges };
    
    const options = {
        layout: { hierarchical: false }, 
        physics: { enabled: false }, 
        interaction: { hover: true, navigationButtons: true, keyboard: false, dragNodes: true },
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
                
                let maxLvl = 1;
                pbNodes.forEach(n => { 
                    const lvl = n.level || 1;
                    if (lvl > maxLvl) maxLvl = lvl; 
                });
                
                nodeData.manualLevel = maxLvl;
                nodeData.level = maxLvl; 
                nodeData.y = maxLvl * 150;
                
                let maxX = 0;
                pbNodes.forEach(n => {
                    if ((n.level === maxLvl) && n.x > maxX) maxX = n.x;
                });
                // Spawn explicitly on the invisible column grid
                nodeData.x = pbNodes.length === 0 ? 0 : (Math.round(maxX / 260) * 260) + 260;

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
                    setTimeout(() => renderPlaybookGraph(currentPlaybook), 50);
                }
            },
            deleteNode: function(nodeData, callback) {
                callback(nodeData);
                syncPlaybookToDb();
                closePlaybookDrawer();
            },
            deleteEdge: function(edgeData, callback) {
                callback(edgeData);
                syncPlaybookToDb();
                setTimeout(() => renderPlaybookGraph(currentPlaybook), 50);
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
    
    // STRICT GRID SNAPPING ON DRAG END
    playbookNetwork.on("dragEnd", function (params) {
        if (params.nodes.length > 0) {
            const positions = playbookNetwork.getPositions(params.nodes);
            const updates = [];
            params.nodes.forEach(nodeId => {
                const node = pbNodes.get(nodeId);
                if (node && positions[nodeId]) {
                    const targetY = (node.level || 1) * 150;
                    
                    // Snap X coordinate to rigid 260px columns
                    const rawX = positions[nodeId].x;
                    const targetX = Math.round(rawX / 260) * 260;

                    updates.push({
                        id: nodeId,
                        x: targetX, 
                        y: targetY              
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
    const timing = document.getElementById('pbNodeTiming').value;
    const advantages = document.getElementById('pbNodeAdv').value;
    const disadvantages = document.getElementById('pbNodeDisadv').value;

    const rawNodes = db.playbooks[currentPlaybook].nodes;
    const nodeIndex = rawNodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex > -1) {
        rawNodes[nodeIndex].label = label;
        rawNodes[nodeIndex].timing = timing;
        rawNodes[nodeIndex].advantages = advantages;
        rawNodes[nodeIndex].disadvantages = disadvantages;
        if (levelStr !== "") {
            rawNodes[nodeIndex].manualLevel = parseInt(levelStr, 10);
            rawNodes[nodeIndex].level = rawNodes[nodeIndex].manualLevel;
        } else {
            delete rawNodes[nodeIndex].manualLevel;
        }
    }

    saveDatabase();
    renderPlaybookGraph(currentPlaybook); 
    closePlaybookDrawer();
    
    if(typeof showToast === 'function') showToast("Node properties saved.", "success");
};

window.resetPlaybookView = function() {
    if (playbookNetwork) playbookNetwork.fit({ animation: { duration: 800, easingFunction: "easeInOutQuad" } });
};

// --- KMS EXPORT INTEGRATION ---
window.exportPlaybookToConcept = function() {
    if (!currentPlaybook || !playbookNetwork) return;
    
    // Fit canvas cleanly before snapshotting
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