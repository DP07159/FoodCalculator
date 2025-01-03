const recipesUrl = "https://<deine-render-url>/recipes"; // Backend-URL
const DAILY_LIMIT = 1500;

let recipes = []; // Rezepte werden hier gespeichert
const tableBody = document.getElementById("table-body");
const recipeForm = document.getElementById("recipe-form");
const recipeNameInput = document.getElementById("recipe-name");
const recipeCaloriesInput = document.getElementById("recipe-calories");
const recipeMealTypeInput = document.getElementById("recipe-meal-type");

// Tabelle mit Wochentagen sofort erstellen
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

      // Standardoption, wenn keine Rezepte vorhanden sind
      select.innerHTML = `<option value="">Select</option>`;
      mealCell.appendChild(select);
      row.appendChild(mealCell);
    });

    const totalCaloriesCell = document.createElement("td");
    const remainingCaloriesCell = document.createElement("td");

    row.appendChild(totalCaloriesCell);
    row.appendChild(remainingCaloriesCell);

    tableBody.appendChild(row);

    // Initiale Zeilenwerte setzen
    updateTableRow(dayIndex, row, selectedMeals[dayIndex]);
  });

  console.log("Tabelle mit Wochentagen erstellt."); // Debug-Ausgabe
}

// Tabelle aktualisieren, wenn Daten vorhanden sind
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

// Tabelle für einen Tag aktualisieren
function updateTableRow(dayIndex, row, meals) {
  const totalCalories = Object.values(meals).reduce((sum, meal) => {
    return sum + (meal ? meal.calories : 0);
  }, 0);

  const remainingCalories = DAILY_LIMIT - totalCalories;

  const totalCaloriesCell = row.cells[5];
  const remainingCaloriesCell = row.cells[6];

  totalCaloriesCell.textContent = `${totalCalories} kcal`;
  remainingCaloriesCell.textContent = `${remainingCalories} kcal`;

  remainingCaloriesCell.className = remainingCalories >= 0 ? "green" : "red";
}

// Rezepte laden
fetch(recipesUrl)
  .then((response) => response.json())
  .then((data) => {
    console.log("Rezepte geladen:", data); // Debug-Ausgabe
    recipes = data;
    // Dropdown-Menüs mit Rezeptdaten aktualisieren
    tableBody.querySelectorAll("select").forEach((select, index) => {
      const mealType = ["breakfast", "lunch", "dinner", "snack"][index % 4];
      updateDropdown(select, mealType);
    });
  })
  .catch((error) => console.error("Fehler beim Laden der Rezepte:", error));

// Rezept hinzufügen
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
      tableBody.querySelectorAll("select").forEach((select, index) => {
        const mealType = ["breakfast", "lunch", "dinner", "snack"][index % 4];
        updateDropdown(select, mealType);
      });
      recipeForm.reset();
    });
});

// Tabelle sofort initialisieren
initializeTable();
