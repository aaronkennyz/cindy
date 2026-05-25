import { API_BASE } from '../config.js';

export const Cindy = (() => {
  const authStateKey = 'cindy:auth';
  const themeClasses = ['theme-default', 'theme-youtube'];
  const themes = {
    default: {
      '--bg-base': '#0f0f0f',
      '--bg-surface': '#1a1a1a',
      '--bg-elevated': '#222222',
      '--border': '#2e2e2e',
      '--accent': '#6c63ff',
      '--accent-hover': '#574fd6',
      '--accent-soft': 'rgba(108, 99, 255, 0.12)',
      '--text-primary': '#f0f0f0',
      '--text-secondary': '#888888',
      '--text-muted': '#555555',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--danger': '#ef4444'
    },
    youtube: {
      '--bg-base': '#0f0f0f',
      '--bg-surface': '#1a1a1a',
      '--bg-elevated': '#272727',
      '--border': '#303030',
      '--accent': '#ff0000',
      '--accent-hover': '#cc0000',
      '--accent-soft': 'rgba(255, 0, 0, 0.12)',
      '--text-primary': '#f1f1f1',
      '--text-secondary': '#aaaaaa',
      '--text-muted': '#606060',
      '--success': '#2ba640',
      '--warning': '#f59e0b',
      '--danger': '#ff4444'
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
        selectedTheme = themes[parsed.selectedTheme] ? parsed.selectedTheme : 'default';
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

  function applyTheme(themeName = selectedTheme) {
    selectedTheme = themes[themeName] ? themeName : 'default';
    const values = themes[selectedTheme];
    Object.entries(values).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    document.body?.classList.remove(...themeClasses);
    document.body?.classList.add(`theme-${selectedTheme}`);
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
  }

  function setCurrentUser(user) {
    currentUser = user || currentUser;
    persistState();
  }

  function setSelectedBusinessId(id) {
    selectedBusinessId = id || null;
    persistState();
  }

  function selectedBusiness() {
    return businesses.find((business) => String(business.id) === String(selectedBusinessId)) || null;
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
        <a class="wordmark" href="dashboard.html" aria-label="Cindy dashboard">
          <span class="wordmark-mark"><i data-lucide="sparkles" class="icon"></i></span>
          <span>Cindy</span>
        </a>
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
