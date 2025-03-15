const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];

// **Rezepte laden**
function loadRecipes() {
    console.log("🔎 loadRecipes() gestartet");
    fetch(`${API_URL}/recipes`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Fehler beim Laden der Rezepte: ${response.statusText}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("✅ Rezepte erfolgreich geladen:", data);
            recipes = data;
            populateMealTable();
            populateRecipeList();

            const errorMessage = document.getElementById("error-message");
            if (errorMessage) errorMessage.style.display = "none";
        })
        .catch(error => {
            console.error("❌ Fehler beim Laden der Rezepte:", error);

            const errorMessage = document.getElementById("error-message");
            if (errorMessage) errorMessage.style.display = "block";
        });
}

// ✅ Rezeptbuch erstellen und Klickbereiche verbessern
function populateRecipeList() {
    const recipeList = document.getElementById("recipe-list");
    recipeList.innerHTML = "";

    recipes.forEach(recipe => {
        const li = document.createElement("li");

        const linkToInstructions = document.createElement("a");
        linkToInstructions.href = `/recipeInstructions.html?id=${recipe.id}`;
        linkToInstructions.textContent = recipe.name;
        linkToInstructions.classList.add("recipe-link");
        linkToInstructions.style.display = "inline-block";
        linkToInstructions.style.cursor = "pointer";
        linkToInstructions.style.textDecoration = "underline";

        const editButton = document.createElement("button");
        editButton.textContent = "✏️ Bearbeiten";
        editButton.classList.add("edit-button");
        editButton.onclick = () => {
            window.location.href = `/recipeDetails.html?id=${recipe.id}`;
        };

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = "🗑️";
        deleteButton.classList.add("recipe-delete-btn");
        deleteButton.onclick = () => deleteRecipe(recipe.id);

        li.appendChild(linkToInstructions);
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        recipeList.appendChild(li);
    });
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

// **Rezept hinzufügen**
function addRecipe() {
    const name = document.getElementById("recipe-name").value;
    const calories = parseInt(document.getElementById("recipe-calories").value);

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
        loadRecipes();

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
        recipes = recipes.filter(recipe => recipe.id !== recipeId);
        populateRecipeList();
        populateMealTable();
    })
    .catch(error => console.error("❌ Fehler beim Löschen:", error));
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

// ✅ Event Delegation für dynamische Inhalte
document.getElementById('recipe-list').addEventListener('click', (event) => {
    const clickedItem = event.target.closest('.recipe-item');
    if (clickedItem) {
        const recipeId = clickedItem.getAttribute('data-id');
        if (recipeId) {
            window.location.href = `/recipeDetails.html?id=${recipeId}`;
        }
    }
});

// **Beim Laden der Seite Wochenpläne abrufen**
document.addEventListener("DOMContentLoaded", loadMealPlans);

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);

// Eingabefeld für den Plan-Namen leeren
document.getElementById("plan-name").value = "";
document.getElementById("current-plan-name").textContent = "Wochenplan";
