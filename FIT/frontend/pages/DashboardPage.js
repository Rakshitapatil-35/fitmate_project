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

  let recentRecs = [];
  try {
    recentRecs = await api.listRecommendations();
  } catch (err) {
    console.warn('Dashboard recommendation load notice:', err.message);
  }

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

          <!-- User Avatar Chip -->
          <div style="position: relative; width: 3.25rem; height: 3.25rem; border-radius: var(--radius-pill); background: var(--color-surface-subtle); border: 2px solid var(--color-secondary); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
            <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-secondary);">person</span>
            <div style="position: absolute; bottom: -2px; right: -2px; width: 1rem; height: 1rem; border-radius: var(--radius-pill); background: var(--color-secondary); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 10px;">check</span>
            </div>
          </div>
        </div>

        <!-- Hero CTA Card with 3D Tilt -->
        <div class="fm-card-hero tilt-card" style="margin-bottom: 1.75rem; background: linear-gradient(135deg, #FFF9F2 0%, #FFFFFF 100%);">
          <!-- Floating Pill Badge -->
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255, 255, 255, 0.9); padding: 0.35rem 0.85rem; border-radius: var(--radius-pill); box-shadow: var(--shadow-sm); margin-bottom: 1rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-secondary);"></span>
            <span style="font-size: 0.82rem; font-weight: 800; color: var(--color-secondary);">Active Profile: ${activeProfile?.profile_name || "Emma's Silhouette"}</span>
            <span style="color: var(--color-text-muted);">•</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary);">98% Match Ready</span>
          </div>

          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.4rem;">
            Find Your Size in Seconds
          </h2>
          <p style="font-size: 0.95rem; color: var(--color-text-muted); margin-bottom: 1.5rem; max-width: 500px; line-height: 1.5;">
            Shopping for something new? Match your measurements to any brand's cut pattern before clicking buy.
          </p>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#/gender" class="fm-btn fm-btn-primary fm-btn-glow">
              <span>Start Sizing Flow</span>
              <span class="material-symbols-outlined" style="font-size: 18px;">magic_button</span>
            </a>
            <a href="#/fit-style" class="fm-btn fm-btn-secondary">
              <span class="material-symbols-outlined" style="font-size: 18px;">styler</span>
              <span>Choose Fit Style</span>
            </a>
            <a href="#/measurements" class="fm-btn fm-btn-secondary">
              <span class="material-symbols-outlined" style="font-size: 18px;">tune</span>
              <span>Edit Measurements</span>
            </a>
          </div>
        </div>

        <!-- Quick-Action 3-Tile Row with 3D Tilt -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <!-- Tile 1: My Profile -->
          <a href="#/measurements" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-secondary-light); color: var(--color-secondary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">accessibility_new</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">My Twin</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">${profileChest} cm chest • ${profileWaist} cm waist</p>
          </a>

          <!-- Tile 2: Compare -->
          <a href="#/comparison" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">table_chart</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">Cross-Brand Matrix</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">Compare fit charts across 500+ labels</p>
          </a>

          <!-- Tile 3: Vault -->
          <a href="#/history" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-marigold-light); color: var(--color-marigold); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">history</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">Wardrobe Vault</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">${recentRecs.length} past recommendations saved</p>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/home')}
    </div>
  `;
}

export function onMountDashboardPage() {
  attachTopNavEvents();
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 5);
  });
}
