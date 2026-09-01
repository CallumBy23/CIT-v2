// CONFIGURATION & STATE
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhB6-0rFl1pWF7w6eUXFTWMxyFKjkjaEqc07YFYy9EG4bFokxwyPB_vpXrsmXHB5FM/exec"; 
const GEMINI_API_KEY = "AQ.Ab8RN6IZ4fFDezQbK2Hm_Zfc_6-LnDqw-9cjS_vAai9hlUDLhg"; 

window.currentConceptCategory = "All";
window.currentWorkspace = "All";

let db = { 
  workspaces: ["General Market", "Interview Vault"], 
  factors: [],
  conceptCategories: ["Corporate / M&A", "Capital Markets", "Intellectual Property", "Commercial Contracts", "Dispute Resolution", "Interview Vault"],
  concepts: [],
  dossiers: {},
  dictionary: [],
  targetFirms: []
};

let uiPrefs = { intelSort: 'newest', conceptSort: 'newest', dictSort: 'az', dossierSort: 'deadline' };

let quillEditor, editQuillEditor;
let practiceQuill, clientsQuill, cultureQuill; 
let appState = "INTELLIGENCE"; 

let currentWorkspace = "All";
let activePestleFilter = "All";
const PESTLE_CATEGORIES = ["All", "Political", "Economic", "Social", "Technological", "Legal", "Environmental", "Assessment"];
let selectedFactors = new Set();
let currentVisibleFactorIndices = [];

let currentConceptCategory = "All";
let selectedConcepts = new Set();
let currentVisibleConceptIndices = [];
let filterReviewDue = false;

let currentDossierFirm = "";
let dossierSortMode = "deadline";

let currentScenario = ""; 
let currentCandidateAnswer = "";
let currentFeedback = "";
let currentDefinitiveQuestion = "";
let currentExtractedScore = "";
let activeTimer = null;
let draggedTabName = "";
let autoSaveTimer = null;

let diagramTempBase64 = ""; 
let drawingTarget = "new"; 
let canvas, ctx;
let isDrawing = false;
let drawMode = 'pen'; 
let undoStack = [];
let zoomLevel = 1;
let lastX = 0;
let lastY = 0;
const logicalCanvasWidth = 1200;
const logicalCanvasHeight = 800;