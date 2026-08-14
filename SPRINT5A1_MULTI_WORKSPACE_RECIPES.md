# Sprint 5A.1 – Multi-Workspace Recipes Frontend

Auf der Rezeptanleitungsseite erscheint für den Recipe-Owner ein neuer
Workspace-Button.

Das Bedienmodell orientiert sich bewusst an „Zu Playlist hinzufügen“:
- ausschließlich aktive Workspaces der aktuellen Memberships,
- bereits zugeordnete Workspaces stehen oben und sind markiert,
- jeder Haken wird automatisch gespeichert,
- mehrere Workspaces können direkt nacheinander an-/abgewählt werden,
- kein zusätzlicher „Speichern“-Klick nötig,
- „Fertig“ schließt den Dialog,
- es werden keine Rezeptkopien erzeugt.

Wenn der aktuell geöffnete Workspace abgewählt wird, wechselt die Shell
beim Schließen automatisch auf einen verbleibenden zugeordneten Workspace.
