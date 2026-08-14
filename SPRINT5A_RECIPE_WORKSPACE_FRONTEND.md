# Sprint 5A Frontend – Recipe Workspace Context

Neu:
- bei mehreren Workspaces erscheint im Header ein Workspace-Selector
- Wechsel speichert die Workspace-Public-ID und lädt die Seite neu
- fachliche API-Helper nutzen `AuthShell.request(...)`
- Bearer-Token und `X-Workspace-Id` werden damit gezielt an Recipe-Requests gesendet
- kein globales Überschreiben von `window.fetch`

Damit können persönliche und gemeinsame Family-Workspaces im gleichen Login verwendet werden.
