// Führt einen der gemeinsamen Hub-Tests (aus Unified) gegen den Annexe-Hub aus.
// Die Annexe hat beim Konto keine Team-Wahl – das Ankreuzen des Teams wird deshalb
// übersprungen, wenn es das Feld nicht gibt. Sonst bleibt der Test unverändert.
// Aufruf (im Ordner hub-quellen):  node tests/annexe-weiche.js tests/begleitplan.js
// Grün bleiben müssen: bedienung, begleitplan, berichte, entwicklung, fristen, gleichzeitig,
// kindmodus, kompass, lernen, screening-ds, sperre, tageskarte, verlauf. Die übrigen prüfen
// Teams, Stellen, Weitergabe, Journal oder Datenbank – das gibt es in der Annexe absichtlich nicht.
const path = require('path');
const P = '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/lib/client/';
const { Page } = require(P + 'page.js');
const check = Page.prototype.check, isChecked = Page.prototype.isChecked;
Page.prototype.check = async function (selector, options) {
  if (/name="g-team"/.test(String(selector)) && !(await this.$(selector))) return;
  return check.call(this, selector, options);
};
Page.prototype.isChecked = async function (selector, options) {
  if (/name="g-team"/.test(String(selector)) && !(await this.$(selector))) return true;
  return isChecked.call(this, selector, options);
};
if (!process.argv[2]) { console.error('Aufruf: node tests/annexe-weiche.js tests/<test>.js'); process.exit(2); }
require(path.resolve(process.argv[2]));
