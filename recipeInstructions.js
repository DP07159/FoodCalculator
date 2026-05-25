const API_URL = "https://foodcalculator-server.onrender.com";

let currentRecipe = null;
let inventoryItems = [];
let recipeStockCheck = null;
let basePortions = 1;
let displayedPortions = 1;

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
    div.textContent = text ?? "";
    return div.innerHTML;
}

function isFavoriteRecipe(recipe) {
    return Number(recipe?.is_favorite) === 1;
}

function updateFavoriteButton() {
    const button = document.getElementById("favorite-recipe-button");
    if (!button || !currentRecipe) return;

    const isFavorite = isFavoriteRecipe(currentRecipe);
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

async function apiFetch(url) {
    const response = await fetch(url);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Serverfehler");
    return payload;
}

async function loadRecipeInstructions() {
    const recipeId = new URLSearchParams(window.location.search).get("id");
    if (!recipeId) {
        showToast("Keine Rezept-ID gefunden.");
        return;
    }

    try {
        currentRecipe = await apiFetch(`${API_URL}/recipes/${recipeId}`);
        basePortions = getSafePortions(currentRecipe.portions);
        displayedPortions = basePortions;
        await loadRecipeStockCheck();
        renderRecipeInstructions();
    } catch (error) {
        console.error(error);
        showToast("Rezept konnte nicht geladen werden.");
    }
}

async function loadRecipeStockCheck() {
    if (!currentRecipe?.id) return;
    try {
        recipeStockCheck = await apiFetch(`${API_URL}/recipes/${currentRecipe.id}/stock-check?portions=${displayedPortions}`);
    } catch (error) {
        console.error(error);
        recipeStockCheck = null;
        showToast("Bestandsprüfung konnte nicht geladen werden.");
    }
}

function getSafePortions(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/[,;].*$/, "")
        .replace(/\b(frisch|gekuehlt|gekühlt|tiefgekuehlt|tiefgekühlt|gehackt|geschnitten|gerieben|optional|nach geschmack)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function parseFraction(value) {
    const text = String(value || "").trim().replace(",", ".");
    const fractionMap = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
    if (fractionMap[text] !== undefined) return fractionMap[text];
    const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return Number(mixed[1]) + (Number(mixed[2]) / Number(mixed[3]));
    if (/^\d+\/\d+$/.test(text)) {
        const [a, b] = text.split("/").map(Number);
        return b ? a / b : null;
    }
    if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
    return null;
}

function normalizeIngredientUnit(unit) {
    const clean = String(unit || "").trim().toLowerCase().replace(".", "");
    const aliases = {
        g: "g", gr: "g", gramm: "g",
        kg: "kg", kilogramm: "kg",
        ml: "ml", milliliter: "ml",
        l: "l", liter: "l",
        stk: "Stk.", stück: "Stk.", stueck: "Stk.",
        dose: "Dose", dosen: "Dose",
        glas: "Glas", glaeser: "Glas", gläser: "Glas",
        packung: "Packung", packungen: "Packung", pkg: "Packung",
        el: "EL", esslöffel: "EL", essloeffel: "EL",
        tl: "TL", teelöffel: "TL", teeloeffel: "TL",
        prise: "Prise", prisen: "Prise"
    };
    return aliases[clean] || unit || "";
}

function unitForInventory(unit) {
    const normalized = normalizeIngredientUnit(unit);
    if (normalized === "kg" || normalized === "g") return "g";
    if (normalized === "l" || normalized === "ml") return "ml";
    return "Stk.";
}

function convertIngredientAmount(amount, unit) {
    if (amount === null || amount === undefined) return null;
    const normalized = normalizeIngredientUnit(unit);
    if (normalized === "kg" || normalized === "l") return amount * 1000;
    return amount;
}

function convertFromInventoryAmount(amount, unit) {
    const normalized = normalizeIngredientUnit(unit);
    if (normalized === "kg" || normalized === "l") return amount / 1000;
    return amount;
}

function formatAmount(amount, unit) {
    if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "";
    const normalized = normalizeIngredientUnit(unit);
    const displayAmount = convertFromInventoryAmount(Number(amount), normalized);
    const rounded = Math.round(displayAmount * 100) / 100;
    return `${String(rounded).replace(".", ",")} ${normalized || ""}`.trim();
}

function cleanIngredientName(value) {
    const unitPattern = "kg|g|gr|gramm|ml|l|liter|stk\\.?|stück|stueck|dose|dosen|glas|gläser|glaeser|packung|packungen|pkg|el|esslöffel|essloeffel|tl|teelöffel|teeloeffel|prise|prisen";
    const amountPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[,.]\\d+)?|[¼½¾⅓⅔])";

    return String(value || "")
        .replace(/\([^)]*\)/g, " ")
        .replace(new RegExp(`\\b(?:a|à)\\s*${amountPattern}\\s*(${unitPattern})\\b`, "gi"), " ")
        .replace(/[,;]/g, " ")
        .replace(/\b(frisch|gekuehlt|gekühlt|tiefgekuehlt|tiefgekühlt|gehackt|geschnitten|gerieben|optional|nach geschmack)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function findAmountUnitInIngredient(rawText) {
    const unitPattern = "kg|g|gr|gramm|ml|l|liter|stk\\.?|stück|stueck|dose|dosen|glas|gläser|glaeser|packung|packungen|pkg|el|esslöffel|essloeffel|tl|teelöffel|teeloeffel|prise|prisen";
    const amountPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[,.]\\d+)?|[¼½¾⅓⅔])";
    const amountUnitRegex = new RegExp(`(^|[\\s,(])(${amountPattern})\\s*(${unitPattern})\\b`, "i");
    const unitAmountRegex = new RegExp(`(^|[\\s,(])(${unitPattern})\\s*(${amountPattern})\\b`, "i");

    let match = rawText.match(amountUnitRegex);
    if (match) {
        const prefixLength = match[1] ? match[1].length : 0;
        const start = match.index + prefixLength;
        const token = match[0].slice(prefixLength);
        return {
            start,
            end: start + token.length,
            amountText: match[2],
            unitText: match[3]
        };
    }

    match = rawText.match(unitAmountRegex);
    if (match) {
        const prefixLength = match[1] ? match[1].length : 0;
        const start = match.index + prefixLength;
        const token = match[0].slice(prefixLength);
        return {
            start,
            end: start + token.length,
            amountText: match[3],
            unitText: match[2]
        };
    }

    const amountOnlyRegex = new RegExp(`(^|[\\s,(])(${amountPattern})(?=\\s|$)`, "i");
    match = rawText.match(amountOnlyRegex);
    if (match) {
        const prefixLength = match[1] ? match[1].length : 0;
        const start = match.index + prefixLength;
        const token = match[0].slice(prefixLength);
        return {
            start,
            end: start + token.length,
            amountText: match[2],
            unitText: "Stk."
        };
    }

    return null;
}

function parseIngredientLine(line) {
    const rawText = String(line || "").replace(/^[-•*]\s*/, "").replace(/\s+/g, " ").trim();
    if (!rawText) return null;

    let amount = null;
    let unit = "";
    let foodName = rawText;
    let originalAmountText = "";

    const amountUnit = findAmountUnitInIngredient(rawText);
    if (amountUnit) {
        originalAmountText = amountUnit.amountText;
        amount = parseFraction(amountUnit.amountText);
        unit = normalizeIngredientUnit(amountUnit.unitText);
        foodName = `${rawText.slice(0, amountUnit.start)} ${rawText.slice(amountUnit.end)}`;
    }

    foodName = cleanIngredientName(foodName);
    if (!foodName || foodName.length < 2) {
        return { raw_text: rawText, food_name: rawText, amount: null, unit: "", original_amount_text: originalAmountText };
    }

    return {
        raw_text: rawText,
        food_name: foodName,
        amount: convertIngredientAmount(amount, unit),
        unit: unitForInventory(unit),
        original_unit: normalizeIngredientUnit(unit),
        original_amount_text: originalAmountText
    };
}

function getPortionFactor() {
    return displayedPortions / basePortions;
}

function scaleIngredientLine(rawLine) {
    const factor = getPortionFactor();
    if (factor === 1) return rawLine;

    const text = String(rawLine || "");
    const amountUnit = findAmountUnitInIngredient(text);
    if (!amountUnit) return text;

    const amount = parseFraction(amountUnit.amountText);
    if (amount === null || amount === undefined) return text;

    const scaled = Math.round(amount * factor * 100) / 100;
    const scaledText = String(scaled).replace(".", ",");
    return `${text.slice(0, amountUnit.start)}${scaledText}${text.slice(amountUnit.start + amountUnit.amountText.length)}`;
}

function findInventoryItemForIngredient(foodName) {
    const target = normalizeName(foodName);
    if (!target) return null;

    return inventoryItems.find(item => {
        const itemName = normalizeName(item.name);
        const matchName = normalizeName(item.recipe_match_name || "");
        return itemName === target || matchName === target;
    }) || inventoryItems.find(item => {
        const itemName = normalizeName(item.name);
        return itemName && (target.includes(itemName) || itemName.includes(target));
    }) || null;
}

function getAvailableAmount(item, requestedUnit) {
    if (!item) return 0;
    const inventoryUnit = unitForInventory(requestedUnit || item.unit || "g");
    const batches = Array.isArray(item.batches) ? item.batches : [];

    return batches.reduce((sum, batch) => {
        const batchUnit = unitForInventory(batch.measure_unit || item.unit || "g");

        if (inventoryUnit === "g" || inventoryUnit === "ml") {
            return batchUnit === inventoryUnit ? sum + Number(batch.remaining_weight || 0) : sum;
        }

        if (inventoryUnit === "Stk.") {
            if (batch.batch_type === "package") return sum + Number(batch.remaining_quantity || 0);
            return batchUnit === "Stk." ? sum + Number(batch.remaining_weight || 0) : sum;
        }

        return sum;
    }, 0);
}

function getStockStatus(parsedIngredient) {
    if (!parsedIngredient) {
        return { status: "unknown", label: "Nicht prüfbar", detail: "" };
    }

    const item = findInventoryItemForIngredient(parsedIngredient.food_name);
    const available = getAvailableAmount(item, parsedIngredient.unit || "g");
    const requiredBase = parsedIngredient.amount;
    const required = requiredBase !== null && requiredBase !== undefined
        ? Number(requiredBase) * getPortionFactor()
        : null;

    if (!item || available <= 0) {
        return { status: "missing", label: "Nicht im Bestand", detail: required ? `Benötigt: ${formatAmount(required, parsedIngredient.original_unit || parsedIngredient.unit)}` : "Bestand 0" };
    }

    if (required === null || required === undefined || !Number.isFinite(required) || required <= 0) {
        return { status: "available", label: "Im Bestand", detail: `Vorhanden: ${formatAmount(available, parsedIngredient.unit || item.unit)}` };
    }

    if (available >= required) {
        return { status: "available", label: "Vorhanden", detail: `${formatAmount(required, parsedIngredient.original_unit || parsedIngredient.unit)} benötigt · ${formatAmount(available, parsedIngredient.unit || item.unit)} vorhanden` };
    }

    return { status: "partial", label: "Teilbestand", detail: `${formatAmount(required, parsedIngredient.original_unit || parsedIngredient.unit)} benötigt · ${formatAmount(available, parsedIngredient.unit || item.unit)} vorhanden` };
}

function renderRecipeInstructions() {
    if (!currentRecipe) return;

    document.getElementById("display-recipe-name").textContent = currentRecipe.name || "";
    document.getElementById("display-recipe-portions").textContent = displayedPortions || "–";
    document.getElementById("display-recipe-calories").textContent = currentRecipe.calories || "–";

    const ingredientsList = document.getElementById("display-recipe-ingredients");
    const ingredientLines = (currentRecipe.ingredients || "").split("\n");
    const stockEntries = Array.isArray(recipeStockCheck?.ingredients) ? recipeStockCheck.ingredients : [];
    let stockIndex = 0;

    ingredientsList.innerHTML = ingredientLines
        .map(line => {
            if (!line.trim()) return `<li class="empty-line">&nbsp;</li>`;

            const entry = stockEntries[stockIndex] || null;
            stockIndex += 1;

            const status = entry?.status || "unknown";
            const label = entry?.label || "Nicht prüfbar";
            const displayText = entry?.display_text || scaleIngredientLine(line.trim());

            return `
                <li class="recipe-ingredient-stock-row recipe-stock-${status}">
                    <span class="recipe-ingredient-text">${escapeHtml(displayText)}</span>
                    <span class="recipe-stock-flag" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>
                </li>
            `;
        })
        .join("");

    const stockSummary = document.getElementById("recipe-stock-summary");
    if (stockSummary) {
        const summary = recipeStockCheck?.summary;
        stockSummary.textContent = summary
            ? `${summary.available} vollständig · ${summary.partial} teilweise · ${summary.missing} nicht vorhanden`
            : "Bestandsprüfung aktuell nicht verfügbar.";
    }

    const instructions = document.getElementById("display-recipe-instructions");
    instructions.innerHTML = (currentRecipe.instructions || "")
        .split("\n")
        .filter(line => line.trim())
        .map((line, index) => `
            <p class="recipe-instruction-step" role="button" tabindex="0" data-step="${index + 1}">
                <span>${index + 1}</span>${escapeHtml(line.trim())}
            </p>
        `)
        .join("");

    setupInstructionStepHighlighting();

    updatePortionButtons();
    updateFavoriteButton();
}

function updatePortionButtons() {
    const decreaseButton = document.getElementById("decrease-portions-button");
    if (decreaseButton) decreaseButton.disabled = displayedPortions <= 1;
}

async function adjustDisplayedPortions(delta) {
    const nextValue = Math.max(1, displayedPortions + delta);
    if (nextValue === displayedPortions) return;
    displayedPortions = nextValue;
    await loadRecipeStockCheck();
    renderRecipeInstructions();
}

function setupInstructionStepHighlighting() {
    document.querySelectorAll(".recipe-instruction-step").forEach(step => {
        const activate = () => {
            document.querySelectorAll(".recipe-instruction-step.is-active").forEach(activeStep => {
                activeStep.classList.remove("is-active");
            });
            step.classList.add("is-active");
        };
        step.addEventListener("click", activate);
        step.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
            }
        });
    });
}

function getIngredientsTextForSharing() {
    const recipeName = currentRecipe?.name || "Einkaufsliste";
    const ingredients = Array.from(document.querySelectorAll("#display-recipe-ingredients .recipe-ingredient-text"))
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
    document.getElementById("decrease-portions-button")?.addEventListener("click", () => adjustDisplayedPortions(-1));
    document.getElementById("increase-portions-button")?.addEventListener("click", () => adjustDisplayedPortions(1));
}

window.onload = function () {
    initBurgerMenu();
    setupButtons();
    loadRecipeInstructions();
};
