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
    const assetMap = {
        today: "/assets/scribbles/cook.svg",
        visitors: "/assets/scribbles/visit.svg",
        capture: "/assets/scribbles/capture.svg",
        "plan-week": "/assets/scribbles/week.svg",
        shopping: "/assets/scribbles/shop.svg",
        "no-idea": "/assets/scribbles/idea.svg"
    };
    const src = assetMap[code] || assetMap["no-idea"];
    return `<span class="food-moment-entry-visual" aria-hidden="true"><img src="${src}" alt=""></span>`;
}

function homeBubbleMarkup(index) {
    const paths = [
        "M25 84C31 31 85 12 151 18C206 23 225 7 286 15C348 23 377 58 373 105C369 151 326 177 271 172C213 166 195 185 132 178C72 172 17 145 25 84Z",
        "M20 91C17 43 58 18 115 18C171 18 195 5 257 16C321 27 373 50 378 98C384 149 334 177 279 174C220 171 193 187 130 177C70 168 23 141 20 91Z",
        "M27 82C38 34 88 12 147 19C205 26 234 8 294 19C350 29 382 65 373 111C363 158 316 177 259 170C203 163 170 187 110 176C55 166 16 132 27 82Z",
        "M21 98C21 45 66 17 124 18C183 19 211 4 273 17C335 30 378 59 378 104C378 151 330 176 278 174C219 171 189 186 130 177C69 168 20 145 21 98Z",
        "M25 89C30 39 74 18 133 18C195 18 221 4 284 17C345 30 381 63 373 110C365 157 320 178 265 171C209 164 179 184 119 177C60 170 20 140 25 89Z",
        "M22 91C20 43 64 17 121 19C177 21 207 5 267 16C332 28 377 56 379 103C381 153 333 177 277 174C220 171 191 187 129 177C69 167 25 141 22 91Z"
    ];
    const path = paths[index % paths.length];
    return `<svg class="food-moment-bubble-bg" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"></path></svg>`;
}

function renderPrimaryActions() {
    const container = document.getElementById("food-moment-primary-actions");
    if (!container) return;

    const actions = HOME_PRIMARY_ACTIONS.filter(actionAvailable);
    container.innerHTML = actions.map((action, index) => {
        const inner = `${homeBubbleMarkup(index)}<span class="food-moment-entry-copy"><strong>${escapeHomeHtml(action.label)}</strong><small>${escapeHomeHtml(action.description)}</small></span><span class="food-moment-entry-icon">${iconMarkup(action.icon)}</span>${homeScribbleMarkup(action.code)}<span class="food-moment-entry-go" aria-hidden="true"><svg class="fc-icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>`;
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

