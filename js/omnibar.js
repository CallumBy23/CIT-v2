// GLOBAL OMNIBAR & SHORTCUT ENGINE
// ==========================================

// Track the current playbook drawing tool state
window.pbCurrentMode = null; 

function initOmnibarListener() {
    // { capture: true } intercepts keys before Chrome/Gemini extensions steal them
    window.addEventListener('keydown', (e) => {
        const isMod = e.metaKey || e.ctrlKey;
        const key = e.key ? e.key.toLowerCase() : '';

        // 1. OMNIBAR: Cmd/Ctrl + Shift + Z
        if (isMod && e.shiftKey && key === 'z') {
            e.preventDefault();
            e.stopImmediatePropagation();
            toggleOmnibar();
            return;
        }

        // 2. FORCE SYNC TO CLOUD (Cmd/Ctrl + S)
        if (isMod && !e.shiftKey && key === 's') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if(typeof saveDatabase === 'function') saveDatabase();
            if(typeof showToast === 'function') showToast("Manual sync complete.", "success");
            return;
        }

        // 3. PLAYBOOK SHORTCUTS (Cmd/Ctrl + I for Node, Cmd/Ctrl + E for Edge)
        if (isMod && !e.shiftKey && key === 'i') {
            if (appState === 'PLAYBOOKS' && typeof playbookNetwork !== 'undefined' && playbookNetwork) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (window.pbCurrentMode === 'node') {
                    playbookNetwork.enableEditMode(); // Resets to default toolbar state
                    window.pbCurrentMode = null;
                } else {
                    playbookNetwork.addNodeMode();
                    window.pbCurrentMode = 'node';
                }
                return;
            }
        }
        
        if (isMod && !e.shiftKey && key === 'e') {
            if (appState === 'PLAYBOOKS' && typeof playbookNetwork !== 'undefined' && playbookNetwork) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (window.pbCurrentMode === 'edge') {
                    playbookNetwork.enableEditMode(); // Cancels drawing edge
                    window.pbCurrentMode = null;
                } else {
                    playbookNetwork.addEdgeMode();
                    window.pbCurrentMode = 'edge';
                }
                return;
            }
        }

        // 4. SMART SAVE (Cmd/Ctrl + Enter)
        if (isMod && e.key === 'Enter') {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            // Priority A: Is a specific editing drawer or modal open?
            if (document.getElementById('playbookDrawer') && !document.getElementById('playbookDrawer').classList.contains('translate-x-full')) return saveNodeData();
            if (document.getElementById('editModalContainer') && !document.getElementById('editModalContainer').classList.contains('hidden')) return saveEdit();
            if (document.getElementById('editConceptModalContainer') && !document.getElementById('editConceptModalContainer').classList.contains('hidden')) return window.saveConceptEditFn();
            if (document.getElementById('compModalContainer') && !document.getElementById('compModalContainer').classList.contains('hidden')) return saveCompetency();
            if (document.getElementById('practiceModalContainer') && !document.getElementById('practiceModalContainer').classList.contains('hidden')) return window.savePracticeFn();
            if (document.getElementById('clientsModalContainer') && !document.getElementById('clientsModalContainer').classList.contains('hidden')) return window.saveClientsFn();
            if (document.getElementById('aiModalContainer') && !document.getElementById('aiModalContainer').classList.contains('hidden')) {
                const btn = document.getElementById("aiSubmitBtn");
                if (btn) return btn.click();
            }

            // Priority B: No modals open, trigger default save for the active app state
            if (typeof appState !== 'undefined') {
                if (appState === 'INTELLIGENCE' && typeof saveManualFactor === 'function') saveManualFactor();
                else if (appState === 'CONCEPTS' && typeof saveConcept === 'function') saveConcept();
                else if (appState === 'DICTIONARY' && typeof saveDictionaryTerm === 'function') saveDictionaryTerm();
                else if (appState === 'DOSSIERS' && !document.getElementById('dossierEditMode').classList.contains('hidden') && typeof saveDossierData === 'function') saveDossierData();
            }
            return;
        }

        // 5. QUICK NAVIGATION (Cmd/Ctrl + 1 through 6)
        if (isMod && !e.shiftKey && ['1','2','3','4','5','6'].includes(key)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const states = ['INTELLIGENCE', 'CONCEPTS', 'DOSSIERS', 'DICTIONARY', 'PLAYBOOKS', 'GRAPH'];
            const targetState = states[parseInt(key) - 1];
            if (typeof switchState === 'function') switchState(targetState);
            return;
        }

        // 6. ESCAPE (Close Modals, Drawers, and Drawing Modes)
        if (e.key === 'Escape') {
            closeOmnibar();
            
            if (typeof closePlaybookDrawer === 'function') closePlaybookDrawer();
            
            // Cleanly exit playbook drawing modes on Escape
            if (appState === 'PLAYBOOKS' && typeof playbookNetwork !== 'undefined' && playbookNetwork) {
                playbookNetwork.enableEditMode();
                window.pbCurrentMode = null;
            }
            
            // Close mobile sidebars if open
            ["intelLogSidebar", "conceptLogSidebar", "dictSidebar", "playbooksSidebar"].forEach(id => {
                const el = document.getElementById(id);
                if (el && window.innerWidth < 768) el.classList.add('-translate-x-full');
            });
        }
    }, { capture: true });
}

function toggleOmnibar() {
    const ob = document.getElementById('omnibarContainer');
    if(ob.classList.contains('hidden')) {
        ob.classList.remove('hidden');
        ob.classList.add('flex');
        document.getElementById('omnibarInput').focus();
        runOmnibarSearch();
    } else {
        closeOmnibar();
    }
}

function closeOmnibar() {
    const ob = document.getElementById('omnibarContainer');
    ob.classList.add('hidden');
    ob.classList.remove('flex');
    document.getElementById('omnibarInput').value = "";
}

function runOmnibarSearch() {
    const q = document.getElementById('omnibarInput').value.toLowerCase();
    const resultsBox = document.getElementById('omnibarResults');
    resultsBox.innerHTML = "";
    
    if(!q) return;

    let results = [];

    (db.concepts || []).forEach(c => {
        const title = (c.title || "").toLowerCase();
        const body = (c.body || "").toLowerCase();
        if(title.includes(q) || body.includes(q)) {
            results.push({ type: 'KMS Concept', title: c.title, tag: c.category, action: `routeToConcept('${(c.title||'').replace(/'/g, "\\'")}')` });
        }
    });

    (db.factors || []).forEach(f => {
        const title = (f.title || "").toLowerCase();
        const desc = (f.description || "").toLowerCase();
        if(title.includes(q) || desc.includes(q)) {
            results.push({ type: 'Market Intel', title: f.title, tag: f.workspace, action: `switchState('INTELLIGENCE'); currentWorkspace='${f.workspace}'; document.getElementById('searchFeed').value='${(f.title||'').replace(/'/g, "\\'")}'; renderTabs(); renderFeed(); closeOmnibar();` });
        }
    });

    for (const [firm, data] of Object.entries(db.dossiers || {})) {
        const firmLower = firm.toLowerCase();
        
        const pracString = Array.isArray(data.practice) ? data.practice.map(p => p.heading + " " + p.body).join(" ").toLowerCase() : "";
        const clientString = Array.isArray(data.clients) ? data.clients.map(c => c.heading + " " + c.body).join(" ").toLowerCase() : "";
        
        if(firmLower.includes(q) || pracString.includes(q) || clientString.includes(q)) {
            results.push({ type: 'Firm Dossier', title: firm, tag: 'Strategy Room', action: `routeToFirm('${firm.replace(/'/g, "\\'")}')` });
        }
    }

    (db.dictionary || []).forEach(d => {
        const term = (d.term || "").toLowerCase();
        const def = (d.definition || "").toLowerCase();
        if(term.includes(q) || def.includes(q)) {
            results.push({ type: 'Dictionary', title: d.term, tag: 'Glossary', action: `switchState('DICTIONARY'); document.getElementById('searchDictionary').value='${(d.term||'').replace(/'/g, "\\'")}'; renderDictionary(); closeOmnibar();` });
        }
    });

    if(results.length === 0) {
        resultsBox.innerHTML = `<p class="text-sm text-gray-500 p-3 italic text-center">No results found.</p>`;
        return;
    }

    results.slice(0, 15).forEach(r => {
        let color = 'bg-gray-100 text-gray-700';
        if(r.type === 'KMS Concept') color = 'bg-blue-100 text-blue-800';
        if(r.type === 'Market Intel') color = 'bg-indigo-100 text-indigo-800';
        if(r.type === 'Firm Dossier') color = 'bg-slate-200 text-slate-800 border-slate-300 border';

        const item = document.createElement('div');
        item.className = "p-3 hover:bg-white rounded-lg cursor-pointer border border-transparent hover:border-gray-200 hover:shadow-sm transition flex justify-between items-center group";
        item.onclick = new Function(r.action);
        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${color}">${r.type}</span>
                <span class="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-600 transition">${r.title}</span>
            </div>
            <span class="text-xs text-gray-400 shrink-0 ml-2 hidden sm:block">${r.tag}</span>
        `;
        resultsBox.appendChild(item);
    });
}