# FITMATE Recommendation Platform & ML Engine

Production-grade apparel size and fit recommendation platform featuring a complete **FastAPI Backend REST API**, an integrated **3-Model Machine Learning Engine**, automated training and inference pipelines, and dedicated **Browser Extension endpoints**.

---

## 1. Machine Learning Architecture Overview

FITMATE deploys three specialized machine learning models:

1. **Model 1: Clothing Size Classifier (`models/model_1_size.joblib`)**
   - **Goal:** Predict standard ordinal clothing size (`XXS`, `XS`, `S`, `M`, `L`, `XL`, `XXL`, `XXXL`) based on user body measurements (height, weight, age, bust, waist, hips), garment category, and fit preference.
   - **Algorithm:** Gradient Boosted Decision Trees (`XGBoost`).
   - **Holdout Accuracy:** **44.35%** (vs **23.51%** majority baseline, **+20.84%** lift).
   - **Within-1-Size Accuracy:** **83.97%** (vs **62.03%** majority baseline, **+21.94%** lift).

2. **Model 2: Fit Recommendation Classifier (`models/model_2_fit.joblib`)**
   - **Goal:** Predict whether a chosen garment size will feel **tight**, **fit**, or **loose** on the customer.
   - **Algorithm:** Balanced Cost-Sensitive `RandomForest` with Platt scaling (`CalibratedClassifierCV`).
   - **Data Split:** `GroupShuffleSplit` on `user_id` (zero user leakage between train and test).
   - **Performance:** Actively detects tight and loose garments (55.1% recall on tight, 48.0% recall on loose) over a heavily skewed 72% fit baseline.

3. **Model 3: Garment Measurement Regressor (`models/model_3_garment.joblib`)**
   - **Goal:** Predict physical garment dimensions in centimeters (`bust_cm`, `waist_cm`, `length_cm`, `inseam_cm`) from brand, category, and size label.
   - **Algorithm:** Multi-target regression via `RandomForest` & `XGBoost`.
   - **Evaluation:** Outperforms category-mean baselines across all dimensions with calibrated prediction intervals. All outputs are strictly tagged as `"estimated": true`.

---

## 2. Repository Directory Structure

```
.
├── alembic/                        # Database migration scripts
├── api/
│   └── main.py                     # Standalone ML FastAPI inference service
├── app/                            # Backend application core
│   ├── core/                       # Auth, security, logging, rate limiting
│   ├── models/                     # SQLAlchemy ORM models
│   ├── routers/                    # FastAPI route handlers
│   ├── schemas/                    # Pydantic v2 schemas
│   └── services/                   # Recommendation strategies & ML client
├── models/
│   ├── model_1_size.joblib         # Model 1 pipeline artifact
│   ├── model_1_metadata.json       # Model 1 schema & evaluation metrics
│   ├── model_2_fit.joblib          # Model 2 pipeline artifact
│   ├── model_2_metadata.json       # Model 2 schema & evaluation metrics
│   ├── model_3_garment.joblib      # Model 3 regression artifact
│   └── model_3_metadata.json       # Model 3 schema & evaluation metrics
├── reports/
│   ├── data_audit.md               # Complete data audit log & cleaning stats
│   ├── model_1_confusion_matrix.png # Model 1 normalized confusion matrix
│   ├── model_2_confusion_matrix.png # Model 2 normalized confusion matrix
│   ├── summary.md                  # Comprehensive senior ML engineering report
│   └── FITMATE_Model_Evaluation_Report.pdf # PDF evaluation report
├── src/
│   ├── clean.py                    # Data cleaning & audit pipeline
│   ├── predict.py                  # High-level inference engine
│   ├── run_all.py                  # End-to-end master orchestrator
│   ├── train_model_1.py            # Size classifier training & tuning
│   ├── train_model_2.py            # Fit classifier training & calibration
│   ├── train_model_3.py            # Garment regressor training
│   └── utils.py                    # Unit conversion, I/O, and normalizers
├── tests/
│   └── test_fitmate.py             # 19 automated Pytest ML & API tests
├── FITMATE_Model_Evaluation_Report.pdf # PDF report in root directory
├── requirements.txt                # Unified dependencies
└── seed.py                         # Sample database seed script
```

---

## 3. Quick Start & Setup

### 3.1 Install Dependencies
```bash
pip install -r requirements.txt
```

### 3.2 Single-Command ML Pipeline (Audit, Clean, Train All Models, Run Tests)
```bash
python -m src.run_all
```

### 3.3 Run Tests
```bash
# Run ML tests (19 passed)
pytest tests/ -v

# Run backend API tests
pytest app/tests/ -v
```

### 3.4 Launch FastAPI Services
- **ML Inference Service:**
  ```bash
  uvicorn api.main:app --port 8000
  ```
- **Full Backend Application:**
  ```bash
  uvicorn app.main:app --port 8001
  ```

---

## 4. API Endpoints & Example cURL Requests

### 4.1 Health Check
```bash
curl -X GET "http://localhost:8000/health"
```

### 4.2 Predict Clothing Size (`POST /predict/size`)
```bash
curl -X POST "http://localhost:8000/predict/size" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "height": "5ft 7in",
      "weight": "138 lbs",
      "age": 28,
      "bust": "34c",
      "waist": 28,
      "hip": 38,
      "fit_preference": "fit"
    },
    "product": {
      "category": "dress",
      "brand": "Zara"
    }
  }'
```

### 4.3 Predict Fit Recommendation (`POST /predict/fit`)
```bash
curl -X POST "http://localhost:8000/predict/fit" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "height": 168.0,
      "weight": 63.0,
      "age": 30,
      "bust": "34b"
    },
    "garment": {
      "category": "top",
      "size": "S"
    }
  }'
```

### 4.4 Estimate Garment Physical Dimensions (`POST /predict/garment`)
```bash
curl -X POST "http://localhost:8000/predict/garment" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Levi'\''s",
    "category": "bottoms",
    "size": "M"
  }'
```

---

## 5. Evaluation PDF Report

A comprehensive 3-page evaluation report with visual confusion matrices is compiled at:
- `FITMATE_Model_Evaluation_Report.pdf`
- `reports/FITMATE_Model_Evaluation_Report.pdf`
