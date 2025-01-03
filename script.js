const recipesUrl = "https://foodcalculator-server.onrender.com/recipes"; // Backend-Endpunkt
const DAILY_LIMIT = 1500;

let recipes = [];
const tableBody = document.getElementById("table-body");
const recipeForm = document.getElementById("recipe-form");
const recipeNameInput = document.getElementById("recipe-name");
const recipeCaloriesInput = document.getElementById("recipe-calories");
const recipeMealTypeInput = document.getElementById("recipe-meal-type");

// Rezepte laden
fetch(recipesUrl)
  .then((response) => response.json())
  .then((data) => {
    recipes = data;
    createTable();
  });

// Tabelle erstellen
function createTable() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
        updateTableRow(dayIndex, row);
      });

      mealCell.appendChild(select);
      row.appendChild(mealCell);
    });

    const totalCaloriesCell = document.createElement("td");
    const remainingCaloriesCell = document.createElement("td");

    row.appendChild(totalCaloriesCell);
    row.appendChild(remainingCaloriesCell);

    tableBody.appendChild(row);
    updateTableRow(dayIndex, row);
  });
}

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
      recipes.push(savedRecipe);
      tableBody.querySelectorAll("select").forEach((select) => {
        const mealType = select.closest("td").previousElementSibling.textContent.toLowerCase();
        updateDropdown(select, mealType);
      });
      recipeForm.reset();
    });
});
