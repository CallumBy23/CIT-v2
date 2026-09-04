// =========================================================================
// CONCEPT DETAILED WORKSPACE & TRANSACTION STRUCTURE ENGINE
// =========================================================================

window.activeConceptDetailIndex = null;
window.activeConceptDetailTab = 'overview';

/**
 * Open full-screen concept workspace
 */
window.openConceptDetailWorkspace = function(index) {
    index = parseInt(index, 10);
    const concept = db.concepts && db.concepts[index];
    if (!concept) return;

    window.activeConceptDetailIndex = index;
    window.activeConceptDetailTab = 'overview';

    let detailWrapper = document.getElementById("conceptDetailWorkspaceWrapper");
    if (!detailWrapper) {
        detailWrapper = document.createElement("div");
        detailWrapper.id = "conceptDetailWorkspaceWrapper";
        detailWrapper.className = "w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[#f8f9fb] dark:bg-[#0c101a] text-slate-800 dark:text-slate-100 transition-colors duration-200";
        
        const conceptsApp = document.getElementById("appConcepts");
        if (conceptsApp) {
            conceptsApp.appendChild(detailWrapper);
        }
    }

    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    detailWrapper.classList.remove("hidden");

    window.renderConceptDetailView();
};

/**
 * Return to KMS Table view
 */
window.closeConceptDetailWorkspace = function() {
    const detailWrapper = document.getElementById("conceptDetailWorkspaceWrapper");
    if (detailWrapper) detailWrapper.classList.add("hidden");

    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.remove("hidden");

    window.activeConceptDetailIndex = null;
    if (typeof window.renderConcepts === 'function') window.renderConcepts();
};

/**
 * Switch Subtabs
 */
window.switchConceptDetailTab = function(tabKey) {
    window.activeConceptDetailTab = tabKey;
    window.renderConceptDetailView();
};

/**
 * Inline prompt to append a sub-tag
 */
window.promptAddConceptTag = function(index) {
    const newTag = prompt("Enter new tag / practice area:");
    if (!newTag || !newTag.trim()) return;

    const concept = db.concepts[index];
    let tags = (concept.subTag || "").split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.includes(newTag.trim())) {
        tags.push(newTag.trim());
        concept.subTag = tags.join(', ');
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
    }
};

/**
 * Import a playbook flow directly into this concept as its Structure
 */
window.importPlaybookToCurrentConcept = function() {
    if (window.activeConceptDetailIndex === null) return;
    const playbooks = Object.keys(db.playbooks || {});
    if (playbooks.length === 0) {
        alert("No playbooks exist in Deals yet. Create one first.");
        return;
    }

    const selectedPb = prompt(`Select a Playbook to attach to this concept:\n\nAvailable:\n- ${playbooks.join('\n- ')}\n\nType the exact name:`);
    if (!selectedPb || !selectedPb.trim()) return;
    const cleanName = selectedPb.trim();

    if (!db.playbooks[cleanName]) {
        alert(`Playbook "${cleanName}" not found.`);
        return;
    }

    const c = db.concepts[window.activeConceptDetailIndex];
    c.linkedPlaybook = cleanName;
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderConceptDetailView();
    if (typeof showToast === 'function') showToast(`Linked Playbook "${cleanName}" to concept!`, "success");
};

/**
 * Detach the linked playbook structure
 */
window.detachPlaybookFromCurrentConcept = function() {
    if (window.activeConceptDetailIndex === null) return;
    const c = db.concepts[window.activeConceptDetailIndex];
    if (confirm("Detach linked playbook structure from this concept?")) {
        delete c.linkedPlaybook;
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
    }
};

/**
 * Core View Renderer
 */
window.renderConceptDetailView = function() {
    const detailWrapper = document.getElementById("conceptDetailWorkspaceWrapper");
    if (!detailWrapper || window.activeConceptDetailIndex === null) return;

    const idx = window.activeConceptDetailIndex;
    const c = db.concepts[idx];
    if (!c) return;

    // --- 1. SRS & Mastery Metrics ---
    const srs = c.srs || { interval: 0, nextReview: 0, ease: 2.5, lastReviewed: null, mastered: false };
    const masteryPct = srs.mastered ? 100 : Math.min(100, Math.round(((srs.interval || 0) / 21) * 100));
    
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPct / 100) * circumference;

    const lastReviewedFormatted = srs.lastReviewed 
        ? new Date(srs.lastReviewed).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : (c.date || "Not reviewed");

    const nextReviewFormatted = srs.nextReview
        ? new Date(srs.nextReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : "Pending";

    const totalReviewsCount = srs.totalReviews || (srs.interval > 0 ? Math.ceil(srs.interval / 2) : 0);
    const conceptCode = `CON-${String(idx + 1).padStart(6, '0')}`;

    // --- 2. Tags ---
    const tags = (c.subTag || "").split(',').map(t => t.trim()).filter(Boolean);
    const tagBadgesHtml = tags.map(tag => `
        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ${tag}
        </span>
    `).join('');

    // --- 3. Body & Clean Points ---
    const cleanBodyHtml = c.body || "<p class='text-slate-400 italic'>No definition text logged yet. Click 'Edit Concept' to add content.</p>";
    
    // User key points (or parse distinct paragraphs if not separately defined)
    let keyPoints = Array.isArray(c.keyPoints) ? c.keyPoints : [];
    if (keyPoints.length === 0) {
        const textPlain = cleanBodyHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        const sentenceParts = textPlain.split('. ').filter(s => s.trim().length > 20);
        keyPoints = sentenceParts.slice(1, 6).map(s => s.replace(/\.$/, '') + '.');
    }

    const keyPointsHtml = keyPoints.length > 0 ? keyPoints.map(kp => `
        <li class="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 dark:text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"></i>
            <span>${kp}</span>
        </li>
    `).join('') : `
        <li class="text-xs text-slate-400 italic py-2">No key points logged yet. Use 'Edit Concept' to add points.</li>
    `;

    // --- 4. Linked Intelligence Factors ---
    const linkedFactors = (db.factors || []).filter(f => f && f.linkedConcept && f.linkedConcept.toLowerCase() === (c.title || "").toLowerCase());
    
    // --- 5. Related Concepts from Same Category ---
    const related = (db.concepts || [])
        .map((item, originalIndex) => ({ item, originalIndex }))
        .filter(obj => obj.originalIndex !== idx && obj.item.category === c.category)
        .slice(0, 6);

    // --- 6. Documents / Clauses List ---
    const docs = Array.isArray(c.documents) ? c.documents : [];

    // --- 7. Sub-Tab Definitions ---
    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'structure', label: `Structure & Deal Flow ${c.linkedPlaybook || c.diagram ? '✓' : ''}` },
        { key: 'applications', label: 'Applications' },
        { key: 'documents', label: `Documents (${docs.length})` },
        { key: 'related', label: `Related Concepts (${related.length})` },
        { key: 'intel', label: `Intelligence (${linkedFactors.length})` },
        { key: 'srs', label: 'SRS & Notes' }
    ];

    const tabNavHtml = tabs.map(t => {
        const isActive = window.activeConceptDetailTab === t.key;
        return `
            <button type="button" onclick="window.switchConceptDetailTab('${t.key}')" 
                class="py-3 px-1.5 text-xs md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                    isActive 
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }">
                ${t.label}
            </button>
        `;
    }).join('');

    // --- 8. Tab Content Switching Logic ---
    let tabContentHtml = '';

    if (window.activeConceptDetailTab === 'overview') {
        tabContentHtml = `
            <div class="space-y-6">
                <!-- Definition Card -->
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Definition & Technical Framework</h3>
                    <div class="prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-slate-300 leading-relaxed dict-highlight-target dark:prose-invert">
                        ${cleanBodyHtml}
                    </div>
                </div>

                <!-- Key Takeaways Card -->
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Core Mechanics & Key Points</h4>
                        <button type="button" onclick="window.openEditConceptModal(${idx})" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Edit Points</button>
                    </div>
                    <ul class="space-y-3">
                        ${keyPointsHtml}
                    </ul>
                </div>

                ${c.applications ? `
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Practical Deal Applications</h4>
                        <div class="prose prose-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">${c.applications}</div>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'structure') {
        // Tab: Structure & Deal Flow
        const hasLinkedPlaybook = !!(c.linkedPlaybook && db.playbooks && db.playbooks[c.linkedPlaybook]);
        const hasDiagram = !!c.diagram;

        let playbookPreviewHtml = '';
        if (hasLinkedPlaybook) {
            const pb = db.playbooks[c.linkedPlaybook];
            const nodes = pb.nodes || [];
            playbookPreviewHtml = `
                <div class="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl p-5 mb-4">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Attached Deal Flowchart</span>
                            <h4 class="text-base font-serif font-black text-slate-900 dark:text-white">${c.linkedPlaybook}</h4>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="switchState('PLAYBOOKS'); window.currentPlaybook='${c.linkedPlaybook}'; window.renderPlaybookList();" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center gap-1">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Open in Deal Anatomy
                            </button>
                            <button type="button" onclick="window.detachPlaybookFromCurrentConcept()" class="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition">
                                Detach
                            </button>
                        </div>
                    </div>

                    <!-- Flow Steps Sequence Overview -->
                    <div class="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        ${nodes.map((n, i) => `
                            <div class="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                                <span class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">${i + 1}</span>
                                <span class="text-slate-800 dark:text-slate-200 flex-1 truncate">${n.label || 'Step'}</span>
                                <span class="text-[10px] font-mono text-slate-400">Row ${n.level || n.manualLevel || 1}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        tabContentHtml = `
            <div class="space-y-6">
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                        <div>
                            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Transaction Structure & Mechanics</h3>
                            <p class="text-xs text-slate-500 mt-0.5">Attach a full transaction playbook or diagram drawing illustrating how this concept functions in practice.</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button type="button" onclick="window.importPlaybookToCurrentConcept()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-sm transition flex items-center gap-1.5">
                                <i data-lucide="git-merge" class="w-3.5 h-3.5 text-indigo-500"></i> Import Playbook
                            </button>
                            <button type="button" onclick="openDrawingPad(${idx})" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1.5">
                                <i data-lucide="pen-tool" class="w-3.5 h-3.5"></i> ${hasDiagram ? 'Edit Diagram' : 'Draw Diagram'}
                            </button>
                        </div>
                    </div>

                    ${playbookPreviewHtml}

                    ${hasDiagram ? `
                        <div>
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Custom Visual Diagram</h4>
                            <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 cursor-pointer hover:border-indigo-400 transition" onclick="openDrawingPad(${idx})">
                                <img src="${c.diagram}" class="max-h-[500px] mx-auto object-contain">
                            </div>
                        </div>
                    ` : (!hasLinkedPlaybook ? `
                        <div class="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <i data-lucide="git-branch" class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2"></i>
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">No Transaction Structure Attached</h4>
                            <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">You can import an interactive flow from your Deals & Playbooks tab or sketch a custom procedural diagram.</p>
                            <div class="flex items-center justify-center gap-2">
                                <button type="button" onclick="window.importPlaybookToCurrentConcept()" class="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm">
                                    Import from Playbooks
                                </button>
                                <button type="button" onclick="openDrawingPad(${idx})" class="px-3.5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition">
                                    Draw Canvas
                                </button>
                            </div>
                        </div>
                    ` : '')}
                </div>
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'applications') {
        // Tab: Applications
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Commercial Applications & Scenarios</h3>
                    <button type="button" onclick="window.openEditConceptModal(${idx})" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Edit Context</button>
                </div>
                ${c.applications ? `
                    <div class="prose prose-sm md:prose-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed dark:prose-invert">${c.applications}</div>
                ` : `
                    <div class="py-10 text-center text-slate-400 italic text-xs">
                        No practical applications logged yet. Use 'Edit Concept' to add deal contexts, negotiation leverage points, and market uses.
                    </div>
                `}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'documents') {
        // Tab: Documents
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Standard Documents, Clauses & Precedents</h3>
                    <button type="button" onclick="window.addConceptDocumentRow(${idx})" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Add Document</button>
                </div>
                ${docs.length > 0 ? `
                    <div class="space-y-3">
                        ${docs.map((d, dIdx) => `
                            <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div class="flex items-center gap-3 truncate">
                                    <i data-lucide="file-text" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                                    <div class="truncate">
                                        <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${d.name || 'Precedent Clause'}</p>
                                        <p class="text-[10px] text-slate-400">${d.type || 'Clause'} &bull; ${d.notes || 'Reference'}</p>
                                    </div>
                                </div>
                                <button type="button" onclick="window.removeConceptDocumentRow(${idx}, ${dIdx})" class="text-xs text-slate-400 hover:text-rose-600 p-1">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="py-10 text-center text-slate-400 italic text-xs">
                        No specific precedent documents or clauses attached to this concept yet.
                    </div>
                `}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'related') {
        // Tab: Related Concepts
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Related Legal Concepts in ${c.category || 'General'}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${related.map(rel => `
                        <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition cursor-pointer group" onclick="window.openConceptDetailWorkspace(${rel.originalIndex})">
                            <h5 class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition truncate">${rel.item.title}</h5>
                            <p class="text-[11px] text-slate-400 line-clamp-2 mt-1">${(rel.item.body || '').replace(/<[^>]*>?/gm, ' ')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'intel') {
        // Tab: Linked Market Intelligence
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Market Developments Linked to ${c.title}</h3>
                ${linkedFactors.length > 0 ? `
                    <div class="space-y-3">
                        ${linkedFactors.map(f => `
                            <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer" onclick="switchState('INTELLIGENCE')">
                                <div class="flex justify-between items-center mb-1">
                                    <h5 class="text-xs font-bold text-slate-900 dark:text-white">${f.title}</h5>
                                    <span class="text-[10px] font-mono text-slate-400">${f.date || ''}</span>
                                </div>
                                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">${(f.description || '').replace(/<[^>]*>?/gm, ' ')}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="py-10 text-center text-slate-400 italic text-xs">
                        No live market intelligence records currently tag this concept.
                    </div>
                `}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'srs') {
        // Tab: SRS & Notes
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Revision Notes & Memory Schedule</h3>
                    <button type="button" onclick="window.openEditConceptModal(${idx})" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Edit Notes</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Mastery Status</span>
                        <span class="text-sm font-black ${masteryPct >= 50 ? 'text-emerald-600' : 'text-indigo-600'}">${masteryPct}% (${srs.mastered ? 'Mastered' : 'Learning'})</span>
                    </div>
                    <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Interval</span>
                        <span class="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">${srs.interval || 0} days</span>
                    </div>
                    <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Ease Multiplier</span>
                        <span class="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">${(srs.ease || 2.5).toFixed(2)}</span>
                    </div>
                    <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Next Review</span>
                        <span class="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">${nextReviewFormatted}</span>
                    </div>
                </div>

                <div class="pt-3">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Personal Study Notes</h4>
                    <p class="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${c.notes || 'No private study notes recorded. Use the editor to add notes.'}</p>
                </div>
            </div>
        `;
    }

    // Full layout output
    detailWrapper.innerHTML = `
        <div class="max-w-[1600px] mx-auto w-full space-y-6">
            
            <!-- Breadcrumbs Navigation -->
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button type="button" onclick="window.closeConceptDetailWorkspace()" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-medium flex items-center gap-1">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Concepts
                    </button>
                    <span>/</span>
                    <span class="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" onclick="window.closeConceptDetailWorkspace()">${c.category || 'General'}</span>
                    <span>/</span>
                    <span class="text-slate-800 dark:text-white font-bold truncate">${c.title || 'Untitled'}</span>
                </div>

                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.closeConceptDetailWorkspace()" class="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition">
                        Back to Library
                    </button>
                </div>
            </div>

            <!-- Header Title Row -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h1 class="text-2xl md:text-4xl font-serif font-black text-slate-900 dark:text-white tracking-tight">
                            ${c.title || 'Untitled Concept'}
                        </h1>
                        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white shadow-xs" title="Verified Legal Concept">
                            <i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>
                        </span>
                    </div>
                    <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                        ${c.summary || (c.body ? c.body.replace(/<[^>]*>?/gm, ' ').substring(0, 160) + '...' : 'Tracked corporate legal concept.')}
                    </p>
                    
                    <!-- Tag Row -->
                    <div class="flex items-center gap-2 flex-wrap pt-1">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            ${c.category || 'General'}
                        </span>
                        ${tagBadgesHtml}
                        <button type="button" onclick="window.promptAddConceptTag(${idx})" class="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1 transition px-1">
                            <i data-lucide="plus" class="w-3 h-3"></i> Add tag
                        </button>
                    </div>
                </div>

                <!-- Action Triggers -->
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="window.openEditConceptModal(${idx})" class="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm flex items-center gap-1.5">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Concept
                    </button>
                    <button type="button" onclick="window.deleteConcept(${idx}); window.closeConceptDetailWorkspace();" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition" title="Delete Concept">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Workspace Tab Bar -->
            <div class="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto scrollbar-hide">
                ${tabNavHtml}
            </div>

            <!-- Main Body & Sidebar Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                <!-- LEFT 8 COLUMNS: Active Tab Area -->
                <div class="lg:col-span-8 space-y-6">
                    ${tabContentHtml}

                    <!-- Footer Stamp -->
                    <div class="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4 gap-2">
                        <span>Last updated on ${lastReviewedFormatted}</span>
                        <span class="font-mono">Concept ID: ${conceptCode}</span>
                    </div>
                </div>

                <!-- RIGHT 4 COLUMNS: Strategy Sidebar -->
                <div class="lg:col-span-4 space-y-6">
                    
                    <!-- Mastery & Review Card -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Mastery & Review</h3>
                            <button type="button" onclick="openFlashcardDashboard('concepts')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                Review history &rarr;
                            </button>
                        </div>

                        <!-- Progress Circle -->
                        <div class="flex items-center gap-6 mb-6">
                            <div class="relative w-20 h-20 shrink-0 flex items-center justify-center">
                                <svg class="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="${radius}" fill="transparent" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="6"></circle>
                                    <circle cx="40" cy="40" r="${radius}" fill="transparent" stroke="${masteryPct >= 50 ? '#10b981' : '#2563eb'}" stroke-width="6" 
                                            stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                                            stroke-linecap="round" class="transition-all duration-700 ease-out"></circle>
                                </svg>
                                <div class="absolute flex flex-col items-center">
                                    <span class="text-base font-serif font-black text-slate-900 dark:text-white leading-none">${masteryPct}%</span>
                                    <span class="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">Mastered</span>
                                </div>
                            </div>

                            <div class="flex-1 space-y-1.5 text-xs">
                                <div class="flex justify-between text-slate-500">
                                    <span>Last reviewed</span>
                                    <span class="font-mono font-semibold text-slate-800 dark:text-slate-200">${lastReviewedFormatted}</span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Next review</span>
                                    <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">${nextReviewFormatted}</span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Review streak</span>
                                    <span class="font-semibold text-orange-500 flex items-center gap-0.5">
                                        <i data-lucide="flame" class="w-3 h-3"></i> ${srs.interval || 1} days
                                    </span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Total reviews</span>
                                    <span class="font-mono font-semibold text-slate-800 dark:text-slate-200">${totalReviewsCount}</span>
                                </div>
                            </div>
                        </div>

                        <button type="button" onclick="reviewSelectedCards('concepts')" class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition shadow-xs">
                            Start Review
                        </button>
                    </div>

                    <!-- Related Concepts Card -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Related concepts (${related.length})</h3>
                            <button type="button" onclick="window.closeConceptDetailWorkspace()" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all &rarr;</button>
                        </div>
                        <div class="space-y-2.5">
                            ${related.length > 0 ? related.map(rel => `
                                <div class="flex justify-between items-center text-xs py-1.5 cursor-pointer group" onclick="window.openConceptDetailWorkspace(${rel.originalIndex})">
                                    <span class="text-slate-700 dark:text-slate-300 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate pr-2">
                                        ${rel.item.title}
                                    </span>
                                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 shrink-0">
                                        Related
                                    </span>
                                </div>
                            `).join('') : `
                                <p class="text-xs text-slate-400 italic">No other concepts logged in this category.</p>
                            `}
                        </div>
                    </div>

                    <!-- Recent Intelligence Card -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Linked intelligence (${linkedFactors.length})</h3>
                            <button type="button" onclick="switchState('INTELLIGENCE')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all &rarr;</button>
                        </div>
                        <div class="space-y-2.5">
                            ${linkedFactors.length > 0 ? linkedFactors.slice(0, 4).map(lf => `
                                <div class="flex justify-between items-start text-xs py-1 cursor-pointer group" onclick="switchState('INTELLIGENCE')">
                                    <span class="text-slate-700 dark:text-slate-300 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1 pr-2">
                                        ${lf.title}
                                    </span>
                                    <span class="text-[10px] font-mono text-slate-400 shrink-0">${lf.date || 'Recent'}</span>
                                </div>
                            `).join('') : `
                                <p class="text-xs text-slate-400 italic">No market intelligence linked to this concept.</p>
                            `}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    if (typeof applyDictionaryHighlighting === 'function') {
        applyDictionaryHighlighting("conceptDetailWorkspaceWrapper");
    }
};

/**
 * Helper to add document rows
 */
window.addConceptDocumentRow = function(conceptIdx) {
    const name = prompt("Enter document or precedent clause name (e.g., Schedule 4 - Tax Indemnity):");
    if (!name || !name.trim()) return;
    const type = prompt("Enter type (e.g., DOCX, PDF, Clause):", "DOCX");

    const c = db.concepts[conceptIdx];
    if (!Array.isArray(c.documents)) c.documents = [];
    c.documents.push({ name: name.trim(), type: type || 'DOCX', notes: 'Precedent reference' });
    
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderConceptDetailView();
};

window.removeConceptDocumentRow = function(conceptIdx, docIdx) {
    const c = db.concepts[conceptIdx];
    if (c && Array.isArray(c.documents)) {
        c.documents.splice(docIdx, 1);
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
    }
};