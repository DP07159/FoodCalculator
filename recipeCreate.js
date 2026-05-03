const API_URL = "https://foodcalculator-server.onrender.com";

function resizeTextArea(textarea) {
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
}

function initAutoResize() {
    const ingredientsInput = document.getElementById("recipe-ingredients");
    const instructionsInput = document.getElementById("recipe-instructions");

    [ingredientsInput, instructionsInput].forEach(textarea => {
        if (textarea) {
            textarea.addEventListener("input", () => resizeTextArea(textarea));
            resizeTextArea(textarea);
        }
    });
}

async function createRecipe() {
    const name = document.getElementById("recipe-name").value.trim();
    const caloriesRaw = document.getElementById("recipe-calories").value.trim();
    const portionsRaw = document.getElementById("recipe-portions").value.trim();
    const ingredients = document.getElementById("recipe-ingredients").value;
    const instructions = document.getElementById("recipe-instructions").value;

    const calories = parseInt(caloriesRaw, 10);
    const portions = parseInt(portionsRaw, 10);

    const mealTypes = Array.from(document.querySelectorAll(".recipe-checkboxes input:checked"))
        .map(checkbox => checkbox.value);

    const caloriesIsValid = /^\d+$/.test(caloriesRaw || "");
    const portionsIsValid = /^\d+$/.test(portionsRaw || "") && portions > 0;

    if (!name || !caloriesIsValid || !portionsIsValid || mealTypes.length === 0) {
        alert("Bitte Name, Kalorien, Portionen und mindestens eine Mahlzeit angeben.");
        return;
    }

    try {
        const createResponse = await fetch(`${API_URL}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                calories,
                portions,
                mealTypes,
                ingredients,
                instructions
            })
        });

        if (!createResponse.ok) {
            alert("Das Rezept konnte leider nicht gespeichert werden.");
            return;
        }

        let newRecipeId = null;

        try {
            const createdRecipe = await createResponse.json();

            newRecipeId =
                createdRecipe.id ||
                createdRecipe.recipeId ||
                createdRecipe.insertId ||
                createdRecipe.lastID ||
                createdRecipe.lastId ||
                null;
        } catch (error) {
            console.log("POST-Antwort enthielt keine JSON-ID. Rezeptliste wird geprüft.");
        }

        if (!newRecipeId) {
            const recipesResponse = await fetch(`${API_URL}/recipes`);
            const allRecipes = await recipesResponse.json();

            const newestMatchingRecipe = allRecipes
                .filter(recipe =>
                    recipe.name === name &&
                    Number(recipe.calories) === Number(calories)
                )
                .sort((a, b) => Number(b.id) - Number(a.id))[0];

            if (newestMatchingRecipe) {
                newRecipeId = newestMatchingRecipe.id;
            }
        }

        if (!newRecipeId) {
            alert("Rezept wurde angelegt, aber die neue Rezept-ID konnte nicht ermittelt werden.");
            window.location.href = "/index.html#recipe-book";
            return;
        }

        const updateResponse = await fetch(`${API_URL}/recipes/${newRecipeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                calories,
                portions,
                mealTypes,
                ingredients,
                instructions
            })
        });

        if (!updateResponse.ok) {
            alert("Rezept wurde angelegt, aber Zutaten und Anleitung konnten nicht gespeichert werden.");
            window.location.href = `/recipeDetails.html?id=${newRecipeId}`;
            return;
        }

        window.location.href = `/recipeInstructions.html?id=${newRecipeId}`;
    } catch (error) {
        console.error("Fehler beim Erstellen des Rezepts:", error);
        alert("Fehler beim Speichern des Rezepts.");
    }
}

window.onload = function () {
    initBurgerMenu();
    initAutoResize();
};