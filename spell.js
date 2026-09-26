/* Lëtzebuergesch Rechtschreibprüfung — offline.

   Der Browser bringt kein Luxemburgisch mit, also bringt die App es selbst:
   das offizielle Hunspell-Wörterbuch (spellchecker.lu, EUPL) und nspell als
   Prüfer. Beides steckt gepackt in der Datei und wird erst ausgepackt, wenn
   zum ersten Mal ein Textfeld angefasst wird — sonst würde jeder Start ohne
   Not eine Sekunde länger dauern.

   Unterstrichen wird mit einer zweiten Ebene hinter dem Schreibfeld: dort
   steht derselbe Text unsichtbar, nur die falschen Wörter tragen eine rote
   Wellenlinie. Das Schreibfeld selbst bleibt ein ganz normales Textfeld —
   kein Nachbau, also auch kein Ärger mit Cursor, Auswahl oder Einfügen.

   Ein Klick in ein unterstrichenes Wort öffnet die Vorschläge. Wer ein Wort
   für richtig hält, nimmt es ins eigene Wörterbuch auf; das bleibt auf dem
   Gerät und wird nicht mit dem Team geteilt. */
(function () {
  'use strict';

  var EIGEN_KEY = 'kb_spell_eigen';     // eigene Wörter
  var AN_KEY = 'kb_spell_an';           // ein/aus
  var MIN_LEN = 3;                      // kürzere Wörter lohnen nicht
  var MAX_VORSCHLAEGE = 6;

  var spell = null;                     // der Prüfer, sobald geladen
  var ladeLauf = null;                  // Versprechen während des Ladens
  var cache = Object.create(null);      // Wort -> richtig?
  var eigene = null;

  function an() { try { return localStorage.getItem(AN_KEY) !== '0'; } catch (e) { return true; } }
  function setAn(v) {
    try { localStorage.setItem(AN_KEY, v ? '1' : '0'); } catch (e) {}
    if (!v) alleAus(); else document.querySelectorAll('textarea').forEach(pruefeSpaeter);
  }
  function eigenListe() {
    if (eigene) return eigene;
    try {
      var roh = localStorage.getItem(EIGEN_KEY);
      /* ISA hat inzwischen eine eigene Liste; frueher teilte es sie mit dem
         Klassebuch - beim ersten Mal die alte uebernehmen. (Der Name steht
         absichtlich zerlegt da, damit der ISA-Bau ihn nicht umbenennt.) */
      var alt = 'kb_' + 'spell_eigen';
      if (roh === null && EIGEN_KEY !== alt) roh = localStorage.getItem(alt);
      eigene = JSON.parse(roh || '[]') || [];
    } catch (e) { eigene = []; }
    return eigene;
  }
  function eigenAdd(w) {
    var l = eigenListe();
    if (l.indexOf(w) < 0) { l.push(w); try { localStorage.setItem(EIGEN_KEY, JSON.stringify(l)); } catch (e) {} }
    cache[w] = true;
    if (spell && spell.add) { try { spell.add(w); } catch (e) {} }
  }

  /* ---- Wörterbuch auspacken und laden ---- */
  function b64bytes(s) {
    var roh = atob(s), n = roh.length, a = new Uint8Array(n);
    for (var i = 0; i < n; i++) a[i] = roh.charCodeAt(i);
    return a;
  }
  function entpacken(bytes) {
    if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('kein gzip'));
    var s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(s).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function laden() {
    if (spell) return Promise.resolve(spell);
    if (ladeLauf) return ladeLauf;
    var d = window.KB_SPELL_DATA;
    if (!d || !d.aff || !d.dic || typeof window.NSPELL !== 'function') return Promise.resolve(null);
    ladeLauf = Promise.all([entpacken(b64bytes(d.aff)), entpacken(b64bytes(d.dic))])
      .then(function (teile) {
        var td = new TextDecoder('utf-8');
        spell = window.NSPELL(td.decode(teile[0]), td.decode(teile[1]));
        eigenListe().forEach(function (w) { try { spell.add(w); } catch (e) {} });
        document.querySelectorAll('textarea').forEach(pruefeSpaeter);
        return spell;
      })
      .catch(function () { ladeLauf = null; return null; });
    return ladeLauf;
  }

  /* ---- Wörter ---- */
  /* Wortzeichen: Buchstaben inklusive Umlauten, dazu Apostroph und
     Bindestrich im Wortinneren (d'Kanner, Kanner-Grupp). */
  var WORT = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;
  var GROSS = /^[A-ZÀ-ÖØ-Þ]/;

  /* Was ausser dem Woerterbuch als richtig gilt. Ohne das war in echten
     Texten des Teams jedes sechste Wort unterstrichen - Namen, Abkuerzungen,
     franzoesische Fachwoerter, zusammengesetzte Woerter -, und die echten
     Fehler gingen darin unter. */
  var ZUSATZ = Object.create(null), VORNAMEN = Object.create(null);
  (function () {
    var z = window.KB_SPELL_ZUSATZ || {};
    String(z.fach || '').split(/\s+/).forEach(function (w) { if (w) ZUSATZ[w.toLowerCase()] = 1; });
    String(z.vornamen || '').split(/\s+/).forEach(function (w) { if (w) VORNAMEN[w.toLowerCase()] = 1; });
  })();
  /* Namen aus der eigenen Arbeit: Schueler, Team, bekannte Aerzte und
     Therapeuten, Helfernetz, aus Berichten gelernte Namen, Orte. Wird alle
     paar Sekunden neu eingesammelt - kommt ein Schueler dazu, gilt sein Name
     sofort. */
  var namenSet = Object.create(null), appVornamen = Object.create(null), namenZeit = 0, namenSig = '';
  /* Klein geschriebene Teile ("de", "la", "sur" in Jean de la Fontaine,
     Esch-sur-Alzette) sind keine Namen - sonst gaelte "De Blorfanek" als
     Vorname plus Nachname. */
  function namenAus(set, n, vorn) {
    String(n || '').split(/[\s.,;:()\/"«»]+/).forEach(function (t, i) {
      t = t.replace(/^['’]+|['’]+$/g, '');
      if (t.length < 2 || !GROSS.test(t)) return;
      set[t.toLowerCase()] = 1;
      if (t.indexOf('-') > 0) t.split('-').forEach(function (u) { if (u.length >= 2 && GROSS.test(u)) set[u.toLowerCase()] = 1; });
      if (vorn && i === 0) vorn[t.toLowerCase()] = 1;
    });
  }
  function namen() {
    var jetzt = Date.now();
    if (jetzt - namenZeit < 10000) return namenSet;
    namenZeit = jetzt;
    var s = Object.create(null), v = Object.create(null);
    var mit = function (liste, feld, vorn) { (liste || []).forEach(function (x) { namenAus(s, feld ? (x && x[feld]) : x, vorn); }); };
    try { if (window.KB_ROSTER && KB_ROSTER.syncExport) mit(KB_ROSTER.syncExport(), 'name', v); } catch (e) {}
    try { if (window.Repo && Repo.students) mit(Repo.students, 'name', v); } catch (e) {}
    try { if (window.KB_USER && KB_USER.list) mit(KB_USER.list(), null, v); } catch (e) {}
    try { if (typeof window.getLearnedNames === 'function') mit(window.getLearnedNames(), 'name'); } catch (e) {}
    try { if (window.KNOWN_PERSONS) mit(window.KNOWN_PERSONS, 'name'); } catch (e) {}
    try { if (window.LU_PLACES) mit(window.LU_PLACES); } catch (e) {}
    try {
      if (window.KB_BUBBLE && KB_BUBBLE.syncExport) KB_BUBBLE.syncExport().forEach(function (r) { mit(r.nodes, 'name'); });
    } catch (e) {}
    var sig = Object.keys(s).sort().join('|') + '#' + Object.keys(v).sort().join('|');
    if (sig !== namenSig) { namenSig = sig; namenSet = s; appVornamen = v; cache = Object.create(null); }
    return namenSet;
  }
  function istName(w) {
    var k = w.toLowerCase();
    if (VORNAMEN[k] || namen()[k]) return true;
    return k.indexOf('-') > 0 && k.split('-').every(function (t) { return VORNAMEN[t] || namenSet[t]; });
  }
  /* Nur echte Vornamen: danach darf ein unbekannter Nachname stehen. */
  function istVorname(w) {
    namen();
    var k = w.toLowerCase();
    if (VORNAMEN[k] || appVornamen[k]) return true;
    return k.indexOf('-') > 0 && k.split('-').every(function (t) { return VORNAMEN[t] || appVornamen[t]; });
  }
  /* Nach diesen Woertern folgt ein Name: Dr Meinhardt, Madame Tissier. */
  var TITEL = { dr: 1, drs: 1, dres: 1, prof: 1, mme: 1, mmes: 1, madame: 1, madamm: 1, 'här': 1, herr: 1,
    monsieur: 1, mr: 1, hr: 1, fr: 1, fra: 1, frau: 1, dokter: 1, doktesch: 1, famill: 1, famille: 1 };

  /* Abkuerzungen: LTA, CNI, SePAS, CeHJP - zwei oder mehr Grossbuchstaben. */
  function akronym(w) { return (w.match(/[A-ZÀ-ÖØ-Þ]/g) || []).length >= 2; }

  function imWoerterbuch(w) {
    if (spell.correct(w)) return true;
    /* Gross geschrieben am Satzanfang: auch die kleine Form gilt. */
    var k = w.charAt(0).toLowerCase() + w.slice(1);
    if (k !== w && spell.correct(k)) return true;
    if (w === w.toUpperCase()) { var g = w.charAt(0) + w.slice(1).toLowerCase(); if (g !== w && spell.correct(g)) return true; }
    return false;
  }
  function richtig(w) {
    if (w.length < MIN_LEN) return true;
    if (/[0-9]/.test(w)) return true;
    if (w in cache) return cache[w];
    var ok = true;
    try { ok = pruefe(w, 0); } catch (e) { ok = true; }
    cache[w] = ok;
    return ok;
  }
  function pruefe(w, tiefe) {
    if (w.length < MIN_LEN) return true;
    /* Bindestrich: jeder Teil fuer sich - LTA-Proffen, Vape-Konsum. */
    if (w.indexOf('-') > 0 && tiefe < 3) {
      if (imWoerterbuch(w) || ZUSATZ[w.toLowerCase()] || (GROSS.test(w) && istName(w))) return true;
      return w.split('-').every(function (t) { return pruefe(t, tiefe + 1); });
    }
    if (akronym(w)) return true;
    if (imWoerterbuch(w)) return true;
    if (ZUSATZ[w.toLowerCase()]) return true;
    if (GROSS.test(w) && istName(w)) return true;
    var ap = w.split(/['’]/);
    if (ap.length === 2 && tiefe < 3) {
      /* d'Mamm, D'Lilly, z'intégréieren: der kurze Artikel haengt am Wort,
         im Woerterbuch steht aber nur das Wort selbst. */
      if (ap[0].length <= 2 && ap[1].length >= 2) return pruefe(ap[1], tiefe + 1);
      /* Endung hinter dem Apostroph: CCP'en, Tic'en */
      if (/^(en|n|er|s)$/i.test(ap[1])) return ap[0].length < MIN_LEN || pruefe(ap[0], tiefe + 1);
    }
    /* Hauptwort, zusammengesetzt aus richtigen Woertern: Bezuch-s-Zäit,
       Ofschloss-Gespréich, Schoul-Wiessel. Das Woerterbuch fuehrt nur die
       gaengigsten. Kleine Woerter nie - sonst rutschten Tippfehler wie
       "iwwerhellt" als "iwwer+hellt" durch. */
    return tiefe === 0 && w.length >= 7 && GROSS.test(w) && zerlegen(w, 0);
  }
  var teilCache = Object.create(null), nomenCache = Object.create(null);
  function teilWort(t) {
    if (t.length < 3) return false;
    if (t in teilCache) return teilCache[t];
    var ok = spell.correct(t.charAt(0).toUpperCase() + t.slice(1)) ||
      spell.correct(t.charAt(0).toLowerCase() + t.slice(1)) || !!ZUSATZ[t.toLowerCase()];
    teilCache[t] = ok;
    return ok;
  }
  /* Der letzte Teil traegt das Wort. Er muss ein Hauptwort sein (steht nur
     gross im Woerterbuch) oder wenigstens sechs Buchstaben haben - sonst
     ergaeben zufaellige Wortschnipsel ein "Wort": Verhaalen = verha + Alen. */
  function kopfWort(t) {
    if (t.length < 3) return false;
    if (!(t in nomenCache)) {
      nomenCache[t] = spell.correct(t.charAt(0).toUpperCase() + t.slice(1)) &&
        !spell.correct(t.charAt(0).toLowerCase() + t.slice(1));
    }
    return nomenCache[t] || (t.length >= 6 && teilWort(t));
  }
  function zerlegen(w, n) {
    if (n > 0 && kopfWort(w)) return true;
    if (n >= 2) return false;                 // hoechstens drei Teile
    for (var i = 3; i <= w.length - 3; i++) {
      if (!teilWort(w.slice(0, i))) continue;
      var rest = w.slice(i);
      if (zerlegen(rest, n + 1)) return true;
      /* Fugen-s: Sport-s-Stonn, Bezuch-s-Zäit */
      if (rest.charAt(0) === 's' && rest.length >= 4 && zerlegen(rest.slice(1), n + 1)) return true;
    }
    return false;
  }

  /* Vorschlaege: zuerst dasselbe Wort mit Akzent - die haeufigsten Fehler
     sind fehlende Zeichen wie in mei/méi, gett/gëtt, emmer/ëmmer, und die
     findet der allgemeine Vorschlags-Algorithmus nicht immer. */
  var AKZENT = { a: 'äàâ', e: 'éëèê', i: 'îï', o: 'ôö', u: 'üûù', 'ä': 'a', 'à': 'a', 'é': 'eëè',
    'è': 'eé', 'ë': 'eé', 'ê': 'eé', 'ö': 'o', 'ü': 'u', 'î': 'i', 'ï': 'i' };
  function akzentVorschlaege(w) {
    var out = [];
    for (var i = 0; i < w.length && out.length < 4; i++) {
      var c = w.charAt(i), k = c.toLowerCase(), alt = AKZENT[k];
      if (!alt) continue;
      for (var j = 0; j < alt.length; j++) {
        var neu = c === k ? alt.charAt(j) : alt.charAt(j).toUpperCase();
        var v = w.slice(0, i) + neu + w.slice(i + 1);
        if (out.indexOf(v) < 0 && imWoerterbuch(v)) out.push(v);
      }
    }
    return out;
  }
  function vorschlaege(w) {
    var ap = w.split(/['’]/);
    if (ap.length === 2 && ap[0].length <= 2 && ap[1].length >= 2) {
      var sep = w.charAt(ap[0].length);
      return vorschlaege(ap[1]).map(function (x) { return ap[0] + sep + x; });
    }
    var liste = [];
    try { liste = akzentVorschlaege(w); } catch (e) {}
    try { liste = liste.concat(spell.suggest(w) || []); } catch (e) {}
    var out = [];
    liste.forEach(function (x) { if (x && x !== w && out.indexOf(x) < 0) out.push(x); });
    return out.slice(0, MAX_VORSCHLAEGE);
  }

  /* ---- Ebene hinter dem Schreibfeld ---- */
  var UEBERNEHMEN = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'textIndent', 'textAlign',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing'];

  function huelle(ta) {
    if (ta._kbSpell) return ta._kbSpell;
    /* Das Feld wandert in die Huelle - und ein verschobenes Element verliert
       den Fokus. Wer gerade hineingeklickt hat, tippte sonst ins Leere.
       Darum bekommt es Fokus und Cursor gleich zurueck. */
    var fokus = document.activeElement === ta;
    var selA = ta.selectionStart, selB = ta.selectionEnd, selR = ta.selectionDirection, st = ta.scrollTop;
    var h = document.createElement('div');
    h.className = 'kb-sp-wrap';
    ta.parentNode.insertBefore(h, ta);
    var ebene = document.createElement('div');
    ebene.className = 'kb-sp-layer';
    ebene.setAttribute('aria-hidden', 'true');
    h.appendChild(ebene);
    var o = { wrap: h, layer: ebene };
    ta._kbSpell = o;
    h.appendChild(ta);
    ta.classList.add('kb-sp-on');
    ta.addEventListener('scroll', function () { ebene.scrollTop = ta.scrollTop; ebene.scrollLeft = ta.scrollLeft; });
    if (fokus && document.activeElement !== ta) {
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
      try { ta.setSelectionRange(selA, selB, selR || 'none'); } catch (e) {}
      ta.scrollTop = st;
    }
    return o;
  }
  /* Die Ebene muss Zeichen fuer Zeichen so umbrechen wie das Feld, sonst
     sitzen die Wellenlinien daneben. Darum werden Schrift, Innenabstand und
     Rahmenbreite uebernommen. Der Hintergrund wandert vom Feld auf die Ebene
     und das Feld wird durchsichtig - sonst deckt es die Linien zu. Und die
     Aussenabstaende gehen an die Huelle, damit beide Kaesten deckungsgleich
     liegen. */
  function spiegeln(ta, o) {
    var cs = getComputedStyle(ta);
    for (var i = 0; i < UEBERNEHMEN.length; i++) o.layer.style[UEBERNEHMEN[i]] = cs[UEBERNEHMEN[i]];
    o.layer.style.borderStyle = 'solid';
    o.layer.style.borderColor = 'transparent';
    o.layer.style.borderRadius = cs.borderRadius;
    o.layer.style.background = cs.backgroundColor;
    o.wrap.style.marginTop = cs.marginTop;
    o.wrap.style.marginRight = cs.marginRight;
    o.wrap.style.marginBottom = cs.marginBottom;
    o.wrap.style.marginLeft = cs.marginLeft;
    o.wrap.style.width = cs.width === 'auto' ? '' : '';
    ta.style.margin = '0';
    ta.style.backgroundColor = 'transparent';
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; });
  }

  /* Den Text einmal durchgehen und die falschen Wörter markieren.
     Die Ebene bekommt denselben Text, nur unsichtbar - sichtbar ist allein
     die Wellenlinie, und die sitzt damit genau unter dem echten Wort. */
  /* Stellen [von, bis] der falschen Woerter in einem Text. */
  function fehlerIn(txt) {
    var m, treffer = [], vor = '', vorEnde = -1;
    WORT.lastIndex = 0;
    while ((m = WORT.exec(txt))) {
      var w = m[0], ok = richtig(w);
      /* Nach einem Titel oder Vornamen steht ein Name: Dr Meinhardt,
         Madame Tissier, Jean-Pierre Tomozei. */
      if (!ok && vor && GROSS.test(w) && /^[\s.]{1,3}$/.test(txt.slice(vorEnde, m.index))) {
        var v = vor.toLowerCase();
        if (TITEL[v] || (GROSS.test(vor) && istVorname(vor))) ok = true;
      }
      if (!ok) treffer.push([m.index, m.index + w.length]);
      if (treffer.length > 400) break;          // sehr lange Texte nicht überziehen
      vor = w; vorEnde = m.index + w.length;
    }
    return treffer;
  }
  function zeichnen(ta) {
    var o = ta._kbSpell;
    if (!o) return;
    var txt = ta.value, out = '', letzte = 0, treffer = fehlerIn(txt);
    for (var i = 0; i < treffer.length; i++) {
      out += esc(txt.slice(letzte, treffer[i][0])) + '<span class="kb-sp-bad">' +
        esc(txt.slice(treffer[i][0], treffer[i][1])) + '</span>';
      letzte = treffer[i][1];
    }
    out += esc(txt.slice(letzte)) + '\n';        // Zeilenumbruch am Ende sichtbar halten
    o.layer.innerHTML = out;
    o.layer.scrollTop = ta.scrollTop;
    ta._kbSpellTreffer = treffer;
  }

  function alleAus() {
    document.querySelectorAll('textarea.kb-sp-on').forEach(function (ta) {
      if (ta._kbSpell) ta._kbSpell.layer.innerHTML = '';
      ta._kbSpellTreffer = [];
    });
    zu();
  }

  var warte = null;
  function pruefeSpaeter(ta) {
    if (!an() || !ta || ta.tagName !== 'TEXTAREA' || ta.hasAttribute('data-nospell')) return;
    if (!spell) { laden(); return; }
    spiegeln(ta, huelle(ta));
    clearTimeout(ta._kbSpellT);
    ta._kbSpellT = setTimeout(function () { zeichnen(ta); }, 220);
  }

  /* ---- Vorschläge ---- */
  function zu() {
    var p = document.getElementById('kb-sp-pop');
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }
  function wortAn(ta, pos) {
    var l = ta._kbSpellTreffer || [];
    for (var i = 0; i < l.length; i++) if (pos >= l[i][0] && pos <= l[i][1]) return l[i];
    return null;
  }
  function ersetzen(ta, bereich, wort) {
    var v = ta.value;
    ta.value = v.slice(0, bereich[0]) + wort + v.slice(bereich[1]);
    var p = bereich[0] + wort.length;
    ta.focus();
    try { ta.setSelectionRange(p, p); } catch (e) {}
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    zeichnen(ta);
  }
  function popup(ta, bereich) {
    zu();
    var wort = ta.value.slice(bereich[0], bereich[1]);
    var liste = vorschlaege(wort);
    var p = document.createElement('div');
    p.id = 'kb-sp-pop';
    p.className = 'kb-sp-pop';
    p.innerHTML = '<div class="kb-sp-h">' + esc(wort) + '</div>' +
      (liste.length
        ? liste.map(function (v) { return '<button type="button" data-sp="' + esc(v) + '">' + esc(v) + '</button>'; }).join('')
        : '<div class="kb-sp-leer">Kein Vorschlag.</div>') +
      '<div class="kb-sp-f"><button type="button" data-spadd="1">Ins Wörterbuch</button>' +
      '<button type="button" data-spzu="1">Schließen</button></div>';
    document.body.appendChild(p);
    var r = ta.getBoundingClientRect();
    var links = Math.max(6, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - p.offsetWidth - 6));
    p.style.left = links + 'px';
    p.style.top = (r.bottom + window.scrollY + 4) + 'px';
    p.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    p.addEventListener('click', function (ev) {
      var b = ev.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-sp')) { ersetzen(ta, bereich, b.getAttribute('data-sp')); zu(); return; }
      if (b.hasAttribute('data-spadd')) { eigenAdd(wort); zeichnen(ta); zu(); return; }
      zu();
    });
    setTimeout(function () {
      document.addEventListener('mousedown', function weg(ev) {
        if (ev.target.closest && ev.target.closest('#kb-sp-pop')) return;
        zu(); document.removeEventListener('mousedown', weg, true);
      }, true);
    }, 0);
  }

  /* ---- Anbinden ---- */
  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.tagName === 'TEXTAREA') pruefeSpaeter(e.target);
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.tagName === 'TEXTAREA') pruefeSpaeter(e.target);
  });
  document.addEventListener('click', function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA' || !ta._kbSpellTreffer) return;
    var b = wortAn(ta, ta.selectionStart);
    if (b && ta.selectionStart === ta.selectionEnd) popup(ta, b); else zu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zu(); });

  window.KB_SPELL = {
    an: an,
    setAn: setAn,
    bereit: function () { return !!spell; },
    laden: laden,
    eigene: eigenListe,
    vergessen: function (w) {
      eigene = eigenListe().filter(function (x) { return x !== w; });
      try { localStorage.setItem(EIGEN_KEY, JSON.stringify(eigene)); } catch (e) {}
      delete cache[w];
    },
    pruefe: function (w) { return spell ? richtig(w) : true; },
    /* die Woerter eines Textes, die unterstrichen wuerden */
    fehler: function (txt) {
      txt = String(txt || '');
      return spell ? fehlerIn(txt).map(function (r) { return txt.slice(r[0], r[1]); }) : [];
    },
    vorschlaege: function (w) { return spell ? vorschlaege(w) : []; },
    neuzeichnen: function () { document.querySelectorAll('textarea.kb-sp-on').forEach(zeichnen); },
    /* nach einem Wert, der nicht getippt, sondern eingesetzt wurde */
    feld: function (ta) { if (ta && ta._kbSpell) pruefeSpaeter(ta); }
  };
})();
