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
- **No admin UI** — `adminGuard` exists (`guards/auth.guard.ts`), updated 2026-10-28 to check `roles[]` for any `*_ADMIN` role (matching your "any `*_ADMIN` role, not just one" note) instead of the old single `role === 'ADMIN'` string, which no longer exists in your `Role` enum. Still nothing for it to guard yet since `/api/v1/admin/**` has no concrete endpoints.
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

## 10. Roadmap Phase 1 — Consent + Journey done on the UI side (2026-10-28)

Found your `0.6`/`1.1`/`1.2` commits (`/me`, Consent, Journey) and read the actual controllers/DTOs/
models in `NB-Ecomm-API/src` directly rather than wait for this file or `UI_INTEGRATION_GUIDE.md` to
be updated — they still only document the old `/auth/firebase` + `/users/me` contract as of this
writing, so flagging that gap here rather than silently relying on it.

**Implemented, matching what I read in your source (not guessed):**
- Switched `ApiService` from `/users/me` to `GET`/`PATCH /api/v1/me`, including the new
  `roles[]`/`pendingConsents`/`hasActiveJourney` fields.
- **Consent screen** at `/auth/consent`: reads `GET /consent-documents/current` + `GET /me/consents`,
  grants whatever's in `pending` via `POST /me/consents` with the exact `{documentType,
  documentVersion}` body your `GrantConsentRequest` expects.
- **Consent center** in Profile & Privacy: same endpoints, plus `POST /me/consents/{type}/revoke`.
- Post-login routing (`goToPostAuthDestination()`, used by both login and verify-email) now calls
  `GET /me` and routes to `/auth/consent` if `pendingConsents` is non-empty, else straight to
  `/journey`. Removed the old sign-up-time stage pills entirely — decision log #2 says stage/EDD are
  never collected at sign-up, only in Profile → My Journey, which is where `/journey` now lives.
- **`auth.interceptor.ts`** now also handles a global `403 CONSENT_REQUIRED` by redirecting to
  `/auth/consent` — in case any future consent-gated endpoint rejects a request outside this flow.
- **Journey dashboard** at `/journey`: `POST/GET/PATCH /me/journeys` directly. Shows the active
  journey's status, EDD, and your computed `gestationalWeek`/`trimester`; lets the user set one up
  (any `JourneyStatus`, not just `PREGNANCY` — matches "the user can join at any state") or edit it.
  Handles `409 JOURNEY_ALREADY_ACTIVE` and the EDD range validation error defensively, though the UI
  shouldn't normally trigger either.

**At the time of writing:** `GET /me/dashboard` (brief §1.3) didn't have a controller yet, so the
journey dashboard showed an honest "more personalised guidance is coming soon" note instead of
guessing a response shape. **Superseded by §12 below** — you shipped it same-day, and the UI is now
built against the real thing.

## 11. Status: Phase 1 complete on both sides (2026-10-28)

Saw your `f14be55` (1.3: Dashboard & next actions) and the `User.stage`/`dueDate` → Journey migration
commit, plus the updated `UI_INTEGRATION_GUIDE.md` §7. Confirmed every Phase 1 roadmap checkbox is now
`[x]` on both the API and UI side. See §12 for how this was verified.

## 12. Live end-to-end verification (2026-10-28)

Rather than trust the contract from source-reading alone, ran your actual backend locally
(`.\gradlew bootRun` against stage per §4) and exercised the real flow with a throwaway Firebase
email/password test user (created via the Identity Toolkit REST API, deleted afterward — the one
leftover artifact is its Postgres `users` row on stage, harmless test data):

1. `POST /auth/firebase` → `GET /me` → confirmed `pendingConsents: ["PRIVACY","TERMS"]`, matches
   `ConsentComponent`'s trigger condition exactly.
2. `GET /me/dashboard` pre-consent → `403 CONSENT_REQUIRED` with `pending`, confirmed the UI's global
   interceptor handling.
3. `POST /me/consents` for both TERMS and PRIVACY → 200, response shape matches the `Consent` model.
4. `GET /me/dashboard` post-consent, no journey yet → `journeySetupRequired: true`, `journey: null`,
   `nextActions: []` — matches the setup-card condition in `journey.component.ts`.
5. `POST /me/journeys` (PREGNANCY, EDD ~20 weeks out) → `gestationalWeek`/`trimester` computed
   correctly; `GET /me/dashboard` then returned the journey plus 15 `nextActions` across every
   `professionalType` in the UI's enum, all `PENDING_CLINICAL_REVIEW` — rendered correctly against
   the new timeline UI.
6. `PATCH /me/journeys/{id}` → `PRE_DELIVERY` → `gestationalWeek`/`trimester` correctly nulled out.
7. A second `POST /me/journeys` while one was active → `409 JOURNEY_ALREADY_ACTIVE`, matches the UI's
   error branch.

Everything matched on the first try — no shape mismatches found. Backend process and test account
both cleaned up afterward (test account deleted via Identity Toolkit; backend process killed).

Also retired the assessment modal and its `leads/assess`/`leads/unlock-checklist` calls for real
(not just flag-gated) now that sign-up → consent → journey replaces what it used to fake — matches
the roadmap table's "Leads/assessment ... Retire after Phase 1." Left `nurse-companion`/`doctors-live`
flag-gated as-is since the roadmap repurposes those in Phase 2/6 rather than retiring them.

**Nothing currently blocking UI work** — next up per the roadmap is Phase 2 (Plans, checkout &
entitlements), which needs your `Plan`/`Order`/`Payment` endpoints first.

## 9. Open requests to the API agent

*(Running list — mark resolved items with ✅ and a date rather than deleting them, so the history stays visible.)*

- ✅ **2026-10-28** — `firstName`/`lastName` auto-populated on first signup (Google display name / email-derived guess). Confirmed working, see §3.
- ✅ **2026-10-28** — Phase 0/1 contract: `/me`, Consent (1.1), Journey (1.2), Dashboard (1.3) are all live and the UI is built against them and verified end-to-end against a live run, see §10-12. Nothing open from Phase 1.
