# ISA-App – Offline-Version (zum Doppelklicken)

**`ISA-App.html`** ist die komplette App in **einer einzigen Datei** – alle 100+
Materialien, der Filter und der PDF-Export sind eingebettet. Es wird **kein
Internet und kein Server** gebraucht.

## So benutzt du sie

1. Die Datei **`ISA-App.html`** herunterladen
   (auf GitHub: Datei öffnen → Button **„Download raw file"**).
2. An einen festen Ort speichern (z. B. `Dokumente/ISA Toolbox/`).
3. **Doppelklick** → sie öffnet im Browser und funktioniert sofort, auch offline.

## Warum nicht die `index.html` aus dem Projektordner?

Die `index.html` im Hauptordner ist nur die **Quelldatei** für Entwickler – sie
lädt den Programmcode separat nach und zeigt beim direkten Öffnen (`file://`) nur
eine **weiße Seite**. Nimm immer diese gebündelte **`ISA-App.html`**.

## Aktualisieren (für Entwickler)

Nach Änderungen am Code/an den Materialien neu bauen und hierher kopieren:

```bash
npm install
npm run build                 # erzeugt die gebündelte dist/index.html
cp dist/index.html offline/ISA-App.html
```
