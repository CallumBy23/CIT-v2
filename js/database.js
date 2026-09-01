// DATABASE FETCHING & SAVING & BRIEFINGS
// ==========================================

// --- MACRO DATA COMPRESSION FIREWALL ---
function compressMacroData(historyArray) {
    if (!historyArray || !Array.isArray(historyArray)) return [];
    
    // 1. Calculate 5-Year Cutoff
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const cutoffTime = fiveYearsAgo.getTime();

    // 2. Filter out old data
    const recentData = historyArray.filter(p => p && p.d >= cutoffTime);

    // 3. Group by Year-Month to find the first entry of each month
    const monthlyMap = new Map();
    recentData.forEach(p => {
        const d = new Date(p.d);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`; 
        
        // If month not logged yet, OR this data point is earlier in the month, overwrite it
        if (!monthlyMap.has(monthKey) || p.d < monthlyMap.get(monthKey).d) {
            monthlyMap.set(monthKey, p);
        }
    });

    // 4. Return sorted chronologically
    return Array.from(monthlyMap.values()).sort((a, b) => a.d - b.d);
}

async function loadDatabase() {
    const localCached = localStorage.getItem("LEGAL_NEXUS_DB");
    let localLastUpdated = 0;
    
    if (localCached) {
      try { 
          const parsed = JSON.parse(localCached);
          localLastUpdated = parsed.lastUpdated || 0;
          if (parsed.workspaces) db.workspaces = parsed.workspaces;
          if (parsed.factors) db.factors = parsed.factors;
          if (parsed.conceptCategories) db.conceptCategories = parsed.conceptCategories;
          if (parsed.concepts) db.concepts = parsed.concepts;
          if (parsed.dossiers) db.dossiers = parsed.dossiers;
          if (parsed.dictionary) db.dictionary = parsed.dictionary;
          if (parsed.targetFirms) db.targetFirms = parsed.targetFirms;
          if (parsed.dictCategories) db.dictCategories = parsed.dictCategories; 
          if (parsed.macroMetrics) db.macroMetrics = parsed.macroMetrics; 
          if (parsed.playbooks) db.playbooks = parsed.playbooks;
          if (parsed.vault) db.vault = parsed.vault; 
          db.lastUpdated = localLastUpdated;
      } catch (e) {
          console.warn("Local cache parsing failed.", e);
      }
    }
  
    db.workspaces = db.workspaces || [];
    if (!db.workspaces.includes("General Market")) db.workspaces.unshift("General Market");
    
    db.conceptCategories = db.conceptCategories || [];
    if (db.conceptCategories.length === 0) db.conceptCategories = ["Corporate / M&A", "Capital Markets", "Intellectual Property", "Commercial Contracts", "Dispute Resolution"];

    db.dictCategories = db.dictCategories || [];
    if (db.dictCategories.length === 0) db.dictCategories = ["General", "Corporate / M&A", "Capital Markets", "Dispute Resolution", "Private Wealth"];
  
    db.dossiers = db.dossiers || {};
    for (const firm in db.dossiers) {
        if (!db.dossiers[firm].firmType) db.dossiers[firm].firmType = "";
        if (!db.dossiers[firm].locations) db.dossiers[firm].locations = "";
        if (db.dossiers[firm].applied === undefined) db.dossiers[firm].applied = false;
    }

    db.playbooks = db.playbooks || {}; 
    db.vault = db.vault || []; 

    if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
    
    if(appState === "DASHBOARD" && typeof renderDashboard === 'function') { renderDashboard(); }
    else if(appState === "INTELLIGENCE" && typeof renderFeed === 'function') { 
        const sortEl = document.getElementById("sortFeed");
        if (sortEl) sortEl.value = uiPrefs.intelSort || "newest"; 
        renderTabs(); 
        renderFeed(); 
    }
    else if (appState === "CONCEPTS" && typeof renderConcepts === 'function') { 
        const sortEl = document.getElementById("sortConcepts");
        if (sortEl) sortEl.value = uiPrefs.conceptSort || "newest"; 
        renderTabs(); 
        renderConcepts(); 
    }
    else if (appState === "DOSSIERS" && typeof renderDossierList === 'function') { 
        const sortEl = document.getElementById("sortDossiers");
        if (sortEl) sortEl.value = uiPrefs.dossierSort || "deadline"; 
        renderDossierList(); 
    }
    else if (appState === "PLAYBOOKS" && typeof renderPlaybookList === 'function') { 
        renderPlaybookList(); 
    }
    else if (appState === "DICTIONARY" && typeof renderDictionary === 'function') { 
        const sortEl = document.getElementById("sortDictionary");
        if (sortEl) sortEl.value = uiPrefs.dictSort || "az"; 
        renderDictionary(); 
    }
    else if (appState === "VAULT" && typeof window.renderVault === 'function') {
        window.renderVault();
    }
    
    try {
        const response = await fetch(SCRIPT_URL);
        
        if (response.ok) {
          const loadedDb = await response.json();
          const serverLastUpdated = loadedDb.lastUpdated || 0;
        
          const localDataCount = (db.factors?.length || 0) + (db.concepts?.length || 0) + (db.dictionary?.length || 0) + (db.vault?.length || 0);
          const serverDataCount = (loadedDb.factors?.length || 0) + (loadedDb.concepts?.length || 0) + (loadedDb.dictionary?.length || 0) + (loadedDb.vault?.length || 0);
          
          const isServerNewer = serverLastUpdated > localLastUpdated;
          const isServerHeavier = serverDataCount > localDataCount;
          
          if (loadedDb && !loadedDb.error && typeof loadedDb === "object" && !Array.isArray(loadedDb)) {
              if (isServerNewer || isServerHeavier || localDataCount === 0) {
                  db = {
                      workspaces: (loadedDb.workspaces && loadedDb.workspaces.length > 0) ? loadedDb.workspaces : db.workspaces,
                      factors: (loadedDb.factors && loadedDb.factors.length > 0) ? loadedDb.factors : (db.factors || []),
                      conceptCategories: (loadedDb.conceptCategories && loadedDb.conceptCategories.length > 0) ? loadedDb.conceptCategories : db.conceptCategories,
                      dictCategories: (loadedDb.dictCategories && loadedDb.dictCategories.length > 0) ? loadedDb.dictCategories : db.dictCategories, 
                      concepts: (loadedDb.concepts && loadedDb.concepts.length > 0) ? loadedDb.concepts : (db.concepts || []),
                      dossiers: (loadedDb.dossiers && Object.keys(loadedDb.dossiers).length > 0) ? loadedDb.dossiers : (db.dossiers || {}),
                      dictionary: (loadedDb.dictionary && loadedDb.dictionary.length > 0) ? loadedDb.dictionary : (db.dictionary || []),
                      targetFirms: (loadedDb.targetFirms && loadedDb.targetFirms.length > 0) ? loadedDb.targetFirms : (db.targetFirms || []),
                      macroMetrics: (loadedDb.macroMetrics && Object.keys(loadedDb.macroMetrics).length > 0) ? loadedDb.macroMetrics : (db.macroMetrics || {}), 
                      playbooks: (loadedDb.playbooks && Object.keys(loadedDb.playbooks).length > 0) ? loadedDb.playbooks : (db.playbooks || {}),
                      vault: (loadedDb.vault && loadedDb.vault.length > 0) ? loadedDb.vault : (db.vault || []), 
                      lastUpdated: serverLastUpdated > 0 ? serverLastUpdated : new Date().getTime()
                  };
        
                  saveToLocalCache();
                  setOnlineStatus(true);
                  
                  if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
                
                  if(appState === "DASHBOARD" && typeof renderDashboard === 'function') { renderDashboard(); }
                  else if(appState === "INTELLIGENCE" && typeof renderFeed === 'function') { renderTabs(); renderFeed(); }
                  else if (appState === "DOSSIERS" && typeof renderDossierList === 'function') { renderDossierList(); }
                  else if (appState === "PLAYBOOKS" && typeof renderPlaybookList === 'function') { renderPlaybookList(); }
                  else if (appState === "DICTIONARY" && typeof renderDictionary === 'function') { renderDictionary(); }
                  else if (appState === "VAULT" && typeof window.renderVault === 'function') { window.renderVault(); }
              } else if (serverLastUpdated < localLastUpdated) {
                  setOnlineStatus(true, "Local data is newer. Syncing up to cloud on next save.");
              }
          } else {
              setOnlineStatus(false, loadedDb.error || "Received malformed data or an internal Apps Script error.");
          }
      } else {
          setOnlineStatus(false, `HTTP Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) { 
        setOnlineStatus(false, `Network Error: ${error.message}`);
    }
    
    if(typeof window.renderMacroWidget === 'function') window.renderMacroWidget();
    if(typeof checkDailyBriefing === 'function') checkDailyBriefing();
}
  
async function saveDatabase() {
    // FIREWALL: Aggressively compress metrics arrays right before pushing to Google Sheets
    if (db.macroMetrics) {
        for (const key in db.macroMetrics) {
            if (db.macroMetrics[key] && Array.isArray(db.macroMetrics[key].history)) {
                db.macroMetrics[key].history = compressMacroData(db.macroMetrics[key].history);
            }
        }
    }

    db.lastUpdated = new Date().getTime(); 
    saveToLocalCache();
  
    try { 
      const response = await fetch(SCRIPT_URL, { 
          method: 'POST',
          body: JSON.stringify(db) 
      }); 
      
      if(response.ok) {
          const result = await response.json();
          if (result.status === "success") {
              setOnlineStatus(true);
          } else {
              setOnlineStatus(false, result.message || "Google Apps Script returned an error upon saving.");
          }
      } else {
          setOnlineStatus(false, `HTTP Save Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) { 
        setOnlineStatus(false, `Network Save Error: ${error.message}`); 
    }
}
  
function saveToLocalCache() {
    try {
        localStorage.setItem("LEGAL_NEXUS_DB", JSON.stringify(db));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn("LocalStorage quota exceeded! Your diagrams/rich text are too large for offline cache. Continuing to sync to cloud...");
            const statusText = document.getElementById('statusText');
            if (statusText) statusText.innerText = "Syncing (Cache Full)";
        }
    }
}
  
function setOnlineStatus(isOnline, errorMsg = "") {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;
    
    if (isOnline) {
        dot.className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
        text.innerText = "Synced";
        text.title = "";
    } else {
        dot.className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
        text.innerText = "Offline (Hover for Error)";
        text.title = errorMsg;
    }
}
  
function openManualBriefing() {
    if(typeof checkDailyBriefing === 'function') checkDailyBriefing(true);
}
  
function checkDailyBriefing(isManual = false) {
    let briefingHTML = "";
    let hasAlerts = false;
  
    const now = new Date();
    now.setHours(0,0,0,0);
    const twoWeeks = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    
    let urgentFirms = [];
    for (const [firm, data] of Object.entries(db.dossiers || {})) {
        if (!data || data.applied) continue;

        if (data.schemes && data.schemes.length > 0) {
            data.schemes.forEach(s => {
                if(s && s.closeDate && !s.applied) {
                    const close = new Date(s.closeDate);
                    close.setHours(0,0,0,0);
                    const open = s.openDate ? new Date(s.openDate) : null;
                    if(open) open.setHours(0,0,0,0);
                    
                    const isRollingOpen = (s.rolling === "Rolling" && open && now >= open && now <= close);
                    
                    if(isRollingOpen || (close >= now && close <= twoWeeks)) {
                        const diff = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
                        urgentFirms.push({ firm, diff, scheme: s.schemeType, isRollingOpen });
                    }
                }
            });
        } 
    }
    
    urgentFirms = urgentFirms.filter((v,i,a)=>a.findIndex(v2=>(v2.firm===v.firm && v2.scheme===v.scheme))===i);
    
    if (urgentFirms.length > 0) {
        hasAlerts = true;
        briefingHTML += `<h4 class="font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-slate-700 pb-1 flex items-center gap-2"><span>🚨</span> Approaching Deadlines</h4><ul class="space-y-2 mb-6">`;
        urgentFirms.sort((a,b)=>a.diff-b.diff).forEach(f => {
            briefingHTML += `<li class="text-sm flex justify-between items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition" onclick="routeToFirm('${f.firm.replace(/'/g, "\\'")}'); document.getElementById('dailyBriefingModal').classList.add('hidden');">
                <span class="truncate pr-2 dark:text-slate-200"><strong>${f.firm}</strong> <span class="text-gray-500 dark:text-slate-400">(${f.scheme || 'Application'})</span></span> 
                <span class="text-red-600 dark:text-red-400 font-bold shrink-0">${f.isRollingOpen ? 'Rolling (Act Now!)' : (f.diff === 0 ? 'Today!' : f.diff + ' Days')}</span>
            </li>`;
        });
        briefingHTML += `</ul>`;
    }
  
    const dueConcepts = (db.concepts || []).filter(c => c && c.srs && c.srs.nextReview <= new Date().getTime());
    const dueDictTerms = (db.dictionary || []).filter(d => d && d.srs && d.srs.nextReview <= new Date().getTime());
    const totalDue = dueConcepts.length + dueDictTerms.length;

    if (totalDue > 0) {
        hasAlerts = true;
        briefingHTML += `<h4 class="font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-slate-700 pb-1 flex items-center gap-2"><span>🧠</span> Spaced Repetition Due</h4>`;
        briefingHTML += `<div class="flex flex-col gap-3">`;

        if (dueConcepts.length > 0) {
            briefingHTML += `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg shadow-sm">
                <p class="text-sm text-blue-900 dark:text-blue-200 mb-2">You have <strong>${dueConcepts.length}</strong> core concepts due for memory review.</p>
                <button onclick="switchState('CONCEPTS'); document.getElementById('dailyBriefingModal').classList.add('hidden'); setTimeout(() => openFlashcardDashboard('concepts'), 300);" class="text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold px-3 py-2 rounded transition shadow-md w-full">Review Concepts</button>
            </div>`;
        }

        if (dueDictTerms.length > 0) {
            briefingHTML += `<div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3 rounded-lg shadow-sm">
                <p class="text-sm text-purple-900 dark:text-purple-200 mb-2">You have <strong>${dueDictTerms.length}</strong> dictionary terms due for memory review.</p>
                <button onclick="switchState('DICTIONARY'); document.getElementById('dailyBriefingModal').classList.add('hidden'); setTimeout(() => openFlashcardDashboard('dictionary'), 300);" class="text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-bold px-3 py-2 rounded transition shadow-md w-full">Review Dictionary</button>
            </div>`;
        }

        briefingHTML += `</div>`;
    }
  
    if (!hasAlerts && isManual) {
        briefingHTML = `
            <div class="text-center py-6">
                <span class="text-3xl mb-2 block">✅</span>
                <h4 class="font-bold text-gray-800 dark:text-slate-200 text-base">All Caught Up!</h4>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">No deadlines approaching in the next 14 days and no concepts currently due for review.</p>
            </div>
        `;
    }
  
    if(hasAlerts || isManual) {
        document.getElementById('briefingContent').innerHTML = briefingHTML;
        document.getElementById('dailyBriefingModal').classList.remove('hidden');
    }
}