const API_URL = "https://foodcalculator-server.onrender.com";

let inventoryItems = [];
let inventorySuggestions = [];

const ICONS = {
    plus: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    minus: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>`,
    edit: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>`,
    trash: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>`,
    plusMinus: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v6"/><path d="M9 8h6"/><path d="M5 16h14"/></svg>`
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

function showOverlayMessage(message, targetId = "") {
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) {
        showToast(message);
        return;
    }
    target.textContent = message;
    target.classList.remove("is-hidden");
    window.clearTimeout(showOverlayMessage.timeouts?.[targetId]);
    showOverlayMessage.timeouts = showOverlayMessage.timeouts || {};
    showOverlayMessage.timeouts[targetId] = window.setTimeout(() => {
        target.classList.add("is-hidden");
        target.textContent = "";
    }, 4200);
}

function clearOverlayMessage(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.classList.add("is-hidden");
    target.textContent = "";
}

function getActiveInventoryMessageTarget() {
    const active = document.activeElement;
    if (active?.closest?.("#inventory-add-panel")) return "inventory-add-message";
    if (active?.closest?.("#inventory-edit-modal")) return "inventory-edit-message";
    if (active?.closest?.("#inventory-position-modal")) return "inventory-position-message";
    return "";
}


function setDateToday(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    input.value = `${year}-${month}-${day}`;
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function clearDateInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function showIntegerOnlyHint() {
    const now = Date.now();
    if (showIntegerOnlyHint.lastShown && now - showIntegerOnlyHint.lastShown < 1200) return;
    showIntegerOnlyHint.lastShown = now;
    showOverlayMessage("Bitte nur ganze Zahlen eingeben.", getActiveInventoryMessageTarget());
}

function sanitizeIntegerInput(input, showHint = true) {
    if (!input) return;
    const originalValue = input.value;
    const sanitizedValue = originalValue.replace(/[^0-9]/g, "");
    if (originalValue !== sanitizedValue) {
        input.value = sanitizedValue;
        if (showHint) showIntegerOnlyHint();
    }
}

function setupIntegerOnlyInput(input) {
    if (!input || input.dataset.integerListenerAttached === "true") return;
    input.dataset.integerListenerAttached = "true";

    input.addEventListener("keydown", (event) => {
        const allowedControlKeys = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (event.ctrlKey || event.metaKey || event.altKey || allowedControlKeys.includes(event.key)) return;
        if (!/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            showIntegerOnlyHint();
        }
    });

    input.addEventListener("input", () => sanitizeIntegerInput(input));

    input.addEventListener("paste", (event) => {
        const pastedText = event.clipboardData?.getData("text") || "";
        if (/[^0-9]/.test(pastedText)) {
            event.preventDefault();
            input.value = `${input.value}${pastedText}`.replace(/[^0-9]/g, "");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            showIntegerOnlyHint();
        }
    });
}

function setupIntegerOnlyFields(scope = document) {
    scope.querySelectorAll('[data-integer-only="true"]').forEach(setupIntegerOnlyInput);
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
        updateInventoryLocationFilterOptions();
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

    if (shouldOpen) {
        closeInventoryEditModal();
        closeInventoryPositionModal();
        resetInventoryForm();
        clearOverlayMessage("inventory-add-message");
    } else {
        clearOverlayMessage("inventory-add-message");
    }

    panel.classList.toggle("is-hidden", !shouldOpen);
    document.body.classList.toggle("modal-open", shouldOpen || isAnyInventoryModalOpen("inventory-add-panel"));

    if (shouldOpen) {
        window.requestAnimationFrame(() => document.getElementById("inventory-name")?.focus());
    }
}

function isAnyInventoryModalOpen(excludeId = "") {
    return Array.from(document.querySelectorAll(".inventory-modal")).some(modal => {
        if (excludeId && modal.id === excludeId) return false;
        return !modal.classList.contains("is-hidden");
    });
}

function getCheckedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function updateInventoryStockType() {
    const type = getCheckedValue("inventory-stock-type") || "package";
    const packageFields = document.getElementById("inventory-package-fields");
    const looseFields = document.getElementById("inventory-loose-fields");

    packageFields?.classList.toggle("is-muted", type !== "package");
    looseFields?.classList.toggle("is-muted", type !== "loose");

    packageFields?.querySelectorAll("input, select").forEach(field => { field.disabled = type !== "package"; });
    looseFields?.querySelectorAll("input, select").forEach(field => { field.disabled = type !== "loose"; });
}

function getInventoryPayload() {
    const stockType = getCheckedValue("inventory-stock-type") || "package";
    const isPackage = stockType === "package";
    const measureUnit = isPackage
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
        expiry_date: isPackage
            ? document.getElementById("inventory-package-expiry").value
            : document.getElementById("inventory-loose-expiry").value,
        storage_location: isPackage
            ? document.getElementById("inventory-package-location").value
            : document.getElementById("inventory-loose-location").value,
        notes: ""
    };
}

async function saveInventoryItem() {
    const payload = getInventoryPayload();
    if (!payload.name.trim()) return showOverlayMessage("Bitte eine Bezeichnung eingeben.", "inventory-add-message");

    if (payload.stockType === "package") {
        sanitizeIntegerInput(document.getElementById("inventory-package-count"), false);
        payload.packageCount = document.getElementById("inventory-package-count")?.value || payload.packageCount;
        if (!Number(payload.packageCount) || Number(payload.packageCount) <= 0) return showOverlayMessage("Bitte die Anzahl eingeben.", "inventory-add-message");
        if (!Number.isInteger(Number(payload.packageCount))) return showOverlayMessage("Bitte bei Anzahl Einheiten eine ganze Zahl eingeben.", "inventory-add-message");
        if (!Number(payload.unitWeight) || Number(payload.unitWeight) <= 0) return showOverlayMessage("Bitte den Inhalt je Einheit eingeben.", "inventory-add-message");
    }

    if (payload.stockType === "loose" && (!Number(payload.looseAmount) || Number(payload.looseAmount) <= 0)) {
        return showOverlayMessage("Bitte die freie Menge eingeben.", "inventory-add-message");
    }

    try {
        await apiFetch(`${API_URL}/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, packageCount: payload.stockType === "package" ? Math.floor(Number(payload.packageCount)) : payload.packageCount })
        });
        showToast("Bestand gespeichert.");
        resetInventoryForm();
        toggleInventoryAddPanel(false);
        await loadInventory();
    } catch (error) {
        console.error(error);
        showOverlayMessage(error.message || "Bestand konnte nicht gespeichert werden.", "inventory-add-message");
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
    openInventoryEditModal();
}

function openInventoryEditModal() {
    toggleInventoryAddPanel(false);
    closeAllInventoryPanels();
    const modal = document.getElementById("inventory-edit-modal");
    if (!modal) return;
    clearOverlayMessage("inventory-edit-message");
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => document.getElementById("edit-inventory-name")?.focus());
}

function closeInventoryEditModal() {
    const modal = document.getElementById("inventory-edit-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    clearOverlayMessage("inventory-edit-message");
    if (!isAnyInventoryModalOpen("inventory-edit-modal")) document.body.classList.remove("modal-open");
    document.getElementById("inventory-edit-form")?.reset();
}

async function saveEditedInventoryItem() {
    const id = document.getElementById("edit-inventory-id").value;
    const currentItem = inventoryItems.find(entry => String(entry.id) === String(id));
    const payload = {
        name: document.getElementById("edit-inventory-name").value,
        unit: document.getElementById("edit-inventory-unit").value,
        notes: currentItem?.notes || ""
    };

    if (!id) return showOverlayMessage("Kein Inventar-Eintrag ausgewählt.", "inventory-edit-message");
    if (!payload.name.trim()) return showOverlayMessage("Bitte eine Bezeichnung eingeben.", "inventory-edit-message");

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
        showOverlayMessage(error.message || "Eintrag konnte nicht aktualisiert werden.", "inventory-edit-message");
    }
}


function makeStockKey(parts) {
    return parts.map(part => encodeURIComponent(String(part ?? ""))).join("|");
}

function parseStockKey(key) {
    return String(key ?? "").split("|").map(part => decodeURIComponent(part));
}

function cssSafe(value) {
    return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getStorageLocationOptions(selectedValue = "") {
    const locations = ["", "TK", "KS", "TK (Keller)", "KS (Keller)", "Vorratsraum"];
    return locations.map(location => {
        const label = location || "Lagerort wählen";
        const selected = location === selectedValue ? " selected" : "";
        return `<option value="${escapeHtml(location)}"${selected}>${escapeHtml(label)}</option>`;
    }).join("");
}

function getPrimaryLocations(item) {
    const locations = new Set();
    (item?.batches || []).forEach(batch => {
        if ((Number(batch.remaining_quantity || 0) > 0 || Number(batch.remaining_weight || 0) > 0) && batch.storage_location) {
            locations.add(batch.storage_location);
        }
    });
    if (!locations.size && item?.storage_location) locations.add(item.storage_location);
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
}

function closeAllInventoryPanels(exceptItemId = null) {
    document.querySelectorAll(".inventory-stock-controls").forEach(panel => {
        if (exceptItemId && panel.id === `inventory-controls-${exceptItemId}`) return;
        panel.classList.add("is-hidden");
    });
}

function toggleInventoryControls(itemId, forceOpen) {
    const panel = document.getElementById(`inventory-controls-${itemId}`);
    if (!panel) return;

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("is-hidden");
    closeInventoryEditModal();
    closeInventoryPositionModal();
    toggleInventoryAddPanel(false);
    closeAllInventoryPanels(itemId);
    panel.classList.toggle("is-hidden", !shouldOpen);

    if (shouldOpen) {
        window.requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
}

function getPackageProfiles(item) {
    const profiles = new Map();
    (item?.batches || []).forEach(batch => {
        if (batch.batch_type !== "package") return;
        const unitWeight = Number(batch.unit_weight || batch.original_weight || batch.remaining_weight || 0);
        const measureUnit = batch.measure_unit || item.unit || "g";
        const location = batch.storage_location || "";
        const expiry = batch.expiry_date || "";
        if (!unitWeight) return;
        const key = makeStockKey([unitWeight, measureUnit, location, expiry]);
        const current = profiles.get(key) || { key, unit_weight: unitWeight, measure_unit: measureUnit, storage_location: location, expiry_date: expiry, count: 0 };
        current.count += Number(batch.remaining_quantity || 0);
        profiles.set(key, current);
    });
    return Array.from(profiles.values()).sort((a, b) => {
        const locationCompare = (a.storage_location || "").localeCompare(b.storage_location || "");
        if (locationCompare) return locationCompare;
        return a.unit_weight - b.unit_weight || a.measure_unit.localeCompare(b.measure_unit);
    });
}

function getLooseProfiles(item) {
    const profiles = new Map();
    (item?.batches || []).forEach(batch => {
        if (batch.batch_type !== "loose") return;
        const measureUnit = batch.measure_unit || item.unit || "g";
        const location = batch.storage_location || "";
        const expiry = batch.expiry_date || "";
        const key = makeStockKey([measureUnit, location, expiry]);
        const current = profiles.get(key) || { key, measure_unit: measureUnit, storage_location: location, expiry_date: expiry, amount: 0 };
        current.amount += Number(batch.remaining_weight || 0);
        profiles.set(key, current);
    });
    return Array.from(profiles.values()).sort((a, b) => {
        const locationCompare = (a.storage_location || "").localeCompare(b.storage_location || "");
        if (locationCompare) return locationCompare;
        return a.measure_unit.localeCompare(b.measure_unit);
    });
}

function findPackageProfile(itemId, profileKey) {
    const item = inventoryItems.find(entry => String(entry.id) === String(itemId));
    if (!item) return null;
    return getPackageProfiles(item).find(profile => profile.key === profileKey) || null;
}

function findLooseProfile(itemId, profileKey) {
    const item = inventoryItems.find(entry => String(entry.id) === String(itemId));
    if (!item) return null;
    return getLooseProfiles(item).find(profile => profile.key === profileKey) || null;
}

function closeInventoryPositionModal() {
    const modal = document.getElementById("inventory-position-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    clearOverlayMessage("inventory-position-message");
    document.getElementById("inventory-position-form")?.reset();
    if (!isAnyInventoryModalOpen("inventory-position-modal")) document.body.classList.remove("modal-open");
}

function configurePositionFieldVisibility(mode, action) {
    const amountFields = document.getElementById("position-amount-fields");
    const amountInput = document.getElementById("position-amount");
    const unitWeightInput = document.getElementById("position-unit-weight");
    const measureUnitInput = document.getElementById("position-measure-unit");
    const amountLabel = document.querySelector('label[for="position-amount"]');
    const unitWeightLabel = document.querySelector('label[for="position-unit-weight"]');
    const unitWeightSection = unitWeightInput?.closest(".form-section");
    const measureUnitSection = measureUnitInput?.closest(".form-section");

    const isMeta = action === "meta";
    const isNew = action === "add-new";
    amountFields?.classList.toggle("is-hidden", isMeta);
    unitWeightSection?.classList.toggle("is-hidden", mode !== "package" || isMeta);
    measureUnitSection?.classList.toggle("is-hidden", isMeta);

    if (amountLabel) amountLabel.textContent = mode === "package" ? "Anzahl Einheiten" : "Freie Menge";
    if (unitWeightLabel) unitWeightLabel.textContent = mode === "package" ? "Inhalt je Einheit" : "Inhalt";
    if (amountInput) {
        amountInput.step = mode === "package" ? "1" : "0.1";
        amountInput.inputMode = mode === "package" ? "numeric" : "decimal";
        if (mode === "package") {
            amountInput.setAttribute("pattern", "[0-9]*");
            amountInput.dataset.integerOnly = "true";
            sanitizeIntegerInput(amountInput, false);
            setupIntegerOnlyInput(amountInput);
        } else {
            amountInput.removeAttribute("pattern");
            delete amountInput.dataset.integerOnly;
        }
    }
    if (unitWeightInput) unitWeightInput.disabled = mode === "package" && !isNew;
    if (measureUnitInput) measureUnitInput.disabled = !isNew;
}

function openInventoryPositionModal(itemId, mode, action, profileKey = "__new__") {
    closeInventoryEditModal();
    document.getElementById("inventory-add-panel")?.classList.add("is-hidden");

    const isPackage = mode === "package";
    const isNew = action === "add-new";
    const profile = isNew ? null : (isPackage ? findPackageProfile(itemId, profileKey) : findLooseProfile(itemId, profileKey));
    if (!isNew && !profile) return showToast("Position nicht gefunden.");

    document.getElementById("position-item-id").value = itemId;
    document.getElementById("position-profile-key").value = profileKey;
    document.getElementById("position-mode").value = mode;
    document.getElementById("position-action").value = action;

    const title = document.getElementById("inventory-position-title");
    const kicker = document.getElementById("inventory-position-kicker");
    const summary = document.getElementById("position-current-summary");
    const amountInput = document.getElementById("position-amount");
    const unitWeightInput = document.getElementById("position-unit-weight");
    const measureUnitInput = document.getElementById("position-measure-unit");
    const locationInput = document.getElementById("position-location");
    const expiryInput = document.getElementById("position-expiry");
    const hint = document.getElementById("position-modal-hint");

    const isMeta = action === "meta";
    if (title) {
        title.textContent = isMeta
            ? "Position bearbeiten"
            : isNew
                ? (isPackage ? "Neue Einheit hinzufügen" : "Neue freie Menge hinzufügen")
                : "Bestand erhöhen";
    }
    if (kicker) kicker.textContent = isPackage ? "Einheiten" : "Freie Menge";

    if (summary) {
        if (isNew) {
            summary.innerHTML = `<strong>${isPackage ? "Neue Einheit" : "Neue freie Menge"}</strong><span>Lagerort und Ablaufdatum werden direkt für diese neue Position gespeichert.</span>`;
        } else {
            summary.innerHTML = isPackage
                ? `<strong>${formatNumber(profile.count)} × ${formatNumber(profile.unit_weight)} ${escapeHtml(profile.measure_unit)}</strong><span>${escapeHtml(profile.storage_location || "Kein Ort")} · ${escapeHtml(profile.expiry_date ? formatDate(profile.expiry_date) : "Kein Ablaufdatum")}</span>`
                : `<strong>${formatNumber(profile.amount)} ${escapeHtml(profile.measure_unit)}</strong><span>${escapeHtml(profile.storage_location || "Kein Ort")} · ${escapeHtml(profile.expiry_date ? formatDate(profile.expiry_date) : "Kein Ablaufdatum")}</span>`;
        }
    }

    if (amountInput) amountInput.value = isMeta ? "" : (isPackage ? "1" : "");
    if (unitWeightInput) unitWeightInput.value = isPackage && profile ? profile.unit_weight : "";
    if (measureUnitInput) measureUnitInput.value = profile?.measure_unit || "g";
    if (locationInput) locationInput.value = profile?.storage_location || "";
    if (expiryInput) expiryInput.value = profile?.expiry_date || "";
    if (hint) {
        hint.textContent = isMeta
            ? "Lagerort und Ablaufdatum werden für diese Position angepasst. Wenn dadurch gleiche Positionen entstehen, werden sie in der Übersicht zusammengefasst."
            : isNew
                ? "Diese Position wird neu angelegt. Gleicher Inhalt, gleiche Einheit, gleicher Lagerort und gleiches Ablaufdatum werden in der Übersicht zusammengeführt."
                : "Bestehende Werte sind vorausgefüllt. Änderst du Lagerort oder Ablaufdatum, wird eine neue Lagerposition angelegt.";
    }

    configurePositionFieldVisibility(mode, action);

    const modal = document.getElementById("inventory-position-modal");
    clearOverlayMessage("inventory-position-message");
    modal?.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => (isMeta ? locationInput : amountInput)?.focus());
}

async function submitInventoryPositionModal() {
    const itemId = document.getElementById("position-item-id")?.value;
    const profileKey = document.getElementById("position-profile-key")?.value;
    const mode = document.getElementById("position-mode")?.value;
    const action = document.getElementById("position-action")?.value;
    const positionAmountInput = document.getElementById("position-amount");
    if (document.getElementById("position-mode")?.value === "package") sanitizeIntegerInput(positionAmountInput, false);
    const amount = Number(positionAmountInput?.value || 0);
    const unitWeight = Number(document.getElementById("position-unit-weight")?.value || 0);
    const measureUnit = document.getElementById("position-measure-unit")?.value || "g";
    const storageLocation = document.getElementById("position-location")?.value || "";
    const expiryDate = document.getElementById("position-expiry")?.value || "";

    if (!itemId || !profileKey || !mode || !action) return showOverlayMessage("Position nicht vollständig ausgewählt.", "inventory-position-message");

    try {
        if (action === "meta") {
            const payload = mode === "package"
                ? (() => {
                    const [oldUnitWeight, oldMeasureUnit, oldStorageLocation, oldExpiryDate] = parseStockKey(profileKey);
                    return { mode, unitWeight: oldUnitWeight, measureUnit: oldMeasureUnit, storage_location: oldStorageLocation || "", expiry_date: oldExpiryDate || "", new_storage_location: storageLocation, new_expiry_date: expiryDate };
                })()
                : (() => {
                    const [oldMeasureUnit, oldStorageLocation, oldExpiryDate] = parseStockKey(profileKey);
                    return { mode, measureUnit: oldMeasureUnit, storage_location: oldStorageLocation || "", expiry_date: oldExpiryDate || "", new_storage_location: storageLocation, new_expiry_date: expiryDate };
                })();

            await apiFetch(`${API_URL}/inventory/${itemId}/stock-profile/meta`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showToast("Position aktualisiert.");
        } else if (mode === "package") {
            if (!amount || amount <= 0) return showOverlayMessage("Bitte eine Anzahl eingeben.", "inventory-position-message");
            if (!Number.isInteger(amount)) return showOverlayMessage("Bitte bei Anzahl Einheiten eine ganze Zahl eingeben.", "inventory-position-message");
            if (!unitWeight || unitWeight <= 0) return showOverlayMessage("Ungültiger Inhalt je Einheit.", "inventory-position-message");
            await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "add", mode: "package", amount: Math.floor(amount), unitWeight, measureUnit, storage_location: storageLocation, expiry_date: expiryDate })
            });
            showToast("Einheit hinzugefügt.");
        } else {
            if (!amount || amount <= 0) return showOverlayMessage("Bitte eine Menge eingeben.", "inventory-position-message");
            await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "add", mode: "loose", amount, measureUnit, storage_location: storageLocation, expiry_date: expiryDate })
            });
            showToast("Menge erhöht.");
        }

        closeInventoryPositionModal();
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showOverlayMessage(error.message || "Position konnte nicht angepasst werden.", "inventory-position-message");
    }
}

async function adjustPackageProfile(itemId, profileKey, action, amount = 1) {
    const [unitWeight, measureUnit, storageLocation, expiryDate] = parseStockKey(profileKey);
    const payload = {
        action,
        mode: "package",
        amount,
        packageProfile: profileKey,
        unitWeight,
        measureUnit,
        storage_location: storageLocation || "",
        expiry_date: expiryDate || ""
    };

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        showToast(action === "add" ? "Einheit hinzugefügt." : "Einheit reduziert.");
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht angepasst werden.");
    }
}

async function adjustLooseAmount(itemId, profileKey, action) {
    const [measureUnit, storageLocation, expiryDate] = parseStockKey(profileKey);
    const input = document.getElementById(`loose-adjust-${itemId}-${cssSafe(profileKey)}`);
    const amount = Number(input?.value || 0);
    if (!amount || amount <= 0) return showOverlayMessage("Bitte eine Menge eingeben.", "inventory-position-message");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, mode: "loose", amount, measureUnit, storage_location: storageLocation || "", expiry_date: expiryDate || "" })
        });
        showToast(action === "add" ? "Menge erhöht." : "Menge reduziert.");
        if (input) input.value = "";
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Bestand konnte nicht angepasst werden.");
    }
}

async function deletePackageProfile(itemId, profileKey) {
    const [unitWeight, measureUnit, storageLocation, expiryDate] = parseStockKey(profileKey);
    if (!confirm("Möchtest du diese Einheiten-Position vollständig löschen?")) return;

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/stock-profile`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "package",
                unitWeight,
                measureUnit,
                storage_location: storageLocation || "",
                expiry_date: expiryDate || ""
            })
        });
        showToast("Position gelöscht.");
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Position konnte nicht gelöscht werden.");
    }
}

async function deleteLooseProfile(itemId, profileKey) {
    const [measureUnit, storageLocation, expiryDate] = parseStockKey(profileKey);
    if (!confirm("Möchtest du diese freie Mengenposition vollständig löschen?")) return;

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/stock-profile`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "loose",
                measureUnit,
                storage_location: storageLocation || "",
                expiry_date: expiryDate || ""
            })
        });
        showToast("Position gelöscht.");
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Position konnte nicht gelöscht werden.");
    }
}

async function addNewPackageProfile(itemId) {
    const countInput = document.getElementById(`new-package-count-${itemId}`);
    const weightInput = document.getElementById(`new-package-weight-${itemId}`);
    const unitInput = document.getElementById(`new-package-unit-${itemId}`);
    const locationInput = document.getElementById(`new-package-location-${itemId}`);
    const expiryInput = document.getElementById(`new-package-expiry-${itemId}`);
    const count = Number(countInput?.value || 0);
    const unitWeight = Number(weightInput?.value || 0);
    const measureUnit = unitInput?.value || "g";
    const storageLocation = locationInput?.value || "";
    const expiryDate = expiryInput?.value || "";

    if (!count || count <= 0) return showToast("Bitte eine Anzahl eingeben.");
    if (!Number.isInteger(count)) return showToast("Bitte bei Anzahl Einheiten eine ganze Zahl eingeben.");
    if (!unitWeight || unitWeight <= 0) return showToast("Bitte den Inhalt je Einheit eingeben.");
    if (!storageLocation) return showToast("Bitte einen Lagerort auswählen.");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", mode: "package", amount: Math.floor(count), unitWeight, measureUnit, storage_location: storageLocation, expiry_date: expiryDate })
        });
        showToast("Neue Einheit hinzugefügt.");
        if (countInput) countInput.value = "";
        if (weightInput) weightInput.value = "";
        if (expiryInput) expiryInput.value = "";
        await loadInventory();
        toggleInventoryControls(itemId, true);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Einheit konnte nicht hinzugefügt werden.");
    }
}

async function addNewLooseAmount(itemId) {
    const amountInput = document.getElementById(`new-loose-amount-${itemId}`);
    const unitInput = document.getElementById(`new-loose-unit-${itemId}`);
    const locationInput = document.getElementById(`new-loose-location-${itemId}`);
    const expiryInput = document.getElementById(`new-loose-expiry-${itemId}`);
    const amount = Number(amountInput?.value || 0);
    const measureUnit = unitInput?.value || "g";
    const storageLocation = locationInput?.value || "";
    const expiryDate = expiryInput?.value || "";

    if (!amount || amount <= 0) return showToast("Bitte eine freie Menge eingeben.");
    if (!storageLocation) return showToast("Bitte einen Lagerort auswählen.");

    try {
        await apiFetch(`${API_URL}/inventory/${itemId}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", mode: "loose", amount, measureUnit, storage_location: storageLocation, expiry_date: expiryDate })
        });
        showToast("Freie Menge hinzugefügt.");
        if (amountInput) amountInput.value = "";
        if (expiryInput) expiryInput.value = "";
        await loadInventory();
        toggleInventoryControls(itemId, true);
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

function getItemLocations(item) {
    const locations = new Set();
    (item?.batches || []).forEach(batch => {
        if (batch.storage_location) locations.add(batch.storage_location);
    });
    if (item?.storage_location) locations.add(item.storage_location);
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
}

function getItemExpiryDates(item) {
    const dates = [];
    if (item?.expiry_date) dates.push(item.expiry_date);
    (item?.batches || []).forEach(batch => {
        if (batch.expiry_date) dates.push(batch.expiry_date);
    });
    return dates.sort();
}

function getItemSortExpiry(item, direction = "asc") {
    const dates = getItemExpiryDates(item);
    if (!dates.length) return direction === "asc" ? "9999-12-31" : "0000-01-01";
    return direction === "asc" ? dates[0] : dates[dates.length - 1];
}

function getItemPrimaryLocation(item) {
    return getItemLocations(item)[0] || "";
}

function updateInventoryLocationFilterOptions() {
    const select = document.getElementById("inventory-location-filter");
    if (!select) return;
    const currentValue = select.value;
    const locations = new Set();
    inventoryItems.forEach(item => getItemLocations(item).forEach(location => locations.add(location)));
    select.innerHTML = `<option value="">Alle Lagerorte</option>` + Array.from(locations).sort((a, b) => a.localeCompare(b))
        .map(location => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
        .join("");
    select.value = Array.from(locations).includes(currentValue) ? currentValue : "";
}

function sortInventoryItems(items) {
    const sortValue = document.getElementById("inventory-sort")?.value || "name-asc";
    return [...items].sort((a, b) => {
        if (sortValue === "name-desc") return (b.name || "").localeCompare(a.name || "", "de", { sensitivity: "base" });
        if (sortValue === "expiry-asc") return getItemSortExpiry(a, "asc").localeCompare(getItemSortExpiry(b, "asc")) || (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" });
        if (sortValue === "expiry-desc") return getItemSortExpiry(b, "desc").localeCompare(getItemSortExpiry(a, "desc")) || (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" });
        if (sortValue === "location-asc") return getItemPrimaryLocation(a).localeCompare(getItemPrimaryLocation(b), "de", { sensitivity: "base" }) || (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" });
        return (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" });
    });
}

function getSummaryRows(item) {
    const rows = [];
    getPackageProfiles(item).forEach(profile => {
        rows.push(`${formatNumber(profile.count)} × ${formatNumber(profile.unit_weight)} ${profile.measure_unit}${profile.storage_location ? ` · ${profile.storage_location}` : ""}`);
    });
    getLooseProfiles(item).forEach(profile => {
        rows.push(`${formatNumber(profile.amount)} ${profile.measure_unit} frei${profile.storage_location ? ` · ${profile.storage_location}` : ""}`);
    });
    return rows;
}

function formatAmount(item) {
    const parts = getSummaryRows(item);
    return parts.length ? parts.join(" · ") : "0 Bestand";
}

function formatDate(dateString) {
    if (!dateString) return "Kein Datum";
    return new Date(dateString).toLocaleDateString("de-DE");
}

function renderSummaryChips(item) {
    const rows = getSummaryRows(item);
    if (!rows.length) return `<span class="inventory-summary-chip inventory-summary-empty">0 Bestand</span>`;
    return rows.slice(0, 4).map(row => `<span class="inventory-summary-chip">${escapeHtml(row)}</span>`).join("") +
        (rows.length > 4 ? `<span class="inventory-summary-chip">+${rows.length - 4} weitere</span>` : "");
}

function renderPackageRows(item) {
    const profiles = getPackageProfiles(item);
    if (!profiles.length) {
        return `<p class="inventory-empty-inline">Keine Einheiten vorhanden.</p>`;
    }

    return profiles.map(profile => {
        const detail = [profile.storage_location || "Kein Ort", profile.expiry_date ? formatDate(profile.expiry_date) : "Kein Ablaufdatum"].join(" · ");
        const status = getExpiryStatus(profile.expiry_date);
        return `
            <div class="inventory-stock-row ${Number(profile.count) <= 0 ? "is-zero" : ""}">
                <div class="inventory-stock-row-main">
                    <strong>${formatNumber(profile.count)} × ${formatNumber(profile.unit_weight)} ${escapeHtml(profile.measure_unit)}</strong>
                    <span>${escapeHtml(detail)}</span>
                    <span class="inventory-expiry inventory-position-expiry ${status.className}">${escapeHtml(status.label)}</span>
                </div>
                <div class="inventory-stock-row-actions">
                    <button type="button" class="inventory-mini-button" ${Number(profile.count) <= 0 ? "disabled" : ""} onclick="adjustPackageProfile(${item.id}, '${escapeHtml(profile.key)}', 'remove')" title="Einheit reduzieren" aria-label="Einheit reduzieren">${ICONS.minus}</button>
                    <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'package', 'add', '${escapeHtml(profile.key)}')" title="Einheit erhöhen" aria-label="Einheit erhöhen">${ICONS.plus}</button>
                    <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'package', 'meta', '${escapeHtml(profile.key)}')" title="Position bearbeiten" aria-label="Position bearbeiten">${ICONS.edit}</button>
                    <button type="button" class="inventory-mini-button inventory-mini-button-danger" onclick="deletePackageProfile(${item.id}, '${escapeHtml(profile.key)}')" title="Position löschen" aria-label="Position löschen">${ICONS.trash}</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderLooseRows(item) {
    const profiles = getLooseProfiles(item);
    if (!profiles.length) {
        return `<p class="inventory-empty-inline">Keine freie Menge vorhanden.</p>`;
    }

    return profiles.map(profile => {
        const inputId = `loose-adjust-${item.id}-${cssSafe(profile.key)}`;
        const detail = [profile.storage_location || "Kein Ort", profile.expiry_date ? formatDate(profile.expiry_date) : "Kein Ablaufdatum"].join(" · ");
        const status = getExpiryStatus(profile.expiry_date);
        return `
            <div class="inventory-stock-row inventory-stock-row-loose ${Number(profile.amount) <= 0 ? "is-zero" : ""}">
                <div class="inventory-stock-row-main">
                    <strong>${formatNumber(profile.amount)} ${escapeHtml(profile.measure_unit)}</strong>
                    <span>${escapeHtml(detail)}</span>
                    <span class="inventory-expiry inventory-position-expiry ${status.className}">${escapeHtml(status.label)}</span>
                </div>
                <div class="inventory-stock-row-actions inventory-stock-row-actions-wide">
                    <input id="${inputId}" type="number" min="0" step="0.1" placeholder="Menge">
                    <button type="button" class="inventory-mini-button" ${Number(profile.amount) <= 0 ? "disabled" : ""} onclick="adjustLooseAmount(${item.id}, '${escapeHtml(profile.key)}', 'remove')" title="Menge reduzieren" aria-label="Menge reduzieren">${ICONS.minus}</button>
                    <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'loose', 'add', '${escapeHtml(profile.key)}')" title="Menge erhöhen" aria-label="Menge erhöhen">${ICONS.plus}</button>
                    <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'loose', 'meta', '${escapeHtml(profile.key)}')" title="Position bearbeiten" aria-label="Position bearbeiten">${ICONS.edit}</button>
                    <button type="button" class="inventory-mini-button inventory-mini-button-danger" onclick="deleteLooseProfile(${item.id}, '${escapeHtml(profile.key)}')" title="Position löschen" aria-label="Position löschen">${ICONS.trash}</button>
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
    const locationFilter = document.getElementById("inventory-location-filter")?.value || "";
    const filteredItems = sortInventoryItems(inventoryItems.filter(item => {
        const locations = getItemLocations(item);
        const searchable = [item.name, item.storage_location, item.notes, item.unit, locations.join(" "), formatAmount(item)].join(" ").toLowerCase();
        const matchesSearch = searchable.includes(searchTerm);
        const matchesLocation = !locationFilter || locations.includes(locationFilter);
        return matchesSearch && matchesLocation;
    }));

    if (filteredItems.length === 0) {
        list.innerHTML = `<p class="recipe-empty-state">Keine Lebensmittel im Inventar gefunden.</p>`;
        return;
    }

    list.innerHTML = filteredItems.map(item => {
        const status = getExpiryStatus(item.expiry_date);
        return `
            <article class="inventory-item-card inventory-item-card-detailed inventory-item-card-compact">
                <div class="inventory-item-header">
                    <div class="inventory-item-main">
                        <h3>${escapeHtml(item.name)}</h3>
                        <div class="inventory-summary-row">${renderSummaryChips(item)}</div>
                        <div class="inventory-meta inventory-meta-compact">
                            <span class="inventory-expiry ${status.className}">${status.label}</span>
                            <span class="inventory-date">${formatDate(item.expiry_date)}</span>
                        </div>
                        ${item.notes ? `<p class="inventory-notes">${escapeHtml(item.notes)}</p>` : ""}
                    </div>
                    <div class="recipe-icons inventory-icons">
                        <button type="button" onclick="toggleInventoryControls(${item.id})" title="Bestand anpassen" aria-label="Bestand anpassen">${ICONS.plusMinus}</button>
                        <button type="button" onclick="editInventoryItem(${item.id})" title="Bearbeiten" aria-label="Bearbeiten">${ICONS.edit}</button>
                        <button type="button" class="toolbar-delete-button" onclick="deleteInventoryItem(${item.id})" title="Löschen" aria-label="Löschen">${ICONS.trash}</button>
                    </div>
                </div>

                <div id="inventory-controls-${item.id}" class="inventory-stock-controls is-hidden">
                    <section class="inventory-stock-panel inventory-stock-panel-combined">
                        <div class="inventory-stock-section">
                            <div class="inventory-stock-panel-header">
                                <h4>Einheiten</h4>
                                <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'package', 'add-new', '__new__')" title="Neue Einheit hinzufügen" aria-label="Neue Einheit hinzufügen">${ICONS.plus}</button>
                            </div>
                            ${renderPackageRows(item)}
                        </div>

                        <div class="inventory-stock-section">
                            <div class="inventory-stock-panel-header">
                                <h4>Freie Mengen</h4>
                                <button type="button" class="inventory-mini-button" onclick="openInventoryPositionModal(${item.id}, 'loose', 'add-new', '__new__')" title="Neue freie Menge hinzufügen" aria-label="Neue freie Menge hinzufügen">${ICONS.plus}</button>
                            </div>
                            ${renderLooseRows(item)}
                        </div>
                    </section>
                </div>
            </article>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();
    updateInventoryStockType();
    setupIntegerOnlyFields();

    const searchInput = document.getElementById("inventory-search");
    if (searchInput) searchInput.addEventListener("input", renderInventoryList);

    const sortSelect = document.getElementById("inventory-sort");
    if (sortSelect) sortSelect.addEventListener("change", renderInventoryList);

    const locationFilter = document.getElementById("inventory-location-filter");
    if (locationFilter) locationFilter.addEventListener("change", renderInventoryList);

    const nameInput = document.getElementById("inventory-name");
    if (nameInput) {
        nameInput.addEventListener("input", () => loadInventorySuggestions(nameInput.value.trim()));
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeInventoryEditModal();
            closeInventoryPositionModal();
            toggleInventoryAddPanel(false);
        }
    });
});
