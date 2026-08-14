# Sprint 5A.1 – Workspace Context Sync Fix

## Ursache
Der aktuell deployte `src/core/workspaces/service.js` ist noch ein älterer Stand.
Dort fehlt `resolveWorkspaceContextForUser(...)`.

Folge:
Die Workspace-Middleware kann die interne numerische Workspace-ID nicht sauber
als `req.workspaceId` bereitstellen. Der Recipe-Controller reicht deshalb
`undefined` an den Recipe-Service weiter. Das Repository filtert dann korrekt
auf keinen Workspace und `/recipes` liefert `[]`.

## Fix
Synchronisiert:
- `src/core/workspaces/service.js`
- `src/core/workspaces/middleware.js`

Danach gilt:
öffentliche Workspace-UUID -> interne Workspace-ID -> `req.workspaceId`

Keine DB-Änderung, keine Migration, keine Datenmanipulation.
