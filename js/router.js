// UI PREFS & ROUTING
// ==========================================
function updateUIPrefs() {
  if(appState === 'INTELLIGENCE') uiPrefs.intelSort = document.getElementById("sortFeed").value;
  if(appState === 'CONCEPTS') uiPrefs.conceptSort = document.getElementById("sortConcepts").value;
  if(appState === 'DICTIONARY') uiPrefs.dictSort = document.getElementById("sortDictionary").value;
  if(appState === 'DOSSIERS') uiPrefs.dossierSort = document.getElementById("sortDossiers").value;
  localStorage.setItem('LEGAL_NEXUS_UIPREFS', JSON.stringify(uiPrefs));
  
  if(appState === 'INTELLIGENCE') renderFeed();
  if(appState === 'CONCEPTS') renderConcepts();
  if(appState === 'DICTIONARY') renderDictionary();
  if(appState === 'DOSSIERS') renderDossierList();
}

function switchState(newState) {
  appState = newState;
  
  const btnIntel = document.getElementById("btnStateIntel");
  const btnConcepts = document.getElementById("btnStateConcepts");
  const btnDossiers = document.getElementById("btnStateDossiers");
  const btnPlaybooks = document.getElementById("btnStatePlaybooks"); // NEW
  const btnDict = document.getElementById("btnStateDictionary");
  const btnGraph = document.getElementById("btnStateGraph");
  
  const mobIntel = document.getElementById("mobNavIntel");
  const mobConcepts = document.getElementById("mobNavConcepts");
  const mobDossiers = document.getElementById("mobNavDossiers");
  const mobPlaybooks = document.getElementById("mobNavPlaybooks"); // NEW
  const mobDict = document.getElementById("mobNavDict");
  const mobGraph = document.getElementById("mobNavGraph");

  const appIntel = document.getElementById("appIntelligence");
  const appConcepts = document.getElementById("appConcepts");
  const appDossiers = document.getElementById("appDossiers");
  const appPlaybooks = document.getElementById("appPlaybooks"); // NEW
  const appDict = document.getElementById("appDictionary");
  const appGraph = document.getElementById("appGraph");
  
  const mainTabs = document.getElementById("mainTabs");
  const rssBtn = document.getElementById("rssBtn");

  // Reset Desktop Buttons
  [btnIntel, btnConcepts, btnDossiers, btnPlaybooks, btnDict, btnGraph].forEach(btn => {
      if (btn) btn.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition whitespace-nowrap";
  });
  
  // Reset Mobile Buttons (Smaller text-10px to fit 6 items)
  [mobIntel, mobConcepts, mobDossiers, mobPlaybooks, mobDict, mobGraph].forEach(btn => {
      if (btn) btn.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-gray-500 hover:text-gray-900 border-t-2 border-transparent flex flex-col items-center gap-1 transition -mt-px";
  });

  // Hide all App Containers
  [appIntel, appConcepts, appDossiers, appPlaybooks, appDict, appGraph].forEach(app => { 
      if (app) {
          app.classList.add("hidden"); 
          app.classList.remove("flex"); 
      }
  });

  // Close Sidebars
  ["intelLogSidebar", "conceptLogSidebar", "dossierSidebar", "playbooksSidebar", "dictSidebar"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.add('-translate-x-full');
  });

  if (newState === "INTELLIGENCE") {
      btnIntel.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-indigo-700 shadow-sm transition whitespace-nowrap";
      mobIntel.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-blue-600 border-t-2 border-blue-600 flex flex-col items-center gap-1 transition -mt-px";
      appIntel.classList.remove("hidden"); appIntel.classList.add("flex");
      mainTabs.classList.remove("hidden");
      if(rssBtn) rssBtn.style.display = "flex";
      document.getElementById("sortFeed").value = uiPrefs.intelSort;
      if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns(); 
      renderTabs(); renderFeed();
  } 
  else if (newState === "CONCEPTS") {
      btnConcepts.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-blue-700 shadow-sm transition whitespace-nowrap";
      mobConcepts.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-blue-600 border-t-2 border-blue-600 flex flex-col items-center gap-1 transition -mt-px";
      appConcepts.classList.remove("hidden"); appConcepts.classList.add("flex");
      mainTabs.classList.remove("hidden");
      if(rssBtn) rssBtn.style.display = "none";
      document.getElementById("sortConcepts").value = uiPrefs.conceptSort;
      renderTabs(); renderConcepts();
  } 
  else if (newState === "DOSSIERS") {
      btnDossiers.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-gray-900 shadow-sm transition whitespace-nowrap";
      mobDossiers.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-blue-600 border-t-2 border-blue-600 flex flex-col items-center gap-1 transition -mt-px";
      appDossiers.classList.remove("hidden"); appDossiers.classList.add("flex");
      mainTabs.classList.add("hidden"); 
      if(rssBtn) rssBtn.style.display = "none";
      document.getElementById("sortDossiers").value = dossierSortMode;
      renderDossierList();
  } 
  else if (newState === "PLAYBOOKS") { // NEW ROUTE
      if(btnPlaybooks) btnPlaybooks.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-emerald-700 shadow-sm transition whitespace-nowrap";
      if(mobPlaybooks) mobPlaybooks.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-emerald-600 border-t-2 border-emerald-600 flex flex-col items-center gap-1 transition -mt-px";
      if(appPlaybooks) { appPlaybooks.classList.remove("hidden"); appPlaybooks.classList.add("flex"); }
      mainTabs.classList.add("hidden"); 
      if(rssBtn) rssBtn.style.display = "none";
      if (typeof renderPlaybookList === 'function') renderPlaybookList();
  }
  else if (newState === "DICTIONARY") {
      btnDict.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-gray-900 shadow-sm transition whitespace-nowrap";
      mobDict.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-blue-600 border-t-2 border-blue-600 flex flex-col items-center gap-1 transition -mt-px";
      appDict.classList.remove("hidden"); appDict.classList.add("flex");
      mainTabs.classList.remove("hidden"); 
      if(rssBtn) rssBtn.style.display = "none";
      document.getElementById("sortDictionary").value = uiPrefs.dictSort;
      renderTabs(); renderDictionary();
  }
  else if (newState === "GRAPH") {
      if(btnGraph) btnGraph.className = "px-2.5 md:px-3 py-1.5 rounded-md text-sm font-bold bg-white text-purple-700 shadow-sm transition whitespace-nowrap";
      if(mobGraph) mobGraph.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-purple-600 border-t-2 border-purple-600 flex flex-col items-center gap-1 transition -mt-px";
      
      if(appGraph) {
          appGraph.classList.remove("hidden");
          appGraph.classList.add("flex");
      }
      mainTabs.classList.add("hidden");
      if(rssBtn) rssBtn.style.display = "none";
      
      // Wait 50ms for DOM container to physically render before calculating physics
      if(typeof renderNexusGraph === 'function') setTimeout(renderNexusGraph, 50);
  }
}

function toggleGlobalCollapse(type, forceOpen) {
  if (type === 'intel') {
      db.factors.forEach(f => f.isCollapsed = !forceOpen);
      saveDatabase(); renderFeed();
  } else {
      db.concepts.forEach(c => c.isCollapsed = !forceOpen);
      saveDatabase(); renderConcepts();
  }
}

function routeToFirm(firmName) {
  closeOmnibar();
  if(db.targetFirms.includes(firmName)) {
      currentDossierFirm = firmName;
      switchState('DOSSIERS');
  }
}

function routeToConcept(conceptName) {
  if (typeof closeOmnibar === 'function') closeOmnibar();
  const cleanSearchTerm = String(conceptName).trim().toLowerCase();
  const concept = db.concepts.find(c => (c.title || "").trim().toLowerCase() === cleanSearchTerm);

  if (typeof activeConceptCategory !== 'undefined') {
      activeConceptCategory = "All"; 
  }

  const searchBox = document.getElementById("searchConcepts");
  if (searchBox) {
      searchBox.value = concept ? concept.title : conceptName;
  }

  switchState('CONCEPTS');
  if (typeof renderConcepts === 'function') renderConcepts();
}

function handleTabDragStart(e, name) {
  draggedTabName = name;
  e.dataTransfer.effectAllowed = "move";
  e.target.style.opacity = "0.5";
}

function handleTabDragEnd(e) {
  e.target.style.opacity = "1";
  document.querySelectorAll('#mainTabs button').forEach(el => el.classList.remove('tab-drag-over'));
}

function handleTabDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const btn = e.target.closest('button');
  if (btn) btn.classList.add('tab-drag-over');
}

function handleTabDragLeave(e) {
  const btn = e.target.closest('button');
  if (btn) btn.classList.remove('tab-drag-over');
}

function handleTabDrop(e, targetName) {
  e.preventDefault();
  document.querySelectorAll('#mainTabs button').forEach(el => el.classList.remove('tab-drag-over'));
  
  if (!draggedTabName || draggedTabName === targetName) return;

  if (appState === "INTELLIGENCE") {
      const fromIdx = db.workspaces.indexOf(draggedTabName);
      const toIdx = db.workspaces.indexOf(targetName);
      if (fromIdx > -1 && toIdx > -1) {
          const item = db.workspaces.splice(fromIdx, 1)[0];
          db.workspaces.splice(toIdx, 0, item);
          saveDatabase();
          renderTabs();
      }
  } else if (appState === "CONCEPTS") {
      const fromIdx = db.conceptCategories.indexOf(draggedTabName);
      const toIdx = db.conceptCategories.indexOf(targetName);
      if (fromIdx > -1 && toIdx > -1) {
          const item = db.conceptCategories.splice(fromIdx, 1)[0];
          db.conceptCategories.splice(toIdx, 0, item);
          saveDatabase();
          renderTabs();
      }
  } else if (appState === "DICTIONARY") {
      if (!db.dictCategories) db.dictCategories = ["General"];
      const fromIdx = db.dictCategories.indexOf(draggedTabName);
      const toIdx = db.dictCategories.indexOf(targetName);
      if (fromIdx > -1 && toIdx > -1) {
          const item = db.dictCategories.splice(fromIdx, 1)[0];
          db.dictCategories.splice(toIdx, 0, item);
          saveDatabase();
          renderTabs();
      }
  }
  draggedTabName = "";
}

function renderTabs() {
  if(appState === "DOSSIERS" || appState === "GRAPH" || appState === "PLAYBOOKS") return; 
  const container = document.getElementById("mainTabs");
  container.innerHTML = "";

  if (appState === "INTELLIGENCE") {
    
    // 1. ALL INTELLIGENCE TAB
    const allIntelBtn = document.createElement("button");
    allIntelBtn.innerHTML = `<span>All Intelligence</span>`;
    allIntelBtn.className = `px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${currentWorkspace === "All" ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'}`;
    allIntelBtn.onclick = () => { 
        currentWorkspace = "All"; 
        document.getElementById("formWsLabel").innerText = "General Market"; 
        document.getElementById("printIntelTitle").innerText = "All Intelligence"; 
        selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        renderTabs(); 
        renderFeed(); 
    };
    container.appendChild(allIntelBtn);

    if (currentWorkspace !== "All") document.getElementById("printIntelTitle").innerText = currentWorkspace;

    // 2. RENDER WORKSPACES
    db.workspaces.forEach(ws => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, ws);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, ws);

      if (ws === currentWorkspace && !["General Market", "Interview Vault"].includes(ws)) {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${ws}</span><span onclick="manageWorkspace('${ws}', event, 'intel')" class="bg-indigo-200 text-indigo-800 hover:bg-indigo-300 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm print:hidden">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${ws === "Interview Vault" ? '⭐ ' + ws : ws}</span>`; 
      }

      btn.className = `tab-draggable px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${ws === currentWorkspace ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'}`;
      btn.onclick = (e) => { 
        if (e.target.closest('span[onclick]')) return; 
        currentWorkspace = ws; 
        document.getElementById("formWsLabel").innerText = ws; 
        document.getElementById("printIntelTitle").innerText = ws; 
        selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        renderTabs(); 
        renderFeed(); 
      };
      container.appendChild(btn);
    });

    const newWsBtn = document.createElement("button");
    newWsBtn.innerText = "+ New Tab";
    newWsBtn.className = "px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 whitespace-nowrap print:hidden";
    newWsBtn.onclick = () => { 
      const name = prompt("New Intelligence Tab Name:"); 
      if (name && !db.workspaces.includes(name)) { 
        db.workspaces.push(name); 
        saveDatabase(); 
        renderTabs(); 
      } 
    };
    container.appendChild(newWsBtn);

  } else if (appState === "CONCEPTS") {
    
    // 1. ALL CONCEPTS TAB
    const allConceptBtn = document.createElement("button");
    allConceptBtn.innerHTML = `<span>All Concepts</span>`;
    allConceptBtn.className = `px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${currentConceptCategory === "All" ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-gray-200'}`;
    allConceptBtn.onclick = () => { 
        currentConceptCategory = "All"; 
        document.getElementById("formConceptLabel").innerText = db.conceptCategories[0] || "General"; 
        document.getElementById("printConceptTitle").innerText = "All Concepts"; 
        selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        filterReviewDue = false; 
        renderTabs(); 
        renderConcepts(); 
    };
    container.appendChild(allConceptBtn);

    if (currentConceptCategory !== "All") document.getElementById("printConceptTitle").innerText = currentConceptCategory;
    
    // 2. RENDER CATEGORIES
    db.conceptCategories.forEach(cat => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, cat);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, cat);

      if (cat === currentConceptCategory && cat !== "Interview Vault") {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${cat}</span><span onclick="manageWorkspace('${cat}', event, 'concept')" class="bg-blue-200 text-blue-800 hover:bg-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm print:hidden">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${cat === "Interview Vault" ? '⭐ ' + cat : cat}</span>`; 
      }

      btn.className = `tab-draggable px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${cat === currentConceptCategory ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-gray-200'}`;
      btn.onclick = (e) => { 
        if (e.target.closest('span[onclick]')) return; 
        currentConceptCategory = cat; 
        document.getElementById("formConceptLabel").innerText = cat; 
        document.getElementById("printConceptTitle").innerText = cat; 
        selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        filterReviewDue = false; 
        renderTabs(); 
        renderConcepts(); 
      };
      container.appendChild(btn);
    });

    const newCatBtn = document.createElement("button");
    newCatBtn.innerText = "+ New Category";
    newCatBtn.className = "px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 whitespace-nowrap print:hidden";
    newCatBtn.onclick = () => { 
      const name = prompt("Category Name:"); 
      if (name && !db.conceptCategories.includes(name)) { 
        db.conceptCategories.push(name); 
        saveDatabase(); 
        renderTabs(); 
      } 
    };
    container.appendChild(newCatBtn);

  } else if (appState === "DICTIONARY") {
    
    // Ensure Dictionary DB arrays exist
    if (!db.dictCategories || db.dictCategories.length === 0) {
      db.dictCategories = ["General", "Corporate / M&A", "Capital Markets", "Dispute Resolution", "Private Wealth"];
    }
    if (!window.currentDictCategory) {
      window.currentDictCategory = db.dictCategories[0] || "General";
    }

    // DYNAMICALLY SYNC SIDEBAR DROPDOWN & AUTO-ASSIGN
    const dictCatSelect = document.getElementById("dictCategory");
    if (dictCatSelect) {
        dictCatSelect.innerHTML = db.dictCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        dictCatSelect.value = window.currentDictCategory !== "All" ? window.currentDictCategory : (db.dictCategories[0] || "General");
    }

    const allBtn = document.createElement("button");
    allBtn.innerHTML = `<span>All Terms</span>`;
    allBtn.className = `px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${window.currentDictCategory === "All" ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-gray-200'}`;
    allBtn.onclick = () => { 
        window.currentDictCategory = "All"; 
        if (typeof selectedDictionary !== 'undefined') selectedDictionary.clear();
        renderTabs(); 
        renderDictionary(); 
    };
    container.appendChild(allBtn);

    db.dictCategories.forEach(cat => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, cat);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, cat);

      if (cat === window.currentDictCategory && cat !== "General") {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${cat}</span><span onclick="manageWorkspace('${cat}', event, 'dict')" class="bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm print:hidden">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${cat}</span>`; 
      }

      btn.className = `tab-draggable px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap border ${cat === window.currentDictCategory ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-gray-200'}`;
      btn.onclick = (e) => { 
        if (e.target.closest('span[onclick]')) return; 
        window.currentDictCategory = cat; 
        if (typeof selectedDictionary !== 'undefined') selectedDictionary.clear(); 
        renderTabs(); 
        renderDictionary(); 
      };
      container.appendChild(btn);
    });

    const newCatBtn = document.createElement("button");
    newCatBtn.innerText = "+ New Category";
    newCatBtn.className = "px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 whitespace-nowrap print:hidden";
    newCatBtn.onclick = () => { 
      const name = prompt("Dictionary Category Name:"); 
      if (name && !db.dictCategories.includes(name)) { 
        db.dictCategories.push(name); 
        saveDatabase(); 
        renderTabs(); 
      } 
    };
    container.appendChild(newCatBtn);
  }
}

function manageWorkspace(oldName, event, type) {
  event.stopPropagation(); 
  const action = prompt(`Manage Tab: "${oldName}"\n\nType a NEW NAME below to rename it, or type DELETE to remove this tab entirely.`);
  if (!action) return; 
  const input = action.trim();
  
  if (type === 'intel') {
    if (input.toUpperCase() === "DELETE") {
      if (confirm(`Delete the "${oldName}" tab? (Factors remain in database).`)) {
        db.workspaces = db.workspaces.filter(w => w !== oldName); 
        currentWorkspace = "General Market"; 
        document.getElementById("formWsLabel").innerText = currentWorkspace; 
        selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        saveDatabase(); 
        renderTabs(); 
        renderFeed(); 
      }
    } else if (input !== oldName && !db.workspaces.includes(input)) {
      const index = db.workspaces.indexOf(oldName);
      if (index > -1) db.workspaces[index] = input;
      db.factors.forEach(f => { if (f.workspace === oldName) f.workspace = input; });
      currentWorkspace = input; 
      document.getElementById("formWsLabel").innerText = currentWorkspace; 
      saveDatabase(); 
      renderTabs(); 
      renderFeed();
    }
  } else if (type === 'concept') {
    if (input.toUpperCase() === "DELETE") {
      if (confirm(`Delete the "${oldName}" category? (Concepts remain in database).`)) {
        db.conceptCategories = db.conceptCategories.filter(c => c !== oldName); 
        currentConceptCategory = db.conceptCategories[0] || ""; 
        document.getElementById("formConceptLabel").innerText = currentConceptCategory; 
        selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        saveDatabase(); 
        renderTabs(); 
        renderConcepts(); 
      }
    } else if (input !== oldName && !db.conceptCategories.includes(input)) {
      const index = db.conceptCategories.indexOf(oldName);
      if (index > -1) db.conceptCategories[index] = input;
      db.concepts.forEach(c => { if (c.category === oldName) c.category = input; });
      currentConceptCategory = input; 
      document.getElementById("formConceptLabel").innerText = currentConceptCategory; 
      saveDatabase(); 
      renderTabs(); 
      renderConcepts();
    }
  } else if (type === 'dict') {
    if (input.toUpperCase() === "DELETE") {
      if (confirm(`Delete the "${oldName}" category? (Terms remain in database, moving to General).`)) {
        db.dictCategories = db.dictCategories.filter(c => c !== oldName); 
        window.currentDictCategory = db.dictCategories[0] || "General"; 
        if (typeof selectedDictionary !== 'undefined') selectedDictionary.clear();
        
        db.dictionary.forEach(d => { if (d.category === oldName) d.category = "General"; });
        
        saveDatabase(); 
        renderTabs(); 
        renderDictionary(); 
      }
    } else if (input !== oldName && !db.dictCategories.includes(input)) {
      const index = db.dictCategories.indexOf(oldName);
      if (index > -1) db.dictCategories[index] = input;
      db.dictionary.forEach(d => { if (d.category === oldName) d.category = input; });
      window.currentDictCategory = input; 
      saveDatabase(); 
      renderTabs(); 
      renderDictionary();
    }
  }
}

function toggleSelectAll(mode) {
  if (mode === 'intel') {
      const allSelected = currentVisibleFactorIndices.every(i => selectedFactors.has(i));
      currentVisibleFactorIndices.forEach(i => allSelected ? selectedFactors.delete(i) : selectedFactors.add(i));
      if (typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
      renderFeed();
  } else if (mode === 'dictionary') {
      const allSelected = currentVisibleDictIndices.every(i => selectedDictionary.has(i));
      currentVisibleDictIndices.forEach(i => allSelected ? selectedDictionary.delete(i) : selectedDictionary.add(i));
      renderDictionary();
  } else {
      const allSelected = currentVisibleConceptIndices.every(i => selectedConcepts.has(i));
      currentVisibleConceptIndices.forEach(i => allSelected ? selectedConcepts.delete(i) : selectedConcepts.add(i));
      if (typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
      renderConcepts();
  }
}

function formatDateString(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}