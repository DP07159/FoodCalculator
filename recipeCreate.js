const API_URL = "https://foodcalculator-server.onrender.com";

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

window.createRecipe = async function() {
    const name = document.getElementById("recipe-name").value.trim();
    const calories = document.getElementById("recipe-calories").value.trim();
    const portions = document.getElementById("recipe-portions").value.trim();
    const ingredients = document.getElementById("recipe-ingredients").value;
    const instructions = document.getElementById("recipe-instructions").value;
    const mealTypes = Array.from(document.querySelectorAll(".recipe-checkboxes input:checked")).map(input => input.value);

    if (!name || !calories || !portions || mealTypes.length === 0) {
        showToast("Bitte Name, Kalorien, Portionen und mindestens eine Mahlzeit angeben.");
        return;
    }

    try {
        const recipe = await apiFetch(`${API_URL}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, calories, portions, mealTypes, ingredients, instructions })
        });
        window.location.href = `/recipeInstructions.html?id=${recipe.id}`;
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht gespeichert werden.");
    }
};

window.onload = function () {
    initAutoResize();
};
