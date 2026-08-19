# Sprint 6E – Inventory Auth/Workspace Fix

## Ursache

Seit Sprint 6A+6B schützt das Backend das Inventar serverseitig mit:

- Authentication
- Workspace Context
- Module Access

`inventory.js` verwendete aber weiterhin direkt:

```js
fetch(url, options)
```

Dadurch wurden weder Bearer Token noch `X-Workspace-Id` gesendet.

Zusätzlich startete `inventory.html` `AuthShell.guard()` nur fire-and-forget,
während `inventory.js` sofort `loadInventory()` ausführte.

## Fix

`inventory.js` verwendet jetzt:

```js
AuthShell.request(url, options)
```

und wartet beim Start explizit auf:

```js
await AuthShell.guard()
```

Erst danach werden Inventardaten geladen.

Keine Backend-Änderung.
Keine Migration.
