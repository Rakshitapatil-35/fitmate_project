/**
 * ============================================================================
 * STEP 7 & 8: SAVED PROFILES & EDIT MEASUREMENTS SCREEN (#/history)
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { FITMATE_IMAGES, getCategoryImage } from '../config/images.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';
import { triggerMultiBrandEvaluation } from './BrandProductPickerPage.js';
import { flip, tilt3d } from '../components/motion.js';

let showProfileModal = false;
let editingProfileId = null;
let pendingDeletedProfile = null;
let undoTimeoutId = null;

function formatHistoryEntry(entry) {
  const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recently';
  if (entry.action === 'created') {
    return `<div style="font-size: 0.72rem; color: var(--color-text-muted); padding: 0.25rem 0;">• <strong>Created</strong> (${ts})</div>`;
  }
  if (entry.action === 'reset') {
    return `<div style="font-size: 0.72rem; color: var(--color-marigold); padding: 0.25rem 0;">• <strong>Reset to baseline</strong> (${ts})</div>`;
  }
  const changesObj = entry.changes || {};
  const diffList = Object.entries(changesObj)
    .map(([field, diff]) => {
      const label = field.replace('_cm', '').replace('_kg', '');
      return `${label}: ${diff.from ?? '–'} → <strong>${diff.to ?? '–'}</strong>`;
    })
    .join(', ');
  return `<div style="font-size: 0.72rem; color: var(--color-text-main); padding: 0.25rem 0; border-bottom: 1px dashed var(--color-border-subtle);">• <strong>Updated</strong> (${ts}): ${diffList || 'measurements modified'}</div>`;
}

export async function renderHistoryProfilesPage() {
  return '<div class="app-shell"></div>';
}

export function onMountHistoryProfilesPage() {
}
