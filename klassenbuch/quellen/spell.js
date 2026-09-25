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
    try { eigene = JSON.parse(localStorage.getItem(EIGEN_KEY) || '[]') || []; } catch (e) { eigene = []; }
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
  function richtig(w) {
    if (w.length < MIN_LEN) return true;
    if (/[0-9]/.test(w)) return true;
    if (w in cache) return cache[w];
    var ok = true;
    try {
      ok = spell.correct(w);
      /* Groß geschrieben am Satzanfang: auch die kleine Form gilt. */
      if (!ok && w[0] === w[0].toUpperCase()) ok = spell.correct(w.charAt(0).toLowerCase() + w.slice(1));
      if (!ok && w === w.toUpperCase()) ok = spell.correct(w.charAt(0) + w.slice(1).toLowerCase());
      /* d'Mamm, D'Kanner, s'ass: der kurze Artikel haengt am Wort, im
         Wörterbuch steht aber nur das Wort selbst. */
      if (!ok) {
        var t = w.split(/['’]/);
        if (t.length === 2 && t[0].length <= 2 && t[1].length >= MIN_LEN) {
          ok = spell.correct(t[1]) || spell.correct(t[1].charAt(0).toLowerCase() + t[1].slice(1));
        }
      }
    } catch (e) { ok = true; }
    cache[w] = ok;
    return ok;
  }
  function vorschlaege(w) {
    try { return (spell.suggest(w) || []).slice(0, MAX_VORSCHLAEGE); } catch (e) { return []; }
  }

  /* ---- Ebene hinter dem Schreibfeld ---- */
  var UEBERNEHMEN = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'textIndent', 'textAlign',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing'];

  function huelle(ta) {
    if (ta._kbSpell) return ta._kbSpell;
    var h = document.createElement('div');
    h.className = 'kb-sp-wrap';
    ta.parentNode.insertBefore(h, ta);
    var ebene = document.createElement('div');
    ebene.className = 'kb-sp-layer';
    ebene.setAttribute('aria-hidden', 'true');
    h.appendChild(ebene);
    h.appendChild(ta);
    ta.classList.add('kb-sp-on');
    var o = { wrap: h, layer: ebene };
    ta._kbSpell = o;
    ta.addEventListener('scroll', function () { ebene.scrollTop = ta.scrollTop; ebene.scrollLeft = ta.scrollLeft; });
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
  function zeichnen(ta) {
    var o = ta._kbSpell;
    if (!o) return;
    var txt = ta.value, out = '', letzte = 0, m, treffer = [];
    WORT.lastIndex = 0;
    while ((m = WORT.exec(txt))) {
      if (!richtig(m[0])) treffer.push([m.index, m.index + m[0].length]);
      if (treffer.length > 400) break;          // sehr lange Texte nicht überziehen
    }
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
    vorschlaege: function (w) { return spell ? vorschlaege(w) : []; },
    neuzeichnen: function () { document.querySelectorAll('textarea.kb-sp-on').forEach(zeichnen); }
  };
})();
