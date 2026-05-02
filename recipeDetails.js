const API_URL = "https://foodcalculator-server.onrender.com";

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

if (!recipeId) {
    alert("Keine gültige Rezept-ID gefunden.");
    window.location.href = "/index.html";
}

async function loadRecipeDetails() {
    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`);
        const recipe = await response.json();

        document.getElementById("recipe-name").value = recipe.name || "";
        document.getElementById("recipe-calories").value = recipe.calories || "";
        document.getElementById("recipe-portions").value = recipe.portions || "";
        document.getElementById("recipe-ingredients").value = recipe.ingredients || "";
        document.getElementById("recipe-instructions").value = recipe.instructions || "";

        resizeTextArea(document.getElementById("recipe-ingredients"));
        resizeTextArea(document.getElementById("recipe-instructions"));
    } catch (error) {
        console.error("Fehler beim Laden der Rezeptdaten:", error);
        alert("Fehler beim Abrufen der Rezeptdaten.");
    }
}

async function updateRecipe() {
    const name = document.getElementById("recipe-name").value;
    const calories = document.getElementById("recipe-calories").value;
    const portionsValue = document.getElementById("recipe-portions").value;
    const ingredients = document.getElementById("recipe-ingredients").value;
    const instructions = document.getElementById("recipe-instructions").value;

    const portions = portionsValue ? parseInt(portionsValue, 10) : null;

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                calories,
                portions,
                ingredients,
                instructions
            })
        });

        if (response.ok) {
            window.location.href = `/recipeInstructions.html?id=${recipeId}`;
        } else {
            alert("Fehler beim Aktualisieren des Rezepts.");
        }
    } catch (error) {
        console.error("Fehler beim Speichern der Rezeptdaten:", error);
        alert("Fehler beim Speichern der Rezeptdaten.");
    }
}

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

window.onload = function () {
    initBurgerMenu();
    loadRecipeDetails();
    initAutoResize();
};