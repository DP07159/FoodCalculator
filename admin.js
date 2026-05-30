const API_URL = "https://foodcalculator-server.onrender.com";

let latestCleanupPreview = null;

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
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderSummary(preview) {
    const target = document.getElementById("admin-cleanup-summary");
    if (!target) return;
    const counts = preview?.counts || {};
    target.innerHTML = `
        <article class="admin-summary-card"><span>Inventarartikel</span><strong>${counts.inventory_items ?? 0}</strong></article>
        <article class="admin-summary-card"><span>Mögliche Dubletten</span><strong>${counts.possible_duplicates ?? 0}</strong></article>
        <article class="admin-summary-card"><span>Verwaiste Auto-Zutaten</span><strong>${counts.orphan_recipe_items ?? 0}</strong></article>
        <article class="admin-summary-card"><span>Geschützte Artikel</span><strong>${counts.protected_items ?? 0}</strong></article>
    `;
}

function renderDuplicates(duplicates = []) {
    if (!duplicates.length) {
        return `<p class="admin-empty-state">Keine möglichen Dubletten gefunden.</p>`;
    }
    return duplicates.map(group => `
        <article class="admin-result-card">
            <div class="admin-result-card-header">
                <div>
                    <span class="admin-pill">Dubletten-Hinweis</span>
                    <h3>${escapeHtml(group.suggested_master?.name || group.canonical_key)}</h3>
                </div>
                <small>${escapeHtml(group.canonical_key)}</small>
            </div>
            <div class="admin-chip-row">
                ${(group.candidates || []).map(item => `
                    <span class="inventory-summary-chip ${item.has_stock ? "" : "inventory-summary-empty"}">
                        ${escapeHtml(item.name)} · ${item.has_stock ? "Bestand" : "0"} · ${escapeHtml(item.source)}
                    </span>
                `).join("")}
            </div>
        </article>
    `).join("");
}

function renderOrphans(orphanItems = []) {
    if (!orphanItems.length) {
        return `<p class="admin-empty-state">Keine sicher löschbaren verwaisten Auto-Zutaten gefunden.</p>`;
    }
    return `
        <div class="admin-action-row">
            <p>${orphanItems.length} automatisch erzeugte Artikel ohne Bestand und ohne Rezeptverwendung wurden gefunden.</p>
            <button type="button" class="toolbar-icon-button toolbar-delete-button" onclick="applyOrphanCleanup()" title="Verwaiste Auto-Zutaten löschen" aria-label="Verwaiste Auto-Zutaten löschen">
                <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>
            </button>
        </div>
        <div class="admin-chip-row">
            ${orphanItems.map(item => `<span class="inventory-summary-chip inventory-summary-empty">${escapeHtml(item.name)}</span>`).join("")}
        </div>
    `;
}

function renderProtected(protectedItems = []) {
    if (!protectedItems.length) return `<p class="admin-empty-state">Keine geschützten Artikel gefunden.</p>`;
    return `
        <div class="admin-chip-row">
            ${protectedItems.slice(0, 60).map(item => `<span class="inventory-summary-chip">${escapeHtml(item.name)}</span>`).join("")}
            ${protectedItems.length > 60 ? `<span class="inventory-summary-chip">+ ${protectedItems.length - 60} weitere</span>` : ""}
        </div>
    `;
}

function renderCleanupPreview(preview) {
    latestCleanupPreview = preview;
    renderSummary(preview);
    const target = document.getElementById("admin-cleanup-results");
    if (!target) return;
    target.innerHTML = `
        <section class="admin-result-section">
            <h2>Mögliche Dubletten</h2>
            ${renderDuplicates(preview.possible_duplicates)}
        </section>
        <section class="admin-result-section">
            <h2>Verwaiste Auto-Zutaten</h2>
            ${renderOrphans(preview.orphan_recipe_items)}
        </section>
        <section class="admin-result-section">
            <h2>Geschützte Artikel</h2>
            ${renderProtected(preview.protected_items)}
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

document.addEventListener("DOMContentLoaded", loadInventoryCleanupPreview);
