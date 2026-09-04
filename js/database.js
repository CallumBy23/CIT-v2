// ==========================================
// SUPABASE MULTI-USER AUTH, DATA ENGINE & SYNC
// ==========================================

let uploadedBackupJsonString = "";
window.currentUser = null;
// ==========================================
// AUTHENTICATION STATE CONTROLLER
// ==========================================
window.authMode = 'login'; // 'login', 'signup', or 'forgot'

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

    if (banner) banner.classList.add("hidden");

    if (window.authMode === 'login') {
        title.innerText = "Welcome back";
        subtitle.innerText = "Please enter your details";
        pwdContainer.classList.remove("hidden");
        pwdInput.required = true;
        forgotRow.classList.remove("hidden");
        submitBtnText.innerText = "Sign in";
        togglePrompt.innerText = "Don't have an account?";
        toggleBtn.innerText = "Sign up";
    } else if (window.authMode === 'signup') {
        title.innerText = "Create account";
        subtitle.innerText = "Please enter your details";
        pwdContainer.classList.remove("hidden");
        pwdInput.required = true;
        forgotRow.classList.add("hidden");
        submitBtnText.innerText = "Sign up";
        togglePrompt.innerText = "Already have an account?";
        toggleBtn.innerText = "Sign in";
    } else if (window.authMode === 'forgot') {
        title.innerText = "Reset password";
        subtitle.innerText = "We'll send a password recovery link to your email";
        pwdContainer.classList.add("hidden");
        pwdInput.required = false;
        forgotRow.classList.add("hidden");
        submitBtnText.innerText = "Send reset link";
        togglePrompt.innerText = "Remember your password?";
        toggleBtn.innerText = "Sign in";
    }
};

window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const banner = document.getElementById("authErrorBanner");
    const btn = document.getElementById("btnAuthSubmit");

    banner.classList.add("hidden");
    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Please wait...`;

    try {
        if (window.authMode === 'login') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // Session persists in localStorage automatically
        } else if (window.authMode === 'signup') {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
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
        banner.className = "text-xs p-3 rounded-lg leading-relaxed font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900";
        banner.innerText = err.message || "Authentication error.";
        banner.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

window.logoutUser = async function() {
    if (confirm("Sign out of Legal Nexus on this device?")) {
        await supabaseClient.auth.signOut();
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

// --- AUTHENTICATION & DEVICE SESSION ENGINE ---
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
            updateUserUI(session.user.email);
            await loadDatabase();
        } else {
            // No saved session found on this device -> show login modal
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

    // Auto-listen for session changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            window.currentUser = session.user;
            window.closeAuthModal();
            updateUserUI(session.user.email);
            await loadDatabase();
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            window.openAuthModal();
        }
    });
}

function updateUserUI(email) {
    const display = document.getElementById("userEmailDisplay");
    const avatar = document.getElementById("userAvatar");
    if (display && email) {
        const name = email.split('@')[0];
        display.innerText = name.charAt(0).toUpperCase() + name.slice(1);
        if (avatar) avatar.innerText = name.slice(0, 2).toUpperCase();
    }
}

window.openAuthModal = function() {
    const m = document.getElementById("authModal");
    if (m) { m.classList.remove("hidden"); m.classList.add("flex"); }
};

window.closeAuthModal = function() {
    const m = document.getElementById("authModal");
    if (m) { m.classList.add("hidden"); m.classList.remove("flex"); }
};

window.toggleAuthMode = function() {
    window.authMode = window.authMode === 'login' ? 'signup' : 'login';
    const isLogin = window.authMode === 'login';

    document.getElementById("authModalTitle").innerText = isLogin ? "Welcome to Legal Nexus" : "Create Account";
    document.getElementById("authModalSubtitle").innerText = isLogin 
        ? "Sign in to sync your personal intelligence and KMS workspace." 
        : "Your workspace will be securely encrypted and synced to this account.";
    document.getElementById("btnAuthText").innerText = isLogin ? "Sign In" : "Register Account";
    document.getElementById("btnAuthToggle").innerHTML = isLogin 
        ? "Don't have an account? <span class='underline'>Create one</span>" 
        : "Already registered? <span class='underline'>Sign In</span>";
    document.getElementById("authErrorBanner").classList.add("hidden");
};

window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errorBanner = document.getElementById("authErrorBanner");
    const btn = document.getElementById("btnAuthSubmit");

    errorBanner.classList.add("hidden");
    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Authenticating...`;

    try {
        if (window.authMode === 'login') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user && !data.session) {
                alert("Account created! You can now sign in.");
                window.toggleAuthMode();
            }
        }
    } catch (err) {
        errorBanner.innerText = err.message || "Authentication failed.";
        errorBanner.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

window.logoutUser = async function() {
    if (confirm("Log out of this device?")) {
        await supabaseClient.auth.signOut();
        location.reload();
    }
};

// 1. Data Fetch Engine
async function loadDatabase() {
    updateStatus("Syncing...", "yellow");

    // Fast-boot from local cache
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

        if (cErr) console.error("Concepts Table Error:", cErr);
        if (fErr) console.error("Factors Table Error:", fErr);
        if (dErr) console.error("Dictionary Table Error:", dErr);
        if (dosErr) console.error("Dossiers Table Error:", dosErr);
        if (pErr) console.error("Playbooks Table Error:", pErr);
        if (mErr) console.error("Metadata Table Error:", mErr);

        if (cErr || fErr || dErr || dosErr || pErr || mErr) {
            throw new Error("Supabase returned an error during table fetch.");
        }

        if (concepts && concepts.length > 0) {
            db.concepts = concepts.map(c => ({
                id: c.id,
                title: c.title,
                category: c.category || "General",
                subTag: c.sub_tag || "",
                body: c.body || "",
                diagram: c.diagram || null,
                srs: c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false }
            }));
        }

        if (factors && factors.length > 0) {
            db.factors = factors.map(f => ({
                id: f.id,
                title: f.title,
                summary: f.summary || "",
                description: f.description || "",
                implications: f.implications || "",
                metric: f.metric || "",
                pestle: f.pestle || "Economic",
                region: f.region || "UK Focus",
                workspace: f.workspace || "General Market",
                linkedConcept: f.linked_concept || "",
                linkedFirm: f.linked_firm || ""
            }));
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
            playbooksList.forEach(p => {
                db.playbooks[p.name] = {
                    nodes: p.nodes || [],
                    edges: p.edges || [],
                    stages: p.stages || []
                };
            });
        }

        (metadata || []).forEach(m => {
            if (m.key === 'workspaces' && Array.isArray(m.value)) db.workspaces = m.value;
            if (m.key === 'conceptCategories' && Array.isArray(m.value)) db.conceptCategories = m.value;
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
}

// 2. Cloud Save Engine
async function saveDatabase() {
    updateStatus("Saving...", "yellow");
    saveToLocalCache();

    if (!supabaseClient || !window.currentUser) return;
    const uid = window.currentUser.id;

    try {
        await supabaseClient.from('app_metadata').upsert([
            { user_id: uid, key: 'workspaces', value: db.workspaces },
            { user_id: uid, key: 'conceptCategories', value: db.conceptCategories },
            { user_id: uid, key: 'dictCategories', value: db.dictCategories || ["General"] },
            { user_id: uid, key: 'macroMetrics', value: db.macroMetrics || {} }
        ], { onConflict: 'user_id, key' });

        if (typeof currentPlaybook !== 'undefined' && currentPlaybook && db.playbooks[currentPlaybook]) {
            const pb = db.playbooks[currentPlaybook];
            await supabaseClient.from('playbooks').upsert({
                user_id: uid,
                name: currentPlaybook,
                nodes: pb.nodes || [],
                edges: pb.edges || [],
                stages: pb.stages || [],
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, name' });
        }

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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
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

// 3. User-Scoped Lossless Importer
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
        // A. Import Concepts
        if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
            const rows = parsed.concepts.map(c => ({
                user_id: uid,
                title: c.title || "Untitled Concept",
                category: c.category || "General",
                sub_tag: c.subTag || "",
                body: c.body || "",
                diagram: c.diagram || null,
                srs: c.srs || { interval: 0, nextReview: 0, lastRating: "forgot", mastered: false }
            }));
            await supabaseClient.from('concepts').upsert(rows, { onConflict: 'user_id, title' });
        }

        // B. Import Factors (Market Intel)
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
                linked_concept: f.linkedConcept || "",
                linked_firm: f.linkedFirm || ""
            }));
            await supabaseClient.from('factors').insert(rows);
        }

        // C. Import Dictionary
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

        // D. Import Dossiers
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

        // E. Import Playbooks
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

        // F. Metadata
        await supabaseClient.from('app_metadata').upsert([
            { user_id: uid, key: 'workspaces', value: parsed.workspaces || ["General Market", "Interview Vault"] },
            { user_id: uid, key: 'conceptCategories', value: parsed.conceptCategories || ["Corporate / M&A", "Capital Markets"] },
            { key: 'dictCategories', value: parsed.dictCategories || ["General"], user_id: uid },
            { key: 'macroMetrics', value: parsed.macroMetrics || {}, user_id: uid }
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
        document.getElementById('briefingContent').innerHTML = briefingHTML;
        document.getElementById('dailyBriefingModal').classList.remove('hidden');
    }
}

// Boot with Session Check
document.addEventListener('DOMContentLoaded', () => {
    initAuthSession();
});