// TEMPLATE INJECTION ENGINE
// ==========================================
// Extracts heavy modal HTML from index.html to accelerate initial page load.

const systemTemplates = `
  <!-- DICTIONARY TOOLTIP -->
  <div id="dictTooltip" class="hidden absolute z-50 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md p-4 max-w-[90vw] sm:max-w-sm shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] border border-slate-700">
    <div id="dictTooltipTerm" class="font-bold font-serif text-indigo-300 dark:text-indigo-400 mb-2 border-b border-slate-700 pb-1 uppercase tracking-wider"></div>
    <div id="dictTooltipDef" class="leading-relaxed whitespace-pre-wrap text-slate-200"></div>
  </div>

  <!-- GLOBAL OMNIBAR -->
  <div id="omnibarContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex-col items-center pt-[10vh] px-4 pb-safe pt-safe print:hidden" onclick="if(event.target===this) closeOmnibar()">
    <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-slate-300 dark:border-slate-700">
        <div class="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 mr-3"></i>
            <input type="text" id="omnibarInput" placeholder="Search Nexus (Cmd/Ctrl + Shift + Z)" class="flex-1 bg-transparent text-base md:text-lg font-serif outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400" autocomplete="off" spellcheck="false" oninput="runOmnibarSearch()">
            <button onclick="closeOmnibar()" class="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-sm ml-2 transition border border-slate-200 dark:border-slate-700 shadow-sm">ESC</button>
        </div>
        <div id="omnibarResults" class="max-h-[50vh] overflow-y-auto p-2 space-y-1 bg-slate-50 dark:bg-[#0b1120]"></div>
    </div>
  </div>

  <!-- UNIVERSAL QUICK ADD MODAL -->
  <div id="quickAddModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] hidden flex-col items-center pt-[15vh] px-4 pb-safe pt-safe print:hidden" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-slate-300 dark:border-slate-700">
        <div class="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <h3 class="font-bold font-serif text-slate-800 dark:text-slate-100 flex items-center gap-2"><i data-lucide="zap" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i> Universal Quick Add <span class="text-[10px] font-sans font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 rounded-sm ml-2 shadow-inner border border-slate-300 dark:border-slate-700">Cmd+Shift+Y</span></h3>
            <button onclick="document.getElementById('quickAddModal').classList.add('hidden'); document.getElementById('quickAddModal').classList.remove('flex');" class="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl font-bold transition"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-5 flex flex-col gap-4">
            <div class="flex gap-3">
                <select id="qaType" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none w-1/3 shrink-0">
                    <option value="intel">Intel</option>
                    <option value="concept">Concept</option>
                    <option value="dict">Dictionary</option>
                </select>
                <input type="text" id="qaTitle" placeholder="Headline / Term" class="flex-1 border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white">
            </div>
            <textarea id="qaBody" placeholder="Jot down context, definition, or notes here..." class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-3 text-sm h-32 outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white resize-none"></textarea>
            <button onclick="saveQuickAdd()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-sm transition shadow-sm flex items-center justify-center gap-2 mt-1"><i data-lucide="save" class="w-4 h-4"></i> Save to Database (Cmd+Enter)</button>
        </div>
    </div>
  </div>

  <!-- TOAST NOTIFICATION CONTAINER -->
  <div id="toastContainer" class="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] flex flex-col-reverse gap-3 pointer-events-none print:hidden pb-safe pr-safe"></div>

  <!-- EXPANDED GRAPH MODAL -->
  <div id="macroGraphModal" class="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] hidden flex-col items-center justify-center p-4 md:p-8 transition-all opacity-0 pointer-events-none pt-safe pb-safe" onclick="if(event.target===this) window.closeExpandedGraph()">
      <div id="macroGraphModalInner" class="bg-white dark:bg-[#0f172a] rounded-xl w-full max-w-5xl shadow-2xl flex flex-col relative overflow-hidden border border-slate-200 dark:border-slate-700 transition-transform transform scale-95 duration-200">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
              <div>
                  <h3 class="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white flex items-center gap-3">
                      <i data-lucide="trending-up" class="w-6 h-6 text-indigo-500"></i> <span id="expandedGraphName">Metric</span>
                  </h3>
                  <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1" id="expandedGraphSub">Details</p>
              </div>
              <div class="flex items-center gap-4">
                  <div class="text-right hidden sm:block mr-4">
                      <div class="text-2xl font-black text-slate-900 dark:text-white" id="expandedGraphValue">--</div>
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Value</div>
                  </div>
                  <button onclick="window.closeExpandedGraph()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-md"><i data-lucide="x" class="w-6 h-6"></i></button>
              </div>
          </div>
          <div class="p-6 md:p-8 w-full overflow-x-auto custom-scrollbar">
              <div id="expandedGraphContainer" class="w-full min-w-[600px] h-[40vh] md:h-[400px] relative"></div>
          </div>
      </div>
  </div>

  <!-- DAILY BRIEFING MODAL -->
  <div id="dailyBriefingModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) document.getElementById('dailyBriefingModal').classList.add('hidden')">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-md w-full shadow-xl relative overflow-hidden flex flex-col animate-fade-in-up border border-slate-300 dark:border-slate-800">
      <div class="bg-slate-800 dark:bg-slate-950 p-4 flex justify-between items-center text-white border-b border-slate-700">
        <h3 class="text-lg font-serif font-bold flex items-center gap-2"><i data-lucide="clipboard-list" class="w-5 h-5"></i> Daily Briefing</h3>
        <button onclick="document.getElementById('dailyBriefingModal').classList.add('hidden')" class="text-slate-400 hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <div id="briefingContent" class="p-6 bg-slate-50 dark:bg-[#0b1120] flex-1 overflow-y-auto max-h-[70vh] dark:text-slate-200"></div>
      <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
        <button onclick="document.getElementById('dailyBriefingModal').classList.add('hidden')" class="bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-bold py-2 px-5 rounded-sm transition text-sm">Dismiss</button>
      </div>
    </div>
  </div>

  <!-- DRAWING MODAL -->
  <div id="drawingModalContainer" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-2 md:p-4 print:hidden flex-col pt-safe pb-safe" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 mb-4 mt-safe">
      <div class="flex items-center gap-2 md:gap-3 bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-300 dark:border-slate-700 w-full md:w-auto overflow-x-auto shadow-sm scrollbar-hide">
        <button onclick="setDrawMode('pen')" id="btnToolPen" class="bg-indigo-600 text-white px-3 py-1.5 rounded-sm font-bold text-xs shadow-sm transition shrink-0 flex items-center gap-1.5"><i data-lucide="pen-tool" class="w-3.5 h-3.5"></i> Pen</button>
        <button onclick="setDrawMode('eraser')" id="btnToolEraser" class="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-sm font-bold text-xs transition shrink-0 flex items-center gap-1.5"><i data-lucide="eraser" class="w-3.5 h-3.5"></i> Eraser</button>
        <div class="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>
        <input type="color" id="drawColorPicker" value="#000000" class="w-6 h-6 rounded-sm cursor-pointer border-0 bg-transparent p-0 shrink-0" onchange="setDrawMode('pen')">
        <input type="range" id="drawLineWidth" min="1" max="15" value="2" class="w-20 md:w-24 ml-1 md:ml-2 shrink-0" onchange="setDrawMode('pen')">
        <div class="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>
        <button onclick="undoDraw()" class="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs px-2 transition shrink-0 flex items-center gap-1"><i data-lucide="undo" class="w-3.5 h-3.5"></i> Undo</button>
        <button onclick="clearCanvas()" class="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs px-2 transition shrink-0 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear</button>
        <div class="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>
        <button onclick="zoomCanvas(0.2)" class="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-sm px-2 transition shrink-0"><i data-lucide="zoom-in" class="w-4 h-4"></i></button>
        <button onclick="zoomCanvas(-0.2)" class="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-sm px-2 transition shrink-0"><i data-lucide="zoom-out" class="w-4 h-4"></i></button>
      </div>
      <div class="flex items-center gap-2 md:gap-3 w-full md:w-auto shrink-0 justify-end">
        <label class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-sm text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm">
            <i data-lucide="image" class="w-3.5 h-3.5"></i> Background
            <input type="file" accept="image/*" class="hidden" onchange="uploadCanvasBackground(event)">
        </label>
        <button onclick="saveDrawing()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-sm text-xs transition shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-3.5 h-3.5"></i> Save</button>
        <button onclick="closeDrawingPad()" class="text-slate-400 hover:text-white transition ml-2"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
    </div>
    <div class="w-full max-w-5xl bg-slate-200 dark:bg-slate-950 rounded-md overflow-auto shadow-2xl border-4 border-white dark:border-slate-800 relative h-[60vh] md:h-[600px]">
        <div id="zoomWrapper" class="origin-top-left transition-transform duration-200 bg-white absolute left-0 top-0">
            <canvas id="diagramCanvas" class="block cursor-crosshair touch-none"></canvas>
        </div>
    </div>
    <p class="text-slate-400 text-[10px] md:text-xs mt-3 text-center px-4 font-medium">Apple Pencil or desktop mouse draws ink. Use fingers to pan when zoomed.</p>
  </div>

  <!-- EDIT MODAL (Market Intel) -->
  <div id="editModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) document.getElementById('editModalContainer').classList.add('hidden')">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
      <button onclick="document.getElementById('editModalContainer').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Edit Insight</h3>
      <input type="hidden" id="editIndex">
      <div class="space-y-4">
        <input type="text" id="editTitle" spellcheck="true" lang="en-GB" autocorrect="on" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none autosave-input dark:bg-slate-800 dark:text-white font-bold shadow-inner">
        
        <div class="mt-4">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Short Summary / Preview</label>
          <textarea id="editSummary" spellcheck="true" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none autosave-input dark:bg-slate-800 dark:text-white shadow-inner resize-y min-h-[60px]"></textarea>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Workspace / Tab</label>
          <select id="editWorkspaceSelect" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 autosave-input"></select>
        </div>

        <select id="editLinkedConcept" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 autosave-input">
          <option value="">Link Concept (Optional)</option>
        </select>
        <select id="editLinkedFirm" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 autosave-input">
          <option value="">Link Target Firm (Optional)</option>
        </select>
        
        <div class="flex gap-3">
          <div class="w-1/2">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">PESTLE Tag</label>
            <select id="editPestle" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 autosave-input dark:bg-slate-800 dark:text-white">
               <option value="Political">Political</option><option value="Economic">Economic</option><option value="Social">Social</option>
               <option value="Technological">Technological</option><option value="Legal">Legal</option><option value="Environmental">Environmental</option>
               <option value="Assessment">Assessment</option>
            </select>
          </div>
          <div class="w-1/2">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Metric Data</label>
            <input type="text" id="editMetric" spellcheck="true" lang="en-GB" autocorrect="on" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none autosave-input dark:bg-slate-800 dark:text-white">
          </div>
        </div>
        
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Context & Description</label>
          <div class="bg-white dark:bg-slate-900 flex flex-col border border-slate-300 dark:border-slate-700 rounded-sm overflow-hidden min-h-[150px] shadow-sm">
            <div id="toolbar-intel-edit-desc" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
              <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button></span>
              <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
            </div>
            <div id="editDescriptionQuill" class="flex-1 bg-white dark:bg-slate-900 cursor-text text-sm dark:text-white"></div>
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Implications</label>
          <div class="bg-slate-50 dark:bg-slate-800/50 flex flex-col border border-slate-300 dark:border-slate-700 rounded-sm overflow-hidden min-h-[120px] shadow-sm">
            <div id="toolbar-intel-edit-impl" class="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
              <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button></span>
              <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
            </div>
            <div id="editImplicationsQuill" class="flex-1 bg-transparent cursor-text text-sm dark:text-white"></div>
          </div>
        </div>

      </div>
      <div class="flex justify-end gap-3 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
        <button onclick="document.getElementById('editModalContainer').classList.add('hidden')" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
        <button onclick="saveEdit()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Save Insight</button>
      </div>
    </div>
  </div>

  <!-- EDIT CONCEPT MODAL (KMS) -->
  <div id="editConceptModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) document.getElementById('editConceptModalContainer').classList.add('hidden')">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-3xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
      <button onclick="document.getElementById('editConceptModalContainer').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Edit Core Concept</h3>
      <input type="hidden" id="editConceptIndex">
      <div class="space-y-4">
        <div class="flex flex-col md:flex-row gap-3">
          <input type="text" id="editConceptTitle" spellcheck="true" lang="en-GB" autocorrect="on" class="w-full md:w-1/2 border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none autosave-input dark:bg-slate-800 dark:text-white shadow-inner">
          <div class="flex gap-3 w-full md:w-1/2">
            <input type="text" id="editConceptSubTag" spellcheck="true" lang="en-GB" autocorrect="on" placeholder="Sub-Tag (Opt)" class="w-1/2 border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none autosave-input dark:bg-slate-800 dark:text-white shadow-inner">
            <select id="editConceptCategory" class="w-1/2 border border-slate-300 dark:border-slate-700 rounded-sm p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 autosave-input"></select>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm shadow-sm">
          <div id="editConceptToolbar" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
            <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button></span>
            <span class="ql-formats"><select class="ql-color"></select><select class="ql-background"></select></span>
            <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
            <span class="ql-formats"><button class="ql-clean"></button></span>
          </div>
          <div id="editConceptBodyQuill" class="h-32 md:h-48 dark:text-white"></div>
        </div>

        <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-sm p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition group" onclick="openDrawingPad('edit')">
          <img id="editConceptDiagramPreview" class="hidden w-full max-h-40 object-contain mx-auto mb-3">
          <span class="text-sm font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white flex justify-center items-center gap-2">
            <i data-lucide="pen-tool" class="w-4 h-4"></i> <span id="editConceptDiagramLabel">Edit / Add Diagram</span>
          </span>
        </div>

      </div>
      <div class="flex justify-end gap-3 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
        <button onclick="document.getElementById('editConceptModalContainer').classList.add('hidden')" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
        <button onclick="window.saveConceptEditFn()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Save Concept</button>
      </div>
    </div>
  </div>

  <!-- ADD/EDIT COMPETENCY MODAL -->
  <div id="compModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-4xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
        <button onclick="document.getElementById('compModalContainer').classList.add('hidden'); document.getElementById('compModalContainer').classList.remove('flex');" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
        <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2" id="compModalTitle">Add Core Competency</h3>
        <input type="hidden" id="compEditIndex">
        
        <div class="flex flex-col md:flex-row gap-4 md:gap-6">
            <div class="md:w-1/4 shrink-0">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Competency Heading</label>
                <input type="text" id="compHeadingInput" placeholder="E.g., Leadership" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner">
            </div>
            <div class="md:w-3/4 flex flex-col">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evidence / STAR Example</label>
                <div class="border border-slate-300 dark:border-slate-700 rounded-sm overflow-hidden flex flex-col flex-1 bg-white dark:bg-slate-900 min-h-[200px] shadow-sm">
                    <div id="toolbar-comp-modal" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
                        <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button></span>
                        <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
                    </div>
                    <div id="compModalQuill" class="flex-1 bg-white dark:bg-slate-900 h-40 dark:text-white"></div>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-3 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button onclick="document.getElementById('compModalContainer').classList.add('hidden'); document.getElementById('compModalContainer').classList.remove('flex');" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
            <button onclick="saveCompetency()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Save Competency</button>
        </div>
    </div>
  </div>

  <!-- ADD/EDIT PRACTICE MODAL -->
  <div id="practiceModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-4xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
        <button onclick="document.getElementById('practiceModalContainer').classList.add('hidden'); document.getElementById('practiceModalContainer').classList.remove('flex');" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
        <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2" id="practiceModalTitle">Add Practice Area</h3>
        <input type="hidden" id="practiceEditIndex">
        
        <div class="flex flex-col md:flex-row gap-4 md:gap-6">
            <div class="md:w-1/4 shrink-0">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Practice Area Name</label>
                <input type="text" id="practiceHeadingInput" placeholder="E.g., Private Equity" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner">
            </div>
            <div class="md:w-3/4 flex flex-col">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Details & Context</label>
                <div class="border border-slate-300 dark:border-slate-700 rounded-sm overflow-hidden flex flex-col flex-1 bg-white dark:bg-slate-900 min-h-[200px] shadow-sm">
                    <div id="toolbar-practice-modal" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
                        <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button></span>
                        <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
                    </div>
                    <div id="practiceModalQuill" class="flex-1 bg-white dark:bg-slate-900 h-40 dark:text-white"></div>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-3 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button onclick="document.getElementById('practiceModalContainer').classList.add('hidden'); document.getElementById('practiceModalContainer').classList.remove('flex');" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
            <button onclick="window.savePracticeFn()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Save Practice Area</button>
        </div>
    </div>
  </div>

  <!-- ADD/EDIT CLIENTS MODAL -->
  <div id="clientsModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-4xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
        <button onclick="document.getElementById('clientsModalContainer').classList.add('hidden'); document.getElementById('clientsModalContainer').classList.remove('flex');" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
        <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2" id="clientsModalTitle">Add Client / Deal</h3>
        <input type="hidden" id="clientsEditIndex">
        
        <div class="flex flex-col md:flex-row gap-4 md:gap-6">
            <div class="md:w-1/4 shrink-0">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Client / Deal Name</label>
                <input type="text" id="clientsHeadingInput" placeholder="E.g., Project X" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner">
            </div>
            <div class="md:w-3/4 flex flex-col">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Details & Context</label>
                <div class="border border-slate-300 dark:border-slate-700 rounded-sm overflow-hidden flex flex-col flex-1 bg-white dark:bg-slate-900 min-h-[200px] shadow-sm">
                    <div id="toolbar-clients-modal" class="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-1 sticky top-0 z-[50]">
                        <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button></span>
                        <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
                    </div>
                    <div id="clientsModalQuill" class="flex-1 bg-white dark:bg-slate-900 h-40 dark:text-white"></div>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-3 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button onclick="document.getElementById('clientsModalContainer').classList.add('hidden'); document.getElementById('clientsModalContainer').classList.remove('flex');" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
            <button onclick="window.saveClientsFn()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Save Record</button>
        </div>
    </div>
  </div>

  <!-- FLASHCARD DASHBOARD MODAL -->
  <div id="flashcardDashboardModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] hidden flex-col items-center justify-center p-4 pt-safe pb-safe" onclick="if(event.target===this) { this.classList.add('hidden'); this.classList.remove('flex'); }">
    <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-md shadow-xl overflow-hidden flex flex-col relative border border-slate-300 dark:border-slate-800 animate-fade-in-up">
      <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
        <div>
          <h2 class="text-xl font-serif font-black text-slate-900 dark:text-white">Study Decks</h2>
          <p class="text-xs text-slate-500 mt-1">Select a spaced repetition queue to begin.</p>
        </div>
        <button onclick="document.getElementById('flashcardDashboardModal').classList.add('hidden'); document.getElementById('flashcardDashboardModal').classList.remove('flex');" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div class="p-6 flex flex-col gap-4">
        <button onclick="launchQueue('red')" class="w-full flex items-center justify-between p-4 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-800 transition group shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full bg-red-500 shadow-sm shrink-0"></div>
            <div class="text-left">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm">Lapsed & Hard</h3>
              <p class="text-xs text-slate-500 mt-0.5">Cards you struggled with or forgot.</p>
            </div>
          </div>
          <span class="text-xl font-extrabold text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" id="fcRedCount">0</span>
        </button>
        
        <button onclick="launchQueue('orange')" class="w-full flex items-center justify-between p-4 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-300 dark:hover:border-orange-800 transition group shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full bg-orange-500 shadow-sm shrink-0"></div>
            <div class="text-left">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm">Standard Review</h3>
              <p class="text-xs text-slate-500 mt-0.5">Cards currently due for review.</p>
            </div>
          </div>
          <span class="text-xl font-extrabold text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" id="fcOrangeCount">0</span>
        </button>

        <button onclick="launchQueue('yellow')" class="w-full flex items-center justify-between p-4 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-yellow-300 dark:hover:border-yellow-800 transition group shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full bg-amber-400 shadow-sm shrink-0"></div>
            <div class="text-left">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm">Review Ahead</h3>
              <p class="text-xs text-slate-500 mt-0.5">Moderate/Easy cards not yet due.</p>
            </div>
          </div>
          <span class="text-xl font-extrabold text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" id="fcYellowCount">0</span>
        </button>

        <button onclick="launchQueue('green')" class="w-full flex items-center justify-between p-4 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-800 transition group shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
            <div class="text-left">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm">Mastered</h3>
              <p class="text-xs text-slate-500 mt-0.5">Cards pushed past 30 days.</p>
            </div>
          </div>
          <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" id="fcGreenCount">0</span>
        </button>
      </div>
    </div>
  </div>

  <!-- AI SYNTHESIS MODAL -->
  <div id="aiModalContainer" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center hidden p-2 md:p-4 transition-all print:hidden pt-safe pb-safe" onclick="if(event.target===this) closeAiModal()">
    <div class="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-md max-w-6xl w-full p-4 md:p-8 space-y-4 shadow-xl relative max-h-full overflow-hidden flex flex-col" id="aiModalBox">
      <button onclick="closeAiModal()" class="absolute top-4 right-4 md:top-4 md:right-5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition z-50"><i data-lucide="x" class="w-6 h-6"></i></button>
      <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 md:pb-4 mb-2 md:mb-4 shrink-0 pr-8">
        <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <h3 id="aiModalTitle" class="text-lg md:text-xl font-serif font-black text-slate-900 dark:text-white">AI Synthesis</h3>
          <span id="aiTimerDisplay" class="hidden bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2 py-0.5 md:px-3 md:py-1 rounded-sm font-mono font-bold text-xs tracking-widest shadow-sm"></span>
        </div>
        <span id="aiModalBadge" class="hidden md:inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-sm">Analysis</span>
      </div>
      <div id="aiModalContent" class="text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap flex-1 overflow-hidden flex flex-col min-h-0 prose prose-sm max-w-none dark:prose-invert"></div>
    </div>
  </div>

  <!-- DATABASE IMPORT MODAL -->
  <div id="backupModalContainer" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center hidden p-4 print:hidden pt-safe pb-safe" onclick="if(event.target===this) document.getElementById('backupModalContainer').classList.add('hidden')">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-2xl w-full p-6 shadow-xl relative max-h-full overflow-y-auto border border-slate-300 dark:border-slate-700">
      <button onclick="document.getElementById('backupModalContainer').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Database Import Config</h3>
      <div class="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-sm p-5 border border-slate-200 dark:border-slate-700">
        <label class="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">Upload Backup File (.json)</label>
        <input type="file" id="fileUpload" accept=".json" onchange="handleFileUpload(event)" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-600 cursor-pointer transition">
      </div>
      <div class="flex items-center my-6"><hr class="flex-grow border-slate-200 dark:border-slate-800"><span class="px-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">OR PASTE RAW JSON</span><hr class="flex-grow border-slate-200 dark:border-slate-800"></div>
      <textarea id="backupTextarea" class="w-full h-32 md:h-40 border border-slate-300 dark:border-slate-700 rounded-sm p-3 text-xs font-mono text-slate-700 dark:text-slate-300 dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none mb-4 shadow-inner"></textarea>
      <div class="flex justify-end gap-3 mt-2 border-t border-slate-200 dark:border-slate-800 pt-4">
        <button onclick="document.getElementById('backupModalContainer').classList.add('hidden')" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Close</button>
        <button onclick="processImport()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition shadow-sm hidden text-sm items-center gap-1.5" id="importConfirmBtn"><i data-lucide="upload" class="w-4 h-4"></i> Process Import</button>
      </div>
    </div>
  </div>

  <!-- RSS TRIAGE MODAL -->
  <div id="rssTriageModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center hidden p-4 pt-safe pb-safe" onclick="if(event.target===this) closeRssTriage()">
    <div class="bg-white dark:bg-slate-900 rounded-md max-w-3xl w-full flex flex-col max-h-[90dvh] overflow-hidden shadow-xl relative border border-slate-300 dark:border-slate-700">
      <div class="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50 dark:bg-slate-950">
        <div>
          <h3 class="text-lg md:text-xl font-serif font-black text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="rss" class="w-5 h-5 text-orange-500"></i> Incoming Intelligence</h3>
          <p class="text-xs text-slate-500 mt-1">Select the articles relevant to your practice areas.</p>
        </div>
        <button onclick="closeRssTriage()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div id="rssTriageList" class="p-4 md:p-6 overflow-y-auto flex-1 space-y-3 md:space-y-4"></div>
      <div class="p-4 md:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3 shrink-0">
        <button onclick="closeRssTriage()" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm transition text-sm">Cancel</button>
        <button onclick="importSelectedRss()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm transition text-sm shadow-sm flex items-center gap-1.5"><i data-lucide="download" class="w-4 h-4"></i> Import Selected</button>
      </div>
    </div>
  </div>

  <!-- FLASHCARD SRS MODAL -->
  <div id="flashcardModal" class="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] hidden flex-col items-center justify-center p-4 pt-safe pb-safe" onclick="if(event.target===this) closeFlashcards()">
    <div class="w-full max-w-3xl flex flex-col items-center h-full max-h-[85vh] relative animate-fade-in-up">
      <div class="w-full flex justify-between items-center mb-4 shrink-0 px-2">
        <span class="text-slate-400 font-bold tracking-widest uppercase text-xs border border-slate-700 bg-slate-800 px-3 py-1 rounded-sm shadow-inner" id="flashcardCounter">Card 1 of 5</span>
        <button onclick="closeFlashcards()" class="text-slate-400 hover:text-white transition"><i data-lucide="x" class="w-7 h-7"></i></button>
      </div>
      <div class="w-full flex-1 bg-white dark:bg-slate-900 rounded-md shadow-2xl overflow-hidden flex flex-col relative border border-slate-300 dark:border-slate-700" id="flashcardContainer">
        <!-- FRONT OF CARD -->
        <div id="flashcardFront" class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0b1120] transition" onclick="flipFlashcard()">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-sm shadow-sm" id="fcCategory">Category</span>
            <h2 class="text-3xl md:text-5xl font-serif font-black text-slate-900 dark:text-white leading-tight" id="fcTitle">Concept Title</h2>
            <div id="fcFrontBody" class="hidden text-base md:text-xl font-medium text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed overflow-y-auto max-h-[50vh] text-left p-6 border border-slate-200 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-800 shadow-inner"></div>
            <p class="text-slate-400 mt-10 text-xs uppercase tracking-widest animate-pulse font-bold" id="fcInstruction">(Tap or click to reveal answer)</p>
            <div class="mt-8 w-full max-w-lg z-10 cursor-default" onclick="event.stopPropagation()">
                <button onclick="toggleFeynmanDrawer(this)" id="btnShowFeynman" class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1.5 mx-auto border border-slate-200 dark:border-slate-700 hover:border-slate-400 rounded-sm px-4 py-1.5 bg-white dark:bg-slate-900 shadow-sm"><i data-lucide="pen-tool" class="w-3 h-3"></i> Optional: Try Feynman Technique</button>
                <div id="feynmanDrawer" class="hidden flex-col gap-3 mt-4 animate-fade-in-up bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 p-4 rounded-sm">
                    <textarea id="feynmanInput" placeholder="Explain this simply in your own words. No jargon..." spellcheck="true" class="w-full border border-slate-300 dark:border-slate-700 rounded-sm p-3 text-sm h-28 outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-inner bg-white dark:bg-slate-900 dark:text-white"></textarea>
                    <div class="flex gap-2">
                        <button onclick="evaluateFeynman()" id="btnFeynmanSubmit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-sm text-xs flex-1 transition shadow-sm flex items-center justify-center gap-1.5"><i data-lucide="bot" class="w-4 h-4"></i> Grade Simplicity & Flip</button>
                        <button onclick="flipFlashcard()" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-sm text-xs transition shadow-sm">Skip</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- BACK OF CARD -->
        <div id="flashcardBack" class="absolute inset-0 flex-col hidden overflow-hidden bg-white dark:bg-slate-900">
            <div class="p-6 md:p-8 bg-slate-50 dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800 shrink-0">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block" id="fcBackCategory">Category</span>
              <h3 class="text-2xl md:text-3xl font-serif font-black text-slate-900 dark:text-white" id="fcBackTitle">Concept Title</h3>
            </div>
            <div class="flex-1 overflow-y-auto flex flex-col">
                <div id="feynmanFeedback" class="hidden m-6 md:m-8 mb-0 p-5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-sm shadow-inner shrink-0">
                   <h4 class="text-[10px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="bot" class="w-3.5 h-3.5"></i> AI Grader Feedback</h4>
                   <div id="feynmanFeedbackContent" class="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed"></div>
                </div>
                <div class="p-6 md:p-8 prose prose-sm md:prose-base max-w-none dark:prose-invert" id="fcBody"></div>
            </div>
        </div>
      </div>
      <!-- Controls -->
      <div id="flashcardControls" class="w-full grid grid-cols-5 gap-2 md:gap-3 mt-4 shrink-0 hidden pb-safe">
        <button onclick="processFlashcardResult('forgot')" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 md:py-4 rounded-md text-xs flex flex-col items-center transition shadow-md"><i data-lucide="rotate-ccw" class="w-5 h-5 mb-1 text-red-500"></i> <span class="uppercase text-[10px] md:text-xs">Forgot</span> <span class="text-[9px] font-normal text-slate-400 mt-1">&lt; 1m</span></button>
        <button onclick="processFlashcardResult('hard')" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 md:py-4 rounded-md text-xs flex flex-col items-center transition shadow-md"><i data-lucide="brain" class="w-5 h-5 mb-1 text-orange-500"></i> <span class="uppercase text-[10px] md:text-xs">Hard</span> <span class="text-[9px] font-normal text-slate-400 mt-1">2d</span></button>
        <button onclick="processFlashcardResult('good')" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 md:py-4 rounded-md text-xs flex flex-col items-center transition shadow-md"><i data-lucide="thumbs-up" class="w-5 h-5 mb-1 text-indigo-500"></i> <span class="uppercase text-[10px] md:text-xs">Good</span> <span class="text-[9px] font-normal text-slate-400 mt-1">4d</span></button>
        <button onclick="processFlashcardResult('easy')" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 md:py-4 rounded-md text-xs flex flex-col items-center transition shadow-md"><i data-lucide="rocket" class="w-5 h-5 mb-1 text-emerald-500"></i> <span class="uppercase text-[10px] md:text-xs">Easy</span> <span class="text-[9px] font-normal text-slate-400 mt-1">7d</span></button>
        <button onclick="processFlashcardResult('mastered')" class="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white border border-transparent font-bold py-3 md:py-4 rounded-md text-xs flex flex-col items-center transition shadow-md ring-2 ring-slate-900/20 dark:ring-white/20"><i data-lucide="trophy" class="w-5 h-5 mb-1"></i> <span class="uppercase text-[10px] md:text-xs">Mastered</span> <span class="text-[9px] font-normal opacity-70 mt-1">30d+</span></button>
      </div>
    </div>
  </div>

  <!-- CHEAT SHEET PRINT CONTAINER -->
  <div id="cheatSheetContainer" class="hidden absolute inset-0 bg-white dark:bg-slate-950 z-[99999] p-4 md:p-8 min-h-[100dvh] overflow-y-auto print:p-0 pt-safe pb-safe"></div>
`;

document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("beforeend", systemTemplates);
    if (window.lucide) window.lucide.createIcons();
});