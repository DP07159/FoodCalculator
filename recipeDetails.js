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


let ingredientAutocompleteState = {
    textarea: null,
    suggestions: [],
    activeIndex: -1,
    timeoutId: null
};

function getIngredientAutocompletePanel() {
    let panel = document.getElementById("ingredient-autocomplete-panel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "ingredient-autocomplete-panel";
        panel.className = "ingredient-autocomplete-panel is-hidden";
        document.body.appendChild(panel);
    }
    return panel;
}

function getCurrentIngredientLine(textarea) {
    const value = textarea.value || "";
    const cursor = textarea.selectionStart || 0;
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    let lineEnd = value.indexOf("\n", cursor);
    if (lineEnd === -1) lineEnd = value.length;
    const line = value.slice(lineStart, lineEnd);
    return { value, cursor, lineStart, lineEnd, line };
}

function splitIngredientLineForSuggestion(line) {
    const amountPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[,.]\\d+)?|[¼½¾⅓⅔])";
    const unitPattern = "kg|g|gr|gramm|ml|l|liter|stk\\.?|stück|stueck|dose|dosen|glas|gläser|glaeser|packung|packungen|pkg|el|esslöffel|essloeffel|tl|teelöffel|teeloeffel|prise|prisen";
    const match = String(line || "").match(new RegExp(`^(\\s*(?:[-•*]\\s*)?(?:${amountPattern})?\\s*(?:${unitPattern})?\\s*)(.*)$`, "i"));
    return {
        prefix: match ? match[1] : "",
        query: (match ? match[2] : line).trim()
    };
}

function positionIngredientAutocompletePanel(textarea) {
    const panel = getIngredientAutocompletePanel();
    const rect = textarea.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 6}px`;
    panel.style.width = `${rect.width}px`;
}

function hideIngredientAutocomplete() {
    const panel = getIngredientAutocompletePanel();
    panel.classList.add("is-hidden");
    panel.innerHTML = "";
    ingredientAutocompleteState.suggestions = [];
    ingredientAutocompleteState.activeIndex = -1;
}

async function fetchIngredientSuggestions(query) {
    const url = `${API_URL}/inventory/suggestions?q=${encodeURIComponent(query)}`;
    return apiFetch(url);
}

function applyIngredientSuggestion(suggestion) {
    const textarea = ingredientAutocompleteState.textarea;
    if (!textarea || !suggestion?.name) return;

    const current = getCurrentIngredientLine(textarea);
    const split = splitIngredientLineForSuggestion(current.line);
    const newLine = `${split.prefix}${suggestion.name}`.trimStart();
    textarea.value = `${current.value.slice(0, current.lineStart)}${newLine}${current.value.slice(current.lineEnd)}`;
    const newCursor = current.lineStart + newLine.length;
    textarea.setSelectionRange(newCursor, newCursor);
    textarea.focus();
    resizeTextArea(textarea);
    hideIngredientAutocomplete();
}

function renderIngredientAutocomplete(suggestions) {
    const panel = getIngredientAutocompletePanel();
    ingredientAutocompleteState.suggestions = Array.isArray(suggestions) ? suggestions : [];
    ingredientAutocompleteState.activeIndex = -1;

    if (!ingredientAutocompleteState.suggestions.length) {
        hideIngredientAutocomplete();
        return;
    }

    positionIngredientAutocompletePanel(ingredientAutocompleteState.textarea);
    panel.innerHTML = ingredientAutocompleteState.suggestions.map((suggestion, index) => `
        <button type="button" class="ingredient-autocomplete-option" data-index="${index}">
            <span>${suggestion.name}</span>
            ${suggestion.calories_per_100g !== null && suggestion.calories_per_100g !== undefined ? `<small>${suggestion.calories_per_100g} kcal / 100 g</small>` : ""}
        </button>
    `).join("");
    panel.classList.remove("is-hidden");

    panel.querySelectorAll(".ingredient-autocomplete-option").forEach(button => {
        button.addEventListener("mousedown", (event) => {
            event.preventDefault();
            const index = Number(button.dataset.index);
            applyIngredientSuggestion(ingredientAutocompleteState.suggestions[index]);
        });
    });
}

function updateIngredientAutocomplete() {
    const textarea = ingredientAutocompleteState.textarea;
    if (!textarea) return;
    const { line } = getCurrentIngredientLine(textarea);
    const { query } = splitIngredientLineForSuggestion(line);

    window.clearTimeout(ingredientAutocompleteState.timeoutId);
    if (query.length < 2) {
        hideIngredientAutocomplete();
        return;
    }

    ingredientAutocompleteState.timeoutId = window.setTimeout(async () => {
        try {
            const suggestions = await fetchIngredientSuggestions(query);
            renderIngredientAutocomplete(suggestions.filter(item => item.name.toLowerCase() !== query.toLowerCase()).slice(0, 8));
        } catch (error) {
            console.error("Zutatenvorschläge konnten nicht geladen werden:", error);
            hideIngredientAutocomplete();
        }
    }, 160);
}

function initIngredientAutocomplete() {
    const textarea = document.getElementById("recipe-ingredients");
    if (!textarea) return;
    ingredientAutocompleteState.textarea = textarea;
    textarea.setAttribute("autocomplete", "off");

    textarea.addEventListener("input", updateIngredientAutocomplete);
    textarea.addEventListener("click", updateIngredientAutocomplete);
    textarea.addEventListener("keyup", (event) => {
        if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) return;
        updateIngredientAutocomplete();
    });
    textarea.addEventListener("keydown", (event) => {
        const panel = getIngredientAutocompletePanel();
        if (panel.classList.contains("is-hidden")) return;
        const suggestions = ingredientAutocompleteState.suggestions;
        if (!suggestions.length) return;

        if (event.key === "Escape") {
            hideIngredientAutocomplete();
            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const delta = event.key === "ArrowDown" ? 1 : -1;
            ingredientAutocompleteState.activeIndex = (ingredientAutocompleteState.activeIndex + delta + suggestions.length) % suggestions.length;
            panel.querySelectorAll(".ingredient-autocomplete-option").forEach((button, index) => {
                button.classList.toggle("is-active", index === ingredientAutocompleteState.activeIndex);
            });
        }

        if (event.key === "Enter" && ingredientAutocompleteState.activeIndex >= 0) {
            event.preventDefault();
            applyIngredientSuggestion(suggestions[ingredientAutocompleteState.activeIndex]);
        }
    });

    document.addEventListener("click", (event) => {
        const panel = getIngredientAutocompletePanel();
        if (event.target === textarea || panel.contains(event.target)) return;
        hideIngredientAutocomplete();
    });

    window.addEventListener("resize", () => {
        if (!getIngredientAutocompletePanel().classList.contains("is-hidden")) positionIngredientAutocompletePanel(textarea);
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
    initBurgerMenu();
    loadRecipeDetails();
    initIngredientAutocomplete();
};
