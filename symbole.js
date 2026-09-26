/* Symbole statt Emoji
   ----------------------------------------------------------------
   Die App ist mit Emoji als Symbolen gewachsen - in Knöpfen, Überschriften,
   Menüs, Kacheln. Sie sehen auf jedem Rechner anders aus (unter Windows bunt
   und flach) und lassen die App verspielt wirken. Beim Anzeigen werden sie
   hier durch ruhige Linien-Symbole ersetzt (vendor/lucide, beim Bau
   eingebettet).

   Umgewandelt wird nur in Bedien-Elementen: Knöpfe, Überschriften, Reiter,
   Beschriftungen und die kleinen Symbol-Felder der Kacheln. Texte, die
   jemand geschrieben hat (Einträge, Notizen, Eingabefelder), bleiben, wie
   sie sind. Auswahllisten können keine Symbole zeigen - dort fällt das
   Emoji einfach weg.

   Die Tabelle unten ordnet jedem Emoji ein Symbol zu; ein neues Emoji im
   Code braucht hier eine Zeile, sonst bleibt es als Emoji stehen. */
(function () {
  'use strict';
  var MAP = {
    '☰': 'menu', '⚖': 'scale', '⚙': 'settings', '⚠': 'triangle-alert', '⛔': 'ban', '✅': 'circle-check',
    '✍': 'pen-line', '✎': 'pencil', '➕': 'plus', '➗': 'divide', '🌐': 'globe', '🌤': 'sun', '🎉': 'party-popper',
    '🎓': 'graduation-cap', '🎯': 'target', '🏖': 'tree-palm', '🏫': 'school', '🏷': 'tag', '👀': 'eye',
    '👈': 'arrow-left', '👋': 'hand', '👤': 'user', '👥': 'users', '💡': 'lightbulb', '💬': 'message-circle',
    '💻': 'laptop', '💾': 'save', '📂': 'folder-open', '📄': 'file-text', '📅': 'calendar-days', '📆': 'calendar-days',
    '📈': 'trending-up', '📉': 'trending-down', '📊': 'chart-column', '📋': 'clipboard-list', '📌': 'pin',
    '📑': 'files', '📒': 'notebook-tabs', '📓': 'notebook', '📔': 'notebook', '📘': 'book-open', '📚': 'library',
    '📝': 'file-pen-line', '📥': 'inbox', '📦': 'package', '📭': 'inbox', '📸': 'camera', '🔄': 'refresh-cw',
    '🔌': 'plug', '🔍': 'search', '🔎': 'search', '🔒': 'lock', '🔓': 'lock-open', '🔗': 'link', '🔬': 'microscope',
    '🕒': 'clock', '🕶': 'eye-off', '🕸': 'network', '🖨': 'printer', '🗂': 'folders', '🗄': 'database',
    '🗑': 'trash-2', '🗒': 'sticky-note', '🗓': 'calendar-days', '🗣': 'messages-square', '😉': 'smile',
    '😊': 'smile', '🚀': 'rocket', '🚗': 'car', '🚨': 'siren', '🤖': 'bot', '🤝': 'handshake', '🧑': 'user',
    '🧠': 'brain', '🧭': 'compass', '🧰': 'library', '🩺': 'stethoscope', '🪜': 'layers',
    '⏰': 'alarm-clock', '⏳': 'hourglass', '⬇': 'download', '⬆': 'upload', '✨': 'sparkles', '🇱🇺': 'calendar-check'
  };
  /* Hier wird umgewandelt ... */
  var ZIEL = 'button,h1,h2,h3,h4,h5,label,summary,th,legend,a.btn,.btn,.kb-link,.hbtn,.chip,.badge,' +
    '.mi,.ri,.kt-ic,.kb-tc-ic,.kb-rowx-ic,.lp-h,.kb-yl,.home-hi,.hub-empty-ic,.ic,.i,.ico,.icon,.wn-ic,.nb-ic,.nt-ic,.rec-hint,.sec-head,' +
    '.tab,.view-tab,.class-tab,.cw-title,.sync-title,.kb-card-h,.kb-navlabel,.kb-hint,.hint,.muted,.empty-state,.reunion-author,' +
    '[class$="-title"],[class*="-title "],[class$="-head"],[class*="-head "],[class$="-lbl"],[class*="-lbl "]';
  /* ... und hier nie: was jemand geschrieben hat, und Eingabefelder */
  var AUSSER = '.kb-sp-layer,textarea,input,select,[contenteditable="true"],.entry-body,.reunion-update,' +
    '.reu-prev-txt,.wn-txt,.nt-txt,.hub-clamp,.reu-update,.nt-body,.wn-body,script,style,svg';

  var keys = Object.keys(MAP).map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  var RE = new RegExp('(' + keys.join('|') + ')\\uFE0F?', 'g');
  var NS = 'http://www.w3.org/2000/svg';

  function symbol(name) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'kb-i kb-emo');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }
  function wandleText(tn) {
    var t = tn.nodeValue;
    if (!t) return;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    RE.lastIndex = 0;
    var frag = document.createDocumentFragment(), last = 0, m;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      frag.appendChild(symbol(MAP[m[1]]));
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
  }
  function inZiel(el) {
    return el && el.nodeType === 1 && el.matches(ZIEL) && !el.closest(AUSSER);
  }
  /* Textknoten des Elements und seiner schlichten Kinder (span, b, small ...) */
  function wandleElement(el) {
    var kinder = Array.prototype.slice.call(el.childNodes);
    for (var i = 0; i < kinder.length; i++) {
      var n = kinder[i];
      if (n.nodeType === 3) wandleText(n);
      else if (n.nodeType === 1 && /^(SPAN|B|STRONG|SMALL|EM|I|A)$/.test(n.tagName) && !n.matches(ZIEL) && !n.closest(AUSSER)) {
        var k2 = Array.prototype.slice.call(n.childNodes);
        for (var j = 0; j < k2.length; j++) if (k2[j].nodeType === 3) wandleText(k2[j]);
      }
    }
  }
  function wandle(root) {
    if (!root || root.nodeType !== 1 || root.closest(AUSSER)) return;
    if (inZiel(root)) wandleElement(root);
    var l = root.querySelectorAll(ZIEL);
    for (var i = 0; i < l.length; i++) if (!l[i].closest(AUSSER)) wandleElement(l[i]);
    var opts = root.tagName === 'OPTION' ? [root] : root.querySelectorAll('option');
    for (var o = 0; o < opts.length; o++) {
      var t = opts[o].textContent;
      RE.lastIndex = 0;
      if (RE.test(t)) { RE.lastIndex = 0; opts[o].textContent = t.replace(RE, '').replace(/^\s+/, ''); }
    }
  }

  function start() {
    wandle(document.body);
    new MutationObserver(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        var m = liste[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType === 1) wandle(n);
          else if (n.nodeType === 3 && inZiel(n.parentElement)) wandleText(n);
          else if (n.nodeType === 3 && n.parentElement && n.parentElement.tagName === 'OPTION') wandle(n.parentElement);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.KB_SYMBOLE = { wandle: wandle, tabelle: MAP };
})();
