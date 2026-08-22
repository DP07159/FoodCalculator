const API_URL = "https://foodcalculator-server.onrender.com";
let walletItems = [];

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

function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
}

function platformLabel(platform) {
    const labels = {
        instagram: "Instagram",
        tiktok: "TikTok",
        pinterest: "Pinterest",
        youtube: "YouTube",
        website: "Web"
    };
    return labels[platform] || "Inspiration";
}

function platformIcon(platform) {
    const icons = { instagram: "◎", tiktok: "♪", pinterest: "P", youtube: "▶", website: "↗" };
    return icons[platform] || "✦";
}

function renderWallet() {
    const list = document.getElementById("wallet-list");
    if (!list) return;
    const query = (document.getElementById("wallet-search")?.value || "").trim().toLowerCase();
    const visible = walletItems.filter(item => [item.title, item.note, item.source_platform]
        .join(" ").toLowerCase().includes(query));

    if (!visible.length) {
        list.innerHTML = `<div class="wallet-empty-state">${query ? "Keine passende Inspiration gefunden." : "Noch nichts gespeichert. Der nächste gute Food-Post darf hier landen."}</div>`;
        return;
    }

    list.innerHTML = visible.map(item => `
        <article class="wallet-item-card">
            <div class="wallet-item-source">
                <span class="wallet-source-icon">${platformIcon(item.source_platform)}</span>
                <span>${platformLabel(item.source_platform)}</span>
            </div>
            <div class="wallet-item-body">
                <h3>${escapeHtml(item.title)}</h3>
                ${item.note ? `<p>${escapeHtml(item.note)}</p>` : `<p class="wallet-item-note-muted">Noch ohne Notiz gespeichert.</p>`}
            </div>
            <div class="wallet-item-actions">
                <a class="wallet-primary-action" href="/index.html?walletItem=${item.id}">Zum Food Moment machen</a>
                ${item.source_url ? `<a class="wallet-secondary-action" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>` : ""}
                <button type="button" class="wallet-delete-action" onclick="deleteWalletItem(${item.id})" aria-label="Wallet-Eintrag löschen">🗑</button>
            </div>
        </article>
    `).join("");
}

async function loadWallet() {
    try {
        walletItems = await apiFetch(`${API_URL}/wallet`);
        renderWallet();
    } catch (error) {
        console.error(error);
        showToast("Wallet konnte nicht geladen werden.");
    }
}

async function saveWalletItem(event) {
    event.preventDefault();
    const source_url = document.getElementById("wallet-url")?.value.trim() || "";
    const title = document.getElementById("wallet-title")?.value.trim() || "";
    const note = document.getElementById("wallet-note")?.value.trim() || "";
    if (!source_url && !title) {
        showToast("Bitte Link oder Titel angeben.");
        return;
    }
    try {
        const created = await apiFetch(`${API_URL}/wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_url, title, note })
        });
        walletItems.unshift(created);
        document.getElementById("wallet-form")?.reset();
        renderWallet();
        showToast("Inspiration gespeichert.");
    } catch (error) {
        console.error(error);
        showToast("Inspiration konnte nicht gespeichert werden.");
    }
}

window.deleteWalletItem = async function(id) {
    if (!confirm("Diese Inspiration wirklich aus der Wallet löschen?")) return;
    try {
        await apiFetch(`${API_URL}/wallet/${id}`, { method: "DELETE" });
        walletItems = walletItems.filter(item => String(item.id) !== String(id));
        renderWallet();
        showToast("Inspiration gelöscht.");
    } catch (error) {
        console.error(error);
        showToast("Inspiration konnte nicht gelöscht werden.");
    }
};

function hydrateShareTarget() {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url") || "";
    const sharedText = params.get("text") || "";
    const sharedTitle = params.get("title") || "";
    const urlFromText = sharedText.match(/https?:\/\/\S+/)?.[0] || "";
    const resolvedUrl = sharedUrl || urlFromText;
    if (resolvedUrl) document.getElementById("wallet-url").value = resolvedUrl;
    if (sharedTitle) document.getElementById("wallet-title").value = sharedTitle;
    const noteText = sharedText.replace(resolvedUrl, "").trim();
    if (noteText) document.getElementById("wallet-note").value = noteText;
}

document.addEventListener("DOMContentLoaded", async () => {
    initBurgerMenu();
    hydrateShareTarget();
    document.getElementById("wallet-form")?.addEventListener("submit", saveWalletItem);
    document.getElementById("wallet-search")?.addEventListener("input", renderWallet);
    await loadWallet();
});
