/**
 * ============================================================================
 * PART 2: SIZE COMPARISON TABLE SCREEN (Dynamic Matrix & FLIP Transitions)
 * - Interactive size matrix (XS-XXL) with row/column crosshair highlight
 * - Recommended size cell pulsing softly with warm glow
 * - Brand filter chips with FLIP animations
 * - Sortable brand equivalency records
 * - cm / in unit toggle
 * ============================================================================
 */

import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { renderTopNav, attachTopNavEvents } from '../components/TopNav.js';
import { renderBottomTabBar } from '../components/BottomTabBar.js';
import { renderToasts } from '../components/Toast.js';
import { flip, tilt3d } from '../components/motion.js';

let tableUnit = 'cm'; // 'cm' or 'in'
let selectedBrandFilter = 'All';
let sortDirection = 'desc'; // 'desc' or 'asc'

const ALL_MULTI_BRANDS = [
  { id: 1, brand: 'NordicThread', category: 'Scandinavian Fitted Shirts', recommendedSize: 'M', cutNote: 'True to NordicThread tailoring standard', fitMatchPct: 98 },
  { id: 2, brand: 'Zara', category: 'Poplin / Fitted Tops', recommendedSize: 'M', cutNote: 'Runs slightly narrow in shoulders (-1.5 cm)', fitMatchPct: 96 },
  { id: 3, brand: 'H&M', category: 'Everyday Relaxed Shirts', recommendedSize: 'S', cutNote: 'Standard relaxed EU cut with +4 cm natural chest ease', fitMatchPct: 94 },
  { id: 4, brand: "Levi's", category: 'Denim & Casual Tops', recommendedSize: 'M', cutNote: 'Boxy athletic fit, true to size', fitMatchPct: 95 },
  { id: 5, brand: 'Uniqlo', category: 'Oxford Cotton Button-Downs', recommendedSize: 'M', cutNote: 'Generous armhole ease and straight drape', fitMatchPct: 97 },
  { id: 6, brand: 'Mango', category: 'Tailored Linen Tops', recommendedSize: 'M', cutNote: 'Slightly tapered waist contour', fitMatchPct: 93 },
];

export async function renderComparisonTablePage() {
  const { activeProfile, draftMeasurements, latestRecommendation, brandRecommendations } = store.getState();

  const userChest = draftMeasurements.chest || activeProfile?.chest_bust_cm || 92;
  const userWaist = draftMeasurements.waist || activeProfile?.waist_cm || 74;
  const userHips = draftMeasurements.hips || activeProfile?.hips_cm || 98;
  const recSize = (brandRecommendations && brandRecommendations[0]?.recommendedSize) || latestRecommendation?.recommended_size || 'M';
  const productId = latestRecommendation?.product_id || 1;
  const categoryCode = draftMeasurements.categoryCode || latestRecommendation?.category_code || 'womens_tops';
  const fitStyle = draftMeasurements.fitStyle || 'Regular';

  let safeMatrix = null;
  try {
    safeMatrix = await api.getComparisonMatrix(productId, {
      chest_bust_cm: userChest,
      waist_cm: userWaist,
      hips_cm: userHips,
    });
    if (safeMatrix && safeMatrix.length > 0) {
      safeMatrix = safeMatrix.map((row) => ({
        ...row,
        status: row.size === recSize ? 'recommended' : (row.status === 'recommended' ? 'good' : row.status),
      }));
    }
  } catch (err) {
    console.warn('Comparison matrix notice:', err.message);
  }

  if (!safeMatrix || safeMatrix.length === 0) {
    safeMatrix = [
      { size: 'XS', chestCm: '88–92', waistCm: '70–74', chestIn: '34.6–36.2', waistIn: '27.6–29.1', verdict: 'Tight (-4cm)', badgeClass: 'fm-chip-coral', status: recSize === 'XS' ? 'recommended' : 'tight' },
      { size: 'S', chestCm: '94–98', waistCm: '76–80', chestIn: '37.0–38.6', waistIn: '29.9–31.5', verdict: 'Good Fit', badgeClass: 'fm-chip-teal', status: recSize === 'S' ? 'recommended' : 'good' },
      { size: 'M', chestCm: '100–104', waistCm: '82–86', chestIn: '39.4–40.9', waistIn: '32.3–33.9', verdict: 'Recommended (+4cm)', badgeClass: 'fm-chip-coral', status: recSize === 'M' ? 'recommended' : 'good' },
      { size: 'L', chestCm: '106–110', waistCm: '88–92', chestIn: '41.7–43.3', waistIn: '34.6–36.2', verdict: 'Loose (+8cm)', badgeClass: 'fm-chip-marigold', status: recSize === 'L' ? 'recommended' : 'loose' },
      { size: 'XL', chestCm: '112–116', waistCm: '94–98', chestIn: '44.1–45.7', waistIn: '37.0–38.6', verdict: 'Loose (+14cm)', badgeClass: 'fm-chip-marigold', status: recSize === 'XL' ? 'recommended' : 'loose' },
    ];
  }

  let liveMultiBrands = ALL_MULTI_BRANDS;
  if (brandRecommendations && brandRecommendations.length > 0) {
    liveMultiBrands = brandRecommendations.map((b, idx) => ({ id: idx + 1, ...b }));
  } else {
    try {
      const apiBrands = await api.getMultiBrandComparison(
        {
          gender: draftMeasurements.gender || 'female',
          fit_style: fitStyle,
          chest_bust_cm: userChest,
          waist_cm: userWaist,
          hips_cm: userHips,
          height_cm: draftMeasurements.height || 168,
        },
        categoryCode,
        fitStyle,
        draftMeasurements.gender || 'female'
      );
      if (apiBrands && apiBrands.length > 0) {
        liveMultiBrands = apiBrands.map((b, idx) => ({ id: idx + 1, ...b }));
        store.setBrandRecommendations(apiBrands);
      }
    } catch {
      // keep default list
    }
  }

  const isCm = tableUnit === 'cm';

  let filteredBrands = liveMultiBrands.filter(
    (b) => selectedBrandFilter === 'All' || b.brand.toLowerCase() === selectedBrandFilter.toLowerCase()
  );

  filteredBrands.sort((a, b) => {
    return sortDirection === 'desc' ? b.fitMatchPct - a.fitMatchPct : a.fitMatchPct - b.fitMatchPct;
  });

  return `
    <div class="app-shell">
      ${renderTopNav('/comparison')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 860px;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="background: var(--color-secondary-light); color: var(--color-secondary); border-radius: 50%; width: 1.75rem; height: 1.75rem; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 18px;">table_chart</span>
              </span>
              <span style="font-size: 0.8rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Fit Matrix Analysis</span>
            </div>
            <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">
              Size vs. Body Metric Matrix
            </h1>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">
              Hover across cells for crosshair inspection against verified brand tailoring specs.
            </p>
          </div>

          <!-- CM / IN Toggle Pill -->
          <div style="display: flex; background: var(--color-bg); padding: 0.25rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border); flex-shrink: 0;">
            <button id="toggle-table-cm" type="button" class="fm-btn ${isCm ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">
              CM
            </button>
            <button id="toggle-table-in" type="button" class="fm-btn ${!isCm ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">
              IN
            </button>
          </div>
        </div>

        <!-- User Measurements Ribbon Card -->
        <div class="fm-card tilt-card" style="margin-bottom: 1.5rem; background: var(--color-bg); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
              <span class="material-symbols-outlined" style="font-size: 18px;">straighten</span>
              <span>Your Silhouette Measurements</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--color-text-muted); font-weight: 600;">Active Twin Profile</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Chest / Bust</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userChest} cm` : `${Math.round((userChest / 2.54) * 10) / 10} in`}
              </div>
            </div>

            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Natural Waist</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userWaist} cm` : `${Math.round((userWaist / 2.54) * 10) / 10} in`}
              </div>
            </div>

            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Hips & Seat</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userHips} cm` : `${Math.round((userHips / 2.54) * 10) / 10} in`}
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Comparison Table with Hover Matrix Highlights -->
        <div class="fm-card tilt-card" style="margin-bottom: 2rem; padding: 0; overflow: hidden;">
          <div style="background: var(--color-bg); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">swap_horiz</span>
              <span style="font-weight: 800; font-size: 0.95rem; color: var(--color-text-main);">Size Chart vs Body Geometry</span>
            </div>
            <span class="fm-chip fm-chip-teal" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">Hover Crosshair Active</span>
          </div>

          <div style="overflow-x: auto;">
            <table id="matrix-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
              <thead>
                <tr style="background: #FFF9F2; color: var(--color-text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--color-border);">
                  <th style="padding: 0.85rem 1.25rem; font-weight: 700;">Size</th>
                  <th style="padding: 0.85rem 1rem; font-weight: 700;">Garment Chest</th>
                  <th style="padding: 0.85rem 1rem; font-weight: 700;">Garment Waist</th>
                  <th style="padding: 0.85rem 1.25rem; font-weight: 700; text-align: right;">Verdict</th>
                </tr>
              </thead>
              <tbody>
                ${safeMatrix
                  .map((row) => {
                    const chestDisplay = isCm ? `${row.chestCm} cm` : `${row.chestIn} in`;
                    const waistDisplay = isCm ? `${row.waistCm} cm` : `${row.waistIn} in`;
                    const isRec = row.status === 'recommended';

                    return `
                      <tr class="matrix-row ${isRec ? 'is-recommended fm-pulse-rec' : ''}" style="border-bottom: 1px solid var(--color-border-subtle); background: ${isRec ? 'rgba(255, 107, 107, 0.06)' : 'transparent'}; transition: background 0.15s ease;">
                        <td class="matrix-cell" data-col="0" style="padding: 0.95rem 1.25rem; font-weight: 800; color: var(--color-text-main);">
                          ${row.size}
                          ${
                            isRec
                              ? `<span class="fm-chip fm-chip-coral" style="margin-left: 0.4rem; font-size: 0.68rem; padding: 0.1rem 0.45rem;">Best Match</span>`
                              : ''
                          }
                        </td>
                        <td class="matrix-cell" data-col="1" style="padding: 0.95rem 1rem; color: var(--color-text-main); font-variant-numeric: tabular-nums;">
                          ${chestDisplay}
                        </td>
                        <td class="matrix-cell" data-col="2" style="padding: 0.95rem 1rem; color: var(--color-text-main); font-variant-numeric: tabular-nums;">
                          ${waistDisplay}
                        </td>
                        <td class="matrix-cell" data-col="3" style="padding: 0.95rem 1.25rem; text-align: right;">
                          <span class="fm-chip ${row.badgeClass || 'fm-chip-teal'}" style="font-size: 0.78rem;">
                            ${row.verdict}
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cross-Brand Size Equivalency with FLIP Filter Chips -->
        <div class="fm-card tilt-card" style="margin-bottom: 2rem; padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">compare</span>
              <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
                Cross-Brand Size Equivalency
              </h3>
            </div>
            <!-- Sort Toggle Button -->
            <button type="button" id="btn-sort-brands" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.75rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">swap_vert</span>
              <span>Sort by Match % (${sortDirection.toUpperCase()})</span>
            </button>
          </div>

          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">
            Click brand chips to filter with fluid FLIP animations:
          </p>

          <!-- FLIP Brand Filter Chips -->
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;" id="brand-filter-chips">
            ${['All', 'Zara', 'NordicThread', 'H&M', "Levi's", 'Uniqlo', 'Mango']
              .map((b) => {
                const isSel = selectedBrandFilter.toLowerCase() === b.toLowerCase();
                return `
                  <button type="button" class="brand-filter-btn fm-chip ${isSel ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="${b}" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.9rem;">
                    ${b}
                  </button>
                `;
              })
              .join('')}
          </div>

          <!-- Animated Brand Cards Container -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;" id="multi-brand-container">
            ${filteredBrands
              .map((b) => {
                return `
                  <div class="multi-brand-row" data-id="${b.id}" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 0.85rem 1.15rem; background: var(--color-bg); border-radius: var(--radius-md); gap: 0.5rem; border: 1px solid var(--color-border); transition: transform 0.2s ease, box-shadow 0.2s ease;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.98rem; color: var(--color-text-main);">${b.brand}</div>
                      <div style="font-size: 0.78rem; color: var(--color-text-muted);">${b.cutNote}</div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <span class="fm-chip fm-chip-teal" style="font-size: 0.88rem; font-weight: 800; padding: 0.35rem 0.85rem;">
                        Size ${b.recommendedSize}
                      </span>
                      <span class="fm-chip fm-chip-coral" style="font-size: 0.78rem; font-weight: 800;">
                        ${b.fitMatchPct}% Match
                      </span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Navigation Actions -->
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="#/results" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Brand Recommendations</span>
          </a>
          <a href="#/history" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">bookmark</span>
            <span>View Saved Vault History</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/comparison')}
    </div>
  `;
}

export function onMountComparisonTablePage() {
  attachTopNavEvents();

  // 1. Matrix row & column hover crosshair highlight
  const table = document.getElementById('matrix-table');
  if (table) {
    table.querySelectorAll('.matrix-cell').forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        const colIdx = cell.dataset.col;
        const row = cell.closest('tr');
        if (row && !row.classList.contains('is-recommended')) {
          row.style.background = 'rgba(34, 166, 153, 0.08)';
        }
        table.querySelectorAll(`.matrix-cell[data-col="${colIdx}"]`).forEach((c) => {
          c.style.background = 'rgba(34, 166, 153, 0.04)';
        });
      });

      cell.addEventListener('mouseleave', () => {
        const colIdx = cell.dataset.col;
        const row = cell.closest('tr');
        if (row && !row.classList.contains('is-recommended')) {
          row.style.background = 'transparent';
        }
        table.querySelectorAll(`.matrix-cell[data-col="${colIdx}"]`).forEach((c) => {
          c.style.background = 'transparent';
        });
      });
    });
  }

  // 2. FLIP Brand Filter Chips
  const container = document.getElementById('multi-brand-container');
  document.querySelectorAll('.brand-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.brand;
      selectedBrandFilter = b;

      document.querySelectorAll('.brand-filter-btn').forEach((chip) => {
        chip.className = 'brand-filter-btn fm-chip ' + (chip.dataset.brand === b ? 'fm-chip-coral' : 'fm-chip-lilac');
      });

      if (container) {
        flip(container, () => {
          const rows = container.querySelectorAll('.multi-brand-row');
          rows.forEach((r) => {
            const brandName = r.querySelector('div')?.firstElementChild?.textContent || '';
            if (b === 'All' || brandName.toLowerCase() === b.toLowerCase()) {
              r.style.display = 'flex';
            } else {
              r.style.display = 'none';
            }
          });
        });
      }
    });
  });

  // 3. Sort button
  const sortBtn = document.getElementById('btn-sort-brands');
  if (sortBtn && container) {
    sortBtn.addEventListener('click', () => {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      sortBtn.querySelector('span:last-child').textContent = `Sort by Match % (${sortDirection.toUpperCase()})`;

      flip(container, () => {
        const rows = Array.from(container.querySelectorAll('.multi-brand-row'));
        rows.sort((a, b) => {
          const matchA = parseInt(a.querySelector('.fm-chip-coral')?.textContent || '0', 10);
          const matchB = parseInt(b.querySelector('.fm-chip-coral')?.textContent || '0', 10);
          return sortDirection === 'desc' ? matchB - matchA : matchA - matchB;
        });
        rows.forEach((r) => container.appendChild(r));
      });
    });
  }

  // 4. CM / IN Toggle
  const cmBtn = document.getElementById('toggle-table-cm');
  const inBtn = document.getElementById('toggle-table-in');
  if (cmBtn) {
    cmBtn.addEventListener('click', () => {
      tableUnit = 'cm';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }
  if (inBtn) {
    inBtn.addEventListener('click', () => {
      tableUnit = 'in';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // 5. 3D Tilt on cards
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 4);
  });
}
