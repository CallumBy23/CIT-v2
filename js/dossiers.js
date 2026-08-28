// FIRM DOSSIERS (STRATEGY ROOM) LOGIC
// ==========================================

// GLOBAL DOSSIER STATE TRACKER
window.selectedDossierCards = new Set();

window.toggleDossierCard = function(id, event) {
    if (event) event.stopPropagation();
    if (window.selectedDossierCards.has(id)) {
        window.selectedDossierCards.delete(id);
    } else {
        window.selectedDossierCards.add(id);
    }
};

window.toggleSelectAllDossier = function() {
    if (!currentDossierFirm) return;
    
    const checkboxes = document.querySelectorAll('input[type="checkbox"][onchange*="toggleDossierCard"]');
    if (checkboxes.length === 0) {
        if(typeof showToast === 'function') showToast("No flashcard elements available.", "info");
        return;
    }

    let allChecked = true;
    checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });
    const newState = !allChecked;

    checkboxes.forEach(cb => {
        cb.checked = newState;
        const match = cb.getAttribute('onchange').match(/toggleDossierCard\(['"]([^'"]+)['"]/);
        if (match && match[1]) {
            const id = match[1];
            if (newState) {
                window.selectedDossierCards.add(id);
            } else {
                window.selectedDossierCards.delete(id);
            }
        }
    });
};

function addDossierFirm() {
    const name = prompt("Enter Target Firm Name:");
    if (name && !db.targetFirms.includes(name)) {
      db.targetFirms.push(name);
      db.dossiers[name] = { firmType: "", locations: "", practice: [], clients: [], culture: "", schemes: [], applied: false, personalWhy: "", competencies: [] };
      currentDossierFirm = name;
      saveDatabase();
      updateNexusDropdowns();
      renderDossierList();
    }
}
  
function manageDossierFirm(oldName, event) {
    event.stopPropagation();
    const action = prompt(`Manage Firm: "${oldName}"\n\nType a NEW NAME below to rename it, or type DELETE to remove this firm.`);
    if (!action) return;
    const input = action.trim();
    if (input.toUpperCase() === "DELETE") {
        if (confirm(`Delete the "${oldName}" dossier?`)) {
            db.targetFirms = db.targetFirms.filter(f => f !== oldName);
            delete db.dossiers[oldName];
            db.factors.forEach(f => { if(f.linkedFirm === oldName) f.linkedFirm = ""; });
            currentDossierFirm = db.targetFirms[0] || "";
            saveDatabase(); updateNexusDropdowns(); renderDossierList();
        }
    } else if (input !== oldName && !db.targetFirms.includes(input)) {
        const index = db.targetFirms.indexOf(oldName);
        if (index > -1) db.targetFirms[index] = input;
        db.dossiers[input] = db.dossiers[oldName];
        delete db.dossiers[oldName];
        db.factors.forEach(f => { if(f.linkedFirm === oldName) f.linkedFirm = input; });
        currentDossierFirm = input;
        saveDatabase(); updateNexusDropdowns(); renderDossierList();
    }
}
  
function toggleDossierApplied() {
    if(!currentDossierFirm) return;
    db.dossiers[currentDossierFirm].applied = !db.dossiers[currentDossierFirm].applied;
    if (db.dossiers[currentDossierFirm].schemes) {
        db.dossiers[currentDossierFirm].schemes.forEach(s => s.applied = db.dossiers[currentDossierFirm].applied);
    }
    saveDatabase();
    renderDossierList();
}
  
function toggleSchemeApplied(firm, schemeIndex) {
    db.dossiers[firm].schemes[schemeIndex].applied = !db.dossiers[firm].schemes[schemeIndex].applied;
    saveDatabase();
    renderDossierList(); 
}
  
function getFirmPriority(firmName) {
    const d = db.dossiers[firmName];
    if (d.applied) return { tier: 4, diff: Infinity }; 
    if (!d.schemes || d.schemes.length === 0) return { tier: 3, diff: Infinity }; 
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let nearestActiveDiff = Infinity;
    let newestExpiredDiff = -Infinity;
    let allApplied = true;

    d.schemes.forEach(s => {
        if (!s.applied) allApplied = false;
        if (s.applied) return;

        if (!s.closeDate) {
            if (9999 < nearestActiveDiff) nearestActiveDiff = 9999;
            return;
        }

        const close = new Date(s.closeDate);
        close.setHours(0,0,0,0);
        let diffDays = Math.ceil((close - today) / (1000 * 60 * 60 * 24));
        
        // INTERCEPT ROLLING DEADLINES: Treat them as urgently open (0 days left internally)
        if (s.rolling === "Rolling" && s.openDate) {
            const open = new Date(s.openDate);
            open.setHours(0,0,0,0);
            if (today >= open && today <= close) {
                diffDays = 0; 
            }
        }
        
        if (diffDays >= 0) {
            if (diffDays < nearestActiveDiff) nearestActiveDiff = diffDays;
        } else {
            if (diffDays > newestExpiredDiff) newestExpiredDiff = diffDays; 
        }
    });

    if (allApplied) return { tier: 4, diff: Infinity };
    if (nearestActiveDiff !== Infinity) return { tier: 1, diff: nearestActiveDiff }; 
    if (newestExpiredDiff !== -Infinity) return { tier: 2, diff: Math.abs(newestExpiredDiff) }; 
    return { tier: 3, diff: Infinity }; 
}
  
function renderDossierList() {
    const container = document.getElementById("dossierFirmList");
    container.innerHTML = "";
    
    if(!db.targetFirms || db.targetFirms.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic mt-2">No custom target firms added yet. Click + Add above.</p>`;
        document.getElementById("dossierContentWrapper").classList.add("hidden");
        return;
    }

    document.getElementById("dossierContentWrapper").classList.remove("hidden");

    let sortedFirms = [...db.targetFirms];
    const searchTerm = document.getElementById("searchFirms") ? document.getElementById("searchFirms").value.toLowerCase() : "";
    
    if (searchTerm) {
        sortedFirms = sortedFirms.filter(f => f.toLowerCase().includes(searchTerm));
    }
    
    sortedFirms.sort((a, b) => {
        if (dossierSortMode === "az") return a.localeCompare(b);
        if (dossierSortMode === "za") return b.localeCompare(a);

        const pA = getFirmPriority(a);
        const pB = getFirmPriority(b);

        if (pA.tier !== pB.tier) return pA.tier - pB.tier; 
        if (pA.tier === 1 || pA.tier === 3 || pA.tier === 4) {
            if (pA.diff === pB.diff) return a.localeCompare(b);
            return pA.diff - pB.diff; 
        }
        if (pA.tier === 2) {
            if (pA.diff === pB.diff) return a.localeCompare(b);
            return pA.diff - pB.diff; 
        }
        return 0;
    });

    if(!currentDossierFirm || !db.targetFirms.includes(currentDossierFirm)) {
        currentDossierFirm = sortedFirms[0] || "";
    }
    
    if(!currentDossierFirm) return;

    sortedFirms.forEach(firm => {
        const p = getFirmPriority(firm);
        const d = db.dossiers[firm];
        let statusIndicator = "";
        
        if (p.tier === 4 || d.applied) {
            statusIndicator = `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold ml-2">✓ Applied</span>`;
        } else if (p.tier === 2) {
            statusIndicator = `<span class="text-[10px] text-gray-400 ml-2">Past</span>`;
        } else if (p.tier === 1 && p.diff <= 14) {
            statusIndicator = `<span class="text-[10px] text-red-500 animate-pulse font-bold ml-2">!</span>`;
        }

        const btn = document.createElement("button");
        btn.className = `w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition flex justify-between items-center ${firm === currentDossierFirm ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`;
        btn.innerHTML = `<span class="${(p.tier === 4 || d.applied) && firm !== currentDossierFirm ? 'opacity-50 line-through' : ''} flex items-center min-w-0"><span class="truncate">${firm}</span> ${statusIndicator}</span> <span onclick="manageDossierFirm('${firm}', event)" class="text-xs opacity-50 hover:opacity-100 shrink-0 ml-2">⚙️</span>`;
        btn.onclick = (e) => {
            if (e.target.closest('span[onclick]')) return;
            if (typeof autoSaveTimer !== 'undefined') clearTimeout(autoSaveTimer);
            window.selectedDossierCards.clear();
            currentDossierFirm = firm;
            toggleDossierMode("view");
            renderDossierList(); 
            if (window.innerWidth < 768) {
                document.getElementById('dossierSidebar').classList.add('-translate-x-full');
            }
        };
        container.appendChild(btn);
    });

    renderStrategyRoom();
}
  
function renderStrategyRoom() {
    try {
        if(!currentDossierFirm) return;
        if (!db.dossiers[currentDossierFirm]) db.dossiers[currentDossierFirm] = { firmType: "", locations: "", practice: [], clients: [], culture: "", schemes: [], applied: false, personalWhy: "", competencies: [] };
        const d = db.dossiers[currentDossierFirm];
        if (!Array.isArray(d.schemes)) d.schemes = [];
        
        if (typeof d.competencies === 'string') d.competencies = d.competencies.trim() !== "" ? [{ heading: "Legacy Note", body: d.competencies }] : [];
        if (!Array.isArray(d.competencies)) d.competencies = [];

        if (typeof d.practice === 'string') d.practice = d.practice.trim() !== "" ? [{ heading: "Legacy Note", body: d.practice }] : [];
        if (!Array.isArray(d.practice)) d.practice = [];

        if (typeof d.clients === 'string') d.clients = d.clients.trim() !== "" ? [{ heading: "Legacy Note", body: d.clients }] : [];
        if (!Array.isArray(d.clients)) d.clients = [];
  
        const titleView = document.getElementById("dossierFirmTitleView"); 
        if(titleView) titleView.innerText = currentDossierFirm;
        
        let subtitle = [];
        if(d.firmType) subtitle.push(d.firmType);
        if(d.locations) subtitle.push(`📍 ${d.locations}`);
        const subView = document.getElementById("dossierSubtitleView"); 
        if(subView) subView.innerText = subtitle.join("  |  ");
  
        const appliedBtn = document.getElementById("dossierAppliedBtn");
        if (appliedBtn) {
            if (d.applied) {
                appliedBtn.className = "font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm print:hidden whitespace-nowrap flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white";
                appliedBtn.innerHTML = "✅ Application Submitted";
            } else {
                appliedBtn.className = "font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm print:hidden whitespace-nowrap flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700";
                appliedBtn.innerHTML = "☐ Mark as Applied";
            }
        }
  
        let deadlineHTML = "";
        if (d.schemes.length > 0) {
            deadlineHTML = `<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Application Deadlines</h3><div class="space-y-2 mb-2">`;
            let sortedSchemes = [...d.schemes].map((s, idx) => ({...s, idx}));
            const today = new Date(); today.setHours(0,0,0,0);
            
            sortedSchemes.sort((a,b) => {
                if(a.applied && !b.applied) return 1;
                if(!a.applied && b.applied) return -1;
                if(!a.closeDate) return -1;
                if(!b.closeDate) return 1;
                return new Date(a.closeDate) - new Date(b.closeDate);
            });
  
            sortedSchemes.forEach(s => {
                let daysLeftHTML = "";
                if (s.applied || d.applied) {
                    daysLeftHTML = `<span class="bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded text-[10px] border border-gray-200">Applied</span>`;
                } else if (s.closeDate) {
                    const close = new Date(s.closeDate); close.setHours(0,0,0,0);
                    const diffDays = Math.ceil((close - today) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) daysLeftHTML = `<span class="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-200">Closed</span>`;
                    else if (diffDays === 0) daysLeftHTML = `<span class="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded text-[10px] border border-orange-200 animate-pulse">Closes Today</span>`;
                    else if (diffDays <= 14) daysLeftHTML = `<span class="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded text-[10px] border border-orange-200">${diffDays} Days Left</span>`;
                    else daysLeftHTML = `<span class="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">${diffDays} Days Left</span>`;
                }
                
                let rollingHTML = "";
                if (s.rolling === "Rolling") {
                    const open = s.openDate ? new Date(s.openDate) : null;
                    if (open) open.setHours(0,0,0,0);
                    if (open && today >= open && today <= new Date(s.closeDate)) {
                        rollingHTML = `<span class="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-200 animate-pulse">Rolling - Open!</span>`;
                    } else {
                        rollingHTML = `<span class="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">Rolling</span>`;
                    }
                }
                
                const safeOpen = s.openDate ? new Date(s.openDate).toLocaleDateString('en-GB') : '?';
                const safeClose = s.closeDate ? new Date(s.closeDate).toLocaleDateString('en-GB') : '?';
  
                deadlineHTML += `
                  <div class="flex flex-col sm:flex-row justify-between sm:items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm gap-2 ${s.applied || d.applied ? 'opacity-50' : ''}">
                      <div class="flex items-center gap-3 min-w-0">
                          <label class="flex items-center cursor-pointer shrink-0">
                              <input type="checkbox" ${s.applied || d.applied ? 'checked' : ''} onchange="toggleSchemeApplied('${currentDossierFirm.replace(/'/g, "\\'")}', ${s.idx})" class="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500">
                          </label>
                          <span class="text-sm font-bold text-gray-800 truncate ${s.applied || d.applied ? 'line-through' : ''}">${s.schemeType || 'Application'}</span>
                          <div class="flex items-center gap-1 shrink-0">${daysLeftHTML}${rollingHTML}</div>
                      </div>
                      <span class="text-xs font-medium text-gray-500 shrink-0 sm:ml-auto pl-7 sm:pl-0">${safeOpen} – ${safeClose}</span>
                  </div>
                `;
            });
            deadlineHTML += `</div>`;
        }
        const banner = document.getElementById("dossierDeadlineBanner"); 
        if(banner) banner.innerHTML = deadlineHTML;
        
        const isChecked = (id) => window.selectedDossierCards.has(id) ? "checked" : "";

        // RENDER DYNAMIC PRACTICE LIST
        const pView = document.getElementById("dossierPracticeView"); 
        if(pView && pView.previousElementSibling) {
            pView.previousElementSibling.innerHTML = `<input type="checkbox" ${isChecked('practice')} onchange="window.toggleDossierCard('practice', event)" class="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 mt-0.5"> <span>⚖️</span> Core Practice Areas`;
        }
        const pracList = document.getElementById("dossierPracticeList");
        if(pracList) {
            pracList.innerHTML = "";
            if (d.practice.length === 0) {
                pracList.innerHTML = "<p class='text-sm text-gray-400 italic py-2'>No practice areas logged.</p>";
            } else {
                d.practice.sort((a,b) => a.heading.localeCompare(b.heading));
                d.practice.forEach((prac, idx) => {
                    const row = document.createElement('div');
                    row.className = "pt-4 first:pt-0 flex flex-col gap-1.5 group border-b border-gray-100 last:border-0 pb-2 last:pb-0";
                    row.innerHTML = `
                        <div class="flex justify-between items-start">
                            <h4 class="font-extrabold text-indigo-900 text-sm break-words">${prac.heading}</h4>
                            <div class="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0">
                                <button onclick="window.openPracticeModal(${idx})" class="text-[10px] text-gray-500 hover:text-indigo-600 font-bold bg-gray-100 hover:bg-indigo-50 px-2 py-1 rounded transition border border-gray-200">Edit</button>
                                <button onclick="window.deletePractice(${idx})" class="text-[10px] text-gray-500 hover:text-red-600 font-bold bg-gray-100 hover:bg-red-50 px-2 py-1 rounded transition border border-gray-200">Delete</button>
                            </div>
                        </div>
                        <div class="prose prose-sm max-w-none text-gray-700 ql-editor p-0 break-words">${prac.body}</div>
                    `;
                    pracList.appendChild(row);
                });
            }
        }

        // RENDER DYNAMIC CLIENTS LIST
        const clView = document.getElementById("dossierClientsView"); 
        if(clView && clView.previousElementSibling) {
            clView.previousElementSibling.innerHTML = `<input type="checkbox" ${isChecked('clients')} onchange="window.toggleDossierCard('clients', event)" class="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 mt-0.5"> <span>🤝</span> Key Clients & Deals`;
        }
        const clientsList = document.getElementById("dossierClientsList");
        if(clientsList) {
            clientsList.innerHTML = "";
            if (d.clients.length === 0) {
                clientsList.innerHTML = "<p class='text-sm text-gray-400 italic py-2'>No clients or deals logged.</p>";
            } else {
                d.clients.sort((a,b) => a.heading.localeCompare(b.heading));
                d.clients.forEach((client, idx) => {
                    const row = document.createElement('div');
                    row.className = "pt-4 first:pt-0 flex flex-col gap-1.5 group border-b border-gray-100 last:border-0 pb-2 last:pb-0";
                    row.innerHTML = `
                        <div class="flex justify-between items-start">
                            <h4 class="font-extrabold text-indigo-900 text-sm break-words">${client.heading}</h4>
                            <div class="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0">
                                <button onclick="window.openClientsModal(${idx})" class="text-[10px] text-gray-500 hover:text-indigo-600 font-bold bg-gray-100 hover:bg-indigo-50 px-2 py-1 rounded transition border border-gray-200">Edit</button>
                                <button onclick="window.deleteClients(${idx})" class="text-[10px] text-gray-500 hover:text-red-600 font-bold bg-gray-100 hover:bg-red-50 px-2 py-1 rounded transition border border-gray-200">Delete</button>
                            </div>
                        </div>
                        <div class="prose prose-sm max-w-none text-gray-700 ql-editor p-0 break-words">${client.body}</div>
                    `;
                    clientsList.appendChild(row);
                });
            }
        }

        const cuView = document.getElementById("dossierCultureView"); 
        if(cuView && cuView.previousElementSibling) {
            cuView.previousElementSibling.innerHTML = `<input type="checkbox" ${isChecked('culture')} onchange="window.toggleDossierCard('culture', event)" class="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 mt-0.5"> <span>🧭</span> Culture & Structure`;
            cuView.innerHTML = d.culture || "<p class='italic text-gray-400'>No culture data logged.</p>";
        }
  
        const tEdit = document.getElementById("dossierFirmTitleEdit"); if(tEdit) tEdit.innerText = currentDossierFirm;
        const fType = document.getElementById("dossierFirmType"); if(fType) fType.value = d.firmType || "";
        const loc = document.getElementById("dossierLocations"); if(loc) loc.value = d.locations || "";
        
        if (typeof cultureQuill !== 'undefined') cultureQuill.root.innerHTML = d.culture || "";
        if (typeof personalWhyQuill !== 'undefined') personalWhyQuill.root.innerHTML = d.personalWhy || "";

        const pwView = document.getElementById("dossierPersonalWhyView");
        if(pwView) pwView.innerHTML = d.personalWhy || "<p class='italic text-gray-400'>No draft logged.</p>";

        // RENDER DYNAMIC COMPETENCIES LIST
        const compList = document.getElementById("dossierCompetenciesList");
        if(compList) {
            compList.innerHTML = "";
            if (d.competencies.length === 0) {
                compList.innerHTML = "<p class='text-sm text-gray-400 italic py-2'>No competencies mapped yet.</p>";
            } else {
                d.competencies.sort((a,b) => a.heading.localeCompare(b.heading));
                d.competencies.forEach((comp, idx) => {
                    const row = document.createElement('div');
                    row.className = "pt-4 first:pt-0 flex flex-col md:flex-row gap-2 md:gap-4 group";
                    row.innerHTML = `
                        <div class="md:w-1/4 shrink-0 flex flex-col gap-1.5 border-b md:border-b-0 border-gray-100 pb-2 md:pb-0">
                            <h4 class="font-extrabold text-indigo-900 text-sm break-words">${comp.heading}</h4>
                            <div class="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                <button onclick="window.openCompetencyModal(${idx})" class="text-[10px] text-gray-500 hover:text-indigo-600 font-bold bg-gray-100 hover:bg-indigo-50 px-2 py-1 rounded transition border border-gray-200">Edit</button>
                                <button onclick="window.deleteCompetency(${idx})" class="text-[10px] text-gray-500 hover:text-red-600 font-bold bg-gray-100 hover:bg-red-50 px-2 py-1 rounded transition border border-gray-200">Delete</button>
                            </div>
                        </div>
                        <div class="md:w-3/4 prose prose-sm max-w-none text-gray-700 ql-editor p-0 break-words">${comp.body}</div>
                    `;
                    compList.appendChild(row);
                });
            }
        }
  
        const aiOut = document.getElementById("dossierAiOutput"); 
        if(aiOut) { 
            if (d.whyFirmText && d.whyFirmText.trim() !== "") {
                aiOut.classList.remove("hidden");
                aiOut.innerText = d.whyFirmText;
            } else {
                aiOut.classList.add("hidden"); 
                aiOut.innerText = ""; 
            }
        }
  
        const nexusContainer = document.getElementById("dossierNexusFeed");
        if (!nexusContainer) return;
        nexusContainer.innerHTML = "";
        
        const safeFirm = String(currentDossierFirm || "").trim().toLowerCase();
        
        let firmFactors = db.factors
            .map((f, i) => ({ factor: f, originalIndex: i }))
            .filter(obj => obj.factor && obj.factor.linkedFirm && String(obj.factor.linkedFirm).trim().toLowerCase() === safeFirm);

        // --- APPLY DYNAMIC NEXUS SORTING WITH LOCALSTORAGE ---
        const sortSelect = document.getElementById("sortDossierNexus");
        
        if (sortSelect && !sortSelect.dataset.loaded) {
            const savedSort = localStorage.getItem('LEGAL_NEXUS_NEXUS_SORT');
            if (savedSort) sortSelect.value = savedSort;
            sortSelect.dataset.loaded = "true"; 
            
            sortSelect.addEventListener('change', (e) => {
                localStorage.setItem('LEGAL_NEXUS_NEXUS_SORT', e.target.value);
            });
        }

        let sortMode = sortSelect ? sortSelect.value : (localStorage.getItem('LEGAL_NEXUS_NEXUS_SORT') || "newest");

        if (sortMode === "newest") {
            firmFactors.reverse();
        } else if (sortMode === "az") {
            firmFactors.sort((a, b) => (a.factor.title || "").localeCompare(b.factor.title || ""));
        } else if (sortMode === "za") {
            firmFactors.sort((a, b) => (b.factor.title || "").localeCompare(a.factor.title || ""));
        }
        
        if(firmFactors.length === 0) {
            nexusContainer.innerHTML = `<p class="text-sm text-gray-500 italic bg-white p-4 rounded-xl border border-gray-200 shadow-sm">No market intelligence linked to this firm yet.</p>`;
            return;
        }
  
        firmFactors.forEach(item => {
            const factor = item.factor;
            const originalIndex = item.originalIndex;
            const safeConcept = factor.linkedConcept ? String(factor.linkedConcept).replace(/'/g, "\\'") : '';
            const nexusBadge = factor.linkedConcept ? `<button onclick="routeToConcept('${safeConcept}')" class="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-0.5 rounded-full font-bold ml-2 border border-blue-200 transition">🔗 ${factor.linkedConcept}</button>` : '';
            const competencyBadge = factor.competency ? `<span class="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold shadow-sm border border-purple-200 mt-2 md:ml-2 inline-block shrink-0">🎯 ${factor.competency}</span>` : '';
            
            const card = document.createElement("div");
            card.className = "bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm print:break-inside-avoid print:border-gray-400 print:shadow-none group cursor-pointer transition hover:border-indigo-300";
            
            card.onclick = function(e) {
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
                const body = this.querySelector('.nexus-body');
                const icon = this.querySelector('.nexus-icon');
                if(body && icon) {
                    body.classList.toggle('hidden');
                    icon.innerText = body.classList.contains('hidden') ? '▼' : '▲';
                }
            };
  
            card.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between md:items-start gap-2">
            <div class="flex items-start gap-3 flex-1">
                <input type="checkbox" ${isChecked(`intel_${originalIndex}`)} onchange="window.toggleDossierCard('intel_${originalIndex}', event)" class="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer print:hidden shrink-0">
                  <div class="flex flex-col min-w-0 w-full">
                    <div class="flex justify-between items-start w-full">
                        <h4 class="font-bold text-gray-900 text-sm md:text-base group-hover:text-indigo-600 transition md:pr-4 print:text-black break-words">${factor.title || "Untitled Insight"}</h4>
                        <span class="nexus-icon text-gray-400 text-xs ml-2 mt-1 shrink-0 print:hidden">▼</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1">${nexusBadge}${competencyBadge}</div>
                  </div>
                </div>
                <div class="flex gap-2 shrink-0 items-center justify-end w-full md:w-auto">
                  <span class="text-[10px] md:text-xs bg-gray-800 text-white px-2 py-1 rounded font-bold uppercase truncate max-w-[150px] print:bg-white print:border print:border-gray-300 print:text-gray-800">${factor.metric || factor.region || "Global"}</span>
                  <span class="text-[10px] md:text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase print:bg-white print:border print:border-indigo-300 print:text-indigo-800">${factor.pestle || "General"}</span>
                </div>
              </div>
              
              <div class="nexus-body hidden border-t border-gray-100 pt-4 mt-4 print:border-gray-300 cursor-text" onclick="event.stopPropagation()">
                <div class="prose prose-sm max-w-none text-gray-700 mb-4 print:text-black dict-highlight-target">${factor.description || ""}</div>
                ${factor.implications ? `
                <div class="bg-indigo-50/50 rounded-lg p-3 md:p-4 border border-indigo-100 print:bg-white print:border-gray-300">
                  <span class="text-xs font-bold text-indigo-800 uppercase tracking-wider print:text-black mb-2 block">Implications</span>
                  <div class="prose prose-sm max-w-none text-gray-700 print:text-black dict-highlight-target">${factor.implications}</div>
                </div>` : ''}
                ${factor.starExport ? `
                <div class="bg-yellow-50/80 rounded-lg p-4 border border-yellow-200 mt-4 print:bg-white print:border-gray-300">
                    <h5 class="text-yellow-800 font-bold text-xs uppercase mb-2 print:text-black">⭐ STAR Method Export</h5>
                    <p class="text-sm text-yellow-900 print:text-black">${factor.starExport}</p>
                </div>` : ''}
              </div>
            `;
            nexusContainer.appendChild(card);
        });
        
        if(typeof applyDictionaryHighlighting === 'function') {
            applyDictionaryHighlighting("dossierNexusFeed");
            applyDictionaryHighlighting("dossierPracticeView");
            applyDictionaryHighlighting("dossierClientsView");
            applyDictionaryHighlighting("dossierCultureView");
        }
    } catch (err) {
        console.error("Critical render Strategy Room error:", err);
        const fallback = document.getElementById("dossierNexusFeed");
        if (fallback) fallback.innerHTML = `<p class="text-sm text-red-500 italic bg-red-50 p-4 rounded-lg border border-red-200">System Error: ${err.message}</p>`;
    }
}

function toggleDossierMode(mode) {
    if(mode === "edit") {
        const d = db.dossiers[currentDossierFirm];
        const s = (d.schemes && d.schemes.length > 0) ? d.schemes[0] : {};
        document.getElementById("dossierSchemeType").value = s.schemeType || "";
        document.getElementById("dossierOpenDate").value = s.openDate || "";
        document.getElementById("dossierCloseDate").value = s.closeDate || "";
        document.getElementById("dossierRolling").value = s.rolling || "Non-Rolling";
        
        document.getElementById("dossierViewMode").classList.replace("block", "hidden");
        document.getElementById("dossierEditMode").classList.replace("hidden", "block");
    } else {
        document.getElementById("dossierEditMode").classList.replace("block", "hidden");
        document.getElementById("dossierViewMode").classList.replace("hidden", "block");
    }
}

function saveDossierData() {
    if(!currentDossierFirm) return;
    if (!db.dossiers[currentDossierFirm]) db.dossiers[currentDossierFirm] = {};
    
    db.dossiers[currentDossierFirm].firmType = document.getElementById("dossierFirmType").value;
    db.dossiers[currentDossierFirm].locations = document.getElementById("dossierLocations").value;
    
    // Safety check to ensure we do not overwrite arrays with empty strings from the old editors
    if (typeof cultureQuill !== 'undefined') {
        db.dossiers[currentDossierFirm].culture = cultureQuill.root.innerHTML;
    }
    if (typeof personalWhyQuill !== 'undefined') {
        db.dossiers[currentDossierFirm].personalWhy = personalWhyQuill.root.innerHTML;
    }
    
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
    
    saveDatabase(); 
    toggleDossierMode('view');
    renderDossierList();
}

window.switchDossierSubTab = function(tab) {
    const btnComm = document.getElementById('tabCommercial');
    const btnPers = document.getElementById('tabPersonal');
    const viewComm = document.getElementById('dossierCommercialTab');
    const viewPers = document.getElementById('dossierPersonalTab');

    if (!btnComm || !btnPers || !viewComm || !viewPers) return;

    if (tab === 'commercial') {
        btnComm.className = "text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-md bg-white text-indigo-700 shadow-sm transition";
        btnPers.className = "text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition";
        viewComm.classList.remove('hidden');
        viewPers.classList.add('hidden');
    } else {
        btnPers.className = "text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-md bg-white text-indigo-700 shadow-sm transition";
        btnComm.className = "text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition";
        viewPers.classList.remove('hidden');
        viewComm.classList.add('hidden');
    }
};

// --- COMPETENCIES CRUD ---
window.openCompetencyModal = function(idx = -1) {
    document.getElementById('compModalContainer').classList.remove('hidden');
    const d = db.dossiers[currentDossierFirm];
    
    if (idx >= 0 && d.competencies[idx]) {
        document.getElementById('compModalTitle').innerText = "Edit Competency";
        document.getElementById('compEditIndex').value = idx;
        document.getElementById('compHeadingInput').value = d.competencies[idx].heading;
        if(typeof compModalQuill !== 'undefined') compModalQuill.root.innerHTML = d.competencies[idx].body;
    } else {
        document.getElementById('compModalTitle').innerText = "Add Core Competency";
        document.getElementById('compEditIndex').value = "";
        document.getElementById('compHeadingInput').value = "";
        if(typeof compModalQuill !== 'undefined') compModalQuill.root.innerHTML = "";
    }
};

window.saveCompetency = function() {
    const heading = document.getElementById('compHeadingInput').value.trim();
    if (!heading) return alert("Please enter a competency heading.");
    
    const body = typeof compModalQuill !== 'undefined' ? compModalQuill.root.innerHTML : "";
    const idxStr = document.getElementById('compEditIndex').value;
    
    const d = db.dossiers[currentDossierFirm];
    if (!Array.isArray(d.competencies)) d.competencies = [];
    
    if (idxStr !== "") {
        const idx = parseInt(idxStr);
        d.competencies[idx] = { heading, body };
    } else {
        d.competencies.push({ heading, body });
    }
    
    saveDatabase();
    renderStrategyRoom();
    document.getElementById('compModalContainer').classList.add('hidden');
};

window.deleteCompetency = function(idx) {
    if(confirm("Delete this competency record?")) {
        db.dossiers[currentDossierFirm].competencies.splice(idx, 1);
        saveDatabase();
        renderStrategyRoom();
    }
};

// --- PRACTICE AREA CRUD ---
window.openPracticeModal = function(idx = -1) {
    document.getElementById('practiceModalContainer').classList.remove('hidden');
    const d = db.dossiers[currentDossierFirm];
    if (idx >= 0 && d.practice[idx]) {
        document.getElementById('practiceModalTitle').innerText = "Edit Practice Area";
        document.getElementById('practiceEditIndex').value = idx;
        document.getElementById('practiceHeadingInput').value = d.practice[idx].heading;
        if(typeof practiceModalQuill !== 'undefined') practiceModalQuill.root.innerHTML = d.practice[idx].body;
    } else {
        document.getElementById('practiceModalTitle').innerText = "Add Practice Area";
        document.getElementById('practiceEditIndex').value = "";
        document.getElementById('practiceHeadingInput').value = "";
        if(typeof practiceModalQuill !== 'undefined') practiceModalQuill.root.innerHTML = "";
    }
};

window.savePracticeFn = function() {
    const heading = document.getElementById('practiceHeadingInput').value.trim();
    if (!heading) return alert("Please enter a practice area name.");
    const body = typeof practiceModalQuill !== 'undefined' ? practiceModalQuill.root.innerHTML : "";
    const idxStr = document.getElementById('practiceEditIndex').value;
    const d = db.dossiers[currentDossierFirm];
    if (!Array.isArray(d.practice)) d.practice = [];
    if (idxStr !== "") d.practice[parseInt(idxStr)] = { heading, body };
    else d.practice.push({ heading, body });
    saveDatabase(); renderStrategyRoom();
    document.getElementById('practiceModalContainer').classList.add('hidden');
};

window.deletePractice = function(idx) {
    if(confirm("Delete this practice area?")) {
        db.dossiers[currentDossierFirm].practice.splice(idx, 1);
        saveDatabase(); renderStrategyRoom();
    }
};

// --- KEY CLIENTS CRUD ---
window.openClientsModal = function(idx = -1) {
    document.getElementById('clientsModalContainer').classList.remove('hidden');
    const d = db.dossiers[currentDossierFirm];
    if (idx >= 0 && d.clients[idx]) {
        document.getElementById('clientsModalTitle').innerText = "Edit Client / Deal";
        document.getElementById('clientsEditIndex').value = idx;
        document.getElementById('clientsHeadingInput').value = d.clients[idx].heading;
        if(typeof clientsModalQuill !== 'undefined') clientsModalQuill.root.innerHTML = d.clients[idx].body;
    } else {
        document.getElementById('clientsModalTitle').innerText = "Add Client / Deal";
        document.getElementById('clientsEditIndex').value = "";
        document.getElementById('clientsHeadingInput').value = "";
        if(typeof clientsModalQuill !== 'undefined') clientsModalQuill.root.innerHTML = "";
    }
};

window.saveClientsFn = function() {
    const heading = document.getElementById('clientsHeadingInput').value.trim();
    if (!heading) return alert("Please enter a client or deal name.");
    const body = typeof clientsModalQuill !== 'undefined' ? clientsModalQuill.root.innerHTML : "";
    const idxStr = document.getElementById('clientsEditIndex').value;
    const d = db.dossiers[currentDossierFirm];
    if (!Array.isArray(d.clients)) d.clients = [];
    if (idxStr !== "") d.clients[parseInt(idxStr)] = { heading, body };
    else d.clients.push({ heading, body });
    saveDatabase(); renderStrategyRoom();
    document.getElementById('clientsModalContainer').classList.add('hidden');
};

window.deleteClients = function(idx) {
    if(confirm("Delete this client/deal?")) {
        db.dossiers[currentDossierFirm].clients.splice(idx, 1);
        saveDatabase(); renderStrategyRoom();
    }
};
  
async function generateWhyFirmAI(firmName) {
    const firmData = db.dossiers[firmName];
    if (!firmData) {
        if(typeof showToast === 'function') showToast("Firm data not found.", "error");
        return;
    }

    const btn = document.getElementById("btnGenerateWhyFirm");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Analyzing Market Position...`;
    btn.disabled = true;

    // Flatten new array format for Gemini injection
    const pracText = Array.isArray(firmData.practice) ? firmData.practice.map(p => `${p.heading}: ${p.body}`).join('\n') : "";
    const clientsText = Array.isArray(firmData.clients) ? firmData.clients.map(c => `${c.heading}: ${c.body}`).join('\n') : "";

    const cleanData = {
        type: firmData.firmType,
        locations: firmData.locations,
        culture: firmData.culture || "No specific culture notes logged.",
        practiceAreas: pracText || "No specific practice areas logged.",
        keyClients: clientsText || "No key clients logged.",
        marketIntelligence: firmData.aggregatedIntel || "No additional market intelligence."
    };

    const aiPrompt = `Act as an expert commercial law recruitment consultant and mentor. I am drafting an application for the law firm ${firmName}. 
    
    Based ONLY on the provided dossier data below, generate a highly tailored, compelling, and commercially aware 'Why this firm?' summary. 
    
    You MUST focus your analysis strictly on synthesizing:
    1. Firm Culture and core values
    2. Leading Practice Areas and niche expertise
    3. Key Clients and recent landmark deals
    4. Any associated market intelligence provided.
    
    CRITICAL INSTRUCTION: Do NOT mention or attempt to calculate financial metrics, revenue, PEP, or leverage ratios. 
    
    Dossier Data:
    ${JSON.stringify(cleanData, null, 2)}`;

    try {
        const aiResponse = await callGeminiApi(aiPrompt);

        const outDiv = document.getElementById("dossierAiOutput");
        outDiv.classList.remove("hidden");
        outDiv.innerText = aiResponse;
        
        db.dossiers[firmName].whyFirmText = aiResponse;
        saveDatabase();
        if(typeof showToast === 'function') showToast("Draft saved successfully!", "success");

    } catch (error) {
        if(typeof showToast === 'function') showToast("AI Generation failed. Please try again.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- CHEAT SHEET ENGINE ---
function generateCheatSheet(firmName) {
    const d = db.dossiers[firmName];
    if (!d) {
        if(typeof showToast === 'function') showToast("Firm data not found.", "error");
        return;
    }

    let intel = db.factors.filter(f => String(f.linkedFirm).trim().toLowerCase() === firmName.toLowerCase());
    
    // Sync the cheat sheet sorting with LocalStorage to match UI
    let sortMode = localStorage.getItem('LEGAL_NEXUS_NEXUS_SORT') || "newest";
    const sortSelect = document.getElementById("sortDossierNexus");
    if (sortSelect && sortSelect.value) sortMode = sortSelect.value;

    if (sortMode === "newest") {
        intel.reverse();
    } else if (sortMode === "az") {
        intel.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortMode === "za") {
        intel.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    }

    let intelHtml = '';
    
    if (intel.length > 0) {
        intelHtml = intel.map(f => `
            <div class="mb-6 pb-5 border-b border-gray-200 break-inside-avoid">
                <h4 class="font-extrabold text-gray-900 text-lg mb-2 leading-snug">
                    <span class="underline underline-offset-4">${f.title || "Insight"}</span> 
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-widest ml-2 align-middle no-underline">${f.pestle || "General"}</span>
                </h4>
                <div class="prose prose-sm max-w-none text-gray-700 mb-3">${f.description || ""}</div>
                ${f.implications ? `<div class="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 border border-indigo-100 mt-3"><strong class="uppercase tracking-wider text-xs">Implications:</strong><div class="prose prose-sm max-w-none mt-1">${f.implications}</div></div>` : ''}
            </div>
        `).join('');
    } else {
        intelHtml = '<p class="text-sm text-gray-500 italic">No specific market intelligence logged for this firm.</p>';
    }

    const practiceHtml = (Array.isArray(d.practice) && d.practice.length > 0)
        ? d.practice.map(p => `<div class="mb-3"><h4 class="font-bold text-gray-900 text-sm">${p.heading}</h4><div class="text-sm text-gray-700 mt-1">${p.body}</div></div>`).join('')
        : '<p class="text-sm text-gray-500 italic">None logged.</p>';

    const clientsHtml = (Array.isArray(d.clients) && d.clients.length > 0)
        ? d.clients.map(c => `<div class="mb-3"><h4 class="font-bold text-gray-900 text-sm">${c.heading}</h4><div class="text-sm text-gray-700 mt-1">${c.body}</div></div>`).join('')
        : '<p class="text-sm text-gray-500 italic">None logged.</p>';

    const cultureHtml = d.culture || '<p class="text-sm text-gray-500 italic">None logged.</p>';

    const container = document.getElementById("cheatSheetContainer");
    if (!container) return;
    
    container.innerHTML = `
        <div class="max-w-4xl mx-auto pb-20">
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6 print:border-b-2 print:pb-2">
                <div>
                    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">${firmName}</h1>
                    <p class="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">${d.firmType || 'Law Firm'} | ${d.locations || 'Global'}</p>
                </div>
                <div class="flex gap-2 print:hidden">
                    <button onclick="window.print()" class="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"><span>🖨️</span> Print</button>
                    <button onclick="closeCheatSheet()" class="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition shadow-sm">✕ Close</button>
                </div>
            </div>
            
            ${d.whyFirmText ? `
            <div class="mb-8 break-inside-avoid">
                <h2 class="text-lg font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-3">"Why This Firm?"</h2>
                <div class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">${d.whyFirmText}</div>
            </div>` : ''}

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="break-inside-avoid">
                    <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Core Practice Areas</h2>
                    <div class="prose prose-sm max-w-none text-gray-700">${practiceHtml}</div>
                </div>
                <div class="break-inside-avoid">
                    <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Key Clients & Deals</h2>
                    <div class="prose prose-sm max-w-none text-gray-700">${clientsHtml}</div>
                </div>
                <div class="break-inside-avoid">
                    <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Culture & Structure</h2>
                    <div class="prose prose-sm max-w-none text-gray-700">${cultureHtml}</div>
                </div>
            </div>

            <div class="mb-8">
                <h2 class="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">Firm-Specific Intelligence</h2>
                ${intelHtml}
            </div>
        </div>
    `;

    document.getElementById('mainAppWrapper').classList.add('hidden');
    document.getElementById('mainTopHeader').classList.add('hidden');
    document.getElementById('mainTabs').classList.add('hidden');
    const bottomNav = document.getElementById('mobileBottomNav');
    if(bottomNav) bottomNav.classList.add('hidden');
    
    container.classList.remove("hidden");
}

function closeCheatSheet() {
    document.getElementById("cheatSheetContainer").classList.add("hidden");
    document.getElementById('mainAppWrapper').classList.remove('hidden');
    document.getElementById('mainTopHeader').classList.remove('hidden');
    document.getElementById('mainTabs').classList.remove('hidden');
    const bottomNav = document.getElementById('mobileBottomNav');
    if(bottomNav) bottomNav.classList.remove('hidden');
}

function handleExcelImport(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    document.getElementById('statusText').innerText = "Parsing Excel...";
    document.getElementById('statusDot').className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets['Deadlines Calendar'] || workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            let firmSchemes = {};
            
            json.forEach(row => {
              const firm = row['Firm'] ? String(row['Firm']).trim() : null;
              if(!firm) return;
              
              if(!firmSchemes[firm]) firmSchemes[firm] = [];
              firmSchemes[firm].push({
                  category: row['Category'] ? String(row['Category']).trim() : "",
                  schemeType: row['Scheme'] ? String(row['Scheme']).trim() : "",
                  openDate: parseExcelDate(row['Opening Date']),
                  closeDate: parseExcelDate(row['Closing Date']),
                  rolling: row['Rolling'] || "Non-Rolling",
                  applied: false
              });
          });

            let importCount = 0;

            Object.keys(firmSchemes).forEach(firm => {
                if (!db.targetFirms.includes(firm)) {
                    db.targetFirms.push(firm);
                    db.dossiers[firm] = { firmType: firmSchemes[firm][0].category, locations: "", practice: [], clients: [], culture: "", schemes: [], applied: false, personalWhy: "", competencies: [] };
                }
                db.dossiers[firm].schemes = firmSchemes[firm];
                importCount++;
            });
            
            saveDatabase();
            updateNexusDropdowns();
            if(appState === 'DOSSIERS') renderDossierList();
            if(typeof showToast === 'function') showToast(`Successfully bulk imported ${importCount} firms from Excel.`, "success");
            
        } catch (error) {
            console.error(error);
            if(typeof showToast === 'function') showToast("Failed to parse Excel file. Check column names.", "error");
            setOnlineStatus(true); 
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function parseExcelDate(excelDate) {
    if(!excelDate) return "";
    if(typeof excelDate === 'number') {
        const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    const date = new Date(excelDate);
    if(!isNaN(date)) return date.toISOString().split('T')[0];
    return "";
}