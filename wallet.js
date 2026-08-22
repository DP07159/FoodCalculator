const WalletPage = (() => {
    const state = { status: "saved", items: [] };

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }

    function formatPlatform(value) {
        if (!value) return "Eigene Notiz";
        const labels = {
            instagram: "Instagram",
            tiktok: "TikTok",
            youtube: "YouTube",
            pinterest: "Pinterest"
        };
        return labels[value] || value.replace(/^www\./, "");
    }

    function formatSavedAt(value) {
        if (!value) return "";
        const parsed = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
        if (Number.isNaN(parsed.getTime())) return "";
        return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(parsed);
    }

    function showToast(message) {
        const toast = document.getElementById("app-toast");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove("is-hidden");
        toast.classList.add("is-visible");
        window.setTimeout(() => {
            toast.classList.remove("is-visible");
            toast.classList.add("is-hidden");
        }, 2400);
    }

    async function api(path = "", options = {}) {
        const headers = new Headers(options.headers || {});
        if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        const response = await AuthShell.request(`/wallet${path}`, { ...options, headers });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Wallet-Aktion fehlgeschlagen.");
        return payload;
    }

    function renderEmpty() {
        const label = state.status === "saved" ? "Noch nichts gemerkt." : "Hier gibt es noch keine Einträge.";
        return `<div class="wallet-empty-state"><strong>${label}</strong><p>Speichere oben einen Link oder eine Idee. Die Wallet bleibt bewusst ein ruhiger Eingangskorb.</p></div>`;
    }

    function renderItem(item) {
        const title = item.title || formatPlatform(item.source_platform) || "Gespeicherte Inspiration";
        const platform = formatPlatform(item.source_platform);
        const date = formatSavedAt(item.saved_at);
        const source = item.source_url
            ? `<a class="wallet-source-link" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>`
            : "";
        const markAction = item.status === "saved"
            ? `<button type="button" class="wallet-text-action" data-wallet-action="used" data-wallet-id="${escapeHtml(item.public_id)}">Als verwendet markieren</button>`
            : `<button type="button" class="wallet-text-action" data-wallet-action="saved" data-wallet-id="${escapeHtml(item.public_id)}">Wieder merken</button>`;

        return `<article class="wallet-item" data-wallet-item="${escapeHtml(item.public_id)}">
            <div class="wallet-item-main">
                <div class="wallet-item-meta"><span>${escapeHtml(platform)}</span>${date ? `<span>${escapeHtml(date)}</span>` : ""}</div>
                <h3>${escapeHtml(title)}</h3>
                ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
                <div class="wallet-item-actions">
                    ${source}
                    ${markAction}
                    <button type="button" class="wallet-text-action" data-wallet-action="archive" data-wallet-id="${escapeHtml(item.public_id)}">Archivieren</button>
                </div>
            </div>
            <div class="wallet-item-next" aria-label="Spätere Weiterverwendung">
                <span>Als Nächstes</span>
                <small>Rezept · Food Moment · Planung</small>
            </div>
        </article>`;
    }

    function render() {
        const list = document.getElementById("wallet-list");
        if (!list) return;
        list.innerHTML = state.items.length ? state.items.map(renderItem).join("") : renderEmpty();
    }

    async function load() {
        const list = document.getElementById("wallet-list");
        if (list) list.innerHTML = '<div class="wallet-loading">Wallet wird geladen …</div>';
        try {
            state.items = await api(`?status=${encodeURIComponent(state.status)}`);
            render();
        } catch (error) {
            if (list) list.innerHTML = `<div class="wallet-empty-state is-error"><strong>Wallet konnte nicht geladen werden.</strong><p>${escapeHtml(error.message)}</p></div>`;
        }
    }

    async function save(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const feedback = document.getElementById("wallet-form-feedback");
        const button = form.querySelector('button[type="submit"]');
        const payload = {
            source_url: form.elements.source_url.value,
            title: form.elements.title.value,
            note: form.elements.note.value
        };
        try {
            button.disabled = true;
            if (feedback) feedback.textContent = "";
            await api("", { method: "POST", body: JSON.stringify(payload) });
            form.reset();
            state.status = "saved";
            document.getElementById("wallet-status-select").value = "saved";
            await load();
            showToast("Inspiration gespeichert");
        } catch (error) {
            if (feedback) feedback.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    }

    async function updateStatus(publicId, status) {
        try {
            await api(`/${encodeURIComponent(publicId)}`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
            await load();
            showToast(status === "archived" ? "Archiviert" : "Wallet aktualisiert");
        } catch (error) {
            showToast(error.message);
        }
    }

    function bind() {
        document.getElementById("wallet-capture-form")?.addEventListener("submit", save);
        document.getElementById("wallet-status-select")?.addEventListener("change", event => {
            state.status = event.target.value;
            load();
        });
        document.getElementById("wallet-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-wallet-action]");
            if (!button) return;
            const action = button.dataset.walletAction;
            const status = action === "archive" ? "archived" : action;
            updateStatus(button.dataset.walletId, status);
        });

        const params = new URLSearchParams(window.location.search);
        const sharedTitle = params.get("title") || "";
        const sharedText = params.get("text") || "";
        let sharedUrl = params.get("url") || "";
        if (!sharedUrl && sharedText) {
            const urlMatch = sharedText.match(/https?:\/\/\S+/i);
            if (urlMatch) sharedUrl = urlMatch[0].replace(/[),.;]+$/, "");
        }
        const noteText = sharedUrl ? sharedText.replace(sharedUrl, "").trim() : sharedText.trim();
        if (sharedUrl) document.getElementById("wallet-source-url").value = sharedUrl;
        if (sharedTitle) document.getElementById("wallet-title").value = sharedTitle;
        if (noteText) document.getElementById("wallet-note").value = noteText;
        if (params.get("capture") === "1" || sharedUrl || sharedTitle || sharedText) {
            window.setTimeout(() => (sharedUrl ? document.getElementById("wallet-title") : document.getElementById("wallet-source-url"))?.focus(), 0);
        }
    }

    function init() {
        bind();
        load();
    }

    return { init };
})();

document.addEventListener("auth:ready", WalletPage.init, { once: true });
