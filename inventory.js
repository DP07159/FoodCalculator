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

function getInventoryPayload() {
    return {
        name: document.getElementById("inventory-name").value,
        quantity: document.getElementById("inventory-quantity").value,
        unit: document.getElementById("inventory-unit").value,
        weight: document.getElementById("inventory-weight").value,
        expiry_date: document.getElementById("inventory-expiry").value,
        storage_location: document.getElementById("inventory-location").value,
        notes: document.getElementById("inventory-notes").value
    };
}

async function saveInventoryItem() {
    const id = document.getElementById("inventory-id").value;
    const payload = getInventoryPayload();

    if (!payload.name.trim()) {
        showToast("Bitte eine Bezeichnung eingeben.");
        return;
    }

    try {
        if (id) {
            await apiFetch(`${API_URL}/inventory/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showToast("Eintrag aktualisiert.");
        } else {
            await apiFetch(`${API_URL}/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showToast("Eintrag gespeichert.");
        }

        resetInventoryForm();
        await loadInventory();
    } catch (error) {
        console.error(error);
        showToast("Eintrag konnte nicht gespeichert werden.");
    }
}

function editInventoryItem(id) {
    const item = inventoryItems.find(entry => String(entry.id) === String(id));
    if (!item) return;

    document.getElementById("inventory-id").value = item.id;
    document.getElementById("inventory-name").value = item.name || "";
    document.getElementById("inventory-quantity").value = item.quantity ?? "";
    document.getElementById("inventory-unit").value = item.unit || "";
    document.getElementById("inventory-weight").value = item.weight ?? "";
    document.getElementById("inventory-expiry").value = item.expiry_date || "";
    document.getElementById("inventory-location").value = item.storage_location || "";
    document.getElementById("inventory-notes").value = item.notes || "";

    window.scrollTo({ top: 0, behavior: "smooth" });
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
    document.getElementById("inventory-id").value = "";
    document.getElementById("inventory-form").reset();
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
                    <h3>${item.name}</h3>
                    <p>${formatAmount(item)}</p>
                </div>

                <div class="inventory-meta">
                    <span class="inventory-location">${item.storage_location || "Kein Ort"}</span>
                    <span class="inventory-expiry ${status.className}">${status.label}</span>
                    <span class="inventory-date">${formatDate(item.expiry_date)}</span>
                </div>

                ${item.notes ? `<p class="inventory-notes">${item.notes}</p>` : ""}
            </div>

            <div class="recipe-icons">
                <button type="button" onclick="editInventoryItem(${item.id})" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
                <button type="button" class="toolbar-delete-button" onclick="deleteInventoryItem(${item.id})" title="Löschen" aria-label="Löschen">🗑</button>
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
});