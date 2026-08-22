const APP_NAVIGATION_LINKS = [
    { label: "Home", href: "/index.html", capability: "home" },
    { label: "Wochenplan", href: "/mealPlan.html", capability: "meal_plan" },
    { label: "Rezepte", href: "/recipes.html", capability: "recipes" },
    { label: "Inventar", href: "/inventory.html", capability: "inventory", privilege: "inventory.view" },
    { label: "Rezept anlegen", href: "/recipeCreate.html", capability: "recipes" },
    { label: "Administration", href: "/admin.html", capability: "admin", role: "platform_admin" }
];

const NavigationState = { privileges: new Set(), roles: new Set(), loaded: false };

async function loadNavigationAccess() {
    if (!window.AuthShell?.getToken?.() || !window.AuthShell?.getWorkspacePublicId?.()) return;
    try {
        const response = await AuthShell.request("/authorization/effective-permissions");
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        NavigationState.privileges = new Set((payload?.privileges || []).map(item => item.code));
        NavigationState.roles = new Set((payload?.roles || []).map(item => item.code));
        NavigationState.loaded = true;
    } catch (error) {
        console.warn("Navigation konnte Berechtigungen nicht laden:", error);
    }
}

function linkIsAvailable(link) {
    if (!NavigationState.loaded) return link.capability !== "admin";
    if (link.privilege && !NavigationState.privileges.has(link.privilege)) return false;
    if (link.role && !NavigationState.roles.has(link.role)) return false;
    return true;
}

function renderBurgerMenu() {
    const burgerDropdown = document.getElementById("burger-dropdown");
    if (!burgerDropdown) return;
    const links = APP_NAVIGATION_LINKS.filter(linkIsAvailable);
    const workspace = window.AuthShell?.getWorkspace?.();
    const user = window.AuthShell?.getUser?.();

    burgerDropdown.innerHTML = `
        <div class="platform-menu-context">
            <span>${escapeNavigationHtml(workspace?.name || "Workspace")}</span>
            <small>${escapeNavigationHtml(user?.display_name || user?.email || "")}</small>
        </div>
        <div class="platform-nav-links">
            ${links.map(link => {
                const currentPath = window.location.pathname || "/index.html";
                const linkPath = link.href.split("#")[0];
                const isCurrent = currentPath === linkPath || (currentPath === "/" && linkPath === "/index.html");
                return `<a href="${link.href}"${isCurrent ? ' aria-current="page" class="is-current"' : ""}>${link.label}</a>`;
            }).join("")}
        </div>
        <div class="platform-menu-footer">
            <button type="button" id="navigation-logout">Abmelden</button>
        </div>`;

    burgerDropdown.querySelector("#navigation-logout")?.addEventListener("click", () => AuthShell.logout());
}

function escapeNavigationHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function applyNavigationAvailability(root = document) {
    root.querySelectorAll("[data-nav-capability]").forEach(element => {
        const capability = element.dataset.navCapability;
        const matching = APP_NAVIGATION_LINKS.filter(link => link.capability === capability);
        const available = matching.length === 0 || matching.some(linkIsAvailable);
        element.hidden = !available;
    });
}

async function refreshNavigation() {
    await loadNavigationAccess();
    renderBurgerMenu();
    applyNavigationAvailability();
}

function initBurgerMenu() {
    const burgerButton = document.getElementById("burger-button");
    const burgerDropdown = document.getElementById("burger-dropdown");
    if (!burgerButton || !burgerDropdown) return;
    renderBurgerMenu();
    if (burgerDropdown.dataset.initialized === "true") return;
    burgerDropdown.dataset.initialized = "true";

    burgerButton.addEventListener("click", event => {
        event.stopPropagation();
        burgerDropdown.classList.toggle("is-hidden");
    });
    burgerDropdown.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", () => burgerDropdown.classList.add("is-hidden"));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") burgerDropdown.classList.add("is-hidden");
    });
    document.addEventListener("auth:ready", refreshNavigation);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBurgerMenu);
else initBurgerMenu();
