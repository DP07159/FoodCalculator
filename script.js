const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
const WEEK_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEAL_ROWS = [
    { key: "breakfast", label: "Frühstück" },
    { key: "lunch", label: "Mittagessen" },
    { key: "dinner", label: "Abendessen" },
    { key: "snack", label: "Snack" }
];

function getTodayInGerman() {
    const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return days[new Date().getDay()];
}

function getRecipeById(recipeId) {
    return recipes.find(recipe => String(recipe.id) === String(recipeId));
}

function getMealsForDay(day) {
    const meals = {};

    MEAL_ROWS.forEach(meal => {
        const select = document.querySelector(
            `#meal-table select[data-day="${day}"][data-meal-type="${meal.key}"]`
        );

        meals[meal.key] = select ? select.value : "";
    });

    return meals;
}

function getFilteredAndSortedRecipes() {
    const searchInput = document.getElementById("recipe-search");
    const sortSelect = document.getElementById("recipe-sort");

    const searchTerm = (searchInput?.value || "").trim().toLowerCase();
    const sortValue = sortSelect?.value || "name-asc";

    let filteredRecipes = [...recipes];

    if (searchTerm) {
        filteredRecipes = filteredRecipes.filter(recipe => {
            const name = (recipe.name || "").toLowerCase();
            const ingredients = (recipe.ingredients || "").toLowerCase();
            const instructions = (recipe.instructions || "").toLowerCase();
            const mealTypes = Array.isArray(recipe.mealTypes)
                ? recipe.mealTypes.join(" ").toLowerCase()
                : "";

            return (
                name.includes(searchTerm) ||
                ingredients.includes(searchTerm) ||
                instructions.includes(searchTerm) ||
                mealTypes.includes(searchTerm)
            );
        });
    }

    if (["breakfast", "lunch", "dinner", "snack"].includes(sortValue)) {
        filteredRecipes = filteredRecipes.filter(recipe =>
            Array.isArray(recipe.mealTypes) && recipe.mealTypes.includes(sortValue)
        );
    } else if (sortValue === "name-asc") {
        filteredRecipes.sort((a, b) => a.name.localeCompare(b.name, "de"));
    } else if (sortValue === "name-desc") {
        filteredRecipes.sort((a, b) => b.name.localeCompare(a.name, "de"));
    }

    return filteredRecipes;
}

function renderDayDetail(day) {
    const panel = document.getElementById("day-detail-panel");
    if (!panel) return;

    const mealsForDay = getMealsForDay(day);

    let totalCalories = 0;

    const mealCardsHtml = MEAL_ROWS.map(meal => {
        const recipeId = mealsForDay[meal.key];
        const recipe = recipeId ? getRecipeById(recipeId) : null;

        if (recipe) {
            totalCalories += Number(recipe.calories) || 0;
        }

        return `
            <div class="day-detail-meal-card">
                <div class="day-detail-meal-label">${meal.label}</div>
                <div class="day-detail-meal-value">
                    ${recipe 
    ? `<a href="/recipeInstructions.html?id=${recipe.id}" class="day-detail-link">${recipe.name}</a>` 
    : "Noch nichts gewählt"
}
                </div>
                <div class="day-detail-meal-calories">
                    ${recipe ? `${recipe.calories} kcal` : "–"}
                </div>
            </div>
        `;
    }).join("");

    const remainingCalories = DAILY_CALORIE_LIMIT - totalCalories;
    const remainingClass = remainingCalories < 0
        ? "day-detail-stat-value is-negative"
        : "day-detail-stat-value is-positive";

    panel.innerHTML = `
        <div class="day-detail-card">
           <div class="day-detail-header">
    <div class="day-detail-title-line">
        <button
            type="button"
            class="day-nav-button"
            onclick="changeSelectedDay(-1)"
            title="Vorheriger Tag"
            aria-label="Vorheriger Tag">
            ‹
        </button>

        <div class="day-detail-title-inline">
            <span class="day-detail-title-prefix">Dein Tagesplan für</span>
            <span class="day-detail-title-day">${day}</span>
        </div>

        <button
            type="button"
            class="day-nav-button"
            onclick="changeSelectedDay(1)"
            title="Nächster Tag"
            aria-label="Nächster Tag">
            ›
        </button>
    </div>

    <div class="day-detail-stats">
                    <div class="day-detail-stat">
                        <span class="day-detail-stat-label">Gesamt</span>
                        <span class="day-detail-stat-value">${totalCalories} kcal</span>
                    </div>
                    <div class="day-detail-stat">
                        <span class="day-detail-stat-label">Rest</span>
                        <span class="${remainingClass}">${remainingCalories} kcal</span>
                    </div>
                </div>
            </div>

            <div class="day-detail-meals">
                ${mealCardsHtml}
            </div>
        </div>
    `;
}

window.setSelectedDay = function(day) {
    selectedDay = day;

    document.querySelectorAll(".plan-day-header").forEach(header => {
        header.classList.toggle("is-active", header.dataset.day === day);
    });

    renderDayDetail(day);
};

window.changeSelectedDay = function(direction) {
    if (!Array.isArray(WEEK_DAYS) || !selectedDay) return;

    const currentIndex = WEEK_DAYS.indexOf(selectedDay);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;

    if (newIndex < 0) {
        newIndex = WEEK_DAYS.length - 1;
    }

    if (newIndex >= WEEK_DAYS.length) {
        newIndex = 0;
    }

    const newDay = WEEK_DAYS[newIndex];

    if (typeof setSelectedDay === "function") {
        setSelectedDay(newDay);
    } else {
        selectedDay = newDay;
        renderDayDetail(newDay);
    }
};

let recipes = [];
let selectedDay = getTodayInGerman();
let activeMealPlanId = null;
let activeMealPlanName = "";
let draggedMealSource = null;
let tappedMealSource = null;

/* -------------------------------------- */
/* REZEPTE LADEN */
/* -------------------------------------- */

function loadRecipes() {
    console.log("🔎 loadRecipes() gestartet");

    fetch(`${API_URL}/recipes`)
        .then(response => response.json())
        .then((data) => {
            console.log("✅ Rezepte erfolgreich geladen:", data);
            recipes = data;

            populateMealTable();
            populateRecipeList();

            const errorMessage = document.getElementById("error-message");
            if (errorMessage) errorMessage.style.display = "none";
        })
        .catch(error => {
            console.error("❌ Fehler beim Laden der Rezepte:", error);

            const errorMessage = document.getElementById("error-message");
            if (errorMessage) errorMessage.style.display = "block";
        });
}

/* -------------------------------------- */
/* WOCHENPLAN AUFBAUEN */
/* -------------------------------------- */

function populateMealTable() {
    const mealTable = document.getElementById("meal-table");
    if (!mealTable) return;

    mealTable.innerHTML = "";

    const cornerCell = document.createElement("div");
    cornerCell.className = "plan-corner-cell";
    mealTable.appendChild(cornerCell);

    WEEK_DAYS.forEach(day => {
        const dayHeader = document.createElement("div");
        dayHeader.className = "plan-day-header";
        dayHeader.textContent = day;
        dayHeader.dataset.day = day;

        if (day === selectedDay) {
            dayHeader.classList.add("is-active");
        }

        if (day === getTodayInGerman()) {
            dayHeader.classList.add("is-today");
        }

        dayHeader.addEventListener("click", () => {
            setSelectedDay(day);
        });

        mealTable.appendChild(dayHeader);
    });

    MEAL_ROWS.forEach(meal => {
        const rowLabel = document.createElement("div");
        rowLabel.className = "plan-row-label";
        rowLabel.textContent = meal.label;
        mealTable.appendChild(rowLabel);

        WEEK_DAYS.forEach(day => {
            const cell = document.createElement("div");
cell.className = "plan-cell plan-input-cell";

const handle = document.createElement("button");
handle.type = "button";
handle.className = "plan-drag-handle";
handle.title = "Mahlzeit verschieben";
handle.setAttribute("aria-label", "Mahlzeit verschieben");
handle.textContent = "⋮⋮";

const select = document.createElement("select");
select.className = "meal-select";
            select.dataset.day = day;
            select.dataset.mealType = meal.key;
            select.innerHTML = `<option value="">-- Wählen --</option>`;

            recipes.forEach(recipe => {
                if (Array.isArray(recipe.mealTypes) && recipe.mealTypes.includes(meal.key)) {
                    const option = document.createElement("option");
                    option.value = recipe.id;
                    option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
                    select.appendChild(option);
                }
            });

            select.addEventListener("change", calculateCalories);

            cell.appendChild(handle);
cell.appendChild(select);
mealTable.appendChild(cell);
        });
    });

    const totalLabel = document.createElement("div");
    totalLabel.className = "plan-row-label plan-row-label-accent";
    totalLabel.textContent = "Gesamtkalorien";
    mealTable.appendChild(totalLabel);

    WEEK_DAYS.forEach(day => {
        const totalCell = document.createElement("div");
        totalCell.className = "plan-cell plan-value-cell total-calories";
        totalCell.dataset.day = day;
        totalCell.textContent = "0 kcal";
        mealTable.appendChild(totalCell);
    });

    const remainingLabel = document.createElement("div");
    remainingLabel.className = "plan-row-label plan-row-label-accent";
    remainingLabel.textContent = "Restkalorien";
    mealTable.appendChild(remainingLabel);

    WEEK_DAYS.forEach(day => {
        const remainingCell = document.createElement("div");
        remainingCell.className = "plan-cell plan-value-cell remaining-calories";
        remainingCell.dataset.day = day;
        remainingCell.textContent = `${DAILY_CALORIE_LIMIT} kcal`;
        mealTable.appendChild(remainingCell);
    });

    if (!WEEK_DAYS.includes(selectedDay)) {
        selectedDay = "Montag";
    }

    renderDayDetail(selectedDay);
    attachDragAndDropToPlanCells();
}

/* -------------------------------------- */
/* KALORIEN BERECHNEN */
/* -------------------------------------- */

function calculateCalories() {
    WEEK_DAYS.forEach(day => {
        let totalCalories = 0;

        document.querySelectorAll(`#meal-table select[data-day="${day}"]`).forEach(select => {
            const selectedRecipe = recipes.find(recipe => recipe.id == select.value);
            if (selectedRecipe) {
                totalCalories += Number(selectedRecipe.calories) || 0;
            }
        });

        const totalCell = document.querySelector(`.total-calories[data-day="${day}"]`);
        const remainingCell = document.querySelector(`.remaining-calories[data-day="${day}"]`);

        if (totalCell) {
            totalCell.textContent = `${totalCalories} kcal`;
        }

        if (remainingCell) {
            const remainingCalories = DAILY_CALORIE_LIMIT - totalCalories;
            remainingCell.textContent = `${remainingCalories} kcal`;
            remainingCell.style.color = remainingCalories < 0 ? "#c62828" : "#2e7d32";
        }
    renderDayDetail(selectedDay);
    refreshPlanCellStates();
    });
}

function refreshPlanCellStates() {
    document.querySelectorAll(".plan-input-cell").forEach(cell => {
        const select = cell.querySelector("select");
        const handle = cell.querySelector(".plan-drag-handle");
        if (!select || !handle) return;

        const hasValue = !!select.value;

        cell.classList.toggle("is-filled", hasValue);
        cell.classList.toggle(
            "is-selected-source",
            !!tappedMealSource &&
            tappedMealSource.day === select.dataset.day &&
            tappedMealSource.mealType === select.dataset.mealType
        );

        cell.dataset.day = select.dataset.day || "";
        cell.dataset.mealType = select.dataset.mealType || "";

        handle.draggable = hasValue;
        handle.classList.toggle("is-active", hasValue);
    });
}

function attachDragAndDropToPlanCells() {
    document.querySelectorAll(".plan-input-cell").forEach(cell => {
        const handle = cell.querySelector(".plan-drag-handle");
        if (!handle) return;

        handle.addEventListener("dragstart", handlePlanCellDragStart);
        handle.addEventListener("dragend", handlePlanCellDragEnd);
        handle.addEventListener("click", () => handlePlanCellTap(cell));

        cell.addEventListener("dragover", handlePlanCellDragOver);
        cell.addEventListener("dragenter", handlePlanCellDragEnter);
        cell.addEventListener("dragleave", handlePlanCellDragLeave);
        cell.addEventListener("drop", handlePlanCellDrop);
    });

    refreshPlanCellStates();
}

function moveMealEntry(sourceDay, sourceMealType, targetDay, targetMealType) {
    if (sourceMealType !== targetMealType) {
        return false;
    }

    const sourceSelect = document.querySelector(
        `#meal-table select[data-day="${sourceDay}"][data-meal-type="${sourceMealType}"]`
    );

    const targetSelect = document.querySelector(
        `#meal-table select[data-day="${targetDay}"][data-meal-type="${targetMealType}"]`
    );

    if (!sourceSelect || !targetSelect) return false;

    if (sourceDay === targetDay && sourceMealType === targetMealType) {
        return false;
    }

    const sourceValue = sourceSelect.value;
    const targetValue = targetSelect.value;

    sourceSelect.value = targetValue || "";
    targetSelect.value = sourceValue || "";

    calculateCalories();
    refreshPlanCellStates();
    return true;
}

function handlePlanCellTap(cell) {
    const select = cell.querySelector("select");
    if (!select) return;

    const day = select.dataset.day;
    const mealType = select.dataset.mealType;
    const hasValue = !!select.value;

    if (!tappedMealSource) {
        if (!hasValue) return;

        tappedMealSource = { day, mealType };
        refreshPlanCellStates();
        return;
    }

    const source = tappedMealSource;

    if (source.day === day && source.mealType === mealType) {
        tappedMealSource = null;
        refreshPlanCellStates();
        return;
    }

    const moved = moveMealEntry(source.day, source.mealType, day, mealType);

    if (!moved && source.mealType !== mealType) {
        alert("Du kannst eine Mahlzeit nur in das passende Mahlzeitenfeld verschieben.");
    }

    tappedMealSource = null;
    refreshPlanCellStates();
}

function handlePlanCellDragStart(event) {
    const handle = event.currentTarget;
    const cell = handle.closest(".plan-input-cell");
    const select = cell?.querySelector("select");

    if (!cell || !select || !select.value) {
        event.preventDefault();
        return;
    }

    draggedMealSource = {
        day: select.dataset.day,
        mealType: select.dataset.mealType,
        value: select.value
    };

    cell.classList.add("is-dragging");

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify(draggedMealSource));
    }
}

function handlePlanCellDragOver(event) {
    if (!draggedMealSource) return;

    const targetCell = event.currentTarget;
    const targetMealType = targetCell.dataset.mealType;

    if (draggedMealSource.mealType !== targetMealType) {
        return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
}

function handlePlanCellDragEnter(event) {
    if (!draggedMealSource) return;

    const targetCell = event.currentTarget;
    const targetMealType = targetCell.dataset.mealType;

    if (draggedMealSource.mealType !== targetMealType) {
        return;
    }

    targetCell.classList.add("is-drop-target");
}

function handlePlanCellDragLeave(event) {
    event.currentTarget.classList.remove("is-drop-target");
}

function handlePlanCellDrop(event) {
    event.preventDefault();

    const targetCell = event.currentTarget;
    targetCell.classList.remove("is-drop-target");

    if (!draggedMealSource) return;

    const targetDay = targetCell.dataset.day;
    const targetMealType = targetCell.dataset.mealType;

    moveMealEntry(
        draggedMealSource.day,
        draggedMealSource.mealType,
        targetDay,
        targetMealType
    );
}

function handlePlanCellDragEnd(event) {
    document.querySelectorAll(".plan-input-cell").forEach(cell => {
        cell.classList.remove("is-dragging", "is-drop-target");
    });

    draggedMealSource = null;
}

function handlePlanCellDragOver(event) {
    event.preventDefault();

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
}

function handlePlanCellDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add("is-drop-target");
}

function handlePlanCellDragLeave(event) {
    event.currentTarget.classList.remove("is-drop-target");
}

function handlePlanCellDrop(event) {
    event.preventDefault();

    const targetCell = event.currentTarget;
    targetCell.classList.remove("is-drop-target");

    if (!draggedMealSource) return;

    const targetSelect = targetCell.querySelector("select");
    if (!targetSelect) return;

    const targetDay = targetSelect.dataset.day;
    const targetMealType = targetSelect.dataset.mealType;

    const sourceSelect = document.querySelector(
        `#meal-table select[data-day="${draggedMealSource.day}"][data-meal-type="${draggedMealSource.mealType}"]`
    );

    if (!sourceSelect) return;

    const sourceValue = sourceSelect.value;
    const targetValue = targetSelect.value;

    if (
        draggedMealSource.day === targetDay &&
        draggedMealSource.mealType === targetMealType
    ) {
        return;
    }

    sourceSelect.value = targetValue || "";
    targetSelect.value = sourceValue || "";

    calculateCalories();
    refreshPlanCellStates();
            tappedMealSource = null;
            draggedMealSource = null;
}

function handlePlanCellDragEnd(event) {
    document.querySelectorAll(".plan-cell").forEach(cell => {
        cell.classList.remove("is-dragging", "is-drop-target");
    });

    draggedMealSource = null;
}

/* -------------------------------------- */
/* REZEPTBUCH */
/* -------------------------------------- */

function populateRecipeList() {
    const recipeList = document.getElementById("recipe-list");
    if (!recipeList) return;

    recipeList.innerHTML = "";

    const visibleRecipes = getFilteredAndSortedRecipes();

    if (visibleRecipes.length === 0) {
        recipeList.innerHTML = `
            <li class="recipe-empty-state">
                Keine passenden Rezepte gefunden.
            </li>
        `;
        return;
    }

    visibleRecipes.forEach(recipe => {
        const li = document.createElement("li");
        li.classList.add("recipe-item");
        li.setAttribute("data-id", recipe.id);

        const recipeMain = document.createElement("div");
        recipeMain.classList.add("recipe-main");

        const recipeName = document.createElement("a");
        recipeName.href = `/recipeInstructions.html?id=${recipe.id}`;
        recipeName.textContent = recipe.name;
        recipeName.classList.add("recipe-link");

        const recipeMeta = document.createElement("div");
        recipeMeta.classList.add("recipe-meta");

        const mealTypesWrapper = document.createElement("div");
        mealTypesWrapper.classList.add("meal-tags");

        if (Array.isArray(recipe.mealTypes)) {
            recipe.mealTypes.forEach(type => {
                const tag = document.createElement("span");
                tag.classList.add("meal-tag");

                if (type === "breakfast") tag.textContent = "Frühstück";
                if (type === "lunch") tag.textContent = "Mittagessen";
                if (type === "dinner") tag.textContent = "Abendessen";
                if (type === "snack") tag.textContent = "Snack";

                mealTypesWrapper.appendChild(tag);
            });
        }

        const recipeCalories = document.createElement("span");
        recipeCalories.classList.add("recipe-calories-badge");
        recipeCalories.textContent = `${recipe.calories} kcal`;

        recipeMeta.appendChild(mealTypesWrapper);
        recipeMeta.appendChild(recipeCalories);

        recipeMain.appendChild(recipeName);
        recipeMain.appendChild(recipeMeta);

        const iconContainer = document.createElement("div");
        iconContainer.classList.add("recipe-icons");

        const editButton = document.createElement("button");
        editButton.innerHTML = "✏️";
        editButton.classList.add("edit-button");
        editButton.type = "button";
        editButton.title = "Rezept bearbeiten";
        editButton.onclick = () => {
            window.location.href = `/recipeDetails.html?id=${recipe.id}`;
        };

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = "🗑️";
        deleteButton.classList.add("recipe-delete-btn");
        deleteButton.type = "button";
        deleteButton.title = "Rezept löschen";
        deleteButton.onclick = () => deleteRecipe(recipe.id);

        iconContainer.appendChild(editButton);
        iconContainer.appendChild(deleteButton);

        li.appendChild(recipeMain);
        li.appendChild(iconContainer);

        recipeList.appendChild(li);
    });
}

/* -------------------------------------- */
/* REZEPT HINZUFÜGEN */
/* -------------------------------------- */

function toggleRecipeToolbar() {
    const panel = document.getElementById("recipe-add-panel");
    const toggleButton = document.querySelector(".recipe-toolbar-toggle-button");

    if (!panel || !toggleButton) return;

    const isHidden = panel.classList.contains("is-hidden");

    panel.classList.toggle("is-hidden");

    if (isHidden) {
        toggleButton.textContent = "✕";
        toggleButton.title = "Eingabe schließen";
        toggleButton.setAttribute("aria-label", "Eingabe schließen");
    } else {
        toggleButton.textContent = "＋";
        toggleButton.title = "Rezept hinzufügen";
        toggleButton.setAttribute("aria-label", "Rezept hinzufügen");
    }
}

function togglePlanSaveToolbar() {
    const panel = document.getElementById("plan-save-panel");
    const toggleButton = document.querySelector(".toolbar-toggle-save-button");

    if (!panel || !toggleButton) return;

    const isHidden = panel.classList.contains("is-hidden");

    panel.classList.toggle("is-hidden");

    if (isHidden) {
        toggleButton.textContent = "✕";
        toggleButton.title = "Eingabe schließen";
        toggleButton.setAttribute("aria-label", "Eingabe schließen");
    } else {
        toggleButton.textContent = "＋";
        toggleButton.title = "Neuen Plan anlegen";
        toggleButton.setAttribute("aria-label", "Neuen Plan anlegen");
    }
}

function allowOnlyWholeNumbers(event) {
    event.target.value = event.target.value.replace(/\D/g, "");
}

function addRecipe() {
    const name = document.getElementById("recipe-name")?.value?.trim();
    const caloriesRaw = document.getElementById("recipe-calories")?.value?.trim();
    const portionsRaw = document.getElementById("recipe-portions")?.value?.trim();

    const calories = parseInt(caloriesRaw, 10);
    const portions = parseInt(portionsRaw, 10);

    const mealTypes = Array.from(document.querySelectorAll(".recipe-checkboxes input:checked"))
        .map(checkbox => checkbox.value);

    const caloriesIsValid = /^\d+$/.test(caloriesRaw || "");
    const portionsIsValid = /^\d+$/.test(portionsRaw || "") && portions > 0;

    if (!name || !caloriesIsValid || !portionsIsValid || mealTypes.length === 0) {
        alert("Bitte alle Felder korrekt ausfüllen, nur ganze Zahlen verwenden und mindestens eine Mahlzeit auswählen.");
        return;
    }

    fetch(`${API_URL}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, calories, portions, mealTypes })
    })
    .then(response => response.json())
    .then(() => {
        console.log("✅ Rezept gespeichert");
        loadRecipes();

        const nameInput = document.getElementById("recipe-name");
        const caloriesInput = document.getElementById("recipe-calories");
        const portionsInput = document.getElementById("recipe-portions");
        const panel = document.getElementById("recipe-add-panel");
        const toggleButton = document.querySelector(".recipe-toolbar-toggle-button");

        if (nameInput) nameInput.value = "";
        if (caloriesInput) caloriesInput.value = "";
        if (portionsInput) portionsInput.value = "";

        document.querySelectorAll(".recipe-checkboxes input").forEach(cb => {
            cb.checked = false;
        });

        if (panel) {
            panel.classList.add("is-hidden");
        }

        if (toggleButton) {
            toggleButton.textContent = "＋";
            toggleButton.title = "Rezept hinzufügen";
            toggleButton.setAttribute("aria-label", "Rezept hinzufügen");
        }
    })
    .catch(error => console.error("❌ Fehler beim Speichern:", error));
}

/* -------------------------------------- */
/* REZEPT LÖSCHEN */
/* -------------------------------------- */

function deleteRecipe(recipeId) {
    if (!confirm("Möchtest du dieses Rezept wirklich löschen?")) return;

    fetch(`${API_URL}/recipes/${recipeId}`, { method: "DELETE" })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Fehler beim Löschen: ${response.status}`);
            }

            console.log(`✅ Rezept mit ID ${recipeId} gelöscht`);
            recipes = recipes.filter(recipe => recipe.id !== recipeId);

            populateRecipeList();
            populateMealTable();
            calculateCalories();
            tappedMealSource = null;
            draggedMealSource = null;
            refreshPlanCellStates();
        })
        .catch(error => console.error("❌ Fehler beim Löschen:", error));
}

/* -------------------------------------- */
/* WOCHENPLAN SPEICHERN */
/* -------------------------------------- */

function saveMealPlan() {
    const name = document.getElementById("plan-name")?.value?.trim();
    if (!name) {
        alert("Bitte einen Namen für den Plan eingeben!");
        return;
    }

    const planData = WEEK_DAYS.map(day => {
        const meals = {};

        MEAL_ROWS.forEach(meal => {
            const select = document.querySelector(
                `#meal-table select[data-day="${day}"][data-meal-type="${meal.key}"]`
            );
            meals[meal.key] = select ? (select.value || null) : null;
        });

        return { day, meals };
    });

    fetch(`${API_URL}/meal_plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data: planData })
    })
    .then(response => response.json())
    .then((savedPlan) => {
        console.log("✅ Wochenplan gespeichert");
        loadMealPlans();

        activeMealPlanId = savedPlan.id;
        activeMealPlanName = savedPlan.name;

        const currentPlanName = document.getElementById("current-plan-name");
        if (currentPlanName) {
            currentPlanName.textContent = `Aktueller Wochenplan: ${savedPlan.name}`;
        }

        const planNameInput = document.getElementById("plan-name");
        if (planNameInput) {
            planNameInput.value = "";
        }

        const panel = document.getElementById("plan-save-panel");
        const toggleButton = document.querySelector(".toolbar-toggle-save-button");

        if (panel) {
            panel.classList.add("is-hidden");
        }

        if (toggleButton) {
            toggleButton.textContent = "＋";
            toggleButton.title = "Neuen Plan anlegen";
            toggleButton.setAttribute("aria-label", "Neuen Plan anlegen");
        }
    })
    .catch(error => console.error("❌ Fehler beim Speichern des Plans:", error));
}

/* -------------------------------------- */
/* WOCHENPLAN LÖSCHEN */
/* -------------------------------------- */

function deleteMealPlan() {
    if (!activeMealPlanId) {
        alert("Bitte zuerst einen Wochenplan laden.");
        return;
    }

    if (!confirm("Möchtest du diesen Wochenplan wirklich löschen?")) return;

    fetch(`${API_URL}/meal_plans/${activeMealPlanId}`, { method: "DELETE" })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Fehler beim Löschen: ${response.status}`);
            }

            console.log(`✅ Wochenplan mit ID ${activeMealPlanId} gelöscht`);

            activeMealPlanId = null;
            activeMealPlanName = "";

            loadMealPlans();

            const currentPlanName = document.getElementById("current-plan-name");
            if (currentPlanName) {
                currentPlanName.textContent = "Aktueller Wochenplan: keiner";
            }

            document.querySelectorAll(`#meal-table select`).forEach(select => {
                select.value = "";
            });

            calculateCalories();
        })
        .catch(error => console.error("❌ Fehler beim Löschen des Plans:", error));
}

/* -------------------------------------- */
/* WOCHENPLAN AKTUALISIEREN */
/* -------------------------------------- */

function updateMealPlan() {
    if (!activeMealPlanId) {
        alert("Bitte zuerst einen Wochenplan laden.");
        return;
    }

    if (!confirm("Möchtest du diesen Wochenplan wirklich überschreiben?")) return;

    const planData = WEEK_DAYS.map(day => {
        const meals = {};

        MEAL_ROWS.forEach(meal => {
            const select = document.querySelector(
                `#meal-table select[data-day="${day}"][data-meal-type="${meal.key}"]`
            );
            meals[meal.key] = select ? (select.value || null) : null;
        });

        return { day, meals };
    });

    fetch(`${API_URL}/meal_plans/${activeMealPlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeMealPlanName, data: planData })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Fehler beim Aktualisieren: ${response.status}`);
        }

        console.log(`✅ Wochenplan mit ID ${activeMealPlanId} überschrieben`);
        loadMealPlans();

        const currentPlanName = document.getElementById("current-plan-name");
        if (currentPlanName) {
            currentPlanName.textContent = `Aktueller Wochenplan: ${activeMealPlanName}`;
        }
    })
    .catch(error => console.error("❌ Fehler beim Aktualisieren des Plans:", error));
}

/* -------------------------------------- */
/* ALLE WOCHENPLÄNE LADEN */
/* -------------------------------------- */

function loadMealPlans() {
    fetch(`${API_URL}/meal_plans`)
        .then(response => response.json())
        .then((plans) => {
            console.log("✅ Wochenpläne geladen:", plans);

            const planList = document.getElementById("plan-list");
            if (!planList) return;

            planList.innerHTML = '<option value="">Plan laden</option>';

            plans.forEach(plan => {
                const option = document.createElement("option");
                option.value = plan.id;
                option.textContent = plan.name;
                planList.appendChild(option);
            });
        })
        .catch(error => console.error("❌ Fehler beim Laden der Pläne:", error));
}

/* -------------------------------------- */
/* WOCHENPLAN LADEN */
/* -------------------------------------- */

function loadMealPlan() {
    const planId = document.getElementById("plan-list")?.value;
    if (!planId) {
        alert("Bitte einen Plan auswählen!");
        return;
    }

    fetch(`${API_URL}/meal_plans/${planId}`)
        .then(response => response.json())
        .then((plan) => {
            console.log("✅ Plan geladen:", plan);

            if (!plan || !Array.isArray(plan.data)) return;

            plan.data.forEach(dayEntry => {
                const day = dayEntry.day;

                Object.entries(dayEntry.meals || {}).forEach(([mealType, recipeId]) => {
                    const select = document.querySelector(
                        `#meal-table select[data-day="${day}"][data-meal-type="${mealType}"]`
                    );

                    if (select) {
                        select.value = recipeId || "";
                    }
                });
            });

            activeMealPlanId = plan.id;
            activeMealPlanName = plan.name;

            calculateCalories();

refreshPlanCellStates();
const currentPlanName = document.getElementById("current-plan-name");
            if (currentPlanName) {
                currentPlanName.textContent = `Aktueller Wochenplan: ${plan.name}`;
            }
        })
        .catch(error => console.error("❌ Fehler beim Laden des Plans:", error));
}

function changeSelectedDay(direction) {
    const index = WEEK_DAYS.indexOf(selectedDay);
    if (index === -1) return;

    let newIndex = index + direction;

    if (newIndex < 0) {
        newIndex = WEEK_DAYS.length - 1;
    }

    if (newIndex >= WEEK_DAYS.length) {
        newIndex = 0;
    }

    selectedDay = WEEK_DAYS[newIndex];

    updateSelectedDayView();
}

/* -------------------------------------- */
/* INITIALISIERUNG */
/* -------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    loadMealPlans();
    loadRecipes();

    const planNameInput = document.getElementById("plan-name");
    if (planNameInput) {
        planNameInput.value = "";
    }

    const currentPlanName = document.getElementById("current-plan-name");
    if (currentPlanName && !currentPlanName.textContent.trim()) {
        currentPlanName.textContent = "Kein Plan geladen";
    }

    const recipeCaloriesInput = document.getElementById("recipe-calories");
    if (recipeCaloriesInput) {
        recipeCaloriesInput.addEventListener("input", allowOnlyWholeNumbers);
    }

    const recipeSearchInput = document.getElementById("recipe-search");
    if (recipeSearchInput) {
        recipeSearchInput.addEventListener("input", populateRecipeList);
    }

    const recipeSortSelect = document.getElementById("recipe-sort");
    if (recipeSortSelect) {
        recipeSortSelect.addEventListener("change", populateRecipeList);
    }

    const planListSelect = document.getElementById("plan-list");
    if (planListSelect) {
        planListSelect.addEventListener("change", () => {
            if (planListSelect.value) {
                loadMealPlan();
            }
        });
    }
});