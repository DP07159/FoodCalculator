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
            populateMealTable();  // ✅ Korrekt ergänzt
            populateRecipeList();
        })
        .catch(error => {
            console.error("❌ Fehler beim Laden der Rezepte:", error);
        });
}

// ✅ Rezeptbuch erstellen und Klickbereiche verbessern
function populateRecipeList() {
    const recipeList = document.getElementById("recipe-list");
    recipeList.innerHTML = "";

    recipes.forEach(recipe => {
        const li = document.createElement("li");
        li.classList.add("recipe-item");

        const linkToInstructions = document.createElement("a");
        linkToInstructions.href = `/recipeInstructions.html?id=${recipe.id}`;
        linkToInstructions.textContent = recipe.name;
        linkToInstructions.classList.add("recipe-link");

        const editButton = document.createElement("button");
        editButton.textContent = "✏️ Bearbeiten";
        editButton.onclick = () => {
            window.location.href = `/recipeDetails.html?id=${recipe.id}`;
        };

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = "🗑️";
        deleteButton.onclick = () => deleteRecipe(recipe.id);

        li.appendChild(linkToInstructions);
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        recipeList.appendChild(li);
    });
}

// ✅ Mahlzeitentabelle aufbauen (Korrigiert und wieder hinzugefügt)
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

            calculateCalories();

            document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
        })
        .catch(error => console.error("❌ Fehler beim Laden des Plans:", error));
}

// **Alle gespeicherten Wochenpläne laden**
function loadMealPlans() {
    const planList = document.getElementById("plan-list");
    if (!planList) return;

    fetch(`${API_URL}/meal_plans`)
        .then(response => response.json())
        .then((plans) => {
            console.log("✅ Wochenpläne geladen:", plans);
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





