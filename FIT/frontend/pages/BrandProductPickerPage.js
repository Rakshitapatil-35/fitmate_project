/**
 * ============================================================================
 * FIT-STYLE SELECTION SCREEN (#/fit-style and #/brand-picker)
 * Authoritative Catalog:
 * - Men Tops: T-shirts, Regular, Slim, Oversized, Sweatshirts, Jackets, Kurta
 * - Women Tops: T-shirts, Regular, Slim, Oversized, Cropped, Sweatshirts, Jackets, Kurta
 * - Men & Women Bottoms: Straight, Loose, Baggy, Trousers, Cargo, Track Pants, Shorts, Skinny
 * - Women Dresses: Bodycon, A-line, Maxi, Jumpsuit
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { FITMATE_IMAGES, getFitStyleImage } from '../config/images.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';

const STYLE_CATALOG_META = {
  tops_shared: [
    {
      id: 'T-shirts',
      title: 'T-shirts',
      easeTag: 'Everyday +3–5 cm ease',
      desc: 'Classic crew-neck cotton tee cut for clean everyday movement.',
      fitPref: 'regular',
    },
    {
      id: 'Regular',
      title: 'Regular',
      easeTag: 'Balanced +3.5–5 cm ease',
      desc: 'Classic tailored drape that follows natural torso lines comfortably.',
      fitPref: 'regular',
    },
    {
      id: 'Slim',
      title: 'Slim',
      easeTag: 'Tailored +1.5–3 cm ease',
      desc: 'Close-to-body cut with a tapered waist and crisp shoulder seam placement.',
      fitPref: 'slim',
    },
    {
      id: 'Oversized',
      title: 'Oversized',
      easeTag: 'Relaxed +7–10 cm ease',
      desc: 'Dropped shoulders, generous chest room, and a modern relaxed silhouette.',
      fitPref: 'relaxed',
    },
    {
      id: 'Cropped',
      title: 'Cropped',
      easeTag: 'Contoured waist length',
      desc: 'Structured upper-torso fit terminating at or above the natural waistline.',
      fitPref: 'slim',
      womenOnly: true,
    },
    {
      id: 'Sweatshirts',
      title: 'Sweatshirts',
      easeTag: 'Relaxed fleece +5–8 cm ease',
      desc: 'Heavyweight crewneck fleece silhouette with comfortable layering room.',
      fitPref: 'relaxed',
    },
    {
      id: 'Jackets',
      title: 'Jackets',
      easeTag: 'Structured outerwear allowance',
      desc: 'Tailored outerwear cut engineered to layer cleanly over shirts and knits.',
      fitPref: 'regular',
    },
    {
      id: 'Kurta',
      title: 'Kurta',
      easeTag: 'Longline breathable ease',
      desc: 'Straight longline cotton silhouette with comfortable chest and shoulder ease.',
      fitPref: 'relaxed',
    },
  ],
  bottoms: [
    {
      id: 'Straight',
      title: 'Straight',
      easeTag: 'Classic straight leg',
      desc: 'Balanced through the hip and seat with a clean vertical leg line.',
      fitPref: 'regular',
    },
    {
      id: 'Loose',
      title: 'Loose',
      easeTag: 'Relaxed seat & thigh',
      desc: 'Unrestrictive drape from waist to hem with extra hip comfort.',
      fitPref: 'relaxed',
    },
    {
      id: 'Baggy',
      title: 'Baggy',
      easeTag: 'Wide volume +6–10 cm ease',
      desc: 'Generous volume through the seat, thigh, and full-length leg opening.',
      fitPref: 'relaxed',
    },
    {
      id: 'Trousers',
      title: 'Trousers',
      easeTag: 'Tailored smart waistband',
      desc: 'Structured pleated or flat-front dress trousers with crisp drape.',
      fitPref: 'regular',
    },
    {
      id: 'Cargo',
      title: 'Cargo',
      easeTag: 'Utility relaxed +4–7 cm ease',
      desc: 'Relaxed utility leg with side cargo pockets and comfortable thigh room.',
      fitPref: 'relaxed',
    },
    {
      id: 'Track Pants',
      title: 'Track Pants',
      easeTag: 'Stretch tapered cuff',
      desc: 'Athleisure tapered leg with elastic drawstring waist and stretch recovery.',
      fitPref: 'relaxed',
    },
    {
      id: 'Shorts',
      title: 'Shorts',
      easeTag: 'Tailored warm-weather ease',
      desc: 'Knee-grazing tailored chino shorts calibrated to waist and seat.',
      fitPref: 'regular',
    },
    {
      id: 'Skinny',
      title: 'Skinny',
      easeTag: 'Second-skin stretch fit',
      desc: 'Close contour fit from waist to ankle engineered for stretch fabrics.',
      fitPref: 'slim',
    },
  ],
  dresses: [
    {
      id: 'Bodycon',
      title: 'Bodycon',
      easeTag: 'Sculpted contour fit',
      desc: 'Figure-hugging silhouette calibrated closely to bust, waist, and hip curves.',
      fitPref: 'slim',
    },
    {
      id: 'A-line',
      title: 'A-line',
      easeTag: 'Fitted bodice, flared skirt',
      desc: 'Defines the bust and natural waist while flaring gracefully over the hips.',
      fitPref: 'regular',
    },
    {
      id: 'Maxi',
      title: 'Maxi',
      easeTag: 'Flowing full-length drape',
      desc: 'Full-length silhouette with comfortable breathing room through waist and hips.',
      fitPref: 'relaxed',
    },
    {
      id: 'Jumpsuit',
      title: 'Jumpsuit',
      easeTag: 'Tailored one-piece drape',
      desc: 'Structured bodice with defined waist and wide-leg full-length silhouette.',
      fitPref: 'regular',
    },
  ],
};

export function getFitStylesFor(gender, categoryGroup) {
  const isMale = gender === 'male';
  const group = isMale && categoryGroup === 'dresses' ? 'tops' : categoryGroup || 'tops';
  if (group === 'bottoms') return STYLE_CATALOG_META.bottoms;
  if (group === 'dresses') return STYLE_CATALOG_META.dresses;
  return STYLE_CATALOG_META.tops_shared.filter((st) => !(isMale && st.womenOnly));
}

export async function renderFitStylePage() {
  const { draftMeasurements } = store.getState();
  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup =
    isMale && draftMeasurements.categoryGroup === 'dresses'
      ? 'tops'
      : draftMeasurements.categoryGroup || 'tops';
  const styles = getFitStylesFor(draftMeasurements.gender, categoryGroup);
  const currentFitStyle = styles.some((s) => s.id === draftMeasurements.fitStyle)
    ? draftMeasurements.fitStyle
    : styles[0].id;

  const categoryLabel =
    categoryGroup === 'bottoms'
      ? `${isMale ? "Men's" : "Women's"} Bottoms`
      : categoryGroup === 'dresses'
      ? "Women's Dresses & Jumpsuits"
      : `${isMale ? "Men's" : "Women's"} Tops`;

  return `
    <div class="app-shell">
      ${renderTopNav('/fit-style')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 1060px;">
        <!-- Progress Header -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="fm-chip fm-chip-marigold">
              Step 4 of 4 • ${categoryLabel} Fit Style
            </span>
            <a href="#/measurements" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 16px;">straighten</span>
              <span>Edit Measurements</span>
            </a>
          </div>
          <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
            <div style="width: 85%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%);"></div>
          </div>
        </div>

        <!-- Title Banner -->
        <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="fm-serif" style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
              Select Your Preferred Fit Style
            </h1>
            <p style="font-size: 0.9rem; color: var(--color-text-muted);">
              Choose a garment silhouette below to compute your recommended size across Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, and AuraAtelier.
            </p>
          </div>
          <div style="background: var(--color-soft-cream); padding: 0.7rem 1.1rem; border-radius: var(--radius-sm); border: 1px solid var(--color-muted-beige); font-size: 0.8rem; color: var(--color-text-muted);">
            <div><strong style="color: var(--color-espresso);">Active Profile:</strong> ${isMale ? 'Men' : 'Women'} (${categoryLabel})</div>
            <div>Waist: <strong>${draftMeasurements.waist} cm</strong> • Height: <strong>${draftMeasurements.height} cm</strong></div>
          </div>
        </div>

        <!-- Fit Style Photographic Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
          ${styles
            .map((st) => {
              const isSelected = currentFitStyle === st.id;
              const styleImg = getFitStyleImage(draftMeasurements.gender, categoryGroup, st.id);
              return `
                <div class="fit-style-card fm-card" data-style="${st.id}" role="button" tabindex="0" style="cursor: pointer; padding: 1.1rem; border: 2px solid ${
                isSelected ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
              }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div class="fm-img-frame" style="aspect-ratio: 3 / 4; margin-bottom: 0.95rem;">
                      <img
                        src="${styleImg}"
                        alt="${isMale ? "Men's" : "Women's"} ${st.title} fit style reference"
                        loading="lazy"
                        style="object-position: top center;"
                        onerror="this.src='${FITMATE_IMAGES.brand.emblem}'"
                      />
                      <div style="position: absolute; bottom: 0.6rem; left: 0.6rem;">
                        <span class="fm-chip fm-chip-coral" style="font-size: 0.66rem;">${st.easeTag}</span>
                      </div>
                      ${
                        isSelected
                          ? `<div style="position: absolute; top: 0.6rem; right: 0.6rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 1.85rem; height: 1.85rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">check</span></div>`
                          : ''
                      }
                    </div>

                    <div style="padding: 0 0.2rem; margin-bottom: 0.85rem;">
                      <h3 class="fm-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
                        ${st.title}
                      </h3>
                      <p style="font-size: 0.82rem; color: var(--color-text-muted); line-height: 1.45;">
                        ${st.desc}
                      </p>
                    </div>
                  </div>

                  <span class="fm-btn ${isSelected ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-sm fm-btn-block" style="pointer-events: none;">
                    <span>See ${st.title} Sizes</span>
                    <span class="material-symbols-outlined" style="font-size: 17px; color: var(--color-champagne-gold);">arrow_forward</span>
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Bottom Action Bar -->
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="#/measurements" class="fm-btn fm-btn-secondary">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Measurements</span>
          </a>
          <button type="button" id="btn-run-recommendation" class="fm-btn fm-btn-primary" style="flex: 1; height: 3.35rem; font-size: 1rem;">
            <span id="run-btn-text">Get ${currentFitStyle} Size Recommendations Across All Brands</span>
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-champagne-gold);">auto_awesome</span>
          </button>
        </div>
      </main>

      ${renderBottomTabBar('/fit-style')}
    </div>
  `;
}

export async function triggerMultiBrandEvaluation(chosenStyle) {
  store.setFitStyle(chosenStyle);
  const { draftMeasurements, activeProfile } = store.getState();

  const includeShoulder = !draftMeasurements.skipShoulder && draftMeasurements.shoulder != null;
  const includeInseam = !draftMeasurements.skipInseam && draftMeasurements.inseam != null;

  const brandResults = await api.evaluateMultiBrandFitStyle({
    gender: draftMeasurements.gender || 'female',
    category: draftMeasurements.categoryCode || 'womens_tops',
    fit_style: chosenStyle,
    unit: 'cm',
    chest_bust: draftMeasurements.chest || activeProfile?.chest_bust_cm || 92,
    waist: draftMeasurements.waist || activeProfile?.waist_cm || 74,
    hips: draftMeasurements.hips || activeProfile?.hips_cm || 98,
    height: draftMeasurements.height || activeProfile?.height_cm || 168,
    weight: draftMeasurements.weight || activeProfile?.weight_kg || 62,
    shoulder: includeShoulder ? Number(draftMeasurements.shoulder) : null,
    inseam: includeInseam ? Number(draftMeasurements.inseam) : null,
  });

  store.setBrandRecommendations(brandResults);

  try {
    const topBrandProduct =
      brandResults && brandResults[0] && (brandResults[0].productId || brandResults[0].product_id)
        ? brandResults[0].productId || brandResults[0].product_id
        : 1;
    const inlineMeas = {
      chest_bust: draftMeasurements.chest || 92,
      waist: draftMeasurements.waist || 74,
      hips: draftMeasurements.hips || 98,
      height: draftMeasurements.height || 168,
      weight: draftMeasurements.weight || 62,
      unit: 'cm',
      fit_preference: draftMeasurements.fitPreference || 'regular',
    };
    if (includeShoulder) inlineMeas.shoulder = Number(draftMeasurements.shoulder);
    if (includeInseam) inlineMeas.inseam = Number(draftMeasurements.inseam);

    const rec = await api.createRecommendation({
      product_id: topBrandProduct,
      measurement_profile_id: activeProfile && activeProfile.id && activeProfile.id < 1000000 ? activeProfile.id : null,
      inline_measurements: inlineMeas,
      fit_preference_override: draftMeasurements.fitPreference || 'regular',
      fit_style: chosenStyle,
      top_n: 5,
      use_ml: true,
    });
    store.setLatestRecommendation(rec);
  } catch (err) {
    console.warn('Primary recommendation record notice:', err.message);
  }

  return brandResults;
}

export function onMountFitStylePage() {
  attachTopNavEvents();

  const runBtn = document.getElementById('btn-run-recommendation');
  const runBtnText = document.getElementById('run-btn-text');

  async function selectAndEvaluate(chosenStyle) {
    try {
      if (runBtn) runBtn.disabled = true;
      if (runBtnText) runBtnText.textContent = `Calculating ${chosenStyle} sizes across all brands...`;

      await triggerMultiBrandEvaluation(chosenStyle);
      store.addToast(`Calculated ${chosenStyle} size recommendations across all brands!`, 'success');
      window.location.hash = '#/results';
    } catch (err) {
      store.addToast(err.message || 'Error computing brand recommendations', 'error');
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  document.querySelectorAll('.fit-style-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectAndEvaluate(card.dataset.style);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectAndEvaluate(card.dataset.style);
      }
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      const { draftMeasurements } = store.getState();
      selectAndEvaluate(draftMeasurements.fitStyle || 'Regular');
    });
  }
}

export async function renderBrandProductPickerPage() {
  return renderFitStylePage();
}

export function onMountBrandProductPickerPage() {
  return onMountFitStylePage();
}
