const API_URL = "https://foodcalculator-server.onrender.com";
const WORKSPACE_ID = "personal";
const WEEK_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEAL_ROWS = [
    { key: "breakfast", label: "Frühstück" },
    { key: "lunch", label: "Mittagessen" },
    { key: "dinner", label: "Abendessen" },
    { key: "snack", label: "Snack" }
];

let walletItems = [];
let mealPlans = [];
let pendingPlanWalletItemId = null;

function showToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2600);
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}

function platformLabel(platform) {
    return ({ instagram: "Instagram", tiktok: "TikTok", pinterest: "Pinterest", youtube: "YouTube", website: "Web" })[platform] || "Web";
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function renderWallet() {
    const container = document.getElementById("wallet-list");
    const term = (document.getElementById("wallet-search")?.value || "").trim().toLowerCase();
    const visible = walletItems.filter(item => [item.title, item.note, item.source_platform].join(" ").toLowerCase().includes(term));

    if (!visible.length) {
        container.innerHTML = `<div class="wallet-empty-state"><strong>${term ? "Nichts gefunden." : "Noch nichts gespeichert."}</strong><span>${term ? "Versuche einen anderen Suchbegriff." : "Deine nächste Food-Idee kann hier anfangen."}</span></div>`;
        return;
    }

    container.innerHTML = visible.map(item => `
        <article class="wallet-item-card">
            <div class="wallet-item-meta">
                <span class="wallet-source-badge">${escapeHtml(platformLabel(item.source_platform))}</span>
                <span>${escapeHtml(formatDate(item.created_at))}</span>
            </div>
            <div class="wallet-item-body">
                <h3>${escapeHtml(item.title)}</h3>
                ${item.note ? `<p>${escapeHtml(item.note)}</p>` : `<p class="wallet-item-note-empty">Inspiration für später</p>`}
            </div>
            <div class="wallet-item-actions">
                <a class="wallet-link-button" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>
                <button type="button" class="wallet-moment-button" data-plan-item="${item.id}">Zum Wochenplan</button>
                <button type="button" class="wallet-icon-button" data-delete-item="${item.id}" aria-label="Wallet-Eintrag löschen" title="Löschen">×</button>
            </div>
        </article>
    `).join("");

    container.querySelectorAll("[data-plan-item]").forEach(button => {
        button.addEventListener("click", () => openPlanDialog(Number(button.dataset.planItem)));
    });
    container.querySelectorAll("[data-delete-item]").forEach(button => {
        button.addEventListener("click", () => deleteWalletItem(Number(button.dataset.deleteItem)));
    });
}

async function loadWallet() {
    walletItems = await apiFetch(`${API_URL}/wallet?workspace_id=${encodeURIComponent(WORKSPACE_ID)}`);
    renderWallet();
}

async function loadMealPlans() {
    mealPlans = await apiFetch(`${API_URL}/meal_plans`);
}

async function saveWalletItem(event) {
    event.preventDefault();
    const url = document.getElementById("wallet-url").value.trim();
    const title = document.getElementById("wallet-title").value.trim();
    const note = document.getElementById("wallet-note").value.trim();

    try {
        const created = await apiFetch(`${API_URL}/wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_url: url, title, note, workspace_id: WORKSPACE_ID })
        });
        walletItems.unshift(created);
        document.getElementById("wallet-form").reset();
        renderWallet();
        showToast("Inspiration gespeichert.");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Inspiration konnte nicht gespeichert werden.");
    }
}

async function deleteWalletItem(id) {
    if (!confirm("Diesen Wallet-Eintrag wirklich entfernen?")) return;
    try {
        await apiFetch(`${API_URL}/wallet/${id}`, { method: "DELETE" });
        walletItems = walletItems.filter(item => item.id !== id);
        renderWallet();
        showToast("Aus Wallet entfernt.");
    } catch (error) {
        console.error(error);
        showToast("Eintrag konnte nicht entfernt werden.");
    }
}

function populateDialogFields() {
    const planSelect = document.getElementById("wallet-plan-select");
    const daySelect = document.getElementById("wallet-plan-day");
    const mealSelect = document.getElementById("wallet-plan-meal");
    planSelect.innerHTML = mealPlans.length
        ? mealPlans.map(plan => `<option value="${plan.id}">${escapeHtml(plan.name)}</option>`).join("")
        : `<option value="">Noch kein Wochenplan vorhanden</option>`;
    daySelect.innerHTML = WEEK_DAYS.map(day => `<option value="${day}">${day}</option>`).join("");
    mealSelect.innerHTML = MEAL_ROWS.map(meal => `<option value="${meal.key}">${meal.label}</option>`).join("");
}

function openPlanDialog(itemId) {
    pendingPlanWalletItemId = itemId;
    const item = walletItems.find(entry => entry.id === itemId);
    document.getElementById("wallet-plan-item-name").textContent = item?.title || "";
    populateDialogFields();
    const dialog = document.getElementById("wallet-plan-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
}

async function addWalletItemToPlan() {
    const planId = document.getElementById("wallet-plan-select").value;
    const day = document.getElementById("wallet-plan-day").value;
    const mealType = document.getElementById("wallet-plan-meal").value;
    if (!planId) {
        showToast("Bitte zuerst einen Wochenplan anlegen.");
        return;
    }

    try {
        const plan = await apiFetch(`${API_URL}/meal_plans/${planId}`);
        const data = Array.isArray(plan.data) ? [...plan.data] : [];
        const existingIndex = data.findIndex(entry => entry.day === day && entry.mealType === mealType);
        const replacement = { day, mealType, sourceType: "wallet", sourceId: String(pendingPlanWalletItemId) };
        if (existingIndex >= 0) data[existingIndex] = replacement;
        else data.push(replacement);

        await apiFetch(`${API_URL}/meal_plans/${planId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: plan.name, data })
        });
        document.getElementById("wallet-plan-dialog").close();
        showToast(`Als Food Moment für ${day} eingeplant.`);
    } catch (error) {
        console.error(error);
        showToast("Food Moment konnte nicht eingeplant werden.");
    }
}

function applyShareParams() {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("url") || "";
    const text = params.get("text") || "";
    const title = params.get("title") || "";
    if (!url && !text && !title) return;

    const urlMatch = (url || text).match(/https?:\/\/\S+/);
    document.getElementById("wallet-url").value = url || urlMatch?.[0] || "";
    document.getElementById("wallet-title").value = title || "Neue Inspiration";
    if (text && text !== urlMatch?.[0]) document.getElementById("wallet-note").value = text.replace(urlMatch?.[0] || "", "").trim();
    history.replaceState({}, "", "/wallet.html");
}

document.addEventListener("DOMContentLoaded", async () => {
    initBurgerMenu();
    applyShareParams();
    document.getElementById("wallet-form").addEventListener("submit", saveWalletItem);
    document.getElementById("wallet-search").addEventListener("input", renderWallet);
    document.getElementById("wallet-plan-submit").addEventListener("click", addWalletItemToPlan);
    try {
        await Promise.all([loadWallet(), loadMealPlans()]);
    } catch (error) {
        console.error(error);
        showToast("Wallet konnte nicht vollständig geladen werden.");
    }
});
