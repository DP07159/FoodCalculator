# Workspace Assignment PUT Fix

## Ursache

Im aktuell deployten Frontend ist `recipeInstructions.js` noch so implementiert:

```js
async function apiFetch(url) {
    const response = await AuthShell.request(url);
}
```

Der Workspace-Dialog ruft `apiFetch(...)` zwar mit:

```js
{
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: ...
}
```

auf, aber `apiFetch` verwirft dieses zweite Argument vollständig.

Dadurch wird `AuthShell.request(url)` ohne Optionen aufgerufen und der Browser sendet
einen GET statt des vorgesehenen PUT.

## Fix

```js
async function apiFetch(url, options = {}) {
    const response = await AuthShell.request(url, options);
}
```

Zusätzlich wurde der Service-Worker-Cache hochgezählt, damit Firefox die
korrigierte `recipeInstructions.js` sicher neu lädt.

Keine Backend- oder Datenbankänderung.
