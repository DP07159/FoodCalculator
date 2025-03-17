const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];

// **Rezepte laden**
function loadRecipes() {
    console.log("🔎 loadRecipes() gestartet");
    fetch(`${API_URL}/recipes`)
        .then(response => response.json())
        .then((data) => {
            console.log("✅ Rezepte erfolgreich geladen:", data);
            recipes = data;
            populateMealTable(); 
            populateRecipeList();
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
        console.log(`✅ Wochenplan "${name}" erfolgreich gespeichert.`);
        alert(`✅ Wochenplan "${name}" erfolgreich gespeichert.`);
        loadMealPlans();
        calculateCalories();
    })
    .catch(error => console.error("❌ Fehler beim Speichern des Plans:", error));
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
                const selectedMeal = plan.data.find(d => d.day === day)?.meals[mealType] || "";
                select.value = selectedMeal;
            });
        });

        calculateCalories();
        document.getElementById("current-plan-name").textContent = `Aktueller Wochenplan: ${plan.name}`;
    })
    .catch(error => {
        console.error("❌ Fehler beim Laden des Plans:", error);
        alert("❌ Fehler beim Laden des Plans. Siehe Konsole für Details.");
    });
}

// **Event Listener hinzufügen**
document.addEventListener("DOMContentLoaded", () => {
    loadMealPlans();
    loadRecipes();

    document.getElementById("save-plan-btn").addEventListener("click", saveMealPlan);
    document.getElementById("load-plan-btn").addEventListener("click", loadMealPlan);
    document.getElementById("delete-plan-btn").addEventListener("click", deleteMealPlan);
    document.getElementById("update-plan-btn").addEventListener("click", updateMealPlan);
});
