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
  fetch("https://foodcalculator-server.onrender.com/recipes")
    .then(response => response.json())
    .then((data) => {
      recipes = data;
      console.log("✅ Rezepte erfolgreich geladen:", recipes);
      displayRecipeList(); // Liste direkt aktualisieren
    })
    .catch((error) => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Beim Start der Seite Rezepte laden**
document.addEventListener("DOMContentLoaded", () => {
  loadRecipes();
});

// Funktion: Rezeptbuch anzeigen
function displayRecipeBook() {
  const recipeBook = document.getElementById("recipe-book");
  recipeBook.innerHTML = ""; // Liste zurücksetzen

  if (!recipes || recipes.length === 0) {
    console.log("❌ Keine Rezepte im Rezeptbuch.");
    recipeBook.innerHTML = "<p>No recipes available.</p>";
    return;
  }

  console.log("✅ Rezeptbuch wird aktualisiert:", recipes);

  const ul = document.createElement("ul");

  recipes.forEach((recipe) => {
    let mealTypesArray = [];

    try {
      // Falls `mealTypes` als String gespeichert ist, in ein Array umwandeln
      if (typeof recipe.mealTypes === "string") {
        mealTypesArray = JSON.parse(recipe.mealTypes);
      } else {
        mealTypesArray = recipe.mealTypes || [];
      }

      // Falls `mealTypes` trotzdem kein Array ist, mache es zu einem
      if (!Array.isArray(mealTypesArray)) {
        mealTypesArray = [mealTypesArray];
      }
    } catch (error) {
      console.error("❌ Fehler beim Parsen von mealTypes:", error, "Wert:", recipe.mealTypes);
      mealTypesArray = ["Unknown"];
    }

    // **Rezept-Element für das Rezeptbuch**
    const li = document.createElement("li");
    li.innerHTML = `<strong>${recipe.name}</strong> - ${recipe.calories} kcal | Geeignet für: ${mealTypesArray.join(", ")}`;

    ul.appendChild(li);
  });

  recipeBook.appendChild(ul);
}

// Funktion: Rezeptliste anzeigen
function displayRecipeList() {
  const recipeList = document.getElementById("recipe-list");
  recipeList.innerHTML = ""; // Liste zuerst leeren

  if (!recipes || recipes.length === 0) {
    console.log("❌ Keine Rezepte gefunden.");
    recipeList.innerHTML = "<p>No recipes available.</p>";
    return;
  }

  console.log("✅ Rezepte erfolgreich geladen:", recipes); // Debugging

  const ul = document.createElement("ul");

  recipes.forEach((recipe) => {
    let mealTypesArray = [];

    try {
      // Falls `mealTypes` immer noch ein String ist, konvertiere es in ein Array
      if (typeof recipe.mealTypes === "string") {
        mealTypesArray = JSON.parse(recipe.mealTypes);
      } else {
        mealTypesArray = recipe.mealTypes || [];
      }
      
      // Falls mealTypes trotzdem kein Array ist, mache es zu einem
      if (!Array.isArray(mealTypesArray)) {
        mealTypesArray = [mealTypesArray];
      }
    } catch (error) {
      console.error("❌ Fehler beim Parsen von mealTypes:", error, "Wert:", recipe.mealTypes);
      mealTypesArray = ["Unknown"]; // Falls alles fehlschlägt
    }

    console.log("🎯 Endgültiger Wert von mealTypes:", mealTypesArray);

    // **Rezept-Element erstellen**
    const li = document.createElement("li");
    li.innerHTML = `<strong>${recipe.name}</strong> (${recipe.calories} kcal) - Suitable for: ${mealTypesArray.join(", ")}`;

    // **Löschen-Button**
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.marginLeft = "10px";
    deleteButton.style.backgroundColor = "red";
    deleteButton.style.color = "white";
    deleteButton.style.border = "none";
    deleteButton.style.padding = "5px 10px";
    deleteButton.style.cursor = "pointer";

    // **Klick-Event für das Löschen des Rezepts**
    deleteButton.addEventListener("click", () => deleteRecipe(recipe.id));

    li.appendChild(deleteButton);
    ul.appendChild(li);
  });

  recipeList.appendChild(ul);
}

// Funktion: Rezept hinzufügen
function addRecipe() {
  const name = document.getElementById("recipe-name").value.trim();
  const calories = parseInt(document.getElementById("recipe-calories").value, 10);
  const selectedMeals = Array.from(document.querySelectorAll('input[name="meal-type"]:checked'))
                            .map(input => input.value);

  if (!name || isNaN(calories) || selectedMeals.length === 0) {
    alert("Please enter a valid name, calories, and at least one meal type.");
    return;
  }

  const newRecipe = { name, calories, mealTypes: selectedMeals };

  fetch("https://foodcalculator-server.onrender.com/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newRecipe),
  })
    .then(response => response.json())
    .then((data) => {
      console.log("✅ Rezept hinzugefügt:", data);
      recipes.push(data); // Füge das neue Rezept in die Liste ein
      displayRecipeList(); // Rezeptliste sofort aktualisieren
    })
    .catch(error => console.error("❌ Fehler beim Hinzufügen des Rezepts:", error));
}

// Funktion: Rezept löschen
function deleteRecipe(recipeId) {
  if (!confirm("Are you sure you want to delete this recipe?")) {
    return;
  }

  fetch(`https://foodcalculator-server.onrender.com/recipes/${recipeId}`, {
    method: "DELETE"
  })
    .then((response) => {
      if (response.ok) {
        console.log(`✅ Rezept mit ID ${recipeId} gelöscht.`);
        loadRecipes(); // **Liste neu laden, um das gelöschte Rezept zu entfernen**
      } else {
        console.error("❌ Fehler beim Löschen des Rezepts:", response.statusText);
      }
    })
    .catch((error) => console.error("❌ Netzwerkfehler beim Löschen des Rezepts:", error));
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
