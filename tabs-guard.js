/* Zwei Fenster gleichzeitig auf derselben App.

   Jedes Fenster haelt seinen Stand im Arbeitsspeicher und schreibt ihn beim
   Speichern komplett zurueck. Sind zwei Fenster offen, gewinnt schlicht das
   zuletzt gespeicherte - der andere Stand ist weg, ohne Warnung. Richtig
   zusammenfuehren kann das nur der Team-Datei-Abgleich, und der ist fuer
   verschiedene GERAETE gedacht, nicht fuer zwei Tabs auf demselben.

   Darum hier keine Reparatur, sondern eine deutliche Ansage: solange ein
   zweites Fenster lebt, steht oben ein Hinweis. Verschwindet es, geht der
   Hinweis von selbst wieder weg. */
(function () {
  var KANAL = 'klassebuch_fenster';
  var ICH = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var PING = 2500;      // so oft meldet sich jedes Fenster
  var TOT = 8000;       // so lange gilt ein stilles Fenster noch als offen
  var andere = {};      // id -> zuletzt gehoert
  var bc = null, balken = null;

  try { if (window.BroadcastChannel) bc = new BroadcastChannel(KANAL); } catch (e) { bc = null; }
  if (!bc) return;      // ohne Kanal keine Erkennung - dann lieber gar nichts

  function zahl() {
    var n = 0, jetzt = Date.now();
    for (var k in andere) {
      if (jetzt - andere[k] > TOT) delete andere[k]; else n++;
    }
    return n;
  }

  function zeigen() {
    var n = zahl();
    if (!n) {
      if (balken && balken.parentNode) { balken.parentNode.removeChild(balken); balken = null; }
      return;
    }
    if (!balken) {
      balken = document.createElement('div');
      balken.id = 'kb-tabwarn';
      balken.setAttribute('role', 'alert');
      balken.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#C0392B;color:#fff;' +
        'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 14px;' +
        'display:flex;gap:12px;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.25);';
      var txt = document.createElement('span');
      txt.id = 'kb-tabwarn-txt';
      balken.appendChild(txt);
      var zu = document.createElement('button');
      zu.textContent = 'Verstanden';
      zu.style.cssText = 'border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff;' +
        'border-radius:8px;padding:3px 10px;font:inherit;font-size:13px;cursor:pointer;';
      zu.onclick = function () { if (balken && balken.parentNode) balken.parentNode.removeChild(balken); balken = null; stumm = true; };
      balken.appendChild(zu);
      (document.body || document.documentElement).appendChild(balken);
    }
    var t = document.getElementById('kb-tabwarn-txt');
    if (t) {
      t.textContent = '⚠️ Die App ist in ' + (n + 1) + ' Fenstern offen. Bitte nur eines benutzen — ' +
        'sonst überschreibt das zuletzt gespeicherte Fenster die Eingaben der anderen.';
    }
  }

  var stumm = false;
  function pruefen() { if (!stumm) zeigen(); else if (!zahl() && balken) zeigen(); }

  bc.onmessage = function (ev) {
    var d = ev && ev.data;
    if (!d || d.id === ICH) return;
    if (d.t === 'hallo' || d.t === 'da') {
      var neu = !andere[d.id];
      andere[d.id] = Date.now();
      if (d.t === 'hallo') { try { bc.postMessage({ t: 'da', id: ICH }); } catch (e) {} }
      /* Nur ein wirklich neues Fenster holt den weggeklickten Hinweis zurueck -
         die regelmaessigen Lebenszeichen duerfen das nicht tun. */
      if (neu) stumm = false;
      pruefen();
    } else if (d.t === 'tschuess') {
      delete andere[d.id];
      pruefen();
    }
  };

  function melden() { try { bc.postMessage({ t: 'hallo', id: ICH }); } catch (e) {} pruefen(); }
  melden();
  setInterval(melden, PING);
  window.addEventListener('pagehide', function () { try { bc.postMessage({ t: 'tschuess', id: ICH }); } catch (e) {} });

  window.KB_TABS = { count: function () { return zahl() + 1; }, id: ICH };
})();
