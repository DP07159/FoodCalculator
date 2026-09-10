Food Moment – Debug/UX Fixes R2 – Frontend Delta – 10.09.2026

Diese ZIP enthält nur geänderte Frontend-Dateien. Alle Dateien im bestehenden Frontend am identischen Pfad ersetzen.

Geändert:
- foodMoment.js: „Rezept hinzufügen“ bleibt auch bei bestehenden Rezepten verfügbar.
- foodMoments.html: Header-/Container-Geometrie an die Referenzmodule angeglichen.
- home.js + style.css: Entry-Bubbles im organischen Gedankenblasen-/Scribble-Stil umgesetzt.
- recipeInstructions.js: Recipe↔Food-Moment-Verknüpfung auf atomare Serverroute umgestellt; nur große Food Moments.
- shopping.js: Empty-State robust ausgeblendet sobald Einträge existieren; Quellen dedupliziert und als UI-Link gestaltet.
- wallet.js: Drei-Punkte-Menü neu gruppiert, mit Icons und klarer Hierarchie.
- style.css: kaputten literal-\\n CSS-Block entfernt; Spotify-artige Workspace-/Food-Moment-Dialoge; konsistente Header und Links.

WICHTIG: Für Recipe↔Food-Moment-Verknüpfung muss auch das Server-Delta R2 deployed werden.
Keine Datenbankmigration erforderlich.
