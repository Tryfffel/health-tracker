// analytics.js — Analysmotorer: rena funktioner utan React/DOM-beroenden.
// Alla tar sina databeroenden som explicita argument (deterministiska; slumpen
// i Monte Carlo seedas med mulberry32). Laddas via <script> FÖRE huvudscriptet.
// Exponeras som window.Analytics.
(function () {
  'use strict';
  var A = {};
  A.calcPearson = function(pairs) {
    var n = pairs.length; if (n < 3) return null;
    var sx=0,sy=0,sxy=0,sxx=0,syy=0;
    pairs.forEach(function(p){sx+=p[0];sy+=p[1];sxy+=p[0]*p[1];sxx+=p[0]*p[0];syy+=p[1]*p[1];});
    var den = Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));
    return den===0 ? null : (n*sxy-sx*sy)/den;
  };
  A.mulberry32 = function(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  A.bodyFatPct = function(waist, neck, heightCm) {
    if (!waist || !neck || !heightCm || waist <= neck) return null;
    var v = 495 / (1.0324 - 0.19077*Math.log10(waist - neck) + 0.15456*Math.log10(heightCm)) - 450;
    return (v > 2 && v < 60) ? Math.round(v*10)/10 : null;
  };
  A.parseNekoText = function(text) {
    var t = text.replace(/\[|\]|\(https?:[^)]*\)/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    var out = {};
    var mn = { januari:1, februari:2, mars:3, april:4, maj:5, juni:6, juli:7, augusti:8, september:9, oktober:10, november:11, december:12 };
    var dm = t.match(/(\d{1,2}) (januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december) (\d{4})/);
    if (dm) out.date = dm[3] + '-' + String(mn[dm[2]]).padStart(2,'0') + '-' + String(parseInt(dm[1])).padStart(2,'0');
    var grab = function(labelRe) {
      var m = t.match(new RegExp(labelRe + '[^0-9]{0,60}(-?\\d+(?:[.,]\\d+)?)', 'i'));
      return m ? m[1].replace(',', '.') : null;
    };
    var bp = t.match(/blodtryck[^0-9]{0,60}(\d{2,3})[^0-9]{0,20}\/\s*(\d{2,3})/);
    if (bp) { out.sys = bp[1]; out.dia = bp[2]; }
    var map = [
      ['hjärtålder', 'heartage'], ['ankeltryck', 'ankle'], ['\\babi\\b', 'abi'], ['syremättnad', 'spo2'],
      ['\\bpuls\\b', 'pulse'], ['överledningstid', 'ekg_pr'], ['kammaraktiveringstid', 'ekg_qrs'], ['återhämtningstid', 'ekg_qtc'],
      ['totalt kolesterol', 'totchol'], ['\\bhdl\\b', 'hdl'], ['non-hdl', 'nonhdl'], ['\\bldl\\b', 'ldl'], ['triglycerider', 'tg'],
      ['hba1c', 'hba1c'], ['glukos', 'glucose'], ['hs-?crp', 'crp'],
      ['vita blodkroppar', 'lpk'], ['neutrofiler', 'neutro'], ['lymfocyter', 'lymf'], ['hemoglobin', 'hb'],
      ['ögontryck', 'eye'], ['\\bvikt\\b', 'weight'], ['midjemått', 'waist'], ['greppstyrka', 'grip']
    ];
    map.forEach(function(m) { var v = grab(m[0]); if (v != null) out[m[1]] = v; });
    return out;
  };
  A.getCalories = function(type, duration, weight) {
    weight = weight || 80;
    const mets = { 'Styrketräning':5,'Löpning':9,'Promenad':3.5,'Cykling':7,'Simning':7,'Yoga':2.5,'Pilates':3,'Fotboll':7,'Tennis':7,'Golf':4,'Skidåkning':7,'Innebandy':8,'Dans':5,'Boxning':9,'Klättring':8,'Crossfit':10,'Spinning':8,'Gruppträning':6,'Baseboll':4,'Annat':5 };
    return Math.round((mets[type] || 5) * weight * (duration / 60));
  };
  A.getWeekNumber = function(date) {
    const d = new Date(date);
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday.toISOString().split('T')[0];
  };
  A.getISOWeekNumber = function(date) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return 'V' + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };
  A.getBMI = function(weight, height) {
    if (!height || !weight) return null;
    const hm = height / 100;
    return parseFloat((weight / (hm * hm)).toFixed(1));
  };
  A.getBMICategory = function(bmi) {
    if (bmi < 18.5) return { label: 'Undervikt',  color: 'text-blue-600' };
    if (bmi < 25)   return { label: 'Normalvikt', color: 'text-green-600' };
    if (bmi < 30)   return { label: 'Övervikt',   color: 'text-yellow-600' };
    return             { label: 'Fetma',       color: 'text-red-600' };
  };
  A.getStreak = function(entries) {
    if (entries.length === 0) return 0;
    const sorted = entries.slice().sort(function(a,b) { return new Date(b.date) - new Date(a.date); });
    const todayD  = new Date(); todayD.setHours(0,0,0,0);
    const latestD = new Date(sorted[0].date); latestD.setHours(0,0,0,0);
    if ((todayD - latestD) / 86400000 > 1) return 0;
    let streak = 1;
    let prev = new Date(sorted[0].date); prev.setHours(0,0,0,0);
    for (let i = 1; i < sorted.length; i++) {
      const d = new Date(sorted[i].date); d.setHours(0,0,0,0);
      if ((prev - d) / 86400000 === 1) { streak++; prev = d; } else break;
    }
    return streak;
  };
  A.getWeeklyStats = function(entries, workouts) {
    if (entries.length === 0) return [];
    const sorted = entries.slice().sort(function(a,b) { return new Date(a.date) - new Date(b.date); });
    const weekMap = {};
    sorted.forEach(function(entry) {
      const ws = A.getWeekNumber(entry.date);
      if (!weekMap[ws]) weekMap[ws] = { weekStart: ws, weights: [], steps: [] };
      weekMap[ws].weights.push(entry.weight);
      if (entry.steps) weekMap[ws].steps.push(entry.steps);
    });
    const weeks = Object.values(weekMap).map(function(week) {
      const avgWeight = week.weights.reduce(function(a,b){return a+b;},0) / week.weights.length;
      const avgSteps  = week.steps.length ? Math.round(week.steps.reduce(function(a,b){return a+b;},0) / week.steps.length) : 0;
      const weekWorkouts = workouts.filter(function(w) { return A.getWeekNumber(w.date) === week.weekStart; });
      return {
        weekStart: week.weekStart, weekNumber: A.getISOWeekNumber(week.weekStart),
        avgWeight: parseFloat(avgWeight.toFixed(1)),
        avgSteps: avgSteps,
        workoutCount: weekWorkouts.length,
        totalMinutes: weekWorkouts.reduce(function(s,w){return s+w.duration;},0),
        change: 0,
      };
    });
    for (let i = 1; i < weeks.length; i++) {
      weeks[i].change = parseFloat((weeks[i].avgWeight - weeks[i-1].avgWeight).toFixed(2));
    }
    return weeks.sort(function(a,b) { return new Date(b.weekStart) - new Date(a.weekStart); });
  };
  A.getCurrentWeekStats = function(entries, workouts) {
    const ws = A.getWeeklyStats(entries, workouts);
    if (!ws.length) return null;
    return { thisWeek: ws[0], lastWeek: ws[1] || null };
  };
  A.getYearlyProgress = function(workouts, yearlyGoal) {
    const yr = new Date().getFullYear();
    const yearWorkouts = workouts.filter(function(w) { return new Date(w.date).getFullYear() === yr; });
    const totalSessions = yearWorkouts.length;
    const totalMinutes  = yearWorkouts.reduce(function(s,w){return s+w.duration;},0);
    const weeksElapsed  = Math.floor((new Date() - new Date(yr, 0, 1)) / (7*24*60*60*1000)) + 1;
    const expectedSessions = Math.round((yearlyGoal.sessions / 52) * weeksElapsed);
    const expectedMinutes  = Math.round((yearlyGoal.minutes  / 52) * weeksElapsed);
    return {
      totalSessions: totalSessions, totalMinutes: totalMinutes,
      goalSessions: yearlyGoal.sessions, goalMinutes: yearlyGoal.minutes,
      sessionsProgress: Math.min(totalSessions / yearlyGoal.sessions * 100, 100).toFixed(1),
      minutesProgress:  Math.min(totalMinutes  / yearlyGoal.minutes  * 100, 100).toFixed(1),
      onTrackSessions: totalSessions >= expectedSessions,
      onTrackMinutes:  totalMinutes  >= expectedMinutes,
      aheadSessions: totalSessions - expectedSessions,
      aheadMinutes:  totalMinutes  - expectedMinutes,
    };
  };
  A.getStats = function(entries, goalWeight, height) {
    if (entries.length === 0) return null;
    const sorted    = entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
    const latest    = sorted[sorted.length - 1];
    const previous  = sorted[sorted.length - 2];
    const diff      = previous ? (latest.weight - previous.weight).toFixed(1) : 0;
    const toGoal    = (latest.weight - goalWeight).toFixed(1);
    const totalLoss = (sorted[0].weight - latest.weight).toFixed(1);
    const recentSteps = sorted.slice(-7).filter(function(e){return e.steps;}).map(function(e){return e.steps;});
    const avgSteps  = recentSteps.length ? Math.round(recentSteps.reduce(function(a,b){return a+b;},0) / recentSteps.length) : 0;
    const bmi    = A.getBMI(latest.weight, height);
    const bmiCat = bmi ? A.getBMICategory(bmi) : null;
    return { latest: latest, diff: diff, toGoal: toGoal, totalLoss: totalLoss, avgSteps: avgSteps, bmi: bmi, bmiCat: bmiCat, streak: A.getStreak(entries) };
  };
  A.getPrediction = function(entries, goalWeight) {
    if (entries.length < 7) return null;
    const sorted = entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
    const recent = sorted.slice(-30);
    if (recent.length < 5) return null;
    var n = recent.length, sumX=0, sumY=0, sumXY=0, sumX2=0;
    var t0 = new Date(recent[0].date).getTime();
    recent.forEach(function(e) {
      var x = (new Date(e.date).getTime()-t0)/86400000, y = e.weight;
      sumX+=x; sumY+=y; sumXY+=x*y; sumX2+=x*x;
    });
    var slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    var intercept = (sumY - slope*sumX) / n;
    if (slope >= 0) return { gaining: true, kgPerWeek: parseFloat((slope*7).toFixed(2)) };
    var currentX = (new Date(recent[recent.length-1].date).getTime()-t0)/86400000;
    var daysToGoal = (goalWeight - intercept)/slope - currentX;
    if (daysToGoal < 0 || daysToGoal > 365*3) return null;
    return { weeksToGoal: Math.round(daysToGoal/7), kgPerWeek: parseFloat(Math.abs(slope*7).toFixed(2)), gaining: false };
  };
  A.getMonthlySummary = function(entries, workouts) {
    var now = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    var tryMonth = function(yr, mo) { return yr + '-' + pad(mo+1); };
    var monthStr = tryMonth(now.getFullYear(), now.getMonth());
    var mEntries = entries.filter(function(e){ return e.date.startsWith(monthStr); });
    if (mEntries.length < 2) {
      var prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
      monthStr = tryMonth(prev.getFullYear(), prev.getMonth());
      mEntries = entries.filter(function(e){ return e.date.startsWith(monthStr); });
    }
    if (mEntries.length === 0) return null;
    var mWorkouts = workouts.filter(function(w){ return w.date.startsWith(monthStr); });
    var sorted = mEntries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
    var weightChange = sorted.length>1 ? parseFloat((sorted[sorted.length-1].weight - sorted[0].weight).toFixed(1)) : 0;
    var stepsArr = mEntries.filter(function(e){return e.steps;}).map(function(e){return e.steps;});
    var avgSteps = stepsArr.length ? Math.round(stepsArr.reduce(function(a,b){return a+b;},0)/stepsArr.length) : 0;
    var moodArr = mEntries.filter(function(e){return e.mood;}).map(function(e){return e.mood;});
    var avgMood = moodArr.length ? parseFloat((moodArr.reduce(function(a,b){return a+b;},0)/moodArr.length).toFixed(1)) : null;
    var names = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];
    var moIdx = parseInt(monthStr.split('-')[1])-1;
    return { monthName: names[moIdx], weightChange, workoutCount: mWorkouts.length,
      totalMinutes: mWorkouts.reduce(function(s,w){return s+w.duration;},0),
      avgSteps, avgMood, logCount: mEntries.length };
  };
  // ── ALGORITHM: Plateau Detection (range < 0.8 kg, stdDev < 0.3 i 2+ veckor) ──
  A.getPlateauDetection = function(entries, goalWeight) {
    if (entries.length < 7) return null;
    var sorted = entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
    var recent = sorted.slice(-14);
    if (recent.length < 5) return null;
    var weights = recent.map(function(e){return e.weight;});
    var mn = Math.min.apply(null,weights), mx = Math.max.apply(null,weights);
    var range = mx - mn;
    var avgW = weights.reduce(function(s,v){return s+v;},0)/weights.length;
    var variance = weights.reduce(function(s,v){return s+Math.pow(v-avgW,2);},0)/weights.length;
    var stdDev = Math.sqrt(variance);
    if (range >= 0.8 || stdDev >= 0.3) return null;
    // Also check that it's not already at goal
    if (avgW <= goalWeight + 0.5) return null;
    return { range: parseFloat(range.toFixed(1)), days: recent.length, avgWeight: parseFloat(avgW.toFixed(1)) };
  };
  // ── ALGORITHM: Workout ↔ Weight Correlation (Pearson per vecka) ──
  A.getWorkoutCorrelation = function(entries, workouts) {
    var ws = A.getWeeklyStats(entries, workouts).slice().reverse().slice(0, 12);
    if (ws.length < 4) return null;
    var validWeeks = ws.filter(function(w){ return w.change !== 0; });
    if (validWeeks.length < 4) return null;
    var n = validWeeks.length;
    var x = validWeeks.map(function(w){ return w.workoutCount; });
    var y = validWeeks.map(function(w){ return w.change; }); // negative = loss
    var meanX = x.reduce(function(s,v){return s+v;},0)/n;
    var meanY = y.reduce(function(s,v){return s+v;},0)/n;
    var num=0, denX=0, denY=0;
    for(var ci=0;ci<n;ci++){ num+=(x[ci]-meanX)*(y[ci]-meanY); denX+=Math.pow(x[ci]-meanX,2); denY+=Math.pow(y[ci]-meanY,2); }
    var corr = (denX*denY)>0 ? num/Math.sqrt(denX*denY) : 0;
    var activeWeeks  = validWeeks.filter(function(w){ return w.workoutCount >= 3; });
    var inactiveWeeks = validWeeks.filter(function(w){ return w.workoutCount < 2; });
    return {
      correlation: parseFloat(corr.toFixed(2)),
      activeAvg:   activeWeeks.length   ? parseFloat((activeWeeks.reduce(function(s,w){return s+w.change;},0)/activeWeeks.length).toFixed(2))   : null,
      inactiveAvg: inactiveWeeks.length ? parseFloat((inactiveWeeks.reduce(function(s,w){return s+w.change;},0)/inactiveWeeks.length).toFixed(2)) : null,
      activeCount: activeWeeks.length, inactiveCount: inactiveWeeks.length,
      weeksAnalyzed: n
    };
  };
  // ── ALGORITHM: Mood correlations ──
  A.getMoodAnalysis = function(entries, workouts, ouraData) {
    var moodEntries = entries.filter(function(e){ return e.mood; });
    if (moodEntries.length < 5) return null;
    var ouraByDate = {}; ouraData.forEach(function(d){ ouraByDate[d.date] = d; });
    var wByDate = {}; entries.forEach(function(e){ wByDate[e.date] = e.weight; });
    var addD = function(ds,n){ var dd=new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); };
    var sleepPairs=[], hrvPairs=[], stressPairs=[], wtPairs=[], stepPairs=[];
    moodEntries.forEach(function(e){
      var o = ouraByDate[e.date];
      if (o) {
        if (o.sleep_score != null) sleepPairs.push([o.sleep_score, e.mood]);
        if (o.hrv_avg != null) hrvPairs.push([o.hrv_avg, e.mood]);
        if (o.stress_high_min != null) stressPairs.push([o.stress_high_min, e.mood]);
        if (o.steps != null) stepPairs.push([o.steps, e.mood]);
      }
      var w1 = wByDate[addD(e.date,1)];
      if (w1 != null) wtPairs.push([e.mood, parseFloat((w1 - e.weight).toFixed(2))]);
    });
    var workoutDates = {}; workouts.forEach(function(w){ workoutDates[w.date] = true; });
    var wd = moodEntries.filter(function(e){ return workoutDates[e.date]; });
    var rd = moodEntries.filter(function(e){ return !workoutDates[e.date]; });
    var avgM = function(a){ return a.length ? a.reduce(function(s,e){ return s+e.mood; },0)/a.length : null; };
    var rows = [
      { name:'Nattens sömnpoäng → humör', r: A.calcPearson(sleepPairs), n: sleepPairs.length, posMeans:'bättre sömn → bättre humör', pairs: sleepPairs, xName:'Sömnpoäng' },
      { name:'Nattens HRV → humör', r: A.calcPearson(hrvPairs), n: hrvPairs.length, posMeans:'högre HRV → bättre humör', pairs: hrvPairs, xName:'HRV (ms)' },
      { name:'Dagens stress → humör', r: A.calcPearson(stressPairs), n: stressPairs.length, posMeans:'mer stress → bättre humör', pairs: stressPairs, xName:'Stress (min)' },
      { name:'Dagens steg → humör', r: A.calcPearson(stepPairs), n: stepPairs.length, posMeans:'fler steg → bättre humör', pairs: stepPairs, xName:'Steg' },
      { name:'Humör → nästa dags viktändring', r: A.calcPearson(wtPairs), n: wtPairs.length, posMeans:'bättre humör → vikt upp', pairs: wtPairs, xName:'Humör (1–5)' }
    ].filter(function(x){ return x.r != null; });
    // Starkaste sambandet (för scatterplot)
    var top = rows.slice().sort(function(a,b){ return Math.abs(b.r)-Math.abs(a.r); })[0] || null;
    // "Så ser dina bästa dagar ut": profil för toppdagar (4–5) vs bottendagar (1–2)
    var goodDays = moodEntries.filter(function(e){ return e.mood >= 4; });
    var badDays = moodEntries.filter(function(e){ return e.mood <= 2; });
    var profile = null;
    if (goodDays.length >= 3 && badDays.length >= 3) {
      var prof = function(days){
        var os = days.map(function(e){ return ouraByDate[e.date]; }).filter(function(o){ return o; });
        var avg = function(arr, key){ var v = arr.map(function(o){ return o[key]; }).filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
        var trained = days.filter(function(e){ return workoutDates[e.date]; }).length;
        return { sleep: avg(os,'sleep_score'), hrv: avg(os,'hrv_avg'), steps: avg(os,'steps'), sleepMin: avg(os,'total_sleep_min'), stress: avg(os,'stress_high_min'), trainedPct: Math.round(trained/days.length*100), n: days.length };
      };
      profile = { good: prof(goodDays), bad: prof(badDays) };
    }
    // Bästa veckodag för humör
    var byDow = {};
    moodEntries.forEach(function(e){ var d = new Date(e.date).getDay(); (byDow[d] = byDow[d] || []).push(e.mood); });
    var bestDow = null, bestDowAvg = 0, worstDow = null, worstDowAvg = 6;
    Object.keys(byDow).forEach(function(d){
      if (byDow[d].length < 3) return;
      var a = byDow[d].reduce(function(s,v){ return s+v; },0)/byDow[d].length;
      if (a > bestDowAvg) { bestDowAvg = a; bestDow = parseInt(d); }
      if (a < worstDowAvg) { worstDowAvg = a; worstDow = parseInt(d); }
    });
    if (!rows.length && (wd.length < 3 || rd.length < 3)) return null;
    return { rows: rows, top: top, profile: profile,
      bestDow: bestDow, bestDowAvg: bestDowAvg, worstDow: worstDow, worstDowAvg: worstDowAvg,
      workoutMood: avgM(wd), restMood: avgM(rd), nWorkout: wd.length, nRest: rd.length, n: moodEntries.length };
  };
  // ── ALGORITHM: Experiment (28d före vs efter, Cohen’s d) ──
  A.analyzeExperiment = function(exp, entries, ouraData, dayLogs) {
    var D = 28;
    var start = new Date(exp.date); start.setHours(0,0,0,0);
    var inBefore = function(ds){ var d = new Date(ds); return d < start && (start - d) <= D*86400000; };
    var inAfter = function(ds){ var d = new Date(ds); return d >= start && (d - start) < D*86400000; };
    var calc = function(vals) {
      var v = vals.filter(function(x){ return x != null; });
      if (v.length < 5) return null;
      var mu = v.reduce(function(a,b){ return a+b; },0)/v.length;
      var sd = Math.sqrt(v.reduce(function(s,x){ return s+Math.pow(x-mu,2); },0)/v.length);
      return { mu: mu, sd: sd, n: v.length };
    };
    var metrics = [
      ['🌙 Sömnpoäng', ouraData, 'sleep_score', 'up', 0],
      ['💗 HRV', ouraData, 'hrv_avg', 'up', 0],
      ['❤️ Vilopuls', ouraData, 'resting_hr', 'down', 0],
      ['🔥 Stress (min)', ouraData, 'stress_high_min', 'down', 0],
      ['👟 Steg', ouraData, 'steps', 'up', 0],
      ['😊 Humör', entries, 'mood', 'up', 1]
    ];
    var dlArr = Object.keys(dayLogs).map(function(k){ return Object.assign({ date: k }, dayLogs[k]); });
    if (dlArr.some(function(d){ return d.aptit != null; })) metrics.push(['🍽️ Aptit', dlArr, 'aptit', 'down', 1]);
    if (dlArr.some(function(d){ return d.alkohol != null; })) metrics.push(['🍷 Alkohol', dlArr, 'alkohol', 'down', 1]);
    if (dlArr.some(function(d){ return d.illamaende != null; })) metrics.push(['🤢 Illamående', dlArr, 'illamaende', 'down', 1]);
    var rows = metrics.map(function(m) {
      var b = calc(m[1].filter(function(x){ return inBefore(x.date); }).map(function(x){ return x[m[2]]; }));
      var a = calc(m[1].filter(function(x){ return inAfter(x.date); }).map(function(x){ return x[m[2]]; }));
      if (!b || !a) return null;
      var pooled = Math.sqrt(((b.n-1)*b.sd*b.sd + (a.n-1)*a.sd*a.sd) / Math.max(1, b.n+a.n-2)) || 1;
      return { name: m[0], before: b.mu, after: a.mu, d: (a.mu-b.mu)/pooled, better: m[3], dec: m[4], nB: b.n, nA: a.n };
    }).filter(function(x){ return x; });
    // Vikttakt före vs efter (kg/vecka via regression)
    var slope = function(es) {
      if (es.length < 5) return null;
      var t0 = new Date(es[0].date).getTime(), n = es.length, sx=0, sy=0, sxy=0, sxx=0;
      es.forEach(function(e){ var x = (new Date(e.date).getTime()-t0)/86400000; sx+=x; sy+=e.weight; sxy+=x*e.weight; sxx+=x*x; });
      return ((n*sxy-sx*sy)/((n*sxx-sx*sx)||1))*7;
    };
    var sortedE = entries.slice().sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
    var wB = slope(sortedE.filter(function(e){ return inBefore(e.date); }));
    var wA = slope(sortedE.filter(function(e){ return inAfter(e.date); }));
    var daysIn = Math.min(D, Math.floor((new Date() - start)/86400000));
    return { rows: rows, weightBefore: wB, weightAfter: wA, daysIn: Math.max(0, daysIn), window: D };
  };
  // ── ALGORITHM: Tvillingdagar (nearest neighbor mot idag) ──
  A.getTwinDays = function(ouraData, entries) {
    var ouraLatest = ouraData.length > 0 ? ouraData[0] : null;
    if (ouraData.length < 40 || !ouraLatest) return null;
    var feats = ['sleep_score','hrv_avg','resting_hr','stress_high_min','total_sleep_min'];
    var hist = ouraData.slice(1);
    var fstats = {};
    feats.forEach(function(f){
      var v = hist.map(function(d){ return d[f]; }).filter(function(x){ return x != null; });
      if (v.length < 20) return;
      var mu = v.reduce(function(a,b){ return a+b; },0)/v.length;
      var sd = Math.sqrt(v.reduce(function(s,x){ return s+Math.pow(x-mu,2); },0)/v.length) || 1;
      fstats[f] = { mu: mu, sd: sd };
    });
    var fkeys = Object.keys(fstats).filter(function(f){ return ouraLatest[f] != null; });
    if (fkeys.length < 3) return null;
    var dist = function(d) {
      var s = 0, n = 0;
      fkeys.forEach(function(f){
        if (d[f] == null) return;
        var z1 = (d[f]-fstats[f].mu)/fstats[f].sd, z0 = (ouraLatest[f]-fstats[f].mu)/fstats[f].sd;
        s += Math.pow(z1-z0, 2); n++;
      });
      return n >= 3 ? Math.sqrt(s/n) : null;
    };
    var scored = hist.map(function(d){ return { d: d, dist: dist(d) }; })
      .filter(function(x){ return x.dist != null; })
      .sort(function(a,b){ return a.dist - b.dist; }).slice(0, 5);
    if (scored.length < 3) return null;
    var addD = function(ds,n){ var dd = new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); };
    var moodBD = {}, wBD = {};
    entries.forEach(function(e){ if (e.mood) moodBD[e.date] = e.mood; wBD[e.date] = e.weight; });
    var avg = function(a){ return a.length ? a.reduce(function(x,y){ return x+y; },0)/a.length : null; };
    var moods = scored.map(function(x){ return moodBD[x.d.date]; }).filter(function(x){ return x != null; });
    var dws = scored.map(function(x){ var a = wBD[x.d.date], b = wBD[addD(x.d.date,1)]; return (a != null && b != null) ? b-a : null; }).filter(function(x){ return x != null; });
    var nextSleeps = scored.map(function(x){ var nd = ouraData.find(function(y){ return y.date === addD(x.d.date,1); }); return nd ? nd.sleep_score : null; }).filter(function(x){ return x != null; });
    var steps = scored.map(function(x){ return x.d.steps; }).filter(function(x){ return x != null; });
    return { days: scored, avgMood: avg(moods), nMood: moods.length, avgDw: avg(dws), nDw: dws.length,
      avgNextSleep: avg(nextSleeps), avgSteps: avg(steps), feats: fkeys.length };
  };
  // ── ALGORITHM: Receptet på dina bästa dagar ──
  A.getPerfectDayRecipe = function(ouraData, workouts) {
    var days = ouraData.filter(function(d){ return d.dagsform_score != null; });
    if (days.length < 30) return null;
    var sorted = days.slice().sort(function(a,b){ return b.dagsform_score - a.dagsform_score; });
    var cut = Math.max(5, Math.floor(days.length * 0.15));
    var top = sorted.slice(0, cut), rest = sorted.slice(cut);
    var byDate = {}; ouraData.forEach(function(d){ byDate[d.date] = d; });
    var workoutDates = {}; workouts.forEach(function(w){ workoutDates[w.date] = true; });
    var addD = function(ds,n){ var dd = new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); };
    var toMin = function(iso){ var dt = new Date(iso); var m = dt.getHours()*60+dt.getMinutes(); return m < 720 ? m+1440 : m; };
    var fmtT = function(m){ m = Math.round(m)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
    var prof = function(arr) {
      var avg = function(vals){ var v = vals.filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
      var beds = avg(arr.map(function(d){ return d.bedtime_start ? toMin(d.bedtime_start) : null; }));
      return {
        bed: beds != null ? fmtT(beds) : null,
        sleepMin: avg(arr.map(function(d){ return d.total_sleep_min; })),
        prevSteps: avg(arr.map(function(d){ var p = byDate[addD(d.date,-1)]; return p ? p.steps : null; })),
        prevStress: avg(arr.map(function(d){ var p = byDate[addD(d.date,-1)]; return p ? p.stress_high_min : null; })),
        prevTrainPct: Math.round(arr.filter(function(d){ return workoutDates[addD(d.date,-1)]; }).length / arr.length * 100),
        n: arr.length
      };
    };
    return { top: prof(top), rest: prof(rest), cutScore: Math.round(top[top.length-1].dagsform_score) };
  };
  // ── ALGORITHM: Monthly table (senaste 6 månaderna) ──
  A.getMonthlyTable = function(entries, workouts, ouraData) {
    if (!entries.length && !ouraData.length) return null;
    var byMonth = {};
    var ensure = function(m){ return byMonth[m] = byMonth[m] || { m: m, weights: [], mood: [], steps: [], passes: 0, min: 0, sleep: [], hrv: [] }; };
    entries.forEach(function(e){ var o = ensure(e.date.slice(0,7)); o.weights.push(e.weight); if (e.mood) o.mood.push(e.mood); });
    workouts.forEach(function(w){ var o = ensure(w.date.slice(0,7)); o.passes++; o.min += w.duration; });
    ouraData.forEach(function(d){ var o = ensure(d.date.slice(0,7)); if (d.steps != null) o.steps.push(d.steps); if (d.sleep_score != null) o.sleep.push(d.sleep_score); if (d.hrv_avg != null) o.hrv.push(d.hrv_avg); });
    var avg = function(a){ return a.length ? a.reduce(function(x,y){ return x+y; },0)/a.length : null; };
    var months = Object.keys(byMonth).sort().slice(-6);
    if (months.length < 2) return null;
    var rows = months.map(function(m){
      var o = byMonth[m];
      return { m: m, avgW: avg(o.weights), dW: null, mood: avg(o.mood), steps: avg(o.steps), passes: o.passes, min: o.min, sleep: avg(o.sleep), hrv: avg(o.hrv) };
    });
    for (var i = 1; i < rows.length; i++) { if (rows[i].avgW != null && rows[i-1].avgW != null) rows[i].dW = rows[i].avgW - rows[i-1].avgW; }
    return rows.reverse();
  };
  // ── ALGORITHM: Week comparison ──
  A.getWeekComparison = function(entries, workouts, ouraData, compareWeeks) {
    var today = new Date(); today.setHours(0,0,0,0);
    var dow = today.getDay();
    var mon = new Date(today); mon.setDate(today.getDate() - (dow===0?6:dow-1));
    var mkWeek = function(monday) {
      var end = new Date(monday); end.setDate(monday.getDate()+6); end.setHours(23,59,59,0);
      var inR = function(ds){ var d = new Date(ds); return d >= monday && d <= end; };
      var we = entries.filter(function(e){ return inR(e.date); });
      var ww = workouts.filter(function(w){ return inR(w.date); });
      var wo = ouraData.filter(function(d){ return inR(d.date); });
      var avg = function(arr, get){ var v = arr.map(get).filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
      var steps = avg(wo, function(d){ return d.steps; });
      if (steps == null) steps = avg(we, function(e){ return e.steps; });
      return {
        label: monday.toLocaleDateString('sv-SE',{day:'numeric',month:'short'}) + '–' + end.toLocaleDateString('sv-SE',{day:'numeric',month:'short'}),
        avgWeight: avg(we, function(e){ return e.weight; }),
        sleep: avg(wo, function(d){ return d.sleep_score; }),
        sleepMin: avg(wo, function(d){ return d.total_sleep_min; }),
        hrv: avg(wo, function(d){ return d.hrv_avg; }),
        rhr: avg(wo, function(d){ return d.resting_hr; }),
        stress: avg(wo, function(d){ return d.stress_high_min; }),
        mood: avg(we, function(e){ return e.mood; }),
        steps: steps,
        passes: ww.length,
        minutes: ww.reduce(function(s,w){ return s+w.duration; },0)
      };
    };
    var monPrev = new Date(mon); monPrev.setDate(mon.getDate()-compareWeeks*7);
    var monLast = new Date(mon); monLast.setDate(mon.getDate()-7);
    var a = mkWeek(mon), b = mkWeek(monPrev);
    if ((a.avgWeight == null && a.sleep == null) || (b.avgWeight == null && b.sleep == null)) return null;
    return { now: a, then: b, prev: mkWeek(monLast) };
  };
  A.getChartData = function(entries, goalWeight, height) {
    const sorted = entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
    return sorted.map(function(entry, idx) {
      const w7 = sorted.slice(Math.max(0, idx - 6), idx + 1);
      return {
        datum:   new Date(entry.date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }),
        vikt:    entry.weight,
        steg:    entry.steps || 0,
        humör:   entry.mood || null,
        bmi:     A.getBMI(entry.weight, height),
        målvikt: goalWeight,
        snitt7:  parseFloat((w7.reduce(function(s,e){return s+e.weight;},0) / w7.length).toFixed(2)),
      };
    });
  };
  A.getWeeklyReport = function(entries, workouts) {
    if (entries.length < 2) return null;
    var now = new Date(); now.setHours(0,0,0,0);
    var dow = now.getDay();
    var monday = new Date(now); monday.setDate(now.getDate() - (dow===0?6:dow-1));
    var lastMon = new Date(monday); lastMon.setDate(monday.getDate()-7);
    var lastSun = new Date(monday); lastSun.setDate(monday.getDate()-1);
    var lastWeekEntries = entries.filter(function(e){
      var d=new Date(e.date); return d>=lastMon && d<=lastSun;
    });
    if (lastWeekEntries.length < 2) return null;
    var weights = lastWeekEntries.map(function(e){return e.weight;}).sort(function(a,b){return a-b;});
    var avgW = (weights.reduce(function(s,v){return s+v;},0)/weights.length).toFixed(1);
    var change = (lastWeekEntries[lastWeekEntries.length-1].weight - lastWeekEntries[0].weight).toFixed(1);
    var lastWeekWorkouts = workouts.filter(function(w){
      var d=new Date(w.date); return d>=lastMon && d<=lastSun;
    });
    var totalMin = lastWeekWorkouts.reduce(function(s,w){return s+w.duration;},0);
    var steps = lastWeekEntries.filter(function(e){return e.steps;});
    var avgSteps = steps.length ? Math.round(steps.reduce(function(s,e){return s+e.steps;},0)/steps.length) : 0;
    return {
      weekLabel: lastMon.toLocaleDateString('sv-SE',{month:'short',day:'numeric'}) + '–' + lastSun.toLocaleDateString('sv-SE',{month:'short',day:'numeric'}),
      avgW: avgW, change: parseFloat(change),
      workouts: lastWeekWorkouts.length, totalMin: totalMin,
      avgSteps: avgSteps, logDays: lastWeekEntries.length
    };
  };
  A.getInsights = function(entries, workouts, weeklyStats, stepGoal) {
    if (entries.length < 7) return [];
    var insights = [];
    var sorted = entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});

    // Best day of week for weight loss
    var dayDiffs = {};
    for (var i = 1; i < sorted.length; i++) {
      var prev = sorted[i-1], cur = sorted[i];
      var diff = cur.weight - prev.weight;
      var day = new Date(cur.date).getDay();
      if (!dayDiffs[day]) dayDiffs[day] = [];
      dayDiffs[day].push(diff);
    }
    var dayNames = ['söndag','måndag','tisdag','onsdag','torsdag','fredag','lördag'];
    var bestDay = null, bestAvg = 0;
    Object.keys(dayDiffs).forEach(function(d) {
      var avg = dayDiffs[d].reduce(function(s,v){return s+v;},0)/dayDiffs[d].length;
      if (bestDay === null || avg < bestAvg) { bestDay = parseInt(d); bestAvg = avg; }
    });
    if (bestDay !== null && bestAvg < -0.05) {
      insights.push({ icon:'📅', text: 'Du tappar mest vikt på ' + dayNames[bestDay] + 'ar (snitt ' + bestAvg.toFixed(2) + ' kg)' });
    }

    // Steps vs weight correlation
    var stepsEntries = sorted.filter(function(e){return e.steps && e.steps > 0;});
    if (stepsEntries.length >= 5) {
      var stepG = stepGoal;
      var highSteps = stepsEntries.filter(function(e){return e.steps >= stepG;});
      var lowSteps  = stepsEntries.filter(function(e){return e.steps < stepG;});
      if (highSteps.length >= 3 && lowSteps.length >= 3) {
        var avgHigh = highSteps.reduce(function(s,e){return s+e.weight;},0)/highSteps.length;
        var avgLow  = lowSteps.reduce(function(s,e){return s+e.weight;},0)/lowSteps.length;
        if (avgHigh < avgLow - 0.3) {
          insights.push({ icon:'👟', text: 'Dagar med ' + stepG.toLocaleString('sv-SE') + '+ steg: snitt ' + avgHigh.toFixed(1) + ' kg. Under ' + stepG.toLocaleString('sv-SE') + ': ' + avgLow.toFixed(1) + ' kg' });
        }
      }
    }

    // Workout weeks vs non-workout weeks
    if (workouts.length >= 4) {
      var weekMap = {};
      workouts.forEach(function(w){
        var wk = w.date.slice(0,7) + '-W' + A.getWeekNumber(new Date(w.date));
        weekMap[wk] = (weekMap[wk]||0) + 1;
      });
      var activeWeeks = Object.keys(weekMap).filter(function(w){return weekMap[w]>=3;});
      if (activeWeeks.length >= 2) {
        var eightWeeksAgo = new Date(); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        var recentWos = workouts.filter(function(w){return new Date(w.date) >= eightWeeksAgo;});
        var recentWkMap = {};
        recentWos.forEach(function(w){ var wk = w.date.slice(0,7)+'-W'+A.getWeekNumber(new Date(w.date)); recentWkMap[wk]=(recentWkMap[wk]||0)+1; });
        var recentAvg = (recentWos.length / Math.max(1, Object.keys(recentWkMap).length)).toFixed(1);
        insights.push({ icon:'💪', text: 'Veckor med 3+ träningspass: bättre viktprogress. Ditt snitt: ' + recentAvg + ' pass/vecka (senaste 8v)' });
      }
    }

    // Trend last 14 days
    if (sorted.length >= 14) {
      var last14 = sorted.slice(-14);
      var first14w = last14[0].weight, last14w = last14[last14.length-1].weight;
      var rate14 = (last14w - first14w) / 2;
      if (Math.abs(rate14) > 0.05) {
        var dir = rate14 < 0 ? '↓ minskar' : '↑ ökar';
        insights.push({ icon:'📈', text: 'Senaste 2 veckorna: trend ' + dir + ' med ' + Math.abs(rate14).toFixed(2) + ' kg/vecka' });
      }
    }

    // Best weight ever
    var minW = Math.min.apply(null, sorted.map(function(e){return e.weight;}));
    var minEntry = sorted.find(function(e){return e.weight===minW;});
    var latest = sorted[sorted.length-1];
    if (latest.weight - minW > 0.5) {
      insights.push({ icon:'🏆', text: 'Lägsta vikt: ' + minW + ' kg (' + new Date(minEntry.date).toLocaleDateString('sv-SE',{month:'short',day:'numeric'}) + '). Nu ' + (latest.weight-minW).toFixed(1) + ' kg därifrån' });
    }

    // Best week (biggest single-week drop)
    if (weeklyStats.length > 1) {
      var bestWeekData = weeklyStats.slice().sort(function(a,b){return a.change-b.change;})[0];
      if (bestWeekData && bestWeekData.change < -0.3) {
        insights.push({ icon:'📅', text: 'Bästa veckan: ' + bestWeekData.weekNumber + ' med ' + bestWeekData.change + ' kg (' + bestWeekData.workoutCount + ' träningspass)' });
      }
    }

    // Logging consistency
    if (sorted.length >= 14) {
      var firstDate = new Date(sorted[0].date), lastDate = new Date(sorted[sorted.length-1].date);
      var totalDays = Math.round((lastDate - firstDate) / 86400000) + 1;
      var logRate = Math.round(sorted.length / totalDays * 100);
      if (logRate >= 80) {
        insights.push({ icon:'🎯', text: 'Du loggar ' + logRate + '% av dagarna — utmärkt konsekvens!' });
      }
    }

    // Overall journey rate
    if (sorted.length >= 14) {
      var jDays = Math.round((new Date(sorted[sorted.length-1].date) - new Date(sorted[0].date)) / 86400000);
      var totalChange = sorted[sorted.length-1].weight - sorted[0].weight;
      if (jDays > 30 && totalChange < -1) {
        var wkRate = totalChange / (jDays/7);
        insights.push({ icon:'📊', text: 'Genomsnitt hela resan: ' + wkRate.toFixed(2) + ' kg/vecka. Totalt ' + Math.abs(totalChange).toFixed(1) + ' kg på ' + Math.round(jDays/7) + ' veckor' });
      }
    }

    return insights;
  };
  A.getBodyBattery = function(ouraData, workouts, dayLogs) {
    if (ouraData.length < 10) return null;
    var base = function(key){ var v = ouraData.slice(0,30).map(function(d){ return d[key]; }).filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
    var hrvB = base('hrv_avg'), rhrB = base('resting_hr');
    var trainByDate = {}; workouts.forEach(function(w){ trainByDate[w.date] = (trainByDate[w.date]||0) + w.duration; });
    var clamp = function(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); };
    var days = ouraData.slice(0,14).map(function(d){
      if (d.sleep_score == null) return { date: d.date, v: null };
      var parts = [{ n: 'Bas', v: 50, max: 50 }];
      var pS = (d.sleep_score - 70) * 0.8;
      parts.push({ n: '🌙 Sömn', v: pS, max: 24 });
      var v = 50 + pS;
      if (d.hrv_avg != null && hrvB) { var pH = clamp((d.hrv_avg - hrvB)/hrvB*60, -15, 15); v += pH; parts.push({ n: '💗 HRV', v: pH, max: 15 }); }
      if (d.resting_hr != null && rhrB) { var pR = -clamp((d.resting_hr - rhrB)*2, -10, 10); v += pR; parts.push({ n: '❤️ Vilopuls', v: pR, max: 10 }); }
      if (d.stress_high_min != null) { var pSt = -clamp(d.stress_high_min*0.1, 0, 20); v += pSt; parts.push({ n: '🔥 Stress', v: pSt, max: 20 }); }
      var pT = -clamp((trainByDate[d.date]||0)*0.08, 0, 10); v += pT; parts.push({ n: '💪 Träning', v: pT, max: 10 });
      var dl = dayLogs[d.date];
      var pA = (dl && dl.alkohol) ? -clamp(dl.alkohol*5, 0, 20) : 0; v += pA; parts.push({ n: '🍷 Alkohol', v: pA, max: 20 });
      if (dl && dl.sjuk) { v -= 15; parts.push({ n: '🤒 Sjuk', v: -15, max: 15 }); }
      return { date: d.date, v: Math.round(clamp(v, 0, 100)), parts: parts };
    }).reverse();
    var today = days[days.length-1];
    return { days: days, today: today && today.v != null ? today.v : null };
  };
  A.computeOuraStats = function(ouraData) {
    if (ouraData.length < 7) return null;
    var recent = ouraData.slice(0, 7);
    var avg = function(key) {
      var vals = recent.map(function(d){return d[key];}).filter(function(v){return v!=null;});
      return vals.length ? vals.reduce(function(a,b){return a+b;},0) / vals.length : null;
    };
    return {
      avgSleepScore: avg('sleep_score'),
      avgReadiness: avg('dagsform_score'),
      avgHrv: avg('hrv_avg'),
      avgRestingHr: avg('resting_hr'),
      avgSleepMin: avg('total_sleep_min')
    };
  };
  A.buildTitrationPlan = function(firstW, stepW) {
    var doses = [0.25, 0.5, 1.0, 1.7, 2.4];
    var plan = [], start = 1;
    for (var i = 0; i < doses.length; i++) {
      var len = i === 0 ? firstW : stepW;
      if (i === doses.length - 1) plan.push({ weeks: start + '+', dose: doses[i] });
      else { plan.push({ weeks: start + '-' + (start + len - 1), dose: doses[i] }); start += len; }
    }
    return plan;
  };
  // ── WEGOVY-MOTORER (rena, memoiseras i appen) ──────────────────────────────
  A.getWegovyWeeksOn = function(proto) {
    if (!proto || !proto.start_date) return 0;
    var ms = new Date() - new Date(proto.start_date);
    return Math.ceil(ms / (7*24*60*60*1000));
  };
  // Respons per dossteg + prognos + milstolpar + biverkningar + STEP 1-jämförelse
  A.getWegovyDoseResponse = function(entries, wegovyDoses, wegovyProtocol, goalWeight) {
    if (!wegovyDoses || !wegovyProtocol) return null;
    var wgStart = wegovyProtocol.start_date;
    var respEntries = wgStart ? entries.filter(function(e){return e.date>=wgStart;}).slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);}) : [];
    var dosesAsc = wegovyDoses.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
      if (!dosesAsc.length || respEntries.length < 2) return null;
      var periods = []; var cur = null;
      dosesAsc.forEach(function(d){
        if (!cur || d.dose !== cur.dose) {
          if (cur) cur.end = d.date;
          periods.push({ dose: d.dose, start: d.date, end: null });
          cur = periods[periods.length-1];
        }
      });
      var perStep = periods.map(function(p){
        var es = respEntries.filter(function(e){ return e.date >= p.start && (!p.end || e.date < p.end); });
        if (es.length < 2) return { dose: p.dose, rate: null, weeks: null };
        var days = (new Date(es[es.length-1].date) - new Date(es[0].date)) / 86400000;
        if (days < 3) return { dose: p.dose, rate: null, weeks: null };
        var rate = (es[es.length-1].weight - es[0].weight) / (days/7);
        return { dose: p.dose, rate: parseFloat(rate.toFixed(2)), weeks: Math.round(days/7 * 10) / 10 };
      });
      var recent = respEntries.filter(function(e){ return (new Date() - new Date(e.date)) <= 28*86400000; });
      var pace = null;
      if (recent.length >= 4) {
        var n = recent.length, sx=0, sy=0, sxy=0, sxx=0;
        var t0 = new Date(recent[0].date).getTime();
        recent.forEach(function(e){ var x = (new Date(e.date).getTime()-t0)/86400000; sx+=x; sy+=e.weight; sxy+=x*e.weight; sxx+=x*x; });
        var sl = (n*sxy - sx*sy) / ((n*sxx - sx*sx) || 1);
        pace = sl * 7;
      }
      var lastW = respEntries[respEntries.length-1].weight;
      var forecast = null;
      if (pace != null && pace < -0.05 && lastW > goalWeight) {
        var wks = Math.round((lastW - goalWeight) / Math.abs(pace));
        if (wks <= 200) { var fd = new Date(); fd.setDate(fd.getDate() + wks*7); forecast = { weeks: wks, date: fd }; }
      }
      if (!perStep.some(function(s){ return s.rate != null; }) && pace == null) return null;
      // Procentuell viktminskning + milstolpar
      var startW = respEntries[0].weight;
      var pctLoss = (startW - lastW) / startW * 100;
      var milestones = [5, 10, 15, 20].map(function(m){
        return { pct: m, kg: parseFloat((startW * m / 100).toFixed(1)), reached: pctLoss >= m };
      });
      var nextMs = milestones.find(function(m){ return !m.reached; }) || null;
      // Biverkningar per dosnivå
      var seByDose = {};
      dosesAsc.forEach(function(d){
        var k = d.dose;
        if (!seByDose[k]) seByDose[k] = { dose: k, total: 0, withSE: 0, effects: {} };
        seByDose[k].total++;
        if (d.side_effects && d.side_effects.trim()) { seByDose[k].withSE++; seByDose[k].effects[d.side_effects.trim().toLowerCase()] = true; }
      });
      var seRows = Object.values(seByDose).sort(function(a,b){ return a.dose - b.dose; });
      var anySE = seRows.some(function(r){ return r.withSE > 0; });
      // Typisk respons i kliniska studier (STEP 1, semaglutid 2.4 mg): interpolerad %-kurva
      var stepCurve = [[0,0],[4,2],[8,4],[12,6],[16,7.5],[20,9],[28,10.8],[36,12.4],[44,13.8],[52,14.5],[60,15],[68,15.3]];
      var typicalPct = null;
      var wk = A.getWegovyWeeksOn(wegovyProtocol);
      if (wk > 0) {
        var capped = Math.min(wk, 68);
        for (var si = 1; si < stepCurve.length; si++) {
          if (capped <= stepCurve[si][0]) {
            var a0 = stepCurve[si-1], a1 = stepCurve[si];
            typicalPct = a0[1] + (a1[1]-a0[1]) * (capped - a0[0]) / (a1[0]-a0[0]);
            break;
          }
        }
        if (typicalPct == null) typicalPct = 15.3;
      }
      // Prognosgraf: historik + trendlinje till mål
      var chart = null;
      if (pace != null && pace < -0.02) {
        var fWeeks = Math.min(30, forecast ? forecast.weeks : 30);
        chart = respEntries.map(function(e, i){
          return { datum: new Date(e.date).toLocaleDateString('sv-SE',{month:'short',day:'numeric'}), vikt: e.weight, prognos: i === respEntries.length-1 ? e.weight : null, mål: goalWeight };
        });
        var lastD = new Date(respEntries[respEntries.length-1].date);
        for (var fk = 1; fk <= fWeeks; fk++) {
          var fD = new Date(lastD); fD.setDate(lastD.getDate() + fk*7);
          var fV = Math.max(goalWeight, lastW + pace*fk);
          chart.push({ datum: fD.toLocaleDateString('sv-SE',{month:'short',day:'numeric'}), vikt: null, prognos: parseFloat(fV.toFixed(1)), mål: goalWeight });
          if (fV <= goalWeight) break;
        }
      }
      return { perStep: perStep, forecast: forecast, pace: pace != null ? parseFloat(pace.toFixed(2)) : null, lastW: lastW,
        startW: startW, pctLoss: parseFloat(pctLoss.toFixed(1)), milestones: milestones, nextMs: nextMs,
        seRows: seRows, anySE: anySE, typicalPct: typicalPct != null ? parseFloat(typicalPct.toFixed(1)) : null, weeksOn: wk, chart: chart };
  };
  // Takt över tid + signal vs brus
  A.getWegovyTakt = function(entries, wegovyProtocol) {
    if (!wegovyProtocol) return null;
    var wgStart = wegovyProtocol.start_date;
    var respEntries = wgStart ? entries.filter(function(e){return e.date>=wgStart;}).slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);}) : [];
      if (respEntries.length < 10) return null;
      var wkMap = {};
      respEntries.forEach(function(e){ var wk = A.getWeekNumber(e.date); (wkMap[wk] = wkMap[wk] || []).push(e.weight); });
      var wks = Object.keys(wkMap).sort();
      var bars = null;
      if (wks.length >= 3) {
        var avgs = wks.map(function(k){ var a = wkMap[k]; return a.reduce(function(x,y){ return x+y; },0)/a.length; });
        bars = [];
        for (var i = 1; i < wks.length; i++) {
          bars.push({ label: A.getISOWeekNumber(wks[i]), takt: parseFloat((avgs[i]-avgs[i-1]).toFixed(2)) });
        }
        bars = bars.slice(-16);
      }
      var diffs = [];
      for (var j = 1; j < respEntries.length; j++) {
        var dd = (new Date(respEntries[j].date) - new Date(respEntries[j-1].date)) / 86400000;
        if (dd === 1) diffs.push(respEntries[j].weight - respEntries[j-1].weight);
      }
      var noise = null;
      if (diffs.length >= 10) {
        var mu = diffs.reduce(function(a,b){ return a+b; },0)/diffs.length;
        var sd = Math.sqrt(diffs.reduce(function(s,v){ return s+Math.pow(v-mu,2); },0)/diffs.length);
        var within = diffs.filter(function(v){ return Math.abs(v - mu) <= sd; }).length;
        noise = { sd: parseFloat(sd.toFixed(2)), muWeek: parseFloat((mu*7).toFixed(2)), n: diffs.length, withinPct: Math.round(within/diffs.length*100) };
      }
      return (bars || noise) ? { bars: bars, noise: noise } : null;
  };
  // Monte Carlo-prognos: bootstrap av egna veckoutfall (seedad mulberry32)
  A.getWegovyMonteCarlo = function(entries, wegovyProtocol, goalWeight) {
    if (!wegovyProtocol) return null;
    var wgStart = wegovyProtocol.start_date;
    var respEntries = wgStart ? entries.filter(function(e){return e.date>=wgStart;}).slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);}) : [];
      if (respEntries.length < 14 || !entries.length) return null;
      var wkMap = {};
      respEntries.forEach(function(e){ var wk = A.getWeekNumber(e.date); (wkMap[wk] = wkMap[wk] || []).push(e.weight); });
      var wks = Object.keys(wkMap).sort();
      if (wks.length < 5) return null;
      var avgs = wks.map(function(k){ var a = wkMap[k]; return a.reduce(function(x,y){ return x+y; },0)/a.length; });
      var deltas = [];
      for (var i = 1; i < avgs.length; i++) deltas.push(avgs[i]-avgs[i-1]);
      deltas = deltas.slice(-12);
      if (deltas.length < 4) return null;
      var lastW = respEntries[respEntries.length-1].weight;
      if (lastW <= goalWeight) return null;
      var tD = new Date();
      var tstr = tD.getFullYear()+''+String(tD.getMonth()+1).padStart(2,'0')+String(tD.getDate()).padStart(2,'0');
      var rnd = A.mulberry32(parseInt(tstr) || 42);
      var sims = 2000, horizon = 156, arrivals = [];
      for (var s = 0; s < sims; s++) {
        var w = lastW, t = null;
        for (var k = 1; k <= horizon; k++) {
          w += deltas[Math.floor(rnd()*deltas.length)];
          if (w <= goalWeight) { t = k; break; }
        }
        if (t != null) arrivals.push(t);
      }
      var pReach = arrivals.length/sims;
      if (!arrivals.length) return { pReach: 0, nDeltas: deltas.length };
      arrivals.sort(function(a,b){ return a-b; });
      var q = function(p){ return arrivals[Math.min(arrivals.length-1, Math.floor(p*arrivals.length))]; };
      var dt = function(wk){ var d = new Date(); d.setDate(d.getDate()+wk*7); return d.toLocaleDateString('sv-SE',{month:'long',year:'numeric'}); };
      return { pReach: Math.round(pReach*100), p50: q(0.5), d10: dt(q(0.1)), d50: dt(q(0.5)), d90: dt(q(0.9)), nDeltas: deltas.length };
  };
  // Injektionscykeln: mönster per dag efter dos
  A.getWegovyCycle = function(entries, ouraData, dayLogs, wegovyDoses) {
    if (!wegovyDoses) return null;
    var dosesAsc = wegovyDoses.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
      if (dosesAsc.length < 3) return null;
      var addDaysStr = function(ds, n){ var dd = new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0'); };
      var wBD = {}, mBD = {}, sBD = {};
      entries.forEach(function(e){ wBD[e.date] = e.weight; if (e.mood) mBD[e.date] = e.mood; });
      ouraData.forEach(function(d){ if (d.sleep_score != null) sBD[d.date] = d.sleep_score; });
      var offsets = [];
      for (var o = 0; o < 7; o++) offsets.push({ o: o, dw: [], mood: [], sleep: [], aptit: [], illa: [] });
      dosesAsc.forEach(function(d){
        for (var o = 0; o < 7; o++) {
          var day = addDaysStr(d.date, o), next = addDaysStr(d.date, o+1);
          if (wBD[day] != null && wBD[next] != null) offsets[o].dw.push(wBD[next] - wBD[day]);
          if (mBD[day] != null) offsets[o].mood.push(mBD[day]);
          if (sBD[day] != null) offsets[o].sleep.push(sBD[day]);
          var dl = dayLogs[day];
          if (dl && dl.aptit != null) offsets[o].aptit.push(dl.aptit);
          if (dl && dl.illamaende != null) offsets[o].illa.push(dl.illamaende);
        }
      });
      var avg = function(a){ return a.length ? a.reduce(function(x,y){ return x+y; },0)/a.length : null; };
      var rows = offsets.map(function(x){ return { o: x.o, dw: avg(x.dw), nDw: x.dw.length, mood: avg(x.mood), sleep: avg(x.sleep), aptit: avg(x.aptit), illa: avg(x.illa) }; });
      if (!rows.some(function(r){ return r.dw != null && r.nDw >= 3; })) return null;
      var withDw = rows.filter(function(r){ return r.dw != null; });
      var bestDay = withDw.length ? withDw.reduce(function(p,c){ return c.dw < p.dw ? c : p; }) : null;
      var worstDay = withDw.length ? withDw.reduce(function(p,c){ return c.dw > p.dw ? c : p; }) : null;
      return { rows: rows, bestDay: bestDay, worstDay: worstDay, nDoses: dosesAsc.length };
  };
  // Kroppsbatteri vs Ouras dagsform — samvariation (Samband-kortet i Oura-vyn).
  // Samma formel som getBodyBattery men över upp till 120 dagar, parat med dagsform_score.
  A.getBatteryVsForm = function(ouraData, workouts, dayLogs) {
    if (!ouraData || ouraData.length < 20) return null;
    var base = function(key){ var v = ouraData.slice(0,30).map(function(d){ return d[key]; }).filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
    var hrvB = base('hrv_avg'), rhrB = base('resting_hr');
    var trainByDate = {}; (workouts || []).forEach(function(w){ trainByDate[w.date] = (trainByDate[w.date]||0) + w.duration; });
    var clamp = function(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); };
    var points = [];
    ouraData.slice(0, 120).forEach(function(d){
      if (d.sleep_score == null || d.dagsform_score == null) return;
      var v = 50 + (d.sleep_score - 70) * 0.8;
      if (d.hrv_avg != null && hrvB) v += clamp((d.hrv_avg - hrvB)/hrvB*60, -15, 15);
      if (d.resting_hr != null && rhrB) v += -clamp((d.resting_hr - rhrB)*2, -10, 10);
      if (d.stress_high_min != null) v += -clamp(d.stress_high_min*0.1, 0, 20);
      v += -clamp((trainByDate[d.date]||0)*0.08, 0, 10);
      var dl = (dayLogs || {})[d.date];
      if (dl && dl.alkohol) v += -clamp(dl.alkohol*5, 0, 20);
      if (dl && dl.sjuk) v -= 15;
      points.push({ x: Math.round(clamp(v, 0, 100)), y: d.dagsform_score, date: d.date });
    });
    if (points.length < 15) return null;
    var r = A.calcPearson(points.map(function(p){ return [p.x, p.y]; }));
    if (r == null) return null;
    return { points: points, r: parseFloat(r.toFixed(2)), n: points.length };
  };
  // ── OURA-VYNS MOTORER (rena, memoiseras i appen) ─────────────────────────────
  // Hälsoflaggor, kroppslarm, baslinjer (7d vs 30d), trender & rekord
  A.getOuraHealth = function(ouraData) {
    if (!ouraData || !ouraData.length) return null;
    var oAvg = function(arr,key){ var v=arr.map(function(d){return d[key];}).filter(function(x){return x!=null;}); return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null; };
    var last7 = ouraData.slice(0,7), prior30 = ouraData.slice(7,37), prev7 = ouraData.slice(7,14);
    var flags = [];
    // Hur många av senaste 7 dagarna som avviker (varaktighet)
    var devDays = function(key, test) {
      var base = oAvg(prior30, key);
      if (base == null) return { base: null, days: 0 };
      var n = 0;
      last7.forEach(function(d){ if (d[key] != null && test(d[key], base)) n++; });
      return { base: base, days: n };
    };
    var durTxt = function(n){ return n >= 2 ? ' Pågått ' + n + ' av senaste 7 dagarna.' : ''; };
    var hrv7=oAvg(last7,'hrv_avg'), hrvBase=oAvg(prior30,'hrv_avg');
    var hrvDev = devDays('hrv_avg', function(v,b){ return v < b*0.8; });
    if(hrv7!=null && hrvBase!=null && hrv7 < hrvBase*0.8) flags.push({lvl:'warn',icon:'💔',key:'hrv',text:'HRV ligger '+Math.round((1-hrv7/hrvBase)*100)+'% under din 30-dagarsnivå ('+Math.round(hrv7)+' vs '+Math.round(hrvBase)+' ms).'+durTxt(hrvDev.days)});
    var rhr7=oAvg(last7,'resting_hr'), rhrBase=oAvg(prior30,'resting_hr');
    var rhrDev = devDays('resting_hr', function(v,b){ return v > b+4; });
    if(rhr7!=null && rhrBase!=null && rhr7 > rhrBase+4) flags.push({lvl:'warn',icon:'❤️',key:'rhr',text:'Vilopulsen är förhöjd ('+Math.round(rhr7)+' vs '+Math.round(rhrBase)+' i snitt).'+durTxt(rhrDev.days)});
    var tempSpike = ouraData.slice(0,3).find(function(d){return d.temp_dev!=null && d.temp_dev>=0.5;});
    if(tempSpike) flags.push({lvl:'warn',icon:'🌡️',key:'temp',text:'Förhöjd kroppstemperatur (+'+tempSpike.temp_dev+'°) senaste dygnen — kan vara stress eller begynnande infektion.'});
    var lowSpo2 = ouraData.slice(0,7).find(function(d){return d.spo2_avg!=null && d.spo2_avg<94;});
    if(lowSpo2) flags.push({lvl:'info',icon:'🫁',text:'Låg syresättning en natt ('+lowSpo2.spo2_avg+'%).'});
    var poorSleep = ouraData.slice(0,5).filter(function(d){return d.sleep_score!=null && d.sleep_score<70;});
    if(poorSleep.length>=3) flags.push({lvl:'info',icon:'😴',text:poorSleep.length+' av senaste 5 nätterna under sömnpoäng 70.'});
    var br7=oAvg(last7,'breath_avg'), brBase=oAvg(prior30,'breath_avg');
    var brDev = devDays('breath_avg', function(v,b){ return v > b+1.5; });
    if(br7!=null && brBase!=null && br7 > brBase+1.5) flags.push({lvl:'warn',icon:'🫁',key:'breath',text:'Andningsfrekvensen i sömn är förhöjd ('+br7.toFixed(1)+' vs '+brBase.toFixed(1)+' andetag/min) — kan tyda på stress eller begynnande infektion.'+durTxt(brDev.days)});
    var shr7=oAvg(last7,'avg_hr_sleep'), shrBase=oAvg(prior30,'avg_hr_sleep');
    if(shr7!=null && shrBase!=null && shr7 > shrBase+4) flags.push({lvl:'warn',icon:'💓',key:'shr',text:'Sömnpulsen ligger högre än vanligt ('+Math.round(shr7)+' vs '+Math.round(shrBase)+' slag/min i snitt).'});
    var eff7=oAvg(last7,'sleep_efficiency');
    if(eff7!=null && eff7 < 80) flags.push({lvl:'info',icon:'🛏️',text:'Sömneffektiviteten har varit låg ('+Math.round(eff7)+'%) — mycket vaken tid i sängen.'});
    // Kroppslarm: flera fysiologiska mått avviker samtidigt (senaste 3 dygnen)
    var bodyAlarm = (function(){
      var last3 = ouraData.slice(0,3);
      if (last3.length < 2) return null;
      var a3 = function(key){ var v=last3.map(function(d){return d[key];}).filter(function(x){return x!=null;}); return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null; };
      var hits = [];
      var t3 = a3('temp_dev'); if (t3 != null && t3 >= 0.3) hits.push('temperatur');
      var r3 = a3('resting_hr'); if (r3 != null && rhrBase != null && r3 > rhrBase + 3) hits.push('vilopuls');
      var b3 = a3('breath_avg'); if (b3 != null && brBase != null && b3 > brBase + 1) hits.push('andning');
      var h3 = a3('hrv_avg'); if (h3 != null && hrvBase != null && h3 < hrvBase * 0.82) hits.push('HRV');
      return hits.length >= 2 ? hits : null;
    })();
    // Baslinjetabell: 7 dagar vs 30 dagar
    var baselineRows = [
      ['💗 HRV', hrv7, hrvBase, ' ms', 'up'],
      ['❤️ Vilopuls', rhr7, rhrBase, '', 'down'],
      ['💓 Sömnpuls', shr7, shrBase, '', 'down'],
      ['🫁 Andning', br7, brBase, ' /min', 'down'],
      ['🛏️ Sömneffektivitet', eff7, oAvg(prior30,'sleep_efficiency'), '%', 'up'],
      ['🌙 Sömnpoäng', oAvg(last7,'sleep_score'), oAvg(prior30,'sleep_score'), '', 'up']
    ].filter(function(r){ return r[1] != null && r[2] != null; });
    var trendMetrics = [{key:'sleep_score',name:'Sömnpoäng',better:'up'},{key:'hrv_avg',name:'HRV',better:'up'},{key:'resting_hr',name:'Vilopuls',better:'down'},{key:'steps',name:'Steg',better:'up'}];
    var trends = trendMetrics.map(function(m){ var a=oAvg(last7,m.key), b=oAvg(prev7,m.key); if(a==null||b==null) return null; return {name:m.name, now:Math.round(a), diff:a-b, better:m.better}; }).filter(function(x){return x;});
    var maxBy=function(key){ var a=ouraData.filter(function(d){return d[key]!=null;}); return a.length?a.reduce(function(p,c){return c[key]>p[key]?c:p;}):null; };
    var minBy=function(key){ var a=ouraData.filter(function(d){return d[key]!=null;}); return a.length?a.reduce(function(p,c){return c[key]<p[key]?c:p;}):null; };
    var recBestSleep=maxBy('sleep_score'), recMaxHrv=maxBy('hrv_avg'), recMinRhr=minBy('resting_hr'), recMaxSteps=maxBy('steps');
    return { flags: flags, bodyAlarm: bodyAlarm, baselineRows: baselineRows, trends: trends,
      records: { bestSleep: recBestSleep, maxHrv: recMaxHrv, minRhr: recMinRhr, maxSteps: recMaxSteps } };
  };
  // Veckocoach (regelbaserad sammanfattning)
  A.getOuraCoach = function(ouraData, entries, stepGoal) {
    var oAvg = function(arr,key){ var v=arr.map(function(d){return d[key];}).filter(function(x){return x!=null;}); return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null; };
    var last7 = ouraData.slice(0,7), prev7 = ouraData.slice(7,14);
      if(last7.length<3) return null;
      var sleepNow=oAvg(last7,'sleep_score'), hrvNow=oAvg(last7,'hrv_avg'), hrvPrev=oAvg(prev7,'hrv_avg');
      var stepsNow=oAvg(last7,'steps'), stressNow=oAvg(last7,'stress_high_min');
      var rc=entries.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);}).filter(function(e){ return (new Date() - new Date(e.date)) <= 7*86400000; });
      var viktChange = rc.length>=2 ? rc[rc.length-1].weight - rc[0].weight : null;
      var parts=[], tips=[], tone='mixed';
      if(sleepNow!=null){
        if(sleepNow>=80) parts.push('Sömnen har varit stark (snitt ' + Math.round(sleepNow) + ').');
        else if(sleepNow>=70) parts.push('Sömnen har varit okej (snitt ' + Math.round(sleepNow) + ').');
        else { parts.push('Sömnen har varit låg (snitt ' + Math.round(sleepNow) + ').'); tips.push('Prioritera läggtiden — sikta på 7–8 h och samma tid varje kväll.'); }
      }
      if(hrvNow!=null && hrvPrev!=null){
        if(hrvNow < hrvPrev*0.9){ parts.push('Återhämtningen är på väg ned — HRV har sjunkit mot veckan innan.'); tips.push('Lägg in en lugn dag eller extra vila innan nästa hårda pass.'); tone='tough'; }
        else if(hrvNow > hrvPrev*1.1){ parts.push('Återhämtningen ser stark ut — HRV har stigit.'); if(tone!=='tough') tone='good'; }
      }
      if(stepsNow!=null){
        if(stepsNow<stepGoal*0.875){ parts.push('Aktiviteten har varit låg (' + Math.round(stepsNow).toLocaleString('sv-SE') + ' steg/dag).'); tips.push('Lägg till en extra 20-minuterspromenad om dagen.'); }
        else if(stepsNow>=10000) parts.push('Bra aktivitetsnivå (' + Math.round(stepsNow).toLocaleString('sv-SE') + ' steg/dag).');
      }
      if(viktChange!=null){
        if(viktChange<=-0.3){ parts.push('Vikten är på väg ned (' + viktChange.toFixed(1) + ' kg denna vecka) — åt rätt håll.'); if(tone!=='tough') tone='good'; }
        else if(viktChange>=0.3){ parts.push('Vikten gick upp lite (+' + viktChange.toFixed(1) + ' kg) — ofta vätska, men håll koll.'); }
        else parts.push('Vikten ligger stabil denna vecka.');
      }
      if(stressNow!=null && stressNow>120) tips.push('Höga stressnivåer — lägg in andningspauser eller en kort promenad mitt på dagen.');
      if(!tips.length) tips.push('Fortsätt som du gör — det funkar.');
      var headline = tone==='good'?'Stark vecka 💪' : tone==='tough'?'Kroppen behöver vila 🛌' : 'Stabil vecka 👍';
      return { headline:headline, paragraph:parts.join(' '), tips:tips.slice(0,3), tone:tone };
  };
  // Samband: Oura-mått vs nästa dags viktförändring
  A.getOuraWeightCorr = function(ouraData, entries, dayLogs) {
    var wByDate = {};
    entries.forEach(function(e){ wByDate[e.date] = e.weight; });
    var addDays = function(ds,n){ var dd=new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); };
    
    var sambandMetrics = [
      {key:'sleep_score',name:'Sömnpoäng',up:'bättre sömn'},
      {key:'hrv_avg',name:'HRV',up:'högre HRV'},
      {key:'dagsform_score',name:'Dagsform',up:'bättre dagsform'},
      {key:'resting_hr',name:'Vilopuls',up:'högre vilopuls'},
      {key:'steps',name:'Steg',up:'fler steg'},
      {key:'total_cal',name:'Kalorier (tot)',up:'fler kalorier'},
      {key:'stress_high_min',name:'Stress',up:'mer stress'},
      {key:'sleep_efficiency',name:'Sömneffektivitet',up:'bättre effektivitet'}
    ];
    var corr = sambandMetrics.map(function(m){
      var pairs=[];
      ouraData.forEach(function(d){ var v=d[m.key]; if(v==null) return; var w0=wByDate[d.date], w1=wByDate[addDays(d.date,1)]; if(w0!=null&&w1!=null) pairs.push([v, parseFloat((w1-w0).toFixed(2))]); });
      return {name:m.name, key:m.key, up:m.up, r:A.calcPearson(pairs), n:pairs.length, pairs:pairs};
    }).filter(function(x){return x.r!=null;});
    // 🪡 Spikmatta (daglig tagg) vs nästa dags viktförändring — point-biserial (0/1)
    var dl = dayLogs || {};
    var anySpik = Object.keys(dl).some(function(k){ return dl[k] && dl[k].spikmatta; });
    if (anySpik) {
      var sp = [];
      ouraData.forEach(function(d){ var w0=wByDate[d.date], w1=wByDate[addDays(d.date,1)]; if(w0!=null&&w1!=null) sp.push([(dl[d.date] && dl[d.date].spikmatta)?1:0, parseFloat((w1-w0).toFixed(2))]); });
      var rsp = A.calcPearson(sp);
      if (rsp != null && isFinite(rsp)) corr.push({ name:'🪡 Spikmatta', key:'spikmatta', up:'spikmatta-dag', r:rsp, n:sp.length, pairs:sp });
    }
    corr.sort(function(a,b){return Math.abs(b.r)-Math.abs(a.r);});
    var topCorr = corr[0] || null;
    return { corr: corr, topCorr: topCorr };
  };
  // Lag-korrelationsmatris: vad idag påverkar vad imorgon
  A.getOuraLagMatrix = function(ouraData, workouts, entries, dayLogs) {
    var wByDate = {}; entries.forEach(function(e){ wByDate[e.date] = e.weight; });
    var addDays = function(ds,n){ var dd=new Date(ds); dd.setDate(dd.getDate()+n); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); };
      var mSleep={}, mHrv={}, mSteps={}, mStress={}, mTrain={}, mMood={};
      ouraData.forEach(function(d){
        if(d.sleep_score!=null) mSleep[d.date]=d.sleep_score;
        if(d.hrv_avg!=null) mHrv[d.date]=d.hrv_avg;
        if(d.steps!=null) mSteps[d.date]=d.steps;
        if(d.stress_high_min!=null) mStress[d.date]=d.stress_high_min;
        mTrain[d.date]=0;
      });
      workouts.forEach(function(w){ mTrain[w.date]=(mTrain[w.date]||0)+w.duration; });
      entries.forEach(function(e){ if(e.mood) mMood[e.date]=e.mood; });
      var mAptit={}, mAlk={};
      var anyAlk = Object.keys(dayLogs).some(function(k){ return dayLogs[k].alkohol != null; });
      Object.keys(dayLogs).forEach(function(k){ if (dayLogs[k].aptit != null) mAptit[k] = dayLogs[k].aptit; });
      if (anyAlk) ouraData.forEach(function(d){ mAlk[d.date] = (dayLogs[d.date] && dayLogs[d.date].alkohol) || 0; });
      var drivers=[['🌙 Sömn',mSleep],['💗 HRV',mHrv],['👟 Steg',mSteps],['🔥 Stress',mStress],['💪 Träning',mTrain],['😊 Humör',mMood]];
      if (Object.keys(mAptit).length >= 8) drivers.push(['🍽️ Aptit', mAptit]);
      if (anyAlk) drivers.push(['🍷 Alkohol', mAlk]);
      var outcomes=[['Humör',mMood],['Sömn',mSleep],['HRV',mHrv],['ViktΔ',null]];
      var cells=drivers.map(function(dr){
        return outcomes.map(function(oc){
          var pairs=[];
          Object.keys(dr[1]).forEach(function(ds){
            var nd=addDays(ds,1), y;
            if(oc[1]===null){ if(wByDate[ds]==null||wByDate[nd]==null) return; y=wByDate[nd]-wByDate[ds]; }
            else { y=oc[1][nd]; if(y==null) return; }
            pairs.push([dr[1][ds], y]);
          });
          return { r: pairs.length>=8 ? A.calcPearson(pairs) : null, n: pairs.length };
        });
      });
      var any=cells.some(function(row){ return row.some(function(c){ return c.r!=null; }); });
      return any ? { drivers: drivers.map(function(d){return d[0];}), outcomes: outcomes.map(function(o){return o[0];}), cells: cells } : null;
  };
  // Sömnregularitet & social jetlag (30 nätter)
  A.getOuraSleepRegularity = function(ouraData) {
      var nights = ouraData.slice(0,30).filter(function(d){ return d.total_sleep_min != null; });
      if (nights.length < 10) return null;
      var mins = nights.map(function(d){ return d.total_sleep_min; });
      var mu = mins.reduce(function(a,b){ return a+b; },0)/mins.length;
      var sd = Math.sqrt(mins.reduce(function(s,v){ return s+Math.pow(v-mu,2); },0)/mins.length);
      var isWkend = function(d){ var dow = new Date(d.date).getDay(); return dow===0 || dow===6; };
      var we = nights.filter(isWkend), wd = nights.filter(function(d){ return !isWkend(d); });
      var avgT = function(a){ return a.length ? a.reduce(function(x,y){ return x+y.total_sleep_min; },0)/a.length : null; };
      var weA = avgT(we), wdA = avgT(wd);
      var jetlag = (weA != null && wdA != null && we.length >= 4) ? Math.round(weA - wdA) : null;
      var grade = sd < 30 ? ['Utmärkt','text-green-600'] : sd < 45 ? ['Bra','text-green-500'] : sd < 60 ? ['Okej','text-amber-500'] : ['Ojämn','text-red-500'];
      return { sd: Math.round(sd), mu: mu, jetlag: jetlag, grade: grade, n: nights.length };
  };
  // Ovanlig natt: percentilrank mot hela historiken
  A.getOuraUnusualNight = function(ouraData) {
    var ouraLatest = ouraData.length > 0 ? ouraData[0] : null;
      if (!ouraLatest || ouraData.length < 30) return [];
      var res = [];
      [['sleep_score','Sömnpoängen','high'],['hrv_avg','HRV:n','high'],['resting_hr','Vilopulsen','low'],['total_sleep_min','Sömntiden','high']].forEach(function(m){
        var vals = ouraData.map(function(d){ return d[m[0]]; }).filter(function(v){ return v != null; });
        var v = ouraLatest[m[0]];
        if (v == null || vals.length < 30) return;
        var below = vals.filter(function(x){ return x < v; }).length;
        var pct = below / vals.length * 100;
        if (pct >= 92) res.push({ t: m[1] + ' i natt var bland dina ' + Math.max(1, Math.round(100-pct)) + '% högsta någonsin', good: m[2] === 'high' });
        else if (pct <= 8) res.push({ t: m[1] + ' i natt var bland dina ' + Math.max(1, Math.round(pct)) + '% lägsta någonsin', good: m[2] === 'low' });
      });
      return res;
  };
  // Läggtid & kronotyp
  A.getOuraBedtime = function(ouraData) {
      var nights = ouraData.filter(function(d){ return d.bedtime_start; }).slice(0, 90);
      if (nights.length < 7) return null;
      // Minuter sedan midnatt, +24h om före kl 12 (så 23:30=1410, 00:30=1470)
      var toMin = function(iso){ var dt = new Date(iso); var m = dt.getHours()*60 + dt.getMinutes(); return m < 720 ? m + 1440 : m; };
      var fmtT = function(m){ m = Math.round(m) % 1440; return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); };
      var beds = nights.map(function(d){ return { min: toMin(d.bedtime_start), sleep: d.sleep_score, date: d.date }; });
      var mins = beds.map(function(b){ return b.min; });
      var mu = mins.reduce(function(a,b){ return a+b; },0)/mins.length;
      var sd = Math.sqrt(mins.reduce(function(s,v){ return s+Math.pow(v-mu,2); },0)/mins.length);
      var wakes = nights.filter(function(d){ return d.bedtime_end; }).map(function(d){ var dt = new Date(d.bedtime_end); return dt.getHours()*60 + dt.getMinutes(); });
      var wakeMu = wakes.length ? wakes.reduce(function(a,b){ return a+b; },0)/wakes.length : null;
      // Helg vs vardag läggtid (kväll före: fre+lör kväll = helgkväll)
      var isWkendEve = function(iso){ var dow = new Date(iso).getDay(); return dow === 5 || dow === 6; };
      var weB = beds.filter(function(b,i){ return nights[i].bedtime_start && isWkendEve(nights[i].bedtime_start); });
      var wdB = beds.filter(function(b,i){ return nights[i].bedtime_start && !isWkendEve(nights[i].bedtime_start); });
      var avgB = function(a){ return a.length ? a.reduce(function(x,y){ return x+y.min; },0)/a.length : null; };
      var shift = (weB.length >= 3 && wdB.length >= 5) ? Math.round(avgB(weB) - avgB(wdB)) : null;
      // Optimal läggtid: 30-minutersfack, minst 5 nätter, ranka på sömnpoäng
      var buckets = {};
      beds.forEach(function(b){ if (b.sleep == null) return; var k = Math.floor(b.min/30)*30; (buckets[k] = buckets[k] || []).push(b.sleep); });
      var bRows = Object.keys(buckets).filter(function(k){ return buckets[k].length >= 5; }).map(function(k){
        return { from: fmtT(parseInt(k)), to: fmtT(parseInt(k)+30), avg: buckets[k].reduce(function(a,b){ return a+b; },0)/buckets[k].length, n: buckets[k].length };
      }).sort(function(a,b){ return b.avg - a.avg; });
      return { n: nights.length, avgBed: fmtT(mu), sd: Math.round(sd), avgWake: wakeMu != null ? fmtT(wakeMu) : null,
        midpoint: wakeMu != null ? fmtT((mu + (wakeMu + 1440))/2) : null, shift: shift,
        best: bRows[0] || null, worst: bRows.length > 1 ? bRows[bRows.length-1] : null, buckets: bRows };
  };
  // Aktivitetsbalans (30 dagar)
  A.getOuraActivityBalance = function(ouraData) {
      var days = ouraData.slice(0, 30).filter(function(d){ return d.sedentary_min != null; });
      if (days.length < 7) return null;
      var avg = function(key){ var v = days.map(function(d){ return d[key]; }).filter(function(x){ return x != null; }); return v.length ? v.reduce(function(a,b){ return a+b; },0)/v.length : null; };
      var hi = avg('high_act_min'), me = avg('med_act_min'), lo = avg('low_act_min'), sed = avg('sedentary_min');
      var alerts = avg('inactivity_alerts'), met = avg('met_min');
      // Stillasittande vs samma natts sömn
      var pairs = [];
      ouraData.forEach(function(d){
        if (d.sedentary_min == null) return;
        var next = ouraData.find(function(x){ return x.date === (function(){ var dd = new Date(d.date); dd.setDate(dd.getDate()+1); return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'); })(); });
        if (next && next.sleep_score != null) pairs.push([d.sedentary_min, next.sleep_score]);
      });
      var rSed = A.calcPearson(pairs);
      return { n: days.length, hi: hi, me: me, lo: lo, sed: sed, alerts: alerts, met: met, rSed: rSed, nSed: pairs.length };
  };
  // Långsiktiga mått (senaste värde)
  A.getOuraLongTerm = function(ouraData) {
      var latestOf = function(key){ var d = ouraData.find(function(x){ return x[key] != null; }); return d ? { v: d[key], date: d.date } : null; };
      var res = { resilience: latestOf('resilience'), vo2: latestOf('vo2max'), cardio: latestOf('cardio_age') };
      return (res.resilience || res.vo2 || res.cardio) ? res : null;
  };
  // Sömnbanken: ackumulerad skuld/överskott 14 nätter
  A.getOuraSleepBank = function(ouraData, sleepNeed) {
      var nights = ouraData.slice(0, 14).filter(function(d){ return d.total_sleep_min != null; });
      if (nights.length < 7) return null;
      var need = sleepNeed || 450;
      var balance = nights.reduce(function(s,d){ return s + (d.total_sleep_min - need); }, 0);
      var bars = nights.slice().reverse().map(function(d){ return { date: d.date, diff: d.total_sleep_min - need }; });
      var payback = balance < 0 ? Math.ceil(Math.abs(balance) / 60) : null;
      return { balance: Math.round(balance), bars: bars, need: need, n: nights.length, payback: payback };
  };
  // Dagsljus & säsong (astronomisk beräkning, inget API)
  A.getOuraDaylight = function(ouraData, entries, latitude) {
      var lat = latitude != null ? latitude : 59.3;
      var dayLenH = function(date) {
        var J = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        var decl = 23.45 * Math.sin(2*Math.PI*(284+J)/365) * Math.PI/180;
        var x = -Math.tan(lat*Math.PI/180) * Math.tan(decl);
        if (x <= -1) return 24; if (x >= 1) return 0;
        return 2*Math.acos(x)/(2*Math.PI)*24;
      };
      var today = new Date();
      var now = dayLenH(today);
      var nextWk = new Date(today); nextWk.setDate(today.getDate()+7);
      var deltaMin = Math.round((dayLenH(nextWk) - now) * 60);
      if (ouraData.length < 60) return { now: now, deltaMin: deltaMin, corr: [] };
      var moodBD = {}; entries.forEach(function(e){ if (e.mood) moodBD[e.date] = e.mood; });
      var mk = function(get, name, posMeans) {
        var pairs = [];
        ouraData.forEach(function(d){
          var v = get(d);
          if (v == null) return;
          pairs.push([dayLenH(new Date(d.date)), v]);
        });
        var r = A.calcPearson(pairs);
        return r != null ? { name: name, r: r, n: pairs.length, posMeans: posMeans } : null;
      };
      var corr = [
        mk(function(d){ return d.sleep_score; }, '🌙 Sömnpoäng', 'sover bättre ljusa halvåret'),
        mk(function(d){ return d.total_sleep_min; }, '⏰ Sömntid', 'sover längre ljusa halvåret'),
        mk(function(d){ return d.hrv_avg; }, '💗 HRV', 'högre HRV ljusa halvåret'),
        mk(function(d){ return d.steps; }, '👟 Steg', 'rör dig mer ljusa halvåret'),
        mk(function(d){ return moodBD[d.date]; }, '😊 Humör', 'gladare ljusa halvåret')
      ].filter(function(x){ return x && x.n >= 30; });
      return { now: now, deltaMin: deltaMin, corr: corr, lat: lat };
  };
  window.Analytics = A;
})();
