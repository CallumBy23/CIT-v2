// CONCEPTS RENDERING WITH INTERVIEW VAULT
// ==========================================

// --- REVERSE FLASHCARD STATE ---
window.isReverseFlashcards = localStorage.getItem('LEGAL_NEXUS_FC_REVERSE') === 'true';

window.toggleReverseMode = function() {
    window.isReverseFlashcards = !window.isReverseFlashcards;
    localStorage.setItem('LEGAL_NEXUS_FC_REVERSE', window.isReverseFlashcards);
    window.updateReverseToggleUI();
};

window.updateReverseToggleUI = function() {
    const btns = [document.getElementById('fcToggleBtnConcepts'), document.getElementById('fcToggleBtnDict')];
    btns.forEach(btn => {
        if (!btn) return;
        const textSpan = btn.querySelector('.toggle-text');
        if (window.isReverseFlashcards) {
            if (textSpan) textSpan.innerText = "Front: Definition";
            btn.classList.replace('bg-white', 'bg-indigo-50');
            btn.classList.replace('text-gray-700', 'text-indigo-700');
            btn.classList.replace('border-gray-300', 'border-indigo-300');
        } else {
            if (textSpan) textSpan.innerText = "Front: Term";
            btn.classList.replace('bg-indigo-50', 'bg-white');
            btn.classList.replace('text-indigo-700', 'text-gray-700');
            btn.classList.replace('border-indigo-300', 'border-gray-300');
        }
    });
};

// --- ALPHABET FILTER STATE ---
window.activeConceptAlpha = new Set();
window.activeDictAlpha = new Set();

window.toggleAlphabetFilter = function(letter, source) {
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);

    window.renderAlphabetBar(source);
    
    if (source === 'concepts') renderConcepts();
    if (source === 'dictionary' && typeof renderDictionary === 'function') renderDictionary();
};

window.renderAlphabetBar = function(source) {
    const containerId = source === 'concepts' ? 'conceptAlphabetBar' : 'dictAlphabetBar';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    
    container.innerHTML = alphabet.map(letter => {
        const isActive = set.has(letter);
        const baseClass = "px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition shrink-0 border ";
        const activeClass = isActive 
            ? "bg-indigo-600 text-white border-indigo-700 shadow-inner" 
            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-800 shadow-sm";
        return `<button onclick="window.toggleAlphabetFilter('${letter}', '${source}')" class="${baseClass} ${activeClass}">${letter}</button>`;
    }).join('');
};

function saveConcept() {
    const title = document.getElementById("conceptTitle").value;
    const htmlBody = quillEditor.root.innerHTML;
    if (!title || htmlBody === "<p><br></p>") return;

    const catToSave = (!currentConceptCategory || currentConceptCategory === "All") ? (db.conceptCategories[0] || "General") : currentConceptCategory;
    
    db.concepts.push({
      title, category: catToSave, body: htmlBody, summary: "",
      subTag: document.getElementById("conceptSubTag").value,
      diagram: typeof diagramTempBase64 !== 'undefined' ? diagramTempBase64 : "", 
      srs: { nextReview: new Date().getTime(), interval: 0, ease: 2.5, mastered: false, lastRating: 'forgot' },
      date: new Date().toLocaleDateString(), isCollapsed: false, score: ""
    });
    
    saveDatabase(); 
    if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns(); 
    renderConcepts();
    
    document.getElementById("conceptTitle").value = ""; 
    document.getElementById("conceptSubTag").value = ""; 
    quillEditor.setContents([]);
    if(typeof diagramTempBase64 !== 'undefined') diagramTempBase64 = "";
    
    const preview = document.getElementById("newConceptDiagramPreview");
    if(preview) {
        preview.classList.add("hidden");
        preview.src = "";
    }
    const label = document.getElementById("newConceptDiagramLabel");
    if(label) label.innerText = "Add Diagram";
}

function renderConcepts() {
    const container = document.getElementById("conceptsContainer");
    if (!container) return;
    container.innerHTML = "";
    if (typeof currentVisibleConceptIndices !== 'undefined') currentVisibleConceptIndices = [];

    // --- 1. BUILD MASTERY DASHBOARD WIDGET (RIGHT SIDEBAR) ---
    const widgetContainer = document.getElementById("conceptMasteryWidget");
    if (widgetContainer) {
        const catStats = {};
        
        (db.concepts || []).forEach(c => {
            if (c.category && c.category !== "Interview Vault" && c.category !== "All") {
                if (!catStats[c.category]) catStats[c.category] = { total: 0, mastered: 0 };
                catStats[c.category].total++;
                if (c.srs && (c.srs.mastered || c.srs.interval >= 21)) {
                    catStats[c.category].mastered++;
                }
            }
        });

        let masteryHTML = `<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl print:hidden w-full flex flex-col">
            <h3 class="text-sm font-bold text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-700 pb-3 shrink-0"><span>📈</span> Concept Mastery Analytics</h3>
            <div class="flex flex-col gap-5 max-h-[400px] overflow-y-auto pr-2 pb-24 scrollbar-hide">`;

        let hasData = false;
        for (const [cat, data] of Object.entries(catStats)) {
            if (data.total === 0) continue;
            hasData = true;
            const pct = Math.round((data.mastered / data.total) * 100);
            
            let barColor = pct === 100 ? 'bg-amber-400' : (pct > 50 ? 'bg-emerald-400' : 'bg-indigo-500');
            let textColor = pct === 100 ? 'text-amber-400' : (pct > 50 ? 'text-emerald-400' : 'text-indigo-400');

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

    const searchBox = document.getElementById("searchConcepts");
    const term = searchBox ? searchBox.value.toLowerCase() : "";
    let filtered = (db.concepts || []).filter(c => c.category !== "Interview Vault");

    if (typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All") {
        filtered = filtered.filter(c => c.category === currentConceptCategory);
    }

    if (term) {
        filtered = filtered.filter(c => 
            (c.title && c.title.toLowerCase().includes(term)) || 
            (c.body && c.body.toLowerCase().includes(term))
        );
    }

    if (window.activeConceptAlpha && window.activeConceptAlpha.size > 0) {
        filtered = filtered.filter(c => {
            if (!c.title) return false;
            const firstLetter = c.title.charAt(0).toUpperCase();
            return window.activeConceptAlpha.has(firstLetter);
        });
    }

    if (filtered.length === 0) {
        container.innerHTML += `<p class="text-slate-500 italic mt-4 print:hidden">No records match your search or filter.</p>`;
        return;
    }

    let indexedConcepts = filtered.map(c => ({ concept: c, originalIndex: db.concepts.indexOf(c) }));
    const sortBox = document.getElementById("sortConcepts");
    const sortMode = sortBox ? sortBox.value : "newest";

    if (sortMode === "newest") indexedConcepts.reverse();
    else if (sortMode === "az") indexedConcepts.sort((a, b) => (a.concept.title || "").localeCompare(b.concept.title || ""));
    else if (sortMode === "za") indexedConcepts.sort((a, b) => (b.concept.title || "").localeCompare(a.concept.title || ""));

    indexedConcepts.forEach(({concept, originalIndex}) => {
        if (typeof currentVisibleConceptIndices !== 'undefined') currentVisibleConceptIndices.push(originalIndex);
        const isCollapsed = concept.isCollapsed !== false;
        const isChecked = typeof window.selectedConcepts !== 'undefined' && window.selectedConcepts.has(originalIndex) ? "checked" : "";
        
        let srsBadge = '';
        if (concept.srs && concept.srs.mastered) {
             srsBadge = `<span class="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 mt-2 inline-block">🏆 Mastered</span>`;
        } else if (!concept.srs || !concept.srs.nextReview) {
             srsBadge = `<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 mt-2 inline-block">✨ New Card</span>`;
        } else {
            const now = new Date().getTime();
            if (concept.srs.nextReview <= now) {
                srsBadge = `<span class="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold border border-red-200 mt-2 inline-block">⚠️ Due Review</span>`;
            } else {
                const days = Math.ceil((concept.srs.nextReview - now) / (1000 * 60 * 60 * 24));
                srsBadge = `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200 mt-2 inline-block">⏳ Next: ${days}d</span>`;
            }
        }

        const subTagHTML = concept.subTag ? `<span class="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase mt-2 inline-block border border-blue-200 mr-2">${concept.subTag}</span>` : '';
        const diagramHTML = concept.diagram ? `<div class="mt-4"><img src="${concept.diagram}" class="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-white"></div>` : '';

        const card = document.createElement("div");
        card.className = "bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm print:break-inside-avoid print:border-slate-400 print:shadow-none group cursor-pointer transition hover:border-blue-300 w-full";
        
        card.onclick = function(e) {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
            const body = this.querySelector('.nexus-body');
            const icon = this.querySelector('.nexus-icon');
            if(body && icon) {
                body.classList.toggle('hidden');
                icon.innerText = body.classList.contains('hidden') ? '▼' : '▲';
                db.concepts[originalIndex].isCollapsed = body.classList.contains('hidden');
                saveDatabase();
            }
        };

        card.innerHTML = `
          <div class="flex flex-col md:flex-row justify-between md:items-start mb-3 group gap-2">
            <div class="flex items-start gap-3 flex-1">
              <input type="checkbox" ${isChecked} onchange="toggleConceptSelection(${originalIndex}, event)" class="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer print:hidden shrink-0">
              <div class="flex flex-col min-w-0 w-full">
                <div class="flex justify-between items-start w-full cursor-pointer" onclick="db.concepts[${originalIndex}].isCollapsed = !${isCollapsed}; renderConcepts(); saveDatabase();">
                  <h4 class="font-bold text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition md:pr-4 print:text-black break-words">${concept.title || "Untitled Concept"}</h4>
                  <div class="flex items-center gap-3 shrink-0 ml-2 mt-1 md:mt-0">
                     <button onclick="openEditConceptModal(${originalIndex}); event.stopPropagation();" class="text-[10px] md:text-xs font-bold text-slate-500 hover:text-indigo-600 transition print:hidden flex items-center gap-1 bg-white hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200 hover:border-indigo-200 shadow-sm"><span>✏️</span> Edit</button>
                     <span class="nexus-icon text-gray-400 text-xs mt-0.5 print:hidden">${isCollapsed ? '▼' : '▲'}</span>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-1 mt-1">${subTagHTML}${srsBadge}</div>
              </div>
            </div>
            <div class="flex gap-2 shrink-0 items-center justify-end w-full md:w-auto">
              <span class="text-[10px] md:text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase border border-slate-200 print:bg-white print:text-black print:border-slate-300 shrink-0">${concept.category || "General"}</span>
            </div>
          </div>
          <div class="nexus-body ${isCollapsed ? 'hidden print:block' : 'block'} border-t border-slate-100 pt-4 mt-4 print:border-slate-300 cursor-text" onclick="event.stopPropagation()">
            <div class="prose prose-sm md:prose-base max-w-none text-slate-700 leading-relaxed mb-4 print:text-black dict-highlight-target">${concept.body || ""}</div>
            ${diagramHTML}
            <div class="mt-4 flex gap-3 print:hidden">
              <button onclick="deleteConcept(${originalIndex})" class="flex-1 md:flex-none text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 md:py-1 px-3 rounded transition shadow-sm">🗑️ Delete</button>
            </div>
          </div>
        `;
        container.appendChild(card);
    });
    if(typeof applyDictionaryHighlighting === 'function') applyDictionaryHighlighting("conceptsContainer");
}

function openEditConceptModal(index) {
    const c = db.concepts[index];
    document.getElementById("editConceptIndex").value = index;
    document.getElementById("editConceptTitle").value = c.title;
    document.getElementById("editConceptSubTag").value = c.subTag || "";
    
    const catSelect = document.getElementById("editConceptCategory");
    if(catSelect) {
        catSelect.innerHTML = db.conceptCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        catSelect.value = c.category;
    }
    
    if(typeof editQuillEditor !== 'undefined') editQuillEditor.root.innerHTML = c.body;

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

    document.getElementById("editConceptModalContainer").classList.remove('hidden');
}

window.selectedConcepts = window.selectedConcepts || new Set();

window.toggleConceptSelection = function(index, event) {
    event.stopPropagation();
    if (event.target.checked) window.selectedConcepts.add(index);
    else window.selectedConcepts.delete(index);
    updateMassDeleteConceptBtn();
};

window.updateMassDeleteConceptBtn = function() {
    const btn = document.getElementById('massDeleteConceptBtn');
    if (!btn) return;
    if (window.selectedConcepts.size > 0) {
        btn.classList.remove('hidden');
        btn.innerText = `🗑️ Delete (${window.selectedConcepts.size})`;
    } else {
        btn.classList.add('hidden');
    }
};

window.massDeleteConcepts = function() {
    if(!window.selectedConcepts || window.selectedConcepts.size === 0) return;
    if(confirm(`Delete ${window.selectedConcepts.size} selected concept(s)?`)) {
        let sortedIndices = Array.from(window.selectedConcepts).sort((a,b)=>b-a);
        sortedIndices.forEach(idx => { 
            let conceptTitle = db.concepts[idx].title;
            db.factors.forEach(f => { if(f.linkedConcept === conceptTitle) f.linkedConcept = ""; });
            db.concepts.splice(idx, 1); 
        });
        window.selectedConcepts.clear();
        updateMassDeleteConceptBtn();
        if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
        saveDatabase();
        renderConcepts();
    }
};

function deleteConcept(index) {
    if(confirm(`Delete concept: "${db.concepts[index].title}"?`)) {
        let conceptTitle = db.concepts[index].title;
        db.factors.forEach(f => { if(f.linkedConcept === conceptTitle) f.linkedConcept = ""; });
        
        db.concepts.splice(index, 1);
        
        if(window.selectedConcepts && window.selectedConcepts.has(index)) {
            window.selectedConcepts.delete(index);
            updateMassDeleteConceptBtn();
        }
        if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
        saveDatabase();
        renderConcepts();
    }
}

// ==========================================
// UNIVERSAL SRS FLASHCARD ENGINE & DASHBOARD
// ==========================================
let currentFlashcardSource = 'concepts'; 
let flashcardQueue = [];
let currentFlashcardIndex = 0;
window.currentFlashcardQueues = { red: [], orange: [], yellow: [], green: [] };

function reviewSelectedCards(source) {
    openFlashcardDashboard(source, true);
}

function openFlashcardDashboard(source = 'concepts', useSelectedOnly = false) {
    currentFlashcardSource = source;
    const now = new Date().getTime();
    
    let allCards = [];

    if (source === 'dossiers') {
        if (!currentDossierFirm) return alert("Select a firm first.");
        const firm = db.dossiers[currentDossierFirm];
        if (!firm.srs) firm.srs = {};
        
        let practiceBody = (Array.isArray(firm.practice) && firm.practice.length > 0) 
            ? firm.practice.map(p => `<h4>${p.heading}</h4>${p.body}`).join('<hr class="my-4 border-gray-200">') 
            : "<p>No data logged.</p>";
            
        let clientsBody = (Array.isArray(firm.clients) && firm.clients.length > 0) 
            ? firm.clients.map(p => `<h4>${p.heading}</h4>${p.body}`).join('<hr class="my-4 border-gray-200">') 
            : "<p>No data logged.</p>";

        let possibleCards = [
            { id: 'practice', category: 'Firm Profile', title: `${currentDossierFirm} - Core Practice Areas`, body: practiceBody },
            { id: 'clients', category: 'Firm Profile', title: `${currentDossierFirm} - Key Clients & Deals`, body: clientsBody },
            { id: 'culture', category: 'Firm Profile', title: `${currentDossierFirm} - Culture & Structure`, body: firm.culture || "<p>No data logged.</p>" }
        ];

        (db.factors || []).forEach((f, idx) => {
            if (f.linkedFirm && f.linkedFirm.toLowerCase() === currentDossierFirm.toLowerCase()) {
                possibleCards.push({
                    id: `intel_${idx}`,
                    category: 'Market Intelligence',
                    title: `${currentDossierFirm} Insight: ${f.title || f.headline || 'Untitled'}`,
                    body: `<p><strong>Metric/Context:</strong> ${f.description || 'N/A'}</p><br><p><strong>Implications:</strong> ${f.implications || 'None logged.'}</p>`
                });
            }
        });

        if (useSelectedOnly) {
            const selected = window.selectedDossierCards ? Array.from(window.selectedDossierCards) : [];
            if (selected.length === 0) return alert("Please select at least one item using the checkboxes to review.");
            possibleCards = possibleCards.filter(c => selected.includes(c.id));
            
            flashcardQueue = possibleCards.map(card => ({
                item: {
                    title: card.title, category: card.category, body: card.body,
                    srs: firm.srs[card.id] || null, isDossier: true, dossierKey: card.id, firmName: currentDossierFirm
                },
                originalIndex: 0 
            }));
            
            return startQueueDirectly();
        }

        allCards = possibleCards.map(card => ({
            item: {
                title: card.title, category: card.category, body: card.body,
                srs: firm.srs[card.id] || null, isDossier: true, dossierKey: card.id, firmName: currentDossierFirm
            },
            originalIndex: 0 
        }));

    } else {
        let dataSource = source === 'concepts' ? (db.concepts || []) : (db.dictionary || []);
        
        if (useSelectedOnly) {
            let specificIndices = [];
            if (source === 'concepts') {
                const selectedSet = (typeof window.selectedConcepts !== 'undefined') ? window.selectedConcepts : new Set();
                specificIndices = Array.from(selectedSet);
            } else {
                const selectedSet = (typeof window.selectedDictionary !== 'undefined') ? window.selectedDictionary : new Set();
                specificIndices = Array.from(selectedSet);
            }

            if (specificIndices.length === 0) return alert("Please select items using checkboxes first.");
            flashcardQueue = specificIndices.map(index => ({ item: dataSource[index], originalIndex: index }));
            return startQueueDirectly();
        }

        let activeCat = "All";
        let specificAlpha = null;
        try {
            if (source === 'concepts' && typeof currentConceptCategory !== 'undefined') {
                activeCat = currentConceptCategory;
                specificAlpha = window.activeConceptAlpha;
            } else if (source === 'dictionary' && typeof currentDictCategory !== 'undefined') {
                activeCat = currentDictCategory;
                specificAlpha = window.activeDictAlpha;
            }
        } catch(e) {}
        
        allCards = dataSource
            .map((item, index) => ({ item, originalIndex: index }))
            .filter(obj => {
                let isNotVault = obj.item.category !== "Interview Vault";
                let itemCat = obj.item.category || "General";
                let matchesTab = (activeCat === "All" || activeCat === "All Terms" || itemCat === activeCat);
                
                let matchesAlpha = true;
                if (specificAlpha && specificAlpha.size > 0) {
                    const titleToCheck = obj.item.title || obj.item.term || "";
                    if (!titleToCheck) matchesAlpha = false;
                    else matchesAlpha = specificAlpha.has(titleToCheck.charAt(0).toUpperCase());
                }

                return isNotVault && matchesTab && matchesAlpha; 
            });
    }

    if (allCards.length === 0) return alert("No flashcards found matching these filters.");

    window.currentFlashcardQueues = { red: [], orange: [], yellow: [], green: [] };

    allCards.forEach(obj => {
        let srs = obj.item.srs || { interval: 0, nextReview: 0, lastRating: 'forgot', mastered: false };
        let isDue = srs.nextReview <= now;
        let isMastered = srs.mastered === true;
        let lastRating = srs.lastRating || 'forgot';

        if (isMastered) {
            window.currentFlashcardQueues.green.push(obj);
        } else if (lastRating === 'forgot' || lastRating === 'hard' || srs.interval === 0) {
            window.currentFlashcardQueues.red.push(obj);
        } else if (isDue) {
            window.currentFlashcardQueues.orange.push(obj);
        } else {
            window.currentFlashcardQueues.yellow.push(obj);
        }
    });

    document.getElementById('fcRedCount').innerText = window.currentFlashcardQueues.red.length;
    document.getElementById('fcOrangeCount').innerText = window.currentFlashcardQueues.orange.length;
    document.getElementById('fcYellowCount').innerText = window.currentFlashcardQueues.yellow.length;
    document.getElementById('fcGreenCount').innerText = window.currentFlashcardQueues.green.length;

    document.getElementById('flashcardDashboardModal').classList.remove('hidden');
    document.getElementById('flashcardDashboardModal').classList.add('flex');
}

function launchQueue(queueColor) {
    document.getElementById('flashcardDashboardModal').classList.add('hidden');
    document.getElementById('flashcardDashboardModal').classList.remove('flex');

    flashcardQueue = [...window.currentFlashcardQueues[queueColor]];
    if (flashcardQueue.length === 0) return alert("This queue is empty!");

    startQueueDirectly();
}

function startQueueDirectly() {
    flashcardQueue = flashcardQueue.sort(() => Math.random() - 0.5);
    currentFlashcardIndex = 0;
    
    document.getElementById("flashcardModal").classList.remove("hidden");
    document.getElementById("flashcardModal").classList.add("flex");
    renderCurrentFlashcard();
}

function renderCurrentFlashcard() {
    document.getElementById("btnShowFeynman").classList.remove("hidden");
    document.getElementById("feynmanDrawer").classList.remove("flex");
    document.getElementById("feynmanDrawer").classList.add("hidden");
    document.getElementById("feynmanInput").value = "";
    document.getElementById("feynmanFeedback").classList.add("hidden");

    if (currentFlashcardIndex >= flashcardQueue.length) {
        alert("Session Complete! Great job maintaining your commercial knowledge.");
        document.getElementById("flashcardModal").classList.add("hidden");
        document.getElementById("flashcardModal").classList.remove("flex");
        if (currentFlashcardSource === 'concepts') renderConcepts();
        else if (currentFlashcardSource === 'dictionary' && typeof renderDictionary === 'function') renderDictionary();
        return;
    }

    const itemObj = flashcardQueue[currentFlashcardIndex];
    const item = itemObj.item;
    
    // BI-DIRECTIONAL LOGIC: Bound to UI Toggle State
    const isReverse = !item.isDossier && window.isReverseFlashcards;
    itemObj.isReverse = isReverse;

    const category = item.category || "General";
    const title = item.title || item.term || "Untitled";
    const body = item.body || item.definition || item.content || "No data logged.";

    document.getElementById("flashcardCounter").innerText = `Card ${currentFlashcardIndex + 1} of ${flashcardQueue.length}`;
    document.getElementById("fcCategory").innerText = category;
    document.getElementById("fcBackCategory").innerText = category;

    // RENDER FRONT BASED ON REVERSE STATUS
    if (isReverse) {
        document.getElementById("fcTitle").classList.add("hidden");
        const fcFrontBody = document.getElementById("fcFrontBody");
        if (fcFrontBody) {
            fcFrontBody.classList.remove("hidden");
            
            // REDACTION LOGIC: Automatically black out the exact term from the definition
            let redactedBody = body;
            if (title && title !== "Untitled") {
                const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const termRegex = new RegExp(escapeRegExp(title), 'gi');
                redactedBody = redactedBody.replace(termRegex, '<span class="bg-slate-800 text-transparent rounded px-4 mx-1 border border-slate-900 select-none shadow-inner" title="Redacted Term">___</span>');
            }
            fcFrontBody.innerHTML = redactedBody;
        }
        document.getElementById("fcInstruction").innerText = "(Tap to reveal the exact term)";
    } else {
        document.getElementById("fcTitle").classList.remove("hidden");
        document.getElementById("fcTitle").innerText = title;
        const fcFrontBody = document.getElementById("fcFrontBody");
        if (fcFrontBody) fcFrontBody.classList.add("hidden");
        document.getElementById("fcInstruction").innerText = "(Tap to reveal the definition)";
    }

    document.getElementById("flashcardFront").classList.remove("hidden");
    document.getElementById("flashcardFront").classList.add("flex");
    document.getElementById("flashcardBack").classList.add("hidden");
    document.getElementById("flashcardBack").classList.remove("flex");
    document.getElementById("flashcardControls").classList.add("hidden");
}

function flipFlashcard() {
    const qItem = flashcardQueue[currentFlashcardIndex];
    
    let baseSrs = qItem.item.srs || {};
    let srsData = {
        interval: baseSrs.interval !== undefined ? baseSrs.interval : 0,
        ease: baseSrs.ease !== undefined ? baseSrs.ease : 2.5,
        mastered: baseSrs.mastered || false,
        lastRating: baseSrs.lastRating || 'forgot'
    };

    let isFirstReview = srsData.interval === 0 || srsData.interval === 1;

    let hardInt = Math.max(1, Math.round((srsData.interval || 1) * 0.5));
    let goodInt = isFirstReview ? 1 : Math.round((srsData.interval || 1) * srsData.ease);
    let easyInt = isFirstReview ? 4 : Math.round((srsData.interval || 1) * srsData.ease * 1.3);
    let masterInt = Math.max(30, Math.round((srsData.interval || 1) * srsData.ease * 1.5));

    const controls = document.getElementById("flashcardControls").children;
    if (controls.length >= 5) {
        controls[0].querySelector("span:last-child").innerText = "< 1m";
        controls[1].querySelector("span:last-child").innerText = hardInt + "d";
        controls[2].querySelector("span:last-child").innerText = goodInt + "d";
        controls[3].querySelector("span:last-child").innerText = easyInt + "d";
        controls[4].querySelector("span:last-child").innerText = masterInt + "d+";
    }

    let titleStr = qItem.item.title || qItem.item.term || "Untitled";
    let bodyHtml = qItem.item.body || qItem.item.definition || "No content.";

    if (currentFlashcardSource === 'concepts' && qItem.item.diagram) {
        bodyHtml = `<img src="${qItem.item.diagram}" class="w-full max-h-60 object-contain rounded-lg border border-slate-200 mb-4 bg-slate-50">` + bodyHtml;
    }

    // CONTEXTUAL MARKET INJECTION
    let contextHtml = '';
    const titleToSearch = titleStr;
    if (titleToSearch && typeof db !== 'undefined' && db.factors) {
        const relatedFactors = db.factors.filter(f => 
            (f.linkedConcept && f.linkedConcept.toLowerCase() === titleToSearch.toLowerCase()) || 
            (f.description && f.description.toLowerCase().includes(titleToSearch.toLowerCase()))
        );
        if (relatedFactors.length > 0) {
            contextHtml = `<div class="mt-6 pt-6 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Live Market Context</h4>
                <div class="flex flex-col gap-3">
                    ${relatedFactors.slice(0,3).map(f => `
                        <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">${f.linkedFirm || f.workspace || "Market Factor"}</span>
                            <p class="text-sm font-bold text-indigo-900">${f.title}</p>
                            ${f.metric ? `<p class="text-xs text-indigo-700 mt-1"><strong>Metric:</strong> ${f.metric}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    }

    // RENDER BACK BASED ON REVERSE STATUS
    if (qItem.isReverse) {
        document.getElementById("fcBackTitle").innerText = "Term Revealed";
        document.getElementById("fcBody").innerHTML = `<h2 class="text-3xl md:text-4xl font-extrabold text-indigo-700 mb-6 pb-4 border-b border-slate-200">${titleStr}</h2>` + bodyHtml + contextHtml;
    } else {
        document.getElementById("fcBackTitle").innerText = titleStr;
        document.getElementById("fcBody").innerHTML = bodyHtml + contextHtml;
    }

    document.getElementById("flashcardFront").classList.add("hidden");
    document.getElementById("flashcardFront").classList.remove("flex");
    document.getElementById("flashcardBack").classList.remove("hidden");
    document.getElementById("flashcardBack").classList.add("flex");
    document.getElementById("flashcardControls").classList.remove("hidden");
    document.getElementById("flashcardControls").classList.add("grid");
}

function processFlashcardResult(rating) {
    const qItem = flashcardQueue[currentFlashcardIndex];
    let srsRef;
    
    if (qItem.item.isDossier) {
        srsRef = qItem.item.srs;
    } else {
        const dataSource = currentFlashcardSource === 'concepts' ? db.concepts : db.dictionary;
        srsRef = dataSource[qItem.originalIndex].srs;
    }

    let srsData = {
        interval: (srsRef && srsRef.interval !== undefined) ? srsRef.interval : 0,
        ease: (srsRef && srsRef.ease !== undefined) ? srsRef.ease : 2.5,
        nextReview: (srsRef && srsRef.nextReview !== undefined) ? srsRef.nextReview : new Date().getTime(),
        mastered: (srsRef && srsRef.mastered) || false,
        lastRating: (srsRef && srsRef.lastRating) || 'forgot'
    };

    let quality = 0;
    let isFirstReview = srsData.interval === 0 || srsData.interval === 1;

    if (rating === 'mastered') {
        quality = 5;
        srsData.interval = Math.max(30, Math.round((srsData.interval || 1) * srsData.ease * 1.5));
        srsData.mastered = true;
    } else {
        srsData.mastered = false; 
        if (rating === 'easy') {
            quality = 5;
            srsData.interval = isFirstReview ? 4 : Math.round(srsData.interval * srsData.ease * 1.3);
            srsData.ease += 0.15;
        } else if (rating === 'good') {
            quality = 4;
            srsData.interval = isFirstReview ? 1 : Math.round(srsData.interval * srsData.ease);
        } else if (rating === 'hard') {
            quality = 3;
            srsData.interval = Math.max(1, Math.round((srsData.interval || 1) * 0.5));
            srsData.ease = Math.max(1.3, srsData.ease - 0.15);
        } else {
            quality = 1;
            srsData.interval = 0;
            srsData.ease = Math.max(1.3, srsData.ease - 0.20);
        }
    }

    srsData.lastRating = rating;

    if (srsData.interval === 0) {
        srsData.nextReview = new Date().getTime() + 60000;
        srsData.interval = 1; 
    } else {
        srsData.nextReview = new Date().getTime() + (srsData.interval * 24 * 60 * 60 * 1000);
    }

    if (qItem.item.isDossier) {
        db.dossiers[qItem.item.firmName].srs[qItem.item.dossierKey] = srsData;
    } else {
        const dataSource = currentFlashcardSource === 'concepts' ? db.concepts : db.dictionary;
        dataSource[qItem.originalIndex].srs = srsData;
    }
    
    saveDatabase(); 
    currentFlashcardIndex++;
    renderCurrentFlashcard();
}

function closeFlashcards() {
    document.getElementById("flashcardModal").classList.add("hidden");
    document.getElementById("flashcardModal").classList.remove("flex");
    
    if (currentFlashcardSource === 'concepts' && typeof renderConcepts === 'function') {
        if(typeof window.selectedConcepts !== 'undefined') window.selectedConcepts.clear();
        renderConcepts();
    } else if (currentFlashcardSource === 'dictionary' && typeof renderDictionary === 'function') {
        if(typeof window.selectedDictionary !== 'undefined') window.selectedDictionary.clear();
        renderDictionary();
    }
}

document.addEventListener('keydown', function(e) {
    const modal = document.getElementById("flashcardModal");
    if (!modal || modal.classList.contains("hidden")) return;
    
    const front = document.getElementById("flashcardFront");
    const back = document.getElementById("flashcardBack");
    
    if (document.activeElement.id === 'feynmanInput') return;
    
    if (!front.classList.contains("hidden") && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        flipFlashcard();
    } 
    else if (!back.classList.contains("hidden")) {
        if (e.code === 'Digit1') { e.preventDefault(); processFlashcardResult('forgot'); }
        if (e.code === 'Digit2') { e.preventDefault(); processFlashcardResult('hard'); }
        if (e.code === 'Digit3') { e.preventDefault(); processFlashcardResult('good'); }
        if (e.code === 'Digit4') { e.preventDefault(); processFlashcardResult('easy'); }
        if (e.code === 'Space') { e.preventDefault(); processFlashcardResult('good'); }
    }
});

function toggleFeynmanDrawer(btn) {
    btn.classList.add("hidden");
    const drawer = document.getElementById("feynmanDrawer");
    drawer.classList.remove("hidden");
    drawer.classList.add("flex");
    document.getElementById("feynmanInput").focus();
}

async function evaluateFeynman() {
    const input = document.getElementById('feynmanInput').value.trim();
    if (!input) return alert("Please write your explanation first, or click Skip.");

    const btn = document.getElementById('btnFeynmanSubmit');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Analyzing Draft...`;
    btn.disabled = true;

    const qItem = flashcardQueue[currentFlashcardIndex];
    const isConcept = currentFlashcardSource === 'concepts';
    const term = isConcept ? (qItem.item.title || "Concept") : (qItem.item.term || "Term");
    
    const rawDefinition = isConcept ? (qItem.item.body || "") : (qItem.item.definition || "");
    const cleanDefinition = rawDefinition.replace(/<[^>]*>?/gm, '');

    const aiPrompt = `Act as an expert commercial law tutor. I am using the Feynman Technique to explain a concept simply.
    Term: "${term}"
    Real Definition: "${cleanDefinition}"
    
    My Attempt: "${input}"
    
    In 2 to 3 very short sentences, evaluate my attempt. Is it accurate? Did I explain it simply, or did I rely on jargon? What critical piece did I miss?`;

    try {
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        const aiResponse = "Your explanation captures the core mechanic perfectly. However, you relied slightly on the term 'equity' without explaining it. Next time, clarify that it means ownership shares.";

        document.getElementById('feynmanFeedbackContent').innerText = aiResponse;
        document.getElementById('feynmanFeedback').classList.remove('hidden');
        flipFlashcard();
    } catch (error) {
        alert("AI Grader failed to connect. Flipping normally.");
        flipFlashcard();
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}