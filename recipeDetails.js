const API_URL = "https://foodcalculator-server.onrender.com";
const recipeId = new URLSearchParams(window.location.search).get("id");
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

function resizeTextArea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function initAutoResize() {
    ["recipe-ingredients", "recipe-instructions"].forEach(id => {
        const textarea = document.getElementById(id);
        if (!textarea) return;
        textarea.addEventListener("input", () => resizeTextArea(textarea));
        resizeTextArea(textarea);
    });
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}

async function loadRecipeDetails() {
    if (!recipeId) {
        showToast("Keine gültige Rezept-ID gefunden.");
        window.location.href = "/index.html";
        return;
    }

    try {
        currentRecipe = await apiFetch(`${API_URL}/recipes/${recipeId}`);
        document.getElementById("recipe-name").value = currentRecipe.name || "";
        document.getElementById("recipe-calories").value = currentRecipe.calories || "";
        document.getElementById("recipe-portions").value = currentRecipe.portions || "";
        document.getElementById("recipe-ingredients").value = currentRecipe.ingredients || "";
        document.getElementById("recipe-instructions").value = currentRecipe.instructions || "";

        document.querySelectorAll(".recipe-checkboxes input").forEach(input => {
            input.checked = Array.isArray(currentRecipe.mealTypes) && currentRecipe.mealTypes.includes(input.value);
        });

        initAutoResize();
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht geladen werden.");
    }
}

window.updateRecipe = async function() {
    const name = document.getElementById("recipe-name").value.trim();
    const calories = document.getElementById("recipe-calories").value.trim();
    const portions = document.getElementById("recipe-portions").value.trim();
    const ingredients = document.getElementById("recipe-ingredients").value;
    const instructions = document.getElementById("recipe-instructions").value;
    const mealTypes = Array.from(document.querySelectorAll(".recipe-checkboxes input:checked")).map(input => input.value);

    if (!name || !calories || mealTypes.length === 0) {
        showToast("Bitte Name, Kalorien und mindestens eine Mahlzeit angeben.");
        return;
    }

    try {
        const updated = await apiFetch(`${API_URL}/recipes/${recipeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                calories,
                portions,
                mealTypes,
                ingredients,
                instructions,
                is_favorite: currentRecipe?.is_favorite || 0
            })
        });
        window.location.href = `/recipeInstructions.html?id=${updated.id}`;
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht gespeichert werden.");
    }
};

window.onload = function () {
    loadRecipeDetails();
};
