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
.then(async response => {
    if (!response.ok) {
        let errorMessage = `Fehler: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
    }
    return response.json();
})
.then(data => console.log("✅ Registrierung erfolgreich:", data))
.catch(error => console.error("❌ Registrierung fehlgeschlagen:", error.message));
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
.then(async response => {
    if (!response.ok) {
        let errorMessage = `Fehler: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
    }
    return response.json();
})
.then(data => console.log("✅ Login erfolgreich:", data))
.catch(error => console.error("❌ Login fehlgeschlagen:", error.message));
}
