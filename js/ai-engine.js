// AI SIMULATORS, ASSESSMENT & AUTO-SCORING
// ==========================================
async function callGeminiApi(promptText) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR_")) throw new Error("API Key missing.");
  const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
  const modelData = await modelRes.json();
  if (modelData.error) throw new Error(modelData.error.message);
  const validModel = modelData.models.find(m => m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("gemini"));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

function formatMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>').replace(/\*(.*?)\*/g, '<em class="italic">$1</em>').replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
}

function setupAiModal(title, badge, badgeClass, isPressure) {
  const modal = document.getElementById("aiModalContainer");
  const box = document.getElementById("aiModalBox");
  const timerDisplay = document.getElementById("aiTimerDisplay");
  
  document.getElementById("aiModalTitle").innerText = title;
  document.getElementById("aiModalBadge").innerText = badge;
  document.getElementById("aiModalBadge").className = `hidden md:inline-block text-xs px-3 py-1 rounded-full uppercase tracking-wide font-bold ${badgeClass}`;
  box.className = "bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full p-4 md:p-8 space-y-4 shadow-2xl relative max-h-[90dvh] overflow-hidden flex flex-col pb-safe";
  
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer);
  if (isPressure) {
    timerDisplay.classList.remove("hidden");
    let timeLeft = 180;
    timerDisplay.innerText = `⏱️ 03:00`;
    window.activeTimer = setInterval(() => {
      timeLeft--;
      let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      let s = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.innerText = `⏱️ ${m}:${s}`;
      if (timeLeft <= 0) {
        clearInterval(window.activeTimer);
        if (document.getElementById('aiInputAnswer').value.trim() === '') document.getElementById('aiInputAnswer').value = "[Time expired - no answer provided]";
        document.getElementById("aiSubmitBtn").click();
      }
    }, 1000);
  } else timerDisplay.classList.add("hidden");
  
  modal.classList.remove("hidden");
}

function closeAiModal() {
   if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer);
   document.getElementById('aiModalContainer').classList.add('hidden');
}

function buildSplitPaneHTML(leftContent, rightTitle, btnAction, extraFeedbackId = "assessmentFeedback") {
  return `
    <div class="flex flex-col md:flex-row gap-4 md:gap-8 h-full min-h-0 flex-1 overflow-hidden">
      
      <!-- LEFT PANE (Scrollable) -->
      <div class="flex-1 overflow-y-auto pr-2 md:pr-4 border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 prose prose-invert text-slate-200 leading-relaxed text-xs md:text-sm">
        ${formatMarkdown(leftContent)}
      </div>
      
      <!-- RIGHT PANE (Scrollable) -->
      <div class="flex-1 flex flex-col overflow-y-auto pr-1 md:pr-2 min-h-0">
        <h4 class="text-indigo-400 font-bold mb-2 md:mb-3 flex items-center gap-2 shrink-0"><i data-lucide="message-square" class="w-4 h-4"></i> ${rightTitle}</h4>
        <textarea id="aiInputAnswer" class="shrink-0 w-full bg-slate-800 border border-slate-700 rounded-lg p-3 md:p-4 text-xs md:text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[150px] md:min-h-[250px] mb-4 shadow-inner resize-none" placeholder="Type or dictate..."></textarea>
        
        <div class="flex gap-2 md:gap-3 shrink-0 mb-4">
          <button onclick="startDictation('aiInputAnswer')" class="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap"><i data-lucide="mic" class="w-4 h-4"></i> Dictate</button>
          <button id="aiSubmitBtn" onclick="${btnAction}()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm flex-1 flex justify-center items-center gap-2">Submit Answer</button>
        </div>
        
        <div id="${extraFeedbackId}" class="shrink-0 mb-6"></div>
      </div>
      
    </div>
  `;
}

function parseNumericalScore(text) {
  const match = text.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? `${match[1]}/10` : "";
}

function startDictation(targetId) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return alert("Your browser does not support the Web Speech API. Try Chrome or Safari.");
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const inputEl = document.getElementById(targetId);
    const originalPlaceholder = inputEl.placeholder;
    inputEl.placeholder = "Listening...";
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputEl.value = inputEl.value ? inputEl.value + " " + transcript : transcript;
        inputEl.placeholder = originalPlaceholder;
    };
    
    recognition.onerror = function() { inputEl.placeholder = originalPlaceholder; };
    recognition.start();
}

// --- Intelligence Side AI ---
async function generateMockInterview() {
  if (typeof selectedFactors === 'undefined' || selectedFactors.size === 0) return alert("Select records via checkboxes.");
  const isPressure = document.getElementById("pressureModeIntel").checked;
  const persona = document.getElementById("aiPersonaIntel").value;
  const active = Array.from(selectedFactors).map(i => db.factors[i]);
  const summary = active.map(f => `- ${f.title}: ${f.description}`).join("\n");
  const prompt = `You are a ${persona} conducting an Assessment Center interview for ${window.currentWorkspace || "General Market"}. Developments: ${summary}. Generate EXACTLY: **🎯 PARTNER QUESTION:** (Case study based on these). **💡 KEY TALKING POINTS:** (3 strategic angles). **⚡ DEVIL'S ADVOCATE PUSHBACK:** (1 challenge question). Keep it applicable to UK practice.`;
  
  setupAiModal(`Mock Interview`, "Assessment", "bg-purple-900/60 text-purple-300 border-purple-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-purple-400 animate-pulse text-center py-10'>Formulating scenario...</p>";
  try {
    window.currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(window.currentScenario, "Your Response", "assessIntelAnswer");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessIntelAnswer() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  const persona = document.getElementById("aiPersonaIntel").value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-purple-400 animate-pulse text-sm'>Evaluating...</p>";
  const prompt = `You are a ${persona} evaluating a trainee solicitor. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ WHAT WORKED:** (1-2 points).\n**🚧 AREAS FOR IMPROVEMENT:** (Weaknesses).\n**⚖️ FINAL VERDICT:** (Score justification & summary).\nDo NOT repeat or restate the original scenario text in your response.`;
  try {
    window.currentFeedback = await callGeminiApi(prompt);
    window.currentCandidateAnswer = answer;
    window.currentExtractedScore = parseNumericalScore(window.currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-purple-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-purple-400 font-bold text-xs">Evaluation Report</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm mb-4">${formatMarkdown(window.currentFeedback)}</div><button onclick="window.saveToVault('Mock Interview')" class="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

async function generateRippleEffect() {
  if (typeof selectedFactors === 'undefined' || selectedFactors.size === 0) return alert("Select records via checkboxes.");
  const isPressure = document.getElementById("pressureModeIntel").checked;
  const active = Array.from(selectedFactors).map(i => db.factors[i]);
  const summary = active.map(f => `- ${f.title}: ${f.description}`).join("\n");
  const prompt = `You are a Senior Partner pushing a trainee on second-order commercial thinking regarding these developments: ${summary}. Generate a rigorous prompt asking the candidate to map out three distinct layers: 1. Primary Business Impact. 2. Market Recalibration (Competitor/Third-Party reactions). 3. Specific Law Firm Advisory Risk.`;
  setupAiModal(`Ripple Effect Simulator`, "Second-Order Thinking", "bg-indigo-900/60 text-indigo-300 border-indigo-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-indigo-400 animate-pulse text-center py-10'>Generating logic chain constraints...</p>";
  try {
    window.currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(window.currentScenario, "Your Analysis (Impact -> Market -> Legal)", "assessRippleEffect");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessRippleEffect() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-indigo-400 animate-pulse text-sm'>Tracing logic...</p>";
  const prompt = `Evaluating trainee solicitor's second-order thinking. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ LOGICAL STRENGTHS:** (Where did they correctly connect commercial to legal?).\n**🚧 FAULTY ASSUMPTIONS:** (Where did the logic break down or miss commercial reality?).\n**⚖️ FINAL VERDICT:** (Summary).\nDo NOT repeat or restate the original scenario text in your response.`;
  try {
    window.currentFeedback = await callGeminiApi(prompt);
    window.currentCandidateAnswer = answer;
    window.currentExtractedScore = parseNumericalScore(window.currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-indigo-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-indigo-400 font-bold text-xs">Partner Feedback</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm mb-4">${formatMarkdown(window.currentFeedback)}</div><button onclick="window.saveToVault('Ripple Effect')" class="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

// ---------------------------------------------------------
// INTEL DECONSTRUCTOR
// ---------------------------------------------------------
async function generateDeconstructor() {
  if (typeof selectedFactors === 'undefined' || selectedFactors.size === 0) return alert("Select market insights via checkboxes.");
  const isPressure = document.getElementById("pressureModeIntel").checked;
  const activeData = Array.from(selectedFactors).map(i => db.factors[i]);
  const summary = activeData.map(item => `- ${item.title}: ${item.description}`).join("\n");
  const prompt = `Based on these issues: ${summary}. Generate a high-stakes, multi-faceted corporate transaction or crisis scenario. The candidate must break this scenario down and allocate specific, highly technical legal tasks to at least 3 distinct law firm departments (e.g., Corporate/M&A, Employment, Real Estate, Antitrust, IP). Provide ONLY the scenario and the instruction to deconstruct it by department.`;
  setupAiModal(`Market Deconstructor`, "Deal Anatomy", "bg-cyan-900/60 text-cyan-300 border-cyan-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-cyan-400 animate-pulse text-center py-10'>Building multi-department scenario...</p>";
  try {
    window.currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(window.currentScenario, "Your Department Breakdown", "assessDeconstructor");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessDeconstructor() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-cyan-400 animate-pulse text-sm'>Reviewing task allocation...</p>";
  const prompt = `Evaluating trainee solicitor's deal anatomy awareness. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ CORRECT ALLOCATIONS:** (Which tasks were correctly assigned?).\n**🚧 MISSED DEPARTMENTS/RISKS:** (Which firm departments were forgotten or misused?).\n**⚖️ FINAL VERDICT:** (Summary).\nDo NOT repeat or restate the original scenario text in your response.`;
  try {
    window.currentFeedback = await callGeminiApi(prompt);
    window.currentCandidateAnswer = answer;
    window.currentExtractedScore = parseNumericalScore(window.currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-cyan-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-cyan-400 font-bold text-xs">Partner Feedback</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm mb-4">${formatMarkdown(window.currentFeedback)}</div><button onclick="window.saveToVault('Deconstruct')" class="w-full bg-cyan-700 hover:bg-cyan-600 transition text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

// ---------------------------------------------------------
// CONCEPTS DECONSTRUCTOR (Decoupled from Intel)
// ---------------------------------------------------------
async function generateConceptDeconstructor() {
  if (typeof window.selectedConcepts === 'undefined' || window.selectedConcepts.size === 0) return alert("Select concepts via checkboxes.");
  const isPressure = document.getElementById("pressureModeConcept").checked;
  const activeData = Array.from(window.selectedConcepts).map(i => db.concepts[i]);
  const summary = activeData.map(item => `- ${item.title}: ${item.body.replace(/<[^>]*>?/gm, '')}`).join("\n");
  const prompt = `Based on these legal concepts: ${summary}. Generate a high-stakes, multi-faceted corporate transaction or crisis scenario. The candidate must break this scenario down and allocate specific, highly technical legal tasks to at least 3 distinct law firm departments (e.g., Corporate/M&A, Employment, Real Estate, Antitrust, IP). Provide ONLY the scenario and the instruction to deconstruct it by department.`;
  setupAiModal(`Concept Deconstructor`, "Deal Anatomy", "bg-cyan-900/60 text-cyan-300 border-cyan-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-cyan-400 animate-pulse text-center py-10'>Building multi-department scenario...</p>";
  try {
    window.currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(window.currentScenario, "Your Department Breakdown", "assessConceptDeconstructor");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessConceptDeconstructor() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-cyan-400 animate-pulse text-sm'>Reviewing task allocation...</p>";
  const prompt = `Evaluating trainee solicitor's deal anatomy awareness. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ CORRECT ALLOCATIONS:** (Which tasks were correctly assigned?).\n**🚧 MISSED DEPARTMENTS/RISKS:** (Which firm departments were forgotten or misused?).\n**⚖️ FINAL VERDICT:** (Summary).\nDo NOT repeat or restate the original scenario text in your response.`;
  try {
    window.currentFeedback = await callGeminiApi(prompt);
    window.currentCandidateAnswer = answer;
    window.currentExtractedScore = parseNumericalScore(window.currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-cyan-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-cyan-400 font-bold text-xs">Partner Feedback</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm mb-4">${formatMarkdown(window.currentFeedback)}</div><button onclick="window.saveToVault('Deconstruct')" class="w-full bg-cyan-700 hover:bg-cyan-600 transition text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

// --- Concepts Side AI ---
async function generateConceptInterview() {
  if (window.selectedConcepts.size === 0) return alert("Select concepts via checkboxes.");
  const isPressure = document.getElementById("pressureModeConcept").checked;
  const persona = document.getElementById("aiPersonaConcept").value;
  const active = Array.from(window.selectedConcepts).map(i => db.concepts[i]);
  const summary = active.map(c => `- ${c.title}: ${c.body.replace(/<[^>]*>?/gm, '')}`).join("\n");
  const prompt = `You are a ${persona} testing a trainee on core concepts: ${summary}. Generate a complex practical scenario requiring application of these concepts. Structure EXACTLY: **🎯 PARTNER QUESTION:** (Practical scenario). **💡 REQUIRED ANALYSIS:** (3 specific technical points they must cover). **⚡ PUSHBACK:** (1 challenge on a commercial risk).`;
  setupAiModal("Concept Interview", "Technical Test", "bg-blue-900/60 text-blue-300 border-blue-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-blue-400 animate-pulse text-center py-10'>Generating scenario...</p>";
  try {
    window.currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(window.currentScenario, "Your Analysis", "assessConceptAnswer");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessConceptAnswer() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer);
  const answer = document.getElementById('aiInputAnswer').value;
  const persona = document.getElementById("aiPersonaConcept").value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-blue-400 animate-pulse text-sm'>Evaluating technical accuracy...</p>";
  const prompt = `You are a ${persona} evaluating a legal trainee. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ TECHNICAL STRENGTHS:**.\n**🚧 KNOWLEDGE GAPS:** (Specific misunderstandings of the legal concepts).\n**⚖️ FINAL VERDICT:** (Summary).\nDo NOT repeat or restate the original scenario text in your response.`;
  try {
    window.currentFeedback = await callGeminiApi(prompt);
    window.currentCandidateAnswer = answer;
    window.currentExtractedScore = parseNumericalScore(window.currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-blue-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-blue-400 font-bold text-xs">Technical Report</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm mb-4">${formatMarkdown(window.currentFeedback)}</div><button onclick="window.saveToVault('Concept Interview')" class="w-full bg-blue-600 hover:bg-blue-700 transition text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

async function generateKnowledgeTest() {
  if (window.selectedConcepts.size === 0) return alert("Select concepts via checkboxes.");
  const isPressure = document.getElementById("pressureModeConcept").checked;
  const active = Array.from(window.selectedConcepts).map(i => db.concepts[i]);
  const summary = active.map(c => c.title).join(", ");
  const prompt = `Based on the legal concepts: ${summary}. Generate a highly specific, difficult question that has a DEFINITIVE factual or technical legal answer in UK practice. Provide ONLY the question text. Do not provide the answer.`;
  setupAiModal("Definitive Knowledge Test", "Strict Grading", "bg-teal-900/60 text-teal-300 border-teal-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-teal-400 animate-pulse text-center py-10'>Extracting a definitive test question...</p>";
  try {
    window.currentDefinitiveQuestion = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(`**Definitive Question:**\n\n${window.currentDefinitiveQuestion}`, "Your Exact Answer", "assessKnowledgeTest");
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessKnowledgeTest() {
  if (typeof activeTimer !== 'undefined' && activeTimer) clearInterval(activeTimer);
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-teal-400 animate-pulse text-sm'>Verifying & Updating SRS...</p>";
  const prompt = `Candidate answered: "${answer}". Is this correct under UK legal practice? Structure EXACTLY: **SCORE:** [X]/10\n**⚖️ VERDICT:** (State clearly CORRECT or INCORRECT).\n**📚 THE DEFINITIVE RULE:** (Provide the precise technical explanation/rule).\nDo NOT repeat or restate the original definitive question text in your response.`;
  try {
    const result = await callGeminiApi(prompt);
    window.currentFeedback = result;
    window.currentCandidateAnswer = answer;
    window.currentScenario = window.currentDefinitiveQuestion;
    window.currentExtractedScore = parseNumericalScore(result);
    
    const isCorrect = result.toUpperCase().includes("CORRECT") && !result.toUpperCase().includes("INCORRECT");
    const now = new Date().getTime();
    window.selectedConcepts.forEach(idx => {
       if(!db.concepts[idx].srs) db.concepts[idx].srs = { interval: 1, ease: 2.5 };
       if(isCorrect) {
           db.concepts[idx].srs.interval = Math.max(1, db.concepts[idx].srs.interval * db.concepts[idx].srs.ease);
       } else {
           db.concepts[idx].srs.interval = 1;
           db.concepts[idx].srs.ease = Math.max(1.3, db.concepts[idx].srs.ease - 0.15);
       }
       db.concepts[idx].srs.nextReview = now + (db.concepts[idx].srs.interval * 24 * 60 * 60 * 1000);
    });
    if (typeof saveDatabase === 'function') saveDatabase(); 
    if (typeof renderConcepts === 'function') renderConcepts(); 
    feedbackDiv.innerHTML = `<div class="bg-slate-800 border border-teal-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-teal-400 font-bold text-xs">Knowledge Test Report</h5>${window.currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${window.currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-slate-200 text-xs md:text-sm">${formatMarkdown(result)}</div><p class="text-[10px] md:text-xs text-teal-300 mt-4 font-bold border-t border-slate-700 pt-2">Spaced Repetition Schedule Updated automatically.</p><button onclick="window.saveToVault('Knowledge Test')" class="w-full bg-teal-600 hover:bg-teal-700 transition text-white font-bold py-2 rounded-lg text-sm mt-4 flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Vault</button></div>`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}