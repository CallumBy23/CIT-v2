window.toggleDarkMode = function() {
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        htmlEl.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
};

window.toggleAppSidebar = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.innerWidth >= 768) {
        el.classList.toggle('md:hidden'); 
        el.classList.toggle('md:flex');
    } else {
        el.classList.toggle('-translate-x-full');
    }
};

window.saveConceptEditFn = function() {
    const idxStr = document.getElementById('editConceptIndex').value;
    if (!idxStr) {
        alert("Error: No concept selected for editing.");
        return;
    }
    const idx = parseInt(idxStr, 10);
    
    if (db.concepts && db.concepts[idx]) {
        db.concepts[idx].title = document.getElementById('editConceptTitle').value;
        db.concepts[idx].subTag = document.getElementById('editConceptSubTag').value;
        
        const catEl = document.getElementById('editConceptCategory');
        if (catEl) {
            db.concepts[idx].category = catEl.value;
        }
        
        if (typeof editQuillEditor !== 'undefined') {
            db.concepts[idx].body = editQuillEditor.root.innerHTML;
        }
        
        if(typeof saveDatabase === 'function') saveDatabase();
        if (typeof renderConcepts === 'function') renderConcepts();
        document.getElementById('editConceptModalContainer').classList.add('hidden');
    }
};

window.recordActivity = function() {
    let streakData = JSON.parse(localStorage.getItem('LEGAL_NEXUS_STREAK') || '{"count": 0, "last": ""}');
    const today = new Date().toISOString().split('T')[0];
    
    if (streakData.last !== today) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (streakData.last === yesterdayStr) {
            streakData.count++;
        } else {
            streakData.count = 1; 
        }
        streakData.last = today;
        localStorage.setItem('LEGAL_NEXUS_STREAK', JSON.stringify(streakData));
    }
    document.getElementById('streakCount').innerText = streakData.count;
};

window.initStreak = function() {
    let streakData = JSON.parse(localStorage.getItem('LEGAL_NEXUS_STREAK') || '{"count": 0, "last": ""}');
    const today = new Date().toISOString().split('T')[0];
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streakData.last !== today && streakData.last !== yesterdayStr) {
        streakData.count = 0; 
    }
    document.getElementById('streakCount').innerText = streakData.count;
};

window.runAutoTagger = function(text) {
    if(!text) return;
    const firmMatches = [...text.matchAll(/@([A-Za-z0-9_]+)/g)];
    const conceptMatches = [...text.matchAll(/#([A-Za-z0-9_]+)/g)];
    
    if (firmMatches.length > 0) {
        const el = document.getElementById('logLinkedFirm');
        if(el) el.value = firmMatches[firmMatches.length - 1][1].replace(/_/g, " ");
    }
    if (conceptMatches.length > 0) {
        const el = document.getElementById('logLinkedConcept');
        if(el) el.value = conceptMatches[conceptMatches.length - 1][1].replace(/_/g, " ");
    }
};

window.routeToFirm = function(firmName) {
    if (typeof closeOmnibar === 'function') closeOmnibar();
    const cleanName = String(firmName).trim().toLowerCase();
    
    let foundFirm = (db.targetFirms || []).find(f => f.toLowerCase() === cleanName);
    if (!foundFirm) {
        const dossierKeys = Object.keys(db.dossiers || {});
        foundFirm = dossierKeys.find(f => f.toLowerCase() === cleanName);
    }
    
    if(foundFirm) {
        currentDossierFirm = foundFirm;
        switchState('DOSSIERS');
        if (typeof renderStrategyRoom === 'function') renderStrategyRoom();
        if (typeof renderDossierView === 'function') renderDossierView();
    } else {
        const searchBox = document.getElementById("searchFirms");
        if (searchBox) searchBox.value = firmName;
        switchState('DOSSIERS');
        if (typeof renderDossierList === 'function') renderDossierList();
    }
};

window.routeToConcept = function(conceptName) {
    if (typeof closeOmnibar === 'function') closeOmnibar();
    const cleanSearchTerm = String(conceptName).trim().toLowerCase();
    const concept = (db.concepts || []).find(c => (c.title || "").trim().toLowerCase() === cleanSearchTerm);

    if (typeof currentConceptCategory !== 'undefined') currentConceptCategory = "All"; 

    const searchBox = document.getElementById("searchConcepts");
    if (searchBox) searchBox.value = concept ? concept.title : conceptName;

    switchState('CONCEPTS');
    if (typeof renderConcepts === 'function') renderConcepts();
    if (typeof renderTabs === 'function') renderTabs();
};

window.openQuickAdd = function() {
    document.getElementById('qaTitle').value = "";
    document.getElementById('qaBody').value = "";
    document.getElementById('quickAddModal').classList.remove('hidden');
    document.getElementById('quickAddModal').classList.add('flex');
    document.getElementById('qaTitle').focus();
};

window.saveQuickAdd = function() {
    const type = document.getElementById('qaType').value;
    const title = document.getElementById('qaTitle').value.trim();
    const body = document.getElementById('qaBody').value.trim();
    
    if (!title) return alert("Title required.");
    
    if (type === 'intel') {
        db.factors.unshift({ id: Date.now(), title, description: body, workspace: "General Market", date: new Date().getTime(), linkedConcept: "", linkedFirm: "", pestle: "", region: "", implication: "", metric: "" });
    } else if (type === 'concept') {
        db.concepts.unshift({ id: Date.now(), title, body, category: "General", subTag: "", srs: { nextReview: new Date().getTime(), interval: 1, ease: 2.5 } });
    } else if (type === 'dict') {
        db.dictionary.unshift({ id: Date.now(), term: title, definition: body, category: "General", srs: { nextReview: new Date().getTime(), interval: 1, ease: 2.5 } });
    }
    
    if(typeof saveDatabase === 'function') saveDatabase();
    
    document.getElementById('quickAddModal').classList.add('hidden');
    document.getElementById('quickAddModal').classList.remove('flex');
    if(typeof showToast === 'function') showToast("Quick Add saved successfully!", "success");
    
    if(appState === 'INTELLIGENCE' && typeof renderFeed === 'function') renderFeed();
    if(appState === 'CONCEPTS' && typeof renderConcepts === 'function') renderConcepts();
    if(appState === 'DICTIONARY' && typeof renderDictionary === 'function') renderDictionary();
};

window.onload = async () => {
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark' || (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
  }
  initStreak();

  if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => console.log('Service Worker failed:', err));
  }

  const cachedPrefs = localStorage.getItem('LEGAL_NEXUS_UIPREFS');
  if (cachedPrefs) {
      try { 
          uiPrefs = { ...uiPrefs, ...JSON.parse(cachedPrefs) }; 
          dossierSortMode = uiPrefs.dossierSort || "deadline";
      } catch(e){}
  }

  try {
      const initQuill = (selector, options) => {
          const el = document.querySelector(selector);
          return el ? new Quill(el, options) : null;
      };

      quillEditor = initQuill('#conceptBodyQuill', { modules: { toolbar: '#quillToolbar' }, theme: 'snow' });
      editQuillEditor = initQuill('#editConceptBodyQuill', { modules: { toolbar: '#editConceptToolbar' }, theme: 'snow' });
      
      cultureQuill = initQuill('#dossierCultureQuill', { modules: { toolbar: '#toolbar-culture' }, theme: 'snow' });
      personalWhyQuill = initQuill('#dossierPersonalWhyQuill', { modules: { toolbar: '#toolbar-personal-why' }, theme: 'snow' });
      compModalQuill = initQuill('#compModalQuill', { modules: { toolbar: '#toolbar-comp-modal' }, theme: 'snow' });
      practiceQuill = initQuill('#practiceModalQuill', { modules: { toolbar: '#toolbar-practice-modal' }, theme: 'snow' });
      clientsQuill = initQuill('#clientsModalQuill', { modules: { toolbar: '#toolbar-clients-modal' }, theme: 'snow' });

      intelLogQuill = initQuill('#logContextQuill', { modules: { toolbar: '#toolbar-intel-log' }, theme: 'snow', placeholder: 'Commercial Context & Facts...' });
      intelEditDescQuill = initQuill('#editDescriptionQuill', { modules: { toolbar: '#toolbar-intel-edit-desc' }, theme: 'snow' });
      intelEditImplQuill = initQuill('#editImplicationsQuill', { modules: { toolbar: '#toolbar-intel-edit-impl' }, theme: 'snow' });

      [quillEditor, editQuillEditor, cultureQuill, personalWhyQuill, compModalQuill, practiceQuill, clientsQuill, intelLogQuill, intelEditDescQuill, intelEditImplQuill].forEach(q => {
        if (q) {
            q.root.setAttribute('spellcheck', 'true');
            q.root.setAttribute('lang', 'en-GB');
            if (typeof scheduleAutoSave === 'function') q.on('text-change', scheduleAutoSave);
        }
      });

      if (intelLogQuill) {
          intelLogQuill.on('text-change', () => {
              runAutoTagger(intelLogQuill.getText());
          });
      }

      if (typeof initCanvasEvents === 'function') initCanvasEvents();
      if (typeof initOmnibarListener === 'function') initOmnibarListener();
      if (typeof initAutoSaveListeners === 'function') initAutoSaveListeners();
      
      window.addEventListener('offline', () => setOnlineStatus(false, "Network disconnected."));
      window.addEventListener('online', () => setOnlineStatus(true));
  } catch(e) {
      console.error("Initialization error:", e);
  }
  
  if (typeof saveDatabase === 'function') {
      const originalSaveDatabase = saveDatabase;
      window.saveDatabase = async function() {
          recordActivity();
          return originalSaveDatabase.apply(this, arguments);
      };
  }

  if(typeof window.renderAlphabetBar === 'function') {
      window.renderAlphabetBar('concepts');
      window.renderAlphabetBar('dictionary');
  }

  if(typeof window.updateReverseToggleUI === 'function') window.updateReverseToggleUI();

  switchState("INTELLIGENCE");
  if (typeof loadDatabase === 'function') await loadDatabase();
};