const recipeForm = document.getElementById("add-recipe-form");
const recipeList = document.getElementById("recipe-items");
const weeklyTable = document.getElementById("weekly-table").querySelector("tbody");

// Initialisiere die Rezeptdatenbank
let recipes = [];
let weeklyPlan = {};

// Rezepte aus der JSON-Datenbank laden
async function loadRecipes() {
    const response = await fetch("data.json");
    recipes = await response.json();
    renderRecipeList();
}

// Rezeptliste rendern
function renderRecipeList() {
    recipeList.innerHTML = recipes.map((recipe, index) => `
        <li>
            ${recipe.name} - ${recipe.calories} kcal (${recipe.type.join(", ")})
            <button onclick="deleteRecipe(${index})">Löschen</button>
        </li>
    `).join("");
}

// Rezept hinzufügen
recipeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("recipe-name").value;
    const calories = parseInt(document.getElementById("calories").value);
    const type = Array.from(document.getElementById("meal-type").selectedOptions).map(opt => opt.value);

    recipes.push({ name, calories, type });
    saveRecipes();
    renderRecipeList();
    recipeForm.reset();
});

// Rezepte in JSON speichern
function saveRecipes() {
    fetch("data.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipes)
    });
}

// Rezept löschen
function deleteRecipe(index) {
    recipes.splice(index, 1);
    saveRecipes();
    renderRecipeList();
}

// Wochentabelle rendern
function renderWeeklyTable() {
    const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
    weeklyTable.innerHTML = days.map(day => `
        <tr>
            <td>${day}</td>
            ${["breakfast", "lunch", "dinner", "snack"].map(meal => `
                <td>
                    <select>
                        ${recipes.filter(r => r.type.includes(meal)).map(r => `
                            <option value="${r.calories}">${r.name} (${r.calories} kcal)</option>
                        `).join("")}
                    </select>
                </td>
            `).join("")}
            <td class="total-calories">0</td>
            <td class="remaining-calories green">1500</td>
        </tr>
    `).join("");
}

// Initiale Daten laden
loadRecipes();
renderWeeklyTable();
