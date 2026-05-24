const API_URL = "https://foodcalculator-server.onrender.com";

let inventoryItems = [];

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

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || "Serverfehler");
    }

    return payload;
}

async function loadInventory() {
    try {
        inventoryItems = await apiFetch(`${API_URL}/inventory`);
        renderInventoryList();
    } catch (error) {
        console.error(error);
        showToast("Inventar konnte nicht geladen werden.");
    }
}

function toggleInventoryAddPanel(forceOpen) {
    const panel = document.getElementById("inventory-add-panel");
    if (!panel) return;

    const shouldOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : panel.classList.contains("is-hidden");

    panel.classList.toggle("is-hidden", !shouldOpen);

    if (shouldOpen) {
        resetInventoryForm();
        window.requestAnimationFrame(() => document.getElementById("inventory-name")?.focus());
    }
}

function getInventoryPayload(prefix = "inventory") {
    return {
        name: document.getElementById(`${prefix}-name`).value,
        quantity: document.getElementById(`${prefix}-quantity`).value,
        unit: document.getElementById(`${prefix}-unit`).value,
        weight: document.getElementById(`${prefix}-weight`).value,
        expiry_date: document.getElementById(`${prefix}-expiry`).value,
        storage_location: document.getElementById(`${prefix}-location`).value,
        notes: document.getElementById(`${prefix}-notes`).value
    };
}

async function saveInventoryItem() {
    const payload = getInventoryPayload();

    if (!payload.name.trim()) {
        showToast("Bitte eine Bezeichnung eingeben.");
        return;
    }

    try {
        await apiFetch(`${API_URL}/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        showToast("Eintrag gespeichert.");
        resetInventoryForm();
        toggleInventoryAddPanel(false);
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast("Eintrag konnte nicht gespeichert werden.");
    }
}

function editInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    if (!item) return;

    document.getElementById("edit-inventory-id").value = item.id;
    document.getElementById("edit-inventory-name").value = item.name || "";
    document.getElementById("edit-inventory-quantity").value = item.quantity ?? "";
    document.getElementById("edit-inventory-unit").value = item.unit || "";
    document.getElementById("edit-inventory-weight").value = item.weight ?? "";
    document.getElementById("edit-inventory-expiry").value = item.expiry_date || "";
    document.getElementById("edit-inventory-location").value = item.storage_location || "";
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
    document.getElementById("edit-inventory-id").value = "";
}

async function saveEditedInventoryItem() {
    const id = document.getElementById("edit-inventory-id").value;
    const payload = getInventoryPayload("edit-inventory");

    if (!id) {
        showToast("Kein Inventar-Eintrag ausgewählt.");
        return;
    }

    if (!payload.name.trim()) {
        showToast("Bitte eine Bezeichnung eingeben.");
        return;
    }

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
        showToast("Eintrag konnte nicht aktualisiert werden.");
    }
}

function adjustInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    if (!item) return;

    document.getElementById("adjust-inventory-id").value = item.id;
    document.getElementById("adjust-inventory-name").textContent = item.name || "";
    document.getElementById("adjust-inventory-current").textContent = `Aktueller Bestand: ${formatAmount(item)}`;
    document.getElementById("adjust-inventory-action").value = "add";
    document.getElementById("adjust-inventory-mode").value = "quantity";
    document.getElementById("adjust-inventory-amount").value = "";
    document.getElementById("adjust-inventory-unit-weight").value = "";
    document.getElementById("adjust-inventory-weight-amount").value = "";

    updateAdjustmentMode();
    updateAdjustmentPreview();
    openInventoryAdjustModal();
}

function openInventoryAdjustModal() {
    const modal = document.getElementById("inventory-adjust-modal");
    if (!modal) return;

    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => document.getElementById("adjust-inventory-amount")?.focus());
}

function closeInventoryAdjustModal() {
    const modal = document.getElementById("inventory-adjust-modal");
    if (!modal) return;

    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
    document.getElementById("inventory-adjust-form")?.reset();
    document.getElementById("adjust-inventory-id").value = "";
    document.getElementById("adjust-inventory-preview").textContent = "";
    document.getElementById("adjust-inventory-hint").textContent = "";
}

function getSelectedAdjustmentItem() {
    const id = document.getElementById("adjust-inventory-id")?.value;
    return inventoryItems.find(entry => String(entry.id) === String(id));
}

function updateAdjustmentMode() {
    const item = getSelectedAdjustmentItem();
    const mode = document.getElementById("adjust-inventory-mode")?.value || "quantity";
    const quantityFields = document.getElementById("adjust-quantity-fields");
    const weightFields = document.getElementById("adjust-weight-fields");
    const hint = document.getElementById("adjust-inventory-hint");

    quantityFields?.classList.toggle("is-hidden", mode !== "quantity");
    weightFields?.classList.toggle("is-hidden", mode !== "weight");

    if (!hint || !item) return;

    const currentQuantity = Number(item.quantity ?? 0);
    if (mode === "weight" && currentQuantity !== 1) {
        hint.textContent = "Gewicht direkt anpassen ist nur möglich, wenn die Menge exakt 1 beträgt. Bitte passe bei diesem Artikel die Menge an und gib das Gewicht je Einheit an.";
    } else if (mode === "quantity") {
        hint.textContent = "Bei Mengenänderungen bitte immer das Gewicht je Einheit angeben, damit das Gesamtgewicht sauber mitgeführt wird.";
    } else {
        hint.textContent = "Gewichtsanpassungen verändern nur das Gesamtgewicht; die Menge bleibt 1.";
    }

    updateAdjustmentPreview();
}

function calculateAdjustment() {
    const item = getSelectedAdjustmentItem();
    if (!item) return { error: "Kein Inventar-Eintrag ausgewählt." };

    const action = document.getElementById("adjust-inventory-action").value;
    const mode = document.getElementById("adjust-inventory-mode").value;
    const direction = action === "add" ? 1 : -1;
    const currentQuantity = Number(item.quantity ?? 0);
    const currentWeight = Number(item.weight ?? 0);

    if (mode === "weight") {
        const amount = Number(document.getElementById("adjust-inventory-weight-amount").value);

        if (currentQuantity !== 1) {
            return { error: "Gewicht kann nur direkt angepasst werden, wenn die Menge 1 beträgt." };
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return { error: "Bitte eine Gewichtsanpassung größer 0 eingeben." };
        }

        return {
            payload: { action, mode, amount },
            newQuantity: 1,
            newWeight: Math.max(0, currentWeight + direction * amount)
        };
    }

    const amount = Number(document.getElementById("adjust-inventory-amount").value);
    const unitWeight = Number(document.getElementById("adjust-inventory-unit-weight").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Bitte eine Menge größer 0 eingeben." };
    }
    if (!Number.isFinite(unitWeight) || unitWeight <= 0) {
        return { error: "Bitte ein Gewicht je Einheit größer 0 eingeben." };
    }

    return {
        payload: { action, mode, amount, unitWeight },
        newQuantity: Math.max(0, currentQuantity + direction * amount),
        newWeight: Math.max(0, currentWeight + direction * amount * unitWeight)
    };
}

function updateAdjustmentPreview() {
    const preview = document.getElementById("adjust-inventory-preview");
    const item = getSelectedAdjustmentItem();
    if (!preview || !item) return;

    const result = calculateAdjustment();
    if (result.error) {
        preview.textContent = result.error;
        preview.classList.add("is-warning");
        return;
    }

    const unit = item.unit ? ` ${item.unit}` : "";
    preview.classList.remove("is-warning");
    preview.textContent = `Neuer Bestand: ${formatNumber(result.newQuantity)}${unit} · ${formatNumber(result.newWeight)} g`;
}

async function saveInventoryAdjustment() {
    const id = document.getElementById("adjust-inventory-id").value;
    const result = calculateAdjustment();

    if (!id) {
        showToast("Kein Inventar-Eintrag ausgewählt.");
        return;
    }
    if (result.error) {
        showToast(result.error);
        updateAdjustmentPreview();
        return;
    }

    try {
        await apiFetch(`${API_URL}/inventory/${id}/adjust`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result.payload)
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

function resetInventoryForm() {
    document.getElementById("inventory-form")?.reset();
}

function getExpiryStatus(expiryDate) {
    if (!expiryDate) {
        return { label: "Kein Ablaufdatum", className: "inventory-neutral" };
    }

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
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10).replace(".", ",");
}

function formatAmount(item) {
    const quantity = item.quantity ?? "";
    const unit = item.unit || "";
    const weight = item.weight ?? "";

    const quantityText = quantity !== "" ? `${formatNumber(quantity)} ${unit}`.trim() : "";
    const weightText = weight !== "" ? `${formatNumber(weight)} g` : "";

    return [quantityText, weightText].filter(Boolean).join(" · ") || "Keine Mengenangabe";
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
        const searchable = [item.name, item.storage_location, item.notes, item.unit].join(" ").toLowerCase();
        return searchable.includes(searchTerm);
    });

    if (filteredItems.length === 0) {
        list.innerHTML = `<p class="recipe-empty-state">Keine Lebensmittel im Inventar gefunden.</p>`;
        return;
    }

    list.innerHTML = "";

    filteredItems.forEach(item => {
        const status = getExpiryStatus(item.expiry_date);
        const isEmpty = Number(item.quantity ?? 0) === 0 && Number(item.weight ?? 0) === 0;

        const card = document.createElement("article");
        card.className = `inventory-item-card${isEmpty ? " is-empty" : ""}`;

        card.innerHTML = `
            <div class="inventory-item-main">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(formatAmount(item))}</p>
                </div>

                <div class="inventory-meta">
                    ${isEmpty ? `<span class="inventory-empty-badge">Leer</span>` : ""}
                    <span class="inventory-location">${escapeHtml(item.storage_location || "Kein Ort")}</span>
                    <span class="inventory-expiry ${status.className}">${escapeHtml(status.label)}</span>
                    <span class="inventory-date">${escapeHtml(formatDate(item.expiry_date))}</span>
                </div>

                ${item.notes ? `<p class="inventory-notes">${escapeHtml(item.notes)}</p>` : ""}
            </div>

            <div class="recipe-icons">
                <button type="button" onclick="adjustInventoryItem(${item.id})" title="Bestand anpassen" aria-label="Bestand anpassen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/><path d="M19 19H5"/></svg>
                </button>
                <button type="button" onclick="editInventoryItem(${item.id})" title="Bearbeiten" aria-label="Bearbeiten">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>
                </button>
                <button type="button" class="toolbar-delete-button" onclick="deleteInventoryItem(${item.id})" title="Löschen" aria-label="Löschen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>
                </button>
            </div>
        `;

        list.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();

    document.getElementById("inventory-search")?.addEventListener("input", renderInventoryList);

    [
        "adjust-inventory-action",
        "adjust-inventory-mode",
        "adjust-inventory-amount",
        "adjust-inventory-unit-weight",
        "adjust-inventory-weight-amount"
    ].forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener("input", id === "adjust-inventory-mode" ? updateAdjustmentMode : updateAdjustmentPreview);
        element.addEventListener("change", id === "adjust-inventory-mode" ? updateAdjustmentMode : updateAdjustmentPreview);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeInventoryEditModal();
            closeInventoryAdjustModal();
        }
    });
});
