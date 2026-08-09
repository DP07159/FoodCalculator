const AUTH_API_URL = "https://foodcalculator-server.onrender.com";
const AUTH_TOKEN_KEY = "fc_auth_token";

const AuthShell = (() => {
    let currentUser = null;
    let ready = false;

    function getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY) || "";
    }

    function setToken(token) {
        const value = String(token || "").trim();
        if (value) localStorage.setItem(AUTH_TOKEN_KEY, value);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    function clearToken() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    async function request(path, options = {}) {
        const headers = new Headers(options.headers || {});
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        return fetch(`${AUTH_API_URL}${path}`, {
            ...options,
            headers
        });
    }

    async function login(email, password) {
        const response = await fetch(`${AUTH_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Anmeldung fehlgeschlagen.");
        if (!payload?.token) throw new Error("Kein Session-Token erhalten.");

        setToken(payload.token);
        currentUser = payload.user || null;
        return payload;
    }

    async function me() {
        const response = await request("/auth/me");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const error = new Error(payload?.error || "Sitzung ist ungültig.");
            error.status = response.status;
            throw error;
        }
        currentUser = payload?.user || payload || null;
        return currentUser;
    }

    async function logout() {
        const token = getToken();
        try {
            if (token) await request("/auth/logout", { method: "POST" });
        } catch (error) {
            console.warn("Logout konnte serverseitig nicht bestätigt werden:", error);
        } finally {
            clearToken();
            currentUser = null;
            window.location.replace("/login.html");
        }
    }

    function renderUserControls() {
        if (!currentUser) return;
        const header = document.querySelector(".app-header");
        if (!header || document.getElementById("auth-shell-user")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "auth-shell-user";
        wrapper.className = "auth-shell-user";
        wrapper.innerHTML = `
            <span class="auth-shell-user-name"></span>
            <button type="button" class="auth-shell-logout">Abmelden</button>
        `;
        wrapper.querySelector(".auth-shell-user-name").textContent =
            currentUser.display_name || currentUser.email || "Benutzer";
        wrapper.querySelector(".auth-shell-logout").addEventListener("click", logout);
        header.appendChild(wrapper);
    }

    async function guard() {
        const token = getToken();
        if (!token) {
            window.location.replace("/login.html");
            return false;
        }

        try {
            await me();
            ready = true;
            document.documentElement.classList.remove("auth-pending");
            renderUserControls();
            document.dispatchEvent(new CustomEvent("auth:ready", { detail: { user: currentUser } }));
            return true;
        } catch (error) {
            if (error?.status === 401) clearToken();
            window.location.replace("/login.html?reason=session");
            return false;
        }
    }

    function getUser() {
        return currentUser;
    }

    function isReady() {
        return ready;
    }

    return { login, logout, me, guard, getToken, getUser, isReady };
})();

window.AuthShell = AuthShell;
