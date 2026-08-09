function setLoginMessage(message) {
    const target = document.getElementById("login-message");
    if (!target) return;
    target.textContent = message || "";
    target.classList.toggle("is-hidden", !message);
}

document.getElementById("login-form")?.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("login-email")?.value.trim() || "";
    const password = document.getElementById("login-password")?.value || "";
    const button = document.getElementById("login-submit");

    setLoginMessage("");
    if (button) button.disabled = true;

    try {
        await PlatformShell.login(email, password);
        window.location.replace("/index.html");
    } catch (error) {
        console.error(error);
        setLoginMessage(error.message || "Anmeldung fehlgeschlagen.");
    } finally {
        if (button) button.disabled = false;
    }
});

const reason = new URLSearchParams(window.location.search).get("reason");
if (reason === "session") {
    setLoginMessage("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
}
