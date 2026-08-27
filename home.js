function escapeHomeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

const HOME_PRIMARY_ACTIONS = [
    {
        code: "now",
        label: "Jetzt etwas",
        description: "Finde etwas Passendes für jetzt.",
        href: "/recipes.html",
        capability: "recipes",
        icon: "recipes"
    },
    {
        code: "use-what-is-there",
        label: "Was da ist",
        description: "Mach etwas aus dem, was du schon hast.",
        href: "/inventory.html",
        capability: "inventory",
        icon: "inventory"
    },
    {
        code: "inspiration",
        label: "Inspiration",
        description: "Stöbere durch Ideen für deinen Moment.",
        href: "/wallet.html",
        capability: "wallet",
        icon: "wallet"
    },
    {
        code: "plan",
        label: "Planen",
        description: "Für später, heute Abend oder die nächsten Tage.",
        href: "/mealPlan.html",
        capability: "meal_plan",
        icon: "calendar"
    }
];

const HOME_SECONDARY_ACTIONS = [
    {
        code: "search-recipe",
        label: "Rezept suchen",
        href: "/recipes.html",
        capability: "recipes",
        icon: "recipes"
    },
    {
        code: "capture-new",
        label: "Etwas Neues festhalten",
        action: "capture",
        capabilities: ["recipes", "wallet"],
        icon: "plus"
    }
];

function capabilityAvailable(capability) {
    return window.PlatformNavigation?.isCapabilityAvailable?.(capability) !== false;
}

function actionAvailable(action) {
    if (action.capability) return capabilityAvailable(action.capability);
    if (Array.isArray(action.capabilities)) return action.capabilities.some(capabilityAvailable);
    return true;
}

function iconMarkup(name) {
    return window.PlatformNavigation?.iconMarkup?.(name || "home") || "";
}

function renderPrimaryActions() {
    const container = document.getElementById("food-moment-primary-actions");
    if (!container) return;

    const actions = HOME_PRIMARY_ACTIONS.filter(actionAvailable);
    container.innerHTML = actions.map((action, index) => `
        <a class="food-moment-entry food-moment-entry-${escapeHomeHtml(action.code)}" href="${escapeHomeHtml(action.href)}" data-nav-capability="${escapeHomeHtml(action.capability)}">
            <span class="food-moment-entry-number" aria-hidden="true">0${index + 1}</span>
            <span class="food-moment-entry-copy">
                <strong>${escapeHomeHtml(action.label)}</strong>
                <small>${escapeHomeHtml(action.description)}</small>
            </span>
            <span class="food-moment-entry-icon">${iconMarkup(action.icon)}</span>
            <svg class="fc-icon food-moment-entry-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </a>
    `).join("");
}

function renderSecondaryActions() {
    const container = document.getElementById("food-moment-secondary-actions");
    if (!container) return;

    const actions = HOME_SECONDARY_ACTIONS.filter(actionAvailable);
    container.innerHTML = actions.map(action => {
        const content = `<span class="food-moment-secondary-icon">${iconMarkup(action.icon)}</span><span>${escapeHomeHtml(action.label)}</span>`;
        if (action.action === "capture") {
            return `<button class="food-moment-secondary-action" type="button" data-home-action="capture">${content}</button>`;
        }
        return `<a class="food-moment-secondary-action" href="${escapeHomeHtml(action.href)}" data-nav-capability="${escapeHomeHtml(action.capability)}">${content}</a>`;
    }).join("");
}

function renderFoodWorld() {
    const container = document.getElementById("food-world-links");
    const section = document.getElementById("food-world-section");
    if (!container || !section) return;

    const state = window.PlatformNavigation?.getState?.();
    const links = (state?.links || [])
        .filter(link => link.primary && link.capability !== "home" && capabilityAvailable(link.capability))
        .sort((a, b) => Number(a.order ?? 100) - Number(b.order ?? 100));

    section.hidden = links.length === 0;
    container.innerHTML = links.map(link => `
        <a class="food-world-link" href="${escapeHomeHtml(link.href)}" data-nav-capability="${escapeHomeHtml(link.capability)}">
            <span class="food-world-link-icon">${iconMarkup(link.icon)}</span>
            <span>${escapeHomeHtml(link.label)}</span>
            <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </a>
    `).join("");
}

function captureOptions() {
    const options = [];
    if (capabilityAvailable("recipes")) {
        options.push({
            label: "Rezept",
            description: "Ein eigenes Rezept anlegen.",
            href: "/recipeCreate.html",
            capability: "recipes",
            icon: "recipes"
        });
    }
    if (capabilityAvailable("wallet")) {
        options.push({
            label: "Inspiration",
            description: "Link, Idee, Restaurant, Video oder Fundstück speichern.",
            href: "/wallet.html?capture=1",
            capability: "wallet",
            icon: "wallet"
        });
    }
    return options;
}

function renderCaptureDialog() {
    const container = document.getElementById("capture-choice-options");
    if (!container) return;
    container.innerHTML = captureOptions().map(option => `
        <a class="capture-choice-option" href="${escapeHomeHtml(option.href)}" data-nav-capability="${escapeHomeHtml(option.capability)}">
            <span class="capture-choice-icon">${iconMarkup(option.icon)}</span>
            <span class="capture-choice-copy"><strong>${escapeHomeHtml(option.label)}</strong><small>${escapeHomeHtml(option.description)}</small></span>
            <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </a>
    `).join("");
}

function openCaptureDialog() {
    const dialog = document.getElementById("capture-choice-dialog");
    renderCaptureDialog();
    if (!dialog || !captureOptions().length) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
}

function closeCaptureDialog() {
    const dialog = document.getElementById("capture-choice-dialog");
    if (dialog?.open) dialog.close();
}


function applySourceContext() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("wallet_intent") || "";
    const walletId = params.get("wallet_id") || "";
    const container = document.getElementById("food-moment-source-context");
    if (!container || !title) return;

    if (walletId) sessionStorage.setItem("fc_wallet_source_id", walletId);
    sessionStorage.setItem("fc_food_moment_source_title", title);
    container.hidden = false;
    container.innerHTML = `
        <span class="food-moment-source-icon">${iconMarkup("wallet")}</span>
        <span><small>Aus deiner Wallet</small><strong>${escapeHomeHtml(title)}</strong></span>
    `;
}

function renderHome() {
    renderPrimaryActions();
    renderSecondaryActions();
    renderFoodWorld();
    renderCaptureDialog();
    applySourceContext();
}

document.addEventListener("click", event => {
    const captureButton = event.target.closest('[data-home-action="capture"]');
    if (captureButton) {
        event.preventDefault();
        openCaptureDialog();
    }
});

document.getElementById("capture-choice-close")?.addEventListener("click", closeCaptureDialog);
document.getElementById("capture-choice-dialog")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeCaptureDialog();
});

document.addEventListener("platform:navigation-ready", renderHome);
document.addEventListener("auth:ready", () => {
    if (window.PlatformNavigation?.getState?.()?.loaded) renderHome();
});
