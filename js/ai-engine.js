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
  box.className = "bg-gray-900 border border-gray-700 rounded-2xl max-w-6xl w-full p-4 md:p-8 space-y-4 shadow-2xl relative max-h-[90dvh] overflow-hidden flex flex-col pb-safe";
  
  if (activeTimer) clearInterval(activeTimer);
  if (isPressure) {
    timerDisplay.classList.remove("hidden");
    let timeLeft = 180;
    timerDisplay.innerText = `⏱️ 03:00`;
    activeTimer = setInterval(() => {
      timeLeft--;
      let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      let s = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.innerText = `⏱️ ${m}:${s}`;
      if (timeLeft <= 0) {
        clearInterval(activeTimer);
        if (document.getElementById('aiInputAnswer').value.trim() === '') document.getElementById('aiInputAnswer').value = "[Time expired - no answer provided]";
        document.getElementById("aiSubmitBtn").click();
      }
    }, 1000);
  } else timerDisplay.classList.add("hidden");
  
  modal.classList.remove("hidden");
}

function closeAiModal() {
   if(activeTimer) clearInterval(activeTimer);
   document.getElementById('aiModalContainer').classList.add('hidden');
}

function buildSplitPaneHTML(leftContent, rightTitle, btnAction, extraFeedbackId = "assessmentFeedback") {
  return `
    <div class="flex flex-col md:flex-row gap-4 md:gap-8 h-full min-h-0 flex-1 overflow-hidden">
      
      <!-- LEFT PANE (Scrollable) -->
      <div class="flex-1 overflow-y-auto pr-2 md:pr-4 border-b md:border-b-0 md:border-r border-gray-700 pb-4 md:pb-0 prose prose-invert text-gray-200 leading-relaxed text-xs md:text-sm">
        ${formatMarkdown(leftContent)}
      </div>
      
      <!-- RIGHT PANE (Scrollable) -->
      <div class="flex-1 flex flex-col overflow-y-auto pr-1 md:pr-2 min-h-0">
        <h4 class="text-purple-400 font-bold mb-2 md:mb-3 flex items-center gap-2 shrink-0"><span>💬</span> ${rightTitle}</h4>
        <textarea id="aiInputAnswer" class="shrink-0 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 text-xs md:text-sm text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none min-h-[150px] md:min-h-[250px] mb-4 shadow-inner resize-none" placeholder="Type or dictate..."></textarea>
        
        <div class="flex gap-2 md:gap-3 shrink-0 mb-4">
          <button onclick="startDictation('aiInputAnswer')" class="bg-gray-700 hover:bg-gray-600 text-white font-bold px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap">🎤 Dictate</button>
          <button id="aiSubmitBtn" onclick="${btnAction}()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm flex-1">Submit Answer</button>
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
  if (selectedFactors.size === 0) return alert("Select records via checkboxes.");
  const isPressure = document.getElementById("pressureModeIntel").checked;
  const persona = document.getElementById("aiPersonaIntel").value;
  const active = Array.from(selectedFactors).map(i => db.factors[i]);
  const summary = active.map(f => `- ${f.title}: ${f.description}`).join("\n");
  const prompt = `You are a ${persona} conducting an Assessment Center interview for ${currentWorkspace}. Developments: ${summary}. Generate EXACTLY: **🎯 PARTNER QUESTION:** (Case study based on these). **💡 KEY TALKING POINTS:** (3 strategic angles). **⚡ DEVIL'S ADVOCATE PUSHBACK:** (1 challenge question). Keep it applicable to UK practice.`;
  
  setupAiModal(`Mock Interview`, "Assessment", "bg-purple-900/60 text-purple-300 border-purple-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-purple-400 animate-pulse text-center py-10'>Formulating scenario...</p>";
  try {
    currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(currentScenario, "Your Response", "assessIntelAnswer");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessIntelAnswer() {
  if (activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  const persona = document.getElementById("aiPersonaIntel").value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-purple-400 animate-pulse text-sm'>Evaluating...</p>";
  const prompt = `You are a ${persona} evaluating a trainee solicitor. Scenario: ${currentScenario}. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ WHAT WORKED:** (1-2 points).\n**🚧 AREAS FOR IMPROVEMENT:** (Weaknesses).\n**⚖️ FINAL VERDICT:** (Score justification & summary).`;
  try {
    currentFeedback = await callGeminiApi(prompt);
    currentCandidateAnswer = answer;
    currentExtractedScore = parseNumericalScore(currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-gray-900 border border-purple-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-purple-400 font-bold text-xs">Evaluation Report</h5>${currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-xs md:text-sm mb-4">${formatMarkdown(currentFeedback)}</div><button onclick="saveToVault('Intel')" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-sm">💾 Save to Vault</button></div>`;
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

async function generateRippleEffect() {
  if (selectedFactors.size === 0) return alert("Select records via checkboxes.");
  const isPressure = document.getElementById("pressureModeIntel").checked;
  const active = Array.from(selectedFactors).map(i => db.factors[i]);
  const summary = active.map(f => `- ${f.title}: ${f.description}`).join("\n");
  const prompt = `You are a Senior Partner pushing a trainee on second-order commercial thinking regarding these developments: ${summary}. Generate a rigorous prompt asking the candidate to map out three distinct layers: 1. Primary Business Impact. 2. Market Recalibration (Competitor/Third-Party reactions). 3. Specific Law Firm Advisory Risk.`;
  setupAiModal(`Ripple Effect Simulator`, "Second-Order Thinking", "bg-indigo-900/60 text-indigo-300 border-indigo-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-indigo-400 animate-pulse text-center py-10'>Generating logic chain constraints...</p>";
  try {
    currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(currentScenario, "Your Analysis (Impact -> Market -> Legal)", "assessRippleEffect");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessRippleEffect() {
  if (activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-indigo-400 animate-pulse text-sm'>Tracing logic...</p>";
  const prompt = `Evaluating trainee solicitor's second-order thinking. Original prompt: ${currentScenario}. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ LOGICAL STRENGTHS:** (Where did they correctly connect commercial to legal?).\n**🚧 FAULTY ASSUMPTIONS:** (Where did the logic break down or miss commercial reality?).\n**⚖️ FINAL VERDICT:** (Summary).`;
  try {
    currentFeedback = await callGeminiApi(prompt);
    currentCandidateAnswer = answer;
    currentExtractedScore = parseNumericalScore(currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-gray-900 border border-indigo-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-indigo-400 font-bold text-xs">Partner Feedback</h5>${currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-xs md:text-sm mb-4">${formatMarkdown(currentFeedback)}</div><button onclick="saveToVault('Ripple Effect')" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-sm">💾 Save to Vault</button></div>`;
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

async function generateDeconstructor() {
  const isConcepts = appState === "CONCEPTS";
  const selected = isConcepts ? window.selectedConcepts : selectedFactors;
  if (selected.size === 0) return alert("Select records via checkboxes.");
  const isPressure = isConcepts ? document.getElementById("pressureModeConcept").checked : document.getElementById("pressureModeIntel").checked;
  const activeData = Array.from(selected).map(i => isConcepts ? db.concepts[i] : db.factors[i]);
  const summary = activeData.map(item => `- ${item.title}: ${isConcepts ? item.body.replace(/<[^>]*>?/gm, '') : item.description}`).join("\n");
  const prompt = `Based on these issues: ${summary}. Generate a high-stakes, multi-faceted corporate transaction or crisis scenario. The candidate must break this scenario down and allocate specific, highly technical legal tasks to at least 3 distinct law firm departments (e.g., Corporate/M&A, Employment, Real Estate, Antitrust, IP). Provide ONLY the scenario and the instruction to deconstruct it by department.`;
  setupAiModal(`Workstream Deconstructor`, "Deal Anatomy", "bg-cyan-900/60 text-cyan-300 border-cyan-700", isPressure);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-cyan-400 animate-pulse text-center py-10'>Building multi-department scenario...</p>";
  try {
    currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(currentScenario, "Your Department Breakdown", "assessDeconstructor");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessDeconstructor() {
  if (activeTimer) clearInterval(activeTimer); 
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-cyan-400 animate-pulse text-sm'>Reviewing task allocation...</p>";
  const prompt = `Evaluating trainee solicitor's deal anatomy awareness. Scenario: ${currentScenario}. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ CORRECT ALLOCATIONS:** (Which tasks were correctly assigned?).\n**🚧 MISSED DEPARTMENTS/RISKS:** (Which firm departments were forgotten or misused?).\n**⚖️ FINAL VERDICT:** (Summary).`;
  try {
    currentFeedback = await callGeminiApi(prompt);
    currentCandidateAnswer = answer;
    currentExtractedScore = parseNumericalScore(currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-gray-900 border border-cyan-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-cyan-400 font-bold text-xs">Partner Feedback</h5>${currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-xs md:text-sm mb-4">${formatMarkdown(currentFeedback)}</div><button onclick="saveToVault('Workstream Deconstruction')" class="w-full bg-cyan-700 text-white font-bold py-2 rounded-lg text-sm">💾 Save to Vault</button></div>`;
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
    currentScenario = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(currentScenario, "Your Analysis", "assessConceptAnswer");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessConceptAnswer() {
  if (activeTimer) clearInterval(activeTimer);
  const answer = document.getElementById('aiInputAnswer').value;
  const persona = document.getElementById("aiPersonaConcept").value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-blue-400 animate-pulse text-sm'>Evaluating technical accuracy...</p>";
  const prompt = `You are a ${persona} evaluating a legal trainee. Scenario: ${currentScenario}. Answer: "${answer}". Critique structured EXACTLY: **SCORE:** [X]/10\n**✅ TECHNICAL STRENGTHS:**.\n**🚧 KNOWLEDGE GAPS:** (Specific misunderstandings of the legal concepts).\n**⚖️ FINAL VERDICT:** (Summary).`;
  try {
    currentFeedback = await callGeminiApi(prompt);
    currentCandidateAnswer = answer;
    currentExtractedScore = parseNumericalScore(currentFeedback);
    feedbackDiv.innerHTML = `<div class="bg-gray-900 border border-blue-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-blue-400 font-bold text-xs">Technical Report</h5>${currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-xs md:text-sm mb-4">${formatMarkdown(currentFeedback)}</div><button onclick="saveToVault('Concept Interview')" class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">💾 Save to Vault</button></div>`;
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
    currentDefinitiveQuestion = await callGeminiApi(prompt);
    document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(`**Definitive Question:**\n\n${currentDefinitiveQuestion}`, "Your Exact Answer", "assessKnowledgeTest");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

async function assessKnowledgeTest() {
  if (activeTimer) clearInterval(activeTimer);
  const answer = document.getElementById('aiInputAnswer').value;
  if (!answer.trim()) return alert("Provide an answer.");
  const feedbackDiv = document.getElementById('assessmentFeedback');
  feedbackDiv.innerHTML = "<p class='text-teal-400 animate-pulse text-sm'>Verifying & Updating SRS...</p>";
  const prompt = `Definitive Question asked: "${currentDefinitiveQuestion}". Candidate answered: "${answer}". Is this correct under UK legal practice? Structure EXACTLY: **SCORE:** [X]/10\n**⚖️ VERDICT:** (State clearly CORRECT or INCORRECT).\n**📚 THE DEFINITIVE RULE:** (Provide the precise technical explanation/rule).`;
  try {
    const result = await callGeminiApi(prompt);
    currentFeedback = result;
    currentCandidateAnswer = answer;
    currentScenario = currentDefinitiveQuestion;
    currentExtractedScore = parseNumericalScore(result);
    
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
    saveDatabase(); renderConcepts(); 
    feedbackDiv.innerHTML = `<div class="bg-gray-900 border border-teal-500/50 rounded-xl p-4 mt-4"><div class="flex justify-between items-center mb-2"><h5 class="text-teal-400 font-bold text-xs">Knowledge Test Report</h5>${currentExtractedScore ? `<span class="bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold px-2 py-0.5 rounded text-xs">Score: ${currentExtractedScore}</span>` : ''}</div><div class="prose prose-invert text-xs md:text-sm">${formatMarkdown(result)}</div><p class="text-[10px] md:text-xs text-teal-300 mt-4 font-bold border-t border-gray-700 pt-2">Spaced Repetition Schedule Updated automatically.</p><button onclick="saveToVault('Knowledge Test')" class="w-full bg-teal-600 text-white font-bold py-2 rounded-lg text-sm mt-4">💾 Save to Vault</button></div>`;
  } catch (e) { feedbackDiv.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`; }
}

function saveToVault(type) {
  if (appState === "CONCEPTS" || type === "Concept Interview" || type === "Knowledge Test") {
    db.concepts.push({
      category: "Interview Vault",
      title: `${type} Assessment`,
      subTag: "KMS Simulation",
      body: `**SCENARIO:**\n${currentScenario}\n\n**MY RESPONSE:**\n${currentCandidateAnswer}\n\n**PARTNER EVALUATION:**\n${currentFeedback}`,
      summary: "",
      diagram: "",
      srs: { nextReview: new Date().getTime(), interval: 1, ease: 2.5 },
      date: new Date().toLocaleDateString('en-GB'),
      isCollapsed: true,
      score: currentExtractedScore
    });
    saveDatabase(); 
    alert("Saved to KMS Interview Vault.");
  } else {
    db.factors.push({
      workspace: "Interview Vault", 
      title: `${type} Assessment`, 
      pestle: "Assessment", 
      region: "UK Focus", 
      metric: "Review",
      description: `**SCENARIO:**\n${currentScenario}\n\n**MY RESPONSE:**\n${currentCandidateAnswer}\n\n**PARTNER FEEDBACK:**\n${currentFeedback}`,
      implications: "Review feedback to improve commercial awareness.", 
      linkedConcept: "", 
      date: new Date().toLocaleDateString('en-GB'), 
      isCollapsed: true,
      score: currentExtractedScore
    });
    saveDatabase(); 
    alert("Saved to Market Intelligence Interview Vault.");
  }
  closeAiModal();
}

async function generateStarFromScratch() {
  const scenario = prompt("What competency or scenario do you want to build a STAR answer for?\n(e.g., 'Commercial Awareness', 'Overcoming a setback', 'Leadership')");
  if (!scenario) return;
  
  setupAiModal(`STAR Drafter: ${scenario}`, "STAR Method", "bg-yellow-900/60 text-yellow-300 border-yellow-700", false);
  document.getElementById("aiModalContent").innerHTML = "<p class='text-yellow-400 animate-pulse text-center py-10'>Drafting professional STAR narrative...</p>";
  
  const promptText = `You are a career coach for UK corporate law firms. Draft a highly polished, 200-word STAR method interview answer demonstrating this competency/topic: "${scenario}". 
  Structure the response EXACTLY with these bold headings:
  **SITUATION:**
  **TASK:**
  **ACTION:**
  **RESULT:**
  Make it sound professional, commercial, and realistic. Provide ONLY the STAR text.`;

  try {
      const aiResponse = await callGeminiApi(promptText);
      currentCandidateAnswer = aiResponse; 
      currentScenario = scenario;
      document.getElementById("aiModalContent").innerHTML = buildSplitPaneHTML(aiResponse, "Refine or Save to Vault", "saveStarFromScratch");
  } catch (e) { document.getElementById("aiModalContent").innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`; }
}

function saveStarFromScratch() {
  const finalAnswer = document.getElementById('aiInputAnswer').value || currentCandidateAnswer;
  const coreCompetency = currentScenario.split(' ')[0].replace(/[^a-zA-Z]/g, ''); 
  
  db.factors.push({
      workspace: "Interview Vault", 
      title: `STAR: ${currentScenario}`, 
      pestle: "Assessment", 
      region: "UK Focus", 
      metric: "STAR Export",
      description: finalAnswer,
      implications: "", 
      linkedConcept: "", 
      linkedFirm: "",
      date: new Date().toLocaleDateString('en-GB'), 
      isCollapsed: true,
      score: "",
      competency: coreCompetency,
      starExport: finalAnswer
  });
  saveDatabase(); 
  alert("Saved to Competency Matrix.");
  closeAiModal();
  if(appState === 'INTELLIGENCE') renderFeed();
}