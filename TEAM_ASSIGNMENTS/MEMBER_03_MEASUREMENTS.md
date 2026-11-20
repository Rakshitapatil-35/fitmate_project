# MEMBER 03 — MEASUREMENTS MANAGEMENT

## 1. Module Title & Branch
- **Module**: Body Measurements Form, Validation, Unit Conversion & Guidance
- **Git Branch**: `feature/measurements` (branched from baseline `main`)

---

## 2. Member Responsibility
Own the `#/measurements` page, anatomical measurement guide SVGs, CM/IN unit conversion, category-specific required/optional measurement fields, physiological range validation, and measurement CRUD/conversion backend endpoints.

---

## 3. Exact Assigned Source Files (Exclusive Ownership)
- **Frontend**:
  - `FIT/frontend/pages/MeasurementsPage.js` (`renderMeasurementsPage`, `onMountMeasurementsPage`)
  - `FIT/frontend/assets/images/measurement-guides/*` (`chest-bust.svg`, `waist.svg`, `hips.svg`, `shoulders.svg`, `height.svg`, `inseam.svg`)
- **Backend**:
  - `FIT/backend/app/routers/measurements.py`
  - `FIT/backend/app/schemas/measurement.py`
  - `FIT/backend/app/services/unit_conversion.py`
- **Tests**:
  - `FIT/backend/app/tests/test_unit_conversion.py`
  - `FIT/backend/app/tests/test_validation.py`

---

## 4. Exact Files That Must NOT Be Modified
- `FIT/backend/app/models/measurement.py` (`BodyMeasurementProfile` — frozen Shared Core contract shared with Member 5)
- `FIT/backend/app/services/catalog_styles.py` (owned by Member 4; Member 3 calls `validate_fit_style_for_category`)
- `FIT/frontend/state/store.js`, `FIT/frontend/services/api.js`, `FIT/frontend/routes/router.js`, `FIT/frontend/app.js`, `FIT/frontend/bundle.js` (Shared Core — frozen)
- `FIT/frontend/pages/HistoryProfilesPage.js` (owned by Member 5)

---

## 5. Tasks to Implement & Maintain
1. **Category-Aware Measurement Form (`#/measurements`)**:
   - **Tops (`mens_tops`, `womens_tops`)**: `chest_bust` (required), `waist` (required), `height` (required), `shoulder` (optional), `sleeve` (optional).
   - **Bottoms (`mens_bottoms`, `womens_bottoms`)**: `waist` (required), `hips` (required), `height` (required), `inseam` (optional), `thigh` (optional).
   - **Dresses (`womens_dresses`)**: `chest_bust` (required), `waist` (required), `hips` (required), `height` (required), `shoulder` (optional).
2. **CM / IN Conversion & Validation**:
   - Instant client-side + `POST /api/v1/measurements/convert` support, keeping canonical `cm` storage in backend while supporting `in` display/input.
   - Physiological bounds validation with clear inline error messages.
3. **Anatomical Visual Guides**:
   - Display `FITMATE_IMAGES.measurementGuides` SVGs beside active input fields.
4. **Measurement Persistence**:
   - Submit via `api.createMeasurementProfile()` / `api.updateMeasurementProfile()` (when authenticated) and update `store.setDraftMeasurements()`, then navigate to `#/fit-style`.

---

## 6. Existing Functionality to Preserve
- `POST /api/v1/measurements/{profile_id}/reset`, `POST /api/v1/measurements/{profile_id}/default`, and `DELETE /api/v1/measurements/{profile_id}` contracts consumed by Member 5 (`HistoryProfilesPage.js`).
- `validate_fit_style_for_category()` enforcement rejecting `Slim` on bottoms (`422`).

---

## 7. APIs & Dependencies
- **Endpoints Owned**:
  - `POST /api/v1/measurements/convert`
  - `POST /api/v1/measurements`
  - `GET /api/v1/measurements`
  - `GET /api/v1/measurements/{profile_id}`
  - `PUT /api/v1/measurements/{profile_id}`
  - `PATCH /api/v1/measurements/{profile_id}`
  - `POST /api/v1/measurements/{profile_id}/reset`
  - `POST /api/v1/measurements/{profile_id}/default`
  - `DELETE /api/v1/measurements/{profile_id}`
- **Depends on (Read-Only)**:
  - `BodyMeasurementProfile` (`FIT/backend/app/models/measurement.py`)
  - `validate_fit_style_for_category` (`FIT/backend/app/services/catalog_styles.py`, Member 4)
  - `store.setUnit()`, `store.setDraftMeasurements()`, `FITMATE_IMAGES.measurementGuides`

---

## 8. Expected Output & Testing Requirements
- `pytest FIT/backend/app/tests/test_unit_conversion.py FIT/backend/app/tests/test_validation.py -v` passes 100%.
- `node --check FIT/frontend/pages/MeasurementsPage.js` exits `0`.
- Verified CM/IN toggling, required-field validation per category, and SVG guide rendering.
- Submit: source files, pytest output, screenshots of `#/measurements`, commit hash, known issues.

---

## 9. Git Commands & Integration
```bash
git checkout main
git pull origin main
git checkout -b feature/measurements

# After implementation & testing:
git status
git add FIT/frontend/pages/MeasurementsPage.js FIT/frontend/assets/images/measurement-guides/ FIT/backend/app/routers/measurements.py FIT/backend/app/schemas/measurement.py FIT/backend/app/services/unit_conversion.py FIT/backend/app/tests/test_unit_conversion.py FIT/backend/app/tests/test_validation.py
git commit -m "Implement FITMATE measurements management module"
git push -u origin feature/measurements
```
- **Never push directly to `main`, never force-push, and never edit another member's files.**
