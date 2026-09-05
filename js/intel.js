// =========================================================================
// MARKET INTELLIGENCE DATA TABLE ENGINE & SYNTHESIS CONTROLLER
// =========================================================================

window.intelCurrentPage = 1;
window.intelPageSize = 10;
window.selectedFactors = window.selectedFactors || new Set();

// Filter States
window.intelSelectedPestle = "All";
window.intelSelectedWorkspace = "All";
window.activeIntelAlpha = new Set();

// Debounced search timer
let intelSearchDebounceTimer = null;

window.onIntelSearchInput = function() {
    clearTimeout(intelSearchDebounceTimer);
    intelSearchDebounceTimer = setTimeout(() => {
        window.intelCurrentPage = 1;
        window.renderFeed();
    }, 100);
};

// Bind search listener safely
window.initIntelSearchFast = function() {
    const searchBox = document.getElementById("searchFeed");
    if (searchBox && !searchBox.dataset.fastBound) {
        searchBox.dataset.fastBound = "true";
        searchBox.removeAttribute("oninput");
        searchBox.addEventListener("input", window.onIntelSearchInput);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initIntelSearchFast);
} else {
    window.initIntelSearchFast();
}

// =========================================================================
// ALPHABET FILTER BAR FOR INTELLIGENCE
// =========================================================================
window.toggleIntelAlphabetFilter = function(letter) {
    if (letter === 'ALL') {
        window.activeIntelAlpha.clear();
    } else {
        if (window.activeIntelAlpha.has(letter)) {
            window.activeIntelAlpha.delete(letter);
        } else {
            window.activeIntelAlpha.add(letter);
        }
    }

    window.intelCurrentPage = 1;
    window.renderIntelAlphabetBar();
    window.renderFeed();
};

window.renderIntelAlphabetBar = function() {
    const container = document.getElementById("intelAlphabetBar");
    if (!container) return;
    
    const alphabet = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    
    container.innerHTML = alphabet.map(letter => {
        const isActive = letter === 'ALL' 
            ? window.activeIntelAlpha.size === 0 
            : window.activeIntelAlpha.has(letter);
        const baseClass = "px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer transition shrink-0 border ";
        const activeClass = isActive 
            ? "bg-indigo-600 text-white border-indigo-700 shadow-sm" 
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white";
        return `<button type="button" onclick="window.toggleIntelAlphabetFilter('${letter}')" class="${baseClass} ${activeClass}">${letter}</button>`;
    }).join('');
};

window.setIntelPage = function(page) {
    window.intelCurrentPage = page;
    window.renderFeed();
};

// Filter dropdown population
window.populateIntelFilterDropdowns = function(force = false) {
    const pestleEl = document.getElementById('intelFilterPestle');
    const wsEl = document.getElementById('intelFilterWorkspace');

    if (pestleEl && (!pestleEl.dataset.populated || force)) {
        const pestles = ["Political", "Economic", "Social", "Technological", "Legal", "Environmental"];
        let opts = `<option value="All">All PESTLE</option>`;
        pestles.forEach(p => {
            opts += `<option value="${p}">${p}</option>`;
        });
        pestleEl.innerHTML = opts;
        pestleEl.value = window.intelSelectedPestle || "All";
        pestleEl.dataset.populated = "true";
    }

    if (wsEl && (!wsEl.dataset.populated || force)) {
        const workspaces = (typeof db !== 'undefined' && db.workspaces && db.workspaces.length > 0)
            ? db.workspaces
            : ["General Market"];
        
        let wsOpts = `<option value="All">All Sectors / Workspaces</option>`;
        workspaces.forEach(w => {
            wsOpts += `<option value="${w}">${w}</option>`;
        });
        wsEl.innerHTML = wsOpts;
        wsEl.value = window.intelSelectedWorkspace || "All";
        wsEl.dataset.populated = "true";
    }
};

window.onIntelFilterChange = function() {
    const pestleEl = document.getElementById('intelFilterPestle');
    const wsEl = document.getElementById('intelFilterWorkspace');

    window.intelSelectedPestle = pestleEl ? pestleEl.value : "All";
    window.intelSelectedWorkspace = wsEl ? wsEl.value : "All";

    window.intelCurrentPage = 1;
    window.renderFeed();
};

window.resetIntelFilters = function() {
    const pestleEl = document.getElementById('intelFilterPestle');
    const wsEl = document.getElementById('intelFilterWorkspace');
    const searchEl = document.getElementById('searchFeed');
    const sortEl = document.getElementById('sortFeed');

    if (pestleEl) pestleEl.value = "All";
    if (wsEl) wsEl.value = "All";
    if (searchEl) searchEl.value = "";
    if (sortEl) sortEl.value = "newest";

    window.intelSelectedPestle = "All";
    window.intelSelectedWorkspace = "All";
    window.activeIntelAlpha.clear();

    window.intelCurrentPage = 1;
    window.renderIntelAlphabetBar();
    window.renderFeed();
};

// Helper: PESTLE Style Map
function getPestleBadge(pestle) {
    const p = (pestle || 'Economic').toLowerCase();
    let colorClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";

    if (p.includes('econ')) colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
    else if (p.includes('pol')) colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
    else if (p.includes('soc')) colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
    else if (p.includes('tech')) colorClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
    else if (p.includes('leg')) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
    else if (p.includes('env')) colorClass = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900";

    return `<span class="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider border ${colorClass}">${pestle || 'General'}</span>`;
}

// =========================================================================
// MAIN INTEL TABLE RENDERER
// =========================================================================
// =========================================================================
// MAIN INTEL TABLE RENDERER (TOP TABS + WORKSPACE INTEGRATION)
// =========================================================================
window.renderFeed = function() {
  const container = document.getElementById("feedContainer");
  if (!container) return;

  window.initIntelSearchFast();
  window.renderIntelAlphabetBar();

  try {
      window.currentVisibleIntelIndices = [];
      window.populateIntelFilterDropdowns(false);

      const rawFactors = (typeof db !== 'undefined' && Array.isArray(db.factors)) ? db.factors : [];

      // 1. Resolve Active Top Tab Workspace (e.g. ALL, CORPORATE/M&A, LAW FIRMS, RSS FEED)
      const activeTopTab = (typeof currentWorkspace !== 'undefined' && currentWorkspace) 
          ? currentWorkspace 
          : "All";

      const searchBox = document.getElementById("searchFeed");
      const term = searchBox ? searchBox.value.toLowerCase().trim() : "";
      let filtered = rawFactors;

      // Apply Top Category Tab Filter
      if (activeTopTab !== "All" && activeTopTab !== "ALL INTELLIGENCE") {
          filtered = filtered.filter(f => {
              const ws = (f.workspace || "General Market").toLowerCase();
              return ws === activeTopTab.toLowerCase();
          });
      }

      // Apply Inner PESTLE Filter
      if (window.intelSelectedPestle && window.intelSelectedPestle !== "All") {
          filtered = filtered.filter(f => (f.pestle || "").toLowerCase() === window.intelSelectedPestle.toLowerCase());
      }

      // Apply Inner Sector Filter
      if (window.intelSelectedWorkspace && window.intelSelectedWorkspace !== "All") {
          filtered = filtered.filter(f => (f.workspace || "").toLowerCase() === window.intelSelectedWorkspace.toLowerCase());
      }

      // Text Search
      if (term) {
          filtered = filtered.filter(f => {
              const titleStr = (f.title || f.headline || "").toLowerCase();
              const summaryStr = (f.summary || "").toLowerCase();
              const descStr = (f.description || "").toLowerCase();
              const firmStr = (f.linkedFirm || f.linked_firm || "").toLowerCase();
              const conceptStr = (f.linkedConcept || f.linked_concept || "").toLowerCase();
              return titleStr.includes(term) || summaryStr.includes(term) || descStr.includes(term) || firmStr.includes(term) || conceptStr.includes(term);
          });
      }

      // A-Z Alphabet Filter
      if (window.activeIntelAlpha && window.activeIntelAlpha.size > 0) {
          filtered = filtered.filter(f => {
              const titleStr = (f.title || f.headline || "").trim();
              return titleStr ? window.activeIntelAlpha.has(titleStr.charAt(0).toUpperCase()) : false;
          });
      }

      // Sorting
      let indexedFactors = filtered.map(f => ({ factor: f, originalIndex: rawFactors.indexOf(f) }));
      const sortBox = document.getElementById("sortFeed");
      const sortMode = sortBox ? sortBox.value : "newest";

      if (sortMode === "newest") {
          indexedFactors.sort((a, b) => {
              const dateA = a.factor.date ? new Date(a.factor.date).getTime() : 0;
              const dateB = b.factor.date ? new Date(b.factor.date).getTime() : 0;
              return dateB - dateA;
          });
      } else if (sortMode === "az") {
          indexedFactors.sort((a, b) => String(a.factor.title || a.factor.headline || "").localeCompare(String(b.factor.title || b.factor.headline || "")));
      } else if (sortMode === "za") {
          indexedFactors.sort((a, b) => String(b.factor.title || b.factor.headline || "").localeCompare(String(a.factor.title || a.factor.headline || "")));
      }

      // Pagination
      const totalItems = indexedFactors.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / window.intelPageSize));
      if (window.intelCurrentPage > totalPages) window.intelCurrentPage = totalPages;
      if (window.intelCurrentPage < 1) window.intelCurrentPage = 1;

      const startIndex = (window.intelCurrentPage - 1) * window.intelPageSize;
      const pageFactors = indexedFactors.slice(startIndex, startIndex + window.intelPageSize);

      if (totalItems === 0) {
          container.innerHTML = `
              <div class="p-8 text-center bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none shadow-xs">
                  <p class="text-xs font-medium text-slate-500">No market intelligence records found matching "${activeTopTab}".</p>
              </div>`;
          return;
      }

      // Build Table Rows
      let rowsHtml = '';
      for (let i = 0; i < pageFactors.length; i++) {
          const { factor: f, originalIndex } = pageFactors[i];
          window.currentVisibleIntelIndices.push(originalIndex);
          const isChecked = window.selectedFactors.has(originalIndex) ? "checked" : "";

          const title = f.title || f.headline || "Untitled Intelligence";
          let subtitle = f.summary || "";
          if (!subtitle && f.description) {
              subtitle = f.description.substring(0, 100).replace(/<[^>]*>?/gm, '').trim();
          }
          if (subtitle.length > 85) subtitle = subtitle.substring(0, 85) + "...";

          const pestleBadge = getPestleBadge(f.pestle);
          const metricTag = f.metric ? `<span class="inline-block text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1.5 py-0.5 rounded-none mr-1.5">${f.metric}</span>` : '';
          
          const conceptsList = Array.isArray(f.linkedConcepts) && f.linkedConcepts.length > 0
              ? f.linkedConcepts
              : ((f.linkedConcept || f.linked_concept) ? [(f.linkedConcept || f.linked_concept)] : []);
              
          const firmsList = Array.isArray(f.linkedFirms) && f.linkedFirms.length > 0
              ? f.linkedFirms
              : ((f.linkedFirm || f.linked_firm) ? [(f.linkedFirm || f.linked_firm)] : []);

          const conceptsBadges = conceptsList.map(cName => {
              const enc = encodeURIComponent(cName);
              return `<span class="inline-flex items-center text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-none mr-1 cursor-pointer hover:underline" onclick="event.stopPropagation(); window.safeRouteToConcept ? window.safeRouteToConcept('${enc}') : window.routeToConceptTitle('${cName.replace(/'/g, "\\'")}');">${cName}</span>`;
          }).join('');

          const firmsBadges = firmsList.map(firmName => {
              const enc = encodeURIComponent(firmName);
              return `<span class="inline-flex items-center text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-none mr-1 cursor-pointer hover:underline" onclick="event.stopPropagation(); window.safeRouteToFirm ? window.safeRouteToFirm('${enc}') : (switchState('DOSSIERS'), routeToFirm('${firmName.replace(/'/g, "\\'")}'));">${firmName}</span>`;
          }).join('');

          const dateStr = f.date || "--";

          rowsHtml += `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onclick="window.viewIntelDetail(${originalIndex})">
                  <td class="py-2.5 px-4 text-center" onclick="event.stopPropagation()">
                      <input type="checkbox" ${isChecked} onchange="window.toggleIntelSelection(${originalIndex}, event)" class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                  </td>
                  <td class="py-2.5 px-4">
                      <div class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-xs leading-snug">
                          ${title}
                      </div>
                      <div class="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-md mt-0.5">
                          ${subtitle || "No summary text logged."}
                      </div>
                      <div class="mt-1 flex items-center flex-wrap gap-1">
                          ${metricTag}
                          ${conceptsBadges}
                          ${firmsBadges}
                      </div>
                  </td>
                  <td class="py-2.5 px-4 whitespace-nowrap">
                      ${pestleBadge}
                  </td>
                  <td class="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-semibold text-xs whitespace-nowrap">
                      ${f.workspace || "General Market"}
                  </td>
                  <td class="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      ${dateStr}
                  </td>
                  <td class="py-2.5 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                      <div class="inline-flex items-center gap-1">
                          <button type="button" onclick="window.viewIntelDetail(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Open Workspace">
                              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                          </button>
                          <button type="button" onclick="window.deleteIntelFactor(${originalIndex})" class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Delete">
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                      </div>
                  </td>
              </tr>`;
      }

      let pageBtns = '';
      for (let p = 1; p <= totalPages; p++) {
          pageBtns += `
              <button type="button" onclick="window.setIntelPage(${p})" class="w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${p === window.intelCurrentPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}">
                  ${p}
              </button>`;
      }

      container.innerHTML = `
          <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden flex flex-col">
              <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                      <thead>
                          <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <th class="py-2.5 px-4 w-10 text-center">
                                  <input type="checkbox" onchange="window.toggleSelectAllIntel()" class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                              </th>
                              <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 min-w-[320px]">Intelligence Record</th>
                              <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-32">PESTLE</th>
                              <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-36">Sector / Workspace</th>
                              <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-32">Date Logged</th>
                              <th class="py-2.5 px-4 font-bold text-slate-500 dark:text-slate-400 w-24 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                          ${rowsHtml}
                      </tbody>
                  </table>
              </div>

              <div class="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                  <span class="font-medium text-[11px]">Showing <strong>${startIndex + 1}</strong> to <strong>${Math.min(startIndex + window.intelPageSize, totalItems)}</strong> of <strong>${totalItems}</strong> records</span>
                  <div class="flex items-center gap-1 font-bold">
                      <button type="button" onclick="window.setIntelPage(${window.intelCurrentPage - 1})" ${window.intelCurrentPage === 1 ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&lt;</button>
                      ${pageBtns}
                      <button type="button" onclick="window.setIntelPage(${window.intelCurrentPage + 1})" ${window.intelCurrentPage === totalPages ? 'disabled class="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"' : 'class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"'}>&gt;</button>
                  </div>
              </div>
          </div>`;

      if (window.lucide) {
          window.lucide.createIcons({ root: container });
      }

      window.updateIntelSynthesisToolbar();

  } catch (err) {
      console.error("Intel rendering error:", err);
  }
};

// =========================================================================
// SELECTION & AI ACTIVE SYNTHESIS
// =========================================================================
window.toggleIntelSelection = function(index, event) {
    if (event) event.stopPropagation();
    if (window.selectedFactors.has(index)) {
        window.selectedFactors.delete(index);
    } else {
        window.selectedFactors.add(index);
    }
    window.updateIntelSynthesisToolbar();
};

window.toggleSelectAllIntel = function() {
    const visible = window.currentVisibleIntelIndices || [];
    const allSelected = visible.length > 0 && visible.every(idx => window.selectedFactors.has(idx));

    if (allSelected) {
        visible.forEach(idx => window.selectedFactors.delete(idx));
    } else {
        visible.forEach(idx => window.selectedFactors.add(idx));
    }
    window.renderFeed();
};

window.updateIntelSynthesisToolbar = function() {
    const count = window.selectedFactors ? window.selectedFactors.size : 0;
    const badge = document.getElementById("selectedIntelCountDisplay");
    const massDelBtn = document.getElementById("massDeleteIntelBtn");

    if (badge) {
        badge.innerText = `Selected (${count})`;
    }

    if (massDelBtn) {
        if (count > 0) {
            massDelBtn.classList.remove("hidden");
            massDelBtn.innerHTML = `<i data-lucide="trash" class="w-3.5 h-3.5"></i> Delete Selected (${count})`;
        } else {
            massDelBtn.classList.add("hidden");
        }
    }

    if (window.lucide) window.lucide.createIcons();
};

// Trigger AI synthesis simulation modes using selected intel
window.triggerIntelSynthesis = function(mode) {
    if (!window.selectedFactors || window.selectedFactors.size === 0) {
        alert("Please select at least one intelligence record in the table first.");
        return;
    }

    const selectedList = Array.from(window.selectedFactors).map(idx => db.factors[idx]).filter(Boolean);
    const personaEl = document.getElementById("intelPersonaSelect");
    const pressureEl = document.getElementById("intelPressureMode");

    const persona = personaEl ? personaEl.value : "Standard Partner";
    const isPressure = pressureEl ? pressureEl.checked : false;

    if (typeof openAIAssessmentModal === 'function') {
        openAIAssessmentModal({
            mode: mode,
            records: selectedList,
            persona: persona,
            pressure: isPressure,
            contextType: 'INTELLIGENCE'
        });
    } else {
        alert(`Launching ${mode.toUpperCase()} synthesis with ${selectedList.length} records under ${persona} (Pressure: ${isPressure ? 'ON' : 'OFF'}).`);
    }
};

// =========================================================================
// ROUTING & ACTIONS
// =========================================================================
window.viewIntelDetail = function(index) {
    if (typeof window.openIntelDetailWorkspace === 'function') {
        window.openIntelDetailWorkspace(index);
    } else {
        const f = db.factors[index];
        alert(`Opening ${f.title || f.headline}\n\n${f.summary || f.description || ''}`);
    }
};

window.routeToConceptTitle = function(conceptTitle) {
    if (!conceptTitle) return;
    const cleanTitle = conceptTitle.trim().toLowerCase();
    const idx = (db.concepts || []).findIndex(c => c && c.title && c.title.trim().toLowerCase() === cleanTitle);
    
    if (idx !== -1) {
        switchState('CONCEPTS');
        setTimeout(() => {
            if (typeof window.openConceptDetailWorkspace === 'function') {
                window.openConceptDetailWorkspace(idx);
            }
        }, 150);
    } else {
        alert(`Concept "${conceptTitle}" not found in your Knowledge Library.`);
    }
};

window.deleteIntelFactor = async function(index) {
    index = parseInt(index, 10);
    const f = db.factors[index];
    if (!f || !confirm(`Delete intelligence record: "${f.title || f.headline}"?`)) return;

    if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser) {
        await supabaseClient.from('factors')
            .delete()
            .match({ user_id: window.currentUser.id, title: f.title || f.headline });
    }

    db.factors.splice(index, 1);
    if (window.selectedFactors.has(index)) {
        window.selectedFactors.delete(index);
        window.updateIntelSynthesisToolbar();
    }

    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderFeed();
};

window.massDeleteIntel = async function() {
    if (!window.selectedFactors || window.selectedFactors.size === 0) return;
    if (!confirm(`Delete ${window.selectedFactors.size} selected intelligence record(s)?`)) return;

    const sortedIndices = Array.from(window.selectedFactors).sort((a, b) => b - a);
    const titlesToDelete = sortedIndices.map(idx => db.factors[idx] && (db.factors[idx].title || db.factors[idx].headline)).filter(Boolean);

    if (typeof supabaseClient !== 'undefined' && supabaseClient && window.currentUser && titlesToDelete.length > 0) {
        await supabaseClient.from('factors')
            .delete()
            .eq('user_id', window.currentUser.id)
            .in('title', titlesToDelete);
    }

    sortedIndices.forEach(idx => {
        db.factors.splice(idx, 1);
    });

    window.selectedFactors.clear();
    window.updateIntelSynthesisToolbar();

    if (typeof saveDatabase === 'function') saveDatabase();
    window.renderFeed();
};