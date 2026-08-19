const PLATFORM_ADMIN_API = "https://foodcalculator-server.onrender.com/platform-admin";

let accessUsers = [];
let accessCatalog = {
    roles: [],
    capabilities: [],
    modules: []
};
let selectedAccessUserId = "";
let selectedAccessUser = null;
let accessSearchTimer = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showAccessToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message || "";
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");

    window.clearTimeout(showAccessToast.timeoutId);
    showAccessToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        toast.classList.add("is-hidden");
    }, 2600);
}

function setAccessMessage(message, type = "error") {
    const target = document.getElementById("access-user-message");
    if (!target) return;

    target.textContent = message || "";
    target.classList.toggle("is-hidden", !message);
    target.dataset.type = type;
}

async function adminApi(path, options = {}) {
    const response = await AuthShell.request(
        path.startsWith("http")
            ? path
            : `${PLATFORM_ADMIN_API}${path}`,
        options
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            payload?.error || "Admin-Anfrage fehlgeschlagen."
        );
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}

function accessStatusLabel(status) {
    return {
        active: "Aktiv",
        pending: "Ausstehend",
        suspended: "Deaktiviert"
    }[status] || status || "Unbekannt";
}

function accessStatusClass(status) {
    return `status-${String(status || "unknown").toLowerCase()}`;
}

function workspaceTypeLabel(type) {
    return type === "personal"
        ? "Persönlicher Workspace"
        : type === "family"
            ? "Familien-Workspace"
            : "Workspace";
}

function renderAccessUserList() {
    const target = document.getElementById("access-user-list");
    const count = document.getElementById("access-user-count");

    if (!target) return;
    if (count) count.textContent = String(accessUsers.length);

    if (!accessUsers.length) {
        target.innerHTML = `<p class="admin-empty-state">Keine Benutzer gefunden.</p>`;
        return;
    }

    target.innerHTML = accessUsers.map(user => `
        <button
            type="button"
            class="access-user-row ${user.public_id === selectedAccessUserId ? "is-active" : ""}"
            data-user-id="${escapeHtml(user.public_id)}"
        >
            <span class="access-user-avatar" aria-hidden="true">
                ${escapeHtml((user.display_name || user.email || "?").trim().charAt(0).toUpperCase())}
            </span>
            <span class="access-user-row-main">
                <strong>${escapeHtml(user.display_name || "Ohne Namen")}</strong>
                <small>${escapeHtml(user.email)}</small>
                <span class="access-user-row-meta">
                    <span class="access-status-pill ${accessStatusClass(user.status)}">
                        ${escapeHtml(accessStatusLabel(user.status))}
                    </span>
                    ${user.is_platform_admin
                        ? `<span class="access-admin-pill">Platform Admin</span>`
                        : ""}
                    <span>${Number(user.active_memberships || 0)} Workspace${Number(user.active_memberships || 0) === 1 ? "" : "s"}</span>
                </span>
            </span>
            <svg class="fc-icon access-user-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
            </svg>
        </button>
    `).join("");

    target.querySelectorAll("[data-user-id]").forEach(button => {
        button.addEventListener("click", () => {
            selectAccessUser(button.dataset.userId);
        });
    });
}

async function loadAccessUsers() {
    const search = document.getElementById("access-user-search")?.value.trim() || "";
    const status = document.getElementById("access-user-status-filter")?.value || "";

    setAccessMessage("");

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("limit", "250");

    try {
        const payload = await adminApi(`/users?${params.toString()}`);
        accessUsers = Array.isArray(payload?.users)
            ? payload.users
            : [];

        renderAccessUserList();

        if (
            selectedAccessUserId &&
            !accessUsers.some(user => user.public_id === selectedAccessUserId)
        ) {
            selectedAccessUserId = "";
            selectedAccessUser = null;
            renderAccessEmptyDetail();
        }
    } catch (error) {
        console.error(error);

        if (error.status === 403) {
            showPlatformAdminDenied(error.message);
            return;
        }

        setAccessMessage(
            error.message || "Benutzer konnten nicht geladen werden."
        );
    }
}

function renderAccessEmptyDetail() {
    document.getElementById("access-user-detail-empty")
        ?.classList.remove("is-hidden");

    const detail = document.getElementById("access-user-detail");
    if (detail) {
        detail.classList.add("is-hidden");
        detail.innerHTML = "";
    }
}

function showPlatformAdminDenied(message) {
    document.getElementById("access-admin-shell")
        ?.classList.add("is-hidden");

    const denied = document.getElementById("access-admin-denied");
    denied?.classList.remove("is-hidden");

    const text = document.getElementById("access-admin-denied-message");
    if (text && message) text.textContent = message;
}

async function selectAccessUser(publicId) {
    selectedAccessUserId = publicId;
    renderAccessUserList();

    const detail = document.getElementById("access-user-detail");
    const empty = document.getElementById("access-user-detail-empty");

    empty?.classList.add("is-hidden");
    detail?.classList.remove("is-hidden");

    if (detail) {
        detail.innerHTML = `
            <div class="access-detail-loading">
                <p class="admin-empty-state">Benutzerdetails werden geladen …</p>
            </div>
        `;
    }

    try {
        selectedAccessUser = await adminApi(
            `/users/${encodeURIComponent(publicId)}`
        );
        renderAccessUserDetail();
    } catch (error) {
        console.error(error);

        if (error.status === 403) {
            showPlatformAdminDenied(error.message);
            return;
        }

        if (detail) {
            detail.innerHTML = `
                <div class="access-inline-error">
                    ${escapeHtml(error.message || "Benutzer konnte nicht geladen werden.")}
                </div>
            `;
        }
    }
}

function getCurrentUserPublicId() {
    return AuthShell.getUser()?.public_id || "";
}

function renderAccessUserDetail() {
    const target = document.getElementById("access-user-detail");
    const data = selectedAccessUser;
    if (!target || !data?.user) return;

    const user = data.user;
    const self = user.public_id === getCurrentUserPublicId();
    const memberships = Array.isArray(data.memberships)
        ? data.memberships
        : [];

    target.innerHTML = `
        <div class="access-detail-header">
            <div class="access-detail-identity">
                <div class="access-detail-avatar">
                    ${escapeHtml((user.display_name || user.email || "?").trim().charAt(0).toUpperCase())}
                </div>
                <div>
                    <p class="recipe-kicker">Benutzer</p>
                    <h2>${escapeHtml(user.display_name || "Ohne Namen")}</h2>
                    <p>${escapeHtml(user.email)}</p>
                </div>
            </div>
            <div class="access-detail-badges">
                <span class="access-status-pill ${accessStatusClass(user.status)}">
                    ${escapeHtml(accessStatusLabel(user.status))}
                </span>
                ${user.is_platform_admin
                    ? `<span class="access-admin-pill">Platform Admin</span>`
                    : ""}
                ${self
                    ? `<span class="access-self-pill">Du</span>`
                    : ""}
            </div>
        </div>

        <section class="access-detail-section">
            <div class="access-section-heading">
                <div>
                    <p class="recipe-kicker">Account</p>
                    <h3>Account-Steuerung</h3>
                </div>
            </div>

            <div class="access-account-controls">
                <label>
                    <span>Status</span>
                    <select id="access-account-status" ${self ? "disabled" : ""}>
                        <option value="active" ${user.status === "active" ? "selected" : ""}>Aktiv</option>
                        <option value="pending" ${user.status === "pending" ? "selected" : ""}>Ausstehend</option>
                        <option value="suspended" ${user.status === "suspended" ? "selected" : ""}>Deaktiviert</option>
                    </select>
                </label>

                <button
                    type="button"
                    id="access-save-status"
                    class="access-primary-button"
                    ${self ? "disabled title='Der eigene Platform-Admin-Account kann hier nicht versehentlich deaktiviert werden.'" : ""}
                >
                    Status speichern
                </button>

                <button
                    type="button"
                    id="access-revoke-sessions"
                    class="access-secondary-button"
                    ${self ? "disabled title='Eigene Sessions werden hier nicht widerrufen.'" : ""}
                >
                    Sessions widerrufen
                </button>
            </div>

            ${self
                ? `<p class="access-help-text">Zum Schutz vor versehentlicher Aussperrung sind Statusänderung und Session-Widerruf für den aktuell angemeldeten Admin in dieser Oberfläche gesperrt.</p>`
                : ""}
        </section>

        <section class="access-detail-section">
            <div class="access-section-heading">
                <div>
                    <p class="recipe-kicker">Workspaces</p>
                    <h3>Mitgliedschaften & Zugriff</h3>
                    <p>Module, Rollen und Capabilities gelten jeweils innerhalb der einzelnen Workspace-Mitgliedschaft.</p>
                </div>
            </div>

            <div class="access-membership-list">
                ${memberships.length
                    ? memberships.map(renderMembershipCard).join("")
                    : `<p class="admin-empty-state">Keine Workspace-Mitgliedschaften vorhanden.</p>`}
            </div>
        </section>
    `;

    bindAccessDetailEvents();
}

function renderMembershipCard(membership) {
    const roleCode = membership.roles?.[0]?.code || "";
    const capabilityCodes = new Set(
        (membership.capabilities || []).map(item => item.code)
    );

    return `
        <article class="access-membership-card" data-membership-id="${Number(membership.id)}">
            <div class="access-membership-head">
                <div>
                    <span class="access-workspace-type">${escapeHtml(workspaceTypeLabel(membership.workspace?.workspace_type))}</span>
                    <h4>${escapeHtml(membership.workspace?.name || "Workspace")}</h4>
                    <p>
                        ${membership.is_owner ? "Owner · " : ""}
                        Membership ${escapeHtml(accessStatusLabel(membership.status))}
                    </p>
                </div>
                ${membership.is_owner
                    ? `<span class="access-owner-pill">Owner</span>`
                    : ""}
            </div>

            <div class="access-membership-block">
                <div class="access-membership-block-head">
                    <div>
                        <strong>Module</strong>
                        <small>Grundzugriff auf einzelne Tool-Module</small>
                    </div>
                </div>
                <div class="access-module-grid">
                    ${(membership.modules || []).map(moduleRow => `
                        <label class="access-toggle-row">
                            <span>
                                <strong>${escapeHtml(moduleRow.name)}</strong>
                                <small>${escapeHtml(moduleRow.description || moduleRow.code)}</small>
                            </span>
                            <span class="access-switch">
                                <input
                                    type="checkbox"
                                    data-module-code="${escapeHtml(moduleRow.code)}"
                                    ${moduleRow.effective_enabled ? "checked" : ""}
                                >
                                <span class="access-switch-slider"></span>
                            </span>
                        </label>
                    `).join("")}
                </div>
            </div>

            <div class="access-membership-block">
                <div class="access-membership-block-head">
                    <div>
                        <strong>Rolle</strong>
                        <small>Organisatorische Rolle innerhalb dieses Workspace</small>
                    </div>
                </div>
                <div class="access-role-control">
                    <select data-role-select>
                        ${accessCatalog.roles.map(role => `
                            <option
                                value="${escapeHtml(role.code)}"
                                ${role.code === roleCode ? "selected" : ""}
                            >
                                ${escapeHtml(role.name)}
                            </option>
                        `).join("")}
                    </select>
                    <button type="button" class="access-secondary-button" data-save-role>
                        Rolle übernehmen
                    </button>
                </div>
                ${membership.is_owner && membership.workspace?.workspace_type === "personal"
                    ? `<p class="access-help-text">Der Owner eines persönlichen Workspace behält organisatorisch <code>tenant_admin</code>. Fachliche Einschränkungen erfolgen über Module und Capabilities.</p>`
                    : ""}
            </div>

            <div class="access-membership-block">
                <div class="access-membership-block-head">
                    <div>
                        <strong>Capabilities</strong>
                        <small>Feingranulare fachliche Berechtigungen</small>
                    </div>
                </div>

                <div class="access-capability-list">
                    ${accessCatalog.capabilities.map(capability => `
                        <label class="access-capability-row">
                            <input
                                type="checkbox"
                                data-capability-code="${escapeHtml(capability.code)}"
                                ${capabilityCodes.has(capability.code) ? "checked" : ""}
                            >
                            <span>
                                <strong>${escapeHtml(capability.name)}</strong>
                                <small>
                                    ${escapeHtml(capability.module_code)}
                                    ${capability.description ? ` · ${escapeHtml(capability.description)}` : ""}
                                </small>
                            </span>
                        </label>
                    `).join("")}
                </div>
            </div>
        </article>
    `;
}

function bindAccessDetailEvents() {
    document.getElementById("access-save-status")
        ?.addEventListener("click", saveAccessUserStatus);

    document.getElementById("access-revoke-sessions")
        ?.addEventListener("click", revokeAccessUserSessions);

    document.querySelectorAll("[data-membership-id]").forEach(card => {
        const membershipId = card.dataset.membershipId;

        card.querySelectorAll("[data-module-code]").forEach(toggle => {
            toggle.addEventListener("change", async () => {
                await updateMembershipModule(
                    membershipId,
                    toggle.dataset.moduleCode,
                    toggle.checked,
                    toggle
                );
            });
        });

        card.querySelector("[data-save-role]")
            ?.addEventListener("click", async () => {
                const select = card.querySelector("[data-role-select]");
                await updateMembershipRole(
                    membershipId,
                    select?.value || ""
                );
            });

        card.querySelectorAll("[data-capability-code]").forEach(toggle => {
            toggle.addEventListener("change", async () => {
                await updateMembershipCapability(
                    membershipId,
                    toggle.dataset.capabilityCode,
                    toggle.checked,
                    toggle
                );
            });
        });
    });
}

async function refreshSelectedAccessUser(message = "") {
    if (!selectedAccessUserId) return;

    selectedAccessUser = await adminApi(
        `/users/${encodeURIComponent(selectedAccessUserId)}`
    );

    renderAccessUserDetail();
    await loadAccessUsers();

    if (message) showAccessToast(message);
}

async function saveAccessUserStatus() {
    if (!selectedAccessUserId) return;

    const status = document.getElementById("access-account-status")?.value;
    if (!status) return;

    const label = accessStatusLabel(status);

    if (!window.confirm(`Account-Status wirklich auf „${label}“ setzen?`)) {
        return;
    }

    try {
        await adminApi(
            `/users/${encodeURIComponent(selectedAccessUserId)}/status`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            }
        );

        await refreshSelectedAccessUser(
            `Account-Status: ${label}.`
        );
    } catch (error) {
        console.error(error);
        showAccessToast(error.message);
    }
}

async function revokeAccessUserSessions() {
    if (!selectedAccessUserId) return;

    if (!window.confirm(
        "Alle aktiven Sessions dieses Benutzers widerrufen?"
    )) {
        return;
    }

    try {
        await adminApi(
            `/users/${encodeURIComponent(selectedAccessUserId)}/revoke-sessions`,
            { method: "POST" }
        );

        showAccessToast("Sessions wurden widerrufen.");
    } catch (error) {
        console.error(error);
        showAccessToast(error.message);
    }
}

async function updateMembershipModule(
    membershipId,
    moduleCode,
    enabled,
    input
) {
    input.disabled = true;

    try {
        await adminApi(
            `/memberships/${membershipId}/modules/${encodeURIComponent(moduleCode)}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled })
            }
        );

        await refreshSelectedAccessUser(
            `${moduleCode}: ${enabled ? "aktiviert" : "deaktiviert"}.`
        );
    } catch (error) {
        console.error(error);
        input.checked = !enabled;
        showAccessToast(error.message);
    } finally {
        input.disabled = false;
    }
}

async function updateMembershipRole(membershipId, roleCode) {
    if (!roleCode) return;

    try {
        await adminApi(
            `/memberships/${membershipId}/role`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role_code: roleCode
                })
            }
        );

        await refreshSelectedAccessUser("Rolle wurde aktualisiert.");
    } catch (error) {
        console.error(error);
        showAccessToast(error.message);
        await refreshSelectedAccessUser();
    }
}

async function updateMembershipCapability(
    membershipId,
    capabilityCode,
    enabled,
    input
) {
    input.disabled = true;

    try {
        await adminApi(
            `/memberships/${membershipId}/capabilities/${encodeURIComponent(capabilityCode)}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled })
            }
        );

        await refreshSelectedAccessUser(
            `${capabilityCode}: ${enabled ? "aktiviert" : "deaktiviert"}.`
        );
    } catch (error) {
        console.error(error);
        input.checked = !enabled;
        showAccessToast(error.message);
    } finally {
        input.disabled = false;
    }
}

async function loadAccessCatalog() {
    accessCatalog = await adminApi("/catalog");
}

function bindAccessFilters() {
    document.getElementById("access-user-search")
        ?.addEventListener("input", () => {
            window.clearTimeout(accessSearchTimer);
            accessSearchTimer = window.setTimeout(
                loadAccessUsers,
                220
            );
        });

    document.getElementById("access-user-status-filter")
        ?.addEventListener("change", loadAccessUsers);
}

async function initAccessAdmin() {
    const allowed = await AuthShell.guard();
    if (!allowed) return;

    bindAccessFilters();

    try {
        await Promise.all([
            loadAccessCatalog(),
            loadAccessUsers()
        ]);
    } catch (error) {
        console.error(error);

        if (error.status === 403) {
            showPlatformAdminDenied(error.message);
            return;
        }

        setAccessMessage(
            error.message || "Admin-Oberfläche konnte nicht geladen werden."
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccessAdmin);
} else {
    initAccessAdmin();
}
