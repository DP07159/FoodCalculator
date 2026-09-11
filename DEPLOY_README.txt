Food Moment Platform – R8 Recipe Shopping Visibility Fix – 2026-09-11

Fixes the recipe → shopping-list action so the cart button is visible and functional again.

Changed files:
- recipeInstructions.html
- recipeInstructions.js
- style.css
- service-worker.js

The button is now present in markup AND defensively injected by JavaScript if missing from an older cached HTML shell. CSS explicitly keeps it visible. Service worker cache is bumped.

No server changes. No migration.
