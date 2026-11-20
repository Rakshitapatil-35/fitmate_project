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

          <!-- Right Column: Authentication Form -->
          <div style="padding: clamp(1.75rem, 3.5vw, 2.75rem); background: var(--color-white); display: flex; flex-direction: column; justify-content: center;">
            <div style="margin-bottom: 1.5rem;">
              <h1 class="fm-serif" style="font-size: 2rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
                ${isSignup ? 'Create Your FITMATE Account' : 'Welcome Back to FITMATE'}
              </h1>
              <p style="font-size: 0.88rem; color: var(--color-text-muted);">
                ${isSignup ? 'Register below to enter the app immediately — no second login required.' : 'Sign in to access your saved measurement profiles and fit history.'}
              </p>
            </div>

            <!-- Segmented Toggle (Log In / Sign Up) -->
            <div style="display: flex; background: var(--color-soft-cream); padding: 0.28rem; border-radius: var(--radius-sm); border: 1px solid var(--color-muted-beige); margin-bottom: 1.35rem;">
              <button type="button" id="tab-login" class="fm-btn ${!isSignup ? 'fm-btn-primary' : 'fm-btn-ghost'}" style="flex: 1; padding: 0.55rem; font-size: 0.88rem;">
                Log In
              </button>
              <button type="button" id="tab-signup" class="fm-btn ${isSignup ? 'fm-btn-primary' : 'fm-btn-ghost'}" style="flex: 1; padding: 0.55rem; font-size: 0.88rem;">
                Sign Up
              </button>
            </div>

            <!-- Demo Account Auto-Fill Bar -->
            <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-sm); padding: 0.7rem 0.9rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                <strong style="color: var(--color-espresso);">Demo Account:</strong> alex@sizerec.example.com
              </div>
              <button type="button" id="btn-fill-demo" class="fm-btn fm-btn-secondary fm-btn-sm" style="padding: 0.28rem 0.75rem; font-size: 0.76rem; flex-shrink: 0;">
                Auto-Fill Demo
              </button>
            </div>

            <!-- Server Error Banner -->
            <div id="auth-general-error" role="alert" style="display: none; background: var(--color-error-light); border: 1px solid var(--color-error); color: var(--color-error); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem;"></div>

            <form id="auth-form" novalidate>
              ${
                isSignup
                  ? `
                <div class="fm-form-group">
                  <label class="fm-label" for="auth-name">Full Name <span style="color: var(--color-champagne-gold);">*</span></label>
                  <div class="fm-input-wrapper">
                    <span class="material-symbols-outlined fm-input-icon">person</span>
                    <input type="text" id="auth-name" class="fm-input with-icon" placeholder="Emma Watson" autocomplete="name" required />
                  </div>
                  <div id="err-name" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
                </div>
              `
                  : ''
              }

              <div class="fm-form-group">
                <label class="fm-label" for="auth-email">Email Address <span style="color: var(--color-champagne-gold);">*</span></label>
                <div class="fm-input-wrapper">
                  <span class="material-symbols-outlined fm-input-icon">mail</span>
                  <input type="email" id="auth-email" class="fm-input with-icon" placeholder="alex@sizerec.example.com" autocomplete="email" required />
                </div>
                <div id="err-email" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
              </div>

              <div class="fm-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label class="fm-label" for="auth-password">Password <span style="color: var(--color-champagne-gold);">*</span></label>
                  <span style="font-size: 0.72rem; color: var(--color-text-light);">
                    ${isSignup ? 'Min 8 chars, 1 letter & 1 number' : ''}
                  </span>
                </div>
                <div class="fm-input-wrapper">
                  <span class="material-symbols-outlined fm-input-icon">lock</span>
                  <input type="password" id="auth-password" class="fm-input with-icon" placeholder="••••••••" autocomplete="${isSignup ? 'new-password' : 'current-password'}" style="padding-right: 2.8rem;" required />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    aria-label="Toggle password visibility"
                    style="position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; color: var(--color-text-light); display: flex; align-items: center; padding: 0.25rem;"
                  >
                    <span class="material-symbols-outlined" id="icon-toggle-password" style="font-size: 19px;">visibility</span>
                  </button>
                </div>
                <div id="err-password" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
              </div>

              <button type="submit" id="btn-auth-submit" class="fm-btn fm-btn-primary fm-btn-block" style="margin-top: 1rem; height: 3.2rem; font-size: 0.95rem;">
                <span>${isSignup ? 'Create Account & Continue' : 'Sign In & Continue'}</span>
                <span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-champagne-gold);">arrow_forward</span>
              </button>
            </form>

            <!-- Guest Access -->
            <div style="text-align: center; margin-top: 1.35rem; border-top: 1px solid var(--color-border-subtle); padding-top: 1rem;">
              <a href="#/gender" style="font-size: 0.85rem; color: var(--color-espresso); font-weight: 700; text-decoration: none;">
                Continue as Guest (Save measurements later) →
              </a>
            </div>
          </div>

        </div>
      </main>

      ${renderBottomTabBar('/auth')}
    </div>
  `;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function validateAuthInputs(isSignup, email, name, password) {
  let valid = true;
  showFieldError('err-name', '');
  showFieldError('err-email', '');
  showFieldError('err-password', '');
  const generalErr = document.getElementById('auth-general-error');
  if (generalErr) generalErr.style.display = 'none';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showFieldError('err-email', 'Please enter your email address.');
    valid = false;
  } else if (!emailRegex.test(email)) {
    showFieldError('err-email', 'Please enter a valid email address (e.g. name@example.com).');
    valid = false;
  }

  if (isSignup) {
    if (!name || name.length < 2) {
      showFieldError('err-name', 'Please enter your full name (at least 2 characters).');
      valid = false;
    }
  }

  if (!password) {
    showFieldError('err-password', 'Please enter your password.');
    valid = false;
  } else if (isSignup) {
    if (password.length < 8) {
      showFieldError('err-password', 'Password must be at least 8 characters long.');
      valid = false;
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showFieldError('err-password', 'Password must contain at least one letter and one number.');
      valid = false;
    }
  }

  return valid;
}

export function onMountAuthPage(params = {}) {
  attachTopNavEvents();

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const btnFillDemo = document.getElementById('btn-fill-demo');
  const btnTogglePass = document.getElementById('btn-toggle-password');
  const iconTogglePass = document.getElementById('icon-toggle-password');
  const passInput = document.getElementById('auth-password');
  const form = document.getElementById('auth-form');

  if (btnTogglePass && passInput) {
    btnTogglePass.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      if (iconTogglePass) {
        iconTogglePass.textContent = isHidden ? 'visibility_off' : 'visibility';
      }
    });
  }

  if (tabLogin) {
    tabLogin.addEventListener('click', () => {
      authMode = 'login';
      const redirectParam = params?.redirect ? `&redirect=${encodeURIComponent(params.redirect)}` : '';
      window.location.hash = `#/auth?mode=login${redirectParam}`;
    });
  }

  if (tabSignup) {
    tabSignup.addEventListener('click', () => {
      authMode = 'signup';
      const redirectParam = params?.redirect ? `&redirect=${encodeURIComponent(params.redirect)}` : '';
      window.location.hash = `#/auth?mode=signup${redirectParam}`;
    });
  }

  if (btnFillDemo) {
    btnFillDemo.addEventListener('click', () => {
      const emailInput = document.getElementById('auth-email');
      const nameInput = document.getElementById('auth-name');
      if (emailInput) emailInput.value = 'alex@sizerec.example.com';
      if (passInput) passInput.value = 'UserPass123';
      if (nameInput && !nameInput.value) nameInput.value = 'Alex Rivera';
      showFieldError('err-name', '');
      showFieldError('err-email', '');
      showFieldError('err-password', '');
      store.addToast('Demo credentials filled (UserPass123).', 'info');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isSignup = authMode === 'signup';
      const email = document.getElementById('auth-email')?.value.trim() || '';
      const password = document.getElementById('auth-password')?.value || '';
      const name = document.getElementById('auth-name')?.value.trim() || '';

      if (!validateAuthInputs(isSignup, email, name, password)) {
        return;
      }

      const submitBtn = document.getElementById('btn-auth-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>${isSignup ? 'Creating account & signing you in...' : 'Signing in...'}</span>`;
      }

      try {
        if (isSignup) {
          await store.register(email, name, password);
          store.addToast(`Welcome to FITMATE, ${name}!`, 'success');
        } else {
          await store.login(email, password);
          store.addToast('Welcome back! Your saved profiles are ready.', 'success');
        }

        const targetRoute = params?.redirect || '/gender';
        window.location.hash = `#${targetRoute.startsWith('/') ? targetRoute : '/' + targetRoute}`;
      } catch (err) {
        const message = err.message || 'Authentication failed. Please verify your credentials.';
        const generalErr = document.getElementById('auth-general-error');
        if (generalErr) {
          generalErr.textContent = message;
          generalErr.style.display = 'block';
        }
        store.addToast(message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>${authMode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}</span><span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-champagne-gold);">arrow_forward</span>`;
        }
      }
    });
  }
}
