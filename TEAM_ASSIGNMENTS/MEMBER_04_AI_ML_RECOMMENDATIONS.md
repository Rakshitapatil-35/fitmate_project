# MEMBER 04 — AI/ML & RECOMMENDATION SYSTEM

## 1. Module Title & Branch
- **Module**: Fit-Style Catalog, 5-Model ML Pipeline, Recommendation Engine & Results Comparison
- **Git Branch**: `feature/ai-recommendations` (branched from baseline `main`)

---

## 2. Member Responsibility
Own the Fit-Style selection page (`#/fit-style`), Results & 7-Brand Comparison page (`#/results`, `#/result`, `#/comparison`), the authoritative fit-style catalog (`catalog_styles.py`), all 5 trained ML models (`model_1_size` through `model_5_fit_risk`), rule-based fallback strategies, cross-brand size comparison, and fit feedback analytics.

---

## 3. Exact Assigned Source Files (Exclusive Ownership)
- **Frontend**:
  - `FIT/frontend/pages/BrandProductPickerPage.js` (`renderFitStylePage`, `onMountFitStylePage`, `renderBrandProductPickerPage`, `onMountBrandProductPickerPage`)
  - `FIT/frontend/pages/ResultPage.js` (`renderResultsPage`, `onMountResultsPage`, `renderResultPage`, `onMountResultPage`)
  - `FIT/frontend/pages/ComparisonTablePage.js` (`renderComparisonTablePage`, `onMountComparisonTablePage`)
- **Backend Routers & Schemas**:
  - `FIT/backend/app/routers/comparison.py`
  - `FIT/backend/app/routers/recommendations.py`
  - `FIT/backend/app/routers/models.py`
  - `FIT/backend/app/routers/feedback.py`
  - `FIT/backend/app/schemas/recommendation.py`
  - `FIT/backend/app/schemas/feedback.py`
- **Backend Models & Services**:
  - `FIT/backend/app/models/recommendation.py` (`RecommendationRecord`, `PredictionLog`)
  - `FIT/backend/app/models/feedback.py` (`FitFeedback`)
  - `FIT/backend/app/services/catalog_styles.py`
  - `FIT/backend/app/services/ease_config.json`
  - `FIT/backend/app/services/ml_client.py`
  - `FIT/backend/app/services/model_service.py`
  - `FIT/backend/app/services/recommendation_engine.py`
  - `FIT/backend/app/services/recommendation_service.py`
  - `FIT/backend/app/services/feedback_service.py`
- **ML Pipeline & Artifacts**:
  - `FIT/backend/app/ml/*` (`model_loader.py`, `predictor.py`, `train_stub.py`, `version.py`, `artifacts/*`)
  - `FIT/backend/models/*` (all 5 `.joblib` models + `.json` metadata)
  - `FIT/backend/src/*` (`clean.py`, `predict.py`, `run_all.py`, `train_model_1.py`, `train_model_2.py`, `train_model_3.py`, `utils.py`)
- **Tests**:
  - `FIT/backend/app/tests/test_all_five_models.py`
  - `FIT/backend/app/tests/test_ml_fallback.py`
  - `FIT/backend/app/tests/test_recommendation_strategies.py`
  - `FIT/backend/app/tests/test_feedback_and_extension.py`

---

## 4. Exact Files That Must NOT Be Modified
- `FIT/frontend/config/images.js` (owned by Member 1 — request new style image mappings via Member 1)
- `FIT/frontend/state/store.js`, `FIT/frontend/services/api.js`, `FIT/frontend/routes/router.js`, `FIT/frontend/app.js`, `FIT/frontend/bundle.js` (Shared Core — frozen)
- `FIT/backend/app/models/catalog.py`, `FIT/backend/app/models/measurement.py`, `FIT/backend/app/models/user.py`
- `FIT/backend/app/routers/measurements.py`, `FIT/backend/app/routers/auth.py`, `FIT/backend/app/routers/users.py`

---

## 5. Tasks to Implement & Maintain
1. **Fit-Style Selection (`#/fit-style`)**:
   - Render authoritative styles per `(gender, categoryGroup)` using `getFitStyleImage(gender, categoryGroup, style.id)`:
     - Men Tops: `T-shirts`, `Regular`, `Slim`, `Oversized`, `Sweatshirts`, `Jackets`, `Kurta`
     - Women Tops: `T-shirts`, `Regular`, `Slim`, `Oversized`, `Cropped`, `Sweatshirts`, `Jackets`, `Kurta`
     - Men & Women Bottoms: `Straight`, `Loose`, `Baggy`, `Trousers`, `Cargo`, `Track Pants`, `Shorts`, `Skinny`
     - Women Dresses: `Bodycon`, `A-line`, `Maxi`, `Jumpsuit`
2. **5-Model ML Suite & Strategy Engine**:
   - `model_1_size` (Size Prediction), `model_2_fit` (Fit Label), `model_3_garment_dims` (Garment Dimensions), `model_4_body_shape` (Body Shape Cluster), `model_5_fit_risk` (Return Risk).
   - Maintain rule-based strategy fallback (`MensTopsStrategy`, `WomensTopsStrategy`, `BottomsStrategy`, `DressesStrategy`).
3. **7-Brand Comparison & Results (`#/results`)**:
   - `POST /api/v1/comparison/brands` evaluating Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, AuraAtelier.
   - Display primary recommended size, confidence score, fit analysis, garment dimensions, body-shape tag, return-risk indicator, and interactive feedback submission (`POST /api/v1/feedback`).

---

## 6. Existing Functionality to Preserve
- `catalog_styles.py` contract: `validate_fit_style_for_category()` and `migrate_bottoms_slim_to_skinny()`.
- All 5 models warming up cleanly in `default_model_service.load_all()` during FastAPI lifespan startup.
- Deterministic JSON response shapes for `POST /api/v1/comparison/brands` and `POST /api/v1/recommendations`.

---

## 7. APIs & Dependencies
- **Endpoints Owned**:
  - `GET /api/v1/comparison/catalog-styles`, `GET|POST /api/v1/comparison/brands`
  - `POST|GET /api/v1/recommendations`, `GET|DELETE /api/v1/recommendations/{id}`
  - `GET /api/v1/models/status`, `POST /api/v1/predict/{size,fit,garment-dims,garment,body-shape,fit-risk}`
  - `POST /api/v1/feedback`, `GET /api/v1/feedback/me`, `GET /api/v1/feedback/analytics`
- **Depends on (Read-Only)**:
  - `getFitStyleImage()` from `config/images.js` (Member 1)
  - `store.draftMeasurements`, `store.setFitStyle()`, `store.setBrandRecommendations()`

---

## 8. Expected Output & Testing Requirements
- `pytest FIT/backend/app/tests/test_all_five_models.py FIT/backend/app/tests/test_ml_fallback.py FIT/backend/app/tests/test_recommendation_strategies.py FIT/backend/app/tests/test_feedback_and_extension.py -v` passes 100%.
- `node --check` passes on `BrandProductPickerPage.js`, `ResultPage.js`, `ComparisonTablePage.js`.
- Verified live `GET /api/v1/models/status` (`5/5` models ready) and `POST /api/v1/comparison/brands` (7 brands returned).
- Submit: source files, pytest output, screenshots of `#/fit-style` and `#/results`, commit hash, known issues.

---

## 9. Git Commands & Integration
```bash
git checkout main
git pull origin main
git checkout -b feature/ai-recommendations

# After implementation & testing:
git status
git add FIT/frontend/pages/BrandProductPickerPage.js FIT/frontend/pages/ResultPage.js FIT/frontend/pages/ComparisonTablePage.js FIT/backend/app/routers/comparison.py FIT/backend/app/routers/recommendations.py FIT/backend/app/routers/models.py FIT/backend/app/routers/feedback.py FIT/backend/app/schemas/recommendation.py FIT/backend/app/schemas/feedback.py FIT/backend/app/models/recommendation.py FIT/backend/app/models/feedback.py FIT/backend/app/services/catalog_styles.py FIT/backend/app/services/ease_config.json FIT/backend/app/services/ml_client.py FIT/backend/app/services/model_service.py FIT/backend/app/services/recommendation_engine.py FIT/backend/app/services/recommendation_service.py FIT/backend/app/services/feedback_service.py FIT/backend/app/ml/ FIT/backend/models/ FIT/backend/src/ FIT/backend/app/tests/test_all_five_models.py FIT/backend/app/tests/test_ml_fallback.py FIT/backend/app/tests/test_recommendation_strategies.py FIT/backend/app/tests/test_feedback_and_extension.py
git commit -m "Implement FITMATE AI/ML and recommendations module"
git push -u origin feature/ai-recommendations
```
- **Never push directly to `main`, never force-push, and never edit another member's files.**
