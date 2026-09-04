// DASHBOARD & COMMAND CENTER LOGIC
// ==========================================

// Legacy Bridge: Catch old 'assess' calls and map them to the new engine
window.assess = function(rating) {
    if (typeof window.processFlashcardResult === 'function') {
        window.processFlashcardResult(rating);
    } else {
        console.error("Flashcard engine not loaded yet.");
    }
};

// 1. Initialize from LocalStorage to remember the timeframe
window.currentMacroPeriod = localStorage.getItem('LEGAL_NEXUS_MACRO_PERIOD') || '180';

window.updateMacroPeriod = function(val) {
    window.currentMacroPeriod = val;
    localStorage.setItem('LEGAL_NEXUS_MACRO_PERIOD', val);
    if(typeof window.renderDashboard === 'function') window.renderDashboard();
};

window.renderDashboard = function() {
    const grid = document.getElementById("dashboardGrid");
    if (!grid) return;

    // Async Database Guard to prevent rendering crashes
    if (typeof db === 'undefined' || !db) {
        console.warn("Database not initialized. Retrying dashboard render...");
        setTimeout(window.renderDashboard, 200);
        return;
    }

    // --- Dynamic Welcome Title Sync ---
    const welcomeTitle = document.getElementById("dashboardWelcomeTitle");
    if (welcomeTitle) {
        let firstName = "Candidate";
        if (window.currentUser) {
            const meta = window.currentUser.user_metadata || {};
            if (meta.full_name) {
                firstName = meta.full_name.trim().split(/\s+/)[0];
            } else if (window.currentUser.email) {
                const part = window.currentUser.email.split('@')[0];
                firstName = part.charAt(0).toUpperCase() + part.slice(1);
            }
        }
        welcomeTitle.innerText = `Welcome back, ${firstName}`;
    }

    // --- 1. DATA AGGREGATION ---
    const nowMs = new Date().getTime();
    const today = new Date();
    today.setHours(0,0,0,0);
    const twoWeeksTime = today.getTime() + (14 * 24 * 60 * 60 * 1000);
    const dayMs = 24 * 60 * 60 * 1000;

    // Core Counts
    const conceptCount = (db.concepts || []).length;
    const firmCount = (db.targetFirms || []).length;
    
    // Calculate Imminent Deadlines (Timezone-Proof)
    let alertsCount = 0;
    for (const [firm, data] of Object.entries(db.dossiers || {})) {
        if (data.applied) continue;
        (data.schemes || []).forEach(s => {
            if (s.closeDate && !s.applied) {
                let closeDateMs;
                if (s.closeDate.includes('-')) {
                    const cParts = s.closeDate.split('-');
                    closeDateMs = new Date(parseInt(cParts[0], 10), parseInt(cParts[1], 10) - 1, parseInt(cParts[2], 10)).getTime();
                } else {
                    closeDateMs = new Date(s.closeDate).getTime();
                }

                let isRollingOpen = false;
                if (s.rolling === "Rolling" && s.openDate) {
                    let openDateMs;
                    if (s.openDate.includes('-')) {
                        const oParts = s.openDate.split('-');
                        openDateMs = new Date(parseInt(oParts[0], 10), parseInt(oParts[1], 10) - 1, parseInt(oParts[2], 10)).getTime();
                    } else {
                        openDateMs = new Date(s.openDate).getTime();
                    }
                    if (openDateMs <= today.getTime() && closeDateMs >= today.getTime()) {
                        isRollingOpen = true;
                    }
                }

                if (isRollingOpen || (closeDateMs >= today.getTime() && closeDateMs <= twoWeeksTime)) {
                    alertsCount++;
                }
            }
        });
    }

    // Update Global Notification Bell Icon in Header
    const topBellBadge = document.querySelector('button[title="View Briefing"] span');
    if (topBellBadge) {
        if (alertsCount > 0) {
            topBellBadge.className = "absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0f172a] animate-pulse shadow-sm";
            topBellBadge.classList.remove('hidden');
        } else {
            topBellBadge.classList.add('hidden');
        }
    }

    // Calculate SRS Reviews Due
    const conceptsDue = (db.concepts || []).filter(c => c.srs && c.srs.nextReview <= nowMs).length;
    const dictDue = (db.dictionary || []).filter(d => d.srs && d.srs.nextReview <= nowMs).length;
    const totalReviewsDue = conceptsDue + dictDue;

    // Calculate CONCEPT Mastery Percentage
    let totalSrsItems = 0;
    let masteredSrsItems = 0;
    (db.concepts || []).forEach(c => {
        totalSrsItems++;
        if(c.srs && (c.srs.mastered || c.srs.interval >= 21)) masteredSrsItems++;
    });
    const masteryPct = totalSrsItems === 0 ? 0 : Math.round((masteredSrsItems / totalSrsItems) * 100);

    // Calculate DICTIONARY Mastery Percentage
    let dictTotalSrsItems = 0;
    let dictMasteredSrsItems = 0;
    (db.dictionary || []).forEach(d => {
        dictTotalSrsItems++;
        if(d.srs && (d.srs.mastered || d.srs.interval >= 21)) dictMasteredSrsItems++;
    });
    const dictMasteryPct = dictTotalSrsItems === 0 ? 0 : Math.round((dictMasteredSrsItems / dictTotalSrsItems) * 100);

    // Get Recent Intel Activity
    let recentIntel = [...(db.factors || [])]
        .reverse()
        .slice(0, 6);

    // Macro Metrics Safeload & Historical Fallbacks
    const m = db.macroMetrics || {};
    m.history = m.history || {};

    const formatPct = (val) => {
        if (!val || val === '--') return '--';
        let str = String(val).trim();
        return str.endsWith('%') ? str : str + '%';
    };

    const metrics = [
        { key: 'metricBoE', label: 'BoE Base Rate', sub: 'Debt Finance & LBOs', val: formatPct(m.metricBoE), color: 'text-indigo-600 dark:text-indigo-400', spark: 'stroke-indigo-500' },
        { key: 'metricFed', label: 'US Fed Funds', sub: 'Global Capital Markets', val: formatPct(m.metricFed), color: 'text-emerald-600 dark:text-emerald-400', spark: 'stroke-emerald-500' },
        { key: 'metricGBP', label: 'GBP / USD', sub: 'Inbound M&A', val: m.metricGBP || '--', color: 'text-blue-600 dark:text-blue-400', spark: 'stroke-blue-500' },
        { key: 'metricGilt', label: 'UK 10Y Gilt', sub: 'Bond Pricing & Pensions', val: formatPct(m.metricGilt), color: 'text-purple-600 dark:text-purple-400', spark: 'stroke-purple-500' },
        { key: 'metricCPI', label: 'UK CPI (YoY)', sub: 'Contract Indexation', val: formatPct(m.metricCPI), color: 'text-amber-600 dark:text-amber-400', spark: 'stroke-amber-500' },
        { key: 'metricOil', label: 'Brent Crude', sub: 'Energy & Projects', val: m.metricOil || '--', color: 'text-rose-600 dark:text-rose-400', spark: 'stroke-rose-500' }
    ];

    const genMockHistory = (arr) => arr.map((v, i) => ({ d: nowMs - ((arr.length - 1 - i) * 30 * dayMs), v: v }));
    const fallbacks = {
        metricBoE: genMockHistory([4.00, 4.25, 4.50, 4.75, 5.00, 5.25, 5.25, 5.00, 4.75]),
        metricFed: genMockHistory([3.75, 4.00, 4.50, 4.75, 5.25, 5.50, 5.50, 5.00, 4.75]),
        metricGBP: genMockHistory([1.21, 1.24, 1.26, 1.25, 1.28, 1.30, 1.32, 1.31, 1.34]),
        metricGilt: genMockHistory([3.80, 4.10, 4.40, 4.35, 4.60, 4.90, 4.85, 4.70, 4.65]),
        metricCPI: genMockHistory([6.8, 4.6, 4.0, 3.4, 3.2, 2.3, 2.0, 2.2, 2.6]),
        metricOil: genMockHistory([72.5, 78.5, 82.0, 84.5, 79.0, 75.2, 80.4, 88.1, 85.55])
    };

    // --- REAL DATA-DRIVEN SPARKLINE ENGINE WITH CRISP RETINA VECTOR POLYLINES ---
    const renderSparkline = (metricKey, colorClass) => {
        let rawData = m.history[metricKey] || fallbacks[metricKey];
        if (!Array.isArray(rawData)) rawData = fallbacks[metricKey];

        let dataPoints = [...rawData];
        if (window.currentMacroPeriod !== 'all') {
            const cutoffMs = nowMs - (parseInt(window.currentMacroPeriod) * dayMs);
            dataPoints = dataPoints.filter(pt => pt.d >= cutoffMs);
        }

        if (dataPoints.length < 2) dataPoints = rawData.slice(-2);

        if (dataPoints.length > 90) {
            const step = Math.ceil(dataPoints.length / 60); 
            dataPoints = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1);
        }

        const vals = dataPoints.map(pt => pt.v);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const range = max - min === 0 ? 1 : max - min;
        
        const formatAxisDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const formatHoverDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        const startLabel = formatAxisDate(dataPoints[0].d);
        const endLabel = formatAxisDate(dataPoints[dataPoints.length-1].d);

        const width = 100;
        const height = 32;
        const padding = 3;

        const points = vals.map((val, idx) => {
            const x = (idx / (vals.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = (height - padding) - (normalizedY * (height - 2 * padding));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        const hoverOverlays = dataPoints.map((pt) => {
            return `
                <div class="flex-1 h-full group/point relative">
                    <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/point:opacity-100 bg-slate-900/90 dark:bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none transition-opacity z-50 whitespace-nowrap backdrop-blur-sm">
                        ${formatHoverDate(pt.d)}: <span class="${colorClass.replace('stroke-', 'text-')}">${pt.v}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="flex flex-col mt-4">
                <div class="flex items-stretch gap-2 h-11">
                    <div class="flex flex-col justify-between text-[9px] text-slate-400 font-mono font-medium leading-none py-0.5 w-6 text-right shrink-0">
                        <span>${max.toFixed(1)}</span>
                        <span>${min.toFixed(1)}</span>
                    </div>
                    <div class="flex-1 relative w-full h-full border-l border-b border-slate-200/80 dark:border-slate-800 pl-1 pb-1">
                        <div class="absolute inset-0 ml-1 mb-1">
                            <svg viewBox="0 0 100 32" class="absolute inset-0 w-full h-full ${colorClass} fill-none" preserveAspectRatio="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="${points}"></polyline>
                            </svg>
                            <div class="absolute inset-0 flex">${hoverOverlays}</div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-between text-[9px] text-slate-400 font-mono font-medium ml-8 mt-1.5">
                    <span>${startLabel}</span>
                    <span>${endLabel}</span>
                </div>
            </div>
        `;
    };

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPct / 100) * circumference;
    const dictStrokeDashoffset = circumference - (dictMasteryPct / 100) * circumference;

    let html = `
        <!-- ROW 1: ELEVATED KPI STATS -->
        <div class="col-span-1 lg:col-span-3 xl:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div class="glass-card rounded-xl p-5 flex flex-col cursor-pointer" onclick="window.switchState('CONCEPTS')">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><i data-lucide="book-open" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Concepts</span>
                </div>
                <h3 class="text-3xl font-serif font-black text-slate-900 dark:text-white mt-1">${conceptCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Tracked in Library</p>
            </div>
            
            <div class="glass-card rounded-xl p-5 flex flex-col cursor-pointer" onclick="window.switchState('DOSSIERS')">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><i data-lucide="building-2" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Dossiers</span>
                </div>
                <h3 class="text-3xl font-serif font-black text-slate-900 dark:text-white mt-1">${firmCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Target Firms Mapped</p>
            </div>

            <div class="glass-card rounded-xl p-5 flex flex-col cursor-pointer ${alertsCount > 0 ? 'ring-1 ring-amber-400/40 dark:ring-amber-500/30' : ''}" onclick="window.openManualBriefing()">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-lg ${alertsCount > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center"><i data-lucide="clock" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Deadlines</span>
                </div>
                <h3 class="text-3xl font-serif font-black text-slate-900 dark:text-white mt-1 ${alertsCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}">${alertsCount}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">${alertsCount > 0 ? 'Urgent Actions Required' : 'No imminent deadlines'}</p>
            </div>

            <div class="glass-card rounded-xl p-5 flex flex-col cursor-pointer ${totalReviewsDue > 0 ? 'ring-1 ring-rose-400/40 dark:ring-rose-500/30' : ''}" onclick="window.openUniversalFlashcardDashboard()">
                <div class="flex justify-between items-center mb-2">
                    <div class="w-8 h-8 rounded-lg ${totalReviewsDue > 0 ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center"><i data-lucide="layers" class="w-4 h-4"></i></div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">SRS Queue</span>
                </div>
                <h3 class="text-3xl font-serif font-black text-slate-900 dark:text-white mt-1 ${totalReviewsDue > 0 ? 'text-rose-600 dark:text-rose-400' : ''}">${totalReviewsDue}</h3>
                <p class="text-xs font-medium text-slate-500 mt-1">Cards Due for Study</p>
            </div>
        </div>

        <!-- ROW 2: MARKET DATA & HARMONIZED CONCEPT MASTERY -->
        <div class="col-span-1 lg:col-span-2 xl:col-span-3 glass-card rounded-xl p-6 h-full flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="trending-up" class="w-5 h-5 text-indigo-500"></i> Market Data</h2>
                    <p class="text-xs text-slate-500 mt-1">Click any card to expand high-resolution historical chart.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.openMacroImportModal()" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition items-center gap-1.5 hidden sm:flex bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm"><i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> CSV</button>
                    <select onchange="window.updateMacroPeriod(this.value)" class="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm uppercase tracking-widest">
                        <option value="7" ${window.currentMacroPeriod === '7' ? 'selected' : ''}>1W</option>
                        <option value="30" ${window.currentMacroPeriod === '30' ? 'selected' : ''}>1M</option>
                        <option value="90" ${window.currentMacroPeriod === '90' ? 'selected' : ''}>3M</option>
                        <option value="180" ${window.currentMacroPeriod === '180' ? 'selected' : ''}>6M</option>
                        <option value="365" ${window.currentMacroPeriod === '365' ? 'selected' : ''}>1Y</option>
                        <option value="1095" ${window.currentMacroPeriod === '1095' ? 'selected' : ''}>3Y</option>
                        <option value="1825" ${window.currentMacroPeriod === '1825' ? 'selected' : ''}>5Y</option>
                        <option value="all" ${window.currentMacroPeriod === 'all' ? 'selected' : ''}>MAX</option>
                    </select>
                    <button onclick="window.openMacroManualEditModal()" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800 hidden md:block">Update Data</button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                ${metrics.map(m => `
                    <div onclick="window.openExpandedGraph('${m.key}', '${m.label}', '${m.sub}', '${m.val}', '${m.color}', '${m.spark}')" class="border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-4 flex flex-col cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/80 transition-all group">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${m.label}</h4>
                                <span class="text-[9px] font-medium text-slate-500">${m.sub}</span>
                            </div>
                            <span class="text-sm font-black font-serif ${m.color}">${m.val}</span>
                        </div>
                        ${renderSparkline(m.key, m.spark)}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="col-span-1 h-full glass-card rounded-xl p-6 relative overflow-hidden flex flex-col">
            <h2 class="text-sm font-bold text-slate-900 dark:text-white relative z-10 shrink-0 flex items-center gap-2"><i data-lucide="target" class="w-4 h-4 text-emerald-500"></i> Concept Mastery</h2>
            
            <div class="flex-1 flex flex-col justify-center relative z-10 py-2">
                <div class="flex-1 flex justify-center items-center mb-8 min-h-[120px]">
                    <div class="relative w-full max-w-[160px] xl:max-w-[180px] aspect-square flex items-center justify-center transition-all duration-300">
                        <svg class="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="currentColor" class="text-slate-100 dark:text-slate-800/80" stroke-width="8"></circle>
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="8" 
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                                    stroke-linecap="round" class="transition-all duration-1000 ease-out"></circle>
                        </svg>
                        <div class="absolute flex flex-col items-center mt-1">
                            <span class="text-3xl xl:text-4xl font-serif font-black text-slate-900 dark:text-white leading-none tracking-tight">${masteryPct}%</span>
                            <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1.5">Mastered</span>
                        </div>
                    </div>
                </div>
                <div class="space-y-3 px-2 mb-6 shrink-0 w-full max-w-[240px] mx-auto">
                    <div class="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <span class="text-slate-600 dark:text-slate-400 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Mastered</span>
                        <span class="text-slate-900 dark:text-white font-bold text-sm">${masteredSrsItems}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <span class="text-slate-600 dark:text-slate-400 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Learning</span>
                        <span class="text-slate-900 dark:text-white font-bold text-sm">${totalSrsItems - masteredSrsItems}</span>
                    </div>
                </div>
            </div>
            <button onclick="window.openFlashcardDashboard('concepts')" class="w-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 rounded-lg transition border border-slate-200 dark:border-slate-700 relative z-10 shrink-0 mt-auto">Review Concepts</button>
        </div>

        <!-- ROW 3: RECENT ACTIVITY & DICTIONARY MASTERY + QUICK ACTIONS -->
        <div class="col-span-1 lg:col-span-2 xl:col-span-3 glass-card rounded-xl p-6 h-full flex flex-col">
            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 shrink-0">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white">Recent Commercial Activity</h2>
                <button onclick="window.switchState('INTELLIGENCE')" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition">View All &rarr;</button>
            </div>
            <div class="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                ${recentIntel.length > 0 ? recentIntel.map(f => {
                    const origIdx = db.factors.indexOf(f);
                    return `
                    <div class="flex items-start gap-3 group cursor-pointer" onclick="window.routeToIntelFactor(${origIdx})">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition"><i data-lucide="zap" class="w-4 h-4"></i></div>
                        <div class="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800/60 pb-3 group-hover:border-indigo-200 transition">
                            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${f.title || "Untitled Insight"}</h4>
                            ${f.summary ? `<p class="text-[12px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">${f.summary}</p>` : ''}
                            <div class="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                                <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">${f.pestle || 'General'}</span>
                                <span class="text-[9px] text-slate-400">&bull;</span>
                                <span class="text-[9px] font-medium text-slate-400 truncate">${f.workspace}</span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('') : `<p class="text-xs text-slate-500 italic">No recent intel logged.</p>`}
            </div>
        </div>

        <div class="col-span-1 flex flex-col gap-6 h-full">
            <div class="shrink-0 glass-card rounded-xl p-6 relative overflow-hidden flex flex-col">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white relative z-10 shrink-0 flex items-center gap-2"><i data-lucide="book-open-check" class="w-4 h-4 text-cyan-500"></i> Dictionary Mastery</h2>
                
                <div class="flex-1 flex flex-col justify-center relative z-10 py-2">
                    <div class="flex-1 flex justify-center items-center mb-8 min-h-[120px]">
                        <div class="relative w-full max-w-[160px] xl:max-w-[180px] aspect-square flex items-center justify-center transition-all duration-300">
                            <svg class="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="currentColor" class="text-slate-100 dark:text-slate-800/80" stroke-width="8"></circle>
                                <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#06b6d4" stroke-width="8" 
                                        stroke-dasharray="${circumference}" stroke-dashoffset="${dictStrokeDashoffset}" 
                                        stroke-linecap="round" class="transition-all duration-1000 ease-out"></circle>
                            </svg>
                            <div class="absolute flex flex-col items-center mt-1">
                                <span class="text-3xl xl:text-4xl font-serif font-black text-slate-900 dark:text-white leading-none tracking-tight">${dictMasteryPct}%</span>
                                <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1.5">Mastered</span>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3 px-2 mb-6 shrink-0 w-full max-w-[240px] mx-auto">
                        <div class="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cyan-500"></span> Mastered</span>
                            <span class="text-slate-900 dark:text-white font-bold text-sm">${dictMasteredSrsItems}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Learning</span>
                            <span class="text-slate-900 dark:text-white font-bold text-sm">${dictTotalSrsItems - dictMasteredSrsItems}</span>
                        </div>
                    </div>
                </div>
                <button onclick="window.openFlashcardDashboard('dictionary')" class="w-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 rounded-lg transition border border-slate-200 dark:border-slate-700 relative z-10 shrink-0 mt-auto">Review Glossary</button>
            </div>

            <div class="flex-1 glass-card rounded-xl p-6 flex flex-col min-h-[250px]">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white mb-4 shrink-0">Quick Actions</h2>
                <div class="flex flex-col gap-3 flex-1">
                    <button onclick="window.openQuickAdd()" class="flex-1 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition shadow-sm hover:-translate-y-0.5 min-h-[44px]">
                        <i data-lucide="plus" class="w-4 h-4 shrink-0"></i> <span class="text-center font-bold">Add Universal Record</span>
                    </button>
                    <button onclick="window.switchState('DOSSIERS'); setTimeout(window.addDossierFirm, 100);" class="flex-1 w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-bold py-3 px-4 rounded-lg text-sm transition shadow-sm min-h-[44px]">
                        <i data-lucide="building-2" class="w-4 h-4 text-slate-400 shrink-0"></i> <span class="text-center">Track New Firm</span>
                    </button>
                    <button onclick="window.openManualBriefing()" class="flex-1 w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-bold py-3 px-4 rounded-lg text-sm transition shadow-sm min-h-[44px]">
                        <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-400 shrink-0"></i> <span class="text-center">Generate Briefing</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    grid.innerHTML = html;
    
    if (window.lucide) window.lucide.createIcons();
    
    const headerWrapper = document.querySelector("#appDashboard > div > div.flex.justify-between.items-end");
    if (headerWrapper) {
        headerWrapper.className = "flex justify-between items-center mb-8";
        const btn = headerWrapper.querySelector("button");
        if (btn) btn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg transition shadow-md flex items-center gap-2 hover:-translate-y-0.5";
    }
};

// --- EXPANDED MACRO GRAPH ENGINE (BOTTOM X-AXIS FIX) ---
window.openExpandedGraph = function(metricKey, label, sub, val, colorClass, sparkClass) {
    let modal = document.getElementById("macroGraphModal");
    if (!modal) return;

    document.getElementById("expandedGraphName").innerText = label;
    document.getElementById("expandedGraphSub").innerText = sub;
    
    const valEl = document.getElementById("expandedGraphValue");
    valEl.innerText = val;
    valEl.className = `text-2xl font-serif font-black ${colorClass}`;

    const nowMs = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const m = db.macroMetrics || {};
    const genMockHistory = (arr) => arr.map((v, i) => ({ d: nowMs - ((arr.length - 1 - i) * 30 * dayMs), v: v }));
    const fallbacks = {
        metricBoE: genMockHistory([4.00, 4.25, 4.50, 4.75, 5.00, 5.25, 5.25, 5.00, 4.75]),
        metricFed: genMockHistory([3.75, 4.00, 4.50, 4.75, 5.25, 5.50, 5.50, 5.00, 4.75]),
        metricGBP: genMockHistory([1.21, 1.24, 1.26, 1.25, 1.28, 1.30, 1.32, 1.31, 1.34]),
        metricGilt: genMockHistory([3.80, 4.10, 4.40, 4.35, 4.60, 4.90, 4.85, 4.70, 4.65]),
        metricCPI: genMockHistory([6.8, 4.6, 4.0, 3.4, 3.2, 2.3, 2.0, 2.2, 2.6]),
        metricOil: genMockHistory([72.5, 78.5, 82.0, 84.5, 79.0, 75.2, 80.4, 88.1, 85.55])
    };

    let rawData = (m.history && m.history[metricKey]) || fallbacks[metricKey];
    if (!Array.isArray(rawData)) rawData = fallbacks[metricKey];

    let dataPoints = [...rawData];
    if (window.currentMacroPeriod !== 'all') {
        const cutoffMs = nowMs - (parseInt(window.currentMacroPeriod) * dayMs);
        dataPoints = dataPoints.filter(pt => pt.d >= cutoffMs);
    }
    if (dataPoints.length < 2) dataPoints = rawData.slice(-2);

    const vals = dataPoints.map(pt => pt.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min === 0 ? 1 : max - min;
    
    // Y-Axis Breathing Room
    const paddingMultiplier = 0.08; 
    const expandedMin = min - (range * paddingMultiplier);
    const expandedMax = max + (range * paddingMultiplier);
    const expandedRange = expandedMax - expandedMin;

    const formatAxisDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    const formatHoverDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const width = 800;
    const height = 300;
    const padding = 10;

    const points = vals.map((v, idx) => {
        const x = (idx / (vals.length - 1)) * width;
        const normalizedY = (v - expandedMin) / expandedRange;
        const y = (height - padding) - (normalizedY * (height - 2 * padding));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    let gridLinesHtml = '';
    let yLabelsHtml = '';
    for (let i = 0; i <= 4; i++) {
        const yPosition = padding + (i * ((height - 2 * padding) / 4));
        const valAtGridline = expandedMax - (i * (expandedRange / 4));
        
        gridLinesHtml += `<line x1="0" y1="${yPosition}" x2="${width}" y2="${yPosition}" stroke="currentColor" stroke-dasharray="4 4" class="text-slate-200 dark:text-slate-800 opacity-60" stroke-width="1"></line>`;
        yLabelsHtml += `<div class="absolute w-12 text-right pr-2 text-[10px] font-mono font-medium text-slate-400" style="top: ${(yPosition/height)*100}%; transform: translateY(-50%); left: 0;">${valAtGridline.toFixed(2)}</div>`;
    }

    const hoverOverlays = dataPoints.map((pt) => {
        return `
            <div class="flex-1 h-full group/modalpoint relative">
                <div class="absolute bottom-[20%] left-1/2 -translate-x-1/2 opacity-0 group-hover/modalpoint:opacity-100 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    ${formatHoverDate(pt.d)}<br>
                    <span class="${colorClass.replace('text-', 'text-')}">${pt.v}</span>
                </div>
            </div>
        `;
    }).join('');

    const container = document.getElementById("expandedGraphContainer");
    
    container.innerHTML = `
        <div class="flex flex-col h-full w-full">
            <div class="flex flex-1 relative h-[300px]">
                <!-- Y-Axis Labels -->
                <div class="w-14 relative h-full shrink-0 border-r border-slate-200 dark:border-slate-800 mr-2">
                    ${yLabelsHtml}
                </div>
                <!-- Main SVG Canvas -->
                <div class="flex-1 relative h-full min-w-[600px] border-b border-slate-200 dark:border-slate-800">
                    <svg viewBox="0 0 ${width} ${height}" class="absolute inset-0 w-full h-full ${sparkClass} fill-none" preserveAspectRatio="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        ${gridLinesHtml}
                        <polyline points="${points}"></polyline>
                    </svg>
                    <div class="absolute inset-0 flex">${hoverOverlays}</div>
                </div>
            </div>
            
            <!-- X-Axis Labels -->
            <div class="flex justify-between text-xs text-slate-400 font-mono font-medium ml-16 pt-3 min-w-[600px] shrink-0">
                <span>${formatAxisDate(dataPoints[0].d)}</span>
                <span>${formatAxisDate(dataPoints[Math.floor(dataPoints.length/2)].d)}</span>
                <span>${formatAxisDate(dataPoints[dataPoints.length-1].d)}</span>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        const inner = document.getElementById("macroGraphModalInner");
        if (inner) inner.classList.replace('scale-95', 'scale-100');
    }, 10);
};

window.closeExpandedGraph = function() {
    const modal = document.getElementById('macroGraphModal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        const inner = document.getElementById("macroGraphModalInner");
        if (inner) inner.classList.replace('scale-100', 'scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    }
};

// Listen for Escape key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.closeExpandedGraph();
        if(typeof window.closeMacroImportModal === 'function') window.closeMacroImportModal();
        if(typeof window.closeMacroManualEditModal === 'function') window.closeMacroManualEditModal();
    }
});

// --- DEDICATED NATIVE CSV IMPORT MODAL WITH AUTO-DATE REPAIR ---
window.openMacroImportModal = function() {
    let modal = document.getElementById('macroImportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'macroImportModal';
        modal.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all opacity-0 pointer-events-none";
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-transform duration-200">
                <div class="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 class="text-lg font-serif font-black text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="upload-cloud" class="w-5 h-5 text-indigo-500"></i> Import Macro Data</h3>
                    <button onclick="window.closeMacroImportModal()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <p class="text-xs text-slate-500 mb-5 leading-relaxed">Download a historical dataset from FRED, Bank of England, or ONS. Ensure your CSV contains two columns: <strong>Date</strong> and <strong>Value</strong>.</p>
                
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Metric</label>
                <select id="macroImportSelect" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 mb-6 shadow-inner cursor-pointer">
                    <option value="metricBoE">BoE Base Rate</option>
                    <option value="metricFed">US Fed Funds</option>
                    <option value="metricGBP">GBP / USD</option>
                    <option value="metricGilt">UK 10Y Gilt</option>
                    <option value="metricCPI">UK CPI</option>
                    <option value="metricOil">Brent Crude</option>
                </select>

                <div class="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group bg-slate-50/50 dark:bg-[#0b1120]">
                    <input type="file" id="macroCsvFileInput" accept=".csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="window.processMacroCSV(event)">
                    <div class="flex flex-col items-center justify-center gap-2 group-hover:-translate-y-1 transition-transform">
                        <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm"><i data-lucide="file-spreadsheet" class="w-6 h-6"></i></div>
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Click or Drag CSV File</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();
    }
    
    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => modal.querySelector('div').classList.replace('scale-95', 'scale-100'), 10);
};

window.closeMacroImportModal = function() {
    const modal = document.getElementById('macroImportModal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.querySelector('div').classList.replace('scale-100', 'scale-95');
        const fileInput = document.getElementById('macroCsvFileInput');
        if(fileInput) fileInput.value = ""; 
    }
};

function parseAnyDate(str) {
    if (!str) return NaN;
    str = String(str).trim();
    
    const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10) - 1;
        const d = parseInt(isoMatch[3], 10);
        return new Date(y, m, d).getTime();
    }
    
    const ukMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s|$)/);
    if (ukMatch) {
        const d = parseInt(ukMatch[1], 10);
        let m = parseInt(ukMatch[2], 10) - 1;
        let y = parseInt(ukMatch[3], 10);
        
        if (y < 100) y += 2000;
        if (m > 11) {
            return new Date(y, d - 1, m + 1).getTime(); 
        }
        
        return new Date(y, m, d).getTime();
    }
    
    return Date.parse(str);
}

window.processMacroCSV = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    const selectEl = document.getElementById('macroImportSelect');
    const metricKey = selectEl.value;
    const label = selectEl.options[selectEl.selectedIndex].text;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let parsed = [];
        
        rows.forEach(row => {
            const cols = row.split(',');
            if(cols.length >= 2) {
                let dateMs = parseAnyDate(cols[0]);
                let val = parseFloat(cols[1].replace(/[^0-9.-]+/g,""));
                
                if(!isNaN(dateMs) && !isNaN(val)) {
                    parsed.push({ d: dateMs, v: val });
                }
            }
        });
        
        if(parsed.length > 0) {
            parsed.sort((a,b) => a.d - b.d);
            db.macroMetrics = db.macroMetrics || {};
            db.macroMetrics.history = db.macroMetrics.history || {};
            db.macroMetrics.history[metricKey] = parsed;
            
            db.macroMetrics[metricKey] = parsed[parsed.length-1].v.toString();
            
            if(typeof saveDatabase === 'function') saveDatabase();
            if(typeof window.renderDashboard === 'function') window.renderDashboard();
            
            window.closeMacroImportModal();
            if(typeof showToast === 'function') {
                showToast(`Successfully imported ${parsed.length} records for ${label}.`, "success");
            } else {
                alert(`Successfully imported ${parsed.length} historical records for ${label}!`);
            }
        } else {
            alert("Could not parse the CSV. Please ensure it has two columns: Date and Value.");
            window.closeMacroImportModal();
        }
    };
    reader.readAsText(file);
};

// --- DEDICATED MANUAL DATA ENTRY MODAL ---
window.openMacroManualEditModal = function() {
    let modal = document.getElementById('macroManualEditModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'macroManualEditModal';
        modal.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all opacity-0 pointer-events-none";
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-transform duration-200">
                <div class="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <h3 class="text-xl font-serif font-black text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="edit-3" class="w-5 h-5 text-indigo-500"></i> Update Macro Metrics</h3>
                    <button onclick="window.closeMacroManualEditModal()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">BoE Base Rate (%)</label><input type="text" id="editMetricBoE" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 5.25"></div>
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">US Fed Funds (%)</label><input type="text" id="editMetricFed" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 5.50"></div>
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">GBP / USD</label><input type="text" id="editMetricGBP" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 1.28"></div>
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">UK 10Y Gilt (%)</label><input type="text" id="editMetricGilt" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 4.25"></div>
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">UK CPI (YoY %)</label><input type="text" id="editMetricCPI" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 3.4"></div>
                    <div><label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Brent Crude</label><input type="text" id="editMetricOil" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white dark:bg-slate-800 shadow-inner font-bold" placeholder="e.g. 82.50"></div>
                </div>

                <div class="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
                    <button onclick="window.closeMacroManualEditModal()" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 font-bold py-2.5 px-5 rounded-lg transition text-sm">Cancel</button>
                    <button onclick="window.saveManualMacroMetrics()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition text-sm shadow-md flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Save to Graph</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const m = db.macroMetrics || {};
    document.getElementById('editMetricBoE').value = m.metricBoE || '';
    document.getElementById('editMetricFed').value = m.metricFed || '';
    document.getElementById('editMetricGBP').value = m.metricGBP || '';
    document.getElementById('editMetricGilt').value = m.metricGilt || '';
    document.getElementById('editMetricCPI').value = m.metricCPI || '';
    document.getElementById('editMetricOil').value = m.metricOil || '';

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => modal.querySelector('div').classList.replace('scale-95', 'scale-100'), 10);
    if (window.lucide) window.lucide.createIcons();
};

window.closeMacroManualEditModal = function() {
    const modal = document.getElementById('macroManualEditModal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.querySelector('div').classList.replace('scale-100', 'scale-95');
    }
};

window.saveManualMacroMetrics = function() {
    if(typeof db === 'undefined') return;
    db.macroMetrics = db.macroMetrics || {};
    db.macroMetrics.history = db.macroMetrics.history || {};
    
    const nowMs = new Date().getTime();
    const keys = [
        {id: 'metricBoE', isPct: true}, 
        {id: 'metricFed', isPct: true}, 
        {id: 'metricGBP', isPct: false}, 
        {id: 'metricGilt', isPct: true}, 
        {id: 'metricCPI', isPct: true}, 
        {id: 'metricOil', isPct: false}
    ];
    
    keys.forEach(k => {
        const el = document.getElementById('edit' + k.id.charAt(0).toUpperCase() + k.id.slice(1));
        if (el && el.value.trim() !== '') {
            const rawVal = el.value.replace(/[^0-9.-]+/g, "");
            const numVal = parseFloat(rawVal);
            
            if (!isNaN(numVal)) {
                db.macroMetrics[k.id] = k.isPct ? numVal.toString() + '%' : numVal.toString();
                
                db.macroMetrics.history[k.id] = db.macroMetrics.history[k.id] || [];
                const hist = db.macroMetrics.history[k.id];
                
                if (hist.length > 0) {
                    const lastDate = new Date(hist[hist.length-1].d);
                    const todayDate = new Date(nowMs);
                    if (lastDate.toDateString() === todayDate.toDateString()) {
                        hist[hist.length-1].v = numVal; 
                    } else {
                        hist.push({ d: nowMs, v: numVal });
                    }
                } else {
                    hist.push({ d: nowMs, v: numVal });
                }
            }
        }
    });
    
    db.macroMetrics.lastUpdated = new Date().toISOString();
    if (typeof saveDatabase === 'function') saveDatabase();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
    
    window.closeMacroManualEditModal();
    if(typeof showToast === 'function') showToast("Data saved and graphed successfully.", "success");
};