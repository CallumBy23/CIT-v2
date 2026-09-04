// CONCEPTS RENDERING & KMS TABLE ENGINE (ENTERPRISE TABLE + PAGINATION + INTEGRATED CONTROLS)
// =====================================================================

window.conceptCurrentPage = 1;
window.conceptPageSize = 10;
window.selectedConcepts = window.selectedConcepts || new Set();

// Active Filter States
window.conceptSelectedCategory = "All";
window.conceptSelectedPracticeArea = "All";
window.conceptSelectedMastery = "All";

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

window.populateConceptFilterDropdowns = function() {
    const catEl = document.getElementById('conceptFilterCategory');
    const paEl = document.getElementById('conceptFilterPracticeArea');

    if (catEl && (!catEl.dataset.populated || catEl.children.length <= 1)) {
        const categories = (typeof db !== 'undefined' && db.conceptCategories && db.conceptCategories.length > 0)
            ? db.conceptCategories
            : Array.from(new Set(((typeof db !== 'undefined' && db.concepts) || []).map(c => c.category || "General")));
        
        let opts = `<option value="All">All Categories</option>`;
        categories.forEach(cat => {
            opts += `<option value="${cat}">${cat}</option>`;
        });
        catEl.innerHTML = opts;
        catEl.value = window.conceptSelectedCategory || "All";
        catEl.dataset.populated = "true";
    }

    if (paEl) {
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
    
    try {
        window.currentVisibleConceptIndices = [];
        window.populateConceptFilterDropdowns();

        // 1. Single Dynamic Concept Mastery Widget (Active Category OR All Categories)
        const widgetContainer = document.getElementById("conceptMasteryWidget");
        if (widgetContainer) {
            const rawConcepts = (typeof db !== 'undefined' && db.concepts) ? db.concepts : [];
            const activeCat = (window.conceptSelectedCategory && window.conceptSelectedCategory !== "All")
                ? window.conceptSelectedCategory
                : ((typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All")
                    ? currentConceptCategory
                    : "All");

            let targetConcepts = [];
            let displayLabel = "";

            if (activeCat === "All") {
                targetConcepts = rawConcepts;
                displayLabel = "All Concepts";
            } else {
                targetConcepts = rawConcepts.filter(c => c && c.category === activeCat);
                displayLabel = activeCat;
            }

            const total = targetConcepts.length;
            let mastered = 0;
            targetConcepts.forEach(c => {
                if (c && c.srs && (c.srs.mastered || c.srs.interval >= 21)) {
                    mastered++;
                }
            });

            const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);
            const isHighMastery = pct >= 50;

            widgetContainer.innerHTML = `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-xs flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${isHighMastery ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse shrink-0"></span>
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate max-w-[160px]">${displayLabel}:</span>
                    <div class="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
                        <div class="${isHighMastery ? 'bg-emerald-500' : 'bg-indigo-600'} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                    <span class="font-mono font-bold text-xs ${isHighMastery ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'} shrink-0">${pct}%</span>
                </div>
            `;
            widgetContainer.classList.remove('hidden');
        }

        // 2. Filter Logic
        const searchBox = document.getElementById("searchConcepts");
        const term = searchBox ? String(searchBox.value || "").toLowerCase().trim() : "";
        let rawConcepts = (typeof db !== 'undefined' && db.concepts) ? db.concepts : [];
        let filtered = rawConcepts.slice();

        // Top workspace subtab
        if (typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All") {
            filtered = filtered.filter(c => c.category === currentConceptCategory);
        }

        // Dropdown Category
        if (window.conceptSelectedCategory && window.conceptSelectedCategory !== "All") {
            filtered = filtered.filter(c => c.category === window.conceptSelectedCategory);
        }

        // Dropdown Practice Area
        if (window.conceptSelectedPracticeArea && window.conceptSelectedPracticeArea !== "All") {
            filtered = filtered.filter(c => {
                const subTags = (c.subTag || "").split(',').map(s => s.trim().toLowerCase());
                return subTags.includes(window.conceptSelectedPracticeArea.toLowerCase());
            });
        }

        // Dropdown Mastery Status
        if (window.conceptSelectedMastery && window.conceptSelectedMastery !== "All") {
            const now = new Date().getTime();
            if (window.conceptSelectedMastery === "mastered") {
                filtered = filtered.filter(c => c.srs && (c.srs.mastered || c.srs.interval >= 21));
            } else if (window.conceptSelectedMastery === "learning") {
                filtered = filtered.filter(c => !c.srs || (!c.srs.mastered && (c.srs.interval || 0) < 21));
            } else if (window.conceptSelectedMastery === "due") {
                filtered = filtered.filter(c => c.srs && c.srs.nextReview && c.srs.nextReview <= now);
            }
        }

        // Search box input
        if (term) {
            filtered = filtered.filter(c => 
                String(c.title || "").toLowerCase().includes(term) || 
                String(c.body || "").toLowerCase().includes(term) ||
                String(c.subTag || "").toLowerCase().includes(term)
            );
        }

        // Alphabet quick filter
        if (window.activeConceptAlpha && window.activeConceptAlpha.size > 0) {
            filtered = filtered.filter(c => {
                const titleStr = String(c.title || "").trim();
                if (!titleStr) return false;
                return window.activeConceptAlpha.has(titleStr.charAt(0).toUpperCase());
            });
        }

        let indexedConcepts = filtered.map(c => ({ concept: c, originalIndex: rawConcepts.indexOf(c) }));

        // Sort Engine
        const sortBox = document.getElementById("sortConcepts");
        const sortMode = sortBox ? sortBox.value : "az";

        if (sortMode === "newest") {
            indexedConcepts.reverse();
        } else if (sortMode === "az") {
            indexedConcepts.sort((a, b) => String(a.concept.title || "").localeCompare(String(b.concept.title || "")));
        } else if (sortMode === "za") {
            indexedConcepts.sort((a, b) => String(b.concept.title || "").localeCompare(String(a.concept.title || "")));
        }

        // 3. Pagination
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

        // 4. Build Table
        let tableHTML = `
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
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">`;

        pageConcepts.forEach(({ concept, originalIndex }) => {
            window.currentVisibleConceptIndices.push(originalIndex);
            const isChecked = window.selectedConcepts.has(originalIndex) ? "checked" : "";
            
            const plainTextDesc = (concept.body || "").replace(/<[^>]*>?/gm, '').trim();
            const subtitleExcerpt = plainTextDesc.length > 70 ? plainTextDesc.substring(0, 70) + "..." : plainTextDesc;

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

            tableHTML += `
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
                            <button type="button" onclick="window.openEditConceptModal(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Edit Concept">
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
        });

        // 5. Pagination Buttons
        let pageBtns = '';
        for (let p = 1; p <= totalPages; p++) {
            pageBtns += `
                <button type="button" onclick="window.setConceptPage(${p})" class="w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${p === window.conceptCurrentPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}">
                    ${p}
                </button>`;
        }

        tableHTML += `
                        </tbody>
                    </table>
                </div>

                <!-- Footer Pagination -->
                <div class="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                    <span class="font-medium text-[11px]">Showing <strong>${startIndex + 1}</strong> to <strong>${Math.min(startIndex + window.conceptPageSize, totalItems)}</strong> of <strong>${totalItems}</strong> concepts</span>
                    <div class="flex items-center gap-1 font-bold">
                        <button type="button" onclick="window.setConceptPage(${window.conceptCurrentPage - 1})" ${window.conceptCurrentPage === 1 ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&lt;</button>
                        ${pageBtns}
                        <button type="button" onclick="window.setConceptPage(${window.conceptCurrentPage + 1})" ${window.conceptCurrentPage === totalPages ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&gt;</button>
                    </div>
                </div>
            </div>`;

        container.innerHTML = tableHTML;
        if (window.lucide) window.lucide.createIcons();

        window.updateMassDeleteConceptBtn();

    } catch (err) {
        console.error("Concepts rendering error:", err);
        container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">Error loading concepts table: ${err.message}</div>`;
    }
};

window.viewConceptDetail = function(index) {
    if (typeof window.openConceptDetailWorkspace === 'function') {
        window.openConceptDetailWorkspace(index);
    } else {
        window.openEditConceptModal(index);
    }
};

window.saveConcept = function() {
    const title = document.getElementById("conceptTitle").value.trim();
    
    let htmlBody = "";
    const editorEl = document.querySelector('#conceptBodyQuill .ql-editor');
    if (editorEl) {
        htmlBody = editorEl.innerHTML;
    } else if (typeof quillEditor !== 'undefined' && quillEditor.root) {
        htmlBody = quillEditor.root.innerHTML;
    }
    
    const cleanText = htmlBody.replace(/<[^>]*>?/gm, '').trim();
    
    if (!title || !cleanText) {
        alert("Please enter a Concept Name and Definition before saving.");
        return;
    }

    const catToSave = (!currentConceptCategory || currentConceptCategory === "All") 
        ? (db.conceptCategories && db.conceptCategories[0] ? db.conceptCategories[0] : "General") 
        : currentConceptCategory;
    
    db.concepts.push({
      title, 
      category: catToSave, 
      body: htmlBody, 
      summary: "",
      subTag: document.getElementById("conceptSubTag").value,
      diagram: typeof diagramTempBase64 !== 'undefined' ? diagramTempBase64 : "", 
      srs: { nextReview: new Date().getTime(), interval: 0, ease: 2.5, mastered: false, lastRating: 'forgot' },
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 
      score: ""
    });
    
    if (typeof saveDatabase === 'function') saveDatabase(); 
    if (typeof updateNexusDropdowns === 'function') updateNexusDropdowns(); 
    
    window.renderConcepts();
    
    document.getElementById("conceptTitle").value = ""; 
    document.getElementById("conceptSubTag").value = ""; 
    
    if (editorEl) editorEl.innerHTML = "";
    else if (typeof quillEditor !== 'undefined') quillEditor.setContents([]);
    
    if (typeof diagramTempBase64 !== 'undefined') window.diagramTempBase64 = "";
    
    const preview = document.getElementById("newConceptDiagramPreview");
    if (preview) {
        preview.classList.add("hidden");
        preview.src = "";
    }
    const label = document.getElementById("newConceptDiagramLabel");
    if (label) label.innerText = "Add Diagram";
    
    if (typeof toggleAppSidebar === 'function' && window.innerWidth < 768) {
         toggleAppSidebar('conceptLogSidebar');
    }
};

window.openEditConceptModal = function(index) {
    const c = db.concepts[index];
    if (!c) return;
    
    document.getElementById("editConceptIndex").value = index;
    document.getElementById("editConceptTitle").value = c.title || "";
    document.getElementById("editConceptSubTag").value = c.subTag || "";
    
    const catSelect = document.getElementById("editConceptCategory");
    if (catSelect) {
        catSelect.innerHTML = (db.conceptCategories || ["General"]).map(cat => `<option value="${cat}">${cat}</option>`).join('');
        catSelect.value = c.category || db.conceptCategories[0];
    }
    
    window.editQuillEditor = window.getOrInitQuill('#editConceptBodyQuill', { 
        modules: { toolbar: '#editConceptToolbar' } 
    });

    if (window.editQuillEditor && window.editQuillEditor.root) {
        window.editQuillEditor.root.innerHTML = c.body || "";
    }

    const previewImg = document.getElementById("editConceptDiagramPreview");
    if (previewImg) {
        if (c.diagram) {
            previewImg.src = c.diagram;
            previewImg.classList.remove("hidden");
            document.getElementById("editConceptDiagramLabel").innerText = "Edit Diagram";
        } else {
            previewImg.src = "";
            previewImg.classList.add("hidden");
            document.getElementById("editConceptDiagramLabel").innerText = "Add Diagram";
        }
    }

    const modal = document.getElementById("editConceptModalContainer");
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.saveConceptEditFn = function() {
    const indexStr = document.getElementById("editConceptIndex").value;
    if (indexStr === "") return;
    const index = parseInt(indexStr, 10);
    
    db.concepts[index].title = document.getElementById("editConceptTitle").value;
    db.concepts[index].subTag = document.getElementById("editConceptSubTag").value;
    db.concepts[index].category = document.getElementById("editConceptCategory").value;
    
    let bodyHtml = "";
    const editorEl = document.querySelector('#editConceptBodyQuill .ql-editor');
    if (editorEl) {
        bodyHtml = editorEl.innerHTML;
    } else if (window.editQuillEditor && window.editQuillEditor.root) {
        bodyHtml = window.editQuillEditor.root.innerHTML;
    }
    
    db.concepts[index].body = bodyHtml === "<p><br></p>" ? "" : bodyHtml;
    
    if (typeof diagramTempBase64 !== 'undefined' && diagramTempBase64) {
        db.concepts[index].diagram = diagramTempBase64;
    }
    
    const modal = document.getElementById("editConceptModalContainer");
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderConcepts();
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