function escapeHomeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

const HOME_PRIMARY_ACTIONS = [
    { code: "today", label: "Was koche ich heute?", description: "Schau in deine Rezepte und finde etwas für heute.", href: "/recipes.html", capability: "recipes", icon: "recipes" },
    { code: "visitors", label: "Besuch kommt", description: "Halte den Anlass fest – Details dürfen später kommen.", href: "/foodMomentCreate.html?intent=visitors", capability: "food_moments", icon: "moment" },
    { code: "capture", label: "Etwas festhalten", description: "Rezept oder Inspiration sichern, bevor sie verloren geht.", action: "capture", capabilities: ["recipes", "wallet"], icon: "plus" },
    { code: "plan-week", label: "Was steht diese Woche an?", description: "Plane deine Food Moments für die nächsten Tage.", href: "/mealPlan.html", capability: "meal_plan", icon: "calendar" },
    { code: "shopping", label: "Was muss ich einkaufen?", description: "Öffne die gemeinsame Liste für deinen Workspace.", href: "/shopping.html", capability: "shopping", icon: "shopping" },
    { code: "no-idea", label: "Keine Idee", description: "Stöbere in deinen Rezepten und Inspirationen.", href: "/wallet.html", capability: "wallet", icon: "wallet" }
];

const HOME_SECONDARY_ACTIONS = [
    {
        code: "create-food-moment",
        label: "Food Moment erstellen",
        href: "/foodMomentCreate.html",
        capability: "food_moments",
        icon: "moment"
    },
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
    container.innerHTML = actions.map((action, index) => {
        const inner = `<span class="food-moment-entry-number" aria-hidden="true">0${index + 1}</span><span class="food-moment-entry-copy"><strong>${escapeHomeHtml(action.label)}</strong><small>${escapeHomeHtml(action.description)}</small></span><span class="food-moment-entry-icon">${iconMarkup(action.icon)}</span><svg class="fc-icon food-moment-entry-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
        if (action.action === "capture") return `<button class="food-moment-entry food-moment-entry-${escapeHomeHtml(action.code)}" type="button" data-home-action="capture">${inner}</button>`;
        return `<a class="food-moment-entry food-moment-entry-${escapeHomeHtml(action.code)}" href="${escapeHomeHtml(action.href)}" data-nav-capability="${escapeHomeHtml(action.capability||'')}">${inner}</a>`;
    }).join("");
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
    renderUpcomingMoments();
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


function homeTodayKey() {
    return ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][new Date().getDay()];
}
function homeDateValue(dateString) {
    if (!dateString) return Number.MAX_SAFE_INTEGER;
    const d = new Date(`${dateString}T12:00:00`);
    return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
}
function upcomingMomentLabel(item) {
    if (item.source === "plan") return `Heute · ${item.mealLabel}`;
    if (!item.moment_date) return "Ohne Datum";
    const d = new Date(`${item.moment_date}T12:00:00`);
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    const diff = Math.round((target-today)/86400000);
    if (diff === 0) return `Heute${item.moment_time ? ` · ${item.moment_time} Uhr` : ""}`;
    if (diff === 1) return `Morgen${item.moment_time ? ` · ${item.moment_time} Uhr` : ""}`;
    return `${d.toLocaleDateString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit" })}${item.moment_time ? ` · ${item.moment_time} Uhr` : ""}`;
}
async function renderUpcomingMoments() {
    const section = document.getElementById("home-upcoming-section");
    const list = document.getElementById("home-upcoming-list");
    if (!section || !list || !capabilityAvailable("food_moments")) return;
    try {
        const response = await AuthShell.request("/food-moments");
        const moments = response.ok ? await response.json() : [];
        const today = new Date(); today.setHours(0,0,0,0);
        const dated = (Array.isArray(moments) ? moments : [])
            .filter(m => m.moment_date && homeDateValue(m.moment_date) >= today.getTime())
            .map(m => ({...m, source:"moment"}));
        // Paket 2: konkrete Planung ist bereits als Food Moment in `dated` enthalten.
        const open = (Array.isArray(moments) ? moments : []).filter(m => !m.moment_date).slice(0,2).map(m => ({...m, source:"moment"}));
        const items = [...dated.sort((a,b)=>homeDateValue(a.moment_date)-homeDateValue(b.moment_date)).slice(0,4), ...open].slice(0,5);
        section.hidden = items.length === 0;
        list.innerHTML = items.map(item => `<a class="home-upcoming-item ${item.moment_date?'':'is-open'}" href="${escapeHomeHtml(item.href || `/foodMoment.html?id=${encodeURIComponent(item.public_id)}`)}"><span class="home-upcoming-when">${escapeHomeHtml(upcomingMomentLabel(item))}</span><span class="home-upcoming-copy"><strong>${escapeHomeHtml(item.title)}</strong><small>${escapeHomeHtml(item.detail || item.recipes?.[0]?.name || item.inspirations?.[0]?.title || (item.moment_date?"Food Moment":"Kann später weitergedacht werden"))}</small></span><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></a>`).join("");
    } catch (_) { section.hidden = true; }
}
