const recipesUrl = "https://foodcalculator-server.onrender.com/recipes"; // Backend-URL
const DAILY_LIMIT = 1500;

let recipes = []; // Rezepte werden hier gespeichert
const tableBody = document.getElementById("table-body");
const recipeForm = document.getElementById("recipe-form");
const recipeNameInput = document.getElementById("recipe-name");
const recipeCaloriesInput = document.getElementById("recipe-calories");
const recipeMealTypeInput = document.getElementById("recipe-meal-type");
const recipeList = document.getElementById("recipe-list"); // Container für die Rezeptliste

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
    ul.appendChild(li);
  });

  recipeList.appendChild(ul);
}

// Rezepte vom Backend laden
fetch(recipesUrl)
  .then((response) => response.json())
  .then((data) => {
    console.log("Rezepte geladen:", data); // Debug-Ausgabe
    recipes = data;

    // Dropdown-Menüs und Rezeptliste aktualisieren
    tableBody.querySelectorAll("select").forEach((select, index) => {
      const mealType = ["breakfast", "lunch", "dinner", "snack"][index % 4];
      updateDropdown(select, mealType);
    });

    displayRecipeList();
  })
  .catch((error) => console.error("Fehler beim Laden der Rezepte:", error));

// Neues Rezept hinzufügen
recipeForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = recipeNameInput.value;
  const calories = parseInt(recipeCaloriesInput.value);
  const mealTypes = Array.from(recipeMealTypeInput.selectedOptions).map((option) => option.value);

  const newRecipe = { name, calories, mealTypes };

  fetch(recipesUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newRecipe),
  })
    .then((response) => response.json())
    .then((savedRecipe) => {
      console.log("Neues Rezept gespeichert:", savedRecipe); // Debug-Ausgabe
      recipes.push(savedRecipe);

      // Dropdowns und Rezeptliste aktualisieren
      tableBody.querySelectorAll("select").forEach((select, index) => {
        const mealType = ["breakfast", "lunch", "dinner", "snack"][index % 4];
        updateDropdown(select, mealType);
      });

      displayRecipeList();

      recipeForm.reset();
    });
});

// Tabelle sofort initialisieren
initializeTable();
