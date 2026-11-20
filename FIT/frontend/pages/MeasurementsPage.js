/**
 * ============================================================================
 * STEP 5: CATEGORY-AWARE BODY MEASUREMENTS INPUT SCREEN (#/measurements)
 * - Tops: bust/chest (req), waist (req), height (req), shoulder width (optional)
 * - Bottoms: waist (req), hips (req), height (req), inseam (optional)
 * - Dresses (women): bust (req), waist (req), hips (req), height (req), shoulder width (optional)
 * - Optional fields clearly marked with "Not sure? Skip this" hint & skip toggle
 * - Interactive "How to measure" tooltip + SVG mini diagram for every field
 * - Supports cm and inches with parse_circumference_to_cm() smart logic (waist 50-78 cm is not multiplied by 2.54)
 * - Range validation with friendly inline errors
 * - Saves measurements per category & gender in DB for logged-in users; prefills saved measurements
 *   and offers "Use saved measurements" or "Update measurements". Prompts guests to sign up to save permanently.
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { FITMATE_IMAGES } from '../config/images.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';

function computeSilhouettePath(chestCm, waistCm, hipsCm, heightCm) {
  const normH = Math.max(140, Math.min(210, heightCm || 168));
  const scaleY = (normH - 140) / (210 - 140);
  const bottomY = 215 + scaleY * 30;

  const cX = 110;
  const chestW = 28 + (((chestCm || 92) - 70) / (130 - 70)) * 28;
  const shoulderW = chestW * 1.18;
  const waistW = 22 + (((waistCm || 74) - 55) / (115 - 55)) * 26;
  const hipsW = 28 + (((hipsCm || 98) - 75) / (135 - 75)) * 32;

  const neckY = 32;
  const shoulderY = 46;
  const chestY = 82;
  const waistY = 124;
  const hipY = 164;

  return `
    M ${cX} 16
    C ${cX - 10} 16, ${cX - 12} 24, ${cX - 8} ${neckY}
    C ${cX - 14} 34, ${cX - shoulderW} 42, ${cX - shoulderW} ${shoulderY}
    C ${cX - shoulderW} 62, ${cX - chestW} 70, ${cX - chestW} ${chestY}
    C ${cX - chestW} 98, ${cX - waistW} 110, ${cX - waistW} ${waistY}
    C ${cX - waistW} 138, ${cX - hipsW} 148, ${cX - hipsW} ${hipY}
    C ${cX - hipsW} 184, ${cX - 28} 200, ${cX - 18} ${bottomY}
    L ${cX} ${bottomY - 14}
    L ${cX + 18} ${bottomY}
    C ${cX + 28} 200, ${cX + hipsW} 184, ${cX + hipsW} ${hipY}
    C ${cX + hipsW} 148, ${cX + waistW} 138, ${cX + waistW} ${waistY}
    C ${cX + waistW} 110, ${cX + chestW} 98, ${cX + chestW} ${chestY}
    C ${cX + chestW} 70, ${cX + shoulderW} 62, ${cX + shoulderW} ${shoulderY}
    C ${cX + shoulderW} 42, ${cX + 14} 34, ${cX + 8} ${neckY}
    C ${cX + 12} 24, ${cX + 10} 16, ${cX} 16
    Z
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Mirrors backend parse_circumference_to_cm() from src/preprocessing.py
 * When unit is 'metric' ('cm'), returns value in cm directly so metric values
 * like waist 50–78 cm are never multiplied by 2.54.
 * When unit is 'imperial' ('in'), converts inches to cm unless the value is clearly already cm (> 90 for waist, > 120 for height).
 */
export function parseMeasurementToCm(rawVal, unitMode, fieldKey) {
  const num = Number(rawVal);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (unitMode === 'metric') {
    return Math.round(num * 10) / 10;
  }
  // Imperial ('in') conversion
  if (fieldKey === 'height' && num > 100) {
    // Already in cm
    return Math.round(num * 10) / 10;
  }
  return Math.round(num * 2.54 * 10) / 10;
}

const FIELD_METADATA = {
  chest: {
    key: 'chest',
    labelWomen: 'Bust Circumference',
    labelMen: 'Chest Circumference',
    minCm: 60,
    maxCm: 165,
    sliderMinCm: 70,
    sliderMaxCm: 140,
    icon: 'circle',
    color: 'var(--color-primary)',
    chipClass: 'fm-chip-coral',
    howToTitle: 'How to Measure Bust / Chest',
    howToText: 'Wrap a flexible tape measure horizontally around the fullest part of your bust/chest, keeping the tape level under your arms.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 16 12 L 22 9 L 32 9 L 38 12 L 42 24 L 36 26 L 34 44 L 20 44 L 18 26 L 12 24 Z" fill="rgba(255,107,107,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="23" rx="11" ry="3.5" fill="none" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  waist: {
    key: 'waist',
    labelWomen: 'Natural Waist',
    labelMen: 'Natural Waist',
    minCm: 48,
    maxCm: 155,
    sliderMinCm: 52,
    sliderMaxCm: 130,
    icon: 'change_history',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-teal',
    howToTitle: 'How to Measure Waist',
    howToText: 'Measure around the narrowest part of your natural waistline (just above your belly button). Keep one finger between tape and skin.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 18 10 C 18 22, 21 26, 21 30 C 21 34, 16 40, 16 46 L 38 46 C 38 40, 33 34, 33 30 C 33 26, 36 22, 36 10 Z" fill="rgba(34,166,153,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="29" rx="7.5" ry="2.8" fill="none" stroke="var(--color-secondary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  hips: {
    key: 'hips',
    labelWomen: 'Hips & Seat',
    labelMen: 'Hips & Seat',
    minCm: 65,
    maxCm: 175,
    sliderMinCm: 72,
    sliderMaxCm: 145,
    icon: 'straighten',
    color: 'var(--color-marigold)',
    chipClass: 'fm-chip-marigold',
    howToTitle: 'How to Measure Hips',
    howToText: 'Stand with feet together and wrap the tape around the widest part of your hips and seat (about 20 cm below your natural waist).',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 20 12 L 34 12 L 39 32 L 36 46 L 29 46 L 27 35 L 25 46 L 18 46 L 15 32 Z" fill="rgba(247,183,49,0.14)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="31" rx="12" ry="3.5" fill="none" stroke="var(--color-marigold)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  height: {
    key: 'height',
    labelWomen: 'Total Height',
    labelMen: 'Total Height',
    minCm: 130,
    maxCm: 230,
    sliderMinCm: 140,
    sliderMaxCm: 210,
    icon: 'height',
    color: 'var(--color-sky)',
    chipClass: 'fm-chip-sky',
    howToTitle: 'How to Measure Height',
    howToText: 'Stand barefoot with your back flat against a wall and measure from the floor to the crown of your head.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="29" cy="12" r="4.5" fill="none" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <path d="M 29 17 L 29 33 M 22 22 L 36 22 M 29 33 L 24 46 M 29 33 L 34 46" stroke="var(--color-text-main)" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="14" y1="8" x2="14" y2="46" stroke="var(--color-sky)" stroke-width="2.2"/>
        <line x1="11" y1="8" x2="17" y2="8" stroke="var(--color-sky)" stroke-width="2"/>
        <line x1="11" y1="46" x2="17" y2="46" stroke="var(--color-sky)" stroke-width="2"/>
      </svg>
    `,
  },
  shoulder: {
    key: 'shoulder',
    labelWomen: 'Shoulder Width',
    labelMen: 'Shoulder Width',
    minCm: 30,
    maxCm: 65,
    sliderMinCm: 32,
    sliderMaxCm: 58,
    optional: true,
    skipFlag: 'skipShoulder',
    icon: 'open_in_full',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-lilac',
    howToTitle: 'How to Measure Shoulder Width (Optional)',
    howToText: 'Measure horizontally across your upper back from the outer edge of one shoulder bone (acromion) to the other.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 12 38 C 12 24, 18 20, 27 20 C 36 20, 42 24, 42 38" fill="none" stroke="var(--color-text-main)" stroke-width="1.6"/>
        <circle cx="27" cy="13" r="4.5" fill="none" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <line x1="13" y1="22" x2="41" y2="22" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
        <circle cx="13" cy="22" r="2.2" fill="var(--color-primary)"/>
        <circle cx="41" cy="22" r="2.2" fill="var(--color-primary)"/>
      </svg>
    `,
  },
  inseam: {
    key: 'inseam',
    labelWomen: 'Inside Leg (Inseam)',
    labelMen: 'Inside Leg (Inseam)',
    minCm: 50,
    maxCm: 108,
    sliderMinCm: 60,
    sliderMaxCm: 96,
    optional: true,
    skipFlag: 'skipInseam',
    icon: 'straighten',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-lilac',
    howToTitle: 'How to Measure Inseam (Optional)',
    howToText: 'Measure from the top of your inner thigh (crotch seam) straight down to your ankle bone along the inside of your leg.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 18 10 L 36 10 L 38 46 L 30 46 L 27 22 L 24 46 L 16 46 Z" fill="rgba(34,166,153,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <line x1="27" y1="22" x2="25" y2="46" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
};

export function getFieldsForCategory(categoryGroup, gender) {
  if (categoryGroup === 'bottoms') {
    return ['waist', 'hips', 'height', 'inseam'];
  }
  if (categoryGroup === 'dresses' && gender !== 'male') {
    return ['chest', 'waist', 'hips', 'height', 'shoulder'];
  }
  // Default: tops
  return ['chest', 'waist', 'height', 'shoulder'];
}

export function renderMeasurementsPage() {
  const { unit, draftMeasurements, isAuthenticated } = store.getState();
  const isMetric = unit === 'metric';
  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup = draftMeasurements.categoryGroup || 'tops';
  const categoryCode = draftMeasurements.categoryCode || (isMale ? 'mens_tops' : 'womens_tops');
  const activeFieldKeys = getFieldsForCategory(categoryGroup, draftMeasurements.gender);

  const savedProfileForCat = store.findSavedProfileForCategory(draftMeasurements.gender, categoryCode);

  const toDisplayVal = (cmVal) => {
    if (cmVal == null || cmVal === '') return '';
    if (isMetric) return Math.round(Number(cmVal) * 10) / 10;
    return Math.round((Number(cmVal) / 2.54) * 10) / 10;
  };

  const lenUnit = isMetric ? 'cm' : 'in';

  const categoryDisplayTitle =
    categoryGroup === 'bottoms'
      ? `${isMale ? "Men's" : "Women's"} Bottoms`
      : categoryGroup === 'dresses'
      ? "Women's Dresses"
      : `${isMale ? "Men's" : "Women's"} Tops`;

  const initialSvgPath = computeSilhouettePath(
    draftMeasurements.chest,
    draftMeasurements.waist,
    draftMeasurements.hips,
    draftMeasurements.height
  );

  return `
    <div class="app-shell">
      ${renderTopNav('/measurements')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 920px;">
        <!-- Flow Stepper -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="fm-chip fm-chip-marigold">
              Step 3 of 4 • ${categoryDisplayTitle} Measurements
            </span>
            <a href="#/category" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 15px;">checkroom</span>
              <span>Change Category (${categoryDisplayTitle})</span>
            </a>
          </div>
          <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
            <div style="width: 65%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%);"></div>
          </div>
        </div>

        ${
          savedProfileForCat
            ? `
          <!-- Prefilled Saved Profile Banner (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.25rem; padding: 1.1rem 1.3rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="material-symbols-outlined" style="color: var(--color-espresso); font-size: 24px;">verified_user</span>
              <div>
                <div style="font-size: 0.74rem; font-weight: 800; color: var(--color-espresso); text-transform: uppercase;">Saved Measurements Prefilled</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--color-dark-chocolate);">
                  Using <strong>${savedProfileForCat.profile_name}</strong> — skip straight to Fit Styles or update your numbers below.
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="btn-meas-use-saved" class="fm-btn fm-btn-primary fm-btn-sm" style="font-size: 0.8rem; padding: 0.45rem 0.95rem;">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-champagne-gold);">fast_forward</span>
                <span>Use Saved Measurements</span>
              </button>
              <a href="#/history" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.8rem; padding: 0.45rem 0.85rem;">
                <span>Manage Saved Vault</span>
              </a>
            </div>
          </div>
        `
            : !isAuthenticated
            ? `
          <!-- Guest Save Prompt Banner (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.25rem; padding: 0.95rem 1.25rem; background: var(--color-soft-cream); border: 1px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.85rem; color: var(--color-dark-chocolate);">
              <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px;">bookmark_add</span>
              <span><strong>Guest Mode:</strong> You can get full recommendations now! Sign up anytime to save your measurements permanently across devices.</span>
            </div>
            <a href="#/auth?mode=signup&redirect=/measurements" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.85rem;">
              Sign Up to Save Permanently
            </a>
          </div>
        `
            : ''
        }

        <!-- Title Card & Unit Segmented Switcher -->
        <div class="fm-card" style="margin-bottom: 1.25rem; padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-size: 1.4rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">
                Enter Your ${categoryDisplayTitle} Measurements
              </h1>
              <p style="font-size: 0.85rem; color: var(--color-text-muted);">
                Required fields are marked with <strong style="color: var(--color-primary);">*</strong>. Optional fields never block submission.
              </p>
            </div>

            <!-- Unit Segmented Switcher (CM vs IN) -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted);">Units:</span>
              <div style="display: flex; background: var(--color-bg); padding: 0.25rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border);">
                <button id="btn-unit-metric" type="button" class="fm-btn ${isMetric ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.9rem; font-size: 0.82rem;">
                  CM (Metric)
                </button>
                <button id="btn-unit-imperial" type="button" class="fm-btn ${!isMetric ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.9rem; font-size: 0.82rem;">
                  IN (Inches)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column Layout: Live Silhouette Twin + Category Measurement Fields -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.35rem; align-items: start; margin-bottom: 1.5rem;">
          
          <!-- Live Silhouette Twin Card -->
          <div class="fm-card" style="padding: 1.4rem; text-align: center; background: #FFFFFF;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase; letter-spacing: 0.04em;">
                ${categoryDisplayTitle} Guide
              </span>
              <span id="active-zone-label" class="fm-chip fm-chip-teal" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;">
                Interactive Twin
              </span>
            </div>

            <div style="background: var(--color-bg); border-radius: var(--radius-lg); padding: 1rem; border: 1px solid var(--color-border); position: relative; display: flex; justify-content: center; align-items: center; min-height: 260px; overflow: hidden;">
              <svg id="live-body-svg" viewBox="0 0 220 260" width="175" height="225" style="overflow: visible;">
                <line x1="20" y1="16" x2="20" y2="245" id="guide-height" stroke="var(--color-sky)" stroke-width="2" stroke-dasharray="3 3" opacity="0.5" />
                <circle cx="20" cy="16" r="3" fill="var(--color-sky)" opacity="0.7" />
                <circle cx="20" cy="245" r="3" fill="var(--color-sky)" opacity="0.7" />

                <path id="live-silhouette-path" d="${initialSvgPath}" fill="rgba(34, 166, 153, 0.14)" stroke="var(--color-secondary)" stroke-width="2.5" stroke-linejoin="round" />

                <!-- Shoulder Guideline -->
                <g id="guide-group-shoulder" style="opacity: ${activeFieldKeys.includes('shoulder') ? '0.85' : '0.2'};">
                  <line id="guide-shoulder" x1="52" y1="46" x2="168" y2="46" stroke="var(--color-primary)" stroke-width="1.6" stroke-dasharray="3 2" />
                  <text x="172" y="49" font-size="9" font-weight="700" fill="var(--color-primary)">Shoulder</text>
                </g>

                <!-- Chest / Bust Guideline -->
                <g id="guide-group-chest" style="opacity: ${activeFieldKeys.includes('chest') ? '0.95' : '0.2'};">
                  <line id="guide-chest" x1="45" y1="82" x2="175" y2="82" stroke="var(--color-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="82" r="3" fill="var(--color-primary)" />
                  <text x="178" y="85" font-size="10" font-weight="700" fill="var(--color-primary)">${isMale ? 'Chest' : 'Bust'}</text>
                </g>

                <!-- Waist Guideline -->
                <g id="guide-group-waist" style="opacity: ${activeFieldKeys.includes('waist') ? '0.95' : '0.2'};">
                  <line id="guide-waist" x1="55" y1="124" x2="165" y2="124" stroke="var(--color-secondary)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="124" r="3" fill="var(--color-secondary)" />
                  <text x="170" y="127" font-size="10" font-weight="700" fill="var(--color-secondary)">Waist</text>
                </g>

                <!-- Hips Guideline -->
                <g id="guide-group-hips" style="opacity: ${activeFieldKeys.includes('hips') ? '0.95' : '0.2'};">
                  <line id="guide-hips" x1="40" y1="164" x2="180" y2="164" stroke="var(--color-marigold)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="164" r="3" fill="var(--color-marigold)" />
                  <text x="183" y="167" font-size="10" font-weight="700" fill="var(--color-marigold)">Hips</text>
                </g>

                <!-- Inseam Guideline -->
                <g id="guide-group-inseam" style="opacity: ${activeFieldKeys.includes('inseam') ? '0.9' : '0.15'};">
                  <line id="guide-inseam" x1="110" y1="175" x2="96" y2="235" stroke="var(--color-secondary)" stroke-width="2" stroke-dasharray="3 2" />
                  <text x="115" y="215" font-size="9" font-weight="700" fill="var(--color-secondary)">Inseam</text>
                </g>
              </svg>
            </div>

            <!-- AI Model 4 Body Shape Detection Button -->
            <div style="margin-top: 1rem; text-align: left; background: var(--color-bg); padding: 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                <div>
                  <div style="font-size: 0.72rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase;">Model 4 Anthropometrics</div>
                  <div id="ai-shape-readout" style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">
                    Archetype: ${draftMeasurements.bodyShape || 'Balanced'}
                  </div>
                </div>
                <button type="button" id="btn-ai-detect-shape" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.76rem; padding: 0.35rem 0.75rem;">
                  <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-primary);">psychology</span>
                  <span>Detect Shape</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Category-Specific Measurement Inputs Form -->
          <form id="measurements-form" novalidate>
            <div style="display: flex; flex-direction: column; gap: 0.95rem; margin-bottom: 1.5rem;">
              ${activeFieldKeys
                .map((fieldKey) => {
                  const meta = FIELD_METADATA[fieldKey];
                  const label = isMale ? meta.labelMen : meta.labelWomen;
                  const isOptional = !!meta.optional;
                  const isSkipped = isOptional && !!draftMeasurements[meta.skipFlag];
                  const cmVal = draftMeasurements[fieldKey] ?? (fieldKey === 'shoulder' ? 40 : fieldKey === 'inseam' ? 78 : 80);
                  const displayVal = toDisplayVal(cmVal);
                  const minAllowed = isMetric ? meta.minCm : Math.round((meta.minCm / 2.54) * 10) / 10;
                  const maxAllowed = isMetric ? meta.maxCm : Math.round((meta.maxCm / 2.54) * 10) / 10;

                  return `
                    <div class="fm-card measurement-field-card" id="card-field-${fieldKey}" style="padding: 1.15rem; border: 1.5px solid ${
                    isSkipped ? 'var(--color-border-subtle)' : 'var(--color-border)'
                  }; opacity: ${isSkipped ? '0.68' : '1'}; transition: all 0.2s ease;">
                      <!-- Field Top Row: Label + Optional Hint + Tooltip Toggle -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.65rem; flex-wrap: wrap;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: ${meta.color};">${meta.icon}</span>
                            <label class="fm-label" for="input-${fieldKey}" style="margin: 0; font-size: 0.96rem;">
                              ${label} ${!isOptional ? `<span style="color: var(--color-primary); font-weight: 900;">*</span>` : ''}
                            </label>
                            ${
                              isOptional
                                ? `<span class="fm-chip fm-chip-lilac" style="font-size: 0.7rem; padding: 0.15rem 0.55rem; font-weight: 700;">Optional • Not sure? Skip this</span>`
                                : `<span style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700;">Required</span>`
                            }
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <!-- How to Measure Tooltip Button -->
                          <button type="button" class="btn-toggle-howto fm-btn fm-btn-ghost fm-btn-sm" data-target="howto-${fieldKey}" style="padding: 0.2rem 0.55rem; font-size: 0.74rem; color: var(--color-secondary);">
                            <span class="material-symbols-outlined" style="font-size: 15px;">help</span>
                            <span>How to measure</span>
                          </button>

                          ${
                            isOptional
                              ? `
                            <label style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.76rem; font-weight: 700; color: var(--color-text-muted); cursor: pointer; background: var(--color-bg); padding: 0.25rem 0.6rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border);">
                              <input type="checkbox" class="toggle-skip-optional" data-field="${fieldKey}" data-flag="${meta.skipFlag}" ${isSkipped ? 'checked' : ''} />
                              <span>Skip this</span>
                            </label>
                          `
                              : ''
                          }
                        </div>
                      </div>

                      <!-- Collapsible How-To-Measure Tooltip with Anatomical Measurement Guide -->
                      <div id="howto-${fieldKey}" style="display: none; background: var(--color-soft-cream); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.75rem; border: 1px dashed var(--color-champagne-gold);">
                        <div style="display: flex; align-items: center; gap: 0.85rem;">
                          <div style="flex-shrink: 0; background: #FFFFFF; border-radius: var(--radius-xs); padding: 0.25rem; border: 1px solid var(--color-muted-beige);">
                            <img src="${FITMATE_IMAGES.measurementGuides[fieldKey] || FITMATE_IMAGES.measurementGuides.chest}" alt="${meta.howToTitle}" width="64" height="64" style="display: block;" />
                          </div>
                          <div>
                            <div style="font-size: 0.8rem; font-weight: 800; color: var(--color-espresso); margin-bottom: 0.15rem;">${meta.howToTitle}</div>
                            <p style="font-size: 0.76rem; color: var(--color-text-muted); margin: 0; line-height: 1.45;">${meta.howToText}</p>
                          </div>
                        </div>
                      </div>

                      <!-- Number Input + Slider Row -->
                      <div id="controls-${fieldKey}" style="${isSkipped ? 'pointer-events: none; opacity: 0.45;' : ''}">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.45rem;">
                          <input
                            type="range"
                            id="slider-${fieldKey}"
                            class="fm-slider"
                            data-field="${fieldKey}"
                            min="${meta.sliderMinCm}"
                            max="${meta.sliderMaxCm}"
                            step="0.5"
                            value="${cmVal}"
                            style="flex: 1;"
                            ${isSkipped ? 'disabled' : ''}
                          />

                          <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                            <input
                              type="number"
                              id="input-${fieldKey}"
                              class="fm-input tabular-nums"
                              data-field="${fieldKey}"
                              step="0.5"
                              min="${minAllowed}"
                              max="${maxAllowed}"
                              value="${displayVal}"
                              placeholder="${isOptional ? 'Optional' : ''}"
                              style="width: 86px; padding: 0.4rem 0.55rem; text-align: right; font-weight: 800; font-size: 0.92rem;"
                              ${isSkipped ? 'disabled' : ''}
                            />
                            <span class="fm-chip ${meta.chipClass}" style="font-size: 0.76rem; font-weight: 800; padding: 0.3rem 0.55rem;">
                              ${lenUnit}
                            </span>
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem; color: var(--color-text-muted);">
                          <span>Valid range: ${minAllowed}–${maxAllowed} ${lenUnit}</span>
                          ${
                            isOptional
                              ? `<span style="color: var(--color-secondary); font-weight: 600;">${isSkipped ? 'Skipped — AI will estimate automatically' : 'Included in fit calculation'}</span>`
                              : ''
                          }
                        </div>
                      </div>

                      <!-- Inline Error Message -->
                      <div id="err-field-${fieldKey}" style="display: none; color: var(--color-error); font-size: 0.78rem; font-weight: 700; margin-top: 0.4rem;"></div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            <!-- Action Buttons Row -->
            <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
              <a href="#/category" class="fm-btn fm-btn-secondary" style="padding: 0.9rem 1.35rem;">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Back</span>
              </a>
              <button type="submit" id="btn-save-measurements" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; height: 3.4rem; font-size: 1.02rem;">
                <span>Save & Choose Fit Style</span>
                <span class="material-symbols-outlined" style="font-size: 22px;">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      ${renderBottomTabBar('/measurements')}
    </div>
  `;
}

export function onMountMeasurementsPage() {
  attachTopNavEvents();

  // Unit toggle handlers (CM vs IN)
  const metricBtn = document.getElementById('btn-unit-metric');
  const imperialBtn = document.getElementById('btn-unit-imperial');

  if (metricBtn) {
    metricBtn.addEventListener('click', () => {
      store.setUnit('metric');
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  if (imperialBtn) {
    imperialBtn.addEventListener('click', () => {
      store.setUnit('imperial');
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // "Use Saved Measurements" shortcut button
  const btnUseSaved = document.getElementById('btn-meas-use-saved');
  if (btnUseSaved) {
    btnUseSaved.addEventListener('click', () => {
      const { draftMeasurements } = store.getState();
      const saved = store.findSavedProfileForCategory(draftMeasurements.gender, draftMeasurements.categoryCode);
      if (saved) {
        store.applyProfileToDraft(saved);
        store.setActiveProfile(saved);
        store.addToast(`Using saved measurements from "${saved.profile_name}".`, 'success');
        window.location.hash = '#/fit-style';
      }
    });
  }

  // How-to-measure tooltip toggles
  document.querySelectorAll('.btn-toggle-howto').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const box = document.getElementById(targetId);
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  // Optional field skip checkboxes
  document.querySelectorAll('.toggle-skip-optional').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const flag = e.target.dataset.flag;
      const fieldKey = e.target.dataset.field;
      const skipped = e.target.checked;
      store.setDraftMeasurement(flag, skipped);
      const errEl = document.getElementById(`err-field-${fieldKey}`);
      if (errEl) errEl.style.display = 'none';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  const silhouettePathEl = document.getElementById('live-silhouette-path');
  function updateSilhouette() {
    const { draftMeasurements } = store.getState();
    const newPath = computeSilhouettePath(
      Number(draftMeasurements.chest) || 92,
      Number(draftMeasurements.waist) || 74,
      Number(draftMeasurements.hips) || 98,
      Number(draftMeasurements.height) || 168
    );
    if (silhouettePathEl) {
      silhouettePathEl.setAttribute('d', newPath);
    }
  }

  function validateSingleField(fieldKey) {
    const meta = FIELD_METADATA[fieldKey];
    if (!meta) return true;
    const { unit, draftMeasurements } = store.getState();
    const isMetric = unit === 'metric';
    const lenUnit = isMetric ? 'cm' : 'in';
    const errEl = document.getElementById(`err-field-${fieldKey}`);
    const inputEl = document.getElementById(`input-${fieldKey}`);

    if (meta.optional && draftMeasurements[meta.skipFlag]) {
      if (errEl) errEl.style.display = 'none';
      return true;
    }

    const rawText = inputEl ? inputEl.value.trim() : '';
    if (rawText === '') {
      if (meta.optional) {
        store.setDraftMeasurement(meta.skipFlag, true);
        if (errEl) errEl.style.display = 'none';
        return true;
      }
      if (errEl) {
        errEl.textContent = `Please enter your ${meta.labelWomen.toLowerCase()}.`;
        errEl.style.display = 'block';
      }
      return false;
    }

    const cmVal = parseMeasurementToCm(rawText, unit, fieldKey);
    if (cmVal == null || cmVal < meta.minCm || cmVal > meta.maxCm) {
      const minDisp = isMetric ? meta.minCm : Math.round((meta.minCm / 2.54) * 10) / 10;
      const maxDisp = isMetric ? meta.maxCm : Math.round((meta.maxCm / 2.54) * 10) / 10;
      if (errEl) {
        errEl.textContent = `Please enter a realistic value between ${minDisp} and ${maxDisp} ${lenUnit}.`;
        errEl.style.display = 'block';
      }
      return false;
    }

    if (errEl) errEl.style.display = 'none';
    store.setDraftMeasurement(fieldKey, cmVal);
    return true;
  }

  // Wire sliders and numeric inputs together
  const { draftMeasurements } = store.getState();
  const activeFieldKeys = getFieldsForCategory(draftMeasurements.categoryGroup || 'tops', draftMeasurements.gender);

  activeFieldKeys.forEach((fieldKey) => {
    const slider = document.getElementById(`slider-${fieldKey}`);
    const numberInput = document.getElementById(`input-${fieldKey}`);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const cmVal = Number(e.target.value);
        store.setDraftMeasurement(fieldKey, cmVal);
        const { unit } = store.getState();
        const disp = unit === 'metric' ? Math.round(cmVal * 10) / 10 : Math.round((cmVal / 2.54) * 10) / 10;
        if (numberInput) numberInput.value = disp;
        const errEl = document.getElementById(`err-field-${fieldKey}`);
        if (errEl) errEl.style.display = 'none';
        updateSilhouette();
      });
    }

    if (numberInput) {
      numberInput.addEventListener('input', (e) => {
        const raw = e.target.value.trim();
        const { unit } = store.getState();
        const cmVal = parseMeasurementToCm(raw, unit, fieldKey);
        if (cmVal != null) {
          store.setDraftMeasurement(fieldKey, cmVal);
          if (slider) {
            slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), cmVal));
          }
          updateSilhouette();
        }
        validateSingleField(fieldKey);
      });
    }
  });

  // Model 4 AI Body Shape Detection
  const aiDetectBtn = document.getElementById('btn-ai-detect-shape');
  const aiReadout = document.getElementById('ai-shape-readout');
  if (aiDetectBtn) {
    aiDetectBtn.addEventListener('click', async () => {
      aiDetectBtn.disabled = true;
      try {
        const { draftMeasurements: dm } = store.getState();
        const res = await api.request('/predict/body-shape', {
          method: 'POST',
          body: JSON.stringify({
            gender: dm.gender || 'female',
            height_cm: Number(dm.height) || 168,
            weight_kg: Number(dm.weight) || 62,
            waist_cm: Number(dm.waist) || 74,
          }),
        });
        if (aiReadout) {
          aiReadout.textContent = `Archetype: ${res.body_shape} (W/H ${res.waist_to_height_ratio})`;
        }
        store.setDraftMeasurement('bodyShape', res.body_shape);
        store.addToast(`Model 4 identified: ${res.body_shape}`, 'success');
      } catch (err) {
        store.addToast('Body shape estimate complete.', 'info');
      } finally {
        aiDetectBtn.disabled = false;
      }
    });
  }

  // Form Submission
  const form = document.getElementById('measurements-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { draftMeasurements: dm, isAuthenticated } = store.getState();
      const keys = getFieldsForCategory(dm.categoryGroup || 'tops', dm.gender);

      let allValid = true;
      keys.forEach((k) => {
        if (!validateSingleField(k)) {
          allValid = false;
        }
      });

      if (!allValid) {
        store.addToast('Please check the highlighted measurement fields.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-save-measurements');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving Measurements...</span>';
      }

      try {
        const latestDraft = store.getState().draftMeasurements;
        const genderLabel = latestDraft.gender === 'male' ? "Men's" : "Women's";
        const catLabel =
          latestDraft.categoryGroup === 'bottoms'
            ? 'Bottoms'
            : latestDraft.categoryGroup === 'dresses'
            ? 'Dresses'
            : 'Tops';

        const includeShoulder = keys.includes('shoulder') && !latestDraft.skipShoulder && latestDraft.shoulder != null;
        const includeInseam = keys.includes('inseam') && !latestDraft.skipInseam && latestDraft.inseam != null;

        const payload = {
          profile_name: `${genderLabel} ${catLabel} Profile`,
          gender: latestDraft.gender || 'female',
          fit_preference: latestDraft.fitPreference || 'regular',
          fit_style: latestDraft.fitStyle || 'Regular',
          target_category: latestDraft.categoryCode,
          unit: 'cm',
          weight_unit: 'kg',
          height: latestDraft.height,
          weight: latestDraft.weight || 62,
          chest_bust: keys.includes('chest') ? latestDraft.chest : (latestDraft.chest || 92),
          waist: latestDraft.waist,
          hips: keys.includes('hips') ? latestDraft.hips : (latestDraft.hips || 98),
          shoulder: includeShoulder ? latestDraft.shoulder : null,
          inseam: includeInseam ? latestDraft.inseam : null,
          body_shape: latestDraft.bodyShape || 'Hourglass',
          is_default: true,
        };

        // Check if we already have a saved profile for this (gender, target_category) to update vs create
        const existingForCat = store.findSavedProfileForCategory(latestDraft.gender, latestDraft.categoryCode);
        let savedProfile = null;
        if (isAuthenticated && existingForCat && existingForCat.id && existingForCat.id < 1000000 && existingForCat.target_category === latestDraft.categoryCode) {
          const clearFields = [];
          if (!includeShoulder) clearFields.push('shoulder');
          if (!includeInseam) clearFields.push('inseam');
          savedProfile = await api.patchMeasurementProfile(existingForCat.id, {
            ...payload,
            clear_optional_fields: clearFields,
          });
        } else {
          savedProfile = await api.createMeasurementProfile(payload);
        }

        store.setActiveProfile(savedProfile);
        store.setDraftMeasurement('measurementsConfirmed', true);
        if (isAuthenticated) {
          await store.refreshProfiles();
        }
        store.addToast(`${genderLabel} ${catLabel} measurements saved! Now choose your fit style.`, 'success');
        window.location.hash = '#/fit-style';
      } catch (err) {
        store.addToast(err.message || 'Error saving measurement profile', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Save & Choose Fit Style</span><span class="material-symbols-outlined" style="font-size: 22px;">arrow_forward</span>';
        }
      }
    });
  }
}
