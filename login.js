// iPadOS standalone PWAs can occasionally keep a visually focused input without
// opening the software keyboard after navigation/logout. Keep the first focus
// strictly inside the user's touch gesture and clear any stale restored focus.
function installStandaloneIPadKeyboardFix() {
    const isIPad = /iPad/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator.standalone === true;

    if (!isIPad || !isStandalone) return;

    const inputs = Array.from(document.querySelectorAll(
        '#login-form input[type="email"], #login-form input[type="password"]'
    ));

    const clearRestoredFocus = () => {
        const active = document.activeElement;
        if (inputs.includes(active)) active.blur();
    };

    // pageshow also fires when the PWA is restored from its back/forward cache.
    window.addEventListener("pageshow", clearRestoredFocus);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") clearRestoredFocus();
    });

    inputs.forEach(input => {
        input.addEventListener("touchstart", () => {
            if (document.activeElement !== input) {
                try { input.focus({ preventScroll: true }); }
                catch { input.focus(); }
            }
        }, { passive: true });
    });
}

installStandaloneIPadKeyboardFix();

function showLoginMessage(message) {
    const target = document.getElementById("login-message");
    if (!target) return;
    target.textContent = message || "";
    target.classList.toggle("is-hidden", !message);
}

async function redirectIfAlreadyAuthenticated() {
    if (!AuthShell.getToken()) return;
    try {
        await AuthShell.me();
        window.location.replace("/index.html");
    } catch {
        localStorage.removeItem("fc_auth_token");
    }
}

redirectIfAlreadyAuthenticated();

const reason = new URLSearchParams(window.location.search).get("reason");
if (reason === "session") showLoginMessage("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");

document.getElementById("login-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.getElementById("login-email")?.value.trim() || "";
    const password = document.getElementById("login-password")?.value || "";
    const button = document.getElementById("login-submit");
    showLoginMessage("");
    if (button) button.disabled = true;
    try {
        await AuthShell.login(email, password);
        window.location.replace("/index.html");
    } catch (error) {
        showLoginMessage(error.message || "Anmeldung fehlgeschlagen.");
    } finally {
        if (button) button.disabled = false;
    }
});
