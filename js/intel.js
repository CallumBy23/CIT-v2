// INTELLIGENCE RENDERING & LOGIC
// ==========================================
function renderPestleFilters() {
  const container = document.getElementById("pestleFilters");
  container.innerHTML = "";
  PESTLE_CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.innerText = cat;
    btn.className = `px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 ${activePestleFilter === cat ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`;
    btn.onclick = () => { activePestleFilter = cat; selectedFactors.clear(); updateMassDeleteIntelBtn(); renderPestleFilters(); renderFeed(); };
    container.appendChild(btn);
  });
}

function renderFeed() {
  const container = document.getElementById("cardsContainer");
  const sidebar = document.getElementById("intelLogSidebar");
  const pestleFilters = document.getElementById("pestleFilters");
  const intelAIHeader = document.getElementById("intelAIHeader");
  const fab = document.querySelector("#appIntelligence button[onclick*='intelLogSidebar']");
  
  if (currentWorkspace === "Interview Vault") {
      sidebar.classList.replace("md:block", "hidden");
      pestleFilters.classList.add("hidden"); intelAIHeader.classList.add("hidden");
      if(fab) fab.classList.add("hidden");
  } else {
      sidebar.classList.remove("hidden"); sidebar.classList.add("md:block");
      pestleFilters.classList.remove("hidden"); intelAIHeader.classList.remove("hidden");
      if(fab) fab.classList.remove("hidden");
  }
  
  container.innerHTML = "";
  currentVisibleFactorIndices = [];
  const term = String(document.getElementById("searchFeed").value || "").toLowerCase();
  
  let filtered = (db.factors || []).filter(f => 
      f && 
      (currentWorkspace === "All" || f.workspace === currentWorkspace) && 
      (activePestleFilter === "All" || f.pestle === activePestleFilter)
  );

  if (term) {
      filtered = filtered.filter(f => 
          String(f.title || "").toLowerCase().includes(term) || 
          String(f.description || "").toLowerCase().includes(term)
      );
  }
  
  if (filtered.length === 0) {
      container.innerHTML = `<p class="text-slate-500 italic mt-4 print:hidden">No records match.</p>`;
      return;
  }

  let indexedFactors = filtered.map(f => ({ factor: f, originalIndex: db.factors.indexOf(f) }));
  const sortMode = document.getElementById("sortFeed").value;
  
  // SAFE SORTING: Casts to string to prevent crashes on numerical data
  if (sortMode === "newest") {
      indexedFactors.reverse();
  } else if (sortMode === "az") {
      indexedFactors.sort((a, b) => String(a.factor.title || "").localeCompare(String(b.factor.title || "")));
  } else if (sortMode === "za") {
      indexedFactors.sort((a, b) => String(b.factor.title || "").localeCompare(String(a.factor.title || "")));
  }

  indexedFactors.forEach(({factor, originalIndex}) => {
    currentVisibleFactorIndices.push(originalIndex);
    const isCollapsed = factor.isCollapsed !== false;
    const isChecked = typeof selectedFactors !== 'undefined' && selectedFactors.has(originalIndex) ? "checked" : "";
    
    const safeConcept = factor.linkedConcept ? String(factor.linkedConcept).replace(/'/g, "\\'") : "";
    const safeFirm = factor.linkedFirm ? String(factor.linkedFirm).replace(/'/g, "\\'") : "";
    
    const nexusBadge = factor.linkedConcept ? `<button onclick="routeToConcept('${safeConcept}')" class="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-0.5 rounded-full font-bold shadow-sm border border-blue-200 inline-block mt-2 shrink-0 transition dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">🔗 ${factor.linkedConcept}</button>` : '';
    const firmBadge = factor.linkedFirm ? `<button onclick="routeToFirm('${safeFirm}')" class="text-[10px] bg-slate-200 text-slate-800 hover:bg-slate-300 px-2 py-0.5 rounded-full font-bold shadow-sm border border-slate-300 inline-block mt-2 md:ml-2 shrink-0 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">🏢 ${factor.linkedFirm}</button>` : '';
    const competencyBadge = (currentWorkspace === "Interview Vault" && factor.competency) ? `<span class="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold shadow-sm border border-purple-200 mt-2 md:ml-2 inline-block shrink-0 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">🎯 ${factor.competency}</span>` : '';
    const scoreBadge = factor.score ? `<span class="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full mt-2 md:ml-2 inline-block shrink-0 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">🏆 ${factor.score}</span>` : '';

    const starHTML = (currentWorkspace === "Interview Vault" && factor.starExport) ? 
                     `<div class="bg-amber-50/80 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800 mt-4 print:bg-white print:border-slate-300"><h5 class="text-amber-800 dark:text-amber-400 font-bold text-xs uppercase mb-2 print:text-black">⭐ STAR Method Export</h5><p class="text-sm text-amber-900 dark:text-amber-200 print:text-black">${factor.starExport}</p></div>` : 
                     (currentWorkspace === "Interview Vault" ? `<button onclick="exportToStar(${originalIndex})" class="mt-4 w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded shadow-sm flex items-center justify-center gap-1 print:hidden" id="star-btn-${originalIndex}">⭐ Export to STAR format</button>` : '');

    const card = document.createElement("div");
    card.className = "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-md p-4 md:p-5 shadow-sm print:break-inside-avoid print:border-slate-400 print:shadow-none group cursor-pointer transition hover:border-indigo-400 dark:hover:border-indigo-500";
    
    card.onclick = function(e) {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
        const body = this.querySelector('.nexus-body');
        const icon = this.querySelector('.nexus-icon i');
        if(body && icon) {
            body.classList.toggle('hidden');
            if (body.classList.contains('hidden')) {
                icon.setAttribute('data-lucide', 'chevron-down');
            } else {
                icon.setAttribute('data-lucide', 'chevron-up');
            }
            if (window.lucide) window.lucide.createIcons();
            db.factors[originalIndex].isCollapsed = body.classList.contains('hidden');
            if (typeof saveDatabase === 'function') saveDatabase();
        }
    };

    card.innerHTML = `
      <div class="flex flex-col md:flex-row justify-between md:items-start mb-3 group gap-2">
        <div class="flex items-start gap-3 flex-1">
          <input type="checkbox" ${isChecked} onchange="toggleFactorSelection(${originalIndex}, event)" class="mt-1 w-4 h-4 text-indigo-600 rounded print:hidden cursor-pointer shrink-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-indigo-500">
          <div class="flex flex-col min-w-0 w-full">
            <div class="flex justify-between items-start w-full">
                <h4 class="font-bold text-slate-900 dark:text-white text-sm md:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition md:pr-4 print:text-black break-words leading-snug">${factor.title || "Untitled Insight"}</h4>
                <span class="nexus-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition print:hidden"><i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i></span>
            </div>
            <div class="flex flex-wrap items-center gap-1">${nexusBadge}${firmBadge}${competencyBadge}${scoreBadge}</div>
          </div>
        </div>
        <div class="flex gap-2 shrink-0 items-center justify-end w-full md:w-auto">
          <span class="text-[10px] md:text-xs bg-slate-800 dark:bg-slate-700 text-white px-2 py-1 rounded-sm font-bold uppercase truncate max-w-[150px] print:bg-white print:border print:border-slate-300 print:text-slate-800">${factor.metric || factor.region || "Global"}</span>
          <span class="text-[10px] md:text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-sm font-bold uppercase border border-transparent dark:border-indigo-800 print:bg-white print:border print:border-indigo-300 print:text-indigo-800">${factor.pestle || "Assessment"}</span>
        </div>
      </div>
      <div class="nexus-body ${isCollapsed ? 'hidden print:block' : 'block'} border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 print:border-slate-300 cursor-text" onclick="event.stopPropagation()">
        
        <div class="prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-slate-200 mb-4 print:text-black dict-highlight-target dark:prose-invert">${factor.description || ""}</div>
        
        ${currentWorkspace !== "Interview Vault" ? `
        <div class="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg p-3 md:p-4 border border-indigo-100 dark:border-indigo-800/50 print:bg-white print:border-slate-300">
          <div class="flex flex-col md:flex-row justify-between md:items-center mb-2 gap-2">
            <span class="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider print:text-black flex items-center gap-1.5"><i data-lucide="zap" class="w-3.5 h-3.5"></i> Implications</span>
            <button onclick="synthesizeFactorAi(${originalIndex})" class="w-full md:w-auto text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold py-1.5 md:py-1 px-3 rounded-sm transition flex justify-center items-center gap-1.5 shadow-sm print:hidden shrink-0 border border-indigo-200 dark:border-indigo-700"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Synthesize AI</button>
          </div>
          <div class="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 print:text-black dict-highlight-target dark:prose-invert" id="implication-text-${originalIndex}">${factor.implications || "<p>Click 'Synthesize AI' to generate commercial implications.</p>"}</div>
        </div>` : ''}
        ${starHTML}
        <div class="mt-4 flex gap-3 print:hidden">
          <button onclick="openEditModal(${originalIndex})" class="flex-1 md:flex-none text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold py-1.5 px-3 rounded-sm transition flex justify-center items-center gap-1.5"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit / Move</button>
          <button onclick="deleteFactor(${originalIndex})" class="flex-1 md:flex-none text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-1.5 px-3 rounded-sm transition flex justify-center items-center gap-1.5"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  
  if (window.lucide) window.lucide.createIcons();
  if (typeof applyDictionaryHighlighting === 'function') applyDictionaryHighlighting("cardsContainer");
}

function saveManualFactor() {
  const title = document.getElementById("logHeadline").value;
  if(!title) return;

  // SILENT FALLBACK: Prevents saving data to "All"
  const wsToSave = (!currentWorkspace || currentWorkspace === "All") ? "General Market" : currentWorkspace;
  const descriptionHtml = intelLogQuill.root.innerHTML === "<p><br></p>" ? "" : intelLogQuill.root.innerHTML;

  db.factors.push({ 
      workspace: wsToSave, 
      title, 
      pestle: document.getElementById("logPestle").value, 
      region: document.getElementById("logRegion").value, 
      metric: document.getElementById("logMetric").value, 
      description: descriptionHtml, 
      implications: "", 
      linkedConcept: document.getElementById("logLinkedConcept").value, 
      linkedFirm: document.getElementById("logLinkedFirm").value, 
      date: new Date().toLocaleDateString(), 
      isCollapsed: false, 
      score: "" 
  });
  
  saveDatabase(); renderFeed();
  
  document.getElementById("logHeadline").value = ""; 
  document.getElementById("logMetric").value = ""; 
  intelLogQuill.setContents([]); 
  document.getElementById("logLinkedConcept").value = ""; 
  document.getElementById("logLinkedFirm").value = "";
}

function openEditModal(index) {
  const f = db.factors[index];
  document.getElementById("editIndex").value = index;
  document.getElementById("editTitle").value = f.title;
  
  const wsSelect = document.getElementById("editWorkspaceSelect");
  wsSelect.innerHTML = db.workspaces.map(w => `<option value="${w}">${w}</option>`).join('');
  wsSelect.value = f.workspace;

  document.getElementById("editLinkedConcept").value = f.linkedConcept || "";
  document.getElementById("editLinkedFirm").value = f.linkedFirm || "";
  document.getElementById("editPestle").value = f.pestle;
  document.getElementById("editMetric").value = f.metric || "";
  
  intelEditDescQuill.root.innerHTML = f.description || "";
  intelEditImplQuill.root.innerHTML = f.implications || "";
  
  document.getElementById("editModalContainer").classList.remove('hidden');
}

function saveEdit(isSilent = false) {
  const indexStr = document.getElementById("editIndex").value;
  if (indexStr === "") return;
  const index = parseInt(indexStr, 10);
  
  db.factors[index].title = document.getElementById("editTitle").value;
  db.factors[index].workspace = document.getElementById("editWorkspaceSelect").value;
  db.factors[index].linkedConcept = document.getElementById("editLinkedConcept").value;
  db.factors[index].linkedFirm = document.getElementById("editLinkedFirm").value;
  db.factors[index].pestle = document.getElementById("editPestle").value;
  db.factors[index].metric = document.getElementById("editMetric").value;
  
  db.factors[index].description = intelEditDescQuill.root.innerHTML === "<p><br></p>" ? "" : intelEditDescQuill.root.innerHTML;
  db.factors[index].implications = intelEditImplQuill.root.innerHTML === "<p><br></p>" ? "" : intelEditImplQuill.root.innerHTML;
  
  if(!isSilent) document.getElementById("editModalContainer").classList.add('hidden');
  saveDatabase(); 
  if(!isSilent) renderFeed();
}

let temporaryRssArticles = [];

async function fetchRssNews() {
  const rssFeedUrl = 'http://feeds.bbci.co.uk/news/business/rss.xml';
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
  
  const rssBtn = document.getElementById('rssBtn');
  const originalText = rssBtn.innerHTML;
  rssBtn.innerHTML = "⏳ <span class='hidden sm:inline'>Fetching...</span>";
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.status !== 'ok') throw new Error("Failed to parse RSS feed.");
    
    temporaryRssArticles = data.items;
    renderRssTriage();
    
  } catch (error) {
    alert("Error fetching feed: " + error.message);
  } finally {
    rssBtn.innerHTML = originalText;
  }
}

function renderRssTriage() {
  const listContainer = document.getElementById('rssTriageList');
  listContainer.innerHTML = '';
  
  temporaryRssArticles.forEach((article, index) => {
    const cleanDesc = article.description.replace(/<[^>]*>?/gm, '').substring(0, 160) + "...";
    
    const card = document.createElement('label');
    card.className = "flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-md transition group";
    card.innerHTML = `
      <div class="pt-1 shrink-0">
          <input type="checkbox" value="${index}" class="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer triage-checkbox">
      </div>
      <div class="flex-1 min-w-0">
          <h4 class="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition truncate whitespace-normal line-clamp-2">${article.title}</h4>
          <p class="text-xs text-gray-500 mt-1 line-clamp-2">${cleanDesc}</p>
          <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase mt-2 inline-block">${new Date(article.pubDate).toLocaleDateString()}</span>
      </div>
    `;
    listContainer.appendChild(card);
  });
  
  document.getElementById('rssTriageModal').classList.remove('hidden');
}

function closeRssTriage() {
  document.getElementById('rssTriageModal').classList.add('hidden');
  temporaryRssArticles = [];
}

function importSelectedRss() {
  const checkboxes = document.querySelectorAll('.triage-checkbox:checked');
  if (checkboxes.length === 0) return alert("Please select at least one article to import.");
  
  // SILENT FALLBACK: Prevents saving data to "All"
  const wsToSave = (!currentWorkspace || currentWorkspace === "All") ? "General Market" : currentWorkspace;

  checkboxes.forEach(box => {
    const article = temporaryRssArticles[box.value];
    const cleanDesc = article.description.replace(/<[^>]*>?/gm, '');
    
    db.factors.push({
      workspace: wsToSave,
      title: article.title,
      pestle: "Assessment",
      region: "Global",
      metric: "News",
      description: "<p>" + cleanDesc + "</p><p><strong>Source:</strong> <a href='" + article.link + "' target='_blank'>" + article.link + "</a></p>",
      implications: "",
      linkedConcept: "",
      linkedFirm: "",
      date: new Date().toLocaleDateString(),
      isCollapsed: false,
      score: ""
    });
  });
  
  saveDatabase();
  renderFeed();
  closeRssTriage();
}

async function synthesizeFactorAi(index) {
  const f = db.factors[index];
  const linkTxt = f.linkedConcept ? `(Note this connects to the core concept of ${f.linkedConcept})` : "";
  const firmTxt = f.linkedFirm ? `(Consider implications specifically for ${f.linkedFirm})` : "";
  const prompt = `Analyze this commercial development for a UK corporate law firm ${linkTxt} ${firmTxt}. \nEvent: ${f.title}\nContext: ${f.description}\nProvide 3 bullet points outlining the strategic and legal advisory implications. Keep it extremely brief and commercial.`;
  
  document.getElementById(`implication-text-${index}`).innerHTML = "<p>Generating AI synthesis...</p>";
  
  try {
    const aiResponse = await callGeminiApi(prompt);
    db.factors[index].implications = "<p>" + aiResponse.replace(/\n/g, '<br>') + "</p>";
    renderFeed(); saveDatabase();
  } catch (error) { document.getElementById(`implication-text-${index}`).innerHTML = `<p>Error: ${error.message}</p>`; }
}

async function exportToStar(index) {
  const f = db.factors[index];
  document.getElementById(`star-btn-${index}`).innerText = "Generating STAR...";
  const prompt = `Rewrite the following mock interview response into a highly polished, 150-word maximum STAR (Situation, Task, Action, Result) paragraph suitable for a UK law firm cover letter. Remove partner formatting. Additionally, identify the single most prominent core competency demonstrated (e.g., Commercial Acumen, Resilience, Teamwork) and prepend it exactly like this: "COMPETENCY: [Competency Name]". \n\nOriginal Text:\n${f.description}`;
  try {
    const responseText = await callGeminiApi(prompt);
    let competency = "General";
    let starText = responseText;
    const compMatch = responseText.match(/COMPETENCY:\s*(.*)/i);
    if (compMatch) {
        competency = compMatch[1].trim();
        starText = responseText.replace(/COMPETENCY:\s*(.*)/i, "").trim();
    }
    db.factors[index].starExport = starText;
    db.factors[index].competency = competency;
    saveDatabase(); renderFeed();
  } catch (error) { document.getElementById(`star-btn-${index}`).innerText = "Error - Try Again"; }
}

function toggleFactorSelection(index, event) {
    event.stopPropagation();
    if (selectedFactors.has(index)) selectedFactors.delete(index);
    else selectedFactors.add(index);
    updateMassDeleteIntelBtn();
}

function updateMassDeleteIntelBtn() {
    const btn = document.getElementById('massDeleteIntelBtn');
    if (selectedFactors.size > 0) {
        btn.classList.remove('hidden');
        btn.innerText = `🗑️ Delete (${selectedFactors.size})`;
    } else btn.classList.add('hidden');
}

function deleteFactor(index) {
  db.factors.splice(index, 1);
  if(typeof selectedFactors !== 'undefined' && selectedFactors.has(index)) selectedFactors.delete(index);
  if (typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
  saveDatabase();
  renderFeed();
}

function massDeleteIntel() {
  if(typeof selectedFactors === 'undefined' || selectedFactors.size === 0) return;
  if(confirm(`Delete ${selectedFactors.size} selected insight(s)?`)) {
      let sortedIndices = Array.from(selectedFactors).sort((a,b) => b-a);
      sortedIndices.forEach(idx => db.factors.splice(idx, 1));
      selectedFactors.clear();
      if (typeof updateMassDeleteIntelBtn === 'function') updateMassDeleteIntelBtn();
      saveDatabase();
      renderFeed();
  }
}

async function autoParseText() {
  const rawText = prompt("Paste the raw text of the news article here:");
  if (!rawText || rawText.trim() === "") return;
  
  document.getElementById('statusText').innerText = "Analyzing & Linking...";
  document.getElementById('statusDot').className = "w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse";

  try {
      // Slice to avoid Gemini token limits
      const safeText = rawText.substring(0, 15000);
      
      // Give the AI awareness of your specific database arrays
      const targetFirmsList = db.targetFirms.join(", ");
      const conceptsList = db.concepts.map(c => c.title).join(", ");

      const promptText = `Analyze the following news article text. 
      Extract and format exactly as a JSON object with these exact keys: 
      "headline": (a short, punchy title),
      "pestle": (choose ONE: Political, Economic, Social, Technological, Legal, Environmental, or Assessment),
      "summary": (a well written, commercially focused output which incorporates all relevant elements from the text and incorporates them into seamless prose. Return as a single string),
      "implications": (2-3 bullet points on the legal/advisory implications for corporate law firms. Return as an array of strings),
      "linkedFirm": (If the article explicitly mentions or involves one of these target law firms: [${targetFirmsList}], output the exact firm name. Otherwise, output an empty string ""),
      "linkedConcept": (If the article strongly relates to one of these core legal concepts: [${conceptsList}], output the exact concept name. Otherwise, output an empty string "")
      
      Do not include markdown blocks like \`\`\`json, return ONLY the raw JSON.
      Text: ${safeText}`;

      const aiResponse = await callGeminiApi(promptText);
      const parsed = JSON.parse(aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim());

      // SILENT FALLBACK: Prevents saving data to "All"
      const wsToSave = (!currentWorkspace || currentWorkspace === "All") ? "General Market" : currentWorkspace;

      // BULLETPROOFING: Safely handle implications whether Gemini returns an Array or a String
      let safeImplications = "";
      if (Array.isArray(parsed.implications)) {
          safeImplications = "<ul>" + parsed.implications.map(item => `<li>${item}</li>`).join('') + "</ul>";
      } else if (typeof parsed.implications === 'string') {
          safeImplications = "<p>" + parsed.implications.replace(/\n/g, '<br>') + "</p>";
      }

      // Safely handle summary
      let safeSummary = typeof parsed.summary === 'string' ? parsed.summary : JSON.stringify(parsed.summary);

      db.factors.push({
          workspace: wsToSave,
          title: parsed.headline || "Untitled Insight",
          pestle: parsed.pestle || "Assessment",
          region: "Global",
          metric: "AI Parsed",
          description: "<p>" + safeSummary + "</p><br><p><strong>Source:</strong> Pasted Article Text</p>",
          implications: safeImplications,
          linkedConcept: parsed.linkedConcept || "",
          linkedFirm: parsed.linkedFirm || "",
          date: new Date().toLocaleDateString(),
          isCollapsed: false,
          score: ""
      });

      saveDatabase();
      renderFeed();
      setOnlineStatus(true);
      
      if (typeof showToast === 'function') {
          showToast(`Article parsed successfully!\nLinked Firm: ${parsed.linkedFirm || 'None'}\nLinked Concept: ${parsed.linkedConcept || 'None'}`, "success");
      }
      
  } catch (error) {
      setOnlineStatus(true);
      if (typeof showToast === 'function') {
          showToast(`Parsing failed. Ensure you pasted valid article text. Error: ${error.message}`, "error");
      }
  }
}