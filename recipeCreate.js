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
        const response = await fetch(`${API_URL}/recipes`, {
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

        if (!response.ok) {
            alert("Das Rezept konnte leider nicht gespeichert werden.");
            return;
        }

        alert("Rezept erfolgreich erstellt.");
        window.location.href = "/index.html#recipe-book";
    } catch (error) {
        console.error("Fehler beim Erstellen des Rezepts:", error);
        alert("Fehler beim Speichern des Rezepts.");
    }
}

window.onload = function () {
    initBurgerMenu();
    initAutoResize();
};