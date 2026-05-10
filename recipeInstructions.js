const API_URL = "https://foodcalculator-server.onrender.com";

let currentRecipe = null;

function showToast(message) {
    const toast = document.getElementById("app-toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");

    window.clearTimeout(showToast.timeoutId);

    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2600);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function isFavoriteRecipe(recipe) {
    return Number(recipe.is_favorite) === 1;
}

function updateFavoriteButton() {
    const favoriteButton = document.getElementById("favorite-recipe-button");

    if (!favoriteButton || !currentRecipe) return;

    const isFavorite = isFavoriteRecipe(currentRecipe);

    favoriteButton.textContent = isFavorite ? "★" : "☆";
    favoriteButton.classList.toggle("is-favorite", isFavorite);
    favoriteButton.title = isFavorite ? "Favorit entfernen" : "Als Favorit markieren";
    favoriteButton.setAttribute("aria-label", favoriteButton.title);
}

async function toggleCurrentRecipeFavorite() {
    if (!currentRecipe) return;

    const newFavoriteValue = Number(currentRecipe.is_favorite) === 1 ? 0 : 1;

    try {
        const response = await fetch(`${API_URL}/recipes/${currentRecipe.id}/favorite`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                is_favorite: newFavoriteValue
            })
        });

        if (!response.ok) {
            showToast("Favoritenstatus konnte nicht gespeichert werden.");
            return;
        }

        currentRecipe.is_favorite = newFavoriteValue;
        updateFavoriteButton();

        showToast(newFavoriteValue === 1 ? "Als Favorit markiert." : "Favorit entfernt.");
    } catch (error) {
        console.error("Fehler beim Speichern des Favoritenstatus:", error);
        showToast("Favoritenstatus konnte nicht gespeichert werden.");
    }
}

function renderRecipeInstructions() {
    if (!currentRecipe) return;

    document.getElementById("display-recipe-name").textContent = currentRecipe.name || "";
    document.getElementById("display-recipe-portions").textContent = currentRecipe.portions || "";
    document.getElementById("display-recipe-calories").textContent = currentRecipe.calories || "";

    const ingredientsList = document.getElementById("display-recipe-ingredients");

    ingredientsList.innerHTML = (currentRecipe.ingredients || "")
        .split("\n")
        .map(ingredient => {
            if (ingredient.trim() === "") {
                return `<li class="empty-line">&nbsp;</li>`;
            }

            return `<li>${escapeHtml(ingredient.trim())}</li>`;
        })
        .join("");

    const instructionsList = document.getElementById("display-recipe-instructions");

    instructionsList.innerHTML = (currentRecipe.instructions || "")
        .split("\n")
        .filter(step => step.trim().length > 0)
        .map((step, index) => `<p><span>${index + 1}.</span> ${escapeHtml(step)}</p>`)
        .join("");

    updateFavoriteButton();
}

async function loadRecipeInstructions() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get("id");

    if (!recipeId) {
        showToast("Keine Rezept-ID gefunden.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`);
        const recipe = await response.json();

        if (!recipe || recipe.error) {
            showToast("Rezept wurde nicht gefunden.");
            return;
        }

        currentRecipe = recipe;
        renderRecipeInstructions();
    } catch (error) {
        console.error("Fehler beim Abrufen der Rezeptdetails:", error);
        showToast("Fehler beim Laden der Rezeptdetails.");
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
        showToast("Für dieses Rezept wurden keine Zutaten gefunden.");
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
            showToast("Zutatenliste wurde kopiert.");
        } catch (error) {
            console.error("Fehler beim Kopieren:", error);
            showToast("Zutatenliste konnte nicht kopiert werden.");
        }
    }
}

function setupFavoriteRecipeButton() {
    const favoriteButton = document.getElementById("favorite-recipe-button");

    if (!favoriteButton) return;

    favoriteButton.addEventListener("click", toggleCurrentRecipeFavorite);
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
    setupFavoriteRecipeButton();
    setupShareIngredientsButton();
    setupEditRecipeButton();
};