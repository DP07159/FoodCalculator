# Sprint 6E – Admin Frontend V1

## Neu

`adminUsers.html` + `adminUsers.js`

Die Oberfläche nutzt ausschließlich die geschützte `/platform-admin/*` API.

## Funktionen

- User-Liste
- Suche nach Name/E-Mail
- Statusfilter
- Userdetail
- Status aktiv / pending / suspended
- Sessions widerrufen
- Platform-Admin-Status anzeigen
- alle Workspace-Memberships anzeigen
- Module pro Membership aktivieren/deaktivieren
- Workspace-Rolle ändern
- Capabilities pro Membership aktivieren/deaktivieren

## Sicherheitsprinzip

Die UI ist keine Autorisierung.

Alle Änderungen werden serverseitig von `/platform-admin/*` geprüft.
Ein Nicht-Platform-Admin erhält HTTP 403 und die Oberfläche zeigt einen
entsprechenden Zugriffsfehler.

Der eigene aktuell angemeldete Admin-Account kann in der UI nicht versehentlich
suspendiert oder durch Session-Revoke ausgesperrt werden.

## Noch nicht Teil von 6E

- Self Registration
- Forgot Password
- E-Mail-Verifikation
- Platform-Admin-Zuweisung über UI
- Einladungen

Diese Punkte folgen in 6C/6D/6F.
