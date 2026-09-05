// MAIN ENTRY & GLOBAL UI HELPERS
// ==========================================

// --- CENTRALIZED QUILL LAZY-LOADER ---
window.getOrInitQuill = function(selector, options = {}) {
    const el = document.querySelector(selector);
    if (!el) return null;
    
    // Return existing cached instance to prevent duplicate toolbars or memory leaks
    if (el.__quillInstance) return el.__quillInstance;

    const defaultOptions = {
        theme: 'snow',
        ...options
    };

    const instance = new Quill(el, defaultOptions);
    
    if (instance && instance.root) {
        instance.root.setAttribute('spellcheck', 'true');
        instance.root.setAttribute('lang', 'en-GB');
        if (typeof scheduleAutoSave === 'function') {
            instance.on('text-change', scheduleAutoSave);
        }
    }

    el.__quillInstance = instance;
    return instance;
};

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

    // Lazy-load sidebars on first reveal
    if (id === 'intelLogSidebar' && !window.intelLogQuill) {
        window.intelLogQuill = window.getOrInitQuill('#logContextQuill', { 
            modules: { toolbar: '#toolbar-intel-log' }, 
            placeholder: 'Commercial Context & Facts...' 
        });
        if (window.intelLogQuill) {
            window.intelLogQuill.on('text-change', () => {
                runAutoTagger(window.intelLogQuill.getText());
            });
        }
    }
    
    if (id === 'conceptLogSidebar' && !window.quillEditor) {
        window.quillEditor = window.getOrInitQuill('#conceptBodyQuill', { 
            modules: { toolbar: '#quillToolbar' } 
        });
    }

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
        
        if (window.editQuillEditor) {
            db.concepts[idx].body = window.editQuillEditor.root.innerHTML;
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
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.innerText = streakData.count;
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
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.innerText = streakData.count;
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
    const cleanName = String(firmName || "").trim().toLowerCase();
    
    let foundFirm = (db.targetFirms || []).find(f => String(f || "").toLowerCase() === cleanName);
    if (!foundFirm) {
        const dossierKeys = Object.keys(db.dossiers || {});
        foundFirm = dossierKeys.find(f => String(f || "").toLowerCase() === cleanName);
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
    const cleanSearchTerm = String(conceptName || "").trim().toLowerCase();
    
    // Find index of concept matching by full title or substring
    const conceptIndex = (db.concepts || []).findIndex(c => {
        if (!c || !c.title) return false;
        const titleClean = String(c.title).trim().toLowerCase();
        return titleClean === cleanSearchTerm || titleClean.includes(cleanSearchTerm) || cleanSearchTerm.includes(titleClean);
    });

    if (typeof currentConceptCategory !== 'undefined') currentConceptCategory = "All"; 

    // Route to CONCEPTS workspace rather than DASHBOARD
    switchState('CONCEPTS');

    if (conceptIndex > -1) {
        // Open the full dedicated detail view directly
        if (typeof window.openConceptDetailWorkspace === 'function') {
            window.openConceptDetailWorkspace(conceptIndex);
        } else if (typeof window.viewConceptDetail === 'function') {
            window.viewConceptDetail(conceptIndex);
        }
    } else {
        const searchBox = document.getElementById("searchConcepts");
        if (searchBox) searchBox.value = conceptName;
        if (typeof renderConcepts === 'function') renderConcepts();
    }

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
        if (typeof initCanvasEvents === 'function') initCanvasEvents();
        if (typeof initOmnibarListener === 'function') initOmnibarListener();
        if (typeof initAutoSaveListeners === 'function') initAutoSaveListeners();
        
        window.addEventListener('offline', () => { if (typeof setOnlineStatus === 'function') setOnlineStatus(false, "Network disconnected."); });
        window.addEventListener('online', () => { if (typeof setOnlineStatus === 'function') setOnlineStatus(true); });
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
  
    switchState("DASHBOARD");
    if (typeof loadDatabase === 'function') await loadDatabase();
};

// --- DYNAMIC THEMING & ACCENT ENGINE WITH WARM PAPER LOCK ---
window.setBaseTheme = function(themeName) {
    const root = document.documentElement;
    const darkToggleBtn = document.querySelector('button[onclick*="toggleDarkMode"]');
    
    if (themeName === 'warm') {
        // Enforce Light Mode strictly for Warm Paper
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'warm');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('nexus_sub_theme', 'warm');

        // Disable and dim the header dark mode button
        if (darkToggleBtn) {
            darkToggleBtn.disabled = true;
            darkToggleBtn.classList.add('opacity-30', 'cursor-not-allowed');
            darkToggleBtn.setAttribute('title', 'Dark mode disabled in Warm Paper mode');
        }
    } else if (themeName === 'dark-balanced') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark-balanced');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('nexus_sub_theme', 'dark-balanced');

        // Re-enable header button
        if (darkToggleBtn) {
            darkToggleBtn.disabled = false;
            darkToggleBtn.classList.remove('opacity-30', 'cursor-not-allowed');
            darkToggleBtn.setAttribute('title', 'Toggle Theme');
        }
    } else {
        // Default Cool Slate (Standard Light Mode)
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'slate');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('nexus_sub_theme', 'slate');

        // Re-enable header button
        if (darkToggleBtn) {
            darkToggleBtn.disabled = false;
            darkToggleBtn.classList.remove('opacity-30', 'cursor-not-allowed');
            darkToggleBtn.setAttribute('title', 'Toggle Theme');
        }
    }
    
    if (typeof showToast === 'function') {
        showToast(`Switched to ${themeName.replace('-', ' ')} mode.`, "info");
    }
};

// Wrap or update the global toggleDarkMode function
const originalToggleDarkMode = window.toggleDarkMode;
window.toggleDarkMode = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Guard: Prevent dark mode activation if currently in warm paper
    if (currentTheme === 'warm') {
        if (typeof showToast === 'function') {
            showToast("Switch to Cool Slate or Midnight Slate to use Dark Mode.", "warning");
        }
        return;
    }
    
    if (typeof originalToggleDarkMode === 'function') {
        originalToggleDarkMode();
    } else {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDark ? 'dark-balanced' : 'slate');
    }
};

window.setAccentColor = function(primaryHex, hoverHex) {
    if (!hoverHex) hoverHex = primaryHex;
    
    // Set root CSS custom properties only - do NOT inject inline styles into buttons
    document.documentElement.style.setProperty('--theme-primary', primaryHex);
    document.documentElement.style.setProperty('--theme-primary-hover', hoverHex);

    localStorage.setItem('nexus_accent_primary', primaryHex);
    localStorage.setItem('nexus_accent_hover', hoverHex);

    // Sync the custom color input without mutating preset dots
    const customPicker = document.getElementById('customColorPicker');
    if (customPicker) customPicker.value = primaryHex;

    if (typeof showToast === 'function') showToast("Accent color updated.", "success");
};

window.initThemeSystem = function() {
    const savedSubTheme = localStorage.getItem('nexus_sub_theme') || 'slate';
    window.setBaseTheme(savedSubTheme);

    const savedPrimary = localStorage.getItem('nexus_accent_primary') || '#2563eb';
    const savedHover = localStorage.getItem('nexus_accent_hover') || '#1d4ed8';
    
    document.documentElement.style.setProperty('--theme-primary', savedPrimary);
    document.documentElement.style.setProperty('--theme-primary-hover', savedHover);

    const customPicker = document.getElementById('customColorPicker');
    if (customPicker) customPicker.value = savedPrimary;
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initThemeSystem === 'function') {
        window.initThemeSystem();
    }
});