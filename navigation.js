const APP_NAVIGATION_LINKS = [
    { label: "Startseite", href: "/index.html" },
    { label: "Inventar", href: "/inventory.html" },
    { label: "Neues Rezept", href: "/recipeCreate.html" },
    { label: "Rezeptbuch", href: "/index.html#recipe-book" },
    { label: "Wochenplan", href: "/index.html#meal-plan" }
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

    document.addEventListener("click", () => burgerDropdown.classList.add("is-hidden"));
}

document.addEventListener("DOMContentLoaded", initBurgerMenu);