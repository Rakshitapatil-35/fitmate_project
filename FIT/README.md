# FITMATE • Smart Clothing Size & Fit Recommendation Platform

An end-to-end AI-driven clothing size recommendation and fit intelligence engine. FITMATE translates personal body measurements into brand-specific size verdicts, comfort predictions, tailored garment specs, body shape archetypes, and e-commerce return-risk scores through an ensemble of 5 trained machine learning models.

---

## 🚀 Quick Start

### 1. Launch Everything in One Command
```bash
./start_all.sh
```
This automatically boots:
- **FastAPI Backend & ML Suite** on [http://localhost:8000](http://localhost:8000)
- **Frontend Single Page Application** on [http://localhost:5173](http://localhost:5173)

### 2. Independent Launchers
```bash
# Start Backend only
./start_backend.sh

# Start Frontend only
./start_frontend.sh
```

### 3. Key URLs
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **5-Model Diagnostics**: [http://localhost:8000/api/v1/models/status](http://localhost:8000/api/v1/models/status)

---

## 🧠 5-Model AI Intelligence Suite

All 5 trained machine learning models are preloaded in memory at backend startup via `backend/app/services/model_service.py`:

| Model ID | File | Algorithm | Purpose | UI Integration |
| :--- | :--- | :--- | :--- | :--- |
| **Model 1** | `models/model_1_size.joblib` | XGBoost Classifier | Predicts clothing size (`XS`–`XXXL`) + class probabilities | Recommendation Badge & Alternate Sizes |
| **Model 2** | `models/model_2_fit.joblib` | Calibrated Random Forest | Predicts fit category (`tight`, `fit`, `loose`) + probabilities | Fit Dynamics Gauge & Comfort Score |
| **Model 3** | `models/model_3_garment.joblib` | Multi-target Regressor (RF + XGB) | Predicts physical flat garment specs (`bust`, `waist`, `length`, `inseam`) with intervals | Garment Dimension Specs Radar |
| **Model 4** | `models/model_4_cluster_female.joblib`<br>`models/model_4_cluster_male.joblib` | KMeans Clustering (NHANES) | Classifies body silhouette into anthropometric archetypes | "AI Detect (Model 4)" Button on Measurements Page |
| **Model 5** | `models/model_5_feedback.joblib` | Random Forest Classifier | Classifies customer feedback & return risk (`good_fit`, `too_tight`, `too_loose`) | Return Risk & Satisfaction Reassurance Badge |

---

## 🏗️ Repository Architecture

The project follows a clean, standardized two-tier layout:

```
FIT/
├── backend/                             # Python FastAPI Backend + ML Suite
│   ├── app/                             # Core application logic
│   │   ├── main.py                      # App lifespan, CORS & router registrations
│   │   ├── database.py                  # SQLAlchemy engine & session maker
│   │   ├── config.py                    # App settings & environment config
│   │   ├── core/                        # Security, logging, exceptions & rate-limiting
│   │   ├── models/                      # SQLAlchemy ORM models (User, Brand, Product, etc.)
│   │   ├── schemas/                     # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── model_service.py         # Preloads & coordinates all 5 ML models
│   │   │   ├── recommendation_engine.py # Hybrid sizing & ease calculation pipeline
│   │   │   └── unit_conversion.py       # Bi-directional imperial/metric conversions
│   │   ├── routers/                     # REST API routes (/models, /recommendations, etc.)
│   │   └── tests/                       # Pytest test suite (55 tests)
│   ├── models/                          # 5 Trained ML Model Artifacts (.joblib & .json)
│   ├── size_recommendation.db           # SQLite Database with verified schema
│   ├── alembic/                         # Database schema migrations
│   └── requirements.txt                 # Backend Python dependencies
│
├── frontend/                            # Single Unified Frontend Folder
│   ├── index.html                       # Application entry point
│   ├── app.js                           # Routing bootstrap & state listener
│   ├── bundle.js                        # Compiled zero-dependency bundle
│   ├── build.py                         # Standalone python bundle compiler
│   ├── pages/                           # 9 Production page views
│   │   ├── LandingPage.js               # Hero & value proposition
│   │   ├── MeasurementsPage.js          # Body inputs + Model 4 shape auto-detect
│   │   ├── BrandProductPickerPage.js    # Catalog & brand selection
│   │   ├── ResultPage.js                # Hero size verdict & 5-model AI suite
│   │   ├── ComparisonTablePage.js       # Sizing matrix & cross-brand equivalency
│   │   ├── HistoryProfilesPage.js       # Fit Vault profile history
│   │   ├── AuthPage.js                  # Sign up & login
│   │   ├── OnboardingPage.js            # Guided onboarding flow
│   │   └── DashboardPage.js             # User dashboard
│   ├── components/                      # TopNav, BottomTabBar, Toast, LoadingState
│   ├── services/api.js                  # Frontend REST API client
│   ├── state/store.js                   # Reactive state store (Pub/Sub pattern)
│   └── styles/theme.css                 # Warm Cream (#FFF7EE) Design Tokens + 60fps Motion
│
├── start_all.sh                         # Unified launcher (starts backend & frontend)
├── start_backend.sh                     # Starts FastAPI server on port 8000
├── start_frontend.sh                    # Starts frontend server on port 5173
└── .gitignore                           # Production ignore rules
```

---

## 🎨 Design System & Motion (Part B)

- **Color Palette**:
  - Warm Cream Background: `#FFF7EE`
  - Coral Primary Accent: `#FF6B6B`
  - Teal Secondary Accent: `#22A699`
  - Marigold Highlight: `#F7B731`
  - Sky Blue: `#6EC1F7`
  - Lilac: `#C9B6F2`
  - Deep Navy Text: `#14313A` / Slate `#55707A`
  - *No pure black, no dark mode, no generic blue-purple gradients.*
- **Micro-Interactions**:
  - 3D card perspective hover lifts (`translateY(-3px)`).
  - Tactile button press physics (`scale(0.97)`).
  - Top scroll progress indicator tracking page depth.
  - Smooth page transitions with zero layout shift.
  - Full `@media (prefers-reduced-motion)` accessibility support.

---

## 🧪 Testing & Verification

Run all test suites from the project root:

```bash
# Run 15 Dedicated ML Model Tests
cd backend && .venv/bin/python -m pytest app/tests/test_all_five_models.py -v

# Run Full 55-Test Backend Pytest Suite
cd backend && .venv/bin/python -m pytest app/tests/ tests/

# Validate Frontend Bundle Syntax
node -c frontend/bundle.js

# Rebuild Frontend Bundle Anytime
cd frontend && python3 build.py
```

---

## 📦 Packaged Archive

A clean, portable zip archive of this project is available at:
`Desktop/FITMATE_project.zip` (30 MB)
