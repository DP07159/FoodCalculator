const API_URL = "https://foodcalculator-server.onrender.com";

async function loadRecipeInstructions() {
    document.getElementById("display-recipe-portions").textContent = `${recipe.portions} Portionen`;
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (!recipeId) {
        console.warn("❗️ Keine Rezept-ID gefunden.");
        alert("Fehler: Keine Rezept-ID gefunden.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`);
        const recipe = await response.json();

        console.log("🔎 Geladene Rezeptdaten:", recipe);

        if (!recipe || recipe.error) {
            console.warn("❗️ Rezept nicht gefunden.");
            alert("Fehler: Rezept nicht gefunden.");
            return;
        }

        // ✅ Anzeige der Rezeptinfos optimieren
        document.getElementById("display-recipe-name").textContent = recipe.name;
        document.getElementById("display-recipe-calories").textContent = `${recipe.calories} kcal pro Portion`;
        document.getElementById("display-recipe-portions").textContent = `${recipe.portions} Portionen`;

        // ✅ Zutaten als Bulletpoints anzeigen
        const ingredientsList = document.getElementById("display-recipe-ingredients");
        ingredientsList.innerHTML = recipe.ingredients
            .split("\n")
            .map(ingredient => `<li>● ${ingredient}</li>`)
            .join("");

        // ✅ Anleitung mit Nummerierung anzeigen
        const instructionsList = document.getElementById("display-recipe-instructions");
        instructionsList.innerHTML = recipe.instructions
            .split("\n")
            .map((step, index) => `<p>${index + 1}. ${step}</p>`)
            .join("");

    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Rezeptdetails:", error);
        alert("Fehler beim Laden der Rezeptdetails.");
    }
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = loadRecipeInstructions;
