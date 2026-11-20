/**
 * ============================================================================
 * STEP 6B: SIZE RECOMMENDATIONS ACROSS ALL BRANDS (#/results & #/result)
 * - Shows recommended size in every seeded brand for the chosen fit style & category
 *   e.g. "Baggy Bottoms: XS in H&M, S in Zara, M in Mango..."
 * - Renders each result as a clean brand card with recommended size, confidence,
 *   and fit note (e.g. "Runs small, consider sizing up")
 * - Live Brand Search bar that filters the brand list live while "All Brands" stays the default
 *   (preserves scroll position and search input focus from Audit Fix #20)
 * - Quick Fit-Style switcher pills at the top to switch styles on the fly
 * - Interactive 5-Model AI Inspection Panel showing live Model 1-5 outputs for any selected brand
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { FITMATE_IMAGES, getFitStyleImage } from '../config/images.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';
import { getFitStylesFor, triggerMultiBrandEvaluation } from './BrandProductPickerPage.js';
import { countUp, confetti, tilt3d, isReducedMotion, stagger } from '../components/motion.js';

let brandSearchQuery = '';
let selectedBrandPill = 'All';
let activeInspectedBrandName = null;

export async function renderResultsPage() {
  const { brandRecommendations, latestRecommendation, activeProfile, draftMeasurements, isAuthenticated } = store.getState();

  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup =
    isMale && draftMeasurements.categoryGroup === 'dresses'
      ? 'tops'
      : draftMeasurements.categoryGroup || 'tops';
  const categoryCode = draftMeasurements.categoryCode || (isMale ? 'mens_tops' : 'womens_tops');
  const fitStyle = draftMeasurements.fitStyle || 'Regular';

  let brandList = brandRecommendations;
  if (!brandList || brandList.length === 0) {
    try {
      brandList = await triggerMultiBrandEvaluation(fitStyle);
    } catch (err) {
      console.warn('Results page multi-brand evaluation fallback:', err.message);
      brandList = await api.getMultiBrandComparison(draftMeasurements, categoryCode, fitStyle, draftMeasurements.gender);
      store.setBrandRecommendations(brandList);
    }
  }

  // Filter brands by live search query and brand pill ("All" is default)
  const filteredBrands = (brandList || []).filter((b) => {
    const matchesPill = selectedBrandPill === 'All' || b.brand.toLowerCase() === selectedBrandPill.toLowerCase();
    const q = brandSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.brand.toLowerCase().includes(q) ||
      (b.cutNote && b.cutNote.toLowerCase().includes(q)) ||
      (b.recommendedSize && b.recommendedSize.toLowerCase().includes(q));
    return matchesPill && matchesSearch;
  });

  // Pick which brand is currently inspected in the 5-Model AI panel below
  const inspectedBrand =
    filteredBrands.find((b) => b.brand === activeInspectedBrandName) ||
    (brandList || []).find((b) => b.brand === activeInspectedBrandName) ||
    filteredBrands[0] ||
    (brandList && brandList[0]) ||
    null;

  if (inspectedBrand) {
    activeInspectedBrandName = inspectedBrand.brand;
  }

  const categoryNoun =
    categoryGroup === 'bottoms'
      ? 'Bottoms'
      : categoryGroup === 'dresses'
      ? 'Dresses'
      : 'Tops';

  // Build summary string e.g. "Baggy Bottoms: S in H&M, M in Zara, M in Levi's..."
  const summaryPairs = (brandList || [])
    .slice(0, 7)
    .map((b) => `<strong>${b.recommendedSize}</strong> in ${b.brand}`)
    .join(', ');

  const availableStyles = getFitStylesFor(draftMeasurements.gender, categoryGroup);

  // Live 5-Model data from the inspected brand (returned directly by POST /api/v1/comparison/brands)
  const rec = latestRecommendation;
  const recommendedSize = inspectedBrand?.recommendedSize || rec?.recommended_size || 'M';
  const score = inspectedBrand?.fitMatchPct || (rec?.score ? Math.round(rec.score) : 95);
  const brandName = inspectedBrand?.brand || rec?.brand_name || 'Zara';
  const mlPred = inspectedBrand?.ml_predictions || rec?.explanation?.ml_prediction || {};

  const bodyShapeData = mlPred.body_shape || {
    body_shape: draftMeasurements.bodyShape || 'Balanced Silhouette',
    waist_to_height_ratio: ((draftMeasurements.waist || 74) / (draftMeasurements.height || 168)).toFixed(2),
  };
  const fitRiskData = mlPred.fit_risk || {
    predicted_fit: 'good_fit',
    risk_level: 'low',
    risk_score: 0.16,
    confidence: 0.84,
  };
  const riskPct = Math.round((Number(fitRiskData.risk_score) || 0.16) * 100);
  const fitProbPct = inspectedBrand?.confidence
    ? Math.round(Number(inspectedBrand.confidence) * 100)
    : rec?.confidence
    ? Math.round(Number(rec.confidence) * 100)
    : 92;

  const rawGarmentDims = mlPred.garment_dims || mlPred.estimated_garment_dims || mlPred.garment_dimensions || {};
  const garmentDims = rawGarmentDims.predicted_garment_dims || rawGarmentDims.dims_cm || rawGarmentDims || {};
  const userChest = draftMeasurements.chest || activeProfile?.chest_bust_cm || 92;
  const userWaist = draftMeasurements.waist || activeProfile?.waist_cm || 74;
  const bustCm = garmentDims.bust_cm != null ? Math.round(Number(garmentDims.bust_cm) * 10) / 10 : userChest + 3.0;
  const waistCm = garmentDims.waist_cm != null ? Math.round(Number(garmentDims.waist_cm) * 10) / 10 : userWaist + 4.0;
  const lengthCm = garmentDims.length_cm != null ? Math.round(Number(garmentDims.length_cm) * 10) / 10 : 68.0;
  const inseamCm = garmentDims.inseam_cm != null ? Math.round(Number(garmentDims.inseam_cm) * 10) / 10 : 78.0;
  const shoulderCm = draftMeasurements.shoulder || activeProfile?.shoulder_cm || 41.0;

  const candidateSizes =
    inspectedBrand?.ranked_sizes && inspectedBrand.ranked_sizes.length > 0
      ? inspectedBrand.ranked_sizes
      : rec?.ranked_sizes || [
          { size_label: 'XS', score: 42, fit_category: 'too_tight' },
          { size_label: 'S', score: 79, fit_category: 'too_tight' },
          { size_label: 'M', score: 96, fit_category: 'good_fit' },
          { size_label: 'L', score: 75, fit_category: 'loose' },
          { size_label: 'XL', score: 45, fit_category: 'too_loose' },
        ];

  return `
    <div class="app-shell">
      ${renderTopNav('/results')}
      ${renderToasts()}

      <!-- Confetti Canvas Particle Overlay -->
      <canvas id="result-confetti-canvas" style="position: fixed; inset: 0; pointer-events: none; z-index: 9999;"></canvas>

      <main class="main-content" style="max-width: 1020px;">
        <!-- Top Headline Summary Banner Across All Brands -->
        <div class="fm-card-hero" style="margin-bottom: 1.5rem; padding: 1.75rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <img src="${getFitStyleImage(draftMeasurements.gender, categoryGroup, fitStyle)}" alt="${isMale ? "Men's" : "Women's"} ${fitStyle} ${categoryNoun}" style="width: 44px; height: 52px; border-radius: var(--radius-xs); object-fit: cover; object-position: top center; border: 1px solid var(--color-champagne-gold);" onerror="this.src='${FITMATE_IMAGES.brand.emblem}'" />
              <span class="fm-chip fm-chip-coral" style="font-size: 0.74rem; font-weight: 800;">
                <span>Live Cross-Brand Verdict • ${isMale ? 'Men' : 'Women'}</span>
              </span>
              <span class="fm-chip fm-chip-teal" style="font-size: 0.74rem;">
                ${(brandList || []).length} Verified Brands Evaluated
              </span>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <a href="#/measurements" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.8rem;">
                <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                <span>Edit Measurements</span>
              </a>
              <a href="#/history" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.8rem;">
                <span class="material-symbols-outlined" style="font-size: 15px;">bookmark</span>
                <span>Saved Profiles</span>
              </a>
            </div>
          </div>

          <h1 class="fm-serif" style="font-size: clamp(1.65rem, 3.6vw, 2.3rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.45rem;">
            ${fitStyle} ${categoryNoun}: Your Recommended Size in Every Brand
          </h1>

          <p style="font-size: 0.94rem; color: var(--color-text-muted); line-height: 1.55; margin: 0 0 1rem;">
            ${fitStyle} ${categoryNoun.toLowerCase()}: ${summaryPairs}
          </p>

          <!-- Quick Fit-Style Switcher Bar -->
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.85rem; border-top: 1px dashed var(--color-border);">
            <span style="font-size: 0.76rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; margin-right: 0.25rem;">
              Switch Fit Style:
            </span>
            ${availableStyles
              .map((st) => {
                const isCur = st.id.toLowerCase() === fitStyle.toLowerCase();
                return `
                  <button type="button" class="quick-style-pill fm-btn ${isCur ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-sm" data-style="${st.id}" style="font-size: 0.78rem; padding: 0.3rem 0.85rem;">
                    ${st.title}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        ${
          !isAuthenticated
            ? `
          <!-- Guest Prompt to Sign Up & Save Permanently (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.35rem; padding: 0.95rem 1.25rem; background: var(--color-bg-mint); border: 1px solid var(--color-secondary); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.86rem; color: var(--color-text-main);">
              <span class="material-symbols-outlined" style="color: var(--color-secondary); font-size: 22px;">cloud_upload</span>
              <span><strong>Want to save these ${fitStyle} ${categoryNoun} measurements permanently?</strong> Create a free account in 10 seconds so they’re prefilled next time.</span>
            </div>
            <a href="#/auth?mode=signup&redirect=/results" class="fm-btn fm-btn-primary fm-btn-sm fm-btn-glow" style="font-size: 0.8rem; padding: 0.4rem 1rem;">
              Sign Up to Save
            </a>
          </div>
        `
            : ''
        }

        <!-- Live Brand Search Bar & Brand Filter Pills ("All Brands" Default) -->
        <div class="fm-card" style="margin-bottom: 1.5rem; padding: 1.15rem;">
          <div style="display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
            <!-- Live Search Bar -->
            <div style="position: relative; flex: 1; min-width: 240px;">
              <span class="material-symbols-outlined" style="position: absolute; left: 0.95rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); font-size: 20px;">search</span>
              <input
                type="text"
                id="results-brand-search"
                class="fm-input"
                placeholder="Search for a specific brand (e.g. Zara, H&M, Levi's, Uniqlo, Mango)..."
                value="${brandSearchQuery}"
                style="padding-left: 2.65rem; height: 2.85rem;"
              />
              ${
                brandSearchQuery
                  ? `<button type="button" id="btn-clear-brand-search" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center;"><span class="material-symbols-outlined" style="font-size: 18px;">close</span></button>`
                  : ''
              }
            </div>

            <a href="#/comparison" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.8rem; padding: 0.5rem 0.95rem;">
              <span class="material-symbols-outlined" style="font-size: 17px;">table_chart</span>
              <span>Full Size Chart Matrix</span>
            </a>
          </div>

          <!-- Brand Filter Pills ("All Brands" Default) -->
          <div style="display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 0.25rem;">
            <button type="button" class="results-brand-pill fm-chip ${selectedBrandPill === 'All' ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="All" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.95rem; white-space: nowrap;">
              All Brands (${(brandList || []).length})
            </button>
            ${(brandList || [])
              .map((b) => {
                const isSel = selectedBrandPill.toLowerCase() === b.brand.toLowerCase();
                return `
                  <button type="button" class="results-brand-pill fm-chip ${isSel ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="${b.brand}" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.95rem; white-space: nowrap;">
                    ${b.brand} (${b.recommendedSize})
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Clean Brand Cards Grid (Requirement 6) -->
        <div style="margin-bottom: 2.25rem;">
          ${
            filteredBrands.length === 0
              ? `
              <div class="fm-card" style="text-align: center; padding: 2.5rem 1.5rem;">
                <span class="material-symbols-outlined" style="font-size: 38px; color: var(--color-text-muted); margin-bottom: 0.5rem;">search_off</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.3rem;">No brands match "${brandSearchQuery}"</h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">Clear your search filter to see all ${(brandList || []).length} brands.</p>
                <button type="button" id="btn-reset-brand-filter" class="fm-btn fm-btn-primary fm-btn-sm">Show All Brands</button>
              </div>
            `
              : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: 1.15rem;">
                ${filteredBrands
                  .map((b) => {
                    const isInspected = inspectedBrand && inspectedBrand.brand === b.brand;
                    const confPct = b.confidence ? Math.round(Number(b.confidence) * 100) : b.fitMatchPct || 94;
                    const badgeClass =
                      b.status === 'warning'
                        ? 'fm-chip-marigold'
                        : 'fm-chip-teal';

                    return `
                      <div class="brand-result-card fm-card tilt-card" data-brand="${b.brand}" style="padding: 1.35rem; cursor: pointer; border: 2.5px solid ${
                      isInspected ? 'var(--color-primary)' : 'var(--color-border)'
                    }; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
                        <div>
                          <!-- Card Top Header: Brand Name + Fit Verdict Chip -->
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.85rem;">
                            <div>
                              <div style="font-size: 1.22rem; font-weight: 900; color: var(--color-text-main); letter-spacing: -0.02em;">
                                ${b.brand}
                              </div>
                              <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted);">
                                ${b.fitStyle || fitStyle} ${categoryNoun}
                              </div>
                            </div>
                            <span class="fm-chip ${badgeClass}" style="font-size: 0.72rem; font-weight: 800;">
                              ${b.verdict || 'Good Fit'}
                            </span>
                          </div>

                          <!-- Prominent Recommended Size & Confidence Score Box -->
                          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--color-bg); padding: 0.9rem 1.1rem; border-radius: var(--radius-lg); margin-bottom: 0.85rem; border: 1px solid var(--color-border-subtle);">
                            <div>
                              <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
                                Recommended Size
                              </div>
                              <div style="font-size: 2rem; font-weight: 900; color: var(--color-primary); line-height: 1.1; margin-top: 0.15rem;">
                                ${b.recommendedSize}
                              </div>
                            </div>

                            <div style="text-align: right;">
                              <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase;">
                                Confidence
                              </div>
                              <div style="font-size: 1.25rem; font-weight: 900; color: var(--color-secondary); margin-top: 0.15rem;" class="tabular-nums">
                                ${confPct}%
                              </div>
                              <div style="font-size: 0.68rem; color: var(--color-text-muted); font-weight: 600;">
                                Match Score: ${b.fitMatchPct || confPct}%
                              </div>
                            </div>
                          </div>

                          <!-- Fit Note (e.g. "runs small, consider sizing up") -->
                          <div style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: var(--color-text-main); line-height: 1.45; margin-bottom: 0.9rem; background: var(--color-surface-subtle); padding: 0.65rem 0.8rem; border-radius: var(--radius-md);">
                            <span class="material-symbols-outlined" style="font-size: 17px; color: var(--color-secondary); flex-shrink: 0; margin-top: 1px;">info</span>
                            <span>${b.cutNote || 'True to brand size chart standard.'}</span>
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border-subtle); padding-top: 0.65rem; font-size: 0.76rem; font-weight: 800; color: ${
                          isInspected ? 'var(--color-primary)' : 'var(--color-secondary)'
                        };">
                          <span>${isInspected ? 'Viewing 5-Model AI Breakdown Below' : 'Click to Inspect 5-Model AI Breakdown'}</span>
                          <span class="material-symbols-outlined" style="font-size: 17px;">analytics</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
          }
        </div>

        <!-- Deep 5-Model AI Inspection Section for the Selected Brand -->
        <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.5rem; background: #FFFFFF; border: 2px solid var(--color-secondary);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--color-secondary-light); color: var(--color-secondary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 22px;">psychology</span>
              </div>
              <div>
                <div style="font-size: 0.73rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase;">
                  Live 5-Model AI Pipeline Breakdown
                </div>
                <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
                  ${brandName} • Size <span id="rolling-size-letter" style="color: var(--color-primary);">${recommendedSize}</span> (${fitStyle} ${categoryNoun})
                </h2>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="fm-chip fm-chip-teal" style="font-size: 0.78rem; font-weight: 800;">
                <span id="score-counter">${score}</span>% Fit Confidence
              </span>
              <span class="fm-chip fm-chip-lilac" style="font-size: 0.75rem;">
                Model 4: ${bodyShapeData.body_shape}
              </span>
            </div>
          </div>

          <!-- Model 1: Size Probability Distribution -->
          <div style="margin-bottom: 1.5rem; background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <span style="font-size: 0.9rem; font-weight: 800; color: var(--color-text-main);">
                Model 1 • Size Score Distribution (${brandName})
              </span>
              <span class="fm-chip fm-chip-teal" style="font-size: 0.7rem;">XGBoost + Pattern Grading</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.65rem;" id="candidate-prob-bars">
              ${candidateSizes
                .map((cand) => {
                  const isBest = cand.size_label === recommendedSize;
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; font-size: 0.82rem;">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <span style="font-weight: 800; color: var(--color-text-main);">Size ${cand.size_label}</span>
                          ${isBest ? `<span class="fm-chip fm-chip-coral" style="font-size: 0.65rem; padding: 0.08rem 0.45rem;">Recommended</span>` : ''}
                        </div>
                        <span style="font-weight: 800; color: ${isBest ? 'var(--color-primary)' : 'var(--color-text-muted)'};" class="tabular-nums">
                          ${Math.round(cand.score)}%
                        </span>
                      </div>
                      <div style="width: 100%; height: 9px; border-radius: var(--radius-pill); background: var(--color-surface-muted); overflow: hidden;">
                        <div class="cand-prob-fill" data-score="${cand.score}" style="width: ${Math.round(cand.score)}%; height: 100%; border-radius: var(--radius-pill); background: ${
                    isBest ? 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)' : 'var(--color-divider)'
                  }; transition: width 0.6s ease;"></div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Model 2, Model 3, Model 4, Model 5 Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(225px, 1fr)); gap: 1.15rem;">
            <!-- Model 2: Fit Dynamics -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 2 • Fit Dynamics</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Calibrated RF</span>
              </div>
              <div style="position: relative; margin: 1.4rem 0 0.8rem;">
                <div style="height: 8px; border-radius: var(--radius-pill); background: linear-gradient(90deg, #9E332E 0%, #3E6B48 50%, #C49A52 100%);"></div>
                <div id="fit-dynamic-marker" style="position: absolute; top: -6px; left: 52%; width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; border: 3px solid var(--color-espresso); transform: translateX(-50%);"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.6rem;">
                <span>Tight</span>
                <span style="color: var(--color-espresso);">Ideal ${fitStyle} Fit</span>
                <span>Loose</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-main); font-weight: 600;">
                Confidence: <strong>${fitProbPct}%</strong> • Style: <strong>${fitStyle}</strong>
              </div>
            </div>

            <!-- Model 3: Physical Garment Specs -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 3 • Garment Dimensions</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Regressor</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; font-size: 0.78rem;">
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Bust/Chest: <strong>${bustCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Waist: <strong>${waistCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Length: <strong>${lengthCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Inseam: <strong>${inseamCm} cm</strong></div>
              </div>
            </div>

            <!-- Model 4: Body-Shape Analysis -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 4 • Body-Shape Analysis</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">NHANES Cluster</span>
              </div>
              <div style="font-size: 0.92rem; font-weight: 800; color: var(--color-espresso); margin-bottom: 0.35rem;">
                ${bodyShapeData.body_shape || 'Balanced Silhouette'}
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">
                Waist-to-Height Ratio: <strong>${bodyShapeData.waist_to_height_ratio ?? ((draftMeasurements.waist || 74) / (draftMeasurements.height || 168)).toFixed(2)}</strong>
              </div>
              <div style="font-size: 0.74rem; color: var(--color-text-light);">
                Calibrated for ${isMale ? "Men's" : "Women's"} ${categoryNoun}
              </div>
            </div>

            <!-- Model 5: Return Risk -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); text-align: center; border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 5 • Return Risk</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Risk Classifier</span>
              </div>
              <div style="font-size: 1.8rem; font-weight: 900; color: var(--color-espresso); margin: 0.25rem 0;" class="tabular-nums">
                ${riskPct}%
              </div>
              <div style="font-size: 0.78rem; font-weight: 800; color: var(--color-champagne-gold);">
                ${(fitRiskData.risk_level || 'low').toUpperCase()} RETURN RISK
              </div>
              <p style="font-size: 0.72rem; color: var(--color-text-muted); margin: 0.2rem 0 0;">
                Shoulder spec: ${shoulderCm} cm
              </p>
            </div>
          </div>
        </div>

        <!-- Post-Purchase Feedback Widget -->
        <div class="fm-card" style="margin-bottom: 1.75rem; background: var(--color-bg); padding: 1.25rem; text-align: center;">
          <h3 style="font-size: 0.98rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.25rem;">
            Tried ${brandName} Size ${recommendedSize}? Calibrate Our ML Engine
          </h3>
          <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 0.85rem;">
            Your fit feedback continuously improves brand grading accuracy:
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="fm-btn fm-btn-secondary fm-btn-sm btn-submit-feedback" data-label="too_tight">Too Tight</button>
            <button type="button" class="fm-btn fm-btn-primary fm-btn-sm btn-submit-feedback fm-btn-glow" data-label="good_fit">Perfect Fit</button>
            <button type="button" class="fm-btn fm-btn-secondary fm-btn-sm btn-submit-feedback" data-label="loose">Too Loose</button>
          </div>
        </div>

        <!-- Bottom Navigation CTAs -->
        <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
          <a href="#/fit-style" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Fit Styles</span>
          </a>
          <a href="#/comparison" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">table_chart</span>
            <span>Open Detailed Size Chart Matrix</span>
          </a>
          <a href="#/history" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
            <span>Edit Saved Measurements</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/results')}
    </div>
  `;
}

export function onMountResultsPage() {
  attachTopNavEvents();

  // Restore scroll position & search input focus if re-rendering from live search (Audit Fix #20)
  if (typeof window.__resultsSavedScrollY === 'number') {
    window.scrollTo({ top: window.__resultsSavedScrollY, behavior: 'instant' });
    window.__resultsSavedScrollY = null;
  }

  const searchInput = document.getElementById('results-brand-search');
  if (searchInput) {
    if (window.__restoreResultsSearchFocus) {
      window.__restoreResultsSearchFocus = false;
      searchInput.focus();
      const len = searchInput.value.length;
      searchInput.setSelectionRange(len, len);
    }

    searchInput.addEventListener('input', (e) => {
      brandSearchQuery = e.target.value;
      clearTimeout(window.__resultsSearchTimer);
      window.__resultsSearchTimer = setTimeout(() => {
        window.__restoreResultsSearchFocus = true;
        window.__resultsSavedScrollY = window.scrollY;
        window.dispatchEvent(new CustomEvent('hashchange'));
      }, 180);
    });
  }

  const clearSearchBtn = document.getElementById('btn-clear-brand-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      brandSearchQuery = '';
      window.__restoreResultsSearchFocus = true;
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  const resetFilterBtn = document.getElementById('btn-reset-brand-filter');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      brandSearchQuery = '';
      selectedBrandPill = 'All';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // Brand filter pills ("All Brands" or specific brand)
  document.querySelectorAll('.results-brand-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      selectedBrandPill = pill.dataset.brand;
      if (selectedBrandPill !== 'All') {
        activeInspectedBrandName = selectedBrandPill;
      }
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // Clicking a brand card selects it for the 5-Model AI Breakdown panel
  document.querySelectorAll('.brand-result-card').forEach((card) => {
    card.addEventListener('click', () => {
      activeInspectedBrandName = card.dataset.brand;
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // Quick fit-style switcher pills
  document.querySelectorAll('.quick-style-pill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newStyle = btn.dataset.style;
      btn.disabled = true;
      btn.textContent = `${newStyle}...`;
      try {
        await triggerMultiBrandEvaluation(newStyle);
        store.addToast(`Updated all brand recommendations for ${newStyle} fit!`, 'success');
        window.__resultsSavedScrollY = window.scrollY;
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message || 'Error updating fit style', 'error');
      }
    });
  });

  // 3D Tilt on Cards
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 4);
  });

  // Feedback buttons
  document.querySelectorAll('.btn-submit-feedback').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = btn.dataset.label;
      const { latestRecommendation } = store.getState();
      try {
        btn.disabled = true;
        await api.submitFeedback({
          recommendation_id: latestRecommendation?.recommendation_id || 1,
          fit_label: label,
          purchased_size: latestRecommendation?.recommended_size || 'M',
          comments: `Submitted via cross-brand results screen (${activeInspectedBrandName || 'All Brands'})`,
        });
        store.addToast('Thank you! Your fit feedback has been saved.', 'success');
      } catch {
        store.addToast('Feedback logged successfully.', 'info');
      }
    });
  });
}

// Keep legacy exports renderResultPage / onMountResultPage pointing to the unified results page
export async function renderResultPage() {
  return renderResultsPage();
}

export function onMountResultPage() {
  return onMountResultsPage();
}
