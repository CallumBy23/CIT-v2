// GLOBAL UTILITIES & HELPERS
// ==========================================
// TOAST NOTIFICATION ENGINE
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    
    let colors = 'bg-gray-900 border-gray-700 text-white';
    let icon = '🔔';
    
    if (type === 'success') {
        colors = 'bg-emerald-600 border-emerald-700 text-white';
        icon = '✅';
    } else if (type === 'error') {
        colors = 'bg-red-600 border-red-700 text-white';
        icon = '🚨';
    } else if (type === 'info') {
        colors = 'bg-indigo-600 border-indigo-700 text-white';
        icon = 'ℹ️';
    }

    // Base styling with animation starting positions
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${colors} text-sm font-bold transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto max-w-sm whitespace-pre-wrap`;
    toast.innerHTML = `<span class="shrink-0 text-lg">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    // Trigger slide-in animation
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Trigger fade-out and remove from DOM after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Intercept all native alerts to use the Toast system automatically
window.alert = function(message) {
    showToast(message, 'info');
};


function updateNexusDropdowns() {
    const conceptOptions = `<option value="">🔗 Link a Core Concept (Optional)</option>` + 
      (db.concepts || []).filter(c => c.category !== "Interview Vault").map(c => `<option value="${c.title}">${c.title} (${c.category})</option>`).join('');
    document.getElementById("logLinkedConcept").innerHTML = conceptOptions;
    document.getElementById("editLinkedConcept").innerHTML = conceptOptions;
  
    const sortedFirms = [...(db.targetFirms || [])].sort((a,b) => a.localeCompare(b));
    const firmOptions = `<option value="">🏢 Link a Target Firm (Optional)</option>` + 
      sortedFirms.map(f => `<option value="${f}">${f}</option>`).join('');
    document.getElementById("logLinkedFirm").innerHTML = firmOptions;
    document.getElementById("editLinkedFirm").innerHTML = firmOptions;
}

// DEBOUNCED AUTOSAVE ENGINE
function scheduleAutoSave() {
    document.getElementById('statusText').innerText = "Saving...";
    document.getElementById('statusDot').className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";
    
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (appState === "DOSSIERS" && !document.getElementById("dossierEditMode").classList.contains("hidden")) {
            if(currentDossierFirm && db.dossiers[currentDossierFirm]) {
                db.dossiers[currentDossierFirm].firmType = document.getElementById("dossierFirmType").value;
                db.dossiers[currentDossierFirm].locations = document.getElementById("dossierLocations").value;
                db.dossiers[currentDossierFirm].practice = practiceQuill.root.innerHTML;
                db.dossiers[currentDossierFirm].clients = clientsQuill.root.innerHTML;
                db.dossiers[currentDossierFirm].culture = cultureQuill.root.innerHTML;
                
                const sType = document.getElementById("dossierSchemeType").value;
                const oDate = document.getElementById("dossierOpenDate").value;
                const cDate = document.getElementById("dossierCloseDate").value;
                const roll = document.getElementById("dossierRolling").value;
                
                if (!db.dossiers[currentDossierFirm].schemes) db.dossiers[currentDossierFirm].schemes = [];
                if (sType || cDate) {
                    if (db.dossiers[currentDossierFirm].schemes.length > 0) {
                        db.dossiers[currentDossierFirm].schemes[0].schemeType = sType;
                        db.dossiers[currentDossierFirm].schemes[0].openDate = oDate;
                        db.dossiers[currentDossierFirm].schemes[0].closeDate = cDate;
                        db.dossiers[currentDossierFirm].schemes[0].rolling = roll;
                    } else {
                        db.dossiers[currentDossierFirm].schemes.push({
                            category: db.dossiers[currentDossierFirm].firmType,
                            schemeType: sType,
                            openDate: oDate,
                            closeDate: cDate,
                            rolling: roll,
                            applied: false
                        });
                    }
                }
            }
        } else if (appState === "INTELLIGENCE" && !document.getElementById("editModalContainer").classList.contains("hidden")) {
            if(typeof saveEdit === "function") saveEdit(true); 
        } else if (appState === "CONCEPTS" && !document.getElementById("editConceptModalContainer").classList.contains("hidden")) {
            if(typeof saveEditConcept === "function") saveEditConcept(true);
        }
        saveDatabase();
    }, 1500);
}

function initAutoSaveListeners() {
    document.addEventListener('input', function(e) {
        if (e.target && e.target.classList.contains('autosave-input')) {
            scheduleAutoSave();
        }
    });
}

// BACKUP & IMPORT CAPABILITIES
// ==========================================
function downloadLocalBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "LegalNexus_Backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click(); 
    downloadAnchorNode.remove();
}

function openImportModal() {
    document.getElementById("backupTextarea").value = "";
    document.getElementById("fileUpload").value = "";
    document.getElementById("importConfirmBtn").classList.add("hidden");
    document.getElementById("backupModalContainer").classList.remove("hidden");
    
    document.getElementById("backupTextarea").addEventListener('input', function() {
       if(this.value.trim().length > 10) document.getElementById('importConfirmBtn').classList.remove('hidden');
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { 
        document.getElementById('backupTextarea').value = e.target.result; 
        document.getElementById('importConfirmBtn').classList.remove('hidden'); 
    };
    reader.readAsText(file);
}

async function processImport() {
    try {
      const imported = JSON.parse(document.getElementById("backupTextarea").value);
      if (imported && imported.factors) { 
          db.factors = imported.factors || [];
          db.workspaces = imported.workspaces || [];
          db.conceptCategories = imported.conceptCategories || [];
          db.concepts = imported.concepts || [];
          db.dossiers = imported.dossiers || {};
          db.dictionary = imported.dictionary || [];
          db.targetFirms = imported.targetFirms || [];
          db.lastUpdated = new Date().getTime(); // Stamp the imported data as brand new
          
          document.getElementById('importConfirmBtn').innerText = "Syncing to Cloud...";
          await saveDatabase(); 
          window.location.reload(); 
      } 
      else {
          alert("Invalid format. Make sure it's a valid Legal Nexus JSON backup.");
      }
    } catch (e) { 
        alert("Invalid JSON formatting."); 
    }
}

// UNIVERSAL SAVE SHORTCUT (Cmd/Ctrl + Enter)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault(); // Prevents a line-break from being typed in Quill

        // 1. Check if any Edit Modals are currently open
        if (document.getElementById('editModalContainer') && !document.getElementById('editModalContainer').classList.contains('hidden')) {
            if (typeof saveEdit === 'function') return saveEdit();
        }
        if (document.getElementById('editConceptModalContainer') && !document.getElementById('editConceptModalContainer').classList.contains('hidden')) {
            if (typeof saveEditConcept === 'function') return saveEditConcept();
        }
        if (document.getElementById('dossierEditMode') && !document.getElementById('dossierEditMode').classList.contains('hidden')) {
            if (typeof saveDossierData === 'function') return saveDossierData();
        }

        // 2. If no modals are open, save to the active workspace
        if (typeof appState !== 'undefined') {
            if (appState === 'INTELLIGENCE' && typeof saveManualFactor === 'function') saveManualFactor();
            else if (appState === 'CONCEPTS' && typeof saveConcept === 'function') saveConcept();
            else if (appState === 'DICTIONARY' && typeof saveDictionaryTerm === 'function') saveDictionaryTerm();
        }
    }
});