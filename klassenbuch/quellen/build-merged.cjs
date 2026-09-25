/* ============================================================
   Klassenbuch (CDSE Hub, Testversion) — baut apps/klassenbuch.html
   ------------------------------------------------------------
   Grundlage: Galileo-Stand aa1f48c (Branch claude/focused-galileo-e2s63b),
   ohne eingebaute echte Daten und ohne Ballast: keine alte Toolbox, keine
   Materialdaten-Kopie, kein SAVOIR – dafür Verknüpfungen zu Toolbox,
   Screening und Lernen im Hub. Aufruf: node klassenbuch/quellen/build-merged.cjs
   ============================================================
   Ursprünglicher Kopf:
   build-merged.js — erzeugt die fusionierte index.html
   ------------------------------------------------------------
   Fügt anwesenheit.html + dossier.html zu EINER App zusammen:
     • EIN aufgeräumtes Seitenmenü (Schüler · Réunionen · Klassenbuch ·
       Absenzen · Klasse · Mehr)
     • Schüler-Hub: Klick auf einen Schüler -> Reiter Übersicht / Réunion /
       Dossier / Absenzen / Aufgaben / Helfernetz (Platzhalter)
     • gemeinsame Schülerliste (KB_ROSTER, 8 Schüler) für beide Bereiche
     • CSS jeder App unter ihren Wurzel-Container gescoped
   Aufruf:  node build-merged.cjs
   ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = __dirname;

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function between(s, a, b) {
  var i = s.indexOf(a); if (i < 0) throw new Error('Marker fehlt: ' + a);
  i += a.length;
  var j = s.indexOf(b, i); if (j < 0) throw new Error('Endmarker fehlt: ' + b);
  return s.slice(i, j);
}
function replaceOnce(s, find, repl, label) {
  var i = s.indexOf(find);
  if (i < 0) throw new Error('Patch-Anker nicht gefunden: ' + label);
  if (s.indexOf(find, i + 1) >= 0) throw new Error('Patch-Anker mehrdeutig: ' + label);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

var TABS_GUARD = read('tabs-guard.js');
var SPELL_JS  = read('spell.js');
var SPELL_CSS = read('spell.css');
var NSPELL_JS = read('vendor/nspell.bundle.js');
/* Woerterbuch gepackt einbetten: ausgepackt wird es erst im Browser, und
   erst dann, wenn wirklich jemand schreibt. */
var SPELL_DATA = 'window.KB_SPELL_DATA={aff:"' + fs.readFileSync(path.join(ROOT,'vendor/lb/lb_LU.aff.gz')).toString('base64') +
  '",dic:"' + fs.readFileSync(path.join(ROOT,'vendor/lb/lb_LU.dic.gz')).toString('base64') + '"};';
var anw = read('anwesenheit.html');
var dos = read('dossier.html');

/* ---- Teile extrahieren ---- */
var anwStyle  = between(anw, '<style>', '</style>');
var anwBody   = between(anw, '<body>', '<script>');
var anwScript = between(anw, '<script>', '</script>');
var dosStyle  = between(dos, '<style>', '</style>');
var dosBody   = between(dos, '<body>', '<script>');
var dosScript = between(dos, '<script>', '</script>');

/* ============================================================
   CSS-Scoper
   ============================================================ */
function splitTopComma(sel) {
  var parts = [], depth = 0, cur = '';
  for (var k = 0; k < sel.length; k++) {
    var c = sel[k];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  return parts;
}
function scopeSelector(sel, scope) {
  return splitTopComma(sel).map(function (one) {
    var s = one.trim();
    if (!s) return '';
    var low = s.toLowerCase();
    if (low === ':root' || low === 'html' || low === 'body') return scope;
    if (s === '*') return scope + ' *';
    s = s.replace(/^html\s+/i, '').replace(/^body\s+/i, '');
    return scope + ' ' + s;
  }).filter(Boolean).join(', ');
}
function scopeCss(css, scope) {
  var out = '', i = 0, n = css.length;
  while (i < n) {
    var c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      var e = css.indexOf('*/', i); e = e < 0 ? n : e + 2;
      out += css.slice(i, e); i = e; continue;
    }
    if (/\s/.test(c)) { out += c; i++; continue; }
    var start = i;
    while (i < n) {
      if (css[i] === '/' && css[i + 1] === '*') { var ce = css.indexOf('*/', i); i = ce < 0 ? n : ce + 2; continue; }
      if (css[i] === '{' || css[i] === ';' || css[i] === '}') break;
      i++;
    }
    if (i >= n) { out += css.slice(start); break; }
    if (css[i] === ';') { out += css.slice(start, i + 1); i++; continue; }
    if (css[i] === '}') { out += css.slice(start, i + 1); i++; continue; }
    var prelude = css.slice(start, i).trim();
    var depth = 0, bs = i;
    do {
      if (css[i] === '/' && css[i + 1] === '*') { var c2 = css.indexOf('*/', i); i = c2 < 0 ? n : c2 + 1; }
      else if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    } while (i < n && depth > 0);
    var block = css.slice(bs + 1, i - 1);
    if (prelude.charAt(0) === '@') {
      var at = prelude.split(/\s|\(/)[0].toLowerCase();
      if (at === '@media' || at === '@supports' || at === '@container') {
        out += prelude + '{' + scopeCss(block, scope) + '}';
      } else {
        out += prelude + '{' + block + '}';
      }
    } else {
      out += scopeSelector(prelude, scope) + '{' + block + '}';
    }
  }
  return out;
}
var anwStyleScoped = scopeCss(anwStyle, '#anw-root');
var dosStyleScoped = scopeCss(dosStyle, '#dos-root');

/* ============================================================
   Patches der anwesenheit-Engine
   ============================================================ */
anwScript = replaceOnce(anwScript,
  'load();ensurePeriods();',
  "load();if(window.KB_ROSTER){state.students=window.KB_ROSTER.asAnwesenheit();}ensurePeriods();",
  'anw:init-roster');
anwScript = replaceOnce(anwScript,
  's.level=lv;save();renderStudentMgmt();renderStudents();',
  's.level=lv;if(window.KB_ROSTER){window.KB_ROSTER.setLevel(id,lv);}save();renderStudents();',
  'anw:setLevel-roster');
anwScript = replaceOnce(anwScript,
  "if(!state.currentUser){renderUserGrid();openModal('modal-user');}",
  "/* Bediener-Auswahl in der gemeinsamen App nicht erzwingen */",
  'anw:no-force-user');

/* Lese-Schnittstelle KB_ANW + Refresh-Hook am Ende der IIFE einsetzen */
var ANW_API = [
  "  window.KB_ANW={",
  "    /* Wie beim Dossier: erst nach dem Laden darf \"nichts da\" geglaubt werden. */",
  "    ready:function(){return !!loaded;},",
  "    entriesForStudent:function(id){return state.entries.filter(function(e){return e.studentId===id;});},",
  "    /* --- Stundenplan-Zugriff für die Shell (Trimester-Umschaltung, Editor) --- */",
  "    getTimetable:function(){try{return JSON.parse(JSON.stringify(state.timetable||{}));}catch(e){return {};}},",
  "    setTimetable:function(tt){if(!tt)return;state.timetable=tt;save();renderAll();},",
  "    setTTCell:function(level,wd,idx,val){var lv=state.timetable&&state.timetable[level];if(!lv)return;var day=lv[wd];if(!day)return;day[idx]=String(val==null?'':val);save();},",
  "    blocks:function(){return BLOCKS.map(function(b){return {id:b.id,start:b.start,end:b.end,hours:blockHours(b)};});},",
  "    dayNames:function(){var o={};for(var w=1;w<=5;w++){o[w]=DAY_NAMES[w];}return o;},",
  "    isPause:function(s){return !!PAUSE_SUBJECTS[s];},",
  "    /* Welcome, Morning Meeting, Paus, Mëttespaus und Réckbléck sind Ablauf,",
  "       kein Unterrichtsfach: sie gehoeren nicht in Faecherliste und Noten. */",
  "    isNonSubject:function(s){return !s||!!PAUSE_SUBJECTS[s]||!!NO_HOUR_SUBJECTS[s];},",
  "    levels:function(){return ['L1','L2'];},",
  "    defaultTimetable:function(){try{return JSON.parse(JSON.stringify(defaultTimetable()));}catch(e){return null;}},",
  "    /* Fach in Absenzen und Klassenbuch-Notizen mitbenennen, damit beim",
  "       Umbenennen nichts verwaist. Leerer Zielname laesst den Eintrag stehen. */",
  "    renameSubject:function(from,to){if(!from||!to)return 0;var n=0;",
  "      for(var i=0;i<state.entries.length;i++){if(state.entries[i].subject===from){state.entries[i].subject=to;n++;}}",
  "      for(var j=0;j<state.notes.length;j++){if(state.notes[j].subject===from){state.notes[j].subject=to;n++;}}",
  "      save();renderAll();return n;},",
  "    /* Nur die Uhrzeiten der bestehenden Stunden aendern. Die IDs bleiben,",
  "       weil Absenzen daran haengen; Stunden hinzufuegen/entfernen geht hier bewusst nicht. */",
  "    setBlockTimes:function(arr){if(!arr||!arr.length)return false;var n=0;",
  "      for(var i=0;i<BLOCKS.length;i++){for(var j=0;j<arr.length;j++){if(arr[j]&&arr[j].id===BLOCKS[i].id){",
  "        if(arr[j].start)BLOCKS[i].start=arr[j].start;if(arr[j].end)BLOCKS[i].end=arr[j].end;n++;}}}",
  "      if(n)renderAll();return n>0;},",
  "    summaryForStudent:function(id){var e=0,u=0,v=0,he=0,hu=0;state.entries.forEach(function(x){if(x.studentId!==id)return;var h=countHours(x);if(x.status==='entschuldigt'){e++;he+=h;}else if(x.status==='unentschuldigt'){u++;hu+=h;}else if(x.status==='verspaetet'){v++;}});return {entschuldigt:e,unentschuldigt:u,verspaetet:v,hoursEnt:he,hoursUnent:hu,total:e+u+v};},",
  "    recentForStudent:function(id,n){return state.entries.filter(function(e){return e.studentId===id;}).sort(function(a,b){return a.date<b.date?1:-1;}).slice(0,n||8);},",
  "    notes:function(){return state.notes.slice().sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:0);});},",
  "    tasksForLevel:function(level,sid){return state.notes.filter(function(n){return (n.type==='hausaufgabe'||n.type==='pruefung')&&(!n.level||!level||n.level===level)&&(!n.studentId||n.studentId===sid);}).sort(function(a,b){return a.date<b.date?1:-1;});},",
  "    statusLabel:function(s){return (STATUS[s]&&STATUS[s].label)||s;},",
  "    /* für die Heute-Tafel: gezählte Stunden einer Absenz, Stunden eines Schultags, Ferien/Feiertag */",
  "    hoursOf:function(e){return countHours(e);},",
  "    dayHours:function(){var n=0;for(var k in BLOCK_WEIGHTS){n+=BLOCK_WEIGHTS[k];}return n;},",
  "    holidayInfo:function(iso){return holidayInfo(iso);},",
  "    fmt:function(iso){return fmtD(iso);},",
  "    openStudent:function(id){activeStudentId=id;rememberStudent(id);var s=state.students.find(function(x){return x.id===id;});if(s){classFilter=s.level||classFilter;}renderAll();},",
  "    openNoteToday:function(){openNoteModal({date:today(),blockId:null,subject:null,level:null});},",
  "    delNote:function(id){delNote(id);},",
  "    exportEntries:function(){return state.entries.map(function(e){return e;});},",
  "    exportNotes:function(){return state.notes.map(function(n){return n;});},",
  "    exportSettings:function(){return {id:'settings',timetable:state.timetable,periods:state.periods,ttVersion:state.ttVersion};},",
  "    applyEntries:function(list){state.entries=(list||[]).slice();save();renderAll();},",
  "    applyNotes:function(list){state.notes=(list||[]).slice();save();renderAll();},",
  "    /* timetable wird NICHT mehr von hier gesetzt: die Stundenplaene liegen",
  "       jetzt je Trimester in KB_TIMETABLE und haben eine eigene Sync-Sammlung.",
  "       Sonst gaebe es zwei Quellen und der aktive Plan wuerde ueberschrieben. */",
  "    applySettings:function(s){if(s){if(s.periods){state.periods=s.periods;}if(s.ttVersion!=null){state.ttVersion=s.ttVersion;}}save();renderAll();},",
  "    getUser:function(){return state.currentUser||'';},",
  "    setUser:function(u){setUser(u);},",
  "    users:function(){return USERS.slice();},",
  "    initials:function(n){return initials(n);},",
  "    avatarBg:function(n){return avatarBg(n);},",
  "    subjectsForLevel:function(level){var set={},out=[];var tt=state.timetable&&state.timetable[level];if(!tt)return [];for(var wd=1;wd<=5;wd++){var day=tt[wd]||[];for(var i=0;i<day.length;i++){var s=day[i];if(s&&!PAUSE_SUBJECTS[s]&&!NO_HOUR_SUBJECTS[s]&&s!=='Hausaufgaben'&&!set[s]){set[s]=1;out.push(s);}}}return out.sort(function(a,b){return a.localeCompare(b);});}",
  "  };",
  "  window.__anwRefresh=function(){if(window.KB_ROSTER){state.students=window.KB_ROSTER.asAnwesenheit();}renderAll();};"
].join("\n");
anwScript = replaceOnce(anwScript, 'else init();\n})();', 'else init();\n' + ANW_API + '\n})();', 'anw:api-hook');

/* Alte anwesenheit-eigene Datei-Sync abschalten (KB_SYNC deckt jetzt ALLES ab) */
anwScript = replaceOnce(anwScript, 'initSync();', '/* initSync deaktiviert (KB_SYNC) */', 'anw:drop-initsync');

/* Klassenbuch-Beiträge der Woche klar NACH TAG gruppiert anzeigen (unter dem Raster). */
anwScript = replaceOnce(anwScript,
  `return '<div class="wk-notes"><div class="wk-notes-head"><h4>📔 Klassenbuch — diese Woche</h4><span class="badge">'+list.length+'</span></div><div class="wk-notes-list">'+items+'</div></div>';`,
  `var byDay={};list.forEach(function(n){(byDay[n.date]=byDay[n.date]||[]).push(n);});
    var dayHtml=days.map(function(d){var dl=byDay[d]||[];if(!dl.length){return '';}return '<div class="kb-day-notes"><div class="kb-day-h">'+DOW[wdOf(d)]+', '+fmtD(d)+' <span class="badge">'+dl.length+'</span></div>'+dl.map(function(n){var nt=NOTE_TYPES[n.type]||NOTE_TYPES.allgemein;var b=BLOCKS.find(function(x){return x.id===n.blockId;});var meta=(n.subject||'Allgemein')+(b?' · '+b.start+'–'+b.end:'');return '<div class="wk-note '+n.type+'" data-noteopen="'+n.id+'"><span class="wn-ic">'+nt.icon+'</span><div class="wn-body"><div class="wn-meta">'+nt.label+' · '+esc(meta)+(n.byUser?' · <span style="color:var(--primary-dark);">'+esc(n.byUser)+'</span>':'')+'</div><div class="wn-txt">'+esc(n.text)+'</div></div></div>';}).join('')+'</div>';}).join('');
    return '<div class="wk-notes"><div class="wk-notes-head"><h4>📔 Klassenbuch — Beiträge nach Tag</h4><span class="badge">'+list.length+'</span></div><div class="wk-notes-list">'+(dayHtml||'<div class="wk-notes-empty">Keine Notizen diese Woche.</div>')+'</div></div>';`,
  'anw:weeknotes-byday');

/* ============================================================
   Patch der dossier-Engine: Reconcile-Aufruf in den Bootstrap
   ============================================================ */
dosScript = replaceOnce(dosScript,
  '    checkPersistenceAndWarn();\n    render();',
  '    checkPersistenceAndWarn();\n    if(window.KB_DOS_RECONCILE){try{window.KB_DOS_RECONCILE();}catch(e){}}\n    render();',
  'dos:reconcile-hook');

/* Info-Chips (Aktive Stellen / Behandler / Laufende Themen) im Schüler-Dossier
   anklickbar machen -> Suche zeigt sofort die Beiträge zu diesem Begriff. */
(function(){
  var find = `'<span class="chip">' + escapeHtml(i) + '</span>'`;
  var repl = `'<button type="button" class="chip chip-link" data-route="#/search?student=' + encodeURIComponent(student.id) + '&q=' + encodeURIComponent(i) + '">' + escapeHtml(i) + '</button>'`;
  var count = dosScript.split(find).length - 1;
  if (count !== 3) throw new Error('Chip-Muster: erwartet 3, gefunden ' + count);
  dosScript = dosScript.split(find).join(repl);
})();

/* ============================================================
   Statische Bausteine
   ============================================================ */
var SHELL_CSS = `
*{box-sizing:border-box;}
:root{
  /* Markenfarbe — Indigo (verfeinert) */
  --kb-accent:#4f5bd5; --kb-accent-dark:#3b46b8; --kb-accent-light:#8b93ea;
  --kb-accent-50:#eef0fc; --kb-accent-100:#dde1f8; --kb-accent-200:#c3c9f3;
  /* Sekundär-Akzent — ruhiges Grün */
  --kb-accent2:#2f9e7a; --kb-accent2-dark:#268063; --kb-accent2-50:#e7f6f1;
  /* Status */
  --kb-ok:#0f9d6b; --kb-ok-50:#e6f6ef;
  --kb-warn:#d98a0b; --kb-warn-50:#fbf2e0;
  --kb-danger:#d6492f; --kb-danger-dark:#b3432d; --kb-danger-50:#fbeae6;
  --kb-info:#3b6fd4; --kb-info-50:#eaf1fc;
  /* Flächen, Linien, Text (kühl & ruhig) */
  --kb-bg:#eef1f7; --kb-surface:#ffffff; --kb-surface-2:#f7f8fc;
  --kb-border:#e3e7f1; --kb-border-strong:#cfd5e6;
  --kb-text:#1d2433; --kb-text-soft:#3a4256; --kb-muted:#5c6478; --kb-muted-2:#8b92a4;
  /* Radien & Schatten */
  --kb-radius-lg:18px; --kb-radius:12px; --kb-radius-sm:9px;
  --kb-shadow-sm:0 1px 2px rgba(20,25,45,.05);
  --kb-shadow:0 1px 2px rgba(20,25,45,.05),0 6px 18px rgba(20,25,45,.06);
  --kb-shadow-lg:0 10px 30px rgba(20,25,45,.10),0 30px 60px rgba(20,25,45,.10);
  --kb-ring:0 0 0 3px rgba(79,91,213,.18);
  --kb-font:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
html,body{margin:0;padding:0;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--kb-text);background:var(--kb-bg);-webkit-font-smoothing:antialiased;}
.kb-app{display:flex;min-height:100vh;min-height:100dvh;}
.kb-topbar{display:none;}
.kb-side{flex:0 0 248px;width:248px;background:var(--kb-surface);border-right:1px solid var(--kb-border);display:flex;flex-direction:column;padding:16px 12px;position:sticky;top:0;height:100vh;height:100dvh;overflow:auto;z-index:40;}
.kb-brand{display:flex;align-items:center;gap:11px;padding:4px 8px 16px;}
.kb-logo{flex:0 0 auto;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:19px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;}
.kb-brandtext{display:flex;flex-direction:column;line-height:1.15;}
.kb-brandtext b{font-weight:800;font-size:16px;letter-spacing:-.02em;}
.kb-brandtext small{font-size:11px;color:var(--kb-muted);font-weight:600;}
.kb-nav{display:flex;flex-direction:column;gap:3px;}
.kb-link{display:flex;align-items:center;gap:11px;padding:10px 11px;border:none;background:none;border-radius:9px;cursor:pointer;font:inherit;font-size:14px;font-weight:600;color:var(--kb-text);text-align:left;width:100%;transition:.13s;}
.kb-link:hover{background:var(--kb-accent-50);}
.kb-link.active{background:var(--kb-accent);color:#fff;box-shadow:0 4px 12px rgba(79,91,213,.3);}
.kb-ic{flex:0 0 auto;width:22px;text-align:center;font-size:15px;}
.kb-more-toggle{margin-top:8px;color:var(--kb-muted);font-weight:700;font-size:12.5px;}
.kb-more-caret{margin-left:auto;transition:transform .15s;font-size:11px;}
.kb-more-toggle.open .kb-more-caret{transform:rotate(180deg);}
.kb-more{display:none;flex-direction:column;gap:3px;margin-top:3px;padding-left:6px;border-left:2px solid var(--kb-border);}
.kb-more.open{display:flex;}
.kb-foot{margin-top:auto;font-size:11px;color:var(--kb-muted);padding:14px 8px 4px;line-height:1.45;}
.kb-stage{flex:1;min-width:0;position:relative;}
.kb-panel{display:none;}
.kb-panel.active{display:block;}
.kb-pad{padding:24px 28px 64px;max-width:1120px;}
.kb-pagehead h2{margin:0 0 4px;font-size:22px;letter-spacing:-.02em;}
.kb-card{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(20,25,45,.04);}
/* ---- Schuljahr/Trimester + Stundenplan im Klasse-Panel ---- */
.kb-card-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
.kb-card-h h3{margin:0;font-size:17px;}
.kb-term-now{font-size:12.5px;font-weight:800;background:var(--kb-accent,#4f5bd5);color:#fff;border-radius:999px;padding:3px 12px;}
.kb-hint{margin:-2px 0 12px;color:var(--kb-muted);font-size:13px;line-height:1.5;}
.kb-termpick{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.kb-termyear{max-width:160px;font-weight:800;cursor:pointer;}
.kb-termtabs,.kb-ttlevels{display:inline-flex;gap:4px;background:var(--kb-bg,#f3f4fa);border:1px solid var(--kb-border);border-radius:11px;padding:3px;}
.kb-tt-tab{font:inherit;font-weight:700;border:none;background:transparent;color:var(--kb-muted);padding:7px 15px;border-radius:8px;cursor:pointer;white-space:nowrap;}
.kb-tt-tab:hover{color:var(--kb-text);}
.kb-tt-tab.on{background:var(--kb-surface);color:var(--kb-accent,#4f5bd5);box-shadow:0 1px 3px rgba(20,25,45,.12);}
.kb-termdates{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:10px;margin-top:14px;}
.kb-termrow{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--kb-border);border-radius:11px;background:var(--kb-bg,#f3f4fa);flex-wrap:wrap;}
.kb-termrow.on{border-color:var(--kb-accent,#4f5bd5);box-shadow:0 0 0 1px var(--kb-accent,#4f5bd5);background:var(--kb-surface);}
.kb-termrow b{flex:0 0 100%;font-size:13.5px;margin-bottom:2px;}
.kb-termrow input{flex:1;min-width:0;font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--kb-border);border-radius:7px;background:#fff;color:var(--kb-text);}
.kb-termfoot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--kb-border);}
.kb-termnew,.kb-termacts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.kb-ttbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;align-items:center;}
.kb-ttacts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.kb-ttwrap{overflow-x:auto;}
.kb-ttgrid{border-collapse:separate;border-spacing:0;width:100%;min-width:720px;}
.kb-ttgrid th{font-size:12.5px;text-align:left;padding:8px 9px;color:var(--kb-muted);font-weight:800;border-bottom:1px solid var(--kb-border);white-space:nowrap;}
.kb-ttgrid th.kb-ttime{width:104px;}
.kb-ttgrid td{padding:3px;border-bottom:1px solid var(--kb-border);}
.kb-ttgrid td.kb-ttime{font-size:12px;color:var(--kb-muted);font-weight:700;white-space:nowrap;padding:6px 9px;line-height:1.35;}
.kb-ttgrid td.kb-ttime small{display:block;font-weight:600;opacity:.75;}
.kb-ttgrid input{font:inherit;font-size:13.5px;width:100%;padding:8px 9px;border:1px solid transparent;border-radius:8px;background:var(--kb-bg,#f3f4fa);color:var(--kb-text);}
.kb-ttgrid input:hover{border-color:var(--kb-border);}
.kb-ttgrid input:focus{outline:none;border-color:var(--kb-accent,#4f5bd5);background:#fff;box-shadow:0 0 0 3px rgba(79,91,213,.14);}
.kb-ttgrid tr.kb-ttpause td.kb-ttime,.kb-ttgrid tr.kb-ttpause input{opacity:.62;}
.kb-ttgrid tr.kb-ttpause input{background:transparent;font-style:italic;}
/* Fächer- und Stundenraster-Listen */
.kb-btn-sm{padding:5px 11px;font-size:12.5px;border-radius:8px;}
.kb-sublist,.kb-blklist{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:8px;}
.kb-subrow,.kb-blkrow{display:flex;align-items:center;gap:9px;padding:9px 12px;border:1px solid var(--kb-border);border-radius:10px;background:var(--kb-bg,#f3f4fa);flex-wrap:wrap;}
/* Bezeichnung auf eigene Zeile: lange Fachnamen und Uhrzeiten bleiben lesbar */
.kb-subrow b,.kb-blkrow b{flex:0 0 100%;font-size:13.5px;margin-bottom:2px;word-break:break-word;}
.kb-subrow .kb-submeta{flex:1;}
.kb-blkrow input{flex:1;min-width:104px;font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--kb-border);border-radius:7px;background:#fff;color:var(--kb-text);}
.kb-submeta{font-size:12px;color:var(--kb-muted);font-weight:700;white-space:nowrap;}
.kb-rosterbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:2px 0 4px;}
.kb-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(262px,1fr));gap:12px;align-items:stretch;}
.kb-tools .kb-tool{display:flex;flex-direction:column;margin:0;}
.kb-tools .kb-tool h3{margin:0 0 6px;font-size:15.5px;}
.kb-tools .kb-tool .kb-hint{flex:1;margin:0 0 12px;}
.kb-tools .kb-tool .kb-btn{align-self:flex-start;}
.kb-toolsec{margin:24px 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--kb-muted);}
.kb-spwords{display:flex;flex-wrap:wrap;gap:6px;}
.kb-spword{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--kb-line);border-radius:999px;padding:2px 4px 2px 10px;font-size:12.5px;background:#fff;}
.kb-spword button{border:0;background:transparent;cursor:pointer;color:var(--kb-muted);font-size:14px;line-height:1;padding:0 4px;border-radius:999px;}
.kb-spword button:hover{color:#b3432d;}
.kb-trash{display:flex;flex-direction:column;gap:7px;max-height:340px;overflow:auto;}
.kb-trash-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;border:1px solid var(--kb-line);border-radius:10px;padding:9px 11px;background:#fff;}
.kb-trash-main{min-width:0;flex:1;}
.kb-trash-cat{font-size:11.5px;color:var(--kb-muted);border:1px solid var(--kb-line);border-radius:999px;padding:0 7px;}
.kb-trash-txt{color:var(--kb-muted);font-size:13px;margin-top:3px;overflow-wrap:anywhere;}
.kb-trash-meta{color:var(--kb-muted);font-size:11.5px;margin-top:4px;}
.kb-trash-acts{display:flex;gap:6px;flex-shrink:0;}
.kb-wkbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.kb-rinactive{opacity:.5;}
.kb-rinactive .kb-rn{text-decoration:line-through;}
.kb-ract{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}
/* Schuljahr-Chip in der Seitenleiste */
.kb-termchip{display:flex;align-items:center;gap:9px;width:100%;margin:2px 0 10px;padding:8px 10px;border:1px solid var(--kb-border);border-radius:12px;background:var(--kb-bg,#f3f4fa);cursor:pointer;font:inherit;text-align:left;}
.kb-termchip:hover{border-color:var(--kb-accent,#4f5bd5);}
.kb-termchip .kb-tc-ic{font-size:16px;line-height:1;}
.kb-termchip .kb-tc-t{flex:1;min-width:0;}
.kb-termchip .kb-tc-y{display:block;font-weight:800;font-size:13.5px;}
.kb-termchip .kb-tc-s{display:block;font-size:11.5px;color:var(--kb-muted);}
.kb-in{font:inherit;padding:8px 10px;border:1px solid var(--kb-border);border-radius:9px;background:#fff;color:var(--kb-text);width:100%;}
.kb-in:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.kb-btn{font:inherit;font-weight:700;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);padding:9px 15px;border-radius:9px;cursor:pointer;transition:.13s;}
.kb-btn:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.kb-btn-primary{background:var(--kb-accent);color:#fff;border-color:var(--kb-accent);}
.kb-btn-primary:hover{background:var(--kb-accent-dark);color:#fff;}
.kb-btn-ghost{background:none;border-color:transparent;}
.kb-table{width:100%;border-collapse:collapse;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:12px;overflow:hidden;}
.kb-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--kb-muted);background:var(--kb-accent-50);padding:9px 12px;}
.kb-table td{padding:8px 12px;border-top:1px solid var(--kb-border);vertical-align:middle;}
/* Schüler-Hub */
.kb-hub-head{padding:18px 24px 0;background:var(--kb-surface);}
.kb-hub-back{display:inline-block;color:var(--kb-muted);text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px;}
.kb-hub-back:hover{color:var(--kb-accent);}
.kb-hub-id{display:flex;align-items:center;gap:12px;margin:4px 0 14px;}
.kb-hub-avatar{flex:0 0 auto;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;display:grid;place-items:center;font-size:20px;font-weight:800;}
.kb-hub-name{font-size:21px;font-weight:800;letter-spacing:-.02em;}
.kb-hub-meta{color:var(--kb-muted);font-size:13px;font-weight:600;}
.kb-hub-tabs{display:flex;gap:3px;flex-wrap:wrap;border-bottom:1px solid var(--kb-border);}
.kb-hub-tab{padding:9px 15px;border-radius:9px 9px 0 0;text-decoration:none;color:var(--kb-muted);font-weight:700;font-size:13.5px;border-bottom:2px solid transparent;margin-bottom:-1px;}
.kb-hub-tab:hover{background:var(--kb-accent-50);color:var(--kb-text);}
.kb-hub-tab.active{color:var(--kb-accent);border-bottom-color:var(--kb-accent);background:transparent;}
.kb-hub-body{padding:22px 24px 56px;}
.kb-hub-pad{max-width:840px;}
.kb-hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;align-items:start;}
.kb-mini-grid{margin-top:4px;}
/* ELDiB-Förderziele + Wochenziele */
.kb-hub-sec{margin:0 0 24px;}
.kb-sec-head{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;border-bottom:2px solid var(--kb-accent-50);padding-bottom:7px;}
.kb-sec-head h3{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--kb-text);}
.kb-sec-sub{color:var(--kb-muted);font-size:12.5px;font-weight:600;}
.kb-goals{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px;}
.kb-goal{background:var(--kb-surface,#fff);border:1px solid var(--kb-border);border-left:5px solid var(--gc,#999);border-radius:13px;padding:13px 15px;box-shadow:0 1px 3px rgba(20,30,50,.05);transition:box-shadow .15s ease,transform .15s ease;}
.kb-goal:hover{box-shadow:0 5px 16px rgba(20,30,50,.11);transform:translateY(-1px);}
.kb-goal-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px;}
.kb-goal-badge{background:var(--gc,#999);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:.02em;}
.kb-goal-code{font-size:12.5px;font-weight:800;color:var(--gc,#666);}
.kb-goal-title{font-size:13px;font-weight:600;color:var(--kb-muted);}
.kb-goal-form{font-size:14.5px;line-height:1.5;color:var(--kb-text);margin:2px 0 10px;font-weight:600;}
.kb-goal-methods{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.kb-method-lbl{font-size:10.5px;font-weight:800;color:var(--kb-muted);text-transform:uppercase;letter-spacing:.05em;margin-right:2px;}
.kb-method{background:var(--kb-accent-50);color:var(--kb-text);font-size:12px;font-weight:600;padding:3px 10px;border-radius:8px;border:1px solid var(--kb-border);}
.kb-weekly{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;}
.kb-weekly li{background:var(--kb-surface,#fff);border:1px solid var(--kb-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-weight:600;position:relative;box-shadow:0 1px 2px rgba(20,30,50,.04);}
.kb-weekly li:before{content:'📌';position:absolute;left:11px;top:9px;}
.kb-empty-card{background:var(--kb-accent-50);border:1px dashed var(--kb-border);border-radius:12px;padding:16px;color:var(--kb-muted);font-size:14px;}
.kb-mini h4{display:flex;align-items:center;gap:6px;}
.kb-btn-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;}
.kb-stat-row{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 12px;}
.kb-stat{text-align:center;}
.kb-stat-n{font-size:24px;font-weight:800;color:var(--kb-accent);line-height:1;}
.kb-stat-l{font-size:10.5px;color:var(--kb-muted);text-transform:uppercase;letter-spacing:.03em;margin-top:3px;}
.kb-placeholder{text-align:center;padding:54px 20px;color:var(--kb-muted);border:2px dashed var(--kb-border);border-radius:16px;background:var(--kb-surface);}
.kb-placeholder-ic{font-size:46px;opacity:.55;margin-bottom:6px;}
.kb-placeholder h3{margin:0 0 6px;color:var(--kb-text);}
.kb-note{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--kb-border);}
.kb-note:first-of-type{border-top:none;}
.kb-note-badge{flex:0 0 auto;font-size:18px;line-height:1.3;}
.kb-note-main{flex:1;min-width:0;}
.kb-note-meta{font-size:12px;color:var(--kb-muted);margin-bottom:2px;}
.kb-note-date{font-weight:800;margin-bottom:8px;font-size:14px;}
/* Helfernetz / Support Bubble */
.kb-bubble-bar{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.kb-bubble-bar label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:var(--kb-muted);}
.kb-bubble-cols{display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start;}
.kb-bubble-selrow{display:flex;gap:8px;}
.kb-bubble-selrow label{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;color:var(--kb-muted);}
.kb-bubble-actions{display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px;flex-wrap:wrap;}
.kb-bubble-svg{background:#fff;border:1px solid var(--kb-border);border-radius:14px;padding:10px;box-shadow:0 1px 2px rgba(20,25,45,.04);}
.kb-bubble-svg svg{display:block;width:100%;height:auto;}
.kb-bnode{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--kb-border);}
.kb-bnode:first-child{border-top:none;}
.kb-bdot{flex:0 0 auto;width:12px;height:12px;border-radius:50%;}
.kb-bnode-main{flex:1;min-width:0;}
.kb-bnode-name{font-weight:700;font-size:13.5px;}
.kb-bnode-note{font-weight:400;color:var(--kb-muted);}
.kb-bnode-meta{font-size:11.5px;color:var(--kb-muted);}
.kbb-compare{margin-top:20px;}
.kbb-snaprow{display:flex;gap:8px;flex-wrap:wrap;}
.kbb-snaprow .kb-in{flex:1;min-width:180px;}
.kbb-snapitem{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;padding:6px 2px;border-top:1px solid var(--kb-border);}
.kbb-snapitem:first-child{border-top:none;}
.kbb-cmp-controls{display:flex;align-items:flex-end;gap:10px;margin:14px 0 4px;flex-wrap:wrap;}
.kbb-cmp-controls label{flex:1;min-width:160px;display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;color:var(--kb-muted);}
.kbb-cmp-arrow{font-weight:800;color:var(--kb-muted);padding-bottom:8px;}
.kbb-cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0;}
.kbb-cmp-col{min-width:0;}
.kbb-cmp-title{font-size:12.5px;font-weight:800;color:var(--kb-text);margin:0 0 6px;}
.kbb-cmp-col .kb-bubble-svg,.kbb-cmp-col svg{background:#fff;border:1px solid var(--kb-border);border-radius:12px;}
.kbb-diff{display:flex;flex-direction:column;gap:10px;}
.kbb-diff-grp{border:1px solid var(--kb-border);border-left-width:4px;border-radius:10px;padding:10px 13px;}
.kbb-diff-grp ul{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.5;}
.kbb-diff-grp li{margin:3px 0;}
.kbb-diff-h{font-weight:800;font-size:13px;}
.kbb-diff-add{border-left-color:var(--kb-ok);} .kbb-diff-add .kbb-diff-h{color:var(--kb-ok);}
.kbb-diff-rem{border-left-color:var(--kb-danger);} .kbb-diff-rem .kbb-diff-h{color:var(--kb-danger-dark);}
.kbb-diff-chg{border-left-color:var(--kb-warn);} .kbb-diff-chg .kbb-diff-h{color:#8a5a00;}
@media(max-width:880px){.kb-bubble-cols{grid-template-columns:1fr;}.kbb-cmp-grid{grid-template-columns:1fr;}}
/* Klassenbuch-Beiträge pro Tag + klickbare Dossier-Chips */
.kb-day-notes{margin:6px 0 2px;}
.kb-day-h{font-weight:800;font-size:13px;color:var(--kb-accent-dark);margin:12px 0 5px;padding-bottom:3px;border-bottom:1px solid var(--kb-border);}
.chip-link{cursor:pointer;}
#dos-root .chip-link:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.kb-sync-status{font-size:13.5px;line-height:1.55;}
.kb-scrim{display:none;}
@media(max-width:880px){
  .kb-app{flex-direction:column;}
  .kb-topbar{display:flex;align-items:center;gap:12px;padding:9px 14px;background:var(--kb-surface);border-bottom:1px solid var(--kb-border);position:sticky;top:0;z-index:50;}
  .kb-burger{font-size:19px;line-height:1;background:none;border:1px solid var(--kb-border);border-radius:9px;width:40px;height:40px;cursor:pointer;}
  .kb-topbrand{display:flex;align-items:center;gap:9px;font-weight:800;}
  .kb-topbrand .kb-logo{width:30px;height:30px;font-size:16px;}
  .kb-side{position:fixed;top:0;left:0;bottom:0;height:100vh;height:100dvh;transform:translateX(-100%);transition:transform .2s ease;box-shadow:0 0 50px rgba(0,0,0,.25);}
  .kb-app.kb-open .kb-side{transform:none;}
  .kb-app.kb-open .kb-scrim{display:block;position:fixed;inset:0;background:rgba(15,20,35,.45);z-index:39;}
  .kb-pad,.kb-hub-head,.kb-hub-body{padding-left:16px;padding-right:16px;}
}
/* Desktop: einklappbare Seitenleiste (mehr Platz für den Hauptbereich) */
.kb-collapse{margin-left:auto;flex:0 0 auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--kb-border);background:none;color:var(--kb-muted);font-size:16px;line-height:1;cursor:pointer;transition:.13s;}
.kb-collapse:hover{background:var(--kb-accent-50);color:var(--kb-accent);border-color:var(--kb-accent);}
.kb-reopen{display:none;position:fixed;top:12px;left:10px;z-index:60;width:38px;height:38px;border-radius:10px;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);font-size:17px;line-height:1;cursor:pointer;box-shadow:var(--kb-shadow-sm);transition:.13s;}
.kb-reopen:hover{background:var(--kb-accent-50);color:var(--kb-accent);border-color:var(--kb-accent);}
@media(min-width:881px){
  .kb-app.kb-collapsed .kb-side{display:none;}
  .kb-app.kb-collapsed .kb-reopen{display:grid;place-items:center;}
  .kb-app.kb-collapsed .kb-stage{padding-left:46px;}
}
@media(max-width:880px){ .kb-collapse{display:none;} }
/* Screening-Ergebnis (kompakt, im Schüler-Hub) */
.sv-riskbox{background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:12px;padding:12px 14px;margin-bottom:14px;color:var(--kb-text);}
.sv-risk{display:inline-block;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;margin:2px 4px 2px 0;background:#fff;border:1px solid var(--kb-danger);color:var(--kb-danger-dark);}
.sv-staerke{display:inline-block;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;}
.sv-deutlich{background:var(--kb-danger-50);color:var(--kb-danger-dark);}
.sv-mittel{background:var(--kb-warn-50);color:#8a5a00;}
.sv-mild{background:var(--kb-accent-50);color:var(--kb-accent-dark);}
.sv-prose{font-size:14px;line-height:1.55;}
.sv-prose p{margin:.4em 0;}
.sv-prose ul,.sv-prose ol{margin:.4em 0 .4em 1.2em;}
.sv-prose h3,.sv-prose h4{font-size:14px;margin:.6em 0 .2em;}
.kb-screen-risk{background:var(--kb-danger-50);color:var(--kb-danger-dark);border:1px solid var(--kb-danger);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;margin-bottom:6px;}
/* ============ Übersichtlichkeit: ruhiger & luftiger ============ */
.kb-pad{padding:30px 34px 76px;max-width:1080px;}
.kb-pagehead h2{font-size:25px;margin:0 0 6px;letter-spacing:-.02em;}
.kb-card{padding:20px 22px;border-radius:16px;box-shadow:none;}
.kb-hub-body{padding:22px 28px 64px;}
.kb-hub-grid{gap:18px;}
.kb-hub-sec{margin:0 0 28px;}
/* Sidebar-Gruppen */
.kb-navgroup{margin-top:16px;}
.kb-navlabel{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--kb-muted-2);padding:2px 11px 5px;}
/* Schüler-Status-Karten */
.st-card{display:flex;flex-direction:column;gap:12px;border-radius:16px;box-shadow:none;transition:box-shadow .15s ease,transform .15s ease,border-color .15s ease;}
.st-card:hover{box-shadow:var(--kb-shadow);transform:translateY(-1px);border-color:var(--kb-accent-200);}
.st-top{display:flex;align-items:center;gap:12px;}
.st-avatar{flex:0 0 auto;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;display:grid;place-items:center;font-size:19px;font-weight:800;}
.st-name{font-size:16.5px;font-weight:800;letter-spacing:-.01em;color:var(--kb-text);line-height:1.2;}
.st-sub{font-size:12.5px;color:var(--kb-muted);font-weight:600;margin-top:2px;}
.st-chips{display:flex;flex-wrap:wrap;gap:6px;}
.st-chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--kb-surface-2);color:var(--kb-text-soft);border:1px solid var(--kb-border);}
.st-chip.st-warn{background:var(--kb-warn-50);color:#8a5a00;border-color:transparent;}
.st-chip.st-danger{background:var(--kb-danger-50);color:var(--kb-danger-dark);border-color:transparent;}
.st-chip.st-ok{background:var(--kb-accent2-50);color:var(--kb-accent2-dark);border-color:transparent;}
.st-foot{font-size:12px;color:var(--kb-muted);margin-top:auto;}
/* Hub-Status-Leiste */
.kb-statstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin:0 0 22px;}
.kb-stat-tile{display:flex;align-items:center;gap:12px;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:14px;padding:13px 15px;box-shadow:var(--kb-shadow-sm);}
.kb-stat-tile .kt-ic{flex:0 0 auto;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;background:var(--kb-accent-50);}
.kb-stat-tile .v{font-size:21px;font-weight:800;color:var(--kb-text);line-height:1;}
.kb-stat-tile .l{font-size:11px;color:var(--kb-muted);font-weight:600;margin-top:3px;}
.kb-stat-tile.kt-warn .kt-ic{background:var(--kb-danger-50);}
.kb-stat-tile.kt-warn .v{color:var(--kb-danger-dark);}
.kb-stat-tile.kt-ok .kt-ic{background:var(--kb-accent2-50);}
.kb-stat-tile.kt-ok .v{color:var(--kb-accent2-dark);}
.kb-hub-avatar{width:54px;height:54px;border-radius:15px;font-size:23px;box-shadow:0 6px 16px rgba(79,91,213,.28);}
.kb-hub-name{font-size:22px;}
.kb-hub-head{padding-top:22px;}
.kb-hub-id .kb-hub-dossier{margin-left:auto;align-self:center;}
.card.kb-mini h4{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:800;margin:0 0 11px;padding-bottom:10px;border-bottom:1px solid var(--kb-border);}
.kb-subhead{font-size:17px;font-weight:800;letter-spacing:-.01em;margin:0 0 12px;color:var(--kb-text);}
.kb-subhead.kb-subhead-mt{margin-top:30px;border-top:1px solid var(--kb-border);padding-top:24px;}
/* Hub-Karten-Inhalte */
.hub-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13.5px;}
.hub-list li{display:flex;align-items:flex-start;gap:8px;line-height:1.4;}
.hub-dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;margin-top:5px;}
.hub-count{font-size:11.5px;font-weight:800;color:var(--kb-accent);background:var(--kb-accent-50);padding:1px 8px;border-radius:999px;margin-left:4px;}
.hub-line{font-size:13.5px;margin:4px 0;line-height:1.45;}
.hub-clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;font-size:13.5px;line-height:1.45;}
.hub-hero-risk{display:flex;align-items:center;gap:14px;background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:16px;padding:14px 18px;margin:0 0 22px;}
.hub-hero-risk .hub-hero-ic{font-size:24px;line-height:1;}
.hub-hero-risk .hub-hero-t{font-weight:800;color:var(--kb-danger-dark);}
.hub-hero-risk .hub-hero-s{font-size:13px;color:var(--kb-text-soft);margin-top:2px;}
.hub-hero-risk .btn{margin-left:auto;flex:0 0 auto;}
/* Karten-Kopf mit Icon-Badge */
.card.kb-mini h4 .mi{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:15px;}
.card.kb-mini h4 .mt{flex:1;min-width:0;}
.mi-a{background:var(--kb-accent-50);}
.mi-g{background:var(--kb-accent2-50);}
.mi-w{background:var(--kb-warn-50);}
.mi-r{background:var(--kb-danger-50);}
.mi-b{background:var(--kb-info-50);}
/* Zwei-Spalten-Layout */
.hub2{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start;}
.hub2-main{display:flex;flex-direction:column;gap:16px;min-width:0;}
.hub2-side{display:flex;flex-direction:column;gap:16px;}
@media(max-width:980px){.hub2{grid-template-columns:1fr;}}
/* Fokus-Panel: Screening */
.scr-panel{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:18px;padding:20px 22px;box-shadow:var(--kb-shadow);}
.scr-panel.is-risk{border-color:var(--kb-danger);background:linear-gradient(180deg,var(--kb-danger-50),var(--kb-surface) 70%);}
.scr-panel-h{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.scr-panel-h .mi{flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:18px;}
.scr-panel-t{font-size:17px;font-weight:800;letter-spacing:-.01em;}
.scr-panel .hub-line{margin:6px 0;}
/* Info-Zeilen-Karte (Seitenspalte) */
.hub-side-card{padding:4px 0;}
.hub-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--kb-border);}
.hub-row:first-child{border-top:none;}
.hub-row .ri{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;background:var(--kb-surface-2);}
.hub-row .rb{flex:1;min-width:0;}
.hub-row .rl{font-size:13.5px;font-weight:700;line-height:1.2;}
.hub-row .rv{font-size:12px;color:var(--kb-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.hub-row .ra{flex:0 0 auto;}
/* Leerer Schüler: Erste Schritte */
.hub-empty{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:20px;padding:44px 28px;text-align:center;box-shadow:var(--kb-shadow);}
.hub-acute{display:flex;align-items:center;gap:12px;background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:12px;padding:10px 14px;margin:0 0 18px;color:var(--kb-danger-dark);font-weight:700;font-size:13.5px;}
.hub-acute a{margin-left:auto;flex:0 0 auto;}
.hub-empty-ic{font-size:46px;margin-bottom:8px;}
.hub-empty h3{margin:0 0 6px;font-size:21px;letter-spacing:-.01em;}
.hub-empty p{color:var(--kb-muted);margin:0 0 20px;}
.hub-empty-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
/* Réunion-Beitrag direkt beim Schüler schreiben */
.reu-h{font-size:15px;font-weight:800;margin:0 0 10px;color:var(--kb-text);}
.reu-write .reu-input{width:100%;border:1px solid var(--kb-border);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;background:var(--kb-surface);color:var(--kb-text);box-sizing:border-box;}
.reu-write .reu-input:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.reu-lbl{display:block;font-size:12px;font-weight:700;color:var(--kb-muted);margin:0 0 5px;}
.reu-write .reu-goals{width:100%;border:1px solid var(--kb-border);border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;background:var(--kb-surface);color:var(--kb-text);box-sizing:border-box;}
.reu-write .reu-goals:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
/* Screening-Ansicht (kurz & einklappbar) */
.sv-h{margin:8px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--kb-muted);font-weight:800;}
.sv-axes{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px;}
.sv-axis{font-size:13px;font-weight:600;padding:5px 12px;border-radius:10px;background:var(--kb-surface-2);border:1px solid var(--kb-border);}
.sv-axis em{font-style:normal;font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;margin-left:5px;opacity:.85;}
.sv-axis-deutlich{background:var(--kb-danger-50);border-color:transparent;color:var(--kb-danger-dark);}
.sv-axis-mittel{background:var(--kb-warn-50);border-color:transparent;color:#8a5a00;}
.sv-axis-mild{background:var(--kb-accent-50);border-color:transparent;color:var(--kb-accent-dark);}
.sv-muster{margin-top:16px;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:16px;padding:18px 20px;}
.sv-muster-name{margin:.1em 0 .5em;font-size:18px;letter-spacing:-.01em;}
.sv-teaser{font-size:14px;line-height:1.55;color:var(--kb-text-soft);margin:0 0 6px;}
.sv-acc{border-top:1px solid var(--kb-border);}
.sv-acc summary{cursor:pointer;padding:11px 0;font-weight:700;font-size:14px;list-style:none;display:flex;align-items:center;gap:8px;color:var(--kb-text);}
.sv-acc summary::-webkit-details-marker{display:none;}
.sv-acc summary::before{content:'▸';color:var(--kb-muted);font-size:12px;transition:transform .15s;}
.sv-acc[open] summary::before{transform:rotate(90deg);}
.sv-acc .sv-prose{padding:0 0 14px;}
.sv-do strong{color:var(--kb-accent2-dark);}
.sv-dont strong{color:var(--kb-danger-dark);}
/* ===== Heute-Tafel ===== */
.kb-heute-datum{margin:0 0 16px;color:var(--kb-muted);}
.kb-heute-frei{background:var(--kb-accent-50);border:1px solid var(--kb-accent-100);border-radius:12px;padding:10px 14px;margin:0 0 14px;font-weight:650;}
.kb-heute-raster{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;align-items:stretch;}
.kb-heute-raster>.kb-heute-karte{margin:0;}
.kb-heute-karte h3{margin:0 0 10px;font-size:16px;}
.kb-heute-liste{list-style:none;margin:0;padding:0;display:grid;gap:6px;}
.kb-heute-liste li{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;font-size:14px;}
.kb-heute-liste.ziele li{flex-direction:column;align-items:flex-start;gap:2px;}
.kb-heute-kind{border:0;background:none;padding:0;font:inherit;font-weight:700;color:var(--kb-text);cursor:pointer;text-align:left;}
.kb-heute-kind:hover{color:var(--kb-accent);text-decoration:underline;}
.kb-heute-chip{font-size:12.5px;font-weight:650;border-radius:999px;padding:2px 10px;background:var(--kb-surface-2);color:var(--kb-text-soft);}
.kb-heute-chip.gelb{background:var(--kb-warn-50);color:#7a5200;}
.kb-heute-chip.rot{background:var(--kb-danger-50);color:var(--kb-danger-dark);}
.kb-heute-typ{flex:0 0 auto;font-size:13px;font-weight:650;color:var(--kb-muted);}
.kb-heute-fuss{margin:10px 0 0;font-size:12.5px;color:var(--kb-muted);}
.kb-link-btn{border:0;background:none;padding:0;font:inherit;font-weight:700;color:var(--kb-accent);cursor:pointer;text-decoration:underline;}
/* ===== Verlauf: Filter-Chips (der aktive war blau auf blau) ===== */
.tl-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);font-size:13px;font-weight:650;text-decoration:none;}
.tl-chip:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.tl-chip.is-on{background:var(--kb-accent);border-color:var(--kb-accent);color:#fff;}
.kb-ziel-ok{color:var(--kb-muted);}
/* ===== Screening: Hinweis auf den Hub und frühere Angaben (nur lesen) ===== */
.kb-scr-hinweis{background:var(--kb-accent-50);border:1px solid var(--kb-accent-100);border-radius:14px;padding:16px 18px;margin:0 0 16px;}
.kb-scr-hinweis h3{margin:0 0 6px;font-size:16px;}
.kb-scr-hinweis p{margin:0 0 12px;font-size:14px;line-height:1.55;color:var(--kb-text-soft);max-width:72ch;}
.kb-scr-alt h4{margin:0 0 4px;font-size:15px;}
.kb-scr-alt .kb-scr-sub{font-size:12.5px;color:var(--kb-muted);margin:0 0 12px;}
.kb-scr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px 20px;margin:0 0 12px;}
.kb-scr-grid h5{margin:0 0 6px;font-size:13.5px;}
.kb-scr-grid ul{margin:0;padding-left:18px;display:grid;gap:4px;font-size:13.5px;}
.kb-scr-dl{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:6px 14px;font-size:13.5px;margin:4px 0 0;}
.kb-scr-dl dt{color:var(--kb-muted);}.kb-scr-dl dd{margin:0;font-weight:600;}
@media (max-width:640px){.kb-scr-dl{grid-template-columns:minmax(0,1fr);}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;}}
`;

var ACCENT_OVERRIDE = `
/* ---- Dossier auf gemeinsame Tokens mappen ---- */
#dos-root{
  --bg:var(--kb-bg); --surface:var(--kb-surface); --border:var(--kb-border);
  --text:var(--kb-text); --text-muted:var(--kb-muted);
  --accent:var(--kb-accent); --accent-soft:var(--kb-accent-50);
  --danger:var(--kb-danger); --danger-soft:var(--kb-danger-50);
  --radius:var(--kb-radius); --shadow:var(--kb-shadow);
  font-family:var(--kb-font);
}
/* ---- Anwesenheit auf gemeinsame Tokens mappen ---- */
#anw-root{
  --primary:var(--kb-accent); --primary-dark:var(--kb-accent-dark); --primary-light:var(--kb-accent-light);
  --primary-50:var(--kb-accent-50); --primary-100:var(--kb-accent-100);
  --ok:var(--kb-ok); --ok-50:var(--kb-ok-50);
  --warn:var(--kb-warn); --warn-50:var(--kb-warn-50);
  --danger:var(--kb-danger); --danger-50:var(--kb-danger-50); --danger-dark:var(--kb-danger-dark);
  --info:var(--kb-info); --info-50:var(--kb-info-50);
  --bg:var(--kb-bg); --card:var(--kb-surface);
  --text:var(--kb-text); --muted:var(--kb-muted); --line:var(--kb-border);
  --radius-lg:var(--kb-radius-lg); --radius:var(--kb-radius); --radius-sm:var(--kb-radius-sm);
  --shadow-sm:var(--kb-shadow-sm); --shadow:var(--kb-shadow); --shadow-lg:var(--kb-shadow-lg);
  --ring:var(--kb-ring);
}
#anw-root header{ position:static; background:linear-gradient(120deg,var(--kb-accent),var(--kb-accent-dark)); box-shadow:0 2px 12px rgba(79,91,213,.22); }
#anw-root header::after{ background:rgba(255,255,255,.2); }
/* Aktionen, die jetzt im Menü / in "Klasse" liegen, im anwesenheit-Kopf ausblenden */
#anw-root #btn-students,#anw-root #btn-add-student,
#anw-root #btn-cal,#anw-root #btn-pdf,#anw-root #btn-data{ display:none; }
/* Der alte Stundenplan-Dialog ist ausgeblendet: der Stundenplan wird jetzt
   je Trimester unter „Klasse & Stundenplan" bearbeitet. Zwei Editoren
   nebeneinander würden am Trimester-Speicher vorbeischreiben. */
#anw-root #btn-tt{ display:none; }
#anw-root .sync-section,#anw-root #reconnect-bar{ display:none !important; }
#dos-root .main{ max-width:1180px; margin:0 auto; }
/* Dossier ruhiger & luftiger */
#dos-root .card{ border-radius:16px; box-shadow:none; }
#dos-root .card-grid{ gap:18px; }
#dos-root .page-head h2{ font-size:25px; letter-spacing:-.02em; }
#dos-root .empty-state{ border-radius:16px; }
#dos-root .card.kb-mini{ box-shadow:var(--kb-shadow-sm); transition:box-shadow .15s ease, transform .15s ease; }
#dos-root .card.kb-mini:hover{ box-shadow:var(--kb-shadow); transform:translateY(-2px); }
#dos-root .sv-muster{ box-shadow:var(--kb-shadow-sm); }
/* Einklappbarer Analyse-Block in der Dossier-Ansicht (entschlackt) */
#dos-root .dossier-fold{ border:1px solid var(--kb-border); border-radius:14px; background:var(--kb-surface); margin:0 0 16px; box-shadow:var(--kb-shadow-sm); }
#dos-root .dossier-fold>summary{ cursor:pointer; padding:14px 18px; font-weight:800; font-size:15px; list-style:none; display:flex; align-items:center; gap:8px; }
#dos-root .dossier-fold>summary::-webkit-details-marker{ display:none; }
#dos-root .dossier-fold>summary::before{ content:'▸'; color:var(--kb-muted); font-size:13px; transition:transform .15s; }
#dos-root .dossier-fold[open]>summary::before{ transform:rotate(90deg); }
#dos-root .dossier-fold>:not(summary){ margin-left:18px; margin-right:18px; }
#dos-root .dossier-fold .section-title{ margin-top:14px; }
#dos-root .dossier-fold .charts-grid{ padding-bottom:16px; }

/* =================================================================
   Professioneller Feinschliff — einheitliches, ruhiges, „fertiges" Layout
   ================================================================= */
/* Datenschutz-Hinweis: schlanke, elegante Leiste, an den Inhalt zentriert */
#dos-root #banner-root{ max-width:1180px; margin:0 auto; }
#dos-root .privacy-banner{ display:flex; align-items:center; gap:14px; background:var(--kb-accent-50); border:1px solid var(--kb-accent-100); border-bottom:1px solid var(--kb-accent-100); border-radius:12px; padding:10px 16px; margin:14px 16px 2px; box-shadow:none; }
#dos-root .privacy-banner>div{ font-size:12.5px; line-height:1.5; color:var(--kb-text-soft); }
#dos-root .privacy-banner>div strong{ color:var(--kb-text); }
#dos-root .privacy-banner button{ margin-left:auto; flex:0 0 auto; white-space:nowrap; border:1px solid var(--kb-border); background:#fff; color:var(--kb-text); font-weight:700; border-radius:9px; padding:8px 14px; cursor:pointer; }
#dos-root .privacy-banner button:hover{ border-color:var(--kb-accent); color:var(--kb-accent); }
/* Schüler-Hub-Kopf als saubere, klar abgegrenzte Leiste */
#dos-root .kb-hub-head{ border-bottom:1px solid var(--kb-border); margin-bottom:0; }
#dos-root .kb-hub-tabs{ border-bottom:none; }
#dos-root .kb-hub-body{ background:var(--kb-bg); }
/* Listen-/Karten-Raster etwas luftiger & konsistent */
#dos-root .card-grid{ gap:16px; }

/* ---- Anwesenheit (Klassenbuch) angleichen ---- */
/* Avatare vereinheitlichen — Marke statt Regenbogen */
#anw-root .avatar{ background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark))!important; color:#fff!important; box-shadow:0 2px 6px rgba(79,91,213,.22)!important; }
/* Ruhiger, eleganter Leerzustand */
#anw-root .main-empty{ padding:48px 24px; }
#anw-root .main-empty .i{ font-size:34px; opacity:.45; }
#anw-root .main-empty p{ color:var(--kb-text-soft); font-weight:700; }
#anw-root .main-empty .hint{ font-weight:500; color:var(--kb-muted); }
/* Kopfleiste etwas ruhiger */
#anw-root header{ box-shadow:0 1px 0 rgba(255,255,255,.12) inset, 0 6px 18px rgba(79,91,213,.16); }

/* ---- Stundenplan: groß & übersichtlich, einheitliches Design ---- */
#anw-root #modal-tt .modal{ max-width:1040px; }
#anw-root .tt-tabs{ gap:8px; margin-bottom:16px; }
#anw-root .tt-tab{ padding:9px 22px; font-size:14.5px; }
#anw-root .tt-grid table{ width:100%; font-size:14px; border-collapse:separate; border-spacing:0; }
#anw-root .tt-grid th,#anw-root .tt-grid td{ padding:9px 10px; }
#anw-root .tt-grid input{ font-size:14px; min-width:104px; padding:9px 10px; border-radius:8px; }
#anw-root .tt-grid .tcol{ font-size:13px; font-weight:800; }

/* ---- Wochen-Horaire (Klassenbuch): größer & besser lesbar ---- */
/* Höhere Zellen + größere Schrift = Hauptgewinn; Spaltenbreite moderat,
   damit alle 5 Tage auch auf Laptops ohne Scrollen passen. */
#anw-root .wk-grid table{ border-spacing:6px; table-layout:fixed; }
#anw-root .wk-grid thead th.th-time{ width:64px; }   /* Tage gleich breit */
#anw-root .wk-grid-large table{ min-width:700px; }
#anw-root .wk-grid thead th{ min-width:108px; padding:11px 6px; font-size:14px; }
#anw-root .wk-grid thead th .dn{ font-size:16.5px; }
#anw-root .wk-grid thead th .dt{ font-size:12.5px; }
#anw-root .wk-grid .tc{ font-size:13px; padding:10px 10px; }
#anw-root .wk-grid .tc .tw{ font-size:11.5px; }
#anw-root .wk-grid .wcell{ min-height:82px; font-size:15.5px; padding:12px 10px; border-radius:13px; gap:5px; }
#anw-root .wk-grid .wcell .subj-lbl{ font-size:15.5px; line-height:1.25; }
#anw-root .wk-grid .wcell.empty{ min-height:82px; }
#anw-root .wk-grid .wcell.pause{ font-size:13.5px; }
#anw-root .wk-grid .wcell .mk{ font-size:12px; padding:2px 10px; }
#anw-root .wk-grid .wcell.has-note{ padding-top:30px; }
@media (max-width:900px){ #anw-root .wk-grid .wcell{ min-height:68px; font-size:14px; } #anw-root .wk-grid .wcell .subj-lbl{ font-size:14px; } }

/* ---- Schülerliste schlanker -> mehr Platz fürs Horaire ---- */
#anw-root .layout{ max-width:1680px; }
#anw-root .sidebar{ flex:0 0 196px; padding:12px 8px; }
#anw-root .side-stu{ padding:6px 8px; gap:8px; }
#anw-root .side-stu .avatar{ width:30px; height:30px; font-size:12px; border-radius:9px; }
#anw-root .side-stu .nm{ font-size:13px; }
#anw-root .side-stu .nm small{ font-size:10px; }
#anw-root .side-stu .hrs{ font-size:11px; padding:2px 7px; }
/* Spalten nutzen freien Platz über width:100%; eine größere Mindestbreite würde bei 1280 px
   den Freitag abschneiden */

/* ---- Schülerliste per Klick einklappen + Summe unter das Horaire ---- */
#anw-root .wrap{ display:flex; flex-direction:column; }
#anw-root .wrap > .side-toggle{ order:0; align-self:flex-start; margin:0 0 14px; }
#anw-root .wrap > #main-area{ order:2; }
#anw-root .wrap > #summary{ order:3; margin:22px 0 0; }
#anw-root .side-toggle{ display:inline-flex; align-items:center; gap:7px; background:var(--kb-surface,#fff); border:1px solid var(--line,#e2e3ee); border-radius:10px; padding:8px 14px; font-size:13.5px; font-weight:700; cursor:pointer; color:var(--primary-dark,#4f5bd5); transition:.12s; }
#anw-root .side-toggle:hover{ border-color:var(--primary,#6C5CE7); background:var(--primary-50,#eef0fb); }
/* Eingeklappt: Schülerliste weg -> Horaire über volle Breite */
#anw-root .layout.side-collapsed .sidebar{ display:none; }
#anw-root .layout.side-collapsed .wk-grid-large table{ min-width:0; }
#anw-root .layout.side-collapsed .wk-grid thead th{ min-width:150px; }
#anw-root .layout.side-collapsed .wk-grid .wcell{ min-height:90px; }
`;

var SHELL_BODY_TOP = `
<div class="kb-app" id="kb-app">
  <div class="kb-topbar">
    <button class="kb-burger" id="kb-burger" aria-label="Menü öffnen">☰</button>
    <div class="kb-topbrand"><span class="kb-logo">📘</span><span>Klassenbuch</span></div>
  </div>
  <button class="kb-reopen" id="kb-reopen" aria-label="Seitenleiste einblenden" title="Seitenleiste einblenden">☰</button>
  <aside class="kb-side" id="kb-side" aria-label="Hauptnavigation">
    <div class="kb-brand"><span class="kb-logo">📘</span><span class="kb-brandtext"><b>Klassenbuch</b><small id="kb-brand-team">CDSE</small></span><button class="kb-collapse" id="kb-collapse" aria-label="Seitenleiste einklappen" title="Seitenleiste einklappen">«</button></div>
    <button class="kb-userchip" id="kb-userchip" aria-label="Aktuelle Person — klicken zum Wechseln"></button>
    <button class="kb-termchip" id="kb-termchip" aria-label="Schuljahr und Trimester — klicken zum Ändern"></button>
    <nav class="kb-nav">
      <button class="kb-link" data-kb-nav="heute"><span class="kb-ic">☀️</span>Heute</button>
      <button class="kb-link" data-kb-nav="students"><span class="kb-ic">👥</span>Schüler</button>
      <button class="kb-link" data-kb-nav="search"><span class="kb-ic">🔎</span>Suche</button>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Unterricht</div>
        <button class="kb-link" data-kb-nav="absenzen"><span class="kb-ic">📋</span>Klassenbuch</button>
        <button class="kb-link" data-kb-nav="reunion"><span class="kb-ic">🤝</span>Réunionen</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Im CDSE Hub</div>
        <button class="kb-link" data-kb-hub="toolbox"><span class="kb-ic">🧰</span>Toolbox</button>
        <button class="kb-link" data-kb-hub="screening"><span class="kb-ic">🔍</span>Screening</button>
        <button class="kb-link" data-kb-hub="lernen"><span class="kb-ic">📖</span>Lernen</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Werkzeuge</div>
        <button class="kb-link" data-kb-nav="klasse"><span class="kb-ic">🏫</span>Klasse &amp; Stundenplan</button>
        <button class="kb-link" data-kb-nav="werkzeuge"><span class="kb-ic">🗒️</span>Organisation &amp; Berichte</button>
        <button class="kb-link" data-kb-nav="data"><span class="kb-ic">🔌</span>Verbindung &amp; Backup</button>
      </div>
    </nav>
    <div class="kb-foot">Gespeichert in diesem Browser, verschlüsselt im Hub-Tresor und – falls verbunden – in der Team-Datei. Keine Cloud.</div>
  </aside>
  <div class="kb-scrim" id="kb-scrim"></div>
  <main class="kb-stage" id="kb-stage">
`;

var SHELL_PANELS_EXTRA = `
    <section class="kb-panel kb-pad" id="kb-heute"><div id="kb-heute-body"></div></section>
    <section class="kb-panel kb-pad" id="kb-klasse">
      <div class="kb-pagehead"><h2>🏫 Klasse, Stundenplan &amp; Schuljahr</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Alles, was die Klasse strukturiert — an einem Ort. Der Stundenplan wird <b>je Trimester</b> geführt.</p></div>

      <div class="kb-card kb-termcard">
        <div class="kb-card-h"><h3>🎓 Schuljahr &amp; Trimester</h3><span class="kb-term-now" id="kb-term-now"></span></div>
        <div class="kb-termpick">
          <select class="kb-in kb-termyear" id="kb-term-year" aria-label="Schuljahr"></select>
          <div class="kb-termtabs" id="kb-term-tabs" role="group" aria-label="Trimester"></div>
          <button class="kb-btn" id="kb-term-auto" title="Wieder automatisch nach dem heutigen Datum">⟳ Automatisch</button>
        </div>
        <div class="kb-termdates" id="kb-term-dates"></div>
        <div class="kb-termfoot">
          <div class="kb-termnew">
            <input class="kb-in" id="kb-term-new" style="max-width:150px;" autocomplete="off">
            <button class="kb-btn" id="kb-term-add">+ Schuljahr anlegen</button>
          </div>
          <div class="kb-termacts">
            <button class="kb-btn" id="kb-term-reset" title="Termine wieder auf den luxemburgischen Schulkalender setzen">↺ Termine zurücksetzen</button>
            <button class="kb-btn" id="kb-term-close"></button>
            <button class="kb-btn" data-kb-act="open-cal">📆 Schulkalender</button>
          </div>
        </div>
      </div>

      <div class="kb-card kb-ttcard">
        <div class="kb-card-h"><h3>🗓️ Stundenplan</h3><span class="kb-term-now" id="kb-tt-for"></span></div>
        <p class="kb-hint">Direkt in die Felder schreiben — wird sofort gespeichert. Bekannte Fächer erscheinen als Vorschlag. Dieser Plan gilt <b>nur für das oben gewählte Trimester</b>.</p>
        <div class="kb-ttbar">
          <div class="kb-ttlevels" id="kb-tt-levels" role="group" aria-label="Niveau"></div>
          <div class="kb-ttacts">
            <select class="kb-in" id="kb-tt-copy" style="max-width:250px;"></select>
            <button class="kb-btn" id="kb-tt-copybtn">Übernehmen</button>
            <button class="kb-btn" id="kb-tt-clear" title="Alle Fächer in diesem Trimester leeren (Pausen bleiben)">Leeren</button>
            <button class="kb-btn" id="kb-tt-reset" title="Den offiziellen Stundenplan 2026/27 wieder einsetzen">↺ Standard-Stundenplan</button>
          </div>
        </div>
        <div class="kb-ttwrap"><div id="kb-tt-grid"></div></div>
        <datalist id="kb-tt-subjects"></datalist>
      </div>

      <div class="kb-card">
        <div class="kb-card-h"><h3>📚 Fächer</h3><span class="kb-term-now" id="kb-sub-count"></span></div>
        <p class="kb-hint">Fächer entstehen dadurch, dass du sie oben in den Stundenplan schreibst. Ein Fach hier umzubenennen ändert es <b>überall</b> mit: in allen Trimestern, in den Noten, in den Absenzen und in den Klassenbuch-Notizen — so verwaist nichts.</p>
        <div id="kb-sub-list"></div>
      </div>

      <div class="kb-card">
        <div class="kb-card-h"><h3>⏰ Stundenraster</h3><span class="kb-term-now" id="kb-blk-state"></span></div>
        <p class="kb-hint">Die Uhrzeiten der Stunden. Die Anzahl der Stunden bleibt fest, weil bereits erfasste Absenzen an den einzelnen Stunden hängen — nur die Zeiten lassen sich anpassen.</p>
        <div id="kb-blk-list"></div>
        <div style="margin-top:12px;"><button class="kb-btn" id="kb-blk-reset">↺ Standardzeiten wiederherstellen</button></div>
      </div>

      <h3 style="margin:18px 0 8px;">Gemeinsame Schülerliste</h3>
      <p style="margin:0 0 12px;color:var(--kb-muted);font-size:13.5px;">Eine Liste für Anwesenheit und Dossiers — Änderungen wirken sofort in beiden Bereichen.</p>
      <div class="kb-card" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input class="kb-in" id="kb-roster-name" style="flex:1;min-width:170px;" placeholder="Name des neuen Schülers">
        <input class="kb-in" id="kb-roster-klasse" style="max-width:130px;" placeholder="Klasse (optional)">
        <select class="kb-in" id="kb-roster-level" style="max-width:90px;"><option>L1</option><option>L2</option></select>
        <button class="kb-btn kb-btn-primary" id="kb-roster-add">+ Hinzufügen</button>
      </div>
      <div id="kb-roster-body"></div>

      <h3 class="kb-toolsec">Material</h3>
      <div class="kb-tools">
        <div class="kb-card kb-tool">
          <h3>🧰 Toolbox im Hub</h3>
          <p class="kb-hint">125 Arbeitsblätter und über 600 Materialien – nach Förderziel, Thema und Stufe. Öffnet die Toolbox des CDSE Hub.</p>
          <button class="kb-btn" data-kb-hub="toolbox">Toolbox öffnen</button>
        </div>
      </div>
    </section>
    <section class="kb-panel kb-pad" id="kb-werkzeuge">
      <div class="kb-pagehead"><h2>🗒️ Organisation &amp; Berichte</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Was während des Jahres anfällt und was daraus nach außen geht — Orga-Logbuch, Auswertungen und alle Berichte zum Ausdrucken.</p></div>

      <div class="kb-tools">
        <div class="kb-card kb-tool">
          <h3>🗒️ Organisation</h3>
          <p class="kb-hint">Alle Orga-Punkte aus allen Réunionen, neueste zuerst, mit Volltextsuche. <b id="kb-wz-orga">—</b></p>
          <button class="kb-btn kb-btn-primary" data-kb-nav="orga">Logbuch öffnen</button>
        </div>
        <div class="kb-card kb-tool">
          <h3>🏷️ Themen-Analyse</h3>
          <p class="kb-hint">Welche Themen in den Dossier-Einträgen wiederkehren und bei wem — für die Vorbereitung von Gesprächen.</p>
          <button class="kb-btn" data-kb-nav="themes">Themen ansehen</button>
        </div>
      </div>

      <h3 class="kb-toolsec">Berichte &amp; PDF</h3>
      <div class="kb-tools">
        <div class="kb-card kb-tool">
          <h3>📄 Absenzen-Bericht</h3>
          <p class="kb-hint">Excusé, Non-excusé und Retards je Schüler für die gewählte Periode, mit häufigstem Fach. Druckansicht — im Dialog „Als PDF speichern".</p>
          <button class="kb-btn kb-btn-primary" data-kb-nav="absenzen-pdf">Bericht erstellen</button>
        </div>
        <div class="kb-card kb-tool">
          <h3>📑 Dossier-Bericht</h3>
          <p class="kb-hint">Verlauf eines Schülers als Bericht: Einträge, Ziele und Verlaufskurven, wahlweise anonymisiert.</p>
          <button class="kb-btn kb-btn-primary" data-kb-nav="export">Bericht erstellen</button>
        </div>
        <div class="kb-card kb-tool">
          <h3>🤝 Réunion-Protokoll</h3>
          <p class="kb-hint">Das Protokoll einer Team-Réunion als PDF oder Word — die Knöpfe sitzen oben in der Réunion selbst. <b id="kb-wz-reu">—</b></p>
          <button class="kb-btn" data-kb-nav="reunion">Zur Réunion</button>
        </div>
        <div class="kb-card kb-tool">
          <h3>📅 Wochen-Sicherung</h3>
          <p class="kb-hint">Alles, was in einer Woche neu dazugekommen ist, als Excel oder Word — zum Archivieren.</p>
          <button class="kb-btn" data-kb-nav="data">Zu Verbindung &amp; Backup</button>
        </div>
      </div>
    </section>

    <section class="kb-panel kb-pad" id="kb-data">
      <div class="kb-pagehead"><h2>🔌 Verbindung &amp; Backup</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Die gemeinsame Team-Datei, tägliche und wöchentliche Sicherungen, Papierkorb und Rechtschreibprüfung.</p></div>
      <div class="kb-card" id="kb-sync-card">
        <h3 style="margin:0 0 6px;">🗄️ Gemeinsamer Speicher (Team-Datei auf O:\\)</h3>
        <p style="margin:0 0 10px;color:var(--kb-muted);">Eine gemeinsame Datei auf eurem Netzlaufwerk — alle Geräte schreiben hinein, Änderungen werden <b>pro Eintrag zusammengeführt</b> (nichts wird überschrieben). Nur in Chrome/Edge; jede Person verbindet die Datei einmal. Eine Person legt sie an, alle anderen wählen „Bestehende Datei öffnen".</p>
        <div id="kb-sync-status" class="kb-sync-status">…</div>
        <div id="kb-sync-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"></div>
      </div>
      <div class="kb-card"><h3 style="margin:0 0 6px;">📋 Anwesenheit & Klassenbuch</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Absenzen, Stundenplan und Notizen — Backup, Excel/CSV-Export, gemeinsame Datei.</p><button class="kb-btn kb-btn-primary" id="kb-data-anw">Sichern oder als Excel/CSV exportieren</button></div>
      <div class="kb-card"><h3 style="margin:0 0 6px;">🗂️ Dossiers & Réunion</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Schüler-Dossiers, Réunionen und Organisation — Backup exportieren/importieren.</p><button class="kb-btn kb-btn-primary" id="kb-data-dos">Dossier-Backup öffnen</button></div>
      <div class="kb-card">
        <div class="kb-card-h"><h3>📅 Wochen-Sicherung</h3><span class="kb-term-now" id="kb-wk-range"></span></div>
        <p class="kb-hint">Alles, was in <b>einer Woche neu dazugekommen</b> ist — Réunionen, Wochenziele, Dossier-Einträge, Noten, Screenings, Absenzen und Klassenbuch-Notizen. Zum Archivieren, damit nie etwas verloren geht.</p>
        <div class="kb-wkbar">
          <button class="kb-btn" id="kb-wk-prev" title="Woche zurück">‹</button>
          <input class="kb-in" type="date" id="kb-wk-date" style="max-width:170px;">
          <button class="kb-btn" id="kb-wk-next" title="Woche vor">›</button>
          <button class="kb-btn" id="kb-wk-this">Diese Woche</button>
        </div>
        <div id="kb-wk-counts" class="kb-sync-status" style="margin:10px 0;"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="kb-btn kb-btn-primary" id="kb-wk-xlsx">📊 Excel (.xlsx)</button>
          <button class="kb-btn" id="kb-wk-doc">📝 Word (.doc)</button>
          <button class="kb-btn" id="kb-weekly-dl">🌐 HTML — letzte 5 Wochen</button>
        </div>
      </div>
      <div class="kb-card">
        <div class="kb-card-h"><h3>✍️ Rechtschreibprüfung (Lëtzebuergesch)</h3><span class="kb-term-now" id="kb-sp-n"></span></div>
        <p class="kb-hint">Unterstreicht in allen Schreibfeldern, was nicht im luxemburgischen Wörterbuch steht, und schlägt beim Anklicken das richtige Wort vor. Das Wörterbuch (spellchecker.lu) steckt in der App — nichts geht ins Internet.</p>
        <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;">
          <input type="checkbox" id="kb-sp-an" style="margin-top:3px;">
          <span>Fehler unterstreichen</span>
        </label>
        <div id="kb-sp-eigen" style="margin-top:10px;"></div>
      </div>
      <div class="kb-card">
        <div class="kb-card-h"><h3>🗑️ Papierkorb</h3><span class="kb-term-now" id="kb-trash-n"></span></div>
        <p class="kb-hint">Gelöschte Dossier-Einträge und Réunionen liegen hier <b>120 Tage</b> lang und lassen sich zurückholen. Der Papierkorb bleibt auf diesem Gerät und wird nicht mit dem Team geteilt.</p>
        <div id="kb-trash-list"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button class="kb-btn" id="kb-trash-empty">Papierkorb leeren</button>
        </div>
      </div>
    </section>
  </main>
</div>
`;

/* ============================================================
   Schuljahr & Trimester — echte luxemburgische Termine.
   Die Datumsgrenzen werden BEIM BAUEN aus dem Schulkalender
   (LU_YEARS in anwesenheit.html) gezogen, damit es nur EINE Quelle
   dafür gibt. Für Jahre, die dort (noch) nicht stehen, rechnet das
   Modul eine Vorbelegung aus, die sich im Dialog anpassen lässt.
   ============================================================ */
var LU_TERM_SEED = (function () {
  var i = anw.indexOf('var LU_YEARS=');
  if (i < 0) { console.warn('LU_YEARS nicht gefunden — Trimester nutzen berechnete Vorgaben.'); return {}; }
  var j = anw.indexOf('\n  ];', i);
  if (j < 0) { console.warn('LU_YEARS-Ende nicht gefunden.'); return {}; }
  var arr;
  try { arr = eval(anw.slice(i, j + 5) + '; LU_YEARS'); }
  catch (e) { console.warn('LU_YEARS nicht lesbar: ' + e.message); return {}; }
  var out = {};
  (arr || []).forEach(function (y) {
    var start = parseInt(String(y.key).slice(0, 4), 10);
    if (!start) return;
    var terms = [];
    (y.periods || []).forEach(function (p) {
      var m = /^([123])\. Trimester/.exec(p.name || '');
      if (m) terms.push({ key: 'T' + m[1], from: p.start, to: p.end });
    });
    if (terms.length === 3) out[start] = { from: y.start, to: y.end, terms: terms };
  });
  var n = Object.keys(out).length;
  if (!n) console.warn('Keine Trimester aus LU_YEARS gelesen.');
  else console.log('Trimester aus Schulkalender übernommen für: ' + Object.keys(out).join(', '));
  return out;
})();

var TERMS_MODULE = `
window.KB_TERMS=(function(){
  var LS='klassebuch_terms_v1';
  var SEED=${JSON.stringify(LU_TERM_SEED)};
  var TKEYS=['T1','T2','T3'];
  var TLABEL={T1:'1. Trimester',T2:'2. Trimester',T3:'3. Trimester'};

  function pad(n){return (n<10?'0':'')+n;}
  function iso(y,m,d){return y+'-'+pad(m)+'-'+pad(d);}
  function todayIso(){var d=new Date();return iso(d.getFullYear(),d.getMonth()+1,d.getDate());}
  function labelOf(y){return y+'/'+('0'+((y+1)%100)).slice(-2);}
  function normStart(raw){
    var s=String(raw==null?'':raw);var m=s.match(/[0-9]{1,4}/);if(!m)return 0;
    var n=parseInt(m[0],10);if(n<100)n=2000+n;if(n<1900||n>2200)return 0;return n;
  }
  /* Das Schuljahr beginnt Mitte September: vor August zählt noch das Vorjahr. */
  function defaultStart(){var d=new Date();var y=d.getFullYear();return (d.getMonth()>=7)?y:(y-1);}
  /* Echte Termine aus dem Schulkalender, sonst eine grobe Vorbelegung. */
  function seedFor(y){
    if(SEED[y])return {from:SEED[y].from,to:SEED[y].to,terms:SEED[y].terms.map(function(t){return {key:t.key,from:t.from,to:t.to};})};
    return {from:iso(y,9,15),to:iso(y+1,7,15),terms:[
      {key:'T1',from:iso(y,9,15),  to:iso(y,12,18)},
      {key:'T2',from:iso(y+1,1,4), to:iso(y+1,3,26)},
      {key:'T3',from:iso(y+1,4,12),to:iso(y+1,7,15)}
    ]};
  }
  function mkYear(y){var s=seedFor(y);return {id:'y'+y,start:y,label:labelOf(y),from:s.from,to:s.to,closed:false,createdAt:Date.now(),terms:s.terms};}

  function load(){try{var o=JSON.parse(localStorage.getItem(LS)||'null');return (o&&o.years&&o.years.length)?o:null;}catch(e){return null;}}
  function save(){try{localStorage.setItem(LS,JSON.stringify(data));}catch(e){}}
  var data=load();
  var hooks=[];
  function fire(){for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function byId(id){if(!data)return null;for(var i=0;i<data.years.length;i++){if(data.years[i].id===id)return data.years[i];}return null;}
  function sortY(){data.years.sort(function(a,b){return a.start-b.start;});}
  function fixTerms(y){
    var def=seedFor(y.start).terms;
    if(!y.terms||!y.terms.length){y.terms=def;return;}
    var by={};for(var i=0;i<y.terms.length;i++){if(y.terms[i]&&y.terms[i].key)by[y.terms[i].key]=y.terms[i];}
    var out=[];
    for(var j=0;j<TKEYS.length;j++){var k=TKEYS[j];var t=by[k]||def[j];out.push({key:k,from:t.from||def[j].from,to:t.to||def[j].to});}
    y.terms=out;
  }
  function ensure(){
    if(!data||!data.years||!data.years.length){data={years:[],pinned:null,seeded:0};}
    if(!data.pinned)data.pinned=null;
    /* Alle Schuljahre, die der Schulkalender kennt, stehen zur Auswahl — sonst
       gäbe es nur das laufende Jahr und man käme nicht mehr an das vorige.
       Einmalig ergänzt, damit später hinzugefügte Jahre erhalten bleiben. */
    if(!data.seeded){
      var add=Object.keys(SEED).map(Number);
      var d0=defaultStart(); if(add.indexOf(d0)<0)add.push(d0);
      add.sort(function(a,b){return a-b;});
      for(var k=0;k<add.length;k++){if(!byId('y'+add[k]))data.years.push(mkYear(add[k]));}
      data.seeded=1; sortY(); save();
    }
    for(var i=0;i<data.years.length;i++){fixTerms(data.years[i]);}
    return data;
  }
  ensure();

  function yearForDate(d){ensure();for(var i=0;i<data.years.length;i++){var y=data.years[i];if(d>=y.from&&d<=y.to)return y;}return null;}
  function termForDate(y,d){if(!y)return null;for(var i=0;i<y.terms.length;i++){var t=y.terms[i];if(d>=t.from&&d<=t.to)return t;}return null;}
  /* Aktiv = fest gewählt, sonst nach heutigem Datum, sonst jüngstes Jahr. */
  function active(){
    ensure();
    var d=todayIso();
    if(data.pinned){
      var py=byId(data.pinned.year);
      if(py){var pt=null;for(var i=0;i<py.terms.length;i++){if(py.terms[i].key===data.pinned.term)pt=py.terms[i];}
        return {year:py,term:pt||py.terms[0],auto:false};}
    }
    var y=yearForDate(d);
    if(y)return {year:y,term:termForDate(y,d)||y.terms[0],auto:true};
    var last=data.years[data.years.length-1];
    return {year:last,term:last.terms[0],auto:true};
  }

  return {
    list:function(){ensure();return data.years.map(function(y){return {id:y.id,start:y.start,label:y.label,from:y.from,to:y.to,closed:!!y.closed,terms:y.terms.map(function(t){return {key:t.key,label:TLABEL[t.key],from:t.from,to:t.to};})};});},
    active:active,
    activeYearId:function(){return active().year.id;},
    activeTermKey:function(){var a=active();return a.term?a.term.key:'T1';},
    /* Schlüssel, mit dem der Stundenplan pro Trimester getrennt wird. */
    key:function(){var a=active();return a.year.id+':'+(a.term?a.term.key:'T1');},
    keyOf:function(yearId,termKey){return yearId+':'+(termKey||'T1');},
    label:function(){var a=active();return a.year.label+(a.term?(' · '+TLABEL[a.term.key]):'');},
    yearLabel:function(){return active().year.label;},
    termLabel:function(k){return TLABEL[k]||k;},
    termKeys:function(){return TKEYS.slice();},
    isClosed:function(id){var y=byId(id||active().year.id);return !!(y&&y.closed);},
    isAuto:function(){return active().auto;},
    dateRange:function(){var a=active();return a.term?{from:a.term.from,to:a.term.to}:{from:a.year.from,to:a.year.to};},
    pin:function(yearId,termKey){ensure();if(!byId(yearId))return false;data.pinned={year:yearId,term:termKey||'T1'};save();fire();return true;},
    unpin:function(){ensure();data.pinned=null;save();fire();},
    addYear:function(raw){ensure();var s=normStart(raw);if(!s)return null;var id='y'+s;
      if(!byId(id)){data.years.push(mkYear(s));sortY();}
      data.pinned={year:id,term:'T1'};save();fire();return id;},
    setTermRange:function(id,key,from,to){var y=byId(id);if(!y)return;
      for(var i=0;i<y.terms.length;i++){if(y.terms[i].key===key){if(from)y.terms[i].from=from;if(to)y.terms[i].to=to;}}
      if(y.terms[0].from<y.from)y.from=y.terms[0].from;
      if(y.terms[2].to>y.to)y.to=y.terms[2].to;
      save();fire();},
    resetTerms:function(id){var y=byId(id);if(!y)return;var s=seedFor(y.start);y.from=s.from;y.to=s.to;y.terms=s.terms;save();fire();},
    closeYear:function(id){var y=byId(id||active().year.id);if(y){y.closed=true;save();fire();}},
    reopenYear:function(id){var y=byId(id||active().year.id);if(y){y.closed=false;save();fire();}},
    nextLabel:function(){ensure();var mx=0;for(var i=0;i<data.years.length;i++){if(data.years[i].start>mx)mx=data.years[i].start;}return labelOf(mx?mx+1:defaultStart());},
    onChange:function(fn){if(typeof fn==='function')hooks.push(fn);},
    /* Team-Sync: Jahre und Trimester werden geteilt, die feste Auswahl bleibt lokal. */
    syncExport:function(){ensure();return data.years.map(function(y){return {id:y.id,start:y.start,label:y.label,from:y.from,to:y.to,closed:!!y.closed,terms:y.terms};});},
    syncApply:function(arr){
      if(!arr||!arr.length)return;
      var keep=data?data.pinned:null;
      data={years:[],pinned:keep,seeded:1};
      for(var i=0;i<arr.length;i++){var r=arr[i];if(r&&r.id&&r.start){data.years.push({id:r.id,start:r.start,label:r.label||labelOf(r.start),from:r.from,to:r.to,closed:!!r.closed,createdAt:r.createdAt||Date.now(),terms:r.terms||seedFor(r.start).terms});}}
      sortY();for(var j=0;j<data.years.length;j++){fixTerms(data.years[j]);}
      if(data.pinned&&!byId(data.pinned.year))data.pinned=null;
      save();fire();
    }
  };
})();
`;

/* ============================================================
   KB_TIMETABLE — ein Stundenplan JE (Schuljahr · Trimester).
   Die Anwesenheits-Engine arbeitet unverändert mit genau EINEM
   state.timetable weiter; dieses Modul legt darunter einen Speicher
   je Trimester und tauscht beim Wechsel das aktive Raster aus.
   Dadurch bleiben Wochenansicht, Absenzen und Fächerliste unberührt.
   ============================================================ */
var TIMETABLE_MODULE = `
window.KB_TIMETABLE=(function(){
  var LS='klassebuch_timetables_v1';
  var cur=null, hooks=[];
  function fire(){for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function load(){try{return JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){return {};}}
  function save(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  function clone(o){try{return JSON.parse(JSON.stringify(o));}catch(e){return null;}}
  function termKey(){try{return (window.KB_TERMS&&window.KB_TERMS.key())||'';}catch(e){return '';}}
  function liveTT(){try{return (window.KB_ANW&&window.KB_ANW.getTimetable)?window.KB_ANW.getTimetable():null;}catch(e){return null;}}
  function pushTT(tt){try{if(window.KB_ANW&&window.KB_ANW.setTimetable)window.KB_ANW.setTimetable(tt);}catch(e){}}
  /* Ein Plan ist nur brauchbar, wenn er zum Raster passt UND Inhalt hat.
     Sonst waere der Wochenplan leer - und dort laesst sich dann nichts
     eintragen, weil Absenzen nur auf belegten Stunden moeglich sind. */
  function usable(tt){return fitsRaster(tt)&&nonEmpty(tt);}
  function fallback(){
    var live=liveTT(); if(usable(live))return live;
    try{if(window.KB_ANW&&window.KB_ANW.defaultTimetable){var d=window.KB_ANW.defaultTimetable();if(usable(d))return d;}}catch(e){}
    return null;
  }
  function nonEmpty(tt){
    if(!tt)return false;
    for(var lv in tt){var d=tt[lv]||{};for(var w in d){var a=d[w]||[];for(var i=0;i<a.length;i++){if(a[i])return true;}}}
    return false;
  }
  /* Passt ein gespeicherter Plan noch zum aktuellen Stundenraster? Nach einer
     Rasteränderung (z. B. 7 -> 9 Stunden) sind alte Pläne unbrauchbar. */
  function fitsRaster(tt){
    var n=0;try{n=(window.KB_ANW&&window.KB_ANW.blocks)?window.KB_ANW.blocks().length:0;}catch(e){}
    if(!n||!tt)return false;
    for(var lv in tt){var d=tt[lv]||{};
      for(var w=1;w<=5;w++){var a=d[w];if(!a||a.length!==n)return false;}}
    return true;
  }
  function dropStale(o){
    var n=0;
    for(var k in o){if(!fitsRaster(o[k])){delete o[k];n++;}}
    return n;
  }
  /* Woher bekommt ein noch leeres Trimester seinen Plan?
     Vorheriges Trimester desselben Jahres -> letzter vorhandener Plan -> aktuell geladener. */
  function sourceFor(key,store){
    var p=String(key).split(':'), yid=p[0], tk=p[1]||'T1';
    var order=['T1','T2','T3'];
    var idx=order.indexOf(tk);
    for(var i=idx-1;i>=0;i--){var k=yid+':'+order[i];if(store[k]&&nonEmpty(store[k]))return store[k];}
    var keys=Object.keys(store).sort();
    for(var j=keys.length-1;j>=0;j--){if(nonEmpty(store[keys[j]]))return store[keys[j]];}
    return liveTT();
  }
  /* Den gerade geladenen Plan in seinen Trimester-Slot zurückschreiben. */
  function stash(){
    if(!cur)return;
    var tt=liveTT(); if(!tt)return;
    var o=load(); o[cur]=tt; save(o);
  }
  /* Auf das aktive Trimester umschalten (und beim ersten Mal migrieren). */
  function activate(force){
    var k=termKey(); if(!k)return;
    if(k===cur&&!force)return;
    var o=load();
    if(dropStale(o))save(o);          /* Pläne aus einem alten Raster verwerfen */
    if(cur&&cur!==k){var live=liveTT();if(live){o[cur]=live;}}
    if(!usable(o[k])){
      var src=sourceFor(k,o);
      if(!usable(src))src=fallback();
      if(src)o[k]=clone(src);
    }
    if(!usable(o[k])){delete o[k];save(o);cur=k;fire();return;}   /* nichts Kaputtes setzen */
    save(o);
    cur=k;
    pushTT(o[k]);
    fire();
  }
  /* Einmalige Übernahme: bestehender Stundenplan wandert ins aktuelle Trimester. */
  function migrateOnce(){
    var o=load();
    if(dropStale(o))save(o);
    if(Object.keys(o).length)return false;
    var k=termKey(); if(!k)return false;
    var live=liveTT();
    o[k]=live&&nonEmpty(live)?live:(live||{});
    save(o); cur=k;
    return true;
  }
  /* Freitags 13:30-15:15 ist ebenfalls Skillstruck. In den bereits
     gespeicherten Trimester-Plaenen wird nur diese eine Stunde nachgetragen,
     und nur wenn sie leer ist - alles andere bleibt, wie es eingetragen
     wurde. Laeuft genau einmal. */
  function frSkillsOnce(){
    var F='klassebuch_tt_fr_skills';
    try{if(localStorage.getItem(F))return;}catch(e){return;}
    var o=load(), n=0;
    for(var k in o){var g=o[k]||{};
      for(var lv in g){var fr=(g[lv]||{})[5];
        if(fr&&fr.length>7&&!fr[7]){fr[7]='Option Skillstruck';n++;}}}
    if(n)save(o);
    try{localStorage.setItem(F,'1');}catch(e){}
  }

  function init(){
    migrateOnce();
    frSkillsOnce();
    activate(true);
    try{if(window.KB_TERMS&&window.KB_TERMS.onChange)window.KB_TERMS.onChange(function(){activate(false);});}catch(e){}
  }
  return {
    init:init, activate:activate, stash:stash, currentKey:function(){return cur;},
    /* Notausstieg: offiziellen Plan fuer das aktive Trimester einsetzen. */
    restoreDefault:function(){
      var k=termKey(); if(!k)return false;
      var d=null;try{d=window.KB_ANW&&window.KB_ANW.defaultTimetable?window.KB_ANW.defaultTimetable():null;}catch(e){}
      if(!usable(d))return false;
      var o=load(); o[k]=clone(d); save(o); cur=k; pushTT(o[k]); fire(); return true;
    },
    keys:function(){var o=load();return Object.keys(o).sort();},
    has:function(k){var o=load();return !!o[k]&&nonEmpty(o[k]);},
    get:function(k){var o=load();return o[k]?clone(o[k]):null;},
    /* Plan eines anderen Trimesters übernehmen. */
    copyFrom:function(srcKey){
      var o=load(); var src=o[srcKey]; if(!src)return false;
      var k=termKey(); if(!k)return false;
      o[k]=clone(src); save(o); cur=k; pushTT(o[k]); fire(); return true;
    },
    clear:function(){
      var k=termKey(); if(!k)return;
      var tt=liveTT()||{}; var out={};
      for(var lv in tt){out[lv]={};for(var w in tt[lv]){out[lv][w]=(tt[lv][w]||[]).map(function(s){return (window.KB_ANW&&window.KB_ANW.isNonSubject&&window.KB_ANW.isNonSubject(s))?s:'';});}}
      var o=load(); o[k]=out; save(o); cur=k; pushTT(out); fire();
    },
    /* Einzelne Zelle setzen — schreibt live und in den Trimester-Speicher. */
    setCell:function(level,wd,idx,val){
      try{if(window.KB_ANW&&window.KB_ANW.setTTCell)window.KB_ANW.setTTCell(level,wd,idx,val);}catch(e){}
      stash();
    },
    /* Wo kommt ein Fach überall vor? (alle Trimester zusammen) */
    usage:function(){
      var o=load(); if(cur){var live=liveTT();if(live)o[cur]=live;}
      var out={};
      for(var k in o){var g=o[k]||{};
        for(var lv in g){var d=g[lv]||{};
          for(var w in d){var a=d[w]||[];
            for(var i=0;i<a.length;i++){var s=a[i];
              if(!s)continue;
              try{if(window.KB_ANW&&window.KB_ANW.isNonSubject&&window.KB_ANW.isNonSubject(s))continue;}catch(e){}
              if(!out[s])out[s]={total:0,terms:{}};
              out[s].total++; out[s].terms[k]=(out[s].terms[k]||0)+1;
            }}}}
      return out;
    },
    /* Ein Fach in ALLEN Trimestern umbenennen (leerer Zielname = entfernen). */
    renameSubject:function(from,to){
      if(!from)return 0;
      var o=load(), n=0;
      for(var k in o){var g=o[k]||{};
        for(var lv in g){var d=g[lv]||{};
          for(var w in d){var a=d[w]||[];
            for(var i=0;i<a.length;i++){if(a[i]===from){a[i]=to||'';n++;}}}}}
      save(o);
      if(cur&&o[cur]){pushTT(o[cur]);}
      fire();
      return n;
    },
    onChange:function(fn){if(typeof fn==='function')hooks.push(fn);},
    syncExport:function(){var o=load();var out=[];for(var k in o){out.push({id:k,grid:o[k]});}return out;},
    syncApply:function(arr){
      if(!arr)return;
      var o={};for(var i=0;i<arr.length;i++){var r=arr[i];if(r&&r.id){o[r.id]=r.grid||{};}}
      save(o);
      var k=termKey();
      if(k&&o[k]){cur=k;pushTT(o[k]);}
      fire();
    }
  };
})();

/* KB_BLOCKS — Uhrzeiten des Stundenrasters. Nur die Zeiten sind änderbar:
   die Block-IDs bleiben, weil erfasste Absenzen daran hängen. */
window.KB_BLOCKS=(function(){
  var LS='klassebuch_blocks_v1';
  var ORIG=null, hooks=[];
  function fire(){for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function load(){try{var a=JSON.parse(localStorage.getItem(LS)||'null');return (a&&a.length)?a:null;}catch(e){return null;}}
  function store(a){try{localStorage.setItem(LS,JSON.stringify(a));}catch(e){}}
  function live(){try{return (window.KB_ANW&&window.KB_ANW.blocks)?window.KB_ANW.blocks():[];}catch(e){return [];}}
  function bare(a){return (a||[]).map(function(b){return {id:b.id,start:b.start,end:b.end};});}
  function apply(a){try{if(window.KB_ANW&&window.KB_ANW.setBlockTimes)return window.KB_ANW.setBlockTimes(a);}catch(e){}return false;}
  function okTime(t){return /^[0-2][0-9]:[0-5][0-9]$/.test(String(t||''));}
  /* Gespeicherte Zeiten nur übernehmen, wenn sie zum aktuellen Raster passen.
     Nach einer Rasteränderung (z. B. 7 -> 9 Stunden) würden sonst alte Zeiten
     über die neuen Blöcke gelegt. */
  function fits(s){
    var l=live(); if(!s||s.length!==l.length)return false;
    for(var i=0;i<l.length;i++){var f=false;for(var j=0;j<s.length;j++){if(s[j]&&s[j].id===l[i].id)f=true;}if(!f)return false;}
    return true;
  }
  function init(){ORIG=bare(live());var s=load();
    if(s&&!fits(s)){try{localStorage.removeItem(LS);}catch(e){}s=null;}
    if(s)apply(s);fire();}
  return {
    init:init,
    list:function(){return live();},
    isCustom:function(){return !!load();},
    set:function(id,start,end){
      if((start&&!okTime(start))||(end&&!okTime(end)))return false;
      var out=bare(live()).map(function(b){
        if(b.id!==id)return b;
        return {id:b.id,start:start||b.start,end:end||b.end};
      });
      for(var i=0;i<out.length;i++){if(out[i].end<=out[i].start)return false;}
      apply(out);store(out);fire();return true;
    },
    reset:function(){if(ORIG)apply(ORIG);try{localStorage.removeItem(LS);}catch(e){}fire();},
    onChange:function(fn){if(typeof fn==='function')hooks.push(fn);},
    syncExport:function(){var s=load();return s?s.map(function(b){return {id:b.id,start:b.start,end:b.end};}):[];},
    syncApply:function(arr){if(!arr||!arr.length)return;apply(arr);store(bare(arr));fire();}
  };
})();
`;

var ROSTER_MODULE = `
window.KB_ROSTER=(function(){
  var LS='klassebuch_roster_v1';
  /* Keine fest eingebaute Klasse: die Schülerliste kommt aus den eigenen Daten
     (bzw. künftig aus dem Hub). */
  var SEED=[];
  function clone(o){var r={};for(var k in o){r[k]=o[k];}return r;}
  function loadList(){
    try{var raw=localStorage.getItem(LS);if(raw){var a=JSON.parse(raw);if(a&&a.length){return a.map(clone);}}}catch(e){}
    return SEED.map(clone);
  }
  var list=loadList(); var hooks=[];
  function persist(){try{localStorage.setItem(LS,JSON.stringify(list));}catch(e){}}
  function nameKey(n){return String(n||'').toLowerCase().replace(/[^a-z]/g,'');}
  function notify(){persist();for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function find(id){for(var i=0;i<list.length;i++){if(list[i].id===id){return list[i];}}return null;}
  function newId(){return 'stud_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  return {
    list:function(){return list.map(clone);},
    byId:function(id){var s=find(id);return s?clone(s):null;},
    ids:function(){var m={};for(var i=0;i<list.length;i++){m[list[i].id]=true;}return m;},
    /* Nur aktive Schüler stehen im täglichen Klassenbuch. Inaktive bleiben
       im Roster und in ids(), damit Absenzen und Dossier erhalten bleiben. */
    asAnwesenheit:function(){return list.filter(function(s){return s.active!==false;}).map(function(s){return {id:s.id,name:s.name,klasse:s.klasse||'',level:s.level||'L1',zyklus:s.zyklus||''};});},
    asDossier:function(){return list.map(function(s){return {id:s.id,name:s.name,anonLabel:s.anonLabel||'',active:s.active!==false,createdAt:s.createdAt||''};});},
    add:function(name,klasse,level,zyklus){var id=newId();list.push({id:id,name:String(name||'').trim(),anonLabel:'',klasse:klasse||'',level:level||'L1',zyklus:zyklus||'ES',active:true,createdAt:new Date().toISOString()});notify();return id;},
    update:function(id,fields){var s=find(id);if(s){for(var k in fields){s[k]=fields[k];}notify();}},
    setLevel:function(id,lv){var s=find(id);if(s&&s.level!==lv){s.level=lv;notify();}},
    remove:function(id){list=list.filter(function(s){return s.id!==id;});notify();},
    onChange:function(fn){hooks.push(fn);},
    syncExport:function(){return list.map(clone);},
    syncApply:function(arr){list=(arr||[]).map(clone);persist();for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  };
})();
`;

/* Monkey-Patches + Schüler-Hub für dossier (laufen NACH dem dossier-Skript) */
var DOS_OVERRIDES = `
(function(){
  if(typeof Repo==='undefined'){return;}
  function byName(a,b){return String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'});}
  Repo.listStudents=function(){return (window.KB_ROSTER?window.KB_ROSTER.asDossier():[]).sort(byName);};
  Repo.getStudent=function(id){var s=window.KB_ROSTER?window.KB_ROSTER.byId(id):null;return s?{id:s.id,name:s.name,anonLabel:s.anonLabel||'',active:s.active!==false,createdAt:s.createdAt||''}:null;};
  Repo.listEntries=function(){var keep=window.KB_ROSTER?window.KB_ROSTER.ids():{};return this.entries.filter(function(e){return keep[e.studentId];});};
  if(typeof shellHtml!=='undefined'){window.shellHtml=function(activeKey,contentHtml){return '<main class="main" id="main-content" tabindex="-1">'+contentHtml+'</main>';};}

  /* ---- Schüler-Hub: Wrapper um viewStudentDetail ---- */
  function rosterLevel(id){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(id);return (s&&s.level)||'L1';}
  function rosterKlasse(id){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(id);return (s&&s.klasse)||'';}
  function stat(n,l){return '<div class="kb-stat"><div class="kb-stat-n">'+n+'</div><div class="kb-stat-l">'+escapeHtml(l)+'</div></div>';}
  function hubHeader(student,tab){
    var sid=student.id; var meta=[]; var kl=rosterKlasse(sid); if(kl){meta.push(escapeHtml(kl));} meta.push('Niveau '+escapeHtml(rosterLevel(sid)));
    var tabs=[['uebersicht','Übersicht'],['verlauf','Verlauf'],['dossier','Dossier'],['noten','Noten'],['screening','Screening'],['schule','Schule'],['reunion','Réunion'],['helfernetz','Helfernetz']];
    var tb=tabs.map(function(t){var r='#/student/'+encodeURIComponent(sid)+'?hub='+t[0];return '<a class="kb-hub-tab'+(t[0]===tab?' active':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(t[1])+'</a>';}).join('');
    var initial=escapeHtml((student.name||'?').charAt(0).toUpperCase());
    return '<div class="kb-hub-head">'+
      '<a class="kb-hub-back" href="#/dashboard" data-route="#/dashboard">← Alle Schüler</a>'+
      '<div class="kb-hub-id"><div class="kb-hub-avatar">'+initial+'</div><div><div class="kb-hub-name">'+escapeHtml(student.name)+'</div><div class="kb-hub-meta">'+meta.join(' · ')+'</div></div>'+
        (function(){/* im Hub zugeordnet? (legt der Übernahme-Assistent des Hubs ab) */var z={};try{z=JSON.parse(localStorage.getItem('cdse-kb-zuordnung')||'{}')||{};}catch(e){}var hid=z.klassenbuch&&z.klassenbuch[sid];
          return hid?'<button class="btn btn-sm kb-hub-dossier" type="button" data-kb-hub="schueler" data-kb-hub-zusatz="/'+escapeAttr(encodeURIComponent(hid))+'" title="Das verschlüsselte Dossier dieses Kindes im CDSE Hub öffnen">📂 Dossier im Hub</button>':'';})()+
      '</div>'+
      '<div class="kb-hub-tabs">'+tb+'</div></div>';
  }
  function hubOverview(student){
    var sid=student.id;
    var sum=window.KB_ANW?window.KB_ANW.summaryForStudent(sid):{entschuldigt:0,unentschuldigt:0,verspaetet:0};
    var entries=Repo.entriesForStudent(sid).slice().sort(function(a,b){return a.date<b.date?1:-1;});
    var last=entries[0];
    var reu=Repo.listReunions(); var lastReu=null,lastReuDate=null,weekly=[],weeklyDate=null;
    for(var i=0;i<reu.length;i++){var e=Repo.reunionEntryFor(reu[i].date,sid);if(e&&!lastReu){lastReu=e;lastReuDate=reu[i].date;}if(reu[i].goals&&reu[i].goals[sid]&&reu[i].goals[sid].length&&!weekly.length){weekly=reu[i].goals[sid];weeklyDate=reu[i].date;}}
    var rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null;
    var cg=window.KB_REPORTS?window.KB_REPORTS.currentGoals(sid):null;
    var impBtn='<button class="btn btn-sm" data-route="#/report-import?student='+encodeURIComponent(sid)+'">📄 DS/PEI importieren</button>';
    var DM={V:{l:'Verhalten',c:'#c0562d'},K:{l:'Kommunikation',c:'#2f6fb0'},SOZ:{l:'Sozialisation',c:'#3a8a5f'},KOG:{l:'Kognition',c:'#7a52b3'}};

    function mh(ic,t,c){return '<h4><span class="mi mi-'+(c||'a')+'">'+ic+'</span><span class="mt">'+t+'</span></h4>';}
    function tile(v,l,cls,ic){return '<div class="kb-stat-tile'+(cls?(' kt-'+cls):'')+'"><div class="kt-ic">'+(ic||'')+'</div><div class="kt-b"><div class="v">'+v+'</div><div class="l">'+escapeHtml(l)+'</div></div></div>';}
    var scr=window.KB_SCREENING?window.KB_SCREENING.result(sid):null;
    var scrAcute=scr&&scr.acute&&scr.acute.length;
    var scrTile=scrAcute?tile('Krise','Screening','warn','🚨'):((scr&&scr.hasData)?((scr.risiken&&scr.risiken.length)?tile('Risiko','Screening','warn','🧠'):tile('erfasst','Screening','ok','🧠')):tile('—','Screening','','🧠'));
    var stripHtml='<div class="kb-statstrip">'+tile((sum.unentschuldigt||0),'Unentsch. Absenzen',(sum.unentschuldigt?'warn':''),'📉')+tile((cg&&cg.goals?cg.goals.length:0),'Förderziele','','🎯')+tile(weekly.length,'Wochenziele','','📌')+scrTile+'</div>';

    /* ---- Schüler ohne Daten: klare Erste-Schritte statt leerer Karten ---- */
    var hasAny=(scr&&scr.hasData)||(cg&&cg.goals&&cg.goals.length)||weekly.length||entries.length||(sum&&sum.total)||lastReu;
    if(!hasAny){
      return stripHtml+'<div class="hub-empty"><div class="hub-empty-ic">🚀</div><h3>Noch nichts erfasst für '+escapeHtml(student.name)+'</h3><p>Leg los — alle Infos sammeln sich danach automatisch hier.</p><div class="hub-empty-actions"><button class="btn btn-primary" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">📉 Absenzen erfassen</button>'+impBtn+'<button class="btn" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">🧠 Screening</button></div></div>';
    }

    /* ---- Screening bewusst zurückhaltend: nur Akut-Krise als schlanke Sicherheits-
           zeile sichtbar; das Ergebnis selbst lebt kompakt in der Seitenspalte. ---- */
    var acuteLine = scrAcute ? '<div class="hub-acute"><span>🚨 Akute Krise laut Screening — Sicherheit hat Vorrang.</span><a class="btn btn-sm" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Ansehen</a></div>' : '';
    var scrVal, scrAct;
    if(scr&&scr.hasData){
      scrVal = scrAcute ? '🚨 Krise' : ((scr.risiken&&scr.risiken.length) ? 'Risiko-Hinweis' : 'erfasst');
      scrAct = '<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Öffnen</button>';
    } else {
      scrVal = '—';
      scrAct = '<button class="btn btn-sm ra" data-kb-hub="screening">Im Hub</button>';
    }

    /* ---- Förderziele ---- */
    var foerderCard;
    if(cg&&cg.goals&&cg.goals.length){
      var gl=cg.goals.slice(0,5).map(function(g){
        var dm=DM[g.domain]||{l:g.domain,c:'#777'};
        var code=g.code||'';
        var elbl=''; try{ if(code&&window.KB_TAXONOMY&&window.KB_TAXONOMY.eldibGoalLabels){elbl=window.KB_TAXONOMY.eldibGoalLabels[code]||'';} }catch(_e){}
        var badge=code?('<span class="hub-gcode" style="background:'+dm.c+'" title="ELDiB '+escapeAttr((dm.l||'')+(elbl?' · '+elbl:''))+'">'+escapeHtml(code)+'</span>'):('<span class="hub-dot" style="background:'+dm.c+'"></span>');
        var head=elbl?'<span class="hub-gelbl">'+escapeHtml(elbl)+'</span> ':'';
        var btn=window.KB_MATERIALS?'<button class="hub-mat" data-mat-goal="'+escapeAttr(code)+'" data-mat-goaltext="'+escapeAttr(g.formulation||g.title||'')+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(elbl||g.title||g.formulation||code)+'" title="Passende Arbeitsblätter finden">📄 Arbeitsblätter</button>':'';
        return '<li>'+badge+'<span class="hub-gtext">'+head+escapeHtml(g.formulation||g.title||code||'Ziel')+'</span>'+btn+'</li>';
      }).join('');
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele <span class="hub-count">'+cg.goals.length+'</span>','g')+'<ul class="hub-list">'+gl+'</ul>'+(cg.goals.length>5?'<div class="muted" style="font-size:.8em;margin-top:4px;">+'+(cg.goals.length-5)+' weitere</div>':'')+'</div>';
    } else {
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele','g')+'<p class="muted">Noch keine hinterlegt.</p><div class="kb-btn-row">'+impBtn+'</div></div>';
    }

    /* ---- Wochenziele (sichtbar mit Ziel-Texten) ---- */
    var wochenCard;
    if(weekly.length){
      wochenCard='<div class="card kb-mini">'+mh('📌','Wochenziele','w')+'<ul class="hub-list">'+window.kbZiele(weekly).map(zielLi).join('')+'</ul></div>';
    } else {
      wochenCard='<div class="card kb-mini">'+mh('📌','Wochenziele','w')+'<p class="muted">Noch keine — in der <a href="#/reunion" data-route="#/reunion">Réunion</a> festlegen.</p></div>';
    }

    /* ---- Thematiken aus Réunionen/Verlauf -> Arbeitsblätter ---- */
    var themeCard='';
    try{
      if(window.KB_MATERIALS){
        var txtParts=[]; entries.forEach(function(e){if(e.text)txtParts.push(e.text);});
        if(lastReu&&lastReu.text)txtParts.push(lastReu.text);
        var det=(typeof analyzeText==='function')?analyzeText(txtParts.join('  ')):[];
        var picks=[],seenK={};
        for(var ti=0;ti<det.length;ti++){var tkk=det[ti];if(window.KB_MATERIALS.themeMatchable(tkk.key)&&!seenK[tkk.key]){seenK[tkk.key]=1;picks.push(tkk);}if(picks.length>=6)break;}
        if(picks.length){
          var chips=picks.map(function(t){return '<button class="hub-theme-chip sev-'+t.severity+'" data-mat-theme="'+escapeAttr(t.key)+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(t.key)+'" title="Arbeitsblätter zu „'+escapeAttr(t.key)+'“">'+escapeHtml(t.key)+' <span class="ht-n">'+t.count+'×</span></button>';}).join('');
          themeCard='<div class="card kb-mini">'+mh('🏷️','Thematiken → Arbeitsblätter','a')+'<p class="muted" style="font-size:.82em;margin:-2px 0 9px;">Aus den Réunion-/Verlaufstexten erkannt — ein Klick öffnet passende Arbeitsblätter.</p><div class="hub-theme-wrap">'+chips+'</div></div>';
        }
      }
    }catch(_te){}

    /* ---- Réunion-Update (Hauptbereich) ---- */
    var reuCard=lastReu?('<div class="card kb-mini">'+mh('🗣️','Réunion-Update <span class="muted" style="font-weight:600;font-size:.78em;">'+(lastReuDate?escapeHtml(formatDate(lastReuDate)):'')+'</span>'+(lastReu.author?' <span class="reunion-author" title="Verfasst von '+escapeAttr(lastReu.author)+'">✍ '+escapeHtml(lastReu.author)+'</span>':''),'a')+'<div class="entry-body hub-clamp">'+highlightThemesHtml(lastReu.text)+'</div></div>'):'';

    /* ---- Seitenspalte: kompakte Info-Zeilen statt Einzelkärtchen ---- */
    function row(ic,l,v,act){return '<div class="hub-row"><span class="ri">'+ic+'</span><div class="rb"><div class="rl">'+l+'</div>'+(v?'<div class="rv">'+v+'</div>':'')+'</div>'+(act||'')+'</div>';}
    var sideRows='';
    sideRows+=row('📉','Absenzen',(sum.total?(sum.entschuldigt+' E · '+sum.unentschuldigt+' NE · '+sum.verspaetet+' R'):'keine'),'<button class="btn btn-sm ra" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">Öffnen</button>');
    sideRows+=row('🩺','Diagnostik',(rep?escapeHtml((rep.type||'Bericht')+' · '+formatDate(rep.date)):'kein DS/PEI'),(rep?'<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=dossier">Dossier</button>':''));
    sideRows+=row('🧠','Screening',scrVal,scrAct);
    sideRows+=row('🗒️','Letzter Eintrag',(last?escapeHtml(formatDate(last.date)+' · '+last.category):'keiner'),'');
    var ngN=window.KB_NOTEN?window.KB_NOTEN.list(sid,null,null).length:0;
    var ntMod=window.KB_NOTEN?window.KB_NOTEN.totalModules(sid):0;
    sideRows+=row('📊','Noten & Module',(ngN||ntMod)?((ngN?ngN+' Noten':'')+(ngN&&ntMod?' · ':'')+(ntMod?ntMod+' Module':'')):'—','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=noten">Öffnen</button>');
    sideRows+=row('🕸️','Helfernetz','Support-Bubble','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=helfernetz">Öffnen</button>');
    var sideCard='<div class="card hub-side-card">'+sideRows+'</div>';

    return stripHtml+acuteLine+'<div class="hub2"><div class="hub2-main">'+foerderCard+themeCard+wochenCard+reuCard+'</div><aside class="hub2-side">'+sideCard+'</aside></div>';
  }
  function hubVerlauf(student){
    var sid=student.id;
    var q=(typeof parseHash==='function')?(parseHash().query||{}):{};
    var vf=q.vf||'all';
    var items=[];
    (Repo.entriesForStudent?Repo.entriesForStudent(sid):[]).forEach(function(e){
      var isReu=(e.category==='Team-Réunion');
      items.push({date:e.date,type:isReu?'reunion':'entry',icon:isReu?'🗣️':'🗒️',title:isReu?'Réunion-Beitrag':escapeHtml(e.category||'Eintrag'),author:(e.author||''),body:'<div class="entry-body">'+highlightThemesHtml(e.text||'')+'</div>'});
    });
    (Repo.listReunions?Repo.listReunions():[]).forEach(function(r){
      var g=(r.goals&&r.goals[sid])||[]; if(g.length){items.push({date:r.date,type:'goal',icon:'📌',title:'Wochenziel(e)',body:'<ul class="tl-goals">'+window.kbZiele(g).map(zielLi).join('')+'</ul>'});}
    });
    if(window.KB_ANW&&window.KB_ANW.recentForStudent){try{window.KB_ANW.recentForStudent(sid,40).forEach(function(e){items.push({date:e.date,type:'absence',icon:'📉',title:'Absenz · '+escapeHtml(window.KB_ANW.statusLabel?window.KB_ANW.statusLabel(e.status):(e.status||'')),body:escapeHtml(e.subject||'')});});}catch(_){}}
    /* Frühere Screenings: nur Datum, Zahl der Beobachtungen und Krisenhinweis – keine Verdachtsachsen */
    if(window.KB_SCREENING&&window.KB_SCREENING.history){window.KB_SCREENING.history(sid).forEach(function(s){
      var b=(s.acute?'<span class="sv-risk" style="background:var(--kb-danger);color:#fff;">🚨 Krisenhinweis</span> ':'')+
        '<div class="tl-scr">'+(s.symCount|0)+' Beobachtung'+((s.symCount|0)===1?'':'en')+' angekreuzt (früheres Screening, Einzelheiten im Reiter „Screening“)</div>';
      items.push({date:s.date,type:'screening',icon:'🧠',title:'Screening (früher)',body:b});
    });}
    var rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null; if(rep&&rep.date){items.push({date:rep.date,type:'report',icon:'🩺',title:escapeHtml(rep.type||'Diagnostischer Bericht'),body:'Bericht im Dossier hinterlegt.'});}
    items.sort(function(a,b){return (a.date<b.date)?1:(a.date>b.date?-1:0);});
    var counts={}; items.forEach(function(it){counts[it.type]=(counts[it.type]||0)+1;});
    var defs=[['all','Alles',items.length],['screening','Screening',counts.screening||0],['entry','Einträge',counts.entry||0],['reunion','Réunion',counts.reunion||0],['goal','Ziele',counts.goal||0],['absence','Absenzen',counts.absence||0]];
    var chips=defs.filter(function(dd){return dd[0]==='all'||dd[2];}).map(function(dd){var r='#/student/'+encodeURIComponent(sid)+'?hub=verlauf&vf='+dd[0];return '<a class="tl-chip'+(vf===dd[0]?' is-on':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(dd[1])+' <span>'+dd[2]+'</span></a>';}).join('');
    var filtered=(vf==='all')?items:items.filter(function(it){return it.type===vf;});
    var body;
    if(!filtered.length){body='<div class="empty-state">'+(items.length?'Nichts in diesem Filter.':'Noch keine Aktivitäten — Einträge, Screenings, Absenzen und Ziele sammeln sich hier automatisch.')+'</div>';}
    else{
      body='<div class="tl">'+filtered.map(function(it){
        return '<div class="tl-item tl-'+it.type+'"><div class="tl-ic">'+it.icon+'</div><div class="tl-c"><div class="tl-h"><span class="tl-t">'+it.title+(it.author?' <span class="tl-author">✍ '+escapeHtml(it.author)+'</span>':'')+'</span><span class="tl-d">'+escapeHtml(formatDate(it.date))+'</span></div><div class="tl-b">'+it.body+'</div></div></div>';
      }).join('')+'</div>';
    }
    return '<div class="kb-hub-pad"><div class="tl-filters">'+chips+'</div>'+body+'</div>';
  }
  function hubReunion(student){
    var sid=student.id; var reu=Repo.listReunions(); var out=[];
    reu.forEach(function(r){
      var e=Repo.reunionEntryFor(r.date,sid); var g=(r.goals&&r.goals[sid])||[];
      if(!e&&!g.length){return;}
      out.push('<div class="card"><div class="muted" style="font-size:.85em;display:flex;justify-content:space-between;gap:8px;align-items:center;"><span>Réunion '+escapeHtml(formatDate(r.date))+'</span>'+(e&&e.author?'<span class="reunion-author" title="Verfasst von '+escapeAttr(e.author)+'">✍ '+escapeHtml(e.author)+'</span>':'')+'</div>'+
        (e?'<div class="entry-body reunion-update">'+highlightThemesHtml(e.text)+'</div>':'<p class="muted">Kein Update.</p>')+
        (g.length?'<div class="goal-box"><strong>Ziele:</strong><ul class="goal-list">'+window.kbZiele(g).map(zielLi).join('')+'</ul></div>':'')+'</div>');
    });
    var today=todayIso();
    var up=reu.filter(function(r){return r.date>=today;}).sort(function(a,b){return a.date<b.date?-1:1;});
    function nextMondayISO(){var d=new Date();var add=(1-d.getDay()+7)%7;d.setDate(d.getDate()+add);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    var nextDate=up.length?up[0].date:nextMondayISO();
    var nObj=Repo.getReunionByDate?Repo.getReunionByDate(nextDate):null;
    var ex=Repo.reunionEntryFor(nextDate,sid);
    var exGoals=window.kbZiele((nObj&&nObj.goals&&nObj.goals[sid])?nObj.goals[sid]:[]).map(function(g){return g.text;});
    var willCreate=!nObj;
    var writeBox='<div class="card reu-write">'+
      '<h4 class="reu-h">✍️ Für die Réunion am '+escapeHtml(formatDate(nextDate))+(willCreate?' <span class="muted" style="font-weight:600;font-size:.8em;">(wird neu angelegt)</span>':'')+'</h4>'+
      '<label class="reu-lbl">Beitrag / Update für die Réunion</label>'+
      '<textarea class="reu-input" rows="4" placeholder="Was soll zu '+escapeAttr(student.name)+' besprochen werden?">'+escapeHtml(ex?ex.text:'')+'</textarea>'+
      '<label class="reu-lbl" style="margin-top:12px;">Wochenziel(e) <span class="muted" style="font-weight:600;">— optional, je Zeile eins</span></label>'+
      '<textarea class="reu-goals" rows="2" placeholder="z. B. Pünktlich zur Schule kommen">'+escapeHtml(exGoals.join('\\n'))+'</textarea>'+
      '<div class="kb-btn-row" style="margin-top:10px;"><button class="btn btn-primary reu-save" data-sid="'+escapeAttr(sid)+'" data-date="'+escapeAttr(nextDate)+'"'+(ex?(' data-eid="'+escapeAttr(ex.id)+'"'):'')+'>'+((ex||exGoals.length)?'Aktualisieren':'Speichern')+'</button> <span class="reu-status muted" style="font-size:.85em;"></span></div>'+
      '<p class="muted" style="font-size:.8em;margin-top:6px;">Beitrag wird als Réunion-Eintrag gespeichert, Wochenziele wandern in die Réunion-Ziele — alles synchronisiert automatisch (Team-Datei & überall).</p>'+
    '</div>';
    return '<div class="kb-hub-pad">'+writeBox+'<h4 class="reu-h" style="margin-top:22px;">Bisherige Réunion-Beiträge</h4>'+(out.length?out.join(''):'<div class="empty-state">Noch keine Réunion-Beiträge.</div>')+'</div>';
  }
  function hubAbsenzen(student){
    var sid=student.id;
    if(!window.KB_ANW){return '<div class="empty-state">Anwesenheits-Modul nicht geladen.</div>';}
    var sum=window.KB_ANW.summaryForStudent(sid); var recent=window.KB_ANW.recentForStudent(sid,15);
    var rows=recent.map(function(e){return '<tr><td>'+escapeHtml(window.KB_ANW.fmt(e.date))+'</td><td>'+escapeHtml(e.subject||'—')+'</td><td>'+escapeHtml(window.KB_ANW.statusLabel(e.status))+'</td></tr>';}).join('');
    return '<div class="kb-hub-pad"><div class="kb-stat-row">'+stat(sum.entschuldigt,'Excusé')+stat(sum.unentschuldigt,'Non-excusé')+stat(sum.verspaetet,'Retard')+stat(sum.total,'Gesamt')+'</div>'+
      '<button class="btn btn-primary" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">In Absenzen erfassen / bearbeiten</button>'+
      (recent.length?'<table class="kb-table" style="margin-top:14px;"><thead><tr><th>Datum</th><th>Fach</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="muted" style="margin-top:14px;">Noch keine Absenzen erfasst.</p>')+'</div>';
  }
  function hubAufgaben(student){
    var lvl=rosterLevel(student.id);
    if(!window.KB_ANW){return '<div class="empty-state">Klassenbuch-Modul nicht geladen.</div>';}
    var tasks=window.KB_ANW.tasksForLevel(lvl,student.id);
    var rows=tasks.map(function(n){var icon=n.type==='pruefung'?'📝':'📒';return '<div class="card"><div class="muted" style="font-size:.85em;">'+icon+' '+escapeHtml(window.KB_ANW.fmt(n.date))+(n.subject?' · '+escapeHtml(n.subject):'')+(n.studentId?' · <b>nur für '+escapeHtml(student.name)+'</b>':'')+'</div><div>'+escapeHtml(n.text)+'</div></div>';}).join('');
    return '<div class="kb-hub-pad"><p class="muted">Hausaufgaben & Prüfungen aus dem Klassenbuch für Niveau '+escapeHtml(lvl)+' – dazu die, die nur für '+escapeHtml(student.name)+' eingetragen sind.</p>'+(tasks.length?rows:'<div class="empty-state">Keine Aufgaben/Prüfungen hinterlegt.</div>')+'</div>';
  }
  function hubHelfernetz(student){
    if(window.KB_BUBBLE_RENDER){return window.KB_BUBBLE_RENDER(student);}
    return '<div class="kb-hub-pad"><div class="kb-placeholder"><div class="kb-placeholder-ic">🕸️</div><h3>Helfernetz</h3><p>Modul wird geladen …</p></div></div>';
  }
  function hubScreening(student){
    var sid=student.id, S=window.KB_SCREENING, d=S?S.get(sid):null, akut=S?S.acuteFlags(sid):[];
    var kopf='<div class="kb-scr-hinweis"><h3>Das Screening ist in den CDSE Hub umgezogen</h3>'+
      '<p>Dort gibt es einen Beobachtungsbogen mit Stärken, Auswirkungen im Alltag und nächsten Schritten – ohne Verdachtsdiagnosen. Frühere Angaben aus dem Klassenbuch übernimmt der Hub in der Screening-Übersicht ins Dossier; hier bleiben sie zum Nachlesen.</p>'+
      '<button class="btn btn-primary btn-sm" data-kb-hub="screening">Screening im Hub öffnen</button></div>';
    if(!d||(!d.symptome.length&&!d.history.length)){return '<div class="kb-hub-pad">'+kopf+'<div class="empty-state">Im Klassenbuch wurde für '+escapeHtml(student.name)+' kein Screening erfasst.</div></div>';}
    return '<div class="kb-hub-pad">'+kopf+
      (akut.length?'<div class="hub-acute"><span>🚨 Frühere Angabe im Screening: '+akut.map(function(a){return escapeHtml(a.label);}).join(' · ')+' – bitte klären, ob das bekannt ist und begleitet wird.</span></div>':'')+
      '<div class="kb-scr-alt" id="kb-scr-alt" data-sid="'+escapeAttr(sid)+'"><h4>Frühere Beobachtungen</h4><p class="kb-scr-sub">Wird geladen …</p></div></div>';
  }
  /* ---- Noten & Module (pro Schüler/Fach) ---- */
  function hubNoten(student){
    var sid=student.id;
    if(!window.KB_NOTEN){return '<div class="kb-hub-pad"><div class="empty-state">Noten-Modul nicht geladen.</div></div>';}
    var N=window.KB_NOTEN;
    var lvl=(typeof rosterLevel==='function')?rosterLevel(sid):'L1';
    var subjects=(window.KB_ANW&&window.KB_ANW.subjectsForLevel)?window.KB_ANW.subjectsForLevel(lvl):[];
    N.list(sid,null,null).forEach(function(g){if(g.subject&&subjects.indexOf(g.subject)<0)subjects.push(g.subject);});
    var mode=N.getMode(sid), periods=N.periodsFor(mode);
    var PLABEL={S1:'1. Semester',S2:'2. Semester',T1:'1. Trimester',T2:'2. Trimester',T3:'3. Trimester'};
    var q=(typeof parseHash==='function')?(parseHash().query||{}):{};
    var per=q.np||periods[0]; if(periods.indexOf(per)<0)per=periods[0];
    function isAcademic(s){s=(s||'').toLowerCase();var bad=['fit for life','skills','atelier','sport','option','init','hausaufgaben','llis','morning','paus'];for(var i=0;i<bad.length;i++){if(s.indexOf(bad[i])>=0)return false;}return true;}
    function nfn(x){return (Math.round(x*10)/10).toString().replace('.',',');}
    function chip60(v){return '<span class="note-60 '+(v>=30?'note-ok':'note-low')+'">'+nfn(v)+'<small>/60</small></span>';}
    var acadSubs=subjects.filter(isAcademic);

    var modeBtns='<div class="note-mode"><span class="note-mode-lbl">Einteilung:</span>'+['semester','trimester'].map(function(m){return '<button class="note-mode-btn'+(mode===m?' on':'')+'" data-noten-mode="'+m+'" data-sid="'+escapeAttr(sid)+'">'+(m==='semester'?'Semester':'Trimester')+'</button>';}).join('')+'</div>';
    var perTabs='<div class="note-pertabs">'+periods.map(function(p){var r='#/student/'+encodeURIComponent(sid)+'?hub=noten&np='+p;return '<a class="note-pertab'+(p===per?' on':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(PLABEL[p]||p)+'</a>';}).join('')+'</div>';

    var openIdx=parseInt(q.nf,10); if(isNaN(openIdx))openIdx=-1;
    var cards='';
    subjects.forEach(function(su,si){
      var acad=isAcademic(su), gs=N.list(sid,su,per), avg=N.subjectAvg(sid,su,per);
      var open=(si===openIdx);
      var m=acad?N.moduleOf(sid,su):null;
      var headRoute='#/student/'+encodeURIComponent(sid)+'?hub=noten&np='+per+'&nf='+(open?'':si);
      var badge=(acad&&m.done>0)?'<span class="note-modbadge">📦 Modul '+(m.done+1)+'</span>':'';
      var head='<a class="note-card-head" href="'+headRoute+'" data-route="'+headRoute+'"><span class="note-caret">'+(open?'▾':'▸')+'</span><h4>'+escapeHtml(su)+(acad?'':' <span class="note-na-tag">kein Modulfach</span>')+'</h4>'+badge+(gs.length?'<span class="note-cnt">'+gs.length+'</span>':'')+(avg!=null?'<span class="note-avg">Ø '+chip60(avg)+'</span>':'<span class="note-avg muted">—</span>')+'</a>';
      var body='';
      if(open){
        var modHtml='';
        if(acad){
          var top=Math.max(m.cap,m.done+2), chips='';
          for(var k=1;k<=top;k++){var st=k<=m.done?'done':(k===m.done+1?'current':'future');chips+='<button class="mod-chip mod-'+st+'" data-mod-set="'+k+'" data-subj="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" title="Modul '+k+(k<=m.done?' – erreicht (Klick = zurücksetzen)':' als erreicht markieren')+'">'+k+'</button>';}
          modHtml='<div class="mod-track"><div class="mod-track-head"><span class="mod-status">'+(m.done>0?('📦 Modul '+m.done+' erreicht · arbeitet an <b>Modul '+(m.done+1)+'</b>'):'📦 arbeitet an <b>Modul 1</b>')+'</span></div><div class="mod-chips">'+chips+'<button class="mod-more" data-mod-more="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" title="Mehr Module anzeigen">+</button></div></div>';
        }
        var rows=gs.map(function(g){return '<div class="note-row"><span class="note-row-lbl">'+(g.label?escapeHtml(g.label):'<span class="muted">Note</span>')+'</span><span class="note-raw">'+nfn(g.points)+' / '+nfn(g.max)+'</span><span class="note-arrow">→</span>'+chip60(N.norm(g))+'<button class="note-del" data-noten-del="'+g.id+'" data-sid="'+escapeAttr(sid)+'" title="Löschen">🗑</button></div>';}).join('');
        body='<div class="note-card-body">'+modHtml+(rows?'<div class="note-rows">'+rows+'</div>':'')+'<div class="note-add"><input class="note-in note-in-lbl" type="text" placeholder="Bezeichnung (optional)" data-nf="label"><input class="note-in note-in-num" type="number" step="0.01" min="0" placeholder="erreicht" data-nf="points"><span class="note-of">von</span><input class="note-in note-in-num" type="number" step="0.01" min="1" value="60" data-nf="max"><button class="btn btn-sm btn-primary note-add-btn" data-noten-add="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" data-per="'+per+'">+ Note</button></div></div>';
      }
      cards+='<div class="note-card'+(acad?'':' note-card-na')+(open?' is-open':'')+'">'+head+body+'</div>';
    });
    if(!subjects.length){cards='<div class="empty-state">Keine Fächer im Stundenplan für Niveau '+escapeHtml(lvl)+'. Lege den Stundenplan unter „Klasse &amp; Stundenplan" an.</div>';}

    var overall=N.periodAvg(sid,per,subjects), totMod=N.totalModules(sid,acadSubs);
    var foot='<div class="note-foot"><div class="note-foot-item">📦 Module gesamt erreicht: <b>'+totMod+'</b></div>'+(overall!=null?'<div class="note-foot-item">📊 Gesamt-Ø '+escapeHtml(PLABEL[per]||per)+': '+chip60(overall)+'</div>':'')+'</div>';

    return '<div class="kb-hub-pad note-wrap"><div class="note-top">'+modeBtns+'</div>'+perTabs+'<p class="muted note-hint">Noten auf <b>/60</b> (bestanden ab 30) — „erreicht von" eingeben, Umrechnung läuft automatisch. Module je Schulfach anklicken; Gesamt zählt sich von selbst.</p>'+cards+foot+'</div>';
  }

  if(typeof viewStudentDetail!=='undefined'){
    var _origDetail=viewStudentDetail;
    window.viewStudentDetail=function(params){
      var student=(Repo.getStudent)?Repo.getStudent(params.studentId):null;
      if(!student){return _origDetail(params);}
      var q=(typeof parseHash==='function')?parseHash().query:{};
      var tab=q.hub||(params.focusEntry?'dossier':'uebersicht');
      var sectionHtml='', baseAfter=null;
      try{
        if(tab==='dossier'){var base=_origDetail(params);sectionHtml=base.html;baseAfter=base.afterRender;}
        else if(tab==='verlauf'){sectionHtml=hubVerlauf(student);}
        else if(tab==='screening'){sectionHtml=hubScreening(student);}
        else if(tab==='noten'){sectionHtml=hubNoten(student);}
        else if(tab==='schule'){sectionHtml='<h3 class="kb-subhead">📉 Absenzen</h3>'+hubAbsenzen(student)+'<h3 class="kb-subhead kb-subhead-mt">📒 Aufgaben &amp; Prüfungen</h3>'+hubAufgaben(student);}
        else if(tab==='reunion'){sectionHtml=hubReunion(student);}
        else if(tab==='helfernetz'){sectionHtml=hubHelfernetz(student);}
        else {tab='uebersicht';sectionHtml=hubOverview(student);}
      }catch(err){sectionHtml='<div class="empty-state">Fehler im Hub-Bereich: '+escapeHtml((err&&err.message)||String(err))+'</div>';}
      return {
        navKey:'students',
        html: hubHeader(student,tab)+'<div class="kb-hub-body">'+sectionHtml+'</div>',
        afterRender: function(root){
        if(baseAfter){try{baseAfter(root);}catch(e){}}
        if(tab==='screening'&&window.KB_SCREENING&&window.KB_SCREENING.fuellen){try{window.KB_SCREENING.fuellen(root);}catch(e){}}
        if(tab==='helfernetz'&&window.KB_BUBBLE_WIRE){try{window.KB_BUBBLE_WIRE(root,student);}catch(e){}}
        if(tab==='noten'&&window.KB_NOTEN){try{
          var rrN=function(){if(window.render){try{window.render();}catch(e){}}};
          root.querySelectorAll('[data-noten-mode]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.setMode(b.getAttribute('data-sid'),b.getAttribute('data-noten-mode'));rrN();});});
          root.querySelectorAll('[data-noten-del]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.remove(b.getAttribute('data-sid'),b.getAttribute('data-noten-del'));rrN();});});
          root.querySelectorAll('[data-noten-add]').forEach(function(b){b.addEventListener('click',function(){var card=b.closest('.note-card');if(!card)return;var lbl=card.querySelector('[data-nf=label]').value;var pts=card.querySelector('[data-nf=points]').value;var max=card.querySelector('[data-nf=max]').value;if(pts===''||!(+max>0)){var pi=card.querySelector('[data-nf=points]');if(pi)pi.focus();return;}window.KB_NOTEN.add(b.getAttribute('data-sid'),{subject:b.getAttribute('data-noten-add'),period:b.getAttribute('data-per'),label:lbl,points:pts,max:max});rrN();});});
          root.querySelectorAll('[data-mod-set]').forEach(function(b){b.addEventListener('click',function(){var n=+b.getAttribute('data-mod-set');var sid3=b.getAttribute('data-sid');var su=b.getAttribute('data-subj');var cur=window.KB_NOTEN.moduleOf(sid3,su).done;window.KB_NOTEN.setModule(sid3,su,(n===cur?n-1:n));rrN();});});
          root.querySelectorAll('[data-mod-more]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.addCap(b.getAttribute('data-sid'),b.getAttribute('data-mod-more'),4);rrN();});});
        }catch(e){}}
        if(tab==='reunion'){try{
          var rbtn=root.querySelector('.reu-save'), rta=root.querySelector('.reu-input'), rgta=root.querySelector('.reu-goals'), rst=root.querySelector('.reu-status');
          if(rbtn){rbtn.addEventListener('click',function(){
            var sid2=rbtn.getAttribute('data-sid'), date2=rbtn.getAttribute('data-date'), eid2=rbtn.getAttribute('data-eid');
            var text2=((rta&&rta.value)||'').trim();
            var goals2=((rgta&&rgta.value)||'').split('\\n').map(function(s){return s.trim();}).filter(Boolean);
            if(!text2 && !goals2.length){ if(rta){rta.focus();} return; }
            rbtn.disabled=true; if(rst){rst.textContent='Speichert …';}
            var r2=Repo.getReunionByDate?Repo.getReunionByDate(date2):null;
            var base=r2?r2:{date:date2,studentOrder:(Repo.listStudents?Repo.listStudents().map(function(s){return s.id;}):[]),orgItems:[],goals:{}};
            base.goals=base.goals||{};
            /* als {text,done} speichern und das Häkchen „erledigt“ gleicher Ziele behalten */
            var alt2=window.kbZiele(base.goals[sid2]);
            if(goals2.length){base.goals[sid2]=goals2.map(function(t){return {text:t,done:alt2.some(function(a){return a.text===t&&a.done;})};});}else if(base.goals[sid2]){delete base.goals[sid2];}
            Repo.saveReunion(base).then(function(){
              if(text2){var p2={studentId:sid2,date:date2,category:'Team-Réunion',text:text2,author:((window.KB_USER&&window.KB_USER.get())||'')};if(eid2){p2.id=eid2;}return Repo.saveEntry(p2);}
            }).then(function(){
              if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
              if(window.render){try{window.render();}catch(e){}}
            }).catch(function(){rbtn.disabled=false;if(rst){rst.textContent='Fehler beim Speichern';}});
          });}
        }catch(e){}}
      }
      };
    };
  }

  /* Wochenziele liegen je nach Ansicht als Text oder als {text,done} vor.
     Überall dieselbe Umwandlung – sonst erscheint „[object Object]“, und beim
     Aktualisieren wird der Zieltext überschrieben (Fehler H5). */
  window.kbZiele=function(arr){
    return (Array.isArray(arr)?arr:[]).map(function(g){
      var t=(g&&typeof g==='object')?String(g.text||''):String(g==null?'':g);
      if(t==='[object Object]'){t='⚠ Zieltext verloren (Fehler einer älteren Version) – in einer Tageskopie nachsehen';}
      return {text:t,done:!!(g&&typeof g==='object'&&g.done)};
    }).filter(function(g){return g.text.trim();});
  };
  function zielLi(g){return '<li'+(g.done?' class="kb-ziel-ok"':'')+'>'+(g.done?'✓ ':'')+escapeHtml(g.text)+'</li>';}
  window.KB_DOS_RECONCILE=function(){
    if(!window.KB_ROSTER){return;}
    var keep=window.KB_ROSTER.ids();
    /* Nur Anzeige-Listen aufräumen. Einträge und Wochenziele von Kindern, die
       nicht (mehr) in der Liste stehen, bleiben erhalten – früher wurden sie
       hier endgültig gelöscht und über den Abgleich verteilt (Fehler H7). */
    Repo.students=(Repo.students||[]).filter(function(s){return keep[s.id];});
    (Repo.reunions||[]).forEach(function(r){
      if(r&&Array.isArray(r.studentOrder)){r.studentOrder=r.studentOrder.filter(function(id){return keep[id];});}
    });
    try{
      if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){
        Storage.clear('students').then(function(){return Storage.putAll('students',Repo.students);}).catch(function(){});
        Storage.putAll('reunions',Repo.reunions).catch(function(){});
      }
    }catch(e){}
  };
  function kbDosPersist(store,arr){try{if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){Storage.clear(store).then(function(){return Storage.putAll(store,arr);}).catch(function(){});}}catch(e){}}
  window.KB_DOS_SYNC={
    /* Erst wenn das Dossier wirklich geladen ist, darf sein Schweigen als
       "nichts da" gelten - sonst loescht der Abgleich alles. */
    ready:function(){return !!Repo.ready;},
    exportEntries:function(){return (Repo.entries||[]).slice();},
    exportReunions:function(){return (Repo.reunions||[]).slice();},
    applyEntries:function(list){Repo.entries=(list||[]).slice();kbDosPersist('entries',Repo.entries);if(window.render){try{window.render();}catch(e){}}},
    applyReunions:function(list){Repo.reunions=(list||[]).slice();kbDosPersist('reunions',Repo.reunions);if(window.render){try{window.render();}catch(e){}}}
  };
  /* Papierkorb nach aussen: die Shell zeigt ihn unter Daten & Backup. */
  window.KB_TRASH={
    list:function(){try{return Trash.list();}catch(e){return [];}},
    count:function(){return this.list().length;},
    nameOf:function(sid){var s=null;try{s=Repo.getStudent(sid);}catch(e){}return s?s.name:'';},
    restore:function(tid){
      var x=null;try{x=Trash.list().filter(function(y){return y.id===tid;})[0]||null;}catch(e){}
      if(!x)return Promise.resolve(false);
      var p;
      if(x.kind==='reunion')p=Repo.saveReunion(x.data);
      else p=Repo.saveEntry(x.data);
      return Promise.resolve(p).then(function(){
        Trash.drop(tid);
        if(window.render){try{window.render();}catch(e){}}
        return true;
      });
    },
    drop:function(tid){Trash.drop(tid);},
    clear:function(){Trash.clear();}
  };
})();
`;

var SHELL_CONTROLLER = `
(function(){
  var app=document.getElementById('kb-app');
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var PANELS=['anw-root','dos-root','kb-heute','kb-klasse','kb-werkzeuge','kb-data'];
  /* Hub-Apps im selben Ordner bzw. den Hub selbst öffnen – in denselben
     benannten Tabs wie der Hub (ein Tab je App, kein Neuladen des Hubs) */
  var HUB_ZIELE={toolbox:['toolbox.html','cdse-toolbox'],lernen:['lernen.html','cdse-lernen'],screening:['../hub.html#/screening','cdse-hub'],hub:['../hub.html#/','cdse-hub'],schueler:['../hub.html#/schueler','cdse-hub']};
  function hubOpen(was,zusatz){var z=HUB_ZIELE[was];if(!z){return;}var w=window.open(z[0]+(zusatz||''),z[1]);if(w){try{w.focus();}catch(e){}}}
  window.__kbHub=hubOpen;
  document.addEventListener('click',function(ev){var el=ev.target.closest&&ev.target.closest('[data-kb-hub]');if(!el){return;}ev.preventDefault();hubOpen(el.getAttribute('data-kb-hub'),el.getAttribute('data-kb-hub-zusatz')||'');if(app.classList.contains('kb-open')){app.classList.remove('kb-open');}});
  var DOS_ROUTES={students:'#/dashboard',reunion:'#/reunion',orga:'#/orga',search:'#/search',themes:'#/themes',export:'#/export',ai:'#/ai-export'};
  function showPanel(id){for(var i=0;i<PANELS.length;i++){var el=$(PANELS[i]);if(el){el.classList.toggle('active',PANELS[i]===id);}}}
  function setActive(nav){var links=document.querySelectorAll('[data-kb-nav]');for(var i=0;i<links.length;i++){links[i].classList.toggle('active',links[i].getAttribute('data-kb-nav')===nav);}}
  function closeAnwModals(){try{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}catch(e){}}
  function clickAnwBtn(id){var b=document.getElementById(id);if(b){b.click();}}
  function closeDrawer(){app.classList.remove('kb-open');}

  function go(nav){
    if(DOS_ROUTES[nav]){
      showPanel('dos-root'); setActive(nav);
      if(window.navigate){window.navigate(DOS_ROUTES[nav]);}
    } else if(nav==='absenzen'){
      showPanel('anw-root'); setActive('absenzen'); closeAnwModals();
    } else if(nav==='absenzen-pdf'){
      showPanel('anw-root'); setActive('werkzeuge'); closeAnwModals(); clickAnwBtn('btn-pdf');
    } else if(nav==='heute'){
      showPanel('kb-heute'); setActive('heute');
      if(window.KB_HEUTE){try{window.KB_HEUTE.render($('kb-heute-body'));}catch(e){}}
    } else if(nav==='klasse'){
      showPanel('kb-klasse'); setActive('klasse'); renderKlasse();
    } else if(nav==='werkzeuge'){
      showPanel('kb-werkzeuge'); setActive('werkzeuge');
      try{renderWerkzeuge();}catch(e){}
    } else if(nav==='data'){
      showPanel('kb-data'); setActive('data');
      try{renderWeekBox();}catch(e){}
      try{renderTrash();}catch(e){}
      try{renderSpell();}catch(e){}
    } else if(nav==='material'){
      hubOpen('toolbox');
    } else if(nav==='patho'){
      hubOpen('lernen');
    }
    closeDrawer();
  }
  window.__kbGo=go;

  // Seitenmenü
  var links=document.querySelectorAll('[data-kb-nav]');
  for(var i=0;i<links.length;i++){(function(l){l.addEventListener('click',function(){go(l.getAttribute('data-kb-nav'));});})(links[i]);}
  // "Mehr" ein-/ausklappen
  var moreT=$('kb-more-toggle'), moreBox=$('kb-more');
  if(moreT&&moreBox){moreT.addEventListener('click',function(){var open=moreBox.classList.toggle('open');moreT.classList.toggle('open',open);});}
  // Mobile-Schublade
  var burger=$('kb-burger'); if(burger){burger.addEventListener('click',function(){app.classList.toggle('kb-open');});}
  var scrim=$('kb-scrim'); if(scrim){scrim.addEventListener('click',closeDrawer);}
  // Desktop-Seitenleiste ein-/ausklappen (Zustand merken)
  function setCollapsed(on){app.classList.toggle('kb-collapsed',on);try{localStorage.setItem('kb_side_collapsed',on?'1':'0');}catch(e){}}
  try{if(localStorage.getItem('kb_side_collapsed')==='1')app.classList.add('kb-collapsed');}catch(e){}
  var collapseBtn=$('kb-collapse'); if(collapseBtn){collapseBtn.addEventListener('click',function(){setCollapsed(true);});}
  var reopenBtn=$('kb-reopen'); if(reopenBtn){reopenBtn.addEventListener('click',function(){setCollapsed(false);});}

  // Aktive Markierung anhand der dossier-Route
  /* Orga, Themen und der Dossier-Bericht haben keinen eigenen Menuepunkt mehr -
     sie haengen unter "Organisation & Berichte", also bleibt der markiert. */
  function dosNavForHash(){var h=location.hash||'';
    if(h.indexOf('#/reunion')===0)return 'reunion';
    if(h.indexOf('#/orga')===0)return 'werkzeuge';
    if(h.indexOf('#/search')===0)return 'search';
    if(h.indexOf('#/themes')===0)return 'werkzeuge';
    if(h.indexOf('#/export')===0)return 'werkzeuge';
    if(h.indexOf('#/ai-export')===0)return 'ai';
    if(h.indexOf('#/backup')===0)return null;
    return 'students';
  }
  window.addEventListener('hashchange',function(){var d=$('dos-root');if(d&&d.classList.contains('active')){var n=dosNavForHash();if(n){setActive(n);}}});

  // Brücke Hub/Klasse/Klassenbuch -> Shell-Aktionen
  document.addEventListener('click',function(ev){
    var el=ev.target.closest&&ev.target.closest('[data-kb-act]'); if(!el)return;
    var act=el.getAttribute('data-kb-act'), arg=el.getAttribute('data-kb-arg');
    if(act==='open-absenzen'){go('absenzen');if(window.KB_ANW){window.KB_ANW.openStudent(arg);}}
    else if(act==='open-tt'){go('klasse');var _c=$('kb-klasse');var _k=_c&&_c.querySelector('.kb-ttcard');if(_k&&_k.scrollIntoView)_k.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(act==='open-cal'){go('absenzen');clickAnwBtn('btn-cal');}
    else if(act==='open-screening'){
      showPanel('dos-root'); setActive('students');
      if(window.navigate){window.navigate('#/student/'+encodeURIComponent(arg)+'?hub=screening');}
      closeDrawer();
    }
  });

  /* ============================================================
     Schuljahr · Trimester · Stundenplan — alles im Bereich „Klasse".
     Der Stundenplan gehört immer zum oben gewählten Trimester.
     ============================================================ */
  function termChip(){
    var c=$('kb-termchip'); if(!c||!window.KB_TERMS)return;
    var a=window.KB_TERMS.active();
    c.innerHTML='<span class="kb-tc-ic">🎓</span><span class="kb-tc-t">'+
      '<span class="kb-tc-y">'+esc(a.year.label)+'</span>'+
      '<span class="kb-tc-s">'+esc(window.KB_TERMS.termLabel(a.term.key))+(a.auto?'':' · fest')+(a.year.closed?' · abgeschlossen':'')+'</span></span>';
    c.title='Schuljahr '+a.year.label+' · '+window.KB_TERMS.termLabel(a.term.key)+' — klicken zum Ändern';
  }
  function renderTermCard(){
    if(!window.KB_TERMS||!$('kb-term-year'))return;
    var T=window.KB_TERMS, a=T.active(), years=T.list();
    $('kb-term-now').textContent=T.label()+(a.auto?' · automatisch':'');
    $('kb-term-year').innerHTML=years.map(function(y){
      return '<option value="'+esc(y.id)+'"'+(y.id===a.year.id?' selected':'')+'>'+esc(y.label)+(y.closed?' (abgeschlossen)':'')+'</option>';
    }).join('');
    $('kb-term-tabs').innerHTML=T.termKeys().map(function(k){
      return '<button class="kb-tt-tab'+(k===a.term.key?' on':'')+'" data-termkey="'+k+'">'+esc(T.termLabel(k))+'</button>';
    }).join('');
    var cur=null; for(var i=0;i<years.length;i++){if(years[i].id===a.year.id)cur=years[i];}
    $('kb-term-dates').innerHTML=(cur?cur.terms:[]).map(function(t){
      return '<div class="kb-termrow'+(t.key===a.term.key?' on':'')+'"><b>'+esc(t.label)+'</b>'+
        '<input type="date" data-tr="'+esc(cur.id+'|'+t.key+'|from')+'" value="'+esc(t.from)+'">'+
        '<span style="color:var(--kb-muted);">bis</span>'+
        '<input type="date" data-tr="'+esc(cur.id+'|'+t.key+'|to')+'" value="'+esc(t.to)+'"></div>';
    }).join('');
    $('kb-term-new').placeholder='z. B. '+T.nextLabel();
    $('kb-term-close').textContent=(cur&&cur.closed)?'🔓 Schuljahr wieder öffnen':'🔒 Schuljahr abschließen';
    $('kb-term-auto').style.display=a.auto?'none':'';
  }
  function renderTTGrid(){
    var host=$('kb-tt-grid'); if(!host||!window.KB_ANW||!window.KB_ANW.blocks)return;
    var lvls=window.KB_ANW.levels(), blocks=window.KB_ANW.blocks(), days=window.KB_ANW.dayNames();
    if(ttLevel&&lvls.indexOf(ttLevel)<0)ttLevel=lvls[0];
    if(!ttLevel)ttLevel=lvls[0];
    $('kb-tt-for').textContent=window.KB_TERMS?window.KB_TERMS.label():'';
    $('kb-tt-levels').innerHTML=lvls.map(function(l){
      return '<button class="kb-tt-tab'+(l===ttLevel?' on':'')+'" data-ttlevel="'+esc(l)+'">Niveau '+esc(l)+'</button>';
    }).join('');
    /* Fächer-Vorschläge aus beiden Niveaus des aktiven Plans */
    var seen={},subs=[];
    lvls.forEach(function(l){(window.KB_ANW.subjectsForLevel(l)||[]).forEach(function(s){if(!seen[s]){seen[s]=1;subs.push(s);}});});
    $('kb-tt-subjects').innerHTML=subs.map(function(s){return '<option value="'+esc(s)+'">';}).join('');
    /* „Aus anderem Trimester übernehmen" */
    if(window.KB_TIMETABLE&&window.KB_TERMS){
      var here=window.KB_TERMS.key();
      var opts=window.KB_TIMETABLE.keys().filter(function(k){return k!==here&&window.KB_TIMETABLE.has(k);}).map(function(k){
        var p=k.split(':'),y=null,ls=window.KB_TERMS.list();
        for(var i=0;i<ls.length;i++){if(ls[i].id===p[0])y=ls[i];}
        return '<option value="'+esc(k)+'">'+esc((y?y.label:p[0])+' · '+window.KB_TERMS.termLabel(p[1]))+'</option>';
      });
      $('kb-tt-copy').innerHTML=opts.length?('<option value="">— aus anderem Trimester übernehmen —</option>'+opts.join('')):'<option value="">— kein anderer Plan vorhanden —</option>';
      $('kb-tt-copy').disabled=!opts.length; $('kb-tt-copybtn').disabled=!opts.length;
    }
    var tt=window.KB_ANW.getTimetable()||{}, grid=tt[ttLevel]||{};
    var head='<tr><th class="kb-ttime">Zeit</th>';
    for(var w=1;w<=5;w++){head+='<th>'+esc(days[w]||('Tag '+w))+'</th>';}
    head+='</tr>';
    var rows='';
    for(var bi=0;bi<blocks.length;bi++){
      var b=blocks[bi], pause=false;
      for(var d=1;d<=5;d++){if(window.KB_ANW.isPause((grid[d]||[])[bi])){pause=true;break;}}
      rows+='<tr'+(pause?' class="kb-ttpause"':'')+'><td class="kb-ttime">'+esc(b.start)+'–'+esc(b.end)+
        '<small>'+String(b.hours).replace('.',',')+' h</small></td>';
      for(var wd=1;wd<=5;wd++){
        var v=(grid[wd]||[])[bi]||'';
        rows+='<td><input list="kb-tt-subjects" value="'+esc(v)+'" data-ttc="'+esc(ttLevel+'|'+wd+'|'+bi)+'" placeholder="—"></td>';
      }
      rows+='</tr>';
    }
    host.innerHTML='<table class="kb-ttgrid"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table>';
    host.querySelectorAll('[data-ttc]').forEach(function(el){
      el.addEventListener('input',function(){
        var p=el.getAttribute('data-ttc').split('|');
        if(window.KB_TIMETABLE)window.KB_TIMETABLE.setCell(p[0],+p[1],+p[2],el.value);
      });
      el.addEventListener('change',function(){renderTTSubjects();});
    });
  }
  function renderTTSubjects(){
    if(!window.KB_ANW||!$('kb-tt-subjects'))return;
    var seen={},subs=[];
    window.KB_ANW.levels().forEach(function(l){(window.KB_ANW.subjectsForLevel(l)||[]).forEach(function(s){if(!seen[s]){seen[s]=1;subs.push(s);}});});
    $('kb-tt-subjects').innerHTML=subs.map(function(s){return '<option value="'+esc(s)+'">';}).join('');
  }
  var ttLevel='L1';
  /* ---- Fächer: umbenennen wirkt überall (Stundenplan, Noten, Absenzen, Notizen) ---- */
  function renderSubjects(){
    var host=$('kb-sub-list'); if(!host||!window.KB_TIMETABLE)return;
    var use=window.KB_TIMETABLE.usage();
    var names=Object.keys(use).sort(function(a,b){return a.localeCompare(b);});
    $('kb-sub-count').textContent=names.length+(names.length===1?' Fach':' Fächer');
    if(!names.length){host.innerHTML='<p class="kb-hint" style="margin:0;">Noch keine Fächer — trag sie oben im Stundenplan ein.</p>';return;}
    host.innerHTML='<div class="kb-sublist">'+names.map(function(n){
      var u=use[n], terms=Object.keys(u.terms).length;
      return '<div class="kb-subrow" title="'+esc(n)+'"><b>'+esc(n)+'</b>'+
        '<span class="kb-submeta">'+u.total+'× · '+terms+(terms===1?' Trimester':' Trimester')+'</span>'+
        '<button class="kb-btn kb-btn-sm" data-subren="'+esc(n)+'">Umbenennen</button></div>';
    }).join('')+'</div>';
    host.querySelectorAll('[data-subren]').forEach(function(el){
      el.addEventListener('click',function(){renameSubject(el.getAttribute('data-subren'));});
    });
  }
  function renameSubject(from){
    var to=window.prompt('Fach „'+from+'" umbenennen in:',from);
    if(to==null)return;
    to=String(to).trim();
    if(!to||to===from)return;
    var nTT=window.KB_TIMETABLE?window.KB_TIMETABLE.renameSubject(from,to):0;
    var nNo=(window.KB_NOTEN&&window.KB_NOTEN.renameSubject)?window.KB_NOTEN.renameSubject(from,to):0;
    var nAn=(window.KB_ANW&&window.KB_ANW.renameSubject)?window.KB_ANW.renameSubject(from,to):0;
    renderTTGrid();renderSubjects();
    alert('„'+from+'" heißt jetzt „'+to+'".\\n\\n'+
      nTT+' Stundenplan-Felder (alle Trimester)\\n'+nNo+' Noten/Modul-Einträge\\n'+nAn+' Absenzen/Notizen\\n\\nwurden mitgeändert.');
    if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
  }
  /* ---- Stundenraster: nur die Uhrzeiten ---- */
  function renderBlocks(){
    var host=$('kb-blk-list'); if(!host||!window.KB_BLOCKS)return;
    var bl=window.KB_BLOCKS.list();
    $('kb-blk-state').textContent=window.KB_BLOCKS.isCustom()?'angepasst':'Standardzeiten';
    host.innerHTML='<div class="kb-blklist">'+bl.map(function(b,i){
      return '<div class="kb-blkrow"><b>'+(i+1)+'. Stunde</b>'+
        '<input type="time" data-blk="'+esc(b.id)+'|start" value="'+esc(b.start)+'">'+
        '<span style="color:var(--kb-muted);">bis</span>'+
        '<input type="time" data-blk="'+esc(b.id)+'|end" value="'+esc(b.end)+'">'+
        '<span class="kb-submeta">'+String(b.hours).replace('.',',')+' h</span></div>';
    }).join('')+'</div>';
    host.querySelectorAll('[data-blk]').forEach(function(el){
      el.addEventListener('change',function(){
        var p=el.getAttribute('data-blk').split('|');
        var okv=window.KB_BLOCKS.set(p[0],p[1]==='start'?el.value:null,p[1]==='end'?el.value:null);
        if(!okv){alert('Diese Zeit passt nicht — das Ende muss nach dem Beginn liegen.');}
        renderBlocks();renderTTGrid();
      });
    });
  }
  function renderKlasse(){renderTermCard();renderTTGrid();renderSubjects();renderBlocks();renderRoster();}

  /* --- Bedienung --- */
  (function wireKlasse(){
    var chip=$('kb-termchip');
    if(chip){chip.addEventListener('click',function(){go('klasse');var c=$('kb-klasse');if(c){var k=c.querySelector('.kb-termcard');if(k&&k.scrollIntoView)k.scrollIntoView({behavior:'smooth',block:'start'});}});}
    var ysel=$('kb-term-year');
    if(ysel){ysel.addEventListener('change',function(){window.KB_TERMS.pin(ysel.value,window.KB_TERMS.activeTermKey());});}
    var tabs=$('kb-term-tabs');
    if(tabs){tabs.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-termkey]'); if(!b)return;
      window.KB_TERMS.pin($('kb-term-year').value,b.getAttribute('data-termkey'));
    });}
    var auto=$('kb-term-auto'); if(auto){auto.addEventListener('click',function(){window.KB_TERMS.unpin();});}
    var dates=$('kb-term-dates');
    if(dates){dates.addEventListener('change',function(e){
      var el=e.target; if(!el||!el.getAttribute||!el.getAttribute('data-tr'))return;
      var p=el.getAttribute('data-tr').split('|');
      window.KB_TERMS.setTermRange(p[0],p[1],p[2]==='from'?el.value:null,p[2]==='to'?el.value:null);
    });}
    var add=$('kb-term-add'), nin=$('kb-term-new');
    if(add&&nin){
      add.addEventListener('click',function(){
        var v=(nin.value||'').trim()||window.KB_TERMS.nextLabel();
        if(!window.KB_TERMS.addYear(v)){alert('Bitte ein gültiges Schuljahr eingeben, z. B. '+window.KB_TERMS.nextLabel()+'.');return;}
        nin.value='';
      });
      nin.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();add.click();}});
    }
    var rst=$('kb-term-reset');
    if(rst){rst.addEventListener('click',function(){
      if(confirm('Die Trimester-Termine dieses Schuljahres wieder auf den luxemburgischen Schulkalender setzen?'))
        window.KB_TERMS.resetTerms($('kb-term-year').value);
    });}
    var cls=$('kb-term-close');
    if(cls){cls.addEventListener('click',function(){
      var id=$('kb-term-year').value;
      if(window.KB_TERMS.isClosed(id))window.KB_TERMS.reopenYear(id);else window.KB_TERMS.closeYear(id);
    });}
    var lv=$('kb-tt-levels');
    if(lv){lv.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-ttlevel]'); if(!b)return;
      ttLevel=b.getAttribute('data-ttlevel'); renderTTGrid();
    });}
    var cb=$('kb-tt-copybtn');
    if(cb){cb.addEventListener('click',function(){
      var k=$('kb-tt-copy').value; if(!k)return;
      if(!confirm('Den Stundenplan dieses Trimesters durch den gewählten ersetzen?'))return;
      window.KB_TIMETABLE.copyFrom(k); renderTTGrid();
    });}
    var clr=$('kb-tt-clear');
    if(clr){clr.addEventListener('click',function(){
      if(!confirm('Alle Fächer in diesem Trimester leeren? Pausen bleiben stehen.'))return;
      window.KB_TIMETABLE.clear(); renderTTGrid(); renderSubjects();
    });}
    var ttr=$('kb-tt-reset');
    if(ttr){ttr.addEventListener('click',function(){
      if(!confirm('Den offiziellen Stundenplan 2026/27 für dieses Trimester wieder einsetzen? Eigene Änderungen in diesem Trimester gehen dabei verloren.'))return;
      window.KB_TIMETABLE.restoreDefault(); renderTTGrid(); renderSubjects();
    });}
    var brst=$('kb-blk-reset');
    if(brst){brst.addEventListener('click',function(){
      if(!confirm('Die Uhrzeiten wieder auf die Standardzeiten setzen?'))return;
      window.KB_BLOCKS.reset(); renderBlocks(); renderTTGrid();
    });}
    if(window.KB_TERMS){window.KB_TERMS.onChange(function(){
      termChip();
      if($('kb-klasse')&&$('kb-klasse').classList.contains('active')){renderTermCard();renderTTGrid();}
    });}
    if(window.KB_TIMETABLE){window.KB_TIMETABLE.onChange(function(){
      if($('kb-klasse')&&$('kb-klasse').classList.contains('active')){renderTTGrid();}
    });}
    termChip();
  })();

  // Gemeinsame Schülerliste (im Bereich "Klasse")
  var rosterQuery='';
  function renderRoster(){
    var body=$('kb-roster-body'); if(!body||!window.KB_ROSTER)return;
    var CYC=['C1','C2','C3','C4','ES'];
    function cycOpts(sel){sel=sel||'ES';return CYC.map(function(c){return '<option value="'+c+'"'+(sel===c?' selected':'')+'>'+c+'</option>';}).join('');}
    var all=window.KB_ROSTER.list();
    var q=(rosterQuery||'').toLowerCase();
    var shown=q?all.filter(function(s){return (s.name||'').toLowerCase().indexOf(q)>=0||(s.klasse||'').toLowerCase().indexOf(q)>=0;}):all;
    var nAct=0;for(var a=0;a<all.length;a++){if(all[a].active!==false)nAct++;}
    var rows=shown.map(function(s){
      var on=s.active!==false;
      return '<tr data-id="'+esc(s.id)+'"'+(on?'':' class="kb-rinactive"')+'>'+
        '<td><input class="kb-in kb-rn" value="'+esc(s.name)+'"></td>'+
        '<td><input class="kb-in kb-rk" style="max-width:120px" value="'+esc(s.klasse||'')+'" placeholder="—"></td>'+
        '<td><select class="kb-in kb-rz" style="max-width:84px" title="Zyklus (Alter) — steuert passende Arbeitsblätter">'+cycOpts(s.zyklus)+'</select></td>'+
        '<td><select class="kb-in kb-rl" style="max-width:84px"><option'+(s.level!=='L2'?' selected':'')+'>L1</option><option'+(s.level==='L2'?' selected':'')+'>L2</option></select></td>'+
        '<td style="text-align:center"><label class="kb-ract" title="Aktiv — nur aktive Schüler stehen im täglichen Klassenbuch"><input type="checkbox" class="kb-ra"'+(on?' checked':'')+'></label></td>'+
        '<td style="text-align:right"><button class="kb-btn kb-btn-ghost kb-rd" title="Schüler endgültig aus der Liste löschen">🗑</button></td></tr>';
    }).join('');
    var head='<div class="kb-rosterbar"><input class="kb-in" id="kb-roster-q" placeholder="Suchen …" value="'+esc(rosterQuery||'')+'" style="max-width:240px;"><span class="kb-submeta">'+nAct+' aktiv · '+all.length+' insgesamt'+(q?(' · '+shown.length+' gefunden'):'')+'</span></div>';
    body.innerHTML=head+'<table class="kb-table" style="margin-top:6px"><thead><tr><th>Name</th><th>Klasse</th><th title="Cycle 1–4 / Sekundar — bestimmt altersgerechte Arbeitsblätter">Zyklus</th><th>Niveau</th><th style="text-align:center">Aktiv</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><p class="muted" style="font-size:12.5px;margin:8px 2px 0;">Der <b>Zyklus</b> (C1 ≈ 3–5 J. · C2 ≈ 6–7 · C3 ≈ 8–9 · C4 ≈ 10–11 · ES ≥ 12) steuert, welche Arbeitsblätter altersgerecht vorgeschlagen werden. Wer die Klasse verlässt, wird <b>inaktiv</b> gesetzt statt gelöscht — Absenzen, Noten und Dossier bleiben dann vollständig erhalten.</p>';
    var qi=$('kb-roster-q');
    if(qi){qi.addEventListener('input',function(){rosterQuery=qi.value;renderRoster();var f=$('kb-roster-q');if(f){f.focus();f.setSelectionRange(f.value.length,f.value.length);}});}
    var trs=body.querySelectorAll('tr[data-id]');
    for(var i=0;i<trs.length;i++){(function(tr){
      var id=tr.getAttribute('data-id');
      tr.querySelector('.kb-rn').addEventListener('change',function(e){window.KB_ROSTER.update(id,{name:e.target.value.trim()});});
      tr.querySelector('.kb-rk').addEventListener('change',function(e){window.KB_ROSTER.update(id,{klasse:e.target.value.trim()});});
      tr.querySelector('.kb-rz').addEventListener('change',function(e){window.KB_ROSTER.update(id,{zyklus:e.target.value});});
      tr.querySelector('.kb-rl').addEventListener('change',function(e){window.KB_ROSTER.update(id,{level:e.target.value});});
      tr.querySelector('.kb-ra').addEventListener('change',function(e){window.KB_ROSTER.update(id,{active:!!e.target.checked});renderRoster();});
      tr.querySelector('.kb-rd').addEventListener('click',function(){var s=window.KB_ROSTER.byId(id);if(confirm('„'+(s?s.name:'')+'“ endgültig aus der Liste löschen?\\n\\nBesser: den Haken bei „Aktiv" entfernen — dann bleiben Absenzen, Noten und Dossier erhalten.')){window.KB_ROSTER.remove(id);renderRoster();}});
    })(trs[i]);}
  }
  var addBtn=$('kb-roster-add');
  if(addBtn){addBtn.addEventListener('click',function(){
    var n=$('kb-roster-name'),k=$('kb-roster-klasse'),l=$('kb-roster-level');
    var name=(n.value||'').trim(); if(!name){n.focus();return;}
    window.KB_ROSTER.add(name,k.value.trim(),l.value); n.value='';k.value='';n.focus(); renderRoster();
  });}
  /* Enter im Namensfeld legt den Schüler direkt an */
  var addName=$('kb-roster-name');
  if(addName){addName.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();if(addBtn)addBtn.click();}
  });}
  var dA=$('kb-data-anw'); if(dA){dA.addEventListener('click',function(){go('absenzen');var b=document.getElementById('btn-data');if(b){b.click();}});}
  var dD=$('kb-data-dos'); if(dD){dD.addEventListener('click',function(){showPanel('dos-root');setActive('');if(window.navigate){window.navigate('#/backup');}closeDrawer();});}
  var wDl=$('kb-weekly-dl'); if(wDl){wDl.addEventListener('click',function(){if(window.KB_WEEKLY){KB_WEEKLY.download();}});}

  /* ---- Drehkreuz "Organisation & Berichte": ein paar lebende Zahlen ---- */
  function renderWerkzeuge(){
    var o=$('kb-wz-orga');
    if(o){
      var n=0,r=0;
      try{
        var l=window.KB_DOS_SYNC.exportReunions();
        r=l.length;
        for(var i=0;i<l.length;i++)n+=((l[i]||{}).orgItems||[]).length;
      }catch(e){}
      o.textContent=n?(n+' Punkte aus '+r+' Réunionen.'):'Noch keine Orga-Punkte erfasst.';
    }
    var u=$('kb-wz-reu');
    if(u){
      var d='';
      try{
        var ll=window.KB_DOS_SYNC.exportReunions().slice().sort(function(a,b){return b.date.localeCompare(a.date);});
        d=ll.length?ll[0].date:'';
      }catch(e){}
      u.textContent=d?('Zuletzt: '+d.split('-').reverse().join('.')):'';
    }
  }

  /* ---- Rechtschreibpruefung: ein/aus und eigene Woerter ---- */
  function renderSpell(){
    if(!window.KB_SPELL)return;
    var an=$('kb-sp-an');if(an){an.checked=window.KB_SPELL.an();
      if(!an._kbW){an._kbW=1;an.addEventListener('change',function(){window.KB_SPELL.setAn(an.checked);renderSpell();});}}
    var n=$('kb-sp-n');
    if(n)n.textContent=window.KB_SPELL.an()?(window.KB_SPELL.bereit()?'bereit':'wird beim Schreiben geladen'):'aus';
    var box=$('kb-sp-eigen');if(!box)return;
    var l=window.KB_SPELL.eigene();
    if(!l.length){box.innerHTML='<div class="kb-sync-status">Eigene Wörter: noch keine. Über „Ins Wörterbuch" beim Vorschlagsfenster kommen Namen und Fachbegriffe dazu.</div>';return;}
    box.innerHTML='<div class="kb-sync-status" style="margin-bottom:6px;">Eigene Wörter ('+l.length+') — gelten nur auf diesem Gerät:</div>'+
      '<div class="kb-spwords">'+l.slice().sort().map(function(w){
        return '<span class="kb-spword">'+esc(w)+'<button data-spdel="'+esc(w)+'" title="wieder als Fehler behandeln">×</button></span>';
      }).join('')+'</div>';
    box.querySelectorAll('[data-spdel]').forEach(function(b){
      b.addEventListener('click',function(){
        window.KB_SPELL.vergessen(b.getAttribute('data-spdel'));
        window.KB_SPELL.neuzeichnen();renderSpell();
      });
    });
  }

  /* ---- Papierkorb: zeigen, zurueckholen, leeren ---- */
  function trashWhen(ts){
    var d=new Date(ts),h=new Date();
    var t=d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();
    var u=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    if(d.toDateString()===h.toDateString())return 'heute '+u;
    return t+' '+u;
  }
  function renderTrash(){
    var box=$('kb-trash-list');if(!box||!window.KB_TRASH)return;
    var l=window.KB_TRASH.list();
    var n=$('kb-trash-n');if(n)n.textContent=l.length?(l.length+(l.length===1?' Eintrag':' Einträge')):'leer';
    var em=$('kb-trash-empty');if(em)em.style.display=l.length?'':'none';
    if(!l.length){box.innerHTML='<div class="kb-sync-status">Nichts gelöscht — hier ist alles leer.</div>';return;}
    box.innerHTML='<div class="kb-trash">'+l.slice(0,50).map(function(x){
      var d=x.data||{};
      var wer=x.kind==='reunion'?('Réunion vom '+esc(d.date||'')):(esc(window.KB_TRASH.nameOf(d.studentId)||'Eintrag')+' · '+esc(d.date||''));
      var txt=x.kind==='reunion'
        ? ((d.orgItems||[]).length+' Orga-Punkte')
        : String(d.text||'').replace(/\s+/g,' ').slice(0,120);
      return '<div class="kb-trash-row">'+
        '<div class="kb-trash-main"><b>'+wer+'</b>'+(d.category?' <span class="kb-trash-cat">'+esc(d.category)+'</span>':'')+
          '<div class="kb-trash-txt">'+(txt?esc(txt)+(String(d.text||'').length>120?'…':''):'<i>ohne Text</i>')+'</div>'+
          '<div class="kb-trash-meta">gelöscht '+esc(trashWhen(x.at))+(x.by?' von '+esc(x.by):'')+'</div>'+
        '</div>'+
        '<div class="kb-trash-acts">'+
          '<button class="kb-btn kb-btn-primary" data-trrest="'+esc(x.id)+'">Wiederherstellen</button>'+
          '<button class="kb-btn" data-trdrop="'+esc(x.id)+'" title="endgültig entfernen">✕</button>'+
        '</div></div>';
    }).join('')+'</div>'+(l.length>50?'<div class="kb-sync-status">… und '+(l.length-50)+' weitere.</div>':'');
    box.querySelectorAll('[data-trrest]').forEach(function(b){
      b.addEventListener('click',function(){
        b.disabled=true;
        window.KB_TRASH.restore(b.getAttribute('data-trrest')).then(function(ok){
          renderTrash();
          if(ok&&window.KB_TOAST)window.KB_TOAST('Wiederhergestellt');
        });
      });
    });
    box.querySelectorAll('[data-trdrop]').forEach(function(b){
      b.addEventListener('click',function(){
        if(!confirm('Diesen Eintrag endgültig entfernen? Danach ist er wirklich weg.'))return;
        window.KB_TRASH.drop(b.getAttribute('data-trdrop'));renderTrash();
      });
    });
  }

  /* ---- Wochen-Sicherung: Woche wählen, dann Excel oder Word ---- */
  function wkMonday(){
    var i=$('kb-wk-date');
    return (window.KB_WEEKLY&&i)?window.KB_WEEKLY.monday(i.value||''):'';
  }
  function renderWeekBox(){
    if(!window.KB_WEEKLY||!$('kb-wk-date'))return;
    var m=wkMonday(), r=window.KB_WEEKLY.range(m);
    $('kb-wk-date').value=m;
    function d(s){var p=String(s).split('-');return p[2]+'.'+p[1]+'.'+p[0];}
    $('kb-wk-range').textContent=d(r.lo)+' – '+d(r.hi);
    var rows=window.KB_WEEKLY.collect(r.lo,r.hi), sum=window.KB_WEEKLY.summary(rows);
    $('kb-wk-counts').innerHTML=rows.length
      ? ('<b>'+rows.length+'</b> neue Einträge: '+sum.map(function(p){return '<b>'+p[1]+'</b> '+esc(p[0]);}).join(' · '))
      : 'In dieser Woche ist nichts Neues dazugekommen.';
  }
  (function wireWeek(){
    var di=$('kb-wk-date'); if(!di||!window.KB_WEEKLY)return;
    function shift(days){
      var m=wkMonday(); var d=new Date(m+'T00:00:00'); d.setDate(d.getDate()+days);
      function p(n){return (n<10?'0':'')+n;}
      di.value=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
      renderWeekBox();
    }
    di.value=window.KB_WEEKLY.monday('');
    di.addEventListener('change',renderWeekBox);
    var te=$('kb-trash-empty');
    if(te)te.addEventListener('click',function(){
      if(!confirm('Papierkorb leeren? Danach lässt sich nichts mehr zurückholen.'))return;
      window.KB_TRASH.clear();renderTrash();
    });
    var b;
    if((b=$('kb-wk-prev')))b.addEventListener('click',function(){shift(-7);});
    if((b=$('kb-wk-next')))b.addEventListener('click',function(){shift(7);});
    if((b=$('kb-wk-this')))b.addEventListener('click',function(){di.value=window.KB_WEEKLY.monday('');renderWeekBox();});
    if((b=$('kb-wk-xlsx')))b.addEventListener('click',function(){window.KB_WEEKLY.downloadXlsx(wkMonday());});
    if((b=$('kb-wk-doc')))b.addEventListener('click',function(){window.KB_WEEKLY.downloadDoc(wkMonday());});
  })();

  // Roster-Änderungen -> beide Engines + offene Listen aktualisieren
  if(window.KB_ROSTER){
    window.KB_ROSTER.onChange(function(){
      if(window.__anwRefresh){try{window.__anwRefresh();}catch(e){}}
      if(window.render){try{window.render();}catch(e){}}
      if($('kb-klasse')&&$('kb-klasse').classList.contains('active')){renderRoster();}
    });
  }

  // Gemeinsamer Speicher (KB_SYNC) — Status + Aktionen
  function renderSync(){
    var st=$('kb-sync-status'),ac=$('kb-sync-actions'); if(!st||!ac||!window.KB_SYNC)return;
    var s=window.KB_SYNC.getStatus();
    if(!s.supported){st.innerHTML='<b style="color:#b3432d">Dieser Browser unterstützt die gemeinsame Datei nicht (z. B. Firefox).</b><br>Bitte die App in <b>Microsoft Edge</b> öffnen: Rechtsklick auf <i>index.html</i> → „Öffnen mit" → Microsoft Edge. Edge ist auf jedem Windows-PC vorinstalliert; eure Daten bleiben im Haus.';ac.innerHTML='';return;}
    var info;
    if(s.connected){info='<b style="color:#1d8a52">✓ Verbunden</b> · '+esc(s.fileName)+(s.lastSync?' · zuletzt '+new Date(s.lastSync).toLocaleTimeString():'')+(s.lastBy?' · zuletzt von '+esc(s.lastBy):'')+(s.pending?' · synchronisiert…':'')+(s.warten?' · <b style="color:#c9851f">wartet auf '+esc(s.warten)+'</b>':'');}
    else if(s.error==='reconnect'){info='<b style="color:#c9851f">Verbindung muss bestätigt werden</b> — der Browser setzt die Freigabe beim Neustart zurück. Die App fragt beim ersten Klick von selbst danach, sonst hier „Verbinden" ('+esc(s.fileName)+').';}
    else{info='Nicht verbunden — Daten liegen nur auf diesem Gerät.';}
    if(s.error&&s.error!=='reconnect'){info+='<br><span style="color:#b3432d">'+esc(s.error)+'</span>';}
    if(s.connected&&s.counts){var k=s.counts;info+='<div style="margin-top:6px;color:var(--kb-muted);font-size:12.5px;">In der gemeinsamen Datei: <b>'+(k.roster||0)+'</b> Schüler · <b>'+(k.dosEntries||0)+'</b> Dossier-Einträge · <b>'+(k.anwEntries||0)+'</b> Absenzen · <b>'+(k.anwNotes||0)+'</b> Notizen · <b>'+(k.dosReunions||0)+'</b> Réunionen · <b>'+(k.bubble||0)+'</b> Helfernetz</div>';}
    if(s.connected){
      var bk;
      if(s.backupName){bk='🗂️ Auto-Sicherung: Ordner <b>'+esc(s.backupName)+'</b> · letzte Kopie: '+(s.backupLast?esc(s.backupLast):'noch keine')+(s.backupErr==='reconnect'?' · <span style="color:#c9851f">bitte bestätigen</span>':'');}
      else{bk='🗂️ <b>Tägliche Auto-Sicherung</b> noch nicht eingerichtet — Ordner auf O: wählen, dann legt die App 1×/Tag automatisch eine datierte Kopie an (die letzten 30 bleiben erhalten).';}
      if(s.backupErr&&s.backupErr!=='reconnect'){bk+=' <span style="color:#b3432d">'+esc(s.backupErr)+'</span>';}
      info+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);color:var(--kb-muted);font-size:12.5px;">'+bk+'</div>';
    }
    if(s.fileName||s.connected){
      var an=!window.KB_SYNC.autoOn||window.KB_SYNC.autoOn();
      info+='<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);font-size:12.5px;\">'+
        '<label style=\"display:flex;gap:7px;align-items:flex-start;cursor:pointer;\">'+
        '<input type=\"checkbox\" id=\"kbs-auto\"'+(an?' checked':'')+' style=\"margin-top:2px;\">'+
        '<span>Beim Öffnen von selbst verbinden — die App fragt einmal beim ersten Klick nach der Datei, statt dass man jedes Mal hierher muss.</span>'+
        '</label></div>';
    }
    st.innerHTML=info;
    var au=$('kbs-auto');
    if(au)au.addEventListener('change',function(){window.KB_SYNC.setAuto(au.checked);});
    var b;
    if(s.connected){var bkBtn=s.backupErr==='reconnect'?'<button class="kb-btn" id="kbs-bkok">🗂️ Auto-Backup bestätigen</button>':(s.backupName?'<button class="kb-btn" id="kbs-bkdir">🗂️ Backup-Ordner ändern</button>':'<button class="kb-btn kb-btn-primary" id="kbs-bkdir">🗂️ Auto-Backup einrichten</button>');b='<button class="kb-btn" id="kbs-now">🔄 Jetzt synchronisieren</button>'+bkBtn+'<button class="kb-btn" id="kbs-disc">Trennen</button>';}
    else if(s.error==='reconnect'){b='<button class="kb-btn kb-btn-primary" id="kbs-recon">Verbinden</button>';}
    else{b='<button class="kb-btn kb-btn-primary" id="kbs-open">📂 Bestehende Datei öffnen</button><button class="kb-btn" id="kbs-new">➕ Neue gemeinsame Datei</button>';}
    ac.innerHTML=b;
    function w(id,fn){var e=$(id);if(e)e.addEventListener('click',fn);}
    w('kbs-now',function(){window.KB_SYNC.syncNow();});
    w('kbs-bkdir',function(){window.KB_SYNC.chooseBackupDir();});
    w('kbs-bkok',function(){window.KB_SYNC.regrantBackupDir();});
    w('kbs-disc',function(){if(confirm('Verbindung trennen? Lokale Daten bleiben erhalten.'))window.KB_SYNC.disconnect();});
    w('kbs-recon',function(){window.KB_SYNC.reconnect();});
    w('kbs-open',function(){window.KB_SYNC.connectExisting();});
    w('kbs-new',function(){window.KB_SYNC.connectNew();});
  }
  if(window.KB_SYNC){window.KB_SYNC.onStatus(function(){renderSync();});window.KB_SYNC.init();}

  /* ============================================================
     Identität: „Wer arbeitet hier?" — erste Ansicht der App.
     Quelle der Wahrheit = KB_ANW (state.currentUser, persistiert).
     Der gewählte Name wird automatisch Autor von Einträgen/Réunionen.
     ============================================================ */
  var EXTRA_LS='klassebuch_extra_users';
  function extraUsers(){try{return JSON.parse(localStorage.getItem(EXTRA_LS)||'[]')||[];}catch(e){return [];}}
  function addExtraUser(u){var l=extraUsers();if(l.indexOf(u)<0){l.push(u);try{localStorage.setItem(EXTRA_LS,JSON.stringify(l));}catch(e){}}}
  function allUsers(){var base=(window.KB_ANW&&KB_ANW.users)?KB_ANW.users():[];var seen={},out=[];base.concat(extraUsers()).forEach(function(u){if(u&&!seen[u]){seen[u]=1;out.push(u);}});return out;}
  /* Beim Start ist die Anwesenheits-Engine oft noch nicht geladen, dann liefert
     getUser() leer und die Personenauswahl ginge unnötig erneut auf. Deshalb
     ersatzweise direkt aus dem gespeicherten Zustand lesen. */
  function curUser(){
    var u=(window.KB_ANW&&KB_ANW.getUser&&KB_ANW.getUser())||'';
    if(u)return u;
    try{return (JSON.parse(localStorage.getItem('anwesenheit_v1')||'{}').currentUser)||'';}catch(e){return '';}
  }
  function uIni(n){return (window.KB_ANW&&KB_ANW.initials)?KB_ANW.initials(n):String(n||'?').charAt(0).toUpperCase();}
  function uBg(n){return (window.KB_ANW&&KB_ANW.avatarBg)?KB_ANW.avatarBg(n):'#4f5bd5';}
  var userHooks=[];
  window.KB_USER={get:curUser,list:allUsers,set:function(u){pickUser(u);},onChange:function(fn){if(typeof fn==='function')userHooks.push(fn);}};

  var gate=null;
  function buildGate(){
    gate=document.createElement('div');gate.className='kb-gate';gate.id='kb-gate';
    gate.innerHTML='<div class="kb-gate-card"><div class="kb-gate-logo">📘</div><h2>Wer arbeitet hier?</h2><p>Wähle deinen Namen — er wird bei Einträgen, Réunionen und Notizen automatisch als Autor gespeichert.</p><div class="kb-gate-grid" id="kb-gate-grid"></div><button class="kb-gate-other" id="kb-gate-other">+ Andere Person</button></div>';
    document.body.appendChild(gate);
    gate.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('[data-user]');
      if(t){pickUser(t.getAttribute('data-user'));return;}
      if(e.target.id==='kb-gate-other'){var n=window.prompt('Name der Person:');if(n&&n.trim()){var nm=n.trim();addExtraUser(nm);pickUser(nm);}return;}
    });
  }
  function renderGateGrid(){
    var g=$('kb-gate-grid');if(!g)return;var cur=curUser();
    g.innerHTML=allUsers().map(function(u){return '<button class="kb-gate-user'+(cur===u?' on':'')+'" data-user="'+esc(u)+'"><span class="kb-gate-av" style="background:'+uBg(u)+'">'+esc(uIni(u))+'</span><span>'+esc(u)+'</span></button>';}).join('');
  }
  function openGate(){if(!gate)buildGate();renderGateGrid();gate.classList.add('open');}
  function closeGate(){if(gate)gate.classList.remove('open');}
  function pickUser(u){if(window.KB_ANW&&KB_ANW.setUser){try{KB_ANW.setUser(u);}catch(e){}}closeGate();updateUserChip();for(var i=0;i<userHooks.length;i++){try{userHooks[i](u);}catch(e){}}if(window.render){try{window.render();}catch(e){}}}
  /* Angemeldet im CDSE Hub? Dann gilt diese Person – kein zweites „Wer arbeitet
     hier?“ und kein frei wählbarer Name. Der Hub legt sie beim Anmelden in
     'cdse-nutzer' ab und entfernt sie beim Abmelden. Ohne Hub (Datei einzeln
     geöffnet) bleibt die Personenwahl wie bisher. */
  function hubNutzer(){try{var n=JSON.parse(localStorage.getItem('cdse-nutzer')||'null');return (n&&n.name)?n:null;}catch(e){return null;}}
  function updateUserChip(){var c=$('kb-userchip');if(!c)return;var u=curUser(), hn=hubNutzer();
    if(u){c.innerHTML='<span class="kb-uc-av" style="background:'+uBg(u)+'">'+esc(uIni(u))+'</span><span class="kb-uc-n">'+esc(u)+'</span><span class="kb-uc-x">'+(hn?'Hub':'wechseln')+'</span>';
      c.title=hn?('Angemeldet im CDSE Hub als '+u+' – Person wechseln: im Hub abmelden und neu anmelden'):('Angemeldet als '+u+' — klicken zum Wechseln');}
    else{c.innerHTML='<span class="kb-uc-av">?</span><span class="kb-uc-n">Wer bist du?</span>';c.title='Person wählen';}
  }
  var ucBtn=$('kb-userchip'); if(ucBtn){ucBtn.addEventListener('click',function(){if(hubNutzer()){hubOpen('hub');}else{openGate();}});}
  function hubPersonUebernehmen(){var hn=hubNutzer();if(hn&&curUser()!==hn.name){pickUser(hn.name);}else{updateUserChip();}return !!hn;}
  if(!hubPersonUebernehmen()&&!curUser()){openGate();}
  window.addEventListener('storage',function(e){if(e.key==='cdse-nutzer'){hubPersonUebernehmen();teamZeigen();}});

  /* Team aus dem Hub: Name in der Seitenleiste und im Fenstertitel */
  function teamZeigen(){
    var hn=hubNutzer(), t=hn&&hn.team, name='';
    var liste=(window.CDSE_TEAMS||[]);for(var i=0;i<liste.length;i++){if(liste[i].id===t){name=liste[i].name;break;}}
    var el=$('kb-brand-team');if(el){el.textContent=name||'CDSE';}
    document.title='Klassenbuch · '+(name||'CDSE');
  }
  teamZeigen();

  /* Stundenpläne je Trimester scharfschalten (übernimmt beim ersten Start
     den bestehenden Plan ins laufende Trimester). */
  if(window.KB_BLOCKS){try{window.KB_BLOCKS.init();}catch(e){}}
  if(window.KB_TIMETABLE){try{window.KB_TIMETABLE.init();}catch(e){}}

  // Startseite: die Heute-Tafel (fürs Morning Meeting) – von dort ein Klick ins Klassenbuch
  go('heute');
})();
`;

/* ============================================================
   Zusammenbauen
   ============================================================ */
/* ============================================================
   Helfernetz „Support Bubble" (CDSE) — interaktiv, druck-/herunterladbar
   Zentrum = Kind, 3 Häufigkeits-Ringe (wöchentlich/monatlich/auf Anfrage),
   4 Sektoren (Familie · Schule lokal/regional · Schule national · Externe),
   Beziehungslinien (durchgezogen=direkt, gestrichelt=indirekt),
   Status (bestehend / neu / nicht weitergeführt = X), Diagnostik-Daten.
   ============================================================ */
var BUBBLE_MODULE = `
window.KB_BUBBLE=(function(){
  var LS='klassebuch_bubble_v1';
  function loadAll(){try{var r=localStorage.getItem(LS);if(r){return JSON.parse(r)||{};}}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();
  function get(sid){var r=data[sid];if(!r){r={matrikel:'',dateBegin:'',dateEnd:'',nodes:[],snapshots:[]};}if(!r.nodes){r.nodes=[];}if(!Array.isArray(r.snapshots)){r.snapshots=[];}return r;}
  function set(sid,r){data[sid]=r;saveAll(data);}
  function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return x;}}
  return {
    get:get,
    setMeta:function(sid,f){var r=get(sid);for(var k in f){r[k]=f[k];}set(sid,r);},
    addNode:function(sid,n){var r=get(sid);n.id='bn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);r.nodes.push(n);set(sid,r);return n.id;},
    updateNode:function(sid,id,f){var r=get(sid);r.nodes.forEach(function(n){if(n.id===id){for(var k in f){n[k]=f[k];}}});set(sid,r);},
    removeNode:function(sid,id){var r=get(sid);r.nodes=r.nodes.filter(function(n){return n.id!==id;});set(sid,r);},
    snapshot:function(sid,label){var r=get(sid);var snap={id:'bs_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),date:(function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})(new Date()),label:label||'',matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:clone(r.nodes||[])};r.snapshots=r.snapshots||[];r.snapshots.push(snap);r.snapshots.sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:0);});set(sid,r);return snap.id;},
    snapshots:function(sid){return (get(sid).snapshots||[]).slice();},
    removeSnapshot:function(sid,snapId){var r=get(sid);r.snapshots=(r.snapshots||[]).filter(function(s){return s.id!==snapId;});set(sid,r);},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[],snapshots:r.snapshots||[]});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){data[r.id]={matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[],snapshots:r.snapshots||[]};});saveAll(data);}
  };
})();

(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var AREAS=[['familie','Familie / familiäre Hilfen'],['schule_lokal','Schule: lokal/regional'],['schule_national','Schule: national'],['externe','Externe Akteur:innen']];
  var FREQ=[['woechentlich','wöchentlich'],['monatlich','monatlich'],['anfrage','auf Anfrage']];
  var REL=[['direkt','direkter Kontakt'],['indirekt','indirekter Kontakt']];
  var STAT=[['bestehend','bestehend (zu Beginn)'],['neu','neu hinzugekommen'],['beendet','nicht weitergeführt (X)']];
  var STATCOL={bestehend:'#37414f',neu:'#1d8a52',beendet:'#b3432d'};
  var RAD={woechentlich:150,monatlich:244,anfrage:338};
  var QUAD={familie:{a0:188,a1:262},schule_lokal:{a0:278,a1:352},externe:{a0:98,a1:172},schule_national:{a0:8,a1:82}};
  function label(arr,v){for(var i=0;i<arr.length;i++){if(arr[i][0]===v){return arr[i][1];}}return v;}

  function bubbleSVG(name, rec){
    var W=820,H=975,cx=410,cy=478,childR=64;
    var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="max-width:100%;height:auto" font-family="Inter, Arial, sans-serif">';
    s+='<rect width="'+W+'" height="'+H+'" fill="#ffffff"/>';
    s+='<text x="'+(W/2)+'" y="40" text-anchor="middle" font-size="25" font-weight="800" fill="#1d2433">Support Bubble</text>';
    s+='<text x="40" y="76" font-size="14" fill="#1d2433">Name des Kindes / Jugendlichen: <tspan font-weight="700">'+esc(name||'')+'</tspan></text>';
    s+='<text x="40" y="98" font-size="14" fill="#1d2433">Matrikelnummer: <tspan font-weight="700">'+esc(rec.matrikel||'')+'</tspan></text>';
    var rings=[['anfrage',338,'#f5f7fc'],['monatlich',244,'#eef1f9'],['woechentlich',150,'#e6eaf6']];
    for(var i=0;i<rings.length;i++){s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rings[i][1]+'" fill="'+rings[i][2]+'" stroke="#cdd4e6" stroke-width="1.5"/>';}
    s+='<line x1="'+(cx-338)+'" y1="'+cy+'" x2="'+(cx+338)+'" y2="'+cy+'" stroke="#cdd4e6" stroke-width="1.4"/>';
    s+='<line x1="'+cx+'" y1="'+(cy-338)+'" x2="'+cx+'" y2="'+(cy+338)+'" stroke="#cdd4e6" stroke-width="1.4"/>';
    var rl=[['wöchentlich',150],['monatlich',244],['auf Anfrage',338]];
    for(i=0;i<rl.length;i++){s+='<text x="'+cx+'" y="'+(cy-rl[i][1]+17)+'" text-anchor="middle" font-size="11" font-style="italic" fill="#7a8295" paint-order="stroke" stroke="#ffffff" stroke-width="3">'+rl[i][0]+'</text>';}
    s+='<text x="44" y="150" font-size="13" font-weight="700" fill="#3b46b8">Familie / familiäre Hilfen</text>';
    s+='<text x="'+(W-44)+'" y="150" text-anchor="end" font-size="13" font-weight="700" fill="#3b46b8">Schule: lokal / regional</text>';
    s+='<text x="44" y="'+(cy+356)+'" font-size="13" font-weight="700" fill="#3b46b8">Externe Akteur:innen</text>';
    s+='<text x="'+(W-44)+'" y="'+(cy+356)+'" text-anchor="end" font-size="13" font-weight="700" fill="#3b46b8">Schule: national</text>';
    var groups={};
    (rec.nodes||[]).forEach(function(n){var k=n.area+'|'+n.freq;(groups[k]=groups[k]||[]).push(n);});
    Object.keys(groups).forEach(function(k){
      var p=k.split('|'),q=QUAD[p[0]],r=RAD[p[1]];if(!q||!r){return;}
      var arr=groups[k],nn=arr.length;
      arr.forEach(function(n,idx){
        var t=(idx+1)/(nn+1),ang=(q.a0+t*(q.a1-q.a0))*Math.PI/180;
        var x=cx+r*Math.cos(ang),y=cy+r*Math.sin(ang),sx=cx+childR*Math.cos(ang),sy=cy+childR*Math.sin(ang);
        var col=STATCOL[n.status]||'#37414f',dash=(n.relation==='indirekt')?' stroke-dasharray="6 5"':'';
        s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+col+'" stroke-width="2"'+dash+'/>';
        s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="7" fill="'+col+'"/>';
        if(n.status==='beendet'){var dd=5.5;s+='<line x1="'+(x-dd).toFixed(1)+'" y1="'+(y-dd).toFixed(1)+'" x2="'+(x+dd).toFixed(1)+'" y2="'+(y+dd).toFixed(1)+'" stroke="#fff" stroke-width="2"/><line x1="'+(x-dd).toFixed(1)+'" y1="'+(y+dd).toFixed(1)+'" x2="'+(x+dd).toFixed(1)+'" y2="'+(y-dd).toFixed(1)+'" stroke="#fff" stroke-width="2"/>';}
        var anchor=(Math.cos(ang)>=0)?'start':'end';
        var lx=cx+(r+13)*Math.cos(ang),ly=cy+(r+13)*Math.sin(ang)+(n.note?0:4);
        s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+anchor+'" font-size="12" font-weight="700" fill="#1d2433" paint-order="stroke" stroke="#ffffff" stroke-width="3.5">'+esc(n.name||'')+'</text>';
        if(n.note){var fn=String(n.note);if(fn.length>26){fn=fn.slice(0,25)+'…';}s+='<text x="'+lx.toFixed(1)+'" y="'+(ly+12).toFixed(1)+'" text-anchor="'+anchor+'" font-size="9.5" font-style="italic" fill="#5c6478" paint-order="stroke" stroke="#ffffff" stroke-width="3">'+esc(fn)+'</text>';}
      });
    });
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+childR+'" fill="#4f5bd5"/>';
    s+='<text x="'+cx+'" y="'+(cy-3)+'" text-anchor="middle" font-size="15" font-weight="800" fill="#ffffff">'+esc(name||'Kind')+'</text>';
    s+='<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" font-size="9.5" fill="#dfe3fb">Kind / Jugendliche*r</text>';
    var ly1=cy+374,ly2=ly1+24,ly3=ly2+26;
    s+='<line x1="44" y1="'+ly1+'" x2="86" y2="'+ly1+'" stroke="#37414f" stroke-width="2"/><text x="94" y="'+(ly1+4)+'" font-size="12" fill="#1d2433">direkter Kontakt</text>';
    s+='<line x1="240" y1="'+ly1+'" x2="282" y2="'+ly1+'" stroke="#37414f" stroke-width="2" stroke-dasharray="6 5"/><text x="290" y="'+(ly1+4)+'" font-size="12" fill="#1d2433">indirekter Kontakt</text>';
    s+='<circle cx="50" cy="'+ly2+'" r="6" fill="#37414f"/><text x="62" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">bestehend (zu Beginn)</text>';
    s+='<circle cx="240" cy="'+ly2+'" r="6" fill="#1d8a52"/><text x="252" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">neu hinzugekommen</text>';
    s+='<circle cx="430" cy="'+ly2+'" r="6" fill="#b3432d"/><line x1="446" y1="'+(ly2-4)+'" x2="454" y2="'+(ly2+4)+'" stroke="#b3432d" stroke-width="1.5"/><line x1="454" y1="'+(ly2-4)+'" x2="446" y2="'+(ly2+4)+'" stroke="#b3432d" stroke-width="1.5"/><text x="462" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">nicht weitergeführt (X)</text>';
    s+='<text x="44" y="'+ly3+'" font-size="12" fill="#1d2433">Beginn der spezialisierten Diagnostik: <tspan font-weight="700">'+esc(rec.dateBegin||'—')+'</tspan>     Ende: <tspan font-weight="700">'+esc(rec.dateEnd||'—')+'</tspan></text>';
    s+='<text x="'+(W-44)+'" y="'+(H-14)+'" text-anchor="end" font-size="10" fill="#9aa2b3">CDSE · Annexe Junglinster</text>';
    s+='</svg>';
    return s;
  }
  window.KB_BUBBLE_SVG=bubbleSVG;

  /* Vergleich zweier Bubble-Zustände (Moment A vs. B). Identität per Name
     (normalisiert) — so wird „dieselbe Person" über die Zeit erkannt. */
  function normName(s){return String(s==null?'':s).trim().toLowerCase();}
  function bubbleDiff(a,b){
    a=a||{nodes:[]};b=b||{nodes:[]};
    var am={},bm={};
    (a.nodes||[]).forEach(function(n){if(n&&n.name)am[normName(n.name)]=n;});
    (b.nodes||[]).forEach(function(n){if(n&&n.name)bm[normName(n.name)]=n;});
    var added=[],removed=[],changed=[],same=0;
    Object.keys(bm).forEach(function(k){if(!am[k])added.push(bm[k]);});
    Object.keys(am).forEach(function(k){if(!bm[k])removed.push(am[k]);});
    Object.keys(am).forEach(function(k){if(bm[k]){var x=am[k],y=bm[k],ch=[];
      ['note','area','freq','relation','status'].forEach(function(f){if((x[f]||'')!==(y[f]||'')){ch.push({field:f,from:x[f]||'',to:y[f]||''});}});
      if(ch.length)changed.push({name:y.name,changes:ch});else same++;}});
    return {added:added,removed:removed,changed:changed,same:same,countA:(a.nodes||[]).length,countB:(b.nodes||[]).length};
  }
  window.KB_BUBBLE_DIFF=bubbleDiff;

  function optList(arr,v){return arr.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>';}).join('');}

  window.KB_BUBBLE_RENDER=function(student){
    var rec=window.KB_BUBBLE.get(student.id);
    return '<div class="kb-hub-pad kb-bubble">'+
      '<p class="muted" style="margin-top:0">Helfernetz / „Support Bubble" — das Unterstützungssystem von '+esc(student.name)+' auf einen Blick. Personen/Institutionen hinzufügen, Karte drucken oder herunterladen.</p>'+
      '<div class="kb-bubble-bar">'+
        '<label>Matrikelnummer<input class="kb-in" id="kbb-matrikel" value="'+esc(rec.matrikel||'')+'"></label>'+
        '<label>Beginn Diagnostik<input class="kb-in" id="kbb-begin" type="date" value="'+esc(rec.dateBegin||'')+'"></label>'+
        '<label>Ende Diagnostik<input class="kb-in" id="kbb-end" type="date" value="'+esc(rec.dateEnd||'')+'"></label>'+
      '</div>'+
      '<div class="kb-bubble-cols">'+
        '<div class="kb-bubble-side">'+
          '<div class="kb-card"><h4 id="kbb-form-title" style="margin:0 0 10px">Person / Institution hinzufügen</h4>'+
            '<input class="kb-in" id="kbb-name" placeholder="Name (Person/Institution)" style="margin-bottom:8px">'+
            '<input class="kb-in" id="kbb-note" placeholder="Funktion / Rolle (optional)" style="margin-bottom:8px">'+
            '<div class="kb-bubble-selrow"><label>Bereich<select class="kb-in" id="kbb-area">'+optList(AREAS,'familie')+'</select></label><label>Häufigkeit<select class="kb-in" id="kbb-freq">'+optList(FREQ,'woechentlich')+'</select></label></div>'+
            '<div class="kb-bubble-selrow" style="margin-top:8px"><label>Kontakt<select class="kb-in" id="kbb-rel">'+optList(REL,'direkt')+'</select></label><label>Status<select class="kb-in" id="kbb-status">'+optList(STAT,'bestehend')+'</select></label></div>'+
            '<div style="margin-top:10px;display:flex;gap:8px"><button class="kb-btn kb-btn-primary" id="kbb-add">+ Hinzufügen</button><button class="kb-btn" id="kbb-cancel" style="display:none">Abbrechen</button></div>'+
          '</div>'+
          '<div id="kbb-list"></div>'+
        '</div>'+
        '<div class="kb-bubble-main">'+
          '<div class="kb-bubble-actions"><button class="kb-btn" id="kbb-print">🖨 Drucken</button><button class="kb-btn" id="kbb-svg">⬇ SVG</button><button class="kb-btn" id="kbb-png">⬇ PNG</button></div>'+
          '<div id="kb-bubble-svg" class="kb-bubble-svg"></div>'+
        '</div>'+
      '</div>'+
      '<div class="kb-card kbb-compare">'+
        '<h4 style="margin:0 0 6px">📸 Verlauf &amp; Vergleich</h4>'+
        '<p class="muted" style="font-size:.85em;margin:0 0 10px">Halte den aktuellen Stand als Snapshot fest und vergleiche zwei Zeitpunkte — was kam neu dazu, was fiel weg, was veränderte sich.</p>'+
        '<div class="kbb-snaprow"><input class="kb-in" id="kbb-snap-label" placeholder="Label (z. B. Schuljahresbeginn)"><button class="kb-btn kb-btn-primary" id="kbb-snap">📸 Snapshot speichern</button></div>'+
        '<div id="kbb-snaplist" style="margin-top:8px"></div>'+
        '<div class="kbb-cmp-controls"><label>A · vorher<select class="kb-in" id="kbb-cmp-a"></select></label><span class="kbb-cmp-arrow">→</span><label>B · nachher<select class="kb-in" id="kbb-cmp-b"></select></label></div>'+
        '<div id="kbb-cmp-body" class="kbb-cmp-body"></div>'+
      '</div>'+
    '</div>';
  };

  function dl(blob,fn){var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},800);}
  function safe(n){return String(n||'Kind').replace(/[^\\wäöüÄÖÜ-]+/g,'_');}

  window.KB_BUBBLE_WIRE=function(root, student){
    var sid=student.id, editing=null;
    function q(s){return root.querySelector(s);}
    function rec(){return window.KB_BUBBLE.get(sid);}
    function redraw(){var c=q('#kb-bubble-svg');if(c){c.innerHTML=bubbleSVG(student.name, rec());}var ca=q('#kbb-cmp-a');if(ca&&ca.options.length&&q('#kbb-cmp-body')){renderCompare();}}
    function list(){
      var el=q('#kbb-list');if(!el){return;}var ns=rec().nodes||[];
      if(!ns.length){el.innerHTML='<div class="kb-card" style="color:var(--kb-muted)">Noch keine Personen/Institutionen erfasst.</div>';return;}
      el.innerHTML='<div class="kb-card" style="padding:4px 0">'+ns.map(function(n){
        return '<div class="kb-bnode" data-id="'+esc(n.id)+'"><span class="kb-bdot" style="background:'+(STATCOL[n.status]||'#37414f')+'"></span><div class="kb-bnode-main"><div class="kb-bnode-name">'+esc(n.name)+(n.note?' <span class="kb-bnode-note">· '+esc(n.note)+'</span>':'')+'</div><div class="kb-bnode-meta">'+esc(label(AREAS,n.area))+' · '+esc(label(FREQ,n.freq))+' · '+esc(label(REL,n.relation))+(n.status!=='bestehend'?' · '+esc(label(STAT,n.status)):'')+'</div></div><button class="kb-btn kb-btn-ghost kbb-edit" title="Bearbeiten">✎</button><button class="kb-btn kb-btn-ghost kbb-del" title="Löschen">🗑</button></div>';
      }).join('')+'</div>';
    }
    function readForm(){return {name:(q('#kbb-name').value||'').trim(),note:(q('#kbb-note').value||'').trim(),area:q('#kbb-area').value,freq:q('#kbb-freq').value,relation:q('#kbb-rel').value,status:q('#kbb-status').value};}
    function reset(){editing=null;q('#kbb-name').value='';q('#kbb-note').value='';q('#kbb-add').textContent='+ Hinzufügen';q('#kbb-cancel').style.display='none';q('#kbb-form-title').textContent='Person / Institution hinzufügen';}
    q('#kbb-matrikel').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{matrikel:e.target.value});redraw();});
    q('#kbb-begin').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{dateBegin:e.target.value});redraw();});
    q('#kbb-end').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{dateEnd:e.target.value});redraw();});
    q('#kbb-add').addEventListener('click',function(){var d=readForm();if(!d.name){q('#kbb-name').focus();return;}if(editing){window.KB_BUBBLE.updateNode(sid,editing,d);}else{window.KB_BUBBLE.addNode(sid,d);}reset();list();redraw();});
    q('#kbb-cancel').addEventListener('click',reset);
    q('#kbb-list').addEventListener('click',function(ev){
      var row=ev.target.closest('.kb-bnode');if(!row){return;}var id=row.getAttribute('data-id');
      if(ev.target.closest('.kbb-del')){if(confirm('Eintrag löschen?')){window.KB_BUBBLE.removeNode(sid,id);if(editing===id){reset();}list();redraw();}}
      else if(ev.target.closest('.kbb-edit')){var n=null;rec().nodes.forEach(function(x){if(x.id===id){n=x;}});if(n){editing=id;q('#kbb-name').value=n.name||'';q('#kbb-note').value=n.note||'';q('#kbb-area').value=n.area;q('#kbb-freq').value=n.freq;q('#kbb-rel').value=n.relation;q('#kbb-status').value=n.status;q('#kbb-add').textContent='Speichern';q('#kbb-cancel').style.display='';q('#kbb-form-title').textContent='Eintrag bearbeiten';q('#kbb-name').focus();}}
    });
    q('#kbb-print').addEventListener('click',function(){
      var w=window.open('','_blank');if(!w){alert('Bitte Pop-ups erlauben oder SVG/PNG herunterladen.');return;}
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Support Bubble — '+esc(student.name)+'</title><style>@page{size:A4 portrait;margin:8mm}body{margin:0}svg{width:100%;height:auto}</style></head><body>'+bubbleSVG(student.name, rec())+'</body></html>');
      w.document.close();w.focus();setTimeout(function(){try{w.print();}catch(e){}},350);
    });
    q('#kbb-svg').addEventListener('click',function(){dl(new Blob([bubbleSVG(student.name, rec())],{type:'image/svg+xml;charset=utf-8'}),'Support-Bubble-'+safe(student.name)+'.svg');});
    q('#kbb-png').addEventListener('click',function(){
      try{
        var svg=bubbleSVG(student.name, rec());var url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));var img=new Image();
        img.onload=function(){var sc=2,c=document.createElement('canvas');c.width=820*sc;c.height=975*sc;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);try{c.toBlob(function(b){if(b){dl(b,'Support-Bubble-'+safe(student.name)+'.png');}else{alert('PNG nicht möglich — bitte SVG verwenden.');}});}catch(e){alert('PNG nicht möglich — bitte SVG verwenden.');}};
        img.onerror=function(){URL.revokeObjectURL(url);alert('PNG nicht möglich — bitte SVG verwenden.');};
        img.src=url;
      }catch(e){alert('PNG nicht möglich — bitte SVG verwenden.');}
    });
    /* ---- Snapshots & Moment-Vergleich ---- */
    function snaps(){return window.KB_BUBBLE.snapshots(sid);}
    function cmpOptions(){var o=[{key:'live',label:'Aktuell'}];snaps().forEach(function(s){o.push({key:s.id,label:(s.date||'')+(s.label?(' · '+s.label):'')});});return o;}
    function stateFor(key){if(key==='live')return rec();var ss=snaps();for(var i=0;i<ss.length;i++){if(ss[i].id===key)return ss[i];}return rec();}
    function fieldLabel(f){return ({note:'Funktion',area:'Bereich',freq:'Häufigkeit',relation:'Kontakt',status:'Status'})[f]||f;}
    function valLabel(f,v){if(f==='area')return label(AREAS,v);if(f==='freq')return label(FREQ,v);if(f==='relation')return label(REL,v);if(f==='status')return label(STAT,v);return v;}
    function snaplistRender(){
      var el=q('#kbb-snaplist');if(!el){return;}var ss=snaps();
      if(!ss.length){el.innerHTML='<div class="muted" style="font-size:.85em">Noch keine Snapshots — speichere den aktuellen Stand, um später zu vergleichen.</div>';return;}
      el.innerHTML=ss.map(function(s){return '<div class="kbb-snapitem" data-id="'+esc(s.id)+'"><span>📸 '+esc(s.date||'')+(s.label?(' · '+esc(s.label)):'')+' <span class="muted">('+((s.nodes||[]).length)+' Personen)</span></span><button class="kb-btn kb-btn-ghost kbb-snapdel" title="Snapshot löschen">🗑</button></div>';}).join('');
    }
    function fillSelects(){
      var a=q('#kbb-cmp-a'),b=q('#kbb-cmp-b');if(!a||!b){return;}
      var opts=cmpOptions();var snapKeys=opts.filter(function(o){return o.key!=='live';});
      var defA=snapKeys.length?snapKeys[0].key:'live',defB='live';
      var pa=a.value,pb=b.value;var has=function(k){return opts.some(function(o){return o.key===k;});};
      function html(sel){return opts.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===sel?' selected':'')+'>'+esc(o.label)+'</option>';}).join('');}
      a.innerHTML=html(has(pa)?pa:defA);b.innerHTML=html(has(pb)?pb:defB);
    }
    function diffGrp(title,arr,cls,fmt){if(!arr.length){return '';}return '<div class="kbb-diff-grp kbb-diff-'+cls+'"><div class="kbb-diff-h">'+esc(title)+' ('+arr.length+')</div><ul>'+arr.map(fmt).join('')+'</ul></div>';}
    function renderCompare(){
      var body=q('#kbb-cmp-body');if(!body){return;}
      var a=q('#kbb-cmp-a'),b=q('#kbb-cmp-b');var ka=a?a.value:'live',kb=b?b.value:'live';
      var sa=stateFor(ka),sb=stateFor(kb);var d=window.KB_BUBBLE_DIFF(sa,sb);
      var ta=a?a.options[a.selectedIndex].text:'',tb=b?b.options[b.selectedIndex].text:'';
      var bubbles='<div class="kbb-cmp-grid">'+
        '<div class="kbb-cmp-col"><div class="kbb-cmp-title">A · '+esc(ta)+' <span class="muted">('+d.countA+')</span></div>'+bubbleSVG(student.name,{matrikel:sa.matrikel,dateBegin:sa.dateBegin,dateEnd:sa.dateEnd,nodes:sa.nodes||[]})+'</div>'+
        '<div class="kbb-cmp-col"><div class="kbb-cmp-title">B · '+esc(tb)+' <span class="muted">('+d.countB+')</span></div>'+bubbleSVG(student.name,{matrikel:sb.matrikel,dateBegin:sb.dateBegin,dateEnd:sb.dateEnd,nodes:sb.nodes||[]})+'</div>'+
      '</div>';
      var fa=function(n){return '<li><strong>'+esc(n.name)+'</strong>'+(n.note?(' — '+esc(n.note)):'')+' <span class="muted">('+esc(label(AREAS,n.area))+', '+esc(label(FREQ,n.freq))+')</span></li>';};
      var fc=function(c){return '<li><strong>'+esc(c.name)+'</strong>: '+c.changes.map(function(ch){return esc(fieldLabel(ch.field))+' „'+esc(valLabel(ch.field,ch.from)||'—')+'" → „'+esc(valLabel(ch.field,ch.to)||'—')+'"';}).join('; ')+'</li>';};
      var none=(!d.added.length&&!d.removed.length&&!d.changed.length);
      var diff='<div class="kbb-diff">'+
        diffGrp('Neu hinzugekommen',d.added,'add',fa)+
        diffGrp('Weggefallen',d.removed,'rem',fa)+
        diffGrp('Verändert',d.changed,'chg',fc)+
        (none?'<div class="muted" style="font-size:.9em">Keine Unterschiede zwischen A und B'+(d.same?(' ('+d.same+' Personen unverändert)'):'')+'.</div>':'<div class="muted" style="font-size:.82em;margin-top:8px">'+d.same+' Personen unverändert.</div>')+
      '</div>';
      body.innerHTML=bubbles+diff;
    }
    var snapBtn=q('#kbb-snap');if(snapBtn){snapBtn.addEventListener('click',function(){var lab=((q('#kbb-snap-label')||{}).value||'').trim();window.KB_BUBBLE.snapshot(sid,lab);if(q('#kbb-snap-label'))q('#kbb-snap-label').value='';snaplistRender();fillSelects();renderCompare();});}
    var snapL=q('#kbb-snaplist');if(snapL){snapL.addEventListener('click',function(ev){var it=ev.target.closest('.kbb-snapitem');if(!it){return;}if(ev.target.closest('.kbb-snapdel')){if(confirm('Snapshot löschen?')){window.KB_BUBBLE.removeSnapshot(sid,it.getAttribute('data-id'));snaplistRender();fillSelects();renderCompare();}}});}
    if(q('#kbb-cmp-a'))q('#kbb-cmp-a').addEventListener('change',renderCompare);
    if(q('#kbb-cmp-b'))q('#kbb-cmp-b').addEventListener('change',renderCompare);
    snaplistRender();fillSelects();
    redraw();list();renderCompare();
  };
})();
`;

/* ============================================================
   KB_SYNC — gemeinsame Datei auf O:\ (File System Access API)
   Zusammenführung PRO EINTRAG (kein Überschreiben bei mehreren
   Schreibenden). Reine Merge-/Diff-Funktionen sind testbar (_test).
   ============================================================ */
var SYNC_MODULE = `
window.KB_SYNC=(function(){
  var FMT='klassebuch-shared-v1';
  /* ACHTUNG: Jede Sammlung, die collGet() liefert, MUSS hier stehen. Fehlt sie,
     landet sie nie in der gemeinsamen Datei — und collSet() würde sie beim
     Anwenden mit einer leeren Liste überschreiben (= Datenverlust). */
  var COLLS=['roster','dosEntries','dosReunions','anwEntries','anwNotes','anwSettings','bubble','screening','noten','terms','timetables','blocks'];
  var BASE_LS='klassebuch_sync_base';
  /* Welche App schreibt die Datei? Klassenbuch und Journal nutzen dasselbe
     Format; eine fremde Datei wird abgelehnt statt vermischt (Fehler H2). */
  var APP='klassenbuch', FREMD_COLLS=['pei','goals','years','agenda','tasks'];
  /* Tiefe Kopie: Basis und Live-Daten dürfen sich nie Objekte teilen, sonst
     sieht der Vergleich Änderungen „an Ort und Stelle“ nicht (Fehler K4). */
  function kopie(o){return o==null?o:JSON.parse(JSON.stringify(o));}
  var DBNAME='klassebuch-sync';
  function fsSupported(){return (typeof window!=='undefined')&&('showOpenFilePicker' in window)&&('showSaveFilePicker' in window);}

  function eqPayload(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  /* Je Datensatz gewinnt der jüngere Zeitstempel. Bei Gleichstand entscheidet
     der Inhalt – auf allen Geräten gleich, damit die Datei nicht zwischen zwei
     Fassungen hin- und herpendelt (früher gewann immer die eigene Fassung). */
  function gewinnt(a,b){var ta=a._ts||0,tb=b._ts||0;if(ta!==tb){return ta>tb;}var sa=JSON.stringify(a),sb=JSON.stringify(b);return sa>=sb;}
  function mergeColl(remote,local){
    var by={},i,r,ex;
    for(i=0;i<(remote||[]).length;i++){r=remote[i];by[r.id]=r;}
    for(i=0;i<(local||[]).length;i++){r=local[i];ex=by[r.id];if(!ex||gewinnt(r,ex)){by[r.id]=r;}}
    var out=[];for(var k in by){out.push(by[k]);}return out;
  }
  function diffColl(base,live,now){
    var baseBy={},liveBy={},i,out=[];
    for(i=0;i<(base||[]).length;i++){baseBy[base[i].id]=base[i];}
    for(i=0;i<(live||[]).length;i++){liveBy[live[i].id]=live[i];}
    for(i=0;i<(live||[]).length;i++){var p=live[i];var b=baseBy[p.id];if(!b||b._del||!eqPayload(b.d,p)){out.push({id:p.id,_ts:now,d:p});}}
    for(i=0;i<(base||[]).length;i++){var bb=base[i];if(!bb._del&&!liveBy[bb.id]){out.push({id:bb.id,_ts:now,_del:true});}}
    return out;
  }
  function liveOf(coll){var out=[];for(var i=0;i<(coll||[]).length;i++){if(!coll[i]._del){out.push(coll[i].d);}}return out;}
  function emptyDoc(){var d={_format:FMT,_app:APP,colls:{}};for(var i=0;i<COLLS.length;i++){d.colls[COLLS[i]]=[];}return d;}
  function buildLocalDoc(base,live,now){var ld=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var bc=(base&&base.colls&&base.colls[n])||[];ld.colls[n]=mergeColl(bc,diffColl(bc,live[n]||[],now));}return ld;}
  /* Sammlungen, die diese Version nicht kennt (neuere App-Stände), unverändert durchreichen */
  function fremdeBehalten(nb,remote){if(remote&&remote.colls){for(var k in remote.colls){if(COLLS.indexOf(k)<0&&Array.isArray(remote.colls[k])){nb.colls[k]=remote.colls[k];}}}return nb;}
  function mergeDocs(remote,localDoc){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];nb.colls[n]=mergeColl(rc,localDoc.colls[n]);}return fremdeBehalten(nb,remote);}
  function firstReconcile(live,remote,now){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];var rby={};for(var j=0;j<rc.length;j++){rby[rc[j].id]=true;}var add=[];var lv=live[n]||[];for(j=0;j<lv.length;j++){if(!rby[lv[j].id]){add.push({id:lv[j].id,_ts:now,d:lv[j]});}}nb.colls[n]=mergeColl(rc,add);}return fremdeBehalten(nb,remote);}
  function normColl(c){return (c||[]).slice().sort(function(a,b){return a.id<b.id?-1:(a.id>b.id?1:0);}).map(function(r){return r.id+'|'+(r._ts||0)+'|'+(r._del?1:0)+'|'+JSON.stringify(r.d||null);}).join(';');}
  function sameDoc(a,b){if(!a||!b)return false;for(var i=0;i<COLLS.length;i++){if(normColl(a.colls[COLLS[i]])!==normColl(b.colls[COLLS[i]]))return false;}return true;}
  function summarize(doc){var keys=['roster','dosEntries','dosReunions','anwEntries','anwNotes','bubble'];var c={};for(var j=0;j<keys.length;j++){var coll=(doc&&doc.colls&&doc.colls[keys[j]])||[];var n=0;for(var i=0;i<coll.length;i++){if(!coll[i]._del)n++;}c[keys[j]]=n;}return c;}

  function collGet(){
    function c(o,m){return (o&&o[m])?o[m]():[];}
    var st=(window.KB_ANW&&window.KB_ANW.exportSettings)?[window.KB_ANW.exportSettings()]:[];
    return {roster:c(window.KB_ROSTER,'syncExport'),bubble:c(window.KB_BUBBLE,'syncExport'),dosEntries:c(window.KB_DOS_SYNC,'exportEntries'),dosReunions:c(window.KB_DOS_SYNC,'exportReunions'),anwEntries:c(window.KB_ANW,'exportEntries'),anwNotes:c(window.KB_ANW,'exportNotes'),anwSettings:st,screening:c(window.KB_SCREENING,'syncExport'),noten:c(window.KB_NOTEN,'syncExport'),terms:c(window.KB_TERMS,'syncExport'),timetables:c(window.KB_TIMETABLE,'syncExport'),blocks:c(window.KB_BLOCKS,'syncExport')};
  }
  function collSet(doc){
    function s(o,m,v){if(o&&o[m]){try{o[m](v);}catch(e){}}}
    /* Sicherheitsnetz: Fehlt eine Sammlung im Dokument (ältere Team-Datei,
       oder die Sammlung steht nicht in COLLS), wird sie NICHT angewendet.
       Sonst käme syncApply([]) an und würde lokale Daten löschen. */
    function sc(o,m,coll){if(!coll)return;s(o,m,kopie(liveOf(coll)));}
    sc(window.KB_ROSTER,'syncApply',doc.colls.roster);
    sc(window.KB_DOS_SYNC,'applyEntries',doc.colls.dosEntries);
    sc(window.KB_DOS_SYNC,'applyReunions',doc.colls.dosReunions);
    sc(window.KB_ANW,'applyEntries',doc.colls.anwEntries);
    sc(window.KB_ANW,'applyNotes',doc.colls.anwNotes);
    if(doc.colls.anwSettings){var se=kopie(liveOf(doc.colls.anwSettings));s(window.KB_ANW,'applySettings',se[0]||null);}
    sc(window.KB_BUBBLE,'syncApply',doc.colls.bubble);
    sc(window.KB_SCREENING,'syncApply',doc.colls.screening);
    sc(window.KB_NOTEN,'syncApply',doc.colls.noten);
    sc(window.KB_TERMS,'syncApply',doc.colls.terms);
    sc(window.KB_TIMETABLE,'syncApply',doc.colls.timetables);
    sc(window.KB_BLOCKS,'syncApply',doc.colls.blocks);
  }

  var base=null,busy=false,applying=false,timer=null,fileHandle=null;
  var status={connected:false,supported:fsSupported(),fileName:'',lastSync:0,lastBy:'',error:'',pending:false,backupName:'',backupLast:'',backupErr:''};
  var statusCb=null;
  function setStatus(p){for(var k in p){status[k]=p[k];}if(statusCb){try{statusCb(status);}catch(e){}}try{warnBar();}catch(e){}}
  function loadBase(){try{var r=localStorage.getItem(BASE_LS);if(r)return JSON.parse(r);}catch(e){}return null;}
  function saveBase(b){try{localStorage.setItem(BASE_LS,JSON.stringify(b));}catch(e){}}
  function operator(){try{return localStorage.getItem('anwesenheit_user')||'';}catch(e){return '';}}

  function idb(){return new Promise(function(res,rej){var r=indexedDB.open(DBNAME,1);r.onupgradeneeded=function(){r.result.createObjectStore('h');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
  function idbSet(h,key){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction('h','readwrite');tx.objectStore('h').put(h,key||'handle');tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});});}
  function idbGet(key){return idb().then(function(db){return new Promise(function(res){var tx=db.transaction('h','readonly');var rq=tx.objectStore('h').get(key||'handle');rq.onsuccess=function(){res(rq.result||null);};rq.onerror=function(){res(null);};});}).catch(function(){return null;});}
  function idbDel(key){return idb().then(function(db){return new Promise(function(res){var tx=db.transaction('h','readwrite');tx.objectStore('h').delete(key||'handle');tx.oncomplete=function(){res();};tx.onerror=function(){res();};});}).catch(function(){});}
  function verifyPermission(h,req){var o={mode:'readwrite'};return h.queryPermission(o).then(function(p){if(p==='granted')return true;if(req)return h.requestPermission(o).then(function(p2){return p2==='granted';});return false;});}

  function readFile(){
    if(!fileHandle)return Promise.resolve(undefined);
    return fileHandle.getFile().then(function(f){return f.text();}).then(function(txt){
      if(!txt||!txt.trim())return null;
      var d;try{d=JSON.parse(txt);}catch(e){return 'INVALID';}
      if(!d||d._format!==FMT||!d.colls)return 'INVALID';
      if((d._app&&d._app!==APP)||(!d._app&&FREMD_COLLS.some(function(k){return !!d.colls[k];}))){return 'FREMD';}
      return d;
    });
  }
  function writeFile(doc){if(!fileHandle)return Promise.resolve();doc._savedAt=Date.now();doc._savedBy=operator();var json=JSON.stringify(doc);return fileHandle.createWritable().then(function(w){return w.write(json).then(function(){return w.close();});});}

  // --- Tägliche Auto-Sicherung: datierte Kopie in einen Ordner auf O: ---
  var backupDir=null,backupBusy=false,BK_DAY='klassebuch_backup_lastday';
  function bkLastDay(){try{return localStorage.getItem(BK_DAY)||'';}catch(e){return '';}}
  function bkSetDay(d){try{localStorage.setItem(BK_DAY,d);}catch(e){}}
  function todayStr(){var d=new Date();function p(n){return (n<10?'0':'')+n;}return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
  function isBackupName(n){return !!n&&n.length===26&&n.indexOf('klassebuch-')===0&&n.slice(-5)==='.json'&&n.charAt(15)==='-'&&n.charAt(18)==='-';}
  function listDirFiles(dir){var it=dir.values();var names=[];function step(){return it.next().then(function(r){if(r.done)return names;var v=r.value;if(v&&v.kind==='file'&&v.name)names.push(v.name);return step();});}return step();}
  function planPrune(names,keep){var mine=(names||[]).filter(isBackupName).sort();return mine.slice(0,Math.max(0,mine.length-keep));}
  function pruneBackups(){if(!backupDir)return Promise.resolve();return listDirFiles(backupDir).then(function(names){var del=planPrune(names,30);var p=Promise.resolve();for(var i=0;i<del.length;i++){(function(n){p=p.then(function(){return backupDir.removeEntry(n).catch(function(){});});})(del[i]);}return p;}).catch(function(){});}
  /* Die Tageskopie sichert den Stand, der GERADE NOCH in der gemeinsamen Datei
     steht - nicht das Ergebnis des Abgleichs. Sonst waere die Kopie im
     Schadensfall genauso leer wie das Original. */
  function writeBackup(doc){
    var q=doc||base;
    if(!backupDir||!q)return Promise.resolve();
    var name='klassebuch-'+todayStr()+'.json';var snap={};for(var k in q){snap[k]=q[k];}
    snap._backupAt=Date.now();snap._backupBy=operator();
    var json=JSON.stringify(snap);
    return backupDir.getFileHandle(name,{create:true}).then(function(fh){return fh.createWritable();}).then(function(w){return w.write(json).then(function(){return w.close();});}).then(function(){return pruneBackups();});
  }
  function maybeBackup(doc){
    var q=doc||base;
    if(!backupDir||backupBusy||!q)return Promise.resolve();
    var today=todayStr();if(bkLastDay()===today)return Promise.resolve();
    backupBusy=true;
    return verifyPermission(backupDir,false).then(function(ok){
      if(!ok){backupBusy=false;return;}
      return writeBackup(q).then(function(){bkSetDay(today);setStatus({backupLast:today,backupErr:''});});
    }).then(function(){backupBusy=false;}).catch(function(e){backupBusy=false;setStatus({backupErr:'Backup-Fehler: '+((e&&e.message)||e)});});
  }

  /* ---- Schicht 1: nicht abgleichen, bevor alles geladen ist ----
     Das Dossier liegt in der Browser-Datenbank und antwortet die ersten
     Millisekunden mit "nichts". Ohne diese Sperre haelt der Abgleich das fuer
     "alles geloescht" und traegt Loeschmarken in die gemeinsame Datei ein -
     auf allen Geraeten. */
  function quellenBereit(){
    var f=[];
    try{if(window.KB_DOS_SYNC&&window.KB_DOS_SYNC.ready&&!window.KB_DOS_SYNC.ready())f.push('Dossier');}catch(e){}
    try{if(window.KB_ANW&&window.KB_ANW.ready&&!window.KB_ANW.ready())f.push('Klassenbuch');}catch(e){}
    return f;
  }

  /* ---- Schicht 2: Bremse gegen Massenloeschung ----
     Ein Abgleich, der auf einen Schlag viel loescht, ist fast nie Absicht.
     Dann wird NICHTS geschrieben, sondern gefragt. */
  var WIPE_ABS=8;        // ab so vielen Loeschungen wird hingeschaut
  var WIPE_ANTEIL=0.34;  // ... und ab diesem Anteil einer Sammlung gebremst
  var wipeOk=false;      // hat jemand "Trotzdem" gesagt?
  function neueLoeschungen(ld,now){
    var out=[],ges=0;
    for(var i=0;i<COLLS.length;i++){
      var n=COLLS[i],c=ld.colls[n]||[],del=0;
      for(var j=0;j<c.length;j++){if(c[j]._del&&(c[j]._ts||0)>=now)del++;}
      if(!del)continue;
      var vorher=0,bc=(base&&base.colls&&base.colls[n])||[];
      for(j=0;j<bc.length;j++){if(!bc[j]._del)vorher++;}
      ges+=del;
      out.push({coll:n,del:del,vorher:vorher,anteil:vorher?del/vorher:1});
    }
    return {ges:ges,teile:out};
  }
  function verdaechtig(w){
    if(wipeOk)return false;
    if(w.ges<WIPE_ABS)return false;
    for(var i=0;i<w.teile.length;i++){var t=w.teile[i];if(t.anteil>=WIPE_ANTEIL)return true;}
    return false;
  }
  var NAMEN={roster:'Schüler',dosEntries:'Dossier-Einträge',dosReunions:'Réunionen',
    anwEntries:'Absenzen',anwNotes:'Klassenbuch-Notizen',noten:'Noten',screening:'Screenings',
    bubble:'Helfernetz',terms:'Schuljahre',timetables:'Stundenpläne',blocks:'Stundenraster',anwSettings:'Einstellungen'};
  function wipeBar(w){
    var el=document.getElementById('kb-wipewarn');
    if(el&&el.parentNode)el.parentNode.removeChild(el);
    el=document.createElement('div');el.id='kb-wipewarn';el.setAttribute('role','alert');
    el.style.cssText='position:fixed;left:0;right:0;top:0;z-index:10000;background:#8E1B12;color:#fff;'+
      'font:600 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:11px 16px;'+
      'display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 2px 14px rgba(0,0,0,.35);';
    var was=w.teile.filter(function(t){return t.del;}).map(function(t){
      return t.del+' '+(NAMEN[t.coll]||t.coll);
    }).join(', ');
    var t=document.createElement('span');
    t.textContent='⛔ Der Abgleich würde ' + was + ' löschen. Das sieht nach einem Fehler aus — es wurde nichts in die Team-Datei geschrieben.';
    el.appendChild(t);
    function knopf(txt,fn,stark){
      var b=document.createElement('button');b.textContent=txt;
      b.style.cssText='border:1px solid rgba(255,255,255,.75);background:'+(stark?'#fff':'transparent')+';color:'+(stark?'#8E1B12':'#fff')+';'+
        'border-radius:8px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;';
      b.onclick=fn;el.appendChild(b);
    }
    knopf('Nicht löschen — Seite neu laden',function(){location.reload();},true);
    knopf('Trotzdem löschen',function(){
      if(!confirm('Wirklich? ' + was + ' werden dann auf ALLEN Geräten gelöscht.'))return;
      wipeOk=true;el.parentNode&&el.parentNode.removeChild(el);cycle();
    });
    (document.body||document.documentElement).appendChild(el);
  }

  function cycle(){
    if(!fileHandle||busy||applying)return Promise.resolve();
    var fehlt=quellenBereit();
    if(fehlt.length){setStatus({pending:false,error:'',warten:fehlt.join(', ')});return Promise.resolve();}
    if(status.warten)setStatus({warten:''});
    busy=true;setStatus({pending:true});
    var now=Date.now();var live=kopie(collGet());
    return readFile().then(function(remote){
      if(remote==='INVALID'){setStatus({error:'Gemeinsame Datei nicht lesbar — Sync pausiert (lokale Daten bleiben unveraendert).',pending:false});busy=false;return;}
      if(remote==='FREMD'){setStatus({error:'Diese Team-Datei gehört zum Journal, nicht zum Klassenbuch — bitte die Datei des Klassenbuchs wählen. Nichts wurde verändert.',pending:false});busy=false;return;}
      var nb,apply;
      if(!base){nb=firstReconcile(live,remote||null,now);apply=true;}
      else{
        var ld=buildLocalDoc(base,live,now);
        var w=neueLoeschungen(ld,now);
        if(verdaechtig(w)){
          setStatus({pending:false,error:'Abgleich angehalten: würde ungewöhnlich viel löschen.'});
          busy=false;try{wipeBar(w);}catch(e){}
          return;
        }
        nb=mergeDocs(remote||null,ld);apply=!sameDoc(nb,ld);
      }
      if(apply){applying=true;try{collSet(nb);}catch(e){}applying=false;}
      /* Schicht 3: die Tageskopie entsteht VOR dem ersten Schreiben, also vom
         Stand, der noch in der Datei steht - nicht hinterher vom Ergebnis. */
      var changed=!remote||!sameDoc(nb,remote);
      var vorher=changed?maybeBackup(remote||base):Promise.resolve();
      base=nb;saveBase(nb);
      return vorher.then(function(){
        return changed?writeFile(nb):Promise.resolve();
      }).then(function(){
        setStatus({error:'',lastSync:Date.now(),lastBy:(remote&&remote._savedBy)||status.lastBy,pending:false,counts:summarize(base)});
        busy=false;
      });
    }).catch(function(e){setStatus({error:'Sync-Fehler: '+((e&&e.message)||e),pending:false});busy=false;});
  }
  function start(){stop();timer=setInterval(cycle,5000);cycle();}
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function afterPick(h){return verifyPermission(h,true).then(function(ok){if(!ok){setStatus({error:'Kein Zugriff auf die Datei erteilt.'});return;}fileHandle=h;base=loadBase();setAuto(true);return idbSet(h).then(function(){setStatus({connected:true,fileName:h.name||'gemeinsame Datei',error:''});start();});});}

  /* ---- Von selbst verbinden ----
     Der Griff auf die Datei liegt dauerhaft in der Datenbank des Browsers.
     Die ERLAUBNIS dazu setzt der Browser beim naechsten Oeffnen aber oft
     wieder auf "fragen" zurueck, und fragen darf man nur als Antwort auf
     einen Klick. Also: beim ersten Klick irgendwo einmal fragen - das ist
     meist der Klick auf den eigenen Namen - statt jedes Mal von Hand in die
     Einstellungen zu gehen. Wird abgelehnt, bleibt der Balken stehen und
     nichts fragt ungefragt nach. */
  var AUTO_KEY='kb_sync_auto';
  var autoArmed=false,autoTried=false;
  function autoOn(){try{return localStorage.getItem(AUTO_KEY)!=='0';}catch(e){return true;}}
  function setAuto(v){try{localStorage.setItem(AUTO_KEY,v?'1':'0');}catch(e){}}
  function armAuto(h){
    if(autoArmed||!h||!autoOn())return;autoArmed=true;
    var go=function(){
      document.removeEventListener('pointerdown',go,true);
      document.removeEventListener('keydown',go,true);
      if(autoTried||fileHandle)return;autoTried=true;
      verifyPermission(h,true).then(function(ok){
        if(ok){fileHandle=h;base=loadBase();setStatus({connected:true,fileName:h.name||'gemeinsame Datei',error:''});start();}
        else{setStatus({connected:false,fileName:h.name||'gemeinsame Datei',error:'reconnect'});}
      }).catch(function(){});
    };
    document.addEventListener('pointerdown',go,true);
    document.addEventListener('keydown',go,true);
  }

  /* Solange eine bekannte Team-Datei NICHT verbunden ist, steht das oben -
     sonst merkt es waehrend einer Réunion niemand. */
  function warnBar(){
    var zeig=!!(status&&status.error==='reconnect'&&!status.connected);
    var el=document.getElementById('kb-syncwarn');
    if(!zeig){if(el&&el.parentNode)el.parentNode.removeChild(el);return;}
    if(!el){
      el=document.createElement('div');el.id='kb-syncwarn';el.setAttribute('role','alert');
      el.style.cssText='position:fixed;left:0;right:0;top:0;z-index:9998;background:#E8A317;color:#3a2a00;'+
        'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 14px;'+
        'display:flex;gap:12px;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.2);';
      var t=document.createElement('span');
      t.textContent='Team-Datei ist nicht verbunden — Eingaben bleiben vorerst nur auf diesem Gerät.';
      el.appendChild(t);
      var b=document.createElement('button');
      b.textContent='Jetzt verbinden';
      b.style.cssText='border:1px solid rgba(0,0,0,.4);background:#fff;color:#3a2a00;border-radius:8px;'+
        'padding:3px 12px;font:inherit;font-size:13px;cursor:pointer;';
      b.onclick=function(){idbGet().then(function(h){if(h){autoTried=false;afterPick(h);}});};
      el.appendChild(b);
      (document.body||document.documentElement).appendChild(el);
    }
  }

  return {
    supported:fsSupported,
    getStatus:function(){return status;},
    onStatus:function(cb){statusCb=cb;try{cb(status);}catch(e){}},
    connectNew:function(){if(!fsSupported()){setStatus({error:'Nur in Chrome/Edge moeglich.'});return;}window.showSaveFilePicker({suggestedName:'klassebuch-team.json',types:[{description:'Klassebuch-Daten',accept:{'application/json':['.json']}}]}).then(afterPick).catch(function(e){if(e&&e.name!=='AbortError')setStatus({error:String((e&&e.message)||e)});});},
    connectExisting:function(){if(!fsSupported()){setStatus({error:'Nur in Chrome/Edge moeglich.'});return;}window.showOpenFilePicker({multiple:false,types:[{description:'Klassebuch-Daten',accept:{'application/json':['.json']}}]}).then(function(a){return afterPick(a[0]);}).catch(function(e){if(e&&e.name!=='AbortError')setStatus({error:String((e&&e.message)||e)});});},
    chooseBackupDir:function(){if(!fsSupported()||!('showDirectoryPicker' in window)){setStatus({backupErr:'Nur in Chrome/Edge moeglich.'});return;}window.showDirectoryPicker({mode:'readwrite'}).then(function(d){return verifyPermission(d,true).then(function(ok){if(!ok){setStatus({backupErr:'Kein Zugriff auf den Ordner erteilt.'});return;}backupDir=d;bkSetDay('');return idbSet(d,'backupdir').then(function(){setStatus({backupName:d.name||'Backup-Ordner',backupLast:'',backupErr:''});maybeBackup();});});}).catch(function(e){if(e&&e.name!=='AbortError')setStatus({backupErr:String((e&&e.message)||e)});});},
    regrantBackupDir:function(){idbGet('backupdir').then(function(d){if(!d)return;return verifyPermission(d,true).then(function(ok){if(ok){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupErr:''});maybeBackup();}else{setStatus({backupErr:'Kein Zugriff auf den Ordner erteilt.'});}});});},
    clearBackupDir:function(){backupDir=null;idbDel('backupdir');setStatus({backupName:'',backupLast:'',backupErr:''});},
    disconnect:function(){stop();fileHandle=null;idbDel();setStatus({connected:false,fileName:'',error:''});},
    syncNow:function(){return cycle();},
    reconnect:function(){idbGet().then(function(h){if(h)return afterPick(h);}).then(function(){return idbGet('backupdir');}).then(function(d){if(!d)return;return verifyPermission(d,true).then(function(ok){if(ok){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupErr:''});maybeBackup();}});});},
    autoOn:autoOn,
    setAuto:function(v){setAuto(v);if(v&&!fileHandle)idbGet().then(function(h){if(h)armAuto(h);});},
    init:function(){if(!fsSupported())return;idbGet().then(function(h){if(!h)return;h.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){fileHandle=h;base=loadBase();setStatus({connected:true,fileName:h.name||'gemeinsame Datei'});start();}else{setStatus({connected:false,fileName:h.name||'gemeinsame Datei',error:'reconnect'});armAuto(h);}});});idbGet('backupdir').then(function(d){if(!d)return;d.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay()});}else{setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay(),backupErr:'reconnect'});}});});},
    _test:{mergeColl:mergeColl,diffColl:diffColl,buildLocalDoc:buildLocalDoc,mergeDocs:mergeDocs,firstReconcile:firstReconcile,liveOf:liveOf,sameDoc:sameDoc,emptyDoc:emptyDoc,COLLS:COLLS,isBackupName:isBackupName,planPrune:planPrune,todayStr:todayStr,writeBackup:writeBackup,pruneBackups:pruneBackups,maybeBackup:maybeBackup,setBackupDir:function(d){backupDir=d;},setBase:function(b){base=b;},lastDay:bkLastDay,resetDay:function(){bkSetDay('');}}
  };
})();
`;

/* ============================================================
   KB_SCREENING — nur noch zum Nachlesen. Das Screening ist in den CDSE Hub
   umgezogen (Schüler → Dossier → Screening: Beobachtungsbogen ohne
   Verdachtsdiagnosen). Frühere Angaben bleiben hier lesbar und werden über
   die Team-Datei unverändert weitergereicht (Sammlung „screening“), bis der
   Hub sie ins Dossier übernommen hat. Die Texte zu den Kürzeln stehen in
   kb-screening-texte.js (neben dieser Datei, nur bei Bedarf geladen).
   ============================================================ */
var SCREENING_MODULE = `
window.KB_SCREENING=(function(){
  var LS='klassebuch_screening_v1';
  var AKUT={'16.1':'Suizidale Gedanken berichtet','16.2':'Konkreter Suizidplan oder Vorbereitungs-Handlungen','16.3':'Selbstverletzendes Verhalten'};
  function loadAll(){try{var r=localStorage.getItem(LS);if(r){return JSON.parse(r)||{};}}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();
  function kopie(o){return JSON.parse(JSON.stringify(o));}
  function get(sid){var r=data[sid]||{};return kopie({symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:Array.isArray(r.history)?r.history:[],updatedAt:r.updatedAt||''});}
  function hat(sid){var r=data[sid];return !!(r&&((r.symptome&&r.symptome.length)||(r.history&&r.history.length)));}
  function acuteFlags(sid){return (get(sid).symptome||[]).filter(function(id){return AKUT[id];}).map(function(id){return {id:id,label:AKUT[id]};});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function datum(i){var m=/^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(i||''));return m?(m[3]+'.'+m[2]+'.'+m[1]):'';}
  var texteLaden=null;
  function texte(){
    if(window.CDSE_KB_TEXTE){return Promise.resolve(window.CDSE_KB_TEXTE);}
    if(!texteLaden){texteLaden=new Promise(function(res){var s=document.createElement('script');s.src='kb-screening-texte.js';s.onload=function(){res(window.CDSE_KB_TEXTE||null);};s.onerror=function(){res(null);};document.head.appendChild(s);});}
    return texteLaden;
  }
  /* Frühere Angaben lesbar darstellen: Beobachtungen nach Bereich, Vertiefung, Dauer/Umfeld */
  function fuellen(root){
    var el=root&&root.querySelector('#kb-scr-alt');if(!el){return;}
    var sid=el.getAttribute('data-sid'), d=get(sid);
    texte().then(function(X){
      if(!document.body.contains(el)){return;}
      var gruppen={}, folge=[], vert=[], fragen=[];
      d.symptome.forEach(function(id){var t=X&&X.symptome[id], k=t?(X.kategorien[t[0]]||'Beobachtungen'):'Beobachtungen';if(!gruppen[k]){gruppen[k]=[];folge.push(k);}gruppen[k].push(t?t[1]:('Aussage '+id));});
      Object.keys(d.plans||{}).forEach(function(th){var p=d.plans[th]||{}, T=X&&X.themen[th];
        (p.symptome||[]).forEach(function(id){var t=T&&T.sym[id], x=t?t[1]:('Aussage '+id);if(vert.indexOf(x)<0){vert.push(x);}});
        Object.keys(p.kontext||{}).forEach(function(f){var q=T&&T.fragen[f], v=p.kontext[f];fragen.push([q?q[0]:f,q&&q[1][v]!=null?q[1][v]:v]);});
      });
      Object.keys(d.demografie||{}).forEach(function(f){var v=d.demografie[f], q=null;if(X){Object.keys(X.themen).some(function(k){var x=X.themen[k].fragen[f];if(x&&x[1][v]!=null){q=x;return true;}return false;});}fragen.unshift([q?q[0]:f,q?q[1][v]:v]);});
      ((X&&X.gate)||[]).forEach(function(g){var v=(d.gate||{})[g.key];if(v){fragen.unshift([g.titel,g.optionen[v]!=null?g.optionen[v]:v]);}});
      var gesehen={};fragen=fragen.filter(function(q){var k=q[0]+'|'+q[1];if(gesehen[k]){return false;}gesehen[k]=1;return true;});
      var h='<h4>Frühere Beobachtungen</h4><p class="kb-scr-sub">'+(d.updatedAt?'Stand '+datum(d.updatedAt)+' · ':'')+'Ja/Nein-Liste des alten Screenings. Die frühere automatische Auswertung wird nicht mehr angezeigt.'+(X?'':' (Die Texte zu den Kürzeln fehlen: kb-screening-texte.js liegt nicht neben dieser Datei.)')+'</p>';
      h+='<div class="kb-scr-grid">'+folge.map(function(k){return '<div><h5>'+esc(k)+'</h5><ul>'+gruppen[k].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';}).join('')+
        (vert.length?'<div><h5>Weitere Beobachtungen (Vertiefung)</h5><ul>'+vert.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>':'')+'</div>';
      if(fragen.length){h+='<dl class="kb-scr-dl">'+fragen.map(function(q){return '<dt>'+esc(q[0])+'</dt><dd>'+esc(q[1])+'</dd>';}).join('')+'</dl>';}
      el.innerHTML=h;
    });
  }
  return {
    get:get, hasData:hat, acuteFlags:acuteFlags, fuellen:fuellen,
    history:function(sid){return get(sid).history;},
    result:function(sid){var d=get(sid);return {hasData:hat(sid),acute:acuteFlags(sid),risiken:[],globalCount:d.symptome.length,updatedAt:d.updatedAt,nurLesen:true};},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''});}return kopie(out);},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){if(r&&r.id){data[r.id]=kopie({symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''});}});saveAll(data);}
  };
})();
`;

/* ============================================================
   Isa-Toolbox-Integration: Materialdaten, Taxonomie, Modul, ISA-App
   ============================================================ */
/* Materialvorschläge kommen aus dem Verzeichnis der Hub-Toolbox (toolbox-index.js
   neben dieser Datei); geöffnet wird die Toolbox im Hub. */
var TAXONOMY_JSON = read('taxonomy.json');
var MATERIALS_MODULE = read('materials-module.js');

function scriptSafe(s) { return String(s).replace(/<\/(script)/gi, '<\\/$1'); }

function jsonForScript(s) { return String(s).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029'); }

var MATERIAL_CSS = `
/* === Material-Tab (ISA-App eingebettet) === */
/* Aktives Panel füllt die (position:relative, min-height:100vh) Stage komplett,
   damit das absolut positionierte iframe eine echte Höhe bekommt. */

/* === Arbeitsblatt-Buttons im Hub === */
.hub-list li .hub-mat{ order:3; margin-left:auto; align-self:center; white-space:nowrap; border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:7px; padding:2px 9px; font-size:12.5px; font-weight:600; cursor:pointer; line-height:1.5; color:var(--kb-accent,#4f5bd5); }
.hub-list li .hub-mat:hover{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.hub-list li .hub-gtext{ flex:1; min-width:0; }
.hub-list li .hub-gcode{ order:0; flex:0 0 auto; align-self:flex-start; margin-top:1px; font-size:11px; font-weight:800; color:#fff; border-radius:5px; padding:2px 7px; white-space:nowrap; letter-spacing:.01em; }
.hub-list li .hub-gelbl{ font-weight:800; color:var(--kb-ink,#23243a); }
.hub-theme-wrap{ display:flex; flex-wrap:wrap; gap:7px; }
.hub-theme-chip{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:999px; padding:5px 11px; font-size:13px; cursor:pointer; font-weight:600; color:var(--kb-ink,#23243a); }
.hub-theme-chip:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.hub-theme-chip .ht-n{ font-size:11px; opacity:.6; }
.hub-theme-chip.sev-3{ border-color:#e3b7ac; } .hub-theme-chip.sev-2{ border-color:#e8d3a8; }

/* === Material-Such-Modal (KB-nativ) === */
.kbm-ov{ position:fixed; inset:0; background:rgba(20,22,40,.55); backdrop-filter:blur(3px); z-index:9000; display:none; align-items:flex-start; justify-content:center; padding:32px 16px; overflow:auto; }
.kbm-ov.open{ display:flex; }
.kbm-modal{ background:var(--kb-bg,#f6f7fb); width:100%; max-width:860px; border-radius:18px; box-shadow:0 24px 70px rgba(0,0,0,.3); overflow:hidden; display:flex; flex-direction:column; max-height:calc(100vh - 64px); }
.kbm-head{ display:flex; align-items:flex-start; gap:12px; padding:18px 22px 14px; background:var(--kb-surface,#fff); border-bottom:1px solid var(--kb-border,#ececf3); }
.kbm-head-t{ font-size:17px; font-weight:800; line-height:1.35; flex:1; color:var(--kb-ink,#23243a); }
.kbm-goalcode{ color:#fff; border-radius:6px; padding:1px 8px; font-size:13px; font-weight:800; margin-right:4px; }
.kbm-x{ border:0; background:transparent; font-size:26px; line-height:1; cursor:pointer; color:var(--kb-muted,#777); padding:0 2px; }
.kbm-cyc{ padding:0 22px; background:var(--kb-surface,#fff); }
.kbm-cyc:empty{ display:none; }
.kbm-cyc-note{ font-size:13px; color:var(--kb-muted,#666); padding:10px 0 6px; }
.kbm-chips{ display:flex; flex-wrap:wrap; gap:7px; padding-bottom:14px; }
.kbm-chip{ border:1px solid var(--kb-border,#dcdce6); background:var(--kb-bg,#f3f4fa); border-radius:999px; padding:5px 13px; font-size:13px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
.kbm-chip.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.kbm-body{ padding:16px 22px 22px; overflow:auto; }
.kbm-count{ font-size:13px; color:var(--kb-muted,#666); font-weight:600; margin-bottom:12px; }
.kbm-empty{ padding:26px; text-align:center; color:var(--kb-muted,#888); }
.kbm-list{ display:flex; flex-direction:column; gap:12px; }
.kbm-card{ background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:13px; padding:14px 16px; }
.kbm-card-h{ display:flex; align-items:flex-start; gap:10px; }
.kbm-card-h h4{ margin:0; font-size:15.5px; flex:1; color:var(--kb-ink,#23243a); }
.kbm-ages{ display:flex; flex-wrap:wrap; gap:4px; }
.kbm-age{ background:#eef0fb; color:#4a4f86; border-radius:5px; padding:1px 6px; font-size:11px; font-weight:800; }
.kbm-age-warn{ background:#fbe7d8; color:#b3611f; }
.kbm-meta{ font-size:12px; color:var(--kb-muted,#888); margin:7px 0; }
.kbm-desc{ font-size:13.5px; color:var(--kb-ink,#33344c); margin:6px 0 9px; line-height:1.5; }
.kbm-desc-full{ font-size:14px; color:var(--kb-ink,#33344c); margin:12px 0; line-height:1.6; }
.kbm-tags{ display:flex; flex-wrap:wrap; gap:5px; }
.kbm-tag{ background:var(--kb-bg,#f0f1f8); color:#5a5f7e; border-radius:999px; padding:2px 9px; font-size:11.5px; font-weight:600; }
.kbm-acts{ margin-top:11px; display:flex; gap:8px; flex-wrap:wrap; }
.kbm-btn{ border:1px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); border-radius:9px; padding:8px 14px; font-size:13.5px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
.kbm-btn:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.kbm-btn-p{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.kbm-btn-p:hover{ filter:brightness(1.06); color:#fff; }
.kbm-more{ margin-top:12px; font-size:12.5px; color:var(--kb-muted,#888); text-align:center; }
.kbm-divider{ margin:20px 0 12px; font-size:12px; font-weight:800; letter-spacing:.02em; text-transform:uppercase; color:var(--kb-muted,#8a8fa6); border-top:1px dashed var(--kb-border,#dcdce6); padding-top:14px; }
.kbm-foot{ margin-top:18px; padding-top:14px; border-top:1px solid var(--kb-border,#ececf3); text-align:center; }
.kbm-detail .kbm-d-back{ display:flex; justify-content:space-between; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.kbm-section{ margin-top:18px; }
.kbm-section h4{ margin:0 0 8px; font-size:14.5px; color:var(--kb-ink,#23243a); border-bottom:1px solid var(--kb-border,#ececf3); padding-bottom:5px; }
.kbm-phase{ margin-bottom:12px; } .kbm-phase h5{ margin:0 0 3px; font-size:13.5px; color:var(--kb-accent,#4f5bd5); }
.kbm-phase p{ margin:0; font-size:13.5px; line-height:1.55; color:var(--kb-ink,#33344c); }
.kbm-info{ font-size:12.5px; color:var(--kb-muted,#666); display:flex; flex-direction:column; gap:2px; margin:10px 0; }
.kbm-goals{ display:flex; flex-wrap:wrap; gap:6px; }
.kbm-goalmini{ border:1px solid; border-radius:6px; padding:2px 8px; font-size:11.5px; font-weight:700; background:#fff; }
.kbm-ws{ background:var(--kb-surface,#fff); border:1px dashed var(--kb-border,#d6d7e3); border-radius:12px; padding:16px 18px; }
.kbm-ws-title{ font-weight:800; margin-bottom:6px; } .kbm-ws-intro{ color:var(--kb-muted,#666); margin-bottom:12px; font-size:13px; }
.kbm-ws-h{ font-size:14px; font-weight:800; margin:16px 0 6px; border-bottom:1px solid var(--kb-border,#e6e6ef); padding-bottom:3px; }
.kbm-ws-ins{ font-style:italic; color:var(--kb-muted,#555); margin:6px 0; font-size:13px; }
.kbm-ws-qp{ font-weight:700; margin:10px 0 5px; font-size:13.5px; }
.kbm-ws-line{ border-bottom:1px solid #b9bacb; height:21px; margin:6px 0; }
.kbm-ws-box{ border:1px solid #b9bacb; border-radius:7px; margin:8px 0; padding:6px; }
.kbm-ws-check{ list-style:none; padding:0; margin:6px 0; } .kbm-ws-check li{ margin:7px 0; font-size:13.5px; }
.kbm-ws-tick{ display:inline-block; width:13px; height:13px; border:1.6px solid #888; border-radius:3px; margin-right:9px; vertical-align:middle; }
.kbm-ws-scale .kbm-ws-sc{ display:inline-block; margin-right:16px; font-size:13px; }
.kbm-ws-tab{ border-collapse:collapse; width:100%; margin:8px 0; } .kbm-ws-tab th,.kbm-ws-tab td{ border:1px solid #b9bacb; padding:7px 9px; text-align:left; font-size:13px; } .kbm-ws-tab td{ height:25px; }
@media(max-width:560px){ .kbm-modal{ max-height:calc(100vh - 32px);} .kbm-ov{ padding:16px 8px; } }

/* === Identität: „Wer arbeitet hier?"-Gate + Sidebar-Chip === */
.kb-gate{ position:fixed; inset:0; z-index:11000; background:linear-gradient(135deg,#3b3f8f,#5a3f9e); display:none; align-items:center; justify-content:center; padding:24px; }
.kb-gate.open{ display:flex; }
.kb-gate-card{ background:var(--kb-surface,#fff); border-radius:22px; max-width:560px; width:100%; padding:32px 30px; box-shadow:0 30px 80px rgba(0,0,0,.4); text-align:center; }
.kb-gate-logo{ font-size:40px; }
.kb-gate-card h2{ margin:8px 0 4px; font-size:22px; color:var(--kb-ink,#23243a); }
.kb-gate-card p{ margin:0 0 20px; color:var(--kb-muted,#666); font-size:14px; }
.kb-gate-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; }
.kb-gate-user{ display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 8px; border:1px solid var(--kb-border,#e6e6ef); border-radius:14px; background:var(--kb-bg,#f6f7fb); cursor:pointer; font-weight:700; font-size:14px; color:var(--kb-ink,#23243a); transition:transform .08s ease,border-color .12s ease; }
.kb-gate-user:hover{ border-color:var(--kb-accent,#4f5bd5); transform:translateY(-1px); }
.kb-gate-user.on{ border-color:var(--kb-accent,#4f5bd5); box-shadow:0 0 0 2px var(--kb-accent,#4f5bd5) inset; }
.kb-gate-av{ width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; font-weight:800; }
.kb-gate-other{ margin-top:18px; border:1px dashed var(--kb-border,#cfd0de); background:transparent; border-radius:10px; padding:9px 16px; font-size:13.5px; font-weight:600; cursor:pointer; color:var(--kb-muted,#666); }
.kb-gate-other:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.kb-userchip{ display:flex; align-items:center; gap:8px; width:100%; margin:2px 0 10px; padding:8px 10px; border:1px solid var(--kb-border,#e6e6ef); border-radius:12px; background:var(--kb-bg,#f3f4fa); cursor:pointer; font:inherit; text-align:left; }
.kb-userchip:hover{ border-color:var(--kb-accent,#4f5bd5); }
.kb-uc-av{ width:30px; height:30px; border-radius:50%; background:#4f5bd5; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12.5px; flex:0 0 auto; }
.kb-uc-n{ font-weight:700; font-size:13.5px; color:var(--kb-ink,#23243a); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kb-uc-x{ font-size:11px; color:var(--kb-muted,#8a8fa6); font-weight:600; }
/* Autor-Kennzeichnung in Réunion/Verlauf */
.reunion-author,.hub-author{ font-size:12px; font-weight:700; color:var(--kb-accent,#4f5bd5); background:rgba(79,91,213,.09); border-radius:999px; padding:1px 9px; white-space:nowrap; }
.tl-author{ font-size:11.5px; color:var(--kb-muted,#8a8fa6); font-weight:600; }
@media(max-width:720px){ .kb-gate-card{ padding:24px 18px; } }

/* === Noten & Module (Schüler-Hub) === */
#dos-root .note-top{ display:flex; justify-content:flex-end; }
#dos-root .note-mode{ display:inline-flex; align-items:center; gap:8px; }
#dos-root .note-mode-lbl{ font-size:12.5px; color:var(--kb-muted,#777); font-weight:600; }
#dos-root .note-mode-btn{ border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:999px; padding:4px 13px; font-size:13px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
#dos-root .note-mode-btn.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
#dos-root .note-pertabs{ display:flex; gap:8px; flex-wrap:wrap; margin:14px 0 4px; }
#dos-root .note-pertab{ text-decoration:none; border:1px solid var(--kb-border,#e2e3ee); border-radius:10px; padding:7px 15px; font-size:14px; font-weight:700; color:var(--kb-ink,#23243a); background:var(--kb-surface,#fff); }
#dos-root .note-pertab.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
#dos-root .note-hint{ font-size:12.5px; margin:6px 0 14px; }
#dos-root .note-card{ background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:14px; padding:4px 16px; margin-bottom:10px; transition:box-shadow .12s ease,border-color .12s ease; }
#dos-root .note-card.is-open{ padding:14px 16px; box-shadow:0 6px 22px rgba(0,0,0,.07); border-color:var(--kb-border,#e2e3ee); }
#dos-root .note-card-na{ background:var(--kb-bg,#f7f7fb); }
#dos-root .note-card-head{ display:flex; align-items:center; gap:10px; cursor:pointer; text-decoration:none; color:inherit; padding:10px 0; }
#dos-root .note-card.is-open .note-card-head{ padding-bottom:6px; }
#dos-root .note-card-head:hover h4{ color:var(--kb-accent,#4f5bd5); }
#dos-root .note-card-head h4{ margin:0; font-size:16px; flex:1; color:var(--kb-ink,#23243a); }
#dos-root .note-caret{ font-size:11px; color:var(--kb-muted,#9a9ab0); width:12px; flex:0 0 auto; }
#dos-root .note-modbadge{ font-size:12px; font-weight:700; color:var(--kb-accent,#4f5bd5); background:rgba(79,91,213,.09); border-radius:999px; padding:2px 9px; white-space:nowrap; }
#dos-root .note-cnt{ font-size:11px; font-weight:800; color:var(--kb-muted,#888); background:var(--kb-bg,#eef0f6); border-radius:999px; padding:1px 8px; }
#dos-root .note-card-body{ margin-top:4px; padding-bottom:6px; }
#dos-root .note-na-tag{ font-size:10.5px; font-weight:700; color:var(--kb-muted,#999); background:var(--kb-border,#ececf3); border-radius:999px; padding:1px 8px; vertical-align:middle; }
#dos-root .note-avg{ font-size:13px; font-weight:700; color:var(--kb-muted,#777); white-space:nowrap; }
#dos-root .note-60{ display:inline-flex; align-items:baseline; gap:1px; font-weight:800; border-radius:7px; padding:2px 9px; font-size:15px; }
#dos-root .note-60 small{ font-size:10px; font-weight:700; opacity:.7; }
#dos-root .note-60.note-ok{ background:#e3f3ea; color:#1d7a48; }
#dos-root .note-60.note-low{ background:#fbe4e0; color:#b3432d; }
/* Modul-Tracker */
#dos-root .mod-track{ margin:10px 0 12px; padding:10px 12px; background:var(--kb-bg,#f4f5fb); border-radius:11px; }
#dos-root .mod-status{ font-size:13px; color:var(--kb-ink,#33344c); }
#dos-root .mod-chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
#dos-root .mod-chip{ width:34px; height:34px; border-radius:9px; border:1.5px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); font-weight:800; font-size:13.5px; cursor:pointer; color:var(--kb-muted,#9a9ab0); transition:.1s; }
#dos-root .mod-chip.mod-done{ background:#2e9e5b; border-color:#2e9e5b; color:#fff; }
#dos-root .mod-chip.mod-current{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); box-shadow:0 0 0 2px rgba(79,91,213,.18); }
#dos-root .mod-chip:hover{ transform:translateY(-1px); }
#dos-root .mod-more{ width:34px; height:34px; border-radius:9px; border:1.5px dashed var(--kb-border,#cfd0de); background:transparent; font-weight:800; cursor:pointer; color:var(--kb-muted,#9a9ab0); }
/* Noten-Zeilen + Eingabe */
#dos-root .note-rows{ margin:6px 0 4px; display:flex; flex-direction:column; gap:5px; }
#dos-root .note-row{ display:flex; align-items:center; gap:10px; padding:6px 4px; border-bottom:1px solid var(--kb-border,#f0f0f6); }
#dos-root .note-row-lbl{ flex:1; font-size:13.5px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#dos-root .note-raw{ font-size:13px; color:var(--kb-muted,#666); font-variant-numeric:tabular-nums; }
#dos-root .note-arrow{ color:var(--kb-muted,#bbb); }
#dos-root .note-del{ border:0; background:transparent; cursor:pointer; opacity:.5; font-size:13px; }
#dos-root .note-del:hover{ opacity:1; }
#dos-root .note-add{ display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:10px; }
#dos-root .note-in{ border:1px solid var(--kb-border,#dcdce6); border-radius:8px; padding:7px 10px; font:inherit; font-size:13.5px; }
#dos-root .note-in-lbl{ flex:1; min-width:120px; }
#dos-root .note-in-num{ width:78px; }
#dos-root .note-of{ font-size:13px; color:var(--kb-muted,#777); }
#dos-root .note-foot{ display:flex; flex-wrap:wrap; gap:10px 22px; margin-top:8px; padding:14px 16px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:13px; }
#dos-root .note-foot-item{ font-size:14px; font-weight:700; color:var(--kb-ink,#23243a); display:flex; align-items:center; gap:8px; }
`;


/* Noten & Module pro Schüler/Fach. Noten auf /60 (LU), automatische
   Umrechnung „erreicht von X" -> /60; Module-Fortschritt je Schulfach. */
/* ============================================================
   Heute-Tafel (Morning Meeting): wer fehlt, offene Entschuldigungen,
   Fehlzeiten im Trimester, Einträge für heute, offene Wochenziele.
   Liest nur – geschrieben wird im Klassenbuch und in der Réunion.
   ============================================================ */
var HEUTE_MODULE = `
window.KB_HEUTE=(function(){
  var OFFEN_TAGE=3, SCHWELLE=10, ROT=20;   /* Entschuldigung offen seit … Tagen; Fehlzeit ab … % bzw. … % */
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function tag(isoStr){var p=isoStr.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function datum(i){var m=/^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(i||''));return m?(m[3]+'.'+m[2]+'.'):'';}
  function A(){return window.KB_ANW||null;}
  function kinder(){return (window.KB_ROSTER?window.KB_ROSTER.list():[]).filter(function(s){return s.active!==false;});}
  /* Schultage (Mo–Fr ohne Ferien und Feiertage) zwischen zwei Daten, beide eingeschlossen */
  function schultage(von,bis){var a=A(),n=0,d=tag(von),e=tag(bis);if(d>e){return 0;}
    for(;d<=e;d.setDate(d.getDate()+1)){var w=d.getDay();if(w===0||w===6){continue;}if(a&&a.holidayInfo&&a.holidayInfo(iso(d))){continue;}n++;}return n;}
  function karte(titel,inhalt,extra){return '<div class="kb-card kb-heute-karte'+(extra?' '+extra:'')+'"><h3>'+titel+'</h3>'+inhalt+'</div>';}
  function render(el){
    if(!el){return;}
    var a=A(), heute=iso(new Date()), frei=a&&a.holidayInfo?a.holidayInfo(heute):null, wt=new Date().getDay();
    if(!a||!a.exportEntries){el.innerHTML='<p>Das Klassenbuch lädt …</p>';return;}
    var ks=kinder(), idx={};ks.forEach(function(k){idx[k.id]=k;});
    var alle=a.exportEntries().filter(function(e){return idx[e.studentId];});
    var titel=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var h='<div class="kb-pagehead"><h2>☀️ Heute</h2><p class="kb-heute-datum">'+esc(titel)+(window.KB_TERMS?' · '+esc(window.KB_TERMS.label()):'')+'</p></div>';
    if(frei||wt===0||wt===6){h+='<div class="kb-heute-frei">'+(frei?esc(frei.name)+' – heute ist schulfrei.':'Wochenende – heute ist schulfrei.')+'</div>';}
    if(!ks.length){el.innerHTML=h+karte('Noch keine Klasse','<p class="kb-hint">Unter „Klasse &amp; Stundenplan“ die Schülerliste anlegen – oder die Kinder über die Team-Datei übernehmen.</p><button class="kb-btn" data-kb-nav-go="klasse">Klasse anlegen</button>');return;}
    /* 1) Anwesenheit heute */
    var heuteE=alle.filter(function(e){return e.date===heute;}), jeKind={};
    heuteE.forEach(function(e){(jeKind[e.studentId]=jeKind[e.studentId]||[]).push(e);});
    var fehlend=Object.keys(jeKind).map(function(sid){
      var l=jeKind[sid], u=0,en=0,v=0,min=0;l.forEach(function(e){var hh=a.hoursOf?a.hoursOf(e):0;if(e.status==='unentschuldigt'){u+=hh||0;}else if(e.status==='entschuldigt'){en+=hh||0;}else if(e.status==='verspaetet'){v++;min+=(+e.lateMin||0);}});
      var t=[];if(u){t.push(u+' Std. unentschuldigt');}if(en){t.push(en+' Std. entschuldigt');}if(v){t.push('verspätet'+(min?' ('+min+' Min.)':''));}
      if(!t.length){t.push(l.length+(l.length===1?' Eintrag':' Einträge'));}
      return {k:idx[sid],t:t.join(' · '),rot:u>0};
    }).sort(function(x,y){return x.k.name.localeCompare(y.k.name,'de');});
    h+='<div class="kb-heute-raster">';
    h+=karte('Anwesenheit heute',(fehlend.length?'<ul class="kb-heute-liste">'+fehlend.map(function(f){return '<li><button class="kb-heute-kind" data-heute-kind="'+esc(f.k.id)+'">'+esc(f.k.name)+'</button><span class="kb-heute-chip'+(f.rot?' rot':'')+'">'+esc(f.t)+'</span></li>';}).join('')+'</ul>':'<p class="kb-hint">Noch keine Absenz für heute eingetragen.</p>')+
      '<p class="kb-heute-fuss">'+(ks.length-fehlend.length)+' von '+ks.length+' ohne Eintrag · <button class="kb-link-btn" data-kb-nav-go="absenzen">Im Klassenbuch eintragen</button></p>');
    /* 2) Offene Entschuldigungen */
    var grenze=new Date();grenze.setDate(grenze.getDate()-OFFEN_TAGE);var g=iso(grenze), offen={};
    alle.filter(function(e){return e.status==='unentschuldigt'&&e.date<=g;}).forEach(function(e){var o=offen[e.studentId]||(offen[e.studentId]={n:0,std:0,erst:e.date});o.n++;o.std+=(a.hoursOf?a.hoursOf(e):0)||0;if(e.date<o.erst){o.erst=e.date;}});
    var ol=Object.keys(offen).map(function(sid){return {k:idx[sid],o:offen[sid]};}).sort(function(x,y){return x.o.erst.localeCompare(y.o.erst);});
    h+=karte('Entschuldigung offen',(ol.length?'<ul class="kb-heute-liste">'+ol.map(function(x){return '<li><button class="kb-heute-kind" data-heute-kind="'+esc(x.k.id)+'">'+esc(x.k.name)+'</button><span class="kb-heute-chip gelb">'+(x.o.std?x.o.std+' Std.':x.o.n+(x.o.n===1?' Eintrag':' Einträge'))+' seit '+esc(datum(x.o.erst))+'</span></li>';}).join('')+'</ul><p class="kb-heute-fuss">Unentschuldigt und älter als '+OFFEN_TAGE+' Tage: Eltern kontaktieren oder im Klassenbuch als entschuldigt markieren.</p>':'<p class="kb-hint">Keine offenen Entschuldigungen.</p>'));
    /* 3) Fehlzeiten im laufenden Trimester */
    var r=window.KB_TERMS?window.KB_TERMS.dateRange():null, fz=[];
    if(r&&r.from){
      var bis=heute<r.to?heute:r.to, tage=schultage(r.from,bis), moeglich=tage*(a.dayHours?a.dayHours():7);
      if(moeglich>0){
        var std={};alle.filter(function(e){return e.date>=r.from&&e.date<=bis&&(e.status==='unentschuldigt'||e.status==='entschuldigt');}).forEach(function(e){var x=std[e.studentId]||(std[e.studentId]={u:0,e:0});x[e.status==='unentschuldigt'?'u':'e']+=(a.hoursOf?a.hoursOf(e):0)||0;});
        fz=Object.keys(std).map(function(sid){var x=std[sid], p=Math.round((x.u+x.e)/moeglich*100);return {k:idx[sid],x:x,p:p};}).filter(function(y){return y.p>=SCHWELLE;}).sort(function(x,y){return y.p-x.p;});
        h+=karte('Fehlzeiten im Trimester',(fz.length?'<ul class="kb-heute-liste">'+fz.map(function(y){return '<li><button class="kb-heute-kind" data-heute-kind="'+esc(y.k.id)+'">'+esc(y.k.name)+'</button><span class="kb-heute-chip'+(y.p>=ROT?' rot':' gelb')+'">'+y.p+' % · '+(y.x.u+y.x.e)+' Std. ('+y.x.u+' unentsch.)</span></li>';}).join('')+'</ul><p class="kb-heute-fuss">Ab '+SCHWELLE+' % der Schulstunden seit Trimesterbeginn ('+tage+' Schultage): im Team besprechen, mit den Eltern reden – bevor es ein Signalement braucht.</p>':'<p class="kb-hint">Niemand fehlt in diesem Trimester '+SCHWELLE+' % oder mehr ('+tage+' Schultage bisher).</p>'));
      }
    }
    /* 4) Für heute eingetragen: Prüfungen, Hausaufgaben, Bemerkungen */
    var TYP={pruefung:'📝 Prüfung',hausaufgabe:'📒 Hausaufgabe',bemerkung:'💬 Bemerkung',allgemein:'📌 Allgemein'};
    var no=(a.notes?a.notes():[]).filter(function(n){return n.date===heute;});
    h+=karte('Für heute eingetragen',(no.length?'<ul class="kb-heute-liste">'+no.map(function(n){return '<li><span class="kb-heute-typ">'+(TYP[n.type]||'📌')+'</span><span>'+(n.subject?'<b>'+esc(n.subject)+':</b> ':'')+esc(n.text||'')+(n.studentId&&idx[n.studentId]?' <small>(nur '+esc(idx[n.studentId].name)+')</small>':(n.level?' <small>('+esc(n.level)+')</small>':''))+'</span></li>';}).join('')+'</ul>':'<p class="kb-hint">Für heute ist nichts eingetragen.</p>'));
    /* 5) Offene Wochenziele aus der letzten Réunion */
    var reus=(window.Repo&&Repo.listReunions?Repo.listReunions():[]).filter(function(x){return x.date<=heute;}).sort(function(x,y){return y.date.localeCompare(x.date);}), letzte=reus[0], wz=[];
    if(letzte&&letzte.goals&&window.kbZiele){Object.keys(letzte.goals).forEach(function(sid){if(sid!=='group'&&!idx[sid]){return;}var z=window.kbZiele(letzte.goals[sid]).filter(function(x){return !x.done;});if(z.length){wz.push({name:sid==='group'?'Gruppe':idx[sid].name,z:z});}});}
    h+=karte('Offene Wochenziele',(wz.length?'<p class="kb-heute-fuss">aus der Réunion vom '+esc(datum(letzte.date))+'</p><ul class="kb-heute-liste ziele">'+wz.map(function(w){return '<li><b>'+esc(w.name)+'</b><span>'+w.z.map(function(x){return esc(x.text);}).join(' · ')+'</span></li>';}).join('')+'</ul>':'<p class="kb-hint">'+(letzte?'Alle Wochenziele der letzten Réunion sind erledigt.':'Noch keine Réunion.')+'</p>')+
      '<p class="kb-heute-fuss"><button class="kb-link-btn" data-kb-nav-go="reunion">Zur Réunion</button></p>');
    h+='</div>';
    el.innerHTML=h;
  }
  document.addEventListener('click',function(ev){
    var k=ev.target.closest&&ev.target.closest('[data-heute-kind]');
    if(k){var sid=k.getAttribute('data-heute-kind');if(window.__kbGo){window.__kbGo('absenzen');}if(window.KB_ANW&&window.KB_ANW.openStudent){window.KB_ANW.openStudent(sid);}return;}
    var n=ev.target.closest&&ev.target.closest('[data-kb-nav-go]');
    if(n&&window.__kbGo){window.__kbGo(n.getAttribute('data-kb-nav-go'));}
  });
  return {render:render, schultage:schultage};
})();
`;

var NOTEN_MODULE = `
window.KB_NOTEN=(function(){
  var LS='klassebuch_noten_v1';
  function loadAll(){try{var r=localStorage.getItem(LS);if(r)return JSON.parse(r)||{};}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();var hooks=[];
  function rec(sid){var r=data[sid];if(!r){r={mode:'semester',grades:[],modules:{}};data[sid]=r;}if(!r.grades)r.grades=[];if(!r.modules)r.modules={};if(!r.mode)r.mode='semester';return r;}
  function notify(sid){saveAll(data);for(var i=0;i<hooks.length;i++){try{hooks[i](sid);}catch(e){}}}
  function nid(){return 'gr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
  function norm(g){var m=+g.max;return (m>0)?(+g.points/m*60):0;}
  function periodsFor(mode){return mode==='trimester'?['T1','T2','T3']:['S1','S2'];}
  function listOf(sid,subject,period){return rec(sid).grades.filter(function(g){return (!subject||g.subject===subject)&&(!period||g.period===period);});}
  function subjAvg(sid,subject,period){var gs=listOf(sid,subject,period);if(!gs.length)return null;var s=0;for(var i=0;i<gs.length;i++)s+=norm(gs[i]);return s/gs.length;}
  function modOf(sid,subject){var r=rec(sid);var m=r.modules[subject];if(!m){m={done:0,cap:8};r.modules[subject]=m;}if(typeof m.done!=='number')m.done=0;if(typeof m.cap!=='number')m.cap=8;return m;}
  return {
    periodsFor:periodsFor, norm:norm, list:listOf, subjectAvg:subjAvg,
    getMode:function(sid){return rec(sid).mode;},
    setMode:function(sid,m){var r=rec(sid);var nm=(m==='trimester'?'trimester':'semester');if(r.mode!==nm){r.mode=nm;r.updatedAt=new Date().toISOString();notify(sid);}},
    add:function(sid,o){var r=rec(sid);r.grades.push({id:nid(),subject:o.subject||'',period:o.period||'S1',label:(o.label||'').trim(),points:+o.points||0,max:(+o.max>0?+o.max:60),date:(function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})(new Date())});r.updatedAt=new Date().toISOString();notify(sid);},
    remove:function(sid,id){var r=rec(sid);r.grades=r.grades.filter(function(g){return g.id!==id;});r.updatedAt=new Date().toISOString();notify(sid);},
    periodAvg:function(sid,period,subjects){var avgs=[];(subjects||[]).forEach(function(su){var a=subjAvg(sid,su,period);if(a!=null)avgs.push(a);});if(!avgs.length)return null;var s=0;for(var i=0;i<avgs.length;i++)s+=avgs[i];return s/avgs.length;},
    moduleOf:function(sid,subject){return modOf(sid,subject);},
    /* Fach in ALLEN Noten und Modulstaenden mitbenennen (ueber alle Schueler),
       sonst verwaisen sie beim Umbenennen im Stundenplan. */
    renameSubject:function(from,to){
      if(!from||!to||from===to)return 0;
      var n=0;
      for(var sid in data){var r=data[sid]||{};
        var gs=r.grades||[];
        for(var i=0;i<gs.length;i++){if(gs[i].subject===from){gs[i].subject=to;n++;}}
        if(r.modules&&r.modules[from]){
          if(r.modules[to]){r.modules[to].done=Math.max(r.modules[to].done||0,r.modules[from].done||0);
                            r.modules[to].cap=Math.max(r.modules[to].cap||0,r.modules[from].cap||0);}
          else{r.modules[to]=r.modules[from];}
          delete r.modules[from];n++;
        }
        if(n)r.updatedAt=new Date().toISOString();
      }
      if(n){saveAll(data);for(var h=0;h<hooks.length;h++){try{hooks[h]();}catch(e){}}}
      return n;
    },
    setModule:function(sid,subject,n){var m=modOf(sid,subject);n=Math.max(0,n|0);if(m.done!==n){m.done=n;if(m.cap<n+2)m.cap=n+2;rec(sid).updatedAt=new Date().toISOString();notify(sid);}},
    addCap:function(sid,subject,by){var m=modOf(sid,subject);m.cap=Math.min(99,m.cap+(by||4));notify(sid);},
    totalModules:function(sid,subjects){var t=0,r=rec(sid);if(subjects){subjects.forEach(function(su){if(r.modules[su])t+=(r.modules[su].done||0);});}else{for(var k in r.modules)t+=(r.modules[k].done||0);}return t;},
    onChange:function(fn){hooks.push(fn);},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,mode:r.mode||'semester',grades:r.grades||[],modules:r.modules||{},updatedAt:r.updatedAt||''});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){data[r.id]={mode:r.mode||'semester',grades:r.grades||[],modules:r.modules||{},updatedAt:r.updatedAt||''};});saveAll(data);for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  };
})();
`;

/* Wochen-Bericht: lädt eine übersichtliche Datei mit ALLEM Neuen der
   letzten 5 Wochen herunter (Réunionen, Ziele, Dossier, Noten, Absenzen,
   Screenings, Notizen) — damit nie etwas verloren geht. */
var WEEKLY_MODULE = `
window.KB_WEEKLY=(function(){
  function pad(n){return n<10?'0'+n:''+n;}
  function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function mondayOf(d){d=new Date(d);var g=(d.getDay()+6)%7;d.setDate(d.getDate()-g);d.setHours(0,0,0,0);return d;}
  function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function fmtD(s){var p=String(s).split('-');return (p.length===3)?(p[2]+'.'+p[1]+'.'+p[0]):s;}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c];});}
  function nl2br(s){return esc(s).split(String.fromCharCode(10)).join('<br>');}
  function nameMap(){var m={};try{(window.KB_ROSTER?KB_ROSTER.list():[]).forEach(function(s){m[s.id]=s.name;});}catch(e){}return m;}
  function nameOf(m,id){return m[id]||id||'—';}

  function build(){
    var students=nameMap();
    var today=new Date(), m0=mondayOf(today), wks=[];
    for(var i=0;i<5;i++){var mo=addDays(m0,-7*i);wks.push({lo:iso(mo),hi:iso(addDays(mo,6))});}
    function weekOf(ds){if(!ds)return -1;for(var i=0;i<wks.length;i++){if(ds>=wks[i].lo&&ds<=wks[i].hi)return i;}return -1;}
    var buckets=wks.map(function(){return {};});
    function push(wi,cat,line){if(wi<0)return;(buckets[wi][cat]=buckets[wi][cat]||[]).push(line);}

    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportEntries():[]).forEach(function(e){var wi=weekOf(e.date);if(wi<0)return;var cat=(e.category==='Team-Réunion')?'Réunion-Beiträge':'Dossier-Einträge';var by=e.author?(' <em>(von '+esc(e.author)+')</em>'):'';push(wi,cat,'<div class="it"><div class="ih"><b>'+esc(nameOf(students,e.studentId))+'</b>'+by+' · '+fmtD(e.date)+((e.category&&e.category!=='Team-Réunion')?(' · '+esc(e.category)):'')+'</div><div class="tx">'+nl2br(e.text||'')+'</div></div>');});}catch(e){}
    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportReunions():[]).forEach(function(r){var wi=weekOf(r.date);if(wi<0)return;var g=r.goals||{};Object.keys(g).forEach(function(sid){var arr=g[sid]||[];if(!arr.length)return;var who=(sid==='group')?'Gruppe':esc(nameOf(students,sid));push(wi,'Wochenziele','<div class="it"><div class="ih"><b>'+who+'</b> · '+fmtD(r.date)+'</div><div class="tx">'+window.kbZiele(arr).map(function(x){return (x.done?'✓ ':'• ')+esc(x.text);}).join('<br>')+'</div></div>');});});}catch(e){}
    try{(window.KB_NOTEN?KB_NOTEN.syncExport():[]).forEach(function(r){(r.grades||[]).forEach(function(g){var wi=weekOf(g.date);if(wi<0)return;var n60=(+g.max>0?(+g.points/+g.max*60):0);push(wi,'Noten','<div class="it2">'+fmtD(g.date)+' · <b>'+esc(nameOf(students,r.id))+'</b> · '+esc(g.subject||'')+(g.label?(' ('+esc(g.label)+')'):'')+': '+(+g.points)+'/'+(+g.max)+' → '+(Math.round(n60*10)/10).toString().replace('.',',')+'/60</div>');});});}catch(e){}
    try{if(window.KB_SCREENING&&KB_SCREENING.history){(window.KB_ROSTER?KB_ROSTER.list():[]).forEach(function(s){(KB_SCREENING.history(s.id)||[]).forEach(function(h){var wi=weekOf(h.date);if(wi<0)return;var mu=(h.muster||[]).map(function(x){return (x&&x.name)?x.name:x;}).join(' · ');var risk=h.acute?'akute Krise':(h.risk?'Risiko':'');push(wi,'Screenings','<div class="it2">'+fmtD(h.date)+' · <b>'+esc(s.name)+'</b>'+(risk?(' · '+risk):'')+(mu?(' · '+esc(mu)):'')+'</div>');});});}}catch(e){}
    try{(window.KB_ANW?KB_ANW.exportEntries():[]).forEach(function(e){var wi=weekOf(e.date);if(wi<0)return;var lab=(window.KB_ANW.statusLabel?KB_ANW.statusLabel(e.status):e.status);push(wi,'Absenzen','<div class="it2">'+fmtD(e.date)+' · <b>'+esc(nameOf(students,e.studentId))+'</b> · '+esc(lab)+(e.subject?(' · '+esc(e.subject)):'')+(e.byUser?(' <em>('+esc(e.byUser)+')</em>'):'')+'</div>');});}catch(e){}
    try{(window.KB_ANW?KB_ANW.exportNotes():[]).forEach(function(n){var wi=weekOf(n.date);if(wi<0)return;push(wi,'Klassenbuch-Notizen','<div class="it"><div class="ih"><b>'+esc(n.type||'Notiz')+'</b> · '+fmtD(n.date)+(n.subject?(' · '+esc(n.subject)):'')+(n.byUser?(' <em>(von '+esc(n.byUser)+')</em>'):'')+'</div><div class="tx">'+nl2br(n.text||'')+'</div></div>');});}catch(e){}

    var CATS=['Réunion-Beiträge','Wochenziele','Noten','Screenings','Dossier-Einträge','Absenzen','Klassenbuch-Notizen'];
    var body='';
    wks.forEach(function(wk,wi){
      body+='<section class="wk"><h2>Woche '+fmtD(wk.lo)+' – '+fmtD(wk.hi)+'</h2>';
      var keys=CATS.filter(function(c){return buckets[wi][c]&&buckets[wi][c].length;});
      if(!keys.length){body+='<p class="empty">Keine neuen Einträge in dieser Woche.</p>';}
      else{keys.forEach(function(cat){var arr=buckets[wi][cat];body+='<h3>'+cat+' <span class="cnt">'+arr.length+'</span></h3>'+arr.join('');});}
      body+='</section>';
    });
    var css='body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#23243a;max-width:900px;margin:24px auto;padding:0 22px;line-height:1.5}h1{font-size:24px;margin:0 0 2px}.sub{color:#777;margin:0 0 22px;font-size:13.5px}.wk{margin:0 0 30px;border-top:3px solid #4f5bd5;padding-top:10px}.wk h2{font-size:18px;margin:0 0 10px;color:#3b3f8f}h3{font-size:14px;margin:16px 0 6px;color:#4f5bd5;border-bottom:1px solid #e6e6ef;padding-bottom:3px}.cnt{font-size:11px;background:#eef0fb;color:#4a4f86;border-radius:999px;padding:1px 8px;font-weight:700}.it{margin:6px 0;padding:8px 10px;background:#f7f8fc;border-radius:8px}.ih{font-size:13px;color:#444}.tx{margin-top:4px;font-size:13.5px;white-space:normal}.it2{font-size:13px;padding:3px 4px;border-bottom:1px solid #f0f0f6}.empty{color:#999;font-style:italic;font-size:13px}em{color:#4f5bd5;font-style:normal;font-weight:600}@media print{.wk{break-inside:avoid}}';
    return '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Klassebuch — Wochen-Bericht</title><style>'+css+'</style></head><body><h1>📘 Klassebuch — Wochen-Bericht</h1><p class="sub">Annexe Junglinster · erstellt am '+fmtD(iso(today))+' · letzte 5 Wochen · alle neuen Einträge</p>'+body+'</body></html>';
  }
  function download(){
    try{
      var html=build();
      var blob=new Blob([html],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=url;a.download='Klassebuch-Wochenbericht-'+iso(new Date())+'.html';
      document.body.appendChild(a);a.click();
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}a.remove();},200);
      return true;
    }catch(e){try{alert('Download fehlgeschlagen: '+(e&&e.message||e));}catch(_){}return false;}
  }
  /* ============================================================
     Wochen-Export als Excel (.xlsx) und Word (.doc).
     Gleiche Datenbasis wie der HTML-Bericht, aber für EINE Woche und in
     einem Format, das sich archivieren und weiterverarbeiten lässt.
     Alles wird lokal erzeugt — keine Bibliothek, kein Server.
     ============================================================ */
  var COLS=['Bereich','Datum','Schüler','Fach / Kategorie','Erfasst von','Details','Inhalt'];
  function monIso(d){return iso(mondayOf(d?new Date(d+'T00:00:00'):new Date()));}
  function weekRange(mIso){var mo=new Date(mIso+'T00:00:00');return {lo:iso(mo),hi:iso(addDays(mo,6))};}

  function collect(lo,hi){
    var students=nameMap(), rows=[];
    function inW(d){return !!d&&d>=lo&&d<=hi;}
    function add(bereich,datum,schueler,kat,autor,details,inhalt){
      rows.push({bereich:bereich,datum:datum||'',schueler:schueler||'',kat:kat||'',autor:autor||'',details:details||'',inhalt:inhalt||''});
    }
    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportEntries():[]).forEach(function(e){
      if(!inW(e.date))return;
      add((e.category==='Team-Réunion')?'Réunion-Beiträge':'Dossier-Einträge',e.date,
          nameOf(students,e.studentId),e.category||'',e.author||'',(e.tags||[]).join(', '),e.text||'');
    });}catch(e){}
    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportReunions():[]).forEach(function(r){
      if(!inW(r.date))return;var g=r.goals||{};
      Object.keys(g).forEach(function(sid){var arr=g[sid]||[];if(!arr.length)return;
        add('Wochenziele',r.date,(sid==='group')?'Gruppe':nameOf(students,sid),'','','',window.kbZiele(arr).map(function(x){return (x.done?'✓ ':'')+x.text;}).join(' | '));});
    });}catch(e){}
    try{(window.KB_NOTEN?KB_NOTEN.syncExport():[]).forEach(function(r){
      (r.grades||[]).forEach(function(g){if(!inW(g.date))return;
        var det=(+g.points)+'/'+(+g.max);
        /* Umrechnung auf /60 nur zeigen, wenn sie etwas ändert */
        if(+g.max>0&&+g.max!==60){var n60=(+g.points)/(+g.max)*60;det+=' = '+(Math.round(n60*10)/10).toString().replace('.',',')+'/60';}
        add('Noten',g.date,nameOf(students,r.id),g.subject||'','',det,g.label||'');});
    });}catch(e){}
    try{if(window.KB_SCREENING&&KB_SCREENING.history){(window.KB_ROSTER?KB_ROSTER.list():[]).forEach(function(s){
      (KB_SCREENING.history(s.id)||[]).forEach(function(h){if(!inW(h.date))return;
        var mu=(h.muster||[]).map(function(x){return (x&&x.name)?x.name:x;}).join(' · ');
        add('Screenings',h.date,s.name,'','',h.acute?'akute Krise':(h.risk?'Risiko':''),mu);});});}
    }catch(e){}
    try{(window.KB_ANW?KB_ANW.exportEntries():[]).forEach(function(e){if(!inW(e.date))return;
      var st=(window.KB_ANW.statusLabel?KB_ANW.statusLabel(e.status):e.status)||'';
      /* Beim Retard gehoeren die Minuten dazu, sonst fehlt in der Sicherung
         genau die Angabe, wegen der wir sie erfassen. */
      if(e.status==='verspaetet'&&+e.lateMin>0)st+=' ('+(+e.lateMin)+' min)';
      add('Absenzen',e.date,nameOf(students,e.studentId),e.subject||'',e.byUser||'',st,'');});
    }catch(e){}
    try{(window.KB_ANW?KB_ANW.exportNotes():[]).forEach(function(n){if(!inW(n.date))return;
      /* Notizen koennen einem Kind gehoeren - dann gehoert der Name in die Zeile. */
      add('Klassenbuch-Notizen',n.date,n.studentId?nameOf(students,n.studentId):'ganze Klasse'+(n.level?' '+n.level:''),
          n.subject||'',n.byUser||'',n.type||'Notiz',n.text||'');});
    }catch(e){}
    rows.sort(function(a,b){
      if(a.datum!==b.datum)return a.datum<b.datum?-1:1;
      return a.bereich<b.bereich?-1:(a.bereich>b.bereich?1:0);
    });
    return rows;
  }
  function summary(rows){
    var by={},out=[];
    rows.forEach(function(r){by[r.bereich]=(by[r.bereich]||0)+1;});
    Object.keys(by).sort().forEach(function(k){out.push([k,by[k]]);});
    return out;
  }

  /* ---- ZIP (nur gespeichert, ohne Kompression) ---- */
  var CRCT=null;
  function crcTable(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++){c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);}t[n]=c>>>0;}return t;}
  function crc32(b){if(!CRCT)CRCT=crcTable();var c=0xFFFFFFFF;for(var i=0;i<b.length;i++){c=CRCT[(c^b[i])&0xFF]^(c>>>8);}return (c^0xFFFFFFFF)>>>0;}
  function enc(s){return new TextEncoder().encode(s);}
  function zip(files){
    function u16(n){return [n&255,(n>>8)&255];}
    function u32(n){return [n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255];}
    var parts=[],central=[],off=0,i;
    for(i=0;i<files.length;i++){
      var nm=enc(files[i].name),dt=files[i].data,crc=crc32(dt),sz=dt.length;
      var lh=[80,75,3,4].concat(u16(20),u16(2048),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0));
      parts.push(new Uint8Array(lh));parts.push(nm);parts.push(dt);
      var ch=[80,75,1,2].concat(u16(20),u16(20),u16(2048),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),
                                u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off));
      central.push(new Uint8Array(ch));central.push(nm);
      off+=lh.length+nm.length+sz;
    }
    var cd=0;central.forEach(function(b){cd+=b.length;});
    var eocd=new Uint8Array([80,75,5,6].concat(u16(0),u16(0),u16(files.length),u16(files.length),u32(cd),u32(off),u16(0)));
    var all=parts.concat(central,[eocd]),tot=0;
    all.forEach(function(b){tot+=b.length;});
    var out=new Uint8Array(tot),p=0;
    all.forEach(function(b){out.set(b,p);p+=b.length;});
    return out;
  }

  /* ---- XLSX ---- */
  function xesc(v){
    var s=String(v==null?'':v),o='',c,ch;
    for(var i=0;i<s.length;i++){
      c=s.charCodeAt(i);ch=s.charAt(i);
      if(c<32&&c!==9&&c!==10&&c!==13)continue;       /* Steuerzeichen brechen XML */
      if(ch==='&')o+='&amp;';else if(ch==='<')o+='&lt;';else if(ch==='>')o+='&gt;';
      else if(ch==='"')o+='&quot;';else if(ch==="'")o+='&apos;';else o+=ch;
    }
    return o;
  }
  function colLetter(n){var s='';while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;}
  function sheetXml(rows,widths){
    var sd='',r,c;
    for(r=0;r<rows.length;r++){
      sd+='<row r="'+(r+1)+'">';
      for(c=0;c<rows[r].length;c++){
        var v=rows[r][c];
        if(v===''||v==null)continue;
        sd+='<c r="'+colLetter(c+1)+(r+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';
      }
      sd+='</row>';
    }
    var cols='';
    if(widths&&widths.length){
      cols='<cols>';
      for(c=0;c<widths.length;c++){cols+='<col min="'+(c+1)+'" max="'+(c+1)+'" width="'+widths[c]+'" customWidth="1"/>';}
      cols+='</cols>';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+cols+
      '<sheetData>'+sd+'</sheetData></worksheet>';
  }
  function xlsx(mIso){
    var w=weekRange(mIso),rows=collect(w.lo,w.hi),sum=summary(rows);
    var head=['Klassebuch — Wochen-Sicherung'],ov=[head,
      ['Woche',fmtD(w.lo)+' – '+fmtD(w.hi)],['Erstellt am',fmtD(iso(new Date()))],
      ['Neue Einträge gesamt',String(rows.length)],[''],['Bereich','Anzahl']];
    sum.forEach(function(p){ov.push([p[0],String(p[1])]);});
    if(!sum.length)ov.push(['(keine neuen Einträge)','0']);
    var tab=[COLS];
    rows.forEach(function(r){tab.push([r.bereich,fmtD(r.datum),r.schueler,r.kat,r.autor,r.details,r.inhalt]);});
    var S1=sheetXml(ov,[26,18]),S2=sheetXml(tab,[22,12,18,22,14,28,70]);
    var NS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var files=[
      {name:'[Content_Types].xml',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
        '<Default Extension="xml" ContentType="application/xml"/>'+
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
        '</Types>')},
      {name:'_rels/.rels',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="'+NS+'/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
      {name:'xl/workbook.xml',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+NS+'">'+
        '<sheets><sheet name="Übersicht" sheetId="1" r:id="rId1"/>'+
        '<sheet name="Einträge" sheetId="2" r:id="rId2"/></sheets></workbook>')},
      {name:'xl/_rels/workbook.xml.rels',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="'+NS+'/worksheet" Target="worksheets/sheet1.xml"/>'+
        '<Relationship Id="rId2" Type="'+NS+'/worksheet" Target="worksheets/sheet2.xml"/></Relationships>')},
      {name:'xl/worksheets/sheet1.xml',data:enc(S1)},
      {name:'xl/worksheets/sheet2.xml',data:enc(S2)}
    ];
    return zip(files);
  }

  /* ---- Word (.doc): Word öffnet HTML zuverlässig ---- */
  function docHtml(mIso){
    var w=weekRange(mIso),rows=collect(w.lo,w.hi),sum=summary(rows),i;
    var st='body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#23243a}'+
           'h1{font-size:18pt;margin:0 0 2pt}h2{font-size:13pt;color:#3b3f8f;margin:16pt 0 4pt;border-bottom:1pt solid #c9cbe8}'+
           '.sub{color:#666;font-size:9.5pt;margin:0 0 12pt}'+
           'table{border-collapse:collapse;width:100%}td,th{border:0.5pt solid #b9bcd4;padding:4pt 6pt;font-size:10pt;vertical-align:top}'+
           'th{background:#eef0fb;text-align:left}.it{margin:0 0 8pt}.meta{color:#4f5bd5;font-size:9.5pt}';
    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">'+
      '<head><meta charset="utf-8"><title>Klassebuch — Woche '+esc(fmtD(w.lo))+'</title><style>'+st+'</style></head><body>'+
      '<h1>Klassebuch — Wochen-Sicherung</h1>'+
      '<p class="sub">Annexe Junglinster · Woche '+esc(fmtD(w.lo))+' – '+esc(fmtD(w.hi))+
      ' · erstellt am '+esc(fmtD(iso(new Date())))+' · '+rows.length+' neue Einträge</p>';
    if(!rows.length){h+='<p><i>In dieser Woche ist nichts Neues dazugekommen.</i></p>';}
    else{
      h+='<table><tr><th>Bereich</th><th>Anzahl</th></tr>';
      for(i=0;i<sum.length;i++){h+='<tr><td>'+esc(sum[i][0])+'</td><td>'+sum[i][1]+'</td></tr>';}
      h+='</table>';
      var byCat={};rows.forEach(function(r){(byCat[r.bereich]=byCat[r.bereich]||[]).push(r);});
      Object.keys(byCat).sort().forEach(function(cat){
        h+='<h2>'+esc(cat)+'</h2>';
        byCat[cat].forEach(function(r){
          var meta=[fmtD(r.datum),r.schueler,r.kat,r.details,r.autor?('erfasst von '+r.autor):''].filter(Boolean).join(' · ');
          h+='<p class="it"><span class="meta">'+esc(meta)+'</span>'+(r.inhalt?('<br>'+nl2br(r.inhalt)):'')+'</p>';
        });
      });
    }
    return h+'</body></html>';
  }

  function saveBlob(data,type,name){
    var blob=new Blob([data],{type:type});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}a.remove();},200);
  }
  function downloadXlsx(mIso){
    try{var m=monIso(mIso);saveBlob(xlsx(m),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Klassebuch-Woche-'+m+'.xlsx');return true;}
    catch(e){try{alert('Excel-Export fehlgeschlagen: '+(e&&e.message||e));}catch(_){}return false;}
  }
  function downloadDoc(mIso){
    try{var m=monIso(mIso);saveBlob(docHtml(m),'application/msword','Klassebuch-Woche-'+m+'.doc');return true;}
    catch(e){try{alert('Word-Export fehlgeschlagen: '+(e&&e.message||e));}catch(_){}return false;}
  }

  return {build:build, download:download,
          monday:monIso, range:weekRange, collect:collect, summary:summary,
          xlsx:xlsx, docHtml:docHtml, downloadXlsx:downloadXlsx, downloadDoc:downloadDoc};
})();
`;

/* Anwesenheit: Schülerliste per Klick ein-/ausklappen (Horaire wird größer). */
var ANW_SIDE_TOGGLE = `
(function(){
  var KEY='anw_side_collapsed';
  function lay(){return document.querySelector('#anw-root .layout');}
  function setLabel(){var b=document.getElementById('anw-side-toggle');if(!b)return;var l=lay();var c=l&&l.classList.contains('side-collapsed');b.innerHTML=c?'☰ Schüler einblenden':'‹ Liste ausblenden';}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('#anw-side-toggle');if(!b)return;
    var l=lay();if(!l)return;
    var c=!l.classList.contains('side-collapsed');l.classList.toggle('side-collapsed',c);
    try{localStorage.setItem(KEY,c?'1':'');}catch(_){}
    setLabel();
  });
  function init(){var l=lay();if(!l){return setTimeout(init,250);}try{if(localStorage.getItem(KEY)==='1')l.classList.add('side-collapsed');}catch(_){}setLabel();}
  init();
})();
`;

var FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Ctext%20y='.9em'%20font-size='88'%3E%F0%9F%93%98%3C/text%3E%3C/svg%3E";

var parts = [
  '<!DOCTYPE html>',
  '<!-- GENERIERT von tools/build-merged.js aus anwesenheit.html + dossier.html.',
  '     Nicht direkt bearbeiten — Quelle ändern und neu bauen: node tools/build-merged.js -->',
  '<html lang="de">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<title>Klassenbuch · CDSE</title>',
  '<meta name="theme-color" content="#4f5bd5">',
  '<link rel="icon" href="' + FAVICON + '">',
  '<style>',
  '/* === Gemeinsames Gerüst === */', SHELL_CSS,
  '/* === Rechtschreibpruefung === */', SPELL_CSS,
  '/* === dossier (gescoped) === */', dosStyleScoped,
  '/* === anwesenheit (gescoped) === */', anwStyleScoped,
  '/* === Akzent-Vereinheitlichung === */', ACCENT_OVERRIDE,
  '/* === Material / Isa-Toolbox === */', MATERIAL_CSS,
  '</style>',
  '</head>',
  '<body>',
  SHELL_BODY_TOP,
  '<section class="kb-panel" id="anw-root">', anwBody, '</section>',
  '<section class="kb-panel" id="dos-root">', dosBody, '</section>',
  SHELL_PANELS_EXTRA,
  '<script src="toolbox-index.js"></' + 'script>',
  '<script src="../hub-apps.js"></' + 'script>',
  '<script>window.KB_TAXONOMY=' + jsonForScript(TAXONOMY_JSON) + ';</' + 'script>',
  '<script>' + TERMS_MODULE + '</' + 'script>',
  '<script>' + ROSTER_MODULE + '</' + 'script>',
  '<script>' + dosScript + '</' + 'script>',
  '<script>' + DOS_OVERRIDES + '</' + 'script>',
  '<script>' + BUBBLE_MODULE + '</' + 'script>',
  '<script>' + anwScript + '</' + 'script>',
  '<script>' + TIMETABLE_MODULE + '</' + 'script>',
  '<script>' + SCREENING_MODULE + '</' + 'script>',
  '<script>' + NOTEN_MODULE + '</' + 'script>',
  '<script>' + WEEKLY_MODULE + '</' + 'script>',
  '<script>' + HEUTE_MODULE + '</' + 'script>',
  '<script>' + SYNC_MODULE + '</' + 'script>',
  '<script>' + MATERIALS_MODULE + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '<script>' + ANW_SIDE_TOGGLE + '</' + 'script>',
  '<script>' + TABS_GUARD + '</' + 'script>',
  '<script>' + SPELL_DATA + '</' + 'script>',
  '<script>' + NSPELL_JS + '</' + 'script>',
  '<script>' + SPELL_JS + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

var ZIEL = process.env.KB_ZIEL || path.join(ROOT, '..', '..', 'apps', 'klassenbuch.html');
fs.writeFileSync(ZIEL, parts.join('\n'), 'utf8');
console.log(path.relative(process.cwd(), ZIEL) + ' geschrieben: ' + Math.round(Buffer.byteLength(parts.join('\n')) / 1024) + ' KB');
