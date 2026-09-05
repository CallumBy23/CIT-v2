// =========================================================================
// MARKET INTELLIGENCE DETAILED WORKSPACE (AI ANALYSIS + ROBUST CROSS-LINKS)
// =========================================================================

window.activeIntelDetailIndex = null;
window.activeIntelDetailTab = 'overview';
window.isIntelDetailEditMode = false;
window.directIntelQuill = null;

function getOrCreateIntelDetailWrapper() {
    let detailWrapper = document.getElementById("intelDetailWorkspaceWrapper");
    if (!detailWrapper) {
        detailWrapper = document.createElement("div");
        detailWrapper.id = "intelDetailWorkspaceWrapper";
        detailWrapper.className = "w-full h-full overflow-y-auto custom-scrollbar p-2 md:p-4 bg-[#fbfbfc] dark:bg-[#0c101a] text-slate-800 dark:text-slate-100 transition-colors duration-200";
        
        const intelApp = document.getElementById("appIntelligence");
        if (intelApp) {
            intelApp.appendChild(detailWrapper);
        }
    }
    return detailWrapper;
}

window.openIntelDetailWorkspace = function(index) {
    index = parseInt(index, 10);
    const factor = db.factors && db.factors[index];
    if (!factor) return;

    if (!Array.isArray(factor.linkedConcepts)) {
        factor.linkedConcepts = factor.linkedConcept ? [factor.linkedConcept] : (factor.linked_concept ? [factor.linked_concept] : []);
    }
    if (!Array.isArray(factor.linkedFirms)) {
        factor.linkedFirms = factor.linkedFirm ? [factor.linkedFirm] : (factor.linked_firm ? [factor.linked_firm] : []);
    }

    window.activeIntelDetailIndex = index;
    window.activeIntelDetailTab = 'overview';
    window.isIntelDetailEditMode = false;

    const detailWrapper = getOrCreateIntelDetailWrapper();

    const mainTableScroll = document.querySelector("#appIntelligence > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    if (detailWrapper) detailWrapper.classList.remove("hidden");

    window.renderIntelDetailView();
};

window.closeIntelDetailWorkspace = function() {
    const detailWrapper = document.getElementById("intelDetailWorkspaceWrapper");
    if (detailWrapper) detailWrapper.classList.add("hidden");

    const mainTableScroll = document.querySelector("#appIntelligence > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.remove("hidden");

    window.activeIntelDetailIndex = null;
    window.isIntelDetailEditMode = false;
    if (typeof window.renderFeed === 'function') window.renderFeed();
};

window.switchIntelDetailTab = function(tabKey) {
    if (window.isIntelDetailEditMode && window.activeIntelDetailTab === 'overview') {
        window.syncDirectIntelInputsToMemory();
    }
    window.activeIntelDetailTab = tabKey;
    window.renderIntelDetailView();
};

window.toggleIntelEditMode = function(enable) {
    window.isIntelDetailEditMode = enable !== undefined ? enable : !window.isIntelDetailEditMode;
    window.renderIntelDetailView();
};

window.syncDirectIntelInputsToMemory = function() {
    if (window.activeIntelDetailIndex === null) return;
    const f = db.factors[window.activeIntelDetailIndex];
    if (!f) return;

    const titleEl = document.getElementById("inpageIntelTitle");
    const summaryEl = document.getElementById("inpageIntelSummary");
    const pestleEl = document.getElementById("inpageIntelPestle");
    const wsEl = document.getElementById("inpageIntelWorkspace");
    const metricEl = document.getElementById("inpageIntelMetric");
    const implicationsEl = document.getElementById("inpageIntelImplications");

    if (titleEl && titleEl.value.trim()) f.title = titleEl.value.trim();
    if (summaryEl) f.summary = summaryEl.value.trim();
    if (pestleEl) f.pestle = pestleEl.value;
    if (wsEl) f.workspace = wsEl.value.trim();
    if (metricEl) f.metric = metricEl.value.trim();
    if (implicationsEl) f.implications = implicationsEl.value.trim();

    if (window.directIntelQuill && window.directIntelQuill.root) {
        const qHtml = window.directIntelQuill.root.innerHTML;
        f.description = qHtml === "<p><br></p>" ? "" : qHtml;
    }

    f.linkedConcept = (f.linkedConcepts && f.linkedConcepts[0]) || "";
    f.linkedFirm = (f.linkedFirms && f.linkedFirms[0]) || "";
};

window.saveDirectIntelWorkspace = async function() {
    const targetIdx = window.activeIntelDetailIndex;
    if (targetIdx === null) return;

    window.syncDirectIntelInputsToMemory();
    window.isIntelDetailEditMode = false;

    window.renderIntelDetailView();
    if (typeof showToast === 'function') {
        showToast("Insight updated.", "success");
    }

    if (typeof saveDatabase === 'function') {
        await saveDatabase();
    }
};

/**
 * Bulletproof Concept Routing (Handles quotes and symbols properly)
 */
window.safeRouteToConcept = function(encodedConceptTitle) {
    const rawTitle = decodeURIComponent(encodedConceptTitle);
    if (!rawTitle) return;

    const clean = rawTitle.trim().toLowerCase();
    const idx = (db.concepts || []).findIndex(c => {
        if (!c || !c.title) return false;
        const target = c.title.trim().toLowerCase();
        return target === clean || target.includes(clean) || clean.includes(target);
    });

    if (idx !== -1) {
        // Exit current intel workspace
        window.closeIntelDetailWorkspace();
        switchState('CONCEPTS');
        setTimeout(() => {
            if (typeof window.openConceptDetailWorkspace === 'function') {
                window.openConceptDetailWorkspace(idx);
            }
        }, 120);
    } else {
        alert(`Concept "${rawTitle}" not found in Knowledge Library.`);
    }
};

/**
 * Bulletproof Firm Routing
 */
window.safeRouteToFirm = function(encodedFirmName) {
    const rawFirm = decodeURIComponent(encodedFirmName);
    if (!rawFirm) return;

    window.closeIntelDetailWorkspace();
    switchState('DOSSIERS');
    setTimeout(() => {
        if (typeof routeToFirm === 'function') {
            routeToFirm(rawFirm);
        }
    }, 120);
};

/**
 * AI Legal & Advisory Implications Generator
 */
window.generateArticleAIAnalysis = async function(factorIdx) {
    const f = db.factors[factorIdx];
    if (!f) return;

    const rawDesc = (f.description || "").replace(/<[^>]*>?/gm, ' ').trim();
    const conceptsJoined = (f.linkedConcepts || []).join(', ') || "Commercial Law";
    const firmsJoined = (f.linkedFirms || []).join(', ') || "City Law Firms";

    const promptText = `
You are a senior partner at an elite corporate law firm. Analyze this live market intelligence development for interview and assessment prep:

HEADLINE: ${f.title || f.headline}
PESTLE / SECTOR: ${f.pestle || 'Economic'} / ${f.workspace || 'General Market'}
KEY METRIC: ${f.metric || 'None specified'}
SUMMARY: ${f.summary || rawDesc.substring(0, 300)}
ARTICLE TEXT: ${rawDesc.substring(0, 1500)}
LINKED CONCEPTS: ${conceptsJoined}
RELEVANT FIRMS: ${firmsJoined}

Please provide a sharp, structured advisory brief:
1. COMMERCIAL TRIGGER & CLIENT EXPOSURE: Why do corporate clients care right now?
2. TRANSACTIONAL & LEGAL ANGLES: Specific M&A, regulatory, or contract drafting mechanisms impacted.
3. ADVISORY TALKING POINT: A concise, memorable 2-sentence response for a trainee or associate in an interview.
4. PARTNER PRESSURE QUESTION: One tough question an interviewer would ask on this topic.
    `.trim();

    if (typeof openAIAssessmentModal === 'function') {
        openAIAssessmentModal({
            mode: 'deconstruct',
            records: [f],
            persona: 'Magic Circle Partner',
            customPrompt: promptText,
            contextType: 'INTELLIGENCE'
        });
    } else {
        alert("Prompt built for AI Engine:\n\n" + promptText.substring(0, 400) + "...");
    }
};

/**
 * Add / Remove Cross-Linked Concepts & Firms
 */
window.addLinkedConceptToActiveFactor = function(conceptTitle) {
    if (window.activeIntelDetailIndex === null) return;
    const f = db.factors[window.activeIntelDetailIndex];
    if (!f) return;

    if (!Array.isArray(f.linkedConcepts)) f.linkedConcepts = [];

    const title = (conceptTitle || prompt("Select or type Concept Name to link:"))?.trim();
    if (!title) return;

    if (!f.linkedConcepts.some(c => c.toLowerCase() === title.toLowerCase())) {
        f.linkedConcepts.push(title);
        f.linkedConcept = f.linkedConcepts[0];
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderIntelDetailView();
        if (typeof showToast === 'function') showToast(`Linked concept "${title}"`, "success");
    }
};

window.removeLinkedConceptFromActiveFactor = function(cIdx) {
    if (window.activeIntelDetailIndex === null) return;
    const f = db.factors[window.activeIntelDetailIndex];
    if (!f || !Array.isArray(f.linkedConcepts)) return;

    const removed = f.linkedConcepts.splice(cIdx, 1);
    f.linkedConcept = f.linkedConcepts[0] || "";
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderIntelDetailView();
    if (typeof showToast === 'function') showToast(`Removed concept link "${removed}"`, "info");
};

window.addLinkedFirmToActiveFactor = function(firmName) {
    if (window.activeIntelDetailIndex === null) return;
    const f = db.factors[window.activeIntelDetailIndex];
    if (!f) return;

    if (!Array.isArray(f.linkedFirms)) f.linkedFirms = [];

    const firm = (firmName || prompt("Select or type Firm Name to link:"))?.trim();
    if (!firm) return;

    if (!f.linkedFirms.some(item => item.toLowerCase() === firm.toLowerCase())) {
        f.linkedFirms.push(firm);
        f.linkedFirm = f.linkedFirms[0];
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderIntelDetailView();
        if (typeof showToast === 'function') showToast(`Linked firm "${firm}"`, "success");
    }
};

window.removeLinkedFirmFromActiveFactor = function(fIdx) {
    if (window.activeIntelDetailIndex === null) return;
    const f = db.factors[window.activeIntelDetailIndex];
    if (!f || !Array.isArray(f.linkedFirms)) return;

    const removed = f.linkedFirms.splice(fIdx, 1);
    f.linkedFirm = f.linkedFirms[0] || "";
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderIntelDetailView();
    if (typeof showToast === 'function') showToast(`Removed firm link "${removed}"`, "info");
};

/**
 * Autocomplete Typeahead Dropdown
 */
window.handleIntelAutocompleteInput = function(type, inputEl) {
    const val = inputEl.value.trim().toLowerCase();
    const dropdownId = type === 'concept' ? 'intelConceptAutocompleteDropdown' : 'intelFirmAutocompleteDropdown';
    let dropdown = document.getElementById(dropdownId);

    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = dropdownId;
        dropdown.className = "absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl max-h-56 overflow-y-auto z-[999] divide-y divide-slate-100 dark:divide-slate-800 text-xs";
        inputEl.parentNode.classList.add("relative");
        inputEl.parentNode.appendChild(dropdown);
    }

    if (!val) {
        dropdown.classList.add("hidden");
        dropdown.innerHTML = "";
        return;
    }

    let candidates = [];
    if (type === 'concept') {
        candidates = (db.concepts || [])
            .map(c => (c && c.title ? c.title.trim() : ""))
            .filter(t => t && t.toLowerCase().includes(val))
            .slice(0, 10);
    } else {
        candidates = Object.keys(db.dossiers || {})
            .filter(f => f && f.toLowerCase().includes(val))
            .slice(0, 10);
    }

    if (candidates.length === 0) {
        dropdown.innerHTML = `<div class="p-2.5 text-slate-400 italic">No matching ${type}s found. Press Enter to add custom.</div>`;
        dropdown.classList.remove("hidden");
        return;
    }

    dropdown.innerHTML = candidates.map(item => {
        const enc = encodeURIComponent(item);
        return `
            <div class="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer font-bold text-slate-800 dark:text-slate-200 flex justify-between items-center transition"
                 onmousedown="event.preventDefault(); window.selectIntelAutocomplete('${type}', '${enc}');">
                <span>${item}</span>
                <span class="text-[9px] font-mono text-slate-400 uppercase">${type}</span>
            </div>
        `;
    }).join('');

    dropdown.classList.remove("hidden");
};

window.selectIntelAutocomplete = function(type, encodedItem) {
    const chosenItem = decodeURIComponent(encodedItem);
    if (!chosenItem) return;

    if (type === 'concept') {
        window.addLinkedConceptToActiveFactor(chosenItem);
        const input = document.getElementById("inputAddLinkedConcept");
        if (input) input.value = "";
    } else {
        window.addLinkedFirmToActiveFactor(chosenItem);
        const input = document.getElementById("inputAddLinkedFirm");
        if (input) input.value = "";
    }

    const drop = document.getElementById(type === 'concept' ? 'intelConceptAutocompleteDropdown' : 'intelFirmAutocompleteDropdown');
    if (drop) {
        drop.classList.add("hidden");
        drop.innerHTML = "";
    }
};

/**
 * Core View Renderer
 */
window.renderIntelDetailView = function() {
    if (window.activeIntelDetailIndex === null) return;

    const detailWrapper = getOrCreateIntelDetailWrapper();
    if (!detailWrapper) return;

    const mainTableScroll = document.querySelector("#appIntelligence > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    detailWrapper.classList.remove("hidden");

    const idx = window.activeIntelDetailIndex;
    const f = db.factors && db.factors[idx];
    if (!f) return;

    if (!Array.isArray(f.linkedConcepts)) {
        f.linkedConcepts = f.linkedConcept ? [f.linkedConcept] : (f.linked_concept ? [f.linked_concept] : []);
    }
    if (!Array.isArray(f.linkedFirms)) {
        f.linkedFirms = f.linkedFirm ? [f.linkedFirm] : (f.linked_firm ? [f.linked_firm] : []);
    }

    const title = f.title || f.headline || "Untitled Intelligence";
    const dateStr = f.date || "--";
    const factorCode = `INT-${String(idx + 1).padStart(6, '0')}`;

    const tabs = [
        { key: 'overview', label: 'Story & Context' },
        { key: 'implications', label: 'Commercial & Legal Implications' },
        { key: 'crosslinks', label: `Cross-Links (${f.linkedConcepts.length + f.linkedFirms.length})` }
    ];

    const tabNavHtml = tabs.map(t => {
        const isActive = window.activeIntelDetailTab === t.key;
        return `
            <button type="button" onclick="window.switchIntelDetailTab('${t.key}')" 
                class="py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap m-0 rounded-none cursor-pointer flex-shrink-0 ${
                    isActive 
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-800' 
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                }">
                ${t.label}
            </button>
        `;
    }).join('');

    let tabContentHtml = '';

    if (window.activeIntelDetailTab === 'overview') {
        if (window.isIntelDetailEditMode) {
            const pestleList = ["Political", "Economic", "Social", "Technological", "Legal", "Environmental", "Assessment"];
            const pestleOpts = pestleList.map(p => `<option value="${p}" ${p === f.pestle ? 'selected' : ''}>${p}</option>`).join('');

            tabContentHtml = `
                <div class="space-y-4">
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PESTLE Dimension</label>
                                <select id="inpageIntelPestle" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none">
                                    ${pestleOpts}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sector / Workspace</label>
                                <input type="text" id="inpageIntelWorkspace" value="${(f.workspace || 'General Market').replace(/"/g, '&quot;')}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none font-bold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Key Metric / Tag</label>
                                <input type="text" id="inpageIntelMetric" value="${(f.metric || '').replace(/"/g, '&quot;')}" placeholder="e.g. $2tn Valuation" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">One-Line Executive Summary</label>
                            <input type="text" id="inpageIntelSummary" value="${(f.summary || '').replace(/"/g, '&quot;')}" placeholder="Brief high-level summary..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Market Analysis & Background</label>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden bg-white dark:bg-slate-900 min-h-[220px]">
                            <div id="inpageIntelQuillToolbar" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-1">
                                <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button></span>
                                <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
                            </div>
                            <div id="inpageIntelBodyQuill" class="text-xs md:text-sm dark:text-white p-3 min-h-[170px]"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const cleanDesc = f.description || "<p class='text-slate-400 italic'>No extended analysis logged yet. Click 'Edit Insight' to add analysis.</p>";
            tabContentHtml = `
                <div class="space-y-3">
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Market Event Analysis</h4>
                        <div class="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 leading-relaxed dict-highlight-target dark:prose-invert">
                            ${cleanDesc}
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (window.activeIntelDetailTab === 'implications') {
        if (window.isIntelDetailEditMode) {
            tabContentHtml = `
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advisory Implications & Commercial Angle</label>
                    <textarea id="inpageIntelImplications" rows="8" placeholder="How does this trend affect corporate clients, deal execution, and law firm advisory practices?" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-3 text-xs outline-none leading-relaxed font-sans">${f.implications || ''}</textarea>
                </div>
            `;
        } else {
            const rawImps = (f.implications || "").trim();
            let parsedHtml = '';

            if (rawImps) {
                const lines = rawImps.split('\n').map(l => l.trim()).filter(Boolean);
                parsedHtml = `
                    <div class="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        ${lines.map(line => `
                            <div class="flex items-start gap-2 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 border border-slate-200/80 dark:border-slate-800 rounded-none">
                                <span class="text-indigo-500 font-bold mt-0.5">&bull;</span>
                                <span class="flex-1">${line}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                parsedHtml = `<p class="text-xs text-slate-400 italic py-6 text-center">No strategic implications logged yet. Click 'Edit Insight' to document advisory angles.</p>`;
            }

            tabContentHtml = `
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">Commercial & Legal Implications</h3>
                    ${parsedHtml}
                </div>
            `;
        }
    } else if (window.activeIntelDetailTab === 'crosslinks') {
        tabContentHtml = `
            <div class="space-y-4">
                <!-- Linked Concepts Section -->
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                    <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Linked Legal Concepts (${f.linkedConcepts.length})</h3>
                            <p class="text-[11px] text-slate-400 mt-0.5">Connect theoretical structures directly to this market event.</p>
                        </div>
                    </div>

                    <div class="relative flex gap-2">
                        <input type="text" id="inputAddLinkedConcept" 
                               oninput="window.handleIntelAutocompleteInput('concept', this)" 
                               onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.addLinkedConceptToActiveFactor(this.value); this.value=''; }"
                               placeholder="Search or type concept name..." 
                               class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-xs outline-none font-medium">
                        <button type="button" onclick="const el=document.getElementById('inputAddLinkedConcept'); window.addLinkedConceptToActiveFactor(el.value); el.value='';" 
                                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition">
                            + Add Concept
                        </button>
                    </div>

                    ${f.linkedConcepts.length > 0 ? `
                        <div class="space-y-2 pt-1">
                            ${f.linkedConcepts.map((conceptTitle, cIdx) => {
                                const enc = encodeURIComponent(conceptTitle);
                                const matched = (db.concepts || []).find(c => c && c.title && c.title.toLowerCase() === conceptTitle.toLowerCase());
                                return `
                                    <div class="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition group">
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3 cursor-pointer" onclick="window.safeRouteToConcept('${enc}')">
                                            <div class="w-6 h-6 rounded-none bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <span class="text-xs font-bold text-slate-800 dark:text-slate-100 hover:underline truncate block">${conceptTitle}</span>
                                                <span class="text-[10px] text-slate-400 truncate block">${matched ? (matched.category || "General") : "Custom Concept"}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <button type="button" onclick="window.safeRouteToConcept('${enc}')" class="px-2 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1">
                                                Open <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                            </button>
                                            <button type="button" onclick="window.removeLinkedConceptFromActiveFactor(${cIdx})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `<p class="text-xs text-slate-400 italic py-4 text-center">No legal concepts linked to this record yet.</p>`}
                </div>

                <!-- Linked Target Firms Section -->
                <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                    <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Linked Target Firms (${f.linkedFirms.length})</h3>
                            <p class="text-[11px] text-slate-400 mt-0.5">Tie this market intelligence directly to candidate interview prep and firm profiles.</p>
                        </div>
                    </div>

                    <div class="relative flex gap-2">
                        <input type="text" id="inputAddLinkedFirm" 
                               oninput="window.handleIntelAutocompleteInput('firm', this)" 
                               onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.addLinkedFirmToActiveFactor(this.value); this.value=''; }"
                               placeholder="Search or type firm name..." 
                               class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-xs outline-none font-medium">
                        <button type="button" onclick="const el=document.getElementById('inputAddLinkedFirm'); window.addLinkedFirmToActiveFactor(el.value); el.value='';" 
                                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition">
                            + Add Firm
                        </button>
                    </div>

                    ${f.linkedFirms.length > 0 ? `
                        <div class="space-y-2 pt-1">
                            ${f.linkedFirms.map((firmName, fIdx) => {
                                const enc = encodeURIComponent(firmName);
                                return `
                                    <div class="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-emerald-300 dark:hover:border-emerald-600 transition group">
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3 cursor-pointer" onclick="window.safeRouteToFirm('${enc}')">
                                            <div class="w-6 h-6 rounded-none bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200 dark:border-emerald-800">
                                                <i data-lucide="building-2" class="w-3.5 h-3.5"></i>
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <span class="text-xs font-bold text-slate-800 dark:text-slate-100 hover:underline truncate block">${firmName}</span>
                                                <span class="text-[10px] text-slate-400 truncate block">Target Firm Profile</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <button type="button" onclick="window.safeRouteToFirm('${enc}')" class="px-2 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1">
                                                Dossier <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                            </button>
                                            <button type="button" onclick="window.removeLinkedFirmFromActiveFactor(${fIdx})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `<p class="text-xs text-slate-400 italic py-4 text-center">No law firms linked to this record yet.</p>`}
                </div>
            </div>
        `;
    }

    const actionButtonsHtml = window.isIntelDetailEditMode ? `
        <div class="flex items-center gap-2">
            <button type="button" onclick="window.toggleIntelEditMode(false)" class="px-3 py-1.5 rounded-none text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Cancel
            </button>
            <button type="button" onclick="window.saveDirectIntelWorkspace()" class="px-3.5 py-1.5 rounded-none text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center gap-1.5">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Save Changes
            </button>
        </div>
    ` : `
        <div class="flex items-center gap-2">
            <button type="button" onclick="window.generateArticleAIAnalysis(${idx})" class="px-3 py-1.5 rounded-none text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition shadow-xs flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i> AI Analysis
            </button>
            <button type="button" onclick="window.toggleIntelEditMode(true)" class="px-3 py-1.5 rounded-none text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs flex items-center gap-1.5">
                Edit Insight
            </button>
            <button type="button" onclick="window.deleteIntelFactor(${idx}); window.closeIntelDetailWorkspace();" class="p-1.5 rounded-none text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `;

    detailWrapper.innerHTML = `
        <div class="max-w-[1700px] mx-auto w-full space-y-2.5">
            
            <!-- Pinned Header Breadcrumb Navigation -->
            <div class="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <div class="flex items-center gap-2 text-[11px] text-slate-400 font-medium overflow-hidden">
                    <button type="button" onclick="window.closeIntelDetailWorkspace()" class="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer rounded-none">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back to Feed
                    </button>
                    <span class="text-slate-300 dark:text-slate-600">|</span>
                    <button type="button" onclick="window.closeIntelDetailWorkspace()" class="hover:text-slate-700 dark:hover:text-slate-200 transition">Intelligence</button>
                    <span class="text-slate-300 dark:text-slate-600">&rsaquo;</span>
                    <span class="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" onclick="window.closeIntelDetailWorkspace()">${f.pestle || 'Economic'}</span>
                    <span class="text-slate-300 dark:text-slate-600">&rsaquo;</span>
                    <span class="text-slate-600 dark:text-slate-300 font-semibold truncate">${title}</span>
                </div>
            </div>

            <!-- Header Title Row -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="space-y-1 flex-1 min-w-0">
                    ${window.isIntelDetailEditMode ? `
                        <input type="text" id="inpageIntelTitle" value="${title.replace(/"/g, '&quot;')}" class="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner">
                    ` : `
                        <h1 class="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight">${title}</h1>
                    `}

                    <p class="text-[11px] text-slate-500 leading-relaxed max-w-4xl">
                        ${f.summary || (f.description ? f.description.replace(/<[^>]*>?/gm, ' ').substring(0, 140) + '...' : 'Live market intelligence event.')}
                    </p>

                    <div class="flex items-center gap-1.5 flex-wrap pt-0.5 pb-2 mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-bold bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900 uppercase">
                            ${f.pestle || 'Economic'}
                        </span>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            ${f.workspace || 'General Market'}
                        </span>
                        ${f.metric ? `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                ${f.metric}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="shrink-0 self-end sm:self-center">
                    ${actionButtonsHtml}
                </div>
            </div>

            <!-- Zero-Gap Sub-Tab Bar -->
            <div id="intelDetailWorkspaceTabsBar" class="overflow-x-auto scrollbar-hide pt-2 mt-3 border-b-2 border-slate-200 dark:border-slate-800">
                ${tabNavHtml}
            </div>

            <!-- Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start pt-1">
                
                <div class="lg:col-span-8 space-y-3">
                    ${tabContentHtml}

                    <div class="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/80 dark:border-slate-800 pt-3">
                        <span>Logged on ${dateStr}</span>
                        <span class="font-mono">Factor ID: ${factorCode}</span>
                    </div>
                </div>

                <!-- Right-Hand Strategic Panel -->
                <div class="lg:col-span-4 space-y-3">
                    
                    <!-- AI Assessment Box -->
                    <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0f172a] dark:to-[#1e293b] p-4 text-white border border-slate-700 shadow-sm rounded-none space-y-2.5">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="cpu" class="w-4 h-4 text-indigo-400"></i>
                            <h3 class="text-xs font-bold uppercase tracking-wider">AI Insight Simulation</h3>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Simulate interview drill queries or deconstruct transactional client angles for this event.
                        </p>
                        <div class="grid grid-cols-2 gap-2 pt-1">
                            <button type="button" onclick="if(typeof openAIAssessmentModal==='function') openAIAssessmentModal({mode:'mock-interview', records:[db.factors[${idx}]], persona:'Standard Partner', contextType:'INTELLIGENCE'});" class="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1 border border-white/10">
                                <i data-lucide="mic" class="w-3 h-3"></i> Interview Drill
                            </button>
                            <button type="button" onclick="if(typeof openAIAssessmentModal==='function') openAIAssessmentModal({mode:'deconstruct', records:[db.factors[${idx}]], persona:'Standard Partner', contextType:'INTELLIGENCE'});" class="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1 border border-white/10">
                                <i data-lucide="hammer" class="w-3 h-3"></i> Deconstruct
                            </button>
                        </div>
                    </div>

                    <!-- Linked Concepts List Widget (Direct Link Navigation) -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <div class="flex justify-between items-center mb-0.5">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Linked Concepts (${f.linkedConcepts.length})</h3>
                            <button type="button" onclick="window.switchIntelDetailTab('crosslinks')" class="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Manage &rarr;</button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${f.linkedConcepts.length > 0 ? f.linkedConcepts.map(cTitle => {
                                const enc = encodeURIComponent(cTitle);
                                return `
                                    <div class="py-2 flex justify-between items-center cursor-pointer group" onclick="window.safeRouteToConcept('${enc}')">
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition truncate pr-2">${cTitle}</span>
                                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0"></i>
                                    </div>
                                `;
                            }).join('') : `
                                <p class="text-xs text-slate-400 italic py-2">No concepts linked.</p>
                            `}
                        </div>
                    </div>

                    <!-- Target Firms List Widget (Direct Dossier Navigation) -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <div class="flex justify-between items-center mb-0.5">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Target Firm Dossiers (${f.linkedFirms.length})</h3>
                            <button type="button" onclick="window.switchIntelDetailTab('crosslinks')" class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Manage &rarr;</button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${f.linkedFirms.length > 0 ? f.linkedFirms.map(firmName => {
                                const enc = encodeURIComponent(firmName);
                                return `
                                    <div class="py-2 flex justify-between items-center cursor-pointer group" onclick="window.safeRouteToFirm('${enc}')">
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition truncate pr-2">${firmName}</span>
                                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0"></i>
                                    </div>
                                `;
                            }).join('') : `
                                <p class="text-xs text-slate-400 italic py-2">No firms linked.</p>
                            `}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    `;

    if (window.isIntelDetailEditMode && window.activeIntelDetailTab === 'overview' && typeof window.getOrInitQuill === 'function') {
        window.directIntelQuill = window.getOrInitQuill('#inpageIntelBodyQuill', {
            modules: { toolbar: '#inpageIntelQuillToolbar' }
        });
        if (window.directIntelQuill && window.directIntelQuill.root) {
            window.directIntelQuill.root.innerHTML = f.description || "";
        }
    }

    if (window.lucide) window.lucide.createIcons();
    if (typeof applyDictionaryHighlighting === 'function') {
        applyDictionaryHighlighting("intelDetailWorkspaceWrapper");
    }
};

/**
 * Modernized Blank Factor Creator
 * Opens a clean full-screen editor pre-filled with the active category tab
 */
window.openNewIntelWorkspace = function() {
    if (!Array.isArray(db.factors)) db.factors = [];

    const activeWs = (typeof currentWorkspace !== 'undefined' && currentWorkspace && currentWorkspace !== "All" && currentWorkspace !== "ALL INTELLIGENCE") 
        ? currentWorkspace 
        : (db.workspaces && db.workspaces[0] ? db.workspaces[0] : "General Market");

    const newFactor = {
        title: "",
        summary: "",
        description: "",
        implications: "",
        metric: "",
        pestle: "Economic",
        region: "UK Focus",
        workspace: activeWs,
        linkedConcept: "",
        linkedConcepts: [],
        linkedFirm: "",
        linkedFirms: [],
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    // Prepend new blank factor to memory
    db.factors.unshift(newFactor);
    window.activeIntelDetailIndex = 0;
    window.activeIntelDetailTab = 'overview';
    window.isIntelDetailEditMode = true;

    const detailWrapper = getOrCreateIntelDetailWrapper();
    const mainTableScroll = document.querySelector("#appIntelligence > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    if (detailWrapper) detailWrapper.classList.remove("hidden");

    window.renderIntelDetailView();

    // Focus on Title immediately
    setTimeout(() => {
        const titleEl = document.getElementById("inpageIntelTitle");
        if (titleEl) {
            titleEl.placeholder = "Enter article headline or market development...";
            titleEl.focus();
        }
    }, 100);
};