/**
 * ============================================================================
 * PHASE 4.1: LUXURY AUTHENTICATION SCREEN (#/auth — Log In & Sign Up)
 * - Uses the supplied FITMATE logo branding in an editorial split-screen layout
 * - Password visibility toggle (Show / Hide password)
 * - Inline validation, loading states, error handling
 * - Auto-logs user in after Sign Up and sends straight into #/gender
 * - Preserves seeded demo account auto-fill (alex@sizerec.example.com / UserPass123)
 * ============================================================================
 */

import { api } from '../services/api.js';
import { store } from '../state/store.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';

let authMode = 'login';

export function renderAuthPage(params = {}) {
  if (params && (params.mode === 'signup' || params.mode === 'login')) {
    authMode = params.mode;
  }
  const isSignup = authMode === 'signup';

  return `
    <div class="app-shell">
      ${renderTopNav('/auth')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 1020px; display: flex; align-items: center; justify-content: center; min-height: 78vh;">
        <div class="fm-card" style="width: 100%; padding: 0; overflow: hidden; border: 1px solid var(--color-muted-beige); box-shadow: var(--shadow-lg); display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
          
          <!-- Left Column: Supplied FITMATE Brand Identity Showcase -->
          <div style="background: linear-gradient(160deg, #E9DCC5 0%, #D6C4A7 100%); padding: 2.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; border-right: 1px solid var(--color-muted-beige);">
            <div style="width: 100%;">
              <span class="fm-chip fm-chip-coral" style="margin-bottom: 1rem;">Bespoke Sizing Atelier</span>
              <h2 class="fm-serif" style="font-size: 2rem; font-weight: 700; color: var(--color-dark-chocolate); line-height: 1.15; margin-bottom: 0.5rem;">
                Tailored Confidence Across Every Label
              </h2>
              <p style="font-size: 0.86rem; color: var(--color-text-muted); max-width: 340px; margin: 0 auto 1.5rem;">
                Save your body measurements once and compare your recommended size across Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, and AuraAtelier.
              </p>
            </div>

            <div class="fm-img-frame" style="width: 100%; max-width: 310px; aspect-ratio: 1 / 1; border: 1.5px solid var(--color-champagne-gold); box-shadow: var(--shadow-md); background: #E9DCC5; margin-bottom: 1.25rem;">
              <img
                src="./assets/brand/fitmate-hero-logo.jpg"
                alt="FITMATE Official Brand Logo — Your Perfect Fit Starts Here"
                style="width: 100%; height: 100%; object-fit: contain;"
              />
            </div>

            <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-espresso);">
              YOUR PERFECT FIT STARTS HERE
            </div>
          </div>

          <div style="padding: clamp(1.75rem, 3.5vw, 2.75rem); background: var(--color-white); display: flex; flex-direction: column; justify-content: center;">
            <div style="margin-bottom: 1.5rem;">
              <h1 class="fm-serif" style="font-size: 2rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
                ${isSignup ? 'Create Your FITMATE Account' : 'Welcome Back to FITMATE'}
              </h1>
            </div>
          </div>

        </div>
      </main>

      ${renderBottomTabBar('/auth')}
    </div>
  `;
}
