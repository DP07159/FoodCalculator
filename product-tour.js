(() => {
    const TOUR_VERSION = 1;
    const STORAGE_PREFIX = `fc_product_tour_v${TOUR_VERSION}`;

    function userStorageSuffix() {
        const user = window.AuthShell?.getUser?.();
        const identifier = user?.public_id || user?.email || "anonymous";
        return String(identifier).replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function homeStorageKey() {
        return `${STORAGE_PREFIX}_${userStorageSuffix()}_home`;
    }

    function hintStorageKey(name) {
        return `${STORAGE_PREFIX}_${userStorageSuffix()}_hint_${name}`;
    }

    const HOME_STEPS = [
        {
            target: "#food-moment-title",
            eyebrow: "Food Moment",
            title: "Was ist dein Food Moment?",
            body: "Du musst nicht mit einem Rezept anfangen. Starte bei dem, was gerade ansteht: jetzt, mit dem was da ist, als Inspiration oder für später."
        },
        {
            target: "#food-moment-primary-actions",
            eyebrow: "Dein Einstieg",
            title: "Vier Wege. Ein Gedanke.",
            body: "Wähle den Einstieg, der zu deinem Moment passt. Die Plattform führt dich von dort weiter – ohne festen Ablauf."
        },
        {
            target: "#food-moment-secondary-actions",
            eyebrow: "Erst einmal festhalten",
            title: "Ideen dürfen unfertig sein.",
            body: "Du kannst auch nur ein Rezept suchen oder etwas festhalten. Aus einer Inspiration kann später ein Food Moment werden."
        },
        {
            target: "#food-world-section",
            eyebrow: "Deine Food-Welt",
            title: "Deine Werkzeuge bleiben frei.",
            body: "Rezepte, Inventar, Wallet und Planung funktionieren weiterhin eigenständig. Food Moments verbinden sie, wenn es für dich Sinn ergibt.",
            finishLabel: "Los geht's"
        }
    ];

    const CONTEXT_HINTS = {
        wallet: {
            path: "/wallet.html",
            target: ".wallet-v3-header",
            eyebrow: "Wallet",
            title: "Sammeln, noch nicht entscheiden.",
            body: "Hier darf eine Idee erst einmal nur eine Idee sein. Speichere Rezept, Restaurant, Video oder Fundstück – und entscheide später, welcher Food Moment daraus wird."
        },
        meal_plan: {
            path: "/mealPlan.html",
            target: "#meal-plan",
            eyebrow: "Wochenplan",
            title: "Plane so viel – oder so wenig – wie du willst.",
            body: "Der Wochenplan bleibt ein eigenständiges Werkzeug. Du kannst einfach Rezepte platzieren – oder ihn später mit deinen Food Moments verbinden."
        }
    };

    let active = null;
    let resizeFrame = null;

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function storageSet(key, value = "done") {
        try { localStorage.setItem(key, value); } catch (_) {}
    }

    function icon(path) {
        return `<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    }

    function ensureUi() {
        let root = document.getElementById("product-tour-root");
        if (root) return root;

        root = document.createElement("div");
        root.id = "product-tour-root";
        root.className = "product-tour-root";
        root.hidden = true;
        root.innerHTML = `
            <div class="product-tour-blocker product-tour-blocker-top"></div>
            <div class="product-tour-blocker product-tour-blocker-right"></div>
            <div class="product-tour-blocker product-tour-blocker-bottom"></div>
            <div class="product-tour-blocker product-tour-blocker-left"></div>
            <section class="product-tour-card" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="product-tour-title">
                <div class="product-tour-card-topline">
                    <span class="product-tour-eyebrow"></span>
                    <button type="button" class="product-tour-close" aria-label="Tour schließen">${icon("M6 6l12 12M18 6 6 18")}</button>
                </div>
                <h2 id="product-tour-title"></h2>
                <p class="product-tour-copy"></p>
                <div class="product-tour-footer">
                    <span class="product-tour-progress" aria-label="Fortschritt"></span>
                    <div class="product-tour-actions">
                        <button type="button" class="product-tour-back">Zurück</button>
                        <button type="button" class="product-tour-next">Weiter</button>
                    </div>
                </div>
            </section>`;
        document.body.append(root);

        root.querySelector(".product-tour-close")?.addEventListener("click", skip);
        root.querySelector(".product-tour-back")?.addEventListener("click", previous);
        root.querySelector(".product-tour-next")?.addEventListener("click", next);
        document.addEventListener("keydown", onKeydown);
        window.addEventListener("resize", schedulePosition);
        window.addEventListener("scroll", schedulePosition, true);
        return root;
    }

    function onKeydown(event) {
        if (!active) return;
        if (event.key === "Escape") skip();
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") previous();
    }

    function startHome({ manual = false } = {}) {
        const path = window.location.pathname || "/index.html";
        if (path !== "/" && path !== "/index.html") {
            window.location.href = "/index.html?tour=1";
            return;
        }

        if (!manual && storageGet(homeStorageKey())) return;
        start({ type: "home", steps: HOME_STEPS, storageKey: homeStorageKey(), markOnSkip: true });
    }

    function startContextHint(name) {
        const hint = CONTEXT_HINTS[name];
        const key = hintStorageKey(name);
        if (!hint || storageGet(key)) return;
        if (!storageGet(homeStorageKey())) return;
        if ((window.location.pathname || "") !== hint.path) return;
        start({ type: "hint", steps: [{ ...hint, finishLabel: "Verstanden" }], storageKey: key, markOnSkip: true });
    }

    function start(config) {
        stop(false);
        const validSteps = config.steps.filter(step => document.querySelector(step.target));
        if (!validSteps.length) return;

        active = { ...config, steps: validSteps, index: 0, highlighted: null };
        const root = ensureUi();
        root.hidden = false;
        document.body.classList.add("product-tour-active");
        renderStep();
    }

    function renderStep() {
        if (!active) return;
        const root = ensureUi();
        const step = active.steps[active.index];
        const target = document.querySelector(step.target);
        if (!target) return next();

        if (active.highlighted) active.highlighted.classList.remove("product-tour-highlighted");
        active.highlighted = target;
        target.classList.add("product-tour-highlighted");

        root.querySelector(".product-tour-eyebrow").textContent = step.eyebrow || "Food Moment";
        root.querySelector("#product-tour-title").textContent = step.title;
        root.querySelector(".product-tour-copy").textContent = step.body;

        const back = root.querySelector(".product-tour-back");
        const nextButton = root.querySelector(".product-tour-next");
        const progress = root.querySelector(".product-tour-progress");
        back.hidden = active.steps.length === 1 || active.index === 0;
        nextButton.textContent = step.finishLabel || (active.index === active.steps.length - 1 ? "Los geht's" : "Weiter");
        progress.textContent = active.steps.length > 1 ? `${active.index + 1} / ${active.steps.length}` : "";

        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(positionUi, 180);
    }

    function positionUi() {
        if (!active) return;
        const root = ensureUi();
        const step = active.steps[active.index];
        const target = document.querySelector(step.target);
        const card = root.querySelector(".product-tour-card");
        if (!target || !card) return;

        const rect = target.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const pad = viewportW <= 720 ? 8 : 12;
        const hole = {
            top: Math.max(0, rect.top - pad),
            left: Math.max(0, rect.left - pad),
            right: Math.min(viewportW, rect.right + pad),
            bottom: Math.min(viewportH, rect.bottom + pad)
        };

        const top = root.querySelector(".product-tour-blocker-top");
        const right = root.querySelector(".product-tour-blocker-right");
        const bottom = root.querySelector(".product-tour-blocker-bottom");
        const left = root.querySelector(".product-tour-blocker-left");
        top.style.cssText = `left:0;top:0;width:100vw;height:${hole.top}px`;
        bottom.style.cssText = `left:0;top:${hole.bottom}px;width:100vw;height:${Math.max(0, viewportH - hole.bottom)}px`;
        left.style.cssText = `left:0;top:${hole.top}px;width:${hole.left}px;height:${Math.max(0, hole.bottom - hole.top)}px`;
        right.style.cssText = `left:${hole.right}px;top:${hole.top}px;width:${Math.max(0, viewportW - hole.right)}px;height:${Math.max(0, hole.bottom - hole.top)}px`;

        if (viewportW <= 720) {
            card.style.left = "12px";
            card.style.right = "12px";
            card.style.top = "auto";
            card.style.bottom = "12px";
            card.style.width = "auto";
            return;
        }

        const cardWidth = Math.min(390, viewportW - 32);
        card.style.width = `${cardWidth}px`;
        card.style.right = "auto";
        card.style.bottom = "auto";
        const cardHeight = card.offsetHeight || 260;
        const gap = 18;

        let cardTop = hole.bottom + gap;
        if (cardTop + cardHeight > viewportH - 16) cardTop = hole.top - cardHeight - gap;
        cardTop = Math.max(16, Math.min(cardTop, viewportH - cardHeight - 16));

        let cardLeft = hole.left;
        if (cardLeft + cardWidth > viewportW - 16) cardLeft = viewportW - cardWidth - 16;
        cardLeft = Math.max(16, cardLeft);
        card.style.left = `${cardLeft}px`;
        card.style.top = `${cardTop}px`;
    }

    function schedulePosition() {
        if (!active || resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;
            positionUi();
        });
    }

    function previous() {
        if (!active || active.index <= 0) return;
        active.index -= 1;
        renderStep();
    }

    function next() {
        if (!active) return;
        if (active.index < active.steps.length - 1) {
            active.index += 1;
            renderStep();
            return;
        }
        complete();
    }

    function complete() {
        if (!active) return;
        storageSet(active.storageKey);
        stop(false);
    }

    function skip() {
        if (!active) return;
        if (active.markOnSkip) storageSet(active.storageKey, "skipped");
        stop(false);
    }

    function stop() {
        if (active?.highlighted) active.highlighted.classList.remove("product-tour-highlighted");
        active = null;
        const root = document.getElementById("product-tour-root");
        if (root) root.hidden = true;
        document.body.classList.remove("product-tour-active");
    }

    function autoStart() {
        const params = new URLSearchParams(window.location.search);
        const path = window.location.pathname || "/index.html";
        if ((path === "/" || path === "/index.html") && params.get("tour") === "1") {
            params.delete("tour");
            const cleanQuery = params.toString();
            history.replaceState({}, "", `${path}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
            window.setTimeout(() => startHome({ manual: true }), 250);
            return;
        }

        if (path === "/" || path === "/index.html") {
            window.setTimeout(() => startHome(), 350);
            return;
        }

        if (path === CONTEXT_HINTS.wallet.path) window.setTimeout(() => startContextHint("wallet"), 500);
        if (path === CONTEXT_HINTS.meal_plan.path) window.setTimeout(() => startContextHint("meal_plan"), 500);
    }

    window.ProductTour = {
        version: TOUR_VERSION,
        start: () => startHome({ manual: true }),
        startHome,
        startContextHint,
        stop,
        autoStart
    };

    document.addEventListener("platform:navigation-ready", autoStart, { once: true });
    if (window.PlatformNavigation?.getState?.()?.loaded) autoStart();
})();
