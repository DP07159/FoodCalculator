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

        console.log("🔎 Geladene Rezeptdaten:", recipe);

        if (!recipe || recipe.error) {
            console.warn("❗️ Rezept nicht gefunden.");
            alert("Fehler: Rezept nicht gefunden.");
            return;
        }

        console.log("✅ Rezeptdaten erfolgreich geladen.");
        document.getElementById("recipe-name").value = recipe.name || '';
        document.getElementById("recipe-calories").value = recipe.calories || '';
        document.getElementById("recipe-portions").value = recipe.portions || '';
        document.getElementById("recipe-ingredients").value = recipe.ingredients || '';
        document.getElementById("recipe-instructions").value = recipe.instructions || '';

    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Rezeptdetails:", error);
        alert("Fehler beim Laden der Rezeptdetails.");
    }
}

async function updateRecipe() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    const name = document.getElementById('recipe-name').value;
    const calories = parseInt(document.getElementById('recipe-calories').value);
    const portions = parseInt(document.getElementById('recipe-portions').value);
    const ingredients = document.getElementById('recipe-ingredients').value;
    const instructions = document.getElementById('recipe-instructions').value;

    if (!name || !calories) {
        alert('❌ Name und Kalorien sind erforderlich!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, calories, portions, ingredients, instructions })
        });

        const result = await response.json();
        console.log("🔎 PUT-Antwort:", result);

        if (response.ok) {
            alert('✅ Rezept erfolgreich aktualisiert!');
            
            // 🚀 Weiterleitung zur Instructions-Seite
            window.location.href = `/recipeInstructions.html?id=${recipeId}`;
        } else {
            alert(`❌ Fehler beim Speichern: ${result.error || 'Unbekannter Fehler'}`);
        }
    } catch (error) {
        console.error("❌ Fehler beim PUT-Aufruf:", error);
        alert('❌ Fehler beim Speichern der Rezeptdaten.');
    }
}

// Beim Laden der Seite automatisch Rezeptdetails abrufen
window.onload = loadRecipeDetails;

// Event-Handler für das Absenden des Formulars
document.addEventListener('DOMContentLoaded', () => {
    loadRecipeDetails();

    const recipeForm = document.getElementById('recipe-form');
    if (recipeForm) {
        recipeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            updateRecipe();
        });
    } else {
        console.error('❌ Fehler: Formular #recipe-form nicht gefunden.');
    }
});
