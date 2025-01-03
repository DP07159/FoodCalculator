const API_URL = 'https://foodcalculator-server.onrender.com/api/recipes';

const recipeForm = document.getElementById("add-recipe-form");
const recipeList = document.getElementById("recipe-items");

// Rezepte laden
async function loadRecipes() {
    const response = await fetch(API_URL);
    const recipes = await response.json();
    renderRecipeList(recipes);
}

// Rezeptliste anzeigen
function renderRecipeList(recipes) {
    recipeList.innerHTML = recipes.map((recipe, index) => `
        <li>
            ${recipe.name} - ${recipe.calories} kcal (${recipe.type.join(", ")})
            <button onclick="deleteRecipe(${index})">Löschen</button>
        </li>
    `).join("");
}

// Rezept hinzufügen
recipeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("recipe-name").value;
    const calories = parseInt(document.getElementById("calories").value);
    const type = Array.from(document.getElementById("meal-type").selectedOptions).map(opt => opt.value);

    const newRecipe = { name, calories, type };

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe)
    });

    loadRecipes();
    recipeForm.reset();
});

// Rezept löschen
async function deleteRecipe(index) {
    await fetch(`${API_URL}/${index}`, { method: 'DELETE' });
    loadRecipes();
}

// Rezepte laden
loadRecipes();
