# Auth-/Workspace-Bootstrap Fix

## Ursache
`index.html` startete `AuthShell.guard()` asynchron, wartete aber nicht darauf.

Parallel startete `script.js` bei `DOMContentLoaded` bereits:
- `loadMealPlans()`
- `loadRecipes()`

Damit konnten Fachrequests ausgeführt werden, bevor `/auth/me`,
`/workspaces` und der aktive Workspace vollständig gesetzt waren.

## Fix
Die Startreihenfolge ist jetzt strikt:

1. `await AuthShell.guard()`
2. Authentifizierung prüfen
3. Workspaces laden und aktiven Workspace setzen
4. erst danach `loadMealPlans()` und `loadRecipes()`

Es gibt keine DB-, Backend- oder Migrationsänderung.
