/* =====================================================================
   CDSE Lernen — Lernmodule für Mitarbeitende
   ---------------------------------------------------------------------
   Eine Datei, ohne Internet. Die Module (lern-app/module/*.json) sind beim
   Bauen eingebettet (gzip, base64). Der Lernstand liegt in localStorage
   unter „cdse-lernen-v1“ – im Hub gehört er zum angemeldeten Konto und
   wird mit dessen Daten verschlüsselt gesichert. Niemand sonst sieht ihn.
     #/                    Übersicht
     #/module              alle Module (Filter nach Bereich und Stand)
     #/modul/<id>[/<n>]    Lesen: Kapitel n (1 …), „ende“ = Begriffe & Quellen
     #/quiz/<id>           Abschlussquiz (bestanden ab 80 %)
     #/wiederholen         fällige Fragen (Lernkartei, 5 Fächer)
     #/glossar             alle Fachbegriffe
     #/pfad/<id>           Lernpfad; #/bestaetigung/<id> Teilnahmebestätigung
     #/suche?q=…           Volltextsuche
   ===================================================================== */
(function () {
  'use strict';

  var LS = 'cdse-lernen-v1';
  var BESTEHEN = 0.8;
  var INTERVALL = [0, 1, 3, 7, 16, 35]; /* Tage bis zur nächsten Wiederholung je Fach */
  var PRO_RUNDE = 15;
  var Q = window.LERN_QUELLEN || {};
  var TB = window.LERN_TOOLBOX || {};
  var MODULE = [];
  var MOD = {};
  var ST = null;
  var el = null;

  /* ---------- Bereiche und Lernpfade ---------- */
  var BEREICHE = [
    { id: 'grundlagen', name: 'Grundlagen', text: 'Entwicklung, Bindung, Stress und Diagnostik – das Fundament für alles Weitere.' },
    { id: 'stoerungen', name: 'Störungsbilder', text: 'Was hinter dem Verhalten stecken kann: erkennen, verstehen, abgrenzen, handeln.' },
    { id: 'muster', name: 'Persönlichkeit & Muster', text: 'Temperament, Bindungsmuster, Abwehr und Beziehungsdynamik im Alltag.' },
    { id: 'handeln', name: 'Wirksam handeln', text: 'Haltung, Deeskalation, Gespräche, Elternarbeit und Kinderschutz.' },
    { id: 'system', name: 'Rahmen & Zusammenarbeit', text: 'Beobachten, dokumentieren, Inklusion in Luxemburg und gut für sich sorgen.' }
  ];
  var BEREICH = {};
  BEREICHE.forEach(function (b) { BEREICH[b.id] = b; });
  var PFADE = [
    { id: 'basis', name: 'Basiswissen', text: 'Wie Kinder sich entwickeln, was sie schützt und was sie belastet.',
      module: ['entwicklung-0-18', 'bindung', 'emotionsregulation', 'lernen-verhalten', 'biopsychosozial', 'risiko-schutz', 'stress-gehirn'] },
    { id: 'stoerungen', name: 'Störungsbilder im Schulalltag', text: 'Die häufigsten Störungsbilder – und was im Unterricht hilft.',
      module: ['adhs', 'oppositionell-aggressiv', 'autismus', 'angst', 'depression', 'trauma', 'lernstoerungen', 'schulvermeidung'] },
    { id: 'krisen', name: 'Krisen sicher begleiten', text: 'Eskalation, Selbstgefährdung, Trauma, Kinderschutz – und die eigene Stabilität.',
      module: ['deeskalation', 'selbstverletzung-suizid', 'trauma', 'traumapaedagogik', 'kinderschutz', 'selbstfuersorge'] },
    { id: 'diagnostik', name: 'Diagnostik verstehen', text: 'Berichte lesen, Testwerte einordnen, gut beobachten.',
      module: ['diagnostik-grundbegriffe', 'testwerte-lesen', 'intelligenz', 'lernstoerungen', 'beobachten-dokumentieren'] },
    { id: 'persoenlichkeit', name: 'Persönlichkeit & Beziehung', text: 'Was Menschen verschieden macht und was in Beziehungen passiert.',
      module: ['temperament-persoenlichkeit', 'bindungsmuster', 'persoenlichkeitsentwicklung', 'abwehr-coping', 'mentalisieren', 'uebertragung'] },
    { id: 'handeln', name: 'Wirksam handeln', text: 'Haltung, Verstärkung, Präsenz, Gespräche und Elternarbeit.',
      module: ['beziehung-haltung', 'verstaerkung', 'neue-autoritaet', 'etep', 'gespraechsfuehrung', 'elternarbeit'] }
  ];

  /* ---------- Liniensymbole (Tabler Icons, MIT) ---------- */
  var IC = {
    kappe: '<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6"/><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"/>',
    buch: '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6l0 13"/><path d="M12 6l0 13"/><path d="M21 6l0 13"/>',
    haken: '<path d="M5 12l5 5l10 -10"/>',
    x: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
    rechts: '<path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>',
    links: '<path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/>',
    suche: '<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
    birne: '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>',
    person: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
    warn: '<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>',
    info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
    liste: '<path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/>',
    druck: '<path d="M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2"/><path d="M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4"/><path d="M7 13m0 2a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z"/>',
    uhr: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/>',
    pfad: '<path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4z"/><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5"/>',
    wdh: '<path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3"/><path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3"/>',
    medaille: '<path d="M12 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0"/><path d="M12 15l3.4 5.89l1.598 -3.233l3.598 .232l-3.4 -5.889"/><path d="M6.802 12l-3.4 5.89l3.598 -.233l1.598 3.232l3.4 -5.889"/>',
    werkzeug: '<path d="M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4"/><path d="M14.5 5.5l4 4"/><path d="M12 8l-5 -5l-4 4l5 5"/><path d="M7 8l-1.5 1.5"/><path d="M16 12l5 5l-4 4l-5 -5"/><path d="M16 17l-1.5 1.5"/>',
    stift: '<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/>',
    waage: '<path d="M7 20l10 0"/><path d="M6 6l6 -1l6 1"/><path d="M12 3l0 17"/><path d="M9 12l-3 -6l-3 6a3 3 0 0 0 6 0"/><path d="M21 12l-3 -6l-3 6a3 3 0 0 0 6 0"/>',
    vergleich: '<path d="M11 16h10"/><path d="M11 16l4 4"/><path d="M11 16l4 -4"/><path d="M13 8h-10"/><path d="M13 8l-4 4"/><path d="M13 8l-4 -4"/>',
    leute: '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
    ziel: '<path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>',
    frage: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 17l0 .01"/><path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4"/>',
    tabelle: '<path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z"/><path d="M3 10h18"/><path d="M10 3v18"/>'
  };
  function svg(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';
  }

  /* ---------- kleine Hilfen ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function heute() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function plusTage(iso, n) {
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function datumDe(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function prozent(x) { return Math.round(x * 100) + ' %'; }
  function woerter(n, eins, mehr) { return n + ' ' + (n === 1 ? eins : mehr); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  }
  function absaetze(t) {
    return String(t || '').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function klartext(t) { return String(t || '').replace(/\*\*?/g, ''); }
  function mischen(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function nutzer() {
    try { var n = JSON.parse(localStorage.getItem('cdse-nutzer') || 'null'); return n && n.name ? n : null; } catch (e) { return null; }
  }

  /* ---------- Lernstand ---------- */
  function stLaden() {
    try {
      var s = JSON.parse(localStorage.getItem(LS) || 'null');
      if (s && s.v === 1 && typeof s.module === 'object') { s.karten = s.karten || {}; return s; }
    } catch (e) { /* kaputter Eintrag: frisch beginnen */ }
    return { v: 1, module: {}, karten: {}, zuletzt: null, name: '' };
  }
  var speicherFehler = false;
  function stSpeichern() {
    try { localStorage.setItem(LS, JSON.stringify(ST)); speicherFehler = false; }
    catch (e) { if (!speicherFehler) { speicherFehler = true; alert('Der Lernstand ließ sich nicht speichern (Speicher voll oder gesperrt).'); } }
  }
  function mz(id) {
    var z = ST.module[id];
    if (!z) { z = ST.module[id] = { gelesen: [], versuche: [], notiz: '' }; }
    z.gelesen = z.gelesen || []; z.versuche = z.versuche || [];
    return z;
  }
  function bestanden(id) { var z = ST.module[id]; return !!(z && z.bestanden); }
  function besterWert(id) { var z = ST.module[id]; return z && z.versuche && z.versuche.length ? Math.max.apply(null, z.versuche.map(function (v) { return v.p; })) : null; }
  function gelesen(id, k) { var z = ST.module[id]; return !!(z && z.gelesen && z.gelesen.indexOf(k) >= 0); }
  function status(id) {
    if (bestanden(id)) { return 'bestanden'; }
    var z = ST.module[id];
    return z && ((z.gelesen && z.gelesen.length) || (z.versuche && z.versuche.length) || z.besucht) ? 'begonnen' : 'neu';
  }
  function anteil(m) {
    var z = ST.module[m.id] || {}, n = m.kapitel.length;
    var g = (z.gelesen || []).filter(function (k) { return k >= 1 && k <= n; }).length;
    return (g + (z.bestanden ? 1 : 0)) / (n + 1);
  }
  var STATUS_TEXT = { neu: 'Neu', begonnen: 'Begonnen', bestanden: 'Bestanden' };
  function statusChip(id) {
    var s = status(id);
    return '<span class="status ' + s + '">' + (s === 'bestanden' ? svg('haken') : '') + STATUS_TEXT[s] + '</span>';
  }

  /* ---------- Lernkartei ---------- */
  function kartenKey(mid, i) { return mid + '#' + i; }
  function karteVon(key) {
    var p = key.split('#'), m = MOD[p[0]], i = +p[1];
    return m && m.quiz[i] ? { m: m, i: i, f: m.quiz[i] } : null;
  }
  function faellig() {
    var h = heute();
    return Object.keys(ST.karten).filter(function (k) { return ST.karten[k].faellig <= h && karteVon(k); })
      .sort(function (a, b) { return ST.karten[a].faellig.localeCompare(ST.karten[b].faellig) || ST.karten[a].fach - ST.karten[b].fach; });
  }
  function karteSetzen(key, fach, tage) { ST.karten[key] = { fach: fach, faellig: plusTage(heute(), tage) }; }

  /* ---------- Glossar (alle Module) ---------- */
  var GLOSSAR = [];
  function glossarBauen() {
    var map = {};
    MODULE.forEach(function (m) {
      (m.glossar || []).forEach(function (g) {
        var k = norm(g.begriff);
        if (!map[k]) { map[k] = { begriff: g.begriff, erklaerung: g.erklaerung, module: [] }; }
        if (map[k].module.indexOf(m.id) < 0) { map[k].module.push(m.id); }
      });
    });
    GLOSSAR = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.begriff.localeCompare(b.begriff, 'de'); });
  }

  /* =====================================================================
     Seitenrahmen
     ===================================================================== */
  function reiterNeu(seite) {
    var n = faellig().length;
    var r = document.getElementById('reiter');
    if (!r) { return; }
    r.innerHTML = [['', 'Übersicht'], ['module', 'Module'], ['wiederholen', 'Wiederholen'], ['glossar', 'Glossar']].map(function (x) {
      var an = seite === x[0] || (x[0] === 'module' && (seite === 'modul' || seite === 'quiz' || seite === 'pfad' || seite === 'bestaetigung'));
      return '<button type="button" data-geh="#/' + x[0] + '"' + (an ? ' aria-current="page"' : '') + '>' + x[1] +
        (x[0] === 'wiederholen' && n ? '<span class="n" aria-label="' + n + ' fällig">' + n + '</span>' : '') + '</button>';
    }).join('');
  }
  function zeigen(html, fokus) {
    el.innerHTML = html;
    popZu();
    if (fokus !== false) {
      var h = el.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      window.scrollTo(0, 0);
    }
  }
  function fussnote() {
    return '<footer class="fussnote keindruck"><span>Die Module ersetzen keine Aus- oder Weiterbildung und keine Diagnostik. Stand der Inhalte: ' + esc(window.LERN_STAND || '') + '.</span>' +
      '<button type="button" data-aktion="zuruecksetzen">Lernstand zurücksetzen</button></footer>';
  }

  /* =====================================================================
     Übersicht
     ===================================================================== */
  function ring(anteilWert) {
    var r = 48, u = 2 * Math.PI * r, v = Math.max(0, Math.min(1, anteilWert));
    return '<div class="ring" role="img" aria-label="' + prozent(v) + ' der Module bestanden"><svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="var(--bg-2)" stroke-width="10"/>' +
      (v > 0 ? '<circle cx="56" cy="56" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (u * v).toFixed(1) + ' ' + u.toFixed(1) + '"/>' : '') +
      '</svg><b><span>' + Math.round(v * 100) + '<small style="font-size:14px;margin-left:1px">%</small></span></b></div>';
  }
  function pfadStand(p) {
    var ids = p.module.filter(function (id) { return MOD[id]; });
    var ok = ids.filter(bestanden).length;
    return { ids: ids, ok: ok, fertig: ids.length > 0 && ok === ids.length };
  }
  function seiteUebersicht() {
    var ok = MODULE.filter(function (m) { return bestanden(m.id); }).length;
    var beg = MODULE.filter(function (m) { return status(m.id) === 'begonnen'; }).length;
    var fae = faellig().length;
    var n = nutzer();
    var z = ST.zuletzt && MOD[ST.zuletzt.m] ? ST.zuletzt : null;
    var weiter;
    if (z) {
      var m = MOD[z.m], k = Math.min(z.k || 1, m.kapitel.length);
      var naechstes = bestanden(m.id) ? null : (m.kapitel.map(function (_, i) { return i + 1; }).filter(function (i) { return !gelesen(m.id, i); })[0] || 'quiz');
      weiter = '<div class="karte weiter-karte"><span class="eyebrow">Weiterlernen</span><h3>' + esc(m.titel) + '</h3><p>' +
        (naechstes === 'quiz' ? 'Alle Kapitel gelesen – jetzt das Abschlussquiz.' : naechstes ? 'Kapitel ' + naechstes + ': ' + esc(m.kapitel[naechstes - 1].titel) : 'Bestanden. Zuletzt gelesen: Kapitel ' + k + '.') + '</p>' +
        '<a class="btn" href="' + (naechstes === 'quiz' ? '#/quiz/' + m.id : '#/modul/' + m.id + '/' + (naechstes || k)) + '">' + (naechstes === 'quiz' ? 'Quiz starten' : 'Weiterlesen') + svg('rechts') + '</a></div>';
    } else {
      var start = MOD['entwicklung-0-18'] || MOD['adhs'] || MODULE[0];
      weiter = '<div class="karte weiter-karte"><span class="eyebrow">Einstieg</span><h3>' + esc(start.titel) + '</h3><p>' + esc(start.untertitel || '') + '</p>' +
        '<a class="btn" href="#/modul/' + start.id + '">Mit dem ersten Modul beginnen' + svg('rechts') + '</a></div>';
    }
    var h = '<p class="eyebrow" style="color:var(--muted)">' + (n ? 'Angemeldet als ' + esc(n.name) + ' · ' : '') + 'Ihr Lernstand ist privat – nur Sie sehen ihn.</p>' +
      '<h1 class="seite">Fachwissen für den Alltag</h1>' +
      '<p class="unter">' + MODULE.length + ' Module zu Entwicklung, Störungsbildern, Persönlichkeit und Handeln – mit Fallbeispielen aus dem Schulalltag, einem Quiz zu jedem Modul und einer Lernkartei zum Wiederholen.</p>' +
      '<div class="start-kopf"><div class="karte"><div class="stand">' + ring(MODULE.length ? ok / MODULE.length : 0) +
      '<div><span class="eyebrow" style="color:var(--muted)">Ihr Stand</span><div class="zahlen"><div><b>' + ok + '</b><span>bestanden</span></div><div><b>' + beg + '</b><span>begonnen</span></div><div><b>' + fae + '</b><span>Fragen fällig</span></div></div></div></div></div>' +
      weiter + '</div>';
    if (fae) {
      h += '<section class="abschnitt"><div class="karte" style="flex-direction:row;align-items:center;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><span class="eyebrow" style="color:var(--warn)">Lernkartei</span><h3>' +
        woerter(fae, 'Frage ist', 'Fragen sind') + ' heute dran</h3><p>Kurz wiederholen festigt das Wissen – ein paar Minuten reichen.</p></div><a class="btn btn-primaer" href="#/wiederholen">' + svg('wdh') + 'Jetzt wiederholen</a></div></section>';
    }
    h += '<section class="abschnitt"><h2>Lernpfade</h2><div class="gitter">' + PFADE.map(function (p) {
      var s = pfadStand(p);
      if (!s.ids.length) { return ''; }
      return '<a class="karte pfad-karte" href="#/pfad/' + p.id + '"><span class="eyebrow" style="color:var(--accent)">' + svg('pfad').replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px;margin-right:4px"') + 'Lernpfad</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.text) + '</p>' +
        '<div class="balken" aria-hidden="true"><span style="width:' + Math.round(s.ok / s.ids.length * 100) + '%"></span></div><div class="fuss">' + s.ok + ' von ' + woerter(s.ids.length, 'Modul', 'Modulen') + ' bestanden' + (s.fertig ? ' · <b style="color:var(--ok)">abgeschlossen</b>' : '') + '</div></a>';
    }).join('') + '</div></section>';
    h += '<section class="abschnitt"><h2>Bereiche</h2><div class="gitter">' + BEREICHE.map(function (b) {
      var l = MODULE.filter(function (m) { return m.bereich === b.id; });
      if (!l.length) { return ''; }
      var o = l.filter(function (m) { return bestanden(m.id); }).length;
      return '<a class="karte modul-karte" style="--bc:var(--b-' + b.id + ')" href="#/module?bereich=' + b.id + '"><span class="eyebrow" style="color:var(--b-' + b.id + ')">' + woerter(l.length, 'Modul', 'Module') + '</span><h3>' + esc(b.name) + '</h3><p>' + esc(b.text) + '</p>' +
        '<div class="fuss">' + o + ' bestanden</div></a>';
    }).join('') + '</div></section>' + fussnote();
    zeigen(h);
  }

  /* =====================================================================
     Module (Liste)
     ===================================================================== */
  var filter = { bereich: '', stand: '' };
  function modulKarte(m) {
    var b = BEREICH[m.bereich] || { name: m.bereich };
    return '<a class="karte modul-karte" style="--bc:var(--b-' + m.bereich + ')" href="#/modul/' + m.id + '"><span class="eyebrow" style="color:var(--b-' + m.bereich + ')">' + esc(b.name) + '</span>' +
      '<h3>' + esc(m.titel) + '</h3><p>' + esc(m.untertitel || '') + '</p><div class="fuss">' + statusChip(m.id) + '<span>' + m.dauer + ' Min.</span>' +
      '<span style="flex:1"><span class="balken" aria-hidden="true" style="--bc:var(--b-' + m.bereich + ')"><span style="width:' + Math.round(anteil(m) * 100) + '%"></span></span></span></div></a>';
  }
  function seiteModule(q) {
    if (q.bereich !== undefined) { filter.bereich = BEREICH[q.bereich] ? q.bereich : ''; }
    var zahl = function (f) { return MODULE.filter(f).length; };
    var h = '<h1 class="seite">Module</h1><p class="unter">' + MODULE.length + ' Module – jedes mit Fallbeispielen, Handlungsideen, Quiz und Quellen. Bestanden ist ein Modul ab 80 % im Quiz.</p>' +
      '<div class="chips" role="group" aria-label="Bereich"><button type="button" class="chip" data-filter="bereich" data-wert="" aria-pressed="' + !filter.bereich + '">Alle Bereiche</button>' +
      BEREICHE.filter(function (b) { return zahl(function (m) { return m.bereich === b.id; }); }).map(function (b) {
        return '<button type="button" class="chip" data-filter="bereich" data-wert="' + b.id + '" aria-pressed="' + (filter.bereich === b.id) + '">' + esc(b.name) + '<span class="n">' + zahl(function (m) { return m.bereich === b.id; }) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="chips" role="group" aria-label="Stand" style="margin-top:4px">' + [['', 'Alle'], ['neu', 'Neu'], ['begonnen', 'Begonnen'], ['bestanden', 'Bestanden']].map(function (s) {
        return '<button type="button" class="chip" data-filter="stand" data-wert="' + s[0] + '" aria-pressed="' + (filter.stand === s[0]) + '">' + s[1] +
          (s[0] ? '<span class="n">' + zahl(function (m) { return status(m.id) === s[0]; }) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    var gezeigt = 0;
    BEREICHE.forEach(function (b) {
      if (filter.bereich && filter.bereich !== b.id) { return; }
      var l = MODULE.filter(function (m) { return m.bereich === b.id && (!filter.stand || status(m.id) === filter.stand); });
      if (!l.length) { return; }
      gezeigt += l.length;
      h += '<section class="abschnitt"><h2>' + esc(b.name) + '</h2><p class="unter" style="margin:-6px 0 12px">' + esc(b.text) + '</p><div class="gitter">' + l.map(modulKarte).join('') + '</div></section>';
    });
    if (!gezeigt) { h += '<div class="leer" style="margin-top:24px">Keine Module mit diesem Filter.</div>'; }
    zeigen(h + fussnote());
  }

  /* =====================================================================
     Lesen
     ===================================================================== */
  var BOX = {
    merke: ['Merke', 'birne'], fall: ['Fallbeispiel', 'person'], tun: ['Was hilft', 'haken'], lassen: ['Was eher schadet', 'x'],
    weiter: ['Wann Unterstützung holen', 'leute'], achtung: ['Achtung', 'warn'], abgrenzung: ['Was ähnlich aussieht', 'vergleich'], liste: ['', 'liste']
  };
  function blockHtml(b) {
    var t = BOX[b.art] || ['', ''];
    var kopf = function (titel, ic) { return titel ? '<h3>' + svg(ic) + esc(titel) + '</h3>' : ''; };
    switch (b.art) {
      case 'text': return absaetze(b.text);
      case 'merke': case 'weiter': case 'achtung':
        return '<div class="box ' + b.art + '"' + (b.art === 'achtung' ? ' role="note"' : '') + '>' + kopf(b.titel || t[0], t[1]) + absaetze(b.text) + '</div>';
      case 'fall':
        return '<div class="box fall">' + kopf('Fallbeispiel', 'person') + '<p class="fall-titel">' + esc(b.titel) + '</p>' + absaetze(b.text) +
          (b.fragen && b.fragen.length ? '<div class="fragen"><b>Zum Nachdenken</b><ul>' + b.fragen.map(function (f) { return '<li>' + inline(f) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
      case 'liste': case 'tun': case 'lassen':
        return '<div class="box ' + b.art + '">' + kopf(b.titel || t[0], t[1]) + '<ul>' + (b.punkte || []).map(function (p) { return '<li>' + inline(p) + '</li>'; }).join('') + '</ul></div>';
      case 'tabelle':
        return '<div class="tabelle-wrap" role="region" aria-label="' + esc(b.titel || 'Tabelle') + '" tabindex="0"><table>' + (b.titel ? '<caption>' + esc(b.titel) + '</caption>' : '') +
          '<thead><tr>' + b.spalten.map(function (s) { return '<th scope="col">' + inline(s) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          b.zeilen.map(function (z) { return '<tr>' + z.map(function (c, i) { return i === 0 ? '<th scope="row" style="background:none;border-bottom:0;border-top:1px solid var(--line)">' + inline(c) + '</th>' : '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>';
      case 'mythos':
        return '<div class="box mythos"><div><h3>' + svg('waage') + 'Verbreitete Annahme</h3><p>' + inline(b.mythos) + '</p></div><div><h3>' + svg('haken') + 'Was stimmt</h3>' + absaetze(b.fakt) + '</div></div>';
      case 'abgrenzung':
        return '<div class="box abgrenzung">' + kopf(b.titel || t[0], t[1]) + '<dl>' + (b.punkte || []).map(function (p) { return '<div><dt>' + inline(p.wie) + '</dt><dd>' + inline(p.unterschied) + '</dd></div>'; }).join('') + '</dl></div>';
      default: return '';
    }
  }
  /* Fachbegriffe des Moduls beim ersten Vorkommen im Kapitel antippbar machen */
  function begriffeMarkieren(html, m) {
    var gl = (m.glossar || []).map(function (g, i) {
      var varianten = [g.begriff, g.begriff.replace(/\s*\([^)]*\)\s*$/, '')].filter(function (v, j, a) { return v.length > 2 && a.indexOf(v) === j; });
      return { i: i, re: varianten.map(function (v) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }) };
    }).sort(function (a, b) { return b.re[0].length - a.re[0].length; });
    var fertig = {};
    var teile = html.split(/(<[^>]+>)/);
    var inHeading = 0, inButton = 0;
    for (var t = 0; t < teile.length; t++) {
      var s = teile[t];
      if (s.charAt(0) === '<') {
        if (/^<(h3|th|button|caption)\b/i.test(s)) { inHeading++; } else if (/^<\/(h3|th|button|caption)>/i.test(s)) { inHeading = Math.max(0, inHeading - 1); }
        continue;
      }
      if (inHeading || inButton || !s.trim()) { continue; }
      for (var g = 0; g < gl.length; g++) {
        if (fertig[gl[g].i]) { continue; }
        var re = new RegExp('(^|[^\\p{L}\\p{N}])(' + gl[g].re.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'iu');
        var mm = re.exec(s);
        if (mm) {
          var start = mm.index + mm[1].length, ende = start + mm[2].length;
          s = s.slice(0, start) + '\u0000' + gl[g].i + '\u0001' + s.slice(start, ende) + '\u0002' + s.slice(ende);
          fertig[gl[g].i] = true;
        }
      }
      teile[t] = s.replace(/\u0000(\d+)\u0001([^\u0002]*)\u0002/g, function (_, i, w) {
        return '<button type="button" class="begriff" data-begriff="' + m.id + '#' + i + '" aria-haspopup="dialog">' + w + '</button>';
      });
    }
    return teile.join('');
  }
  function tocHtml(m, akt) {
    var z = ST.module[m.id] || {};
    return '<nav class="toc keindruck" aria-label="Inhalt des Moduls"><h2>Inhalt</h2><ol>' + m.kapitel.map(function (k, i) {
      var n = i + 1, ok = gelesen(m.id, n);
      return '<li><button type="button" data-geh="#/modul/' + m.id + '/' + n + '"' + (akt === n ? ' aria-current="true"' : '') + '><span class="nr' + (ok ? ' ok' : '') + '">' + (ok ? svg('haken') : n) + '</span><span>' + esc(k.titel) + '</span></button></li>';
    }).join('') + '<li class="trenner" aria-hidden="true"></li>' +
      '<li><button type="button" data-geh="#/quiz/' + m.id + '"><span class="nr quiznr' + (z.bestanden ? ' ok' : '') + '">' + svg(z.bestanden ? 'haken' : 'frage') + '</span><span>Abschlussquiz' + (besterWert(m.id) != null ? ' <small style="color:var(--muted)">· beste ' + besterWert(m.id) + ' %</small>' : '') + '</span></button></li>' +
      '<li><button type="button" data-geh="#/modul/' + m.id + '/ende"' + (akt === 'ende' ? ' aria-current="true"' : '') + '><span class="nr">' + svg('buch') + '</span><span>Begriffe, Quellen, Material</span></button></li></ol>' +
      '<div class="toc-fort">' + Math.round(anteil(m) * 100) + ' % erledigt<div class="balken" aria-hidden="true" style="--bc:var(--b-' + m.bereich + ')"><span style="width:' + Math.round(anteil(m) * 100) + '%"></span></div></div></nav>';
  }
  function modulKopf(m, voll) {
    var b = BEREICH[m.bereich] || { name: m.bereich };
    if (!voll) {
      return '<div class="kap-kopf"><a href="#/modul/' + m.id + '">' + esc(m.titel) + '</a><span>' + esc(b.name) + ' · ' + statusChip(m.id) + '</span></div>';
    }
    return '<header class="modul-kopf" style="--bc:var(--b-' + m.bereich + ')"><span class="eyebrow" style="color:var(--b-' + m.bereich + ')">' + esc(b.name) + '</span>' +
      '<h1>' + esc(m.titel) + '</h1><p class="unter">' + esc(m.untertitel || '') + '</p>' +
      '<div class="meta"><span>' + svg('uhr') + 'etwa ' + m.dauer + ' Minuten</span><span>' + svg('buch') + woerter(m.kapitel.length, 'Kapitel', 'Kapitel') + '</span><span>' + svg('frage') + woerter(m.quiz.length, 'Quizfrage', 'Quizfragen') + '</span><span>' + statusChip(m.id) + '</span></div>' +
      '<div class="lernziele"><h2>Lernziele</h2><ul>' + m.lernziele.map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul></div></header>';
  }
  function seiteModul(id, teil) {
    var m = MOD[id];
    if (!m) { return seiteFehlt(); }
    var z = mz(id);
    if (!z.besucht) { z.besucht = heute(); }
    if (teil === 'ende') {
      ST.zuletzt = { m: id, k: m.kapitel.length }; stSpeichern();
      return seiteModulEnde(m);
    }
    var n = Math.max(1, Math.min(m.kapitel.length, parseInt(teil, 10) || 1));
    ST.zuletzt = { m: id, k: n }; stSpeichern();
    var k = m.kapitel[n - 1];
    var inhalt = begriffeMarkieren(k.bloecke.map(blockHtml).join(''), m);
    var naechst = n < m.kapitel.length ? m.kapitel[n] : null;
    var h = '<div class="modul"><div>' + tocHtml(m, n) + '</div><article class="lesen">' +
      modulKopf(m, n === 1) +
      (n === 1 ? '' : '<h1 class="sr">' + esc(m.titel) + '</h1>') +
      '<h2 class="kap" id="kap">' + (m.kapitel.length > 1 ? '<span style="color:var(--faint);font-weight:700">' + n + '&thinsp;/&thinsp;' + m.kapitel.length + '</span> ' : '') + esc(k.titel) + '</h2>' + inhalt +
      '<div class="kap-fuss keindruck">' + (n > 1 ? '<a class="btn btn-leise" href="#/modul/' + id + '/' + (n - 1) + '">' + svg('links') + 'Zurück</a>' : '<span></span>') +
      (naechst ? '<button type="button" class="btn btn-primaer" data-gelesen="' + n + '" data-geh="#/modul/' + id + '/' + (n + 1) + '">Weiter: ' + esc(naechst.titel) + svg('rechts') + '</button>'
        : '<button type="button" class="btn btn-primaer" data-gelesen="' + n + '" data-geh="#/quiz/' + id + '">' + (z.bestanden ? 'Quiz noch einmal' : 'Zum Abschlussquiz') + svg('rechts') + '</button>') +
      '</div></article></div>';
    zeigen(h);
  }
  function seiteModulEnde(m) {
    var z = mz(m.id);
    var blaetter = (m.toolbox || []).filter(function (id) { return TB[id]; });
    var h = '<div class="modul"><div>' + tocHtml(m, 'ende') + '</div><article class="lesen">' + modulKopf(m, false) +
      '<h1 class="kap" style="font-family:var(--font-display);font-weight:800;font-size:24px;margin:24px 0 12px">Begriffe, Quellen, Material</h1>' +
      '<div class="modul-ende">' +
      (z.bestanden ? '<div class="box merke"><h3>' + svg('medaille') + 'Bestanden</h3><p>Am ' + datumDe(z.bestanden) + ' mit ' + besterWert(m.id) + ' % – die Fragen kommen zur Festigung in Ihre Lernkartei.</p></div>'
        : '<div class="karte" style="flex-direction:row;align-items:center;gap:14px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><h3>Abschlussquiz</h3><p>' + woerter(m.quiz.length, 'Frage', 'Fragen') + ', bestanden ab 80 %. Sie sehen nach jeder Antwort die Begründung.</p></div><a class="btn btn-primaer" href="#/quiz/' + m.id + '">Quiz starten' + svg('rechts') + '</a></div>') +
      (m.glossar && m.glossar.length ? '<section><h2 style="font-family:var(--font-display);font-size:19px;margin:10px 0">Fachbegriffe</h2><dl class="glossar">' + m.glossar.map(function (g) { return '<div class="eintrag"><dt>' + esc(g.begriff) + '</dt><dd>' + inline(g.erklaerung) + '</dd></div>'; }).join('') + '</dl></section>' : '') +
      (blaetter.length ? '<section><h2 style="font-family:var(--font-display);font-size:19px;margin:10px 0">Passende Arbeitsblätter in der Toolbox</h2><ul class="verweise">' + blaetter.map(function (id) {
        var b = TB[id];
        return '<li><a href="toolbox.html#blatt=' + encodeURIComponent(id) + '" target="cdse-toolbox" rel="noopener"><span class="nr">' + esc(b.nr) + '</span>' + esc(b.titel) + '<small>' + esc(b.stufen || '') + '</small></a></li>';
      }).join('') + '</ul></section>' : '') +
      ((m.verwandt || []).filter(function (id) { return MOD[id]; }).length ? '<section><h2 style="font-family:var(--font-display);font-size:19px;margin:10px 0">Verwandte Module</h2><ul class="verweise">' + m.verwandt.filter(function (id) { return MOD[id]; }).map(function (id) {
        return '<li><a href="#/modul/' + id + '">' + esc(MOD[id].titel) + '<small>' + STATUS_TEXT[status(id)] + '</small></a></li>';
      }).join('') + '</ul></section>' : '') +
      '<section class="notiz"><h2 style="font-family:var(--font-display);font-size:19px;margin:10px 0">Meine Notizen</h2><label class="sr" for="notiz">Meine Notizen zu diesem Modul</label>' +
      '<textarea id="notiz" data-notiz="' + m.id + '" placeholder="Was nehme ich mit? Was probiere ich aus? (nur für Sie sichtbar)">' + esc(z.notiz || '') + '</textarea></section>' +
      '<section><h2 style="font-family:var(--font-display);font-size:19px;margin:10px 0">Quellen</h2><ol class="quellen">' + (m.quellen || []).map(function (k) { return '<li>' + esc(Q[k] || k) + '</li>'; }).join('') + '</ol></section>' +
      '</div></article></div>';
    zeigen(h);
  }

  /* ---------- Fachbegriff-Fenster ---------- */
  var pop = null;
  function popZu() { if (pop) { pop.remove(); pop = null; } }
  function popAuf(knopf) {
    popZu();
    var p = knopf.getAttribute('data-begriff').split('#'), m = MOD[p[0]], g = m && m.glossar[+p[1]];
    if (!g) { return; }
    pop = document.createElement('div');
    pop.className = 'pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', g.begriff);
    pop.innerHTML = '<b>' + esc(g.begriff) + '</b>' + inline(g.erklaerung) + '<br><button type="button" class="btn btn-leise" data-geh="#/glossar?q=' + encodeURIComponent(g.begriff) + '">Im Glossar</button>';
    document.body.appendChild(pop);
    var r = knopf.getBoundingClientRect(), w = pop.offsetWidth;
    var links = Math.max(16, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - w - 16));
    pop.style.left = links + 'px';
    pop.style.top = (window.scrollY + r.bottom + 8) + 'px';
    pop.__knopf = knopf;
  }

  /* =====================================================================
     Quiz (Abschlussquiz und Wiederholen benutzen dieselbe Ansicht)
     ===================================================================== */
  var QZ = null;
  function quizStarten(m) {
    QZ = { modus: 'quiz', m: m, fragen: m.quiz.map(function (f, i) { return { m: m, i: i, f: f, ordnung: f.optionen ? f.optionen.map(function (_, j) { return j; }) : null }; }), pos: 0, wahl: [], geprueft: false, ergebnis: [] };
  }
  function wiederholungStarten() {
    var keys = faellig().slice(0, PRO_RUNDE);
    QZ = { modus: 'wdh', fragen: keys.map(function (k) { var c = karteVon(k); c.key = k; c.ordnung = c.f.optionen ? mischen(c.f.optionen.map(function (_, j) { return j; })) : null; return c; }), pos: 0, wahl: [], geprueft: false, ergebnis: [] };
  }
  function optionen(x) {
    if (x.f.art === 'richtigfalsch') { return [{ j: 0, t: 'Richtig' }, { j: 1, t: 'Falsch' }]; }
    return x.ordnung.map(function (j) { return { j: j, t: x.f.optionen[j] }; });
  }
  function istRichtig(x, wahl) {
    var r = x.f.richtig.slice().sort(), w = wahl.slice().sort();
    return r.length === w.length && r.every(function (v, i) { return v === w[i]; });
  }
  function quizHtml() {
    var x = QZ.fragen[QZ.pos], f = x.f, n = QZ.fragen.length, mehr = f.art === 'mehrfach';
    var kopfTitel = QZ.modus === 'quiz' ? esc(QZ.m.titel) : 'Wiederholen · ' + esc(x.m.titel);
    var h = '<div class="quiz"><div class="quiz-kopf"><div><span class="eyebrow">' + kopfTitel + '</span><h1 class="sr">' + (QZ.modus === 'quiz' ? 'Abschlussquiz ' + esc(QZ.m.titel) : 'Wiederholen') + '</h1></div>' +
      '<span style="font-size:13.5px;color:var(--muted);font-weight:600">Frage ' + (QZ.pos + 1) + ' von ' + n + '</span></div>' +
      '<div class="balken" style="margin-top:10px" aria-hidden="true"><span style="width:' + Math.round(QZ.pos / n * 100) + '%"></span></div>' +
      '<div class="quiz-karte">' +
      (f.art === 'fall' && f.fall ? '<div class="quiz-fall"><b style="display:block;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);margin-bottom:4px">Situation</b>' + inline(f.fall) + '</div>' : '') +
      (f.art === 'richtigfalsch' ? '<p class="aussage">Stimmt diese Aussage?</p>' : '') +
      '<h2 class="quiz-frage" id="frage">' + inline(f.frage) + '</h2>' +
      (mehr ? '<p class="quiz-hinweis">Mehrere Antworten sind richtig – wählen Sie alle aus.</p>' : '') +
      '<div class="optionen" role="group" aria-labelledby="frage">' + optionen(x).map(function (o, k) {
        var an = QZ.wahl.indexOf(o.j) >= 0, kl = 'option' + (mehr ? ' mehrfach' : '');
        if (QZ.geprueft) { kl += f.richtig.indexOf(o.j) >= 0 ? ' richtig' : (an ? ' falsch' : ''); }
        return '<button type="button" class="' + kl + '" data-option="' + o.j + '" aria-pressed="' + an + '"' + (QZ.geprueft ? ' disabled' : '') + '><span class="marker" aria-hidden="true">' +
          (QZ.geprueft && f.richtig.indexOf(o.j) >= 0 ? svg('haken') : (QZ.geprueft && an ? svg('x') : String.fromCharCode(65 + k))) + '</span><span>' + inline(o.t) + '</span></button>';
      }).join('') + '</div>';
    if (QZ.geprueft) {
      var ok = QZ.ergebnis[QZ.pos];
      h += '<div class="rueck ' + (ok ? 'gut' : 'schlecht') + '" role="status"><b>' + (ok ? 'Richtig.' : (mehr ? 'Nicht ganz – richtig sind die grün markierten Antworten.' : 'Nicht ganz.')) + '</b>' + inline(f.erklaerung) + '</div>';
    }
    h += '<div class="quiz-fuss">' + (QZ.modus === 'quiz' && !QZ.geprueft ? '<a class="btn btn-leise" href="#/modul/' + QZ.m.id + '">Abbrechen</a>' : '') +
      (QZ.geprueft ? '<button type="button" class="btn btn-primaer" data-quiz="weiter">' + (QZ.pos + 1 < n ? 'Nächste Frage' : 'Ergebnis ansehen') + svg('rechts') + '</button>'
        : '<button type="button" class="btn btn-primaer" data-quiz="pruefen"' + (QZ.wahl.length ? '' : ' disabled') + '>Antwort prüfen</button>') + '</div></div></div>';
    return h;
  }
  function quizZeigen(fokus) {
    zeigen(quizHtml(), fokus);
    if (fokus === false) {
      var z = el.querySelector(QZ.geprueft ? '[data-quiz="weiter"]' : '[data-option]');
      if (z) { z.focus(); }
    }
  }
  function quizPruefen() {
    var x = QZ.fragen[QZ.pos], ok = istRichtig(x, QZ.wahl);
    QZ.ergebnis[QZ.pos] = ok;
    QZ.geprueft = true;
    if (QZ.modus === 'wdh') {
      var alt = ST.karten[x.key] || { fach: 1 };
      if (ok) { var fach = Math.min(5, alt.fach + 1); karteSetzen(x.key, fach, INTERVALL[fach]); } else { karteSetzen(x.key, 1, 1); }
      stSpeichern();
    }
    quizZeigen(false);
  }
  function quizWeiter() {
    if (QZ.pos + 1 < QZ.fragen.length) { QZ.pos++; QZ.wahl = []; QZ.geprueft = false; quizZeigen(false); return; }
    if (QZ.modus === 'quiz') { quizAuswerten(); } else { wdhAuswerten(); }
  }
  function quizAuswerten() {
    var m = QZ.m, z = mz(m.id), n = QZ.fragen.length, r = QZ.ergebnis.filter(Boolean).length, p = Math.round(r / n * 100);
    var neuBestanden = p >= BESTEHEN * 100 && !z.bestanden;
    z.versuche.push({ d: heute(), p: p });
    if (p >= BESTEHEN * 100 && !z.bestanden) { z.bestanden = heute(); }
    /* Lernkartei: falsche Antworten morgen wieder, nach dem Bestehen alle Fragen zur Festigung */
    QZ.fragen.forEach(function (x, i) {
      var key = kartenKey(m.id, x.i);
      if (!QZ.ergebnis[i]) { karteSetzen(key, 1, 1); }
      else if (z.bestanden && !ST.karten[key]) { karteSetzen(key, 2, INTERVALL[2]); }
    });
    stSpeichern();
    var gut = p >= BESTEHEN * 100;
    var h = '<div class="quiz"><div class="quiz-karte ergebnis' + (gut ? ' gut' : '') + '">' + (gut ? '<span class="medaille">' + svg('medaille') + '</span>' : '') +
      '<p class="eyebrow" style="color:var(--muted);margin-top:12px">' + esc(m.titel) + '</p><h1 class="gross">' + p + ' %</h1>' +
      '<p style="font-size:16px;margin:0 auto;max-width:520px">' + r + ' von ' + n + ' Fragen richtig. ' +
      (gut ? (neuBestanden ? 'Bestanden – das Modul ist abgeschlossen. Die Fragen kommen zur Festigung in Ihre Lernkartei.' : 'Bestanden.') : 'Für das Bestehen braucht es 80 %. Die falsch beantworteten Fragen kommen in Ihre Lernkartei – schauen Sie sich die Kapitel dazu noch einmal an.') + '</p>' +
      '<ol class="auswertung">' + QZ.fragen.map(function (x, i) {
        var ok = QZ.ergebnis[i];
        return '<li class="' + (ok ? 'ok' : 'nein') + '">' + svg(ok ? 'haken' : 'x') + '<div>' + inline(x.f.frage) + (ok ? '' : '<details><summary>Begründung</summary>' + inline(x.f.erklaerung) + '</details>') + '</div></li>';
      }).join('') + '</ol>' +
      '<div class="aktionen" style="justify-content:center">' + (gut ? '' : '<a class="btn btn-primaer" href="#/modul/' + m.id + '/1">Kapitel noch einmal lesen</a>') +
      '<button type="button" class="btn" data-quiz="neu">' + svg('wdh') + 'Quiz wiederholen</button><a class="btn' + (gut ? ' btn-primaer' : '') + '" href="#/modul/' + m.id + '/ende">Begriffe, Quellen, Material</a><a class="btn btn-leise" href="#/module">Zu den Modulen</a></div></div></div>';
    QZ = null;
    reiterNeu('quiz');
    zeigen(h);
  }
  function wdhAuswerten() {
    var n = QZ.fragen.length, r = QZ.ergebnis.filter(Boolean).length, rest = faellig().length;
    var h = '<div class="quiz"><div class="quiz-karte ergebnis' + (r === n ? ' gut' : '') + '"><p class="eyebrow" style="color:var(--muted)">Wiederholung</p><h1 class="gross">' + r + ' / ' + n + '</h1>' +
      '<p style="font-size:16px">' + (r === n ? 'Alles gewusst. ' : '') + 'Gewusste Fragen wandern ein Fach weiter und kommen später wieder; die anderen morgen.' + (rest ? ' Heute sind noch ' + woerter(rest, 'Frage', 'Fragen') + ' fällig.' : '') + '</p>' +
      '<div class="aktionen" style="justify-content:center">' + (rest ? '<button type="button" class="btn btn-primaer" data-wdh="start">Weiter wiederholen</button>' : '') + '<a class="btn" href="#/">Zur Übersicht</a></div></div></div>';
    QZ = null;
    reiterNeu('wiederholen');
    zeigen(h);
  }
  function seiteQuiz(id) {
    var m = MOD[id];
    if (!m) { return seiteFehlt(); }
    if (!QZ || QZ.modus !== 'quiz' || QZ.m !== m) { quizStarten(m); }
    quizZeigen();
  }

  /* =====================================================================
     Wiederholen (Lernkartei)
     ===================================================================== */
  function seiteWiederholen() {
    if (QZ && QZ.modus === 'wdh') { quizZeigen(); return; }
    var f = faellig(), faecher = [0, 0, 0, 0, 0], alle = Object.keys(ST.karten).filter(karteVon);
    alle.forEach(function (k) { faecher[Math.max(1, Math.min(5, ST.karten[k].fach)) - 1]++; });
    var naechster = alle.map(function (k) { return ST.karten[k].faellig; }).filter(function (d) { return d > heute(); }).sort()[0];
    var h = '<h1 class="seite">Wiederholen</h1><p class="unter">Ihre Lernkartei: Fragen, die Sie falsch beantwortet haben, kommen am nächsten Tag wieder; gewusste Fragen rücken ein Fach weiter und kommen nach 3, 7, 16 und 35 Tagen noch einmal. So bleibt Wissen hängen.</p>';
    if (f.length) {
      h += '<div class="karte" style="margin-top:20px;flex-direction:row;align-items:center;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>' + woerter(f.length, 'Frage ist', 'Fragen sind') + ' heute fällig</h3><p>Eine Runde hat höchstens ' + PRO_RUNDE + ' Fragen – etwa fünf Minuten.</p></div>' +
        '<button type="button" class="btn btn-primaer" data-wdh="start">' + svg('wdh') + 'Wiederholung starten</button></div>';
    } else {
      h += '<div class="leer" style="margin-top:20px">' + (alle.length ? 'Heute ist nichts fällig.' + (naechster ? ' Die nächsten Fragen kommen am ' + datumDe(naechster) + '.' : '') : 'Noch keine Fragen in der Lernkartei. Sie füllt sich, sobald Sie ein Abschlussquiz machen.') + '</div>';
    }
    if (alle.length) {
      h += '<section class="abschnitt"><h2>Fächer der Lernkartei</h2><div class="faecher">' + faecher.map(function (n, i) {
        return '<div class="fach"><b>' + n + '</b><span>Fach ' + (i + 1) + (i ? ' · ' + INTERVALL[i + 1] + ' Tage' : ' · morgen') + '</span></div>';
      }).join('') + '</div></section>';
    }
    zeigen(h + fussnote());
  }

  /* =====================================================================
     Glossar
     ===================================================================== */
  function seiteGlossar(q) {
    var such = q.q || '';
    var n = norm(such);
    var l = GLOSSAR.filter(function (g) { return !n || norm(g.begriff).indexOf(n) >= 0 || norm(g.erklaerung).indexOf(n) >= 0; });
    var h = '<h1 class="seite">Glossar</h1><p class="unter">' + GLOSSAR.length + ' Fachbegriffe aus allen Modulen, kurz erklärt.</p>' +
      '<label class="suche" style="margin:16px 0 0;max-width:420px">' + svg('suche') + '<span class="sr">Im Glossar suchen</span><input type="search" id="glossar-suche" value="' + esc(such) + '" placeholder="Begriff suchen" autocomplete="off"></label><div id="glossar-liste">' + glossarListe(l) + '</div>';
    zeigen(h + fussnote());
  }
  function glossarListe(l) {
    if (!l.length) { return '<div class="leer" style="margin-top:18px">Kein Begriff gefunden.</div>'; }
    var h = '', buchst = '';
    l.forEach(function (g) {
      var b = norm(g.begriff).charAt(0).toUpperCase();
      if (!/[A-Z]/.test(b)) { b = '#'; }
      if (b !== buchst) { if (buchst) { h += '</dl>'; } buchst = b; h += '<h2 class="buchstabe">' + b + '</h2><dl class="glossar">'; }
      h += '<div class="eintrag"><dt>' + esc(g.begriff) + '</dt><dd>' + inline(g.erklaerung) + '</dd><dd style="margin-top:6px;font-size:13px;color:var(--muted)">Aus: ' +
        g.module.map(function (id) { return '<a href="#/modul/' + id + '">' + esc(MOD[id].titel) + '</a>'; }).join(', ') + '</dd></div>';
    });
    return h + '</dl>';
  }

  /* =====================================================================
     Lernpfade und Teilnahmebestätigung
     ===================================================================== */
  function seitePfad(id) {
    var p = PFADE.filter(function (x) { return x.id === id; })[0];
    if (!p) { return seiteFehlt(); }
    var s = pfadStand(p);
    var h = '<p class="eyebrow" style="color:var(--accent)">Lernpfad</p><h1 class="seite">' + esc(p.name) + '</h1><p class="unter">' + esc(p.text) + ' ' + woerter(s.ids.length, 'Modul', 'Module') + ', zusammen etwa ' +
      s.ids.reduce(function (a, i) { return a + (MOD[i].dauer || 0); }, 0) + ' Minuten. Die Reihenfolge ist ein Vorschlag.</p>' +
      '<div class="balken" style="margin-top:14px;max-width:420px" aria-hidden="true"><span style="width:' + Math.round(s.ok / Math.max(1, s.ids.length) * 100) + '%"></span></div>' +
      '<p style="font-size:13.5px;color:var(--muted);margin:6px 0 0">' + s.ok + ' von ' + s.ids.length + ' bestanden</p>' +
      '<ol class="pfad-liste">' + s.ids.map(function (mid, i) {
        var m = MOD[mid], ok = bestanden(mid);
        return '<li><a href="#/modul/' + mid + '"><span class="schritt' + (ok ? ' ok' : '') + '">' + (ok ? svg('haken') : i + 1) + '</span><span><b>' + esc(m.titel) + '</b><small>' + esc(m.untertitel || '') + '</small></span>' + statusChip(mid) + '</a></li>';
      }).join('') + '</ol>' +
      '<div class="aktionen">' + (s.fertig ? '<a class="btn btn-primaer" href="#/bestaetigung/' + p.id + '">' + svg('medaille') + 'Teilnahmebestätigung</a>'
        : '<span class="hinweis">Die Teilnahmebestätigung gibt es, sobald alle Module dieses Pfads bestanden sind.</span>') + '</div>';
    zeigen(h + fussnote());
  }
  function seiteBestaetigung(id) {
    var p = PFADE.filter(function (x) { return x.id === id; })[0];
    if (!p) { return seiteFehlt(); }
    var s = pfadStand(p);
    if (!s.fertig) { location.hash = '#/pfad/' + id; return; }
    var name = (nutzer() || {}).name || ST.name || '';
    var h = '<div class="aktionen keindruck" style="justify-content:center;margin-top:0"><a class="btn btn-leise" href="#/pfad/' + id + '">' + svg('links') + 'Zurück</a><button type="button" class="btn btn-primaer" data-aktion="drucken">' + svg('druck') + 'Drucken oder als PDF speichern</button></div>' +
      (name ? '' : '<div class="namensfeld keindruck"><label for="urkunde-name">Name für die Bestätigung</label><input id="urkunde-name" value="' + esc(ST.name || '') + '" autocomplete="name"></div>') +
      '<div class="urkunde"><p class="eyebrow">CDSE · Lernen</p><h1>Teilnahmebestätigung</h1><p class="text"><b id="urkunde-wer">' + esc(name || '…') + '</b> hat den Lernpfad <b>„' + esc(p.name) + '“</b> vollständig bearbeitet und die Abschlussquizze aller Module bestanden (jeweils mindestens 80 %).</p>' +
      '<table><thead><tr><th style="text-align:left;padding:5px 12px">Modul</th><th style="text-align:left;padding:5px 12px">bestanden am</th><th style="text-align:left;padding:5px 12px">Ergebnis</th></tr></thead><tbody>' + s.ids.map(function (mid) {
        var z = ST.module[mid] || {};
        return '<tr><td>' + esc(MOD[mid].titel) + '</td><td>' + datumDe(z.bestanden) + '</td><td>' + (besterWert(mid) || '') + ' %</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="unterschrift"><div>Ausgestellt am ' + datumDe(heute()) + '</div><div>Unterschrift (Leitung)</div></div>' +
      '<p class="klein">Selbstlernangebot des CDSE mit Wissensüberprüfung. Keine zertifizierte Fort- oder Weiterbildung.</p></div>';
    zeigen(h);
  }

  /* =====================================================================
     Suche
     ===================================================================== */
  var SUCHTEXT = null;
  function suchtextBauen() {
    SUCHTEXT = [];
    MODULE.forEach(function (m) {
      m.kapitel.forEach(function (k, i) {
        var teile = [];
        k.bloecke.forEach(function (b) {
          ['text', 'titel', 'mythos', 'fakt'].forEach(function (f) { if (b[f]) { teile.push(klartext(b[f])); } });
          (b.punkte || []).forEach(function (p) { teile.push(typeof p === 'string' ? klartext(p) : klartext(p.wie + ' – ' + p.unterschied)); });
          (b.fragen || []).forEach(function (p) { teile.push(klartext(p)); });
          if (b.zeilen) { b.zeilen.forEach(function (z) { teile.push(z.map(klartext).join(' · ')); }); }
        });
        var t = teile.join(' ');
        SUCHTEXT.push({ m: m, k: i + 1, titel: k.titel, text: t, n: norm(t) });
      });
    });
  }
  function ausschnitt(t, n, q) {
    var i = n.indexOf(q);
    if (i < 0) { return esc(t.slice(0, 160)) + '…'; }
    var a = Math.max(0, i - 70), b = Math.min(t.length, i + q.length + 110);
    return (a ? '…' : '') + esc(t.slice(a, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length, b)) + (b < t.length ? '…' : '');
  }
  function seiteSuche(q) {
    var such = (q.q || '').trim(), n = norm(such);
    if (!SUCHTEXT) { suchtextBauen(); }
    var h = '<h1 class="seite">Suche</h1>';
    if (n.length < 2) { zeigen(h + '<p class="unter">Mindestens zwei Buchstaben eingeben.</p>'); return; }
    var mods = MODULE.filter(function (m) { return norm(m.titel + ' ' + m.untertitel + ' ' + m.lernziele.join(' ')).indexOf(n) >= 0; });
    var kaps = SUCHTEXT.filter(function (s) { return s.n.indexOf(n) >= 0 || norm(s.titel).indexOf(n) >= 0; }).slice(0, 30);
    var begr = GLOSSAR.filter(function (g) { return norm(g.begriff).indexOf(n) >= 0; }).slice(0, 12);
    h += '<p class="unter">„' + esc(such) + '“: ' + woerter(mods.length, 'Modul', 'Module') + ', ' + woerter(kaps.length, 'Kapitel', 'Kapitel') + ', ' + woerter(begr.length, 'Begriff', 'Begriffe') + '.</p>';
    if (mods.length) { h += '<section class="abschnitt"><h2>Module</h2><div class="gitter">' + mods.map(modulKarte).join('') + '</div></section>'; }
    if (begr.length) {
      h += '<section class="abschnitt"><h2>Fachbegriffe</h2><dl class="glossar">' + begr.map(function (g) {
        return '<div class="eintrag"><dt>' + esc(g.begriff) + '</dt><dd>' + inline(g.erklaerung) + '</dd></div>';
      }).join('') + '</dl></section>';
    }
    if (kaps.length) {
      h += '<section class="abschnitt"><h2>In den Kapiteln</h2><div class="treffer">' + kaps.map(function (s) {
        return '<a class="karte" href="#/modul/' + s.m.id + '/' + s.k + '"><span class="eyebrow" style="color:var(--b-' + s.m.bereich + ')">' + esc(s.m.titel) + ' · Kapitel ' + s.k + '</span><h3>' + esc(s.titel) + '</h3><p>' + ausschnitt(s.text, s.n, n) + '</p></a>';
      }).join('') + '</div></section>';
    }
    if (!mods.length && !kaps.length && !begr.length) { h += '<div class="leer" style="margin-top:18px">Nichts gefunden. Versuchen Sie ein anderes Wort.</div>'; }
    zeigen(h, false);
  }

  function seiteFehlt() {
    zeigen('<h1 class="seite">Nicht gefunden</h1><p class="unter">Dieses Modul oder diese Seite gibt es (nicht mehr).</p><div class="aktionen"><a class="btn btn-primaer" href="#/">Zur Übersicht</a></div>');
  }

  /* =====================================================================
     Router und Ereignisse
     ===================================================================== */
  function query(s) {
    var o = {};
    (s || '').split('&').forEach(function (p) { if (!p) { return; } var i = p.indexOf('='); o[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? '' : decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); });
    return o;
  }
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), pfad = qi < 0 ? h : h.slice(0, qi), q = query(qi < 0 ? '' : h.slice(qi + 1));
    var t = pfad.split('/').filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    var seite = t[0] || '';
    if (seite !== 'quiz' && QZ && QZ.modus === 'quiz') { QZ = null; }
    if (seite !== 'wiederholen' && QZ && QZ.modus === 'wdh') { QZ = null; }
    if (seite !== 'suche') { var si = document.getElementById('suche'); if (si && si.value) { si.value = ''; } }
    reiterNeu(seite);
    switch (seite) {
      case '': seiteUebersicht(); break;
      case 'module': seiteModule(q); break;
      case 'modul': seiteModul(t[1], t[2]); break;
      case 'quiz': seiteQuiz(t[1]); break;
      case 'wiederholen': seiteWiederholen(); break;
      case 'glossar': seiteGlossar(q); break;
      case 'pfad': seitePfad(t[1]); break;
      case 'bestaetigung': seiteBestaetigung(t[1]); break;
      case 'suche': seiteSuche(q); break;
      default: seiteFehlt();
    }
  }
  function geh(ziel) { if (location.hash === ziel) { route(); } else { location.hash = ziel; } }

  function ereignisse() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('button, a') : null;
      if (pop && (!t || !pop.contains(t)) && !(t && t.classList.contains('begriff'))) { popZu(); }
      if (!t) { return; }
      if (t.classList.contains('begriff')) { ev.preventDefault(); if (pop && pop.__knopf === t) { popZu(); } else { popAuf(t); } return; }
      if (t.hasAttribute('data-gelesen')) {
        var m = location.hash.match(/^#\/modul\/([^/]+)/);
        if (m && MOD[decodeURIComponent(m[1])]) { var z = mz(decodeURIComponent(m[1])), k = +t.getAttribute('data-gelesen'); if (z.gelesen.indexOf(k) < 0) { z.gelesen.push(k); z.gelesen.sort(function (a, b) { return a - b; }); stSpeichern(); } }
      }
      if (t.hasAttribute('data-geh')) { ev.preventDefault(); popZu(); geh(t.getAttribute('data-geh')); return; }
      if (t.hasAttribute('data-filter')) {
        filter[t.getAttribute('data-filter')] = t.getAttribute('data-wert');
        var fokus = t.getAttribute('data-filter') + '|' + t.getAttribute('data-wert');
        seiteModule({});
        var b = el.querySelector('[data-filter="' + fokus.split('|')[0] + '"][data-wert="' + fokus.split('|')[1] + '"]');
        if (b) { b.focus(); }
        return;
      }
      if (t.hasAttribute('data-option') && QZ && !QZ.geprueft) {
        var j = +t.getAttribute('data-option'), x = QZ.fragen[QZ.pos];
        if (x.f.art === 'mehrfach') { var i = QZ.wahl.indexOf(j); if (i >= 0) { QZ.wahl.splice(i, 1); } else { QZ.wahl.push(j); } }
        else { QZ.wahl = [j]; }
        Array.prototype.forEach.call(el.querySelectorAll('[data-option]'), function (o) { o.setAttribute('aria-pressed', String(QZ.wahl.indexOf(+o.getAttribute('data-option')) >= 0)); });
        var p = el.querySelector('[data-quiz="pruefen"]'); if (p) { p.disabled = !QZ.wahl.length; }
        return;
      }
      var q = t.getAttribute('data-quiz');
      if (q === 'pruefen' && QZ && QZ.wahl.length) { quizPruefen(); return; }
      if (q === 'weiter' && QZ) { quizWeiter(); return; }
      if (q === 'neu') { var mm = location.hash.match(/^#\/quiz\/([^/?]+)/); if (mm && MOD[decodeURIComponent(mm[1])]) { quizStarten(MOD[decodeURIComponent(mm[1])]); quizZeigen(); } return; }
      if (t.getAttribute('data-wdh') === 'start') { wiederholungStarten(); if (QZ.fragen.length) { if (location.hash !== '#/wiederholen') { location.hash = '#/wiederholen'; } else { quizZeigen(); } } return; }
      var a = t.getAttribute('data-aktion');
      if (a === 'drucken') { window.print(); return; }
      if (a === 'zuruecksetzen') {
        if (window.confirm('Den ganzen Lernstand löschen – gelesene Kapitel, Quizergebnisse, Lernkartei und Notizen? Das lässt sich nicht rückgängig machen.')) {
          ST = { v: 1, module: {}, karten: {}, zuletzt: null, name: '' }; stSpeichern(); geh('#/');
        }
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && pop) { var k = pop.__knopf; popZu(); if (k) { k.focus(); } return; }
      if (!QZ || !el.querySelector('.quiz-karte') || /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '')) { return; }
      if (ev.altKey || ev.ctrlKey || ev.metaKey) { return; }
      var z = /^[1-6]$/.test(ev.key) ? +ev.key - 1 : (/^[a-fA-F]$/.test(ev.key) ? ev.key.toLowerCase().charCodeAt(0) - 97 : -1);
      if (z >= 0 && !QZ.geprueft) { var o = el.querySelectorAll('[data-option]')[z]; if (o) { ev.preventDefault(); o.click(); o.focus(); } return; }
      if (ev.key === 'Enter' && !(ev.target && ev.target.closest && ev.target.closest('button[data-quiz], a'))) {
        var b = el.querySelector(QZ.geprueft ? '[data-quiz="weiter"]' : '[data-quiz="pruefen"]:not([disabled])');
        if (b) { ev.preventDefault(); b.click(); }
      }
    });
    var suchTimer = null;
    document.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'suche') {
        clearTimeout(suchTimer);
        suchTimer = setTimeout(function () {
          var v = t.value.trim();
          if (!v) { if (/^#\/suche/.test(location.hash)) { history.back(); } return; }
          var ziel = '#/suche?q=' + encodeURIComponent(v);
          if (/^#\/suche/.test(location.hash)) { history.replaceState(null, '', ziel); seiteSuche({ q: v }); } else { location.hash = ziel; }
          t.focus();
        }, 180);
      }
      if (t.id === 'glossar-suche') {
        var n = norm(t.value);
        document.getElementById('glossar-liste').innerHTML = glossarListe(GLOSSAR.filter(function (g) { return !n || norm(g.begriff).indexOf(n) >= 0 || norm(g.erklaerung).indexOf(n) >= 0; }));
      }
      if (t.hasAttribute('data-notiz')) { mz(t.getAttribute('data-notiz')).notiz = t.value; clearTimeout(t.__timer); t.__timer = setTimeout(stSpeichern, 400); }
      if (t.id === 'urkunde-name') { ST.name = t.value; var w = document.getElementById('urkunde-wer'); if (w) { w.textContent = t.value || '…'; } clearTimeout(t.__timer); t.__timer = setTimeout(stSpeichern, 400); }
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', popZu);
    /* Lernstand aus einem anderen Fenster (z. B. zweiter Tab) übernehmen */
    window.addEventListener('storage', function (ev) { if (ev.key === LS) { ST = stLaden(); if (!QZ) { route(); } } });
  }

  /* =====================================================================
     Start: eingebettete Module entpacken
     ===================================================================== */
  function entpacken() {
    var roh = document.getElementById('lern-daten');
    var b64 = roh ? roh.textContent.trim() : '';
    if (!b64) { return Promise.resolve(window.LERN_MODULE || []); }
    if (typeof DecompressionStream === 'undefined') { return Promise.reject(new Error('Dieser Browser kann die eingebetteten Module nicht entpacken. Bitte Edge oder Chrome in einer aktuellen Version benutzen.')); }
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(JSON.parse);
  }
  function start() {
    el = document.getElementById('app');
    ST = stLaden();
    entpacken().then(function (liste) {
      MODULE = (liste || []).filter(function (m) { return m && m.id && Array.isArray(m.kapitel) && Array.isArray(m.quiz); });
      var reihe = BEREICHE.map(function (b) { return b.id; });
      MODULE.sort(function (a, b) { return (reihe.indexOf(a.bereich) - reihe.indexOf(b.bereich)) || ((a.reihe || 99) - (b.reihe || 99)) || a.titel.localeCompare(b.titel, 'de'); });
      MODULE.forEach(function (m) { MOD[m.id] = m; });
      glossarBauen();
      ereignisse();
      route();
    }).catch(function (e) {
      el.innerHTML = '<div class="leer"><b>Die Lernmodule ließen sich nicht laden.</b><br>' + esc(e && e.message || e) + '</div>';
    });
  }
  window.CDSE_LERNEN = { stand: function () { return JSON.parse(JSON.stringify(ST)); }, module: function () { return MODULE.map(function (m) { return m.id; }); } };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();
