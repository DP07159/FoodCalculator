const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;

const weekDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
let recipes = [];

// **Rezepte laden & Dropdowns aktualisieren**
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

// **Mahlzeitentabelle aufbauen**
function populateMealTable() {
  const mealTable = document.getElementById("meal-table");
  mealTable.innerHTML = "";

  weekDays.forEach((day) => {
    const row = document.createElement("tr");
    
    // **Tag anzeigen**
    const dayCell = document.createElement("td");
    dayCell.textContent = day;
    row.appendChild(dayCell);

    // **Dropdowns für Mahlzeiten**
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

    // **Spalten für Kalorien & Restkalorien**
    const totalCaloriesCell = document.createElement("td");
    totalCaloriesCell.textContent = "0 kcal";
    totalCaloriesCell.classList.add("total-calories");
    row.appendChild(totalCaloriesCell);

    const remainingCaloriesCell = document.createElement("td");
    remainingCaloriesCell.textContent = `${DAILY_CALORIE_LIMIT} kcal`;
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

    // **Gesamtkalorien setzen**
    const totalCaloriesCell = row.querySelector(".total-calories");
    totalCaloriesCell.textContent = `${totalCalories} kcal`;

    // **Restkalorien setzen & farbig hervorheben**
    const remainingCalories = DAILY_CALORIE_LIMIT - totalCalories;
    const remainingCaloriesCell = row.querySelector(".remaining-calories");
    remainingCaloriesCell.textContent = `${remainingCalories} kcal`;
    remainingCaloriesCell.style.color = remainingCalories < 0 ? "red" : "green";
  });
}

// **Rezepte in der Rezeptliste anzeigen**
function populateRecipeList() {
  const recipeList = document.getElementById("recipe-list");
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

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);

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

// **Rezepte laden & anzeigen**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then((recipes) => {
      const recipeList = document.getElementById("recipe-list");
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
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
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

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);
