// ─── Yoga ─────────────────────────────────────────────────────────────────────
// Smart yogaplan (Move With Nicole) som anpassar sig efter gympassen.
// Exponerar window.Yoga = { View, Today, plan, fromYogaveckan }.
//
// Data:
//  - Yogapass loggas som vanliga träningspass i `workouts`:
//      { id, date, type:'Yoga', duration, intensity, comment, yoga:<videoId> }
//    så de syns i Träning, veckostatistik, årsmål och kroppsbatteri.
//  - Gym räknas som gjort om det finns ett pass av typen 'Styrketräning' samma dag.
//    Avbockning i yogakalendern skapar ett sådant pass med flaggan gymPlan:true.
//  - Planerade gympass ligger i `gymPlan`: { 'YYYY-MM-DD': { t:'ben'|'over'|'hel'|null, u:<ms> } }.
//    t:null betyder borttaget (behövs för att synken inte ska väcka liv i det igen).
(function(){
  var h = React.createElement;
  var useState = React.useState;

  var Y = function(id){ return 'https://www.youtube.com/watch?v=' + id; };
  var P = {
    'dqIZnyUtKXI':{n:'Morning Flow, Energising',m:25,c:'morgon'},
    '5TzqqPJFHeQ':{n:'Daily Flow, Full Body',m:30,c:'morgon'},
    'Vr3h5X9kmUo':{n:'Morning Flow, Wake Up',m:15,c:'morgon'},
    '8URMcK7_PjY':{n:'Morning Flow, Feel Good',m:15,c:'morgon'},
    'UxU8OCsNbYY':{n:'Morning Flow',m:10,c:'morgon'},
    'HvluUhDizIY':{n:'Stretch Routine',m:20,c:'stretch'},
    '98rmMgBwJXE':{n:'Everyday Yoga',m:20,c:'stretch'},
    'RvCntPg7oPE':{n:'Flow for Flexibility',m:30,c:'stretch'},
    '2eC7TlC2NLs':{n:'Daily Flow, Stretch',m:30,c:'stretch'},
    '8cltCOUpYTQ':{n:'Gentle Flow (kväll)',m:20,c:'kvall'},
    'e8TuZbVK3h8':{n:'Pilates Yoga Workout',m:25,c:'styrka'},
    'iYS1P-ZjNsA':{n:'Power Yoga, Full Body',m:25,c:'styrka'},
    '0fPk-UzQWOs':{n:'Energising Vinyasa',m:35,c:'helg'},
    'B1U-Z1b-EOg':{n:'Dancer Inspired Flow',m:30,c:'helg'},
    'PZB7EkWkj_M':{n:'Full Body Vinyasa',m:45,c:'helg'},
    '7SU59GxGqbo':{n:'Full Body, Intermediate',m:40,c:'helg'}
  };
  var INTENSITY = { morgon:2, stretch:1, kvall:1, styrka:4, helg:3 };
  var CATS = [
    { k:'morgon', l:'Morgon', cls:'bg-indigo-500' },
    { k:'stretch', l:'Stretch', cls:'bg-emerald-500' },
    { k:'styrka', l:'Styrka', cls:'bg-orange-500' },
    { k:'helg', l:'Längre flöden', cls:'bg-violet-500' },
    { k:'kvall', l:'Kväll', cls:'bg-teal-500' }
  ];
  var LIB = [
    ['Morgon, vardag',['dqIZnyUtKXI','5TzqqPJFHeQ','Vr3h5X9kmUo','8URMcK7_PjY','UxU8OCsNbYY']],
    ['Stretch och återhämtning',['HvluUhDizIY','98rmMgBwJXE','RvCntPg7oPE','2eC7TlC2NLs','8cltCOUpYTQ']],
    ['Styrka, 1 till 2 gånger i veckan',['e8TuZbVK3h8','iYS1P-ZjNsA']],
    ['Helg',['0fPk-UzQWOs','B1U-Z1b-EOg']],
    ['Från december',['PZB7EkWkj_M','7SU59GxGqbo']]
  ];
  var GYM = { ben:'Ben', over:'Överkropp', hel:'Helkropp' };
  var GYM_ORDER = [null,'ben','over','hel'];
  var DN = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

  // ── datum ──
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var ymd = function(dt){ return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate()); };
  var parse = function(s){ var p = s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); };
  var addDays = function(dt,n){ var x = new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); x.setDate(x.getDate()+n); return x; };
  var monday = function(dt){ return addDays(dt, -((dt.getDay()+6)%7)); };
  var dm = function(dt){ return dt.getDate()+'/'+(dt.getMonth()+1); };
  var isoWeek = function(dt){ var d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())); var n=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-n); var y=new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil(((d-y)/864e5+1)/7); };
  var todayD = function(){ return addDays(new Date(),0); };

  // ── gym: återkommande schema + plan + loggad styrketräning ──
  // Standard: måndag och fredag, plus onsdag udda veckor (47, 49, ...), från 16/11 2026.
  // En post i gymPlan för datumet (även t:null = inget gym) går före standarden.
  var GYM_FROM = '2026-11-16';
  var GYM_SKIP = { '2026-11-18': 1 }; // undantag: inget onsdagsgym denna dag
  var defaultGym = function(d){
    if (d < GYM_FROM || GYM_SKIP[d]) return null;
    var dt = parse(d), dow = (dt.getDay()+6)%7;
    if (dow === 0 || dow === 4) return 'hel';
    if (dow === 2 && isoWeek(dt) % 2 === 1) return 'hel';
    return null;
  };
  var plannedGym = function(d, gymPlan){
    var g = gymPlan && gymPlan[d];
    if (g && 't' in g) return g.t && GYM[g.t] ? g.t : null;
    return defaultGym(d);
  };
  var gymType = function(d, gymPlan, workouts){
    var t = plannedGym(d, gymPlan);
    if (t) return t;
    // ingen planerad gymdag, men ett loggat styrkepass räknas ändå
    return (workouts || []).some(function(w){ return w.date === d && w.type === 'Styrketräning'; }) ? 'hel' : null;
  };
  var gymDone = function(d, workouts){ return (workouts || []).some(function(w){ return w.date === d && w.type === 'Styrketräning'; }); };

  // ── planering ──
  var weekStrength = function(mon, gOn){
    // Tisdag och torsdag är kontorsdagar: ingen yoga på lunchen.
    var free = [0,2,4].filter(function(i){ var d = addDays(mon,i); return !gOn(ymd(d)) && !gOn(ymd(addDays(d,-1))) && !gOn(ymd(addDays(d,1))); });
    var out = {};
    if (!free.length) return out;
    var first = [0,2,4].find(function(i){ return free.indexOf(i) >= 0; });
    out[first] = 'e8TuZbVK3h8';
    var rest = free.filter(function(i){ return Math.abs(i-first) >= 2; }).sort(function(a,b){ return Math.abs(b-first)-Math.abs(a-first) || b-a; });
    if (rest.length) out[rest[0]] = 'iYS1P-ZjNsA';
    return out;
  };
  var plan = function(d, gymPlan, workouts){
    var gt = function(k){ return gymType(k, gymPlan, workouts); };
    var gOn = function(k){ return !!gt(k); };
    var key = ymd(d), dow = (d.getDay()+6)%7;
    var g = gt(key), prev = gt(ymd(addDays(d,-1)));
    var strength = weekStrength(monday(d), gOn)[dow];
    var big = function(){ return isoWeek(d) % 2 === 0 ? '0fPk-UzQWOs' : 'B1U-Z1b-EOg'; };
    var morning, lunch = null;
    if (g) morning = { id:'Vr3h5X9kmUo', why:'Lätt morgon, gym i dag' };
    else if (prev) morning = dow >= 5 ? { id:'RvCntPg7oPE', why:'Rörlighet dagen efter gym' }
      : prev === 'over' ? { id:'98rmMgBwJXE', why:'Snällt för axeln efter överkroppspass' }
      : { id:'HvluUhDizIY', why:'Återhämtning dagen efter gym' };
    else if (strength) { morning = { id: dow === 4 ? 'HvluUhDizIY' : 'Vr3h5X9kmUo', why:'Lätt morgon, styrka på lunchen' }; lunch = { id:strength, why:'Ingen gym nära, kroppen är utvilad' }; }
    else if (dow === 3) morning = { id:'5TzqqPJFHeQ', why:'Längre allround' };
    else if (dow === 5) morning = { id:big(), why:'Veckans stora pass' };
    else if (dow === 6 && gOn(ymd(addDays(d,-2)))) morning = { id:big(), why:'Veckans stora pass, flyttat från lördag' };
    else if (dow === 6) morning = { id:'RvCntPg7oPE', why:'Lugn rörlighet' };
    else morning = { id:'dqIZnyUtKXI', why:'Standardpasset' };
    if (!g && gOn(ymd(addDays(d,1))) && !lunch && dow < 5 && morning.id === 'dqIZnyUtKXI') morning.why = 'Standardpasset, gym i morgon';
    return { key:key, dow:dow, gym:g, morning:morning, lunch:lunch };
  };

  // ── loggning ──
  var yogaOf = function(workouts){ return (workouts || []).filter(function(w){ return w && w.yoga && P[w.yoga]; }); };
  var has = function(workouts, d, id){ return (workouts || []).some(function(w){ return w.date === d && w.yoga === id; }); };
  var makeYoga = function(d, id){ return { id: Date.now() + Math.floor(Math.random()*1000), date:d, type:'Yoga', duration:P[id].m, intensity:INTENSITY[P[id].c] || 2, comment:P[id].n, yoga:id }; };

  // Import från yogaveckan.vercel.app (säkerhetskopia: array eller {log, gym})
  var fromYogaveckan = function(txt, workouts){
    var r = JSON.parse(txt);
    var log = Array.isArray(r) ? r : (r && Array.isArray(r.log) ? r.log : null);
    if (!log) throw new Error('format');
    var re = /^\d{4}-\d\d-\d\d$/;
    var seen = {}; (workouts || []).forEach(function(w){ if (w.yoga) seen[w.date + '|' + w.yoga] = 1; });
    var add = [], base = Date.now();
    log.forEach(function(e, i){
      if (!e || !P[e.id] || !re.test(e.d) || seen[e.d + '|' + e.id]) return;
      seen[e.d + '|' + e.id] = 1;
      add.push({ id: base + i, date:e.d, type:'Yoga', duration:P[e.id].m, intensity:INTENSITY[P[e.id].c] || 2, comment:P[e.id].n, yoga:e.id });
    });
    var gym = {}, gymDoneDates = [];
    if (r && r.gym && typeof r.gym === 'object') Object.keys(r.gym).forEach(function(k){
      var v = r.gym[k]; if (!re.test(k) || !v || !GYM[v.t]) return;
      gym[k] = { t:v.t, u:base };
      if (v.done) gymDoneDates.push(k);
    });
    return { workouts:add, gym:gym, gymDone:gymDoneDates };
  };

  // ── små UI-bitar ──
  var card = 'bg-white rounded-xl shadow-md';
  var btnPlay = function(href, warm){ return h('a', { href:href, target:'_blank', rel:'noopener', className:'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white whitespace-nowrap ' + (warm ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700') }, '▶ Starta'); };
  var btnDone = function(on, onClick, labelOn, labelOff){ return h('button', { type:'button', onClick:onClick, 'aria-pressed': on,
    className:'px-4 py-2 rounded-full text-sm font-bold border-2 whitespace-nowrap ' + (on ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-400') }, on ? (labelOn || '✓ Gjort') : (labelOff || '✓ Klart')); };

  // ── Kortet på Idag ──
  function Today(props){
    var wk = props.workouts || [], t = todayD(), k = ymd(t);
    var p = plan(t, props.gymPlan, wk);
    var row = function(lbl, it, warm){
      return h('div', { className:'flex items-center justify-between gap-3 flex-wrap py-2' },
        h('div', { className:'min-w-0' },
          h('p', { className:'text-xs font-bold uppercase tracking-wider ' + (warm ? 'text-orange-600' : 'text-gray-400') }, lbl),
          h('p', { className:'font-semibold text-gray-800' }, P[it.id].m + ' min ' + P[it.id].n),
          h('p', { className:'text-xs text-gray-500' }, it.why)),
        h('div', { className:'flex gap-2' }, btnPlay(Y(it.id), warm), btnDone(has(wk,k,it.id), function(){ props.onToggle(k, it.id); })));
    };
    return h('div', { className: card + ' p-5 mb-5' },
      h('div', { className:'flex items-center justify-between mb-1' },
        h('h2', { className:'text-lg font-bold text-gray-800' }, '🧘 Dagens yoga'),
        h('button', { type:'button', onClick:props.onOpen, className:'text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-white' }, 'Kalender →')),
      h('div', { className:'divide-y divide-gray-100' },
        row('Morgon', p.morning, false),
        p.lunch ? row('Lunch', p.lunch, true) : null,
        p.gym ? h('p', { className:'text-sm text-gray-600 pt-2' }, '🏋 Gym i dag: ' + GYM[p.gym] + (gymDone(k, wk) ? ' · gjort' : '')) : null));
  }

  // ── Vyn ──
  function View(props){
    var wk = props.workouts || [], gp = props.gymPlan || {};
    var _o = useState(0), offset = _o[0], setOffset = _o[1];
    var t = todayD(), today = ymd(t);
    var _d = useState(today), otherDate = _d[0], setOtherDate = _d[1];
    var _p = useState('dqIZnyUtKXI'), otherId = _p[0], setOtherId = _p[1];
    var _i = useState(''), imp = _i[0], setImp = _i[1];

    var cycleGym = function(k){
      var cur = plannedGym(k, gp);
      var nxt = GYM_ORDER[(GYM_ORDER.indexOf(cur)+1) % GYM_ORDER.length];
      var next = Object.assign({}, gp); next[k] = { t:nxt, u:Date.now() };
      props.setGymPlan(next);
    };

    // statistik
    var ylog = yogaOf(wk);
    var days = {}; ylog.forEach(function(w){ days[w.date] = 1; });
    var streak = 0, cur = days[today] ? t : addDays(t,-1);
    while (days[ymd(cur)]) { streak++; cur = addDays(cur,-1); }
    var mon0 = monday(t), a0 = ymd(mon0), b0 = ymd(addDays(mon0,6));
    var wl = ylog.filter(function(w){ return w.date >= a0 && w.date <= b0; });
    var wMin = wl.reduce(function(a,w){ return a + (w.duration||0); }, 0);
    var totM = ylog.reduce(function(a,w){ return a + (w.duration||0); }, 0);
    var gymWeek = [0,1,2,3,4,5,6].map(function(i){ return ymd(addDays(mon0,i)); }).filter(function(k){ return gymDone(k, wk); }).length;
    var weeks = [];
    for (var i=7;i>=0;i--){ var m = addDays(mon0,-7*i), a = ymd(m), b = ymd(addDays(m,6));
      weeks.push({ w:isoWeek(m), min: ylog.filter(function(x){ return x.date>=a && x.date<=b; }).reduce(function(s,x){ return s+(x.duration||0); },0), now:i===0 }); }
    var max = Math.max.apply(null, [60].concat(weeks.map(function(x){ return x.min; })));
    var byC = {}; ylog.forEach(function(w){ var c = P[w.yoga].c; byC[c] = (byC[c]||0) + (w.duration||0); });
    var recent = ylog.slice().sort(function(a,b){ return b.date.localeCompare(a.date) || (b.id||0)-(a.id||0); }).slice(0,14);
    var fmt = function(d){ var x = parse(d); return ['sön','mån','tis','ons','tor','fre','lör'][x.getDay()] + ' ' + dm(x); };

    // kalender
    var mon = addDays(mon0, offset*7);
    var calDays = [0,1,2,3,4,5,6].map(function(i){
      var d = addDays(mon,i), p = plan(d, gp, wk), k = p.key, future = k > today;
      var tick = function(it, lunch){
        var on = has(wk,k,it.id);
        return h('div', { key: it.id + (lunch?'l':'m'), className:'flex items-start gap-3' },
          h('button', { type:'button', disabled: future, onClick:function(){ props.onToggle(k, it.id); }, 'aria-pressed':on, 'aria-label':'Bocka av ' + P[it.id].n,
            className:'w-7 h-7 shrink-0 rounded-full border-2 grid place-items-center text-sm ' + (on ? (lunch ? 'bg-orange-500 border-orange-500 text-white' : 'bg-emerald-500 border-emerald-500 text-white') : 'border-gray-300 text-transparent') + (future ? ' opacity-40 cursor-default' : '') }, '✓'),
          h('div', { className:'min-w-0' },
            lunch ? h('span', { className:'text-xs font-bold uppercase tracking-wider text-orange-600 mr-1.5' }, 'Lunch') : null,
            h('a', { href:Y(it.id), target:'_blank', rel:'noopener', className:'font-medium text-gray-800 hover:underline' }, P[it.id].n),
            h('p', { className:'text-xs text-gray-500' }, P[it.id].m + ' min · ' + it.why)));
      };
      var planned = [p.morning.id, p.lunch && p.lunch.id].filter(Boolean);
      var extra = ylog.filter(function(w){ return w.date === k && planned.indexOf(w.yoga) < 0; });
      var gd = gymDone(k, wk);
      return h('li', { key:k, className: card + ' p-4 flex flex-col gap-2.5 ' + (k === today ? 'ring-2 ring-indigo-500' : '') + (k < today ? ' opacity-90' : '') },
        h('div', { className:'flex items-center justify-between gap-2 flex-wrap' },
          h('p', { className:'font-bold text-gray-800' }, DN[i], h('span', { className:'text-sm font-normal text-gray-400 ml-1.5' }, dm(d))),
          h('button', { type:'button', onClick:function(){ cycleGym(k); },
            className:'px-3 py-1 rounded-full text-xs font-bold border-2 ' + (p.gym ? 'bg-violet-50 border-violet-500 text-violet-700' : 'border-dashed border-gray-300 text-gray-500 hover:border-violet-400') },
            p.gym ? '🏋 ' + GYM[p.gym] : '+ Gym')),
        tick(p.morning, false),
        p.lunch ? tick(p.lunch, true) : null,
        p.gym ? h('div', { className:'flex items-start gap-3' },
          h('button', { type:'button', disabled: future, onClick:function(){ props.onToggleGym(k, p.gym); }, 'aria-pressed':gd, 'aria-label':'Bocka av gympass',
            className:'w-7 h-7 shrink-0 rounded-full border-2 grid place-items-center text-sm ' + (gd ? 'bg-violet-500 border-violet-500 text-white' : 'border-gray-300 text-transparent') + (future ? ' opacity-40 cursor-default' : '') }, '✓'),
          h('p', { className:'text-sm' }, h('span', { className:'text-xs font-bold uppercase tracking-wider text-violet-600 mr-1.5' }, 'Gym'), GYM[p.gym])) : null,
        extra.length ? h('p', { className:'text-xs text-gray-500 pl-10' }, 'Även loggat: ' + extra.map(function(w){ return P[w.yoga].n + ' (' + w.duration + ' min)'; }).join(', ')) : null);
    });

    var stat = function(v, l){ return h('div', { className: card + ' p-4 min-w-0' }, h('p', { className:'text-3xl font-black text-gray-800' }, v), h('p', { className:'text-xs text-gray-500 mt-1' }, l)); };
    var pRow = function(lbl, it, warm){
      return h('div', { className:'flex items-center justify-between gap-3 flex-wrap py-3' },
        h('div', { className:'min-w-0' },
          h('p', { className:'text-xs font-bold uppercase tracking-wider ' + (warm ? 'text-orange-600' : 'text-gray-400') }, lbl),
          h('p', { className:'text-lg font-semibold text-gray-800' }, P[it.id].m + ' min ' + P[it.id].n),
          h('p', { className:'text-sm text-gray-500' }, it.why)),
        h('div', { className:'flex gap-2' }, btnPlay(Y(it.id), warm), btnDone(has(wk,today,it.id), function(){ props.onToggle(today, it.id); })));
    };
    var pt = plan(t, gp, wk);

    return h('div', { className:'max-w-3xl space-y-6' },
      h('div', null,
        h('h2', { className:'text-2xl font-bold text-gray-800' }, '🧘 Yoga'),
        h('p', { className:'text-sm text-gray-500 mt-1' }, 'Lägg in gympassen i kalendern så planeras yogan om runt dem. Avbockade pass sparas som träningspass och syns i Träning och statistiken.')),

      // i dag
      h('div', { className: card + ' p-5' },
        h('p', { className:'text-xs font-bold uppercase tracking-wider text-gray-400' }, DN[pt.dow] + ' · vecka ' + isoWeek(t)),
        h('div', { className:'divide-y divide-gray-100' },
          pRow('Morgon', pt.morning, false),
          pt.lunch ? pRow('Lunch', pt.lunch, true) : null,
          pt.gym ? h('div', { className:'flex items-center justify-between gap-3 flex-wrap py-3' },
            h('div', null, h('p', { className:'text-xs font-bold uppercase tracking-wider text-violet-600' }, 'Gym'), h('p', { className:'text-lg font-semibold text-gray-800' }, GYM[pt.gym])),
            btnDone(gymDone(today, wk), function(){ props.onToggleGym(today, pt.gym); }, '✓ Gym gjort', '✓ Gym klart')) : null),
        h('div', { className:'border-t border-gray-100 pt-4 mt-1 flex flex-wrap gap-2 items-center' },
          h('p', { className:'w-full text-xs font-bold uppercase tracking-wider text-gray-400' }, 'Annat pass eller en tidigare dag'),
          h('input', { type:'date', value:otherDate, max:today, onChange:function(e){ setOtherDate(e.target.value); }, className:'px-3 py-2 border rounded-lg text-sm outline-none' }),
          h('select', { value:otherId, onChange:function(e){ setOtherId(e.target.value); }, className:'flex-1 min-w-[180px] px-3 py-2 border rounded-lg text-sm outline-none bg-white' },
            LIB.map(function(g){ return h('optgroup', { key:g[0], label:g[0] }, g[1].map(function(id){ return h('option', { key:id, value:id }, P[id].m + ' min · ' + P[id].n); })); })),
          h('button', { type:'button', onClick:function(){
              var d = otherDate || today;
              if (!/^\d{4}-\d\d-\d\d$/.test(d) || d > today) { props.toast('Välj ett datum som inte ligger i framtiden', 'error'); return; }
              if (has(wk, d, otherId)) { props.toast('Det passet är redan loggat ' + (d === today ? 'i dag' : dm(parse(d))), 'error'); return; }
              props.onToggle(d, otherId);
            }, className:'px-4 py-2 rounded-full text-sm font-bold border-2 border-indigo-600 text-indigo-700 bg-white' }, 'Logga'))),

      // kalender
      h('div', null,
        h('div', { className:'flex items-center justify-between mb-3' },
          h('button', { type:'button', onClick:function(){ setOffset(offset-1); }, 'aria-label':'Föregående vecka', className:'px-4 py-1.5 rounded-full bg-white shadow-md font-bold' }, '‹'),
          h('div', { className:'text-center' },
            h('p', { className:'font-bold text-gray-800' }, 'Vecka ' + isoWeek(mon)),
            h('p', { className:'text-xs text-gray-500' }, dm(mon) + ' till ' + dm(addDays(mon,6))),
            offset !== 0 ? h('button', { type:'button', onClick:function(){ setOffset(0); }, className:'text-xs text-indigo-600 font-semibold mt-0.5' }, 'Till denna vecka') : null),
          h('button', { type:'button', onClick:function(){ setOffset(offset+1); }, 'aria-label':'Nästa vecka', className:'px-4 py-1.5 rounded-full bg-white shadow-md font-bold' }, '›')),
        h('ul', { className:'flex flex-col gap-2' }, calDays),
        h('p', { className:'text-xs text-gray-500 mt-2' }, 'Gym ligger inlagt måndag och fredag, plus onsdag varannan vecka. Tryck på gymknappen för att byta typ (ben, överkropp, helkropp) eller ta bort det en enskild dag, och + Gym för att lägga till. Loggar du styrketräning under Träning räknas den också som gym.')),

      // statistik
      h('div', null,
        h('h3', { className:'text-lg font-bold text-gray-800 mb-3' }, 'Så går det'),
        h('div', { className:'grid grid-cols-3 gap-3 mb-3' },
          stat(streak, 'dagar i rad med yoga'),
          stat(wl.length, 'yogapass denna vecka · ' + wMin + ' min' + (gymWeek ? ' · ' + gymWeek + ' gym' : '')),
          stat(ylog.length, 'yogapass totalt · ' + (totM >= 120 ? (totM/60).toFixed(1).replace('.',',') + ' tim' : totM + ' min'))),
        h('div', { className: card + ' p-4 mb-3' },
          h('p', { className:'text-xs font-bold uppercase tracking-wider text-gray-400 mb-3' }, 'Yogaminuter per vecka'),
          h('div', { className:'grid grid-cols-8 gap-2 items-end', style:{ height:'130px' } },
            weeks.map(function(x){ return h('div', { key:x.w, className:'flex flex-col items-center justify-end gap-1 h-full min-w-0' },
              h('span', { className:'text-[11px] font-semibold text-gray-700' }, x.min || ''),
              h('div', { className:'w-full rounded-t ' + (x.now ? 'bg-orange-500' : 'bg-indigo-500'), style:{ height: Math.max(2, Math.round(x.min/max*100)) + '%', maxWidth:'34px' } }),
              h('span', { className:'text-[11px] text-gray-400' }, 'v' + x.w)); }))),
        h('div', { className: card + ' p-4 mb-3' },
          h('p', { className:'text-xs font-bold uppercase tracking-wider text-gray-400 mb-3' }, 'Fördelning'),
          h('div', { className:'space-y-2' }, CATS.map(function(c){
            var v = byC[c.k] || 0, pct = totM ? Math.round(v/totM*100) : 0;
            return h('div', { key:c.k, className:'grid items-center gap-3 text-sm', style:{ gridTemplateColumns:'100px 1fr 60px' } },
              h('span', { className:'text-gray-700' }, c.l),
              h('div', { className:'h-2 rounded-full bg-gray-100 overflow-hidden' }, h('div', { className:'h-full rounded-full ' + c.cls, style:{ width: pct + '%' } })),
              h('span', { className:'text-right text-gray-500' }, v + ' min'));
          }))),
        h('div', { className: card + ' p-4' },
          h('p', { className:'text-xs font-bold uppercase tracking-wider text-gray-400 mb-2' }, 'Senaste passen'),
          recent.length ? h('ul', { className:'divide-y divide-gray-100' }, recent.map(function(w){
            return h('li', { key:w.id, className:'flex items-center gap-3 py-2 text-sm' },
              h('span', { className:'text-gray-400 w-16 shrink-0' }, fmt(w.date)),
              h('span', { className:'flex-1 min-w-0 text-gray-800' }, P[w.yoga].n),
              h('span', { className:'text-gray-500' }, w.duration + ' min'),
              h('button', { type:'button', onClick:function(){ props.onDelete(w.id); }, 'aria-label':'Ta bort', className:'text-gray-300 hover:text-red-500 text-lg px-1' }, '✕'));
          })) : h('p', { className:'text-sm text-gray-500' }, 'Inga yogapass loggade än. Tryck ✓ Klart på dagens pass.'))),

      // regler
      h('div', null,
        h('h3', { className:'text-lg font-bold text-gray-800 mb-3' }, 'Så anpassar sig planen'),
        h('div', { className:'grid sm:grid-cols-2 gap-3' },
          [['Gymdag','15 min lätt morgonflöde. Ingen yogastyrka samma dag.'],
           ['Dagen efter gym','20 min Stretch Routine. Efter överkropp Everyday Yoga, som är snällare mot axeln. På helgen 30 min Flexibility.'],
           ['Yogastyrka på lunchen','Högst två pass i veckan, bara måndag, onsdag eller fredag (tisdag och torsdag är kontorsdagar) och aldrig dagen före, samma dag eller dagen efter gym. Pilates först, Power sedan.'],
           ['Övriga dagar','25 min Morning Flow, 30 min allround på torsdag, veckans stora pass på lördag (söndag om du gymmar fredag) och lugn rörlighet på söndag.']
          ].map(function(r){ return h('div', { key:r[0], className: card + ' p-4' }, h('p', { className:'font-semibold text-gray-800 mb-1' }, r[0]), h('p', { className:'text-sm text-gray-500' }, r[1])); }))),

      // bibliotek
      h('div', null,
        h('h3', { className:'text-lg font-bold text-gray-800 mb-3' }, 'Alla pass'),
        h('div', { className: card + ' p-4 space-y-4' }, LIB.map(function(g){
          return h('div', { key:g[0] },
            h('p', { className:'text-sm font-semibold text-gray-700 mb-1' }, g[0]),
            h('ul', { className:'divide-y divide-gray-100' }, g[1].map(function(id){
              return h('li', { key:id, className:'flex justify-between gap-3 py-1.5 text-sm' },
                h('a', { href:Y(id), target:'_blank', rel:'noopener', className:'text-gray-800 hover:underline' }, P[id].n),
                h('span', { className:'text-gray-400 whitespace-nowrap' }, P[id].m + ' min'));
            })));
        }))),

      // import
      h('details', { className: card + ' p-4 text-sm' },
        h('summary', { className:'cursor-pointer font-semibold text-gray-700' }, 'Importera historik från yogaveckan.vercel.app'),
        h('p', { className:'text-gray-500 mt-2' }, 'Öppna den gamla yogasidan där du loggade, tryck Säkerhetskopia → Kopiera och klistra in här. Pass som redan finns hoppas över.'),
        h('textarea', { value:imp, onChange:function(e){ setImp(e.target.value); }, rows:4, className:'w-full mt-2 px-3 py-2 border rounded-lg font-mono text-xs outline-none' }),
        h('button', { type:'button', onClick:function(){
            try { var r = fromYogaveckan(imp, wk); props.onImport(r); setImp(''); }
            catch(e){ props.toast('Texten gick inte att läsa. Klistra in exakt det du kopierade.', 'error'); }
          }, className:'mt-2 px-4 py-2 rounded-full text-sm font-bold bg-indigo-600 text-white' }, 'Läs in'))
    );
  }

  window.Yoga = { View: View, Today: Today, plan: plan, P: P, GYM: GYM, makeYoga: makeYoga, fromYogaveckan: fromYogaveckan, ymd: ymd };
})();
