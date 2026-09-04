// ==========================================
// SETTINGS MODULE CONTROLLER
// ==========================================

window.isEditingProfile = false;

window.toggleEditProfile = function() {
    window.isEditingProfile = !window.isEditingProfile;
    const form = document.getElementById("profileEditForm");
    const btn = document.getElementById("btnToggleEditProfile");
    
    if (form) {
        if (window.isEditingProfile) {
            form.classList.remove("hidden");
            const nameInput = document.getElementById("settingsFullName");
            if (nameInput) setTimeout(() => nameInput.focus(), 50);
            if (btn) btn.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5"></i> Cancel`;
        } else {
            form.classList.add("hidden");
            if (btn) btn.innerHTML = `<i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Profile`;
        }
        if (window.lucide) window.lucide.createIcons();
    }
};

window.renderSettingsView = function() {
    const container = document.getElementById("appSettings");
    if (!container) return;

    const user = window.currentUser;
    const meta = (user && user.user_metadata) ? user.user_metadata : {};
    const localProfile = JSON.parse(localStorage.getItem("LEGAL_NEXUS_USER_PROFILE") || "{}");
    
    const email = (user && user.email) ? user.email : "Local Offline Session";
    const fullName = (meta.full_name || localProfile.full_name || (email.includes('@') ? email.split('@')[0] : "Candidate")).trim();
    
    // Extract first name only
    const firstName = fullName.split(/\s+/)[0] || "Candidate";
    
    const rawUsername = (meta.username || localProfile.username || (email.includes('@') ? email.split('@')[0] : "guest")).trim();
    const username = `@${rawUsername.replace(/^@/, '')}`;
    
    const initials = firstName.substring(0, 2).toUpperCase() || "LN";

    const memberDate = (user && user.created_at)
        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    container.innerHTML = `
      <div class="max-w-4xl mx-auto w-full space-y-6">
        
        <!-- Header -->
        <div class="border-b border-slate-200 dark:border-slate-800 pb-4 mb-2 flex justify-between items-end">
          <div>
            <h1 class="text-3xl font-serif font-black text-slate-900 dark:text-white">System Settings</h1>
            <p class="text-xs text-slate-500 mt-1">Manage user identity, appearance presets, and database backups.</p>
          </div>
        </div>

        <!-- 1. Identity & Profile Management -->
        <div class="glass-card rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          
          <!-- Summary Header Row -->
          <div class="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-indigo-600 text-white font-serif font-black text-xl flex items-center justify-center shadow-md shrink-0">
                ${initials}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- First name strictly displayed here -->
                  <h3 class="text-base font-bold text-slate-900 dark:text-white">${firstName}</h3>
                  <span class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">${username}</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5 truncate">${email}</p>
                <p class="text-[10px] text-slate-400 mt-1">Member since ${memberDate}</p>
              </div>
            </div>

            <!-- Action Buttons: Edit Profile next to Sign Out -->
            <div class="flex items-center gap-2 shrink-0">
              <button id="btnToggleEditProfile" onclick="window.toggleEditProfile()" class="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 shadow-sm transition">
                <i data-lucide="${window.isEditingProfile ? 'x' : 'edit-3'}" class="w-3.5 h-3.5"></i> ${window.isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
              <button onclick="window.logoutUser()" class="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold px-3.5 py-2.5 rounded-lg text-xs border border-rose-200 dark:border-rose-900 shadow-sm transition">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Sign Out
              </button>
            </div>
          </div>

          <!-- Edit Profile Form (Hidden by default, reveals when Edit Profile is clicked) -->
          <form id="profileEditForm" onsubmit="window.updateUserProfile(event)" class="${window.isEditingProfile ? '' : 'hidden'} p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Edit Credentials</h4>
              <p class="text-[11px] text-slate-500">Update how your name and username handle display across the application.</p>
            </div>

            <div id="profileSaveBanner" class="hidden"></div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" id="settingsFullName" value="${fullName}" required class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner">
                <span class="text-[10px] text-slate-400 mt-1 block">Your first name is automatically used on the dashboard and sidebar.</span>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Username</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold">@</span>
                  <input type="text" id="settingsUsername" value="${rawUsername.replace(/^@/, '')}" required class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner">
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="window.toggleEditProfile()" class="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
              <button type="submit" id="btnSaveProfile" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-sm">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Save Changes
              </button>
            </div>
          </form>

        </div>

        <!-- 2. Interface Appearance & Surface Contrasts -->
        <div class="glass-card rounded-xl p-6 space-y-6">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="palette" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i> Theme & Surface Contrast
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Adjust workspace contrast and reading tones for intensive drafting and revision sessions.</p>
          </div>

          <!-- Background Contrast Modes -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Reading Modes</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onclick="setBaseTheme('slate')" class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition bg-[#f8f9fb] text-slate-800">
                <div class="font-bold text-xs">Cool Slate</div>
                <div class="text-[10px] text-slate-500 mt-0.5">High clarity contrast</div>
              </button>
              <button onclick="setBaseTheme('warm')" class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition bg-[#f6f5f0] text-stone-900">
                <div class="font-bold text-xs">Warm Paper</div>
                <div class="text-[10px] text-stone-500 mt-0.5">Gentle reading tone</div>
              </button>
              <button onclick="setBaseTheme('dark-balanced')" class="p-3.5 rounded-lg border border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition bg-[#131722] text-slate-200">
                <div class="font-bold text-xs text-slate-100">Midnight Slate</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Deep OLED night mode</div>
              </button>
            </div>
          </div>

          <!-- Primary Accent Picker -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200">Primary Accent</p>
              <p class="text-[11px] text-slate-500">Applies across active buttons, badges, and progress indicators.</p>
            </div>
            <div class="flex items-center gap-2.5">
              <button type="button" onclick="setAccentColor('#2563eb', '#1d4ed8')" class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent focus:ring-blue-500 transition shadow-sm" style="background-color: #2563eb;"></button>
              <button type="button" onclick="setAccentColor('#4f46e5', '#4338ca')" class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent focus:ring-indigo-500 transition shadow-sm" style="background-color: #4f46e5;"></button>
              <button type="button" onclick="setAccentColor('#0d9488', '#0f766e')" class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent focus:ring-teal-500 transition shadow-sm" style="background-color: #0d9488;"></button>
              <button type="button" onclick="setAccentColor('#059669', '#047857')" class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent focus:ring-emerald-500 transition shadow-sm" style="background-color: #059669;"></button>
              <button type="button" onclick="setAccentColor('#e11d48', '#be123c')" class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent focus:ring-rose-500 transition shadow-sm" style="background-color: #e11d48;"></button>
              <div class="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                <input type="color" id="customColorPicker" class="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" onchange="setAccentColor(this.value, this.value)">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Custom</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Local Data & Database Operations -->
        <div class="glass-card rounded-xl p-6 space-y-4">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="database" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i> Workspace Data & Backup
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Export full JSON backups of all intelligence, dossiers, flashcards, and playbooks.</p>
          </div>

          <div class="flex flex-wrap gap-3 pt-2">
            <button onclick="downloadLocalBackup()" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition shadow-sm">
              <i data-lucide="download" class="w-4 h-4"></i> Export JSON Backup
            </button>
            <button onclick="openImportModal()" class="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow-sm">
              <i data-lucide="upload" class="w-4 h-4"></i> Restore from JSON
            </button>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
};