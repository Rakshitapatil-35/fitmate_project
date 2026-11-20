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

/* ============================================================================
 * PHASE 4.2: GENDER SELECTION PAGE (#/gender)
 * ============================================================================ */
export function renderGenderPage() {
  const { draftMeasurements, profiles, activeProfile, user } = store.getState();
  const currentGender = draftMeasurements.gender === 'male' ? 'male' : 'female';
  const savedProfile = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);

  return `
    <div class="app-shell">
      ${renderTopNav('/gender')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 960px;">
        ${renderFlowStepper(1)}

        ${
          savedProfile
            ? `
          <!-- Saved Measurements Quick-Resume Banner -->
          <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.9rem;">
              <div style="width: 2.75rem; height: 2.75rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 22px;">bookmark_added</span>
              </div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-espresso); text-transform: uppercase; letter-spacing: 0.08em;">
                  Saved Measurements Available ${user?.full_name ? `• ${user.full_name}` : ''}
                </div>
                <div class="fm-serif" style="font-size: 1.2rem; font-weight: 700; color: var(--color-dark-chocolate);">
                  ${savedProfile.profile_name} (${savedProfile.gender === 'male' ? 'Men' : 'Women'} • Chest ${savedProfile.chest_bust_cm || 92} cm, Waist ${savedProfile.waist_cm || 74} cm)
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
              <button type="button" id="btn-gender-use-saved" class="fm-btn fm-btn-primary fm-btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-champagne-gold);">bolt</span>
                <span>Use Saved Measurements</span>
              </button>
              <button type="button" id="btn-gender-update-saved" class="fm-btn fm-btn-secondary fm-btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                <span>Update Measurements</span>
              </button>
            </div>
          </div>
        `
            : ''
        }

        <div style="text-align: center; margin-bottom: 2.25rem;">
          <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.6rem;">Step 1 of 4 • Department</span>
          <h1 class="fm-serif" style="font-size: clamp(2rem, 4.2vw, 2.85rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.4rem;">
            Select Your Sizing Collection
          </h1>
          <p style="font-size: 0.96rem; color: var(--color-text-muted); max-width: 540px; margin: 0 auto;">
            Choose Women or Men to calibrate our pattern grading tables, anatomical proportions, and clothing categories.
          </p>
        </div>

        <!-- Two Editorial Fashion Cards: Women & Men -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.75rem; margin-bottom: 2rem;">
          
          <!-- WOMEN SELECTION CARD -->
          <div class="gender-visual-card fm-card" data-gender="female" role="button" tabindex="0" style="cursor: pointer; padding: 1.25rem; border: 2px solid ${
            currentGender === 'female' ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
          }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="fm-img-frame" style="height: 340px; margin-bottom: 1.25rem;">
                <img
                  src="${FITMATE_IMAGES.gender.female.hero}"
                  alt="${FITMATE_IMAGES.gender.female.alt}"
                  loading="eager"
                  style="object-position: top center;"
                  onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                />
                <div style="position: absolute; top: 0.85rem; left: 0.85rem;">
                  <span class="fm-chip fm-chip-coral">Tops • Bottoms • Dresses</span>
                </div>
                ${
                  currentGender === 'female'
                    ? `<div style="position: absolute; top: 0.85rem; right: 0.85rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                    : ''
                }
              </div>

              <div style="padding: 0 0.35rem;">
                <h2 class="fm-serif" style="font-size: 1.85rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.35rem;">
                  Women
                </h2>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.55; margin-bottom: 1.25rem;">
                  Calibrated for bust, natural waist, and hip contours across Women's Tops, Bottoms, and Dresses.
                </p>
              </div>
            </div>

            <span class="fm-btn ${currentGender === 'female' ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
              <span>Select Women's Collection</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
            </span>
          </div>

          <!-- MEN SELECTION CARD -->
          <div class="gender-visual-card fm-card" data-gender="male" role="button" tabindex="0" style="cursor: pointer; padding: 1.25rem; border: 2px solid ${
            currentGender === 'male' ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
          }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="fm-img-frame" style="height: 340px; margin-bottom: 1.25rem;">
                <img
                  src="${FITMATE_IMAGES.gender.male.hero}"
                  alt="${FITMATE_IMAGES.gender.male.alt}"
                  loading="eager"
                  style="object-position: top center;"
                  onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                />
                <div style="position: absolute; top: 0.85rem; left: 0.85rem;">
                  <span class="fm-chip fm-chip-coral">Tops • Bottoms</span>
                </div>
                ${
                  currentGender === 'male'
                    ? `<div style="position: absolute; top: 0.85rem; right: 0.85rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                    : ''
                }
              </div>

              <div style="padding: 0 0.35rem;">
                <h2 class="fm-serif" style="font-size: 1.85rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.35rem;">
                  Men
                </h2>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.55; margin-bottom: 1.25rem;">
                  Calibrated for chest circumference, shoulder breadth, waist, and inseam across Men's Tops and Bottoms.
                </p>
              </div>
            </div>

            <span class="fm-btn ${currentGender === 'male' ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
              <span>Select Men's Collection</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
            </span>
          </div>

        </div>
      </main>

      ${renderBottomTabBar('/gender')}
    </div>
  `;
}

export function onMountGenderPage() {
  attachTopNavEvents();

  const btnUseSaved = document.getElementById('btn-gender-use-saved');
  const btnUpdateSaved = document.getElementById('btn-gender-update-saved');

  if (btnUseSaved) {
    btnUseSaved.addEventListener('click', () => {
      const { activeProfile, profiles } = store.getState();
      const saved = activeProfile || profiles[0];
      if (saved) {
        store.applyProfileToDraft(saved);
        store.addToast(`Loaded saved profile "${saved.profile_name}". Choose your fit style!`, 'success');
        window.location.hash = '#/fit-style';
      }
    });
  }

  if (btnUpdateSaved) {
    btnUpdateSaved.addEventListener('click', () => {
      const { activeProfile, profiles } = store.getState();
      const saved = activeProfile || profiles[0];
      if (saved) {
        store.applyProfileToDraft(saved);
        window.location.hash = '#/measurements';
      }
    });
  }

  document.querySelectorAll('.gender-visual-card').forEach((card) => {
    const handleSelect = async () => {
      const chosenGender = card.dataset.gender === 'male' ? 'male' : 'female';
      store.setGender(chosenGender);

      const { isAuthenticated, activeProfile } = store.getState();
      if (isAuthenticated && activeProfile && activeProfile.id && activeProfile.id < 1000000) {
        try {
          await api.patchMeasurementProfile(activeProfile.id, { gender: chosenGender });
        } catch {
          // non-blocking
        }
      }

      store.addToast(`${chosenGender === 'male' ? "Men's" : "Women's"} collection selected.`, 'info');
      window.location.hash = '#/category';
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/* ============================================================================
 * PHASE 4.3: CLOTHING CATEGORY SELECTION PAGE (#/category)
 * Women: Tops, Bottoms, Dresses
 * Men: Tops, Bottoms
 * ============================================================================ */
export function renderCategoryPage() {
  const { draftMeasurements } = store.getState();
  const isMale = draftMeasurements.gender === 'male';
  const currentGroup = draftMeasurements.categoryGroup || 'tops';

  const genderKey = isMale ? 'male' : 'female';
  const categories = [
    {
      group: 'tops',
      title: 'Tops',
      subtitle: isMale
        ? 'Tailored Shirts, Polos, T-Shirts, Knitwear & Overshirts'
        : 'Blouses, Poplin Shirts, Knitwear, Tees & Cropped Silhouettes',
      badge: 'Bust/Chest • Waist • Height • Shoulder (Opt)',
      img: getCategoryImage(genderKey, 'tops'),
    },
    {
      group: 'bottoms',
      title: 'Bottoms',
      subtitle: isMale
        ? 'Tailored Trousers, Straight, Loose, Baggy, Cargo, Track Pants & Shorts'
        : 'High-Waist Trousers, Wide-Leg, Straight, Cargo, Track Pants & Skinny',
      badge: 'Waist • Hips • Height • Inseam (Opt)',
      img: getCategoryImage(genderKey, 'bottoms'),
    },
  ];

  if (!isMale) {
    categories.push({
      group: 'dresses',
      title: 'Dresses',
      subtitle: 'Bodycon, A-Line, Flowing Maxi Dresses & Tailored Jumpsuits',
      badge: 'Bust • Waist • Hips • Height • Shoulder (Opt)',
      img: getCategoryImage('female', 'dresses'),
    });
  }

  return `
    <div class="app-shell">
      ${renderTopNav('/category')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 980px;">
        ${renderFlowStepper(2)}

        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
          <div>
            <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.5rem;">
              Step 2 of 4 • ${isMale ? "Men's" : "Women's"} Garment Category
            </span>
            <h1 class="fm-serif" style="font-size: clamp(1.9rem, 3.8vw, 2.65rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
              Select a Clothing Category
            </h1>
            <p style="font-size: 0.94rem; color: var(--color-text-muted);">
              Each category activates its dedicated pattern grading strategy and required body measurements.
            </p>
          </div>

          <a href="#/gender" class="fm-btn fm-btn-secondary fm-btn-sm">
            <span class="material-symbols-outlined" style="font-size: 16px;">swap_horiz</span>
            <span>Switch Department (${isMale ? 'Men' : 'Women'})</span>
          </a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(275px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          ${categories
            .map((cat) => {
              const isSelected = currentGroup === cat.group;
              return `
                <div class="category-visual-card fm-card" data-group="${cat.group}" role="button" tabindex="0" style="cursor: pointer; padding: 1.2rem; border: 2px solid ${
                isSelected ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
              }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div class="fm-img-frame" style="height: 255px; margin-bottom: 1.15rem;">
                      <img
                        src="${cat.img}"
                        alt="${isMale ? "Men's" : "Women's"} ${cat.title}"
                        loading="eager"
                        onerror="this.src='./assets/brand/fitmate-emblem.jpg'"
                      />
                      ${
                        isSelected
                          ? `<div style="position: absolute; top: 0.75rem; right: 0.75rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                          : ''
                      }
                    </div>

                    <div style="padding: 0 0.25rem;">
                      <h2 class="fm-serif" style="font-size: 1.65rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.3rem;">
                        ${cat.title}
                      </h2>
                      <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 1rem;">
                        ${cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-espresso); background: var(--color-soft-cream); border: 1px solid var(--color-border-subtle); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); margin-bottom: 1rem; text-align: center;">
                      ${cat.badge}
                    </div>

                    <span class="fm-btn ${isSelected ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
                      <span>Continue with ${cat.title}</span>
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
                    </span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div>
          <a href="#/gender" class="fm-btn fm-btn-secondary fm-btn-sm">
            <span class="material-symbols-outlined" style="font-size: 17px;">arrow_back</span>
            <span>Back to Gender Selection</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/category')}
    </div>
  `;
}

export function onMountCategoryPage() {
  attachTopNavEvents();

  document.querySelectorAll('.category-visual-card').forEach((card) => {
    const handleSelect = () => {
      const group = card.dataset.group;
      store.setCategory(group);

      const { draftMeasurements } = store.getState();
      const savedForCat = store.findSavedProfileForCategory(draftMeasurements.gender, draftMeasurements.categoryCode);
      if (savedForCat) {
        store.setDraftMeasurements({
          height: savedForCat.height_cm || draftMeasurements.height,
          weight: savedForCat.weight_kg || draftMeasurements.weight,
          chest: savedForCat.chest_bust_cm || draftMeasurements.chest,
          waist: savedForCat.waist_cm || draftMeasurements.waist,
          hips: savedForCat.hips_cm || draftMeasurements.hips,
          shoulder: savedForCat.shoulder_cm != null ? savedForCat.shoulder_cm : draftMeasurements.shoulder,
          inseam: savedForCat.inseam_cm != null ? savedForCat.inseam_cm : draftMeasurements.inseam,
        });
      }

      window.location.hash = '#/measurements';
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

export function renderOnboardingPage() {
  return renderGenderPage();
}

export function onMountOnboardingPage() {
  return onMountGenderPage();
}
