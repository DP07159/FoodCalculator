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
                            <h3>${escapeHtml(item.name)}</h3>
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
                    ${candidates.map(item => `
                        <section class="admin-duplicate-item ${Number(item.id) === masterId ? "is-suggested-master" : ""}">
                            <div class="admin-duplicate-item-head">
                                <div>
                                    <span class="admin-pill">${Number(item.id) === masterId ? "Vorschlag: behalten" : "Kandidat"}</span>
                                    <h4>${escapeHtml(item.name)}</h4>
                                </div>
                                ${renderAdminDeleteButton(item, "Diesen Artikel endgültig löschen")}
                            </div>
                            ${renderItemMeta(item)}
                            <p class="admin-result-note">ID ${Number(item.id)} · ${escapeHtml(item.canonical_name || "")}</p>
                        </section>
                    `).join("")}
                </div>

                ${candidates.length === 2 ? `
                    <div class="admin-action-row admin-action-row-neutral">
                        <p>Diese beiden Artikel sind ähnlich, sollen aber getrennt erhalten bleiben.</p>
                        <button type="button" class="form-actions-button-like" onclick="keepDuplicatePair(${Number(candidates[0].id)}, ${Number(candidates[1].id)})">Beide behalten</button>
                    </div>
                ` : `<p class="admin-result-note">Bei Gruppen mit mehr als zwei Artikeln bitte einzelne falsche Artikel löschen. Eine „beide behalten“-Entscheidung ist hier bewusst nicht automatisch möglich.</p>`}
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
                            <h3>${escapeHtml(item.name)}</h3>
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
                            <h3>${escapeHtml(item.name)}</h3>
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

document.addEventListener("DOMContentLoaded", loadInventoryCleanupPreview);
