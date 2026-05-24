const API_URL = "https://foodcalculator-server.onrender.com";

let inventoryItems = [];
let inventorySuggestions = [];

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

function updateInventoryStockType() {
    const type = getCheckedValue("inventory-stock-type") || "package";
    document.getElementById("inventory-package-fields")?.classList.toggle("is-hidden", type !== "package");
    document.getElementById("inventory-loose-fields")?.classList.toggle("is-hidden", type !== "loose");
}

function getCheckedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
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
        unitLabel: document.getElementById("inventory-unit-label").value,
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
        if (!Number(payload.packageCount) || Number(payload.packageCount) <= 0) return showToast("Bitte die Anzahl der Packungseinheiten eingeben.");
        if (!payload.unitLabel.trim()) return showToast("Bitte die Packungseinheit eingeben, z.B. Dose.");
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

function adjustInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    if (!item) return;
    document.getElementById("adjust-inventory-id").value = item.id;
    document.getElementById("adjust-inventory-name").textContent = item.name || "";
    document.getElementById("adjust-inventory-current").textContent = `Aktueller Bestand: ${formatAmount(item)}`;
    setAdjustmentAction("add", false);
    populatePackageProfileSelect(item);
    document.getElementById("adjust-inventory-mode").value = "package";
    document.getElementById("adjust-inventory-amount").value = "";
    document.getElementById("adjust-loose-amount").value = "";
    document.getElementById("adjust-unit-label").value = "";
    document.getElementById("adjust-unit-weight").value = "";
    updateAdjustmentMode();
    openInventoryAdjustModal();
}

function setAdjustmentAction(action, update = true) {
    document.getElementById("adjust-inventory-action").value = action;
    document.getElementById("adjust-action-add")?.classList.toggle("is-active", action === "add");
    document.getElementById("adjust-action-remove")?.classList.toggle("is-active", action === "remove");
    if (update) updateAdjustmentMode();
}

function openInventoryAdjustModal() {
    const modal = document.getElementById("inventory-adjust-modal");
    if (!modal) return;
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
}

function closeInventoryAdjustModal() {
    const modal = document.getElementById("inventory-adjust-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
    document.getElementById("inventory-adjust-form")?.reset();
}

function getSelectedAdjustmentItem() {
    const id = document.getElementById("adjust-inventory-id")?.value;
    return inventoryItems.find(entry => String(entry.id) === String(id));
}

function getPackageProfiles(item) {
    const profiles = new Map();
    (item?.batches || []).forEach(batch => {
        if (batch.batch_type !== "package" || Number(batch.remaining_quantity || 0) <= 0) return;
        const key = `${batch.unit_label}||${batch.unit_weight}||${batch.measure_unit}`;
        const current = profiles.get(key) || { key, unit_label: batch.unit_label, unit_weight: batch.unit_weight, measure_unit: batch.measure_unit, count: 0 };
        current.count += Number(batch.remaining_quantity || 0);
        profiles.set(key, current);
    });
    return Array.from(profiles.values());
}

function populatePackageProfileSelect(item) {
    const select = document.getElementById("adjust-package-profile");
    if (!select) return;
    const profiles = getPackageProfiles(item);
    select.innerHTML = profiles.length
        ? profiles.map(profile => `<option value="${escapeHtml(profile.key)}">${formatNumber(profile.count)} × ${escapeHtml(profile.unit_label)} à ${formatNumber(profile.unit_weight)} ${escapeHtml(profile.measure_unit)}</option>`).join("")
        : `<option value="">Keine Packungseinheiten vorhanden</option>`;
}

function updateAdjustmentMode() {
    const action = document.getElementById("adjust-inventory-action")?.value || "add";
    const modeSelect = document.getElementById("adjust-inventory-mode");
    const mode = modeSelect?.value || "package";
    const packageFields = document.getElementById("adjust-package-fields");
    const looseFields = document.getElementById("adjust-loose-fields");
    const packageProfileSection = document.getElementById("adjust-package-profile-section");
    const packageLabelSection = document.getElementById("adjust-package-label-section");
    const unitWeightSection = document.getElementById("adjust-unit-weight-section");
    const hint = document.getElementById("adjust-inventory-hint");

    const autoOption = Array.from(modeSelect.options).find(option => option.value === "auto");
    if (autoOption) autoOption.hidden = action === "add";
    if (action === "add" && mode === "auto") modeSelect.value = "loose";

    const effectiveMode = modeSelect.value;
    packageFields?.classList.toggle("is-hidden", effectiveMode !== "package");
    looseFields?.classList.toggle("is-hidden", !(effectiveMode === "loose" || effectiveMode === "auto"));

    packageProfileSection?.classList.toggle("is-hidden", !(effectiveMode === "package" && action === "remove"));
    packageLabelSection?.classList.toggle("is-hidden", !(effectiveMode === "package" && action === "add"));
    unitWeightSection?.classList.toggle("is-hidden", !(effectiveMode === "package" && action === "add"));

    if (hint) {
        if (effectiveMode === "auto") hint.textContent = "Die Entnahmemenge wird zuerst aus freien Mengen und danach aus Packungseinheiten verrechnet.";
        else if (effectiveMode === "package" && action === "remove") hint.textContent = "Wähle eine vorhandene Packungseinheit aus und reduziere ganze Einheiten.";
        else if (effectiveMode === "package") hint.textContent = "Neue Packungseinheiten werden einzeln im Bestand geführt.";
        else hint.textContent = "Freie Mengen werden aggregiert geführt.";
    }
    updateAdjustmentPreview();
}

function updateAdjustmentPreview() {
    const action = document.getElementById("adjust-inventory-action")?.value || "add";
    const mode = document.getElementById("adjust-inventory-mode")?.value || "package";
    const preview = document.getElementById("adjust-inventory-preview");
    if (!preview) return;
    if (mode === "package") {
        const amount = Number(document.getElementById("adjust-inventory-amount")?.value || 0);
        if (!amount) return preview.textContent = "";
        if (action === "add") {
            const label = document.getElementById("adjust-unit-label")?.value || "Einheit";
            const unitWeight = Number(document.getElementById("adjust-unit-weight")?.value || 0);
            const unit = document.getElementById("adjust-measure-unit-package")?.value || "g";
            preview.textContent = unitWeight ? `Es werden ${formatNumber(amount)} × ${label} à ${formatNumber(unitWeight)} ${unit} hinzugefügt.` : "";
        } else {
            const text = document.getElementById("adjust-package-profile")?.selectedOptions?.[0]?.textContent || "Packungseinheiten";
            preview.textContent = `Es werden ${formatNumber(amount)} Packungseinheit(en) reduziert: ${text}.`;
        }
        return;
    }
    const amount = Number(document.getElementById("adjust-loose-amount")?.value || 0);
    const unit = document.getElementById("adjust-measure-unit-loose")?.value || "g";
    preview.textContent = amount ? `${action === "add" ? "Erhöhung" : "Reduzierung"} um ${formatNumber(amount)} ${unit}.` : "";
}

async function submitInventoryAdjustment() {
    const id = document.getElementById("adjust-inventory-id").value;
    const action = document.getElementById("adjust-inventory-action").value;
    const mode = document.getElementById("adjust-inventory-mode").value;
    let payload = { action, mode };
    if (mode === "package") {
        payload.amount = document.getElementById("adjust-inventory-amount").value;
        if (action === "add") {
            payload.unitLabel = document.getElementById("adjust-unit-label").value;
            payload.unitWeight = document.getElementById("adjust-unit-weight").value;
            payload.measureUnit = document.getElementById("adjust-measure-unit-package").value;
        } else {
            payload.packageProfile = document.getElementById("adjust-package-profile").value;
        }
    } else {
        payload.amount = document.getElementById("adjust-loose-amount").value;
        payload.measureUnit = document.getElementById("adjust-measure-unit-loose").value;
    }
    try {
        await apiFetch(`${API_URL}/inventory/${id}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        showToast("Bestand angepasst.");
        closeInventoryAdjustModal();
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht angepasst werden.");
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
    const packageProfiles = getPackageProfiles(item);
    const packageText = packageProfiles.map(profile => `${formatNumber(profile.count)} × ${profile.unit_label} à ${formatNumber(profile.unit_weight)} ${profile.measure_unit}`);
    const looseByUnit = new Map();
    (item.batches || []).forEach(batch => {
        if (batch.batch_type !== "loose" || Number(batch.remaining_weight || 0) <= 0) return;
        looseByUnit.set(batch.measure_unit, (looseByUnit.get(batch.measure_unit) || 0) + Number(batch.remaining_weight || 0));
    });
    const looseText = Array.from(looseByUnit.entries()).map(([unit, amount]) => `${formatNumber(amount)} ${unit} lose`);
    const parts = [...packageText, ...looseText];
    return parts.length ? parts.join(" · ") : "0 Bestand";
}

function formatDate(dateString) {
    if (!dateString) return "Kein Datum";
    return new Date(dateString).toLocaleDateString("de-DE");
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
            <article class="inventory-item-card">
                <div class="inventory-item-main">
                    <div>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${escapeHtml(formatAmount(item))}</p>
                    </div>
                    <div class="inventory-meta">
                        <span class="inventory-location">${escapeHtml(item.storage_location || "Kein Ort")}</span>
                        <span class="inventory-expiry ${status.className}">${status.label}</span>
                        <span class="inventory-date">${formatDate(item.expiry_date)}</span>
                    </div>
                    ${item.notes ? `<p class="inventory-notes">${escapeHtml(item.notes)}</p>` : ""}
                </div>
                <div class="recipe-icons inventory-icons">
                    <button type="button" onclick="adjustInventoryItem(${item.id})" title="Bestand anpassen" aria-label="Bestand anpassen"><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/><path d="M19 12h0"/></svg></button>
                    <button type="button" onclick="editInventoryItem(${item.id})" title="Bearbeiten" aria-label="Bearbeiten"><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>
                    <button type="button" class="toolbar-delete-button" onclick="deleteInventoryItem(${item.id})" title="Löschen" aria-label="Löschen"><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg></button>
                </div>
            </article>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();
    loadInventorySuggestions();
    updateInventoryStockType();
    const searchInput = document.getElementById("inventory-search");
    if (searchInput) searchInput.addEventListener("input", renderInventoryList);
    const nameInput = document.getElementById("inventory-name");
    if (nameInput) nameInput.addEventListener("input", () => loadInventorySuggestions(nameInput.value));
    ["adjust-package-profile", "adjust-measure-unit-package", "adjust-measure-unit-loose", "adjust-unit-label"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", updateAdjustmentPreview);
        document.getElementById(id)?.addEventListener("change", updateAdjustmentPreview);
    });
});
