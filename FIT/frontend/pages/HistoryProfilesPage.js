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
  const { user, activeProfile, profiles, draftMeasurements, isAuthenticated } = store.getState();

  let recs = [];
  let userProfiles = profiles;
  try {
    userProfiles = await api.listMeasurements();
    if (userProfiles && userProfiles.length > 0) {
      store.setState({ profiles: userProfiles });
    }
    recs = await api.listRecommendations();
  } catch (err) {
    console.warn('History profiles load notice:', err.message);
  }

  if (!userProfiles || userProfiles.length === 0) {
    userProfiles = [
      {
        id: 101,
        profile_name: "Women's Tops Profile",
        gender: 'female',
        target_category: 'womens_tops',
        fit_style: 'Regular',
        chest_bust_cm: draftMeasurements.chest || 92,
        waist_cm: draftMeasurements.waist || 74,
        hips_cm: draftMeasurements.hips || 98,
        height_cm: draftMeasurements.height || 168,
        shoulder_cm: draftMeasurements.shoulder || 40,
        inseam_cm: draftMeasurements.inseam || 78,
        is_default: true,
        updated_at: new Date().toISOString(),
        history: [{ timestamp: new Date().toISOString(), action: 'created' }],
      },
    ];
    store.state.profiles = userProfiles;
  }

  const currentProf = activeProfile || userProfiles[0] || null;
  const editingProf =
    editingProfileId != null
      ? userProfiles.find((p) => Number(p.id) === Number(editingProfileId)) || null
      : null;

  return `
    <div class="app-shell">
      ${renderTopNav('/history')}
      ${renderToasts()}
      <main class="main-content" style="max-width: 920px;"></main>
      ${renderBottomTabBar('/history')}
    </div>
  `;
}

export function onMountHistoryProfilesPage() {
}
