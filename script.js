const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;

const weekDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
let recipes = [];

// **Rezepte laden**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then((data) => {
      recipes = data;
      populateMealTable();
      populateRecipeList();
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Mahlzeitentabelle erstellen**
function populateMealTable() {
  const mealTable = document.getElementById("meal-table");
  mealTable.innerHTML = "";

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
    row.appendChild(totalCaloriesCell);

    const remainingCaloriesCell = document.createElement("td");
    remainingCaloriesCell.classList.add("remaining-calories");
    row.appendChild(remainingCaloriesCell);

    mealTable.appendChild(row);
  });
}

// **Kalorien berechnen**
function calculateCalories() {
  document.querySelectorAll("#meal-table tr").forEach(row => {
    let totalCalories = 0;

    row.querySelectorAll("select").forEach(select => {
      const selectedRecipe = recipes.find(recipe => recipe.id == select.value);
      if (selectedRecipe) {
        totalCalories += selectedRecipe.calories;
      }
    });

    const totalCaloriesCell = row.querySelector(".total-calories");
    totalCaloriesCell.textContent = `${totalCalories} kcal`;

    const remainingCalories = DAILY_CALORIE_LIMIT - totalCalories;
    const remainingCaloriesCell = row.querySelector(".remaining-calories");
    remainingCaloriesCell.textContent = `${remainingCalories} kcal`;
    remainingCaloriesCell.style.color = remainingCalories < 0 ? "red" : "green";
  });
}

document.addEventListener("DOMContentLoaded", loadRecipes);
