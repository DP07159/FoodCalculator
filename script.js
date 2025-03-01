const API_URL = "https://foodcalculator-server.onrender.com";

// **🔑 Registrierung mit automatischem Login**
function register() {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("❌ Registrierung fehlgeschlagen: " + data.error);  // ❌ Fehler anzeigen
        } else {
            alert("✅ Registrierung erfolgreich! Jetzt einloggen.");
            window.location.href = "index.html";  // Weiterleitung zur Login-Seite
        }
    })
    .catch(error => console.error("❌ Fehler bei der Registrierung:", error));
}

// **🔑 Login**
function login() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error); // ❌ Fehler als Popup anzeigen
        } else {
            alert("✅ Login erfolgreich!");  
            localStorage.setItem("userId", data.userId); // User-ID speichern
            window.location.href = "dashboard.html"; // Weiterleitung zum Food Calculator
        }
    })
    .catch(error => console.error("❌ Fehler beim Login:", error));
}
