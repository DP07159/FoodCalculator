const recipesUrl = "https://foodcalculator-server.onrender.com/recipes"; // Backend-URL für Rezepte
const plansUrl = "https://foodcalculator-server.onrender.com/plans"; // Backend-URL für Wochenpläne
const DAILY_LIMIT = 1500;

let recipes = []; // Rezepte werden hier gespeichert
let savedPlans = {}; // Gespeicherte Wochenpläne
const tableBody = document.getElementById("table-body");
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

// Funktion: Tabelle initialisieren
function initializeTable() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  days.forEach((day, dayIndex) => {
    const row = document.createElement("tr");

    // Spalte für den Tag
    const dayCell = document.createElement("td");
    dayCell.textContent = day;
    row.appendChild(dayCell);

    // Dropdowns für Mahlzeiten
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType) => {
      const mealCell = document.createElement("td");
      const select = document.createElement("select");

      updateDropdown(select, mealType);

      // Event: Änderungen im Dropdown
      select.addEventListener("change", () => calculateDayCalories(dayIndex, row));

      mealCell.appendChild(select);
      row.appendChild(mealCell);
    });

    // Spalten für Kalorienberechnung
    const totalCaloriesCell = document.createElement("td");
    const remainingCaloriesCell = document.createElement("td");

    row.appendChild(totalCaloriesCell);
    row.appendChild(remainingCaloriesCell);

    tableBody.appendChild(row);

    // Initiale Kalorienberechnung
    calculateDayCalories(dayIndex, row);
  });
}

// Funktion: Tageskalorien berechnen
function calculateDayCalories(dayIndex, row) {
  const selects = row.querySelectorAll("select");
  let totalCalories = 0;

  selects.forEach((select) => {
    const recipeId = parseInt(select.value);
    const recipe = recipes.find((r) => r.id === recipeId);

    if (recipe) {
      totalCalories += recipe.calories;
    }
  });

  const remainingCalories = DAILY_LIMIT - totalCalories;

  const totalCaloriesCell = row.cells[5];
  const remainingCaloriesCell = row.cells[6];

  totalCaloriesCell.textContent = `${totalCalories} kcal`;
  remainingCaloriesCell.textContent = `${remainingCalories} kcal`;

  remainingCaloriesCell.className = remainingCalories >= 0 ? "green" : "red";
}

// Funktion: Wochenpläne laden
function loadPlans() {
  fetch(plansUrl)
    .then((response) => response.json())
    .then((plans) => {
      savedPlans = plans;
      loadPlanSelect.innerHTML = '<option value="">Select a saved plan</option>';
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
    alert("Please select a plan to load.");
    return;
  }

  const plan = savedPlans[selectedPlanName];
  if (!plan) {
    alert("Plan not found.");
    return;
  }

  const rows = tableBody.querySelectorAll("tr");
  plan.forEach((meals, dayIndex) => {
    const row = rows[dayIndex];
    ["breakfast", "lunch", "dinner", "snack"].forEach((mealType, index) => {
      const select = row.querySelectorAll("select")[index];
      const meal = meals[mealType];

      if (meal) {
        const recipeExists = recipes.find((r) => r.id === meal.id);

        if (recipeExists) {
          select.value = meal.id; // Rezept setzen
        } else {
          select.value = ""; // Standardwert setzen
        }
      } else {
        select.value = ""; // Kein Rezept ausgewählt
      }
    });

    // Kalorien für den Tag berechnen
    calculateDayCalories(dayIndex, row);
  });
}

// Funktion: Rezepte laden
function loadRecipes() {
  fetch(recipesUrl)
    .then((response) => response.json())
    .then((data) => {
      recipes = data;
      initializeTable();
    })
    .catch((error) => console.error("Fehler beim Laden der Rezepte:", error));
}

// Initialisierung
loadRecipes();
loadPlans();
