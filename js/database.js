// ==========================================
// SUPABASE MULTI-USER AUTH, DATA ENGINE & SYNC
// ==========================================

let uploadedBackupJsonString = "";
window.currentUser = null;
window.deletedDossierFirms = new Set();

// ==========================================
// AUTHENTICATION STATE CONTROLLER
// ==========================================
window.authMode = 'login'; 

window.openAuthModal = function() {
    const m = document.getElementById("authModal");
    if (m) {
        m.classList.remove("hidden");
        m.classList.add("flex");
        if (window.lucide) window.lucide.createIcons();
    }
};

window.closeAuthModal = function() {
    const m = document.getElementById("authModal");
    if (m) {
        m.classList.add("hidden");
        m.classList.remove("flex");
    }
};

window.toggleAuthMode = function() {
    if (window.authMode === 'forgot') {
        window.authMode = 'login';
    } else {
        window.authMode = (window.authMode === 'login') ? 'signup' : 'login';
    }
    window.updateAuthView();
};

window.toggleForgotPasswordMode = function() {
    if (window.authMode === 'forgot') {
        window.authMode = 'login';
    } else {
        window.authMode = 'forgot';
    }
    window.updateAuthView();
};

window.updateAuthView = function() {
    const title = document.getElementById("authModalTitle");
    const subtitle = document.getElementById("authModalSubtitle");
    const pwdContainer = document.getElementById("authPasswordContainer");
    const forgotRow = document.getElementById("forgotPasswordRow");
    const submitBtnText = document.getElementById("btnAuthText");
    const togglePrompt = document.getElementById("authTogglePrompt");
    const toggleBtn = document.getElementById("btnAuthToggle");
    const banner = document.getElementById("authErrorBanner");
    const pwdInput = document.getElementById("authPassword");
    const regFields = document.getElementById("authRegisterFields");

    if (banner) banner.classList.add("hidden");

    if (window.authMode === 'login') {
        if (title) title.innerText = "Welcome back";
        if (subtitle) subtitle.innerText = "Please enter your details to sync your workspace";
        if (regFields) regFields.classList.add("hidden");
        if (pwdContainer) pwdContainer.classList.remove("hidden");
        if (pwdInput) pwdInput.required = true;
        if (forgotRow) forgotRow.classList.remove("hidden");
        if (submitBtnText) submitBtnText.innerText = "Sign in";
        if (togglePrompt) togglePrompt.innerText = "Don't have an account?";
        if (toggleBtn) toggleBtn.innerText = "Sign up";
    } else if (window.authMode === 'signup') {
        if (title) title.innerText = "Create account";
        if (subtitle) subtitle.innerText = "Set up your workspace credentials";
        if (regFields) regFields.classList.remove("hidden");
        if (pwdContainer) pwdContainer.classList.remove("hidden");
        if (pwdInput) pwdInput.required = true;
        if (forgotRow) forgotRow.classList.add("hidden");
        if (submitBtnText) submitBtnText.innerText = "Create Account";
        if (togglePrompt) togglePrompt.innerText = "Already have an account?";
        if (toggleBtn) toggleBtn.innerText = "Sign in";
    } else if (window.authMode === 'forgot') {
        if (title) title.innerText = "Reset password";
        if (subtitle) subtitle.innerText = "We'll send a password recovery link to your email";
        if (regFields) regFields.classList.add("hidden");
        if (pwdContainer) pwdContainer.classList.add("hidden");
        if (pwdInput) pwdInput.required = false;
        if (forgotRow) forgotRow.classList.add("hidden");
        if (submitBtnText) submitBtnText.innerText = "Send reset link";
        if (togglePrompt) togglePrompt.innerText = "Remember your password?";
        if (toggleBtn) toggleBtn.innerText = "Sign in";
    }
};

window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const banner = document.getElementById("authErrorBanner");
    const btn = document.getElementById("btnAuthSubmit");

    if (banner) banner.classList.add("hidden");
    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Please wait...`;

    try {
        if (window.authMode === 'login') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else if (window.authMode === 'signup') {
            const fullNameInput = document.getElementById("authFullName");
            const usernameInput = document.getElementById("authUsername");
            
            const fullName = fullNameInput ? fullNameInput.value.trim() : "";
            const username = usernameInput ? usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : "";

            if (!fullName) throw new Error("Please enter your full name.");
            if (!username || username.length < 3) throw new Error("Username must be at least 3 alphanumeric characters.");

            const { data, error } = await supabaseClient.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        full_name: fullName,
                        username: username
                    }
                }
            });
            if (error) throw error;

            if (data.user && !data.session) {
                banner.className = "text-xs p-3 rounded-lg leading-relaxed font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900";
                banner.innerText = "Registration complete! You may now sign in.";
                banner.classList.remove("hidden");
                window.authMode = 'login';
                window.updateAuthView();
            }
        } else if (window.authMode === 'forgot') {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            if (error) throw error;
            banner.className = "text-xs p-3 rounded-lg leading-relaxed font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900";
            banner.innerText = "Recovery email sent! Please check your inbox.";
            banner.classList.remove("hidden");
        }
    } catch (err) {
        if (banner) {
            banner.className = "text-xs p-3 rounded-lg leading-relaxed font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900";
            banner.innerText = err.message || "Authentication error.";
            banner.classList.remove("hidden");
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

window.logoutUser = async function() {
    if (confirm("Sign out of Legal Nexus on this device?")) {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                await supabaseClient.auth.signOut();
            }
        } catch (e) {
            console.warn("Sign out remote notice:", e);
        }
        localStorage.removeItem("LEGAL_NEXUS_DB");
        localStorage.removeItem("LEGAL_NEXUS_USER_PROFILE");
        sessionStorage.removeItem("LN_BRIEFING_SHOWN_TODAY");
        
        window.currentUser = null;
        location.reload();
    }
};

function updateStatus(text, color) {
    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusText");
    if (label) label.innerText = text;
    if (dot) {
        dot.className = `w-2.5 h-2.5 rounded-full ${
            color === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
            color === 'yellow' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
            'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
        }`;
    }
}

function setOnlineStatus(isOnline, errorMsg = "") {
    if (isOnline) {
        updateStatus("Synced", "green");
    } else {
        updateStatus(errorMsg || "Syncing...", "yellow");
    }
}

function updateUserUI(user) {
    const fullNameEl = document.getElementById("userFullNameDisplay");
    const usernameEl = document.getElementById("userUsernameDisplay");
    const avatar = document.getElementById("userAvatar");
    const welcomeTitle = document.getElementById("dashboardWelcomeTitle");

    let email = "";
    let metadata = {};

    const localProfile = JSON.parse(localStorage.getItem("LEGAL_NEXUS_USER_PROFILE") || "{}");

    if (typeof user === 'string') {
        email = user;
    } else if (user && typeof user === 'object') {
        email = user.email || "";
        metadata = user.user_metadata || {};
    }

    const fullName = (metadata.full_name || localProfile.full_name || (email ? email.split('@')[0] : "Candidate")).trim();
    const rawUsername = (metadata.username || localProfile.username || (email ? email.split('@')[0] : "guest")).trim();
    
    const firstName = fullName.split(/\s+/)[0] || "Candidate";
    const username = `@${rawUsername.replace(/^@/, '')}`;

    if (fullNameEl) fullNameEl.innerText = firstName;
    if (usernameEl) usernameEl.innerText = username;

    if (avatar) {
        avatar.innerText = firstName.substring(0, 2).toUpperCase() || "LN";
    }

    if (welcomeTitle) {
        welcomeTitle.innerText = `Welcome back, ${firstName}`;
    }

    if (typeof window.renderSettingsView === 'function') {
        window.renderSettingsView();
    }
}

async function initAuthSession() {
    if (!supabaseClient) {
        updateStatus("Client Missing", "red");
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (session && session.user) {
            window.currentUser = session.user;
            window.closeAuthModal();
            updateUserUI(session.user);
            await loadDatabase();
        } else {
            const cached = JSON.parse(localStorage.getItem("LEGAL_NEXUS_DB") || "null");
            if (cached) {
                db = cached;
                renderActiveStateViews();
            }
            window.openAuthModal();
        }
    } catch (e) {
        console.error("Auth init error:", e);
        window.openAuthModal();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            window.currentUser = session.user;
            window.closeAuthModal();
            updateUserUI(session.user);
            await loadDatabase();
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            updateUserUI(null);
            window.openAuthModal();
        }
    });
}

// 1. Data Fetch Engine with Loading Deduplication
async function loadDatabase() {
    updateStatus("Syncing...", "yellow");

    const localCached = localStorage.getItem("LEGAL_NEXUS_DB");
    if (localCached) {
        try {
            const parsed = JSON.parse(localCached);
            if (parsed.workspaces) db.workspaces = parsed.workspaces;
            if (parsed.factors) db.factors = parsed.factors;
            if (parsed.conceptCategories) db.conceptCategories = parsed.conceptCategories;
            if (parsed.concepts) db.concepts = parsed.concepts;
            if (parsed.dossiers) db.dossiers = parsed.dossiers;
            if (parsed.dictionary) db.dictionary = parsed.dictionary;
            if (parsed.targetFirms) db.targetFirms = parsed.targetFirms;
            if (parsed.dictCategories) db.dictCategories = parsed.dictCategories;
            if (parsed.playbooks) db.playbooks = parsed.playbooks;
            if (parsed.macroMetrics) db.macroMetrics = parsed.macroMetrics;
            if (parsed.vault) db.vault = parsed.vault;
        } catch (e) {
            console.warn("Local cache parsing error:", e);
        }
    }

    renderActiveStateViews();

    if (!supabaseClient || !window.currentUser) {
        updateStatus("Signed Out", "yellow");
        return;
    }

    try {
        const uid = window.currentUser.id;

        const [
            { data: concepts, error: cErr },
            { data: factors, error: fErr },
            { data: dictionary, error: dErr },
            { data: dossiersList, error: dosErr },
            { data: playbooksList, error: pErr },
            { data: metadata, error: mErr }
        ] = await Promise.all([
            supabaseClient.from('concepts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
            supabaseClient.from('factors').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
            supabaseClient.from('dictionary').select('*').eq('user_id', uid).order('term', { ascending: true }),
            supabaseClient.from('dossiers').select('*').eq('user_id', uid),
            supabaseClient.from('playbooks').select('*').eq('user_id', uid),
            supabaseClient.from('app_metadata').select('*').eq('user_id', uid)
        ]);

        if (cErr || fErr || dErr || dosErr || pErr || mErr) {
            throw new Error("Supabase returned an error during table fetch.");
        }

        if (concepts && concepts.length > 0) {
            const seenConceptTitles = new Set();
            const uniqueConcepts = [];

            concepts.forEach(c => {
                const normTitle = (c.title || '').trim().toLowerCase();
                if (!seenConceptTitles.has(normTitle)) {
                    seenConceptTitles.add(normTitle);

                    const loadedSrs = c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false };
                    const linkedPlaybookVal = loadedSrs.linkedPlaybook || c.linked_playbook || c.linkedPlaybook || null;
                    const loadedDocuments = Array.isArray(loadedSrs.documents) 
                        ? loadedSrs.documents 
                        : (Array.isArray(c.documents) ? c.documents : []);
                    const loadedSummary = c.summary || loadedSrs.summary || "";

                    uniqueConcepts.push({
                        id: c.id,
                        title: c.title,
                        category: c.category || "General",
                        subTag: c.sub_tag || "",
                        summary: loadedSummary,
                        body: c.body || "",
                        advantages: c.advantages || "",
                        disadvantages: c.disadvantages || "",
                        whenToUse: c.when_to_use || c.whenToUse || "",
                        relatedConcepts: c.related_concepts || c.relatedConcepts || "",
                        typicalProvisions: c.typical_provisions || c.typicalProvisions || "",
                        commonUseCases: c.common_use_cases || c.commonUseCases || "",
                        linkedPlaybook: linkedPlaybookVal,
                        documents: loadedDocuments,
                        diagram: c.diagram || null,
                        srs: loadedSrs,
                        subSrs: loadedSrs.subSrs || c.sub_srs || {}
                    });
                }
            });

            db.concepts = uniqueConcepts;
        }

        if (factors && factors.length > 0) {
            const seenFactors = new Set();
            const uniqueFactors = [];

            factors.forEach(f => {
                const fingerprint = `${(f.title || '').trim().toLowerCase()}|${(f.summary || '').trim().toLowerCase()}|${(f.workspace || '').trim().toLowerCase()}`;
                if (!seenFactors.has(fingerprint)) {
                    seenFactors.add(fingerprint);

                    const rawConceptStr = f.linked_concept || f.linkedConcept || "";
                    const rawFirmStr = f.linked_firm || f.linkedFirm || "";

                    uniqueFactors.push({
                        id: f.id,
                        title: f.title,
                        summary: f.summary || "",
                        description: f.description || "",
                        implications: f.implications || "",
                        metric: f.metric || "",
                        pestle: f.pestle || "Economic",
                        region: f.region || "UK Focus",
                        workspace: f.workspace || "General Market",
                        linkedConcept: rawConceptStr,
                        linkedConcepts: rawConceptStr ? rawConceptStr.split(',').map(s => s.trim()).filter(Boolean) : [],
                        linkedFirm: rawFirmStr,
                        linkedFirms: rawFirmStr ? rawFirmStr.split(',').map(s => s.trim()).filter(Boolean) : [],
                        date: f.date || (f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'))
                    });
                }
            });

            db.factors = uniqueFactors;
        }

        if (dictionary && dictionary.length > 0) {
            db.dictionary = dictionary.map(d => ({
                id: d.id,
                term: d.term,
                category: d.category || "General",
                definition: d.definition || "",
                srs: d.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false }
            }));
        }

        if (dossiersList && dossiersList.length > 0) {
            db.dossiers = {};
            dossiersList.forEach(d => {
                db.dossiers[d.firm_name] = {
                    firmType: d.firm_type || "",
                    locations: d.locations || "",
                    culture: d.culture || "",
                    personalWhy: d.personal_why || "",
                    practice: d.practice || [],
                    clients: d.clients || [],
                    competencies: d.competencies || [],
                    schemes: d.schemes || [],
                    srs: d.srs || {},
                    applied: d.applied || false
                };
            });
            db.targetFirms = Object.keys(db.dossiers);
        }

        if (playbooksList && playbooksList.length > 0) {
            db.playbooks = {};
            const parseSafe = (val) => {
                if (!val) return [];
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch(e) { return []; }
                }
                return Array.isArray(val) ? val : [];
            };

            const defaultStagesList = (typeof DEFAULT_STAGES !== 'undefined') ? DEFAULT_STAGES : [
                { id: "s1", name: "Phase 1: Deal Initiation & Preliminary DD", minLevel: 1, maxLevel: 3, accent: "#6366f1" },
                { id: "s2", name: "Phase 2: Definitive Drafting & Negotiations", minLevel: 4, maxLevel: 7, accent: "#0284c7" },
                { id: "s3", name: "Phase 3: Interim Period & CP Checklist", minLevel: 8, maxLevel: 10, accent: "#d97706" },
                { id: "s4", name: "Phase 4: Completion & Funds Flow", minLevel: 11, maxLevel: 13, accent: "#059669" },
                { id: "s5", name: "Phase 5: Post-Closing Filings & Integration", minLevel: 14, maxLevel: 25, accent: "#9333ea" }
            ];

            playbooksList.forEach(p => {
                db.playbooks[p.name] = {
                    nodes: parseSafe(p.nodes),
                    edges: parseSafe(p.edges),
                    stages: parseSafe(p.stages).length > 0 ? parseSafe(p.stages) : JSON.parse(JSON.stringify(defaultStagesList))
                };
            });

            const pbKeys = Object.keys(db.playbooks);
            if (pbKeys.length > 0 && (!currentPlaybook || !db.playbooks[currentPlaybook])) {
                currentPlaybook = pbKeys[0];
            }
        }

        (metadata || []).forEach(m => {
            if (m.key === 'workspaces' && Array.isArray(m.value)) db.workspaces = m.value;
            if (m.key === 'conceptCategories' && Array.isArray(m.value)) {
                db.conceptCategories = m.value.filter(cat => cat !== "Interview Vault");
            }
            if (m.key === 'dictCategories' && Array.isArray(m.value)) db.dictCategories = m.value;
            if (m.key === 'macroMetrics' && typeof m.value === 'object') db.macroMetrics = m.value;
        });

        saveToLocalCache();
        updateStatus("Synced", "green");
        renderActiveStateViews();

    } catch (err) {
        console.error("Supabase Load Error:", err);
        updateStatus("Sync Error", "red");
    }

    if (typeof checkDailyBriefing === 'function') checkDailyBriefing();
}

function renderActiveStateViews() {
    if (typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
    if (typeof renderTabs === 'function') renderTabs();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (appState === "INTELLIGENCE" && typeof renderFeed === 'function') renderFeed();
    else if (appState === "CONCEPTS" && typeof renderConcepts === 'function') renderConcepts();
    else if (appState === "DOSSIERS" && typeof renderDossierList === 'function') renderDossierList();
    else if (appState === "PLAYBOOKS" && typeof renderPlaybookList === 'function') renderPlaybookList();
    else if (appState === "DICTIONARY" && typeof renderDictionary === 'function') renderDictionary();
    else if (appState === "VAULT" && typeof window.renderVault === 'function') window.renderVault();
    else if (appState === "SETTINGS" && typeof window.renderSettingsView === 'function') window.renderSettingsView();
}

// -------------------------------------------------------------
// INSTANT SINGLE-CONCEPT SAVE (Captures Supabase Row ID)
// -------------------------------------------------------------
window.saveSingleConcept = async function(index) {
    if (index === null || index === undefined || !db.concepts || !db.concepts[index]) {
        return false;
    }
    
    updateStatus("Saving...", "yellow");
    saveToLocalCache();

    if (!supabaseClient) {
        updateStatus("Saved Locally", "yellow");
        return true;
    }

    let uid = window.currentUser ? window.currentUser.id : null;
    if (!uid) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                window.currentUser = user;
                uid = user.id;
            }
        } catch(e){}
    }

    if (!uid) {
        updateStatus("Saved Locally", "yellow");
        return true;
    }

    const c = db.concepts[index];

    try {
        const srsPayload = c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false };
        srsPayload.subSrs = c.subSrs || srsPayload.subSrs || {};
        srsPayload.linkedPlaybook = c.linkedPlaybook || (c.srs && c.srs.linkedPlaybook) || null;
        srsPayload.documents = Array.isArray(c.documents) ? c.documents.slice(0, 5) : [];
        srsPayload.summary = c.summary || "";

        const row = {
            user_id: uid,
            title: c.title || "Untitled Concept",
            category: c.category || "General",
            sub_tag: c.subTag || "",
            body: c.body || "",
            advantages: c.advantages || "",
            disadvantages: c.disadvantages || "",
            when_to_use: c.whenToUse || "",
            related_concepts: c.relatedConcepts || "",
            typical_provisions: c.typicalProvisions || "",
            common_use_cases: c.commonUseCases || "",
            diagram: c.diagram || null,
            srs: srsPayload
        };

        if (c.id) {
            row.id = c.id;
        }

        const { data, error } = await supabaseClient
            .from('concepts')
            .upsert(row, { onConflict: 'user_id, title' })
            .select('id');
        
        if (error) {
            console.error("Single Concept Upsert Error:", error);
            updateStatus("Sync Error", "red");
            return false;
        }

        if (data && data[0] && data[0].id) {
            c.id = data[0].id;
            saveToLocalCache();
        }

        updateStatus("Synced", "green");
        return true;
    } catch (err) {
        console.error("Single concept save failed:", err);
        updateStatus("Sync Error", "red");
        return false;
    }
};

// -------------------------------------------------------------
// DIRECT SUPABASE CONCEPT DELETION ENGINE
// -------------------------------------------------------------
window.deleteConceptFromSupabase = async function(target) {
    if (!target || !supabaseClient) return false;

    let uid = window.currentUser ? window.currentUser.id : null;
    if (!uid) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                window.currentUser = user;
                uid = user.id;
            }
        } catch(e){}
    }

    if (!uid) return false;

    try {
        let error = null;
        const conceptId = typeof target === 'object' ? target.id : null;
        const conceptTitle = (typeof target === 'object' ? target.title : target)?.trim();

        if (conceptId) {
            const res = await supabaseClient.from('concepts').delete().eq('id', conceptId);
            error = res.error;
        }
        
        if (!conceptId || error) {
            if (conceptTitle) {
                const res = await supabaseClient
                    .from('concepts')
                    .delete()
                    .eq('user_id', uid)
                    .eq('title', conceptTitle);
                error = res.error;
                
                if (error) {
                    await supabaseClient
                        .from('concepts')
                        .delete()
                        .eq('user_id', uid)
                        .ilike('title', conceptTitle);
                }
            }
        }

        return true;
    } catch (err) {
        console.error("Remote concept delete exception:", err);
        return false;
    }
};

// -------------------------------------------------------------
// FIRM DOSSIER DELETION ENGINE (LOCAL & REMOTE SUPABASE)
// -------------------------------------------------------------
window.deleteFirmDossier = async function(firmName) {
    if (!firmName) return false;

    let exactName = firmName;
    if (db.dossiers && !db.dossiers[firmName]) {
        const match = Object.keys(db.dossiers).find(k => k.toLowerCase() === firmName.toLowerCase());
        if (match) exactName = match;
    }

    if (!confirm(`Permanently delete dossier for "${exactName}"? This action cannot be undone.`)) {
        return false;
    }

    updateStatus("Saving...", "yellow");

    window.deletedDossierFirms.add(exactName);

    // 1. Explicit remote delete
    if (supabaseClient) {
        try {
            let uid = window.currentUser ? window.currentUser.id : null;
            if (!uid) {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    window.currentUser = user;
                    uid = user.id;
                }
            }

            if (uid) {
                const { error } = await supabaseClient
                    .from('dossiers')
                    .delete()
                    .eq('user_id', uid)
                    .eq('firm_name', exactName);

                if (error) {
                    console.error("Dossier Supabase Delete Error:", error);
                    await supabaseClient
                        .from('dossiers')
                        .delete()
                        .eq('user_id', uid)
                        .ilike('firm_name', exactName);
                }
            }
        } catch (err) {
            console.error("Remote dossier delete exception:", err);
        }
    }

    // 2. Remove in-memory
    if (db.dossiers) {
        delete db.dossiers[exactName];
    }
    db.targetFirms = Object.keys(db.dossiers || {});

    if (typeof currentDossierFirm !== 'undefined' && (currentDossierFirm === exactName || currentDossierFirm === firmName)) {
        currentDossierFirm = db.targetFirms[0] || "";
    }

    // 3. Clean up references in intelligence factors
    if (Array.isArray(db.factors)) {
        db.factors.forEach(f => {
            if (f.linkedFirm === exactName) f.linkedFirm = "";
            if (Array.isArray(f.linkedFirms)) {
                f.linkedFirms = f.linkedFirms.filter(name => name !== exactName);
            }
        });
    }

    saveToLocalCache();
    updateStatus("Synced", "green");

    // 4. Update views
    if (typeof renderDossierList === 'function') renderDossierList();
    if (typeof renderDossierView === 'function') renderDossierView();
    if (typeof updateNexusDropdowns === 'function') updateNexusDropdowns();
    if (typeof showToast === 'function') showToast(`Dossier "${exactName}" deleted.`, "info");

    return true;
};

// Aliases for compatibility with any legacy handlers
window.deleteDossier = window.deleteFirmDossier;
window.deleteFirm = window.deleteFirmDossier;
window.deleteDossierFirm = window.deleteFirmDossier;
window.deleteTargetFirm = window.deleteFirmDossier;

// 2. Cloud Save Engine with Automatic Deletion Reconciliation
async function saveDatabase() {
    updateStatus("Saving...", "yellow");
    saveToLocalCache();

    if (!supabaseClient || !window.currentUser) {
        updateStatus("Saved Locally", "yellow");
        return;
    }
    const uid = window.currentUser.id;

    try {
        // A. Commit Concepts with embedded subSrs, linkedPlaybook, documents, and summary in JSONB
        if (Array.isArray(db.concepts) && db.concepts.length > 0) {
            const conceptRows = db.concepts.map(c => {
                const srsPayload = c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false };
                srsPayload.subSrs = c.subSrs || srsPayload.subSrs || {};
                srsPayload.linkedPlaybook = c.linkedPlaybook || (c.srs && c.srs.linkedPlaybook) || null;
                srsPayload.documents = Array.isArray(c.documents) ? c.documents.slice(0, 5) : [];
                srsPayload.summary = c.summary || "";

                const r = {
                    user_id: uid,
                    title: c.title || "Untitled Concept",
                    category: c.category || "General",
                    sub_tag: c.subTag || "",
                    body: c.body || "",
                    advantages: c.advantages || "",
                    disadvantages: c.disadvantages || "",
                    when_to_use: c.whenToUse || "",
                    related_concepts: c.relatedConcepts || "",
                    typical_provisions: c.typicalProvisions || "",
                    common_use_cases: c.commonUseCases || "",
                    diagram: c.diagram || null,
                    srs: srsPayload
                };
                if (c.id) r.id = c.id;
                return r;
            });
            const { error: upsertErr } = await supabaseClient.from('concepts').upsert(conceptRows, { onConflict: 'user_id, title' });
            if (upsertErr) {
                console.error("Concepts Supabase Upsert Error:", upsertErr);
            }
        }

        // B. Reconcile & Purge Deleted Concepts from Supabase
        if (Array.isArray(db.concepts)) {
            const localTitles = new Set(db.concepts.map(c => (c.title || '').trim().toLowerCase()));
            const localIds = new Set(db.concepts.map(c => c.id).filter(Boolean));
            
            const { data: remoteConcepts } = await supabaseClient
                .from('concepts')
                .select('id, title')
                .eq('user_id', uid);

            if (remoteConcepts && remoteConcepts.length > 0) {
                const toRemove = remoteConcepts.filter(rc => {
                    const hasTitle = localTitles.has((rc.title || '').trim().toLowerCase());
                    const hasId = rc.id && localIds.has(rc.id);
                    return !hasTitle && !hasId;
                });

                if (toRemove.length > 0) {
                    const removeIds = toRemove.map(rc => rc.id).filter(Boolean);
                    const removeTitles = toRemove.map(rc => rc.title).filter(Boolean);

                    if (removeIds.length > 0) {
                        await supabaseClient.from('concepts').delete().in('id', removeIds);
                    }
                    if (removeTitles.length > 0) {
                        await supabaseClient.from('concepts').delete().eq('user_id', uid).in('title', removeTitles);
                    }
                }
            }
        }

        // C. Commit Intel (Factors) - Deduplicated Sync with Multiple Cross-Links Support
        if (Array.isArray(db.factors)) {
            const seenFactorKeys = new Set();
            const deduplicatedFactors = [];

            db.factors.forEach(f => {
                const fKey = `${(f.title || f.headline || '').trim().toLowerCase()}|${(f.summary || '').trim().toLowerCase()}|${(f.workspace || '').trim().toLowerCase()}`;
                if (!seenFactorKeys.has(fKey)) {
                    seenFactorKeys.add(fKey);
                    deduplicatedFactors.push(f);
                }
            });

            db.factors = deduplicatedFactors;

            await supabaseClient.from('factors').delete().eq('user_id', uid);
            if (db.factors.length > 0) {
                const factorRows = db.factors.map(f => {
                    const conceptStr = Array.isArray(f.linkedConcepts) && f.linkedConcepts.length > 0 
                        ? f.linkedConcepts.join(', ') 
                        : (f.linkedConcept || "");
                    const firmStr = Array.isArray(f.linkedFirms) && f.linkedFirms.length > 0 
                        ? f.linkedFirms.join(', ') 
                        : (f.linkedFirm || "");

                    return {
                        user_id: uid,
                        title: f.title || f.headline || "Untitled Factor",
                        summary: f.summary || "",
                        description: f.description || "",
                        implications: f.implications || "",
                        metric: f.metric || "",
                        pestle: f.pestle || "Economic",
                        region: f.region || "UK Focus",
                        workspace: f.workspace || "General Market",
                        linked_concept: conceptStr,
                        linked_firm: firmStr
                    };
                });
                await supabaseClient.from('factors').insert(factorRows);
            }
        }

        // D. Commit Dictionary
        if (Array.isArray(db.dictionary) && db.dictionary.length > 0) {
            const dictRows = db.dictionary.map(d => ({
                user_id: uid,
                term: d.term || "Untitled Term",
                category: d.category || "General",
                definition: d.definition || "",
                srs: d.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false }
            }));
            await supabaseClient.from('dictionary').upsert(dictRows, { onConflict: 'user_id, term' });
        }

        // E. Commit App Metadata
        await supabaseClient.from('app_metadata').upsert([
            { user_id: uid, key: 'workspaces', value: db.workspaces },
            { user_id: uid, key: 'conceptCategories', value: db.conceptCategories },
            { user_id: uid, key: 'dictCategories', value: db.dictCategories || ["General"] },
            { user_id: uid, key: 'macroMetrics', value: db.macroMetrics || {} }
        ], { onConflict: 'user_id, key' });

        // F. Commit Playbooks
        if (db.playbooks && typeof db.playbooks === 'object') {
            const playbookRows = Object.keys(db.playbooks).map(pbName => ({
                user_id: uid,
                name: pbName,
                nodes: db.playbooks[pbName].nodes || [],
                edges: db.playbooks[pbName].edges || [],
                stages: db.playbooks[pbName].stages || [],
                updated_at: new Date().toISOString()
            }));
            if (playbookRows.length > 0) {
                await supabaseClient.from('playbooks').upsert(playbookRows, { onConflict: 'user_id, name' });
            }
        }

        // G. Reconcile & Purge Deleted Dossiers from Supabase
        if (window.deletedDossierFirms && window.deletedDossierFirms.size > 0) {
            const firmsToDelete = Array.from(window.deletedDossierFirms);
            await supabaseClient.from('dossiers').delete().eq('user_id', uid).in('firm_name', firmsToDelete);
            window.deletedDossierFirms.clear();
        }

        if (db.dossiers && typeof db.dossiers === 'object') {
            const localFirms = Object.keys(db.dossiers);
            const { data: remoteDossiers } = await supabaseClient
                .from('dossiers')
                .select('firm_name')
                .eq('user_id', uid);

            if (remoteDossiers && remoteDossiers.length > 0) {
                const toRemove = remoteDossiers
                    .filter(rd => !localFirms.includes(rd.firm_name))
                    .map(rd => rd.firm_name);

                if (toRemove.length > 0) {
                    await supabaseClient.from('dossiers').delete().eq('user_id', uid).in('firm_name', toRemove);
                }
            }

            // Upsert current active firm
            if (typeof currentDossierFirm !== 'undefined' && currentDossierFirm && db.dossiers[currentDossierFirm]) {
                const f = db.dossiers[currentDossierFirm];
                await supabaseClient.from('dossiers').upsert({
                    user_id: uid,
                    firm_name: currentDossierFirm,
                    firm_type: f.firmType || f.type || "",
                    locations: f.locations || "",
                    culture: f.culture || "",
                    personal_why: f.personalWhy || "",
                    practice: f.practice || [],
                    clients: f.clients || [],
                    competencies: f.competencies || [],
                    schemes: f.schemes || [],
                    srs: f.srs || {},
                    applied: f.applied || false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, firm_name' });
            }
        }

        updateStatus("Synced", "green");
    } catch (err) {
        console.error("Supabase Save Error:", err);
        updateStatus("Save Failed", "red");
    }
}

function saveToLocalCache() {
    try {
        localStorage.setItem("LEGAL_NEXUS_DB", JSON.stringify(db));
    } catch (e) {
        console.warn("Local cache save failed:", e);
    }
}

function downloadLocalBackup() {
    if (typeof syncPlaybookToDb === 'function') {
        try { syncPlaybookToDb(); } catch(e){}
    }

    const exportPayload = {
        ...db,
        exportedAt: new Date().toISOString(),
        clientVersion: "2.1"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `legal_nexus_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof showToast === 'function') showToast("Backup JSON exported.", "success");
}

function openImportModal() {
    const modal = document.getElementById('backupModalContainer');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedBackupJsonString = e.target.result;
        const textarea = document.getElementById("backupTextarea");
        const btn = document.getElementById("importConfirmBtn");

        if (textarea) textarea.value = uploadedBackupJsonString.substring(0, 5000) + (uploadedBackupJsonString.length > 5000 ? "\n... [Full File Ready for Import]" : "");
        if (btn) btn.classList.remove("hidden");
    };
    reader.readAsText(file);
}

async function processImport() {
    const textarea = document.getElementById("backupTextarea");
    const rawContent = (uploadedBackupJsonString && uploadedBackupJsonString.trim()) ? uploadedBackupJsonString.trim() : (textarea ? textarea.value.trim() : "");

    if (!rawContent) {
        alert("Please select a valid JSON backup file first.");
        return;
    }

    if (!window.currentUser) {
        alert("Please sign in to import data into your personal account.");
        window.openAuthModal();
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (e) {
        console.error("JSON parse error:", e);
        alert("Invalid JSON format. Please ensure you selected the complete exported file.");
        return;
    }

    const btn = document.getElementById("importConfirmBtn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Uploading to Supabase...`;
    btn.disabled = true;
    const uid = window.currentUser.id;

    try {
        if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
            const rows = parsed.concepts.map(c => {
                const srsPayload = c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false };
                srsPayload.subSrs = c.subSrs || srsPayload.subSrs || {};
                srsPayload.linkedPlaybook = c.linkedPlaybook || (c.srs && c.srs.linkedPlaybook) || null;
                srsPayload.documents = Array.isArray(c.documents) ? c.documents.slice(0, 5) : [];
                srsPayload.summary = c.summary || "";

                return {
                    user_id: uid,
                    title: c.title || "Untitled Concept",
                    category: c.category || "General",
                    sub_tag: c.subTag || "",
                    body: c.body || "",
                    advantages: c.advantages || "",
                    disadvantages: c.disadvantages || "",
                    when_to_use: c.whenToUse || c.when_to_use || "",
                    related_concepts: c.relatedConcepts || c.related_concepts || "",
                    typical_provisions: c.typicalProvisions || c.typical_provisions || "",
                    common_use_cases: c.commonUseCases || c.common_use_cases || "",
                    diagram: c.diagram || null,
                    srs: srsPayload
                };
            });
            await supabaseClient.from('concepts').upsert(rows, { onConflict: 'user_id, title' });
        }

        if (Array.isArray(parsed.factors) && parsed.factors.length > 0) {
            await supabaseClient.from('factors').delete().eq('user_id', uid);
            const rows = parsed.factors.map(f => ({
                user_id: uid,
                title: f.title || f.headline || "Untitled Factor",
                summary: f.summary || "",
                description: f.description || "",
                implications: f.implications || "",
                metric: f.metric || "",
                pestle: f.pestle || "Economic",
                region: f.region || "UK Focus",
                workspace: f.workspace || "General Market",
                linked_concept: Array.isArray(f.linkedConcepts) ? f.linkedConcepts.join(', ') : (f.linkedConcept || ""),
                linked_firm: Array.isArray(f.linkedFirms) ? f.linkedFirms.join(', ') : (f.linkedFirm || "")
            }));
            await supabaseClient.from('factors').insert(rows);
        }

        if (Array.isArray(parsed.dictionary) && parsed.dictionary.length > 0) {
            const rows = parsed.dictionary.map(d => ({
                user_id: uid,
                term: d.term || "Untitled Term",
                category: d.category || "General",
                definition: d.definition || "",
                srs: d.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false }
            }));
            await supabaseClient.from('dictionary').upsert(rows, { onConflict: 'user_id, term' });
        }

        if (parsed.dossiers && typeof parsed.dossiers === 'object') {
            const keys = Object.keys(parsed.dossiers);
            if (keys.length > 0) {
                const rows = keys.map(k => {
                    const f = parsed.dossiers[k];
                    return {
                        user_id: uid,
                        firm_name: k,
                        firm_type: f.firmType || f.type || "",
                        locations: f.locations || "",
                        culture: f.culture || "",
                        personal_why: f.personalWhy || "",
                        practice: f.practice || [],
                        clients: f.clients || [],
                        competencies: f.competencies || [],
                        schemes: f.schemes || [],
                        srs: f.srs || {},
                        applied: f.applied || false,
                        updated_at: new Date().toISOString()
                    };
                });
                await supabaseClient.from('dossiers').upsert(rows, { onConflict: 'user_id, firm_name' });
            }
        }

        if (parsed.playbooks && typeof parsed.playbooks === 'object') {
            const pbKeys = Object.keys(parsed.playbooks);
            if (pbKeys.length > 0) {
                const rows = pbKeys.map(name => ({
                    user_id: uid,
                    name: name,
                    nodes: parsed.playbooks[name].nodes || [],
                    edges: parsed.playbooks[name].edges || [],
                    stages: parsed.playbooks[name].stages || [],
                    updated_at: new Date().toISOString()
                }));
                await supabaseClient.from('playbooks').upsert(rows, { onConflict: 'user_id, name' });
            }
        }

        await supabaseClient.from('app_metadata').upsert([
            { user_id: uid, key: 'workspaces', value: parsed.workspaces || ["General Market", "Interview Vault"] },
            { user_id: uid, key: 'conceptCategories', value: parsed.conceptCategories || ["Corporate / M&A", "Capital Markets"] },
            { user_id: uid, key: 'dictCategories', value: parsed.dictCategories || ["General"] },
            { user_id: uid, key: 'macroMetrics', value: parsed.macroMetrics || {} }
        ], { onConflict: 'user_id, key' });

        alert("Data successfully imported into your account!");
        const modal = document.getElementById('backupModalContainer');
        if (modal) modal.classList.add('hidden');
        uploadedBackupJsonString = "";
        await loadDatabase();

    } catch (err) {
        console.error("Migration error:", err);
        alert("Import Error: " + err.message);
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

function openManualBriefing() {
    if (typeof checkDailyBriefing === 'function') checkDailyBriefing(true);
}

function checkDailyBriefing(isManual = false) {
    if (!isManual) {
        const alreadyShown = sessionStorage.getItem("LN_BRIEFING_SHOWN_TODAY");
        if (alreadyShown === "true") return;
    }

    let briefingHTML = "";
    let hasAlerts = false;

    const now = new Date();
    now.setHours(0,0,0,0);
    const twoWeeks = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    
    let urgentFirms = [];
    for (const [firm, data] of Object.entries(db.dossiers || {})) {
        if (!data || data.applied) continue;

        if (data.schemes && data.schemes.length > 0) {
            data.schemes.forEach(s => {
                if (s && s.closeDate && !s.applied) {
                    const close = new Date(s.closeDate);
                    close.setHours(0,0,0,0);
                    const open = s.openDate ? new Date(s.openDate) : null;
                    if (open) open.setHours(0,0,0,0);
                    
                    const isRollingOpen = (s.rolling === "Rolling" && open && now >= open && now <= close);
                    
                    if (isRollingOpen || (close >= now && close <= twoWeeks)) {
                        const diff = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
                        urgentFirms.push({ firm, diff, scheme: s.schemeType, isRollingOpen });
                    }
                }
            });
        } 
    }
    
    urgentFirms = urgentFirms.filter((v,i,a)=>a.findIndex(v2=>(v2.firm===v.firm && v2.scheme===v.scheme))===i);
    
    if (urgentFirms.length > 0) {
        hasAlerts = true;
        briefingHTML += `<h4 class="font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-slate-700 pb-1 flex items-center gap-2"><span>🚨</span> Approaching Deadlines</h4><ul class="space-y-2 mb-6">`;
        urgentFirms.sort((a,b)=>a.diff-b.diff).forEach(f => {
            briefingHTML += `<li class="text-sm flex justify-between items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition" onclick="routeToFirm('${f.firm.replace(/'/g, "\\'")}'); document.getElementById('dailyBriefingModal').classList.add('hidden');">
                <span class="truncate pr-2 dark:text-slate-200"><strong>${f.firm}</strong> <span class="text-gray-500 dark:text-slate-400">(${f.scheme || 'Application'})</span></span> 
                <span class="text-red-600 dark:text-red-400 font-bold shrink-0">${f.isRollingOpen ? 'Rolling (Act Now!)' : (f.diff === 0 ? 'Today!' : f.diff + ' Days')}</span>
            </li>`;
        });
        briefingHTML += `</ul>`;
    }
  
    const dueConcepts = (db.concepts || []).filter(c => c && c.srs && c.srs.nextReview <= Date.now());
    const dueDictTerms = (db.dictionary || []).filter(d => d && d.srs && d.srs.nextReview <= Date.now());
    const totalDue = dueConcepts.length + dueDictTerms.length;

    if (totalDue > 0) {
        hasAlerts = true;
        briefingHTML += `<h4 class="font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-slate-700 pb-1 flex items-center gap-2"><span>🧠</span> Spaced Repetition Due</h4><div class="flex flex-col gap-3">`;

        if (dueConcepts.length > 0) {
            briefingHTML += `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg shadow-sm">
                <p class="text-sm text-blue-900 dark:text-blue-200 mb-2">You have <strong>${dueConcepts.length}</strong> core concepts due for memory review.</p>
                <button onclick="switchState('CONCEPTS'); document.getElementById('dailyBriefingModal').classList.add('hidden'); setTimeout(() => openFlashcardDashboard('concepts'), 300);" class="text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold px-3 py-2 rounded transition shadow-md w-full">Review Concepts</button>
            </div>`;
        }

        if (dueDictTerms.length > 0) {
            briefingHTML += `<div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3 rounded-lg shadow-sm">
                <p class="text-sm text-purple-900 dark:text-purple-200 mb-2">You have <strong>${dueDictTerms.length}</strong> dictionary terms due for memory review.</p>
                <button onclick="switchState('DICTIONARY'); document.getElementById('dailyBriefingModal').classList.add('hidden'); setTimeout(() => openFlashcardDashboard('dictionary'), 300);" class="text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-bold px-3 py-2 rounded transition shadow-md w-full">Review Dictionary</button>
            </div>`;
        }

        briefingHTML += `</div>`;
    }
  
    if (!hasAlerts && isManual) {
        briefingHTML = `
            <div class="text-center py-6">
                <span class="text-3xl mb-2 block">✅</span>
                <h4 class="font-bold text-gray-800 dark:text-slate-200 text-base">All Caught Up!</h4>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">No deadlines approaching in the next 14 days and no concepts currently due for review.</p>
            </div>
        `;
    }
  
    if (hasAlerts || isManual) {
        sessionStorage.setItem("LN_BRIEFING_SHOWN_TODAY", "true");
        document.getElementById('briefingContent').innerHTML = briefingHTML;
        document.getElementById('dailyBriefingModal').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthSession();
});