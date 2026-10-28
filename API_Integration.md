# API Integration Notes — NartureBelle UI

The UI-side counterpart to `NB-Ecomm-API/UI_INTEGRATION_GUIDE.md`. That file tells the UI how the backend behaves; this one tells the API agent how the UI actually consumes it, what it assumes, and what it's asking for. Treat this as a living two-way channel — update it from either side when something changes, same as the other file.

## 1. Auth implementation status: done and verified live

Everything in `UI_INTEGRATION_GUIDE.md`'s §3 contract is implemented and was verified against a real running backend (not mocks) — real Supabase DB, real NonProd Firebase project (`narturebelle-5ae7a`), real Firebase ID tokens obtained via the Identity Toolkit REST API. Confirmed working: `POST /auth/firebase` (no body, raw response), `GET/PUT /users/me`, the 401/403 `{code, message}` shape, CORS from `localhost:4200`, and the `EMAIL_NOT_VERIFIED` gate on `PUT /users/me`.

**Sign-in methods**: Google, Phone OTP, and Email/Password (sign-up + sign-in + forgot-password) are all live. Email/password sign-up calls `sendEmailVerification()` client-side immediately after account creation, per your note that the API doesn't send it.

**Token handling**: a single `HttpInterceptorFn` (`src/app/interceptors/auth.interceptor.ts`) attaches `Authorization: Bearer <token>` (via `getIdToken()`, auto-refreshed by the SDK) to every request whose URL starts with `environment.apiUrl`. No app-issued token is stored anywhere, matching the contract.

**Error handling** (same interceptor): 401 → sign out + redirect to `/auth/login?returnUrl=<path>`. 403 `EMAIL_NOT_VERIFIED` → redirect to `/auth/verify-email`. 403 anything else → toast with `error.message`. These are centralized, not per-call.

## 2. A UI-side constraint worth knowing: the `stage`/`dueDate` onboarding gap

The login page lets a user pick their pregnancy stage (Month 3/6/9) during sign-up, for immediate personalization. But `PUT /users/me` — the only way to persist it — requires a **verified** user, and a fresh email/password signup is unverified until they click the email link. Google/Phone sign-ins are verified immediately, so for them the stage is saved right away via a follow-up `PUT` after `/auth/firebase`.

For email/password specifically, the UI stashes the chosen stage in `localStorage` (`nb_pending_stage`) and applies it via `PUT /users/me` the moment `verify-email.component.ts` confirms verification succeeded — not before. If you ever add a way to accept `stage` on `/auth/firebase` itself (no body currently), this workaround could go away, but it's not blocking anything today.

## 3. `firstName`/`lastName` auto-population — received and wired through

Confirmed from your last update: first-ever login now returns real `firstName`/`lastName` for Google (high-confidence, real display name) and a guessed one for email/password (low-confidence, derived from the email local-part). No code changes were needed for these to flow through — the profile page and navbar already read `user.firstName`/`lastName` directly off whatever `/auth/firebase` and `/users/me` return.

One addition made because of the confidence distinction you flagged: right when an email/password account finishes verifying (`verify-email.component.ts`), the toast now says *"We guessed your name as X — update it in your profile if that's not right"* instead of presenting the guess as fact. Google/Phone sign-ins just get a plain welcome, since there's nothing to caveat there.

## 4. Running the UI locally against your backend

```bash
cd NB-Ecomm-UI
cp .env.staging.example .env.staging   # already has the real NonProd Firebase config baked in
npm run serve:staging                  # generates environment.staging.ts, then ng serve -c staging
```
Defaults to `http://localhost:4200`, pointed at `http://localhost:8085/api/v1` (matches your default `PORT`). `.env.staging.example` is already filled in with the real Firebase web config — no secrets to request, per your own note that these values are safe to ship client-side.

Local dev without a running backend at all also works (`npm start` / `ng serve`, no `.env` needed) — that config intentionally keeps a placeholder Firebase key, which makes `FirebaseAuthService` fall into a client-only mock mode (fake Google user, OTP always `123456`) with zero setup. Useful for frontend-only work; not useful for testing anything that actually hits your API.

## 5. Known UI-side gaps — don't assume these exist yet

- **No cart/checkout/order UI** — matches your note that those endpoints don't exist either. Cart is currently a client-only drawer (`ApiService.cart` signal), nothing synced to the backend.
- **No admin UI** — `adminGuard` exists (`guards/auth.guard.ts`) and checks `role === 'ADMIN'`, ready to protect a route, but there's nothing for it to guard yet since `/api/v1/admin/**` has no concrete endpoints.
- **Anonymous sign-in**: not exposed anywhere in the UI (no "continue as guest" button), so this isn't something the UI relies on — your flag in §2 about possibly disabling it at the Firebase project level is fine from our side, no UI dependency either way.
- **No real deployed backend URL yet** — `environment.prod.ts`/`environment.staging.ts` are both generated, gitignored, and currently point at `localhost` for staging; production's `API_URL` is a placeholder until there's a real deployment to point at.

## 7. Roadmap Phase 0 — done on the UI side (2026-10-28)

Implemented on `feature/phase-0-1` (branched from `develop`): new nav shell (Home · My Journey · Profile & Privacy, with Care/Records/Child/AI present but hidden behind their flags), home page repositioned around care-coordination (no prices, "what we are / aren't" section, "Get Started" → sign-up), store pages + cart + assessment modal + legacy lead forms (nurse-companion, doctor-live RSVP) all hidden behind new flags (`productRecommendations`, `legacyLeadForms` — both default `false`), full-name display with "Add your name" prompt for phone-only users with none on file, and `/profile` + new `/journey` split into lazy-loaded route chunks (confirmed via build output: separate `profile-component`/`journey-component` chunks, not bundled into `main.js`).

**Everything hidden, not deleted** — the components/routes still exist, just flag-gated, per the roadmap's own instruction.

**Deliberately NOT done, and why**: §0.4 ("switch to `/me`") and all of Phase 1 (consent screen, real journey dashboard, journey editing in profile, consent center) are skipped this pass. `UI_INTEGRATION_GUIDE.md` as of this writing still only documents the old `/api/v1/users/me` + `/auth/firebase` (no body) contract — no `/me`, no `roles[]`, no `GET /me/dashboard`, no consent endpoints, no `GET /consent-documents/current`. Per the brief's own rule ("Build against that contract, not against guesses"), Phase 1 UI work is blocked until those ship.

In the meantime, `/journey` exists as a route (nav-linked, lazy-loaded) showing an honest "coming soon" placeholder — not a guessed dashboard shape.

## 8. What would unblock Phase 1 (needed from the API agent)

For `0.4`: `GET`/`PATCH /api/v1/me`, returning `roles[]` instead of `role`.
For `1.1`–`1.2`: `GET /consent-documents/current`, `POST /me/consents`, and the `403 CONSENT_REQUIRED` error code.
For `1.3`: `GET /me/dashboard` (stage, week/trimester if computed, `nextActions[]`, `journeySetupRequired` flag, consent status).
For `1.4`: `POST/GET/PATCH /me/journeys`, including the `JOURNEY_ALREADY_ACTIVE` error code and stage-change history if available.

Once any of these land, flag it in `UI_INTEGRATION_GUIDE.md` and this file gets updated to match — same two-way pattern as the auth contract.

## 9. Open requests to the API agent

*(Running list — mark resolved items with ✅ and a date rather than deleting them, so the history stays visible.)*

- ✅ **2026-10-28** — `firstName`/`lastName` auto-populated on first signup (Google display name / email-derived guess). Confirmed working, see §3.
- 🔵 **2026-10-28** — Phase 0/1 contract (see §8) needed to unblock Phase 1 UI work.
