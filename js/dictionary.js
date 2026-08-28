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

function applyDictionaryHighlighting(containerId) {
    if (!db.dictionary || db.dictionary.length === 0) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const sortedTerms = [...db.dictionary].sort((a, b) => b.term.length - a.term.length);
    const termsRegexStr = sortedTerms.map(d => d.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`\\b(${termsRegexStr})\\b`, 'gi');

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        if (node.parentNode && node.parentNode.nodeName !== 'SPAN' && node.parentNode.nodeName !== 'SCRIPT' && node.parentNode.nodeName !== 'STYLE') {
            if(!node.parentNode.classList.contains('dict-term')) textNodes.push(node);
        }
    }

    textNodes.forEach(textNode => {
        const match = textNode.nodeValue.match(regex);
        if (match) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textNode.nodeValue.replace(regex, (matched) => {
                return `<span class="dict-term" data-term="${matched.replace(/"/g, '&quot;')}">${matched}</span>`;
            });
            
            const children = tempDiv.querySelectorAll('.dict-term');
            children.forEach(child => {
                const term = child.getAttribute('data-term');
                const entry = db.dictionary.find(d => d.term.toLowerCase() === term.toLowerCase());
                if (entry) {
                    child.setAttribute('data-def', entry.definition);
                    child.onmouseenter = function(e) { if(window.innerWidth > 768) showTooltip(e, this.getAttribute('data-term'), this.getAttribute('data-def')); };
                    child.onmouseleave = function(e) { if(window.innerWidth > 768) hideTooltip(); };
                    child.onclick = function(e) { handleDictClick(e, this.getAttribute('data-term'), this.getAttribute('data-def')); };
                }
            });

            while (tempDiv.firstChild) { textNode.parentNode.insertBefore(tempDiv.firstChild, textNode); }
            textNode.parentNode.removeChild(textNode);
        }
    });
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
            if (d.category && d.category !== "All") {
                if (!catStats[d.category]) catStats[d.category] = { total: 0, mastered: 0 };
                catStats[d.category].total++;
                if (d.srs && (d.srs.mastered || d.srs.interval >= 21)) {
                    catStats[d.category].mastered++;
                }
            }
        });

        let masteryHTML = `<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl print:hidden w-full flex flex-col">
            <h3 class="text-sm font-bold text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-700 pb-3 shrink-0"><span>📖</span> Dictionary Mastery</h3>
            <div class="flex flex-col gap-5 max-h-[400px] overflow-y-auto pr-2 pb-24 scrollbar-hide">`;

        let hasData = false;
        for (const [cat, data] of Object.entries(catStats)) {
            if (data.total === 0) continue;
            hasData = true;
            const pct = Math.round((data.mastered / data.total) * 100);
            
            let barColor = pct === 100 ? 'bg-amber-400' : (pct > 50 ? 'bg-emerald-400' : 'bg-cyan-500');
            let textColor = pct === 100 ? 'text-amber-400' : (pct > 50 ? 'text-emerald-400' : 'text-cyan-400');

            masteryHTML += `
                <div class="flex flex-col w-full">
                    <div class="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-wider">
                        <span class="text-slate-300 truncate mr-2">${cat}</span>
                        <span class="${textColor}">${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-700">
                        <div class="${barColor} h-full rounded-full transition-all duration-700 shadow-[0_0_10px_currentColor]" style="width: ${pct}%"></div>
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

    const termFilter = document.getElementById("searchDictionary") ? document.getElementById("searchDictionary").value.toLowerCase() : "";
    const sortMode = document.getElementById("sortDictionary") ? document.getElementById("sortDictionary").value : "az";
    
    let filtered = [...(db.dictionary || [])];
    
    // 1. Filter by Active Category
    if (window.currentDictCategory && window.currentDictCategory !== "All") {
        filtered = filtered.filter(d => (d.category || "General") === window.currentDictCategory);
    }

    // 2. Filter by Search Box
    if (termFilter) {
        filtered = filtered.filter(d => 
            (d.term && d.term.toLowerCase().includes(termFilter)) || 
            (d.definition && d.definition.toLowerCase().includes(termFilter))
        );
    }

    // 3. Filter by Active A-Z Alphabet
    if (window.activeDictAlpha && window.activeDictAlpha.size > 0) {
        filtered = filtered.filter(d => {
            if (!d.term) return false;
            const firstLetter = d.term.charAt(0).toUpperCase();
            return window.activeDictAlpha.has(firstLetter);
        });
    }
    
    let indexedDict = filtered.map((d) => ({ dict: d, originalIndex: db.dictionary.indexOf(d) }));

    if (sortMode === "az") {
        indexedDict.sort((a, b) => (a.dict.term || "").localeCompare(b.dict.term || ""));
    } else if (sortMode === "za") {
        indexedDict.sort((a, b) => (b.dict.term || "").localeCompare(a.dict.term || ""));
    } else if (sortMode === "newest") {
        indexedDict.sort((a, b) => (b.dict.createdAt || 0) - (a.dict.createdAt || 0));
    } else if (sortMode === "oldest") {
        indexedDict.sort((a, b) => (a.dict.createdAt || 0) - (b.dict.createdAt || 0));
    }

    if (indexedDict.length === 0) {
        container.innerHTML = `<p class="text-slate-500 italic mt-4 print:hidden col-span-2">No dictionary terms found matching these filters.</p>`;
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
             srsBadge = `<span class="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 mt-1 inline-block">🏆 Mastered</span>`;
        } else if (!d.srs || !d.srs.nextReview) {
            srsBadge = `<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 mt-1 inline-block">✨ New Card</span>`;
        } else {
            const now = new Date().getTime();
            if (d.srs.nextReview <= now) {
                srsBadge = `<span class="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold border border-red-200 mt-1 inline-block">⚠️ Due</span>`;
            } else {
                const days = Math.ceil((d.srs.nextReview - now) / (1000 * 60 * 60 * 24));
                srsBadge = `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200 mt-1 inline-block">⏳ ${days}d</span>`;
            }
        }
        
        const card = document.createElement("div");
        card.className = "bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group break-inside-avoid flex flex-col w-full transition hover:border-blue-300";
        card.innerHTML = `
            <div class="flex items-start gap-3 w-full">
                <input type="checkbox" ${isChecked} onchange="window.toggleDictSelection(${originalIndex}, event)" class="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer print:hidden shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start cursor-pointer group-hover:text-blue-600 transition" onclick="db.dictionary[${originalIndex}].isCollapsed = !${isCollapsed}; renderDictionary(); saveDatabase();">
                        <div class="flex flex-col">
                            <h4 class="font-bold text-blue-900 text-base border-b border-transparent mb-0 break-words pr-2">${d.term}</h4>
                            <div class="flex items-center gap-2 flex-wrap mt-1">
                                ${srsBadge}
                                <span class="text-[10px] text-gray-500 uppercase font-bold inline-block">${itemCat}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0 ml-2 mt-1">
                            <button onclick="editDictTerm(${originalIndex}); event.stopPropagation();" class="text-[10px] md:text-xs font-bold text-slate-400 hover:text-indigo-600 transition print:hidden flex items-center gap-1 bg-white hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200 hover:border-indigo-200 shadow-sm"><span>✏️</span> Edit</button>
                            <span class="text-gray-400 text-xs mt-0.5 print:hidden">${isCollapsed ? '▼' : '▲'}</span>
                        </div>
                    </div>
                    <div class="${isCollapsed ? 'hidden print:block' : 'block mt-3 border-t border-gray-100 pt-3 cursor-text'}">
                        <p class="text-sm text-gray-700 whitespace-pre-wrap break-words dict-highlight-target">${d.definition}</p>
                        <div class="mt-3 flex gap-4 print:hidden">
                            <button onclick="deleteDictTerm('${(d.term || "").replace(/'/g, "\\'")}')" class="text-xs text-red-400 font-bold hover:text-red-600 transition shadow-sm">🗑️ Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function deleteDictTerm(term) {
    if(confirm(`Delete definition for ${term}?`)) {
        db.dictionary = db.dictionary.filter(d => d.term !== term);
        saveDatabase(); renderDictionary();
    }
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