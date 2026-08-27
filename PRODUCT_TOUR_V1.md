# Product Tour V1

## Ziel
Die Tour erklärt nicht die Navigation, sondern das mentale Modell der Food Moment Platform. Sie soll Orientierung geben, ohne den Nutzer in einen festen Workflow zu zwingen.

## Haupttour auf Home
1. **Was ist dein Food Moment?** – Start bei der Situation statt beim Rezept.
2. **Vier Wege. Ein Gedanke.** – Die vier situativen Einstiege erklären die offene Logik der Plattform.
3. **Ideen dürfen unfertig sein.** – Suchen und Festhalten sind legitime Einstiege; Inspiration kann später zum Food Moment werden.
4. **Deine Werkzeuge bleiben frei.** – Module funktionieren autark und werden durch Food Moments verbunden, wenn es sinnvoll ist.

Die Haupttour startet einmalig automatisch. Überspringen gilt als gesehen. Über das Burger-Menü kann sie jederzeit erneut gestartet werden.

## Kontextuelle Coach Marks
Nach abgeschlossener/übersprungener Haupttour erscheinen einmalig:
- **Wallet:** „Sammeln, noch nicht entscheiden.“
- **Wochenplan:** „Plane so viel – oder so wenig – wie du willst.“

## Technik
- Keine externe Tour-Library.
- Status in `localStorage`, versioniert über `fc_product_tour_v1_*`.
- Responsive Coach Marks: Desktop am hervorgehobenen Element, Mobile als kompakte Bottom Card.
- Spotlight über vier Blocker-Flächen mit freigestelltem Zielbereich.
- Tastatur: Escape schließt, Pfeiltasten navigieren in der Haupttour.
