const API_URL = "https://foodcalculator-server.onrender.com";

let currentRecipe = null;
let basePortions = 1;
let currentPortions = 1;

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatScaledIngredient(ingredient, factor) {
    if (!ingredient || factor === 1) return ingredient;

    return ingredient.replace(/^(\d+(?:[.,]\d+)?)(\s*)(.*)$/u, function (_, numberPart, spacePart, rest) {
        const normalizedNumber = parseFloat(numberPart.replace(",", "."));

        if (Number.isNaN(normalizedNumber)) {
            return ingredient;
        }

        const scaledNumber = normalizedNumber * factor;
        const displayNumber = Number.isInteger(scaledNumber)
            ? String(scaledNumber)
            : String(Math.round(scaledNumber * 10) / 10).replace(".", ",");

        return `${displayNumber}${spacePart}${rest}`;
    });
}

function renderRecipeInstructions() {
    if (!currentRecipe) return;

    const factor = basePortions > 0 ? currentPortions / basePortions : 1;

    document.getElementById("display-recipe-name").textContent = currentRecipe.name || "";
    document.getElementById("display-recipe-portions").textContent = currentPortions || "";
    document.getElementById("display-recipe-calories").textContent = currentRecipe.calories || "";

    const ingredientsList = document.getElementById("display-recipe-ingredients");
    ingredientsList.innerHTML = (currentRecipe.ingredients || "")
        .split("\n")
        .map(ingredient => {
            if (ingredient.trim() === "") {
                return `<li class="empty-line">&nbsp;</li>`;
            }

            const scaledIngredient = formatScaledIngredient(ingredient.trim(), factor);
            return `<li>${escapeHtml(scaledIngredient)}</li>`;
        })
        .join("");

    const instructionsList = document.getElementById("display-recipe-instructions");
    instructionsList.innerHTML = (currentRecipe.instructions || "")
        .split("\n")
        .filter(step => step.trim().length > 0)
        .map((step, index) => `<p>${index + 1}. ${escapeHtml(step)}</p>`)
        .join("");
}

async function loadRecipeInstructions() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get("id");

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

        currentRecipe = recipe;
        basePortions = parseInt(recipe.portions, 10) || 1;
        currentPortions = basePortions;

        renderRecipeInstructions();
    } catch (error) {
        console.error("Fehler beim Abrufen der Rezeptdetails:", error);
        alert("Fehler beim Laden der Rezeptdetails.");
    }
}

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

function setupPortionScalingButtons() {
    const decreaseButton = document.getElementById("decrease-portions-button");
    const increaseButton = document.getElementById("increase-portions-button");

    if (decreaseButton) {
        decreaseButton.addEventListener("click", function () {
            if (currentPortions <= 1) return;
            currentPortions -= 1;
            renderRecipeInstructions();
        });
    }

    if (increaseButton) {
        increaseButton.addEventListener("click", function () {
            currentPortions += 1;
            renderRecipeInstructions();
        });
    }
}

function setupAddToPlanControls() {
    const toggleButton = document.getElementById("add-to-plan-toggle-button");
    const panel = document.getElementById("add-to-plan-panel");
    const confirmButton = document.getElementById("add-to-plan-confirm-button");

    if (!toggleButton || !panel || !confirmButton) return;

    toggleButton.addEventListener("click", function () {
        panel.classList.toggle("is-hidden");
    });

    confirmButton.addEventListener("click", function () {
        const params = new URLSearchParams(window.location.search);
        const recipeId = params.get("id");

        const day = document.getElementById("add-to-plan-day")?.value;
        const mealType = document.getElementById("add-to-plan-meal")?.value;

        if (!recipeId || !day || !mealType) {
            alert("Bitte Tag und Mahlzeit auswählen.");
            return;
        }

        localStorage.setItem("pendingRecipePlanSelection", JSON.stringify({
            recipeId,
            day,
            mealType
        }));

        window.location.href = "/index.html#meal-plan";
    });
}

window.onload = function () {
    initBurgerMenu();
    loadRecipeInstructions();
    setupShareIngredientsButton();
    setupEditRecipeButton();
    setupPortionScalingButtons();
setupAddToPlanControls();
};