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
