const API_URL = "https://foodcalculator-server.onrender.com";

let latestCleanupPreview = null;
let activeAdminTab = "duplicates";

const ADMIN_TABS = [
    { key: "inventory", label: "Inventarartikel", countKey: "inventory_items" },
    { key: "duplicates", label: "Mögliche Dubletten", countKey: "possible_duplicates" },
    { key: "orphans", label: "Verwaiste Auto-Zutaten", countKey: "orphan_recipe_items" },
    { key: "protected", label: "Geschützte Artikel", countKey: "protected_items" }
];

function showToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2600);
}

function setAdminMessage(message, type = "error") {
    const box = document.getElementById("admin-cleanup-message");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("is-hidden", !message);
    box.dataset.type = type;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}


function setAdminSystemMessage(message, type = "error") {
    const box = document.getElementById("admin-system-message");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("is-hidden", !message);
    box.dataset.type = type;
}

function formatGermanDateTime(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString("de-DE");
    } catch {
        return String(value);
    }
}

function renderAdminSystemSummary(status) {
    const target = document.getElementById("admin-system-summary");
    if (!target) return;
    const c = status?.counts || {};
    const cards = [
        ["Rezepte", c.recipes],
        ["Rezept-Zutaten", c.recipe_ingredients],
        ["verknüpft", c.linked_recipe_ingredients],
        ["unverknüpft", c.unlinked_recipe_ingredients],
        ["Inventarartikel", c.inventory_items],
        ["mit Bestand", c.inventory_items_with_stock],
        ["Stammdaten", c.food_items],
        ["Aliase", c.food_aliases]
    ];
    target.innerHTML = cards.map(([label, count]) => `
        <div class="admin-summary-card">
            <span>${escapeHtml(label)}</span>
            <strong>${Number(count || 0)}</strong>
        </div>
    `).join("");
}

function renderAdminSystemResults(status) {
    const target = document.getElementById("admin-system-results");
    if (!target) return;
    const tables = Array.isArray(status?.tables) ? status.tables : [];
    target.innerHTML = `
        <section class="admin-result-section">
            <h2>Datenbank</h2>
            <article class="admin-result-card">
                <p class="admin-result-note">Letzte Aktualisierung: ${escapeHtml(formatGermanDateTime(status?.generated_at))}</p>
                <p class="admin-result-note">Pfad: ${escapeHtml(status?.database_path || "unbekannt")}</p>
            </article>
        </section>
        <section class="admin-result-section">
            <h2>Tabellen</h2>
            ${tables.length ? tables.map(table => `
                <button type="button" class="admin-result-card admin-item-row admin-table-card" data-admin-table="${escapeHtml(table.name)}" title="Tabelle ${escapeHtml(table.name)} öffnen">
                    <div>
                        <div class="admin-result-card-header admin-result-card-header-compact">
                            <div>
                                <span class="admin-pill">Tabelle</span>
                                <h3>${escapeHtml(table.name)}</h3>
                            </div>
                            <small>${Number(table.count || 0)} Einträge</small>
                        </div>
                    </div>
                    <span class="admin-table-open-indicator" aria-hidden="true">Öffnen</span>
                </button>
            `).join("") : `<p class="admin-empty-state">Keine Tabelleninformationen verfügbar.</p>`}
        </section>
    `;
}

async function loadAdminSystemStatus() {
    setAdminSystemMessage("");
    const target = document.getElementById("admin-system-results");
    if (target) target.innerHTML = `<p class="admin-empty-state">Systemstatus wird geladen ...</p>`;
    try {
        const status = await apiFetch(`${API_URL}/admin/system-status`);
        renderAdminSystemSummary(status);
        renderAdminSystemResults(status);
    } catch (error) {
        console.error(error);
        setAdminSystemMessage(error.message || "Systemstatus konnte nicht geladen werden.");
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatStockLabel(item) {
    const stockTotal = Number(item?.stock_total ?? 0);
    if (stockTotal <= 0) return "Bestand 0";
    return `Bestand vorhanden`;
}

function formatSourceLabel(source) {
    return String(source || "manual") === "recipe" ? "aus Rezept-Parse" : "manuell/Inventar";
}

function setActiveAdminTab(tabKey) {
    activeAdminTab = tabKey || "duplicates";
    renderCleanupPreview(latestCleanupPreview);
}

function renderSummary(preview) {
    const target = document.getElementById("admin-cleanup-summary");
    if (!target) return;
    const counts = preview?.counts || {};
    target.innerHTML = ADMIN_TABS.map(tab => `
        <button type="button" class="admin-summary-card ${activeAdminTab === tab.key ? "is-active" : ""}" onclick="setActiveAdminTab('${tab.key}')">
            <span>${tab.label}</span>
            <strong>${counts[tab.countKey] ?? 0}</strong>
        </button>
    `).join("");
}

function renderItemMeta(item) {
    const reasons = Array.isArray(item?.protection_reasons) ? item.protection_reasons : [];
    return `
        <div class="admin-item-meta">
            <span class="inventory-summary-chip ${item.has_stock ? "" : "inventory-summary-empty"}">${escapeHtml(formatStockLabel(item))}</span>
            <span class="inventory-summary-chip">${escapeHtml(formatSourceLabel(item.source))}</span>
            ${item.used_in_recipes?.length ? `<span class="inventory-summary-chip">${item.used_in_recipes.length} Rezept(e)</span>` : ""}
            ${reasons.map(reason => `<span class="inventory-summary-chip">${escapeHtml(reason)}</span>`).join("")}
        </div>
    `;
}

function renderAdminDeleteButton(item, label = "Artikel endgültig löschen") {
    return `
        <button type="button" class="inventory-mini-button inventory-mini-button-danger" onclick="deleteAdminInventoryItem(${Number(item.id)})" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
            <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>
        </button>
    `;
}

function escapeJsString(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

function renderAdminItemNameButton(item, headingLevel = "h3") {
    const tag = headingLevel === "h4" ? "h4" : "h3";
    const itemId = Number(item?.id);
    const itemName = escapeHtml(item?.name || "Unbenannter Artikel");
    return `<${tag}><button type="button" class="admin-item-name-button" onclick="openAdminInventoryItemOverlay(${itemId}, '${escapeJsString(item?.name || "")}')" title="Details zu ${itemName} anzeigen">${itemName}</button></${tag}>`;
}

function getAllPreviewItems() {
    if (!latestCleanupPreview) return [];
    const map = new Map();
    [
        ...(latestCleanupPreview.inventory_items || []),
        ...(latestCleanupPreview.orphan_recipe_items || []),
        ...(latestCleanupPreview.protected_items || [])
    ].forEach(item => {
        if (item?.id !== undefined) map.set(Number(item.id), item);
    });
    (latestCleanupPreview.possible_duplicates || []).forEach(group => {
        (group.candidates || []).forEach(item => {
            if (item?.id !== undefined) map.set(Number(item.id), item);
        });
    });
    return Array.from(map.values());
}

function findPreviewItem(itemId, fallbackName = "") {
    return getAllPreviewItems().find(item => Number(item.id) === Number(itemId)) || { id: Number(itemId), name: fallbackName };
}

function ensureAdminItemModal() {
    let modal = document.getElementById("admin-item-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "admin-item-modal";
    modal.className = "inventory-modal is-hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "admin-item-modal-title");
    modal.innerHTML = `
        <div class="inventory-modal-backdrop" onclick="closeAdminItemModal()"></div>
        <div class="inventory-modal-dialog admin-item-dialog">
            <div class="inventory-section-headline">
                <div>
                    <p class="recipe-kicker">Inventarartikel</p>
                    <h2 id="admin-item-modal-title">Artikel</h2>
                </div>
                <button type="button" class="header-icon-button" onclick="closeAdminItemModal()" title="Fenster schließen" aria-label="Fenster schließen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div id="admin-item-modal-content" class="admin-item-modal-content"></div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function closeAdminItemModal() {
    const modal = document.getElementById("admin-item-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
}

function normalizeAdminRecipeLinksFromPreview(item) {
    const usedInRecipes = Array.isArray(item?.used_in_recipes) ? item.used_in_recipes : [];
    const unique = new Map();

    usedInRecipes.forEach(entry => {
        const id = Number(entry.recipe_id || entry.id);
        if (!Number.isFinite(id)) return;
        if (!unique.has(id)) {
            unique.set(id, {
                id,
                name: entry.recipe_name || entry.name || "Unbenanntes Rezept",
                detail: entry.raw_text || entry.food_name || "enthält diesen Artikel"
            });
        }
    });

    return Array.from(unique.values()).sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
}

function normalizeAdminRecipeLinksFromApi(payload) {
    const recipes = Array.isArray(payload) ? payload : (Array.isArray(payload?.recipes) ? payload.recipes : []);
    return recipes.map(recipe => {
        const matchedIngredients = Array.isArray(recipe.matched_ingredients) ? recipe.matched_ingredients : [];
        const firstMatch = matchedIngredients[0];
        return {
            id: Number(recipe.id),
            name: recipe.name || "Unbenanntes Rezept",
            detail: firstMatch?.raw_text || firstMatch?.food_name || "enthält diesen Artikel"
        };
    }).filter(recipe => Number.isFinite(recipe.id));
}

function renderAdminRecipeLinks(recipes = []) {
    if (!recipes.length) {
        return `<p class="admin-empty-state">Aktuell ist kein Rezept mit diesem Artikel verknüpft.</p>`;
    }

    return recipes.map(recipe => `
        <a class="ingredient-recipe-card" href="/recipeInstructions.html?id=${Number(recipe.id)}">
            <strong>${escapeHtml(recipe.name)}</strong>
            <span>${escapeHtml(recipe.detail || "enthält diesen Artikel")}</span>
        </a>
    `).join("");
}

function renderAdminItemOverlayContent(itemId, itemName, item, recipes, showLoadWarning = false) {
    const content = document.getElementById("admin-item-modal-content");
    if (!content) return;

    content.innerHTML = `
        <div class="recipe-inventory-summary">
            <strong>${escapeHtml(itemName)}</strong>
            ${item?.canonical_name ? `<span>${escapeHtml(item.canonical_name)}</span>` : ""}
        </div>
        <div class="admin-item-modal-actions">
            <a class="form-actions-button-like" href="/inventory.html?item=${Number(itemId)}">Zur Artikelbox im Inventar</a>
        </div>
        ${showLoadWarning ? `<p class="admin-result-note">Hinweis: Die Live-Abfrage konnte nicht geladen werden. Angezeigt werden die Rezeptverknüpfungen aus der Admin-Analyse.</p>` : ""}
        <h3 class="admin-modal-subheadline">Verknüpfte Rezepte</h3>
        <div class="ingredient-recipes-content">${renderAdminRecipeLinks(recipes)}</div>
    `;
}

async function openAdminInventoryItemOverlay(itemId, fallbackName = "") {
    const item = findPreviewItem(itemId, fallbackName);
    const modal = ensureAdminItemModal();
    const title = document.getElementById("admin-item-modal-title");
    const content = document.getElementById("admin-item-modal-content");
    const itemName = item?.name || fallbackName || "Artikel";
    const previewRecipes = normalizeAdminRecipeLinksFromPreview(item);

    title.textContent = itemName;
    content.innerHTML = `<p class="admin-empty-state">Verknüpfte Rezepte werden geladen ...</p>`;
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");

    if (previewRecipes.length) {
        renderAdminItemOverlayContent(itemId, itemName, item, previewRecipes);
    }

    try {
        const payload = await apiFetch(`${API_URL}/recipes/by-ingredient/${encodeURIComponent(itemName)}`);
        const apiRecipes = normalizeAdminRecipeLinksFromApi(payload);
        renderAdminItemOverlayContent(itemId, itemName, item, apiRecipes.length ? apiRecipes : previewRecipes);
    } catch (error) {
        console.error(error);
        renderAdminItemOverlayContent(itemId, itemName, item, previewRecipes, true);
    }
}

function renderInventoryItems(items = []) {
    if (!items.length) return `<p class="admin-empty-state">Keine Inventarartikel gefunden.</p>`;
    return items
        .slice()
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"))
        .map(item => `
            <article class="admin-result-card admin-item-row">
                <div>
                    <div class="admin-result-card-header admin-result-card-header-compact">
                        <div>
                            <span class="admin-pill">Inventarartikel</span>
                            ${renderAdminItemNameButton(item)}
                        </div>
                        <small>${escapeHtml(item.canonical_name || "kein Schlüssel")}</small>
                    </div>
                    ${renderItemMeta(item)}
                </div>
                <div class="admin-row-actions">${renderAdminDeleteButton(item)}</div>
            </article>
        `).join("");
}

function renderDuplicates(duplicates = []) {
    if (!duplicates.length) {
        return `<p class="admin-empty-state">Keine möglichen Dubletten gefunden.</p>`;
    }
    return duplicates.map(group => {
        const masterId = Number(group.suggested_master?.id);
        const candidates = group.candidates || [];
        const candidateIds = candidates.map(item => Number(item.id)).filter(Number.isFinite);
        return `
            <article class="admin-result-card admin-duplicate-card">
                <div class="admin-result-card-header">
                    <div>
                        <span class="admin-pill">Dubletten-Hinweis</span>
                        <h3>${escapeHtml(group.suggested_master?.name || group.canonical_key)}</h3>
                        <p class="admin-result-note">${escapeHtml(group.reason || "Ähnliche Lebensmittel wurden erkannt.")}</p>
                    </div>
                    <small>${escapeHtml(group.canonical_key)}</small>
                </div>

                <div class="admin-duplicate-grid">
                    ${candidates.map(item => {
                        const itemId = Number(item.id);
                        const otherIds = candidateIds.filter(id => id !== itemId);
                        return `
                        <section class="admin-duplicate-item ${itemId === masterId ? "is-suggested-master" : ""}">
                            <div class="admin-duplicate-item-head">
                                <div>
                                    <span class="admin-pill">${itemId === masterId ? "Vorschlag: behalten" : "Kandidat"}</span>
                                    ${renderAdminItemNameButton(item, "h4")}
                                </div>
                                ${renderAdminDeleteButton(item, "Diesen Artikel endgültig löschen")}
                            </div>
                            ${renderItemMeta(item)}
                            <p class="admin-result-note">ID ${itemId} · ${escapeHtml(item.canonical_name || "")}</p>
                            ${otherIds.length ? `
                                <button type="button" class="form-actions-button-like" onclick="mergeDuplicateGroupKeeping(${itemId}, [${otherIds.join(",")}])">
                                    Diesen Artikel behalten
                                </button>
                            ` : ""}
                        </section>`;
                    }).join("")}
                </div>

                ${candidates.length === 2 ? `
                    <div class="admin-action-row admin-action-row-neutral">
                        <p>Diese beiden Artikel sind ähnlich, sollen aber getrennt erhalten bleiben.</p>
                        <button type="button" class="form-actions-button-like" onclick="keepDuplicatePair(${Number(candidates[0].id)}, ${Number(candidates[1].id)})">Beide behalten</button>
                    </div>
                ` : `<p class="admin-result-note">Bei Gruppen mit mehr als zwei Artikeln kannst du über „Diesen Artikel behalten“ alle anderen Kandidaten in diesen Artikel überführen.</p>`}
            </article>
        `;
    }).join("");
}

function renderOrphans(orphanItems = []) {
    if (!orphanItems.length) {
        return `<p class="admin-empty-state">Keine sicher löschbaren verwaisten Auto-Zutaten gefunden.</p>`;
    }
    return `
        <div class="admin-action-row">
            <p>${orphanItems.length} automatisch erzeugte Artikel ohne Bestand und ohne Rezeptverwendung wurden gefunden.</p>
            <button type="button" class="toolbar-icon-button toolbar-delete-button" onclick="applyOrphanCleanup()" title="Alle verwaisten Auto-Zutaten löschen" aria-label="Alle verwaisten Auto-Zutaten löschen">
                <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>
            </button>
        </div>
        ${orphanItems.map(item => `
            <article class="admin-result-card admin-item-row">
                <div>
                    <div class="admin-result-card-header admin-result-card-header-compact">
                        <div>
                            <span class="admin-pill">Verwaiste Auto-Zutat</span>
                            ${renderAdminItemNameButton(item)}
                        </div>
                        <small>${escapeHtml(item.canonical_name || "")}</small>
                    </div>
                    ${renderItemMeta(item)}
                </div>
                <div class="admin-row-actions">${renderAdminDeleteButton(item)}</div>
            </article>
        `).join("")}
    `;
}

function renderProtected(protectedItems = []) {
    if (!protectedItems.length) return `<p class="admin-empty-state">Keine geschützten Artikel gefunden.</p>`;
    return protectedItems
        .slice()
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"))
        .map(item => `
            <article class="admin-result-card admin-item-row">
                <div>
                    <div class="admin-result-card-header admin-result-card-header-compact">
                        <div>
                            <span class="admin-pill">Geschützt</span>
                            ${renderAdminItemNameButton(item)}
                        </div>
                        <small>${escapeHtml(item.canonical_name || "")}</small>
                    </div>
                    ${renderItemMeta(item)}
                </div>
                <div class="admin-row-actions">${renderAdminDeleteButton(item, "Artikel dennoch endgültig löschen")}</div>
            </article>
        `).join("");
}

function getActiveSectionTitle() {
    const tab = ADMIN_TABS.find(entry => entry.key === activeAdminTab);
    return tab?.label || "Analyse";
}

function renderActiveResults(preview) {
    if (!preview) return `<p class="admin-empty-state">Noch keine Analyse geladen.</p>`;
    if (activeAdminTab === "inventory") return renderInventoryItems(preview.inventory_items || []);
    if (activeAdminTab === "duplicates") return renderDuplicates(preview.possible_duplicates || []);
    if (activeAdminTab === "orphans") return renderOrphans(preview.orphan_recipe_items || []);
    if (activeAdminTab === "protected") return renderProtected(preview.protected_items || []);
    return `<p class="admin-empty-state">Unbekannte Ansicht.</p>`;
}

function renderCleanupPreview(preview) {
    latestCleanupPreview = preview;
    renderSummary(preview);
    const target = document.getElementById("admin-cleanup-results");
    if (!target) return;
    target.innerHTML = `
        <section class="admin-result-section">
            <h2>${escapeHtml(getActiveSectionTitle())}</h2>
            ${activeAdminTab === "protected" ? `<p class="admin-result-note">Geschützte Artikel entstehen durch Bestand, manuelle Pflege oder Rezeptverwendung. Sie werden nie automatisch gelöscht, können hier aber bewusst administrativ entfernt werden.</p>` : ""}
            ${activeAdminTab === "duplicates" ? `<p class="admin-result-note">Dubletten entstehen durch gleiche normalisierte Lebensmittel-Schlüssel. Der Vorschlag ist eine Hilfe, keine automatische Entscheidung.</p>` : ""}
            ${renderActiveResults(preview)}
        </section>
    `;
}

async function loadInventoryCleanupPreview() {
    setAdminMessage("");
    const target = document.getElementById("admin-cleanup-results");
    if (target) target.innerHTML = `<p class="admin-empty-state">Analyse läuft ...</p>`;
    try {
        const preview = await apiFetch(`${API_URL}/admin/inventory-cleanup-preview`);
        renderCleanupPreview(preview);
        showToast("Analyse abgeschlossen.");
    } catch (error) {
        console.error(error);
        setAdminMessage(error.message || "Analyse konnte nicht geladen werden.");
    }
}

async function applyOrphanCleanup() {
    const ids = (latestCleanupPreview?.orphan_recipe_items || []).map(item => item.id);
    if (!ids.length) return;
    if (!confirm(`Möchtest du ${ids.length} verwaiste Auto-Zutaten endgültig löschen? Manuell gepflegte Artikel und Artikel mit Bestand sind geschützt.`)) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/inventory-cleanup-apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delete_item_ids: ids })
        });
        renderCleanupPreview(result.preview);
        showToast(`${result.deleted_item_ids.length} Artikel gelöscht.`);
    } catch (error) {
        console.error(error);
        setAdminMessage(error.message || "Bereinigung konnte nicht ausgeführt werden.");
    }
}

async function deleteAdminInventoryItem(itemId) {
    const item = (latestCleanupPreview?.inventory_items || []).find(entry => Number(entry.id) === Number(itemId));
    const name = item?.name || `ID ${itemId}`;
    if (!confirm(`Möchtest du „${name}“ wirklich endgültig löschen?\n\nDas entfernt den Artikel aus dem Inventar, inklusive Bestandspositionen und administrativer Dubletten-Entscheidungen.`)) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/inventory-items/${Number(itemId)}`, { method: "DELETE" });
        renderCleanupPreview(result.preview);
        showToast(`„${result.deleted_item?.name || name}“ gelöscht.`);
    } catch (error) {
        console.error(error);
        setAdminMessage(error.message || "Artikel konnte nicht gelöscht werden.");
    }
}

async function keepDuplicatePair(itemIdA, itemIdB) {
    if (!confirm("Diese zwei Artikel künftig nicht mehr als Dublette vorschlagen?")) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/duplicate-keep-both`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id_a: Number(itemIdA), item_id_b: Number(itemIdB) })
        });
        renderCleanupPreview(result.preview);
        showToast("Entscheidung gespeichert: beide behalten.");
    } catch (error) {
        console.error(error);
        setAdminMessage(error.message || "Entscheidung konnte nicht gespeichert werden.");
    }
}


async function mergeDuplicateGroupKeeping(masterItemId, duplicateItemIds = []) {
    const ids = Array.isArray(duplicateItemIds) ? duplicateItemIds.map(Number).filter(Number.isFinite) : [];
    if (!ids.length) return;
    if (!confirm(`Diesen Artikel behalten und ${ids.length} Dubletten in ihn überführen?\n\nBestände, Rezeptverknüpfungen und Aliase werden übernommen.`)) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/duplicates/merge-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ master_item_id: Number(masterItemId), duplicate_item_ids: ids })
        });
        renderCleanupPreview(result.preview);
        showToast(`${result.merged?.merged_items?.length || ids.length} Dubletten zusammengeführt.`);
    } catch (error) {
        console.error(error);
        setAdminMessage(error.message || "Dubletten konnten nicht zusammengeführt werden.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.body?.dataset?.adminTablePage === "true") {
        loadAdminTablePage();
    } else {
        loadAdminSystemStatus();
        loadInventoryCleanupPreview();
    }

    document.addEventListener("click", (event) => {
        const tableButton = event.target.closest("[data-admin-table]");
        if (tableButton) {
            event.preventDefault();
            const tableName = tableButton.dataset.adminTable;
            if (tableName) openAdminTableInNewTab(tableName);
        }



        const consolidationCheckbox = event.target.closest("[data-food-consolidation-id]");
        if (consolidationCheckbox) {
            const id = Number(consolidationCheckbox.dataset.foodConsolidationId);
            if (Number.isFinite(id)) {
                if (consolidationCheckbox.checked) selectedFoodItemConsolidationIds.add(id);
                else selectedFoodItemConsolidationIds.delete(id);
                updateFoodConsolidationCount();
            }
        }

        const consolidateMasterButton = event.target.closest("[data-consolidate-master-id]");
        if (consolidateMasterButton) {
            event.preventDefault();
            consolidateSelectedFoodItems(Number(consolidateMasterButton.dataset.consolidateMasterId));
        }

        const closeUtility = event.target.closest("[data-close-admin-utility]");
        if (closeUtility) {
            event.preventDefault();
            closeAdminUtilityModal();
        }

        const foodDetailButton = event.target.closest("[data-food-detail-id]");
        if (foodDetailButton) {
            event.preventDefault();
            openFoodItemDetail(foodDetailButton.dataset.foodDetailId);
        }

        const newAliasButton = event.target.closest("[data-new-alias-food-id]");
        if (newAliasButton) {
            event.preventDefault();
            openAliasEditor({ foodItemId: newAliasButton.dataset.newAliasFoodId || null });
        }

        const editAliasButton = event.target.closest("[data-edit-alias-id]");
        if (editAliasButton) {
            event.preventDefault();
            openAliasEditor({ aliasId: Number(editAliasButton.dataset.editAliasId), aliasName: editAliasButton.dataset.aliasName || "", foodItemId: Number(editAliasButton.dataset.foodItemId || 0) });
        }

        const deleteAliasButton = event.target.closest("[data-delete-alias-id]");
        if (deleteAliasButton) {
            event.preventDefault();
            deleteFoodAlias(Number(deleteAliasButton.dataset.deleteAliasId), deleteAliasButton.dataset.aliasName || "");
        }

        const editIngredientLinkButton = event.target.closest("[data-edit-recipe-ingredient-link]");
        if (editIngredientLinkButton) {
            event.preventDefault();
            openRecipeIngredientLinkEditor({ ingredientId: Number(editIngredientLinkButton.dataset.editRecipeIngredientLink), foodItemId: Number(editIngredientLinkButton.dataset.foodItemId || 0) || null, rawText: editIngredientLinkButton.dataset.rawText || "" });
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeAdminTableModal();
        closeAdminItemModal();
        closeAdminUtilityModal();
    });
});

let latestRecipeResyncPreview = null;

function setAdminResyncMessage(message, type = "error") {
    const box = document.getElementById("admin-resync-message");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("is-hidden", !message);
    box.dataset.type = type;
}

function renderRecipeResyncSummary(preview) {
    const target = document.getElementById("admin-resync-summary");
    if (!target) return;
    const counts = preview?.counts || {};
    const cards = [
        ["Rezepte", counts.recipes ?? 0],
        ["Erkannte Zutaten", counts.parsed_ingredients ?? 0],
        ["Neu anzulegen", counts.create_new ?? 0],
        ["Auto-Altlasten löschbar", counts.delete_candidates ?? 0],
        ["Großer Neuaufbau: löschbar", counts.full_rebuild_delete_candidates ?? counts.delete_candidates ?? 0]
    ];
    target.innerHTML = cards.map(([label, count]) => `
        <div class="admin-summary-card">
            <span>${escapeHtml(label)}</span>
            <strong>${Number(count) || 0}</strong>
        </div>
    `).join("");
}

function renderRecipeResyncTargetItems(items = []) {
    if (!items.length) return `<p class="admin-empty-state">Keine Rezept-Zutaten erkannt.</p>`;
    return items.slice(0, 80).map(item => {
        const occurrenceCount = Array.isArray(item.occurrences) ? item.occurrences.length : 0;
        return `
            <article class="admin-result-card admin-item-row">
                <div>
                    <div class="admin-result-card-header admin-result-card-header-compact">
                        <div>
                            <span class="admin-pill">${item.action === "create_new" ? "wird neu angelegt" : "wird verknüpft"}</span>
                            <h3>${escapeHtml(item.display_name)}</h3>
                        </div>
                        <small>${escapeHtml(item.canonical_key || "")}</small>
                    </div>
                    <div class="admin-item-meta">
                        <span class="inventory-summary-chip">${occurrenceCount} Rezept-Vorkommen</span>
                        ${item.existing_item ? `<span class="inventory-summary-chip">Ziel: ${escapeHtml(item.existing_item.name)}</span>` : ""}
                        ${item.will_rename_existing ? `<span class="inventory-summary-chip">Altlast wird umbenannt</span>` : ""}
                    </div>
                </div>
            </article>
        `;
    }).join("") + (items.length > 80 ? `<p class="admin-result-note">Weitere ${items.length - 80} Einträge werden nach Ausführung ebenfalls verarbeitet.</p>` : "");
}

function renderRecipeResyncDeleteCandidates(items = [], modeLabel = "aus Rezept-Parse") {
    if (!items.length) return `<p class="admin-empty-state">Keine bestandslosen Altlasten zum Löschen gefunden.</p>`;
    return items.slice(0, 80).map(item => `
        <article class="admin-result-card admin-item-row">
            <div>
                <div class="admin-result-card-header admin-result-card-header-compact">
                    <div>
                        <span class="admin-pill">wird gelöscht</span>
                        <h3>${escapeHtml(item.name)}</h3>
                    </div>
                    <small>${escapeHtml(item.canonical_name || item.effective_canonical_name || "")}</small>
                </div>
                <div class="admin-item-meta">
                    <span class="inventory-summary-chip inventory-summary-empty">Bestand 0</span>
                    <span class="inventory-summary-chip">${escapeHtml(modeLabel)}</span>
                    ${item.source ? `<span class="inventory-summary-chip">Quelle: ${escapeHtml(formatSourceLabel(item.source))}</span>` : ""}
                </div>
            </div>
        </article>
    `).join("") + (items.length > 80 ? `<p class="admin-result-note">Weitere ${items.length - 80} Löschkandidaten werden nach Ausführung ebenfalls verarbeitet.</p>` : "");
}

function renderRecipeResyncPreview(preview) {
    latestRecipeResyncPreview = preview;
    renderRecipeResyncSummary(preview);
    const target = document.getElementById("admin-resync-results");
    if (!target) return;
    if (!preview) {
        target.innerHTML = `<p class="admin-empty-state">Noch keine Vorschau geladen.</p>`;
        return;
    }
    target.innerHTML = `
        <section class="admin-result-section">
            <h2>Vorschau</h2>
            <p class="admin-result-note">Artikel mit Bestand bleiben immer geschützt. Du kannst entweder nur Auto-Altlasten entfernen oder den großen Neuaufbau für alle nicht verwendeten Bestand-0-Artikel starten.</p>
            <div class="admin-action-row admin-action-row-neutral">
                <p>Standard: Rezept-Zutaten neu aufbauen und nur bestandslose automatisch erzeugte Parse-Altlasten löschen.</p>
                <button type="button" class="form-actions-button-like" onclick="applyRecipeResync(false)">Standard-Synchronisierung ausführen</button>
            </div>
            <div class="admin-action-row">
                <p>Großer Neuaufbau: Rezept-Zutaten neu aufbauen und alle nicht verwendeten Artikel mit Bestand 0 löschen. Artikel mit Bestand bleiben geschützt.</p>
                <button type="button" class="form-actions-button-like" onclick="applyRecipeResync(true)">Großen Neuaufbau ausführen</button>
            </div>
        </section>
        <section class="admin-result-section">
            <h2>Zielartikel</h2>
            ${renderRecipeResyncTargetItems(preview.target_items || [])}
        </section>
        <section class="admin-result-section">
            <h2>Löschbare Auto-Altlasten</h2>
            ${renderRecipeResyncDeleteCandidates(preview.delete_candidates || [], "aus Rezept-Parse")}
        </section>
        <section class="admin-result-section">
            <h2>Großer Neuaufbau: löschbare Bestand-0-Artikel</h2>
            <p class="admin-result-note">Diese Liste ist breiter: Sie umfasst alle aktuell nicht als Zielartikel verwendeten Artikel mit Bestand 0. Bitte nur ausführen, wenn du genau diesen vollständigen Neuaufbau möchtest.</p>
            ${renderRecipeResyncDeleteCandidates(preview.full_rebuild_delete_candidates || preview.delete_candidates || [], "Bestand 0")}
        </section>
    `;
}

async function loadRecipeResyncPreview() {
    setAdminResyncMessage("");
    const target = document.getElementById("admin-resync-results");
    if (target) target.innerHTML = `<p class="admin-empty-state">Vorschau wird erstellt ...</p>`;
    try {
        const preview = await apiFetch(`${API_URL}/admin/recipe-resync-preview`);
        renderRecipeResyncPreview(preview);
        showToast("Vorschau erstellt.");
    } catch (error) {
        console.error(error);
        setAdminResyncMessage(error.message || "Vorschau konnte nicht erstellt werden.");
    }
}

async function applyRecipeResync(deleteAllZeroStock = false) {
    const standardDeleteCount = Number(latestRecipeResyncPreview?.counts?.delete_candidates || 0);
    const fullDeleteCount = Number(latestRecipeResyncPreview?.counts?.full_rebuild_delete_candidates || standardDeleteCount);
    const deleteCount = deleteAllZeroStock ? fullDeleteCount : standardDeleteCount;
    const createCount = Number(latestRecipeResyncPreview?.counts?.create_new || 0);
    const headline = deleteAllZeroStock ? "Großen Neuaufbau wirklich ausführen?" : "Rezept-Zutaten wirklich neu aufbauen?";
    const detail = deleteAllZeroStock
        ? "Alle nicht verwendeten Artikel mit Bestand 0 werden gelöscht. Artikel mit Bestand bleiben geschützt."
        : "Nur bestandslose automatisch erzeugte Parse-Altlasten werden gelöscht. Artikel mit Bestand bleiben geschützt.";
    if (!confirm(`${headline}\n\nNeu anzulegen: ${createCount}\nZu löschen: ${deleteCount}\n\n${detail}`)) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/recipe-resync-apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delete_all_zero_stock: Boolean(deleteAllZeroStock) })
        });
        renderRecipeResyncPreview(result.preview);
        if (result.cleanup_preview) renderCleanupPreview(result.cleanup_preview);
        showToast(`Synchronisierung abgeschlossen: ${result.result?.linked_ingredients || 0} Zutaten verknüpft.`);
    } catch (error) {
        console.error(error);
        setAdminResyncMessage(error.message || "Synchronisierung konnte nicht ausgeführt werden.");
    }
}



function openAdminTableInNewTab(tableName) {
    const url = `adminTable.html?table=${encodeURIComponent(tableName)}`;
    window.open(url, "_blank", "noopener");
}

function getAdminTableNameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("table") || "food_items";
}

async function loadAdminTablePage() {
    const tableName = getAdminTableNameFromUrl();
    const content = document.getElementById("admin-table-content");
    const title = document.getElementById("admin-table-title");
    const subtitle = document.getElementById("admin-table-subtitle");
    if (title) title.textContent = tableName || "Tabelle";
    if (subtitle) subtitle.textContent = "Wird geladen ...";
    if (content) content.innerHTML = `<p class="admin-empty-state">Tabellendaten werden geladen ...</p>`;
    setAdminTableMessage("");

    try {
        const preview = await apiFetch(`${API_URL}/admin/tables/${encodeURIComponent(tableName)}?limit=1000`);
        renderAdminTablePreview(preview);
    } catch (error) {
        console.error(error);
        setAdminTableMessage(error.message || "Tabelle konnte nicht geladen werden.");
    }
}

function ensureAdminTableModal() {
    let modal = document.getElementById("admin-table-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "admin-table-modal";
    modal.className = "inventory-modal is-hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "admin-table-title");
    modal.innerHTML = `
        <div class="inventory-modal-backdrop" onclick="closeAdminTableModal()"></div>
        <div class="inventory-modal-dialog admin-table-dialog">
            <div class="inventory-section-headline">
                <div>
                    <p class="recipe-kicker">Systemtabelle</p>
                    <h2 id="admin-table-title">Tabelle</h2>
                    <p id="admin-table-subtitle" class="admin-result-note"></p>
                </div>
                <button type="button" class="header-icon-button" onclick="closeAdminTableModal()" title="Fenster schließen" aria-label="Fenster schließen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div id="admin-table-message" class="inventory-overlay-message is-hidden" aria-live="polite"></div>
            <div id="admin-table-content" class="admin-table-content"></div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function setAdminTableMessage(message, type = "error") {
    const box = document.getElementById("admin-table-message");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("is-hidden", !message);
    box.dataset.type = type;
}

function closeAdminTableModal() {
    const modal = document.getElementById("admin-table-modal");
    if (modal) modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
}

function formatAdminTableCell(value) {
    if (value === null || value === undefined || value === "") return `<span class="admin-table-empty">—</span>`;
    if (typeof value === "number") return escapeHtml(Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3))));
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text) || /^\d{4}-\d{2}-\d{2} /.test(text)) return escapeHtml(formatGermanDateTime(text));
    return escapeHtml(text);
}

function getAdminTableDescription(tableName) {
    const descriptions = {
        food_aliases: "Alias-Zuordnungen: welche Schreibweisen auf welchen Lebensmittel-Stammsatz zeigen.",
        food_items: "Lebensmittel-Stammdaten: kanonische Lebensmittel, Aliase und Rezeptverknüpfungen.",
        recipe_ingredients: "Strukturierte Rezeptzutaten inklusive expliziter Verknüpfung zum Lebensmittel-Stammsatz.",
        inventory_items: "Inventarartikel inklusive Bestandsübersicht aus Einheiten und freien Mengen."
    };
    return descriptions[tableName] || "Direkte Tabellenansicht zur Datenprüfung.";
}

let latestAdminTablePreview = null;
let adminFoodItemOptionsCache = null;
let selectedFoodItemConsolidationIds = new Set();

async function loadAdminFoodItemOptions() {
    if (adminFoodItemOptionsCache) return adminFoodItemOptionsCache;
    const payload = await apiFetch(`${API_URL}/admin/food-items`);
    adminFoodItemOptionsCache = Array.isArray(payload.items) ? payload.items : [];
    return adminFoodItemOptionsCache;
}

function renderFoodItemSelectOptions(items, selectedId = null, includeEmpty = false) {
    const selected = Number(selectedId);
    const empty = includeEmpty ? `<option value="">Keine Verknüpfung</option>` : "";
    return empty + items.map(item => `
        <option value="${Number(item.id)}" ${Number(item.id) === selected ? "selected" : ""}>
            ${escapeHtml(item.display_name || `Lebensmittel #${item.id}`)}${item.alias_count ? ` · ${Number(item.alias_count)} Aliase` : ""}
        </option>
    `).join("");
}

function adminActionButton(label, attrs = "", danger = false) {
    return `<button type="button" class="form-actions-button-like ${danger ? "toolbar-delete-button" : ""}" ${attrs}>${escapeHtml(label)}</button>`;
}

function renderAdminTableCell(row, column, tableName) {
    if (tableName === "food_items" && column === "__select") {
        return `<input type="checkbox" class="admin-food-consolidation-checkbox" style="width:18px;min-height:18px;accent-color:var(--color-primary);" data-food-consolidation-id="${Number(row.id)}" aria-label="${escapeHtml(row.display_name || `Lebensmittel #${row.id}`)} auswählen">`;
    }
    if (tableName === "food_items" && column === "display_name") {
        return `<button type="button" class="admin-item-name-button" data-food-detail-id="${Number(row.id)}">${formatAdminTableCell(row[column])}</button>`;
    }
    if (tableName === "food_aliases" && column === "target_food_item") {
        return row.food_item_id
            ? `<button type="button" class="admin-item-name-button" data-food-detail-id="${Number(row.food_item_id)}">${formatAdminTableCell(row[column])}</button>`
            : formatAdminTableCell(row[column]);
    }
    if (tableName === "recipe_ingredients" && column === "linked_food_item") {
        return row.food_item_id
            ? `<button type="button" class="admin-item-name-button" data-food-detail-id="${Number(row.food_item_id)}">${formatAdminTableCell(row[column])}</button>`
            : formatAdminTableCell(row[column]);
    }
    return formatAdminTableCell(row[column]);
}

function renderAdminTableRowActions(row, tableName) {
    if (tableName === "food_aliases") {
        return `
            <td class="admin-table-actions-cell">
                ${adminActionButton("Bearbeiten", `data-edit-alias-id="${Number(row.id)}" data-alias-name="${escapeHtml(row.alias_name || "")}" data-food-item-id="${Number(row.food_item_id || 0)}"`)}
                ${adminActionButton("Löschen", `data-delete-alias-id="${Number(row.id)}" data-alias-name="${escapeHtml(row.alias_name || "")}"`, true)}
            </td>`;
    }
    if (tableName === "food_items") {
        return `
            <td class="admin-table-actions-cell">
                ${adminActionButton("Details", `data-food-detail-id="${Number(row.id)}"`)}
                ${adminActionButton("Alias +", `data-new-alias-food-id="${Number(row.id)}" data-food-display-name="${escapeHtml(row.display_name || "")}"`)}
                ${adminActionButton("Als Master", `data-consolidate-master-id="${Number(row.id)}"`)}
            </td>`;
    }
    if (tableName === "recipe_ingredients") {
        return `
            <td class="admin-table-actions-cell">
                ${adminActionButton("Verknüpfen", `data-edit-recipe-ingredient-link="${Number(row.id)}" data-food-item-id="${Number(row.food_item_id || 0)}" data-raw-text="${escapeHtml(row.raw_text || "")}"`)}
            </td>`;
    }
    return `<td></td>`;
}

function tableHasActions(tableName) {
    return ["food_aliases", "food_items", "recipe_ingredients"].includes(tableName);
}

function renderAdminTablePreview(preview) {
    latestAdminTablePreview = preview;
    const title = document.getElementById("admin-table-title");
    const subtitle = document.getElementById("admin-table-subtitle");
    const content = document.getElementById("admin-table-content");
    if (title) title.textContent = preview.table || "Tabelle";
    if (subtitle) subtitle.textContent = `${getAdminTableDescription(preview.table)} · ${Number(preview.total_count || 0)} Einträge insgesamt · Anzeige max. ${Number(preview.limit || 0)}`;
    if (!content) return;

    const baseColumns = Array.isArray(preview.columns) ? preview.columns : [];
    const rows = Array.isArray(preview.rows) ? preview.rows : [];
    const columns = preview.table === "food_items" ? ["__select", ...baseColumns] : baseColumns;
    const hasActions = tableHasActions(preview.table);

    selectedFoodItemConsolidationIds = new Set();

    const foodItemsExtra = preview.table === "food_items" ? `
        <div class="admin-action-row admin-action-row-neutral">
            <p>Stammdaten konsolidieren: Wähle zwei oder mehr Lebensmittel aus. Klicke anschließend in der Zeile des korrekten Artikels auf „Als Master“. Alle ausgewählten anderen Stammsätze werden in diesen Artikel überführt; Rezept-Zutaten, Inventarbezüge und Aliase werden umgehängt.</p>
            <span class="admin-pill" id="admin-food-consolidation-count">0 ausgewählt</span>
        </div>
    ` : "";

    const extra = preview.table === "food_aliases" ? `
        <div class="admin-action-row admin-action-row-neutral">
            <p>Alias direkt verwalten: bestehende Schreibweisen ändern, Ziel-Lebensmittel wechseln oder neue Aliase anlegen.</p>
            ${adminActionButton("Neuen Alias anlegen", `data-new-alias-food-id=""`)}
        </div>
    ` : "";

    if (!rows.length) {
        content.innerHTML = `${foodItemsExtra}${extra}<p class="admin-empty-state">Keine Einträge in dieser Tabelle.</p>`;
        return;
    }

    content.innerHTML = `
        ${foodItemsExtra}
        ${extra}
        <div class="admin-table-scroll">
            <table class="admin-data-table">
                <thead>
                    <tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}${hasActions ? "<th>Aktion</th>" : ""}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${columns.map(column => `<td>${renderAdminTableCell(row, column, preview.table)}</td>`).join("")}
                            ${hasActions ? renderAdminTableRowActions(row, preview.table) : ""}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}


function updateFoodConsolidationCount() {
    const counter = document.getElementById("admin-food-consolidation-count");
    if (counter) counter.textContent = `${selectedFoodItemConsolidationIds.size} ausgewählt`;
}

async function consolidateSelectedFoodItems(masterFoodItemId) {
    const masterId = Number(masterFoodItemId);
    const duplicateIds = Array.from(selectedFoodItemConsolidationIds).map(Number).filter(id => Number.isFinite(id) && id !== masterId);
    if (!Number.isFinite(masterId)) return;
    if (!duplicateIds.length) {
        setAdminTableMessage("Bitte wähle mindestens einen weiteren Stammsatz aus, der in diesen Master überführt werden soll.");
        return;
    }
    const masterRow = (latestAdminTablePreview?.rows || []).find(row => Number(row.id) === masterId);
    if (!confirm(`„${masterRow?.display_name || `Lebensmittel #${masterId}`}“ als Master behalten und ${duplicateIds.length} Stammsätze konsolidieren?\n\nDabei werden Rezept-Verknüpfungen, Inventarbezüge und Aliase auf den Master umgehängt. Die Dubletten-Stammsätze werden danach entfernt.`)) return;
    try {
        const payload = await apiFetch(`${API_URL}/admin/food-items/consolidate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ master_food_item_id: masterId, duplicate_food_item_ids: duplicateIds })
        });
        adminFoodItemOptionsCache = null;
        selectedFoodItemConsolidationIds = new Set();
        if (payload.table) renderAdminTablePreview(payload.table);
        if (payload.system_status) {
            renderAdminSystemSummary(payload.system_status);
            renderAdminSystemResults(payload.system_status);
        }
        showToast(`${payload.result?.merged?.length || duplicateIds.length} Stammsätze konsolidiert.`);
    } catch (error) {
        console.error(error);
        setAdminTableMessage(error.message || "Stammdaten konnten nicht konsolidiert werden.");
    }
}

async function openAdminTableModal(tableName) {
    const modal = ensureAdminTableModal();
    const content = document.getElementById("admin-table-content");
    const title = document.getElementById("admin-table-title");
    const subtitle = document.getElementById("admin-table-subtitle");
    if (modal) modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    if (title) title.textContent = tableName || "Tabelle";
    if (subtitle) subtitle.textContent = "Wird geladen ...";
    if (content) content.innerHTML = `<p class="admin-empty-state">Tabellendaten werden geladen ...</p>`;
    setAdminTableMessage("");

    try {
        const preview = await apiFetch(`${API_URL}/admin/tables/${encodeURIComponent(tableName)}?limit=250`);
        renderAdminTablePreview(preview);
    } catch (error) {
        console.error(error);
        setAdminTableMessage(error.message || "Tabelle konnte nicht geladen werden.");
    }
}



function ensureAdminUtilityModal() {
    let modal = document.getElementById("admin-utility-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "admin-utility-modal";
    modal.className = "inventory-modal is-hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
        <div class="inventory-modal-backdrop" data-close-admin-utility="true"></div>
        <div class="inventory-modal-dialog admin-item-dialog">
            <div class="inventory-section-headline">
                <div>
                    <p id="admin-utility-kicker" class="recipe-kicker">Admin</p>
                    <h2 id="admin-utility-title">Bearbeiten</h2>
                    <p id="admin-utility-subtitle" class="admin-result-note"></p>
                </div>
                <button type="button" class="header-icon-button" data-close-admin-utility="true" title="Fenster schließen" aria-label="Fenster schließen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div id="admin-utility-message" class="inventory-overlay-message is-hidden" aria-live="polite"></div>
            <div id="admin-utility-content" class="admin-item-modal-content"></div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function closeAdminUtilityModal() {
    const modal = document.getElementById("admin-utility-modal");
    if (modal) modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
}

function setAdminUtilityMessage(message, type = "error") {
    const box = document.getElementById("admin-utility-message");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("is-hidden", !message);
    box.dataset.type = type;
}

function openAdminUtilityModal(title, subtitle = "", kicker = "Admin") {
    const modal = ensureAdminUtilityModal();
    document.getElementById("admin-utility-title").textContent = title;
    document.getElementById("admin-utility-subtitle").textContent = subtitle;
    document.getElementById("admin-utility-kicker").textContent = kicker;
    document.getElementById("admin-utility-content").innerHTML = `<p class="admin-empty-state">Wird geladen ...</p>`;
    setAdminUtilityMessage("");
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
}

async function refreshCurrentAdminTable() {
    if (!latestAdminTablePreview?.table) return;
    const preview = await apiFetch(`${API_URL}/admin/tables/${encodeURIComponent(latestAdminTablePreview.table)}?limit=${Number(latestAdminTablePreview.limit || 250)}`);
    renderAdminTablePreview(preview);
}

async function openAliasEditor({ aliasId = null, aliasName = "", foodItemId = null } = {}) {
    openAdminUtilityModal(aliasId ? "Alias bearbeiten" : "Alias anlegen", "Lege fest, welche Schreibweise auf welchen Lebensmittel-Stammsatz zeigt.", "Lebensmittel-Alias");
    try {
        const items = await loadAdminFoodItemOptions();
        const content = document.getElementById("admin-utility-content");
        content.innerHTML = `
            <form id="admin-alias-form" class="inventory-create-form">
                <div class="form-section">
                    <label for="admin-alias-name">Alias / Schreibweise</label>
                    <input type="text" id="admin-alias-name" value="${escapeHtml(aliasName)}" placeholder="z.B. Paprika rot">
                </div>
                <div class="form-section">
                    <label for="admin-alias-food-item">Ziel-Lebensmittel</label>
                    <select id="admin-alias-food-item">
                        ${renderFoodItemSelectOptions(items, foodItemId, true)}
                    </select>
                </div>
                <div class="form-actions inventory-actions">
                    <button type="button" class="secondary-button" data-close-admin-utility="true">Abbrechen</button>
                    <button type="button" id="admin-save-alias-button">Speichern</button>
                </div>
            </form>`;
        document.getElementById("admin-save-alias-button").addEventListener("click", async () => {
            const payload = {
                alias_name: document.getElementById("admin-alias-name").value.trim(),
                food_item_id: Number(document.getElementById("admin-alias-food-item").value)
            };
            try {
                const result = await apiFetch(aliasId ? `${API_URL}/admin/food-aliases/${aliasId}` : `${API_URL}/admin/food-aliases`, {
                    method: aliasId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                adminFoodItemOptionsCache = null;
                if (result.table) renderAdminTablePreview(result.table);
                showToast(aliasId ? "Alias gespeichert." : "Alias angelegt.");
                closeAdminUtilityModal();
            } catch (error) {
                setAdminUtilityMessage(error.message || "Alias konnte nicht gespeichert werden.");
            }
        });
    } catch (error) {
        setAdminUtilityMessage(error.message || "Alias-Dialog konnte nicht geladen werden.");
    }
}

async function deleteFoodAlias(aliasId, aliasName = "") {
    if (!confirm(`Alias wirklich löschen?\n\n${aliasName || `Alias #${aliasId}`}`)) return;
    try {
        const result = await apiFetch(`${API_URL}/admin/food-aliases/${aliasId}`, { method: "DELETE" });
        adminFoodItemOptionsCache = null;
        if (result.table) renderAdminTablePreview(result.table);
        showToast("Alias gelöscht.");
    } catch (error) {
        setAdminTableMessage(error.message || "Alias konnte nicht gelöscht werden.");
    }
}

async function openFoodItemDetail(foodItemId) {
    openAdminUtilityModal("Lebensmittel-Details", "Aliase, Inventarartikel und Rezeptverknüpfungen prüfen.", "Stammdaten");
    try {
        const detail = await apiFetch(`${API_URL}/admin/food-items/${Number(foodItemId)}/detail`);
        const content = document.getElementById("admin-utility-content");
        const item = detail.item || {};
        const aliases = Array.isArray(detail.aliases) ? detail.aliases : [];
        const inventoryItems = Array.isArray(detail.inventory_items) ? detail.inventory_items : [];
        const recipeIngredients = Array.isArray(detail.recipe_ingredients) ? detail.recipe_ingredients : [];
        content.innerHTML = `
            <div class="recipe-inventory-summary">
                <a class="recipe-inventory-item-link" href="/inventory.html?item=${encodeURIComponent(inventoryItems[0]?.id || "")}">${escapeHtml(item.display_name || "Lebensmittel")}</a>
                <span>${escapeHtml(item.canonical_key || "")}</span>
            </div>

            <h3 class="admin-modal-subheadline">Aliase</h3>
            <div class="admin-chip-row">
                ${aliases.length ? aliases.map(alias => `<span class="admin-pill">${escapeHtml(alias.alias_name)}</span>`).join("") : `<p class="admin-empty-state">Keine Aliase vorhanden.</p>`}
            </div>
            <div class="form-actions inventory-actions">
                ${adminActionButton("Alias hinzufügen", `data-new-alias-food-id="${Number(item.id)}" data-food-display-name="${escapeHtml(item.display_name || "")}"`)}
            </div>

            <h3 class="admin-modal-subheadline">Inventarartikel</h3>
            ${inventoryItems.length ? inventoryItems.map(inv => `
                <div class="admin-result-card admin-item-row">
                    <div>
                        <strong>${escapeHtml(inv.name)}</strong>
                        <div class="admin-item-meta"><span class="admin-pill">Bestand: ${formatAdminTableCell(inv.total_stock)}</span><span class="admin-pill">Quelle: ${escapeHtml(inv.source || "")}</span></div>
                    </div>
                    <a class="form-actions-button-like" href="/inventory.html?item=${Number(inv.id)}">Im Inventar öffnen</a>
                </div>
            `).join("") : `<p class="admin-empty-state">Kein Inventarartikel verknüpft.</p>`}

            <h3 class="admin-modal-subheadline">Rezept-Zutaten</h3>
            ${recipeIngredients.length ? recipeIngredients.map(ri => `
                <div class="admin-result-card">
                    <div class="admin-result-card-header">
                        <div><h3>${escapeHtml(ri.recipe_name || "Unbenanntes Rezept")}</h3><p class="admin-result-note">${escapeHtml(ri.raw_text || "")}</p></div>
                        ${adminActionButton("Verknüpfung ändern", `data-edit-recipe-ingredient-link="${Number(ri.id)}" data-food-item-id="${Number(item.id)}" data-raw-text="${escapeHtml(ri.raw_text || "")}"`)}
                    </div>
                </div>
            `).join("") : `<p class="admin-empty-state">Keine Rezept-Zutaten verknüpft.</p>`}
        `;
    } catch (error) {
        setAdminUtilityMessage(error.message || "Lebensmittel-Details konnten nicht geladen werden.");
    }
}

async function openRecipeIngredientLinkEditor({ ingredientId, foodItemId = null, rawText = "" }) {
    openAdminUtilityModal("Zutaten-Verknüpfung bearbeiten", rawText || "Wähle den korrekten Lebensmittel-Stammsatz für diese Rezeptzutat.", "Rezept-Zutat");
    try {
        const items = await loadAdminFoodItemOptions();
        const content = document.getElementById("admin-utility-content");
        content.innerHTML = `
            <form id="admin-recipe-link-form" class="inventory-create-form">
                <div class="inventory-position-summary"><strong>${escapeHtml(rawText || `Zutat #${ingredientId}`)}</strong><span>Nur die Verknüpfung wird geändert; der Rezepttext bleibt unverändert.</span></div>
                <div class="form-section">
                    <label for="admin-recipe-link-food-item">Verknüpftes Lebensmittel</label>
                    <select id="admin-recipe-link-food-item">
                        ${renderFoodItemSelectOptions(items, foodItemId, true)}
                    </select>
                </div>
                <div class="form-actions inventory-actions">
                    <button type="button" class="secondary-button" data-close-admin-utility="true">Abbrechen</button>
                    <button type="button" id="admin-unlink-ingredient-button" class="secondary-button">Verknüpfung lösen</button>
                    <button type="button" id="admin-save-ingredient-link-button">Speichern</button>
                </div>
            </form>`;
        async function saveLink(value) {
            try {
                await apiFetch(`${API_URL}/admin/recipe-ingredients/${Number(ingredientId)}/link`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ food_item_id: value })
                });
                showToast("Rezept-Zutat aktualisiert.");
                closeAdminUtilityModal();
                await refreshCurrentAdminTable();
            } catch (error) {
                setAdminUtilityMessage(error.message || "Verknüpfung konnte nicht gespeichert werden.");
            }
        }
        document.getElementById("admin-save-ingredient-link-button").addEventListener("click", () => saveLink(Number(document.getElementById("admin-recipe-link-food-item").value)));
        document.getElementById("admin-unlink-ingredient-button").addEventListener("click", () => saveLink(null));
    } catch (error) {
        setAdminUtilityMessage(error.message || "Verknüpfungsdialog konnte nicht geladen werden.");
    }
}

// Explicitly expose handlers used by inline HTML attributes and dynamic admin controls.
// This keeps the Admin page robust even when functions are referenced from generated markup.
window.loadAdminSystemStatus = loadAdminSystemStatus;
window.loadInventoryCleanupPreview = loadInventoryCleanupPreview;
window.loadRecipeResyncPreview = loadRecipeResyncPreview;
window.openAdminTableModal = openAdminTableModal;
window.closeAdminTableModal = closeAdminTableModal;
window.closeAdminItemModal = closeAdminItemModal;
window.closeAdminUtilityModal = closeAdminUtilityModal;
