// INTELLIGENCE RENDERING & LOGIC
// ==========================================

window.toggleIntelCard = function(index, event) {
  if (event && (event.target.closest('button') || event.target.closest('a') || event.target.closest('input') || event.target.closest('.ql-editor'))) {
    return;
  }
  
  if (!db.factors || !db.factors[index]) return;
  
  const factor = db.factors[index];
  factor.isCollapsed = !factor.isCollapsed;
  
  // Targeted DOM update without re-rendering the feed
  const card = document.getElementById(`factor-card-${index}`);
  if (card) {
    const body = card.querySelector('.nexus-body');
    const icon = card.querySelector('.nexus-icon i');
    
    if (body) {
      if (factor.isCollapsed) {
        body.classList.add('hidden');
      } else {
        body.classList.remove('hidden');
      }
    }
    
    if (icon) {
      icon.setAttribute('data-lucide', factor.isCollapsed ? 'chevron-down' : 'chevron-up');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Save to local cache only (prevents unnecessary cloud POST requests on every click)
  if (typeof saveToLocalCache === 'function') saveToLocalCache();
};

function renderPestleFilters() {
const container = document.getElementById("pestleFilters");
container.innerHTML = "";
PESTLE_CATEGORIES.forEach(cat => {
  const btn = document.createElement("button");
  btn.innerText = cat;
  btn.className = `px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 ${activePestleFilter === cat ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-inner' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm'}`;
  btn.onclick = () => { activePestleFilter = cat; selectedFactors.clear(); updateMassDeleteIntelBtn(); renderPestleFilters(); renderFeed(); };
  container.appendChild(btn);
});
}

function renderFeed() {
const container = document.getElementById("cardsContainer");

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
        String(f.summary || "").toLowerCase().includes(term) || 
        String(f.description || "").toLowerCase().includes(term)
    );
}

if (filtered.length === 0) {
    container.innerHTML = `<p class="text-slate-500 italic mt-4 print:hidden">No records match.</p>`;
    return;
}

let indexedFactors = filtered.map(f => ({ factor: f, originalIndex: db.factors.indexOf(f) }));
const sortMode = document.getElementById("sortFeed").value;

if (sortMode === "newest") {
    indexedFactors.reverse();
} else if (sortMode === "az") {
    indexedFactors.sort((a, b) => String(a.factor.title || "").localeCompare(String(b.factor.title || "")));
} else if (sortMode === "za") {
    indexedFactors.sort((a, b) => String(b.factor.title || "").localeCompare(String(a.factor.title || "")));
}

const pestleColors = {
    'Political': 'border-l-purple-500',
    'Economic': 'border-l-blue-500',
    'Social': 'border-l-pink-500',
    'Technological': 'border-l-cyan-500',
    'Legal': 'border-l-emerald-500',
    'Environmental': 'border-l-green-500',
    'Assessment': 'border-l-slate-400 dark:border-l-slate-500'
};

indexedFactors.forEach(({factor, originalIndex}) => {
  currentVisibleFactorIndices.push(originalIndex);
  const isCollapsed = factor.isCollapsed !== false;
  const isChecked = typeof selectedFactors !== 'undefined' && selectedFactors.has(originalIndex) ? "checked" : "";
  
  const safeConcept = factor.linkedConcept ? String(factor.linkedConcept).replace(/'/g, "\\'") : "";
  const safeFirm = factor.linkedFirm ? String(factor.linkedFirm).replace(/'/g, "\\'") : "";
  
  const nexusBadge = factor.linkedConcept ? `<button onclick="event.stopPropagation(); routeToConcept('${safeConcept}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold shadow-sm border border-slate-200 inline-flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-widest shrink-0"><i data-lucide="link" class="w-3 h-3"></i>${factor.linkedConcept}</button>` : '';
  const firmBadge = factor.linkedFirm ? `<button onclick="event.stopPropagation(); routeToFirm('${safeFirm}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold shadow-sm border border-slate-200 inline-flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-widest shrink-0"><i data-lucide="building-2" class="w-3 h-3"></i>${factor.linkedFirm}</button>` : '';

  const pColor = pestleColors[factor.pestle] || 'border-l-indigo-500';
  const dateStr = factor.date || new Date().toLocaleDateString('en-GB');

  const summaryHtml = factor.summary ? `<p class="text-[13px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed pr-8 print:hidden">${factor.summary}</p>` : '';

  const card = document.createElement("div");
  card.id = `factor-card-${originalIndex}`;
  card.className = `bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 border-l-4 ${pColor} rounded-md p-4 md:p-6 shadow-sm print:break-inside-avoid print:border-slate-400 print:shadow-none transition hover:border-indigo-400 dark:hover:border-indigo-500 w-full`;
  
  card.innerHTML = `
    <div class="flex items-start gap-4 w-full cursor-pointer group" onclick="window.toggleIntelCard(${originalIndex}, event)">
      <div class="pt-0.5 shrink-0">
        <input type="checkbox" ${isChecked} onchange="toggleFactorSelection(${originalIndex}, event)" class="w-4 h-4 text-indigo-600 rounded print:hidden cursor-pointer border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-indigo-500">
      </div>
      <div class="flex flex-col min-w-0 w-full">
        <div class="flex justify-between items-start w-full gap-4">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-900 dark:text-white text-base md:text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition print:text-black break-words leading-tight">${factor.title || "Untitled Insight"}</h4>
                ${summaryHtml}
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:block">${dateStr}</span>
                <span class="nexus-icon text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition print:hidden bg-slate-100 dark:bg-slate-800 p-1.5 rounded shadow-inner border border-slate-200 dark:border-slate-700"><i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i></span>
            </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full">
            <span class="text-[10px] bg-slate-800 dark:bg-slate-700 text-white px-2 py-0.5 rounded font-bold uppercase truncate max-w-[150px] shadow-sm">${factor.metric || factor.region || "Global"}</span>
            <span class="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold uppercase shadow-sm border border-indigo-200 dark:border-indigo-800">${factor.pestle || "Assessment"}</span>
            ${nexusBadge}${firmBadge}
        </div>
      </div>
    </div>
    
    <div class="nexus-body ${isCollapsed ? 'hidden print:block' : 'block'} border-t border-slate-100 dark:border-slate-800 pt-5 mt-5 print:border-slate-300 cursor-text" onclick="event.stopPropagation()">
      <div class="prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-slate-200 mb-5 print:text-black dict-highlight-target dark:prose-invert">${factor.description || ""}</div>
      
      <div class="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/50 print:bg-white print:border-slate-300">
        <div class="flex flex-col md:flex-row justify-between md:items-center mb-3 gap-2">
          <span class="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider print:text-black flex items-center gap-1.5"><i data-lucide="zap" class="w-3.5 h-3.5"></i> Commercial Implications</span>
          <button onclick="synthesizeFactorAi(${originalIndex})" class="w-full md:w-auto text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 font-bold py-1.5 px-3 rounded-sm transition flex justify-center items-center gap-1.5 shadow-sm print:hidden shrink-0 border border-slate-200 dark:border-slate-700 uppercase tracking-widest"><i data-lucide="sparkles" class="w-3 h-3"></i> AI Synthesis</button>
        </div>
        <div class="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 print:text-black dict-highlight-target dark:prose-invert" id="implication-text-${originalIndex}">${factor.implications || "<p class='italic text-slate-500'>Click 'AI Synthesis' to automatically generate strategic implications based on this record.</p>"}</div>
      </div>
      
      <div class="mt-5 flex gap-3 print:hidden border-t border-slate-100 dark:border-slate-800 pt-4">
        <button onclick="openEditModal(${originalIndex})" class="text-[10px] uppercase tracking-widest bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold py-2 px-4 rounded-sm transition flex justify-center items-center gap-1.5 shadow-sm border border-slate-200 dark:border-slate-700"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Record</button>
        <button onclick="deleteFactor(${originalIndex})" class="text-[10px] uppercase tracking-widest bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-2 px-4 rounded-sm transition flex justify-center items-center gap-1.5 shadow-sm border border-red-200 dark:border-red-800"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete</button>
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

const wsToSave = (!currentWorkspace || currentWorkspace === "All") ? "General Market" : currentWorkspace;
const descriptionHtml = intelLogQuill.root.innerHTML === "<p><br></p>" ? "" : intelLogQuill.root.innerHTML;

db.factors.push({ 
    workspace: wsToSave, 
    title, 
    pestle: document.getElementById("logPestle").value, 
    region: document.getElementById("logRegion").value, 
    metric: document.getElementById("logMetric").value, 
    summary: document.getElementById("logSummary") ? document.getElementById("logSummary").value : "", 
    description: descriptionHtml, 
    implications: "", 
    linkedConcept: document.getElementById("logLinkedConcept").value, 
    linkedFirm: document.getElementById("logLinkedFirm").value, 
    date: new Date().toLocaleDateString('en-GB'), 
    isCollapsed: false, 
    score: "" 
});

saveDatabase(); renderFeed();

document.getElementById("logHeadline").value = ""; 
if (document.getElementById("logSummary")) document.getElementById("logSummary").value = ""; 
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
  if (document.getElementById("editSummary")) document.getElementById("editSummary").value = f.summary || "";

  // Lazy-load Intel Edit Quills
  window.intelEditDescQuill = window.getOrInitQuill('#editDescriptionQuill', { modules: { toolbar: '#toolbar-intel-edit-desc' } });
  window.intelEditImplQuill = window.getOrInitQuill('#editImplicationsQuill', { modules: { toolbar: '#toolbar-intel-edit-impl' } });

  if (window.intelEditDescQuill) window.intelEditDescQuill.root.innerHTML = f.description || "";
  if (window.intelEditImplQuill) window.intelEditImplQuill.root.innerHTML = f.implications || "";

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
if (document.getElementById("editSummary")) db.factors[index].summary = document.getElementById("editSummary").value;

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
  card.className = "flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-md transition group";
  card.innerHTML = `
    <div class="pt-1 shrink-0">
        <input type="checkbox" value="${index}" class="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer triage-checkbox">
    </div>
    <div class="flex-1 min-w-0">
        <h4 class="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition truncate whitespace-normal line-clamp-2">${article.title}</h4>
        <p class="text-xs text-slate-500 mt-1 line-clamp-2">${cleanDesc}</p>
        <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase mt-2 inline-block">${new Date(article.pubDate).toLocaleDateString('en-GB')}</span>
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
    summary: cleanDesc.substring(0, 200) + "...",
    description: "<p><strong>Source:</strong> <a href='" + article.link + "' target='_blank' class='text-indigo-600 hover:underline'>" + article.link + "</a></p>",
    implications: "",
    linkedConcept: "",
    linkedFirm: "",
    date: new Date().toLocaleDateString('en-GB'),
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
if(!confirm("Are you sure you want to delete this record?")) return;

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
    const safeText = rawText.substring(0, 15000);
    const targetFirmsList = db.targetFirms.join(", ");
    const conceptsList = db.concepts.map(c => c.title).join(", ");

    const promptText = `Analyze the following news article text. 
    Extract and format exactly as a JSON object with these exact keys: 
    "headline": (a short, punchy title),
    "pestle": (choose ONE: Political, Economic, Social, Technological, Legal, Environmental, or Assessment),
    "summary": (a 2-3 sentence overview of the facts. Plain text.),
    "description": (A detailed, multi-paragraph context and background of the event. Format with <p> tags.),
    "implications": (2-3 bullet points on the legal/advisory implications for corporate law firms. Return as an array of strings),
    "linkedFirm": (If the article explicitly mentions or involves one of these target law firms: [${targetFirmsList}], output the exact firm name. Otherwise, output an empty string ""),
    "linkedConcept": (If the article strongly relates to one of these core legal concepts: [${conceptsList}], output the exact concept name. Otherwise, output an empty string "")
    
    Do not include markdown blocks like \`\`\`json, return ONLY the raw JSON.
    Text: ${safeText}`;

    const aiResponse = await callGeminiApi(promptText);
    const parsed = JSON.parse(aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim());

    const wsToSave = (!currentWorkspace || currentWorkspace === "All") ? "General Market" : currentWorkspace;

    let safeImplications = "";
    if (Array.isArray(parsed.implications)) {
        safeImplications = "<ul>" + parsed.implications.map(item => `<li>${item}</li>`).join('') + "</ul>";
    } else if (typeof parsed.implications === 'string') {
        safeImplications = "<p>" + parsed.implications.replace(/\n/g, '<br>') + "</p>";
    }

    let safeSummary = typeof parsed.summary === 'string' ? parsed.summary : JSON.stringify(parsed.summary);
    let safeDescription = typeof parsed.description === 'string' && parsed.description.trim() !== '' ? parsed.description : "<p><strong>Source:</strong> AI Parsed from pasted text.</p>";

    db.factors.push({
        workspace: wsToSave,
        title: parsed.headline || "Untitled Insight",
        pestle: parsed.pestle || "Assessment",
        region: "Global",
        metric: "AI Parsed",
        summary: safeSummary,
        description: safeDescription,
        implications: safeImplications,
        linkedConcept: parsed.linkedConcept || "",
        linkedFirm: parsed.linkedFirm || "",
        date: new Date().toLocaleDateString('en-GB'),
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

window.routeToIntelFactor = function(originalIndex) {
if (typeof switchState === 'function') switchState('INTELLIGENCE');

window.currentWorkspace = 'All';
window.activePestleFilter = 'All';

if (db.factors && db.factors[originalIndex]) {
    db.factors[originalIndex].isCollapsed = false;
}

if (typeof renderTabs === 'function') renderTabs();
if (typeof renderPestleFilters === 'function') renderPestleFilters();
if (typeof renderFeed === 'function') renderFeed();

setTimeout(() => {
    const targetCard = document.getElementById(`factor-card-${originalIndex}`);
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.add('ring-2', 'ring-indigo-500', 'dark:ring-indigo-400');
        setTimeout(() => {
            targetCard.classList.remove('ring-2', 'ring-indigo-500', 'dark:ring-indigo-400');
        }, 2500);
    }
}, 150);
};