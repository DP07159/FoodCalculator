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
async function login(email, password) {
    const response = await fetch("https://foodcalculator-server.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.token) {
        localStorage.setItem("token", data.token); // Token speichern
        alert("Login erfolgreich!");
        window.location.href = "/dashboard.html"; // Weiterleitung nach Login
    } else {
        alert("Fehler: " + data.error);
    }
}

//**Logout**
function logout() {
    localStorage.removeItem("token");
    alert("Logout erfolgreich!");
    window.location.href = "/login.html";
}
