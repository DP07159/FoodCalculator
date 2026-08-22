function escapeHomeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function renderHomeActions() {
    const container = document.getElementById("intent-actions");
    const navigation = window.PlatformNavigation;
    if (!container || !navigation?.getHomeActions) return;

    const actions = navigation.getHomeActions();
    container.innerHTML = actions.map(action => `
        <a class="intent-action" href="${escapeHomeHtml(action.href)}" data-nav-capability="${escapeHomeHtml(action.capability)}">
            <span class="intent-action-icon">${navigation.iconMarkup(action.icon || "home")}</span>
            <span><strong>${escapeHomeHtml(action.label)}</strong><small>${escapeHomeHtml(action.description || "")}</small></span>
            <svg class="fc-icon intent-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </a>
    `).join("");
}

function updateWorkspaceLabel() {
    const workspace = AuthShell.getWorkspace?.();
    const label = document.getElementById("home-workspace-label");
    if (label && workspace?.name) label.textContent = `${workspace.name} · Was möchtest du tun?`;
}

document.addEventListener("auth:ready", updateWorkspaceLabel);
document.addEventListener("platform:navigation-ready", renderHomeActions);

function resolveIntent(text) {
    const value = String(text || "").trim().toLocaleLowerCase("de");
    if (!value) return null;

    const actions = window.PlatformNavigation?.getHomeActions?.() || [];
    for (const action of actions) {
        const keywords = Array.isArray(action.intent_keywords) ? action.intent_keywords : [];
        if (keywords.some(keyword => value.includes(String(keyword).toLocaleLowerCase("de")))) {
            return action.href;
        }
    }

    return null;
}

document.getElementById("intent-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("intent-input");
    const feedback = document.getElementById("intent-feedback");
    const text = input?.value || "";
    const target = resolveIntent(text);
    if (!text.trim()) {
        if (feedback) feedback.textContent = "Beschreibe kurz, was du vorhast.";
        return;
    }
    sessionStorage.setItem("fc_intent_draft", text.trim());
    if (target) {
        window.location.href = target;
        return;
    }
    if (feedback) feedback.textContent = "Dafür ist in diesem Workspace aktuell kein direkter Einstieg verfügbar. Du kannst einen der sichtbaren Wege unten wählen.";
});
