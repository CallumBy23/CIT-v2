// DASHBOARD & COMMAND CENTER LOGIC
// ==========================================

window.renderDashboard = function() {
    const grid = document.getElementById("dashboardGrid");
    if (!grid) return;

    // --- 1. DATA AGGREGATION ---
    const now = new Date().getTime();
    const today = new Date();
    today.setHours(0,0,0,0);
    const twoWeeksTime = today.getTime() + (14 * 24 * 60 * 60 * 1000);

    // Core Counts
    const conceptCount = (db.concepts || []).filter(c => c.category !== "Interview Vault").length;
    const firmCount = (db.targetFirms || []).length;
    
    // Calculate Imminent Deadlines (Live Alerts)
    let alertsCount = 0;
    for (const [firm, data] of Object.entries(db.dossiers || {})) {
        if (data.applied) continue;
        (data.schemes || []).forEach(s => {
            if (s.closeDate && !s.applied) {
                const closeDate = new Date(s.closeDate).getTime();
                const isRollingOpen = (s.rolling === "Rolling" && s.openDate && new Date(s.openDate).getTime() <= today.getTime() && closeDate >= today.getTime());
                if (isRollingOpen || (closeDate >= today.getTime() && closeDate <= twoWeeksTime)) {
                    alertsCount++;
                }
            }
        });
    }

    // Calculate SRS Reviews Due
    const conceptsDue = (db.concepts || []).filter(c => c.srs && c.srs.nextReview <= now && c.category !== "Interview Vault").length;
    const dictDue = (db.dictionary || []).filter(d => d.srs && d.srs.nextReview <= now).length;
    const totalReviewsDue = conceptsDue + dictDue;

    // Calculate Mastery Percentage
    let totalSrsItems = 0;
    let masteredSrsItems = 0;
    (db.concepts || []).forEach(c => {
        if(c.category !== "Interview Vault") {
            totalSrsItems++;
            if(c.srs && (c.srs.mastered || c.srs.interval >= 21)) masteredSrsItems++;
        }
    });
    const masteryPct = totalSrsItems === 0 ? 0 : Math.round((masteredSrsItems / totalSrsItems) * 100);

    // Get Recent Intel Activity (Last 5)
    let recentIntel = [...(db.factors || [])]
        .filter(f => f.workspace !== "Interview Vault")
        .reverse()
        .slice(0, 5);

    // Macro Metrics Safeload
    const m = db.macroMetrics || {};
    const metrics = [
        { label: 'BoE Base Rate', sub: 'Debt Finance & LBOs', val: m.metricBoE || '--', color: 'text-indigo-600 dark:text-indigo-400', spark: 'stroke-indigo-500' },
        { label: 'US Fed Funds', sub: 'Global Capital Markets', val: m.metricFed || '--', color: 'text-emerald-600 dark:text-emerald-400', spark: 'stroke-emerald-500' },
        { label: 'GBP / USD', sub: 'Inbound M&A', val: m.metricGBP || '--', color: 'text-blue-600 dark:text-blue-400', spark: 'stroke-blue-500' },
        { label: 'UK 10Y Gilt', sub: 'Bond Pricing & Pensions', val: m.metricGilt || '--', color: 'text-purple-600 dark:text-purple-400', spark: 'stroke-purple-500' },
        { label: 'UK CPI (YoY)', sub: 'Contract Indexation', val: m.metricCPI || '--', color: 'text-orange-600 dark:text-orange-400', spark: 'stroke-orange-500' },
        { label: 'Brent Crude', sub: 'Energy & Projects', val: m.metricOil || '--', color: 'text-rose-600 dark:text-rose-400', spark: 'stroke-rose-500' }
    ];

    // Decorative Sparkline Generator (Visual proxy for trend)
    const renderSparkline = (colorClass) => {
        const pts = Array.from({length: 8}, (_, i) => `${i * 12},${10 + Math.random() * 15}`).join(' ');
        return `<svg viewBox="0 0 100 30" class="w-full h-8 ${colorClass} fill-none mt-2 opacity-70" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts}"></polyline></svg>`;
    };

    // Mastery Donut Math
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPct / 100) * circumference;


    // --- 2. RENDER HTML SHELL ---
    let html = `
        <!-- ROW 1: QUICK STATS -->
        <div class="col-span-1 lg:col-span-3 xl:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col hover:border-indigo-400 transition-colors">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"><i data-lucide="book-open" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Concepts</span>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">${conceptCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Tracked in Library</p>
            </div>
            
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col hover:border-indigo-400 transition-colors">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><i data-lucide="building-2" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dossiers</span>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">${firmCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Target Firms Mapped</p>
            </div>

            <div class="bg-white dark:bg-[#0f172a] border ${alertsCount > 0 ? 'border-red-200 dark:border-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-slate-200 dark:border-slate-800'} rounded-lg p-5 shadow-sm flex flex-col hover:border-indigo-400 transition-colors cursor-pointer" onclick="openManualBriefing()">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-md ${alertsCount > 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center"><i data-lucide="bell" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deadlines</span>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">${alertsCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">${alertsCount > 0 ? 'Urgent Actions Required' : 'No imminent deadlines'}</p>
            </div>

            <div class="bg-white dark:bg-[#0f172a] border ${totalReviewsDue > 0 ? 'border-amber-200 dark:border-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-200 dark:border-slate-800'} rounded-lg p-5 shadow-sm flex flex-col hover:border-indigo-400 transition-colors cursor-pointer" onclick="openFlashcardDashboard('concepts')">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-md ${totalReviewsDue > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center"><i data-lucide="layers" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviews</span>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalReviewsDue}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Cards Due for Study</p>
            </div>
        </div>

        <!-- ROW 2: MARKET INDICATORS & MASTERY -->
        <div class="col-span-1 lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
            
            <!-- Indicators Grid -->
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="trending-up" class="w-5 h-5 text-indigo-500"></i> Market Intelligence</h2>
                        <p class="text-xs text-slate-500 mt-1">Real-time commercial intelligence and macro indicators.</p>
                    </div>
                    <button onclick="switchState('INTELLIGENCE')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-sm hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800">Customize</button>
                </div>
                
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    ${metrics.map(m => `
                        <div class="border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 flex flex-col shadow-inner">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">${m.label}</h4>
                                    <span class="text-[9px] font-medium text-slate-500">${m.sub}</span>
                                </div>
                                <span class="text-sm font-black ${m.color}">${m.val}</span>
                            </div>
                            ${renderSparkline(m.spark)}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h2 class="text-sm font-bold text-slate-900 dark:text-white">Recent Commercial Activity</h2>
                    <button onclick="switchState('INTELLIGENCE')" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition">View All &rarr;</button>
                </div>
                <div class="space-y-4">
                    ${recentIntel.length > 0 ? recentIntel.map(f => `
                        <div class="flex items-start gap-3 group cursor-pointer" onclick="switchState('INTELLIGENCE')">
                            <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition"><i data-lucide="zap" class="w-4 h-4"></i></div>
                            <div class="flex-1 min-w-0 border-b border-slate-50 dark:border-slate-800/50 pb-3 group-hover:border-indigo-200 transition">
                                <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${f.title || "Untitled Insight"}</h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">${f.pestle || 'General'}</span>
                                    <span class="text-[9px] text-slate-400">&bull;</span>
                                    <span class="text-[9px] font-medium text-slate-400 truncate">${f.workspace}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : `<p class="text-xs text-slate-500 italic">No recent intel logged.</p>`}
                </div>
            </div>
        </div>

        <!-- ROW 2: RIGHT SIDEBAR (Mastery & Actions) -->
        <div class="col-span-1 flex flex-col gap-6">
            
            <!-- Concept Mastery SVG Donut -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0b1120] dark:to-[#0f172a] rounded-lg p-6 shadow-lg border border-slate-700 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                <h2 class="text-sm font-bold text-white mb-6 flex items-center gap-2 relative z-10"><i data-lucide="target" class="w-4 h-4 text-emerald-400"></i> Concept Mastery</h2>
                
                <div class="flex justify-center items-center mb-6 relative z-10">
                    <div class="relative w-32 h-32 flex items-center justify-center">
                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                            <!-- Background Circle -->
                            <circle cx="40" cy="40" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="6"></circle>
                            <!-- Progress Circle -->
                            <circle cx="40" cy="40" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="6" 
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                                    stroke-linecap="round" class="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"></circle>
                        </svg>
                        <div class="absolute flex flex-col items-center">
                            <span class="text-3xl font-black text-white">${masteryPct}%</span>
                            <span class="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1">Mastered</span>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-3 relative z-10">
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span> Mastered</span>
                        <span class="text-white font-bold">${masteredSrsItems}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Learning</span>
                        <span class="text-white font-bold">${totalSrsItems - masteredSrsItems}</span>
                    </div>
                </div>
                
                <button onclick="openFlashcardDashboard('concepts')" class="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold py-2.5 rounded-sm transition backdrop-blur-sm relative z-10">Launch Review Session</button>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
                <div class="space-y-3">
                    <button onclick="openQuickAdd()" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-md text-sm transition shadow-sm hover:-translate-y-0.5">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Universal Record
                    </button>
                    <button onclick="switchState('DOSSIERS'); setTimeout(addDossierFirm, 100);" class="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold py-3 rounded-md text-sm transition shadow-sm">
                        <i data-lucide="building-2" class="w-4 h-4 text-slate-400"></i> Track New Firm
                    </button>
                    <button onclick="openManualBriefing()" class="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold py-3 rounded-md text-sm transition shadow-sm">
                        <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-400"></i> Generate Briefing
                    </button>
                </div>
            </div>

        </div>
    `;

    grid.innerHTML = html;
    
    // Trigger Lucide to render the newly injected icons
    if (window.lucide) window.lucide.createIcons();
};