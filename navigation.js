const STATIC_NAVIGATION_LINKS = [
    { label: "Home", shortLabel: "Home", href: "/index.html", capability: "home", icon: "home", primary: true, order: 0 },
    { label: "Administration", href: "/admin.html", capability: "admin", icon: "settings", secondary: true, order: 900 }
];

const LEGACY_MODULE_DEFINITIONS = [
    {
        code: "meal_plan",
        name: "Wochenplan",
        enabled: true,
        navigation: { label: "Wochenplan", short_label: "Plan", href: "/mealPlan.html", icon: "calendar", primary: true, order: 20 },
        home_actions: [
            { code: "plan_week", label: "Planen", description: "Für später, heute Abend oder die nächsten Tage", href: "/mealPlan.html", icon: "calendar", order: 20, intent_keywords: ["woche", "wochenplan", "planen", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"] }
        ]
    },
    {
        code: "recipes",
        name: "Rezepte",
        enabled: true,
        navigation: { label: "Rezepte", short_label: "Rezepte", href: "/recipes.html", icon: "recipes", primary: true, order: 30 },
        secondary_navigation: [
            { label: "Rezept anlegen", href: "/recipeCreate.html", icon: "plus", order: 10 }
        ],
        home_actions: [
            { code: "cook_now", label: "Jetzt etwas", description: "Finde etwas Passendes für jetzt", href: "/recipes.html", icon: "recipes", order: 10, intent_keywords: ["rezept", "kochen", "essen", "gericht", "dinner", "mittag", "frühstück", "fruehstueck"] },
            { code: "create_recipe", label: "Rezept anlegen", description: "Ein eigenes Rezept erfassen", href: "/recipeCreate.html", icon: "plus", order: 40, intent_keywords: ["rezept anlegen", "rezept erfassen", "eigenes rezept"] }
        ]
    },
    {
        code: "inventory",
        name: "Inventar",
        enabled: true,
        required_privilege: "inventory.view",
        navigation: { label: "Inventar", short_label: "Inventar", href: "/inventory.html", icon: "inventory", primary: true, order: 40 },
        home_actions: [
            { code: "maintain_inventory", label: "Was da ist", description: "Mach etwas aus dem, was du schon hast", href: "/inventory.html", icon: "inventory", order: 30, intent_keywords: ["inventar", "vorrat", "lager", "kühlschrank", "kuehlschrank", "vorhanden"] }
        ]
    }
];

const NavigationState = {
    privileges: new Set(),
    roles: new Set(),
    modules: new Map(),
    links: [...STATIC_NAVIGATION_LINKS],
    homeActions: [],
    loaded: false,
    platformAdmin: false
};

const NAV_ICON_PATHS = {
    home: '<path d="M4 11.5 12 5l8 6.5V20H5V11.5"/><path d="M9 20v-6h6v6"/>',
    calendar: '<path d="M5 3v3M19 3v3M4 8h16M5 5h14v15H5z"/><path d="M8 12h3M13 12h3M8 16h3"/>',
    recipes: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    inventory: '<path d="M4 6h16v14H4zM7 3h10v3M8 10h8M8 14h5"/>',
    wallet: '<path d="M4 7h16v13H4z"/><path d="M7 7V5h10v2"/><path d="M8 11h8M8 15h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1A7 7 0 0 0 15 6l-.4-2.6h-4L10.2 6a7 7 0 0 0-1.6 1L6.2 6 4.2 9.5 6.1 11a7 7 0 0 0 0 2l-1.9 1.5 2 3.5 2.4-1A7 7 0 0 0 10 18l.4 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.5L18.9 13c.1-.3.1-.7.1-1Z"/>'
};

function buildModuleLinks(modules) {
    const links = [];
    const homeActions = [];

    modules.forEach(moduleDefinition => {
        const capability = moduleDefinition.code;
        const navigation = moduleDefinition.navigation;

        if (navigation) {
            links.push({
                label: navigation.label || moduleDefinition.name,
                shortLabel: navigation.short_label || navigation.label || moduleDefinition.name,
                href: navigation.href,
                capability,
                icon: navigation.icon || "home",
                primary: navigation.primary !== false,
                order: Number(navigation.order ?? 100),
                moduleEnabled: moduleDefinition.enabled === true
            });
        }

        (moduleDefinition.secondary_navigation || []).forEach(item => {
            links.push({
                label: item.label,
                shortLabel: item.short_label || item.label,
                href: item.href,
                capability,
                icon: item.icon || "plus",
                secondary: true,
                order: Number(item.order ?? 500),
                moduleEnabled: moduleDefinition.enabled === true
            });
        });

        (moduleDefinition.home_actions || []).forEach(action => {
            homeActions.push({
                ...action,
                capability,
                moduleEnabled: moduleDefinition.enabled === true
            });
        });
    });

    return {
        links: links.sort((a, b) => a.order - b.order),
        homeActions: homeActions.sort((a, b) => Number(a.order ?? 100) - Number(b.order ?? 100))
    };
}

async function loadNavigationAccess() {
    if (!window.AuthShell?.getToken?.() || !window.AuthShell?.getWorkspacePublicId?.()) return;

    let platformContextLoaded = false;
    let authorizationFallbackLoaded = false;
    let payload = null;
    let adminProbeResponse = null;

    try {
        const [contextResponse, adminResponse] = await Promise.all([
            AuthShell.request("/platform/context"),
            AuthShell.request("/platform-admin/catalog")
        ]);
        adminProbeResponse = adminResponse;

        payload = await contextResponse.json().catch(() => null);
        if (contextResponse.ok && Array.isArray(payload?.modules) && payload.modules.length > 0) {
            platformContextLoaded = true;
        }
    } catch (error) {
        console.warn("Platform-Kontext ist nicht verfügbar; kompatibler Fallback wird verwendet:", error);
    }

    if (!platformContextLoaded) {
        try {
            const permissionResponse = await AuthShell.request("/authorization/effective-permissions");
            const permissionPayload = await permissionResponse.json().catch(() => null);

            if (permissionResponse.ok) {
                payload = permissionPayload || {};
                authorizationFallbackLoaded = true;
            }
        } catch (error) {
            console.warn("Auch der Authorization-Fallback konnte nicht geladen werden:", error);
        }
    }

    const privileges = new Set((payload?.privileges || []).map(item => item.code));
    const roles = new Set((payload?.roles || []).map(item => item.code));

    let modules;
    if (platformContextLoaded) {
        modules = payload.modules;
    } else {
        const entitlementByCode = new Map(
            (payload?.modules || []).map(item => [item.code, item])
        );

        modules = LEGACY_MODULE_DEFINITIONS.map(definition => {
            const entitlement = entitlementByCode.get(definition.code);
            const moduleEnabled = entitlement ? entitlement.enabled !== false : true;
            const privilegeGranted =
                !authorizationFallbackLoaded ||
                !definition.required_privilege ||
                privileges.has(definition.required_privilege);

            return {
                ...definition,
                enabled: moduleEnabled && privilegeGranted,
                module_enabled: moduleEnabled,
                privilege_granted: privilegeGranted,
                unavailable_reason: !moduleEnabled
                    ? "module_not_enabled"
                    : !privilegeGranted
                        ? "missing_privilege"
                        : null
            };
        });
    }

    const dynamic = buildModuleLinks(modules);

    NavigationState.privileges = privileges;
    NavigationState.roles = roles;
    NavigationState.modules = new Map(modules.map(item => [item.code, item]));
    NavigationState.links = [...STATIC_NAVIGATION_LINKS, ...dynamic.links]
        .sort((a, b) => Number(a.order ?? 100) - Number(b.order ?? 100));
    NavigationState.homeActions = dynamic.homeActions;
    NavigationState.loaded = true;

    if (adminProbeResponse) {
        NavigationState.platformAdmin = adminProbeResponse.ok;
    } else {
        try {
            const adminResponse = await AuthShell.request("/platform-admin/catalog");
            NavigationState.platformAdmin = adminResponse.ok;
        } catch (error) {
            NavigationState.platformAdmin = false;
        }
    }
}

function linkIsAvailable(link) {
    if (link.capability === "admin") return NavigationState.platformAdmin;
    if (link.capability === "home") return true;
    if (!NavigationState.loaded) return true;

    const moduleState = NavigationState.modules.get(link.capability);
    if (!moduleState) return false;
    return moduleState.enabled === true;
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
    const links = NavigationState.links.filter(linkIsAvailable);
    const user = window.AuthShell?.getUser?.();

    burgerDropdown.innerHTML = `
        <div class="platform-menu-context">
            ${workspaceSelectorMarkup("menu")}
            <small>${escapeNavigationHtml(user?.display_name || user?.email || "")}</small>
        </div>
        <div class="platform-nav-links">
            ${links.map(link => `<a href="${link.href}"${isCurrentLink(link) ? ' aria-current="page" class="is-current"' : ""}>${escapeNavigationHtml(link.label)}</a>`).join("")}
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
    if (capability === "admin") return NavigationState.platformAdmin;
    const moduleState = NavigationState.modules.get(capability);
    return !NavigationState.loaded ? true : moduleState?.enabled === true;
}

function getHomeActions() {
    return NavigationState.homeActions.filter(action => action.moduleEnabled === true);
}

window.PlatformNavigation = {
    isCapabilityAvailable,
    getHomeActions,
    iconMarkup: navIcon,
    getState: () => ({
        loaded: NavigationState.loaded,
        platformAdmin: NavigationState.platformAdmin,
        roles: [...NavigationState.roles],
        modules: [...NavigationState.modules.values()],
        links: [...NavigationState.links]
    })
};

function renderPlatformShell() {
    const available = NavigationState.links.filter(linkIsAvailable);
    const primary = available.filter(link => link.primary);
    const secondary = available.filter(link => link.secondary);
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
        element.hidden = !isCapabilityAvailable(element.dataset.navCapability);
    });
}

async function refreshNavigation() {
    await loadNavigationAccess();
    renderBurgerMenu();
    renderPlatformShell();
    applyNavigationAvailability();
    applyExperienceContext();
    document.dispatchEvent(new CustomEvent("platform:navigation-ready", {
        detail: window.PlatformNavigation.getState()
    }));
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
