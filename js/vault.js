// INTERVIEW VAULT & COMPETENCY LOGIC
// ==========================================

// 1. Vault Tab Registration (Alphabetical with 'All' Default)
window.vaultTabs = [
    "All",
    "Concept Deconstruct",
    "Concept Interview",
    "Knowledge Test",
    "Market Deconstruct",
    "Mock Interview",
    "Ripple Effect",
    "STAR"
];
window.activeVaultTab = window.vaultTabs[0];

window.toggleVaultCard = function(index, event) {
    if (event && (event.target.closest('button') || event.target.closest('a'))) return;
    if (db.vault && db.vault[index]) {
        db.vault[index].isCollapsed = db.vault[index].isCollapsed === false ? true : false;
        if (typeof saveDatabase === 'function') saveDatabase();
        window.renderVault();
    }
};

// 2. Core Vault Saving Mechanism
window.saveToVault = function(type) {
    if (typeof db === 'undefined') return;
    if (!db.vault) db.vault = []; 
    
    const nowMs = new Date().getTime();
    const dateStr = new Date().toLocaleDateString('en-GB');

    let dynamicTitle = `${type} Assessment`;
    if (window.currentScenario) {
        let cleanScen = window.currentScenario
            .replace(/<[^>]*>?/gm, '')
            .replace(/\*+/g, '')
            .replace(/(PARTNER QUESTION|SCENARIO|DEFINITIVE QUESTION):/i, '')
            .trim();
        dynamicTitle = cleanScen.substring(0, 85) + (cleanScen.length > 85 ? "..." : "");
    }

    db.vault.push({
        type: type, 
        title: dynamicTitle,
        body: `**SCENARIO:**\n${window.currentScenario || ""}\n\n**MY RESPONSE:**\n${window.currentCandidateAnswer || ""}\n\n**EVALUATION:**\n${window.currentFeedback || ""}`,
        score: window.currentExtractedScore || "",
        competency: "",
        timestamp: nowMs,
        dateStr: dateStr,
        isCollapsed: true
    });
    
    if (typeof saveDatabase === 'function') saveDatabase(); 
    if (typeof showToast === 'function') showToast(`Saved to Vault: ${type}`, "success");
    else alert(`Saved to Vault: ${type}`);
    
    if (typeof closeAiModal === 'function') closeAiModal();
    if (window.appState === 'VAULT') window.renderVault();
};

window.generateStarFromScratch = async function() {
    const scenario = prompt("What competency or scenario do you want to build a STAR answer for?\n(e.g., 'Commercial Awareness', 'Overcoming a setback', 'Leadership')");
    if (!scenario) return;
    
    if (typeof setupAiModal === 'function') {
        setupAiModal(`STAR Drafter: ${scenario}`, "STAR Method", "bg-yellow-900/60 text-yellow-300 border-yellow-700", false);
    }
    
    const contentDiv = document.getElementById("aiModalContent");
    if (contentDiv) contentDiv.innerHTML = "<p class='text-yellow-400 animate-pulse text-center py-10'>Drafting professional STAR narrative...</p>";
    
    const promptText = `You are a career coach for UK corporate law firms. Draft a highly polished, 200-word STAR method interview answer demonstrating this competency/topic: "${scenario}". 
    Structure the response EXACTLY with these bold headings:
    **SITUATION:**
    **TASK:**
    **ACTION:**
    **RESULT:**
    Make it sound professional, commercial, and realistic. Provide ONLY the STAR text.`;

    try {
        const aiResponse = await window.callGeminiApi(promptText);
        window.currentCandidateAnswer = aiResponse; 
        window.currentScenario = scenario;
        if (contentDiv && typeof buildSplitPaneHTML === 'function') {
            contentDiv.innerHTML = buildSplitPaneHTML(aiResponse, "Refine or Save to Vault", "saveStarFromScratch");
        }
    } catch (e) { 
        if (contentDiv) contentDiv.innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; 
    }
};

window.saveStarFromScratch = function() {
    if (typeof db === 'undefined') return;
    if (!db.vault) db.vault = [];
    
    const inputEl = document.getElementById('aiInputAnswer');
    const finalAnswer = (inputEl && inputEl.value) ? inputEl.value : window.currentCandidateAnswer;
    const coreCompetency = window.currentScenario ? window.currentScenario.split(' ')[0].replace(/[^a-zA-Z]/g, '') : "General"; 
    const nowMs = new Date().getTime();
    
    db.vault.push({
        type: "STAR",
        title: `STAR: ${window.currentScenario || "Generated"}`,
        body: finalAnswer,
        score: "",
        competency: coreCompetency,
        timestamp: nowMs,
        dateStr: new Date().toLocaleDateString('en-GB'),
        isCollapsed: true
    });
    
    if (typeof saveDatabase === 'function') saveDatabase(); 
    if (typeof showToast === 'function') showToast("Saved to Vault: STAR", "success");
    else alert("Saved to Vault: STAR");
    
    if (typeof closeAiModal === 'function') closeAiModal();
    if (window.appState === 'VAULT') window.renderVault();
};

window.deleteVaultItem = function(index) {
    if (!confirm("Are you sure you want to permanently delete this Vault record?")) return;
    db.vault.splice(index, 1);
    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderVault();
};

// 3. Vault Rendering Engine & Live Migration
window.renderVault = function() {
    const appVaultEl = document.getElementById("appVault");
    if (!appVaultEl) return;

    const rootContainer = appVaultEl.firstElementChild;
    if (!rootContainer) return;

    appVaultEl.className = "flex-1 flex-col md:flex-row hidden w-full h-full relative overflow-y-auto p-4 md:p-8 transition-colors duration-300 bg-slate-50 dark:bg-[#0b1120] text-slate-800 dark:text-slate-200";

    const searchBox = document.getElementById("searchVault");
    const activeSearch = searchBox ? searchBox.value : "";
    const isSearchFocused = searchBox && searchBox === document.activeElement;
    
    const sortBox = document.getElementById("sortVault");
    const activeSort = sortBox ? sortBox.value : "newest";
    
    if (!db.vault) db.vault = [];
    let migrated = false;
    
    if (db.concepts) {
        for (let i = db.concepts.length - 1; i >= 0; i--) {
            if (db.concepts[i].category === "Interview Vault") {
                let c = db.concepts.splice(i, 1)[0];
                let type = "Concept Interview";
                if (c.title.includes("Knowledge")) type = "Knowledge Test";
                else if (c.title.includes("Deconstruct")) type = "Concept Deconstruct";
                db.vault.push({
                    type: type, title: c.title, body: c.body, score: c.score || "", competency: "",
                    timestamp: c.timestamp || new Date().getTime(), dateStr: c.date || new Date().toLocaleDateString('en-GB')
                });
                migrated = true;
            }
        }
    }
    if (db.factors) {
        for (let i = db.factors.length - 1; i >= 0; i--) {
            if (db.factors[i].workspace === "Interview Vault") {
                let f = db.factors.splice(i, 1)[0];
                let type = "Mock Interview";
                if (f.title.includes("Ripple")) type = "Ripple Effect";
                else if (f.title.includes("STAR")) type = "STAR";
                else if (f.title.includes("Deconstruct")) type = "Market Deconstruct";
                db.vault.push({
                    type: type, title: f.title, body: f.description, score: f.score || "", competency: f.competency || "",
                    timestamp: f.timestamp || new Date().getTime(), dateStr: f.date || new Date().toLocaleDateString('en-GB')
                });
                migrated = true;
            }
        }
    }
    if (migrated && typeof saveDatabase === 'function') saveDatabase();

    rootContainer.innerHTML = `
        <div class="print:hidden border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <h2 class="text-2xl md:text-3xl font-serif font-black text-slate-900 dark:text-white mb-2">Interview Vault</h2>
            <p class="text-sm text-slate-500">Your centralized repository for AI assessments and competency records.</p>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mb-6 print:hidden">
            <select id="sortVault" onchange="window.renderVault()" class="border border-slate-300 dark:border-slate-700 rounded-sm px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 shadow-sm bg-white dark:bg-slate-900 h-9 box-border shrink-0 font-semibold cursor-pointer">
                <option value="newest" ${activeSort === 'newest' ? 'selected' : ''}>Newest First</option>
                <option value="oldest" ${activeSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
                <option value="az" ${activeSort === 'az' ? 'selected' : ''}>A-Z</option>
                <option value="za" ${activeSort === 'za' ? 'selected' : ''}>Z-A</option>
            </select>
            <div class="relative flex-1">
                <i data-lucide="search" class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"></i>
                <input type="text" id="searchVault" value="${activeSearch.replace(/"/g, '&quot;')}" placeholder="Search vault records..." spellcheck="false" onkeyup="window.renderVault()" class="pl-9 border border-slate-300 dark:border-slate-700 rounded-sm pr-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner h-9 box-border w-full bg-white dark:bg-slate-900 dark:text-white font-medium">
            </div>
        </div>
        
        <div id="vaultCardsList" class="flex flex-col gap-4 pb-10"></div>
    `;
    
    if (isSearchFocused) {
        const newSearchBox = document.getElementById("searchVault");
        if (newSearchBox) {
            newSearchBox.focus();
            newSearchBox.setSelectionRange(newSearchBox.value.length, newSearchBox.value.length);
        }
    }

    let items = db.vault.map((v, idx) => ({ ...v, originalIndex: idx }));
    
    if (window.activeVaultTab !== "All") {
        items = items.filter(item => item.type === window.activeVaultTab);
    }

    if (activeSearch) {
        const lowerTerm = activeSearch.toLowerCase();
        items = items.filter(item => 
            String(item.title).toLowerCase().includes(lowerTerm) ||
            String(item.body).toLowerCase().includes(lowerTerm)
        );
    }

    if (activeSort === "newest") items.sort((a,b) => b.timestamp - a.timestamp);
    else if (activeSort === "oldest") items.sort((a,b) => a.timestamp - b.timestamp);
    else if (activeSort === "az") items.sort((a,b) => a.title.localeCompare(b.title));
    else if (activeSort === "za") items.sort((a,b) => b.title.localeCompare(a.title));

    const cardsWrapper = document.getElementById("vaultCardsList");

    if (items.length === 0) {
        cardsWrapper.innerHTML = `<div class="p-10 text-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-[#0f172a] shadow-sm flex flex-col items-center justify-center min-h-[250px]"><i data-lucide="lock" class="w-8 h-8 text-slate-400 dark:text-slate-600 mb-3"></i><p class="text-slate-600 dark:text-slate-300 font-bold">No records found.</p><p class="text-xs text-slate-500 mt-1">Complete AI assessments to log records here.</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    cardsWrapper.innerHTML = items.map(item => {
        let scoreHtml = item.score ? `<span class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm"><i data-lucide="award" class="w-3 h-3 inline pb-0.5"></i> Score: ${item.score}</span>` : '';
        let compHtml = item.competency && item.competency !== "General" ? `<span class="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm"><i data-lucide="target" class="w-3 h-3 inline pb-0.5"></i> ${item.competency}</span>` : '';
        let typeHtml = window.activeVaultTab === "All" ? `<span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm">${item.type}</span>` : '';
        
        let markdownBody = item.body;
        if (typeof formatMarkdown === 'function') markdownBody = formatMarkdown(item.body);
        else if (window.formatMarkdown) markdownBody = window.formatMarkdown(item.body);

        const isCollapsed = item.isCollapsed !== false;

        return `
        <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 shadow-sm relative w-full flex flex-col transition-colors hover:border-indigo-300 dark:hover:border-indigo-600 group">
            
            <div class="flex justify-between items-start cursor-pointer ${isCollapsed ? '' : 'border-b border-slate-100 dark:border-slate-800 pb-4 mb-4'} shrink-0" onclick="window.toggleVaultCard(${item.originalIndex}, event)">
                <div class="pr-4">
                    <h3 class="text-base md:text-lg font-serif font-black text-slate-900 dark:text-white leading-snug">${item.title}</h3>
                    <div class="flex items-center gap-2 flex-wrap mt-2">
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-inner"><i data-lucide="calendar" class="w-3 h-3 inline pb-0.5"></i> ${item.dateStr}</span>
                        ${typeHtml}
                        ${scoreHtml}
                        ${compHtml}
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0 mt-1">
                    <button onclick="window.deleteVaultItem(${item.originalIndex}); event.stopPropagation();" class="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 p-2 rounded-md opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 shadow-sm shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <span class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition bg-slate-100 dark:bg-slate-800 p-1.5 rounded shadow-inner border border-slate-200 dark:border-slate-700"><i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i></span>
                </div>
            </div>
            
            <div class="${isCollapsed ? 'hidden print:block' : 'block'} prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-slate-300 leading-relaxed overflow-auto flex-1 whitespace-pre-wrap dict-highlight-target dark:prose-invert">
                ${markdownBody}
            </div>
        </div>
        `;
    }).join('');
    
    if (window.lucide) window.lucide.createIcons();
    if (typeof applyDictionaryHighlighting === 'function') applyDictionaryHighlighting("vaultCardsList");
};

// 4. Router Intercepting (Preventing double rendering)
if (typeof window.switchState === 'function' && !window._vaultIntercepted) {
    window._vaultIntercepted = true;
    const originalSwitchState = window.switchState;
    window.switchState = function(newState) {
        originalSwitchState(newState);
        // Note: router.js now handles the renderTabs and renderVault calls naturally.
    };
}