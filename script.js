// Pfad zur Rezept-Datenbank
const recipesUrl = "recipes.json";

// Maximal erlaubte Kalorien pro Tag
const DAILY_LIMIT = 1500;

// Tabelle initialisieren
const tableBody = document.getElementById("table-body");

// Daten laden und Tabelle erstellen
fetch(recipesUrl)
  .then((response) => response.json())
  .then((recipes) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const selectedMeals = Array.from({ length: 7 }, () => ({
      breakfast: null,
      lunch: null,
      dinner: null,
      snack: null,
    }));

    days.forEach((day, index) => {
      const row = document.createElement("tr");

      // Spalte: Tag
      const dayCell = document.createElement("td");
      dayCell.textContent = day;
      row.appendChild(dayCell);

      // Spalten: Mahlzeiten
      ["breakfast", "lunch", "dinner", "snack"].forEach((mealType) => {
        const mealCell = document.createElement("td");
        const select = document.createElement("select");
        select.innerHTML = `<option value="">Select</option>`;
        recipes.forEach((recipe) => {
          const option = document.createElement("option");
          option.value = recipe.id;
          option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
          select.appendChild(option);
        });

        // Event Listener: Dropdown-Auswahl
        select.addEventListener("change", (e) => {
          const recipeId = parseInt(e.target.value);
          const recipe = recipes.find((r) => r.id === recipeId);
          selectedMeals[index][mealType] = recipe || null;
          updateTableRow(index, row, selectedMeals[index]);
        });

        mealCell.appendChild(select);
        row.appendChild(mealCell);
      });

      // Spalten: Gesamtkalorien und verbleibende Kalorien
      const totalCaloriesCell = document.createElement("td");
      const remainingCaloriesCell = document.createElement("td");

      row.appendChild(totalCaloriesCell);
      row.appendChild(remainingCaloriesCell);

      tableBody.appendChild(row);
      updateTableRow(index, row, selectedMeals[index]);
    });

    // Funktion: Zeile aktualisieren
    function updateTableRow(index, row, meals) {
      // Berechne die Gesamtkalorien für den Tag
      const totalCalories = Object.values(meals).reduce(
        (sum, meal) => sum + (meal ? meal.calories : 0),
        0
      );

      // Berechne die verbleibenden Kalorien
      const remainingCalories = DAILY_LIMIT - totalCalories;

      // Aktualisiere die Zellen der Tabelle
      row.cells[5].textContent = `${totalCalories} kcal`;
      row.cells[6].textContent = `${remainingCalories} kcal`;
      row.cells[6].className = remainingCalories >= 0 ? "green" : "red";
    }
  })
  .catch((error) => console.error("Error loading recipes:", error));
