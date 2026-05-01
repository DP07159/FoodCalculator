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
function getIngredientsTextForCopying() {
    const ingredientItems = Array.from(
        document.querySelectorAll("#display-recipe-ingredients li")
    );

    const ingredients = ingredientItems
        .map(item => item.textContent.replace(/\u00A0/g, "").trim())
        .filter(item => item.length > 0);

    return ingredients.join("\n");
}

async function copyIngredientsOneByOne() {
    const ingredientsText = getIngredientsTextForCopying();

    if (!ingredientsText) {
        alert("Für dieses Rezept wurden keine Zutaten gefunden.");
        return;
    }

    try {
        await navigator.clipboard.writeText(ingredientsText);
        alert("Die Zutaten wurden einzeln zeilenweise kopiert. Du kannst sie nun in Erinnerungen einfügen.");
    } catch (error) {
        console.error("Fehler beim Kopieren der Zutaten:", error);
        alert("Die Zutaten konnten leider nicht kopiert werden.");
    }
}

function setupCopyIngredientsButton() {
    const copyButton = document.getElementById("copy-ingredients-button");

    if (!copyButton) return;

    copyButton.addEventListener("click", copyIngredientsOneByOne);
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = function () {
    loadRecipeInstructions();
    setupCopyIngredientsButton();
};
