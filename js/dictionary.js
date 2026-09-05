// HIGHLIGHTING & TOOLTIP ENGINE
// ==========================================
window.currentDictCategory = window.currentDictCategory || "All";
window.currentVisibleDictIndices = [];

window.selectedDictionary = new Set();
window.toggleDictSelection = function(index, event) {
    if (event.target.checked) window.selectedDictionary.add(index);
    else window.selectedDictionary.delete(index);
    updateMassDeleteDictBtn();
};

window.updateMassDeleteDictBtn = function() {
    const btn = document.getElementById('massDeleteDictBtn');
    if (!btn) return;
    if (window.selectedDictionary.size > 0) {
        btn.classList.remove('hidden');
        btn.innerText = `🗑️ Delete (${window.selectedDictionary.size})`;
    } else {
        btn.classList.add('hidden');
    }
};

window.massDeleteDictionary = function() {
    if(!window.selectedDictionary || window.selectedDictionary.size === 0) return;
    if(confirm(`Delete ${window.selectedDictionary.size} selected dictionary term(s)?`)) {
        let sortedIndices = Array.from(window.selectedDictionary).sort((a,b)=>b-a);
        sortedIndices.forEach(idx => { 
            db.dictionary.splice(idx, 1); 
        });
        window.selectedDictionary.clear();
        updateMassDeleteDictBtn();
        saveDatabase();
        renderDictionary();
    }
};

// =========================================================================
// HIGH-PERFORMANCE DICTIONARY REGEX CACHE & TEXT SCANNER
// =========================================================================
let cachedDictRegex = null;
let cachedDictSignature = "";

function getCachedDictRegex() {
    if (!db.dictionary || db.dictionary.length === 0) return null;

    const currentSignature = db.dictionary.length + "_" + (db.dictionary[0]?.term || "");
    if (cachedDictRegex && cachedDictSignature === currentSignature) {
        return cachedDictRegex;
    }

    const sortedTerms = [...db.dictionary]
        .filter(d => d && d.term && d.term.trim().length > 2)
        .sort((a, b) => String(b.term).length - String(a.term).length);

    if (sortedTerms.length === 0) return null;

    const termsRegexStr = sortedTerms
        .map(d => d.term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    cachedDictRegex = new RegExp(`\\b(${termsRegexStr})\\b`, 'gi');
    cachedDictSignature = currentSignature;
    return cachedDictRegex;
}

function applyDictionaryHighlighting(containerId) {
    const container = typeof containerId === 'string' 
        ? document.getElementById(containerId) 
        : containerId;
    if (!container) return;

    if (container.id === "conceptDetailWorkspaceWrapper") {
        const proseContainers = container.querySelectorAll(".dict-highlight-target");
        proseContainers.forEach(el => applyDictionaryHighlighting(el));
        return;
    }

    const regex = getCachedDictRegex();
    if (!regex) return;

    if (!regex.test(container.textContent)) return;
    regex.lastIndex = 0;

    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.nodeName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'A') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.classList && (parent.classList.contains('dict-term') || parent.classList.contains('no-dict'))) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    const textNodes = [];
    let curr;
    while (curr = walker.nextNode()) {
        textNodes.push(curr);
    }

    for (let i = 0; i < textNodes.length; i++) {
        const textNode = textNodes[i];
        const val = textNode.nodeValue;
        regex.lastIndex = 0;

        if (regex.test(val)) {
            regex.lastIndex = 0;
            const span = document.createElement('span');
            span.innerHTML = val.replace(regex, (matched) => {
                return `<span class="dict-term" data-term="${matched.replace(/"/g, '&quot;')}">${matched}</span>`;
            });

            span.querySelectorAll('.dict-term').forEach(child => {
                const term = child.getAttribute('data-term');
                const entry = db.dictionary.find(d => d && d.term && d.term.toLowerCase() === term.toLowerCase());
                if (entry) {
                    child.setAttribute('data-def', entry.definition || "");
                    child.onmouseenter = function(e) { 
                        if (window.innerWidth > 768) showTooltip(e, this.getAttribute('data-term'), this.getAttribute('data-def')); 
                    };
                    child.onmouseleave = function() { 
                        if (window.innerWidth > 768) hideTooltip(); 
                    };
                    child.onclick = function(e) { 
                        handleDictClick(e, this.getAttribute('data-term'), this.getAttribute('data-def')); 
                    };
                }
            });

            textNode.parentNode.replaceChild(span, textNode);
        }
    }
}

function handleDictClick(event, term, definition) {
    event.stopPropagation();
    const tooltip = document.getElementById("dictTooltip");
    if (!tooltip.classList.contains("hidden") && document.getElementById("dictTooltipTerm").innerText === term.toUpperCase()) {
        hideTooltip();
    } else {
        showTooltip(event, term, definition);
    }
}

document.addEventListener('click', (e) => {
    const tooltip = document.getElementById("dictTooltip");
    if (tooltip && !tooltip.classList.contains("hidden")) hideTooltip();
});

function showTooltip(event, term, definition) {
    const tooltip = document.getElementById("dictTooltip");
    document.getElementById("dictTooltipTerm").innerText = term.toUpperCase();
    document.getElementById("dictTooltipDef").innerText = definition;
    
    let leftPos = event.pageX;
    const ttWidth = window.innerWidth > 600 ? 350 : window.innerWidth * 0.9; 
    if (leftPos + (ttWidth/2) > window.innerWidth) leftPos = window.innerWidth - (ttWidth/2) - 10;
    if (leftPos - (ttWidth/2) < 0) leftPos = (ttWidth/2) + 10;
    
    tooltip.style.left = leftPos + 'px';
    tooltip.style.top = (event.pageY - 15) + 'px';
    tooltip.classList.remove("hidden");
}

function hideTooltip() { document.getElementById("dictTooltip").classList.add("hidden"); }

// ==========================================
// DICTIONARY CRUD & RENDERING
// ==========================================
function saveDictionaryTerm() {
    const term = document.getElementById("dictTerm").value.trim();
    const definition = document.getElementById("dictDefinition").value.trim();
    const catEl = document.getElementById("dictCategory");
    const category = catEl ? catEl.value : "General";
    const editIdxStr = document.getElementById("editDictIndex").value;
    
    if (!term || !definition) return;
    
    // Invalidate cached regex when dictionary terms change
    cachedDictRegex = null;
    
    if (editIdxStr !== "") {
        const idx = parseInt(editIdxStr);
        db.dictionary[idx].term = term;
        db.dictionary[idx].definition = definition;
        db.dictionary[idx].category = category;
        db.dictionary[idx].isCollapsed = false;
    } else {
        const existingIdx = db.dictionary.findIndex(d => d.term.toLowerCase() === term.toLowerCase());
        if(existingIdx >= 0) {
            if (!confirm(`The term "${term}" already exists in the "${db.dictionary[existingIdx].category}" category.\n\nDo you want to overwrite its definition and move it to "${category}"?`)) {
                return; 
            }
            db.dictionary[existingIdx].definition = definition;
            db.dictionary[existingIdx].category = category;
            db.dictionary[existingIdx].isCollapsed = false;
        } else {
            db.dictionary.push({ 
                term, 
                definition, 
                category, 
                createdAt: new Date().getTime(), 
                isCollapsed: false,
                srs: { nextReview: new Date().getTime(), interval: 0, ease: 2.5, mastered: false, lastRating: 'forgot' }
            });
        }
    }
    
    saveDatabase(); 
    renderDictionary();
    document.getElementById("dictTerm").value = ""; 
    document.getElementById("dictDefinition").value = "";
    
    if (catEl) {
        catEl.value = window.currentDictCategory !== "All" 
            ? window.currentDictCategory 
            : (db.dictCategories && db.dictCategories[0] ? db.dictCategories[0] : "General");
    }

    document.getElementById("editDictIndex").value = "";
}

function editDictTerm(index) {
    const d = db.dictionary[index];
    document.getElementById("dictTerm").value = d.term;
    document.getElementById("dictDefinition").value = d.definition;
    const catEl = document.getElementById("dictCategory");
    if (catEl) catEl.value = d.category || "General";
    document.getElementById("editDictIndex").value = index;
    
    document.getElementById('dictSidebar').classList.remove('-translate-x-full');
    if(window.innerWidth > 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderDictionary() {
    const container = document.getElementById("dictionaryContainer");
    if (!container) return;
    container.innerHTML = "";
    
    window.currentVisibleDictIndices = []; 

    // --- 1. BUILD DICTIONARY MASTERY WIDGET (RIGHT SIDEBAR) ---
    const widgetContainer = document.getElementById("dictMasteryWidget");
    if (widgetContainer) {
        const catStats = {};
        
        (db.dictionary || []).forEach(d => {
            if (d && d.category && d.category !== "All") {
                if (!catStats[d.category]) catStats[d.category] = { total: 0, mastered: 0 };
                catStats[d.category].total++;
                if (d.srs && (d.srs.mastered || d.srs.interval >= 21)) {
                    catStats[d.category].mastered++;
                }
            }
        });

        let masteryHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-sm print:hidden w-full flex flex-col">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0"><i data-lucide="book-open-check" class="w-4 h-4 text-cyan-500"></i> Dictionary Mastery</h3>
            <div class="flex flex-col gap-5 max-h-[400px] overflow-y-auto pr-2 pb-10 scrollbar-hide">`;

        let hasData = false;
        for (const [cat, data] of Object.entries(catStats)) {
            if (data.total === 0) continue;
            hasData = true;
            const pct = Math.round((data.mastered / data.total) * 100);
            
            let barColor = pct === 100 ? 'bg-amber-400' : (pct > 50 ? 'bg-emerald-400' : 'bg-cyan-500');
            let textColor = pct === 100 ? 'text-amber-500 dark:text-amber-400' : (pct > 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400');

            masteryHTML += `
                <div class="flex flex-col w-full">
                    <div class="flex justify-between text-[10px] font-bold mb-2 uppercase tracking-wider">
                        <span class="text-slate-600 dark:text-slate-400 truncate mr-2">${cat}</span>
                        <span class="${textColor}">${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div class="${barColor} h-full rounded-full transition-all duration-700 shadow-sm" style="width: ${pct}%"></div>
                    </div>
                </div>`;
        }
        masteryHTML += `</div></div>`;
        
        if (hasData) {
            widgetContainer.innerHTML = masteryHTML;
            widgetContainer.classList.remove('hidden');
        } else {
            widgetContainer.innerHTML = '';
            widgetContainer.classList.add('hidden');
        }
    }

    const searchBox = document.getElementById("searchDictionary");
    const termFilter = searchBox ? String(searchBox.value || "").toLowerCase() : "";
    const sortMode = document.getElementById("sortDictionary") ? document.getElementById("sortDictionary").value : "az";
    
    let filtered = [...(db.dictionary || [])].filter(d => d != null);
    
    if (window.currentDictCategory && window.currentDictCategory !== "All") {
        filtered = filtered.filter(d => (d.category || "General") === window.currentDictCategory);
    }

    if (termFilter) {
        filtered = filtered.filter(d => 
            String(d.term || "").toLowerCase().includes(termFilter) || 
            String(d.definition || "").toLowerCase().includes(termFilter)
        );
    }

    if (window.activeDictAlpha && window.activeDictAlpha.size > 0) {
        filtered = filtered.filter(d => {
            const t = String(d.term || "").trim();
            if (!t) return false;
            const firstLetter = t.charAt(0).toUpperCase();
            return window.activeDictAlpha.has(firstLetter);
        });
    }
    
    let indexedDict = filtered.map((d) => ({ dict: d, originalIndex: db.dictionary.indexOf(d) }));

    if (sortMode === "az") {
        indexedDict.sort((a, b) => String(a.dict.term || "").localeCompare(String(b.dict.term || "")));
    } else if (sortMode === "za") {
        indexedDict.sort((a, b) => String(b.dict.term || "").localeCompare(String(a.dict.term || "")));
    } else if (sortMode === "newest") {
        indexedDict.sort((a, b) => (b.dict.createdAt || 0) - (a.dict.createdAt || 0));
    } else if (sortMode === "oldest") {
        indexedDict.sort((a, b) => (a.dict.createdAt || 0) - (b.dict.createdAt || 0));
    }

    if (indexedDict.length === 0) {
        container.innerHTML = `<div class="col-span-1 lg:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md print:hidden"><p class="text-sm font-medium text-slate-500 dark:text-slate-400">No dictionary terms found matching these filters.</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    indexedDict.forEach(item => {
        const d = item.dict;
        const originalIndex = item.originalIndex;
        
        window.currentVisibleDictIndices.push(originalIndex);

        const isCollapsed = d.isCollapsed !== false; 
        const itemCat = d.category || "General";
        
        const isChecked = (typeof window.selectedDictionary !== 'undefined' && window.selectedDictionary.has(originalIndex)) ? "checked" : "";
        
        let srsBadge = '';
        if (d.srs && d.srs.mastered) {
             srsBadge = `<span class="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800 mt-1 inline-block">🏆 Mastered</span>`;
        } else if (!d.srs || !d.srs.nextReview) {
            srsBadge = `<span class="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-200 dark:border-blue-800 mt-1 inline-block">✨ New Card</span>`;
        } else {
            const now = new Date().getTime();
            if (d.srs.nextReview <= now) {
                srsBadge = `<span class="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-bold border border-red-200 dark:border-red-800 mt-1 inline-block">⚠️ Due</span>`;
            } else {
                const days = Math.ceil((d.srs.nextReview - now) / (1000 * 60 * 60 * 24));
                srsBadge = `<span class="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800 mt-1 inline-block">⏳ ${days}d</span>`;
            }
        }
        
        const card = document.createElement("div");
        card.className = "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-md p-4 shadow-sm relative group break-inside-avoid flex flex-col w-full transition hover:border-indigo-400 dark:hover:border-indigo-500";
        card.innerHTML = `
            <div class="flex items-start gap-3 w-full">
                <input type="checkbox" ${isChecked} onchange="window.toggleDictSelection(${originalIndex}, event)" class="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer print:hidden shrink-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-indigo-500">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" onclick="db.dictionary[${originalIndex}].isCollapsed = !${isCollapsed}; renderDictionary(); if(typeof saveDatabase === 'function') saveDatabase();">
                        <div class="flex flex-col">
                            <h4 class="font-bold text-slate-900 dark:text-white text-base mb-0 break-words pr-2 leading-snug transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${d.term || "Untitled"}</h4>
                            <div class="flex items-center gap-2 flex-wrap mt-1">
                                ${srsBadge}
                                <span class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold inline-block">${itemCat}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0 ml-2 mt-1">
                            <button onclick="editDictTerm(${originalIndex}); event.stopPropagation();" class="text-[10px] md:text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition print:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 shadow-sm"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Edit</span></button>
                            <span class="nexus-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition print:hidden"><i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i></span>
                        </div>
                    </div>
                    <div class="${isCollapsed ? 'hidden print:block' : 'block mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 cursor-text'}">
                        <p class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words dict-highlight-target leading-relaxed">${d.definition}</p>
                        <div class="mt-3 flex gap-4 print:hidden">
                            <button onclick="deleteDictTerm('${(d.term || "").replace(/'/g, "\\'")}')" class="text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 font-bold py-1.5 px-3 rounded-sm transition shadow-sm flex items-center justify-center gap-1.5"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// MASS EXPAND / COLLAPSE
// ==========================================
window.toggleDictCollapse = function(expand) {
    if (!db.dictionary) return;
    db.dictionary.forEach(d => { d.isCollapsed = !expand; });
    saveDatabase();
    renderDictionary();
};

window.deleteDictTerm = async function(term) {
    if (!confirm(`Delete term "${term}"?`)) return;

    if (supabaseClient && window.currentUser) {
        await supabaseClient.from('dictionary')
            .delete()
            .match({ user_id: window.currentUser.id, term: term });
    }

    const idx = db.dictionary.findIndex(d => d.term === term);
    if (idx > -1) {
        db.dictionary.splice(idx, 1);
        cachedDictRegex = null;
    }
    saveDatabase();
    renderDictionary();
};