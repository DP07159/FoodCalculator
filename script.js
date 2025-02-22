const API_URL = "https://foodcalculator-server.onrender.com";

// **🔑 Registrierung mit automatischem Login**
function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // 🔍 Passwort-Anforderungen prüfen
    const passwordRegex = /^(?=.*[A-Z])(?=.*\W).{6,}$/;
    if (!passwordRegex.test(password)) {
        document.getElementById("error-message").textContent = "❌ Passwort muss mindestens 6 Zeichen, 1 Sonderzeichen & 1 Großbuchstaben enthalten.";
        return;
    }

    fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", username);
            window.location.href = "dashboard.html"; // 🚀 Automatische Weiterleitung nach Registrierung
        } else {
            document.getElementById("error-message").textContent = "❌ Registrierung fehlgeschlagen: " + (data.error || "Unbekannter Fehler");
        }
    })
    .catch(error => console.error("❌ Fehler bei der Registrierung:", error));
}

// **🔑 Login**
function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", username);
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("error-message").textContent = "❌ Login fehlgeschlagen!";
        }
    })
    .catch(error => console.error("❌ Fehler beim Login:", error));
}
