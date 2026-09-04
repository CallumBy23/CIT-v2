// CONCEPTS RENDERING & KMS LOGIC
// ==========================================

window.toggleConceptCard = function(index, event) {
    if (event) {
        if (event.target.closest('button') || event.target.closest('a') || event.target.closest('input') || event.target.closest('.ql-editor') || event.target.closest('.dict-term')) {
            return;
        }
    }
    
    if (!db.concepts || !db.concepts[index]) return;
    const concept = db.concepts[index];

    // Find the card container from the click target
    const headerRow = event ? event.target.closest('.group') : null;
    const card = headerRow ? headerRow.closest('div.bg-white, div.dark\\:bg-\\[\\#0f172a\\]') : null;
    
    if (!card) return;

    const body = card.querySelector('.nexus-body');
    const icon = card.querySelector('.nexus-icon i');

    if (body) {
        // Read directly whether it is currently hidden in the DOM
        const isCurrentlyHidden = body.classList.contains('hidden');
        
        if (isCurrentlyHidden) {
            body.classList.remove('hidden');
            concept.isCollapsed = false;
            if (icon) icon.setAttribute('data-lucide', 'chevron-up');
        } else {
            body.classList.add('hidden');
            concept.isCollapsed = true;
            if (icon) icon.setAttribute('data-lucide', 'chevron-down');
        }

        if (window.lucide) window.lucide.createIcons();
    }

    if (typeof saveToLocalCache === 'function') saveToLocalCache();
};

// --- ALPHABET FILTER STATE ---
window.activeConceptAlpha = new Set();
window.activeDictAlpha = new Set();

window.toggleAlphabetFilter = function(letter, source) {
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);

    window.renderAlphabetBar(source);
    
    if (source === 'concepts') renderConcepts();
    if (source === 'dictionary' && typeof renderDictionary === 'function') renderDictionary();
};

window.renderAlphabetBar = function(source) {
    const containerId = source === 'concepts' ? 'conceptAlphabetBar' : 'dictAlphabetBar';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const set = source === 'concepts' ? window.activeConceptAlpha : window.activeDictAlpha;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    
    container.innerHTML = alphabet.map(letter => {
        const isActive = set.has(letter);
        const baseClass = "px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition shrink-0 border ";
        const activeClass = isActive 
            ? "bg-indigo-600 text-white border-indigo-700 shadow-inner" 
            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white";
        return `<button onclick="window.toggleAlphabetFilter('${letter}', '${source}')" class="${baseClass} ${activeClass}">${letter}</button>`;
    }).join('');
};

window.saveConcept = function() {
    const title = document.getElementById("conceptTitle").value.trim();
    
    let htmlBody = "";
    const editorEl = document.querySelector('#conceptBodyQuill .ql-editor');
    if (editorEl) {
        htmlBody = editorEl.innerHTML;
    } else if (typeof quillEditor !== 'undefined' && quillEditor.root) {
        htmlBody = quillEditor.root.innerHTML;
    }
    
    const cleanText = htmlBody.replace(/<[^>]*>?/gm, '').trim();
    
    if (!title || !cleanText) {
        alert("Please enter a Concept Name and Definition before saving.");
        return;
    }

    const catToSave = (!currentConceptCategory || currentConceptCategory === "All") ? (db.conceptCategories && db.conceptCategories[0] ? db.conceptCategories[0] : "General") : currentConceptCategory;
    
    db.concepts.push({
      title, category: catToSave, body: htmlBody, summary: "",
      subTag: document.getElementById("conceptSubTag").value,
      diagram: typeof diagramTempBase64 !== 'undefined' ? diagramTempBase64 : "", 
      srs: { nextReview: new Date().getTime(), interval: 0, ease: 2.5, mastered: false, lastRating: 'forgot' },
      date: new Date().toLocaleDateString('en-GB'), isCollapsed: false, score: ""
    });
    
    if(typeof saveDatabase === 'function') saveDatabase(); 
    if(typeof updateNexusDropdowns === 'function') updateNexusDropdowns(); 
    renderConcepts();
    
    document.getElementById("conceptTitle").value = ""; 
    document.getElementById("conceptSubTag").value = ""; 
    
    if(editorEl) editorEl.innerHTML = "";
    else if(typeof quillEditor !== 'undefined') quillEditor.setContents([]);
    
    if(typeof diagramTempBase64 !== 'undefined') window.diagramTempBase64 = "";
    
    const preview = document.getElementById("newConceptDiagramPreview");
    if(preview) {
        preview.classList.add("hidden");
        preview.src = "";
    }
    const label = document.getElementById("newConceptDiagramLabel");
    if(label) label.innerText = "Add Diagram";
    
    if(typeof toggleAppSidebar === 'function' && window.innerWidth < 768) {
         toggleAppSidebar('conceptLogSidebar');
    }
};

window.renderConcepts = function() {
    const container = document.getElementById("conceptsContainer");
    if (!container) return;
    
    try {
        container.innerHTML = "";
        currentVisibleConceptIndices = [];

        const widgetContainer = document.getElementById("conceptMasteryWidget");
        if (widgetContainer) {
            const catStats = {};
            
            (db.concepts || []).forEach(c => {
                if (c && c.category && c.category !== "All") {
                    if (!catStats[c.category]) catStats[c.category] = { total: 0, mastered: 0 };
                    catStats[c.category].total++;
                    if (c.srs && (c.srs.mastered || c.srs.interval >= 21)) {
                        catStats[c.category].mastered++;
                    }
                }
            });

            let masteryHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-sm print:hidden w-full flex flex-col">
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0"><i data-lucide="target" class="w-4 h-4 text-emerald-500"></i> Concept Mastery</h3>
                <div class="flex flex-col gap-5 max-h-[400px] overflow-y-auto pr-2 pb-10 scrollbar-hide">`;

            let hasData = false;
            for (const [cat, data] of Object.entries(catStats)) {
                if (data.total === 0) continue;
                hasData = true;
                const pct = Math.round((data.mastered / data.total) * 100);
                
                let barColor = pct === 100 ? 'bg-amber-400' : (pct > 50 ? 'bg-emerald-400' : 'bg-indigo-500');
                let textColor = pct === 100 ? 'text-amber-500 dark:text-amber-400' : (pct > 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400');

                masteryHTML += `
                    <div class="flex flex-col w-full">
                        <div class="flex justify-between text-[10px] font-bold mb-2 uppercase tracking-wider">
                            <span class="text-slate-600 dark:text-slate-400 truncate mr-2">${cat}</span>
                            <span class="${textColor}">${pct}%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                            <div class="${barColor} h-full rounded-full transition-all duration-700 shadow-sm" style="width: ${pct}%"></div>
                        </div>
                    </div>`;
            }
            masteryHTML += `</div></div>`;
            
            if (hasData) {
                widgetContainer.innerHTML = masteryHTML;
                widgetContainer.classList.remove('hidden');
            } else {
                widgetContainer.innerHTML = '';
                widgetContainer.classList.add('hidden');
            }
        }

        const searchBox = document.getElementById("searchConcepts");
        const term = searchBox ? String(searchBox.value || "").toLowerCase() : "";
        let filtered = (db.concepts || []);

        if (typeof currentConceptCategory !== 'undefined' && currentConceptCategory !== "All") {
            filtered = filtered.filter(c => c.category === currentConceptCategory);
        }

        if (term) {
            filtered = filtered.filter(c => 
                String(c.title || "").toLowerCase().includes(term) || 
                String(c.body || "").toLowerCase().includes(term)
            );
        }

        if (window.activeConceptAlpha && window.activeConceptAlpha.size > 0) {
            filtered = filtered.filter(c => {
                const titleStr = String(c.title || "").trim();
                if (!titleStr) return false;
                const firstLetter = titleStr.charAt(0).toUpperCase();
                return window.activeConceptAlpha.has(firstLetter);
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="p-8 text-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md print:hidden"><p class="text-sm font-medium text-slate-500 dark:text-slate-400">No concepts match your search or filters.</p></div>`;
            return;
        }

        let indexedConcepts = filtered.map(c => ({ concept: c, originalIndex: db.concepts.indexOf(c) }));
        const sortBox = document.getElementById("sortConcepts");
        const sortMode = sortBox ? sortBox.value : "newest";

        if (sortMode === "newest") {
            indexedConcepts.reverse();
        } else if (sortMode === "az") {
            indexedConcepts.sort((a, b) => String(a.concept.title || "").localeCompare(String(b.concept.title || "")));
        } else if (sortMode === "za") {
            indexedConcepts.sort((a, b) => String(b.concept.title || "").localeCompare(String(a.concept.title || "")));
        }

        indexedConcepts.forEach(({concept, originalIndex}) => {
            currentVisibleConceptIndices.push(originalIndex);
            
            const isCollapsed = concept.isCollapsed !== false;
            const isChecked = typeof window.selectedConcepts !== 'undefined' && window.selectedConcepts.has(originalIndex) ? "checked" : "";
            
            let srsBadge = '';
            if (concept.srs && concept.srs.mastered) {
                 srsBadge = `<span class="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800 mt-2 inline-block">🏆 Mastered</span>`;
            } else if (!concept.srs || !concept.srs.nextReview) {
                 srsBadge = `<span class="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 mt-2 inline-block">✨ New Card</span>`;
            } else {
                const now = new Date().getTime();
                if (concept.srs.nextReview <= now) {
                    srsBadge = `<span class="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-bold border border-red-200 dark:border-red-800 mt-2 inline-block">⚠️ Due Review</span>`;
                } else {
                    const days = Math.ceil((concept.srs.nextReview - now) / (1000 * 60 * 60 * 24));
                    srsBadge = `<span class="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800 mt-2 inline-block">⏳ Next: ${days}d</span>`;
                }
            }

            const subTagHTML = concept.subTag ? `<span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold uppercase mt-2 inline-block border border-slate-200 dark:border-slate-700 mr-2">${concept.subTag}</span>` : '';
            const diagramHTML = concept.diagram ? `<div class="mt-4"><img src="${concept.diagram}" class="w-full max-h-64 object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"></div>` : '';

            const card = document.createElement("div");
            card.className = "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-md p-4 md:p-5 shadow-sm print:break-inside-avoid print:border-slate-400 print:shadow-none group transition hover:border-indigo-400 dark:hover:border-indigo-500 w-full";
            
            card.innerHTML = `
              <div class="flex flex-col md:flex-row justify-between md:items-start mb-3 group gap-2 cursor-pointer" onclick="window.toggleConceptCard(${originalIndex}, event)">
                <div class="flex items-start gap-3 flex-1">
                  <input type="checkbox" ${isChecked} onchange="window.toggleConceptSelection(${originalIndex}, event)" class="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer print:hidden shrink-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-indigo-500">
                  <div class="flex flex-col min-w-0 w-full">
                    <div class="flex justify-between items-start w-full">
                      <h4 class="font-bold text-slate-900 dark:text-white text-sm md:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition md:pr-4 print:text-black break-words leading-snug">${concept.title || "Untitled Concept"}</h4>
                      <div class="flex items-center gap-2 shrink-0 ml-2 mt-1 md:mt-0">
                         <button onclick="event.stopPropagation(); window.openEditConceptModal(${originalIndex});" class="text-[10px] md:text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition print:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 shadow-sm"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Edit</span></button>
                         <span class="nexus-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition print:hidden"><i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i></span>
                      </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-1 mt-1.5">${subTagHTML}${srsBadge}</div>
                  </div>
                </div>
                <div class="flex gap-2 shrink-0 items-center justify-end w-full md:w-auto">
                  <span class="text-[10px] md:text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-sm font-bold uppercase border border-slate-200 dark:border-slate-700 print:bg-white print:text-black print:border-slate-300 shrink-0 shadow-inner">${concept.category || "General"}</span>
                </div>
              </div>
              <div class="nexus-body ${isCollapsed ? 'hidden print:block' : 'block'} border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 print:border-slate-300 cursor-text" onclick="event.stopPropagation()">
                <div class="prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-slate-200 leading-relaxed mb-4 print:text-black dict-highlight-target dark:prose-invert">${concept.body || ""}</div>
                ${diagramHTML}
                <div class="mt-4 flex gap-3 print:hidden">
                  <button onclick="event.stopPropagation(); window.deleteConcept(${originalIndex});" class="flex-1 md:flex-none text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 font-bold py-1.5 px-3 rounded-sm transition shadow-sm flex items-center justify-center gap-1.5"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete</button>
                </div>
              </div>
            `;
            container.appendChild(card);
        });
        
        if (window.lucide) window.lucide.createIcons();
        if (typeof applyDictionaryHighlighting === 'function') applyDictionaryHighlighting("conceptsContainer");

    } catch (err) {
        console.error("Critical rendering error in concepts.js:", err);
        container.innerHTML = `<div class="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md print:hidden"><h3 class="text-red-700 dark:text-red-400 font-bold">Data Rendering Error</h3><p class="text-red-600 dark:text-red-300 text-sm mt-2">A corrupt record caused the page to stop drawing. Error details: ${err.message}</p></div>`;
    }
};

window.openEditConceptModal = function(index) {
    const c = db.concepts[index];
    document.getElementById("editConceptIndex").value = index;
    document.getElementById("editConceptTitle").value = c.title || "";
    document.getElementById("editConceptSubTag").value = c.subTag || "";
    
    const catSelect = document.getElementById("editConceptCategory");
    if(catSelect) {
        catSelect.innerHTML = db.conceptCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        catSelect.value = c.category || db.conceptCategories[0];
    }
    
    // Lazy-load Edit Quill Instance
    window.editQuillEditor = window.getOrInitQuill('#editConceptBodyQuill', { 
        modules: { toolbar: '#editConceptToolbar' } 
    });

    if (window.editQuillEditor && window.editQuillEditor.root) {
        window.editQuillEditor.root.innerHTML = c.body || "";
    }

    const previewImg = document.getElementById("editConceptDiagramPreview");
    if (previewImg) {
        if (c.diagram) {
            previewImg.src = c.diagram;
            previewImg.classList.remove("hidden");
            document.getElementById("editConceptDiagramLabel").innerText = "Edit Diagram";
        } else {
            previewImg.src = "";
            previewImg.classList.add("hidden");
            document.getElementById("editConceptDiagramLabel").innerText = "Add Diagram";
        }
    }

    document.getElementById("editConceptModalContainer").classList.remove('hidden');
};

window.saveConceptEditFn = function() {
    const indexStr = document.getElementById("editConceptIndex").value;
    if (indexStr === "") return;
    const index = parseInt(indexStr, 10);
    
    db.concepts[index].title = document.getElementById("editConceptTitle").value;
    db.concepts[index].subTag = document.getElementById("editConceptSubTag").value;
    db.concepts[index].category = document.getElementById("editConceptCategory").value;
    
    let bodyHtml = "";
    const editorEl = document.querySelector('#editConceptBodyQuill .ql-editor');
    if (editorEl) {
        bodyHtml = editorEl.innerHTML;
    } else if (window.editQuillEditor && window.editQuillEditor.root) {
        bodyHtml = window.editQuillEditor.root.innerHTML;
    }
    
    db.concepts[index].body = bodyHtml === "<p><br></p>" ? "" : bodyHtml;
    
    if (typeof diagramTempBase64 !== 'undefined' && diagramTempBase64) {
        db.concepts[index].diagram = diagramTempBase64;
    }
    
    document.getElementById("editConceptModalContainer").classList.add('hidden');
    if(typeof saveDatabase === 'function') saveDatabase();
    renderConcepts();
};

window.selectedConcepts = window.selectedConcepts || new Set();

window.toggleConceptSelection = function(index, event) {
    event.stopPropagation();
    if (event.target.checked) window.selectedConcepts.add(index);
    else window.selectedConcepts.delete(index);
    if(typeof updateMassDeleteConceptBtn === 'function') window.updateMassDeleteConceptBtn();
};

window.updateMassDeleteConceptBtn = function() {
    const btn = document.getElementById('massDeleteConceptBtn');
    if (!btn) return;
    if (window.selectedConcepts.size > 0) {
        btn.classList.remove('hidden');
        btn.innerHTML = `<i data-lucide="trash" class="w-3.5 h-3.5"></i> Delete (${window.selectedConcepts.size})`;
        if (window.lucide) window.lucide.createIcons();
    } else {
        btn.classList.add('hidden');
    }
};

window.massDeleteConcepts = function() {
    if(!window.selectedConcepts || window.selectedConcepts.size === 0) return;
    if(confirm(`Delete ${window.selectedConcepts.size} selected concept(s)?`)) {
        
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        if (statusText) statusText.innerText = "Syncing Deletion...";
        if (statusDot) statusDot.className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse";

        let sortedIndices = Array.from(window.selectedConcepts).sort((a,b)=>b-a);
        sortedIndices.forEach(idx => { 
            let conceptTitle = db.concepts[idx].title;
            if (db.factors) {
                db.factors.forEach(f => { if(f && f.linkedConcept === conceptTitle) f.linkedConcept = ""; });
            }
            db.concepts.splice(idx, 1); 
        });
        window.selectedConcepts.clear();
        if (typeof window.updateMassDeleteConceptBtn === 'function') window.updateMassDeleteConceptBtn();
        if(typeof updateNexusDropdowns === 'function') { try { updateNexusDropdowns(); } catch(e){} }
        if(typeof saveDatabase === 'function') saveDatabase();
        renderConcepts();
    }
};

window.deleteConcept = async function(index) {
    index = parseInt(index, 10);
    const concept = db.concepts[index];
    if (!concept || !confirm(`Delete concept: "${concept.title}"?`)) return;
    
    // Remote RLS deletion
    if (supabaseClient && window.currentUser) {
        await supabaseClient.from('concepts')
            .delete()
            .match({ user_id: window.currentUser.id, title: concept.title });
    }

    db.concepts.splice(index, 1);
    saveDatabase();
    renderConcepts();
};