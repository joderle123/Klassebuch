#!/usr/bin/env python3
"""Baut die neuen Module in hub.html ein (wiederholbar).
Konto-Modul (konto3.js), Gemeinsamer Bereich (team.js), Arbeit (arbeit.js),
Gestaltung (arbeit.css), Symbole, Ansicht und Anpassungen im Hub-Skript."""
import re, os
SP = os.path.dirname(os.path.abspath(__file__))
P = os.environ.get('CDSE_HUB_ZIEL') or os.path.abspath(os.path.join(SP, '..', 'hub.html'))   # baut ../hub.html
# Immer vom Stand VOR dem Einbau ausgehen - so bleibt das Skript wiederholbar
BASIS = os.path.join(SP, 'hub.vor-arbeit.html')
s = open(BASIS, encoding='utf-8').read()
lies = lambda n: open(os.path.join(SP, n), encoding='utf-8').read().rstrip()

def ersetze(a, b, pflicht=True):
    global s
    if a not in s:
        if pflicht:
            raise SystemExit('FEHLT: ' + a[:120])
        return False
    s = s.replace(a, b, 1)
    return True

# 1) Konto-Modul
a = s.index('<script>\n/* =====================================================================\n   CDSE Hub — Konten, Anmeldung und Daten-Tresor')
b = s.index('</script>', a) + len('</script>')
s = s[:a] + '<script>\n' + lies('konto3.js') + '\n</script>' + s[b:]

# 2) Gemeinsamer Bereich + Arbeit (nach dem Konto-Modul, vor dem Hub-Skript)
def block(kopf, datei):
    global s
    marke = '<script>\n/* =====================================================================\n   ' + kopf
    if marke in s:
        a = s.index(marke)
        b = s.index('</script>', a) + len('</script>')
        s = s[:a] + '<script>\n' + lies(datei) + '\n</script>' + s[b:]
    else:
        a = s.index('<script>\n/* =====================================================================\n   CDSE Hub — Konten, Anmeldung und Daten-Tresor')
        b = s.index('</script>', a) + len('</script>')
        s = s[:b] + '\n<script>\n' + lies(datei) + '\n</script>' + s[b:]
block('CDSE Hub — Arbeit: Schüler, Dossiers, Einsatzplan, Team, Verwaltung', 'arbeit.js')
block('CDSE Hub — Gemeinsamer Bereich: Schülerdossiers und Einsatzpläne', 'team.js')
# Reihenfolge prüfen: Konto < Team < Arbeit < Hub-Skript
ik = s.index('CDSE Hub — Konten, Anmeldung und Daten-Tresor'); it = s.index('CDSE Hub — Gemeinsamer Bereich'); ia = s.index('CDSE Hub — Arbeit: Schüler')
if not (ik < it < ia):
    # Team muss vor Arbeit stehen
    ta = s.index('<script>\n/* =====================================================================\n   CDSE Hub — Gemeinsamer Bereich')
    tb = s.index('</script>', ta) + len('</script>')
    team = s[ta:tb]; s = s[:ta] + s[tb:]
    aa = s.index('<script>\n/* =====================================================================\n   CDSE Hub — Arbeit: Schüler')
    s = s[:aa] + team + '\n' + s[aa:]

# 2b) Zusatzmodule nach dem Arbeitsbereich: Fiche de renseignement, Datenbank (optional)
import base64
def block_nach(anker, datei, ersatz=None):
    global s
    if not os.path.exists(os.path.join(SP, datei)):
        return
    inhalt = lies(datei)
    for k, v in (ersatz or {}).items():
        inhalt = inhalt.replace(k, v)
    a = s.index('<script>\n/* =====================================================================\n   ' + anker)
    b = s.index('</script>', a) + len('</script>')
    s = s[:b] + '\n<script>\n' + inhalt + '\n</script>' + s[b:]
VORLAGE_B64 = base64.b64encode(open(os.path.join(SP, 'fiche', 'vorlage.docx'), 'rb').read()).decode('ascii')
block_nach('CDSE Hub — Arbeit: Schüler', 'datenbank.js')
# Screening: Titel der Lernmodule (für Verweise „Zum Nachlesen“) aus lern-app/module/*.json
import glob, json as _json
_lern = {}
for _p in sorted(glob.glob(os.path.join(SP, '..', 'lern-app', 'module', '*.json'))):
    try:
        _m = _json.load(open(_p, encoding='utf-8'))
        _lern[_m['id']] = _m['titel']
    except Exception:
        pass
block_nach('CDSE Hub — Arbeit: Schüler', 'screening.js', {'@@LERN_TITEL@@': _json.dumps(_lern, ensure_ascii=False)})
block_nach('CDSE Hub — Arbeit: Schüler', 'screening-bogen.js')
block_nach('CDSE Hub — Arbeit: Schüler', 'fiche.js', {'@@FICHE_VORLAGE_B64@@': VORLAGE_B64})

# 3) Gestaltung
css = lies('arbeit.css')
if os.path.exists(os.path.join(SP, 'datenbank.css')):
    css = css + '\n' + lies('datenbank.css')
if os.path.exists(os.path.join(SP, 'screening.css')):
    css = css + '\n' + lies('screening.css')
if '/* ==== Arbeit: Schüler, Dossier' in s:
    a = s.index('/* ==== Arbeit: Schüler, Dossier'); b = s.index('/* ==== Ende Arbeit ==== */', a) + len('/* ==== Ende Arbeit ==== */')
    s = s[:a] + css + s[b:]
else:
    a = s.index('</style>')
    s = s[:a] + css + '\n' + s[a:]

# 4) Symbole
SYMBOLE = {
 'schueler': '<path d="M12 4 2.5 8.5 12 13l9.5-4.5z"/><path d="M6.5 10.6v4.2c0 1.6 2.5 3.2 5.5 3.2s5.5-1.6 5.5-3.2v-4.2"/><path d="M21.5 8.5v5.5"/>',
 'uhr': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 'team': '<circle cx="12" cy="7.5" r="3"/><path d="M6.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="4.8" cy="10" r="2.1"/><circle cx="19.2" cy="10" r="2.1"/><path d="M1.8 18.5a3.8 3.8 0 0 1 4.6-3.5M22.2 18.5a3.8 3.8 0 0 0-4.6-3.5"/>',
 'schild': '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
 'weiter': '<path d="M4 12h12"/><path d="m12 7 5 5-5 5"/><path d="M20 5v14"/>',
 'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
 'pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
 'daten': '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12"/>',
 'datei': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h7M9.5 16.5h7"/>',
 'hoch': '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 15.5v3.5h15v-3.5"/>',
 'runter': '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 15.5v3.5h15v-3.5"/>',
}
sprite_ende = s.index('</svg>', s.index('<body>'))
neu = ''.join('\n  <symbol id="i-%s" viewBox="0 0 24 24">%s</symbol>' % (k, v) for k, v in SYMBOLE.items() if ('id="i-%s"' % k) not in s)
s = s[:sprite_ende] + neu.lstrip('\n') + ('\n' if neu else '') + s[sprite_ende:]

# 5) Ansicht
if 'id="v-arbeit"' not in s:
    ersetze('  </main>', '    <!-- Arbeit: Schüler, Einsatzplan, Team, Verwaltung -->\n    <section class="view scroll" id="v-arbeit" aria-label="Arbeit"><div class="pad" id="arbeit-body"></div></section>\n  </main>')

# 6) Text-Motor des ELDiB-Generators (optional; fehlt er, zeigt das Dossier nur Fakten)
if '<script src="apps/ds-motor.js"></script>' not in s:
    ersetze('<script src="apps/versionen.js"></script>', '<script src="apps/versionen.js"></script>\n<!-- Text-Motor des ELDiB-Generators für das Schülerprofil (von update-apps.cjs geholt) -->\n<script src="apps/ds-motor.js"></script>')
# 6b) Materialverzeichnis der Toolbox (optional; fehlt es, zeigt das Dossier keine Materialvorschläge)
if '<script src="apps/toolbox-index.js"></script>' not in s:
    ersetze('<script src="apps/ds-motor.js"></script>', '<script src="apps/ds-motor.js"></script>\n<!-- Materialverzeichnis der Toolbox für Materialvorschläge im Dossier (von update-apps.cjs geholt) -->\n<script src="apps/toolbox-index.js"></script>')

# 7) Hub-Skript
ersetze("""  ['home','app','guide'].forEach(function(n){$('v-'+n).classList.toggle('on',n===v);});""",
        """  ['home','app','guide','arbeit'].forEach(function(n){$('v-'+n).classList.toggle('on',n===v);});""", pflicht=False)
ersetze("""function renderSide(){
  var h='<a class="lnk" href="#/" data-route="home" title="Übersicht"><span class="lic">'+svg('home')+'</span><span class="lnk-t">Übersicht</span></a>';""",
"""function renderSide(){
  var h='<a class="lnk" href="#/" data-route="home" title="Übersicht"><span class="lic">'+svg('home')+'</span><span class="lnk-t">Übersicht</span></a>';
  if(ICH&&window.CDSE_ARBEIT){h+=window.CDSE_ARBEIT.navHtml(view==='arbeit'?arbeitSeite:'');}""", pflicht=False)
ersetze("""    l.classList.toggle('active',(view==='app'&&ap&&ap===current)||(view==='home'&&rt==='home')||(view==='guide'&&(current?(ap&&ap===current):rt==='guide')));""",
        """    l.classList.toggle('active',(view==='app'&&ap&&ap===current)||(view==='home'&&rt==='home')||(view==='guide'&&(current?(ap&&ap===current):rt==='guide'))||(view==='arbeit'&&rt==='arbeit-'+arbeitSeite));""", pflicht=False)
ersetze("""var view='home', current=null, frames={}, missing={}, sideOverride=null, tabs={};""",
        """var view='home', current=null, frames={}, missing={}, sideOverride=null, tabs={}, arbeitSeite='';""", pflicht=False)
ersetze("""  var h=location.hash||'#/', m=h.match(/^#\\/app\\/(.+)$/);
  if(m){openApp(decodeURIComponent(m[1]));}""",
"""  var h=location.hash||'#/', m=h.match(/^#\\/app\\/(.+)$/), ar=h.match(/^#\\/(schueler|screening|einsatz|team|verwaltung|datenbank)(?:\\/([^\\/?#]+))?/);
  if(ar&&window.CDSE_ARBEIT){
    current=null;arbeitSeite=ar[1];show('arbeit');
    window.CDSE_ARBEIT.zeigen(ar[1],ar[2]?decodeURIComponent(ar[2]):'');
    var titel={schueler:'Schüler',screening:'Screening',einsatz:'Mein Einsatzplan',team:'Mein Team',verwaltung:'Verwaltung',datenbank:'Datenbank'}[ar[1]];
    document.title=titel+' · '+HUB_TITLE;$('top-title').textContent=titel;
  }
  else if(m){openApp(decodeURIComponent(m[1]));}""", pflicht=False)
# App öffnen/neu laden von außen (Dossier -> ELDiB-Generator) und Seitenleiste neu zeichnen
ersetze("""function closeCurrent(){""", """/* Für den Arbeitsbereich: App öffnen, auf Wunsch neu laden */
window.CDSE_HUB_OEFFNE=function(id,neuLaden){
  var a=byId(id);if(!a){return;}
  if(neuLaden&&frames[id]){var fr=frames[id];fr.src='about:blank';setTimeout(function(){fr.src=a.datei;},40);}
  location.hash='#/app/'+encodeURIComponent(id);
};
window.CDSE_HUB_NAV=function(){renderSide();};
function closeCurrent(){""", pflicht=False)
# Konto-Menü: Profil statt nur Team
ersetze("""      (TEAMS_AKTIV?'<button type="button" role="menuitem" data-konto="team">'+svg('users')+'Team ändern</button>':'')+""",
        """      '<button type="button" role="menuitem" data-konto="profil">'+svg('users')+'Profil ändern</button>'+""", pflicht=False)
# Anleitung: das Test-Tool heißt jetzt „Befundbericht“
ersetze('Wie der ELDiB-Generator oder das Screening: eine', 'Wie der ELDiB-Generator oder der Befundbericht: eine', pflicht=False)
# Anleitung: der Menüpunkt heißt jetzt „Profil ändern“ (Team, Funktion, Responsable)
ersetze("""Das eigene Team ändert man im Hub unten links über das Menü <b>⋮</b> → <b>Team ändern</b>.""",
        """Das eigene Team (und die Responsable) ändert man im Hub unten links über das Menü <b>⋮</b> → <b>Profil ändern</b>.""", pflicht=False)
# Übersicht: Einsatzplan-Karte und Hinweis auf fehlende Responsable
ersetze("""  if(!q&&!activeCat){HINWEISE.forEach(function(t,i){""",
"""  if(!q&&!activeCat&&ICH&&!ICH.responsableGewaehlt){h+='<div class="problem info" role="status">'+svg('info')+'<div><b>Neu:</b> Bitte trage deine <b>Responsable</b> ein – Konto-Menü unten links → <b>Profil ändern</b>. Sie sieht dann deinen Einsatzplan.</div></div>';}
  if(!q&&!activeCat){h+='<div id="ar-heute-platz"></div>';}
  if(!q&&!activeCat){HINWEISE.forEach(function(t,i){""", pflicht=False)
ersetze("""  $('home-body').innerHTML=h;
}""", """  $('home-body').innerHTML=h;
  if(window.CDSE_ARBEIT&&$('ar-heute-platz')){window.CDSE_ARBEIT.heuteKarte().then(function(k){var el=$('ar-heute-platz');if(el){el.innerHTML=k;}});}
}""", pflicht=False)
# Anmelden: Arbeitsbereich im Hintergrund laden (Menü Verwaltung / Mein Team)
ersetze("""    renderMe();route();teamOrdnerAnlegen();
  },""", """    renderMe();route();teamOrdnerAnlegen();
    if(window.CDSE_ARBEIT){window.CDSE_ARBEIT.vorladen();}
  },""", pflicht=False)
# Anmelden/Abmelden
ersetze("""  appsSchliessen:function(){aufraeumen(true);if(view==='app'){show('home');}},""",
        """  appsSchliessen:function(){aufraeumen(true);if(view==='app'){show('home');}},
  schluesselWeg:function(){if(window.CDSE_TEAM){window.CDSE_TEAM.vergessen();}},""", pflicht=False)
ersetze("""    menuAuf(false);aufraeumen(true);ICH=null;HINWEISE=[];renderMe();activeCat='';$('q').value='';""",
        """    menuAuf(false);aufraeumen(true);ICH=null;HINWEISE=[];renderMe();activeCat='';$('q').value='';
    if(window.CDSE_ARBEIT){window.CDSE_ARBEIT.zuruecksetzen();}""", pflicht=False)
open(P, 'w', encoding='utf-8').write(s)
print('hub.html gebaut:', len(s), 'Zeichen')
