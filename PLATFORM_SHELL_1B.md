# Platform Shell 1B – Workspace Context

Aufbauend auf dem erfolgreich getesteten Stand 1A.

Neu:
- `/workspaces` wird nach `/auth/me` geladen.
- Der persönliche Workspace wird als Default gewählt.
- Die Workspace-Public-ID wird persistent gespeichert.
- `AuthShell.request(...)` sendet `X-Workspace-Id` automatisch mit.
- Der aktive Workspace wird im bestehenden Header neben dem User angezeigt.
- Logout entfernt auch den Workspace-Kontext.

Bewusst noch nicht enthalten:
- keine Effective Permissions
- keine Permission-gesteuerte Navigation
- keine Änderungen an den bestehenden Fachmodul-Fetches
- kein globales Überschreiben von `window.fetch`

Test:
1. Login.
2. Header zeigt User + „Persönlicher Workspace“.
3. Reload -> User + Workspace bleiben vorhanden.
4. Inventar, Rezeptdetail, Wochenplan und Admin funktionieren unverändert.
5. Logout.
6. Erneuter Login -> Workspace wird wieder automatisch geladen.
