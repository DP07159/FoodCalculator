function ensureCoreNavigation() {
    const dropdown = document.getElementById("burger-dropdown");
    if (!dropdown) return;

    const links = [
        { href: "/index.html", label: "Home" },
        { href: "/wallet.html", label: "Food Moment Wallet" },
        { href: "/index.html#meal-plan", label: "Wochenplan" },
        { href: "/index.html#recipe-book", label: "Rezeptbuch" },
        { href: "/recipeCreate.html", label: "Neues Rezept" }
    ];

    dropdown.innerHTML = "";
    links.forEach(item => {
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        dropdown.appendChild(link);
    });
}

function initBurgerMenu() {
    ensureCoreNavigation();
    const burgerButton = document.getElementById("burger-button");
    const burgerDropdown = document.getElementById("burger-dropdown");

    if (!burgerButton || !burgerDropdown) return;

    burgerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        burgerDropdown.classList.toggle("is-hidden");
    });

    burgerDropdown.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => burgerDropdown.classList.add("is-hidden"));
    });

    document.addEventListener("click", () => burgerDropdown.classList.add("is-hidden"));
    burgerDropdown.addEventListener("click", (event) => event.stopPropagation());
}
