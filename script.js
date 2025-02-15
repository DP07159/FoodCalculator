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
      populateMealTable();
      populateRecipeList();
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

// **Rezeptbuch mit gespeicherten Rezepten anzeigen**
function populateRecipeList() {
  const recipeList = document.getElementById("recipe-list");
  if (!recipeList) {
    console.error("❌ Fehler: Element mit ID 'recipe-list' nicht gefunden!");
    return;
  }

  recipeList.innerHTML = "";

  recipes.forEach(recipe => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${recipe.name}</strong> - ${recipe.calories} kcal | ${recipe.mealTypes.join(", ")}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Löschen";
    deleteButton.onclick = () => deleteRecipe(recipe.id);

    li.appendChild(deleteButton);
    recipeList.appendChild(li);
  });
}


// **Rezept hinzufügen**
function addRecipe() {
  const name = document.getElementById("recipe-name").value;
  const calories = parseInt(document.getElementById("recipe-calories").value);
  const mealTypes = Array.from(document.getElementById("recipe-mealTypes").selectedOptions).map(option => option.value);

  if (!name || !calories || mealTypes.length === 0) {
    alert("Bitte alle Felder ausfüllen.");
    return;
  }

  fetch(`${API_URL}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, calories, mealTypes })
  })
  .then(response => response.json())
  .then(() => {
    console.log("✅ Rezept gespeichert");
    loadRecipes();
  })
  .catch(error => console.error("❌ Fehler beim Speichern:", error));
}

// **Rezept löschen**
function deleteRecipe(recipeId) {
  fetch(`${API_URL}/recipe/${recipeId}`, { method: "DELETE" })
    .then(() => {
      console.log(`✅ Rezept mit ID ${recipeId} gelöscht`);
      loadRecipes();
    })
    .catch(error => console.error("❌ Fehler beim Löschen:", error));
}

// **Wochenplan speichern**
function saveMealPlan() {
  const name = document.getElementById("plan-name").value;
  if (!name) return alert("Bitte einen Namen eingeben!");

  const mealData = {};
  document.querySelectorAll("#meal-table tr").forEach(row => {
    const day = row.children[0].textContent;
    mealData[day] = {};
    row.querySelectorAll("select").forEach(select => {
      mealData[day][select.dataset.mealType] = select.value;
    });
  });

  fetch(`${API_URL}/meal_plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data: mealData })
  }).then(() => loadMealPlans());
}

// **Wochenplan laden**
function loadMealPlans() {
  fetch(`${API_URL}/meal_plans`)
    .then(response => response.json())
    .then(data => {
      mealPlans = data;
      const select = document.getElementById("plan-select");
      select.innerHTML = `<option value="">Gespeicherte Pläne laden...</option>`;
      data.forEach(plan => {
        const option = document.createElement("option");
        option.value = plan.id;
        option.textContent = plan.name;
        select.appendChild(option);
      });
    });
}

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);
