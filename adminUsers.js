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
let accessWorkspaces = [];

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


function roleOptions(selected = "standard_user") {
    return accessCatalog.roles.map(role => `
        <option value="${escapeHtml(role.code)}" ${role.code === selected ? "selected" : ""}>
            ${escapeHtml(role.name)}
        </option>
    `).join("");
}

function renderCreateWorkspacePicker() {
    const target = document.getElementById("access-create-workspace-list");
    if (!target) return;

    if (!accessWorkspaces.length) {
        target.innerHTML = `<p class="admin-empty-state">Keine aktiven Workspaces vorhanden.</p>`;
        return;
    }

    target.innerHTML = accessWorkspaces.map(workspace => `
        <div class="access-workspace-picker-row">
            <label>
                <input type="checkbox" data-create-workspace="${escapeHtml(workspace.public_id)}">
                <span>
                    <strong>${escapeHtml(workspace.name)}</strong>
                    <small>${escapeHtml(workspaceTypeLabel(workspace.workspace_type))}</small>
                </span>
            </label>
            <select data-create-workspace-role="${escapeHtml(workspace.public_id)}" disabled>
                ${roleOptions("standard_user")}
            </select>
        </div>
    `).join("");

    target.querySelectorAll("[data-create-workspace]").forEach(input => {
        input.addEventListener("change", () => {
            const select = target.querySelector(
                `[data-create-workspace-role="${CSS.escape(input.dataset.createWorkspace)}"]`
            );
            if (select) select.disabled = !input.checked;
        });
    });
}

async function loadAccessWorkspaces() {
    const payload = await adminApi("/workspaces");
    accessWorkspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];
    renderCreateWorkspacePicker();
}

function openCreateUserDialog() {
    const dialog = document.getElementById("access-create-user-dialog");
    const form = document.getElementById("access-create-user-form");
    form?.reset();
    document.getElementById("access-create-user-error")?.classList.add("is-hidden");
    renderCreateWorkspacePicker();
    dialog?.showModal();
}

function closeCreateUserDialog() {
    document.getElementById("access-create-user-dialog")?.close();
}

async function submitCreateUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const errorTarget = document.getElementById("access-create-user-error");

    const assignments = Array.from(
        document.querySelectorAll("[data-create-workspace]:checked")
    ).map(input => ({
        workspace_public_id: input.dataset.createWorkspace,
        role_code: document.querySelector(
            `[data-create-workspace-role="${CSS.escape(input.dataset.createWorkspace)}"]`
        )?.value || "standard_user"
    }));

    if (errorTarget) {
        errorTarget.textContent = "";
        errorTarget.classList.add("is-hidden");
    }
    if (submit) submit.disabled = true;

    try {
        const result = await adminApi("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                display_name: document.getElementById("access-create-name")?.value.trim(),
                email: document.getElementById("access-create-email")?.value.trim(),
                platform_role: document.getElementById("access-create-platform-role")?.value || "user",
                workspace_assignments: assignments
            })
        });

        closeCreateUserDialog();
        await loadAccessUsers();
        if (result?.user?.public_id) await selectAccessUser(result.user.public_id);

        const passwordTarget = document.getElementById("access-setup-password");
        if (passwordTarget) passwordTarget.textContent = result?.setup_password || "";
        document.getElementById("access-setup-password-dialog")?.showModal();
    } catch (error) {
        console.error(error);
        if (errorTarget) {
            errorTarget.textContent = error.message || "Benutzer konnte nicht angelegt werden.";
            errorTarget.classList.remove("is-hidden");
        }
    } finally {
        if (submit) submit.disabled = false;
    }
}

function bindCreateUserEvents() {
    document.getElementById("access-create-user-button")
        ?.addEventListener("click", openCreateUserDialog);
    document.getElementById("access-create-user-close")
        ?.addEventListener("click", closeCreateUserDialog);
    document.getElementById("access-create-user-cancel")
        ?.addEventListener("click", closeCreateUserDialog);
    document.getElementById("access-create-user-form")
        ?.addEventListener("submit", submitCreateUser);
    document.getElementById("access-close-setup-password")
        ?.addEventListener("click", () => {
            document.getElementById("access-setup-password-dialog")?.close();
        });
    document.getElementById("access-copy-setup-password")
        ?.addEventListener("click", async () => {
            const value = document.getElementById("access-setup-password")?.textContent || "";
            if (!value) return;
            try {
                await navigator.clipboard.writeText(value);
                showAccessToast("Setup-Passwort kopiert.");
            } catch {
                showAccessToast("Kopieren nicht möglich.");
            }
        });
}

function renderMembershipAssignmentControl(memberships) {
    const assignedIds = new Set(
        memberships.map(item => item.workspace?.public_id).filter(Boolean)
    );
    const available = accessWorkspaces.filter(
        workspace => !assignedIds.has(workspace.public_id)
    );

    if (!available.length) {
        return `<p class="access-help-text">Alle verfügbaren Workspaces sind bereits zugewiesen.</p>`;
    }

    return `
        <div class="access-add-membership">
            <select id="access-add-workspace">
                <option value="">Workspace auswählen …</option>
                ${available.map(workspace => `
                    <option value="${escapeHtml(workspace.public_id)}">${escapeHtml(workspace.name)}</option>
                `).join("")}
            </select>
            <select id="access-add-workspace-role">
                ${roleOptions("standard_user")}
            </select>
            <button type="button" id="access-add-membership-button" class="access-primary-button">
                Workspace zuweisen
            </button>
        </div>
    `;
}

async function addSelectedMembership() {
    if (!selectedAccessUserId) return;
    const workspacePublicId = document.getElementById("access-add-workspace")?.value || "";
    const roleCode = document.getElementById("access-add-workspace-role")?.value || "standard_user";
    if (!workspacePublicId) {
        showAccessToast("Bitte einen Workspace auswählen.");
        return;
    }

    try {
        await adminApi(`/users/${encodeURIComponent(selectedAccessUserId)}/memberships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workspace_public_id: workspacePublicId,
                role_code: roleCode
            })
        });
        await refreshSelectedAccessUser("Workspace wurde zugewiesen.");
    } catch (error) {
        console.error(error);
        showAccessToast(error.message);
    }
}

async function removeMembership(membershipId) {
    if (!selectedAccessUserId) return;
    if (!window.confirm("Diese Workspace-Zuweisung wirklich entfernen?")) return;

    try {
        await adminApi(
            `/users/${encodeURIComponent(selectedAccessUserId)}/memberships/${membershipId}`,
            { method: "DELETE" }
        );
        await refreshSelectedAccessUser("Workspace-Zuweisung wurde entfernt.");
    } catch (error) {
        console.error(error);
        showAccessToast(error.message);
    }
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
        ? data.memberships.filter(item => item.status !== "left")
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

            ${renderMembershipAssignmentControl(memberships)}

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
                <div class="access-membership-head-actions">
                    ${membership.is_owner
                        ? `<span class="access-owner-pill">Owner</span>`
                        : `<button type="button" class="access-secondary-button access-remove-membership" data-remove-membership="${Number(membership.id)}">Entfernen</button>`}
                </div>
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

    document.getElementById("access-add-membership-button")
        ?.addEventListener("click", addSelectedMembership);

    document.querySelectorAll("[data-remove-membership]").forEach(button => {
        button.addEventListener("click", () => {
            removeMembership(Number(button.dataset.removeMembership));
        });
    });

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
    bindCreateUserEvents();

    try {
        await Promise.all([
            loadAccessCatalog(),
            loadAccessWorkspaces()
        ]);
        await loadAccessUsers();
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
