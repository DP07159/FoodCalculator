const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];

// **Rezepte laden**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then((data) => {
      console.log("✅ Rezepte erfolgreich geladen:", data);
      recipes = data;
      populateMealTable(); // Wochenplan-Tabelle aktualisieren
      populateRecipeList(); // Rezeptbuch aktualisieren
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Mahlzeitentabelle aufbauen**
function populateMealTable() {
  const mealTable = document.getElementById("meal-table");
  if (!mealTable) return console.error("❌ Fehler: `meal-table` nicht gefunden!");

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

// **Rezeptbuch mit gespeicherten Rezepten anzeigen**
function populateRecipeList() {
  const recipeList = document.getElementById("recipe-list");
  if (!recipeList) return console.error("❌ Fehler: `recipe-list` nicht gefunden!");

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

  console.log("✅ Rezeptbuch aktualisiert!");
}

// **Rezept hinzufügen mit Checkboxen**
function addRecipe() {
    const name = document.getElementById("recipe-name").value;
    const calories = parseInt(document.getElementById("recipe-calories").value);

    // Alle angehakten Checkbox-Werte sammeln
    const mealTypes = Array.from(document.querySelectorAll(".recipe-checkboxes input:checked"))
        .map(checkbox => checkbox.value);

    if (!name || !calories || mealTypes.length === 0) {
        alert("Bitte alle Felder ausfüllen und mindestens eine Mahlzeit auswählen.");
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
        loadRecipes(); // Rezeptliste aktualisieren

        // Felder zurücksetzen
        document.getElementById("recipe-name").value = "";
        document.getElementById("recipe-calories").value = "";
        document.querySelectorAll(".recipe-checkboxes input").forEach(cb => cb.checked = false);
    })
    .catch(error => console.error("❌ Fehler beim Speichern:", error));
}

// **Rezept löschen**
function deleteRecipe(recipeId) {
  fetch(`${API_URL}/recipes/${recipeId}`, { method: "DELETE" })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fehler beim Löschen: ${response.status}`);
      }
      console.log(`✅ Rezept mit ID ${recipeId} gelöscht`);
      // Rezept auch im Frontend entfernen
      recipes = recipes.filter(recipe => recipe.id !== recipeId);
      populateRecipeList();
      populateMealTable();
    })
    .catch(error => console.error("❌ Fehler beim Löschen:", error));
}

// **Wochenplan speichern**
function saveMealPlan() {
  const name = document.getElementById("plan-name").value;
  if (!name) {
    alert("Bitte einen Namen für den Plan eingeben!");
    return;
  }

  const planData = [];
  document.querySelectorAll("#meal-table tr").forEach(row => {
    const day = row.querySelector("td").textContent;
    const meals = {};
    
    row.querySelectorAll("select").forEach(select => {
      meals[select.dataset.mealType] = select.value || null;
    });

    planData.push({ day, meals });
  });

  fetch(`${API_URL}/meal_plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data: planData })
  })
  .then(response => response.json())
  .then(() => {
    console.log("✅ Wochenplan gespeichert");
    loadMealPlans(); // Liste aktualisieren
  })
  .catch(error => console.error("❌ Fehler beim Speichern des Plans:", error));
}

// **Wochenplan löschen**
function deleteMealPlan() {
  const planId = document.getElementById("plan-list").value;
  if (!planId) {
    alert("Bitte einen Plan auswählen!");
    return;
  }

  fetch(`${API_URL}/meal_plans/${planId}`, { method: "DELETE" })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fehler beim Löschen: ${response.status}`);
      }
      console.log(`✅ Wochenplan mit ID ${planId} gelöscht`);
      loadMealPlans(); // Liste aktualisieren
    })
    .catch(error => console.error("❌ Fehler beim Löschen des Plans:", error));
}

// **Wochenplan aktualisieren (ohne neue Namenseingabe)**
function updateMealPlan() {
  const planId = document.getElementById("plan-list").value;
  if (!planId) {
    alert("Bitte einen Plan auswählen!");
    return;
  }

  const planData = [];
  document.querySelectorAll("#meal-table tr").forEach(row => {
    const day = row.querySelector("td").textContent;
    const meals = {};
    
    row.querySelectorAll("select").forEach(select => {
      meals[select.dataset.mealType] = select.value || null;
    });

    planData.push({ day, meals });
  });

  // Hole den aktuellen Namen des Plans aus dem Dropdown
  const planName = document.getElementById("plan-list").selectedOptions[0].textContent;

  fetch(`${API_URL}/meal_plans/${planId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: planName, data: planData })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Fehler beim Aktualisieren: ${response.status}`);
    }
    console.log(`✅ Wochenplan mit ID ${planId} überschrieben`);
    loadMealPlans(); // Liste aktualisieren
  })
  .catch(error => console.error("❌ Fehler beim Aktualisieren des Plans:", error));
}

// **Alle gespeicherten Wochenpläne laden**
function loadMealPlans() {
  fetch(`${API_URL}/meal_plans`)
    .then(response => response.json())
    .then((plans) => {
      console.log("✅ Wochenpläne geladen:", plans);
      const planList = document.getElementById("plan-list");
      planList.innerHTML = '<option value="">-- Plan auswählen --</option>';

      plans.forEach(plan => {
        const option = document.createElement("option");
        option.value = plan.id;
        option.textContent = plan.name;
        planList.appendChild(option);
      });
    })
    .catch(error => console.error("❌ Fehler beim Laden der Pläne:", error));
}

// **Wochenplan laden**
function loadMealPlan() {
  const planId = document.getElementById("plan-list").value;
  if (!planId) {
    alert("Bitte einen Plan auswählen!");
    return;
  }

  fetch(`${API_URL}/meal_plans/${planId}`)
    .then(response => response.json())
    .then((plan) => {
      console.log("✅ Plan geladen:", plan);
      document.querySelectorAll("#meal-table tr").forEach(row => {
        const day = row.querySelector("td").textContent;

        row.querySelectorAll("select").forEach(select => {
          const mealType = select.dataset.mealType;
          select.value = plan.data.find(d => d.day === day)?.meals[mealType] || "";
        });
      });

      calculateCalories(); // Berechnung aktualisieren

      // ✅ Plan-Namen in der Subline anzeigen
      document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
    })
    .catch(error => console.error("❌ Fehler beim Laden des Plans:", error));
}

// **Beim Laden der Seite Wochenpläne abrufen**
document.addEventListener("DOMContentLoaded", loadMealPlans);

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);

// Eingabefeld für den Plan-Namen leeren
document.getElementById("plan-name").value = "";
document.getElementById("current-plan-name").textContent = "Wochenplan";

