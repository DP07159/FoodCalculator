const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];
let mealPlans = [];

// **Rezepte & Pläne laden**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then(data => {
      recipes = data;
      populateMealTable();  // ✅ Jetzt existiert diese Funktion!
      loadMealPlans();
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Mahlzeitentabelle aufbauen**
function populateMealTable() {
  const mealTable = document.getElementById("meal-table");
  mealTable.innerHTML = "";

  const weekDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  weekDays.forEach((day) => {
    const row = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = day;
    row.appendChild(dayCell);

    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType) => {
      const mealCell = document.createElement("td");
      const select = document.createElement("select");
      select.dataset.mealType = mealType;
      select.dataset.day = day;
      select.innerHTML = `<option value="">-- Wählen --</option>`;

      recipes.forEach(recipe => {
        if (recipe.mealTypes.includes(mealType)) {
          const option = document.createElement("option");
          option.value = recipe.id;
          option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
          select.appendChild(option);
        }
      });

      select.addEventListener("change", calculateCalories);
      mealCell.appendChild(select);
      row.appendChild(mealCell);
    });

    const totalCaloriesCell = document.createElement("td");
    totalCaloriesCell.classList.add("total-calories");
    totalCaloriesCell.textContent = "0 kcal";
    row.appendChild(totalCaloriesCell);

    const remainingCaloriesCell = document.createElement("td");
    remainingCaloriesCell.classList.add("remaining-calories");
    remainingCaloriesCell.textContent = `${DAILY_CALORIE_LIMIT} kcal`;
    row.appendChild(remainingCaloriesCell);

    mealTable.appendChild(row);
  });
}

// **Kalorien b
