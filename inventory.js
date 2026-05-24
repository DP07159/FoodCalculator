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
        window.requestAnimationFrame(() => {
            document.getElementById("inventory-name")?.focus();
        });
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

    window.requestAnimationFrame(() => {
        document.getElementById("edit-inventory-name")?.focus();
    });
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

    if (diffDays < 0) {
        return { label: "Abgelaufen", className: "inventory-expired" };
    }

    if (diffDays <= 3) {
        return { label: "Läuft sehr bald ab", className: "inventory-critical" };
    }

    if (diffDays <= 7) {
        return { label: "Läuft bald ab", className: "inventory-warning" };
    }

    return { label: "Haltbar", className: "inventory-good" };
}

function formatAmount(item) {
    const quantity = item.quantity ?? "";
    const unit = item.unit || "";
    const weight = item.weight ?? "";

    const quantityText = quantity !== "" ? `${quantity} ${unit}`.trim() : "";
    const weightText = weight !== "" ? `${weight} g` : "";

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
        const searchable = [
            item.name,
            item.storage_location,
            item.notes,
            item.unit
        ].join(" ").toLowerCase();

        return searchable.includes(searchTerm);
    });

    if (filteredItems.length === 0) {
        list.innerHTML = `<p class="recipe-empty-state">Keine Lebensmittel im Inventar gefunden.</p>`;
        return;
    }

    list.innerHTML = "";

    filteredItems.forEach(item => {
        const status = getExpiryStatus(item.expiry_date);

        const card = document.createElement("article");
        card.className = "inventory-item-card";

        card.innerHTML = `
            <div class="inventory-item-main">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(formatAmount(item))}</p>
                </div>

                <div class="inventory-meta">
                    <span class="inventory-location">${escapeHtml(item.storage_location || "Kein Ort")}</span>
                    <span class="inventory-expiry ${status.className}">${escapeHtml(status.label)}</span>
                    <span class="inventory-date">${escapeHtml(formatDate(item.expiry_date))}</span>
                </div>

                ${item.notes ? `<p class="inventory-notes">${escapeHtml(item.notes)}</p>` : ""}
            </div>

            <div class="recipe-icons">
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

    const searchInput = document.getElementById("inventory-search");
    if (searchInput) {
        searchInput.addEventListener("input", renderInventoryList);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeInventoryEditModal();
        }
    });
});
