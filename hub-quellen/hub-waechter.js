/* Hub-Wächter – für Apps, die in einem EIGENEN Tab laufen (auf O:\ über file://
   öffnet der Hub Klassenbuch, Toolbox und Skills-Kurs so, dazu alles, was über
   „↗ In neuem Tab“ oder einen Link aus einer App aufgeht).
   - Eingaben hier melden sich beim Hub (cdse_hub_aktiv, höchstens alle 15 s):
     wer im Klassenbuch-Tab arbeitet, ist nicht „inaktiv“, der Hub sperrt nicht.
   - Ist der Hub gesperrt, liegt über der App eine Abdeckung, bis er entsperrt
     ist – auch nach dem Neuladen des Tabs.
   - Nach dem Abmelden verlässt der Tab die App und zeigt die Anmeldung des Hubs:
     die nächste Person findet keine offene App mit fremden Daten.
   Eingebettet im Hub (iframe) tut der Wächter nichts; das regelt der Hub selbst.
   Hub und Apps sprechen über den Browser-Speicher (localStorage, Ereignis
   „storage“), den sie auch unter file:// teilen. Ohne Hub (kein Zustand
   gespeichert) bleibt alles wie bisher. */
(function () {
  'use strict';
  try { if (window.top !== window) return; } catch (e) { return; }
  var ZUSTAND = 'cdse_hub_zustand', AKTIV = 'cdse_hub_aktiv', gemeldet = 0, decke = null;

  function melden() {
    if (decke) return;
    var jetzt = Date.now();
    if (jetzt - gemeldet < 15000) return;
    gemeldet = jetzt;
    try { localStorage.setItem(AKTIV, String(jetzt)); } catch (e) {}
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
    document.addEventListener(t, melden, { passive: true, capture: true });
  });

  function zudecken() {
    if (decke) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', zudecken); return; }
    decke = document.createElement('div');
    decke.id = 'cdse-hub-decke';
    decke.setAttribute('role', 'alertdialog');
    decke.setAttribute('aria-modal', 'true');
    decke.setAttribute('aria-label', 'Hub gesperrt');
    decke.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'padding:24px;background:rgba(245,246,248,.97);backdrop-filter:blur(6px);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;';
    decke.innerHTML = '<div style="max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:26px 26px 22px;' +
      'box-shadow:0 12px 32px rgba(16,24,40,.12);color:#161b26;text-align:center">' +
      '<div style="width:44px;height:44px;margin:0 auto 12px;border-radius:12px;background:#f0f2fd;color:#4453d6;display:flex;align-items:center;justify-content:center">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:6px">Der Hub ist gesperrt</div>' +
      '<div style="font-size:14px;line-height:1.5;color:#636b7c">Entsperre ihn im Hub-Fenster mit deinem Passwort – danach geht es hier genau da weiter, wo du warst.</div></div>';
    document.body.appendChild(decke);
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
  }
  function aufdecken() { if (decke && decke.parentNode) decke.parentNode.removeChild(decke); decke = null; }

  /* Tastatur hinter der Abdeckung sperren */
  document.addEventListener('keydown', function (ev) { if (decke) { ev.stopPropagation(); ev.preventDefault(); } }, true);

  function anwenden(roh) {
    var z = null;
    try { z = JSON.parse(roh || 'null'); } catch (x) { z = null; }
    if (!z || !z.z) return;
    if (z.z === 'gesperrt') zudecken();
    else if (z.z === 'offen') aufdecken();
    else if (z.z === 'abgemeldet') {
      zudecken();
      try { location.replace(new URL('../hub.html', location.href).href); } catch (x) {}
    }
  }
  window.addEventListener('storage', function (e) { if (e.key === ZUSTAND) anwenden(e.newValue); });
  try { anwenden(localStorage.getItem(ZUSTAND)); } catch (e) {}
})();
