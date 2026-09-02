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
  try {
      appState = newState;
      
      const sidebarBtns = {
          'DASHBOARD': document.getElementById('btnSideDashboard'),
          'CONCEPTS': document.getElementById('btnSideConcepts'),
          'INTELLIGENCE': document.getElementById('btnSideIntel'),
          'DOSSIERS': document.getElementById('btnSideDossiers'),
          'DICTIONARY': document.getElementById('btnSideDictionary'),
          'PLAYBOOKS': document.getElementById('btnSidePlaybooks'),
          'GRAPH': document.getElementById('btnSideGraph'),
          'SETTINGS': document.getElementById('btnSideSettings'),
          'VAULT': document.getElementById('btnSideVault')
      };

      const mobBtns = {
          'DASHBOARD': document.getElementById("mobNavDashboard"),
          'INTELLIGENCE': document.getElementById("mobNavIntel"),
          'CONCEPTS': document.getElementById("mobNavConcepts"),
          'DOSSIERS': document.getElementById("mobNavDossiers"),
          'DICTIONARY': document.getElementById("mobNavDict"),
          'PLAYBOOKS': document.getElementById("mobNavPlaybooks"),
          'GRAPH': document.getElementById("mobNavGraph")
      };

      const apps = {
          'DASHBOARD': document.getElementById("appDashboard"),
          'INTELLIGENCE': document.getElementById("appIntelligence"),
          'CONCEPTS': document.getElementById("appConcepts"),
          'DOSSIERS': document.getElementById("appDossiers"),
          'DICTIONARY': document.getElementById("appDictionary"),
          'PLAYBOOKS': document.getElementById("appPlaybooks"),
          'GRAPH': document.getElementById("appGraph"),
          'SETTINGS': document.getElementById("appSettings"),
          'VAULT': document.getElementById("appVault")
      };
      
      const mainTabsWrapper = document.getElementById("mainTabsWrapper");
      const rssBtn = document.getElementById("rssBtn");

      // Reset Buttons
      Object.values(sidebarBtns).forEach(btn => {
          if (btn) btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition";
      });
      Object.values(mobBtns).forEach(btn => {
          if (btn) btn.className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white border-t-2 border-transparent flex flex-col items-center gap-1 transition -mt-px";
      });

      // Aggressive Hide All Apps
      Object.values(apps).forEach(app => { 
          if (app) { 
              app.style.display = 'none'; 
              app.style.opacity = '0';
              app.classList.add("hidden"); 
              app.classList.remove("flex", "block");
          }
      });

      ["intelLogSidebar", "conceptLogSidebar", "dossierSidebar", "playbooksSidebar", "dictSidebar"].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.classList.add('-translate-x-full');
      });

      // Set Active Buttons
      if (sidebarBtns[newState]) {
          sidebarBtns[newState].className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold bg-indigo-600 text-white shadow-sm transition";
      }
      if (mobBtns[newState]) {
          mobBtns[newState].className = "flex-1 pt-3 pb-2 text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 flex flex-col items-center gap-1 transition -mt-px";
      }
      
      // Aggressive Show Active App
      if (apps[newState]) {
          apps[newState].classList.remove("hidden");
          apps[newState].style.opacity = '1';
          if (newState === "DASHBOARD" || newState === "SETTINGS" || newState === "VAULT") {
              apps[newState].style.display = 'block';
              apps[newState].classList.add("block");
          } else {
              apps[newState].style.display = 'flex';
              apps[newState].classList.add("flex");
          }
      }

      if (rssBtn) rssBtn.style.display = "none";
      if (mainTabsWrapper) {
          mainTabsWrapper.style.display = "none";
          mainTabsWrapper.classList.add("hidden");
      }

      if (newState === "DASHBOARD") {
          if (typeof renderDashboard === 'function') renderDashboard();
      }
      else if (newState === "INTELLIGENCE") {
          currentWorkspace = "All"; 
          if (mainTabsWrapper) {
              mainTabsWrapper.style.display = "block";
              mainTabsWrapper.classList.remove("hidden");
          }
          if (rssBtn) rssBtn.style.display = "flex";
          const sortEl = document.getElementById("sortFeed");
          if (sortEl) sortEl.value = uiPrefs.intelSort || "newest";
          if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns(); 
          renderTabs(); renderFeed();
      } 
      else if (newState === "CONCEPTS") {
          currentConceptCategory = "All";
          if (mainTabsWrapper) {
              mainTabsWrapper.style.display = "block";
              mainTabsWrapper.classList.remove("hidden");
          }
          const sortEl = document.getElementById("sortConcepts");
          if (sortEl) sortEl.value = uiPrefs.conceptSort || "newest";
          renderTabs(); renderConcepts();
      } 
      else if (newState === "DOSSIERS") {
          const sortEl = document.getElementById("sortDossiers");
          if (sortEl) sortEl.value = dossierSortMode || "deadline";
          renderDossierList();
      } 
      else if (newState === "PLAYBOOKS") {
          if (typeof renderPlaybookList === 'function') renderPlaybookList();
      }
      else if (newState === "DICTIONARY") {
          if (mainTabsWrapper) {
              mainTabsWrapper.style.display = "block";
              mainTabsWrapper.classList.remove("hidden");
          }
          const sortEl = document.getElementById("sortDictionary");
          if (sortEl) sortEl.value = uiPrefs.dictSort || "az";
          renderTabs(); renderDictionary();
      }
      else if (newState === "GRAPH") {
          if(typeof renderNexusGraph === 'function') setTimeout(renderNexusGraph, 50);
      }
      else if (newState === "VAULT") {
          if (mainTabsWrapper) {
              mainTabsWrapper.style.display = "block";
              mainTabsWrapper.classList.remove("hidden");
          }
          renderTabs();
          if (typeof window.renderVault === 'function') window.renderVault();
      }
      
  } catch (err) {
      console.error("Critical FSM Routing Error:", err);
  }
}

function toggleGlobalCollapse(type, forceOpen) {
  const containerId = type === 'intel' ? '#cardsContainer' : '#conceptsContainer';
  const dataList = type === 'intel' ? db.factors : db.concepts;
  
  if (!dataList) return;
  
  // 1. Update In-Memory State
  dataList.forEach(item => { if (item) item.isCollapsed = !forceOpen; });

  // 2. Direct DOM mutation without full re-render
  const container = document.querySelector(containerId);
  if (container) {
    const bodies = container.querySelectorAll('.nexus-body');
    const icons = container.querySelectorAll('.nexus-icon i');
    
    bodies.forEach(b => forceOpen ? b.classList.remove('hidden') : b.classList.add('hidden'));
    icons.forEach(i => i.setAttribute('data-lucide', forceOpen ? 'chevron-up' : 'chevron-down'));
    
    if (window.lucide) window.lucide.createIcons();
  }

  if (typeof saveToLocalCache === 'function') saveToLocalCache();
}

function routeToFirm(firmName) {
  if (typeof closeOmnibar === 'function') closeOmnibar();
  if(db.targetFirms && db.targetFirms.includes(firmName)) {
      currentDossierFirm = firmName;
      switchState('DOSSIERS');
  }
}

function routeToConcept(conceptName) {
  if (typeof closeOmnibar === 'function') closeOmnibar();
  const cleanSearchTerm = String(conceptName).trim().toLowerCase();
  const concept = (db.concepts || []).find(c => c && String(c.title || "").trim().toLowerCase() === cleanSearchTerm);

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
  if(appState === "DOSSIERS" || appState === "GRAPH" || appState === "PLAYBOOKS" || appState === "DASHBOARD" || appState === "SETTINGS") return; 
  const container = document.getElementById("mainTabs");
  if (!container) return;
  container.innerHTML = "";

  const activeClass = "px-4 py-3 text-xs md:text-sm font-bold whitespace-nowrap border-b-[3px] border-indigo-600 text-indigo-600 dark:text-indigo-400 transition-all uppercase tracking-wider";
  const inactiveClass = "px-4 py-3 text-xs md:text-sm font-semibold whitespace-nowrap border-b-[3px] border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all uppercase tracking-wider";

  if (appState === "INTELLIGENCE") {
    
    const allIntelBtn = document.createElement("button");
    allIntelBtn.innerHTML = `<span>All Intelligence</span>`;
    allIntelBtn.className = currentWorkspace === "All" ? activeClass : inactiveClass;
    allIntelBtn.onclick = () => { 
        currentWorkspace = "All"; 
        const wsLabel = document.getElementById("formWsLabel"); if(wsLabel) wsLabel.innerText = "General Market"; 
        const titleLabel = document.getElementById("printIntelTitle"); if(titleLabel) titleLabel.innerText = "All Intelligence"; 
        if(typeof selectedFactors !== 'undefined') selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        renderTabs(); 
        renderFeed(); 
    };
    container.appendChild(allIntelBtn);

    if (currentWorkspace !== "All") {
        const titleEl = document.getElementById("printIntelTitle");
        if(titleEl) titleEl.innerText = currentWorkspace;
    }

    (db.workspaces || []).forEach(ws => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, ws);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, ws);

      if (ws === currentWorkspace && !["General Market", "Interview Vault"].includes(ws)) {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${ws}</span><span onclick="manageWorkspace('${ws.replace(/'/g, "\\'")}', event, 'intel')" class="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm print:hidden transition">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${ws}</span>`; 
      }

      btn.className = ws === currentWorkspace ? activeClass : inactiveClass;
      btn.onclick = (e) => { 
        if (e.target.closest('span[onclick]')) return; 
        currentWorkspace = ws; 
        const wsLabel = document.getElementById("formWsLabel"); if(wsLabel) wsLabel.innerText = ws; 
        const titleLabel = document.getElementById("printIntelTitle"); if(titleLabel) titleLabel.innerText = ws; 
        if(typeof selectedFactors !== 'undefined') selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        renderTabs(); 
        renderFeed(); 
      };
      container.appendChild(btn);
    });

    const newWsBtn = document.createElement("button");
    newWsBtn.innerText = "+ New Tab";
    newWsBtn.className = inactiveClass + " text-indigo-500 hover:text-indigo-700 dark:text-indigo-400";
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
    
    const allConceptBtn = document.createElement("button");
    allConceptBtn.innerHTML = `<span>All Concepts</span>`;
    allConceptBtn.className = currentConceptCategory === "All" ? activeClass : inactiveClass;
    allConceptBtn.onclick = () => { 
        currentConceptCategory = "All"; 
        const conceptLabel = document.getElementById("formConceptLabel"); if(conceptLabel) conceptLabel.innerText = db.conceptCategories[0] || "General"; 
        const titleLabel = document.getElementById("printConceptTitle"); if(titleLabel) titleLabel.innerText = "All Concepts"; 
        if(typeof selectedConcepts !== 'undefined') selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        filterReviewDue = false; 
        renderTabs(); 
        renderConcepts(); 
    };
    container.appendChild(allConceptBtn);

    if (currentConceptCategory !== "All") {
        const titleEl = document.getElementById("printConceptTitle");
        if(titleEl) titleEl.innerText = currentConceptCategory;
    }
    
    (db.conceptCategories || []).forEach(cat => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, cat);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, cat);

      if (cat === currentConceptCategory && cat !== "Interview Vault") {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${cat}</span><span onclick="manageWorkspace('${cat.replace(/'/g, "\\'")}', event, 'concept')" class="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm print:hidden transition">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${cat}</span>`; 
      }

      btn.className = cat === currentConceptCategory ? activeClass : inactiveClass;
      btn.onclick = (e) => { 
        if (e.target.closest('span[onclick]')) return; 
        currentConceptCategory = cat; 
        const conceptLabel = document.getElementById("formConceptLabel"); if(conceptLabel) conceptLabel.innerText = cat; 
        const titleLabel = document.getElementById("printConceptTitle"); if(titleLabel) titleLabel.innerText = cat; 
        if(typeof selectedConcepts !== 'undefined') selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        filterReviewDue = false; 
        renderTabs(); 
        renderConcepts(); 
      };
      container.appendChild(btn);
    });

    const newCatBtn = document.createElement("button");
    newCatBtn.innerText = "+ New Category";
    newCatBtn.className = inactiveClass + " text-indigo-500 hover:text-indigo-700 dark:text-indigo-400";
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
    
    if (!db.dictCategories || db.dictCategories.length === 0) {
      db.dictCategories = ["General", "Corporate / M&A", "Capital Markets", "Dispute Resolution", "Private Wealth"];
    }
    if (!window.currentDictCategory) {
      window.currentDictCategory = db.dictCategories[0] || "General";
    }

    const dictCatSelect = document.getElementById("dictCategory");
    if (dictCatSelect) {
        dictCatSelect.innerHTML = db.dictCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        dictCatSelect.value = window.currentDictCategory !== "All" ? window.currentDictCategory : (db.dictCategories[0] || "General");
    }

    const allBtn = document.createElement("button");
    allBtn.innerHTML = `<span>All Terms</span>`;
    allBtn.className = window.currentDictCategory === "All" ? activeClass : inactiveClass;
    allBtn.onclick = () => { 
        window.currentDictCategory = "All"; 
        if (typeof selectedDictionary !== 'undefined') selectedDictionary.clear();
        renderTabs(); 
        renderDictionary(); 
    };
    container.appendChild(allBtn);

    (db.dictCategories || []).forEach(cat => {
      const btn = document.createElement("button");
      btn.draggable = true;
      btn.ondragstart = (e) => handleTabDragStart(e, cat);
      btn.ondragend = (e) => handleTabDragEnd(e);
      btn.ondragover = (e) => handleTabDragOver(e);
      btn.ondragleave = (e) => handleTabDragLeave(e);
      btn.ondrop = (e) => handleTabDrop(e, cat);

      if (cat === window.currentDictCategory && cat !== "General") {
        btn.innerHTML = `<div class="flex items-center gap-2"><span>${cat}</span><span onclick="manageWorkspace('${cat.replace(/'/g, "\\'")}', event, 'dict')" class="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm print:hidden transition">⚙️</span></div>`;
      } else { 
        btn.innerHTML = `<span>${cat}</span>`; 
      }

      btn.className = cat === window.currentDictCategory ? activeClass : inactiveClass;
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
    newCatBtn.className = inactiveClass + " text-indigo-500 hover:text-indigo-700 dark:text-indigo-400";
    newCatBtn.onclick = () => { 
      const name = prompt("Dictionary Category Name:"); 
      if (name && !db.dictCategories.includes(name)) { 
        db.dictCategories.push(name); 
        saveDatabase(); 
        renderTabs(); 
      } 
    };
    container.appendChild(newCatBtn);
    
  } else if (appState === "VAULT") {
      // Generate Global Tabs for the Vault
      (window.vaultTabs || []).forEach(tab => {
          const btn = document.createElement("button");
          btn.innerHTML = `<span>${tab}</span>`;
          btn.className = tab === window.activeVaultTab ? activeClass : inactiveClass;
          btn.onclick = () => {
              window.activeVaultTab = tab;
              renderTabs();
              if (typeof window.renderVault === 'function') window.renderVault();
          };
          container.appendChild(btn);
      });
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
        const wsLabel = document.getElementById("formWsLabel"); if(wsLabel) wsLabel.innerText = currentWorkspace; 
        if(typeof selectedFactors !== 'undefined') selectedFactors.clear(); 
        if(typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
        saveDatabase(); 
        renderTabs(); 
        renderFeed(); 
      }
    } else if (input !== oldName && !db.workspaces.includes(input)) {
      const index = db.workspaces.indexOf(oldName);
      if (index > -1) db.workspaces[index] = input;
      db.factors.forEach(f => { if (f && f.workspace === oldName) f.workspace = input; });
      currentWorkspace = input; 
      const wsLabel = document.getElementById("formWsLabel"); if(wsLabel) wsLabel.innerText = currentWorkspace; 
      saveDatabase(); 
      renderTabs(); 
      renderFeed();
    }
  } else if (type === 'concept') {
    if (input.toUpperCase() === "DELETE") {
      if (confirm(`Delete the "${oldName}" category? (Concepts remain in database).`)) {
        db.conceptCategories = db.conceptCategories.filter(c => c !== oldName); 
        currentConceptCategory = db.conceptCategories[0] || ""; 
        const cLabel = document.getElementById("formConceptLabel"); if(cLabel) cLabel.innerText = currentConceptCategory; 
        if(typeof selectedConcepts !== 'undefined') selectedConcepts.clear(); 
        if(typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
        saveDatabase(); 
        renderTabs(); 
        renderConcepts(); 
      }
    } else if (input !== oldName && !db.conceptCategories.includes(input)) {
      const index = db.conceptCategories.indexOf(oldName);
      if (index > -1) db.conceptCategories[index] = input;
      db.concepts.forEach(c => { if (c && c.category === oldName) c.category = input; });
      currentConceptCategory = input; 
      const cLabel = document.getElementById("formConceptLabel"); if(cLabel) cLabel.innerText = currentConceptCategory; 
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
        
        db.dictionary.forEach(d => { if (d && d.category === oldName) d.category = "General"; });
        
        saveDatabase(); 
        renderTabs(); 
        renderDictionary(); 
      }
    } else if (input !== oldName && !db.dictCategories.includes(input)) {
      const index = db.dictCategories.indexOf(oldName);
      if (index > -1) db.dictCategories[index] = input;
      db.dictionary.forEach(d => { if (d && d.category === oldName) d.category = input; });
      window.currentDictCategory = input; 
      saveDatabase(); 
      renderTabs(); 
      renderDictionary();
    }
  }
}

function toggleSelectAll(mode) {
  let containerId, indexList, selectedSet;

  if (mode === 'intel') {
    containerId = '#cardsContainer';
    indexList = currentVisibleFactorIndices;
    selectedSet = selectedFactors;
  } else if (mode === 'dictionary') {
    containerId = '#dictionaryContainer';
    indexList = currentVisibleDictIndices;
    selectedSet = window.selectedDictionary;
  } else {
    containerId = '#conceptsContainer';
    indexList = currentVisibleConceptIndices;
    selectedSet = window.selectedConcepts;
  }

  if (!indexList || !selectedSet) return;

  const allSelected = indexList.every(i => selectedSet.has(i));
  const newCheckedState = !allSelected;

  // 1. Update State Set
  indexList.forEach(i => {
    if (newCheckedState) selectedSet.add(i);
    else selectedSet.delete(i);
  });

  // 2. Mutate on-screen checkboxes directly (No page reload)
  const container = document.querySelector(containerId);
  if (container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.checked = newCheckedState; });
  }

  // 3. Update counter buttons
  if (mode === 'intel' && typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
  if (mode === 'concepts' && typeof updateMassDeleteConceptBtn === 'function') updateMassDeleteConceptBtn();
  if (mode === 'dictionary' && typeof updateMassDeleteDictBtn === 'function') updateMassDeleteDictBtn();
}

function formatDateString(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}