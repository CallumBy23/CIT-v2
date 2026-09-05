// =========================================================================
// CONCEPT DETAILED WORKSPACE (EXACT PIXEL-PERFECT UI MIRROR + INTERACTIVE FLOW)
// =========================================================================

window.activeConceptDetailIndex = null;
window.activeConceptDetailTab = 'overview';
window.isConceptDetailEditMode = false;
window.directConceptQuill = null;
window.conceptPlaybookNetwork = null;

/**
 * Helper to ensure the workspace wrapper exists in the DOM
 */
function getOrCreateConceptDetailWrapper() {
    let detailWrapper = document.getElementById("conceptDetailWorkspaceWrapper");
    if (!detailWrapper) {
        detailWrapper = document.createElement("div");
        detailWrapper.id = "conceptDetailWorkspaceWrapper";
        detailWrapper.className = "w-full h-full overflow-y-auto custom-scrollbar p-2 md:p-4 bg-[#fbfbfc] dark:bg-[#0c101a] text-slate-800 dark:text-slate-100 transition-colors duration-200";
        
        const conceptsApp = document.getElementById("appConcepts");
        if (conceptsApp) {
            conceptsApp.appendChild(detailWrapper);
        }
    }
    return detailWrapper;
}

/**
 * Open full-screen concept workspace
 */
window.openConceptDetailWorkspace = function(index) {
    index = parseInt(index, 10);
    const concept = db.concepts && db.concepts[index];
    if (!concept) return;

    window.activeConceptDetailIndex = index;
    window.activeConceptDetailTab = 'overview';
    window.isConceptDetailEditMode = false;

    const detailWrapper = getOrCreateConceptDetailWrapper();

    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    if (detailWrapper) detailWrapper.classList.remove("hidden");

    window.renderConceptDetailView();
};

/**
 * Return to KMS Table view
 */
window.closeConceptDetailWorkspace = function() {
    if (window.conceptPlaybookNetwork) {
        try { window.conceptPlaybookNetwork.destroy(); } catch(e) {}
        window.conceptPlaybookNetwork = null;
    }

    const detailWrapper = document.getElementById("conceptDetailWorkspaceWrapper");
    if (detailWrapper) detailWrapper.classList.add("hidden");

    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.remove("hidden");

    window.activeConceptDetailIndex = null;
    window.isConceptDetailEditMode = false;
    if (typeof window.renderConcepts === 'function') window.renderConcepts();
};

/**
 * Switch Subtabs
 */
window.switchConceptDetailTab = function(tabKey) {
    if (window.isConceptDetailEditMode && window.activeConceptDetailTab === 'overview') {
        window.syncDirectInputsToMemory();
    }
    window.activeConceptDetailTab = tabKey;
    window.renderConceptDetailView();
};

/**
 * Toggle Edit Mode
 */
window.toggleConceptEditMode = function(enable) {
    if (enable === false && window.activeConceptDetailIndex !== null) {
        const c = db.concepts[window.activeConceptDetailIndex];
        // If it was a newly created concept with no title or body, discard it
        if (c && !c.title && !c.body) {
            db.concepts.splice(window.activeConceptDetailIndex, 1);
            window.closeConceptDetailWorkspace();
            return;
        }
    }
    window.isConceptDetailEditMode = enable !== undefined ? enable : !window.isConceptDetailEditMode;
    window.renderConceptDetailView();
};

/**
 * Import a playbook structure directly into this concept
 */
window.importPlaybookToCurrentConcept = async function() {
    if (window.activeConceptDetailIndex === null) return;
    const playbooks = Object.keys(db.playbooks || {});
    if (playbooks.length === 0) {
        alert("No playbooks exist in Deals & Playbooks yet. Create one first.");
        return;
    }

    const selectedPb = prompt(`Select a Playbook to link to this concept:\n\nAvailable:\n- ${playbooks.join('\n- ')}\n\nType the exact name:`);
    if (!selectedPb || !selectedPb.trim()) return;
    const cleanName = selectedPb.trim();

    const matchedKey = Object.keys(db.playbooks).find(k => k.toLowerCase() === cleanName.toLowerCase());

    if (!matchedKey || !db.playbooks[matchedKey]) {
        alert(`Playbook "${cleanName}" not found.`);
        return;
    }

    const c = db.concepts[window.activeConceptDetailIndex];
    c.linkedPlaybook = matchedKey;
    
    window.activeConceptDetailTab = 'structure';

    if (typeof saveDatabase === 'function') {
        await saveDatabase();
    }
    
    window.renderConceptDetailView();
    if (typeof showToast === 'function') showToast(`Linked Playbook "${matchedKey}" to concept!`, "success");
};

/**
 * Detach the linked playbook structure
 */
window.detachPlaybookFromCurrentConcept = function() {
    if (window.activeConceptDetailIndex === null) return;
    const c = db.concepts[window.activeConceptDetailIndex];
    if (confirm("Detach linked playbook from this concept?")) {
        delete c.linkedPlaybook;
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
    }
};

/**
 * Remove diagram sketch from current concept
 */
window.removeDiagramFromCurrentConcept = function() {
    if (window.activeConceptDetailIndex === null) return;
    const c = db.concepts[window.activeConceptDetailIndex];
    if (!c || !c.diagram) return;

    if (confirm("Are you sure you want to remove this diagram?")) {
        c.diagram = null;
        delete c.diagram;
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
        if (typeof showToast === 'function') showToast("Diagram removed successfully.", "info");
    }
};

/**
 * Synchronize all direct inputs from the DOM into the active concept object
 */
window.syncDirectInputsToMemory = function() {
    if (window.activeConceptDetailIndex === null) return;
    const c = db.concepts[window.activeConceptDetailIndex];
    if (!c) return;

    const titleEl = document.getElementById("inpageConceptTitle");
    const catEl = document.getElementById("inpageConceptCategory");
    const summaryEl = document.getElementById("inpageConceptSummary");
    const tagsEl = document.getElementById("inpageConceptSubTags");
    const whenEl = document.getElementById("inpageConceptWhenToUse");
    const advEl = document.getElementById("inpageConceptAdvantages");
    const disadvEl = document.getElementById("inpageConceptDisadvantages");
    const relEl = document.getElementById("inpageConceptRelated");
    const provEl = document.getElementById("inpageConceptTypicalProvisions");
    const casesEl = document.getElementById("inpageConceptCommonUseCases");
    const keyPointsEl = document.getElementById("inpageConceptKeyPoints");

    if (titleEl && titleEl.value.trim()) c.title = titleEl.value.trim();
    if (catEl) c.category = catEl.value;
    if (summaryEl) c.summary = summaryEl.value.trim();
    if (tagsEl) c.subTag = tagsEl.value.trim();
    if (whenEl) c.whenToUse = whenEl.value.trim();
    if (advEl) advEl.value = advEl.value.trim();
    if (disadvEl) c.disadvantages = disadvEl.value.trim();
    if (relEl) c.relatedConcepts = relEl.value.trim();
    if (provEl) c.typicalProvisions = provEl.value.trim();
    if (casesEl) c.commonUseCases = casesEl.value.trim();
    
    if (keyPointsEl) {
        c.keyPoints = keyPointsEl.value.split('\n').map(s => s.trim()).filter(Boolean);
    }

    if (window.directConceptQuill && window.directConceptQuill.root) {
        const qHtml = window.directConceptQuill.root.innerHTML;
        c.body = qHtml === "<p><br></p>" ? "" : qHtml;
    }
};

/**
 * Save in-page changes and immediately revert to clean view mode
 */
/**
 * Save in-page changes immediately (Optimistic UI with Cloud Failsafe)
 */
window.saveDirectConceptWorkspace = async function() {
    const targetIdx = window.activeConceptDetailIndex;
    if (targetIdx === null) return;

    // 1. Sync inputs into memory and switch off edit mode
    window.syncDirectInputsToMemory();
    window.isConceptDetailEditMode = false;
    
    // 2. Instant Optimistic Render (Zero UI latency)
    window.renderConceptDetailView();
    if (typeof showToast === 'function') {
        showToast("Changes saved locally.", "success");
    }

    // 3. Background Cloud Commit with User Failsafe
    try {
        let success = false;
        if (typeof window.saveSingleConcept === 'function') {
            success = await window.saveSingleConcept(targetIdx);
        } else if (typeof saveDatabase === 'function') {
            await saveDatabase();
            success = true;
        }

        if (!success) {
            const warningMsg = "Notice: Saved to device cache, but cloud sync failed. Check your internet connection.";
            if (typeof showToast === 'function') {
                showToast(warningMsg, "error");
            } else {
                alert(warningMsg);
            }
        }
    } catch (err) {
        console.error("Cloud commit failsafe triggered:", err);
        const warningMsg = "Notice: Cloud sync error. Changes are saved locally on this device.";
        if (typeof showToast === 'function') {
            showToast(warningMsg, "error");
        } else {
            alert(warningMsg);
        }
    }
};

/**
 * Helper to split text by line or period into clean list items
 */
function parseBulletList(rawText) {
    if (!rawText) return [];
    if (Array.isArray(rawText)) return rawText.filter(Boolean);
    return rawText.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/^[•\-\*]\s*/, ''));
}

/**
 * Global Helper to Extract Discrete Flashcard Sub-Elements
 */
window.extractConceptFlashcardCards = function(concept) {
    if (!concept) return [];
    const cards = [];
    const cTitle = concept.title || "Untitled Concept";
    const cCat = concept.category || "General";

    const stripTags = (s) => (s || "").replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    // 1. Overview Section
    const fullBody = concept.body || "";
    if (fullBody.trim()) {
        const headerMatches = [...fullBody.matchAll(/<(h[1-6]|strong|b|u)[^>]*>(.*?)<\/\1>/gi)];
        
        if (headerMatches.length > 0) {
            const splitSections = fullBody.split(/(?=<(?:h[1-6]|strong|b|u)[^>]*>)/i).filter(s => s.trim().length > 0);
            
            splitSections.forEach((sec, sIdx) => {
                const titleMatch = sec.match(/<(?:h[1-6]|strong|b|u)[^>]*>(.*?)<\/(?:h[1-6]|strong|b|u)>/i);
                const headerText = titleMatch ? stripTags(titleMatch[1]) : "";
                const cleanCardBody = titleMatch ? sec.replace(titleMatch[0], '').trim() : sec;
                
                const cardLabel = headerText && headerText.length < 50 ? headerText : (sIdx === 0 ? "Definition" : `Overview Element ${sIdx + 1}`);
                
                if (stripTags(cleanCardBody).length > 10 || stripTags(sec).length > 10) {
                    cards.push({
                        id: `overview_${cardLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${sIdx}`,
                        section: 'Overview',
                        title: `${cTitle} - ${cardLabel}`,
                        category: cCat,
                        body: cleanCardBody.trim() ? cleanCardBody : sec
                    });
                }
            });
        } else {
            cards.push({
                id: 'overview_definition',
                section: 'Overview',
                title: `${cTitle} - Definition`,
                category: cCat,
                body: fullBody
            });
        }
    }

    // 2. Key Points
    const keyPoints = Array.isArray(concept.keyPoints) ? concept.keyPoints : [];
    keyPoints.forEach((kp, kpIdx) => {
        if (kp && kp.trim()) {
            cards.push({
                id: `keypoint_${kpIdx}`,
                section: 'Key Points',
                title: `${cTitle} - Key Point ${kpIdx + 1}`,
                category: cCat,
                body: `<p class="text-base leading-relaxed font-medium">${kp}</p>`
            });
        }
    });

    // 3. When To Use / Applications
    if (concept.whenToUse && concept.whenToUse.trim()) {
        cards.push({
            id: 'when_to_use',
            section: 'When To Use',
            title: `${cTitle} - When To Use`,
            category: cCat,
            body: `<p class="text-base leading-relaxed">${concept.whenToUse}</p>`
        });
    } else if (concept.applications && concept.applications.trim()) {
        cards.push({
            id: 'applications',
            section: 'When To Use',
            title: `${cTitle} - Commercial Context & When To Use`,
            category: cCat,
            body: `<p class="text-base leading-relaxed">${concept.applications}</p>`
        });
    }

    // 4. Advantages
    const advs = Array.isArray(concept.advantages) ? concept.advantages : (concept.advantages ? [concept.advantages] : []);
    advs.forEach((adv, aIdx) => {
        if (adv && adv.trim()) {
            cards.push({
                id: `advantage_${aIdx}`,
                section: 'Advantages',
                title: `${cTitle} - Advantage ${advs.length > 1 ? aIdx + 1 : ''}`.trim(),
                category: cCat,
                body: `<div class="prose prose-sm leading-relaxed">${adv}</div>`
            });
        }
    });

    // 5. Disadvantages
    const disadvs = Array.isArray(concept.disadvantages) ? concept.disadvantages : (concept.disadvantages ? [concept.disadvantages] : []);
    disadvs.forEach((dis, dIdx) => {
        if (dis && dis.trim()) {
            cards.push({
                id: `disadvantage_${dIdx}`,
                section: 'Disadvantages',
                title: `${cTitle} - Disadvantage ${disadvs.length > 1 ? dIdx + 1 : ''}`.trim(),
                category: cCat,
                body: `<div class="prose prose-sm leading-relaxed">${dis}</div>`
            });
        }
    });

    // 6. Typical Provisions
    const provs = Array.isArray(concept.typicalProvisions) ? concept.typicalProvisions : (concept.typicalProvisions ? [concept.typicalProvisions] : []);
    provs.forEach((prov, pIdx) => {
        if (prov && prov.trim()) {
            cards.push({
                id: `provision_${pIdx}`,
                section: 'Typical Provisions',
                title: `${cTitle} - Typical Provision ${provs.length > 1 ? pIdx + 1 : ''}`.trim(),
                category: cCat,
                body: `<div class="prose prose-sm leading-relaxed">${prov}</div>`
            });
        }
    });

    // 7. Common Use Cases
    const ucases = Array.isArray(concept.commonUseCases) ? concept.commonUseCases : (concept.commonUseCases ? [concept.commonUseCases] : []);
    ucases.forEach((uc, uIdx) => {
        if (uc && uc.trim()) {
            cards.push({
                id: `use_case_${uIdx}`,
                section: 'Common Use Cases',
                title: `${cTitle} - Common Use Case ${ucases.length > 1 ? uIdx + 1 : ''}`.trim(),
                category: cCat,
                body: `<div class="prose prose-sm leading-relaxed">${uc}</div>`
            });
        }
    });

    return cards;
};

/**
 * Initialize Interactive Vis.js Flowchart Inside the Concept Structure Tab
 */
window.initConceptPlaybookVis = function(playbookName) {
    const container = document.getElementById("conceptPlaybookVisContainer");
    if (!container || !playbookName || !db.playbooks || !db.playbooks[playbookName]) return;

    if (window.conceptPlaybookNetwork) {
        try { window.conceptPlaybookNetwork.destroy(); } catch(e) {}
        window.conceptPlaybookNetwork = null;
    }

    const pb = db.playbooks[playbookName];
    const nodes = (pb.nodes || []).map(n => ({
        ...n,
        shape: 'box',
        margin: { top: 10, bottom: 10, left: 14, right: 14 },
        widthConstraint: {
            minimum: 120,
            maximum: 170
        },
        color: n.color || { 
            background: '#2563eb', 
            border: '#1d4ed8',
            highlight: { background: '#1d4ed8', border: '#1e40af' }
        },
        font: { 
            color: '#ffffff', 
            face: 'Inter, sans-serif', 
            size: 13, 
            bold: true,
            multi: true
        },
        shadow: { enabled: true, color: 'rgba(0,0,0,0.12)', size: 4, x: 0, y: 2 }
    }));

    const edges = (pb.edges || []).map(e => ({
        ...e,
        arrows: 'to',
        color: { color: '#94a3b8', highlight: '#2563eb' },
        width: 2,
        smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
    }));

    const data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const options = {
        layout: {
            hierarchical: {
                direction: 'UD',
                sortMethod: 'directed',
                levelSeparation: 110,
                nodeSpacing: 260,
                treeSpacing: 280,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
            }
        },
        interaction: {
            hover: true,
            zoomView: true,
            dragView: true,
            dragNodes: false,
            multiselect: false
        },
        physics: false
    };

    try {
        window.conceptPlaybookNetwork = new vis.Network(container, data, options);
        
        window.conceptPlaybookNetwork.once("afterDrawing", () => {
            window.conceptPlaybookNetwork.fit({
                animation: { duration: 600, easingFunction: 'easeInOutQuad' }
            });
        });
    } catch (err) {
        console.error("Vis.js flowchart mount error:", err);
    }
};

/**
 * Core View Renderer
 */
window.renderConceptDetailView = function() {
    if (window.activeConceptDetailIndex === null) return;
    
    const detailWrapper = getOrCreateConceptDetailWrapper();
    if (!detailWrapper) return;

    const mainTableScroll = document.querySelector("#appConcepts > div.flex-1.min-w-0");
    if (mainTableScroll) mainTableScroll.classList.add("hidden");
    detailWrapper.classList.remove("hidden");

    const idx = window.activeConceptDetailIndex;
    const c = db.concepts && db.concepts[idx];
    if (!c) return;

    // Ensure documents is a solid reference array
    if (!Array.isArray(c.documents)) c.documents = [];

    // --- 1. Calculate Internal Concept Component Mastery & SRS Schedule ---
    c.subSrs = c.subSrs || (c.srs && c.srs.subSrs) || {};
    const subCards = window.extractConceptFlashcardCards(c);
    
    let totalSubScore = 0;
    let minNextReview = Infinity;
    let maxLastReviewed = 0;
    let totalSubReviews = 0;
    let maxStreak = 0;

    if (subCards.length > 0) {
        subCards.forEach(card => {
            const cardSrs = c.subSrs[card.id] || { interval: 0, ease: 2.5, nextReview: 0, lastReviewed: null, mastered: false, totalReviews: 0 };
            const cardInterval = cardSrs.interval || 0;
            const isCardMastered = cardSrs.mastered === true || cardInterval >= 21;
            
            if (isCardMastered) {
                totalSubScore += 100;
            } else {
                totalSubScore += Math.min(100, Math.round((cardInterval / 21) * 100));
            }

            if (cardSrs.nextReview && cardSrs.nextReview < minNextReview) minNextReview = cardSrs.nextReview;
            if (cardSrs.lastReviewed && cardSrs.lastReviewed > maxLastReviewed) maxLastReviewed = cardSrs.lastReviewed;
            if (cardSrs.totalReviews) totalSubReviews += cardSrs.totalReviews;
            if (cardInterval > maxStreak) maxStreak = cardInterval;
        });
    }

    const defaultSrs = c.srs || { interval: 0, nextReview: 0, ease: 2.5, lastReviewed: null, mastered: false, totalReviews: 0 };
    const masteryPct = subCards.length > 0 
        ? Math.round(totalSubScore / subCards.length) 
        : (defaultSrs.mastered ? 100 : Math.min(100, Math.round(((defaultSrs.interval || 0) / 21) * 100)));

    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPct / 100) * circumference;

    const lastReviewedTime = maxLastReviewed > 0 ? maxLastReviewed : defaultSrs.lastReviewed;
    const lastReviewedFormatted = lastReviewedTime 
        ? new Date(lastReviewedTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : "Not reviewed";

    const nextReviewTime = minNextReview !== Infinity ? minNextReview : defaultSrs.nextReview;
    const nextReviewFormatted = nextReviewTime
        ? new Date(nextReviewTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : "Pending";

    const streakVal = maxStreak > 0 ? maxStreak : (defaultSrs.interval || 1);
    const totalReviewsCount = totalSubReviews > 0 ? totalSubReviews : (defaultSrs.totalReviews || 1);
    const conceptCode = `CON-${String(idx + 1).padStart(6, '0')}`;

    // --- 2. Tags ---
    // --- 2. Tags with Interactive Remove (x) Button ---
    const tags = (c.subTag || "").split(',').map(t => t.trim()).filter(Boolean);
    const tagBadgesHtml = tags.map((tag, tIdx) => `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <span>${tag}</span>
            <button type="button" onclick="event.stopPropagation(); window.removeConceptTag(${idx}, ${tIdx});" class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition font-bold leading-none p-0.5 cursor-pointer" title="Remove tag">&times;</button>
        </span>
    `).join('');

    // --- 3. Body & Clean Content ---
    const cleanBodyHtml = c.body || "<p class='text-slate-400 italic'>No definition text logged yet.</p>";
    
    let keyPointsList = Array.isArray(c.keyPoints) && c.keyPoints.length > 0 
        ? c.keyPoints 
        : parseBulletList(c.keyPointsText || "");
    
    if (keyPointsList.length === 0) {
        const textPlain = cleanBodyHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        const sentenceParts = textPlain.split('. ').filter(s => s.trim().length > 20);
        keyPointsList = sentenceParts.slice(0, 4).map(s => s.replace(/\.$/, ''));
    }

    const keyPointsHtml = keyPointsList.length > 0 ? keyPointsList.map(kp => `
        <li class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5"></i>
            <span class="leading-relaxed">${kp}</span>
        </li>
    `).join('') : `<li class="text-xs text-slate-400 italic">No key points logged.</li>`;

    const advantagesList = parseBulletList(c.advantages);
    const advantagesHtml = advantagesList.length > 0 ? advantagesList.map(item => `
        <li class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5"></i>
            <span class="leading-relaxed">${item}</span>
        </li>
    `).join('') : `<li class="text-xs text-slate-400 italic">No advantages specified.</li>`;

    const disadvantagesList = parseBulletList(c.disadvantages);
    const disadvantagesHtml = disadvantagesList.length > 0 ? disadvantagesList.map(item => `
        <li class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"></i>
            <span class="leading-relaxed">${item}</span>
        </li>
    `).join('') : `<li class="text-xs text-slate-400 italic">No disadvantages specified.</li>`;

    const provisionsList = parseBulletList(c.typicalProvisions);
    const provisionsHtml = provisionsList.length > 0 ? provisionsList.map(item => `
        <li class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"></i>
            <span class="leading-relaxed">${item}</span>
        </li>
    `).join('') : `<li class="text-xs text-slate-400 italic">No typical provisions logged.</li>`;

    const useCasesList = parseBulletList(c.commonUseCases);
    const useCasesHtml = useCasesList.length > 0 ? useCasesList.map(item => `
        <li class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span class="text-slate-400 shrink-0 font-bold">&bull;</span>
            <span class="leading-relaxed">${item}</span>
        </li>
    `).join('') : `<li class="text-xs text-slate-400 italic">No common use cases logged.</li>`;

    const targetTitle = (c.title || "").trim().toLowerCase();
    const linkedFactors = (db.factors || [])
        .map((f, originalIndex) => ({ factor: f, originalIndex }))
        .filter(item => {
            if (!item.factor || !item.factor.linkedConcept) return false;
            const lk = String(item.factor.linkedConcept).trim().toLowerCase();
            return lk === targetTitle || lk.includes(targetTitle) || targetTitle.includes(lk);
        });

    const relatedParsed = (c.relatedConcepts || "").split(',').map(s => s.trim()).filter(Boolean);
    const relatedObjects = (db.concepts || [])
        .map((item, originalIndex) => ({ item, originalIndex }))
        .filter(obj => obj.originalIndex !== idx && (obj.item.category === c.category || relatedParsed.includes(obj.item.title)))
        .slice(0, 6);

    const docs = c.documents;
    const maxDocs = 5;
    const isDocLimitReached = docs.length >= maxDocs;

    // --- 4. Sub-Tab Definitions ---
    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'structure', label: `Structure & Flow ${c.linkedPlaybook || c.diagram ? '✓' : ''}` },
        { key: 'documents', label: `Documents (${docs.length})` },
        { key: 'related', label: `Related Concepts (${relatedObjects.length})` },
        { key: 'intel', label: `Intelligence (${linkedFactors.length})` },
        { key: 'srs', label: 'SRS & Notes' }
    ];

    const tabNavHtml = tabs.map(t => {
        const isActive = window.activeConceptDetailTab === t.key;
        return `
            <button type="button" onclick="window.switchConceptDetailTab('${t.key}')" 
                class="py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap m-0 rounded-none cursor-pointer flex-shrink-0 ${
                    isActive 
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-800' 
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                }">
                ${t.label}
            </button>
        `;
    }).join('');

    // --- 5. Main Content Switching Logic ---
    let tabContentHtml = '';

    if (window.activeConceptDetailTab === 'overview') {
        if (window.isConceptDetailEditMode) {
            const categories = (db.conceptCategories && db.conceptCategories.length > 0)
                ? db.conceptCategories
                : ["Corporate / M&A", "Capital Markets", "Intellectual Property", "Commercial Contracts", "Dispute Resolution", "General"];
            
            const categoryOptionsHtml = categories.map(cat => 
                `<option value="${cat}" ${cat === c.category ? 'selected' : ''}>${cat}</option>`
            ).join('');

            tabContentHtml = `
                <div class="space-y-4">
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
                                <select id="inpageConceptCategory" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none">
                                    ${categoryOptionsHtml}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sub-tags / Practice Areas (Comma separated)</label>
                                <input type="text" id="inpageConceptSubTags" value="${(c.subTag || '').replace(/"/g, '&quot;')}" placeholder="e.g. M&A, SPA, Pricing" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">One-Line Summary / Subtitle</label>
                            <input type="text" id="inpageConceptSummary" value="${(c.summary || '').replace(/"/g, '&quot;')}" placeholder="Brief overview definition displayed directly beneath title..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed Definition & Legal Analysis</label>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden bg-white dark:bg-slate-900 min-h-[160px]">
                            <div id="inpageQuillToolbar" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-1">
                                <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button></span>
                                <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
                            </div>
                            <div id="inpageConceptBodyQuill" class="text-xs md:text-sm dark:text-white p-3 min-h-[130px]"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">Key Points (One per line)</label>
                            <textarea id="inpageConceptKeyPoints" rows="4" placeholder="Key point 1&#10;Key point 2&#10;Key point 3" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${keyPointsList.join('\n')}</textarea>
                        </div>
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">When to Use</label>
                            <textarea id="inpageConceptWhenToUse" rows="4" placeholder="Practical scenarios and commercial triggers..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${c.whenToUse || ''}</textarea>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">Advantages (One per line)</label>
                            <textarea id="inpageConceptAdvantages" rows="4" placeholder="Provides price certainty at signing&#10;Incentivises normal business operations" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${advantagesList.join('\n')}</textarea>
                        </div>
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">Disadvantages (One per line)</label>
                            <textarea id="inpageConceptDisadvantages" rows="4" placeholder="Buyer bears value deterioration risk&#10;Requires exhaustive leakage auditing" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${disadvantagesList.join('\n')}</textarea>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-1">Typical Provisions (One per line)</label>
                            <textarea id="inpageConceptTypicalProvisions" rows="4" placeholder="Locked box working capital definition&#10;Leakage protections and indemnities&#10;Conduct of business covenants" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${provisionsList.join('\n')}</textarea>
                        </div>
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-1">Common Use Cases (One per line)</label>
                            <textarea id="inpageConceptCommonUseCases" rows="4" placeholder="Auction processes&#10;High seller leverage scenarios&#10;Cross-border transactions" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">${useCasesList.join('\n')}</textarea>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none p-3 shadow-xs">
                        <label class="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">Related Concepts (Comma separated)</label>
                        <input type="text" id="inpageConceptRelated" value="${(c.relatedConcepts || '').replace(/"/g, '&quot;')}" placeholder="e.g. Completion Accounts, Purchase Price Adjustment, Leakage" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 text-xs outline-none">
                    </div>
                </div>
            `;
        } else {
            tabContentHtml = `
                <div class="space-y-3">
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Overview</h4>
                        <div class="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 leading-relaxed dict-highlight-target dark:prose-invert">
                            ${cleanBodyHtml}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Key points</h4>
                            <ul class="space-y-1.5">
                                ${keyPointsHtml}
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <i data-lucide="help-circle" class="w-3.5 h-3.5"></i> When to use
                            </h4>
                            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${c.whenToUse || 'Frequently preferred by private equity sellers running competitive auction processes to secure clean, undisputed transaction values.'}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Advantages
                            </h4>
                            <ul class="space-y-1.5">
                                ${advantagesHtml}
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Disadvantages
                            </h4>
                            <ul class="space-y-1.5">
                                ${disadvantagesHtml}
                            </ul>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Typical provisions</h4>
                            <ul class="space-y-1.5">
                                ${provisionsHtml}
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Common use cases</h4>
                            <ul class="space-y-1.5">
                                ${useCasesHtml}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (window.activeConceptDetailTab === 'structure') {
        const hasLinkedPlaybook = !!(c.linkedPlaybook && db.playbooks && db.playbooks[c.linkedPlaybook]);
        const hasDiagram = !!c.diagram;

        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Procedural Flowchart & Visual Diagram</h3>
                        <p class="text-[11px] text-slate-400 mt-0.5">Attach a deal flowchart from playbooks or manage custom visual diagrams.</p>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" onclick="window.importPlaybookToCurrentConcept()" class="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition shadow-xs flex items-center gap-1">
                            <i data-lucide="git-merge" class="w-3.5 h-3.5 text-indigo-500"></i> ${hasLinkedPlaybook ? 'Change Playbook' : 'Import Playbook'}
                        </button>
                        ${hasLinkedPlaybook ? `
                            <button type="button" onclick="switchState('PLAYBOOKS'); window.currentPlaybook='${c.linkedPlaybook}'; window.renderPlaybookList();" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Open in Deals
                            </button>
                            <button type="button" onclick="window.detachPlaybookFromCurrentConcept()" class="px-2.5 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition">
                                Detach
                            </button>
                        ` : ''}
                        <button type="button" onclick="openDrawingPad(${idx})" class="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-none transition shadow-xs flex items-center gap-1">
                            <i data-lucide="pen-tool" class="w-3.5 h-3.5"></i> ${hasDiagram ? 'Edit Diagram' : 'Draw Diagram'}
                        </button>
                        ${hasDiagram ? `
                            <button type="button" onclick="window.removeDiagramFromCurrentConcept()" class="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 px-2.5 py-1.5 rounded-none transition flex items-center gap-1" title="Remove current diagram">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove Diagram
                            </button>
                        ` : ''}
                    </div>
                </div>

                ${hasLinkedPlaybook ? `
                    <div class="relative w-full h-[580px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div id="conceptPlaybookVisContainer" class="w-full h-full cursor-grab active:cursor-grabbing"></div>
                        
                        <div class="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1 border border-slate-300 dark:border-slate-700 shadow-sm z-10">
                            <button type="button" onclick="if(window.conceptPlaybookNetwork) window.conceptPlaybookNetwork.moveTo({scale: window.conceptPlaybookNetwork.getScale() * 1.25})" class="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded text-xs font-bold" title="Zoom In">+</button>
                            <button type="button" onclick="if(window.conceptPlaybookNetwork) window.conceptPlaybookNetwork.moveTo({scale: window.conceptPlaybookNetwork.getScale() * 0.8})" class="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded text-xs font-bold" title="Zoom Out">-</button>
                            <button type="button" onclick="if(window.conceptPlaybookNetwork) window.conceptPlaybookNetwork.fit({animation: {duration: 400}})" class="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded text-[10px] font-bold" title="Center">Reset</button>
                        </div>
                    </div>
                ` : (hasDiagram ? `
                    <div class="rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900">
                        <img src="${c.diagram}" class="max-h-[460px] mx-auto object-contain">
                    </div>
                ` : `
                    <div class="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-none space-y-3">
                        <i data-lucide="git-branch" class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto"></i>
                        <div>
                            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">No Transaction Flowchart Attached</h4>
                            <p class="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">Import an interactive playbook from Deals or sketch a custom diagram.</p>
                        </div>
                        <div class="flex justify-center items-center gap-2 pt-1">
                            <button type="button" onclick="window.importPlaybookToCurrentConcept()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5">
                                <i data-lucide="git-merge" class="w-3.5 h-3.5"></i> Import from Deals
                            </button>
                            <button type="button" onclick="openDrawingPad(${idx})" class="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition">
                                Draw Canvas
                            </button>
                        </div>
                    </div>
                `)}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'documents') {
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Precedent Documents (${docs.length}/${maxDocs})</h3>
                        <p class="text-[11px] text-slate-400 mt-0.5">Attach links to Google Drive, OneDrive, or legal precedent templates.</p>
                    </div>
                    ${!isDocLimitReached ? `
                        <button type="button" onclick="window.addConceptDocumentRow(${idx})" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Precedent Link
                        </button>
                    ` : `
                        <button type="button" disabled class="text-xs text-slate-400 font-bold opacity-50 cursor-not-allowed flex items-center gap-1" title="Limit of 5 documents reached">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i> Add Precedent Link (Limit 5/5)
                        </button>
                    `}
                </div>
                ${docs.length > 0 ? `
                    <div class="space-y-2">
                        ${docs.map((d, dIdx) => {
                            const isLink = Boolean(d.url && d.url.trim());
                            const safeUrl = isLink ? d.url.trim() : '#';
                            const docType = (d.type || 'LINK').toUpperCase();
                            
                            return `
                                <div class="flex items-center justify-between p-3 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition group">
                                    <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                        <div class="w-7 h-7 rounded-none bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900">
                                            <i data-lucide="${docType.includes('DOC') ? 'file-text' : (docType.includes('XLS') ? 'file-spreadsheet' : 'external-link')}" class="w-4 h-4"></i>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2">
                                                <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${d.name}</span>
                                                <span class="text-[9px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shrink-0">${docType}</span>
                                            </div>
                                            ${isLink ? `
                                                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate block mt-0.5" title="${safeUrl}">
                                                    ${safeUrl}
                                                </a>
                                            ` : `
                                                <span class="text-[10px] text-slate-400 italic">No URL provided</span>
                                            `}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 shrink-0">
                                        ${isLink ? `
                                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1 shadow-xs" title="Open Link">
                                                Open <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                            </a>
                                        ` : ''}
                                        <button type="button" onclick="event.stopPropagation(); window.removeConceptDocumentRow(${idx}, ${dIdx});" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition cursor-pointer" title="Remove Link">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `<p class="text-xs text-slate-400 italic py-6 text-center">No precedent documents attached yet. Click "+ Add Precedent Link" above.</p>`}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'related') {
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">Related Concepts</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${relatedObjects.map(rel => `
                        <div class="p-2.5 rounded-none border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition cursor-pointer" onclick="window.openConceptDetailWorkspace(${rel.originalIndex})">
                            <h5 class="text-xs font-bold text-slate-900 dark:text-white">${rel.item.title}</h5>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'intel') {
        let cardsHtml = '';
        if (linkedFactors.length > 0) {
            cardsHtml = linkedFactors.map(({ factor: f, originalIndex: origIdx }) => {
                const itemTitle = f.title || f.headline || "Untitled Insight";
                const summary = (f.summary && f.summary.trim()) 
                    ? f.summary 
                    : (f.description ? f.description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 180) + '...' : 'No summary logged.');
                return `
                    <div class="p-3.5 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer group" onclick="window.routeToIntelFactor(${origIdx})" title="Open article in Intelligence">
                        <div class="flex justify-between items-start gap-2 mb-1">
                            <h5 class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">${itemTitle}</h5>
                            <span class="text-[10px] font-mono text-slate-400 shrink-0">${f.date || 'Recent'}</span>
                        </div>
                        <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">${summary}</p>
                    </div>
                `;
            }).join('');
        }

        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">Linked Market Intelligence</h3>
                ${linkedFactors.length > 0 ? `
                    <div class="space-y-2">
                        ${cardsHtml}
                    </div>
                ` : `<p class="text-xs text-slate-400 italic py-3 text-center">No live market intelligence records linked.</p>`}
            </div>
        `;
    } else if (window.activeConceptDetailTab === 'srs') {
        tabContentHtml = `
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-3">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">SRS & Memory Metrics</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div><span class="text-slate-400 block mb-0.5">Mastery Status</span><strong class="text-emerald-600">${masteryPct}%</strong></div>
                    <div><span class="text-slate-400 block mb-0.5">Interval</span><strong>${streakVal} days</strong></div>
                    <div><span class="text-slate-400 block mb-0.5">Ease</span><strong>${(defaultSrs.ease || 2.5).toFixed(2)}</strong></div>
                    <div><span class="text-slate-400 block mb-0.5">Next Review</span><strong class="text-amber-600">${nextReviewFormatted}</strong></div>
                </div>
            </div>
        `;
    }

    const actionButtonsHtml = window.isConceptDetailEditMode ? `
        <div class="flex items-center gap-2">
            <button type="button" onclick="window.toggleConceptEditMode(false)" class="px-3 py-1.5 rounded-none text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Cancel
            </button>
            <button type="button" onclick="window.saveDirectConceptWorkspace()" class="px-3.5 py-1.5 rounded-none text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center gap-1.5">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Save Changes
            </button>
        </div>
    ` : `
        <div class="flex items-center gap-2">
            <button type="button" onclick="window.toggleConceptEditMode(true)" class="px-3 py-1.5 rounded-none text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs flex items-center gap-1.5">
                Edit Concept
            </button>
            <button type="button" onclick="window.deleteConcept(${idx}); window.closeConceptDetailWorkspace();" class="p-1.5 rounded-none text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `;

    detailWrapper.innerHTML = `
        <div class="max-w-[1700px] mx-auto w-full space-y-2.5">
            
            <div class="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <div class="flex items-center gap-2 text-[11px] text-slate-400 font-medium overflow-hidden">
                    <button type="button" onclick="window.closeConceptDetailWorkspace()" class="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer rounded-none">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back to Library
                    </button>
                    <span class="text-slate-300 dark:text-slate-600">|</span>
                    <button type="button" onclick="window.closeConceptDetailWorkspace()" class="hover:text-slate-700 dark:hover:text-slate-200 transition">Concepts</button>
                    <span class="text-slate-300 dark:text-slate-600">&rsaquo;</span>
                    <span class="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" onclick="window.closeConceptDetailWorkspace()">${c.category || 'General'}</span>
                    <span class="text-slate-300 dark:text-slate-600">&rsaquo;</span>
                    <span class="text-slate-600 dark:text-slate-300 font-semibold truncate">${c.title || 'Untitled'}</span>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="space-y-1 flex-1 min-w-0">
                    ${window.isConceptDetailEditMode ? `
                        <input type="text" id="inpageConceptTitle" value="${(c.title || '').replace(/"/g, '&quot;')}" class="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none px-2.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner">
                    ` : `
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight">${c.title || 'Untitled Concept'}</h1>
                        </div>
                    `}
                    
                    <p class="text-[11px] text-slate-500 leading-relaxed max-w-4xl">
                        ${c.summary || (c.body ? c.body.replace(/<[^>]*>?/gm, ' ').substring(0, 140) + '...' : 'Tracked commercial legal concept.')}
                    </p>

                    <div class="flex items-center gap-1.5 flex-wrap pt-0.5 pb-2 mb-2">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
                            ${c.category || 'General'}
                        </span>
                        ${tagBadgesHtml}
                        <button type="button" onclick="window.promptAddConceptTag(${idx})" class="text-xs text-slate-400 hover:text-slate-600 font-medium ml-1 flex items-center gap-0.5">
                            + Add tag
                        </button>
                    </div>
                </div>

                <div class="shrink-0 self-end sm:self-center">
                    ${actionButtonsHtml}
                </div>
            </div>

            <!-- Zero-Gap Continuous Sub-Tab Strip -->
            <div id="conceptDetailWorkspaceTabsBar" class="overflow-x-auto scrollbar-hide pt-2 mt-3 border-b-2 border-slate-200 dark:border-slate-800">
                ${tabNavHtml}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start pt-1">
                
                <div class="lg:col-span-8 space-y-3">
                    ${tabContentHtml}

                    <div class="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/80 dark:border-slate-800 pt-3">
                        <span>Last updated on ${lastReviewedFormatted}</span>
                        <span class="font-mono">Concept ID: ${conceptCode}</span>
                    </div>
                </div>

                <div class="lg:col-span-4 space-y-3">
                    
                    <!-- Mastery & Review Card -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs flex flex-col">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Mastery & Review</h3>
                            <button type="button" onclick="openFlashcardDashboard('concepts')" class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                Review history &rarr;
                            </button>
                        </div>

                        <div class="flex items-center gap-4 mb-3">
                            <div class="relative w-24 h-24 shrink-0 flex items-center justify-center">
                                <svg class="w-full h-full transform -rotate-90 overflow-visible drop-shadow-xs" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="${radius}" fill="transparent" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="7"></circle>
                                    <circle cx="60" cy="60" r="${radius}" fill="transparent" stroke="#2563eb" stroke-width="7" 
                                            stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                                            stroke-linecap="round" class="transition-all duration-700 ease-out"></circle>
                                </svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                                    <span class="text-lg font-serif font-black text-slate-900 dark:text-white leading-none">${masteryPct}%</span>
                                    <span class="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1.5 leading-none">Mastered</span>
                                </div>
                            </div>

                            <div class="flex-1 space-y-1 text-xs">
                                <div class="flex justify-between text-slate-500">
                                    <span>Last reviewed</span>
                                    <span class="font-mono text-slate-700 dark:text-slate-300 font-semibold">${lastReviewedFormatted}</span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Next review</span>
                                    <span class="font-mono text-amber-600 font-semibold">${nextReviewFormatted}</span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Review streak</span>
                                    <span class="font-semibold text-orange-500 flex items-center gap-0.5">
                                        <i data-lucide="flame" class="w-3.5 h-3.5 fill-orange-500"></i> ${streakVal} days
                                    </span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Total reviews</span>
                                    <span class="font-mono text-slate-700 dark:text-slate-300 font-semibold">${totalReviewsCount}</span>
                                </div>
                            </div>
                        </div>

                        <button type="button" onclick="window.startSingleConceptReview(${idx})" class="w-full py-2 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 dark:bg-slate-800 dark:text-blue-300 border border-blue-100 dark:border-slate-700 rounded-none text-xs font-bold transition">
                            Start Review
                        </button>
                    </div>

                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <div class="flex justify-between items-center mb-0.5">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Related concepts (${relatedObjects.length})</h3>
                            <button type="button" onclick="window.closeConceptDetailWorkspace()" class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">View all &rarr;</button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${relatedObjects.length > 0 ? relatedObjects.map((rel, i) => `
                                <div class="flex justify-between items-center py-1.5 cursor-pointer group" onclick="window.openConceptDetailWorkspace(${rel.originalIndex})">
                                    <span class="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-600 transition truncate pr-2">
                                        ${rel.item.title}
                                    </span>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-none ${i < 3 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'} shrink-0">
                                        ${i < 3 ? 'High' : 'Medium'}
                                    </span>
                                </div>
                            `).join('') : `
                                <p class="text-xs text-slate-400 italic py-2">No related concepts linked.</p>
                            `}
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <div class="flex justify-between items-center mb-0.5">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Recent intelligence (${linkedFactors.length})</h3>
                            <button type="button" onclick="switchState('INTELLIGENCE')" class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">View all &rarr;</button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${linkedFactors.length > 0 ? linkedFactors.slice(0, 4).map(({ factor: f, originalIndex: origIdx }) => {
                                const itemTitle = f.title || f.headline || "Untitled Insight";
                                const summary = (f.summary && f.summary.trim()) 
                                    ? f.summary 
                                    : (f.description ? f.description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 110) + '...' : 'No summary logged.');
                                return `
                                    <div class="py-2 cursor-pointer group transition" onclick="window.routeToIntelFactor(${origIdx})" title="Open article in Intelligence">
                                        <div class="flex justify-between items-start gap-2">
                                            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-1 flex-1">
                                                ${itemTitle}
                                            </h4>
                                            <span class="text-[10px] font-mono text-slate-400 shrink-0">${f.date || 'Recent'}</span>
                                        </div>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                            ${summary}
                                        </p>
                                    </div>
                                `;
                            }).join('') : `
                                <p class="text-xs text-slate-400 italic py-2">No market intelligence linked to this concept.</p>
                            `}
                        </div>
                    </div>

                    <!-- Precedent Documents Sidebar Widget -->
                    <div class="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-none p-4 shadow-xs space-y-2">
                        <div class="flex justify-between items-center mb-0.5">
                            <h3 class="text-xs font-bold text-slate-800 dark:text-white">Documents (${docs.length}/${maxDocs})</h3>
                            ${!isDocLimitReached ? `
                                <button type="button" onclick="window.addConceptDocumentRow(${idx})" class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">+ Add</button>
                            ` : `
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Locked</span>
                            `}
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${docs.length > 0 ? docs.map(d => {
                                const hasUrl = Boolean(d.url && d.url.trim());
                                const targetUrl = hasUrl ? d.url.trim() : '#';
                                return `
                                    <div class="flex items-center justify-between py-1.5 text-xs group">
                                        <div class="flex items-center gap-2 truncate flex-1 mr-2">
                                            <i data-lucide="external-link" class="w-3.5 h-3.5 text-blue-500 shrink-0"></i>
                                            ${hasUrl ? `
                                                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="text-slate-700 dark:text-slate-300 font-medium truncate hover:text-blue-600 dark:hover:text-blue-400 transition" title="${d.name}">
                                                    ${d.name}
                                                </a>
                                            ` : `
                                                <span class="text-slate-700 dark:text-slate-300 font-medium truncate">${d.name}</span>
                                            `}
                                        </div>
                                        <span class="text-[9px] font-mono text-slate-400 shrink-0 uppercase">${d.type || 'LINK'}</span>
                                    </div>
                                `;
                            }).join('') : `
                                <p class="text-xs text-slate-400 italic py-2">No precedent links added.</p>
                            `}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    `;

    // Instantiate interactive Vis.js network if on the structure tab with a linked playbook
    if (window.activeConceptDetailTab === 'structure' && c.linkedPlaybook) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const container = document.getElementById("conceptPlaybookVisContainer");
                if (container && typeof window.initConceptPlaybookVis === 'function') {
                    window.initConceptPlaybookVis(c.linkedPlaybook);
                }
            }, 100);
        });
    }

    // Instantiate Quill editor if in edit mode
    if (window.isConceptDetailEditMode && window.activeConceptDetailTab === 'overview' && typeof window.getOrInitQuill === 'function') {
        window.directConceptQuill = window.getOrInitQuill('#inpageConceptBodyQuill', {
            modules: { toolbar: '#inpageQuillToolbar' }
        });
        if (window.directConceptQuill && window.directConceptQuill.root) {
            window.directConceptQuill.root.innerHTML = c.body || "";
        }
    }

    if (window.lucide) window.lucide.createIcons();
    if (typeof applyDictionaryHighlighting === 'function') {
        applyDictionaryHighlighting("conceptDetailWorkspaceWrapper");
    }
};

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
 * Add Precedent Link with Strict Cap of 5 (Appends without overwriting)
 */
window.addConceptDocumentRow = function(conceptIdx) {
    const c = db.concepts[conceptIdx];
    if (!c) return;
    if (!Array.isArray(c.documents)) c.documents = [];

    if (c.documents.length >= 5) {
        alert("You have reached the maximum limit of 5 precedent links for this concept. Delete an existing link to add a new one.");
        return;
    }

    const name = prompt("Precedent Name (e.g., Seller-Friendly Asset Purchase Agreement):");
    if (!name || !name.trim()) return;

    let url = prompt("Google Drive / OneDrive / Cloud Link URL:\n(Leave blank if pending)");
    if (url && url.trim()) {
        url = url.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }
    } else {
        url = "";
    }

    const type = prompt("File format / tag (e.g. DOCX, PDF, Clause, Template):", "DOCX");

    // Push as a new discrete object entry
    c.documents.push({
        id: "doc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name: name.trim(),
        url: url,
        type: (type && type.trim()) ? type.trim().toUpperCase() : "LINK"
    });

    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderConceptDetailView();
    if (typeof showToast === 'function') showToast("Precedent document link added.", "success");
};

/**
 * Remove Precedent Link with Event Isolation
 */
window.removeConceptDocumentRow = function(conceptIdx, docIdx) {
    const c = db.concepts[conceptIdx];
    if (!c || !Array.isArray(c.documents) || !c.documents[docIdx]) return;

    const docName = c.documents[docIdx].name || "this precedent";
    if (confirm(`Remove "${docName}" from this concept?`)) {
        c.documents.splice(docIdx, 1);
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
        if (typeof showToast === 'function') showToast("Precedent link removed.", "info");
    }
};

/**
 * Direct review trigger for the active concept workspace
 */
window.startSingleConceptReview = function(conceptIdx) {
    if (typeof openFlashcardDashboard === 'function') {
        openFlashcardDashboard('concept-elements', false, conceptIdx);
    }
};

window.removeConceptTag = function(index, tagIdx) {
    const concept = db.concepts[index];
    if (!concept) return;

    let tags = (concept.subTag || "").split(',').map(t => t.trim()).filter(Boolean);
    if (tagIdx >= 0 && tagIdx < tags.length) {
        const removed = tags.splice(tagIdx, 1);
        concept.subTag = tags.join(', ');
        
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderConceptDetailView();
        if (typeof window.populateConceptFilterDropdowns === 'function') {
            window.populateConceptFilterDropdowns(true);
        }
        if (typeof showToast === 'function') showToast(`Removed tag "${removed}"`, "info");
    }
};