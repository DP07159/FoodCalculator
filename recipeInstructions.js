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
function getIngredientsTextForSharing() {
    const recipeName = document.getElementById("display-recipe-name")?.textContent.trim() || "Einkaufsliste";

    const ingredientItems = Array.from(
        document.querySelectorAll("#display-recipe-ingredients li")
    );

    const ingredients = ingredientItems
        .map(item => item.textContent.replace(/\u00A0/g, "").trim())
        .filter(item => item.length > 0);

    if (ingredients.length === 0) {
        return "";
    }

    return `${recipeName}\n\n${ingredients.map(ingredient => `• ${ingredient}`).join("\n")}`;
}

async function shareIngredientsList() {
    const ingredientsText = getIngredientsTextForSharing();

    if (!ingredientsText) {
        alert("Für dieses Rezept wurden keine Zutaten gefunden.");
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: "Zutatenliste",
                text: ingredientsText
            });
        } catch (error) {
            console.log("Teilen wurde abgebrochen oder ist fehlgeschlagen:", error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(ingredientsText);
            alert("Die Zutatenliste wurde in die Zwischenablage kopiert.");
        } catch (error) {
            console.error("Fehler beim Kopieren:", error);
            alert("Die Zutatenliste konnte leider nicht kopiert werden.");
        }
    }
}

function setupShareIngredientsButton() {
    const shareButton = document.getElementById("share-ingredients-button");

    if (!shareButton) return;

    shareButton.addEventListener("click", shareIngredientsList);
}

function setupEditRecipeButton() {
    const editButton = document.getElementById("edit-recipe-button");

    if (!editButton) return;

    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!recipeId) return;

    editButton.addEventListener("click", function () {
        window.location.href = `/recipeDetails.html?id=${recipeId}`;
    });
}

window.onload = function () {
    initBurgerMenu();
    loadRecipeInstructions();
    setupShareIngredientsButton();
    setupEditRecipeButton();
};