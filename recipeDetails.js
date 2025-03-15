const API_URL = "https://foodcalculator-server.onrender.com";

async function loadRecipeDetails() {
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

        console.log("🔎 Geladene Rezeptdaten:", recipe); // DEBUG

        if (!recipe || recipe.error) {
            console.warn("❗️ Rezept nicht gefunden.");
            alert("Fehler: Rezept nicht gefunden.");
            return;
        }

        console.log("✅ Rezeptdaten erfolgreich geladen.");
        console.log(`➡️ Name: ${recipe.name}`);
        console.log(`➡️ Kalorien: ${recipe.calories}`);
        console.log(`➡️ Zutaten: ${recipe.ingredients}`);
        console.log(`➡️ Anleitung: ${recipe.instructions}`);

        // ✅ Felder vorausfüllen
        document.getElementById("recipe-name").value = recipe.name || '';
        document.getElementById("recipe-calories").value = recipe.calories || '';
        document.getElementById("recipe-ingredients").value = recipe.ingredients || '';
        document.getElementById("recipe-instructions").value = recipe.instructions || '';

    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Rezeptdetails:", error);
        alert("Fehler beim Laden der Rezeptdetails.");
    }
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = loadRecipeDetails;
