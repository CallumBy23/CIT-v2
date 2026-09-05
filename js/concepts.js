// CONCEPTS RENDERING & KMS TABLE ENGINE (ENTERPRISE TABLE + DIRECT WORKSPACE)
// =====================================================================

window.conceptCurrentPage = 1;
window.conceptPageSize = 10;
window.selectedConcepts = window.selectedConcepts || new Set();

// Active Filter States
window.conceptSelectedCategory = "All";
window.conceptSelectedPracticeArea = "All";
window.conceptSelectedMastery = "All";

// Active Concept Being Edited Directly
window.activeConceptEditIndex = null;

// --- DEBOUNCED SEARCH & FAST FILTER STATE ---
let conceptSearchDebounceTimer = null;

window.onConceptSearchInput = function() {
    clearTimeout(conceptSearchDebounceTimer);
    conceptSearchDebounceTimer = setTimeout(() => {
        window.conceptCurrentPage = 1;
        window.renderConcepts();
    }, 100);
};

// Auto-bind listener to override synchronous inline oninput calls
window.initConceptSearchFast = function() {
    const searchBox = document.getElementById("searchConcepts");
    if (searchBox && !searchBox.dataset.fastBound) {
        searchBox.dataset.fastBound = "true";
        searchBox.removeAttribute("oninput");
        searchBox.addEventListener("input", window.onConceptSearchInput);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initConceptSearchFast);
} else {
    window.initConceptSearchFast();
}

// --- ALPHABET FILTER STATE ---
window.activeConceptAlpha = new Set();
window.activeDictAlpha = new Set();

window.toggleAlphabetFilter = function(letter, source) {
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    if (letter === 'ALL') {
        set.clear();
    } else {
        if (set.has(letter)) set.delete(letter);
        else set.add(letter);
    }

    window.renderAlphabetBar(source);
    window.conceptCurrentPage = 1;
    
    if (source === 'concepts') window.renderConcepts();
    if (source === 'dictionary' && typeof renderDictionary === 'function') renderDictionary();
};

window.renderAlphabetBar = function(source) {
    const containerId = source === 'concepts' ? 'conceptAlphabetBar' : 'dictAlphabetBar';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    const alphabet = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    
    container.innerHTML = alphabet.map(letter => {
        const isActive = letter === 'ALL' ? set.size === 0 : set.has(letter);
        const baseClass = "px-2 py-1 text-[11px] font-bold rounded-md cursor-pointer transition shrink-0 border ";
        const activeClass = isActive 
            ? "bg-indigo-600 text-white border-indigo-700 shadow-sm" 
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white";
        return `<button type="button" onclick="window.toggleAlphabetFilter('${letter}', '${source}')" class="${baseClass} ${activeClass}">${letter}</button>`;
    }).join('');
};

window.onConceptFilterChange = function() {
    const catEl = document.getElementById('conceptFilterCategory');
    const paEl = document.getElementById('conceptFilterPracticeArea');
    const masteryEl = document.getElementById('conceptFilterMastery');

    window.conceptSelectedCategory = catEl ? catEl.value : "All";
    window.conceptSelectedPracticeArea = paEl ? paEl.value : "All";
    window.conceptSelectedMastery = masteryEl ? masteryEl.value : "All";

    window.conceptCurrentPage = 1;
    window.renderConcepts();
};

window.resetConceptFilters = function() {
    const catEl = document.getElementById('conceptFilterCategory');
    const paEl = document.getElementById('conceptFilterPracticeArea');
    const masteryEl = document.getElementById('conceptFilterMastery');
    const searchEl = document.getElementById('searchConcepts');
    const sortEl = document.getElementById('sortConcepts');

    if (catEl) catEl.value = "All";
    if (paEl) paEl.value = "All";
    if (masteryEl) masteryEl.value = "All";
    if (searchEl) searchEl.value = "";
    if (sortEl) sortEl.value = "az";

    window.conceptSelectedCategory = "All";
    window.conceptSelectedPracticeArea = "All";
    window.conceptSelectedMastery = "All";
    window.activeConceptAlpha.clear();

    window.conceptCurrentPage = 1;
    window.renderAlphabetBar('concepts');
    window.renderConcepts();
};

// Populates dropdowns only when forced or on first load (Never freezes typing)
window.populateConceptFilterDropdowns = function(force = false) {
    const catEl = document.getElementById('conceptFilterCategory');
    const paEl = document.getElementById('conceptFilterPracticeArea');

    if (catEl && (!catEl.dataset.populated || force)) {
        const rawCategories = (typeof db !== 'undefined' && db.conceptCategories && db.conceptCategories.length > 0)
            ? db.conceptCategories
            : Array.from(new Set(((typeof db !== 'undefined' && db.concepts) || []).map(c => c.category || "General")));
        
        // Strictly exclude Interview Vault from categories
        const categories = rawCategories.filter(cat => cat !== "Interview Vault");
        
        let opts = `<option value="All">All Categories</option>`;
        categories.forEach(cat => {
            opts += `<option value="${cat}">${cat}</option>`;
        });
        catEl.innerHTML = opts;
        catEl.value = window.conceptSelectedCategory || "All";
        catEl.dataset.populated = "true";
    }

    if (paEl && (!paEl.dataset.populated || force)) {
        const subTags = new Set();
        ((typeof db !== 'undefined' && db.concepts) || []).forEach(c => {
            if (c.subTag) {
                c.subTag.split(',').forEach(st => {
                    const trimmed = st.trim();
                    if (trimmed) subTags.add(trimmed);
                });
            }
        });
        
        let paOpts = `<option value="All">All Practice Areas</option>`;
        Array.from(subTags).sort().forEach(tag => {
            paOpts += `<option value="${tag}">${tag}</option>`;
        });
        paEl.innerHTML = paOpts;
        paEl.value = window.conceptSelectedPracticeArea || "All";
        paEl.dataset.populated = "true";
    }
};

window.setConceptPage = function(page) {
    window.conceptCurrentPage = page;
    window.renderConcepts();
};

// --- DATA TABLE RENDERING ENGINE ---
window.renderConcepts = function() {
    const container = document.getElementById("conceptsContainer");
    if (!container) return;
    
    window.initConceptSearchFast();

    try {
        window.currentVisibleConceptIndices = [];
        window.populateConceptFilterDropdowns(false);

        const rawConcepts = (typeof db !== 'undefined' && db.concepts) ? db.concepts : [];

        // 1. Mastery Status Summary Widget
        const widgetContainer = document.getElementById("conceptMasteryWidget");
        if (widgetContainer) {
            const activeCat = (window.conceptSelectedCategory && window.conceptSelectedCategory !== "All")
                ? window.conceptSelectedCategory
                : ((typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All")
                    ? currentConceptCategory
                    : "All");

            let targetConcepts = activeCat === "All" 
                ? rawConcepts 
                : rawConcepts.filter(c => c && c.category === activeCat);

            const total = targetConcepts.length;
            let mastered = 0;
            for (let i = 0; i < total; i++) {
                const c = targetConcepts[i];
                if (c && c.srs && (c.srs.mastered || c.srs.interval >= 21)) {
                    mastered++;
                }
            }

            const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);
            const isHighMastery = pct >= 50;

            widgetContainer.innerHTML = `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-xs flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${isHighMastery ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse shrink-0"></span>
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate max-w-[160px]">${activeCat === 'All' ? 'All Concepts' : activeCat}:</span>
                    <div class="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
                        <div class="${isHighMastery ? 'bg-emerald-500' : 'bg-indigo-600'} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                    <span class="font-mono font-bold text-xs ${isHighMastery ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'} shrink-0">${pct}%</span>
                </div>
            `;
            widgetContainer.classList.remove('hidden');
        }

        // 2. High-Performance Filtering (Avoids synchronous regex scans on body)
        const searchBox = document.getElementById("searchConcepts");
        const term = searchBox ? searchBox.value.toLowerCase().trim() : "";
        let filtered = rawConcepts;

        if (typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All") {
            filtered = filtered.filter(c => c.category === currentConceptCategory);
        }

        if (window.conceptSelectedCategory && window.conceptSelectedCategory !== "All") {
            filtered = filtered.filter(c => c.category === window.conceptSelectedCategory);
        }

        if (window.conceptSelectedPracticeArea && window.conceptSelectedPracticeArea !== "All") {
            const paMatch = window.conceptSelectedPracticeArea.toLowerCase();
            filtered = filtered.filter(c => (c.subTag || "").toLowerCase().includes(paMatch));
        }

        if (window.conceptSelectedMastery && window.conceptSelectedMastery !== "All") {
            const now = Date.now();
            if (window.conceptSelectedMastery === "mastered") {
                filtered = filtered.filter(c => c.srs && (c.srs.mastered || c.srs.interval >= 21));
            } else if (window.conceptSelectedMastery === "learning") {
                filtered = filtered.filter(c => !c.srs || (!c.srs.mastered && (c.srs.interval || 0) < 21));
            } else if (window.conceptSelectedMastery === "due") {
                filtered = filtered.filter(c => c.srs && c.srs.nextReview && c.srs.nextReview <= now);
            }
        }

        if (term) {
            filtered = filtered.filter(c => {
                if (c.title && c.title.toLowerCase().includes(term)) return true;
                if (c.subTag && c.subTag.toLowerCase().includes(term)) return true;
                if (c.summary && c.summary.toLowerCase().includes(term)) return true;
                if (c.body && c.body.toLowerCase().includes(term)) return true;
                return false;
            });
        }

        if (window.activeConceptAlpha && window.activeConceptAlpha.size > 0) {
            filtered = filtered.filter(c => {
                const titleStr = (c.title || "").trim();
                return titleStr ? window.activeConceptAlpha.has(titleStr.charAt(0).toUpperCase()) : false;
            });
        }

        // 3. Sorting
        let indexedConcepts = filtered.map(c => ({ concept: c, originalIndex: rawConcepts.indexOf(c) }));

        const sortBox = document.getElementById("sortConcepts");
        const sortMode = sortBox ? sortBox.value : "az";

        if (sortMode === "newest") {
            indexedConcepts.reverse();
        } else if (sortMode === "az") {
            indexedConcepts.sort((a, b) => String(a.concept.title || "").localeCompare(String(b.concept.title || "")));
        } else if (sortMode === "za") {
            indexedConcepts.sort((a, b) => String(b.concept.title || "").localeCompare(String(a.concept.title || "")));
        }

        // 4. Pagination
        const totalItems = indexedConcepts.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / window.conceptPageSize));
        if (window.conceptCurrentPage > totalPages) window.conceptCurrentPage = totalPages;
        if (window.conceptCurrentPage < 1) window.conceptCurrentPage = 1;

        const startIndex = (window.conceptCurrentPage - 1) * window.conceptPageSize;
        const pageConcepts = indexedConcepts.slice(startIndex, startIndex + window.conceptPageSize);

        if (totalItems === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <p class="text-xs font-medium text-slate-500">No concepts found matching your active filter criteria.</p>
                </div>`;
            return;
        }

        // 5. Build Table Rows
        let rowsHtml = '';
        for (let i = 0; i < pageConcepts.length; i++) {
            const { concept, originalIndex } = pageConcepts[i];
            window.currentVisibleConceptIndices.push(originalIndex);
            const isChecked = window.selectedConcepts.has(originalIndex) ? "checked" : "";
            
            let subtitleExcerpt = concept.summary || "";
            if (!subtitleExcerpt && concept.body) {
                subtitleExcerpt = concept.body.substring(0, 100).replace(/<[^>]*>?/gm, '').trim();
            }
            if (subtitleExcerpt.length > 70) {
                subtitleExcerpt = subtitleExcerpt.substring(0, 70) + "...";
            }

            const srs = concept.srs || { interval: 0, nextReview: 0 };
            const masteryPct = srs.mastered ? 100 : Math.min(100, Math.round(((srs.interval || 0) / 21) * 100));
            const filledDots = Math.min(5, Math.ceil(masteryPct / 20));
            
            let dotsHTML = '';
            for (let d = 1; d <= 5; d++) {
                dotsHTML += `<span class="w-1.5 h-1.5 rounded-full inline-block mr-0.5 ${d <= filledDots ? (masteryPct >= 80 ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-slate-200 dark:bg-slate-700'}"></span>`;
            }

            const lastRevDate = srs.lastReviewed 
                ? new Date(srs.lastReviewed).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : (concept.date || "--");

            const tags = (concept.subTag || "").split(',').map(t => t.trim()).filter(Boolean);
            const tagsHTML = tags.length > 0 
                ? tags.map(t => `<span class="inline-block text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md mr-1 mb-0.5">${t}</span>`).join('')
                : `<span class="text-slate-400 italic text-[11px]">None</span>`;

            const badges = [];
            if (concept.whenToUse) badges.push(`<span class="inline-flex items-center text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded mr-1">When to Use</span>`);
            if (concept.advantages) badges.push(`<span class="inline-flex items-center text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded mr-1">Advantages</span>`);
            if (concept.disadvantages) badges.push(`<span class="inline-flex items-center text-[9px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-1.5 py-0.5 rounded mr-1">Disadvantages</span>`);
            if (concept.relatedConcepts) badges.push(`<span class="inline-flex items-center text-[9px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded mr-1">Related</span>`);

            rowsHtml += `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onclick="window.viewConceptDetail(${originalIndex})">
                    <td class="py-2.5 px-4 text-center" onclick="event.stopPropagation()">
                        <input type="checkbox" ${isChecked} onchange="window.toggleConceptSelection(${originalIndex}, event)" class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                    </td>
                    <td class="py-2.5 px-4">
                        <div class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-xs leading-snug">
                            ${concept.title || "Untitled Concept"}
                        </div>
                        <div class="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-sm mt-0.5">
                            ${subtitleExcerpt || "No definition text logged."}
                        </div>
                        ${badges.length > 0 ? `<div class="mt-1 flex flex-wrap gap-0.5">${badges.join('')}</div>` : ''}
                    </td>
                    <td class="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                        ${concept.category || "General"}
                    </td>
                    <td class="py-2.5 px-4 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <span class="inline-flex">${dotsHTML}</span>
                            <span class="font-mono font-bold text-[11px] ${masteryPct >= 80 ? 'text-emerald-600' : 'text-slate-500'}">${masteryPct}%</span>
                        </div>
                    </td>
                    <td class="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        ${lastRevDate}
                    </td>
                    <td class="py-2.5 px-4">
                        ${tagsHTML}
                    </td>
                    <td class="py-2.5 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                        <div class="inline-flex items-center gap-1">
                            <button type="button" onclick="window.openConceptDetailWorkspace(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Edit Concept Directly">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" onclick="window.viewConceptDetail(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Open Full Workspace">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" onclick="window.deleteConcept(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Delete">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }

        let pageBtns = '';
        for (let p = 1; p <= totalPages; p++) {
            pageBtns += `
                <button type="button" onclick="window.setConceptPage(${p})" class="w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${p === window.conceptCurrentPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}">
                    ${p}
                </button>`;
        }

        container.innerHTML = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <th class="py-2.5 px-4 w-10 text-center">
                                    <input type="checkbox" onchange="window.toggleSelectAll('concepts')" class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                                </th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 min-w-[280px]">Concept</th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-36">Category</th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-28 text-center">Mastery</th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-32">Last Reviewed</th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 min-w-[180px]">Practice Area / Tags</th>
                                <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                    <span class="font-medium text-[11px]">Showing <strong>${startIndex + 1}</strong> to <strong>${Math.min(startIndex + window.conceptPageSize, totalItems)}</strong> of <strong>${totalItems}</strong> concepts</span>
                    <div class="flex items-center gap-1 font-bold">
                        <button type="button" onclick="window.setConceptPage(${window.conceptCurrentPage - 1})" ${window.conceptCurrentPage === 1 ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&lt;</button>
                        ${pageBtns}
                        <button type="button" onclick="window.setConceptPage(${window.conceptCurrentPage + 1})" ${window.conceptCurrentPage === totalPages ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&gt;</button>
                    </div>
                </div>
            </div>`;

        // Hydrate only newly created rows rather than scanning whole window
        if (window.lucide) {
            window.lucide.createIcons({ root: container });
        }

        window.updateMassDeleteConceptBtn();

    } catch (err) {
        console.error("Concepts rendering error:", err);
        container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">Error loading concepts table: ${err.message}</div>`;
    }
};

// --- DIRECT IN-PAGE WORKSPACE CONTROLLER ---
window.openConceptDetailWorkspace = function(index) {
    window.activeConceptEditIndex = index;
    const c = db.concepts[index];
    if (!c) return;

    const tableContainer = document.getElementById("conceptsContainer");
    const workspace = document.getElementById("conceptDetailWorkspace");
    const tableHeaderControls = document.getElementById("conceptTableHeaderControls") || document.querySelector("#appConcepts .border-b");
    const paginationBar = document.getElementById("conceptAlphabetBar");

    if (tableContainer) tableContainer.classList.add("hidden");
    if (tableHeaderControls) tableHeaderControls.classList.add("hidden");
    if (paginationBar) paginationBar.classList.add("hidden");

    if (workspace) {
        workspace.classList.remove("hidden");
        workspace.classList.add("flex");
    }

    const titleEl = document.getElementById("directConceptTitle");
    const subTagEl = document.getElementById("directConceptSubTag");
    const whenToUseEl = document.getElementById("directConceptWhenToUse");
    const advEl = document.getElementById("directConceptAdvantages");
    const disadvEl = document.getElementById("directConceptDisadvantages");
    const relEl = document.getElementById("directConceptRelated");
    const catSelect = document.getElementById("directConceptCategory");

    if (titleEl) titleEl.value = c.title || "";
    if (subTagEl) subTagEl.value = c.subTag || "";
    if (whenToUseEl) whenToUseEl.value = c.whenToUse || "";
    if (advEl) advEl.value = c.advantages || "";
    if (disadvEl) disadvEl.value = c.disadvantages || "";
    if (relEl) relEl.value = c.relatedConcepts || "";

    if (catSelect) {
        const cleanCats = (db.conceptCategories || ["General"]).filter(cat => cat !== "Interview Vault");
        catSelect.innerHTML = cleanCats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        catSelect.value = c.category || cleanCats[0];
    }

    if (typeof window.getOrInitQuill === 'function') {
        window.directConceptQuill = window.getOrInitQuill('#directConceptBodyQuill');
        if (window.directConceptQuill && window.directConceptQuill.root) {
            window.directConceptQuill.root.innerHTML = c.body || "";
        }
    }

    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeConceptWorkspace = function() {
    window.activeConceptEditIndex = null;
    const tableContainer = document.getElementById("conceptsContainer");
    const workspace = document.getElementById("conceptDetailWorkspace");
    const tableHeaderControls = document.getElementById("conceptTableHeaderControls") || document.querySelector("#appConcepts .border-b");
    const paginationBar = document.getElementById("conceptAlphabetBar");

    if (workspace) {
        workspace.classList.add("hidden");
        workspace.classList.remove("flex");
    }
    if (tableContainer) tableContainer.classList.remove("hidden");
    if (tableHeaderControls) tableHeaderControls.classList.remove("hidden");
    if (paginationBar) paginationBar.classList.remove("hidden");
};

window.saveDirectConcept = function() {
    if (window.activeConceptEditIndex === null) return;
    const idx = window.activeConceptEditIndex;
    const c = db.concepts[idx];
    if (!c) return;

    const titleInput = document.getElementById("directConceptTitle");
    const newTitle = titleInput ? titleInput.value.trim() : "";
    if (!newTitle) {
        alert("Concept Name cannot be empty.");
        return;
    }

    c.title = newTitle;
    const catEl = document.getElementById("directConceptCategory");
    if (catEl) c.category = catEl.value;

    const subTagEl = document.getElementById("directConceptSubTag");
    if (subTagEl) c.subTag = subTagEl.value.trim();

    const whenEl = document.getElementById("directConceptWhenToUse");
    if (whenEl) c.whenToUse = whenEl.value.trim();

    const advEl = document.getElementById("directConceptAdvantages");
    if (advEl) c.advantages = advEl.value.trim();

    const disadvEl = document.getElementById("directConceptDisadvantages");
    if (disadvEl) c.disadvantages = disadvEl.value.trim();

    const relEl = document.getElementById("directConceptRelated");
    if (relEl) relEl.value = c.relatedConcepts || "";

    if (window.directConceptQuill && window.directConceptQuill.root) {
        c.body = window.directConceptQuill.root.innerHTML;
    }

    if (typeof saveDatabase === 'function') saveDatabase();
    window.closeConceptWorkspace();
    window.renderConcepts();

    if (typeof showToast === 'function') {
        showToast("Concept updated directly.", "success");
    }
};

window.viewConceptDetail = function(index) {
    window.openConceptDetailWorkspace(index);
};

window.saveConcept = async function() {
    const titleInput = document.getElementById("conceptTitle");
    const subTagInput = document.getElementById("conceptSubTag");
    
    const title = titleInput ? titleInput.value.trim() : "";
    
    // 1. Reliably extract body HTML & clean text from Quill
    let htmlBody = "";
    const editorEl = document.querySelector('#conceptBodyQuill .ql-editor') || document.querySelector('.ql-editor');
    if (editorEl) {
        htmlBody = editorEl.innerHTML;
    } else if (typeof quillEditor !== 'undefined' && quillEditor && quillEditor.root) {
        htmlBody = quillEditor.root.innerHTML;
    }
    
    const cleanText = htmlBody.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    
    if (!title) {
        alert("Please enter a Concept Name.");
        if (titleInput) titleInput.focus();
        return;
    }

    if (!cleanText && htmlBody !== "") {
        htmlBody = "<p>" + cleanText + "</p>";
    }
    
    if (!cleanText && !htmlBody) {
        alert("Please enter a definition or summary in the body before saving.");
        return;
    }

    // 2. Resolve Category (Fallback to active tab or General)
    let catToSave = "General";
    if (typeof currentConceptCategory !== 'undefined' && currentConceptCategory && currentConceptCategory !== "All") {
        catToSave = currentConceptCategory;
    } else if (typeof window.conceptSelectedCategory !== 'undefined' && window.conceptSelectedCategory && window.conceptSelectedCategory !== "All") {
        catToSave = window.conceptSelectedCategory;
    } else if (db.conceptCategories && db.conceptCategories.length > 0) {
        const cleanCats = db.conceptCategories.filter(cat => cat !== "Interview Vault");
        catToSave = cleanCats[0] || "General";
    }

    // 3. Duplicate check & update in-memory
    const existingIdx = (db.concepts || []).findIndex(c => c && c.title && c.title.trim().toLowerCase() === title.toLowerCase());
    
    if (existingIdx !== -1) {
        if (!confirm(`A concept titled "${title}" already exists. Do you want to update it instead of creating a duplicate?`)) {
            return;
        }
        db.concepts[existingIdx].body = htmlBody;
        db.concepts[existingIdx].category = catToSave;
        if (subTagInput) db.concepts[existingIdx].subTag = subTagInput.value.trim();
        if (typeof diagramTempBase64 !== 'undefined' && diagramTempBase64) {
            db.concepts[existingIdx].diagram = diagramTempBase64;
        }
    } else {
        if (!Array.isArray(db.concepts)) db.concepts = [];
        
        db.concepts.push({
            title: title, 
            category: catToSave, 
            body: htmlBody, 
            summary: cleanText.substring(0, 160) + (cleanText.length > 160 ? "..." : ""),
            subTag: subTagInput ? subTagInput.value.trim() : "",
            advantages: "",
            disadvantages: "",
            whenToUse: "",
            relatedConcepts: "",
            documents: [],
            diagram: (typeof diagramTempBase64 !== 'undefined' && diagramTempBase64) ? diagramTempBase64 : "", 
            srs: { nextReview: new Date().getTime(), interval: 0, ease: 2.5, mastered: false, lastRating: 'forgot', subSrs: {}, documents: [] },
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 
            score: ""
        });
    }
    
    // 4. Persist immediately to cache and Supabase
    try {
        if (typeof saveDatabase === 'function') {
            await saveDatabase();
        }
    } catch (err) {
        console.warn("Database sync notice:", err);
    }
    
    if (typeof updateNexusDropdowns === 'function') {
        try { updateNexusDropdowns(); } catch(e){}
    }
    
    // 5. Invalidate practice area dropdown cache so new tags appear
    window.populateConceptFilterDropdowns(true);

    // 6. Re-render table & widgets
    if (typeof window.renderConcepts === 'function') {
        window.renderConcepts();
    }
    
    // 7. Clear form inputs
    if (titleInput) titleInput.value = ""; 
    if (subTagInput) subTagInput.value = ""; 
    
    if (editorEl) {
        editorEl.innerHTML = "";
    } else if (typeof quillEditor !== 'undefined' && quillEditor) {
        quillEditor.setContents([]);
    }
    
    if (typeof diagramTempBase64 !== 'undefined') window.diagramTempBase64 = "";
    
    const preview = document.getElementById("newConceptDiagramPreview");
    if (preview) {
        preview.classList.add("hidden");
        preview.src = "";
    }
    const label = document.getElementById("newConceptDiagramLabel");
    if (label) label.innerText = "Add Diagram";
    
    // 8. Auto-collapse sidebar on mobile
    if (typeof toggleAppSidebar === 'function' && window.innerWidth < 768) {
        toggleAppSidebar('conceptLogSidebar');
    }

    if (typeof showToast === 'function') {
        showToast(`Concept "${title}" saved successfully.`, "success");
    }
};

window.openEditConceptModal = function(index) {
    window.openConceptDetailWorkspace(index);
};

window.saveConceptEditFn = function() {
    if (typeof window.saveDirectConceptWorkspace === 'function') {
        window.saveDirectConceptWorkspace();
    } else if (typeof window.saveDirectConcept === 'function') {
        window.saveDirectConcept();
    }
};

window.toggleConceptSelection = function(index, event) {
    if (event) event.stopPropagation();
    if (window.selectedConcepts.has(index)) {
        window.selectedConcepts.delete(index);
    } else {
        window.selectedConcepts.add(index);
    }
    window.updateMassDeleteConceptBtn();
};

window.toggleSelectAll = function(module) {
    if (module === 'concepts') {
        const visible = window.currentVisibleConceptIndices || [];
        const allSelected = visible.length > 0 && visible.every(idx => window.selectedConcepts.has(idx));
        
        if (allSelected) {
            visible.forEach(idx => window.selectedConcepts.delete(idx));
        } else {
            visible.forEach(idx => window.selectedConcepts.add(idx));
        }
        window.renderConcepts();
    } else if (typeof window.toggleModuleSelectAll === 'function') {
        window.toggleModuleSelectAll(module);
    }
};

window.updateMassDeleteConceptBtn = function() {
    const btn = document.getElementById('massDeleteConceptBtn');
    const selCountBtn = document.getElementById('btnSelectedFlashcards');
    
    const count = window.selectedConcepts ? window.selectedConcepts.size : 0;
    
    if (btn) {
        if (count > 0) {
            btn.classList.remove('hidden');
            btn.innerHTML = `<i data-lucide="trash" class="w-3.5 h-3.5"></i> Delete Selected (${count})`;
        } else {
            btn.classList.add('hidden');
        }
    }

    if (selCountBtn) {
        selCountBtn.innerHTML = `<i data-lucide="target" class="w-3.5 h-3.5"></i> Selected (${count})`;
    }

    if (window.lucide) window.lucide.createIcons();
};

window.massDeleteConcepts = function() {
    if (!window.selectedConcepts || window.selectedConcepts.size === 0) return;
    if (confirm(`Delete ${window.selectedConcepts.size} selected concept(s)?`)) {
        let sortedIndices = Array.from(window.selectedConcepts).sort((a,b) => b-a);
        sortedIndices.forEach(idx => { 
            let conceptTitle = db.concepts[idx].title;
            if (db.factors) {
                db.factors.forEach(f => { if (f && f.linkedConcept === conceptTitle) f.linkedConcept = ""; });
            }
            db.concepts.splice(idx, 1); 
        });
        window.selectedConcepts.clear();
        window.updateMassDeleteConceptBtn();
        if (typeof updateNexusDropdowns === 'function') { try { updateNexusDropdowns(); } catch(e){} }
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConcepts();
    }
};

window.deleteConcept = async function(index) {
    index = parseInt(index, 10);
    const concept = db.concepts[index];
    if (!concept || !confirm(`Delete concept: "${concept.title}"?`)) return;
    
    if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser) {
        await supabaseClient.from('concepts')
            .delete()
            .match({ user_id: window.currentUser.id, title: concept.title });
    }

    db.concepts.splice(index, 1);
    if (window.selectedConcepts.has(index)) {
        window.selectedConcepts.delete(index);
        window.updateMassDeleteConceptBtn();
    }
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderConcepts();
};

/**
 * Modernized Blank Concept Creator
 * Opens the full-screen concept workspace in edit mode pre-filled with the active category
 */
window.openNewConceptWorkspace = function() {
    if (!Array.isArray(db.concepts)) db.concepts = [];

    // Fall back cleanly to active tab or first valid category (excluding Interview Vault)
    const activeCat = (typeof currentConceptCategory !== 'undefined' && currentConceptCategory && currentConceptCategory !== "All")
        ? currentConceptCategory
        : (window.conceptSelectedCategory && window.conceptSelectedCategory !== "All"
            ? window.conceptSelectedCategory
            : ((db.conceptCategories && db.conceptCategories.filter(c => c !== "Interview Vault")[0]) || "Corporate / M&A"));

    const newConcept = {
        title: "",
        category: activeCat,
        subTag: "",
        summary: "",
        body: "",
        advantages: "",
        disadvantages: "",
        whenToUse: "",
        relatedConcepts: "",
        typicalProvisions: "",
        commonUseCases: "",
        linkedPlaybook: null,
        documents: [],
        diagram: null,
        srs: { 
            nextReview: Date.now(), 
            interval: 0, 
            ease: 2.5, 
            mastered: false, 
            lastRating: 'forgot', 
            subSrs: {}, 
            documents: [],
            summary: "" 
        },
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    // Prepend the new blank concept to the start of db.concepts
    db.concepts.unshift(newConcept);
    window.activeConceptDetailIndex = 0;
    window.activeConceptDetailTab = 'overview';
    window.isConceptDetailEditMode = true;

    // Open full workspace and hide table
    const detailWrapper = getOrCreateConceptDetailWrapper();
    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    if (detailWrapper) detailWrapper.classList.remove("hidden");

    window.renderConceptDetailView();

    // Auto-focus on Title input
    setTimeout(() => {
        const titleEl = document.getElementById("inpageConceptTitle");
        if (titleEl) {
            titleEl.placeholder = "Enter Concept Name (e.g. Warranties vs Indemnities)...";
            titleEl.focus();
        }
    }, 100);
};