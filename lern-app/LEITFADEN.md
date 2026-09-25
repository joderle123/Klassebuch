# Lern-App des CDSE – Leitfaden für Lernmodule

Die Lern-App ist für **Mitarbeitende** (Lehrkräfte, Educateurs, ISA, I-EBS,
Diagnostique). Viele haben keinen klinischen Abschluss und begegnen trotzdem
täglich ADHS, Trauma, Angst, Autismus oder Krisen. Die Module geben ihnen ein
**solides Fundament**: verständlich, fachlich korrekt, auf dem Stand der
Forschung – und immer mit dem Blick auf den Schulalltag: *Was sehe ich? Was
bedeutet es? Was kann ich tun? Wann brauche ich Unterstützung?*

Qualitätsmaßstab: wie ein gutes Fachbuch oder eine seriöse Fortbildung
(Hogrefe, Beltz, Springer) – nicht wie ein Blogartikel und nicht wie KI-Text.

## Format

Jedes Modul ist eine Datei `module/<id>.json`:

```json
{
  "id": "adhs",
  "bereich": "stoerungen",          // grundlagen | stoerungen | muster | handeln | system
  "titel": "ADHS",
  "untertitel": "Aufmerksamkeit, Unruhe, Impulsivität – verstehen und im Alltag begleiten",
  "dauer": 35,                        // Lesezeit + Quiz in Minuten
  "lernziele": ["…", "…", "…"],     // 3–5, als Können formuliert („Sie können …“)
  "kapitel": [
    { "titel": "…", "bloecke": [ … ] }
  ],
  "quiz": [ … ],                      // 8–12 Fragen
  "glossar": [ { "begriff": "…", "erklaerung": "…" } ],   // 4–10 Fachbegriffe
  "quellen": ["dsm5tr", "faraone2021"],                   // Schlüssel aus quellen.js
  "verwandt": ["oppositionell-aggressiv"],                // andere Modul-ids
  "toolbox": ["stopp-denken-handeln"]                      // passende Arbeitsblätter (ids)
}
```

### Blöcke in Kapiteln

| art | Felder | Wofür |
|---|---|---|
| `text` | `text` | Fließtext. Absätze mit Leerzeile (`\n\n`). **Fett** mit `**…**`, *kursiv* mit `*…*`. |
| `merke` | `text` | Das Wichtigste in 1–3 Sätzen. |
| `fall` | `titel`, `text`, `fragen?` | Fallbeispiel aus dem Schulalltag (erfundene Namen), optional Reflexionsfragen. |
| `liste` | `titel?`, `punkte` | Aufzählung (Anzeichen, Kriterien …). |
| `tabelle` | `titel?`, `spalten`, `zeilen` | Vergleich, Übersicht. |
| `tun` | `titel?`, `punkte` | „Was hilft“ – konkrete Handlungen im Alltag. |
| `lassen` | `titel?`, `punkte` | „Was eher schadet“. |
| `mythos` | `mythos`, `fakt` | Verbreiteter Irrtum und was stimmt. |
| `abgrenzung` | `titel?`, `punkte: [{wie, unterschied}]` | Was sieht ähnlich aus, ist aber etwas anderes? |
| `weiter` | `text` | Wann weitervermitteln / Unterstützung holen (Leitung, Diagnostique, Ärztin, Kinderschutz). |
| `achtung` | `text` | Sicherheitsrelevante Hinweise (Krise, Gefährdung). |

Ein Modul hat **4–7 Kapitel**, zusammen etwa **2 000–3 500 Wörter**. Jedes
Kapitel mischt Text mit Kästen; lange Textwände vermeiden.

Empfohlener Aufbau für Störungsbilder:
1. Worum es geht (kurzes Fallbeispiel als Einstieg, Kernmerkmale)
2. Erkennen: wie es sich im Alltag zeigt (nach Alter), Kriterien in Alltagssprache, Häufigkeit
3. Verstehen: Ursachen und Entstehung (bio-psycho-sozial), Verlauf, häufige Begleitprobleme
4. Abgrenzen: was ähnlich aussieht (inkl. Mehrsprachigkeit, Trauma, Überforderung)
5. Handeln: was im Schulalltag hilft, was schadet, Zusammenarbeit mit Eltern
6. Behandlung & Hilfe: was Fachleute tun (Diagnostik, Therapie, ggf. Medikamente), wann weitervermitteln

### Quiz

```json
{ "art": "einfach", "frage": "…", "optionen": ["…","…","…","…"], "richtig": [2], "erklaerung": "…" }
{ "art": "mehrfach", "frage": "… (mehrere richtig)", "optionen": ["…","…","…","…","…"], "richtig": [0, 3], "erklaerung": "…" }
{ "art": "richtigfalsch", "frage": "Aussage …", "richtig": [0], "erklaerung": "…" }   // [0] = richtig, [1] = falsch
{ "art": "fall", "fall": "Kurze Situation …", "frage": "Was ist der beste nächste Schritt?", "optionen": [...], "richtig": [1], "erklaerung": "…" }
```

- 8–12 Fragen, gemischt; **mindestens 3 Fallfragen** (Transfer in den Alltag), höchstens 3 Richtig/Falsch.
- Prüft Verständnis, nicht Auswendiglernen von Zahlen.
- Falsche Optionen sind plausibel (typische Irrtümer), nie albern.
- `erklaerung` begründet die richtige Antwort **und** warum die anderen nicht passen (2–4 Sätze).
- Richtige Antworten gleichmäßig über die Positionen verteilen.

## Fachliche Regeln

- **Nur gesichertes Wissen.** Wo die Forschung uneinig ist, das so sagen. Keine Zahlen ohne Grundlage; lieber „etwa 5 von 100 Kindern“ als falsche Präzision.
- **Quellen nur aus `quellen.js`** (Schlüssel). Die App zeigt sie am Modulende. Keine erfundenen Studien.
- Klassifikation: DSM-5-TR und ICD-11 nennen, wo hilfreich (Luxemburg nutzt in Berichten beide). Keine Diagnosecodes auswendig abfragen.
- **Die Rolle der Leserin, des Lesers:** Pädagogische Fachkräfte beobachten, beschreiben, unterstützen und vermitteln weiter – sie **diagnostizieren nicht**. Das immer klar machen.
- Medikamente nur sachlich (Wirkweise, Chancen, Nebenwirkungen, Rolle der Schule); keine Empfehlungen zur Dosierung.
- Luxemburg-Kontext wo passend: mehrsprachige Kinder (Luxemburgisch, Französisch, Deutsch, Portugiesisch …), Précoce/Spillschoul, Cycles 1–4, Lycée, Maison Relais, SePAS, ESEB, CDSE-Teams (Diagnostique, ISA, Annexe, Classes de participation, CST). Bei Abläufen (Kinderschutz, Meldewege) allgemein bleiben und auf die internen Abläufe und die Leitung verweisen – nichts erfinden.
- Sensible Themen (Suizidalität, Selbstverletzung, Missbrauch): klare Handlungsschritte, Sicherheit zuerst, keine Detailbeschreibungen von Methoden.

## Sprache

- Deutsch, klar, respektvoll, „Sie“-Form für die Lesenden (Fachpublikum). Fachbegriffe beim ersten Auftreten erklären und ins Glossar aufnehmen.
- Menschen zuerst: „ein Kind mit ADHS“, nicht „der ADHSler“.
- Konkrete Alltagsbeispiele statt Allgemeinplätze.
- **Verboten:** Emojis, Floskeln („In diesem Modul werden wir gemeinsam …“, „spannende Reise“, „Es ist wichtig zu betonen …“), Ausrufezeichen-Ketten, Marketingsprache, englische Modewörter ohne Not.
- Typografie: „…“ für Anführungszeichen, – als Gedankenstrich, … als Auslassung.

## Prüfen

```
node lern-app/pruefen.cjs [lern-app/module/<id>.json …]
```

Alle Fehler beheben. Danach das Modul noch einmal **als Leserin** durchgehen:
Würde eine erfahrene Kollegin es fachlich unterschreiben? Versteht es jemand
ohne Studium? Hilft es morgen im Unterricht?
