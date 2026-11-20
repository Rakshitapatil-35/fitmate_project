/**
 * ============================================================================
 * FITMATE FRONTEND APPLICATION MAIN ENTRY POINT
 * Initializes routing (#/ -> #/auth -> #/gender -> #/category -> #/measurements -> #/fit-style -> #/results),
 * connects state listeners, loads active session, mounts the Single Page Application,
 * and attaches global 60fps motion systems.
 * ============================================================================
 */

import { Router } from './routes/router.js';
import { store } from './state/store.js';
import { api } from './services/api.js';
import { initBackgroundBlobs, ripple, attachCursorGlow } from './components/motion.js';

// Import All Page Views & Lifecycle Hooks
import { renderLandingPage, onMountLandingPage } from './pages/LandingPage.js';
import { renderAuthPage, onMountAuthPage } from './pages/AuthPage.js';
import {
  renderGenderPage,
  onMountGenderPage,
  renderCategoryPage,
  onMountCategoryPage,
  renderOnboardingPage,
  onMountOnboardingPage,
} from './pages/OnboardingPage.js';
import { renderDashboardPage, onMountDashboardPage } from './pages/DashboardPage.js';
import { renderMeasurementsPage, onMountMeasurementsPage } from './pages/MeasurementsPage.js';
import {
  renderFitStylePage,
  onMountFitStylePage,
  renderBrandProductPickerPage,
  onMountBrandProductPickerPage,
} from './pages/BrandProductPickerPage.js';
import {
  renderResultsPage,
  onMountResultsPage,
  renderResultPage,
  onMountResultPage,
} from './pages/ResultPage.js';
import { renderComparisonTablePage, onMountComparisonTablePage } from './pages/ComparisonTablePage.js';
import { renderHistoryProfilesPage, onMountHistoryProfilesPage } from './pages/HistoryProfilesPage.js';

// Route Definitions: #/ landing -> #/auth -> #/gender -> #/category -> #/measurements -> #/fit-style -> #/results
const routes = {
  '/': {
    component: renderLandingPage,
    onMount: onMountLandingPage,
    requiresAuth: false,
  },
  '/auth': {
    component: renderAuthPage,
    onMount: onMountAuthPage,
    requiresAuth: false,
  },
  '/gender': {
    component: renderGenderPage,
    onMount: onMountGenderPage,
    requiresAuth: false,
  },
  '/category': {
    component: renderCategoryPage,
    onMount: onMountCategoryPage,
    requiresAuth: false,
  },
  '/measurements': {
    component: renderMeasurementsPage,
    onMount: onMountMeasurementsPage,
    requiresAuth: false,
  },
  '/fit-style': {
    component: renderFitStylePage,
    onMount: onMountFitStylePage,
    requiresAuth: false,
  },
  '/results': {
    component: renderResultsPage,
    onMount: onMountResultsPage,
    requiresAuth: false,
  },
  // Legacy & Companion Routes
  '/onboarding': {
    component: renderOnboardingPage,
    onMount: onMountOnboardingPage,
    requiresAuth: false,
  },
  '/home': {
    component: renderDashboardPage,
    onMount: onMountDashboardPage,
    requiresAuth: true,
  },
  '/brand-picker': {
    component: renderBrandProductPickerPage,
    onMount: onMountBrandProductPickerPage,
    requiresAuth: false,
  },
  '/result': {
    component: renderResultPage,
    onMount: onMountResultPage,
    requiresAuth: false,
  },
  '/comparison': {
    component: renderComparisonTablePage,
    onMount: onMountComparisonTablePage,
    requiresAuth: false,
  },
  '/history': {
    component: renderHistoryProfilesPage,
    onMount: onMountHistoryProfilesPage,
    requiresAuth: false,
  },
};

export function initApp() {
  console.log('⚡ Initializing FITMATE Dynamic Motion Experience...');

  initBackgroundBlobs(document.body);

  if (typeof window !== 'undefined') {
    let progressBar = document.getElementById('fm-scroll-progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'fm-scroll-progress-bar';
      document.body.prepend(progressBar);
    }
    window.addEventListener(
      'scroll',
      () => {
        const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollCurrent = window.scrollY || document.documentElement.scrollTop;
        const pct = scrollTotal > 0 ? (scrollCurrent / scrollTotal) * 100 : 0;
        progressBar.style.width = `${pct}%`;
      },
      { passive: true }
    );
  }

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.fm-btn');
    if (btn) {
      ripple(e, btn);
    }
  });

  attachCursorGlow('.fm-btn-glow');

  const router = new Router(routes, 'app-root');
  router.handleRoute();

  // Attempt to restore user profile and saved measurement profiles in background
  if (api.isAuthenticated()) {
    api
      .getCurrentUserProfile()
      .then((user) => {
        if (user) {
          store.setState({ user, isAuthenticated: true });
        }
      })
      .catch((err) => console.log('Session check notice:', err.message));

    api
      .listMeasurements()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          const defaultProf = profiles.find((p) => p.is_default) || profiles[0];
          store.setState({
            profiles,
            activeProfile: defaultProf,
          });
          // Only prefill draft if user has not already edited draft in current session
          if (!store.getState().draftMeasurements.measurementsConfirmed) {
            store.applyProfileToDraft(defaultProf);
          }
          // Re-render if user is on /gender or /measurements so the "Saved Measurements Found" banner appears
          const curPath = router.getCurrentPath().split('?')[0];
          if (curPath === '/gender' || curPath === '/measurements') {
            router.handleRoute();
          }
        }
      })
      .catch((err) => console.log('Saved profiles sync notice:', err.message));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
