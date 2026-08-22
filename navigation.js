const FMP_ICONS = {
  menu: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  home: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5.5h5V20"/></svg>',
  wallet: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h15a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3.5"/><path d="M16 12h5"/><circle cx="16" cy="14" r="1"/></svg>',
  calendar: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v3M19 4v3M4 9h16"/><rect x="4" y="6" width="16" height="14" rx="2"/></svg>',
  book: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/></svg>',
  plus: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  inventory: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM7 4h10l2 3H5z"/><path d="M9 11h6"/></svg>',
  admin: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10v4a1.7 1.7 0 0 0-1.6 1z"/></svg>',
  chevron: '<svg class="fc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>'
};

function getPlatformContext() {
  const supplied = window.FMP_CONTEXT || {};
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('fmp_context') || '{}'); } catch {}
  return {
    workspaceName: supplied.workspaceName || stored.workspaceName || 'Persönlicher Workspace',
    workspaceType: supplied.workspaceType || stored.workspaceType || 'personal',
    workspaces: supplied.workspaces || stored.workspaces || [{ id: 'personal', name: 'Persönlicher Workspace' }],
    activeWorkspaceId: supplied.activeWorkspaceId || stored.activeWorkspaceId || 'personal',
    modules: supplied.modules || stored.modules || ['wallet','meal-planning','recipes','inventory'],
    isPlatformAdmin: Boolean(supplied.isPlatformAdmin ?? stored.isPlatformAdmin ?? true)
  };
}

function navItem(href, icon, label) {
  return `<a class="app-nav-item" href="${href}"><span class="app-nav-icon">${FMP_ICONS[icon]}</span><span>${label}</span></a>`;
}

function renderNavigation() {
  const header = document.querySelector('.app-header') || document.querySelector('.burger-menu');
  if (!header) return;
  const context = getPlatformContext();

  header.className = 'app-header';
  header.innerHTML = `
    <button id="burger-button" class="burger-button" type="button" aria-label="Menü öffnen">${FMP_ICONS.menu}</button>
    <a class="app-header-brand" href="/index.html" aria-label="Food Moment Platform Home">
      <span class="app-header-title">Food Moment Platform</span>
    </a>
    <div class="workspace-switcher" id="workspace-switcher">
      <span class="workspace-switcher-label">Workspace</span>
      <button class="workspace-switcher-button" id="workspace-switcher-button" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span id="workspace-current-name">${context.workspaceName}</span>${FMP_ICONS.chevron}
      </button>
      <div class="workspace-menu is-hidden" id="workspace-menu" role="listbox"></div>
    </div>
    <div id="burger-dropdown" class="burger-dropdown is-hidden" aria-label="Hauptnavigation"></div>`;

  const nav = document.getElementById('burger-dropdown');
  const items = [navItem('/index.html', 'home', 'Home')];
  if (context.modules.includes('wallet')) items.push(navItem('/wallet.html', 'wallet', 'Food Moment Wallet'));
  if (context.modules.includes('meal-planning')) items.push(navItem('/index.html#meal-plan', 'calendar', 'Wochenplan'));
  if (context.modules.includes('recipes')) {
    items.push(navItem('/index.html#recipe-book', 'book', 'Rezepte'));
    items.push(navItem('/recipeCreate.html', 'plus', 'Neues Rezept'));
  }
  if (context.modules.includes('inventory')) items.push(navItem('/inventory.html', 'inventory', 'Inventar'));
  if (context.isPlatformAdmin) {
    items.push('<div class="app-nav-divider"></div>');
    items.push(navItem('/admin.html', 'admin', 'Administration'));
  }
  nav.innerHTML = items.join('');

  const workspaceMenu = document.getElementById('workspace-menu');
  workspaceMenu.innerHTML = context.workspaces.map(ws => `<button type="button" class="workspace-option${String(ws.id)===String(context.activeWorkspaceId)?' is-active':''}" data-workspace-id="${ws.id}">${ws.name}</button>`).join('');

  const burgerButton = document.getElementById('burger-button');
  burgerButton.addEventListener('click', e => { e.stopPropagation(); nav.classList.toggle('is-hidden'); workspaceMenu.classList.add('is-hidden'); });
  nav.addEventListener('click', e => e.stopPropagation());

  const wsButton = document.getElementById('workspace-switcher-button');
  wsButton.addEventListener('click', e => {
    e.stopPropagation();
    const hidden = workspaceMenu.classList.toggle('is-hidden');
    wsButton.setAttribute('aria-expanded', String(!hidden));
    nav.classList.add('is-hidden');
  });
  workspaceMenu.addEventListener('click', e => {
    e.stopPropagation();
    const option = e.target.closest('.workspace-option');
    if (!option) return;
    const ws = context.workspaces.find(w => String(w.id) === String(option.dataset.workspaceId));
    if (!ws) return;
    context.activeWorkspaceId = ws.id;
    context.workspaceName = ws.name;
    localStorage.setItem('fmp_context', JSON.stringify(context));
    document.getElementById('workspace-current-name').textContent = ws.name;
    workspaceMenu.querySelectorAll('.workspace-option').forEach(el => el.classList.toggle('is-active', el === option));
    workspaceMenu.classList.add('is-hidden');
    window.dispatchEvent(new CustomEvent('fmp:workspacechange', { detail: { workspace: ws } }));
  });
  document.addEventListener('click', () => { nav.classList.add('is-hidden'); workspaceMenu.classList.add('is-hidden'); wsButton.setAttribute('aria-expanded','false'); });
}

function initBurgerMenu() { renderNavigation(); }
