const APP_NAVIGATION_LINKS = [
    { label: "Home", shortLabel: "Home", href: "/index.html", capability: "home", icon: "home", primary: true },
    { label: "Wochenplan", shortLabel: "Plan", href: "/mealPlan.html", capability: "meal_plan", icon: "calendar", primary: true },
    { label: "Rezepte", shortLabel: "Rezepte", href: "/recipes.html", capability: "recipes", icon: "recipes", primary: true },
    { label: "Inventar", shortLabel: "Inventar", href: "/inventory.html", capability: "inventory", privilege: "inventory.view", icon: "inventory", primary: true },
    { label: "Rezept anlegen", href: "/recipeCreate.html", capability: "recipes", icon: "plus", secondary: true },
    { label: "Administration", href: "/admin.html", capability: "admin", role: "platform_admin", icon: "settings", secondary: true }
];

const NavigationState = { privileges: new Set(), roles: new Set(), modules: new Map(), loaded: false, platformAdmin: false };

const NAV_ICON_PATHS = {
    home: '<path d="M4 11.5 12 5l8 6.5V20H5V11.5"/><path d="M9 20v-6h6v6"/>',
    calendar: '<path d="M5 3v3M19 3v3M4 8h16M5 5h14v15H5z"/><path d="M8 12h3M13 12h3M8 16h3"/>',
    recipes: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    inventory: '<path d="M4 6h16v14H4zM7 3h10v3M8 10h8M8 14h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1A7 7 0 0 0 15 6l-.4-2.6h-4L10.2 6a7 7 0 0 0-1.6 1L6.2 6 4.2 9.5 6.1 11a7 7 0 0 0 0 2l-1.9 1.5 2 3.5 2.4-1A7 7 0 0 0 10 18l.4 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.5L18.9 13c.1-.3.1-.7.1-1Z"/>'
};

async function loadNavigationAccess() {
    if (!window.AuthShell?.getToken?.() || !window.AuthShell?.getWorkspacePublicId?.()) return;
    try {
        const [permissionResponse, adminProbeResponse] = await Promise.all([
            AuthShell.request("/authorization/effective-permissions"),
            AuthShell.request("/platform-admin/catalog")
        ]);

        const payload = await permissionResponse.json().catch(() => null);
        if (permissionResponse.ok) {
            NavigationState.privileges = new Set((payload?.privileges || []).map(item => item.code));
            NavigationState.roles = new Set((payload?.roles || []).map(item => item.code));
            NavigationState.modules = new Map((payload?.modules || []).map(item => [item.code, item]));
        }

        NavigationState.platformAdmin = adminProbeResponse.ok;
        NavigationState.loaded = permissionResponse.ok;
    } catch (error) {
        console.warn("Navigation konnte Berechtigungen nicht vollständig laden:", error);
    }
}

function linkIsAvailable(link) {
    if (link.capability === "admin") return NavigationState.platformAdmin;
    if (!NavigationState.loaded) return true;
    if (["recipes", "meal_plan", "inventory"].includes(link.capability)) {
        const moduleState = NavigationState.modules.get(link.capability);
        if (moduleState && moduleState.enabled !== true) return false;
    }
    if (link.privilege && !NavigationState.privileges.has(link.privilege)) return false;
    if (link.role && !NavigationState.roles.has(link.role)) return false;
    return true;
}

function isCurrentLink(link) {
    const currentPath = window.location.pathname || "/index.html";
    const linkPath = link.href.split("#")[0];
    if (currentPath === linkPath || (currentPath === "/" && linkPath === "/index.html")) return true;
    if (link.capability === "recipes" && ["/recipeCreate.html", "/recipeDetails.html", "/recipeInstructions.html"].includes(currentPath)) return link.href === "/recipes.html";
    if (link.capability === "admin" && ["/adminTable.html", "/adminUsers.html"].includes(currentPath)) return true;
    return false;
}

function navIcon(name) {
    return `<svg class="fc-icon platform-nav-icon" viewBox="0 0 24 24" aria-hidden="true">${NAV_ICON_PATHS[name] || NAV_ICON_PATHS.home}</svg>`;
}

function navLinkMarkup(link, mode = "sidebar") {
    const current = isCurrentLink(link);
    const label = mode === "bottom" ? (link.shortLabel || link.label) : link.label;
    return `<a href="${link.href}" class="platform-${mode}-link${current ? " is-current" : ""}"${current ? ' aria-current="page"' : ""}>${navIcon(link.icon)}<span>${escapeNavigationHtml(label)}</span></a>`;
}

function workspaceSelectorMarkup(mode = "menu") {
    const workspaces = window.AuthShell?.getWorkspaces?.() || [];
    const current = window.AuthShell?.getWorkspace?.();
    if (workspaces.length <= 1) {
        return `<span class="platform-workspace-static">${escapeNavigationHtml(current?.name || "Workspace")}</span>`;
    }

    return `<label class="platform-workspace-switcher platform-workspace-switcher-${mode}">
        <span class="platform-workspace-switcher-label">Workspace</span>
        <select class="platform-workspace-switch-select" aria-label="Workspace wechseln">
            ${workspaces.map(workspace => `<option value="${escapeNavigationHtml(workspace.public_id)}"${workspace.public_id === current?.public_id ? " selected" : ""}>${escapeNavigationHtml(workspace.name)}</option>`).join("")}
        </select>
    </label>`;
}

function bindWorkspaceSwitchers(root = document) {
    root.querySelectorAll(".platform-workspace-switch-select").forEach(select => {
        if (select.dataset.bound === "true") return;
        select.dataset.bound = "true";
        select.addEventListener("change", async event => {
            try {
                select.disabled = true;
                await AuthShell.switchWorkspace(event.target.value);
                window.location.reload();
            } catch (error) {
                console.error("Workspace konnte nicht gewechselt werden:", error);
                select.disabled = false;
            }
        });
    });
}

function renderBurgerMenu() {
    const burgerDropdown = document.getElementById("burger-dropdown");
    if (!burgerDropdown) return;
    const links = APP_NAVIGATION_LINKS.filter(linkIsAvailable);
    const workspace = window.AuthShell?.getWorkspace?.();
    const user = window.AuthShell?.getUser?.();

    burgerDropdown.innerHTML = `
        <div class="platform-menu-context">
            ${workspaceSelectorMarkup("menu")}
            <small>${escapeNavigationHtml(user?.display_name || user?.email || "")}</small>
        </div>
        <div class="platform-nav-links">
            ${links.map(link => `<a href="${link.href}"${isCurrentLink(link) ? ' aria-current="page" class="is-current"' : ""}>${link.label}</a>`).join("")}
        </div>
        <div class="platform-menu-footer">
            <button type="button" id="navigation-logout">Abmelden</button>
        </div>`;

    burgerDropdown.querySelector("#navigation-logout")?.addEventListener("click", () => AuthShell.logout());
    bindWorkspaceSwitchers(burgerDropdown);
}

function applyExperienceContext() {
    const workspace = window.AuthShell?.getWorkspace?.();
    const roles = NavigationState.roles;
    const density = roles.has("medic")
        ? "precision"
        : workspace?.workspace_type === "restaurant"
            ? "working"
            : "balanced";

    document.body.dataset.workspaceType = workspace?.workspace_type || "unknown";
    document.body.dataset.experienceDensity = density;
    document.body.classList.toggle("experience-precision", density === "precision");
    document.body.classList.toggle("experience-working", density === "working");
    document.body.classList.toggle("experience-balanced", density === "balanced");
}

function isCapabilityAvailable(capability) {
    if (capability === "home") return true;
    return APP_NAVIGATION_LINKS
        .filter(link => link.capability === capability)
        .some(linkIsAvailable);
}

window.PlatformNavigation = {
    isCapabilityAvailable,
    getState: () => ({
        loaded: NavigationState.loaded,
        platformAdmin: NavigationState.platformAdmin,
        roles: [...NavigationState.roles],
        modules: [...NavigationState.modules.values()]
    })
};

function renderPlatformShell() {
    const available = APP_NAVIGATION_LINKS.filter(linkIsAvailable);
    const primary = available.filter(link => link.primary);
    const secondary = available.filter(link => link.secondary);
    const workspace = window.AuthShell?.getWorkspace?.();
    const user = window.AuthShell?.getUser?.();

    let sidebar = document.getElementById("platform-sidebar");
    if (!sidebar) {
        sidebar = document.createElement("aside");
        sidebar.id = "platform-sidebar";
        sidebar.className = "platform-sidebar";
        document.body.prepend(sidebar);
    }
    sidebar.innerHTML = `
        <a class="platform-sidebar-brand" href="/index.html">Food Moment</a>
        <div class="platform-sidebar-workspace">
            ${workspaceSelectorMarkup("sidebar")}
            <small>${escapeNavigationHtml(user?.display_name || user?.email || "")}</small>
        </div>
        <nav class="platform-sidebar-nav" aria-label="Hauptnavigation">
            ${primary.map(link => navLinkMarkup(link, "sidebar")).join("")}
        </nav>
        ${secondary.length ? `<nav class="platform-sidebar-secondary" aria-label="Weitere Bereiche">${secondary.map(link => navLinkMarkup(link, "sidebar")).join("")}</nav>` : ""}
        <button type="button" class="platform-sidebar-logout" id="platform-sidebar-logout">Abmelden</button>`;
    sidebar.querySelector("#platform-sidebar-logout")?.addEventListener("click", () => AuthShell.logout());
    bindWorkspaceSwitchers(sidebar);

    let bottom = document.getElementById("platform-bottom-nav");
    if (!bottom) {
        bottom = document.createElement("nav");
        bottom.id = "platform-bottom-nav";
        bottom.className = "platform-bottom-nav";
        bottom.setAttribute("aria-label", "Mobile Hauptnavigation");
        document.body.append(bottom);
    }
    bottom.innerHTML = primary.slice(0, 4).map(link => navLinkMarkup(link, "bottom")).join("");
    document.body.classList.add("platform-shell-ready");
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
    renderPlatformShell();
    applyNavigationAvailability();
    applyExperienceContext();
}

function initBurgerMenu() {
    const burgerButton = document.getElementById("burger-button");
    const burgerDropdown = document.getElementById("burger-dropdown");
    renderBurgerMenu();
    renderPlatformShell();
    if (!burgerButton || !burgerDropdown || burgerDropdown.dataset.initialized === "true") return;
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
