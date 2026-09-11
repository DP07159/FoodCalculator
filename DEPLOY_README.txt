Food Moment Platform – Entry Illustration Integration – 2026-09-11

Basis: FoodCalculator-main(7).zip

Geänderte Dateien:
- home.js
- style.css
- service-worker.js
- assets/entry-illustrations/recipes.png
- assets/entry-illustrations/moment.png
- assets/entry-illustrations/capture.png
- assets/entry-illustrations/planning.png
- assets/entry-illustrations/shopping.png
- assets/entry-illustrations/ideas.png

Umsetzung:
- die sechs finalen Einzelgrafiken wurden für die UI auf transparenten Hintergrund aufbereitet
- alle Motive liegen auf einheitlicher 1200x1200-Canvas
- die bisherigen Scribble-SVGs werden auf Home nicht mehr verwendet
- die organischen UI-Bubbles bleiben eigenständiger Hintergrund
- Desktop- und Mobile-Größen/Positionen wurden für die neuen Motive angepasst
- Service-Worker-Cache auf v48 aktualisiert, damit alte Scribble-Assets nicht aus dem PWA-Cache erscheinen

Zuordnung:
recipes.png  -> Was koche ich heute?
moment.png   -> Besuch kommt
capture.png  -> Etwas festhalten
planning.png -> Was steht diese Woche an?
shopping.png -> Was muss ich einkaufen?
ideas.png    -> Keine Idee

Keine Serveränderung und keine Datenbankmigration erforderlich.
