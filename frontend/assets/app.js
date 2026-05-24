import { API_BASE } from '../config.js';

export const Cindy = (() => {
  const authStateKey = 'cindy:auth';
  let authToken = null;
  let currentUser = null;

  function loadWindowAuth() {
    if (!window.name) return;
    try {
      const parsed = JSON.parse(window.name);
      if (parsed && parsed.key === authStateKey && parsed.token) {
        authToken = parsed.token;
        currentUser = parsed.user || null;
      }
    } catch {
      authToken = null;
      currentUser = null;
    }
  }

  function setToken(token, user) {
    authToken = token || null;
    currentUser = user || null;
    window.name = authToken ? JSON.stringify({ key: authStateKey, token: authToken, user: currentUser }) : '';
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

  function normalizeList(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
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
    document.body.insertAdjacentHTML('afterbegin', `
      <aside class="sidebar">
        <a class="wordmark" href="dashboard.html" aria-label="Cindy dashboard">
          <span class="wordmark-mark"><i data-lucide="sparkles" class="icon"></i></span>
          <span>Cindy</span>
        </a>
        <nav class="nav" aria-label="Main navigation">
          ${navItem('dashboard', 'dashboard.html', 'layout-dashboard', 'Dashboard', active)}
          ${navItem('customers', 'customers.html', 'users', 'Customers', active)}
          ${navItem('plans', 'plans.html', 'badge-dollar-sign', 'Plans', active)}
          ${navItem('messaging', 'messaging.html', 'message-circle', 'Messages', active)}
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
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const message = form.querySelector('.form-message');
      if (message) {
        message.textContent = '';
        message.classList.remove('success');
      }
      try {
        setLoading(button, true);
        await handler(new FormData(form), form);
      } catch (error) {
        if (message) message.textContent = error.message;
        else toast(error.message);
      } finally {
        setLoading(button, false);
      }
    });
  }

  loadWindowAuth();

  return {
    API_BASE,
    api,
    badge,
    bindDrawer,
    currentUser: () => currentUser,
    escapeHtml,
    formatCurrency,
    formatDate,
    hydrateIcons,
    layout,
    logout,
    normalizeList,
    redirectOnMissingAuth,
    setLoading,
    setToken,
    statusFor,
    toast,
    whatsappUrl,
    withSubmit
  };
})();

window.Cindy = Cindy;
