const API_URL = "https://foodcalculator-server.onrender.com";

async function loadRecipeInstructions() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (!recipeId) {
        alert("Fehler: Keine Rezept-ID gefunden.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`);
        const recipe = await response.json();

        if (!recipe || recipe.error) {
            alert("Fehler: Rezept nicht gefunden.");
            return;
        }

        // ✅ Kochanleitung anzeigen
        document.getElementById("recipe-title").innerHTML = `<strong>Gericht:</strong> ${recipe.name}`;
        document.getElementById("recipe-instructions").textContent = recipe.instructions || "Keine Kochanleitung vorhanden.";
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Kochanleitung:", error);
        alert("Fehler beim Laden der Kochanleitung.");
    }
}

// Beim Laden der Seite automatisch Kochanleitung abrufen
window.onload = loadRecipeInstructions;
