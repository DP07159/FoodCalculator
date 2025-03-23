<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Rezeptdetails</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div class="home-button">
        <a href="/index.html">🏠 Home</a>
    </div>

    <h1>Rezeptdetails</h1>
    <button onclick="window.location.href='/index.html'">🏠 Zur Hauptseite</button>

    <form id="recipe-form">
        <label for="recipe-name">Name:</label>
        <input type="text" id="recipe-name" name="recipe-name">

        <label for="recipe-calories">Kalorien:</label>
        <input type="number" id="recipe-calories" name="recipe-calories">

        <label for="recipe-portions">Portionen:</label>
        <input type="number" id="recipe-portions" name="recipe-portions">

        <label for="recipe-ingredients">Zutaten:</label>
        <textarea id="recipe-ingredients" name="recipe-ingredients"></textarea>

        <label for="recipe-instructions">Anleitung:</label>
        <textarea id="recipe-instructions" name="recipe-instructions"></textarea>

        <button type="button" onclick="updateRecipe()">Speichern</button>
    </form>
    
    <script>
        const API_URL = "https://foodcalculator-server.onrender.com";
        const params = new URLSearchParams(window.location.search);
        const recipeId = params.get('id');

        if (!recipeId) {
            alert('❌ Keine gültige Rezept-ID gefunden.');
            window.location.href = "/index.html"; // Zurück zur Startseite
        }

        async function loadRecipeDetails() {
            const response = await fetch(`${API_URL}/recipes/${recipeId}`);

            // Debug-Ausgabe
            const responseText = await response.text();
            console.log("🔎 Server Response:", responseText);

            try {
                const recipe = JSON.parse(responseText);
                document.getElementById('recipe-name').value = recipe.name || '';
                document.getElementById('recipe-calories').value = recipe.calories || '';
                document.getElementById('recipe-portions').value = recipe.portions || '';
                document.getElementById('recipe-ingredients').value = recipe.ingredients || '';
                document.getElementById('recipe-instructions').value = recipe.instructions || '';
            } catch (error) {
                console.error('❌ Fehler beim Parsen der Antwort:', error.message);
                alert('Fehler beim Abrufen der Rezeptdaten. Bitte überprüfe die Konsole.');
            }
        }

        async function updateRecipe() {
            const name = document.getElementById('recipe-name').value;
            const calories = document.getElementById('recipe-calories').value;
            const portions = parseInt(document.getElementById('recipe-portions').value);
            const ingredients = document.getElementById('recipe-ingredients').value;
            const instructions = document.getElementById('recipe-instructions').value;

            try {
                const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, calories, portions, ingredients, instructions })
                });

                if (response.ok) {
                    alert('✅ Rezept erfolgreich aktualisiert!');
                } else {
                    alert('❌ Fehler beim Aktualisieren des Rezepts.');
                }
            } catch (error) {
                console.error("❌ Fehler beim PUT-Aufruf:", error);
                alert("❌ Fehler beim Speichern der Rezeptdaten.");
            }
        }

        window.onload = loadRecipeDetails;
    </script>
</body>
</html>
