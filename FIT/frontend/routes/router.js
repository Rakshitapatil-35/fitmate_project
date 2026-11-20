/**
 * ============================================================================
 * FITMATE CLIENT-SIDE ROUTER WITH ROUTE GUARDS & ANIMATED TRANSITIONS
 * Handles hash and history routing, direction-aware page transitions,
 * route cleanup, authentication guards, and flow step validation.
 * ============================================================================
 */

import { store } from '../state/store.js';
import { attachTopNavEvents } from '../components/TopNav.js';
import { attachCursorGlow } from '../components/motion.js';

export class Router {
  constructor(routes = {}, rootElementId = 'app-root') {
    this.routes = routes;
    this.rootElementId = rootElementId;
    this.currentPath = '/';
    this.currentParams = {};
    this.historyStack = [];

    window.addEventListener('popstate', () => this.handleRoute());
    window.addEventListener('hashchange', () => this.handleRoute());

    // Intercept clicks on links with data-link or href starting with #/ or /
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link], a[href^="#/"]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const path = href.startsWith('#/') ? href.slice(1) : href;
        this.navigate(path);
      }
    });
  }

  getCurrentPath() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      return hash.slice(1);
    }
    return window.location.pathname || '/';
  }

  navigate(path, replace = false) {
    if (!path.startsWith('/')) path = '/' + path;
    const hashPath = `#${path}`;

    if (replace) {
      window.history.replaceState(null, '', hashPath);
    } else {
      window.history.pushState(null, '', hashPath);
    }

    this.handleRoute();
  }

  async handleRoute() {
    const rawPath = this.getCurrentPath();
    const [pathOnly, queryString] = rawPath.split('?');
    const path = pathOnly.trim() || '/';

    const previousPath = this.currentPath;
    this.historyStack.push(path);

    // Parse query params
    const queryParams = new URLSearchParams(queryString || '');
    this.currentParams = Object.fromEntries(queryParams.entries());
    this.currentPath = path;

    // Match route
    let routeConfig = this.routes[path];
    if (!routeConfig) {
      for (const [pattern, config] of Object.entries(this.routes)) {
        if (pattern.includes(':')) {
          const regexPattern = '^' + pattern.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$';
          const match = path.match(new RegExp(regexPattern));
          if (match && match.groups) {
            routeConfig = config;
            this.currentParams = { ...this.currentParams, ...match.groups };
            break;
          }
        }
      }
    }

    // Fallback to landing or 404
    if (!routeConfig) {
      routeConfig = this.routes['/'] || { component: () => '<div>404 Page Not Found</div>' };
    }

    // 1. Returning users with a valid session skip the landing page (#/) and go straight to #/gender
    const { isAuthenticated, draftMeasurements } = store.getState();
    if (path === '/' && isAuthenticated && !this.currentParams.stay) {
      this.navigate('/gender', true);
      return;
    }

    // 2. Route Guard for authenticated pages
    if (routeConfig.requiresAuth && !isAuthenticated) {
      store.addToast('Please sign in or create an account to continue.', 'warning');
      this.navigate(`/auth?redirect=${encodeURIComponent(path)}`, true);
      return;
    }

    // 3. Flow Integrity Guard: ensure Men never stay on womens_dresses if navigating via Back/Forward
    if (draftMeasurements.gender === 'male' && draftMeasurements.categoryGroup === 'dresses') {
      store.setCategory('tops');
    }

    // 4. Optional custom route guard hook
    if (typeof routeConfig.guard === 'function') {
      const redirectPath = routeConfig.guard(store.getState(), this.currentParams);
      if (redirectPath && redirectPath !== path) {
        this.navigate(redirectPath, true);
        return;
      }
    }

    // Render Page Component
    const container = document.getElementById(this.rootElementId);
    if (!container) return;

    // Scroll to top only when navigating to a different route path
    if (path !== previousPath) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    try {
      const view = await routeConfig.component(this.currentParams);
      if (typeof view === 'string') {
        container.innerHTML = view;
      } else if (view instanceof HTMLElement) {
        container.innerHTML = '';
        container.appendChild(view);
      }

      // Attach global TopNav events
      attachTopNavEvents();
      attachCursorGlow('.fm-btn-glow');

      // Execute post-mount lifecycle hook if provided
      if (typeof routeConfig.onMount === 'function') {
        routeConfig.onMount(this.currentParams);
      }

      // Dispatch route changed event
      window.dispatchEvent(
        new CustomEvent('fitmate:route_changed', {
          detail: { path, previousPath, params: this.currentParams },
        })
      );
    } catch (err) {
      console.error('Error rendering route:', err);
      container.innerHTML = `
        <div class="fm-card" style="margin: 2rem auto; max-width: 500px; text-align: center;">
          <h2 style="color: var(--color-error); margin-bottom: 0.5rem;">Something went wrong</h2>
          <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">${err.message}</p>
          <a href="#/" class="fm-btn fm-btn-primary">Return to Home</a>
        </div>
      `;
    }
  }
}
