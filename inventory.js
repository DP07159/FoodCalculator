const API_URL = "https://foodcalculator-server.onrender.com";

let inventoryItems = [];
let inventorySuggestions = [];

const ICONS = {
    plus: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    minus: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>`,
    edit: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>`,
    trash: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>`
};

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}

async function loadInventory() {
    try {
        inventoryItems = await apiFetch(`${API_URL}/inventory`);
        renderInventoryList();
        refreshSuggestionList();
    } catch (error) {
        console.error(error);
        showToast("Inventar konnte nicht geladen werden.");
    }
}

async function loadInventorySuggestions(query = "") {
    try {
        inventorySuggestions = await apiFetch(`${API_URL}/inventory/suggestions?q=${encodeURIComponent(query)}`);
        refreshSuggestionList();
    } catch (error) {
        console.error(error);
    }
}

function refreshSuggestionList() {
    const datalist = document.getElementById("inventory-name-suggestions");
    if (!datalist) return;
    const names = new Map();
    inventoryItems.forEach(item => names.set(item.name, item));
    inventorySuggestions.forEach(item => names.set(item.name, item));
    datalist.innerHTML = Array.from(names.values())
        .map(item => `<option value="${escapeHtml(item.name)}"></option>`)
        .join("");
}

function toggleInventoryAddPanel(forceOpen) {
    const panel = document.getElementById("inventory-add-panel");
    if (!panel) return;
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("is-hidden");
    panel.classList.toggle("is-hidden", !shouldOpen);
    if (shouldOpen) {
        resetInventoryForm();
        window.requestAnimationFrame(() => document.getElementById("inventory-name")?.focus());
    }
}

function getCheckedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function updateInventoryStockType() {
    const type = getCheckedValue("inventory-stock-type") || "package";
    document.getElementById("inventory-package-fields")?.classList.toggle("is-hidden", type !== "package");
    document.getElementById("inventory-loose-fields")?.classList.toggle("is-hidden", type !== "loose");
}

function getInventoryPayload() {
    const stockType = getCheckedValue("inventory-stock-type") || "package";
    const measureUnit = stockType === "package"
        ? document.getElementById("inventory-measure-unit-package").value
        : document.getElementById("inventory-measure-unit-loose").value;

    return {
        name: document.getElementById("inventory-name").value,
        unit: measureUnit,
        stockType,
        packageCount: document.getElementById("inventory-package-count").value,
        unitLabel: "",
        unitWeight: document.getElementById("inventory-unit-weight").value,
        looseAmount: document.getElementById("inventory-loose-amount").value,
        measureUnit,
        expiry_date: document.getElementById("inventory-expiry").value,
        storage_location: document.getElementById("inventory-location").value,
        notes: document.getElementById("inventory-notes").value
    };
}

async function saveInventoryItem() {
    const payload = getInventoryPayload();
    if (!payload.name.trim()) return showToast("Bitte eine Bezeichnung eingeben.");

    if (payload.stockType === "package") {
        if (!Number(payload.packageCount) || Number(payload.packageCount) <= 0) return showToast("Bitte die Anzahl eingeben.");
        if (!Number(payload.unitWeight) || Number(payload.unitWeight) <= 0) return showToast("Bitte den Inhalt je Einheit eingeben.");
    }

    if (payload.stockType === "loose" && (!Number(payload.looseAmount) || Number(payload.looseAmount) <= 0)) {
        return showToast("Bitte die freie Menge eingeben.");
    }

    try {
        await apiFetch(`${API_URL}/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        showToast("Bestand gespeichert.");
        resetInventoryForm();
        toggleInventoryAddPanel(false);
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht gespeichert werden.");
    }
}

function resetInventoryForm() {
    document.getElementById("inventory-form")?.reset();
    updateInventoryStockType();
}

function editInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    if (!item) return;
    document.getElementById("edit-inventory-id").value = item.id;
    document.getElementById("edit-inventory-name").value = item.name || "";
    document.getElementById("edit-inventory-unit").value = item.unit || "g";
    document.getElementById("edit-inventory-notes").value = item.notes || "";
    openInventoryEditModal();
}

function openInventoryEditModal() {
    const modal = document.getElementById("inventory-edit-modal");
    if (!modal) return;
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => document.getElementById("edit-inventory-name")?.focus());
}

function closeInventoryEditModal() {
    const modal = document.getElementById("inventory-edit-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
    document.getElementById("inventory-edit-form")?.reset();
}

async function saveEditedInventoryItem() {
    const id = document.getElementById("edit-inventory-id").value;
    const payload = {
        name: document.getElementById("edit-inventory-name").value,
        unit: document.getElementById("edit-inventory-unit").value,
        notes: document.getElementById("edit-inventory-notes").value
    };

    if (!id) return showToast("Kein Inventar-Eintrag ausgewählt.");
    if (!payload.name.trim()) return showToast("Bitte eine Bezeichnung eingeben.");

    try {
        await apiFetch(`${API_URL}/inventory/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        showToast("Eintrag aktualisiert.");
        closeInventoryEditModal();
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Eintrag konnte nicht aktualisiert werden.");
    }
}

function getPackageProfiles(item) {
    const profiles = new Map();
    (item?.batches || []).forEach(batch => {
        if (batch.batch_type !== "package" || Number(batch.remaining_quantity || 0) <= 0) return;
        const unitWeight = Number(batch.unit_weight || batch.remaining_weight || 0);
        const measureUnit = batch.measure_unit || item.unit || "g";
        if (!unitWeight) return;
        const key = `${unitWeight}||${measureUnit}`;
        const current = profiles.get(key) || { key, unit_weight: unitWeight, measure_unit: measureUnit, count: 0 };
        current.count += Number(batch.remaining_quantity || 0);
        profiles.set(key, current);
    });
    return Array.from(profiles.values()).sort((a, b) => a.unit_weight - b.unit_weight || a.measure_unit.localeCompare(b.measure_unit));
}

function getLooseProfiles(item) {
    const profiles = new Map();
    (item?.batches || []).forEach(batch => {
        if (batch.batch_type !== "loose" || Number(batch.remaining_weight || 0) <= 0) return;
        const measureUnit = batch.measure_unit || item.unit || "g";
        const current = profiles.get(measureUnit) || { measure_unit: measureUnit, amount: 0 };
        current.amount += Number(batch.remaining_weight || 0);
        profiles.set(measureUnit, current);
    });
    return Array.from(profiles.values()).sort((a, b) => a.measure_unit.localeCompare(b.measure_unit));
}

async function adjustPackageProfile(itemId, profileKey, action, amount = 1) {
    const [unitWeight, measureUnit] = String(profileKey).split("||");
    const payload = {
        action,
        mode: "package",
        amount,
        packageProfile: profileKey,
        unitLabel: "",
        unitWeight,
        measureUnit
    };

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        showToast(action === "add" ? "Einheit hinzugefügt." : "Einheit reduziert.");
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht angepasst werden.");
    }
}

async function adjustLooseAmount(itemId, measureUnit, action) {
    const input = document.getElementById(`loose-adjust-${itemId}-${cssSafe(measureUnit)}`);
    const amount = Number(input?.value || 0);
    if (!amount || amount <= 0) return showToast("Bitte eine Menge eingeben.");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, mode: "loose", amount, measureUnit })
        });
        showToast(action === "add" ? "Menge erhöht." : "Menge reduziert.");
        if (input) input.value = "";
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht angepasst werden.");
    }
}

async function addNewPackageProfile(itemId) {
    const countInput = document.getElementById(`new-package-count-${itemId}`);
    const weightInput = document.getElementById(`new-package-weight-${itemId}`);
    const unitInput = document.getElementById(`new-package-unit-${itemId}`);
    const count = Number(countInput?.value || 0);
    const unitWeight = Number(weightInput?.value || 0);
    const measureUnit = unitInput?.value || "g";

    if (!count || count <= 0) return showToast("Bitte eine Anzahl eingeben.");
    if (!unitWeight || unitWeight <= 0) return showToast("Bitte den Inhalt je Einheit eingeben.");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", mode: "package", amount: count, unitLabel: "", unitWeight, measureUnit })
        });
        showToast("Neue Einheit hinzugefügt.");
        if (countInput) countInput.value = "";
        if (weightInput) weightInput.value = "";
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Einheit konnte nicht hinzugefügt werden.");
    }
}

async function addNewLooseAmount(itemId) {
    const amountInput = document.getElementById(`new-loose-amount-${itemId}`);
    const unitInput = document.getElementById(`new-loose-unit-${itemId}`);
    const amount = Number(amountInput?.value || 0);
    const measureUnit = unitInput?.value || "g";

    if (!amount || amount <= 0) return showToast("Bitte eine freie Menge eingeben.");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", mode: "loose", amount, measureUnit })
        });
        showToast("Freie Menge hinzugefügt.");
        if (amountInput) amountInput.value = "";
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Freie Menge konnte nicht hinzugefügt werden.");
    }
}

async function deleteInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    const itemName = item?.name || "diesen Eintrag";
    if (!confirm(`Möchtest du "${itemName}" wirklich löschen?`)) return;

    try {
        await apiFetch(`${API_URL}/inventory/${id}`, { method: "DELETE" });
        showToast("Eintrag gelöscht.");
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast("Eintrag konnte nicht gelöscht werden.");
    }
}

function getExpiryStatus(expiryDate) {
    if (!expiryDate) return { label: "Kein Ablaufdatum", className: "inventory-neutral" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Abgelaufen", className: "inventory-expired" };
    if (diffDays <= 3) return { label: "Läuft sehr bald ab", className: "inventory-critical" };
    if (diffDays <= 7) return { label: "Läuft bald ab", className: "inventory-warning" };
    return { label: "Haltbar", className: "inventory-good" };
}

function formatNumber(value) {
    const number = Number(value ?? 0);
    if (!Number.isFinite(number)) return "0";
    return Number.isInteger(number) ? String(number) : number.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function formatAmount(item) {
    const packageText = getPackageProfiles(item).map(profile => `${formatNumber(profile.count)} × ${formatNumber(profile.unit_weight)} ${profile.measure_unit}`);
    const looseText = getLooseProfiles(item).map(profile => `${formatNumber(profile.amount)} ${profile.measure_unit} frei`);
    const parts = [...packageText, ...looseText];
    return parts.length ? parts.join(" · ") : "0 Bestand";
}

function formatDate(dateString) {
    if (!dateString) return "Kein Datum";
    return new Date(dateString).toLocaleDateString("de-DE");
}

function cssSafe(value) {
    return String(value || "x").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function renderPackageRows(item) {
    const profiles = getPackageProfiles(item);
    if (!profiles.length) {
        return `<p class="inventory-empty-inline">Keine Einheiten vorhanden.</p>`;
    }

    return profiles.map(profile => `
        <div class="inventory-stock-row">
            <div class="inventory-stock-row-main">
                <strong>${formatNumber(profile.count)} × ${formatNumber(profile.unit_weight)} ${escapeHtml(profile.measure_unit)}</strong>
                <span>Einheiten</span>
            </div>
            <div class="inventory-stock-row-actions">
                <button type="button" class="inventory-mini-button" onclick="adjustPackageProfile(${item.id}, '${escapeHtml(profile.key)}', 'remove')" title="Einheit reduzieren" aria-label="Einheit reduzieren">${ICONS.minus}</button>
                <button type="button" class="inventory-mini-button" onclick="adjustPackageProfile(${item.id}, '${escapeHtml(profile.key)}', 'add')" title="Einheit erhöhen" aria-label="Einheit erhöhen">${ICONS.plus}</button>
            </div>
        </div>
    `).join("");
}

function renderLooseRows(item) {
    const profiles = getLooseProfiles(item);
    if (!profiles.length) {
        return `<p class="inventory-empty-inline">Keine freie Menge vorhanden.</p>`;
    }

    return profiles.map(profile => {
        const idUnit = cssSafe(profile.measure_unit);
        return `
            <div class="inventory-stock-row inventory-stock-row-loose">
                <div class="inventory-stock-row-main">
                    <strong>${formatNumber(profile.amount)} ${escapeHtml(profile.measure_unit)}</strong>
                    <span>freie Menge</span>
                </div>
                <div class="inventory-stock-row-actions inventory-stock-row-actions-wide">
                    <input id="loose-adjust-${item.id}-${idUnit}" type="number" min="0" step="0.1" placeholder="Menge">
                    <button type="button" class="inventory-mini-button" onclick="adjustLooseAmount(${item.id}, '${escapeHtml(profile.measure_unit)}', 'remove')" title="Menge reduzieren" aria-label="Menge reduzieren">${ICONS.minus}</button>
                    <button type="button" class="inventory-mini-button" onclick="adjustLooseAmount(${item.id}, '${escapeHtml(profile.measure_unit)}', 'add')" title="Menge erhöhen" aria-label="Menge erhöhen">${ICONS.plus}</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderInventoryList() {
    const list = document.getElementById("inventory-list");
    const searchInput = document.getElementById("inventory-search");
    if (!list) return;

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filteredItems = inventoryItems.filter(item => {
        const searchable = [item.name, item.storage_location, item.notes, item.unit, formatAmount(item)].join(" ").toLowerCase();
        return searchable.includes(searchTerm);
    });

    if (filteredItems.length === 0) {
        list.innerHTML = `<p class="recipe-empty-state">Keine Lebensmittel im Inventar gefunden.</p>`;
        return;
    }

    list.innerHTML = filteredItems.map(item => {
        const status = getExpiryStatus(item.expiry_date);
        return `
            <article class="inventory-item-card inventory-item-card-detailed">
                <div class="inventory-item-header">
                    <div class="inventory-item-main">
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${escapeHtml(formatAmount(item))}</p>
                        <div class="inventory-meta">
                            <span class="inventory-location">${escapeHtml(item.storage_location || "Kein Ort")}</span>
                            <span class="inventory-expiry ${status.className}">${status.label}</span>
                            <span class="inventory-date">${formatDate(item.expiry_date)}</span>
                        </div>
                        ${item.notes ? `<p class="inventory-notes">${escapeHtml(item.notes)}</p>` : ""}
                    </div>
                    <div class="recipe-icons inventory-icons">
                        <button type="button" onclick="editInventoryItem(${item.id})" title="Bearbeiten" aria-label="Bearbeiten">${ICONS.edit}</button>
                        <button type="button" class="toolbar-delete-button" onclick="deleteInventoryItem(${item.id})" title="Löschen" aria-label="Löschen">${ICONS.trash}</button>
                    </div>
                </div>

                <div class="inventory-stock-grid">
                    <section class="inventory-stock-panel">
                        <div class="inventory-stock-panel-header">
                            <h4>Einheiten</h4>
                            <span>Inhalt je Einheit</span>
                        </div>
                        ${renderPackageRows(item)}
                    </section>

                    <section class="inventory-stock-panel">
                        <div class="inventory-stock-panel-header">
                            <h4>Freie Menge</h4>
                            <span>direkt erhöhen/reduzieren</span>
                        </div>
                        ${renderLooseRows(item)}
                    </section>
                </div>

                <section class="inventory-add-unit-panel">
                    <h4>Neue Einheit oder freie Menge hinzufügen</h4>
                    <div class="inventory-add-unit-grid">
                        <div class="inventory-add-unit-box">
                            <span>Einheit</span>
                            <input id="new-package-count-${item.id}" type="number" min="1" step="1" placeholder="Anzahl">
                            <input id="new-package-weight-${item.id}" type="number" min="0" step="0.1" placeholder="Inhalt je Einheit">
                            <select id="new-package-unit-${item.id}" aria-label="Mengeneinheit">
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="Stk.">Stk.</option>
                            </select>
                            <button type="button" class="inventory-mini-button" onclick="addNewPackageProfile(${item.id})" title="Einheit hinzufügen" aria-label="Einheit hinzufügen">${ICONS.plus}</button>
                        </div>
                        <div class="inventory-add-unit-box">
                            <span>Freie Menge</span>
                            <input id="new-loose-amount-${item.id}" type="number" min="0" step="0.1" placeholder="Menge">
                            <select id="new-loose-unit-${item.id}" aria-label="Mengeneinheit">
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="Stk.">Stk.</option>
                            </select>
                            <button type="button" class="inventory-mini-button" onclick="addNewLooseAmount(${item.id})" title="Freie Menge hinzufügen" aria-label="Freie Menge hinzufügen">${ICONS.plus}</button>
                        </div>
                    </div>
                </section>
            </article>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();
    updateInventoryStockType();

    const searchInput = document.getElementById("inventory-search");
    if (searchInput) searchInput.addEventListener("input", renderInventoryList);

    const nameInput = document.getElementById("inventory-name");
    if (nameInput) {
        nameInput.addEventListener("input", () => loadInventorySuggestions(nameInput.value.trim()));
    }
});
