const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
const WEEK_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEAL_ROWS = [
    { key: "breakfast", label: "Frühstück" },
    { key: "lunch", label: "Mittagessen" },
    { key: "dinner", label: "Abendessen" },
    { key: "snack", label: "Snack" }
];

let recipes = [];
let mealPlans = [];
let selectedDay = getTodayInGerman();
let activeMealPlanId = null;
let activeMealPlanName = "";
let mealPlanDraft = createEmptyMealPlanDraft();
let mealPlanDirty = false;
let walletInspirations = [];
let pickerTarget = null;
let mealPickerType = "recipe";

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

function getTodayInGerman() {
    const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return days[new Date().getDay()];
}

function getRecipeById(recipeId) {
    return recipes.find(recipe => String(recipe.id) === String(recipeId));
}


function getIconSvg(name, isFilled = false) {
    const icons = {
        favorite: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
        edit: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>`,
        delete: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>`,
        prev: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
        next: `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`
    };
    return icons[name] || "";
}

function isFavoriteRecipe(recipe) {
    return Number(recipe?.is_favorite) === 1;
}

async function toggleFavoriteRecipe(recipeId) {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return;

    const newFavoriteValue = isFavoriteRecipe(recipe) ? 0 : 1;

    try {
        const response = await AuthShell.request(`${API_URL}/recipes/${recipeId}/favorite`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_favorite: newFavoriteValue })
        });

        if (!response.ok) throw new Error("Favoritenstatus konnte nicht gespeichert werden.");

        recipe.is_favorite = newFavoriteValue;
        populateRecipeList();
        showToast(newFavoriteValue === 1 ? "Als Favorit markiert." : "Favorit entfernt.");
    } catch (error) {
        console.error(error);
        showToast("Favoritenstatus konnte nicht gespeichert werden.");
    }
}

async function apiFetch(url, options = {}) {
    const response = await AuthShell.request(url, options);
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
        throw new Error(payload?.error || "Serverfehler");
    }
    return payload;
}

async function loadRecipes() {
    try {
        recipes = await apiFetch(`${API_URL}/recipes`);
        populateMealTable();
        populateRecipeList();
        renderDayDetail(selectedDay);
    } catch (error) {
        console.error("Fehler beim Laden der Rezepte:", error);
        showToast("Rezepte konnten nicht geladen werden.");
    }
}

async function loadMealPlans() {
    try {
        mealPlans = await apiFetch(`${API_URL}/meal_plans`);
        renderMealPlanSelect();
    } catch (error) {
        console.error("Fehler beim Laden der Wochenpläne:", error);
        showToast("Wochenpläne konnten nicht geladen werden.");
    }
}

function renderMealPlanSelect() {
    const select = document.getElementById("plan-list");
    if (!select) return;

    select.innerHTML = `<option value="">Wochenplan laden ...</option>`;
    mealPlans.forEach(plan => {
        const option = document.createElement("option");
        option.value = plan.id;
        option.textContent = plan.name;
        select.appendChild(option);
    });

    select.value = activeMealPlanId || "";
    select.onchange = async () => {
        const nextId = select.value;
        if (!nextId) return;
        if (!confirmDiscardChanges()) { select.value = activeMealPlanId || ""; return; }
        await loadMealPlan(nextId);
    };
}

function createEmptyMealPlanDraft() {
    return Object.fromEntries(WEEK_DAYS.map(day => [day, Object.fromEntries(MEAL_ROWS.map(meal => [meal.key, null]))]));
}

function normalizePlanItem(entry) {
    if (!entry) return null;
    if (entry.itemType === "inspiration" || entry.type === "inspiration") {
        return {
            type: "inspiration",
            walletId: entry.walletId || entry.referenceId || entry.publicId || "",
            title: entry.title || "Inspiration",
            category: entry.category || "",
            sourceUrl: entry.sourceUrl || ""
        };
    }
    const recipeId = entry.recipeId || entry.referenceId || "";
    return recipeId ? { type: "recipe", recipeId: String(recipeId) } : null;
}

function setMealPlanDirty(value = true) {
    mealPlanDirty = Boolean(value);
    const state = document.getElementById("meal-plan-save-state");
    const updateButton = document.getElementById("meal-plan-update-button");
    if (state) {
        state.textContent = mealPlanDirty ? "Geändert · noch nicht gespeichert" : (activeMealPlanId ? "Gespeicherter Stand" : "Noch nicht gespeichert");
        state.classList.toggle("is-dirty", mealPlanDirty);
    }
    if (updateButton) updateButton.classList.toggle("has-changes", mealPlanDirty);
}

function populateMealTable() {
    const board = document.getElementById("meal-table");
    if (!board) return;
    board.innerHTML = "";

    WEEK_DAYS.forEach(day => {
        const column = document.createElement("section");
        column.className = "meal-plan-day-column";
        column.dataset.day = day;
        column.classList.toggle("is-active", day === selectedDay);
        column.classList.toggle("is-today", day === getTodayInGerman());

        const header = document.createElement("button");
        header.type = "button";
        header.className = "meal-plan-day-heading";
        header.innerHTML = `<span>${day}</span>${day === getTodayInGerman() ? '<small>Heute</small>' : ''}`;
        header.addEventListener("click", () => setSelectedDay(day));
        column.appendChild(header);

        const meals = document.createElement("div");
        meals.className = "meal-plan-day-meals";
        MEAL_ROWS.forEach(meal => meals.appendChild(createMealSlot(day, meal)));
        column.appendChild(meals);
        column.appendChild(createDayCalorieProgress(day));
        board.appendChild(column);
    });

    renderDayDetail(selectedDay);
}

function createMealSlot(day, meal) {
    const slot = document.createElement("div");
    slot.className = "meal-plan-slot";
    slot.dataset.day = day;
    slot.dataset.mealType = meal.key;
    slot.addEventListener("dragover", event => { event.preventDefault(); slot.classList.add("is-drag-over"); });
    slot.addEventListener("dragleave", () => slot.classList.remove("is-drag-over"));
    slot.addEventListener("drop", event => {
        event.preventDefault();
        slot.classList.remove("is-drag-over");
        try {
            const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
            movePlanItem(payload.day, payload.mealType, day, meal.key);
        } catch (error) { console.warn("Drag & Drop konnte nicht ausgewertet werden", error); }
    });

    const label = document.createElement("div");
    label.className = "meal-plan-slot-label";
    label.textContent = meal.label;
    slot.appendChild(label);

    const item = mealPlanDraft?.[day]?.[meal.key] || null;
    if (!item) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "meal-plan-add-button";
        add.innerHTML = `<span aria-hidden="true">＋</span><span>Hinzufügen</span>`;
        add.addEventListener("click", () => openMealPicker(day, meal.key));
        slot.appendChild(add);
        return slot;
    }

    const card = document.createElement("article");
    card.className = `meal-plan-item-card is-${item.type}`;
    card.draggable = true;
    card.addEventListener("dragstart", event => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify({ day, mealType: meal.key }));
        card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("is-dragging"));

    if (item.type === "recipe") {
        const recipe = getRecipeById(item.recipeId);
        const title = recipe?.name || "Rezept nicht verfügbar";
        const calories = Number(recipe?.calories) || 0;
        card.innerHTML = `
            <div class="meal-plan-card-copy">
                <strong>${escapeHtml(title)}</strong>
                <span>Rezept${calories ? ` · ${calories} kcal` : ""}</span>
            </div>
            <button type="button" class="meal-plan-card-menu" aria-label="Eintrag bearbeiten">•••</button>`;
        card.querySelector(".meal-plan-card-copy")?.addEventListener("click", () => { if (recipe) location.href = `/recipeInstructions.html?id=${recipe.id}`; });
    } else {
        card.innerHTML = `
            <div class="meal-plan-card-copy">
                <strong>${escapeHtml(item.title || "Inspiration")}</strong>
                <span>Inspiration${item.category ? ` · ${escapeHtml(getWalletCategoryLabel(item.category))}` : ""}</span>
            </div>
            <button type="button" class="meal-plan-card-menu" aria-label="Eintrag bearbeiten">•••</button>`;
    }

    card.querySelector(".meal-plan-card-menu")?.addEventListener("click", event => {
        event.stopPropagation();
        openPlanItemMenu(day, meal.key, event.currentTarget);
    });
    slot.appendChild(card);
    return slot;
}

function createDayCalorieProgress(day) {
    const total = getDayCalories(day);
    const ratio = Math.min(Math.max(total / DAILY_CALORIE_LIMIT, 0), 1);
    const wrap = document.createElement("div");
    wrap.className = `meal-plan-day-progress${total > DAILY_CALORIE_LIMIT ? " is-over" : ""}`;
    wrap.innerHTML = `<div class="meal-plan-day-progress-copy"><span>${total.toLocaleString("de-DE")} / ${DAILY_CALORIE_LIMIT.toLocaleString("de-DE")} kcal</span></div><div class="meal-plan-progress-track"><span style="width:${Math.round(ratio * 100)}%"></span></div>`;
    return wrap;
}

function getDayCalories(day) {
    return MEAL_ROWS.reduce((sum, meal) => {
        const item = mealPlanDraft?.[day]?.[meal.key];
        if (!item || item.type !== "recipe") return sum;
        return sum + (Number(getRecipeById(item.recipeId)?.calories) || 0);
    }, 0);
}

function calculateCalories() {
    document.querySelectorAll(".meal-plan-day-column").forEach(column => {
        const current = column.querySelector(".meal-plan-day-progress");
        current?.replaceWith(createDayCalorieProgress(column.dataset.day));
    });
}

function getMealsForDay(day) {
    return mealPlanDraft?.[day] || {};
}

window.setSelectedDay = function(day) {
    selectedDay = day;
    document.querySelectorAll(".meal-plan-day-column").forEach(column => column.classList.toggle("is-active", column.dataset.day === day));
    renderDayDetail(day);
};

window.changeSelectedDay = function(direction) {
    const currentIndex = WEEK_DAYS.indexOf(selectedDay);
    const newIndex = (currentIndex + direction + WEEK_DAYS.length) % WEEK_DAYS.length;
    setSelectedDay(WEEK_DAYS[newIndex]);
};

function renderDayDetail(day) {
    const panel = document.getElementById("day-detail-panel");
    if (!panel) return;
    const totalCalories = getDayCalories(day);
    const remaining = DAILY_CALORIE_LIMIT - totalCalories;
    const progress = Math.min(Math.max(totalCalories / DAILY_CALORIE_LIMIT, 0), 1) * 100;
    const mealCardsHtml = MEAL_ROWS.map(meal => {
        const item = mealPlanDraft?.[day]?.[meal.key] || null;
        if (!item) return `<div class="day-detail-meal-card is-empty"><div class="day-detail-meal-label">${meal.label}</div><button type="button" class="day-detail-add-button" onclick="openMealPicker('${day}','${meal.key}')">＋ Hinzufügen</button></div>`;
        if (item.type === "recipe") {
            const recipe = getRecipeById(item.recipeId);
            return `<div class="day-detail-meal-card"><div class="day-detail-meal-label">${meal.label}</div><div class="day-detail-meal-value">${recipe ? `<a href="/recipeInstructions.html?id=${recipe.id}" class="day-detail-link">${escapeHtml(recipe.name)}</a>` : "Rezept nicht verfügbar"}</div><div class="day-detail-meal-calories">${recipe ? `${Number(recipe.calories)||0} kcal` : "–"}</div><button type="button" class="day-detail-item-action" onclick="openMealPicker('${day}','${meal.key}')">${getIconSvg("edit")}<span>Ändern</span></button></div>`;
        }
        return `<div class="day-detail-meal-card is-inspiration"><div class="day-detail-meal-label">${meal.label}</div><div class="day-detail-meal-value">${escapeHtml(item.title || "Inspiration")}</div><div class="day-detail-meal-calories">Inspiration${item.category ? ` · ${escapeHtml(getWalletCategoryLabel(item.category))}` : ""}</div><button type="button" class="day-detail-item-action" onclick="openMealPicker('${day}','${meal.key}')">${getIconSvg("edit")}<span>Ändern</span></button></div>`;
    }).join("");

    panel.innerHTML = `<div class="day-detail-card"><div class="day-detail-header"><div class="day-detail-title-block"><span class="day-detail-eyebrow">Dein Tag</span><div class="day-detail-day-nav"><button type="button" class="day-nav-button" onclick="changeSelectedDay(-1)" aria-label="Vorheriger Tag">${getIconSvg("prev")}</button><strong class="day-detail-title-day">${day}</strong><button type="button" class="day-nav-button" onclick="changeSelectedDay(1)" aria-label="Nächster Tag">${getIconSvg("next")}</button></div></div><div class="day-detail-progress"><div><span>${totalCalories.toLocaleString("de-DE")} / ${DAILY_CALORIE_LIMIT.toLocaleString("de-DE")} kcal</span><small>${remaining >= 0 ? `${remaining.toLocaleString("de-DE")} kcal frei` : `${Math.abs(remaining).toLocaleString("de-DE")} kcal darüber`}</small></div><div class="meal-plan-progress-track${remaining < 0 ? " is-over" : ""}"><span style="width:${Math.min(progress,100)}%"></span></div></div></div><div class="day-detail-meals">${mealCardsHtml}</div></div>`;
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function getWalletCategoryLabel(category) {
    return ({ recipe: "Rezept / Gericht", restaurant: "Restaurant / Café", product: "Produkt / Zutat", technique: "Kochtechnik / How-to", presentation: "Anrichten", shop: "Shop / Markt / Produzent", other: "Sonstiges" })[category] || category || "Inspiration";
}

async function loadWalletInspirations() {
    try {
        const response = await AuthShell.request(`${API_URL}/wallet`);
        if (!response.ok) return;
        const payload = await response.json();
        walletInspirations = Array.isArray(payload) ? payload : [];
    } catch (error) { console.info("Wallet ist für den Wochenplan nicht verfügbar."); }
}

window.openMealPicker = async function(day, mealType) {
    pickerTarget = { day, mealType };
    mealPickerType = "recipe";
    const dialog = document.getElementById("meal-picker-dialog");
    if (!dialog) return;
    document.getElementById("meal-picker-search").value = "";
    updateMealPickerTypeUi();
    await loadWalletInspirations();
    renderMealPickerResults();
    dialog.showModal();
};

window.setMealPickerType = function(type) {
    mealPickerType = type === "wallet" ? "wallet" : "recipe";
    const search = document.getElementById("meal-picker-search");
    if (search) {
        search.value = "";
        search.placeholder = mealPickerType === "wallet" ? "Wallet durchsuchen …" : "Rezepte durchsuchen …";
        search.focus();
    }
    updateMealPickerTypeUi();
    renderMealPickerResults();
};

function updateMealPickerTypeUi() {
    ["recipe", "wallet"].forEach(type => {
        const button = document.getElementById(`meal-picker-type-${type}`);
        if (!button) return;
        const active = mealPickerType === type;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
    });
    const search = document.getElementById("meal-picker-search");
    if (search) search.placeholder = mealPickerType === "wallet" ? "Wallet durchsuchen …" : "Rezepte durchsuchen …";
}

window.closeMealPicker = function() { document.getElementById("meal-picker-dialog")?.close(); pickerTarget = null; };

function renderMealPickerResults() {
    const results = document.getElementById("meal-picker-results");
    if (!results || !pickerTarget) return;
    const term = (document.getElementById("meal-picker-search")?.value || "").trim().toLocaleLowerCase("de");

    if (mealPickerType === "wallet") {
        const matchingWallet = walletInspirations.filter(item => !term || `${item.title||""} ${item.source_page_title||""} ${item.note||""} ${getWalletCategoryLabel(item.category)}`.toLocaleLowerCase("de").includes(term));
        results.innerHTML = `<div class="meal-picker-section meal-picker-wallet-section"><div class="meal-picker-section-heading"><h3>Deine Wallet</h3><span>${matchingWallet.length} ${matchingWallet.length === 1 ? "Inspiration" : "Inspirationen"}</span></div>${matchingWallet.length ? matchingWallet.map(inspirationPickerMarkup).join("") : '<p class="meal-picker-empty">Keine passende Inspiration in deiner Wallet gefunden.</p>'}</div>`;
        return;
    }

    const mealType = pickerTarget.mealType;
    const matchingRecipes = recipes.filter(recipe => Array.isArray(recipe.mealTypes) && recipe.mealTypes.includes(mealType) && (!term || String(recipe.name||"").toLocaleLowerCase("de").includes(term)));
    const favorite = matchingRecipes.filter(isFavoriteRecipe);
    results.innerHTML = `${favorite.length ? `<div class="meal-picker-section"><h3>Favoriten</h3>${favorite.slice(0,6).map(recipePickerMarkup).join("")}</div>` : ""}<div class="meal-picker-section"><div class="meal-picker-section-heading"><h3>Passende Rezepte</h3><span>${matchingRecipes.length}</span></div>${matchingRecipes.length ? matchingRecipes.map(recipePickerMarkup).join("") : '<p class="meal-picker-empty">Keine passenden Rezepte gefunden.</p>'}</div>`;
}

function recipePickerMarkup(recipe) {
    return `<button type="button" class="meal-picker-result" onclick="chooseMealPickerItem('recipe','${String(recipe.id).replaceAll("'", "") }')"><span><strong>${escapeHtml(recipe.name)}</strong><small>Rezept · ${Number(recipe.calories)||0} kcal</small></span><span aria-hidden="true">＋</span></button>`;
}
function inspirationPickerMarkup(item) {
    const title = item.title || item.source_page_title || "Gespeicherte Inspiration";
    return `<button type="button" class="meal-picker-result" onclick="chooseMealPickerItem('inspiration','${escapeHtml(item.public_id)}')"><span><strong>${escapeHtml(title)}</strong><small>Inspiration · ${escapeHtml(getWalletCategoryLabel(item.category))}</small></span><span aria-hidden="true">＋</span></button>`;
}

window.chooseMealPickerItem = function(type, id) {
    if (!pickerTarget) return;
    if (type === "recipe") {
        mealPlanDraft[pickerTarget.day][pickerTarget.mealType] = { type: "recipe", recipeId: String(id) };
    } else {
        const item = walletInspirations.find(entry => String(entry.public_id) === String(id));
        if (!item) return;
        mealPlanDraft[pickerTarget.day][pickerTarget.mealType] = { type: "inspiration", walletId: item.public_id, title: item.title || item.source_page_title || "Gespeicherte Inspiration", category: item.category || "", sourceUrl: item.source_url || "" };
    }
    setMealPlanDirty(true);
    closeMealPicker();
    populateMealTable();
};

function openPlanItemMenu(day, mealType, anchor) {
    const existing = document.querySelector(".meal-plan-context-menu");
    existing?.remove();
    const menu = document.createElement("div");
    menu.className = "meal-plan-context-menu";
    menu.innerHTML = `<button type="button" data-action="change">Ändern</button><button type="button" data-action="remove">Entfernen</button>`;
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;
    menu.style.top = `${rect.bottom + 6}px`;
    menu.addEventListener("click", event => {
        const action = event.target.closest("button")?.dataset.action;
        if (action === "change") openMealPicker(day, mealType);
        if (action === "remove") { mealPlanDraft[day][mealType] = null; setMealPlanDirty(true); populateMealTable(); }
        menu.remove();
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", function close(event){ if (!menu.contains(event.target) && event.target !== anchor) { menu.remove(); document.removeEventListener("click", close); } }), 0);
}

function movePlanItem(fromDay, fromMealType, toDay, toMealType) {
    if (!mealPlanDraft?.[fromDay] || !mealPlanDraft?.[toDay]) return;
    const moving = mealPlanDraft[fromDay][fromMealType];
    if (!moving) return;
    const displaced = mealPlanDraft[toDay][toMealType];
    mealPlanDraft[toDay][toMealType] = moving;
    mealPlanDraft[fromDay][fromMealType] = displaced || null;
    setMealPlanDirty(true);
    populateMealTable();
}

function getFilteredAndSortedRecipes() {
    const searchTerm = (document.getElementById("recipe-search")?.value || "").trim().toLowerCase();
    const sortValue = document.getElementById("recipe-sort")?.value || "name-asc";

    let filtered = [...recipes];

    if (searchTerm) {
        filtered = filtered.filter(recipe => {
            const searchable = [
                recipe.name,
                recipe.ingredients,
                recipe.instructions,
                ...(Array.isArray(recipe.mealTypes) ? recipe.mealTypes : [])
            ].join(" ").toLowerCase();
            return searchable.includes(searchTerm);
        });
    }

    if (sortValue === "favorites") {
        filtered = filtered.filter(isFavoriteRecipe);
    } else if (["breakfast", "lunch", "dinner", "snack"].includes(sortValue)) {
        filtered = filtered.filter(recipe => Array.isArray(recipe.mealTypes) && recipe.mealTypes.includes(sortValue));
    } else if (sortValue === "name-desc") {
        filtered.sort((a, b) => b.name.localeCompare(a.name, "de"));
    } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name, "de"));
    }

    return filtered;
}

function populateRecipeList() {
    const recipeList = document.getElementById("recipe-list");
    if (!recipeList) return;

    recipeList.innerHTML = "";
    const visibleRecipes = getFilteredAndSortedRecipes();

    if (visibleRecipes.length === 0) {
        recipeList.innerHTML = `<li class="recipe-empty-state">Keine passenden Rezepte gefunden.</li>`;
        return;
    }

    visibleRecipes.forEach(recipe => {
        const li = document.createElement("li");
        li.className = "recipe-item";

        const main = document.createElement("div");
        main.className = "recipe-main";

        const link = document.createElement("a");
        link.href = `/recipeInstructions.html?id=${recipe.id}`;
        link.className = "recipe-link";
        link.textContent = recipe.name;

        const meta = document.createElement("div");
        meta.className = "recipe-meta";

        const tags = document.createElement("div");
        tags.className = "meal-tags";
        (recipe.mealTypes || []).forEach(type => {
            const tag = document.createElement("span");
            tag.className = "meal-tag";
            tag.textContent = getMealLabel(type);
            tags.appendChild(tag);
        });

        const calories = document.createElement("span");
        calories.className = "recipe-calories-badge";
        calories.textContent = `${recipe.calories} kcal`;

        meta.appendChild(tags);
        meta.appendChild(calories);
        main.appendChild(link);
        main.appendChild(meta);

        const icons = document.createElement("div");
        icons.className = "recipe-icons";

        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "recipe-favorite-button";
        favoriteButton.classList.toggle("is-favorite", isFavoriteRecipe(recipe));
        favoriteButton.innerHTML = getIconSvg("favorite");
        favoriteButton.title = isFavoriteRecipe(recipe) ? "Favorit entfernen" : "Als Favorit markieren";
        favoriteButton.setAttribute("aria-label", favoriteButton.title);
        favoriteButton.onclick = () => toggleFavoriteRecipe(recipe.id);

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.innerHTML = getIconSvg("edit");
        editButton.title = "Rezept bearbeiten";
        editButton.setAttribute("aria-label", "Rezept bearbeiten");
        editButton.onclick = () => window.location.href = `/recipeDetails.html?id=${recipe.id}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.innerHTML = getIconSvg("delete");
        deleteButton.className = "delete-button";
        deleteButton.title = "Rezept löschen";
        deleteButton.setAttribute("aria-label", "Rezept löschen");
        deleteButton.onclick = () => deleteRecipe(recipe.id);

        icons.appendChild(favoriteButton);
        icons.appendChild(editButton);
        icons.appendChild(deleteButton);

        li.appendChild(main);
        li.appendChild(icons);
        recipeList.appendChild(li);
    });
}

function getMealLabel(type) {
    return MEAL_ROWS.find(meal => meal.key === type)?.label || type;
}

window.toggleRecipeToolbar = function() {
    document.getElementById("recipe-add-panel")?.classList.toggle("is-hidden");
};

window.addRecipe = async function() {
    const name = document.getElementById("recipe-name")?.value.trim();
    const calories = document.getElementById("recipe-calories")?.value.trim();
    const portions = document.getElementById("recipe-portions")?.value.trim();
    const mealTypes = Array.from(document.querySelectorAll(".recipe-toolbar-checkboxes input:checked")).map(input => input.value);

    if (!name || !calories || !portions || mealTypes.length === 0) {
        showToast("Bitte Name, Kalorien, Portionen und mindestens eine Mahlzeit angeben.");
        return;
    }

    try {
        const recipe = await apiFetch(`${API_URL}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, calories, portions, mealTypes, ingredients: "", instructions: "" })
        });
        window.location.href = `/recipeDetails.html?id=${recipe.id}`;
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht gespeichert werden.");
    }
};

window.deleteRecipe = async function(recipeId) {
    if (!confirm("Dieses Rezept wirklich löschen?")) return;
    try {
        await apiFetch(`${API_URL}/recipes/${recipeId}`, { method: "DELETE" });
        recipes = recipes.filter(recipe => String(recipe.id) !== String(recipeId));
        populateMealTable();
        populateRecipeList();
        renderDayDetail(selectedDay);
        showToast("Rezept gelöscht.");
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht gelöscht werden.");
    }
};

function collectMealPlanData() {
    const data = [];
    WEEK_DAYS.forEach(day => MEAL_ROWS.forEach(meal => {
        const item = mealPlanDraft?.[day]?.[meal.key] || null;
        if (!item) {
            data.push({ day, mealType: meal.key, recipeId: "" });
        } else if (item.type === "recipe") {
            data.push({ day, mealType: meal.key, itemType: "recipe", recipeId: item.recipeId });
        } else {
            data.push({ day, mealType: meal.key, itemType: "inspiration", walletId: item.walletId, title: item.title, category: item.category || "", sourceUrl: item.sourceUrl || "" });
        }
    }));
    return data;
}

function applyMealPlanData(data = []) {
    mealPlanDraft = createEmptyMealPlanDraft();
    data.forEach(entry => {
        if (!mealPlanDraft[entry.day] || !MEAL_ROWS.some(meal => meal.key === entry.mealType)) return;
        mealPlanDraft[entry.day][entry.mealType] = normalizePlanItem(entry);
    });
    setMealPlanDirty(false);
    populateMealTable();
}

function confirmDiscardChanges() {
    if (!mealPlanDirty) return true;
    return confirm("Du hast ungespeicherte Änderungen. Wenn du fortfährst, werden sie verworfen.");
}

window.togglePlanSaveToolbar = function() {
    document.getElementById("plan-save-panel")?.classList.toggle("is-hidden");
};

window.saveMealPlan = async function() {
    const name = document.getElementById("plan-name")?.value.trim();
    if (!name) {
        showToast("Bitte einen Namen für den Wochenplan angeben.");
        return;
    }

    try {
        const plan = await apiFetch(`${API_URL}/meal_plans`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, data: collectMealPlanData() })
        });
        activeMealPlanId = plan.id;
        activeMealPlanName = plan.name;
        localStorage.setItem("fc_active_meal_plan_id", String(plan.id));
        document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
        setMealPlanDirty(false);
        document.getElementById("plan-name").value = "";
        document.getElementById("plan-save-panel")?.classList.add("is-hidden");
        await loadMealPlans();
        showToast("Wochenplan gespeichert.");
    } catch (error) {
        console.error(error);
        showToast("Wochenplan konnte nicht gespeichert werden.");
    }
};

window.loadMealPlan = async function(planId) {
    try {
        const plan = await apiFetch(`${API_URL}/meal_plans/${planId}`);
        activeMealPlanId = plan.id;
        activeMealPlanName = plan.name;
        localStorage.setItem("fc_active_meal_plan_id", String(plan.id));
        document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
        applyMealPlanData(plan.data);
        renderMealPlanSelect();
        showToast("Wochenplan geladen.");
    } catch (error) {
        console.error(error);
        showToast("Wochenplan konnte nicht geladen werden.");
    }
};

window.updateMealPlan = async function() {
    if (!activeMealPlanId) {
        showToast("Bitte zuerst einen Wochenplan laden oder neu speichern.");
        return;
    }

    try {
        await apiFetch(`${API_URL}/meal_plans/${activeMealPlanId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: activeMealPlanName, data: collectMealPlanData() })
        });
        setMealPlanDirty(false);
        showToast("Wochenplan aktualisiert.");
    } catch (error) {
        console.error(error);
        showToast("Wochenplan konnte nicht aktualisiert werden.");
    }
};

window.deleteMealPlan = async function() {
    if (!activeMealPlanId) {
        showToast("Es ist kein Wochenplan geladen.");
        return;
    }
    if (!confirm("Diesen Wochenplan wirklich löschen?")) return;

    try {
        await apiFetch(`${API_URL}/meal_plans/${activeMealPlanId}`, { method: "DELETE" });
        activeMealPlanId = null;
        activeMealPlanName = "";
        localStorage.removeItem("fc_active_meal_plan_id");
        document.getElementById("current-plan-name").textContent = "Aktueller Wochenplan: keiner";
        mealPlanDraft = createEmptyMealPlanDraft();
        setMealPlanDirty(false);
        populateMealTable();
        await loadMealPlans();
        showToast("Wochenplan gelöscht.");
    } catch (error) {
        console.error(error);
        showToast("Wochenplan konnte nicht gelöscht werden.");
    }
};

function getIngredientsFromText(text) {
    return (text || "").split("\n").map(item => item.trim()).filter(Boolean);
}

window.shareWeeklyShoppingList = async function() {
    const selectedIds = new Set();
    WEEK_DAYS.forEach(day => MEAL_ROWS.forEach(meal => {
        const item = mealPlanDraft?.[day]?.[meal.key];
        if (item?.type === "recipe" && item.recipeId) selectedIds.add(String(item.recipeId));
    }));

    const items = [];
    selectedIds.forEach(id => {
        const recipe = getRecipeById(id);
        if (recipe) items.push(...getIngredientsFromText(recipe.ingredients));
    });

    if (items.length === 0) {
        showToast("Für den Wochenplan wurden keine Zutaten gefunden.");
        return;
    }

    const text = `Einkaufsliste\n\n${items.map(item => `• ${item}`).join("\n")}`;

    if (navigator.share) {
        try { await navigator.share({ title: "Einkaufsliste", text }); }
        catch (error) { console.log("Teilen abgebrochen", error); }
    } else {
        await navigator.clipboard.writeText(text);
        showToast("Einkaufsliste wurde kopiert.");
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const authenticated = await AuthShell.guard();

        if (!authenticated) {
            return;
        }

        const hasMealPlanModule = Boolean(document.getElementById("meal-table") || document.getElementById("plan-list"));
        const hasRecipeModule = Boolean(document.getElementById("recipe-list"));

        const initialLoads = [];
        if (hasMealPlanModule) initialLoads.push(loadMealPlans());
        // Meal Planning needs recipe choices as well; recipe-only pages obviously need recipes too.
        if (hasMealPlanModule || hasRecipeModule) initialLoads.push(loadRecipes());
        await Promise.all(initialLoads);

        document.getElementById("recipe-search")
            ?.addEventListener("input", populateRecipeList);

        document.getElementById("recipe-sort")
            ?.addEventListener("change", populateRecipeList);

        document.getElementById("meal-picker-search")
            ?.addEventListener("input", renderMealPickerResults);

        window.addEventListener("beforeunload", event => {
            if (!mealPlanDirty) return;
            event.preventDefault();
            event.returnValue = "";
        });
    } catch (error) {
        console.error("App-Initialisierung fehlgeschlagen:", error);
        showToast(
            error?.message ||
            "Die Daten konnten nicht geladen werden."
        );
    }
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(console.error);
    });
}

function setupRecipeQuickbar(){
    const bind=(buttonId,panelId)=>document.getElementById(buttonId)?.addEventListener('click',()=>{const panel=document.getElementById(panelId);if(!panel)return;const open=panel.classList.toggle('is-hidden')===false;document.getElementById(buttonId)?.classList.toggle('is-active',open);document.getElementById(buttonId)?.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('input,select')?.focus();});
    bind('recipe-search-toggle','recipe-search-panel');bind('recipe-filter-toggle','recipe-filter-panel');
}
document.addEventListener('DOMContentLoaded',setupRecipeQuickbar);

/* Reifegrad: Workspace-Zuordnung für Wochenpläne */
let mealPlanWorkspaceOptions=[];let mealPlanWorkspaceSaveTimer=null;
function mealPlanWorkspaceIcon(){return `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;}
function renderMealPlanWorkspaceOptions(){const list=document.getElementById('meal-plan-workspace-list');const search=document.getElementById('meal-plan-workspace-search');if(!list)return;const q=(search?.value||'').trim().toLocaleLowerCase('de');list.innerHTML=mealPlanWorkspaceOptions.filter(w=>String(w.name||'').toLocaleLowerCase('de').includes(q)).map(w=>`<label class="recipe-workspace-option"><span class="recipe-workspace-option-main"><span class="recipe-workspace-option-icon">${mealPlanWorkspaceIcon()}</span><span><strong>${escapeHtml(w.name)}</strong><small>${w.workspace_type==='personal'?'Persönlicher Workspace':'Workspace'}</small></span></span><input type="checkbox" class="recipe-workspace-checkbox meal-plan-workspace-checkbox" value="${escapeHtml(w.public_id)}" ${w.is_assigned?'checked':''}><span class="recipe-workspace-checkmark" aria-hidden="true">✓</span></label>`).join('');}
window.openMealPlanWorkspaces=async function(){if(!activeMealPlanId){showToast('Bitte zuerst einen Wochenplan laden oder speichern.');return;}try{const data=await apiFetch(`${API_URL}/meal_plans/${activeMealPlanId}/workspace-assignments`);mealPlanWorkspaceOptions=data.workspaces||[];document.getElementById('meal-plan-workspace-search').value='';document.getElementById('meal-plan-workspace-save-state').textContent='';renderMealPlanWorkspaceOptions();document.getElementById('meal-plan-workspace-overlay').classList.remove('is-hidden');document.getElementById('meal-plan-workspace-overlay').setAttribute('aria-hidden','false');}catch(e){showToast(e.message||'Workspaces konnten nicht geladen werden.');}};
function closeMealPlanWorkspaces(){const o=document.getElementById('meal-plan-workspace-overlay');o?.classList.add('is-hidden');o?.setAttribute('aria-hidden','true');}
async function saveMealPlanWorkspaceAssignments(){const ids=[...document.querySelectorAll('.meal-plan-workspace-checkbox:checked')].map(i=>i.value);const state=document.getElementById('meal-plan-workspace-save-state');if(!ids.length){state.textContent='Mindestens ein Workspace muss ausgewählt bleiben.';state.classList.add('is-error');renderMealPlanWorkspaceOptions();return;}try{state.textContent='Speichert …';state.classList.remove('is-error');const data=await apiFetch(`${API_URL}/meal_plans/${activeMealPlanId}/workspace-assignments`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace_public_ids:ids})});mealPlanWorkspaceOptions=data.workspaces||mealPlanWorkspaceOptions;state.textContent='Gespeichert';await loadMealPlans();}catch(e){state.textContent=e.message;state.classList.add('is-error');}}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('meal-plan-workspace-close')?.addEventListener('click',closeMealPlanWorkspaces);document.getElementById('meal-plan-workspace-done')?.addEventListener('click',closeMealPlanWorkspaces);document.getElementById('meal-plan-workspace-search')?.addEventListener('input',renderMealPlanWorkspaceOptions);document.getElementById('meal-plan-workspace-list')?.addEventListener('change',e=>{const c=e.target.closest('.meal-plan-workspace-checkbox');if(!c)return;const w=mealPlanWorkspaceOptions.find(x=>x.public_id===c.value);if(w)w.is_assigned=c.checked;clearTimeout(mealPlanWorkspaceSaveTimer);mealPlanWorkspaceSaveTimer=setTimeout(saveMealPlanWorkspaceAssignments,350);});document.getElementById('meal-plan-workspace-overlay')?.addEventListener('click',e=>{if(e.target===document.getElementById('meal-plan-workspace-overlay'))closeMealPlanWorkspaces();});});
