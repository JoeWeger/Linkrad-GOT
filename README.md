# getontop Linkrad

**Zweimal kurz Shift** → am Mauszeiger erscheint ein Rad mit deinen Kunden → Kunde anklicken → das Rad zeigt seine Links
(Projekt-Tool, Drive, Figma, Projektordner …) → Link anklicken, er öffnet sich **als neuer Tab in Google Chrome**. Das Rad verschwindet.

Läuft auf Windows 10/11 als kleine App in der Taskleiste. Keine Cloud, kein Konto: Deine Links liegen in einer Datei auf deinem Rechner.

## Installieren

**Download** (Datei öffnen, rechts oben auf das Download-Symbol klicken):
- mit Installation: [`download/getontop-Linkrad-Setup-0.3.1.exe`](download/getontop-Linkrad-Setup-0.3.1.exe)
- ohne Installation: [`download/getontop-Linkrad-0.3.1-portable.exe`](download/getontop-Linkrad-0.3.1-portable.exe)

1. `getontop-Linkrad-Setup-0.3.1.exe` ausführen. Oder ohne Installation: `getontop-Linkrad-0.3.1-portable.exe` starten.
   Hattest du die erste Version („Augenhöhe Linkrad“) installiert: Deine Kunden und Links werden automatisch übernommen. Die alte Version danach über *Einstellungen → Apps* deinstallieren.
2. Die Datei ist nicht signiert, darum warnt Windows SmartScreen („Der Computer wurde durch Windows geschützt“):
   **Weitere Informationen** → **Trotzdem ausführen**.
   Blockiert Defender sie: Rechtsklick auf die `.exe` → **Eigenschaften** → unten **Zulassen** anhaken → OK.
3. Beim ersten Start öffnet sich **Kunden & Links**. Dort steht ein Beispielkunde, den du umbenennen oder löschen kannst.

Die App hat danach kein Fenster mehr. Sie sitzt als kleines Rad-Symbol rechts unten in der Taskleiste (eventuell unter dem Pfeil `^`).
Damit sie nach jedem Neustart da ist: Taskleisten-Menü → **Beim Anmelden starten**.

## Bedienen

| Was | Wie |
|---|---|
| Rad öffnen | **zweimal kurz Shift** (links oder rechts). Ersatz: **Strg+Alt+Leertaste** |
| Kunde wählen | anklicken, oder Pfeiltasten + Enter, oder Ziffer **1–9**, oder Anfangsbuchstabe |
| Link öffnen | anklicken (oder wie oben per Tastatur) |
| zurück zu den Kunden | **Esc**, Rücktaste, Klick auf die Mitte oder „← Zurück“ |
| Rad schließen | **Esc** auf der Kundenebene, Klick daneben, oder nochmal zweimal Shift |

Zweimal Shift zählt nur, wenn Shift zweimal **kurz und allein** getippt wird (innerhalb von gut einer halben Sekunde).
Beim Großschreiben, beim Halten von Shift oder bei Shift-Klick zum Markieren geht das Rad also nicht auf.
Abschalten: Taskleisten-Menü → **Zweimal Shift aktiv**.

Ab 12 Einträgen wird im Rad geblättert („Weitere …“).

**Gruppen (weitere Ebenen):** Ein Eintrag kann statt eines Links eine **Gruppe** sein, z. B. „Tasks“.
Im Rad steht darunter „4 Einträge ›“; ein Klick öffnet ein weiteres Rad mit Sprint-Board, Backlog, Bugs …
Gruppen lassen sich bis zu 5 Ebenen tief verschachteln. Esc oder „← Zurück“ geht immer eine Ebene hoch, die Mitte zeigt, wo du bist (z. B. „Müller Bau ›“ über „Tasks“).

## Kunden & Links pflegen

Taskleisten-Menü → **Kunden & Links bearbeiten …** (oder Doppelklick aufs Symbol, oder „Bearbeiten“ unter dem Rad).

- **+ Kunde**, Name eintippen, Farbe wählen. Die Farbe erscheint als Punkt im Rad.
- **+ Gruppe** legt eine weitere Ebene an. **Öffnen ›** führt hinein, die Zeile oben („Einträge › Tasks“) wieder hinaus.
- **+ Link** und Adresse einfügen. Der Name kommt von selbst (Asana, Drive, Figma, Jira, Notion …) und lässt sich überschreiben.
  `app.asana.com/…` wird automatisch zu `https://app.asana.com/…`.
- Webadressen öffnen sich immer als neuer Tab in **Chrome** (im zuletzt benutzten Chrome-Fenster und -Profil). Ist Chrome nicht installiert, nimmt Windows den Standard-Browser.
- **OneNote:** In der OneNote-Desktop-App Rechtsklick auf Abschnitt oder Abschnittsgruppe → **Link zu … kopieren** und einfügen. Der Link öffnet direkt die Desktop-App an dieser Stelle; der Name kommt aus dem Pfad (z. B. „Häfele Austria GmbH“).
- Es gehen außerdem `mailto:…`, Ordner und Netzlaufwerke (`C:\Projekte\Müller`, `\\nas\Kunden\Müller`)
  und App-Links wie `msteams:…` oder `notion://…`.
- ↗ probiert einen Link aus, ↑ ↓ sortieren (die Reihenfolge im Rad läuft im Uhrzeigersinn ab 12 Uhr), × löscht.
- Gespeichert wird automatisch.

**Mit Kollegen teilen:** **Exportieren …** schreibt eine JSON-Datei. **Importieren …** liest sie wieder ein und ersetzt die Liste oder hängt sie hinten an.
Die eigentliche Datei liegt unter `%APPDATA%\getontop Linkrad\links.json` („Datei im Explorer zeigen“). Sie lässt sich z. B. sichern oder per OneDrive mitnehmen.

## Design

getontop: **Dunkelblau** `#173359` für Texte und die Mitte des Rads, **Leucht-Mint** `#70FFCF` zum Hervorheben (Segment unter der Maus, Knöpfe),
**Leucht-Koralle** `#FF6A3D` für Akzente (Tastatur-Fokus, Fehler).
Schrift **Lufga** (Regular, Medium, SemiBold): Ist sie auf dem Rechner installiert, wird sie genommen. Sonst die freie, sehr ähnliche **Outfit**.
Fest einbauen: `Lufga-Regular.woff2`, `Lufga-Medium.woff2`, `Lufga-SemiBold.woff2` nach `ui/fonts/` legen und neu bauen.

## Selbst bauen

```powershell
npm install
npm start          # aus dem Quellcode starten
npm test           # Test der Doppel-Shift-Erkennung
npm run dist:win   # dist\getontop-Linkrad-Setup-0.3.1.exe und …-portable.exe
```

| Datei | Zweck |
|---|---|
| `main.cjs` | Taskleiste, Rad-Fenster am Zeiger, Bearbeiten-Fenster, Links öffnen |
| `trigger.cjs` | Doppel-Shift-Erkennung (Tastatur-Hook über `uiohook-napi`) |
| `store.cjs` | Kunden/Links laden, prüfen, speichern (atomar; eine kaputte Datei wird beiseitegelegt, nicht überschrieben) |
| `ui/rad.*` | das Rad |
| `ui/editor.*` | Kunden & Links bearbeiten |

## Bekannt

- Getestet auf Linux in einem virtuellen Bildschirm: echtes Doppel-Shift per Tastatur-Simulation, Großschreiben löst nicht aus,
  Rad, Kunden-/Link-Ebene, Bearbeiten-Fenster, Speichern. **Auf einem echten Windows ist es noch nicht ausprobiert.**
- In Programmen, die mit Admin-Rechten laufen, sieht Windows die Tasten einer normalen App nicht. Dort geht zweimal Shift nicht, Strg+Alt+Leertaste schon.
- Manche Spiele und Remote-Desktop-Fenster schlucken Shift. Dann ebenfalls das Kürzel nehmen.
