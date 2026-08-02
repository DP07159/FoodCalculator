const APP_NAVIGATION_LINKS = [
    { label: "Startseite", href: "/index.html" },
    { label: "Inventar", href: "/inventory.html" },
    { label: "Neues Rezept", href: "/recipeCreate.html" },
    { label: "Rezeptbuch", href: "/index.html#recipe-book" },
    { label: "Wochenplan", href: "/index.html#meal-plan" },
    { label: "Admin", href: "/admin.html" }
];

function renderBurgerMenu() {
    const burgerDropdown = document.getElementById("burger-dropdown");
    if (!burgerDropdown) return;

    burgerDropdown.innerHTML = APP_NAVIGATION_LINKS
        .map(link => `<a href="${link.href}">${link.label}</a>`)
        .join("");
}

function initBurgerMenu() {
    const burgerButton = document.getElementById("burger-button");
    const burgerDropdown = document.getElementById("burger-dropdown");

    if (!burgerButton || !burgerDropdown) return;

    renderBurgerMenu();

    if (burgerDropdown.dataset.initialized === "true") return;
    burgerDropdown.dataset.initialized = "true";

    burgerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        burgerDropdown.classList.toggle("is-hidden");
    });

    burgerDropdown.addEventListener("click", (event) => {
        event.stopPropagation();

        if (event.target.tagName === "A") {
            burgerDropdown.classList.add("is-hidden");
        }
    });

    document.addEventListener("click", () => {
        burgerDropdown.classList.add("is-hidden");
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            burgerDropdown.classList.add("is-hidden");
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBurgerMenu);
} else {
    initBurgerMenu();
}
