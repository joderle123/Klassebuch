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
