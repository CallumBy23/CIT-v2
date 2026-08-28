// ==========================================
// FORCE-DIRECTED KNOWLEDGE GRAPH (Vis.js)
// ==========================================

let network = null;
let graphNodes = new vis.DataSet();
let graphEdges = new vis.DataSet();

function renderNexusGraph() {
    const container = document.getElementById('networkCanvas');
    if (!container) return;

    graphNodes.clear();
    graphEdges.clear();
    const nodeIds = new Set(); 

    function addNodeSafely(nodeObj) {
        try {
            if (nodeObj && nodeObj.id && !nodeIds.has(nodeObj.id)) {
                graphNodes.add(nodeObj);
                nodeIds.add(nodeObj.id);
            }
        } catch (e) {
            console.warn("Skipped invalid node:", e);
        }
    }

    // HELPER: Generate Category/Practice Area "Hubs" dynamically
    function addCategoryHub(catName) {
        if (!catName || catName === "General" || catName === "All") return null;
        const catId = `hub_${catName}`;
        addNodeSafely({
            id: catId,
            label: catName,
            group: 'category',
            shape: 'hexagon', // Hubs get a distinct structural shape
            size: 30,
            color: { background: '#f59e0b', border: '#d97706' }, // Gold/Orange
            font: { color: '#78350f', bold: true, strokeWidth: 3, strokeColor: '#ffffff' }
        });
        return catId;
    }

    // 1. Map Law Firms (Blue Nodes)
    if (db.targetFirms && Array.isArray(db.targetFirms)) {
        db.targetFirms.forEach(firm => {
            if (!firm) return;
            const firmName = typeof firm === 'string' ? firm : (firm.name || "Unknown Firm");
            const firmId = `firm_${firmName}`;
            
            addNodeSafely({
                id: firmId,
                label: firmName,
                group: 'firm',
                shape: 'dot',
                size: 25,
                color: { background: '#3b82f6', border: '#2563eb' },
                font: { color: '#1e3a8a', bold: true, strokeWidth: 3, strokeColor: '#ffffff' },
                _rawData: typeof firm === 'object' ? firm : null
            });

            // FUTURE-PROOFING: If a firm has an array of specialisms, link them to the Hubs
            if (typeof firm === 'object' && Array.isArray(firm.practiceAreas)) {
                firm.practiceAreas.forEach(pa => {
                    const hubId = addCategoryHub(pa);
                    if (hubId) {
                        try { graphEdges.add({ from: firmId, to: hubId }); } catch(e){}
                    }
                });
            }
        });
    }

    // 2. Map Core Concepts (Green Nodes) & Link to Hubs
    if (db.concepts && Array.isArray(db.concepts)) {
        db.concepts.forEach((concept, index) => {
            if (!concept) return;
            const title = concept.title || `Untitled Concept ${index}`;
            const conceptId = `concept_${title}`;

            addNodeSafely({
                id: conceptId,
                label: title,
                group: 'concept',
                shape: 'dot',
                size: 18,
                color: { background: '#10b981', border: '#059669' },
                font: { color: '#064e3b', strokeWidth: 3, strokeColor: '#ffffff' }
            });

            // Link Concept to its Category Hub
            if (concept.category) {
                const hubId = addCategoryHub(concept.category);
                if (hubId) {
                    try { graphEdges.add({ from: conceptId, to: hubId }); } catch(e){}
                }
            }
        });
    }

    // 3. Map Dictionary Terms (Teal Nodes) & Link to Hubs
    if (db.dictionary && Array.isArray(db.dictionary)) {
        db.dictionary.forEach((dict) => {
            if (!dict) return;
            const term = dict.term;
            const dictId = `dict_${term}`;

            addNodeSafely({
                id: dictId,
                label: term,
                group: 'dictionary',
                shape: 'dot',
                size: 12,
                color: { background: '#06b6d4', border: '#0891b2' }, // Teal
                font: { size: 12, color: '#164e63', strokeWidth: 3, strokeColor: '#ffffff' },
                _rawData: dict
            });

            // Link Dictionary term to its Category Hub
            if (dict.category) {
                const hubId = addCategoryHub(dict.category);
                if (hubId) {
                    try { graphEdges.add({ from: dictId, to: hubId }); } catch(e){}
                }
            }
        });
    }

    // 4. Map Market Intelligence (Purple Nodes) & Draw Connections
    if (db.factors && Array.isArray(db.factors)) {
        db.factors.forEach((factor, index) => {
            if (!factor) return;
            
            const factorId = factor.id || `f_${index}`;
            const rawTitle = factor.title || factor.headline || factor.name || "Untitled Insight";
            const shortLabel = rawTitle.length > 35 ? rawTitle.substring(0, 35) + "..." : rawTitle;

            addNodeSafely({
                id: `intel_${factorId}`,
                label: shortLabel,
                group: 'intel',
                shape: 'dot',
                size: 10,
                color: { background: '#8b5cf6', border: '#7c3aed' },
                font: { size: 12, color: '#4c1d95', strokeWidth: 3, strokeColor: '#ffffff' },
                _rawData: factor 
            });

            if (factor.linkedFirm) {
                const targetFirmId = `firm_${factor.linkedFirm}`;
                if (nodeIds.has(targetFirmId)) {
                    try { graphEdges.add({ from: `intel_${factorId}`, to: targetFirmId }); } catch(e){}
                }
            }

            if (factor.linkedConcept) {
                const targetConceptId = `concept_${factor.linkedConcept}`;
                if (nodeIds.has(targetConceptId)) {
                    try { graphEdges.add({ from: `intel_${factorId}`, to: targetConceptId }); } catch(e){}
                }
            }
        });
    }

    // 6. Define Physics & Visualization Options
    const data = { nodes: graphNodes, edges: graphEdges };
    const options = {
        nodes: { 
            borderWidth: 2, 
            shadow: true, 
            font: { face: 'Inter, sans-serif', size: 14 } 
        },
        edges: { 
            width: 1.5, 
            color: { color: '#cbd5e1', highlight: '#8b5cf6' }, 
            smooth: { type: 'continuous' } 
        },
        physics: {
            solver: 'repulsion',
            repulsion: {
                nodeDistance: 220,     // Enforces a strict 220px boundary between nodes
                centralGravity: 0.05,  // Keeps the graph centered on the screen
                springLength: 250,     // Lengthens the strings connecting to the hub
                springConstant: 0.05,
                damping: 0.09
            },
            maxVelocity: 50,
            timestep: 0.5,
            stabilization: { iterations: 150 } 
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    if(network !== null) network.destroy(); 
    network = new vis.Network(container, data, options);
    network.once("afterDrawing", function() { network.fit(); });

    // 8. Handle Interactivity
    network.on("selectNode", function (params) {
        if (params.nodes.length > 0) handleNodeClick(params.nodes[0]);
    });
    network.on("deselectNode", function () { closeGraphDrawer(); });
}

function handleNodeClick(nodeId) {
    const node = graphNodes.get(nodeId);
    if(!node) return;

    const drawer = document.getElementById('graphDrawer');
    const badge = document.getElementById('graphDrawerBadge');
    const title = document.getElementById('graphDrawerTitle');
    const content = document.getElementById('graphDrawerContent');

    title.innerText = node.label || "Entity";
    
    if (node.group === 'category') {
        badge.innerText = "PRACTICE AREA";
        badge.className = "text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200";
        content.innerHTML = `<p class="italic text-gray-500">This is a gravitational hub. All related concepts, dictionary terms, and specialized firms cluster around this discipline.</p>`;
    }
    else if (node.group === 'firm') {
        badge.innerText = "FIRM";
        badge.className = "text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100";
        content.innerHTML = `<p class="italic text-gray-500">Connections are visible on the graph. Jump to the Strategy Room for full dossier details.</p>
                             <button onclick="switchState('DOSSIERS')" class="mt-4 bg-gray-900 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm">Go to Dossier</button>`;
    } 
    else if (node.group === 'concept') {
        badge.innerText = "CONCEPT";
        badge.className = "text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100";
        const conceptData = db.concepts.find(c => c.title === node.label);
        content.innerHTML = conceptData ? conceptData.body : "<p>No detailed body found.</p>";
    } 
    else if (node.group === 'dictionary' && node._rawData) {
        badge.innerText = "DEFINITION";
        badge.className = "text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200";
        content.innerHTML = `<div class="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">${node._rawData.definition}</div>`;
    }
    else if (node.group === 'intel' && node._rawData) {
        badge.innerText = "INSIGHT";
        badge.className = "text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100";
        title.innerText = node._rawData.title || node._rawData.headline || "Untitled Insight";
        
        let metaHtml = `<div class="flex flex-wrap gap-2 mb-4">`;
        if(node._rawData.pestle) metaHtml += `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">${node._rawData.pestle}</span>`;
        if(node._rawData.metric) metaHtml += `<span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">${node._rawData.metric}</span>`;
        metaHtml += `</div>`;

        content.innerHTML = metaHtml + (node._rawData.description || "");
        if (node._rawData.implications) {
             content.innerHTML += `<h4 class="font-bold text-gray-900 mt-6 border-b border-gray-200 pb-1 mb-2">Commercial Implications</h4>${node._rawData.implications}`;
        }
    }

    drawer.classList.remove('translate-x-full');
}

function closeGraphDrawer() {
    document.getElementById('graphDrawer').classList.add('translate-x-full');
    if (network) network.unselectAll();
}

function resetGraphView() {
    if (network) network.fit({ animation: { duration: 800, easingFunction: "easeInOutQuad" } });
}

let physicsEnabled = true;
function toggleGraphPhysics() {
    if (!network) return;
    physicsEnabled = !physicsEnabled;
    network.setOptions({ physics: { enabled: physicsEnabled } });
    document.getElementById('btnTogglePhysics').innerHTML = physicsEnabled ? "⏸️ Pause Physics" : "▶️ Play Physics";
}