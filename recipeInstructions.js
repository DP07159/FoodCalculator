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
    return Number(recipe?.is_favorite) === 1;
}

function updateFavoriteButton() {
    const button = document.getElementById("favorite-recipe-button");
    if (!button || !currentRecipe) return;

    const isFavorite = isFavoriteRecipe(currentRecipe);
    button.textContent = isFavorite ? "★" : "☆";
    button.classList.toggle("is-favorite", isFavorite);
    button.title = isFavorite ? "Favorit entfernen" : "Als Favorit markieren";
    button.setAttribute("aria-label", button.title);
}

async function toggleCurrentRecipeFavorite() {
    if (!currentRecipe) return;
    const newValue = isFavoriteRecipe(currentRecipe) ? 0 : 1;

    try {
        const response = await fetch(`${API_URL}/recipes/${currentRecipe.id}/favorite`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_favorite: newValue })
        });
        if (!response.ok) throw new Error("Favoritenstatus konnte nicht gespeichert werden.");
        currentRecipe.is_favorite = newValue;
        updateFavoriteButton();
        showToast(newValue === 1 ? "Als Favorit markiert." : "Favorit entfernt.");
    } catch (error) {
        console.error(error);
        showToast("Favoritenstatus konnte nicht gespeichert werden.");
    }
}

async function loadRecipeInstructions() {
    const recipeId = new URLSearchParams(window.location.search).get("id");
    if (!recipeId) {
        showToast("Keine Rezept-ID gefunden.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recipes/${recipeId}`);
        currentRecipe = await response.json();
        if (!response.ok || currentRecipe.error) throw new Error(currentRecipe.error || "Rezept nicht gefunden");
        renderRecipeInstructions();
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht geladen werden.");
    }
}

function renderRecipeInstructions() {
    if (!currentRecipe) return;

    document.getElementById("display-recipe-name").textContent = currentRecipe.name || "";
    document.getElementById("display-recipe-portions").textContent = currentRecipe.portions || "–";
    document.getElementById("display-recipe-calories").textContent = currentRecipe.calories || "–";

    const ingredientsList = document.getElementById("display-recipe-ingredients");
    ingredientsList.innerHTML = (currentRecipe.ingredients || "")
        .split("\n")
        .map(line => line.trim() ? `<li>${escapeHtml(line.trim())}</li>` : `<li class="empty-line">&nbsp;</li>`)
        .join("");

    const instructions = document.getElementById("display-recipe-instructions");
    instructions.innerHTML = (currentRecipe.instructions || "")
        .split("\n")
        .filter(line => line.trim())
        .map((line, index) => `<p><span>${index + 1}</span>${escapeHtml(line.trim())}</p>`)
        .join("");

    updateFavoriteButton();
}

function getIngredientsTextForSharing() {
    const recipeName = currentRecipe?.name || "Einkaufsliste";
    const ingredients = Array.from(document.querySelectorAll("#display-recipe-ingredients li"))
        .map(item => item.textContent.replace(/\u00A0/g, "").trim())
        .filter(Boolean);

    if (ingredients.length === 0) return "";
    return `${recipeName}\n\n${ingredients.map(item => `• ${item}`).join("\n")}`;
}

async function shareIngredientsList() {
    const text = getIngredientsTextForSharing();
    if (!text) {
        showToast("Für dieses Rezept wurden keine Zutaten gefunden.");
        return;
    }

    if (navigator.share) {
        try { await navigator.share({ title: "Zutatenliste", text }); }
        catch (error) { console.log("Teilen abgebrochen", error); }
    } else {
        await navigator.clipboard.writeText(text);
        showToast("Zutatenliste wurde kopiert.");
    }
}

function setupButtons() {
    document.getElementById("favorite-recipe-button")?.addEventListener("click", toggleCurrentRecipeFavorite);
    document.getElementById("share-ingredients-button")?.addEventListener("click", shareIngredientsList);
    document.getElementById("edit-recipe-button")?.addEventListener("click", () => {
        if (currentRecipe?.id) window.location.href = `/recipeDetails.html?id=${currentRecipe.id}`;
    });
}

window.onload = function () {
    initBurgerMenu();
    setupButtons();
    loadRecipeInstructions();
};
