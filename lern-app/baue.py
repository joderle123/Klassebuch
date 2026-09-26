#!/usr/bin/env python3
"""Baut die Lern-App als eine Datei: apps/lernen.html

  python3 lern-app/baue.py

- nimmt alle Module aus lern-app/module/*.json, die das Prüfskript ohne Fehler
  besteht (halbfertige Module bleiben draußen – mit Hinweis),
- bettet sie gzip-gepackt ein (die App entpackt sie im Browser),
- dazu Quellen, Schriften, CSS, JS und die Titel der Arbeitsblätter aus
  apps/toolbox-index.js (nur die, auf die ein Modul verweist).
Ohne Internet, ohne Bibliotheken – wie alle Apps des Hubs.
"""
import base64, datetime, glob, gzip, io, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
ZIEL = os.path.join(REPO, 'apps', 'lernen.html')


def lies(p, modus='r'):
    with open(p, modus, **({} if 'b' in modus else {'encoding': 'utf-8'})) as f:
        return f.read()


def module():
    ok, raus = [], []
    for datei in sorted(glob.glob(os.path.join(HIER, 'module', '*.json'))):
        name = os.path.basename(datei)[:-5]
        r = subprocess.run(['node', os.path.join(HIER, 'pruefen.cjs'), datei], capture_output=True, text=True)
        if r.returncode != 0:
            fehler = [z for z in r.stdout.splitlines() if z.startswith('✗')]
            raus.append((name, fehler[0] if fehler else 'Prüfung fehlgeschlagen'))
            continue
        ok.append(json.loads(lies(datei)))
    return ok, raus


def toolbox(mods):
    """Nr., Titel und Stufen der Arbeitsblätter, auf die Module verweisen."""
    pfad = os.path.join(REPO, 'apps', 'toolbox-index.js')
    if not os.path.exists(pfad):
        return {}
    code = "global.window={};require(" + json.dumps(pfad) + ");process.stdout.write(JSON.stringify((window.CDSE_TOOLBOX_INDEX||{}).blaetter||[]))"
    try:
        blaetter = json.loads(subprocess.run(['node', '-e', code], capture_output=True, text=True, check=True).stdout or '[]')
    except Exception as e:
        print('  ! Toolbox-Index nicht lesbar:', e)
        return {}
    gewuenscht = {i for m in mods for i in (m.get('toolbox') or [])}
    out = {}
    for b in blaetter:
        if b.get('id') in gewuenscht:
            st = b.get('stufen') or []
            out[b['id']] = {'nr': b.get('nr', ''), 'titel': b.get('titel', ''), 'stufen': (st[0] + '–' + st[-1]) if len(st) > 1 else (st[0] if st else '')}
    return out


def main():
    mods, raus = module()
    if not mods:
        sys.exit('Keine gültigen Module gefunden.')
    tb = toolbox(mods)
    daten = json.dumps(mods, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    puffer = io.BytesIO()
    with gzip.GzipFile(fileobj=puffer, mode='wb', compresslevel=9, mtime=0) as g:
        g.write(daten)
    b64 = base64.b64encode(puffer.getvalue()).decode('ascii')
    js = lies(os.path.join(HIER, 'src', 'lernen.js'))
    quellen = lies(os.path.join(HIER, 'quellen.js'))
    for teil, text in (('lernen.js', js), ('quellen.js', quellen)):
        if '</script' in text.lower():
            sys.exit(teil + ' enthält „</script“ – bitte umschreiben.')
    html = lies(os.path.join(HIER, 'src', 'lernen.html'))
    ersetzen = {
        '@@INTER@@': base64.b64encode(lies(os.path.join(HIER, 'schriften', 'inter-var.woff2'), 'rb')).decode('ascii'),
        '@@MANROPE@@': base64.b64encode(lies(os.path.join(HIER, 'schriften', 'manrope-var.woff2'), 'rb')).decode('ascii'),
        '@@CSS@@': lies(os.path.join(HIER, 'src', 'lernen.css')),
        '@@QUELLEN@@': quellen,
        '@@STAND@@': datetime.date.today().strftime('%d.%m.%Y'),
        '@@TOOLBOX@@': json.dumps(tb, ensure_ascii=False).replace('</', '<\\/'),
        '@@DATEN@@': b64,
        '@@JS@@': js,
    }
    for k, v in ersetzen.items():
        if k not in html:
            sys.exit('Platzhalter fehlt in der Vorlage: ' + k)
        html = html.replace(k, v)
    os.makedirs(os.path.dirname(ZIEL), exist_ok=True)
    with open(ZIEL, 'w', encoding='utf-8') as f:
        f.write(html)
    fragen = sum(len(m['quiz']) for m in mods)
    print('apps/lernen.html gebaut: %d Module, %d Quizfragen, %d Arbeitsblatt-Verweise, %d KB (Module gepackt %d KB)' % (
        len(mods), fragen, len(tb), len(html.encode('utf-8')) // 1024, len(puffer.getvalue()) // 1024))
    for name, grund in raus:
        print('  – ausgelassen:', name, '→', grund)


if __name__ == '__main__':
    main()
