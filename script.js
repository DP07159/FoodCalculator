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
        const response = await fetch(`${API_URL}/recipes/${recipeId}/favorite`, {
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
    const response = await fetch(url, options);
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
    select.onchange = () => {
        if (select.value) loadMealPlan(select.value);
    };
}

function populateMealTable() {
    const mealTable = document.getElementById("meal-table");
    if (!mealTable) return;

    mealTable.innerHTML = "";
    mealTable.appendChild(createPlanCell("", "plan-corner-cell"));

    WEEK_DAYS.forEach(day => {
        const header = createPlanCell(day, "plan-day-header");
        header.dataset.day = day;
        header.classList.toggle("is-active", day === selectedDay);
        header.classList.toggle("is-today", day === getTodayInGerman());
        header.addEventListener("click", () => setSelectedDay(day));
        mealTable.appendChild(header);
    });

    MEAL_ROWS.forEach(meal => {
        mealTable.appendChild(createPlanCell(meal.label, "plan-row-label"));

        WEEK_DAYS.forEach(day => {
            const cell = document.createElement("div");
            cell.className = "plan-cell plan-input-cell";

            const select = document.createElement("select");
            select.className = "meal-select";
            select.dataset.day = day;
            select.dataset.mealType = meal.key;
            select.innerHTML = `<option value="">-- Wählen --</option>`;

            recipes
                .filter(recipe => Array.isArray(recipe.mealTypes) && recipe.mealTypes.includes(meal.key))
                .forEach(recipe => {
                    const option = document.createElement("option");
                    option.value = recipe.id;
                    option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
                    select.appendChild(option);
                });

            select.addEventListener("change", () => {
                calculateCalories();
                renderDayDetail(selectedDay);
            });

            cell.appendChild(select);
            mealTable.appendChild(cell);
        });
    });

    mealTable.appendChild(createPlanCell("Gesamt", "plan-row-label plan-row-label-accent"));
    WEEK_DAYS.forEach(day => mealTable.appendChild(createPlanValueCell(day, "total-calories")));

    mealTable.appendChild(createPlanCell("Rest", "plan-row-label plan-row-label-accent"));
    WEEK_DAYS.forEach(day => mealTable.appendChild(createPlanValueCell(day, "remaining-calories")));

    calculateCalories();
}

function createPlanCell(text, className) {
    const div = document.createElement("div");
    div.className = className;
    div.textContent = text;
    return div;
}

function createPlanValueCell(day, type) {
    const div = document.createElement("div");
    div.className = `plan-cell plan-value-cell ${type}`;
    div.dataset.day = day;
    div.dataset.type = type;
    div.textContent = "0 kcal";
    return div;
}

function calculateCalories() {
    WEEK_DAYS.forEach(day => {
        let total = 0;
        document.querySelectorAll(`#meal-table select[data-day="${day}"]`).forEach(select => {
            const recipe = getRecipeById(select.value);
            if (recipe) total += Number(recipe.calories) || 0;
        });

        const totalCell = document.querySelector(`#meal-table .total-calories[data-day="${day}"]`);
        const remainingCell = document.querySelector(`#meal-table .remaining-calories[data-day="${day}"]`);
        const remaining = DAILY_CALORIE_LIMIT - total;

        if (totalCell) totalCell.textContent = `${total} kcal`;
        if (remainingCell) {
            remainingCell.textContent = `${remaining} kcal`;
            remainingCell.classList.toggle("is-negative", remaining < 0);
        }
    });
}

function getMealsForDay(day) {
    const meals = {};
    MEAL_ROWS.forEach(meal => {
        const select = document.querySelector(`#meal-table select[data-day="${day}"][data-meal-type="${meal.key}"]`);
        meals[meal.key] = select ? select.value : "";
    });
    return meals;
}

window.setSelectedDay = function(day) {
    selectedDay = day;
    document.querySelectorAll(".plan-day-header").forEach(header => {
        header.classList.toggle("is-active", header.dataset.day === day);
    });
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

    const mealsForDay = getMealsForDay(day);
    let totalCalories = 0;

    const mealCardsHtml = MEAL_ROWS.map(meal => {
        const recipe = getRecipeById(mealsForDay[meal.key]);
        if (recipe) totalCalories += Number(recipe.calories) || 0;

        return `
            <div class="day-detail-meal-card">
                <div class="day-detail-meal-label">${meal.label}</div>
                <div class="day-detail-meal-value">
                    ${recipe ? `<a href="/recipeInstructions.html?id=${recipe.id}" class="day-detail-link">${recipe.name}</a>` : "Noch nichts gewählt"}
                </div>
                <div class="day-detail-meal-calories">${recipe ? `${recipe.calories} kcal` : "–"}</div>
            </div>
        `;
    }).join("");

    const remaining = DAILY_CALORIE_LIMIT - totalCalories;

    panel.innerHTML = `
        <div class="day-detail-card">
            <div class="day-detail-header">
                <div class="day-detail-title-line">
                    <button type="button" class="day-nav-button" onclick="changeSelectedDay(-1)" aria-label="Vorheriger Tag">${getIconSvg("prev")}</button>
                    <div class="day-detail-title-inline">
                        <span class="day-detail-title-prefix">Dein Tagesplan für</span>
                        <span class="day-detail-title-day">${day}</span>
                    </div>
                    <button type="button" class="day-nav-button" onclick="changeSelectedDay(1)" aria-label="Nächster Tag">${getIconSvg("next")}</button>
                </div>
                <div class="day-detail-stats">
                    <div class="day-detail-stat"><span>Gesamt</span><strong>${totalCalories} kcal</strong></div>
                    <div class="day-detail-stat"><span>Rest</span><strong class="${remaining < 0 ? "is-negative" : "is-positive"}">${remaining} kcal</strong></div>
                </div>
            </div>
            <div class="day-detail-meals">${mealCardsHtml}</div>
        </div>
    `;
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
    document.querySelectorAll("#meal-table select").forEach(select => {
        data.push({ day: select.dataset.day, mealType: select.dataset.mealType, recipeId: select.value });
    });
    return data;
}

function applyMealPlanData(data = []) {
    data.forEach(entry => {
        const select = document.querySelector(`#meal-table select[data-day="${entry.day}"][data-meal-type="${entry.mealType}"]`);
        if (select) select.value = entry.recipeId || "";
    });
    calculateCalories();
    renderDayDetail(selectedDay);
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
        document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
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
        document.getElementById("current-plan-name").textContent = "Aktueller Wochenplan: keiner";
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
    document.querySelectorAll("#meal-table select").forEach(select => {
        if (select.value) selectedIds.add(String(select.value));
    });

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
    initBurgerMenu();
    await Promise.all([loadMealPlans(), loadRecipes()]);

    document.getElementById("recipe-search")?.addEventListener("input", populateRecipeList);
    document.getElementById("recipe-sort")?.addEventListener("change", populateRecipeList);
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(console.error);
    });
}
