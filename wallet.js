const API_URL = "https://foodcalculator-server.onrender.com";
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEALS = [
    ["breakfast", "Frühstück"], ["lunch", "Mittagessen"], ["dinner", "Abendessen"], ["snack", "Snack"]
];
let walletItems = [];
let mealPlans = [];
let activeWalletItemId = null;

function showToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2600);
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}

function platformLabel(platform) {
    return ({ instagram: "Instagram", tiktok: "TikTok", pinterest: "Pinterest", youtube: "YouTube", website: "Website", manual: "Notiz" })[platform] || platform;
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

async function loadWallet() {
    walletItems = await apiFetch(`${API_URL}/wallet`);
    renderWallet();
}

async function loadPlans() {
    mealPlans = await apiFetch(`${API_URL}/meal_plans`);
}

function renderWallet() {
    const list = document.getElementById("wallet-list");
    const q = (document.getElementById("wallet-search")?.value || "").toLowerCase().trim();
    const items = walletItems.filter(item => [item.title, item.note, item.source_platform].join(" ").toLowerCase().includes(q));
    if (!items.length) {
        list.innerHTML = `<div class="section-card wallet-empty">Noch keine Inspiration gespeichert.</div>`;
        return;
    }
    list.innerHTML = items.map(item => `
        <article class="wallet-card" id="item-${item.id}">
            <div class="wallet-card-topline">
                <span class="wallet-source-badge">${escapeHtml(platformLabel(item.source_platform))}</span>
                <button class="wallet-delete-button" type="button" onclick="deleteWalletItem(${item.id})" aria-label="Löschen">×</button>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            <div class="wallet-card-actions">
                ${item.source_url ? `<a class="wallet-link-button" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">Quelle öffnen ↗</a>` : ""}
                <button type="button" onclick="openPlanDialog(${item.id})">＋ Food Moment</button>
            </div>
        </article>`).join("");
}

async function saveWalletItem(event) {
    event.preventDefault();
    const title = document.getElementById("wallet-title").value.trim();
    const source_url = document.getElementById("wallet-url").value.trim();
    const note = document.getElementById("wallet-note").value.trim();
    if (!source_url && !title && !note) return showToast("Bitte Link oder Inspiration eingeben.");
    await apiFetch(`${API_URL}/wallet`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, source_url, note })
    });
    event.target.reset();
    await loadWallet();
    showToast("Inspiration in der Wallet gespeichert.");
}

window.deleteWalletItem = async function(id) {
    if (!confirm("Diesen Wallet-Eintrag löschen?")) return;
    await apiFetch(`${API_URL}/wallet/${id}`, { method: "DELETE" });
    await loadWallet();
    showToast("Wallet-Eintrag gelöscht.");
};

window.openPlanDialog = async function(id) {
    activeWalletItemId = id;
    if (!mealPlans.length) await loadPlans();
    const item = walletItems.find(entry => entry.id === id);
    document.getElementById("wallet-plan-title").textContent = item?.title || "Zum Wochenplan hinzufügen";
    const planSelect = document.getElementById("wallet-plan-select");
    planSelect.innerHTML = mealPlans.length
        ? mealPlans.map(plan => `<option value="${plan.id}">${escapeHtml(plan.name)}</option>`).join("")
        : `<option value="">Kein Wochenplan vorhanden</option>`;
    document.getElementById("wallet-plan-dialog").showModal();
};

async function planWalletItem() {
    const planId = document.getElementById("wallet-plan-select").value;
    const day = document.getElementById("wallet-day-select").value;
    const mealType = document.getElementById("wallet-meal-select").value;
    if (!planId) return showToast("Bitte zuerst einen Wochenplan anlegen.");
    const plan = await apiFetch(`${API_URL}/meal_plans/${planId}`);
    const data = Array.isArray(plan.data) ? [...plan.data] : [];
    const existingIndex = data.findIndex(entry => entry.day === day && entry.mealType === mealType);
    const entry = { day, mealType, sourceType: "wallet", sourceId: String(activeWalletItemId), recipeId: "" };
    if (existingIndex >= 0) data[existingIndex] = entry; else data.push(entry);
    await apiFetch(`${API_URL}/meal_plans/${planId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: plan.name, data })
    });
    document.getElementById("wallet-plan-dialog").close();
    showToast("Food Moment im Wochenplan geplant.");
}

function importSharedData() {
    const params = new URLSearchParams(location.search);
    const sharedUrl = params.get("url") || "";
    const sharedText = params.get("text") || "";
    const sharedTitle = params.get("title") || "";
    if (sharedUrl) document.getElementById("wallet-url").value = sharedUrl;
    if (sharedTitle) document.getElementById("wallet-title").value = sharedTitle;
    if (sharedText && !sharedUrl) {
        const match = sharedText.match(/https?:\/\/\S+/);
        if (match) document.getElementById("wallet-url").value = match[0];
        else document.getElementById("wallet-note").value = sharedText;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    initBurgerMenu();
    DAYS.forEach(day => document.getElementById("wallet-day-select").add(new Option(day, day)));
    MEALS.forEach(([value, label]) => document.getElementById("wallet-meal-select").add(new Option(label, value)));
    document.getElementById("wallet-form").addEventListener("submit", saveWalletItem);
    document.getElementById("wallet-search").addEventListener("input", renderWallet);
    document.getElementById("wallet-plan-confirm").addEventListener("click", planWalletItem);
    importSharedData();
    await Promise.all([loadWallet(), loadPlans()]);
});
