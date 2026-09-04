// =========================================================================
// DEAL ANATOMY & PLAYBOOKS (Dynamic Bounding, Collapsing Lanes & Flow Roles)
// =========================================================================

let currentPlaybook = null;
let playbookNetwork = null;
let pbNodes = new vis.DataSet();
let pbEdges = new vis.DataSet();

const DEFAULT_STAGES = [
    { id: "s1", name: "Phase 1: Deal Initiation & Preliminary DD", minLevel: 1, maxLevel: 3, accent: "#6366f1" },
    { id: "s2", name: "Phase 2: Definitive Drafting & Negotiations", minLevel: 4, maxLevel: 7, accent: "#0284c7" },
    { id: "s3", name: "Phase 3: Interim Period & CP Checklist", minLevel: 8, maxLevel: 10, accent: "#d97706" },
    { id: "s4", name: "Phase 4: Completion & Funds Flow", minLevel: 11, maxLevel: 13, accent: "#059669" },
    { id: "s5", name: "Phase 5: Post-Closing Filings & Integration", minLevel: 14, maxLevel: 25, accent: "#9333ea" }
];

window.getPlaybookStages = function() {
    if (currentPlaybook && db.playbooks && db.playbooks[currentPlaybook] && Array.isArray(db.playbooks[currentPlaybook].stages)) {
        return db.playbooks[currentPlaybook].stages;
    }
    return DEFAULT_STAGES;
};

window.renderPlaybookList = function() {
    const container = document.getElementById("playbookList");
    if (!container) return;
    container.innerHTML = "";

    if (!db.playbooks) db.playbooks = {};
    const playbooks = Object.keys(db.playbooks).sort((a, b) => a.localeCompare(b));
    
    if (playbooks.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic mt-2">No playbooks created yet. Click + Add above.</p>`;
        const canvasEl = document.getElementById('playbookCanvas');
        if (canvasEl) canvasEl.style.display = 'none';
        const labelEl = document.getElementById('activePlaybookLabel');
        if (labelEl) labelEl.innerText = "No Playbook Selected";
        return;
    }

    const canvasEl = document.getElementById('playbookCanvas');
    if (canvasEl) canvasEl.style.display = 'block';

    if (!currentPlaybook || !db.playbooks[currentPlaybook]) {
        currentPlaybook = playbooks[0];
    }

    playbooks.forEach(name => {
        const btn = document.createElement("button");
        const isActive = name === currentPlaybook;
        btn.className = `w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition flex justify-between items-center ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`;
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

window.addPlaybook = async function() {
    const name = prompt("Enter Playbook Name (e.g., Private M&A):");
    if (!name || !name.trim()) return;
    const cleanName = name.trim();

    if (!db.playbooks) db.playbooks = {};
    if (!db.playbooks[cleanName]) {
        db.playbooks[cleanName] = { 
            nodes: [], 
            edges: [], 
            stages: JSON.parse(JSON.stringify(DEFAULT_STAGES)) 
        };
        currentPlaybook = cleanName;

        // Immediate Direct Cloud Upsert
        if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser) {
            try {
                await supabaseClient.from('playbooks').upsert({
                    user_id: window.currentUser.id,
                    name: cleanName,
                    nodes: [],
                    edges: [],
                    stages: DEFAULT_STAGES,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, name' });
            } catch(e) {
                console.warn("Playbook cloud sync notice:", e);
            }
        }

        if (typeof saveDatabase === 'function') saveDatabase();
        renderPlaybookList();
        if (typeof showToast === 'function') showToast(`Playbook "${cleanName}" created.`, "success");
    } else {
        alert("A playbook with this name already exists.");
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
            
            if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser) {
                supabaseClient.from('playbooks').delete().match({ user_id: window.currentUser.id, name: oldName }).then(() => {});
            }

            saveDatabase(); 
            renderPlaybookList();
        }
    } else if (input !== oldName && !db.playbooks[input]) {
        db.playbooks[input] = db.playbooks[oldName];
        delete db.playbooks[oldName];
        currentPlaybook = input;

        if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser) {
            supabaseClient.from('playbooks').delete().match({ user_id: window.currentUser.id, name: oldName }).then(() => {
                syncPlaybookToDb();
            });
        }

        saveDatabase(); 
        renderPlaybookList();
    }
};

// --- SILENT BACKGROUND LAYOUT CALCULATOR ---
window.refreshPlaybookLayout = function() {
    if (!currentPlaybook || !db.playbooks || !db.playbooks[currentPlaybook]) return;
    
    let nodesMap = new Map();
    pbNodes.forEach(n => nodesMap.set(n.id, { ...n }));
    let edgesList = pbEdges.get();

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

    let updates = [];
    let levelXCounters = {};

    nodesMap.forEach((node) => {
        let newLevel = (node.manualLevel !== undefined && node.manualLevel !== null) 
                        ? parseInt(node.manualLevel, 10) 
                        : (node._autoLevel !== undefined ? node._autoLevel : 1);
        
        let newY = newLevel * 160;
        let newX = node.x;

        if (newX === undefined || newX === null) {
            if (levelXCounters[newLevel] === undefined) {
                levelXCounters[newLevel] = 0;
            } else {
                levelXCounters[newLevel] += 280; 
            }
            newX = levelXCounters[newLevel];
        }
        
        newX = Math.round(newX / 280) * 280; 

        // Role-based Node Styling
        let nodeColor = { background: '#2563eb', border: '#1d4ed8', highlight: { background: '#3b82f6', border: '#1e40af' } };
        let shape = "box";

        if (node.nodeRole === "start") {
            nodeColor = { background: '#059669', border: '#047857', highlight: { background: '#10b981', border: '#065f46' } };
        } else if (node.nodeRole === "complete") {
            nodeColor = { background: '#4338ca', border: '#3730a3', highlight: { background: '#6366f1', border: '#312e81' } };
        } else if (node.nodeRole === "milestone") {
            nodeColor = { background: '#d97706', border: '#b45309', highlight: { background: '#f59e0b', border: '#92400e' } };
        } else if (node.linkedConcept) {
            nodeColor = { background: '#0891b2', border: '#0e7490', highlight: { background: '#06b6d4', border: '#155e75' } };
        }

        updates.push({ 
            id: node.id, 
            level: newLevel, 
            manualLevel: newLevel, 
            x: newX, 
            y: newY,
            color: nodeColor,
            shape: shape
        });
    });

    pbNodes.update(updates);
};

// --- DYNAMIC BOUNDING & COLLAPSING SWIMLANE BOARD ---
function drawPlaybookStageLanes(ctx) {
    const allNodes = pbNodes.get();
    if (allNodes.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const stages = window.getPlaybookStages();

    let minX = Infinity;
    let maxX = -Infinity;
    allNodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
    });

    const boardPadding = 180;
    const boardLeft = (minX === Infinity ? -400 : minX) - boardPadding;
    const boardRight = (maxX === -Infinity ? 400 : maxX) + boardPadding;
    const boardWidth = boardRight - boardLeft;

    stages.forEach(stage => {
        const nodesInStage = allNodes.filter(n => {
            const lvl = n.level || n.manualLevel || 1;
            return lvl >= stage.minLevel && lvl <= stage.maxLevel;
        });

        if (nodesInStage.length === 0) return;

        const minLvlInStage = Math.min(...nodesInStage.map(n => n.level || n.manualLevel || stage.minLevel));
        const maxLvlInStage = Math.max(...nodesInStage.map(n => n.level || n.manualLevel || stage.maxLevel));

        const topY = (minLvlInStage * 160) - 75;
        const bottomY = (maxLvlInStage * 160) + 75;
        const height = bottomY - topY;

        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(248, 250, 252, 0.75)";
        ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.6)" : "rgba(203, 213, 225, 0.8)";
        ctx.lineWidth = 1.5;

        const r = 12;
        ctx.beginPath();
        ctx.moveTo(boardLeft + r, topY);
        ctx.lineTo(boardLeft + boardWidth - r, topY);
        ctx.quadraticCurveTo(boardLeft + boardWidth, topY, boardLeft + boardWidth, topY + r);
        ctx.lineTo(boardLeft + boardWidth, topY + height - r);
        ctx.quadraticCurveTo(boardLeft + boardWidth, topY + height, boardLeft + boardWidth - r, topY + height);
        ctx.lineTo(boardLeft + r, topY + height);
        ctx.quadraticCurveTo(boardLeft, topY + height, boardLeft, topY + height - r);
        ctx.lineTo(boardLeft, topY + r);
        ctx.quadraticCurveTo(boardLeft, topY, boardLeft + r, topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = stage.accent || "#6366f1";
        ctx.beginPath();
        ctx.arc(boardLeft + 22, topY + 22, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
        ctx.textAlign = "left";
        ctx.fillText(stage.name.toUpperCase(), boardLeft + 35, topY + 26);
    });
}

window.renderPlaybookGraph = function(playbookName) {
    const labelEl = document.getElementById('activePlaybookLabel');
    if (labelEl) labelEl.innerText = playbookName;

    if (!db.playbooks) db.playbooks = {};
    const dataObj = db.playbooks[playbookName] || { nodes: [], edges: [] };
    
    pbNodes.clear();
    pbEdges.clear();
    
    if (dataObj.nodes) pbNodes.add(dataObj.nodes);
    if (dataObj.edges) pbEdges.add(dataObj.edges);

    window.refreshPlaybookLayout();

    const container = document.getElementById('playbookCanvas');
    if (!container) return;
    
    const data = { nodes: pbNodes, edges: pbEdges };
    
    const options = {
        layout: { hierarchical: false }, 
        physics: { enabled: false }, 
        interaction: { hover: true, navigationButtons: false, keyboard: false, dragNodes: true },
        manipulation: {
            enabled: true,
            initiallyActive: true,
            addNode: function(nodeData, callback) {
                nodeData.label = "New Transaction Step";
                nodeData.shape = "box";
                nodeData.font = { color: 'white', size: 14, face: 'Inter, sans-serif' };
                nodeData.timing = "";
                nodeData.advantages = "";
                nodeData.disadvantages = "";
                nodeData.linkedConcept = "";
                nodeData.nodeRole = "standard";

                let clickedRow = Math.max(1, Math.round((nodeData.y || 160) / 160));
                let targetY = clickedRow * 160;
                let targetX = Math.round((nodeData.x || 0) / 280) * 280;
                
                let occupied = true;
                while (occupied) {
                    occupied = false;
                    pbNodes.forEach(n => {
                        if (n.y === targetY && n.x === targetX && n.id !== nodeData.id) occupied = true;
                    });
                    if (occupied) targetX += 280;
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
                    const branchLabel = prompt("Branch Condition / Reason (Optional):", "");
                    
                    edgeData.arrows = 'to';
                    edgeData.color = { color: '#94a3b8', highlight: '#2563eb' };
                    if (branchLabel && branchLabel.trim() !== '') {
                        edgeData.label = branchLabel.trim();
                        edgeData.font = { size: 11, color: '#475569', strokeWidth: 2, strokeColor: '#ffffff', align: 'horizontal' };
                    }
                    
                    callback(edgeData); 
                    syncPlaybookToDb();
                    window.refreshPlaybookLayout();
                    
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
            font: { color: 'white', size: 14, face: 'Inter, sans-serif' },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.08)', size: 6, x: 0, y: 3 },
            borderWidth: 2
        },
        edges: {
            width: 2,
            smooth: {
                type: 'discrete',
                roundness: 0.15
            }
        }
    };

    if (playbookNetwork !== null) {
        playbookNetwork.destroy();
        playbookNetwork = null;
    }
    
    playbookNetwork = new vis.Network(container, data, options);

    playbookNetwork.on("beforeDrawing", function (ctx) {
        drawPlaybookStageLanes(ctx);
    });
    
    playbookNetwork.on("dragEnd", function (params) {
        if (params.nodes.length > 0) {
            const positions = playbookNetwork.getPositions(params.nodes);
            const updates = [];
            
            params.nodes.forEach(nodeId => {
                const node = pbNodes.get(nodeId);
                if (node && positions[nodeId]) {
                    const rawX = positions[nodeId].x;
                    const rawY = positions[nodeId].y;

                    const newRow = Math.max(1, Math.round(rawY / 160));
                    const targetY = newRow * 160;
                    const targetX = Math.round(rawX / 280) * 280;

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
    
    if (!db.playbooks) db.playbooks = {};
    db.playbooks[currentPlaybook] = {
        nodes: cleanNodes,
        edges: pbEdges.get(),
        stages: window.getPlaybookStages()
    };

    if (typeof saveDatabase === 'function') saveDatabase();
}

// --- DIRECT NODE-TO-KMS LINKING SYSTEM ---
window.populateKmsDropdown = function(selectedConceptTitle) {
    const select = document.getElementById('pbNodeConceptLink');
    if (!select) return;

    let optionsHtml = `<option value="">-- No Linked KMS Record --</option>`;

    if (Array.isArray(db.concepts) && db.concepts.length > 0) {
        optionsHtml += `<optgroup label="Core Concepts">`;
        db.concepts.forEach(c => {
            const title = String(c.title || "Untitled");
            const isSel = selectedConceptTitle && title.toLowerCase() === selectedConceptTitle.toLowerCase() ? "selected" : "";
            optionsHtml += `<option value="concept:${title}" ${isSel}>${title}</option>`;
        });
        optionsHtml += `</optgroup>`;
    }

    if (Array.isArray(db.dictionary) && db.dictionary.length > 0) {
        optionsHtml += `<optgroup label="Dictionary Terms">`;
        db.dictionary.forEach(d => {
            const term = String(d.term || "Untitled");
            const isSel = selectedConceptTitle && term.toLowerCase() === selectedConceptTitle.toLowerCase() ? "selected" : "";
            optionsHtml += `<option value="dict:${term}" ${isSel}>${term}</option>`;
        });
        optionsHtml += `</optgroup>`;
    }

    select.innerHTML = optionsHtml;
};

window.renderKmsPreviewSnippet = function(encodedValue) {
    const previewBox = document.getElementById('pbNodeKmsPreview');
    if (!previewBox) return;

    if (!encodedValue) {
        previewBox.classList.add('hidden');
        return;
    }

    const [type, ...titleParts] = encodedValue.split(':');
    const title = titleParts.join(':');

    let bodyText = "";
    if (type === 'concept') {
        const item = (db.concepts || []).find(c => String(c.title).toLowerCase() === title.toLowerCase());
        bodyText = item ? (item.body || item.content || "") : "";
    } else {
        const item = (db.dictionary || []).find(d => String(d.term).toLowerCase() === title.toLowerCase());
        bodyText = item ? (item.definition || "") : "";
    }

    const cleanText = bodyText.replace(/<[^>]*>?/gm, '').trim();

    document.getElementById('pbKmsPreviewType').innerText = type === 'concept' ? 'Knowledge Concept' : 'Glossary Definition';
    document.getElementById('pbKmsPreviewTitle').innerText = title;
    document.getElementById('pbKmsPreviewSnippet').innerText = cleanText || "No additional text found in library.";
    
    previewBox.classList.remove('hidden');
};

window.onPlaybookKmsLinkChange = function() {
    const val = document.getElementById('pbNodeConceptLink').value;
    window.renderKmsPreviewSnippet(val);
};

window.jumpToLinkedKms = function() {
    const val = document.getElementById('pbNodeConceptLink').value;
    if (!val) return;

    const [type, ...titleParts] = val.split(':');
    const title = titleParts.join(':');

    window.closePlaybookDrawer();

    if (type === 'concept') {
        if (typeof window.routeToConcept === 'function') {
            window.routeToConcept(title);
        }
    } else {
        window.switchState('DICTIONARY');
        const searchInput = document.getElementById('searchDictionary');
        if (searchInput) {
            searchInput.value = title;
            if (typeof window.renderDictionary === 'function') window.renderDictionary();
        }
    }
};

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

    const roleSelect = document.getElementById('pbNodeRole');
    if (roleSelect) roleSelect.value = node.nodeRole || "standard";

    window.populateKmsDropdown(node.linkedConcept || "");
    const select = document.getElementById('pbNodeConceptLink');
    if (select) {
        window.renderKmsPreviewSnippet(select.value);
    }

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
    const newManualLevel = levelStr !== "" ? parseInt(levelStr, 10) : null;

    const rawKmsVal = document.getElementById('pbNodeConceptLink').value;
    const linkedConcept = rawKmsVal ? rawKmsVal.split(':').slice(1).join(':') : "";
    const nodeRole = document.getElementById('pbNodeRole').value || "standard";

    pbNodes.update({
        id: nodeId,
        label: label,
        timing: document.getElementById('pbNodeTiming').value,
        advantages: document.getElementById('pbNodeAdv').value,
        disadvantages: document.getElementById('pbNodeDisadv').value,
        linkedConcept: linkedConcept,
        nodeRole: nodeRole,
        manualLevel: newManualLevel,
        level: newManualLevel
    });

    syncPlaybookToDb();
    window.refreshPlaybookLayout();
    closePlaybookDrawer();
    
    if (typeof showToast === 'function') showToast("Step properties saved.", "success");
};

// --- STAGE CONFIGURATION MODAL ---
window.openStageConfigModal = function() {
    let modal = document.getElementById('stageConfigModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'stageConfigModal';
        modal.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all opacity-0 pointer-events-none";
        document.body.appendChild(modal);
    }

    const stages = window.getPlaybookStages();
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div class="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> Configure Stage Boundaries
                </h3>
                <button onclick="window.closeStageConfigModal()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white">&times;</button>
            </div>
            <p class="text-xs text-slate-500 mb-4">Set which row range defines each phase. Phases with no nodes will automatically collapse.</p>
            
            <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1" id="stageConfigRows">
                ${stages.map((s, idx) => `
                    <div class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <input type="text" value="${s.name}" class="stage-name-input flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white">
                        <div class="flex items-center gap-1 shrink-0 text-xs font-mono text-slate-500">
                            <span>Rows</span>
                            <input type="number" min="1" value="${s.minLevel}" class="stage-min-input w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-1 font-bold">
                            <span>-</span>
                            <input type="number" min="1" value="${s.maxLevel}" class="stage-max-input w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-1 font-bold">
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="flex justify-end gap-2.5 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button onclick="window.closeStageConfigModal()" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded">Cancel</button>
                <button onclick="window.saveStageConfig()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 text-xs rounded transition shadow">Save Boundaries</button>
            </div>
        </div>
    `;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    if (window.lucide) window.lucide.createIcons();
};

window.closeStageConfigModal = function() {
    const modal = document.getElementById('stageConfigModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
};

window.saveStageConfig = function() {
    if (!currentPlaybook || !db.playbooks || !db.playbooks[currentPlaybook]) return;
    
    const names = document.querySelectorAll('.stage-name-input');
    const mins = document.querySelectorAll('.stage-min-input');
    const maxs = document.querySelectorAll('.stage-max-input');
    const currentStages = window.getPlaybookStages();

    const updated = [];
    names.forEach((nameEl, i) => {
        updated.push({
            id: currentStages[i] ? currentStages[i].id : `s_${i}`,
            name: nameEl.value.trim() || `Phase ${i+1}`,
            minLevel: parseInt(mins[i].value, 10) || 1,
            maxLevel: parseInt(maxs[i].value, 10) || (parseInt(mins[i].value, 10) + 2),
            accent: currentStages[i] ? currentStages[i].accent : "#6366f1"
        });
    });

    db.playbooks[currentPlaybook].stages = updated;
    saveDatabase();
    window.closeStageConfigModal();
    if (playbookNetwork) playbookNetwork.redraw();
    if (typeof showToast === 'function') showToast("Stage boundaries updated.", "success");
};

// Zoom & Center controls
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
            if (sidebar) {
                sidebar.classList.remove('-translate-x-full');
                if (window.innerWidth >= 768) {
                    sidebar.classList.remove('md:hidden');
                    sidebar.classList.add('md:flex');
                }
            }
            
            document.getElementById('conceptTitle').value = `${currentPlaybook} Flowchart`;
            document.getElementById('conceptSubTag').value = "Deal Anatomy";
            
            if (typeof diagramTempBase64 !== 'undefined') diagramTempBase64 = imgData;
            else window.diagramTempBase64 = imgData;
            
            const preview = document.getElementById("newConceptDiagramPreview");
            if (preview) {
                preview.src = imgData;
                preview.classList.remove("hidden");
                const label = document.getElementById("newConceptDiagramLabel");
                if (label) label.innerText = "Replace Diagram";
            }
            
            if (typeof showToast === 'function') showToast("Playbook captured! You can now log it.", "success");
        } else {
            const targetTitle = action.trim().toLowerCase();
            const targetIndex = db.concepts.findIndex(c => (c.title || "").toLowerCase() === targetTitle);
            
            if (targetIndex > -1) {
                db.concepts[targetIndex].diagram = imgData;
                saveDatabase();
                if (typeof showToast === 'function') showToast(`Successfully attached to "${db.concepts[targetIndex].title}"`, "success");
                if (appState === 'CONCEPTS' && typeof renderConcepts === 'function') renderConcepts();
            } else {
                alert(`Could not find a concept named "${action.trim()}". Please check your spelling.`);
            }
        }
    }, 500);
};