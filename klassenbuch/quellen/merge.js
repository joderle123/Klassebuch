/* Zusammenfuehren, wenn zwei Leute gleichzeitig dasselbe geaendert haben.

   Bisher gewann beim Abgleich einfach die juengere Fassung - die aeltere war
   spurlos weg. In einer Réunion, in der mehrere gleichzeitig tippen, ist das
   der Normalfall. Hier wird stattdessen gegen den letzten GEMEINSAMEN Stand
   verglichen (b = Basis, r = die eine Seite, l = die andere):

   - Wer nichts geaendert hat, bekommt die Aenderung des anderen.
   - Haben beide geaendert, bleibt beides: neue Zeilen/Punkte beider Seiten,
     und was eine Seite bewusst entfernt hat, bleibt entfernt.

   Absichtlich einfach und vorhersehbar: gearbeitet wird zeilenweise. Eine
   Zeile, die beide gleichzeitig verschieden umschreiben, steht danach in
   beiden Fassungen da - lieber doppelt als verloren. */
(function () {
  'use strict';

  function zeilen(t) { return String(t || '').split('\n'); }
  function menge(a) { var m = Object.create(null); for (var i = 0; i < a.length; i++) m[a[i]] = 1; return m; }

  /* Listen von Zeichenketten: Zeilen eines Textes oder Orga-Punkte. */
  function liste(b, r, l) {
    b = b || []; r = r || []; l = l || [];
    var inB = menge(b), inR = menge(r), inL = menge(l);
    // Von r bleibt, was l nicht bewusst entfernt hat ...
    var aus = r.filter(function (x) { return !(inB[x] && !inL[x]); });
    // ... und dazu kommt, was l neu geschrieben hat.
    l.forEach(function (x) { if (!inB[x] && !inR[x] && String(x).trim()) aus.push(x); });
    return aus;
  }

  function text(b, r, l) {
    b = b || ''; r = r || ''; l = l || '';
    if (r === l) return r;
    if (r === b) return l;
    if (l === b) return r;
    var z = liste(zeilen(b), zeilen(r), zeilen(l));
    // keine Leerzeilen am Anfang oder Ende stapeln
    while (z.length > 1 && !String(z[z.length - 1]).trim()) z.pop();
    while (z.length > 1 && !String(z[0]).trim()) z.shift();
    return z.join('\n');
  }

  /* Mengen (z. B. "besprochen"): Hinzugefuegtes beider Seiten bleibt,
     Entferntes beider Seiten bleibt entfernt. */
  function set(b, r, l) {
    b = b || []; r = r || []; l = l || [];
    var inB = menge(b), inR = menge(r), inL = menge(l), aus = [], da = Object.create(null);
    r.concat(l).forEach(function (x) {
      if (da[x]) return;
      var wegR = inB[x] && !inR[x], wegL = inB[x] && !inL[x];
      if (wegR || wegL) return;
      da[x] = 1; aus.push(x);
    });
    return aus;
  }

  /* Ziele je Schueler: Liste aus Text oder {text, done}. */
  function zielText(g) { return (g && typeof g === 'object') ? String(g.text || '') : String(g || ''); }
  function zielDone(g) { return !!(g && typeof g === 'object' && g.done); }
  function zielListe(b, r, l) {
    b = b || []; r = r || []; l = l || [];
    var tb = b.map(zielText), tr = r.map(zielText), tl = l.map(zielText);
    var reihe = liste(tb, tr, tl);
    var nachT = function (arr) { var m = Object.create(null); arr.forEach(function (g) { m[zielText(g)] = g; }); return m; };
    var mb = nachT(b), mr = nachT(r), ml = nachT(l);
    return reihe.map(function (t) {
      var gr = mr[t], gl = ml[t], gb = mb[t];
      if (gr === undefined) return gl;
      if (gl === undefined) return gr;
      // "erreicht" - wer es geaendert hat, gewinnt
      var dB = zielDone(gb), dR = zielDone(gr), dL = zielDone(gl);
      var d = (dR !== dB) ? dR : dL;
      return (typeof gr === 'object' || typeof gl === 'object') ? { text: t, done: d } : t;
    });
  }
  function ziele(b, r, l) {
    b = b || {}; r = r || {}; l = l || {};
    var aus = {}, k, keys = Object.create(null);
    for (k in r) keys[k] = 1;
    for (k in l) keys[k] = 1;
    for (k in keys) {
      var vb = b[k], vr = r[k], vl = l[k];
      var sb = JSON.stringify(vb === undefined ? null : vb);
      if (vr === undefined) { if (JSON.stringify(vl) !== sb) aus[k] = vl; continue; }   // r hat entfernt?
      if (vl === undefined) { if (JSON.stringify(vr) !== sb) aus[k] = vr; continue; }
      if (JSON.stringify(vr) === sb) { aus[k] = vl; continue; }
      if (JSON.stringify(vl) === sb) { aus[k] = vr; continue; }
      if (Array.isArray(vr) || Array.isArray(vl)) {
        aus[k] = zielListe(Array.isArray(vb) ? vb : [], Array.isArray(vr) ? vr : [], Array.isArray(vl) ? vl : []);
      } else {
        aus[k] = text(vb, vr, vl);   // Gruppenziel als Text
      }
    }
    return aus;
  }

  function vereinige(a, b) {
    var aus = (a || []).slice(), da = menge(aus);
    (b || []).forEach(function (x) { if (!da[x]) { da[x] = 1; aus.push(x); } });
    return aus;
  }
  function kopie(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }

  /* Ganze Datensaetze je Sammlung. tsR/tsL: wer ist juenger - der bestimmt
     alle Felder, die sich nicht sinnvoll zusammenfuehren lassen. */
  var DATENSATZ = {
    dosEntries: function (b, r, l, tsR, tsL) {
      var jung = tsL >= tsR ? l : r, aus = kopie(jung);
      aus.text = text(b ? b.text : '', r.text, l.text);
      aus.tags = vereinige(r.tags, l.tags);
      if (b && b.author) aus.author = b.author;
      return aus;
    },
    dosReunions: function (b, r, l, tsR, tsL) {
      var jung = tsL >= tsR ? l : r, aus = kopie(jung);
      aus.orgItems = liste(b ? b.orgItems : [], r.orgItems, l.orgItems);
      aus.discussed = set(b ? b.discussed : [], r.discussed, l.discussed);
      aus.goals = ziele(b ? b.goals : {}, r.goals, l.goals);
      return aus;
    },
    anwNotes: function (b, r, l, tsR, tsL) {
      var jung = tsL >= tsR ? l : r, aus = kopie(jung);
      aus.text = text(b ? b.text : '', r.text, l.text);
      return aus;
    }
  };

  window.KB_MERGE = { text: text, liste: liste, set: set, ziele: ziele, datensatz: DATENSATZ };
})();
