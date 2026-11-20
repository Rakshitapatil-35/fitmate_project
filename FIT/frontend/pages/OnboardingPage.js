/**
 * ============================================================================
 * PHASE 4.2 & 4.3: GENDER SELECTION (#/gender) & CLOTHING CATEGORIES (#/category)
 * - Uses realistic locally stored fashion editorial photography in ./assets/fashion/
 * - Warm Ivory, Espresso Brown, Champagne Gold luxury theme
 * - Preserves gender state, profile persistence, saved measurements quick-resume,
 *   category codes, and route guards.
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { FITMATE_IMAGES, getCategoryImage } from '../config/images.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';

function renderFlowStepper(activeStep = 1) {
  const steps = [
    { num: 1, label: 'Gender', path: '/gender' },
    { num: 2, label: 'Category', path: '/category' },
    { num: 3, label: 'Measurements', path: '/measurements' },
    { num: 4, label: 'Fit Style', path: '/fit-style' },
    { num: 5, label: 'Brand Sizes', path: '/results' },
  ];

  return `
    <div style="margin-bottom: 1.75rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.65rem;">
        ${steps
          .map((s) => {
            const isCurrent = s.num === activeStep;
            const isDone = s.num < activeStep;
            return `
              <a href="#${s.path}" style="text-decoration: none; display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-xs); border: 1px solid ${
              isCurrent
                ? 'var(--color-champagne-gold)'
                : isDone
                ? 'var(--color-muted-beige)'
                : 'transparent'
            }; background: ${
              isCurrent ? 'var(--color-espresso)' : isDone ? 'var(--color-warm-ivory)' : 'var(--color-white)'
            }; color: ${
              isCurrent ? 'var(--color-warm-ivory)' : isDone ? 'var(--color-espresso)' : 'var(--color-text-light)'
            }; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">
                <span style="width: 1.25rem; height: 1.25rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: ${
                  isCurrent ? 'var(--color-champagne-gold)' : isDone ? 'var(--color-espresso)' : 'var(--color-muted-beige)'
                }; color: ${isCurrent ? 'var(--color-dark-chocolate)' : '#FFFFFF'}; font-size: 0.7rem;">
                  ${isDone ? '✓' : s.num}
                </span>
                <span>${s.label}</span>
              </a>
            `;
          })
          .join('')}
      </div>
      <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
        <div style="width: ${(activeStep / 5) * 100}%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%); transition: width 0.3s ease;"></div>
      </div>
    </div>
  `;
}
