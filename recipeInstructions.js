const API_URL = "https://foodcalculator-server.onrender.com";

let currentRecipe = null;
let inventoryItems = [];
let recipeStockCheck = null;
let recipeWalletInspirations = [];
let recipeFoodMoments = [];
let allRecipeFoodMoments = [];
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

function escapeJsString(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ");
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
        const response = await AuthShell.request(`${API_URL}/recipes/${currentRecipe.id}/favorite`, {
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

async function apiFetch(url, options = {}) {
    const response = await AuthShell.request(url, options);
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
        await Promise.all([loadRecipeStockCheck(), loadRecipeWalletInspirations(), loadRecipeFoodMoments()]);
        renderRecipeInstructions();
        renderRecipeWalletInspirations();
        renderRecipeFoodMomentContext();
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


const walletCategoryLabels = {
    recipe: "Rezept / Gericht", restaurant: "Restaurant / Café", product: "Produkt / Zutat",
    technique: "Kochtechnik / How-to", presentation: "Anrichten / Präsentation",
    shop: "Shop / Markt / Produzent", other: "Sonstiges"
};

async function loadRecipeWalletInspirations() {
    if (!currentRecipe?.id) return;
    try {
        recipeWalletInspirations = await apiFetch(`${API_URL}/wallet/for-recipe/${currentRecipe.id}`);
        if (!Array.isArray(recipeWalletInspirations)) recipeWalletInspirations = [];
    } catch (error) {
        console.info("Keine Wallet-Inspirationen für dieses Rezept verfügbar.", error.message);
        recipeWalletInspirations = [];
    }
}

async function loadRecipeFoodMoments() {
    if (!currentRecipe?.id) return;
    try {
        recipeFoodMoments = await apiFetch(`${API_URL}/food-moments/recipe/${currentRecipe.id}`);
        if (!Array.isArray(recipeFoodMoments)) recipeFoodMoments = [];
    } catch (error) {
        console.info("Keine Food-Moment-Verknüpfungen für dieses Rezept verfügbar.", error.message);
        recipeFoodMoments = [];
    }
}

function formatRecipeFoodMomentDate(moment) {
    if (!moment?.moment_date) return "Ohne festes Datum";
    const date = new Date(`${moment.moment_date}T12:00:00`);
    const label = date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
    return `${label}${moment.moment_time ? ` · ${moment.moment_time}` : ""}`;
}

function renderRecipeFoodMomentContext() {
    const button = document.getElementById("recipe-food-moments-button");
    const badge = document.getElementById("recipe-food-moments-badge");
    const list = document.getElementById("recipe-food-moments-list");
    if (!button || !list) return;
    button.classList.remove("is-hidden");
    if (badge) badge.textContent = recipeFoodMoments.length ? String(recipeFoodMoments.length) : "";
    renderRecipeFoodMomentPicker();
}

async function openRecipeFoodMoments() {
    const dialog = document.getElementById("recipe-food-moments-dialog");
    try { allRecipeFoodMoments = await apiFetch(`${API_URL}/food-moments`); } catch (_) { allRecipeFoodMoments = [...recipeFoodMoments]; }
    renderRecipeFoodMomentPicker();
    if (dialog?.showModal) dialog.showModal();
}
function renderRecipeFoodMomentPicker() {
    const list=document.getElementById("recipe-food-moments-list"); if(!list) return;
    const q=(document.getElementById("recipe-food-moments-search")?.value||"").trim().toLocaleLowerCase("de");
    const linked=new Set(recipeFoodMoments.map(m=>m.public_id));
    const source=(allRecipeFoodMoments.length?allRecipeFoodMoments:recipeFoodMoments).filter(m=>String(m.title||"").toLocaleLowerCase("de").includes(q));
    list.innerHTML=source.length?source.map(m=>`<label class="recipe-context-option"><span><strong>${escapeHtml(m.title||"Food Moment")}</strong><small>${escapeHtml(formatRecipeFoodMomentDate(m))}</small></span><input type="checkbox" data-moment-id="${escapeHtml(m.public_id)}" ${linked.has(m.public_id)?"checked":""}></label>`).join(""):'<p class="recipe-context-empty">Keine passenden Food Moments gefunden.</p>';
}
async function saveRecipeFoodMomentLinks(){
    const state=document.getElementById("recipe-food-moments-state"); const boxes=[...document.querySelectorAll("#recipe-food-moments-list input[data-moment-id]")];
    const desired=new Set(boxes.filter(b=>b.checked).map(b=>b.dataset.momentId)); const currently=new Set(recipeFoodMoments.map(m=>m.public_id));
    const changed=[...new Set([...desired,...currently])].filter(id=>desired.has(id)!==currently.has(id));
    if(!changed.length){ closeRecipeFoodMoments(); return; }
    try{ if(state)state.textContent="Wird gespeichert …"; for(const id of changed){ const m=allRecipeFoodMoments.find(x=>x.public_id===id)||recipeFoodMoments.find(x=>x.public_id===id); if(!m)continue; const ids=(m.recipes||[]).map(r=>Number(r.id)).filter(Boolean); const next=desired.has(id)?[...new Set([...ids,Number(currentRecipe.id)])]:ids.filter(x=>x!==Number(currentRecipe.id)); await apiFetch(`${API_URL}/food-moments/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({recipe_ids:next})}); } await loadRecipeFoodMoments(); renderRecipeFoodMomentContext(); closeRecipeFoodMoments(); showToast("Food-Moment-Verknüpfungen aktualisiert"); }catch(e){ if(state)state.textContent=e.message; }
}
function createFoodMomentFromRecipe(){ location.href=`/foodMomentCreate.html?recipe_id=${encodeURIComponent(currentRecipe.id)}`; }
function closeRecipeFoodMoments() { document.getElementById("recipe-food-moments-dialog")?.close(); }

function getWalletSourceHost(item) {
    try { return new URL(item.source_url).hostname.replace(/^www\./, ""); } catch (_) { return item.source_platform || "Quelle"; }
}

function renderRecipeWalletInspirations() {
    const section = document.getElementById("recipe-inspiration-section");
    const list = document.getElementById("recipe-inspiration-list");
    const count = document.getElementById("recipe-inspiration-count");
    if (!section || !list) return;
    if (!recipeWalletInspirations.length) { section.classList.add("is-hidden"); list.innerHTML = ""; return; }
    section.classList.remove("is-hidden");
    if (count) count.textContent = recipeWalletInspirations.length > 1 ? `${recipeWalletInspirations.length} Quellen` : "";
    list.innerHTML = recipeWalletInspirations.map(item => {
        const title = item.title || item.source_page_title || "Gespeicherte Inspiration";
        const category = walletCategoryLabels[item.category] || "Inspiration";
        const image = item.source_image_url ? `<div class="recipe-inspiration-image"><img src="${escapeHtml(item.source_image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>` : "";
        const action = item.source_url ? `<a class="recipe-inspiration-source-link" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer"><span>Original öffnen</span><svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg></a>` : "";
        return `<article class="recipe-inspiration-card">${image}<div class="recipe-inspiration-copy"><div class="recipe-inspiration-meta"><span>${escapeHtml(category)}</span><span>${escapeHtml(getWalletSourceHost(item))}</span></div><h3>${escapeHtml(title)}</h3>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}${action}</div></article>`;
    }).join("");
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
        .replace(new RegExp(`(^|[\\s,(])${amountPattern}\\s*(${unitPattern})\\b`, "gi"), " ")
        .replace(new RegExp(`(^|[\\s,(])(${unitPattern})\\s*${amountPattern}\\b`, "gi"), " ")
        .replace(/\b(?:in|mit)\s+(?:eigenem\s+saft|saft|wasser|oel|öl|lake|tomatensauce)\b/gi, " ")
        .replace(/[,;:/]/g, " ")
        .replace(/(^|\s)(?:a|à|je|pro)(?=\s|$)/gi, " ")
        .replace(/\b(frisch|frische|frischer|frisches|gekuehlt|gekühlt|tiefgekuehlt|tiefgekühlt|gehackt|geschnitten|gerieben|optional|nach geschmack|abtropfgewicht|abgetropft|netto|einwaage|füllmenge|fuellmenge|natur|naturell)\b/gi, " ")
        .replace(/\b(thunfischstuecke|thunfischstücke|thunfischfilets|thunfischfilet|tunfisch)\b/gi, "Thunfisch")
        .replace(/\s+/g, " ")
        .trim();
}

function findAmountUnitMatches(rawText, unitPattern) {
    const text = String(rawText || "");
    const amountPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[,.]\\d+)?|[¼½¾⅓⅔])";
    const matches = [];
    const patterns = [
        { regex: new RegExp(`(^|[\\s,(])(${amountPattern})\\s*(${unitPattern})\\b`, "gi"), amountIndex: 2, unitIndex: 3 },
        { regex: new RegExp(`(^|[\\s,(])(${unitPattern})\\s*(${amountPattern})\\b`, "gi"), amountIndex: 3, unitIndex: 2 }
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            const prefixLength = match[1] ? match[1].length : 0;
            const start = match.index + prefixLength;
            const token = match[0].slice(prefixLength);
            matches.push({ start, end: start + token.length, amountText: match[pattern.amountIndex], unitText: match[pattern.unitIndex], token });
        }
    }
    return matches.sort((a, b) => a.start - b.start);
}

function getContainerMultiplier(rawText, physicalMatch) {
    const before = String(rawText || "").slice(0, physicalMatch?.start ?? 0);
    const containerUnitPattern = "stk\\.?|stück|stueck|dose|dosen|glas|gläser|glaeser|packung|packungen|pkg";
    const containerMatches = findAmountUnitMatches(before, containerUnitPattern);
    if (!containerMatches.length) return 1;
    const last = containerMatches[containerMatches.length - 1];
    const between = String(rawText || "").slice(last.end, physicalMatch.start).toLowerCase();
    const multiplier = parseFraction(last.amountText);
    return between.length <= 50 && multiplier && multiplier > 0 ? multiplier : 1;
}

function findAmountUnitInIngredient(rawText) {
    const amountPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[,.]\\d+)?|[¼½¾⅓⅔])";
    const physicalUnitPattern = "kg|g|gr|gramm|ml|l|liter";
    const containerUnitPattern = "stk\\.?|stück|stueck|dose|dosen|glas|gläser|glaeser|packung|packungen|pkg|el|esslöffel|essloeffel|tl|teelöffel|teeloeffel|prise|prisen";

    const physicalMatches = findAmountUnitMatches(rawText, physicalUnitPattern);
    if (physicalMatches.length) {
        const text = String(rawText || "").toLowerCase();
        const selected = /abtropf|abgetropft|netto|einwaage/.test(text)
            ? physicalMatches[physicalMatches.length - 1]
            : physicalMatches[0];
        return { ...selected, multiplier: getContainerMultiplier(rawText, selected) };
    }

    const containerMatches = findAmountUnitMatches(rawText, containerUnitPattern);
    if (containerMatches.length) return { ...containerMatches[0], multiplier: 1 };

    const amountOnlyRegex = new RegExp(`(^|[\\s,(])(${amountPattern})(?=\\s|$)`, "i");
    const match = String(rawText || "").match(amountOnlyRegex);
    if (match) {
        const prefixLength = match[1] ? match[1].length : 0;
        const start = match.index + prefixLength;
        const token = match[0].slice(prefixLength);
        return { start, end: start + token.length, amountText: match[2], unitText: "Stk.", multiplier: 1 };
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
        if (amount !== null && amount !== undefined && amountUnit.multiplier) amount *= amountUnit.multiplier;
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


function getExpiryStatus(expiryDate) {
    if (!expiryDate) return { label: "Kein Ablaufdatum", className: "inventory-neutral" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Abgelaufen", className: "inventory-expired" };
    if (diffDays <= 3) return { label: "Läuft sehr bald ab", className: "inventory-critical" };
    if (diffDays <= 7) return { label: "Läuft bald ab", className: "inventory-warning" };
    return { label: "Haltbar", className: "inventory-good" };
}

function formatDate(dateString) {
    if (!dateString) return "Kein Ablaufdatum";
    return new Date(dateString).toLocaleDateString("de-DE");
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return String(Math.round(number * 100) / 100).replace(".", ",");
}

function getInventoryOverlayRows(item) {
    const batches = Array.isArray(item?.batches) ? item.batches : [];
    if (!batches.length) return `<p class="recipe-empty-state">Noch keine Bestandspositionen vorhanden.</p>`;

    return batches.map(batch => {
        const status = getExpiryStatus(batch.expiry_date);
        const isPackage = batch.batch_type === "package";
        const title = isPackage
            ? `${formatNumber(batch.remaining_quantity)} × ${formatNumber(batch.unit_weight)} ${batch.measure_unit || item.unit || "g"}`
            : `${formatNumber(batch.remaining_weight)} ${batch.measure_unit || item.unit || "g"}`;
        const detail = [batch.storage_location || "Kein Ort", formatDate(batch.expiry_date)].join(" · ");
        return `
            <div class="recipe-inventory-stock-row ${Number(batch.remaining_weight || batch.remaining_quantity || 0) <= 0 ? "is-zero" : ""}">
                <div>
                    <strong>${escapeHtml(title)}</strong>
                    <span>${escapeHtml(detail)}</span>
                </div>
                <span class="inventory-expiry inventory-position-expiry ${status.className}">${escapeHtml(status.label)}</span>
            </div>`;
    }).join("");
}

function ensureIngredientInventoryModal() {
    let modal = document.getElementById("ingredient-inventory-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "ingredient-inventory-modal";
    modal.className = "inventory-modal is-hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
        <div class="inventory-modal-backdrop" onclick="closeIngredientInventoryModal()"></div>
        <div class="inventory-modal-dialog recipe-inventory-dialog">
            <div class="inventory-section-headline">
                <div>
                    <p class="recipe-kicker">Inventar</p>
                    <h2 id="ingredient-inventory-title">Inventarartikel</h2>
                </div>
                <button type="button" class="header-icon-button" onclick="closeIngredientInventoryModal()" title="Fenster schließen" aria-label="Fenster schließen">
                    <svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div id="ingredient-inventory-content" class="recipe-inventory-content"></div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function closeIngredientInventoryModal() {
    const modal = document.getElementById("ingredient-inventory-modal");
    if (!modal) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
}

async function openIngredientInventoryOverlay(ingredientName, itemId = null) {
    const lookupName = String(ingredientName || "").trim();
    const numericItemId = itemId !== null && itemId !== undefined && itemId !== "" ? Number(itemId) : null;
    if (!lookupName && !Number.isFinite(numericItemId)) return;

    const modal = ensureIngredientInventoryModal();
    const title = document.getElementById("ingredient-inventory-title");
    const content = document.getElementById("ingredient-inventory-content");
    title.textContent = lookupName || "Inventarartikel";
    content.innerHTML = `<p class="recipe-empty-state">Inventar wird geladen ...</p>`;
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");

    try {
        const item = Number.isFinite(numericItemId)
            ? await apiFetch(`${API_URL}/inventory/${numericItemId}`)
            : await apiFetch(`${API_URL}/inventory/by-ingredient/${encodeURIComponent(lookupName)}`);
        title.textContent = item.name || lookupName;
        const inventoryHref = item.id ? `/inventory.html?item=${encodeURIComponent(item.id)}` : "/inventory.html";
        content.innerHTML = `
            <div class="recipe-inventory-summary">
                <a class="recipe-inventory-item-link" href="${inventoryHref}" title="${escapeHtml(item.name || lookupName)} im Inventar öffnen">
                    ${escapeHtml(item.name || lookupName)}
                </a>
                ${item.calories_per_100g !== null && item.calories_per_100g !== undefined ? `<span>${formatNumber(item.calories_per_100g)} kcal / 100 g</span>` : ""}
            </div>
            <div class="recipe-inventory-stock-list">${getInventoryOverlayRows(item)}</div>`;
    } catch (error) {
        console.error(error);
        content.innerHTML = `
            <p class="recipe-empty-state">Kein passender Inventarartikel gefunden.</p>
            <div class="form-actions inventory-actions recipe-inventory-actions">
                <button type="button" onclick="window.location.href='/inventory.html'">Inventar öffnen</button>
            </div>`;
    }
}


let recipeWorkspaceOptions = [];
let recipeWorkspaceSaveTimer = null;
let recipeWorkspaceSaving = false;
let recipeWorkspacePendingSave = false;
let recipeWorkspaceRedirectId = "";

function escapeWorkspaceHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getRecipeWorkspaceOverlay() {
    return document.getElementById("recipe-workspace-overlay");
}

function closeRecipeWorkspaceOverlay() {
    const overlay = getRecipeWorkspaceOverlay();
    if (!overlay) return;
    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function renderRecipeWorkspaceOptions() {
    const list = document.getElementById("recipe-workspace-list");
    const search = document.getElementById("recipe-workspace-search");
    if (!list) return;

    const query = String(search?.value || "").trim().toLowerCase();

    const filtered = recipeWorkspaceOptions
        .filter(workspace =>
            !query ||
            workspace.name.toLowerCase().includes(query) ||
            workspace.workspace_type.toLowerCase().includes(query)
        )
        .sort((a, b) => {
            if (a.is_assigned !== b.is_assigned) {
                return a.is_assigned ? -1 : 1;
            }
            return a.name.localeCompare(b.name, "de");
        });

    if (!filtered.length) {
        list.innerHTML = `<p class="recipe-empty-state">Kein Workspace gefunden.</p>`;
        return;
    }

    list.innerHTML = filtered.map(workspace => `
        <label class="recipe-workspace-option">
            <span class="recipe-workspace-option-main">
                <span class="recipe-workspace-option-icon">
                    ${workspace.workspace_type === "personal" ? "⌂" : "👥"}
                </span>
                <span>
                    <strong>${escapeWorkspaceHtml(workspace.name)}</strong>
                    <small>${workspace.workspace_type === "personal" ? "Persönlicher Workspace" : "Gemeinsamer Workspace"}</small>
                </span>
            </span>
            <input
                type="checkbox"
                class="recipe-workspace-checkbox"
                data-workspace-id="${escapeWorkspaceHtml(workspace.public_id)}"
                value="${escapeWorkspaceHtml(workspace.public_id)}"
                ${workspace.is_assigned ? "checked" : ""}
                aria-label="${escapeWorkspaceHtml(workspace.name)} zuordnen"
            >
            <span class="recipe-workspace-checkmark" aria-hidden="true">✓</span>
        </label>
    `).join("");
}

async function openRecipeWorkspaceOverlay() {
    if (!currentRecipe?.id) return;

    const overlay = getRecipeWorkspaceOverlay();
    const list = document.getElementById("recipe-workspace-list");
    const search = document.getElementById("recipe-workspace-search");

    if (!overlay || !list) return;

    list.innerHTML = `<p class="recipe-empty-state">Workspaces werden geladen ...</p>`;
    if (search) search.value = "";

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    try {
        const payload = await apiFetch(
            `${API_URL}/recipes/${currentRecipe.id}/workspace-assignments`
        );

        recipeWorkspaceOptions = Array.isArray(payload?.workspaces)
            ? payload.workspaces
            : [];

        renderRecipeWorkspaceOptions();
        search?.focus();
    } catch (error) {
        console.error(error);
        closeRecipeWorkspaceOverlay();
        showToast(error.message || "Workspace-Zuordnungen konnten nicht geladen werden.");
    }
}

function setRecipeWorkspaceSaveState(message, isError = false) {
    const target = document.getElementById("recipe-workspace-save-state");
    if (!target) return;

    target.textContent = message || "";
    target.classList.toggle("is-error", isError);
}

function getSelectedRecipeWorkspaceIds() {
    return Array.from(
        document.querySelectorAll(".recipe-workspace-checkbox:checked")
    ).map(input => input.value);
}

async function persistRecipeWorkspaceAssignments() {
    if (!currentRecipe?.id) return true;

    if (recipeWorkspaceSaving) {
        recipeWorkspacePendingSave = true;
        return false;
    }

    const selectedIds = getSelectedRecipeWorkspaceIds();

    if (!selectedIds.length) {
        setRecipeWorkspaceSaveState(
            "Mindestens ein Workspace muss ausgewählt bleiben.",
            true
        );
        return false;
    }

    recipeWorkspaceSaving = true;
    recipeWorkspacePendingSave = false;
    setRecipeWorkspaceSaveState("Wird gespeichert …");

    try {
        const payload = await apiFetch(
            `${API_URL}/recipes/${currentRecipe.id}/workspace-assignments`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_public_ids: selectedIds
                })
            }
        );

        recipeWorkspaceOptions = Array.isArray(payload?.workspaces)
            ? payload.workspaces
            : recipeWorkspaceOptions;

        const nextWorkspace = recipeWorkspaceOptions
            .find(workspace => workspace.is_assigned);

        recipeWorkspaceRedirectId =
            payload?.current_workspace_still_assigned === false
                ? (nextWorkspace?.public_id || "")
                : "";

        setRecipeWorkspaceSaveState("Gespeichert");
        return true;
    } catch (error) {
        console.error(error);
        setRecipeWorkspaceSaveState(
            error.message || "Speichern fehlgeschlagen.",
            true
        );
        showToast(
            error.message ||
            "Workspace-Zuordnungen konnten nicht gespeichert werden."
        );
        return false;
    } finally {
        recipeWorkspaceSaving = false;

        if (recipeWorkspacePendingSave) {
            recipeWorkspacePendingSave = false;
            window.setTimeout(
                persistRecipeWorkspaceAssignments,
                0
            );
        }
    }
}

function scheduleRecipeWorkspaceAssignmentSave() {
    window.clearTimeout(recipeWorkspaceSaveTimer);
    setRecipeWorkspaceSaveState("Änderung wird gespeichert …");

    recipeWorkspaceSaveTimer = window.setTimeout(
        persistRecipeWorkspaceAssignments,
        180
    );
}

async function finishRecipeWorkspaceAssignments() {
    window.clearTimeout(recipeWorkspaceSaveTimer);

    if (recipeWorkspaceSaving) {
        recipeWorkspacePendingSave = true;

        while (recipeWorkspaceSaving || recipeWorkspacePendingSave) {
            await new Promise(resolve => window.setTimeout(resolve, 60));
        }
    } else {
        await persistRecipeWorkspaceAssignments();
    }

    closeRecipeWorkspaceOverlay();

    if (recipeWorkspaceRedirectId) {
        const redirectId = recipeWorkspaceRedirectId;
        recipeWorkspaceRedirectId = "";
        await AuthShell.switchWorkspace(redirectId);
        window.location.replace(
            `/recipeInstructions.html?id=${currentRecipe.id}`
        );
    }
}


function setupRecipeWorkspaceOverlay() {
    document.getElementById("workspace-assignments-button")
        ?.addEventListener("click", openRecipeWorkspaceOverlay);

    document.getElementById("recipe-workspace-close")
        ?.addEventListener("click", closeRecipeWorkspaceOverlay);

    document.getElementById("recipe-workspace-done")
        ?.addEventListener("click", finishRecipeWorkspaceAssignments);

    document.getElementById("recipe-workspace-search")
        ?.addEventListener("input", renderRecipeWorkspaceOptions);

    document.getElementById("recipe-workspace-list")
        ?.addEventListener("change", event => {
            const checkbox = event.target.closest(".recipe-workspace-checkbox");
            if (!checkbox) return;

            const selectedIds = getSelectedRecipeWorkspaceIds();

            if (!selectedIds.length) {
                checkbox.checked = true;
                setRecipeWorkspaceSaveState(
                    "Mindestens ein Workspace muss ausgewählt bleiben.",
                    true
                );
                return;
            }

            const option = recipeWorkspaceOptions.find(
                workspace => workspace.public_id === checkbox.value
            );

            if (option) {
                option.is_assigned = checkbox.checked;
            }

            scheduleRecipeWorkspaceAssignmentSave();
        });

    getRecipeWorkspaceOverlay()?.addEventListener("click", event => {
        if (event.target === getRecipeWorkspaceOverlay()) {
            finishRecipeWorkspaceAssignments();
        }
    });
}

function renderRecipeInstructions() {
    if (!currentRecipe) return;

    document.getElementById("display-recipe-name").textContent = currentRecipe.name || "";
    document.getElementById("display-recipe-portions").textContent = displayedPortions || "–";
    document.getElementById("display-recipe-calories").textContent = currentRecipe.calories || "–";

    const ingredientsList = document.getElementById("display-recipe-ingredients");
    const ingredientLines = (currentRecipe.ingredients || "").split("\n");
    const stockEntries = Array.isArray(recipeStockCheck?.ingredients) ? recipeStockCheck.ingredients : [];
    
    ingredientsList.innerHTML = ingredientLines
        .map((line, lineIndex) => {
            if (!line.trim()) return `<li class="empty-line">&nbsp;</li>`;

            const entry = stockEntries.find(
                item => Number(item.line_index) === Number(lineIndex)
            ) || null;

            const status = entry?.status || "unknown";
            const label = entry?.label || "Nicht prüfbar";
            const displayText = entry?.display_text || scaleIngredientLine(line.trim());

            const lookupName = entry?.food_name || displayText;
            const lookupItemId = entry?.item_id ? Number(entry.item_id) : "";
            return `
                <li class="recipe-ingredient-stock-row recipe-stock-${status}">
                    <button type="button" class="recipe-ingredient-row-button" onclick="openIngredientInventoryOverlay('${escapeJsString(lookupName)}', '${lookupItemId}')" title="Inventar zu ${escapeHtml(displayText)} anzeigen">
                        <span class="recipe-ingredient-text">${escapeHtml(displayText)}</span>
                        <span class="recipe-stock-flag" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>
                    </button>
                </li>
            `;
        })
        .join("");


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

    const workspaceButton =
        document.getElementById("workspace-assignments-button");

    if (workspaceButton) {
        workspaceButton.classList.toggle(
            "is-hidden",
            currentRecipe.can_manage_workspace_assignments !== true
        );
    }
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
    document.getElementById("recipe-food-moments-button")?.addEventListener("click", openRecipeFoodMoments);
    document.getElementById("recipe-food-moments-close")?.addEventListener("click", closeRecipeFoodMoments);
    document.getElementById("recipe-food-moments-done")?.addEventListener("click", saveRecipeFoodMomentLinks);
    document.getElementById("recipe-food-moment-create")?.addEventListener("click", createFoodMomentFromRecipe);
    document.getElementById("recipe-food-moments-search")?.addEventListener("input", renderRecipeFoodMomentPicker);
    document.getElementById("edit-recipe-button")?.addEventListener("click", () => {
        if (currentRecipe?.id) window.location.href = `/recipeDetails.html?id=${currentRecipe.id}`;
    });
    document.getElementById("decrease-portions-button")?.addEventListener("click", () => adjustDisplayedPortions(-1));
    document.getElementById("increase-portions-button")?.addEventListener("click", () => adjustDisplayedPortions(1));
    setupRecipeWorkspaceOverlay();
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeIngredientInventoryModal();
            if (!getRecipeWorkspaceOverlay()?.classList.contains("is-hidden")) {
                finishRecipeWorkspaceAssignments();
            }
        }
    });
}

window.onload = function () {
    initBurgerMenu();
    setupButtons();
    loadRecipeInstructions();
};
