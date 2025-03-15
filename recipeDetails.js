const API_URL = "https://foodcalculator-server.onrender.com";

// Rezeptdetails laden und vorausfüllen
async function loadRecipeDetails() {
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

// Rezept aktualisieren und speichern
async function updateRecipe() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    const updatedRecipe = {
        name: document.getElementById("recipe-name").value,
        calories: parseInt(document.getElementById("recipe-calories").value),
        ingredients: document.getElementById("recipe-ingredients").value,
        instructions: document.getElementById("recipe-instructions").value
    };

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedRecipe)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Rezept erfolgreich aktualisiert!");
        } else {
            alert(`❌ Fehler: ${result.error}`);
        }
    } catch (error) {
        console.error("❌ Fehler beim Aktualisieren des Rezepts:", error);
        alert("Fehler beim Speichern der Änderungen.");
    }
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = loadRecipeDetails;
