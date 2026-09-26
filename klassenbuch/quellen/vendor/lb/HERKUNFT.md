# Lëtzebuergesch Wierderbuch (Rechtschreibprüfung)

`lb_LU.aff.gz` und `lb_LU.dic.gz` sind das offizielle luxemburgische
Hunspell-Wörterbuch, gepackt mit gzip.

- Quelle: npm-Paket `dictionary-lb` 4.0.0 (`index.aff` / `index.dic`),
  erzeugt aus <https://github.com/spellchecker-lu/dictionary-lb-lu>
- Copyright (C) 2008–2015 Michel Weimerskirch
  Copyright (C) 2016–2023 Michel Weimerskirch, Sandra Souza Morais
- Lizenz: EUPL V. 1.1 — voller Text in `LICENSE-EUPL-1.1.txt`
- 94 828 Einträge, `FLAG long`, Affix-Regeln und REP-Tabelle für Vorschläge

Aus der `.dic` sind vor dem Packen die morphologischen Felder entfernt worden
(alles hinter dem ersten Leerzeichen einer Zeile, z. B. `haut po:adverb` →
`haut`). Hunspell trennt diese Felder mit Leerzeichen oder Tabulator; nspell
schneidet sie nicht ab und hätte sonst „haut po:adverb" als ein Wort geführt —
gängige Wörter wie *haut* oder *muer* wären damit als Fehler markiert worden.
Nebenbei schrumpft das gepackte Wörterbuch von 561 auf 426 KB.

`../nspell.bundle.js` ist [nspell](https://github.com/wooorm/nspell) (MIT),
eine Hunspell-Umsetzung in JavaScript, mit esbuild zu einem Browser-Bündel
zusammengefasst (`--format=iife --global-name=NSPELL --minify`).

Beides wird beim Bau in `index.html` bzw. `isa.html` eingebettet, damit die
Prüfung ohne Internet funktioniert. Das Wörterbuch wird erst ausgepackt, wenn
zum ersten Mal in ein Textfeld geschrieben wird.

## Was zusätzlich als richtig gilt

In den echten Texten des Teams war mit dem Wörterbuch allein jedes sechste
Wort unterstrichen (16,6 %) — meist gar keine Fehler, sondern Namen,
Abkürzungen, französische Fachbegriffe und zusammengesetzte Wörter. Darum
prüft `spell.js` zusätzlich:

- Abkürzungen mit zwei oder mehr Großbuchstaben (LTA, CNI, SePAS) gelten.
- Namen aus der App: Klassenliste, Team, bekannte Ärzte/Therapeuten,
  Helfernetz, aus Berichten gelernte Namen, Orte — dazu häufige Vornamen
  und ein großgeschriebenes Wort direkt nach einem Titel (Dr, Madame, Här …)
  oder Vornamen.
- `../../spell-zusatz.js`: französische Fachwörter, Abkürzungen, Apps,
  Medikamentennamen und einige gebräuchliche Wörter, die im Wörterbuch fehlen.
- Zusammengesetzte Hauptwörter aus richtigen Teilen (Bezuch-s-Zäit,
  Ofschloss-Gespréich); der letzte Teil muss ein Hauptwort sein oder
  mindestens sechs Buchstaben haben.
- Wörter mit Bindestrich oder Apostroph werden in ihren Teilen geprüft
  (LTA-Proffen, d'Lilly, CCP'en).

Danach sind noch 9,8 % markiert — fast ausschließlich echte Fehler nach der
offiziellen Rechtschreibung (mei → méi, gett → gëtt, emmer → ëmmer) und
deutsche Wörter im luxemburgischen Text (und, ist, steht). Bei den
Vorschlägen steht dasselbe Wort mit dem fehlenden Akzent an erster Stelle.
