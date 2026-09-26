// Test: Hub der Annexe Junglinster (hub-quellen/annexe.py) – nur ein Team, ohne Datenbank und Journal, keine
// Stellen und kein Weitergeben, Teamliste ohne Team-Spalte (Einfügen, Tabelle, zurück einlesen), Übernahme der
// eingebauten Klasse aus dem Klassenbuch in die Hub-Dossiers, alle Apps (mit Befundbericht), nirgends „ISA“,
// „Journal“ oder „Datenbank“.
// Die Tests in diesem Ordner, die mehrere Teams voraussetzen, stammen aus dem gemeinsamen Stand (Unified).
// Personen sind erfunden; von der eingebauten Klasse werden nur Zahlen geprüft, keine Namen ausgegeben.
// Aufruf: node hub-quellen/tests/annexe.js   (Webserver auf Port 8099 für den Hauptordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || 'http://127.0.0.1:8099/';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg', acceptDownloads: true });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  const aufPage = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); p.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept()); };
  aufPage(page);
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(500); }
  async function knopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); }
  async function dialogZu() { await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 60000 }); await warte(300); }

  await page.goto(ROOT + 'hub.html');
  await page.evaluate(async () => {
    const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); }
    localStorage.clear(); sessionStorage.clear();
    for (const n of ['cdse_dossier_db', 'klassebuch-sync', 'anwesenheit-sync']) { await new Promise(res => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => res(); }); }
    await r.getFileHandle('hub.html', { create: true });
  });
  await page.reload();

  console.log('1) Konto ohne Team-Wahl');
  check('Titel „Annexe Junglinster“', (await page.title()) === 'Annexe Junglinster' && (await text('#gate-card')).includes('Annexe Junglinster'));
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  check('Beim Konto erstellen keine Team-Wahl', !(await page.$('input[name="g-team"]')) && !(await text('#gate-card')).includes('Team arbeitest'));
  check('Auswahl „Responsable“ gestaltet wie die anderen Felder', await page.evaluate(() => { const s = document.getElementById('g-resp'); return s && s.getBoundingClientRect().height >= 40; }));
  await page.fill('#g-name', 'Mia Muster'); await page.fill('#g-funktion', 'Direktion'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', 'ein sicheres Passwort 1'); await page.fill('#g-pw2', 'ein sicheres Passwort 1'); await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  check('Konto gehört zum Team der Annexe', await page.evaluate(() => CDSE_KONTO.ich().team === 'annexe' && CDSE_KONTO.ich().teamName === 'Annexe Junglinster'));
  const home = (await text('#v-home')).replace(/\s+/g, ' ');
  check('Übersicht: „für den Alltag in der Annexe“, alle sieben Apps (mit Befundbericht)', home.includes('für den Alltag in der Annexe') && (await page.$$eval('#home-body .tile:not(.add) h3', l => l.map(x => x.textContent))).join('|') === 'Klassenbuch|Befundbericht|ELDiB-Generator|Toolbox|Skills-Kurs|Lernen|Pathologien');
  if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava');
  await page.click('[data-konto="profil"]'); await page.waitForSelector('#g-funktion');
  check('Profil ändern: Funktion und Responsable, keine Team-Wahl', !(await page.$('input[name="g-team"]')) && (await text('#gate-card')).includes('Funktion und Responsable'));
  await page.click('#g-abbruch'); await warte(300);

  console.log('2) Schülerbereich: keine Stellen, kein Weitergeben');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  check('Schülerliste: „der Annexe“, keine Stellen-Filter', (await text('#arbeit-body')).includes('Alle Schülerinnen und Schüler der Annexe') && !(await page.$('[data-filter-stelle]')));
  await page.click('[data-ar="neu"]'); await page.waitForSelector('dialog.ar-dialog input[name=nachname]');
  check('Neuer Schüler: keine Auswahl „Zuständige Stelle“', !(await page.$('dialog select[name=stelle]')) && (await page.inputValue('dialog input[name=stelle]')) === 'annexe' && !(await text('dialog.ar-dialog')).includes('andere Stelle'));
  await page.fill('dialog input[name=nachname]', 'Muster'); await page.fill('dialog input[name=vorname]', 'Tom'); await page.fill('dialog input[name=klasse]', 'L1');
  await knopf('Anlegen'); await page.waitForSelector('.ar-dkopf h1', { timeout: 20000 });
  const tom = await page.evaluate(() => location.hash.split('/').pop());
  const dk = await page.evaluate(async id => ({ stelle: (await CDSE_TEAM.dossier(id)).stelle, chip: !!document.querySelector('.ar-dkopf .ar-stelle'), weiter: !!document.querySelector('[data-ar="weitergeben"]'), zust: (document.querySelector('.ar-seite') || { textContent: '' }).textContent }), tom);
  check('Dossier gehört zur Annexe, ohne Stellen-Abzeichen und ohne „Weitergeben“', dk.stelle === 'annexe' && !dk.chip && !dk.weiter, dk);
  check('Zuständigkeit ohne Zeile „Stelle“', dk.zust.includes('Fallverantwortlich') && !/Stelle/.test(dk.zust));
  await gehe('#/schueler'); await page.waitForSelector('.ar-tabelle .ar-zeile:not(.kopf)');
  const liste = await page.evaluate(() => ({ klasse: document.querySelector('.ar-tabelle').className, kopf: document.querySelector('.ar-zeile.kopf').textContent, spalten: document.querySelector('.ar-tabelle .ar-zeile:not(.kopf)').children.length }));
  check('Schülerliste: vier Spalten, keine Spalte „Stelle“', /ein-team/.test(liste.klasse) && !/Stelle/.test(liste.kopf) && liste.spalten === 4, liste);

  console.log('3) Ohne Datenbank');
  check('Kein Menüpunkt „Datenbank“', !(await page.$('#nav a[href="#/datenbank"]')) && !(await text('#nav')).includes('Datenbank'));
  await gehe('#/datenbank');
  check('Adresse #/datenbank führt nicht zu einer Datenbank-Seite', !(await page.title()).includes('Datenbank') && !(await page.evaluate(() => document.getElementById('v-arbeit').classList.contains('on') && document.getElementById('arbeit-body').textContent.includes('Datenbank'))));

  console.log('4) Teamliste ohne Team-Spalte');
  await gehe('#/verwaltung'); await page.waitForSelector('[data-ar="tl-einfuegen"]', { timeout: 20000 });
  const verw = (await text('#arbeit-body')).replace(/\s+/g, ' ');
  check('Mitglieder und Teamliste ohne Spalte „Team“', !verw.includes('Team · Funktion') && verw.includes('Alle Mitarbeitenden der Annexe'));
  await page.click('[data-ar="tl-einfuegen"]'); await page.waitForSelector('dialog textarea[name=text]');
  const hilfe = await text('dialog.ar-dialog');
  check('Anleitung: „Name; Funktion; Rolle; Responsable“, kein Team-Beispiel', hilfe.includes('Name; Funktion; Rolle; Responsable') && !/ISA|CLAPA|Diagnostique/.test(hilfe));
  await page.fill('dialog textarea[name=text]', 'Lea Beispiel; Éducatrice graduée; Responsable\nBen Probe; Instituteur; ; Lea Beispiel\nNina Fiktiv\tPsychologin\tMitarbeiterin');
  await knopf('Prüfen'); await page.waitForSelector('dialog.ar-dialog h2:has-text("Teamliste übernehmen?")');
  const vorschau = (await text('dialog.ar-dialog')).replace(/\s+/g, ' ');
  check('Vorschau: drei Personen, Spalten Funktion, Rolle, Responsable, keine Probleme', vorschau.includes('3 Personen erkannt') && vorschau.includes('NameFunktionRolleResponsable') && !vorschau.includes('Bitte prüfen'), vorschau.slice(0, 300));
  await knopf('Übernehmen'); await dialogZu();
  const tl = await page.evaluate(() => CDSE_KONTO.teamliste());
  const nach = n => tl.filter(p => p.name === n)[0] || {};
  check('Werte: Funktion, Rolle und Responsable richtig, Team immer Annexe', nach('Lea Beispiel').funktion === 'Éducatrice graduée' && nach('Lea Beispiel').rolle === 'responsable' && nach('Ben Probe').funktion === 'Instituteur' && nach('Ben Probe').responsable === 'Lea Beispiel' && nach('Nina Fiktiv').funktion === 'Psychologin' && tl.every(p => p.team === 'annexe'), tl);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-ar="tl-export"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  check('„Als Tabelle“: Annexe-Teamliste.csv ohne Spalte „Team“', dl.suggestedFilename() === 'Annexe-Teamliste.csv' && csv.replace(/^﻿/, '').split('\r\n')[0] === 'Name;Funktion;Rolle;Responsable;Konto', csv.slice(0, 80));
  /* Tabelle wieder einlesen (mit Kopfzeile, zusätzlich eine Tabelle im alten Format mit Spalte „Team“) */
  await page.click('[data-ar="tl-einfuegen"]'); await page.waitForSelector('dialog textarea[name=text]');
  await page.fill('dialog textarea[name=text]', csv.replace(/^﻿/, ''));
  await knopf('Prüfen'); await page.waitForSelector('dialog.ar-dialog h2:has-text("Teamliste übernehmen?")');
  check('Eigene Tabelle wieder eingelesen: 3 Personen, alle „aktualisiert“, keine Probleme', /3 Personen erkannt: 0 neu, 3 aktualisiert/.test(await text('dialog.ar-dialog')) && !(await text('dialog.ar-dialog')).includes('Bitte prüfen'), (await text('dialog.ar-dialog')).slice(0, 200));
  await knopf('Übernehmen'); await dialogZu();
  const tl2 = await page.evaluate(() => CDSE_KONTO.teamliste());
  check('Nach dem Zurücklesen unverändert', ['Lea Beispiel', 'Ben Probe', 'Nina Fiktiv'].every(n => { const a = nach(n), b = tl2.filter(p => p.name === n)[0] || {}; return a.funktion === b.funktion && a.rolle === b.rolle && a.responsable === b.responsable; }), tl2);
  await page.click('[data-ar="tl-einfuegen"]'); await page.waitForSelector('dialog textarea[name=text]');
  await page.fill('dialog textarea[name=text]', 'Name\tTeam\tFunktion\tRolle\nTim Fiktiv\tISA\tLogopäde\tResponsable');
  await knopf('Prüfen'); await page.waitForSelector('dialog.ar-dialog h2:has-text("Teamliste übernehmen?")');
  await knopf('Übernehmen'); await dialogZu();
  const tim = (await page.evaluate(() => CDSE_KONTO.teamliste())).filter(p => p.name === 'Tim Fiktiv')[0] || {};
  check('Tabelle im alten Format (mit Spalte „Team“): nach Kopfzeile gelesen, Team wird Annexe', tim.funktion === 'Logopäde' && tim.rolle === 'responsable' && tim.team === 'annexe', tim);

  console.log('5) Ohne Journal');
  const fremd = await page.evaluate(() => {
    const f = t => { try { CDSE_KB_UEBERNAHME.dateiLesen('x.json', JSON.stringify(t)); return 'angenommen'; } catch (e) { return e.message; } };
    return {
      journal: f({ _format: 'klassebuch-shared-v1', _app: 'journal', colls: { roster: [] } }),
      geraten: f({ _format: 'klassebuch-shared-v1', colls: { roster: [], pei: [], agenda: [] } }),
      sicherung: f({ format: 'isa-journal-backup', stores: {}, dossier: {} }),
      klassenbuch: CDSE_KB_UEBERNAHME.dateiLesen('k.json', JSON.stringify({ _format: 'klassebuch-shared-v1', _app: 'klassenbuch', colls: { roster: [] } })).app
    };
  });
  check('Team-Dateien und Sicherungen des Journals werden abgelehnt, das Klassenbuch angenommen', [fremd.journal, fremd.geraten, fremd.sicherung].every(t => /gehört nicht zum Klassenbuch der Annexe/.test(t)) && fremd.klassenbuch === 'klassenbuch', fremd);

  console.log('6) Eingebaute Klasse aus dem Klassenbuch übernehmen');
  const kb = await ctx.newPage(); aufPage(kb);
  await kb.goto(ROOT + 'apps/klassenbuch.html', { waitUntil: 'load' }); await kb.waitForTimeout(3500);
  const kbZahlen = await kb.evaluate(() => {
    const n = {}; (Repo.entries || []).forEach(e => { n[e.studentId] = (n[e.studentId] || 0) + 1; });
    const z = {}; (Repo.reunions || []).forEach(r => Object.keys(r.goals || {}).forEach(sid => { if (sid !== 'group' && (r.goals[sid] || []).some(g => String(g && typeof g === 'object' ? g.text : g).trim())) { z[sid] = (z[sid] || 0) + 1; } }));
    return { kinder: KB_ROSTER.list().length, eintraege: n, zielTage: z };
  });
  await kb.close();
  check('Klassenbuch hat die eingebaute Klasse mit Einträgen', kbZahlen.kinder > 5 && Object.keys(kbZahlen.eintraege).length > 5, { kinder: kbZahlen.kinder });
  await gehe('#/'); await gehe('#/schueler'); await page.waitForSelector('[data-kbu="oeffnen"]', { timeout: 20000 });
  check('Karte „Schülerdaten aus dem Klassenbuch“', (await text('#ar-kbu')).includes('Schülerdaten aus dem Klassenbuch'));
  await page.click('[data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog select[name^="kbu:"]', { timeout: 30000 });
  check('Dialog „Aus dem Klassenbuch übernehmen“', (await text('dialog.ar-dialog h2')) === 'Aus dem Klassenbuch übernehmen');
  const zeilen = await page.$$eval('dialog.ar-dialog select[name^="kbu:"]', l => l.map(s => s.name));
  for (const n of zeilen) { await page.selectOption('dialog.ar-dialog select[name="' + n + '"]', 'neu'); }
  await knopf('Übernehmen');
  await page.waitForSelector('dialog.ar-dialog .sc-kb-ergebnis', { timeout: 180000 });
  const erg = (await text('dialog.ar-dialog')).replace(/\s+/g, ' ');
  check('Übernahme ohne Fehler', !/Nicht übernommen|bitte prüfen/i.test(erg), erg.slice(0, 300));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Schließen")'); await dialogZu();
  const hub = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ kb: (d.herkunft || {}).klassenbuch || [], n: (d.eintraege || []).filter(e => e.herkunft && e.herkunft.app === 'klassenbuch' && !/^reu:/.test(e.herkunft.id)).length, z: (d.eintraege || []).filter(e => e.herkunft && /^reu:/.test(e.herkunft.id)).length })));
  const falsch = [];
  Object.keys(kbZahlen.eintraege).forEach(sid => { const d = hub.filter(x => x.kb.indexOf(sid) >= 0)[0]; if (!d || d.n !== kbZahlen.eintraege[sid] || d.z !== (kbZahlen.zielTage[sid] || 0)) { falsch.push({ soll: kbZahlen.eintraege[sid], ist: d ? d.n : null, zieleSoll: kbZahlen.zielTage[sid] || 0, zieleIst: d ? d.z : null }); } });
  check('Jedes Kind: alle Einträge und Wochenziele im Hub-Dossier', falsch.length === 0 && Object.keys(kbZahlen.eintraege).length > 0, falsch.slice(0, 5));
  await gehe('#/'); await gehe('#/schueler'); await page.waitForSelector('.ar-tabelle', { timeout: 20000 }); await warte(1500);
  check('Danach nur noch der kleine Link, kein Hinweis mehr', !(await page.$('#ar-kbu .sc-kb-karte')) && !!(await page.$('#ar-kbu .kbu-link')));

  console.log('7) Screening: Rollen der Annexe');
  await gehe('#/schueler/' + tom); await page.waitForSelector('.ar-tabs [data-tab="screening"]', { timeout: 20000 });
  await page.click('.ar-tabs [data-tab="screening"]'); await page.waitForSelector('[data-sc="neu"]'); await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  const rollen = await page.$$eval('select[name="sc-rolle"] option', l => l.map(o => o.value));
  check('Rollen ohne ISA und Diagnostique', !rollen.includes('isa') && !rollen.includes('diagnostique') && rollen.includes('lehrkraft') && rollen.includes('educ'), rollen);
  await page.click('.sc-bogen [data-sc="abbrechen"]').catch(() => {}); await warte(300);

  console.log('8) Nirgends „ISA“, „Journal“, „Datenbank“, „CDSE Hub“');
  const VERBOTEN = /\bISA\b|Journal|Datenbank|CDSE Hub|Diagnostique-Team/;
  const funde = [];
  const pruefe = async wo => { const t = (await page.evaluate(() => document.body.innerText)).replace(/Intervention spécialisée ambulatoire \(ISA\)/g, ''); const m = t.match(VERBOTEN); if (m) { funde.push(wo + ': „' + m[0] + '“ in „' + t.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ') + '“'); } };
  for (const h of ['#/', '#/schueler', '#/einsatz', '#/verwaltung', '#/screening', '#/hinzufuegen']) { await gehe(h); await warte(700); await pruefe(h); }
  await gehe('#/schueler/' + tom); await page.waitForSelector('.ar-tabs [data-tab]', { timeout: 20000 });
  const tabs = await page.$$eval('.ar-tabs [data-tab]', l => l.map(b => b.getAttribute('data-tab')));
  for (const t of tabs) { await page.click('.ar-tabs [data-tab="' + t + '"]'); await warte(600); await pruefe('Dossier/' + t); }
  check('Keine verbotenen Bezeichnungen in Übersicht, Schülerliste, Einsatzplan, Verwaltung, Screening, Anleitung und allen Dossier-Reitern', funde.length === 0, funde);

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
