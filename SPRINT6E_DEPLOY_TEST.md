# Sprint 6E – Deploy/Test

## 1. Frontend vollständig deployen

Dieses ZIP ist ein konsolidierter Frontend-Stand. Keine Backend-Dateien
aus diesem Paket verwenden.

## 2. Browser

Nach Deploy einmal Hard Reload / Service Worker aktualisieren.

## 3. Als Platform Admin anmelden

System Center öffnen.

Es gibt eine neue Kachel:

`Benutzer & Rechte`

## 4. Benutzerliste

Erwartung:
- Thomas
- Maren
- Status
- Workspace-Anzahl
- Platform-Admin-Kennzeichnung bei Thomas

## 5. Maren öffnen

Erwartung:
- Account-Steuerung
- Persönlicher Workspace
- Familie Dallas
- Module pro Workspace
- Rollen
- Capabilities

## 6. Modul-Test

Bei Maren / persönlicher Workspace:
- Inventar AUS

Danach als Maren in genau diesem Workspace Inventar aufrufen.

Erwartung:
- Backend HTTP 403 / MODULE_DISABLED

Danach Admin:
- Inventar wieder AN

## 7. Status-Test

Maren auf `Deaktiviert` setzen.

Erwartung:
- aktive Sessions werden widerrufen
- Maren kann geschützte API nicht weiter benutzen

Danach wieder `Aktiv`.

## 8. Rolle/Capabilities

Nur an einem Testuser testen.
Bei persönlichen Owner-Workspaces bleibt `tenant_admin` organisatorisch
erhalten; Einschränkungen dort über Module/Capabilities vornehmen.
