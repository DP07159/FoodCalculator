function initBurgerMenu() {
    const burgerButton = document.getElementById("burger-button");
    const burgerDropdown = document.getElementById("burger-dropdown");

    if (!burgerButton || !burgerDropdown) return;

    burgerButton.addEventListener("click", function (event) {
        event.stopPropagation();
        burgerDropdown.classList.toggle("is-hidden");
    });

    burgerDropdown.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", function () {
            burgerDropdown.classList.add("is-hidden");
        });
    });

    document.addEventListener("click", function () {
        burgerDropdown.classList.add("is-hidden");
    });

    burgerDropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });
}