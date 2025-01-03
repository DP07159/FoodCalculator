const recipesUrl = "https://foodcalculator-server.onrender.com/recipes"; // Backend-URL für Rezepte
const plansUrl = "https://<deine-render-url>/plans"; // Backend-URL für Wochenpläne
const DAILY_LIMIT = 1500;

let recipes = []; // Rezepte werden hier gespeichert
const tableBody = document.getElementById("table-body");
const recipeForm = document.getElementById("recipe-form");
const recipeNameInput = document.getElementById("recipe-name");
const recipeCaloriesInput = document.getElementById("recipe-calories");
const recipeMealTypeInput = document.getElementById("recipe-meal-type");
const recipeList = document.getElementById("recipe-list"); // Container für die Rezeptliste
const savePlanButton = document.getElementById("save-plan");
const loadPlanButton = document.getElementById("load-plan");

// Funktion: Dropdowns aktualisieren
function updateDropdown(select, mealType) {
  select.innerHTML = `<option value="">Select</option>`;
  recipes
    .filter((recipe) => recipe.mealTypes.includes(mealType))
    .forEach((recipe) => {
      const option = document.createElement("option");
      option.value = recipe.id;
      option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
      select.appendChild(option);
    });
}

// Funktion: Tabelle für einen Tag aktualisieren
function updateTableRow(dayIndex, row, meals) {
  let totalCalories = 0;

  // Kalorien für jede Mahlzeit summieren
  Object.values(meals).forEach((meal) => {
    if (meal) {
      totalCalories += meal.calories;
    }
  });

  const remainingCalories = DAILY_LIMIT - totalCalories;

  // Gesamtkalorien und verbleibende Kalorien in der Tabelle anzeigen
  const totalCaloriesCell = row.cells[5];
  const remainingCaloriesCell = row.cells[6];

  totalCaloriesCell.textContent = `${totalCalories} kcal`;
  remainingCaloriesCell.textContent = `${remainingCalories} kcal`;

  // Farben für verbleibende Kalorien setzen
  if (remainingCalories >= 0) {
    remainingCaloriesCell.className = "green";
  } else {
    remainingCaloriesCell.className = "red";
  }
}

// Funktion: Tabelle initialisieren
function initializeTable() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const selectedMeals = Array.from({ length: 7 }, () => ({
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  }));

  days.forEach((day, dayIndex) => {
    const row = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = day;
    row.appendChild(dayCell);

    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType) => {
      const mealCell = document.createElement("td");
      const select = document.createElement("select");

      updateDropdown(select, mealType);

      select.addEventListener("change", (e) => {
        const recipeId = parseInt(e.target.value);
        const selectedRecipe = recipes.find((r) => r.id === recipeId) || null;

        selectedMeals[dayIndex][mealType] = selectedRecipe;
        updateTableRow(dayIndex, row, selectedMeals[dayIndex]);
      });

      mealCell.appendChild(select);
      row.appendChild(mealCell);
    });

    const totalCaloriesCell = document.createElement("td");
    const remainingCaloriesCell = document.createElement("td");

    row.appendChild(totalCaloriesCell);
    row.appendChild(remainingCaloriesCell);

    tableBody.appendChild(row);

    updateTableRow(dayIndex, row, selectedMeals[dayIndex]);
  });

  console.log("Tabelle mit Wochentagen erstellt."); // Debug-Ausgabe
}

// Funktion: Rezeptliste anzeigen
function displayRecipeList() {
  recipeList.innerHTML = ""; // Rezeptliste leeren

  if (recipes.length === 0) {
    recipeList.innerHTML = "<p>No recipes available.</p>";
    return;
  }

  const ul = document.createElement("ul");
  recipes.forEach((recipe) => {
    const li = document.createElement("li");
    li.textContent = `${recipe.name} (${recipe.calories} kcal) - Suitable for: ${recipe.mealTypes.join(", ")}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteRecipe(recipe.id));

    li.appendChild(deleteButton);
    ul.appendChild(li);
  });

  recipeList.appendChild(ul);
}

// Funktion: Rezept löschen
function deleteRecipe(recipeId) {
  fetch(`${recipesUrl}/${recipeId}`, {
    method: "DELETE",
  })
    .then(() => {
      console.log("Rezept gelöscht:", recipeId); // Debug-Ausgabe
      recipes = recipes.filter((recipe) => recipe.id !== recipeId);
      displayRecipeList();
      tableBody.querySelectorAll("select").forEach((select, index) => {
        const mealType = ["breakfast", "lunch", "dinner", "snack"][index % 4];
        updateDropdown(select, mealType);
      });
    })
    .catch((error) => console.error("Fehler beim Löschen des Rezepts:", error));
}

// Funktion: Wochenplan speichern
function savePlan() {
  const plan = [];
  tableBody.querySelectorAll("tr").forEach((row, rowIndex) => {
    const meals = {};
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
      const select = row.querySelectorAll("select")[index];
      const recipeId = parseInt(select.value);
      meals[mealType] = recipeId || null;
    });
    plan.push(meals);
  });

  fetch(plansUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
    .then(() => {
      console.log("Wochenplan gespeichert.");
    })
    .catch((error) => console.error("Fehler beim Speichern des Wochenplans:", error));
}

// Funktion: Wochenplan laden
function loadPlan() {
  fetch(plansUrl)
    .then((response) => response.json())
    .then((plan) => {
      plan.forEach((meals, rowIndex) => {
        const row = tableBody.querySelectorAll("tr")[rowIndex];
        ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
          const select = row.querySelectorAll("select")[index];
          const recipeId = meals[mealType];
          if (recipeId) {
            select.value = recipeId;
          } else {
            select.value = "";
          }
        });
      });
      console.log("Wochenplan geladen.");
    })
    .catch((error) => console.error("Fehler beim Laden des Wochenplans:", error));
}

// Event-Listener für Wochenplan speichern und laden
savePlanButton.addEventListener("click", savePlan);
loadPlanButton.addEventListener("click", loadPlan);

// Rezepte vom Backend laden
fetch(recipesUrl)
  .then((response) => response.json())
  .then((data) => {
    recipes = data;
    displayRecipeList();
    initializeTable();
  });
