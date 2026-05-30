const API_URL = "https://foodcalculator-server.onrender.com";

let ingredientLinksByLine = new Map();
let ingredientAutocomplete = {
    panel: null,
    textarea: null,
    activeLineIndex: null,
    activeLineText: "",
    suggestions: []
};

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

function getIngredientLines() {
    const textarea = document.getElementById("recipe-ingredients");
    return textarea ? textarea.value.split(/\r?\n/) : [];
}

function getLineInfoAtCursor(textarea) {
    const value = textarea.value;
    const cursor = textarea.selectionStart || 0;
    const before = value.slice(0, cursor);
    const lineIndex = before.split(/\r?\n/).length - 1;
    const lines = value.split(/\r?\n/);
    return { lineIndex, lineText: lines[lineIndex] || "" };
}

function invalidateChangedIngredientLinks() {
    const lines = getIngredientLines();
    Array.from(ingredientLinksByLine.entries()).forEach(([lineIndex, link]) => {
        if ((lines[lineIndex] || "").trim() !== (link.raw_text || "").trim()) {
            ingredientLinksByLine.delete(lineIndex);
        }
    });
}

function getIngredientLinksPayload() {
    const lines = getIngredientLines();
    return Array.from(ingredientLinksByLine.entries())
        .map(([lineIndex, link]) => ({
            line_index: Number(lineIndex),
            raw_text: lines[lineIndex] || link.raw_text || "",
            food_item_id: link.food_item_id
        }))
        .filter(link => link.raw_text.trim() && link.food_item_id);
}

function ensureIngredientAutocompletePanel() {
    if (ingredientAutocomplete.panel) return ingredientAutocomplete.panel;
    const panel = document.createElement("div");
    panel.id = "ingredient-autocomplete-panel";
    panel.className = "ingredient-autocomplete-panel is-hidden";
    document.body.appendChild(panel);
    ingredientAutocomplete.panel = panel;
    return panel;
}

function positionIngredientAutocompletePanel(textarea) {
    const panel = ensureIngredientAutocompletePanel();
    const rect = textarea.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 8}px`;
    panel.style.width = `${rect.width}px`;
}

function hideIngredientAutocompletePanel() {
    const panel = ensureIngredientAutocompletePanel();
    panel.classList.add("is-hidden");
    panel.innerHTML = "";
    ingredientAutocomplete.suggestions = [];
}

function renderIngredientAutocompletePanel(suggestions) {
    const panel = ensureIngredientAutocompletePanel();
    panel.innerHTML = "";

    if (!suggestions.length) {
        hideIngredientAutocompletePanel();
        return;
    }

    suggestions.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `ingredient-autocomplete-option${index === 0 ? " is-active" : ""}`;
        button.innerHTML = `<span>${item.display_name}</span><small>${item.score === 100 ? "Exakter Treffer" : "Vorschlag"}</small>`;
        button.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectIngredientSuggestion(item);
        });
        panel.appendChild(button);
    });

    panel.classList.remove("is-hidden");
}

async function updateIngredientAutocomplete() {
    const textarea = document.getElementById("recipe-ingredients");
    if (!textarea) return;

    invalidateChangedIngredientLinks();

    const { lineIndex, lineText } = getLineInfoAtCursor(textarea);
    ingredientAutocomplete.activeLineIndex = lineIndex;
    ingredientAutocomplete.activeLineText = lineText;

    if (!lineText.trim() || lineText.trim().length < 2) {
        hideIngredientAutocompletePanel();
        return;
    }

    try {
        const result = await apiFetch(`${API_URL}/food-items/resolve?q=${encodeURIComponent(lineText)}`);
        const suggestions = [];
        if (result.exact) suggestions.push({ ...result.exact, score: 100 });
        (result.suggestions || []).forEach(item => {
            if (!suggestions.some(existing => Number(existing.id) === Number(item.id))) suggestions.push(item);
        });

        ingredientAutocomplete.suggestions = suggestions.slice(0, 5);
        positionIngredientAutocompletePanel(textarea);
        renderIngredientAutocompletePanel(ingredientAutocomplete.suggestions);
    } catch (error) {
        console.error(error);
        hideIngredientAutocompletePanel();
    }
}

function selectIngredientSuggestion(item) {
    const textarea = document.getElementById("recipe-ingredients");
    if (!textarea || ingredientAutocomplete.activeLineIndex === null) return;

    const lines = getIngredientLines();
    const rawText = lines[ingredientAutocomplete.activeLineIndex] || ingredientAutocomplete.activeLineText || "";
    ingredientLinksByLine.set(ingredientAutocomplete.activeLineIndex, {
        line_index: ingredientAutocomplete.activeLineIndex,
        raw_text: rawText,
        food_item_id: item.id,
        display_name: item.display_name
    });

    hideIngredientAutocompletePanel();
    showToast(`Zutat mit „${item.display_name}“ verknüpft.`);
    textarea.focus();
}

function initIngredientAutocomplete() {
    const textarea = document.getElementById("recipe-ingredients");
    if (!textarea) return;
    ensureIngredientAutocompletePanel();

    textarea.addEventListener("input", () => {
        resizeTextArea(textarea);
        window.clearTimeout(updateIngredientAutocomplete.timeoutId);
        updateIngredientAutocomplete.timeoutId = window.setTimeout(updateIngredientAutocomplete, 180);
    });
    textarea.addEventListener("click", updateIngredientAutocomplete);
    textarea.addEventListener("keyup", updateIngredientAutocomplete);
    textarea.addEventListener("blur", () => {
        window.setTimeout(hideIngredientAutocompletePanel, 160);
    });

    window.addEventListener("resize", () => {
        if (!ensureIngredientAutocompletePanel().classList.contains("is-hidden")) positionIngredientAutocompletePanel(textarea);
    });
}

const recipeId = new URLSearchParams(window.location.search).get("id");
let currentRecipe = null;

function hydrateIngredientLinksFromRecipe(recipe) {
    ingredientLinksByLine.clear();
    const links = Array.isArray(recipe?.ingredientLinks) ? recipe.ingredientLinks : [];
    links.forEach(link => {
        if (link.food_item_id && Number.isInteger(Number(link.line_index))) {
            ingredientLinksByLine.set(Number(link.line_index), {
                line_index: Number(link.line_index),
                raw_text: link.raw_text || "",
                food_item_id: link.food_item_id,
                display_name: link.food_name || ""
            });
        }
    });
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
        hydrateIngredientLinksFromRecipe(currentRecipe);

        document.querySelectorAll(".recipe-checkboxes input").forEach(input => {
            input.checked = Array.isArray(currentRecipe.mealTypes) && currentRecipe.mealTypes.includes(input.value);
        });

        initAutoResize();
        initIngredientAutocomplete();
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
                is_favorite: currentRecipe?.is_favorite || 0,
                ingredientLinks: getIngredientLinksPayload()
            })
        });
        window.location.href = `/recipeInstructions.html?id=${updated.id}`;
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht gespeichert werden.");
    }
};

window.onload = function () {
    if (typeof initBurgerMenu === "function") initBurgerMenu();
    loadRecipeDetails();
};
