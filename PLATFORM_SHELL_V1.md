# Platform Shell V1

## Enthalten
- Login-Seite (`login.html`)
- zentraler Auth-State (`platform.js`)
- Bearer-Token bei API-Requests
- `/auth/me`
- Workspace-Liste und aktiver Workspace
- `X-Workspace-Id` automatisch bei Backend-Requests
- Effective Permissions
- User-/Workspace-Kontext im Burger-Menü
- Logout
- erste permission-aware Inventar-UI

## Sicherheitsprinzip
Die UI blendet Funktionen anhand der Effective Permissions aus. Das ist **keine Autorisierung**.
Die verbindliche Rechteprüfung bleibt serverseitig und wird im nächsten Backend-Sprint an den
Inventar-Routen aktiviert.

## Test
1. `login.html` ohne Login öffnen.
2. Mit bestehendem User anmelden.
3. Startseite lädt.
4. Burger-Menü zeigt Benutzer + Workspace.
5. Inventar lädt.
6. Abmelden.
7. Geschützte Seite erneut öffnen -> Redirect zu Login.
8. Browser-Cache/Service Worker einmal hart aktualisieren, falls eine alte Version sichtbar ist.
