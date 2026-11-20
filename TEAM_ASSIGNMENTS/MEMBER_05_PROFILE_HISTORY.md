# MEMBER 05 — USER PROFILES & HISTORY

## 1. Module Title & Branch
- **Module**: Saved Measurement Profiles, Edit/Reset/Delete, Timestamped History & Account Management
- **Git Branch**: `feature/profile-history` (branched from baseline `main`)

---

## 2. Member Responsibility
Own the User Profiles & History page (`#/history`), saved measurement profile management (set default, edit, reset measurements, delete profile, view timestamped `history_json` audit trail), recommendation history list, and user account profile endpoints (`/api/v1/users/me`).

---

## 3. Exact Assigned Source Files (Exclusive Ownership)
- **Frontend**:
  - `FIT/frontend/pages/HistoryProfilesPage.js` (`renderHistoryProfilesPage`, `onMountHistoryProfilesPage`)
- **Backend**:
  - `FIT/backend/app/routers/users.py`
  - `FIT/backend/app/schemas/user.py`

---

## 4. Exact Files That Must NOT Be Modified
- `FIT/backend/app/models/measurement.py` (`BodyMeasurementProfile` — frozen Shared Core contract)
- `FIT/backend/app/models/user.py` (owned by Member 2)
- `FIT/backend/app/routers/measurements.py` (owned by Member 3 — Member 5 consumes its `/reset`, `/default`, `PUT`, `DELETE` endpoints)
- `FIT/backend/app/routers/recommendations.py` (owned by Member 4 — Member 5 consumes `GET /api/v1/recommendations`)
- `FIT/frontend/state/store.js`, `FIT/frontend/services/api.js`, `FIT/frontend/routes/router.js`, `FIT/frontend/app.js`, `FIT/frontend/bundle.js` (Shared Core — frozen)

---

## 5. Tasks to Implement & Maintain
1. **Saved Profiles & History Page (`#/history`)**:
   - List all saved `BodyMeasurementProfile` entries for the user with active/default badge, unit toggle display (`cm`/`in`), and timestamped `history_json` change log.
   - Support **Load into Draft** (`store.applyProfileToDraft(profile)`), **Edit Profile** (`PUT /api/v1/measurements/{id}`), **Set Default** (`POST /api/v1/measurements/{id}/default`), **Reset Measurements** (`POST /api/v1/measurements/{id}/reset`), and **Delete Profile** (`DELETE /api/v1/measurements/{id}`).
   - Display past recommendation records (`api.listRecommendations()`) with quick re-open/delete actions.
2. **User Profile API (`/api/v1/users/me`)**:
   - `GET /api/v1/users/me`, `PUT /api/v1/users/me` (update `full_name`, `preferred_unit`, `preferred_gender`, etc.), `DELETE /api/v1/users/me`.

---

## 6. Existing Functionality to Preserve
- `history_json` timestamped entry format (`action`, `timestamp`, `reason`/fields) including entries added by `migrate_bottoms_slim_to_skinny`.
- Demo/guest fallback behavior in `api.js` when unauthenticated (`_getMockProfiles`, `_getMockRecommendations`).
- Safe handling when deleting the currently active profile (clear/fallback `activeProfileId`).

---

## 7. APIs & Dependencies
- **Endpoints Owned**:
  - `GET /api/v1/users/me`
  - `PUT /api/v1/users/me`
  - `DELETE /api/v1/users/me`
- **Consumes (Read-Only Contracts from Members 3 & 4)**:
  - `GET /api/v1/measurements`, `PUT /api/v1/measurements/{id}`, `POST /api/v1/measurements/{id}/reset`, `POST /api/v1/measurements/{id}/default`, `DELETE /api/v1/measurements/{id}` (Member 3)
  - `GET /api/v1/recommendations`, `DELETE /api/v1/recommendations/{id}` (Member 4)
  - `store.applyProfileToDraft()`, `store.setActiveProfile()`, `store.addToast()`

---

## 8. Expected Output & Testing Requirements
- `node --check FIT/frontend/pages/HistoryProfilesPage.js` exits `0`.
- Backend user/profile integration check via `pytest FIT/backend/app/tests/test_validation.py -k "profile or slim" -v` (read-only verification) + `GET|PUT /api/v1/users/me` verification.
- Verified UI actions on `#/history`: edit profile, reset measurements, set default, delete profile, inspect timestamped history, and persist across page reload.
- Submit: source files, test output, screenshots of `#/history`, commit hash, known issues.

---

## 9. Git Commands & Integration
```bash
git checkout main
git pull origin main
git checkout -b feature/profile-history

# After implementation & testing:
git status
git add FIT/frontend/pages/HistoryProfilesPage.js FIT/backend/app/routers/users.py FIT/backend/app/schemas/user.py
git commit -m "Implement FITMATE user profiles and history module"
git push -u origin feature/profile-history
```
- **Never push directly to `main`, never force-push, and never edit another member's files.**
