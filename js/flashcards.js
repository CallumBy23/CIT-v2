// ==========================================
// UNIVERSAL SRS FLASHCARD ENGINE & DASHBOARD
// ==========================================

let currentFlashcardSource = 'concepts'; 
let flashcardQueue = [];
let currentFlashcardIndex = 0;
window.currentFlashcardQueues = { red: [], orange: [], yellow: [], green: [] };

window.isReverseFlashcards = localStorage.getItem('LEGAL_NEXUS_FC_REVERSE') === 'true';
window.isRecallDrillMode = localStorage.getItem('LEGAL_NEXUS_RECALL_MODE') === 'true';
window.isFeynmanMode = localStorage.getItem('LEGAL_NEXUS_FEYNMAN_MODE') === 'true';

let recognitionInstance = null;
let isRecordingVoice = false;

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
            btn.classList.replace('text-slate-700', 'text-indigo-700');
            btn.classList.replace('border-slate-300', 'border-indigo-300');
            btn.classList.add('dark:bg-slate-800', 'dark:text-indigo-400', 'dark:border-indigo-500');
        } else {
            if (textSpan) textSpan.innerText = "Front: Term";
            btn.classList.replace('bg-indigo-50', 'bg-white');
            btn.classList.replace('text-indigo-700', 'text-slate-700');
            btn.classList.replace('border-indigo-300', 'border-slate-300');
            btn.classList.remove('dark:bg-slate-800', 'dark:text-indigo-400', 'dark:border-indigo-500');
        }
    });
};

function reviewSelectedCards(source) {
    openFlashcardDashboard(source, true);
}

window.openUniversalFlashcardDashboard = function() {
    currentFlashcardSource = 'all';
    const now = new Date().getTime();
    let allCards = [];

    (db.concepts || []).forEach((c, index) => {
        allCards.push({ item: c, originalIndex: index, sourceType: 'concepts' });
    });

    (db.dictionary || []).forEach((d, index) => {
        allCards.push({ item: d, originalIndex: index, sourceType: 'dictionary' });
    });

    if (allCards.length === 0) return alert("No flashcards found in library.");
    buildSrsQueues(allCards, now);
};

function openFlashcardDashboard(source = 'concepts', useSelectedOnly = false, targetConceptIdx = null) {
    currentFlashcardSource = source;
    const now = new Date().getTime();
    let allCards = [];

    // --- CASE A: Granular Concept Breakdown Flashcards ---
    if (source === 'concept-elements') {
        const idx = targetConceptIdx !== null ? targetConceptIdx : window.activeConceptDetailIndex;
        if (idx === null || !db.concepts || !db.concepts[idx]) {
            return alert("No active concept selected for review.");
        }

        const concept = db.concepts[idx];
        concept.subSrs = concept.subSrs || (concept.srs && concept.srs.subSrs) || {};
        const extracted = typeof window.extractConceptFlashcardCards === 'function' 
            ? window.extractConceptFlashcardCards(concept) 
            : [];

        if (extracted.length === 0) {
            return alert("No individual card sections found in this concept to review.");
        }

        allCards = extracted.map(card => {
            const cardSrs = concept.subSrs[card.id] || { interval: 0, nextReview: 0, lastRating: 'forgot', mastered: false, totalReviews: 0 };
            return {
                item: {
                    id: card.id,
                    title: card.title,
                    category: card.category || concept.category,
                    body: card.body,
                    srs: cardSrs,
                    isConceptElement: true,
                    conceptIndex: idx,
                    subKey: card.id
                },
                sourceType: 'concept-elements',
                originalIndex: idx
            };
        });

        flashcardQueue = allCards.map(c => ({ item: c.item, sourceType: 'concept-elements', originalIndex: idx }));
        return startQueueDirectly();
    }

    if (source === 'dossiers') {
        if (!currentDossierFirm) return alert("Select a firm first.");
        const firm = db.dossiers[currentDossierFirm] || {};
        if (!firm.srs) firm.srs = {};
        
        let practiceBody = (Array.isArray(firm.practice) && firm.practice.length > 0) 
            ? firm.practice.map(p => `<h4>${p.heading}</h4>${p.body}`).join('<hr class="my-4 border-slate-200 dark:border-slate-700">') 
            : "<p>No data logged.</p>";
            
        let clientsBody = (Array.isArray(firm.clients) && firm.clients.length > 0) 
            ? firm.clients.map(p => `<h4>${p.heading}</h4>${p.body}`).join('<hr class="my-4 border-slate-200 dark:border-slate-700">') 
            : "<p>No data logged.</p>";

        let possibleCards = [
            { id: 'practice', category: 'Firm Profile', title: `${currentDossierFirm} - Core Practice Areas`, body: practiceBody },
            { id: 'clients', category: 'Firm Profile', title: `${currentDossierFirm} - Key Clients & Deals`, body: clientsBody },
            { id: 'culture', category: 'Firm Profile', title: `${currentDossierFirm} - Culture & Structure`, body: firm.culture || "<p>No data logged.</p>" }
        ];

        (db.factors || []).forEach((f, idx) => {
            if (f.linkedFirm && String(f.linkedFirm).trim().toLowerCase() === String(currentDossierFirm).toLowerCase()) {
                possibleCards.push({
                    id: `intel_${idx}`,
                    category: 'Market Intelligence',
                    title: `${currentDossierFirm} Insight: ${f.title || f.headline || 'Untitled'}`,
                    body: `<p><strong>Context:</strong> ${f.description || 'N/A'}</p><p><strong>Implications:</strong> ${f.implications || 'None logged.'}</p>`
                });
            }
        });

        if (useSelectedOnly) {
            const selected = window.selectedDossierCards ? Array.from(window.selectedDossierCards) : [];
            if (selected.length === 0) return alert("Please select at least one item using the checkboxes to review.");
            possibleCards = possibleCards.filter(c => selected.includes(c.id));
        }

        flashcardQueue = possibleCards.map(card => ({
            item: {
                title: card.title, category: card.category, body: card.body,
                srs: firm.srs[card.id] || null, isDossier: true, dossierKey: card.id, firmName: currentDossierFirm
            },
            sourceType: 'dossiers',
            originalIndex: 0 
        }));

        if (useSelectedOnly) return startQueueDirectly();

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
            flashcardQueue = specificIndices.map(index => ({ 
                item: dataSource[index], 
                sourceType: source,
                originalIndex: index 
            }));
            return startQueueDirectly();
        }

        let activeCat = "All";
        let specificAlpha = null;
        try {
            if (source === 'concepts' && typeof currentConceptCategory !== 'undefined') {
                activeCat = currentConceptCategory;
                specificAlpha = window.activeConceptAlpha;
            } else if (source === 'dictionary' && typeof window.currentDictCategory !== 'undefined') {
                activeCat = window.currentDictCategory;
                specificAlpha = window.activeDictAlpha;
            }
        } catch(e) {}
        
        allCards = dataSource
            .map((item, index) => ({ item, sourceType: source, originalIndex: index }))
            .filter(obj => {
                let itemCat = obj.item.category || "General";
                let matchesTab = (activeCat === "All" || activeCat === "All Terms" || itemCat === activeCat);
                
                let matchesAlpha = true;
                if (specificAlpha && specificAlpha.size > 0) {
                    const titleToCheck = String(obj.item.title || obj.item.term || "").trim();
                    if (!titleToCheck) matchesAlpha = false;
                    else matchesAlpha = specificAlpha.has(titleToCheck.charAt(0).toUpperCase());
                }

                return matchesTab && matchesAlpha; 
            });
    }

    if (allCards.length === 0) return alert("No flashcards found matching these filters.");
    buildSrsQueues(allCards, now);
}

function buildSrsQueues(allCards, now) {
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

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setVal('fcRedCount', window.currentFlashcardQueues.red.length);
    setVal('fcOrangeCount', window.currentFlashcardQueues.orange.length);
    setVal('fcYellowCount', window.currentFlashcardQueues.yellow.length);
    setVal('fcGreenCount', window.currentFlashcardQueues.green.length);

    const m = document.getElementById('flashcardDashboardModal');
    if (m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
    }
}

function launchQueue(queueColor) {
    const dashModal = document.getElementById('flashcardDashboardModal');
    if (dashModal) {
        dashModal.classList.add('hidden');
        dashModal.classList.remove('flex');
    }

    flashcardQueue = [...window.currentFlashcardQueues[queueColor]];
    if (flashcardQueue.length === 0) return alert("This queue is empty!");

    startQueueDirectly();
}

function startQueueDirectly() {
    flashcardQueue = flashcardQueue.sort(() => Math.random() - 0.5);
    currentFlashcardIndex = 0;
    
    const fcModal = document.getElementById("flashcardModal");
    if (fcModal) {
        fcModal.classList.remove("hidden");
        fcModal.classList.add("flex");
    }
    
    setupFlashcardClickListeners();
    renderCurrentFlashcard();
}

function setupFlashcardClickListeners() {
    const frontCard = document.getElementById("flashcardFront");
    const backCard = document.getElementById("flashcardBack");

    if (frontCard && !frontCard.dataset.clickFlipBound) {
        frontCard.dataset.clickFlipBound = "true";
        frontCard.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("textarea") || e.target.closest("input") || e.target.closest("#recallDockWrapper") || e.target.closest("#feynmanWrapper")) {
                return;
            }
            flipFlashcard();
        });
    }

    if (backCard && !backCard.dataset.clickFlipBound) {
        backCard.dataset.clickFlipBound = "true";
        backCard.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("textarea") || e.target.closest("input") || e.target.closest("a")) {
                return;
            }
            unflipFlashcard();
        });
    }
}

window.pushCardToEndOfQueue = function() {
    const qItem = flashcardQueue[currentFlashcardIndex];
    if (qItem) {
        flashcardQueue.push(qItem);
        if (typeof showToast === 'function') showToast("Card sent to the back of the queue.", "info");
    }
    currentFlashcardIndex++;
    renderCurrentFlashcard();
};

function resetCardInputs() {
    const feynmanInput = document.getElementById("feynmanInput");
    const feynmanFeedback = document.getElementById("feynmanFeedback");
    const recallInput = document.getElementById('recallAnswerInput');
    const recallBanner = document.getElementById('recallResultBanner');
    const recallCheckBtn = document.getElementById('btnRecallCheck');

    if (feynmanInput) feynmanInput.value = "";
    if (feynmanFeedback) feynmanFeedback.classList.add("hidden");
    if (recallInput) recallInput.value = "";
    if (recallBanner) recallBanner.classList.add('hidden');
    if (recallCheckBtn) {
        recallCheckBtn.innerText = "Check Answer";
        recallCheckBtn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-none text-xs transition shadow flex items-center justify-center gap-1.5";
        recallCheckBtn.onclick = window.checkRecallAnswer;
    }
}

function renderCurrentFlashcard() {
    if (currentFlashcardIndex >= flashcardQueue.length) {
        alert("Session Complete! Great job maintaining your commercial knowledge.");
        closeFlashcards();
        return;
    }

    resetCardInputs();

    const itemObj = flashcardQueue[currentFlashcardIndex];
    const item = itemObj.item;
    
    const isReverse = !item.isDossier && window.isReverseFlashcards;
    itemObj.isReverse = isReverse;

    const category = item.category || "General";
    const title = String(item.title || item.term || "Untitled");
    const body = String(item.body || item.definition || item.content || "No data logged.");

    const counterEl = document.getElementById("flashcardCounter");
    if (counterEl) counterEl.innerText = `Card ${currentFlashcardIndex + 1} of ${flashcardQueue.length}`;
    
    const catEl = document.getElementById("fcCategory");
    if (catEl) catEl.innerText = category;
    
    const backCatEl = document.getElementById("fcBackCategory");
    if (backCatEl) backCatEl.innerText = category;

    const fcTitle = document.getElementById("fcTitle");
    const fcFrontBody = document.getElementById("fcFrontBody");
    const instructionEl = document.getElementById("fcInstruction");

    if (isReverse) {
        if (fcTitle) fcTitle.classList.add("hidden");
        if (fcFrontBody) {
            fcFrontBody.classList.remove("hidden");
            let redactedBody = body;
            if (title && title !== "Untitled") {
                const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const termRegex = new RegExp(escapeRegExp(title), 'gi');
                redactedBody = redactedBody.replace(termRegex, '<span class="bg-slate-800 text-transparent rounded-none px-4 mx-1 select-none">___</span>');
            }
            fcFrontBody.innerHTML = redactedBody;
        }
        if (instructionEl) instructionEl.innerText = "(Tap card to reveal the exact term)";
    } else {
        if (fcTitle) {
            fcTitle.classList.remove("hidden");
            fcTitle.innerText = title;
        }
        if (fcFrontBody) fcFrontBody.classList.add("hidden");
        if (instructionEl) instructionEl.innerText = "(Tap card to reveal definition)";
    }

    const front = document.getElementById("flashcardFront");
    const back = document.getElementById("flashcardBack");
    const controls = document.getElementById("flashcardControls");

    if (front) {
        front.classList.remove("hidden");
        front.classList.add("flex");
    }
    if (back) {
        back.classList.add("hidden");
        back.classList.remove("flex");
    }
    if (controls) controls.classList.add("hidden");

    window.applyRecallUIState();
    window.applyFeynmanUIState();
}

function flipFlashcard() {
    const qItem = flashcardQueue[currentFlashcardIndex];
    if (!qItem) return;
    
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

    const controlsContainer = document.getElementById("flashcardControls");
    if (controlsContainer && controlsContainer.children.length >= 5) {
        const controls = controlsContainer.children;
        controls[0].querySelector("span:last-child").innerText = "< 1m";
        controls[1].querySelector("span:last-child").innerText = hardInt + "d";
        controls[2].querySelector("span:last-child").innerText = goodInt + "d";
        controls[3].querySelector("span:last-child").innerText = easyInt + "d";
        controls[4].querySelector("span:last-child").innerText = masterInt + "d+";
    }

    let titleStr = String(qItem.item.title || qItem.item.term || "Untitled");
    let bodyHtml = String(qItem.item.body || qItem.item.definition || "No content.");

    if (qItem.item.diagram) {
        bodyHtml = `<img src="${qItem.item.diagram}" class="w-full max-h-60 object-contain rounded-none border border-slate-200 dark:border-slate-700 mb-4 bg-white dark:bg-slate-800">` + bodyHtml;
    }

    const fcBackTitle = document.getElementById("fcBackTitle");
    const fcBody = document.getElementById("fcBody");

    if (qItem.isReverse) {
        if (fcBackTitle) fcBackTitle.innerText = "Term Revealed";
        if (fcBody) fcBody.innerHTML = `<h2 class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">${titleStr}</h2>` + bodyHtml;
    } else {
        if (fcBackTitle) fcBackTitle.innerText = titleStr;
        if (fcBody) fcBody.innerHTML = bodyHtml;
    }

    const front = document.getElementById("flashcardFront");
    const back = document.getElementById("flashcardBack");

    if (front) {
        front.classList.add("hidden");
        front.classList.remove("flex");
    }
    if (back) {
        back.classList.remove("hidden");
        back.classList.add("flex");
    }
    if (controlsContainer) {
        controlsContainer.classList.remove("hidden");
        controlsContainer.classList.add("grid");
    }
}

function unflipFlashcard() {
    const front = document.getElementById("flashcardFront");
    const back = document.getElementById("flashcardBack");
    const controls = document.getElementById("flashcardControls");

    if (!front || !back) return;

    back.classList.add("hidden");
    back.classList.remove("flex");
    front.classList.remove("hidden");
    front.classList.add("flex");
    
    if (controls) {
        controls.classList.add("hidden");
        controls.classList.remove("grid");
    }
}

window.flipFlashcard = flipFlashcard;
window.unflipFlashcard = unflipFlashcard;

function processFlashcardResult(rating) {
    const qItem = flashcardQueue[currentFlashcardIndex];
    if (!qItem) return;

    let srsRef;
    if (qItem.item.isConceptElement) {
        const c = db.concepts[qItem.item.conceptIndex];
        if (c) {
            c.subSrs = c.subSrs || (c.srs && c.srs.subSrs) || {};
            srsRef = c.subSrs[qItem.item.subKey] || null;
        }
    } else if (qItem.item.isDossier) {
        if (!db.dossiers[qItem.item.firmName].srs) db.dossiers[qItem.item.firmName].srs = {};
        srsRef = db.dossiers[qItem.item.firmName].srs[qItem.item.dossierKey];
    } else if (qItem.sourceType === 'concepts') {
        srsRef = db.concepts[qItem.originalIndex] ? db.concepts[qItem.originalIndex].srs : null;
    } else {
        srsRef = db.dictionary[qItem.originalIndex] ? db.dictionary[qItem.originalIndex].srs : null;
    }

    let srsData = {
        interval: (srsRef && srsRef.interval !== undefined) ? srsRef.interval : 0,
        ease: (srsRef && srsRef.ease !== undefined) ? srsRef.ease : 2.5,
        nextReview: (srsRef && srsRef.nextReview !== undefined) ? srsRef.nextReview : new Date().getTime(),
        mastered: (srsRef && srsRef.mastered) || false,
        lastRating: (srsRef && srsRef.lastRating) || 'forgot'
    };

    let isFirstReview = srsData.interval === 0 || srsData.interval === 1;

    if (rating === 'mastered') {
        srsData.interval = Math.max(30, Math.round((srsData.interval || 1) * srsData.ease * 1.5));
        srsData.mastered = true;
    } else {
        srsData.mastered = false; 
        if (rating === 'easy') {
            srsData.interval = isFirstReview ? 4 : Math.round(srsData.interval * srsData.ease * 1.3);
            srsData.ease += 0.15;
        } else if (rating === 'good') {
            srsData.interval = isFirstReview ? 1 : Math.round(srsData.interval * srsData.ease);
        } else if (rating === 'hard') {
            srsData.interval = Math.max(1, Math.round((srsData.interval || 1) * 0.5));
            srsData.ease = Math.max(1.3, srsData.ease - 0.15);
        } else {
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

    srsData.lastReviewed = new Date().getTime();
    srsData.totalReviews = (srsData.totalReviews || 0) + 1;

    if (qItem.item.isConceptElement) {
        const c = db.concepts[qItem.item.conceptIndex];
        if (c) {
            c.subSrs = c.subSrs || {};
            c.subSrs[qItem.item.subKey] = srsData;
            
            // Recalculate parent concept SRS based on all granular components
            const subCards = typeof window.extractConceptFlashcardCards === 'function' ? window.extractConceptFlashcardCards(c) : [];
            let totalSubScore = 0;
            subCards.forEach(card => {
                const itemSrs = c.subSrs[card.id] || { interval: 0, ease: 2.5, mastered: false };
                totalSubScore += (itemSrs.mastered || itemSrs.interval >= 21) ? 100 : Math.min(100, Math.round(((itemSrs.interval || 0) / 21) * 100));
            });
            const avgPct = subCards.length > 0 ? Math.round(totalSubScore / subCards.length) : 0;
            c.srs = c.srs || {};
            c.srs.mastered = avgPct === 100;
            c.srs.interval = Math.round((avgPct / 100) * 21);
            c.srs.lastReviewed = srsData.lastReviewed;
            c.srs.nextReview = srsData.nextReview;
            c.srs.totalReviews = (c.srs.totalReviews || 0) + 1;
            c.srs.subSrs = c.subSrs;
        }
    } else if (qItem.item.isDossier) {
        db.dossiers[qItem.item.firmName].srs[qItem.item.dossierKey] = srsData;
    } else if (qItem.sourceType === 'concepts') {
        if (db.concepts[qItem.originalIndex]) db.concepts[qItem.originalIndex].srs = srsData;
    } else {
        if (db.dictionary[qItem.originalIndex]) db.dictionary[qItem.originalIndex].srs = srsData;
    }
    
    if (typeof saveDatabase === 'function') saveDatabase(); 

    if (window.activeConceptDetailIndex !== null && typeof window.renderConceptDetailView === 'function') {
        window.renderConceptDetailView();
    }
    
    currentFlashcardIndex++;
    renderCurrentFlashcard();
}

function closeFlashcards() {
    const fcModal = document.getElementById("flashcardModal");
    if (fcModal) {
        fcModal.classList.add("hidden");
        fcModal.classList.remove("flex");
    }
    
    if (currentFlashcardSource === 'concept-elements') {
        if (window.activeConceptDetailIndex !== null && typeof window.renderConceptDetailView === 'function') {
            window.renderConceptDetailView();
        }
        if (typeof renderConcepts === 'function') renderConcepts();
    } else if (currentFlashcardSource === 'concepts' && typeof renderConcepts === 'function') {
        if (typeof window.selectedConcepts !== 'undefined') window.selectedConcepts.clear();
        renderConcepts();
    } else if (currentFlashcardSource === 'dictionary' && typeof renderDictionary === 'function') {
        if (typeof window.selectedDictionary !== 'undefined') window.selectedDictionary.clear();
        renderDictionary();
    } else if (currentFlashcardSource === 'all') {
        if (typeof renderConcepts === 'function') renderConcepts();
        if (typeof renderDictionary === 'function') renderDictionary();
        if (typeof renderDashboard === 'function') renderDashboard();
    }
}

document.addEventListener('keydown', function(e) {
    const modal = document.getElementById("flashcardModal");
    if (!modal || modal.classList.contains("hidden")) return;
    
    const front = document.getElementById("flashcardFront");
    const back = document.getElementById("flashcardBack");
    
    if (document.activeElement && (document.activeElement.id === 'feynmanInput' || document.activeElement.id === 'recallAnswerInput')) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (front && !front.classList.contains("hidden")) {
            flipFlashcard();
        } else if (back && !back.classList.contains("hidden")) {
            unflipFlashcard();
        }
        return;
    }

    if (front && !front.classList.contains("hidden") && e.code === 'Enter') {
        e.preventDefault();
        flipFlashcard();
        return;
    } 
    
    if (back && !back.classList.contains("hidden")) {
        if (e.code === 'Digit1') { e.preventDefault(); processFlashcardResult('forgot'); }
        if (e.code === 'Digit2') { e.preventDefault(); processFlashcardResult('hard'); }
        if (e.code === 'Digit3' || e.code === 'Enter') { e.preventDefault(); processFlashcardResult('good'); }
        if (e.code === 'Digit4') { e.preventDefault(); processFlashcardResult('easy'); }
        if (e.code === 'Digit5') { e.preventDefault(); processFlashcardResult('mastered'); }
    }
});

window.toggleFeynmanMode = function() {
    window.isFeynmanMode = !window.isFeynmanMode;
    localStorage.setItem('LEGAL_NEXUS_FEYNMAN_MODE', window.isFeynmanMode);
    window.applyFeynmanUIState();
};

window.applyFeynmanUIState = function() {
    const wrapper = document.getElementById('feynmanWrapper');
    const btnLabel = document.getElementById('feynmanModeLabel');
    const toggleBtn = document.getElementById('btnToggleFeynmanMode');

    if (!wrapper || !btnLabel) return;

    if (window.isFeynmanMode) {
        wrapper.classList.remove('hidden');
        btnLabel.innerText = "Feynman: ON";
        if (toggleBtn) toggleBtn.classList.add('bg-purple-50', 'text-purple-700', 'border-purple-300', 'dark:bg-purple-950/50', 'dark:text-purple-300', 'dark:border-purple-700');
    } else {
        wrapper.classList.add('hidden');
        btnLabel.innerText = "Feynman: OFF";
        if (toggleBtn) toggleBtn.classList.remove('bg-purple-50', 'text-purple-700', 'border-purple-300', 'dark:bg-purple-950/50', 'dark:text-purple-300', 'dark:border-purple-700');
    }
};

window.evaluateFeynman = async function() {
    const inputEl = document.getElementById('feynmanInput');
    const input = inputEl ? inputEl.value.trim() : "";
    if (!input) return alert("Please type your plain-English explanation into the box first.");

    const btn = document.getElementById('btnFeynmanSubmit');
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Evaluating plain explanation...`;
    btn.disabled = true;

    const qItem = flashcardQueue[currentFlashcardIndex];
    const isConcept = currentFlashcardSource === 'concepts' || (currentFlashcardSource === 'all' && qItem.sourceType === 'concepts');
    const term = isConcept ? String(qItem.item.title || "Concept") : String(qItem.item.term || "Term");
    
    const rawDef = isConcept ? String(qItem.item.body || "") : String(qItem.item.definition || "");
    const cleanDef = rawDef.replace(/<[^>]*>?/gm, '');

    const aiPrompt = `You are a legal trainer evaluating a candidate's plain-English Feynman explanation.
Concept: "${term}"
Real Definition: "${cleanDef}"

Candidate Explanation: "${input}"

In 2 short sentences:
1. Is it accurate without relying on jargon?
2. What vital legal or commercial detail is missing?`;

    try {
        const aiResponse = typeof callGeminiApi === 'function' 
            ? await callGeminiApi(aiPrompt) 
            : "AI response received.";

        const feedbackContent = document.getElementById('feynmanFeedbackContent');
        if (feedbackContent) feedbackContent.innerText = aiResponse;
        
        const feedbackBox = document.getElementById('feynmanFeedback');
        if (feedbackBox) feedbackBox.classList.remove('hidden');
        
        flipFlashcard();
    } catch (err) {
        alert("AI Evaluation note: " + err.message);
        flipFlashcard();
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.toggleRecallDrillMode = function() {
    window.isRecallDrillMode = !window.isRecallDrillMode;
    localStorage.setItem('LEGAL_NEXUS_RECALL_MODE', window.isRecallDrillMode);
    window.applyRecallUIState();
};

window.applyRecallUIState = function() {
    const dock = document.getElementById('recallDockWrapper');
    const btnLabel = document.getElementById('recallModeLabel');
    const toggleBtn = document.getElementById('btnToggleRecallMode');

    if (!dock || !btnLabel) return;

    if (window.isRecallDrillMode) {
        dock.classList.remove('hidden');
        btnLabel.innerText = "Recall Drill: ON";
        if (toggleBtn) toggleBtn.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-300', 'dark:bg-blue-950/50', 'dark:text-blue-300', 'dark:border-blue-700');
        const input = document.getElementById('recallAnswerInput');
        if (input) setTimeout(() => input.focus(), 50);
    } else {
        dock.classList.add('hidden');
        btnLabel.innerText = "Recall Drill: OFF";
        if (toggleBtn) toggleBtn.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-300', 'dark:bg-blue-950/50', 'dark:text-blue-300', 'dark:border-blue-700');
    }
};

window.toggleSpeechRecognition = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition is not supported on this browser.");
        return;
    }

    const micBtn = document.getElementById('btnRecallMic');
    const input = document.getElementById('recallAnswerInput');

    if (isRecordingVoice && recognitionInstance) {
        recognitionInstance.stop();
        return;
    }

    try {
        recognitionInstance = new SpeechRecognition();
        recognitionInstance.lang = 'en-GB';
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;

        recognitionInstance.onstart = function() {
            isRecordingVoice = true;
            if (micBtn) micBtn.classList.add('text-rose-500', 'animate-pulse');
        };

        recognitionInstance.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            if (input) input.value = input.value ? `${input.value} ${transcript}` : transcript;
        };

        recognitionInstance.onend = function() {
            isRecordingVoice = false;
            if (micBtn) micBtn.classList.remove('text-rose-500', 'animate-pulse');
        };

        recognitionInstance.start();
    } catch (e) {
        console.error("Speech Init Error:", e);
    }
};

function cleanWords(text) {
    const stopWords = new Set(["the", "a", "an", "is", "are", "of", "and", "or", "in", "to", "for", "with", "that", "this", "by", "from", "as", "at", "be", "which", "on", "it"]);
    return text.toLowerCase()
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
}

function evaluateAnswerLocally(userText, modelText) {
    const userWords = new Set(cleanWords(userText));
    const modelWords = cleanWords(modelText);
    
    if (modelWords.length === 0) return { passed: true, score: 100 };
    
    let matchedCount = 0;
    modelWords.forEach(w => {
        if (userWords.has(w)) matchedCount++;
    });

    const matchRatio = matchedCount / modelWords.length;
    return {
        passed: matchRatio >= 0.40 || (userText.length > 20 && matchRatio >= 0.30),
        score: Math.round(matchRatio * 100)
    };
}

window.checkRecallAnswer = async function() {
    const input = document.getElementById('recallAnswerInput');
    const banner = document.getElementById('recallResultBanner');
    const checkBtn = document.getElementById('btnRecallCheck');

    if (!input || !input.value.trim()) {
        alert("Please write or speak your recall attempt first.");
        return;
    }

    const qItem = flashcardQueue[currentFlashcardIndex];
    const isReverse = qItem.isReverse;
    const modelText = isReverse 
        ? String(qItem.item.title || qItem.item.term || "") 
        : String(qItem.item.body || qItem.item.definition || "");
    
    const cleanModel = modelText.replace(/<[^>]*>?/gm, '').trim();
    const evaluation = evaluateAnswerLocally(input.value, cleanModel);

    banner.classList.remove('hidden');

    if (evaluation.passed) {
        banner.className = "rounded-none p-3 border text-xs bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 flex flex-col gap-1";
        banner.innerHTML = `<strong>Correct Recall! (${evaluation.score}% Match)</strong><span>${cleanModel}</span>`;

        checkBtn.innerText = "Continue to Grading";
        checkBtn.className = "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-none text-xs transition shadow flex items-center justify-center gap-1.5";
        checkBtn.onclick = function() {
            flipFlashcard();
        };
    } else {
        banner.className = "rounded-none p-3 border text-xs bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800 flex flex-col gap-1";
        banner.innerHTML = `<strong>Incorrect (${evaluation.score}% Match) — Sent to End</strong><span>Expected: ${cleanModel}</span>`;

        flashcardQueue.push(qItem);
        const counterEl = document.getElementById("flashcardCounter");
        if (counterEl) counterEl.innerText = `Card ${currentFlashcardIndex + 1} of ${flashcardQueue.length}`;

        checkBtn.innerText = "Next Card (Recycled to End)";
        checkBtn.className = "w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-none text-xs transition shadow flex items-center justify-center gap-1.5";
        checkBtn.onclick = function() {
            currentFlashcardIndex++;
            renderCurrentFlashcard();
        };
    }

    if (window.lucide) window.lucide.createIcons();
};