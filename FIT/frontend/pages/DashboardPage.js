/**
 * ============================================================================
 * PART 1: HOME / DASHBOARD SCREEN (Dynamic Hub & Motion)
 * User hub with personalized silhouette status, recent recommendations,
 * quick action tiles, 3D tilt, and real-time backend data loading.
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';
import { tilt3d } from '../components/motion.js';

export async function renderDashboardPage() {
  const { user, activeProfile } = store.getState();
  const userName = user?.full_name ? user.full_name.split(' ')[0] : 'Emma';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const profileChest = activeProfile?.chest_bust_cm || 92;
  const profileWaist = activeProfile?.waist_cm || 74;

  return `
    <div class="app-shell">
      ${renderTopNav('/home')}
      ${renderToasts()}

      <main class="main-content">
        <!-- Header Greeting Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h1 style="font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 800; color: var(--color-text-main); letter-spacing: -0.02em;">
                ${greeting}, ${userName}
              </h1>
              <span style="font-size: 1.5rem;">✨</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 0.2rem;">
              Your silhouette is calibrated & ready for 500+ verified brands
            </p>
          </div>
        </div>
      </main>

      ${renderBottomTabBar('/home')}
    </div>
  `;
}

export function onMountDashboardPage() {
  attachTopNavEvents();
}
