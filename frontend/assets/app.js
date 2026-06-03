import { API_BASE } from './config.js';

export const Cindy = (() => {
  const authStateKey = 'cindy:auth';
  const themeStateKey = 'cindy-ui-theme';
  const themeClasses = ['theme-default', 'theme-dark'];
  const themes = {
    default: {
      '--bg-base': '#ffffff',
      '--bg-surface': '#f8f8f8',
      '--bg-elevated': '#f0f0f0',
      '--bg-sidebar': '#ffffff',
      '--border': '#e0e0e0',
      '--accent': '#e60000',
      '--accent-hover': '#cc0000',
      '--accent-soft': 'rgba(230, 0, 0, 0.12)',
      '--focus-ring': 'rgba(230, 0, 0, 0.35)',
      '--heading-color': '#e60000',
      '--nav-active-bg': 'var(--accent-soft)',
      '--input-bg': 'var(--bg-sidebar)',
      '--input-border': 'var(--border)',
      '--table-header-bg': 'transparent',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#666666',
      '--text-muted': '#999999',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--danger': '#ef4444',
      '--shadow': '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    dark: {
      '--bg-base': '#1a1727',
      '--bg-surface': '#221f30',
      '--bg-elevated': '#221f30',
      '--bg-sidebar': '#12101a',
      '--border': '#2e2b3e',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
      '--accent-soft': 'rgba(139, 92, 246, 0.16)',
      '--focus-ring': 'rgba(139, 92, 246, 0.4)',
      '--heading-color': '#8b5cf6',
      '--nav-active-bg': '#2e2a42',
      '--input-bg': '#1e1b2e',
      '--input-border': '#3a3550',
      '--table-header-bg': '#1e1b2e',
      '--text-primary': '#f0eeff',
      '--text-secondary': '#a89fc0',
      '--text-muted': '#a89fc0',
      '--success': '#2ba640',
      '--warning': '#f59e0b',
      '--danger': '#ff4444',
      '--shadow': '0 1px 3px rgba(5, 2, 12, 0.45)'
    }
  };
  let authToken = null;
  let currentUser = null;
  let businesses = [];
  let selectedBusinessId = null;
  let selectedTheme = 'default';

  function loadWindowAuth() {
    if (!window.name) return;
    try {
      const parsed = JSON.parse(window.name);
      if (parsed && parsed.key === authStateKey && parsed.token) {
        authToken = parsed.token;
        currentUser = parsed.user || null;
        businesses = Array.isArray(parsed.businesses) ? parsed.businesses : [];
        selectedBusinessId = parsed.selectedBusinessId || null;
        selectedTheme = normalizeTheme(parsed.selectedTheme);
      }
    } catch {
      authToken = null;
      currentUser = null;
      selectedTheme = 'default';
    }
  }

  function setToken(token, user) {
    authToken = token || null;
    currentUser = user || null;
    businesses = [];
    selectedBusinessId = null;
    persistState();
  }

  function persistState() {
    window.name = authToken ? JSON.stringify({
      key: authStateKey,
      token: authToken,
      user: currentUser,
      businesses,
      selectedBusinessId,
      selectedTheme
    }) : '';
  }

  function normalizeTheme(themeName) {
    if (themeName === 'dark' || themeName === 'theme-dark') return 'dark';
    return 'default';
  }

  function themeFromPreference() {
    return normalizeTheme(localStorage.getItem(themeStateKey));
  }

  function applyTheme(themeName = themeFromPreference()) {
    selectedTheme = normalizeTheme(themeName);
    const values = themes[selectedTheme];
    Object.entries(values).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    document.documentElement.style.colorScheme = selectedTheme === 'dark' ? 'dark' : 'light';
    document.body?.classList.remove(...themeClasses);
    document.body?.classList.add(`theme-${selectedTheme}`);
    localStorage.setItem(themeStateKey, selectedTheme === 'dark' ? 'dark' : 'light');
  }

  function setTheme(themeName) {
    applyTheme(themeName);
    persistState();
  }

  function logout() {
    setToken(null, null);
    window.location.href = 'index.html';
  }

  function redirectOnMissingAuth() {
    if (!authToken) {
      window.location.href = 'index.html';
      return true;
    }
    return false;
  }

  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (selectedBusinessId && !isAuthCredentialRoute(path)) {
      headers['x-business-id'] = selectedBusinessId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      logout();
      throw new Error('Your session has expired. Please log in again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      throw new Error(humanError(payload, response.status));
    }

    return payload;
  }

  function humanError(payload, status) {
    if (payload && typeof payload.message === 'string') return payload.message;
    if (payload && typeof payload.error === 'string') return payload.error;
    if (status >= 500) return 'Something went wrong on the server. Try again in a moment.';
    if (status === 404) return 'That item could not be found.';
    if (status === 400) return 'Please check the details and try again.';
    return 'The request could not be completed.';
  }

  function isAuthCredentialRoute(path) {
    return path === '/auth/login' || path === '/auth/register';
  }

  function normalizeList(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  async function loadBusinesses() {
    const payload = await api('/business');
    businesses = normalizeList(payload, ['businesses']);
    if (!selectedBusinessId && businesses.length === 1) {
      selectedBusinessId = businesses[0].id;
    }
    if (selectedBusinessId && !businesses.some((business) => String(business.id) === String(selectedBusinessId))) {
      selectedBusinessId = businesses.length === 1 ? businesses[0].id : null;
    }
    persistState();
    return businesses;
  }

  function setBusinesses(nextBusinesses) {
    businesses = Array.isArray(nextBusinesses) ? nextBusinesses : [];
    if (selectedBusinessId && !businesses.some((business) => String(business.id) === String(selectedBusinessId))) {
      selectedBusinessId = businesses.length === 1 ? businesses[0].id : null;
    }
    persistState();
    updateWorkspacePills();
  }

  function setCurrentUser(user) {
    currentUser = user || currentUser;
    persistState();
  }

  function setSelectedBusinessId(id) {
    selectedBusinessId = id || null;
    persistState();
    updateWorkspacePills();
  }

  function selectedBusiness() {
    return businesses.find((business) => String(business.id) === String(selectedBusinessId)) || null;
  }

  function updateWorkspacePills() {
    const business = selectedBusiness();
    const name = business?.name || 'Workspace';
    document.querySelectorAll('.mobile-workspace-pill').forEach((pill) => {
      pill.textContent = name;
    });
  }

  async function routeAfterBusinessCheck() {
    const ownerBusinesses = await loadBusinesses();
    if (!ownerBusinesses.length) {
      window.location.href = 'create-business.html';
      return;
    }
    if (ownerBusinesses.length === 1) {
      setSelectedBusinessId(ownerBusinesses[0].id);
      window.location.href = 'dashboard.html';
      return;
    }
    window.location.href = 'workspace-picker.html';
  }

  async function requireWorkspace(currentPage = '') {
    if (redirectOnMissingAuth()) return false;
    if (!businesses.length) {
      await loadBusinesses();
    }
    if (!businesses.length) {
      window.location.href = 'create-business.html';
      return false;
    }
    if (!selectedBusinessId) {
      if (businesses.length === 1) {
        setSelectedBusinessId(businesses[0].id);
      } else if (currentPage !== 'workspace-picker') {
        window.location.href = 'workspace-picker.html';
        return false;
      }
    }
    return true;
  }

  function setLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `<span class="spinner"></span>${label || 'Working...'}`;
      button.disabled = true;
    } else {
      button.innerHTML = button.dataset.originalText || button.innerHTML;
      button.disabled = false;
    }
  }

  function toast(message) {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      document.body.appendChild(region);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), 4000);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function formatCurrency(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(number);
  }

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function statusFor(customer) {
    const raw = String(customer.status || customer.subscription_status || '').toLowerCase();
    const expiry = customer.expiry_date || customer.expires_at || customer.end_date;
    if (raw.includes('expired') || raw.includes('inactive')) return 'expired';
    if (expiry) {
      const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
      if (days < 0) return 'expired';
      if (days <= 7) return 'expiring';
    }
    return raw || 'active';
  }

  function badge(status) {
    const normalized = String(status || 'active').toLowerCase();
    if (normalized.includes('expiring')) return '<span class="badge badge-warning">Expiring soon</span>';
    if (normalized.includes('expired') || normalized.includes('inactive')) return '<span class="badge badge-danger">Inactive</span>';
    return '<span class="badge badge-active">Active</span>';
  }

  function whatsappUrl(phone, message) {
    const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || '')}`;
  }

  function layout(active) {
    const owner = currentUser?.name || currentUser?.email || 'Owner';
    const currentBusiness = selectedBusiness();
    document.body.insertAdjacentHTML('afterbegin', `
      <aside class="sidebar">
        <div class="sidebar-brand" aria-label="Cindy">
          <svg class="sidebar-logo" viewBox="0 0 36 36" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--accent)" d="M9 31h22v-4.2c0-2.6-1.5-4.9-3.9-6l-5.2-2.4 2.8-4.2c1.1-1.7.8-3.9-.7-5.3L18.5 4 12 7.2v4.7l3.8 1.7-2.1 3.2-4.1 1.4C7.4 19 6 21.1 6 23.5V27h3v4Zm7.8-18.6-2.4-1.1V9.1l3.7-1.8 3.7 3.3c.6.5.7 1.4.3 2.1l-4.1 6.2 8.2 3.8c1.4.7 2.3 2 2.3 3.6V28H11.1v-4.5c0-1 .6-1.9 1.6-2.2l5.4-1.9 4.5-6.8-5.8-.2Z"/>
          </svg>
          <span>Cindy</span>
        </div>
        ${businesses.length ? `
          <div class="workspace-switcher">
            <label for="workspaceSwitch">Workspace</label>
            <select id="workspaceSwitch" aria-label="Switch workspace">
              ${businesses.map((business) => `
                <option value="${escapeHtml(business.id)}" ${String(business.id) === String(selectedBusinessId) ? 'selected' : ''}>
                  ${escapeHtml(business.name || 'Untitled business')}
                </option>
              `).join('')}
            </select>
            ${currentBusiness?.type ? `<span>${escapeHtml(currentBusiness.type)}</span>` : ''}
          </div>
        ` : ''}
        <nav class="nav" aria-label="Main navigation">
          ${navItem('dashboard', 'dashboard.html', 'layout-dashboard', 'Dashboard', active)}
          ${navItem('customers', 'customers.html', 'users', 'Customers', active)}
          ${navItem('plans', 'plans.html', 'badge-dollar-sign', 'Plans', active)}
          ${navItem('messaging', 'messaging.html', 'message-circle', 'Messages', active)}
          ${navItem('businesses', 'businesses.html', 'building-2', 'Businesses', active)}
          ${navItem('profile', 'profile.html', 'settings', 'Profile', active)}
        </nav>
        <div class="sidebar-footer">
          <div>
            <div class="owner-name">${escapeHtml(owner)}</div>
            <div class="muted">Workspace owner</div>
          </div>
          <button class="btn btn-secondary" type="button" data-logout>
            <i data-lucide="log-out" class="icon"></i>
            Logout
          </button>
        </div>
      </aside>
    `);
    document.querySelector('[data-logout]')?.addEventListener('click', logout);
    document.querySelector('#workspaceSwitch')?.addEventListener('change', (event) => {
      setSelectedBusinessId(event.target.value);
      window.location.href = 'dashboard.html';
    });
    updateWorkspacePills();
    hydrateIcons();
  }

  function navItem(key, href, icon, label, active) {
    return `
      <a class="nav-item ${active === key ? 'active' : ''}" href="${href}">
        <i data-lucide="${icon}" class="icon"></i>
        <span class="nav-label">${label}</span>
      </a>
    `;
  }

  function hydrateIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function bindDrawer(openSelector, drawerSelector, backdropSelector) {
    const openButton = document.querySelector(openSelector);
    const drawer = document.querySelector(drawerSelector);
    const backdrop = document.querySelector(backdropSelector);
    const close = () => {
      drawer?.classList.remove('open');
      backdrop?.classList.remove('open');
    };
    openButton?.addEventListener('click', () => {
      drawer?.classList.add('open');
      backdrop?.classList.add('open');
    });
    backdrop?.addEventListener('click', close);
    drawer?.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', close));
    return { close };
  }

  function withSubmit(form, handler) {
    if (!(form instanceof HTMLFormElement)) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleSubmit(event);
    });

    async function handleSubmit(event) {
      const currentForm = event.currentTarget;
      const button = currentForm.querySelector('[type="submit"]');
      const message = currentForm.querySelector('.form-message');
      if (message) {
        message.textContent = '';
        message.classList.remove('success');
      }
      try {
        setLoading(button, true);
        await handler(new FormData(currentForm), currentForm);
      } catch (error) {
        if (message) message.textContent = error.message;
        else toast(error.message);
      } finally {
        setLoading(button, false);
      }
    }
  }

  loadWindowAuth();
  applyTheme();

  return {
    API_BASE,
    api,
    badge,
    bindDrawer,
    businesses: () => businesses,
    currentTheme: () => selectedTheme,
    currentUser: () => currentUser,
    escapeHtml,
    formatCurrency,
    formatDate,
    hydrateIcons,
    layout,
    loadBusinesses,
    logout,
    normalizeList,
    redirectOnMissingAuth,
    requireWorkspace,
    routeAfterBusinessCheck,
    selectedBusiness,
    selectedBusinessId: () => selectedBusinessId,
    setBusinesses,
    setCurrentUser,
    setSelectedBusinessId,
    setLoading,
    setToken,
    setTheme,
    statusFor,
    toast,
    whatsappUrl,
    withSubmit
  };
})();

window.Cindy = Cindy;
