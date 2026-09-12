const RECIPE_RELEASE_API = "https://foodcalculator-server.onrender.com/platform-admin";

let recipeReleaseRecipes = [];
let recipeReleaseWorkspaces = [];
let selectedRecipeReleaseId = null;

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

function releaseModeLabel(mode) {
    if (mode === "global") return "Global";
    if (mode === "selected") return "Ausgewählt";
    return "Nicht freigegeben";
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

function renderRecipeReleaseList() {
    const target = document.getElementById("recipe-release-list");
    const search = (document.getElementById("recipe-release-search")?.value || "").trim().toLowerCase();
    if (!target) return;

    const filtered = recipeReleaseRecipes.filter(recipe => {
        const haystack = [
            recipe.name,
            recipe.owner?.display_name,
            recipe.owner?.email,
            recipe.origin_workspace?.name
        ].join(" ").toLowerCase();
        return !search || haystack.includes(search);
    });

    document.getElementById("recipe-release-count").textContent = String(filtered.length);

    if (!filtered.length) {
        target.innerHTML = `<p class="admin-empty-state">Keine Rezepte gefunden.</p>`;
        return;
    }

    target.innerHTML = filtered.map(recipe => `
        <button type="button" class="recipe-release-list-item ${Number(recipe.id) === Number(selectedRecipeReleaseId) ? "is-active" : ""}" data-recipe-release-id="${recipe.id}">
            <span class="recipe-release-list-copy">
                <strong>${releaseEscape(recipe.name)}</strong>
                <small>${releaseEscape(recipe.origin_workspace?.name || "Ohne Workspace")}</small>
            </span>
            <span class="recipe-release-status recipe-release-status-${releaseEscape(recipe.release?.mode || "none")}">${releaseEscape(releaseModeLabel(recipe.release?.mode))}</span>
        </button>
    `).join("");

    target.querySelectorAll("[data-recipe-release-id]").forEach(button => {
        button.addEventListener("click", () => selectRecipeRelease(Number(button.dataset.recipeReleaseId)));
    });
}

function renderRecipeReleaseDetail() {
    const detail = document.getElementById("recipe-release-detail");
    const empty = document.getElementById("recipe-release-empty");
    const recipe = recipeReleaseRecipes.find(item => Number(item.id) === Number(selectedRecipeReleaseId));
    if (!detail || !empty) return;

    if (!recipe) {
        detail.classList.add("is-hidden");
        empty.classList.remove("is-hidden");
        return;
    }

    empty.classList.add("is-hidden");
    detail.classList.remove("is-hidden");

    const mode = recipe.release?.mode || "none";
    const selected = new Set(recipe.release?.workspace_public_ids || []);
    const originId = recipe.origin_workspace?.public_id || "";

    detail.innerHTML = `
        <div class="recipe-release-detail-head">
            <div>
                <p class="recipe-kicker">Rezept</p>
                <h2>${releaseEscape(recipe.name)}</h2>
                <p class="access-help-text">Ursprung: <strong>${releaseEscape(recipe.origin_workspace?.name || "Ohne Workspace")}</strong>${recipe.owner?.display_name ? ` · ${releaseEscape(recipe.owner.display_name)}` : ""}</p>
            </div>
            <span class="recipe-release-status recipe-release-status-${releaseEscape(mode)}">${releaseEscape(releaseModeLabel(mode))}</span>
        </div>

        <div class="recipe-release-options" role="radiogroup" aria-label="Freigabeart">
            <label class="recipe-release-option ${mode === "none" ? "is-selected" : ""}">
                <input type="radio" name="recipe-release-mode" value="none" ${mode === "none" ? "checked" : ""}>
                <span><strong>Nicht zusätzlich freigeben</strong><small>Das Rezept bleibt nur dort verfügbar, wo es bereits regulär zugeordnet ist.</small></span>
            </label>
            <label class="recipe-release-option ${mode === "selected" ? "is-selected" : ""}">
                <input type="radio" name="recipe-release-mode" value="selected" ${mode === "selected" ? "checked" : ""}>
                <span><strong>Ausgewählte Workspaces</strong><small>Das Rezept gezielt für einzelne Workspaces freigeben.</small></span>
            </label>
            <label class="recipe-release-option ${mode === "global" ? "is-selected" : ""}">
                <input type="radio" name="recipe-release-mode" value="global" ${mode === "global" ? "checked" : ""}>
                <span><strong>Global · alle Workspaces</strong><small>Gilt auch automatisch für künftig neu angelegte Workspaces.</small></span>
            </label>
        </div>

        <div id="recipe-release-workspaces" class="recipe-release-workspaces ${mode === "selected" ? "" : "is-hidden"}">
            <div class="access-section-heading">
                <div>
                    <h3>Workspaces auswählen</h3>
                    <p>Der Ursprungs-Workspace bleibt unabhängig von dieser Plattformfreigabe erhalten.</p>
                </div>
            </div>
            <div class="recipe-release-workspace-grid">
                ${recipeReleaseWorkspaces.map(workspace => {
                    const isOrigin = workspace.public_id === originId;
                    return `
                        <label class="recipe-release-workspace ${isOrigin ? "is-origin" : ""}">
                            <input type="checkbox" value="${releaseEscape(workspace.public_id)}" ${selected.has(workspace.public_id) ? "checked" : ""} ${isOrigin ? "disabled" : ""}>
                            <span><strong>${releaseEscape(workspace.name)}</strong><small>${releaseEscape(releaseWorkspaceType(workspace.workspace_type))}${isOrigin ? " · Ursprung" : ""}</small></span>
                        </label>
                    `;
                }).join("")}
            </div>
        </div>

        <div class="recipe-release-actions">
            <button type="button" id="recipe-release-save" class="access-primary-button">Freigabe speichern</button>
        </div>
    `;

    detail.querySelectorAll('input[name="recipe-release-mode"]').forEach(input => {
        input.addEventListener("change", () => {
            detail.querySelectorAll(".recipe-release-option").forEach(option => option.classList.remove("is-selected"));
            input.closest(".recipe-release-option")?.classList.add("is-selected");
            document.getElementById("recipe-release-workspaces")?.classList.toggle("is-hidden", input.value !== "selected");
        });
    });

    document.getElementById("recipe-release-save")?.addEventListener("click", saveRecipeRelease);
}

function selectRecipeRelease(recipeId) {
    selectedRecipeReleaseId = recipeId;
    renderRecipeReleaseList();
    renderRecipeReleaseDetail();
}

async function saveRecipeRelease() {
    const recipe = recipeReleaseRecipes.find(item => Number(item.id) === Number(selectedRecipeReleaseId));
    if (!recipe) return;

    const mode = document.querySelector('input[name="recipe-release-mode"]:checked')?.value || "none";
    const workspacePublicIds = mode === "selected"
        ? Array.from(document.querySelectorAll("#recipe-release-workspaces input[type='checkbox']:checked:not(:disabled)")).map(input => input.value)
        : [];

    const button = document.getElementById("recipe-release-save");
    if (button) button.disabled = true;

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
        renderRecipeReleaseDetail();
        showReleaseToast("Rezeptfreigabe gespeichert.");
    } catch (error) {
        console.error(error);
        showReleaseToast(error.message || "Freigabe konnte nicht gespeichert werden.");
    } finally {
        if (button) button.disabled = false;
    }
}

async function loadRecipeReleases() {
    const message = document.getElementById("recipe-release-message");
    try {
        const payload = await releaseApi("/recipe-releases");
        recipeReleaseRecipes = Array.isArray(payload?.recipes) ? payload.recipes : [];
        recipeReleaseWorkspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];
        if (recipeReleaseRecipes.length && !selectedRecipeReleaseId) {
            selectedRecipeReleaseId = recipeReleaseRecipes[0].id;
        }
        renderRecipeReleaseList();
        renderRecipeReleaseDetail();
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
    loadRecipeReleases();
});
