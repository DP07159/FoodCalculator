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

    // Tabelle für jeden Tag erstellen
    days.forEach((day, dayIndex) => {
      const row = document.createElement("tr");

      // Spalte: Tag
      const dayCell = document.createElement("td");
      dayCell.textContent = day;
      row.appendChild(dayCell);

      // Spalten: Mahlzeiten
      ["breakfast", "lunch", "dinner", "snack"].forEach((mealType) => {
        const mealCell = document.createElement("td");
        const select = document.createElement("select");

        // Dropdown-Inhalte erstellen
        select.innerHTML = `<option value="">Select</option>`;
        recipes.forEach((recipe) => {
          const option = document.createElement("option");
          option.value = recipe.id;
          option.textContent = `${recipe.name} (${recipe.calories} kcal)`;
          select.appendChild(option);
        });

        // Event Listener: Auswahl ändern
        select.addEventListener("change", (e) => {
          const recipeId = parseInt(e.target.value);
          const selectedRecipe = recipes.find((r) => r.id === recipeId) || null;

          // Aktuelles Essen für diesen Tag und diese Mahlzeit speichern
          selectedMeals[dayIndex][mealType] = selectedRecipe;

          // Zeile für diesen Tag aktualisieren
          updateTableRow(dayIndex, row, selectedMeals[dayIndex]);
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

      // Initiale Aktualisierung der Zeile
      updateTableRow(dayIndex, row, selectedMeals[dayIndex]);
    });

    // Funktion: Aktualisiere die Tabelle für einen einzelnen Tag
    function updateTableRow(dayIndex, row, meals) {
      // Gesamtkalorien des Tages berechnen
      const totalCalories = Object.values(meals).reduce((sum, meal) => {
        return sum + (meal ? meal.calories : 0);
      }, 0);

      // Verbleibende Kalorien berechnen
      const remainingCalories = DAILY_LIMIT - totalCalories;

      // Werte in die Tabelle schreiben
      const totalCaloriesCell = row.cells[5];
      const remainingCaloriesCell = row.cells[6];

      totalCaloriesCell.textContent = `${totalCalories} kcal`;
      remainingCaloriesCell.textContent = `${remainingCalories} kcal`;

      // Farbe der verbleibenden Kalorien setzen
      remainingCaloriesCell.className = remainingCalories >= 0 ? "green" : "red";
    }
  })
  .catch((error) => console.error("Error loading recipes:", error));
