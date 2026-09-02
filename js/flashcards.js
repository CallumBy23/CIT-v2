// ==========================================
// UNIVERSAL SRS FLASHCARD ENGINE & DASHBOARD
// ==========================================

let currentFlashcardSource = 'concepts'; 
let flashcardQueue = [];
let currentFlashcardIndex = 0;
window.currentFlashcardQueues = { red: [], orange: [], yellow: [], green: [] };

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
};

function openFlashcardDashboard(source = 'concepts', useSelectedOnly = false) {
    currentFlashcardSource = source;
    const now = new Date().getTime();
    
    let allCards = [];

    if (source === 'dossiers') {
        if (!currentDossierFirm) return alert("Select a firm first.");
        const firm = db.dossiers[currentDossierFirm];
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
            } else if (source === 'dictionary' && typeof window.currentDictCategory !== 'undefined') {
                activeCat = window.currentDictCategory;
                specificAlpha = window.activeDictAlpha;
            }
        } catch(e) {}
        
        allCards = dataSource
            .map((item, index) => ({ item, originalIndex: index }))
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
        if (currentFlashcardSource === 'concepts' && typeof renderConcepts === 'function') renderConcepts();
        else if (currentFlashcardSource === 'dictionary' && typeof renderDictionary === 'function') renderDictionary();
        else if (currentFlashcardSource === 'all' && typeof renderDashboard === 'function') renderDashboard();
        return;
    }

    const itemObj = flashcardQueue[currentFlashcardIndex];
    const item = itemObj.item;
    
    const isReverse = !item.isDossier && window.isReverseFlashcards;
    itemObj.isReverse = isReverse;

    const category = item.category || "General";
    const title = String(item.title || item.term || "Untitled");
    const body = String(item.body || item.definition || item.content || "No data logged.");

    document.getElementById("flashcardCounter").innerText = `Card ${currentFlashcardIndex + 1} of ${flashcardQueue.length}`;
    document.getElementById("fcCategory").innerText = category;
    document.getElementById("fcBackCategory").innerText = category;

    if (isReverse) {
        document.getElementById("fcTitle").classList.add("hidden");
        const fcFrontBody = document.getElementById("fcFrontBody");
        if (fcFrontBody) {
            fcFrontBody.classList.remove("hidden");
            
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

    let titleStr = String(qItem.item.title || qItem.item.term || "Untitled");
    let bodyHtml = String(qItem.item.body || qItem.item.definition || "No content.");

    if ((currentFlashcardSource === 'concepts' || (currentFlashcardSource === 'all' && qItem.sourceType === 'concepts')) && qItem.item.diagram) {
        bodyHtml = `<img src="${qItem.item.diagram}" class="w-full max-h-60 object-contain rounded-md border border-slate-200 dark:border-slate-700 mb-4 bg-white dark:bg-slate-800">` + bodyHtml;
    }

    let contextHtml = '';
    const titleToSearch = titleStr;
    if (titleToSearch && typeof db !== 'undefined' && db.factors) {
        const relatedFactors = db.factors.filter(f => 
            (f.linkedConcept && String(f.linkedConcept).toLowerCase() === titleToSearch.toLowerCase()) || 
            (f.description && String(f.description).toLowerCase().includes(titleToSearch.toLowerCase()))
        );
        if (relatedFactors.length > 0) {
            contextHtml = `<div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Live Market Context</h4>
                <div class="flex flex-col gap-3">
                    ${relatedFactors.slice(0,3).map(f => `
                        <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-3">
                            <span class="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-1">${f.linkedFirm || f.workspace || "Market Factor"}</span>
                            <p class="text-sm font-bold text-indigo-900 dark:text-indigo-200">${f.title}</p>
                            ${f.metric ? `<p class="text-xs text-indigo-700 dark:text-indigo-300 mt-1"><strong>Metric:</strong> ${f.metric}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    }

    if (qItem.isReverse) {
        document.getElementById("fcBackTitle").innerText = "Term Revealed";
        document.getElementById("fcBody").innerHTML = `<h2 class="text-3xl md:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">${titleStr}</h2>` + bodyHtml + contextHtml;
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
    } else if (currentFlashcardSource === 'all') {
        const dataSource = qItem.sourceType === 'concepts' ? db.concepts : db.dictionary;
        srsRef = dataSource[qItem.originalIndex].srs;
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

    if (qItem.item.isDossier) {
        db.dossiers[qItem.item.firmName].srs[qItem.item.dossierKey] = srsData;
    } else if (currentFlashcardSource === 'all') {
        const dataSource = qItem.sourceType === 'concepts' ? db.concepts : db.dictionary;
        dataSource[qItem.originalIndex].srs = srsData;
    } else {
        const dataSource = currentFlashcardSource === 'concepts' ? db.concepts : db.dictionary;
        dataSource[qItem.originalIndex].srs = srsData;
    }
    
    if(typeof saveDatabase === 'function') saveDatabase(); 
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
    const isConcept = currentFlashcardSource === 'concepts' || (currentFlashcardSource === 'all' && qItem.sourceType === 'concepts');
    const term = isConcept ? String(qItem.item.title || "Concept") : String(qItem.item.term || "Term");
    
    const rawDefinition = isConcept ? String(qItem.item.body || "") : String(qItem.item.definition || "");
    const cleanDefinition = rawDefinition.replace(/<[^>]*>?/gm, '');

    const aiPrompt = `Act as an expert commercial law tutor. I am using the Feynman Technique to explain a concept simply.
    Term: "${term}"
    Real Definition: "${cleanDefinition}"
    
    My Attempt: "${input}"
    
    In 2 to 3 very short sentences, evaluate my attempt. Is it accurate? Did I explain it simply, or did I rely on jargon? What critical piece did I miss?`;

    try {
        const aiResponse = typeof callGeminiApi === 'function' 
            ? await callGeminiApi(aiPrompt) 
            : "System simulated response. Grader requires API connection.";

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