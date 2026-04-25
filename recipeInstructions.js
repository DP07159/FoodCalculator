const API_URL = "https://foodcalculator-server.onrender.com";

// Sicherheitsfunktion zur Behandlung von Sonderzeichen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadRecipeInstructions() {
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
        document.getElementById("display-recipe-portions").textContent = recipe.portions;
        document.getElementById("display-recipe-calories").textContent = recipe.calories;

        // ✅ Zutaten als zweispaltige Liste anzeigen (leere Zeilen ohne Bulletpoint)
        const ingredientsList = document.getElementById("display-recipe-ingredients");
        ingredientsList.innerHTML = recipe.ingredients
    .split("\n")
    .map(ingredient => ingredient.trim() === ""
        ? `<li class="empty-line">&nbsp;</li>`
        : `<li>${escapeHtml(ingredient)}</li>`
    )
    .join("");


        // ✅ Anleitung mit Nummerierung anzeigen
        const instructionsList = document.getElementById("display-recipe-instructions");
        instructionsList.innerHTML = recipe.instructions
            .split("\n")
            .map((step, index) => `<p>${index + 1}. ${escapeHtml(step)}</p>`)
            .join("");

    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Rezeptdetails:", error);
        alert("Fehler beim Laden der Rezeptdetails.");
    }
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = loadRecipeInstructions;
