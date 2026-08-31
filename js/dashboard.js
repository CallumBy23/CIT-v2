// DASHBOARD & COMMAND CENTER LOGIC
// ==========================================

// 1. Initialize from LocalStorage to remember the timeframe
window.currentMacroPeriod = localStorage.getItem('LEGAL_NEXUS_MACRO_PERIOD') || '180';

window.updateMacroPeriod = function(val) {
    window.currentMacroPeriod = val;
    localStorage.setItem('LEGAL_NEXUS_MACRO_PERIOD', val);
    if(typeof renderDashboard === 'function') renderDashboard();
};

window.renderDashboard = function() {
    const grid = document.getElementById("dashboardGrid");
    if (!grid) return;

    // --- 1. DATA AGGREGATION ---
    const nowMs = new Date().getTime();
    const today = new Date();
    today.setHours(0,0,0,0);
    const twoWeeksTime = today.getTime() + (14 * 24 * 60 * 60 * 1000);
    const dayMs = 24 * 60 * 60 * 1000;

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
    const conceptsDue = (db.concepts || []).filter(c => c.srs && c.srs.nextReview <= nowMs && c.category !== "Interview Vault").length;
    const dictDue = (db.dictionary || []).filter(d => d.srs && d.srs.nextReview <= nowMs).length;
    const totalReviewsDue = conceptsDue + dictDue;

    // Calculate CONCEPT Mastery Percentage
    let totalSrsItems = 0;
    let masteredSrsItems = 0;
    (db.concepts || []).forEach(c => {
        if(c.category !== "Interview Vault") {
            totalSrsItems++;
            if(c.srs && (c.srs.mastered || c.srs.interval >= 21)) masteredSrsItems++;
        }
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

    // Get Recent Intel Activity (Last 5)
    let recentIntel = [...(db.factors || [])]
        .filter(f => f.workspace !== "Interview Vault")
        .reverse()
        .slice(0, 5);

    // Macro Metrics Safeload, Formatting & Historical Fallbacks
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
        { key: 'metricCPI', label: 'UK CPI (YoY)', sub: 'Contract Indexation', val: formatPct(m.metricCPI), color: 'text-orange-600 dark:text-orange-400', spark: 'stroke-orange-500' },
        { key: 'metricOil', label: 'Brent Crude', sub: 'Energy & Projects', val: m.metricOil || '--', color: 'text-rose-600 dark:text-rose-400', spark: 'stroke-rose-500' }
    ];

    // Helper to generate a realistic looking fallback curve if database is empty
    const genMockHistory = (arr) => arr.map((v, i) => ({ d: nowMs - ((arr.length - 1 - i) * 30 * dayMs), v: v }));
    const fallbacks = {
        metricBoE: genMockHistory([4.00, 4.25, 4.50, 4.75, 5.00, 5.25, 5.25, 5.00, 4.75]),
        metricFed: genMockHistory([3.75, 4.00, 4.50, 4.75, 5.25, 5.50, 5.50, 5.00, 4.75]),
        metricGBP: genMockHistory([1.21, 1.24, 1.26, 1.25, 1.28, 1.30, 1.32, 1.31, 1.34]),
        metricGilt: genMockHistory([3.80, 4.10, 4.40, 4.35, 4.60, 4.90, 4.85, 4.70, 4.65]),
        metricCPI: genMockHistory([6.8, 4.6, 4.0, 3.4, 3.2, 2.3, 2.0, 2.2, 2.6]),
        metricOil: genMockHistory([72.5, 78.5, 82.0, 84.5, 79.0, 75.2, 80.4, 88.1, 85.55])
    };

    // --- REAL DATA-DRIVEN SPARKLINE ENGINE WITH AXES & DOWNSAMPLING ---
    const renderSparkline = (metricKey, colorClass) => {
        let rawData = m.history[metricKey] || fallbacks[metricKey];
        if (!Array.isArray(rawData)) rawData = fallbacks[metricKey];

        // Filter based on dropdown timeframe
        let dataPoints = [...rawData];
        if (window.currentMacroPeriod !== 'all') {
            const cutoffMs = nowMs - (parseInt(window.currentMacroPeriod) * dayMs);
            dataPoints = dataPoints.filter(pt => pt.d >= cutoffMs);
        }

        // Failsafe: If filter leaves < 2 points, grab the most recent 2
        if (dataPoints.length < 2) dataPoints = rawData.slice(-2);

        // DATA THINNING: Smooth out high-frequency daily data over long horizons to prevent barcode rendering
        if (dataPoints.length > 90) {
            const step = Math.ceil(dataPoints.length / 60); 
            dataPoints = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1);
        }

        const vals = dataPoints.map(pt => pt.v);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const range = max - min === 0 ? 1 : max - min;
        
        // Formatter for Dates
        const formatAxisDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const formatHoverDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        const startLabel = formatAxisDate(dataPoints[0].d);
        const endLabel = formatAxisDate(dataPoints[dataPoints.length-1].d);

        const width = 100;
        const height = 28;
        const padding = 2;

        const points = vals.map((val, idx) => {
            const x = (idx / (vals.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = (height - padding) - (normalizedY * (height - 2 * padding));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        // Invisible Hover Slices
        const hoverOverlays = dataPoints.map((pt) => {
            return `
                <div class="flex-1 h-full group relative cursor-crosshair">
                    <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        ${formatHoverDate(pt.d)}: <span class="${colorClass.replace('text-', 'text-')}">${pt.v}</span>
                    </div>
                    <div class="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400 dark:bg-slate-500 opacity-0 group-hover:opacity-50 pointer-events-none"></div>
                </div>
            `;
        }).join('');

        return `
            <div class="flex flex-col mt-4">
                <div class="flex items-stretch gap-2 h-10">
                    <div class="flex flex-col justify-between text-[9px] text-slate-400 font-mono font-medium leading-none py-0.5 w-6 text-right shrink-0">
                        <span>${max.toFixed(1)}</span>
                        <span>${min.toFixed(1)}</span>
                    </div>
                    <div class="flex-1 relative w-full h-full border-l border-b border-slate-200 dark:border-slate-700/50">
                        <div class="absolute inset-0 ml-1 mb-1">
                            <svg viewBox="0 0 100 28" class="absolute inset-0 w-full h-full ${colorClass} fill-none opacity-80" preserveAspectRatio="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${points}"></polyline></svg>
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

    // Mastery Donut Math (Increased bounds for perfect circle rendering)
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPct / 100) * circumference;
    const dictStrokeDashoffset = circumference - (dictMasteryPct / 100) * circumference;

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
                    <div class="flex items-center gap-2">
                        <button onclick="window.openMacroImportModal()" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition items-center gap-1.5 hidden sm:flex bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-700 shadow-sm"><i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> CSV</button>
                        <select onchange="window.updateMacroPeriod(this.value)" class="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm uppercase tracking-widest">
                            <option value="7" ${window.currentMacroPeriod === '7' ? 'selected' : ''}>1W</option>
                            <option value="30" ${window.currentMacroPeriod === '30' ? 'selected' : ''}>1M</option>
                            <option value="90" ${window.currentMacroPeriod === '90' ? 'selected' : ''}>3M</option>
                            <option value="180" ${window.currentMacroPeriod === '180' ? 'selected' : ''}>6M</option>
                            <option value="365" ${window.currentMacroPeriod === '365' ? 'selected' : ''}>1Y</option>
                            <option value="1095" ${window.currentMacroPeriod === '1095' ? 'selected' : ''}>3Y</option>
                            <option value="1825" ${window.currentMacroPeriod === '1825' ? 'selected' : ''}>5Y</option>
                            <option value="all" ${window.currentMacroPeriod === 'all' ? 'selected' : ''}>MAX</option>
                        </select>
                        <button onclick="switchState('INTELLIGENCE')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-sm hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800 hidden md:block">Customize</button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    ${metrics.map(m => `
                        <div class="border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 flex flex-col shadow-inner">
                            <div class="flex justify-between items-start mb-1">
                                <div>
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">${m.label}</h4>
                                    <span class="text-[9px] font-medium text-slate-500">${m.sub}</span>
                                </div>
                                <span class="text-sm font-black ${m.color}">${m.val}</span>
                            </div>
                            ${renderSparkline(m.key, m.spark)}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex-1">
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

        <!-- ROW 2: RIGHT SIDEBAR (Mastery & Actions - FLUSH ALIGNED) -->
        <div class="col-span-1 flex flex-col gap-6 h-full">
            
            <!-- Concept Mastery SVG Donut -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0b1120] dark:to-[#0f172a] rounded-lg p-6 shadow-lg border border-slate-700 relative overflow-hidden flex flex-col justify-center flex-1">
                <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>
                <h2 class="text-sm font-bold text-white mb-4 flex items-center gap-2 relative z-10"><i data-lucide="target" class="w-4 h-4 text-emerald-400"></i> Concept Mastery</h2>
                
                <div class="flex justify-center items-center mb-5 relative z-10">
                    <div class="relative w-28 h-28 flex items-center justify-center">
                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <!-- Background Circle -->
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="8"></circle>
                            <!-- Progress Circle -->
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="8" 
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                                    stroke-linecap="round" class="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"></circle>
                        </svg>
                        <div class="absolute flex flex-col items-center mt-1">
                            <span class="text-2xl font-black text-white leading-none">${masteryPct}%</span>
                            <span class="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1">Mastered</span>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2 relative z-10 mb-5 px-2">
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span> Mastered</span>
                        <span class="text-white font-bold">${masteredSrsItems}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Learning</span>
                        <span class="text-white font-bold">${totalSrsItems - masteredSrsItems}</span>
                    </div>
                </div>
                
                <button onclick="openFlashcardDashboard('concepts')" class="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold py-2.5 rounded-sm transition backdrop-blur-sm relative z-10 mt-auto">Review Concepts</button>
            </div>

            <!-- Dictionary Mastery SVG Donut -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0b1120] dark:to-[#0f172a] rounded-lg p-6 shadow-lg border border-slate-700 relative overflow-hidden flex flex-col justify-center flex-1">
                <div class="absolute top-0 right-0 w-32 h-32 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>
                <h2 class="text-sm font-bold text-white mb-4 flex items-center gap-2 relative z-10"><i data-lucide="book-open-check" class="w-4 h-4 text-cyan-400"></i> Dictionary Mastery</h2>
                
                <div class="flex justify-center items-center mb-5 relative z-10">
                    <div class="relative w-28 h-28 flex items-center justify-center">
                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <!-- Background Circle -->
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="8"></circle>
                            <!-- Progress Circle -->
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#06b6d4" stroke-width="8" 
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${dictStrokeDashoffset}" 
                                    stroke-linecap="round" class="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></circle>
                        </svg>
                        <div class="absolute flex flex-col items-center mt-1">
                            <span class="text-2xl font-black text-white leading-none">${dictMasteryPct}%</span>
                            <span class="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1">Mastered</span>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2 relative z-10 mb-5 px-2">
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></span> Mastered</span>
                        <span class="text-white font-bold">${dictMasteredSrsItems}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                        <span class="text-slate-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Learning</span>
                        <span class="text-white font-bold">${dictTotalSrsItems - dictMasteredSrsItems}</span>
                    </div>
                </div>
                
                <button onclick="openFlashcardDashboard('dictionary')" class="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold py-2.5 rounded-sm transition backdrop-blur-sm relative z-10 mt-auto">Review Glossary</button>
            </div>

            <!-- Quick Actions (Expanded & Bottom Positioned) -->
            <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col shrink-0">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
                <div class="flex flex-col gap-3">
                    <button onclick="openQuickAdd()" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md text-sm transition shadow-sm hover:-translate-y-0.5">
                        <i data-lucide="plus" class="w-4 h-4 shrink-0"></i> <span class="text-center font-bold">Add Universal Record</span>
                    </button>
                    <button onclick="switchState('DOSSIERS'); setTimeout(addDossierFirm, 100);" class="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold py-2.5 px-4 rounded-md text-sm transition shadow-sm">
                        <i data-lucide="building-2" class="w-4 h-4 text-slate-400 shrink-0"></i> <span class="text-center">Track New Firm</span>
                    </button>
                    <button onclick="openManualBriefing()" class="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold py-2.5 px-4 rounded-md text-sm transition shadow-sm">
                        <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-400 shrink-0"></i> <span class="text-center">Generate Briefing</span>
                    </button>
                </div>
            </div>

        </div>
    `;

    grid.innerHTML = html;
    
    if (window.lucide) window.lucide.createIcons();
    
    // Header Alignment Fix
    const headerWrapper = document.querySelector("#appDashboard > div > div.flex.justify-between.items-end");
    if (headerWrapper) {
        headerWrapper.className = "flex justify-between items-center mb-8";
        const btn = headerWrapper.querySelector("button");
        if (btn) btn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-md transition shadow-md flex items-center gap-2 hover:-translate-y-0.5";
    }
};

// --- DEDICATED NATIVE CSV IMPORT MODAL ---
window.openMacroImportModal = function() {
    let modal = document.getElementById('macroImportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'macroImportModal';
        modal.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all opacity-0 pointer-events-none";
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-transform duration-200">
                <div class="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 class="text-lg font-serif font-black text-slate-900 dark:text-white flex items-center gap-2"><i data-lucide="upload-cloud" class="w-5 h-5 text-indigo-500"></i> Import Macro Data</h3>
                    <button onclick="closeMacroImportModal()" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <p class="text-xs text-slate-500 mb-5 leading-relaxed">Download a historical dataset from FRED or the ONS. Ensure your CSV only contains two columns: <strong>Date</strong> and <strong>Value</strong>.</p>
                
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Metric</label>
                <select id="macroImportSelect" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md p-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 mb-6 shadow-inner cursor-pointer">
                    <option value="metricBoE">BoE Base Rate</option>
                    <option value="metricFed">US Fed Funds</option>
                    <option value="metricGBP">GBP / USD</option>
                    <option value="metricGilt">UK 10Y Gilt</option>
                    <option value="metricCPI">UK CPI</option>
                    <option value="metricOil">Brent Crude</option>
                </select>

                <div class="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group bg-slate-50/50 dark:bg-[#0b1120]">
                    <input type="file" id="macroCsvFileInput" accept=".csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="processMacroCSV(event)">
                    <div class="flex flex-col items-center justify-center gap-2 group-hover:-translate-y-1 transition-transform">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm"><i data-lucide="file-spreadsheet" class="w-6 h-6"></i></div>
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Click or Drag CSV File</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();
    }
    
    // Reveal Modal
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
                // Ignore header rows by ensuring the first column resolves to a valid date
                let dateMs = Date.parse(cols[0].trim());
                let val = parseFloat(cols[1].replace(/[^0-9.-]+/g,""));
                
                if(!isNaN(dateMs) && !isNaN(val)) {
                    parsed.push({ d: dateMs, v: val });
                }
            }
        });
        
        if(parsed.length > 0) {
            parsed.sort((a,b) => a.d - b.d); // Chronological Order
            db.macroMetrics = db.macroMetrics || {};
            db.macroMetrics.history = db.macroMetrics.history || {};
            db.macroMetrics.history[metricKey] = parsed;
            
            // Set the dashboard display number to the most recent entry
            db.macroMetrics[metricKey] = parsed[parsed.length-1].v.toString();
            
            if(typeof saveDatabase === 'function') saveDatabase();
            if(typeof renderDashboard === 'function') renderDashboard();
            
            closeMacroImportModal();
            if(typeof showToast === 'function') {
                showToast(`Successfully imported ${parsed.length} historical records for ${label}.`, "success");
            } else {
                alert(`Successfully imported ${parsed.length} historical records for ${label}!`);
            }
        } else {
            alert("Could not parse the CSV. Please ensure it has two columns: Date and Value.");
            closeMacroImportModal();
        }
    };
    reader.readAsText(file);
};