const RECIPE_RELEASE_API = "https://foodcalculator-server.onrender.com/platform-admin";

let recipeReleaseRecipes = [];
let recipeReleaseWorkspaces = [];
let recipeReleaseFilter = "all";
let recipeReleaseModalRecipeId = null;
let recipeReleaseModalSelection = new Set();

function releaseEscape(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function releaseApi(path, options = {}) {
    const response = await AuthShell.request(`${RECIPE_RELEASE_API}${path}`, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(payload?.error || "Admin-Anfrage fehlgeschlagen.");
        error.status = response.status;
        throw error;
    }
    return payload;
}

function showReleaseToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) return;
    toast.textContent = message || "";
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");
    clearTimeout(showReleaseToast.timeoutId);
    showReleaseToast.timeoutId = setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2400);
}

function releaseWorkspaceType(type) {
    return ({
        personal: "Persönlich",
        family: "Gemeinsam",
        organization: "Organisation",
        practice: "Praxis",
        restaurant: "Restaurant"
    })[type] || type || "Workspace";
}

function releaseModeLabel(mode) {
    if (mode === "global") return "Alle";
    if (mode === "selected") return "Ausgewählte";
    return "Keine";
}

function filteredReleaseRecipes() {
    const search = (document.getElementById("recipe-release-search")?.value || "").trim().toLowerCase();
    return recipeReleaseRecipes.filter(recipe => {
        const mode = recipe.release?.mode || "none";
        if (recipeReleaseFilter !== "all" && mode !== recipeReleaseFilter) return false;
        const haystack = [recipe.name, recipe.owner?.display_name, recipe.owner?.email, recipe.origin_workspace?.name].join(" ").toLowerCase();
        return !search || haystack.includes(search);
    });
}

function renderRecipeReleaseList() {
    const target = document.getElementById("recipe-release-list");
    if (!target) return;
    const filtered = filteredReleaseRecipes();
    document.getElementById("recipe-release-count").textContent = String(filtered.length);

    if (!filtered.length) {
        target.innerHTML = `<p class="admin-empty-state">Keine Rezepte gefunden.</p>`;
        return;
    }

    target.innerHTML = filtered.map(recipe => {
        const mode = recipe.release?.mode || "none";
        const selectedCount = (recipe.release?.workspace_public_ids || []).length;
        const origin = recipe.origin_workspace?.name || "Ohne Workspace";
        return `
            <article class="recipe-release-row" data-recipe-id="${recipe.id}">
                <div class="recipe-release-row-copy">
                    <strong>${releaseEscape(recipe.name)}</strong>
                    <small>${releaseEscape(origin)}${recipe.owner?.display_name ? ` · ${releaseEscape(recipe.owner.display_name)}` : ""}</small>
                </div>
                <div class="recipe-release-row-controls" role="radiogroup" aria-label="Freigabe für ${releaseEscape(recipe.name)}">
                    <label class="recipe-release-pill ${mode === "none" ? "is-active" : ""}">
                        <input type="radio" name="release-${recipe.id}" value="none" ${mode === "none" ? "checked" : ""}>
                        <span>Keine</span>
                    </label>
                    <label class="recipe-release-pill ${mode === "selected" ? "is-active" : ""}">
                        <input type="radio" name="release-${recipe.id}" value="selected" ${mode === "selected" ? "checked" : ""}>
                        <span>Ausgewählte</span>
                    </label>
                    <label class="recipe-release-pill ${mode === "global" ? "is-active" : ""}">
                        <input type="radio" name="release-${recipe.id}" value="global" ${mode === "global" ? "checked" : ""}>
                        <span>Alle</span>
                    </label>
                    <button type="button" class="recipe-release-workspace-trigger ${mode === "selected" ? "" : "is-hidden"}" data-open-workspaces="${recipe.id}">
                        ${selectedCount} Workspace${selectedCount === 1 ? "" : "s"} ›
                    </button>
                    <span class="recipe-release-saving is-hidden" aria-live="polite">Speichert …</span>
                </div>
            </article>`;
    }).join("");
}

function setRowSaving(recipeId, saving) {
    const row = document.querySelector(`.recipe-release-row[data-recipe-id="${recipeId}"]`);
    row?.classList.toggle("is-saving", Boolean(saving));
    row?.querySelector(".recipe-release-saving")?.classList.toggle("is-hidden", !saving);
    row?.querySelectorAll("input, button").forEach(control => { control.disabled = Boolean(saving); });
}

async function saveRelease(recipeId, mode, workspacePublicIds = []) {
    const recipe = recipeReleaseRecipes.find(item => Number(item.id) === Number(recipeId));
    if (!recipe) return false;
    setRowSaving(recipeId, true);
    try {
        const result = await releaseApi(`/recipe-releases/${recipe.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, workspace_public_ids: workspacePublicIds })
        });
        recipe.release = {
            mode: result.mode || mode,
            workspace_public_ids: result.workspace_public_ids || workspacePublicIds
        };
        renderRecipeReleaseList();
        showReleaseToast("Rezeptfreigabe gespeichert.");
        return true;
    } catch (error) {
        console.error(error);
        renderRecipeReleaseList();
        showReleaseToast(error.message || "Freigabe konnte nicht gespeichert werden.");
        return false;
    } finally {
        setRowSaving(recipeId, false);
    }
}

function openWorkspaceModal(recipeId) {
    const recipe = recipeReleaseRecipes.find(item => Number(item.id) === Number(recipeId));
    if (!recipe) return;
    recipeReleaseModalRecipeId = Number(recipeId);
    recipeReleaseModalSelection = new Set(recipe.release?.workspace_public_ids || []);
    const modal = document.getElementById("recipe-release-modal");
    document.getElementById("recipe-release-modal-title").textContent = recipe.name;
    document.getElementById("recipe-release-modal-subtitle").textContent = "Workspaces auswählen, in denen dieses Rezept zusätzlich verfügbar sein soll.";
    const search = document.getElementById("recipe-release-workspace-search");
    if (search) search.value = "";
    renderWorkspaceModalList();
    modal?.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => search?.focus(), 0);
}

function closeWorkspaceModal() {
    document.getElementById("recipe-release-modal")?.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
    recipeReleaseModalRecipeId = null;
    recipeReleaseModalSelection = new Set();
}

function renderWorkspaceModalList() {
    const recipe = recipeReleaseRecipes.find(item => Number(item.id) === Number(recipeReleaseModalRecipeId));
    const target = document.getElementById("recipe-release-workspace-list");
    if (!recipe || !target) return;
    const search = (document.getElementById("recipe-release-workspace-search")?.value || "").trim().toLowerCase();
    const originId = recipe.origin_workspace?.public_id || "";
    const workspaces = recipeReleaseWorkspaces.filter(ws => !search || `${ws.name} ${releaseWorkspaceType(ws.workspace_type)}`.toLowerCase().includes(search));

    target.innerHTML = workspaces.length ? workspaces.map(workspace => {
        const isOrigin = workspace.public_id === originId;
        return `
            <label class="recipe-release-workspace-option ${isOrigin ? "is-origin" : ""}">
                <input type="checkbox" value="${releaseEscape(workspace.public_id)}" ${recipeReleaseModalSelection.has(workspace.public_id) ? "checked" : ""} ${isOrigin ? "disabled" : ""}>
                <span><strong>${releaseEscape(workspace.name)}</strong><small>${releaseEscape(releaseWorkspaceType(workspace.workspace_type))}${isOrigin ? " · Ursprung" : ""}</small></span>
            </label>`;
    }).join("") : `<p class="admin-empty-state">Keine Workspaces gefunden.</p>`;

    document.getElementById("recipe-release-workspace-count").textContent = `${recipeReleaseModalSelection.size} ausgewählt`;
}

async function saveWorkspaceModal() {
    if (!recipeReleaseModalRecipeId) return;
    const recipeId = recipeReleaseModalRecipeId;
    const ids = Array.from(recipeReleaseModalSelection);
    if (!ids.length) {
        showReleaseToast("Bitte mindestens einen Workspace auswählen.");
        return;
    }
    const button = document.getElementById("recipe-release-workspace-save");
    if (button) button.disabled = true;
    const ok = await saveRelease(recipeId, "selected", ids);
    if (button) button.disabled = false;
    if (ok) closeWorkspaceModal();
}

async function loadRecipeReleases() {
    const message = document.getElementById("recipe-release-message");
    try {
        const payload = await releaseApi("/recipe-releases");
        recipeReleaseRecipes = Array.isArray(payload?.recipes) ? payload.recipes : [];
        recipeReleaseWorkspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];
        renderRecipeReleaseList();
    } catch (error) {
        console.error(error);
        if (error.status === 403) {
            document.getElementById("recipe-release-shell")?.classList.add("is-hidden");
            document.getElementById("recipe-release-denied")?.classList.remove("is-hidden");
            return;
        }
        if (message) {
            message.textContent = error.message || "Rezeptfreigaben konnten nicht geladen werden.";
            message.classList.remove("is-hidden");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("recipe-release-search")?.addEventListener("input", renderRecipeReleaseList);
    document.getElementById("recipe-release-filters")?.addEventListener("click", event => {
        const button = event.target.closest("[data-release-filter]");
        if (!button) return;
        recipeReleaseFilter = button.dataset.releaseFilter || "all";
        document.querySelectorAll("[data-release-filter]").forEach(item => item.classList.toggle("is-active", item === button));
        renderRecipeReleaseList();
    });
    document.getElementById("recipe-release-list")?.addEventListener("change", async event => {
        const input = event.target.closest('input[type="radio"]');
        if (!input) return;
        const row = input.closest("[data-recipe-id]");
        const recipeId = Number(row?.dataset.recipeId);
        if (!recipeId) return;
        if (input.value === "selected") {
            renderRecipeReleaseList();
            openWorkspaceModal(recipeId);
            return;
        }
        await saveRelease(recipeId, input.value, []);
    });
    document.getElementById("recipe-release-list")?.addEventListener("click", event => {
        const button = event.target.closest("[data-open-workspaces]");
        if (button) openWorkspaceModal(Number(button.dataset.openWorkspaces));
    });
    document.getElementById("recipe-release-workspace-search")?.addEventListener("input", renderWorkspaceModalList);
    document.getElementById("recipe-release-workspace-list")?.addEventListener("change", event => {
        const input = event.target.closest('input[type="checkbox"]');
        if (!input || input.disabled) return;
        if (input.checked) recipeReleaseModalSelection.add(input.value);
        else recipeReleaseModalSelection.delete(input.value);
        document.getElementById("recipe-release-workspace-count").textContent = `${recipeReleaseModalSelection.size} ausgewählt`;
    });
    document.querySelectorAll("[data-release-modal-close]").forEach(button => button.addEventListener("click", closeWorkspaceModal));
    document.getElementById("recipe-release-workspace-save")?.addEventListener("click", saveWorkspaceModal);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeWorkspaceModal(); });
    loadRecipeReleases();
});
