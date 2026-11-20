# MEMBER 02 — AUTHENTICATION & ONBOARDING

## 1. Module Title & Branch
- **Module**: Authentication, Session Management, Guest Access & Onboarding Flow
- **Git Branch**: `feature/auth-onboarding` (branched from baseline `main`)

---

## 2. Member Responsibility
Own user registration, login, JWT token lifecycle (access + refresh + token blacklist logout), demo user auto-fill, guest continuation, Gender selection (`#/gender`), Clothing Category selection (`#/category`), and the authenticated Home/Dashboard summary (`#/home`).

---

## 3. Exact Assigned Source Files (Exclusive Ownership)
- **Frontend**:
  - `FIT/frontend/pages/AuthPage.js` (`renderAuthPage`, `onMountAuthPage`)
  - `FIT/frontend/pages/OnboardingPage.js` (`renderGenderPage`, `onMountGenderPage`, `renderCategoryPage`, `onMountCategoryPage`, `renderOnboardingPage`, `onMountOnboardingPage`)
  - `FIT/frontend/pages/DashboardPage.js` (`renderDashboardPage`, `onMountDashboardPage`)
- **Backend**:
  - `FIT/backend/app/routers/auth.py`
  - `FIT/backend/app/schemas/auth.py`
  - `FIT/backend/app/models/user.py` (`User`, `TokenBlacklist`)
- **Tests**:
  - `FIT/backend/app/tests/test_auth.py`

---

## 4. Exact Files That Must NOT Be Modified
- `FIT/frontend/index.html`, `FIT/frontend/app.js`, `FIT/frontend/routes/router.js`, `FIT/frontend/state/store.js`, `FIT/frontend/services/api.js`, `FIT/frontend/build.py`, `FIT/frontend/bundle.js` (Shared Core — frozen)
- `FIT/backend/app/core/security.py`, `FIT/backend/app/dependencies.py`, `FIT/backend/app/main.py` (Shared Core — frozen)
- `FIT/frontend/config/images.js` & `FIT/frontend/styles/theme.css` (owned by Member 1)
- All other members' pages, routers, ML services, and test files

---

## 5. Tasks to Implement & Maintain
1. **Authentication (`#/auth`)**:
   - Support Sign Up (`email`, `full_name`, `password`) with client & server validation and automatic login immediately after registration (no second login prompt).
   - Support Log In, Demo Account auto-fill (`UserPass123`), and Guest access (`#/gender` without forced registration).
   - Preserve `?redirect=...` post-login navigation.
2. **Gender Selection (`#/gender`)**:
   - Two large visual cards (`Men` / `Women`) using `FITMATE_IMAGES.gender.male` and `FITMATE_IMAGES.gender.female`.
   - Save selection via `store.setGender(gender)` and persist to user profile when authenticated.
3. **Clothing Category Selection (`#/category`)**:
   - Women: `Tops`, `Bottoms`, `Dresses`. Men: `Tops`, `Bottoms` only (enforce `male` never accesses `dresses`).
   - Save via `store.setCategory(categoryGroup)` and route to `#/measurements`.
4. **Backend Auth APIs (`/api/v1/auth/*`)**:
   - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` (blacklisting tokens in `TokenBlacklist`).

---

## 6. Existing Functionality to Preserve
- `User` and `TokenBlacklist` ORM table schemas (`users`, `token_blacklist`).
- `get_current_user` / `get_optional_user` compatibility in `dependencies.py`.
- Returning authenticated users skipping `#/` to `#/gender`, and flow integrity preventing `male` + `dresses`.

---

## 7. APIs & Dependencies
- **Endpoints Owned**:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- **Depends on (Read-Only)**:
  - `store.setUser()`, `store.setGender()`, `store.setCategory()`, `store.addToast()`
  - `api.register()`, `api.login()`, `api.logout()`, `api.refreshToken()`
  - `FITMATE_IMAGES.gender`, `getCategoryImage()` from `config/images.js` (Member 1)

---

## 8. Expected Output & Testing Requirements
- `pytest FIT/backend/app/tests/test_auth.py -v` passes 100%.
- `node --check` passes on `AuthPage.js`, `OnboardingPage.js`, `DashboardPage.js`.
- Verified end-to-end UI flow: Sign Up -> auto-login -> `#/gender` -> `#/category` -> `#/measurements`, plus Demo Login and Logout.
- Submit: source files, pytest output, screenshots of `#/auth`, `#/gender`, `#/category`, commit hash, known issues.

---

## 9. Git Commands & Integration
```bash
git checkout main
git pull origin main
git checkout -b feature/auth-onboarding

# After implementation & testing:
git status
git add FIT/frontend/pages/AuthPage.js FIT/frontend/pages/OnboardingPage.js FIT/frontend/pages/DashboardPage.js FIT/backend/app/routers/auth.py FIT/backend/app/schemas/auth.py FIT/backend/app/models/user.py FIT/backend/app/tests/test_auth.py
git commit -m "Implement FITMATE authentication and onboarding module"
git push -u origin feature/auth-onboarding
```
- **Never push directly to `main`, never force-push, and never edit another member's files.**
