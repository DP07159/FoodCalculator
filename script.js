const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];

// **Rezepte laden**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then((data) => {
      recipes = data;
      console.log("✅ Rezepte erfolgreich geladen:", recipes);
      populateMealTable(); // ✅ Tabelle wird hier aufgerufen
      populateRecipeList(); // ✅ Rezeptbuch wird hier aufgerufen
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

    row.querySelector(".total-calories").textContent = `${totalCalories} kcal`;
    const remainingCalories = DAILY_CALORIE_LIMIT - totalCalories;
    const remainingCaloriesCell = row.querySelector(".remaining-calories");
    remainingCaloriesCell.textContent = `${remainingCalories} kcal`;
    remainingCaloriesCell.style.color = remainingCalories < 0 ? "red" : "green";
  });
}

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
  .then((newRecipe) => {
    console.log("✅ Rezept gespeichert:", newRecipe);
    loadRecipes(); // ✅ Rezepte neu laden, damit das Rezeptbuch aktualisiert wird
  })
  .catch(error => console.error("❌ Fehler beim Speichern des Rezepts:", error));
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
      mealData[day][select.dataset.mealType] = select.value || null;
    });
  });

  fetch(`${API_URL}/meal_plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data: mealData })
  })
  .then(response => response.json())
  .then(() => {
    console.log("✅ Wochenplan gespeichert!");
    loadMealPlans();
    document.getElementById("plan-name").value = "";
  })
  .catch(error => console.error("❌ Fehler beim Speichern des Wochenplans:", error));
}

// **Gespeicherte Wochenpläne laden**
function loadMealPlans() {
  fetch(`${API_URL}/meal_plans`)
    .then(response => response.json())
    .then(data => {
      const select = document.getElementById("plan-select");
      select.innerHTML = `<option value="">Gespeicherte Pläne laden...</option>`;
      data.forEach(plan => {
        const option = document.createElement("option");
        option.value = plan.id;
        option.textContent = plan.name;
        select.appendChild(option);
      });
    })
    .catch(error => console.error("❌ Fehler beim Laden der Wochenpläne:", error));
}

// **Einen Wochenplan laden**
function loadSelectedMealPlan() {
  const selectedPlanId = document.getElementById("plan-select").value;
  if (!selectedPlanId) return alert("Bitte einen Plan auswählen!");

  fetch(`${API_URL}/meal_plans/${selectedPlanId}`)
    .then(response => response.json())
    .then(plan => {
      console.log("✅ Geladener Plan:", plan);
      document.querySelectorAll("#meal-table tr").forEach(row => {
        const day = row.children[0].textContent;
        if (plan.data[day]) {
          row.querySelectorAll("select").forEach(select => {
            select.value = plan.data[day][select.dataset.mealType] || "";
          });
        }
      });
      calculateCalories(); // Nach dem Laden die Kalorien neu berechnen
    })
    .catch(error => console.error("❌ Fehler beim Laden des Plans:", error));
}

function populateRecipeList() {
  const recipeList = document.getElementById("recipe-list");
  if (!recipeList) {
    console.error("❌ Fehler: `recipe-list` Element nicht gefunden!");
    return;
  }

  recipeList.innerHTML = ""; // 🔥 Sicherstellen, dass alte Einträge entfernt werden

  recipes.forEach(recipe => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${recipe.name}</strong> - ${recipe.calories} kcal | ${recipe.mealTypes.join(", ")}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Löschen";
    deleteButton.onclick = () => deleteRecipe(recipe.id);

    li.appendChild(deleteButton);
    recipeList.appendChild(li);
  });

  console.log("✅ Rezeptbuch aktualisiert!");
}

document.addEventListener("DOMContentLoaded", loadRecipes);
