document.addEventListener("auth:ready", () => {
    const workspace = AuthShell.getWorkspace?.();
    const label = document.getElementById("home-workspace-label");
    if (label && workspace?.name) label.textContent = `${workspace.name} · Was möchtest du tun?`;
});

function capabilityTarget(capability, href) {
    const nav = window.PlatformNavigation;
    return !nav || nav.isCapabilityAvailable(capability) ? href : null;
}

function resolveIntent(text) {
    const value = String(text || "").trim().toLocaleLowerCase("de");
    if (!value) return null;
    if (/(inventar|vorrat|lager|kühlschrank|kuehlschrank|vorhanden)/.test(value)) return capabilityTarget("inventory", "/inventory.html");
    if (/(woche|wochenplan|planen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/.test(value)) return capabilityTarget("meal_plan", "/mealPlan.html");
    if (/(rezept|kochen|essen|gericht|dinner|mittag|frühstück|fruehstueck)/.test(value)) return capabilityTarget("recipes", "/recipes.html");
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
