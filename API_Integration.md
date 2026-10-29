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

## 13. Phase 2 request (2026-10-28) — Plans, checkout & entitlements

Checked for Phase 2 progress before starting UI work: no `Plan`/`Order`/`Payment`/`Entitlement`
model classes exist yet on your side, and no new commits past the Phase 1 docs commit. Unlike
Phase 0 (nav/home/flags — no data dependency), every Phase 2 UI screen is data-shaped by your
entities, so there's nothing safe to build yet without guessing. Same rule as always: build against
the contract, not a guess. Here's what would unblock it, per the roadmap's Phase 2 section:

**Plans**
```
GET /plans              — list, with inclusions/exclusions/validity
GET /plans/{id}
```
`Plan`/`PlanVersion`/`PlanEntitlement` seeded from blueprint §5 (Standard ₹9,999/9 sessions, Care
₹14,999/12, Premium ₹24,999/16, per-professional allocation; installment total = +20%). Config, not
code, same pattern as the consent documents / care protocol steps.

**Orders & payments**
```
POST /orders                  — requires Idempotency-Key header; server recalculates price
POST /payments/create
POST /payments/webhook        — idempotent, signature-verified
GET  /entitlements            — the session wallet
```
`Order` stores the plan version + price version. States: pending/paid/failed/refunded/partially
refunded/disputed. Entitlements created only after confirmed payment, no duplicates on retries.

**Mock payment provider** — Phase 2 ships only `MockPaymentProvider` behind a `PaymentProvider`
interface: a simulated checkout page with "Pay successfully"/"Fail payment" buttons firing the same
webhook flow the real gateway will later use. The UI side just needs to know what that mock checkout
step looks like from its perspective (what it redirects to / posts, what it gets back) once this exists.

**What the UI will build once that lands:** plan comparison page (one-time vs installment, session
counts, exclusions, validity, refund terms, AI plan as a separate product), the mock checkout flow
behind `verifiedGuard` (already built), order confirmation/receipt, and a session wallet.

**Still open on the decision log:** refund/unused-session/validity policy (#4) and GST/invoicing/
merchant of record (#5) are both blank in `NARTUREBELLE_ROADMAP.md`'s decision log, needed by Phase 2.
Doesn't need to block scaffolding the data model — Phase 1 shipped with DRAFT consent text pending
legal review the same way — but flagging since the roadmap marks these as blocking decisions, not
just nice-to-haves.

## 14. Update (2026-10-28): built Phase 2 UI anyway, against a self-authored mock

Instructed not to stay blocked waiting on this contract, so implemented the full Phase 2 UI
client-side instead of waiting — `CommerceService` (new file) holds `Plan`/`Order`/`Entitlement`
and persists orders/entitlements to `localStorage` per signed-in user id, same pattern as the
existing cart. **This is explicitly not synced to any backend** and needs reconciling once your
real endpoints exist — treat §13 above as still the live request, not superseded by this.

What exists now, so you know what shape to match (or tell me what's different):
- `Plan`: `{id, name, tagline, priceOneTime, totalSessions, validityMonths, badge?, inclusions[], exclusions[]}`.
  Installment total = `priceOneTime * 1.2`, computed client-side, matching the roadmap's "+20%."
  Standard/Care/Premium prices and session counts match blueprint §5 exactly; inclusions/exclusions/
  validity are my own placeholder text, not from any source — happy to drop these the moment you
  seed real `PlanVersion` content.
- `Order`: `{id, planId, planName, amount, installment, status: PENDING|PAID|FAILED, createdAt, paidAt?}`.
  Created client-side on reaching `/checkout`; "Pay successfully"/"Fail payment" buttons call a mock
  `completePayment()` that flips status and (on success) grants an `Entitlement`.
- `Entitlement`: `{planId, planName, totalSessions, usedSessions, purchasedAt, expiresAt}`. No
  per-professional-type breakdown — nothing specified one, so I didn't invent it. Shown on `/journey`
  as "My Care Plan."
- Deliberately NOT built: the AI record plan as a separate product (Phase 6 says it needs clinical
  governance first — bundling it into Phase 2 would misrepresent that it's ready) and refund-terms
  display (decision log #4 is still blank).

Routes: `/plans` (public), `/checkout` (`verifiedGuard`), `/orders/:id` (`authGuard`, only renders
for a `PAID` order — a `PENDING`/`FAILED` order shows an explicit "hasn't been paid yet" message
instead of a false success page).

*(Superseded by §16 — Phase 2 now runs on your real contract.)*

## 15. Update (2026-10-28): Phases 3-6 also implemented client-side, same reasoning as §14

Instructed to implement every phase, not just Phase 2, without waiting on the API. Same deal as
§14 for each: self-authored mock, `localStorage`-backed, documented here for reconciliation. None
of this is synced to any backend.

- **Phase 3 (Providers/booking)** — new `ProviderService`, `Provider`/`Slot`/`Booking` in
  `provider.models.ts`. `Provider: {id, name, type, credentialsSummary, languages[], city, virtual,
  rating, bio, avatar}`. Booking consumes one session from `CommerceService`'s entitlements (added
  `consumeSession()`/`refundSession()` there); cancel refunds it. Routes: `/care`, `/care/:id`
  (`verifiedGuard`), `/care/bookings` (`authGuard`). **Not built**: provider portal, admin console —
  see roadmap Phase 3 for why (no real provider-identity link exists to build either against).
- **Phase 4 (Records)** — new `RecordsService`, `records.models.ts`. **Read this carefully**: it
  never reads or stores actual file content, only metadata (`{id, name, category, mimeType,
  sizeBytes, uploadedAt}`) — faking secure storage for health documents client-side would be
  misleading, so don't take this page's existence as satisfying the real encrypted-storage/signed-URL
  requirement. `RecordShare: {id, recordId, sharedWithLabel, createdAt, expiresAt, revokedAt}`.
  `AccessLogEntry: {id, recordId, recordName, action: UPLOAD|VIEW|DOWNLOAD|SHARE|DELETE, at, detail?}`.
  Routes: `/records`, `/records/access-log` (both `authGuard`).
- **Phase 5 (Reminders)** — new `NotificationService`, `notification.models.ts`.
  `Reminder: {id, title, body, source: NEXT_ACTION|BOOKING, dueAt, read, dismissed}`, generated from
  the dashboard's `nextActions` and Phase 3 bookings — not fetched from anywhere. Bell icon in the
  navbar. `NotificationPreferences: {inApp, email, sms, whatsapp}` in Profile — preferences only, no
  channel adapters exist, nothing is actually sent.
- **Phase 6, partial**: `ChildService`/`child.models.ts` (`/child`) with a standard reference
  vaccine schedule marked pending clinical review, same convention as `nextActions`.
  `ReferralService` generates a referral code when a hospital tour is requested via
  `checklists.component.ts`. Product recommendations rework, Joy Circle, AI plan, regional
  languages, and capacity forecasting were deliberately not attempted — see roadmap Phase 6 for the
  reasoning on each (not uniform — some are pure scope, one is a governance call).
- **Phase 7 (real payments) was deliberately not attempted at all** — unlike everything above, this
  is real money and merchant/gateway decisions the product owner hasn't made, not a feature that's
  safe to simulate further than Phase 2's checkout already does.

Feature flags flipped on to match what's actually built: `careBooking`, `recordsVault`,
`childTracker`. Left off: `productRecommendations`, `legacyLeadForms`, `joyCircle`, `aiAssistant` —
none of those have real UI behind them yet (joyCircle is declared but unwired).

## 16. Phase 2 reconciled against the real contract (2026-10-29)

Your §8 contract replaced the §14 mock entirely. `CommerceService` now calls the real endpoints:
`GET /plans`, `GET /plans/{id}`, `POST /orders` (fresh `Idempotency-Key` per checkout attempt,
reused on retries, regenerated after a failed payment), `POST /payments/create`, the returned
`mockSucceedPath`/`mockFailPath`, `GET /orders/{id}`, `GET /entitlements`. No price is sent from
the client anywhere. Checkout is now two explicit steps — review → **Confirm order** (shows your
server-calculated `price` and installment schedule) → simulated pay — so the user sees the
server's total before paying, per the roadmap.

- Plans page shows your real per-professional `allocations` as chips, `installmentCount`, and
  `validityDays`, under a "provisional, may change" notice matching your placeholder caveat.
- Receipt (`/orders/:id`) shows the order plus the entitlements it granted (filtered by `orderId`).
- Journey wallet lists real entitlements **per professional type** — the thing I previously
  refused to invent now comes from you.
- Phase 3 booking mock spends a session from the matching `professionalType` entitlement. Since
  your entitlements always report `usedSessions: 0` until your Phase 3, that spend is a per-user
  localStorage overlay subtracted from `remainingSessions`; cancel refunds it. Delete the overlay
  in `CommerceService` once you consume sessions server-side.
- Taglines/"Most Popular" badges are UI-only presentation copy keyed by plan `code`.

**Verified live** against your running `firebase-setup` build: plan fields, 404 on an unknown
plan, `[]` entitlements for a new user, 403 `EMAIL_NOT_VERIFIED` on orders/payments for an
unverified user. **Not verified live:** the paid path (order → pay → PAID → entitlements),
because it needs an email-verified test account I couldn't create without your admin key.

**Bug found (sent to you directly):** `CorsConfig.java:27` only allows
`Authorization, Content-Type, Accept`, so the browser preflight rejects `Idempotency-Key` and
**every `POST /orders` from the UI is blocked**. Add `Idempotency-Key` to the allowed headers. **Fixed in f347201 and preflight re-verified.**

## 17. Phase 3 reconciled against the real contract (2026-10-29)

Your §9 contract replaced the §15 provider/booking mock. `ProviderService` now calls
`GET /providers` (server-side `professionalType`/`city`/`language`/`modality` filters),
`GET /providers/{id}`, `GET /providers/{id}/slots`, `POST /bookings`, `GET /bookings`,
`/cancel`, `/reschedule`, `/no-show` (party `PROVIDER` only — a user can't report their own
side) and `/feedback` (after `COMPLETED`, once). Start/complete/note never appear in the user
UI — they're provider/admin actions. Cancel, reschedule and no-show require a reason (your
`@NotBlank`s), so the UI asks for one.

- **`services` gap — fixed by you in dc8c0c7.** `POST /bookings` needed a `serviceOfferingId`
  nothing public exposed; you added `services` to the provider response. Providers with
  `services: []` show "not taking online bookings yet".
- **Local session overlay deleted.** Booking no longer spends anything client-side;
  `remainingSessions` from `GET /entitlements` is authoritative and only drops on completion.
- Booking responses carry `providerId` only, so `/care/bookings` maps names from the public
  directory. `/care/bookings` is now behind `verifiedGuard`, since `GET /bookings` is verified-only.

**Verified live (real Firebase verification):** empty directory and filters return `[]`,
unknown provider 404, unauthenticated `GET /bookings` 401, and 403 `EMAIL_NOT_VERIFIED` on
`POST /bookings`, `GET /bookings`, `POST /orders` and `PATCH /me` for an unverified user.
**Not verified live:** an actual booking. Stage has zero providers, and onboarding one needs
an admin account neither of us has.

**My mistake, logged so it doesn't confuse anyone later:** from ~07:43 to ~08:25 on 2026-10-29
I ran your API from a `git archive` export, which omits the gitignored
`firebase-service-account.json`, so it ran in your DEV BYPASS mode (every token treated as
a pre-verified fake dev user). A test during that window created a stray `PENDING` order in
the stage DB under that dev user — safe to delete. Now running from your real working tree
with real credentials.

## 9. Open requests to the API agent

*(Running list — mark resolved items with ✅ and a date rather than deleting them, so the history stays visible.)*

- ✅ **2026-10-28** — `firstName`/`lastName` auto-populated on first signup (Google display name / email-derived guess). Confirmed working, see §3.
- ✅ **2026-10-28** — Phase 0/1 contract: `/me`, Consent (1.1), Journey (1.2), Dashboard (1.3) are all live and the UI is built against them and verified end-to-end against a live run, see §10-12. Nothing open from Phase 1.
- ✅ **2026-10-29** — Phase 2 contract shipped and the UI is reconciled against it, see §16.
- ✅ **2026-10-29** — CORS now allows `Idempotency-Key` (API commit f347201); preflight from localhost:4200 confirmed.
- ✅ **2026-10-29** — Phase 3 contract shipped and the UI is reconciled against it, including the `services` field you added in dc8c0c7. See §17.
- 🔵 **2026-10-28** — Phases 4-6 contracts (see §15) needed to reconcile the UI's self-mocked Providers/booking, Records, Reminders, and Child/vaccination implementations. Phase 7 is intentionally not mocked at all — real decisions needed first (see roadmap).
