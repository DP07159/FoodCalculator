const recipesUrl = "https://foodcalculator-server.onrender.com/recipes"; // Backend-URL für Rezepte
const plansUrl = "https://foodcalculator-server.onrender.com/plans"; // Backend-URL für Wochenpläne
const DAILY_LIMIT = 1500;

let recipes = []; // Rezepte werden hier gespeichert
let savedPlans = {}; // Gespeicherte Wochenpläne
const tableBody = document.getElementById("table-body");
const recipeForm = document.getElementById("recipe-form");
const recipeNameInput = document.getElementById("recipe-name");
const recipeCaloriesInput = document.getElementById("recipe-calories");
const mealTypeCheckboxes = document.querySelectorAll("#meal-type-checkboxes input");
const recipeList = document.getElementById("recipe-list");
const planNameInput = document.getElementById("plan-name");
const savePlanButton = document.getElementById("save-plan");
const loadPlanSelect = document.getElementById("load-plan");
const loadPlanButton = document.getElementById("load-plan-button");

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

// Funktion: Tabelle zurücksetzen und neu initialisieren
function resetTable() {
  tableBody.innerHTML = ""; // Tabelle leeren
  initializeTable(); // Tabelle neu aufbauen
}

// Funktion: Tabelle initialisieren
function initializeTable() {
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
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

      // Automatische Berechnung bei Dropdown-Änderung
      select.addEventListener("change", (e) => {
        const recipeId = parseInt(e.target.value);
        const selectedRecipe = recipes.find((r) => r.id === recipeId) || null;

        selectedMeals[dayIndex][mealType] = selectedRecipe;

        // Aktualisiere nur die aktuelle Zeile
        updateTableRow(dayIndex, row, selectedMeals[dayIndex]);

        // Aktualisiere die gesamte Tabelle
        console.log("Automatically recalculating table...");
        recalculateTable();
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
}

// Funktion: Tabelle für einen Tag aktualisieren
function updateTableRow(dayIndex, row, meals) {
  console.log(`--- Update Row for Day ${dayIndex + 1} ---`);
  console.log("Meals Data:", meals);

  let totalCalories = 0;

  Object.values(meals).forEach((meal) => {
    if (meal) {
      console.log(`Adding calories from meal: ${meal.name}, ${meal.calories} kcal`);
      totalCalories += meal.calories;
    }
  });

  console.log(`Total Calories for Day ${dayIndex + 1}: ${totalCalories}`);

  const remainingCalories = DAILY_LIMIT - totalCalories;
  console.log(`Remaining Calories for Day ${dayIndex + 1}: ${remainingCalories}`);

  const totalCaloriesCell = row.cells[5];
  const remainingCaloriesCell = row.cells[6];

  totalCaloriesCell.textContent = `${totalCalories} kcal`;
  remainingCaloriesCell.textContent = `${remainingCalories} kcal`;

  remainingCaloriesCell.className = remainingCalories >= 0 ? "green" : "red";

  console.log("--- End Update Row ---");
}

// Funktion: Gesamte Tabelle neu berechnen
function recalculateTable() {
  console.log("Recalculating entire table...");
  const rows = tableBody.querySelectorAll("tr");

  rows.forEach((row, rowIndex) => {
    const meals = {};
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
      const select = row.querySelectorAll("select")[index];
      const recipeId = parseInt(select.value);
      const recipe = recipes.find((r) => r.id === recipeId) || null;
      meals[mealType] = recipe;
    });

    updateTableRow(rowIndex, row, meals);
  });
}

// Funktion: Rezepte laden und anzeigen
function loadRecipes() {
  fetch(recipesUrl)
    .then((response) => response.json())
    .then((data) => {
      recipes = data;
      resetTable();
      displayRecipeList();
    })
    .catch((error) => console.error("Fehler beim Laden der Rezepte:", error));
}

// Funktion: Rezeptliste anzeigen
function displayRecipeList() {
  const recipeList = document.getElementById("recipe-list");
  recipeList.innerHTML = ""; // Liste zurücksetzen

  if (!recipes || recipes.length === 0) {
    console.log("Keine Rezepte gefunden.");
    recipeList.innerHTML = "<p>No recipes available.</p>";
    return;
  }

  console.log("Rezepte werden angezeigt:", recipes); // Debugging-Ausgabe

  const ul = document.createElement("ul");
  recipes.forEach((recipe) => {
    let mealTypesArray;

    try {
      console.log("🔍 Ursprünglicher Wert von mealTypes:", recipe.mealTypes);

      // Falls mealTypes ein String ist, versuche es zu parsen
      if (typeof recipe.mealTypes === "string") {
        mealTypesArray = JSON.parse(recipe.mealTypes);
        console.log("✅ Geparst zu:", mealTypesArray);
      } else {
        mealTypesArray = recipe.mealTypes;
      }

      // Falls das Ergebnis immer noch kein Array ist, mach es zu einem
      if (!Array.isArray(mealTypesArray)) {
        console.log("⚠ mealTypes war kein Array, umgewandelt in ein Array.");
        mealTypesArray = [mealTypesArray];
      }
    } catch (error) {
      console.error("❌ Fehler beim Parsen von mealTypes:", error, "Wert:", recipe.mealTypes);
      mealTypesArray = ["Unknown"]; // Fallback-Wert
    }

    console.log("🎯 Endgültiger Wert von mealTypes:", mealTypesArray);

    const li = document.createElement("li");
    li.textContent = `${recipe.name} (${recipe.calories} kcal) - Suitable for: ${mealTypesArray.join(", ")}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteRecipe(recipe.id));

    li.appendChild(deleteButton);
    ul.appendChild(li);
  });

  recipeList.appendChild(ul);
}

// Funktion: Rezept hinzufügen
recipeForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = recipeNameInput.value.trim();
  const calories = parseInt(recipeCaloriesInput.value);
  const mealTypes = Array.from(mealTypeCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  if (!name || isNaN(calories) || mealTypes.length === 0) {
    alert("Bitte alle Felder ausfüllen.");
    return;
  }

  const newRecipe = { name, calories, mealTypes };

  fetch(recipesUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newRecipe),
  })
    .then((response) => response.json())
    .then((savedRecipe) => {
      recipes.push(savedRecipe);
      displayRecipeList();
      resetTable();
      recipeForm.reset();
    })
    .catch((error) => console.error("Fehler beim Hinzufügen des Rezepts:", error));
});

// Funktion: Rezept löschen
function deleteRecipe(recipeId) {
  fetch(`${recipesUrl}/${recipeId}`, {
    method: "DELETE",
  })
    .then(() => {
      recipes = recipes.filter((recipe) => recipe.id !== recipeId);
      displayRecipeList();
      resetTable();
    })
    .catch((error) => console.error("Fehler beim Löschen des Rezepts:", error));
}

// Funktion: Wochenpläne laden
function loadPlans() {
  fetch(plansUrl)
    .then((response) => response.json())
    .then((plans) => {
      savedPlans = plans;
      loadPlanSelect.innerHTML = '<option value="">Wähle einen Wochenplan</option>';
      Object.keys(savedPlans).forEach((planName) => {
        const option = document.createElement("option");
        option.value = planName;
        option.textContent = planName;
        loadPlanSelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Fehler beim Laden der Pläne:", error));
}

// Funktion: Wochenplan laden
function loadPlan() {
  const selectedPlanName = loadPlanSelect.value;
  if (!selectedPlanName) {
    alert("Bitte wähle einen Wochenplan aus.");
    return;
  }

  const plan = savedPlans[selectedPlanName];
  if (!plan) {
    alert("Wochenplan nicht gefunden.");
    return;
  }

  resetTable();

  plan.forEach((meals, rowIndex) => {
    const row = tableBody.querySelectorAll("tr")[rowIndex];
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
      const select = row.querySelectorAll("select")[index];
      const meal = meals[mealType];

      if (meal) {
        const recipeExists = recipes.find((r) => r.id === meal.id);

        if (recipeExists) {
          select.value = meal.id;
          meals[mealType] = recipeExists; // Verknüpfe mit aktuellem Rezeptobjekt
        } else {
          select.value = ""; // Setze auf Standardwert
        }
      } else {
        select.value = ""; // Kein Rezept ausgewählt
      }
    });

    updateTableRow(rowIndex, row, meals);
  });

  // ** Automatische Berechnung nach Plan-Laden **
  console.log("Recalculating table after plan load...");
  recalculateTable(); // Berechnet alle Zeilen
}

// Funktion: Wochenplan speichern
function savePlan() {
  const planName = planNameInput.value.trim();
  if (!planName) {
    alert("Bitte gib einen Namen für den Wochenplan ein.");
    return;
  }

  const plan = [];
  tableBody.querySelectorAll("tr").forEach((row, rowIndex) => {
    const meals = {};
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
      const select = row.querySelectorAll("select")[index];
      const recipeId = parseInt(select.value);
      const recipe = recipes.find((r) => r.id === recipeId) || null;

      meals[mealType] = recipe
        ? { id: recipe.id, name: recipe.name, calories: recipe.calories }
        : null;
    });
    plan.push(meals);
  });

  fetch(plansUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: planName, plan }),
  })
    .then(() => {
      alert("Wochenplan wurde gespeichert.");
      planNameInput.value = ""; // Eingabefeld nach Speichern leeren
      loadPlans();
    })
    .catch((error) => console.error("Fehler beim Speichern des Plans:", error));
}

// Event-Listener
savePlanButton.addEventListener("click", savePlan);
loadPlanButton.addEventListener("click", loadPlan);

// Initialisierung
loadRecipes();
loadPlans();
