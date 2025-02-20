const API_URL = "https://foodcalculator-server.onrender.com";

// **🔑 Registrierung**
function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert("✅ Registrierung erfolgreich! Bitte logge dich ein.");
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

// **🔒 Authentifizierung beim Seitenaufruf**
function checkAuth() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (!token) {
        window.location.href = "index.html";
    } else {
        document.getElementById("user-name").textContent = username;
    }
}

// **🚪 Logout**
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "index.html";
}
