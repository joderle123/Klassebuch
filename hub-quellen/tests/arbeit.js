// Test: Schülerbereich, Dossiers, Rechte, Weitergabe, Einsatzplan, Team (http + OPFS als Server-Ordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const OUT = __dirname;
const BASE = 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info ? '  → ' + info : '')); } }
const FALL = JSON.parse(fs.readFileSync(OUT + '/../ds-probe/fall-tom.json', 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  async function erstelle(name, team, pw, resp, funktion) {
    await page.fill('#g-name', name);
    await page.check('input[name="g-team"][value="' + team + '"]');
    if (funktion) await page.fill('#g-funktion', funktion);
    await page.selectOption('#g-resp', resp || '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw);
    await page.click('#g-los');
    await page.waitForSelector('#g-code', { timeout: 30000 });
    await page.check('#g-ok'); await page.click('#g-weiter');
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  }
  async function menue() { if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava'); }
  async function abmelden() { await menue(); await page.click('[data-konto="abmelden"]'); await page.waitForSelector('#gate .konto[data-id], #g-pw', { timeout: 30000 }); }
  async function anmelden(name, pw) {
    const txt = await page.textContent('#gate-card');
    if (!txt.includes('Wer bist du?')) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#gate .konto:has-text("' + name + '")');
    await page.fill('#g-pw', pw); await page.click('#g-los');
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  }
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(500); }
  async function dialogKnopf(text) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + text + '")'); }

  await page.goto(BASE);
  // Sauberer Anfang: OPFS leeren
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner');
  await page.waitForSelector('#g-name');

  console.log('1) Joey: erstes Konto, Schülerbereich einrichten');
  await erstelle('Joey Muster', 'diagnostique', 'ein sicheres Passwort 1', '-', 'Direktion');
  check('Hinweis „Responsable eintragen“ fehlt (Joey hat gewählt)', !(await page.textContent('#home-body')).includes('trage deine'));
  check('Menüpunkt „Schüler“ sichtbar', await page.isVisible('#nav a[href="#/schueler"]'));
  await gehe('#/schueler');
  await page.waitForSelector('[data-ar="einrichten"]');
  check('Karte „noch nicht eingerichtet“', (await page.textContent('#arbeit-body')).includes('noch nicht eingerichtet'));
  await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  check('Nach Einrichten: Liste mit „Neuer Schüler“', true);
  check('Menüpunkt „Verwaltung“ erscheint', await page.isVisible('#nav a[href="#/verwaltung"]'));
  const dateien = await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); const g = await r.getDirectoryHandle('gemeinsam'); const l = []; for await (const [n] of g.entries()) l.push(n); return l.sort(); });
  check('Server-Ordner: gemeinsam/schluessel.json + mitglieder.cdse', dateien.includes('schluessel.json') && dateien.includes('mitglieder.cdse'), dateien.join(','));
  const ring = await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); const g = await r.getDirectoryHandle('gemeinsam'); return JSON.parse(await (await (await g.getFileHandle('schluessel.json')).getFile()).text()); });
  check('Schlüsselring enthält nur verschlossene Schlüssel', ring.format === 'cdse-schluesselring' && Object.keys(ring.fuer).length === 1);
  const mtext = await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); const g = await r.getDirectoryHandle('gemeinsam'); return await (await (await g.getFileHandle('mitglieder.cdse')).getFile()).text(); });
  check('Mitgliederliste ist verschlüsselt (kein Name im Klartext)', !mtext.includes('Joey') && !mtext.includes('admin'));

  console.log('2) Dossier anlegen');
  await page.click('[data-ar="neu"]');
  await page.fill('dialog input[name=nachname]', 'Muster'); await page.fill('dialog input[name=vorname]', 'Tom');
  await page.fill('dialog input[name=geburtsdatum]', '2017-03-14'); await page.selectOption('dialog select[name=geschlecht]', 'm');
  await page.fill('dialog input[name=schule]', 'École fondamentale Musterdorf'); await page.fill('dialog input[name=klasse]', 'C3.2');
  await dialogKnopf('Anlegen');
  await page.waitForSelector('.ar-dkopf h1', { timeout: 20000 });
  check('Dossier geöffnet: Name in Großbuchstaben', (await page.textContent('.ar-dkopf h1')).trim() === 'MUSTER Tom');
  check('Stelle Diagnostique, „Du kannst bearbeiten“', (await page.textContent('.ar-dkopf')).includes('Diagnostique') && (await page.textContent('.ar-dkopf')).includes('Du kannst bearbeiten'));
  const sid = await page.evaluate(() => location.hash.split('/').pop());
  const roh = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, sid);
  check('Dossier-Datei verschlüsselt (kein Name im Klartext)', roh.includes('cdse-dossier') && !roh.includes('Muster') && !roh.includes('Tom'));

  console.log('3) Profil aus dem ELDiB-Generator übernehmen');
  await page.evaluate(f => {
    const ds = JSON.parse(JSON.stringify(f.ds)); ds.v = 2;
    localStorage.setItem('eldib-schueler-liste', JSON.stringify([{ id: 'sch-1', name: 'Muster, Tom', klasse: 'C3.2', geburtsdatum: '2017-03-14', einschaetzung1: { savedAt: '2026-09-20T10:00:00Z', stammdaten: { schueler_name: 'Muster, Tom' }, selections: { 'V-1': { status: 'erreicht' }, 'V-13': { status: 'ziel' } }, dsData: ds }, einschaetzung2: null }]));
  }, FALL);
  await page.click('[data-ar="eldib-uebernehmen"]');
  await page.waitForSelector('dialog .ar-wahl.passt');
  check('Passender Schüler wird erkannt', await page.isVisible('dialog .ar-passt'));
  await dialogKnopf('Übernehmen');
  await page.waitForSelector('.ar-blickraster', { timeout: 20000 });
  const blick = await page.textContent('.ar-blickraster');
  check('Auf einen Blick: Stärken', blick.includes('Stärken') && /motiviert|Lehrpersonen|Lob/.test(blick), blick.slice(0, 200));
  check('Auf einen Blick: Schwierigkeiten', blick.includes('Schwierigkeiten') && /konzentrier|Frustration|Wut/.test(blick));
  check('Auf einen Blick: Was hilft', blick.includes('Einzelansprache') || blick.includes('Bewegungspausen'));
  check('Auf einen Blick: Wann es schwierig wird', blick.includes('wenig strukturierten'));
  check('Verknüpfung im ELDiB-Generator gespeichert', await page.evaluate(id => JSON.parse(localStorage.getItem('eldib-schueler-liste'))[0].hubId === id, sid));
  await page.screenshot({ path: OUT + '/a1-dossier.png', fullPage: true });

  console.log('4) Eintrag und Einschätzung');
  await page.click('.ar-tabs [data-tab="eintraege"]');
  await page.fill('#ar-eintrag-form input[name=titel]', 'Elterngespräch');
  await page.selectOption('#ar-eintrag-form select[name=art]', 'gespraech_eltern');
  await page.fill('#ar-eintrag-form textarea[name=text]', 'Die Mutter berichtet von ruhigeren Wochenenden.');
  await page.click('#ar-eintrag-form button[type=submit]');
  await page.waitForSelector('.ar-eintrag', { timeout: 20000 });
  check('Eintrag erscheint', (await page.textContent('.ar-tabinhalt')).includes('ruhigeren Wochenenden'));
  await page.click('.ar-tabs [data-tab="profil"]');
  await page.click('[data-ar="einschaetzung"]');
  await page.waitForSelector('dialog .ar-einsch-zeile');
  await page.fill('dialog input[name=datum]', '2026-11-20');
  // drei Aussagen günstiger bewerten
  for (const [id, r] of [['s_konz', 5], ['s_frust', 5], ['s_wut', 3]]) { await page.click('dialog .ar-einsch-zeile[data-id="' + id + '"] button[data-r="' + r + '"]'); }
  await dialogKnopf('Speichern');
  await page.waitForSelector('.ar-grafik', { timeout: 20000 });
  check('Verlaufsgrafik erscheint', true);
  const veraend = await page.textContent('.ar-veraenderung');
  check('Veränderungstabelle zeigt „günstiger“', veraend.includes('günstiger'), veraend.slice(0, 200));
  check('Profil im Wortlaut (Sicht der Schule)', (await page.textContent('.ar-wortlaut')).includes('Sicht der Schule'));
  await page.screenshot({ path: OUT + '/a2-profil.png', fullPage: true });

  console.log('5) Zweites Konto: Anna (Annexe), Responsable = Joey');
  await abmelden();
  await page.click('#g-neu');
  await erstelle('Anna Beispiel', 'annexe', 'noch ein Passwort 22', await page.evaluate(() => { const o = Array.from(document.querySelectorAll('#g-resp option')).find(x => x.textContent.includes('Joey')); return o ? o.value : '-'; }), 'Erzieherin');
  await gehe('#/schueler');
  await page.waitForSelector('#ar-mein-code', { timeout: 20000 });
  await warte(400);
  const codeAnna = (await page.textContent('#ar-mein-code')).trim();
  check('Anna: „Noch nicht freigeschaltet“ mit Kontrollcode', /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(codeAnna), codeAnna);
  // Anna trägt ihren Einsatzplan ein (geht auch ohne Freischaltung): heute, jetzt
  await gehe('#/einsatz');
  await page.waitForSelector('.ar-woche', { timeout: 20000 });
  const tag = await page.evaluate(() => new Date().getDay());
  const jetzt = await page.evaluate(() => { const d = new Date(); const p = n => (n < 10 ? '0' : '') + n; const v = new Date(d.getTime() - 3600e3), b = new Date(d.getTime() + 3600e3); return [p(v.getHours()) + ':' + p(v.getMinutes()), p(b.getHours()) + ':' + p(b.getMinutes())]; });
  if (tag === 0 || tag === 6) { await page.check('#ar-samstag'); await warte(200); }
  const tagImPlan = tag === 0 ? 1 : tag;   // sonntags: Montag benutzen (Test prüft dann nur den Plan)
  await page.click('[data-ar="block-neu"][data-tag="' + tagImPlan + '"]');
  await page.fill('dialog input[name=von]', jetzt[0] < jetzt[1] ? jetzt[0] : '00:01');
  await page.fill('dialog input[name=bis]', jetzt[0] < jetzt[1] ? jetzt[1] : '23:58');
  await page.fill('dialog input[name=ort]', 'Lycée Technique Ettelbruck');
  await page.fill('dialog input[name=klasse]', '7e');
  await dialogKnopf('Übernehmen');
  await page.click('[data-ar="plan-speichern"]');
  await page.waitForSelector('.ar-speicherleiste:not(.offen)', { timeout: 20000 });
  check('Plan gespeichert, „Sichtbar für“ nennt Joey', (await page.textContent('.ar-sicht')).includes('Joey Muster'));
  const planRoh = await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('einsatz'); const l = []; for await (const [n, h] of g.entries()) { l.push(JSON.parse(await (await h.getFile()).text())); } return l; });
  check('Plan-Datei: für Anna und Joey verschlossen, Ort nicht im Klartext', planRoh.length === 1 && Object.keys(planRoh[0].fuer).length === 2 && !JSON.stringify(planRoh[0]).includes('Ettelbruck'));
  await page.screenshot({ path: OUT + '/a3-einsatz.png', fullPage: true });

  console.log('6) Joey schaltet Anna frei und sieht sie im Team');
  await abmelden();
  await anmelden('Joey Muster', 'ein sicheres Passwort 1');
  await warte(500);
  check('Verwaltung zeigt „1“ wartendes Konto', (await page.textContent('#nav a[href="#/verwaltung"]')).includes('1'));
  await gehe('#/verwaltung');
  await page.waitForSelector('.ar-wartend', { timeout: 20000 });
  await warte(400);
  const codeJoeySieht = (await page.textContent('.ar-wartend .ar-code')).trim();
  check('Kontrollcode bei Joey = Code bei Anna', codeJoeySieht === codeAnna, codeJoeySieht + ' / ' + codeAnna);
  await page.click('[data-ar="freischalten"]');
  await page.waitForSelector('.ar-mitglieder', { timeout: 20000 });
  await warte(600);
  check('Anna ist Mitglied', (await page.textContent('.ar-mitglieder')).includes('Anna Beispiel'));
  await gehe('#/team');
  await page.waitForSelector('.ar-orte, .ar-kennzahlen, .ar-leer', { timeout: 20000 });
  const teamText = await page.textContent('#ar-team');
  if (tag >= 1 && tag <= 6) { check('Team „Jetzt“: Anna in Ettelbruck', teamText.includes('Ettelbruck') && teamText.includes('Anna Beispiel'), teamText.slice(0, 300)); }
  else { check('Team: Anna erscheint (Sonntag, kein Einsatz)', teamText.includes('Anna Beispiel')); }
  await page.screenshot({ path: OUT + '/a4-team.png', fullPage: true });
  await page.click('[data-ansicht="heute"]'); await warte(300);
  await page.screenshot({ path: OUT + '/a5-heute.png' });
  check('Zeitstrahl „Heute“ zeigt Anna', (await page.textContent('#ar-team')).includes('Anna Beispiel'));

  console.log('7) Weitergabe an die Annexe mit Anna als Fallverantwortliche');
  await gehe('#/schueler/' + sid);
  await page.waitForSelector('[data-ar="weitergeben"]', { timeout: 20000 });
  await page.click('[data-ar="weitergeben"]');
  await page.selectOption('dialog select[name=stelle]', 'annexe');
  await page.selectOption('dialog select[name=verantwortlich]', await page.evaluate(() => Array.from(document.querySelectorAll('dialog select[name=verantwortlich] option')).find(o => o.textContent.includes('Anna')).value));
  await page.fill('dialog textarea[name=notiz]', 'Aufnahme in die Annexe ab Januar');
  await dialogKnopf('Weitergeben');
  await page.waitForSelector('.ar-dkopf .ar-stelle:has-text("Annexe")', { timeout: 20000 });
  check('Stelle jetzt Annexe', true);
  check('„Weg durch das CDSE“ zeigt Diagnostique → Annexe', (await page.textContent('.ar-seite')).includes('Diagnostique → Annexe Junglinster'));
  await page.click('.ar-tabs [data-tab="verlauf"]');
  check('Protokoll nennt die Weitergabe', (await page.textContent('.ar-protokoll')).includes('Weitergegeben'));

  console.log('8) Anna sieht das Dossier und darf es bearbeiten (fallverantwortlich)');
  await abmelden();
  await anmelden('Anna Beispiel', 'noch ein Passwort 22');
  await gehe('#/schueler');
  await page.waitForSelector('.ar-tabelle', { timeout: 20000 });
  check('Anna sieht die Liste mit Tom', (await page.textContent('.ar-tabelle')).includes('MUSTER Tom'));
  await page.click('[data-filter-meine="1"]');
  check('„Nur meine“ zeigt Tom', (await page.textContent('#ar-liste')).includes('MUSTER Tom'));
  await gehe('#/schueler/' + sid);
  await page.waitForSelector('.ar-dkopf', { timeout: 20000 });
  check('Anna: „Du kannst bearbeiten“', (await page.textContent('.ar-dkopf')).includes('Du kannst bearbeiten'));
  check('Anna darf nicht löschen (kein Löschen-Menüpunkt)', !(await page.$('[data-ar="loeschen"]')));

  console.log('9) Drittes Konto ohne Rechte: nur lesen');
  await abmelden();
  await page.click('#g-neu');
  await erstelle('Ben Leser', 'cst', 'drittes Passwort 333', '-', '');
  await abmelden();
  await anmelden('Joey Muster', 'ein sicheres Passwort 1');
  await gehe('#/verwaltung'); await page.waitForSelector('[data-ar="freischalten"]', { timeout: 20000 }); await page.click('[data-ar="freischalten"]'); await warte(1500);
  await abmelden();
  await anmelden('Ben Leser', 'drittes Passwort 333');
  await gehe('#/schueler/' + sid);
  await page.waitForSelector('.ar-dkopf', { timeout: 20000 });
  check('Ben: „Nur lesen“', (await page.textContent('.ar-dkopf')).includes('Nur lesen'));
  check('Ben: kein „Weitergeben“', !(await page.$('[data-ar="weitergeben"]')));
  const benVersuch = await page.evaluate(async id => { try { await CDSE_TEAM.ops.eintrag(id, { text: 'darf nicht' }); return 'geschrieben'; } catch (e) { return e.message; } }, sid);
  check('Ben kann auch per Funktion nichts eintragen', /Leserechte/.test(benVersuch), benVersuch);
  check('Ben sieht keine Verwaltung', !(await page.isVisible('#nav a[href="#/verwaltung"]')));

  console.log('10) Neuladen: kein zweites Passwort nötig');
  await page.reload();
  await page.waitForSelector('#me:not([hidden])', { timeout: 20000 });
  await gehe('#/schueler/' + sid);
  await page.waitForSelector('.ar-dkopf, #g-pw', { timeout: 20000 });
  check('Nach Neuladen: Dossier öffnet ohne Passwortabfrage', await page.isVisible('.ar-dkopf'));

  console.log('11) Abmelden löscht die Sitzungsschlüssel');
  await abmelden();
  const reste = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('cdse-hub', 1); r.onsuccess = () => { const st = r.result.transaction('kv').objectStore('kv'); const a = st.get('sitzung-schluessel'), b = st.get('team-schluessel'); b.onsuccess = () => res([!!a.result, !!b.result]); }; }));
  check('Nach dem Abmelden: kein privater Schlüssel und kein Teamschlüssel mehr im Browser', !reste[0] && !reste[1], JSON.stringify(reste));
  console.log('Fehler im Browser:', errors.length ? errors.join(' | ') : 'keine');
  console.log('\n' + ok + ' ok, ' + bad + ' fehlgeschlagen');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
