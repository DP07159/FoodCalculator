# Platform Shell 1A – Identity only

Enthalten:
- Login
- Bearer-Token in localStorage für Reload-Persistenz
- `/auth/me` als Guard bei jedem Seitenaufruf
- Logout
- Redirect auf Login ohne/mit ungültiger Session

Bewusst **nicht** enthalten:
- Workspace-Kontext
- `X-Workspace-Id`
- Effective Permissions
- globale `fetch`-Manipulation
- Änderungen an Navigation/Fachlogik

Testfolge:
1. Direkt `/inventory.html` öffnen -> Login.
2. Anmelden -> `/index.html`.
3. Reload -> eingeloggt bleiben.
4. Rezept, Inventar, Admin öffnen -> Seiten laden wie vorher.
5. Abmelden -> Login.
6. Direkt `/inventory.html` -> Login.
