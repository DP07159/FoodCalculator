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
    { code: "no-idea", label: "Keine Idee", description: "Stöbere in Rezepten oder Inspirationen.", action: "ideas", capabilities: ["recipes", "wallet"], icon: "sparkles" }
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

function homeScribbleMarkup(code) {
    const common = `class="food-moment-scribble" viewBox="0 0 160 120" aria-hidden="true"`;
    const art = {
        today: `<svg ${common}><path d="M42 72c8 17 29 25 50 17 11-4 18-11 22-20H38c1 1 2 2 4 3Z"/><path d="M48 60c7-18 18-30 28-35M72 58c4-20 15-35 26-43M91 60c8-15 19-23 31-27"/><path d="M59 43c-8-1-14 2-18 9 9 1 15-2 18-9Zm33-18c-7 0-12 3-15 9 8 0 13-3 15-9Zm24 17c-7-1-13 2-17 8 8 1 14-2 17-8Z"/><path d="M39 69h78"/></svg>`,
        visitors: `<svg ${common}><path d="M28 81c18-11 34-15 52-14 20 1 36 7 53 17"/><ellipse cx="55" cy="64" rx="23" ry="8"/><path d="M78 64h34M95 64v24M85 88h20"/><path d="M38 25c0 17 5 27 14 31M66 25c0 17-5 27-14 31M36 25h32"/><path d="M106 28c0 14 4 23 12 28M130 28c0 14-4 23-12 28M105 28h26"/><path d="M52 56v16M118 56v16"/></svg>`,
        capture: `<svg ${common}><path d="M42 22h66c6 0 10 4 10 10v65c0 5-4 8-9 8H48c-5 0-8-3-8-8V30c0-4 1-6 2-8Z"/><path d="M53 22v83M66 41h39M66 56h32M66 71h36"/><path d="M88 81l8 8 17-20"/><path d="M36 28c-8 5-10 14-7 26"/></svg>`,
        'plan-week': `<svg ${common}><rect x="30" y="26" width="101" height="74" rx="10"/><path d="M30 48h101M52 20v13M108 20v13M50 61h12M73 61h12M96 61h12M50 78h12M73 78h12M96 78h12"/><path d="M114 78l7 7 12-17"/></svg>`,
        shopping: `<svg ${common}><path d="M37 49h86l-9 46H48Z"/><path d="M57 50c3-18 12-28 24-28s21 10 24 28"/><path d="M62 62v20M80 62v20M98 62v20"/><path d="M43 52c-7 3-11 8-14 15M116 52c8 2 13 7 17 14"/></svg>`,
        'no-idea': `<svg ${common}><path d="M80 18c-20 0-35 14-35 32 0 13 7 22 17 29 6 4 8 10 8 16h20c0-7 3-12 9-17 9-7 16-15 16-28 0-18-15-32-35-32Z"/><path d="M69 101h22M71 109h18M65 51c8-8 21-8 30 0M80 37v20"/><path d="M30 35l-12-8M128 35l12-8M27 62H12M133 62h15"/></svg>`
    };
    return `<span class="food-moment-entry-visual" aria-hidden="true">${art[code] || art['no-idea']}</span>`;
}

function renderPrimaryActions() {
    const container = document.getElementById("food-moment-primary-actions");
    if (!container) return;

    const actions = HOME_PRIMARY_ACTIONS.filter(actionAvailable);
    container.innerHTML = actions.map((action, index) => {
        const inner = `<span class="food-moment-entry-copy"><strong>${escapeHomeHtml(action.label)}</strong><small>${escapeHomeHtml(action.description)}</small></span><span class="food-moment-entry-icon">${iconMarkup(action.icon)}</span>${homeScribbleMarkup(action.code)}<span class="food-moment-entry-go" aria-hidden="true"><svg class="fc-icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>`;
        if (action.action) return `<button class="food-moment-entry food-moment-entry-${escapeHomeHtml(action.code)}" type="button" data-home-action="${escapeHomeHtml(action.action)}">${inner}</button>`;
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

function ideaOptions() {
    const options = [];
    if (capabilityAvailable("recipes")) options.push({ label: "Rezepte", description: "Durch deine Rezeptsammlung stöbern.", href: "/recipes.html", capability: "recipes", icon: "recipes" });
    if (capabilityAvailable("wallet")) options.push({ label: "Inspirationen", description: "Gespeicherte Ideen und Fundstücke ansehen.", href: "/wallet.html", capability: "wallet", icon: "wallet" });
    return options;
}

function renderIdeaDialog() {
    const container = document.getElementById("idea-choice-options");
    if (!container) return;
    container.innerHTML = ideaOptions().map(option => `
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

function openIdeaDialog() {
    const dialog = document.getElementById("idea-choice-dialog");
    renderIdeaDialog();
    if (!dialog || !ideaOptions().length) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
}

function closeIdeaDialog() {
    const dialog = document.getElementById("idea-choice-dialog");
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
    renderIdeaDialog();
    applySourceContext();
}

document.addEventListener("click", event => {
    const actionButton = event.target.closest('[data-home-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.homeAction;
    if (action === "capture") { event.preventDefault(); openCaptureDialog(); }
    if (action === "ideas") { event.preventDefault(); openIdeaDialog(); }
});

document.getElementById("capture-choice-close")?.addEventListener("click", closeCaptureDialog);
document.getElementById("capture-choice-dialog")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeCaptureDialog();
});
document.getElementById("idea-choice-close")?.addEventListener("click", closeIdeaDialog);
document.getElementById("idea-choice-dialog")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeIdeaDialog();
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
function homeMomentAttributeCount(m) {
    let count = 0;
    if ((m.recipes?.length || 0) > 0) count++;
    if ((m.inspirations?.length || 0) > 0) count++;
    if (String(m.notes || "").trim()) count++;
    if (Number(m.people_count || 0) > 0 || (m.audience_code && m.audience_code !== "open")) count++;
    if (m.moment_date || m.starts_at) count++;
    return count;
}
function homeMomentIsRelevant(m) {
    if (!m.source_code || m.source_code === "manual" || m.source_code === "home") return true;
    if (homeMomentAttributeCount(m) > 2) return true;
    return m.source_code === "planning_slot" && (m.inspirations?.length || 0) > 0;
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
        const now = new Date();
        const upcoming = (Array.isArray(moments) ? moments : [])
            .filter(m => !m.is_component)
            .map(m => {
                const raw = m.starts_at || (m.moment_date ? `${m.moment_date}T${m.moment_time || "23:59"}:00` : null);
                return {...m, _when: raw ? new Date(raw) : null};
            })
            .filter(m => m._when && !Number.isNaN(m._when.getTime()) && m._when.getTime() >= now.getTime())
            .sort((a,b) => a._when - b._when)
            .slice(0,4);
        section.hidden = upcoming.length === 0;
        list.innerHTML = upcoming.map(item => `<a class="home-upcoming-item" href="/foodMoment.html?id=${encodeURIComponent(item.public_id)}"><span class="home-upcoming-when">${escapeHomeHtml(upcomingMomentLabel({...item,source:"moment"}))}</span><span class="home-upcoming-copy"><strong>${escapeHomeHtml(item.title)}</strong><small>${escapeHomeHtml(item.recipes?.[0]?.name || item.inspirations?.[0]?.title || "Food Moment")}</small></span><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></a>`).join("");
    } catch (_) { section.hidden = true; }
}

