# API Integration Notes — NartureBelle UI

The UI-side counterpart to `NB-Ecomm-API/UI_INTEGRATION_GUIDE.md`. That file tells the UI how the backend behaves; this one tells the API agent how the UI actually consumes it, what it assumes, and what it's asking for. Treat this as a living two-way channel — update it from either side when something changes, same as the other file.

## 0. Start here — current state (updated 2026-10-30)

**If you only read one section, read this one.** The sections below are a dated history; where an older section
disagrees with this one, this one wins.

**UI stage: Phase 6 integration (2026-10-30).** All phases 0–6 are built in the UI against your real endpoints.
Phase 7 is blocked on product-owner decisions. The roadmap's "Where we are now" table has the per-phase status.

**Live check of :8080 (2026-10-30, unauthenticated):**
- Responding: `/features`, `/plans` (3), `/products` (15), `/checklists` (9), `/hospitals` (5), `/doctor-sessions` (3),
  `/joy-circle/events` (3), `/consent-documents/current`. Every `/me/**` route and `/records` return 401 without a token, as expected.
- **It is still the old jar.** `/consent-documents/current` has no `RECORDS_STORAGE` and no `required` field,
  `/nurse-companion/packages` still returns 500, and there's no `Access-Control-Expose-Headers`. Until it's restarted from the latest
  `firebase-setup`, **Records uploads are blocked in the UI**, because the page waits for the `RECORDS_STORAGE` agreement.
- `/providers` returns `[]`, so the care-team directory is empty and no booking can be made. There's no admin endpoint for adding providers yet.

**Where things run (local):**
- API: `http://localhost:8080/api/v1`. The UI is built against this. Start the API with `PORT=8080`, because `application.yml` still defaults to 8085.
  An old API build (5af528d) may still be listening on 8085; nothing uses it.
- UI: `http://localhost:4200`, served with the **production** Angular config (`ng serve -c production`). The Firebase project is
  `narturebelle-5ae7a`. No `.env.production` exists yet, so the prod environment file is generated from the staging values.

**No dummy data in the UI any more (product-owner request, 2026-10-30).** Every screen reads from your API. If a call fails,
the user sees an error. The UI no longer substitutes seed data or fakes success, and it never fakes a login. So:
- **API outages and 5xx errors are now visible to users.** Nothing hides them any more.
- **Seed rows in your DB are what users see.** Products, checklists, hospitals, doctor sessions and Joy Circle events
  all come from your seed data. Where seed content is a placeholder, please mark it in the data itself
  (as Joy Circle's `hostBio` already does), because the UI shows it as-is.
- Only two things are still simulated, each labelled on screen: the plan payment (your `mockSucceedPath`/`mockFailPath`)
  and the product basket (no ordering endpoint). The Records storage agreement now uses your `RECORDS_STORAGE` consent (UI 2026-10-30).
  §24 has the full table of which endpoint each screen calls.

**Phase 6 status:**

| Item | API (on 8080) | UI | Flag |
|---|---|---|---|
| 6.1 Child + vaccines | Shipped (2a4601a) | Built against it, not yet verified with a signed-in user | `childTracker` off |
| 6.2 Hospital referrals | Shipped (9999f26); status is `REQUESTED`/`CONFIRMED` only, applied in UI bca5333 | Built against it, not yet verified with a signed-in user | none (Checkup Checklist page) |
| 6.3 Joy Circle | Committed (848ac87). The 8080 jar has the public events list | Built against it | `joyCircle` off |
| 6.4 Product recommendations | Committed (848ac87), **not running yet**: the 8080 jar is old and needs a rebuild + restart | Built against the contract | `productRecommendations` off |
| 6.5 Export + deletion request | Committed (848ac87), **not running yet** (same rebuild needed). No consent required | Built against the contract, including `DELETION_NOT_CANCELLABLE` / `DELETION_REQUEST_NOT_FOUND` handling (UI 2026-10-30) | none (Profile page) |

**Prod profile no longer seeds sample data (API, 2026-10-30).** On a fresh prod DB, products, hospitals, checklists,
doctor sessions, onboarding call slots and Joy Circle events all start empty. Every one of those screens has an empty state:
- the checklist, hospitals and doctor-session lists say nothing is published yet
- onboarding falls back to "Ask for a call"
- Joy Circle and recommendations say there's nothing yet

Content has to come from admin tooling (you're adding admin CRUD next).

**What the UI needs from you, in priority order:**
1. **Rebuild and restart the API on 8080 from `firebase-setup`** (848ac87 + 0cd5f32). Until then 6.4, 6.5 and the
   nurse-packages fix aren't live and the UI can't verify them.
2. ~~Expose `Content-Disposition` in CORS~~. Done in 2fa71d8 (live after the rebuild). The UI reads the filename and falls back to the same pattern.
3. ~~Records-storage consent type~~. Done in 43c0d60. **The UI now uses it** (live after the rebuild):
   - The Records page reads the grant from `GET /me/consents`.
   - It shows the `RECORDS_STORAGE` document text and grants it with `POST /me/consents {documentType:"RECORDS_STORAGE", documentVersion}`.
   - The old browser flag is deleted, so users who agreed in the browser are asked once more.
   - If an upload gets 403 `CONSENT_REQUIRED` with `pending:["RECORDS_STORAGE"]`, the page asks again. It doesn't redirect.
   - The global interceptor only redirects to the sign-up consent step when `pending` has something other than `RECORDS_STORAGE`.
   - The sign-up consent step only shows documents with `required !== false`.
   - Profile → Consents lists all three documents with grant/revoke.
4. ~~`GET /nurse-companion/packages` returns 500~~. Fixed in 0cd5f32 (live after the rebuild).
4. When an item ships, note it in `UI_INTEGRATION_GUIDE.md` (or message the UI session). The UI then verifies it with a
   signed-in test user. **Feature flags are the product owner's call:** don't flip `childTracker`/`joyCircle`/`productRecommendations` on your own.

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
Defaults to `http://localhost:4200`, pointed at `http://localhost:8080/api/v1` (start the API with `PORT=8080`; its own default is 8085). `.env.staging.example` is already filled in with the real Firebase web config — no secrets to request, per your own note that these values are safe to ship client-side.

**Changed 2026-10-30:** the client-only mock sign-in mode (fake Google user, OTP `123456`) has been **removed**. A build
without a real Firebase config (plain `npm start`) now shows "Sign-in isn't available: this build has no Firebase configuration"
instead of faking a session. Use the staging or production config to sign in.

## 5. Known UI-side gaps — don't assume these exist yet

- **No product-ordering API, so the product basket is a labelled demo.** The cart is a client-only drawer (`ApiService.cart` signal).
  Since 2026-10-30 it shows a "Demo" banner and a "Place demo order (nothing is charged)" button, and nothing is sent to the API.
  If you ever add product orders, tell us and the basket will switch over. (Plan checkout is different: it uses the real `/orders` + `/payments`.)
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

## 18. Post-signup onboarding flow (2026-10-29) — new product-owner requirement, needs API

The product owner changed the flow: after sign-up + consent, every user now completes a guided
onboarding before the app unlocks (`/journey`, booking, records and child are behind an
`onboardingGuard`):

1. **Your details** — stage, EDD (required for pregnancy/pre-delivery), first pregnancy,
   multiples, risk factors (high BP, diabetes, thyroid, previous C-section, previous
   complications), support wanted, city, language, virtual/in-person, phone, notes.
2. **Recommended plan** — transparent rule-based suggestion from those answers (shown with its
   reasons, labelled "not medical advice"); the user can pick any plan.
3. **Payment** — your real `/orders` + `/payments` flow; checkout returns to onboarding.
4. **Onboarding call** — user picks a day/time slot with a care coordinator.
5. **Onboarding documents** — Care Coordination Agreement, Virtual Consultation Consent,
   Emergency Care Acknowledgement (DRAFT text, pending legal review); typed-name e-signature.
6. **Welcome** → onboarding complete → app unlocks.

**What's real today:** stage + EDD write to your Journey API (create, or PATCH the active
journey); plans, payment and the "already paid" check use `/plans` and `/orders`.

**What's client-side until you ship it** (per-user localStorage, `OnboardingService`): the
extra intake answers (including the risk-factor health data — please prioritise moving these
server-side), the call booking, the document signature, and the completion flag. Proposed
contract — tell me if you'd shape it differently:

```
GET  /api/v1/me/onboarding                 -> { step, intake?, call?, documents?, completedAt? }
PUT  /api/v1/me/onboarding/intake          { ...the step-1 fields above }
GET  /api/v1/onboarding/call-slots         -> [{ id, startAt, endAt }]  (care-coordinator availability)
POST /api/v1/me/onboarding/call            { slotId, phone }
GET  /api/v1/me/onboarding/documents       -> [{ id, title, version, bodyMarkdown }]
POST /api/v1/me/onboarding/documents/sign  { documentIds[], signedName }  -> also emails signed copies
POST /api/v1/me/onboarding/complete        (or set server-side when the coordinator confirms)
```

Emailing the onboarding papers needs your email/notification service (roadmap Phase 5); the UI
currently tells users email delivery is coming soon rather than claiming it was sent. **Decided by the product
owner (2026-10-29):** "onboarded" is set when the user finishes the steps (signs the documents) —
no coordinator confirmation step. `POST /me/onboarding/complete` from the user is the right shape.

## 19. Phase 4 reconciled against the real contract (2026-10-29)

Your §10 contract replaced the metadata-only mock. `RecordsService` now does the two-call upload
(`POST /records/upload-url` → `PUT` the raw bytes to the signed Supabase URL, appending `token`
if it isn't already in the URL → `POST /records`), list, `GET /records/{id}` (called only when the
user opens a record, so it's a real audited VIEW), category `PATCH`, soft `DELETE`,
`download-url` (opened in a new tab), provider- or booking-scoped shares with an expiry
(1–180 days, sent as a zone-less local `LocalDateTime`), revoke, and per-record access logs.
The upload `PUT` goes straight to storage and never carries our Firebase token, because the
interceptor only attaches it to `environment.apiUrl`.

- `/records`: a storage-consent step, then upload, an expandable row per record (download,
  change category, delete with confirmation, shares + a share form that says "this document
  only"), and an honest **"Not scanned yet"** badge driven by your `scanStatus`.
- `/records/access-log`: merges every record's `GET /records/{id}/access-log` into one timeline,
  with `actorRelationship` shown in words ("by you", "by a professional you shared it with").
  Deleted records drop out of `GET /records`, so their history isn't listed, and the page says so.
- Rename isn't offered any more, since `PATCH` only accepts `category`.
- Upload/download failures caused by storage not being configured yet show "secure storage is
  still being set up" rather than a raw error.

**Verified live** (your 0c34458 build, real Firebase verification): 401 unauthenticated,
`GET /records` → `[]` for a new user, 403 `EMAIL_NOT_VERIFIED` on `upload-url` for an
unverified user, and CORS preflights for POST/PATCH/DELETE from localhost:4200.
**Not verified:** a real upload or download — `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
aren't configured, as you noted, and testing it would also need an email-verified account.

## 20. Onboarding Part A reconciled (2026-10-29)

Your §11 (commits 7d08f52, e6a1ebd) replaced the browser-only intake and call steps.

- **Intake:** stage + EDD still go to the Journey API. Everything else goes to
  `PUT /me/onboarding/intake` as a full upsert on every save. Mapping: `supportNeeds` →
  `supportWanted` (same enum strings), `consultationMode` `VIRTUAL`→`VIRTUAL`,
  `IN_PERSON`→`PHYSICAL`, `EITHER`→`null`. Empty strings are sent as `null`.
- **Health answers are no longer stored in the browser.** `/onboarding` calls
  `GET /me/onboarding` (plus the active journey) every time it opens. Intake answers saved by the
  old browser-only version are pushed up once, then deleted from localStorage.
- **Call:** real `GET /onboarding/call-slots` grouped by local day →
  `POST /me/onboarding/call {slotId}`. `ONBOARDING_CALL_SLOT_NOT_AVAILABLE` reloads the slots
  with a "that time was just taken" message, and `ONBOARDING_CALL_ALREADY_BOOKED` re-syncs.
- **Fallback when there are no slots** (which is the case on stage today): "Ask for a call". The care
  coordinator calls the user on their intake phone number. This is a **browser-only flag**
  (`callRequested`) for now, and nothing reaches the server. To make it real, either seed slots or
  add something like `POST /me/onboarding/callback-request` so coordinators can see the request.
- Plan choice, payment (read from `GET /orders`), document signing and `onboardedAt` are still
  in the browser until Part B ships. If `GET /me/onboarding` returns a `completedAt`, the UI
  takes it as the onboarded state.

**Verified live** (your e6a1ebd build, real Firebase verification, throwaway user, deleted
afterwards): 403 `CONSENT_REQUIRED` with `pending` before consent; 200 empty status after
consent; `PUT` intake create + replace (including `preferredModality: null`); status read-back;
`call-slots` → `[]`; 409 `ONBOARDING_CALL_SLOT_NOT_AVAILABLE` for a bogus slot; CORS preflight
for PUT from localhost:4200. **Not verified:** a successful call booking, because there are no slots.
The throwaway user's intake row is still in the stage DB.

## 21. Phase 5 + onboarding follow-ups reconciled (2026-10-29)

- **Reminders:** the client-generated reminder store has been removed, and the old localStorage keys are
  deleted on next load. The navbar bell reads `GET /me/reminders` once the user is onboarded and
  whenever it's opened. Dismiss calls `POST /me/reminders/{id}/dismiss`, optimistically, and rolls
  back on error. The API has no "read" flag, so the unread badge is driven by a per-browser
  list of **reminder ids only** (no text), pruned to active ids. Journey and Bookings no longer
  generate reminders.
- **Channel preferences:** Profile reads `GET /me/notification-preferences` and saves each
  toggle with `PUT /me/notification-preferences/{channel}`. Email/SMS/WhatsApp are labelled
  "not connected yet", with copy saying no messages are sent on them.
- **"Ask for a call"** now calls `POST /me/onboarding/callback-request`. The stepper reads
  `callbackRequestedAt` from `GET /me/onboarding` (added in 5af528d), so nothing about it is kept in
  the browser any more. Verified live: `null` before the request, a timestamp after it.

**Verified live** (your c8e3db8 build, real Firebase, throwaway user, deleted afterwards):
reminders `[]`, 404 on dismissing an unknown id, preference defaults and both PUTs
read back, 10 seeded call slots, callback-request 200, call booking 200 then 409
`ONBOARDING_CALL_ALREADY_BOOKED`, status read-back includes the call, and CORS preflights for PUT/POST.
Side effect: the test booking took the last seeded slot (12 Nov 10:00) on stage.
**Not verified:** a reminder actually appearing. That needs a booking in the next 24h or a
consented journey with pending actions, plus a scheduler tick.

## 22. Onboarding Part B reconciled (2026-10-29)

Against API commits c12ad24/4d5b6e5 (UI_INTEGRATION_GUIDE.md §11). The whole onboarding flow is now
server-backed. Only the plan recommendation and the remembered plan choice stay in the browser.

- **Documents:** the hard-coded `ONBOARDING_DOCUMENTS` are gone. The documents step loads
  `GET /me/onboarding/documents` and shows `bodyMarkdown` as plain text (line breaks kept) with a
  "drafts pending legal review" note. One typed name and one checkbox sign every unsigned document,
  one `POST /me/onboarding/documents/sign` each, in sequence. Signing is idempotent, so if a call
  fails partway the UI reloads the list and a retry only sends the documents still unsigned.
  Copy says "a copy … will be emailed to you", because email is still a NoOp.
- **Step logic:** the step after the call uses `documentsSigned` from `GET /me/onboarding`.
- **Completion:** "Go to my journey" calls `POST /me/onboarding/complete`. On 409
  `ONBOARDING_INCOMPLETE` the UI lists `missingSteps` and re-syncs, so the stepper goes back to the
  first unfinished step.
- **Server is authoritative for `completedAt`.** It is still cached in localStorage so guards can
  answer immediately. But the first guarded navigation of each session (`onboardingGuard`,
  `landingGuard`) runs `sync()`, which overwrites the cache with the server value. Users who
  "completed" in the browser-only version before Part B are sent back to sign the real documents.

**Not verified live yet.** Only `ng build` was run. No stage run with a throwaway user.

## 23. Phase 6 built against the planned contract (2026-10-29)

Built from the planned contract that nb-ecomm-api-a5 sent on 29 Oct (field names firm unless they say otherwise).

> **Update 2026-10-30:** 6.1 child+vaccines (2a4601a), 6.2 referrals (9999f26) and 6.3 Joy Circle now run on
> `localhost:8080`. Public `GET /joy-circle/events` matches the contract field for field. All `/me/**` calls return 401 without a token,
> as expected. The one contract change (referral `status` has no `CANCELLED`; `note` allows up to 1000 chars) is applied in UI bca5333.
> Signed-in flows aren't verified yet. 6.4 recommendations and 6.5 export/deletion aren't on the API yet. See §0.

| Area | UI | Endpoints used |
|---|---|---|
| Child + vaccines | `/child`: add a child (name, DOB, optional sex), schedule per child with `dueAgeLabel`/`dueDate` and the server's `status` badge (Overdue / Due soon / Upcoming), tick to mark given (today) or untick | `GET/POST /me/children`, `GET /me/children/{id}/vaccinations`, `PUT`/`DELETE .../vaccinations/{scheduleItemId}` |
| Hospital referrals | Hospital tour request on `/checklists` now creates a real referral and shows its `NB-` code. Name, phone and stage go in `note`, so the hospital can call back. Signed-out users go to sign-in first. | `POST /me/hospital-referrals` |
| Joy Circle | New `/joy-circle` page with upcoming events, category chips, spots left, "I'll be there", a "You're going" list with `joinUrl`, and "Can't make it". Handles `EVENT_FULL`/`EVENT_NOT_OPEN`. The "not medical care" notice and each event's `disclaimer` are shown. | `GET /joy-circle/events`, `GET /me/joy-circle/rsvps`, `POST`/`DELETE /joy-circle/events/{id}/rsvp` |
| Product recommendations | New `/recommendations` page. Category and budget chips map to the `category`/`maxPrice` params. Each product card shows `whyRecommended`. The server's `commissionDisclosure` and a "not medical advice" line are shown. "Not for me" dismisses an item; "Show them again" restores all. | `GET /me/product-recommendations?includeDismissed=true`, `POST`/`DELETE .../{productId}/dismiss` |
| Export + deletion | Profile → Your Data: server JSON export, "Ask to delete my account" (type DELETE), its status, and cancel while it's still REQUESTED. The copy says requests are handled by hand and nothing is erased automatically. "Clear this device" is kept as a separate action. | `GET /me/export`, `GET/POST/DELETE /me/deletion-request` |

Other changes:
- **Store framing retired.** The Month 3/6/9 pages and `ProductCardComponent` are deleted, and `/products/*` redirects to
  `/recommendations`. The navbar pills are gone, and the cart shows the category instead of "Must-Have"/"Optional".
- **Browser-only data is migrated once.** Children and given vaccines from the old browser-only tracker are POSTed
  (vaccines matched by name), but only if the server has no children yet. Then they're cleared from localStorage.
  Old browser-only referral codes aren't migrated, because they were never real.
- **Flags.** `/child`, `/joy-circle` and `/recommendations` each sit behind their flag (`childTracker`, `joyCircle`,
  `productRecommendations`) plus `onboardingGuard`. The API seeds all three off and won't flip them. They should be turned on
  once each area is verified live, as a product-owner call. Note that `childTracker` is already off on the API, so the
  child page is hidden live today.

## 24. Where every screen gets its data (2026-10-30)

**No built-in dummy data is left in the UI.** The silent fallbacks in `api.service.ts` are removed: dummy
products, checklists, hospitals, nurse packages and doctor sessions, the fake "success" for nurse bookings and
doctor RSVPs, and the fake "Verified Expecting Mother" login when the API was unreachable. So are the simulated
Firebase sign-ins (fake tokens and OTP `123456`). If the API or Firebase is unavailable, the screen now shows an error.

**Real API** (base `http://localhost:8080/api/v1`):

| Screen | Endpoints |
|---|---|
| Sign-in / session | `POST /auth/firebase`, `GET`/`PATCH /me` (Firebase ID token as Bearer) |
| Feature flags | `GET /features` |
| Consent | `GET /consent-documents/current`, `GET`/`POST /me/consents`, `POST /me/consents/{type}/revoke` |
| Onboarding | `GET /me/onboarding`, `PUT /me/onboarding/intake`, `GET /onboarding/call-slots`, `POST /me/onboarding/call`, `POST /me/onboarding/callback-request`, `GET /me/onboarding/documents`, `POST /me/onboarding/documents/sign`, `POST /me/onboarding/complete` |
| My Journey | `GET`/`POST /me/journeys`, `PATCH /me/journeys/{id}`, `GET /me/dashboard`, `GET /me/reminders`, `POST /me/reminders/{id}/dismiss` |
| Plans & checkout | `GET /plans`, `GET /plans/{id}`, `POST`/`GET /orders`, `GET /orders/{id}`, `POST /payments/create`, `GET /entitlements` |
| Care team & bookings | `GET /providers`, `GET /providers/{id}`, `GET /providers/{id}/slots`, `POST`/`GET /bookings`, `POST /bookings/{id}/cancel`, `/reschedule`, `/no-show`, `/feedback` |
| Records | `GET`/`POST /records`, `GET`/`PATCH`/`DELETE /records/{id}`, `POST /records/upload-url` (then a direct PUT to storage), `POST /records/{id}/download-url`, `GET`/`POST /records/{id}/shares`, `POST /records/shares/{id}/revoke`, `GET /records/{id}/access-log` |
| Profile | `GET`/`PUT /me/notification-preferences/{channel}`, `GET /me/export`, `GET`/`POST`/`DELETE /me/deletion-request` |
| Checkup checklist | `GET /checklists`, `GET /hospitals`, `POST /me/hospital-referrals` |
| Child & vaccines | `GET`/`POST /me/children`, `PATCH /me/children/{id}`, `GET /me/children/{id}/vaccinations`, `PUT`/`DELETE …/vaccinations/{scheduleItemId}` |
| Joy Circle | `GET /joy-circle/events`, `GET /me/joy-circle/rsvps`, `POST`/`DELETE /joy-circle/events/{id}/rsvp` |
| Recommendations | `GET /me/product-recommendations`, `POST`/`DELETE …/{productId}/dismiss` |
| Hidden legacy pages (`legacyLeadForms` off) | `GET /nurse-companion/packages` (500 on the API today), `POST /nurse-companion/book`, `GET /doctor-sessions`, `POST /doctor-sessions/rsvp` |

**Still simulated or kept only on this device. Each is labelled on screen:**

| What | Why | Label in the UI |
|---|---|---|
| Plan payment | The API's own mock gateway (`mockSucceedPath`/`mockFailPath`) until Phase 7 | "Demo payment" badge + "nothing is charged" |
| Product basket / cart checkout | No product-ordering endpoint exists | "Demo" banner. The button says "Place demo order (nothing is charged)". No shipping or security claims. |
| Plan recommendation during onboarding | Client-side rule by design (decided with the API) | Already says it's a suggestion, not a clinical judgement |

Seeded content that comes from the real API but is still a placeholder (labelled where the API marks it): consent and
onboarding documents (DRAFT, pending legal review), the vaccine schedule (PENDING_CLINICAL_REVIEW), Joy Circle events
(the API's hostBio says "Placeholder host"), doctor sessions, products, checklists and hospitals (seed rows in the API DB).

## 25. Languages, matching, coordinators, health profile — built against the planned contract (2026-10-30)

Built from the planned contract nb-ecomm-api-a5 sent on 2026-10-30, parts A–D. **Not verified live**, because none of it is on :8080 yet.
Everything degrades cleanly on the current API, so nothing breaks before it ships.

| Part | UI | Calls |
|---|---|---|
| A. Languages | The intake's single "Preferred language" box is now a multi-select (12 common Indian languages + "Another language"). At least 1 is required. Sends `languages:[...]` **and** `language` (= first) so older APIs still work. Reads `languages`, falling back to `[language]`. | `PUT /me/onboarding/intake` |
| A. Matching | Care page: picking a professional type (signed-in, onboarded users) shows **"Best matches for you"** above the directory, with `matchReasons` and the next slot. "Virtual only" sends `modality=VIRTUAL`, otherwise modality is left to your default (intake preference). 409 `MATCH_PROFILE_INCOMPLETE` → "tell us your languages". Empty `matches` → "no one who speaks your language has an open time" plus the full directory. Any other error, e.g. 404 on today's API → the section is simply hidden. | `GET /me/care/matches?professionalType=&modality=` |
| B. Coordinators | Call step: each time chip shows "with <name>", and picking one shows a coordinator card (photo or initial, "Speaks …"). The welcome summary and the My Journey call card show the coordinator's name and languages. `coordinator: null` is fine. No slots (e.g. none in the user's languages) → the existing "Ask for a call" fallback. | `GET /onboarding/call-slots`, `POST /me/onboarding/call`, `GET /me/onboarding` |
| C. Health profile | First pregnancy, multiples and risk factors are now a separate **"Health details (optional)"** box. **If `/consent-documents/current` has `HEALTH_DATA`**, the box asks for the agreement first (with the document text). The questions only show once it's ticked or already granted. On save: intake **without** health fields → `POST /me/consents {HEALTH_DATA, version}` if needed → `PUT /me/health-profile`. Declined → health answers are not sent at all. **If `HEALTH_DATA` doesn't exist** (today's API), the questions show as before and go on the intake, unchanged. Reads: `GET /me/health-profile` when granted (404 → none), else the old intake fields. | `GET /consent-documents/current`, `GET /me/consents`, `POST /me/consents`, `GET`/`PUT /me/health-profile` |
| D. Health-aware recommendations | No UI change. The response shape is unchanged and `whyRecommended` reasons are shown as-is. | — |

Other: the 403 interceptor treats `HEALTH_DATA` like `RECORDS_STORAGE` (an optional consent, so no redirect to the sign-up consent step).
Profile → Consents lists `HEALTH_DATA` automatically with grant/revoke. **Not built yet:** viewing or editing the health profile from Profile
after onboarding (it's only editable through "Edit my details" during onboarding). Say if you want that.

## 26. Health-rule review (Part D) and the professional portal (2026-10-30)

**Product-owner decisions (2026-10-30):**
- Health rules are approved **once per rule**. Approvers are MEDICAL_REVIEWER staff or verified GYNECOLOGIST / NUTRITIONIST / REGISTERED_NURSE providers.
- **Build the professional portal**, where professionals see the mother's stage and health details and pick products labelled Essential / Optional
  that appear on her account after the session.
- The **HEALTH_DATA consent text must say her care professionals can see her health details**, as a new version that mothers re-confirm.

**Part D review screen: built against the final contract (API 88879af).** `/review/health-rules` (guard: MEDICAL_REVIEWER or a professional
role; the API also requires VERIFIED/ACTIVE). It has tabs for the pending queue, Approved and Rejected; approve; reject with a reason; and shows
who reviewed each rule and their role. 409 `RULE_SELF_REVIEW_NOT_ALLOWED` / `RULE_ALREADY_REVIEWED` and 404 `PRODUCT_HEALTH_RULE_NOT_FOUND` are explained.
There's no UI for creating rules yet (admins use the API); say if you want one.

**Professional portal: reconciled with the final contract (API 30c56a9).** The proposed shapes stood. The UI also follows these rules from the final contract:
- Picks are editable only while `IN_PROGRESS` and for 48h after `COMPLETED`. Before the session starts it shows "Start the session to recommend products".
  On 409 `SESSION_RECOMMENDATIONS_CLOSED` the picker locks. "Complete" is offered only once the session is `IN_PROGRESS`.
- Max 30 picks per session.
- With no v2 `HEALTH_DATA` grant, `healthProfile` is null and `avoided` is `[]`. The page explains that health rules weren't applied.
- `GET /provider/bookings` 403 → "your professional account isn't verified yet".
- The mother's list keeps the API's order: newest session first, Essential first.
- `/provider`: the professional's sessions (`GET /provider/bookings`, `GET /provider/me`).
- `/provider/sessions/:id`:
  - mother's stage and health details (`GET /provider/bookings/{id}/product-suggestions`; a null `healthProfile` shows "hasn't shared")
  - Start session (existing `POST /bookings/{id}/start`)
  - pick products with Essential / Optional and a note (`GET`/`PUT /provider/bookings/{id}/product-recommendations`), with the rule-hidden products listed
  - "Save picks & complete" saves the picks, then calls the existing `POST /bookings/{id}/complete {note}`
- Mother: a **"From your care team"** section on My Journey and on `/recommendations` (`GET /me/care-recommendations`), with Essential first,
  "Recommended by <name>, <type>", the note, and Add to basket. It renders nothing if the endpoint is missing or the list is empty.
- Routing: users with a professional role land on `/provider` after sign-in. They're kept out of the mother's onboarding and journey,
  and see a "My sessions" / "Rule review" navbar.

**Consent fixes:**
- Profile → Consents now shows "Granted" only for an unrevoked grant of the document's **current version**. It used to infer this from `pending`,
  which never lists optional consents, so `RECORDS_STORAGE`/`HEALTH_DATA` always looked granted.
- Onboarding's `HEALTH_DATA` check is version-aware too. Once you publish the new consent text as a new version, mothers are asked again,
  and Profile shows it as "Not granted" with a Grant button.

## 27. Due-date-based plan pricing (2026-10-30)

Against API 70296dd (final contract). Not verified live, because it's waiting on the :8080 restart (V27).
- **Prices:** for signed-in users, `/plans`, the onboarding plan step and checkout use `GET /me/plans/quote`. It falls back to the
  public `/plans` list only on 404, i.e. an API without the endpoint. Visitors see the public 9-month list with "sign in and add your due date to pay
  only for the months you need".
- **Months shown:**
  - `DUE_DATE` basis → "Priced for N months until your due date", plus "₹X/month × N · full 9 months ₹Y" on each card, and a
    "Covers N months (until your due date)" row at checkout.
  - `FULL_PLAN` → "Full 9-month plans".
- **Checkout takes its plan from the quote,** so the price on screen is what `POST /orders` charges.
- **Lock warning:** checkout (when months < 9) and the onboarding plan step (`DUE_DATE` basis) say: "Your plan price is based on your due date. After you pay, the due date can only be changed by up to 3 weeks. For a bigger change, please contact support."
- **Due-date validation:** while pregnant, the date can't be in the past or more than 42 weeks ahead. This applies to the onboarding intake and the My Journey edit form (date picker `min`/`max` plus a message).
- **409 `DUE_DATE_LOCKED`:** on the journey edit and the onboarding intake save it shows the lock message above.

## 28. Careers, job applications and "Share an idea" (2026-10-30)

**Product-owner decisions:**
- Applications are delivered **through the API**: stored, then emailed with the résumé to `admin@narturebelle.com`.
- Roles are posted and closed from an **admin screen**.
- A **feedback / ideas form** goes to the same inbox.

**UI, built against the UI's PROPOSED contract (sent 2026-10-30). Waiting for final shapes:**
- `/careers` (public): open roles (`GET /careers/jobs`), plus a "Share an idea" prompt.
- `/careers/:id` (public): the role, then an application form sent as `multipart/form-data` to `POST /careers/jobs/{id}/applications`.
  - Fields: name, email, phone, city, LinkedIn, portfolio, years of experience, cover note, résumé (PDF/DOC/DOCX, max 5 MB, checked client-side too), privacy consent, and the `website` honeypot.
  - Handles 409 `JOB_CLOSED`, `RESUME_TOO_LARGE`/413, `RESUME_TYPE_NOT_ALLOWED`, 429 and `VALIDATION_FAILED`.
- `/feedback` (public): idea text (≤3000), optional 1–5 rating, optional name/email (pre-filled when signed in), `page` (= referrer) and the honeypot → `POST /feedback`.
- `/admin/careers` (`adminGuard`, any `*_ADMIN`):
  - list all roles with an applicant count
  - post and edit (requirements one per line)
  - close and reopen
  - view applicants, and open a résumé through a short-lived URL (`GET /admin/careers/applications/{id}/resume-url`)
- Links: Careers and "Share an idea" in the footer. A "Careers admin" navbar link for admins.

## 9. Open requests to the API agent

*(Running list — mark resolved items with ✅ and a date rather than deleting them, so the history stays visible.)*

- ✅ **2026-10-28** — `firstName`/`lastName` auto-populated on first signup (Google display name / email-derived guess). Confirmed working, see §3.
- ✅ **2026-10-28** — Phase 0/1 contract: `/me`, Consent (1.1), Journey (1.2), Dashboard (1.3) are all live and the UI is built against them and verified end-to-end against a live run, see §10-12. Nothing open from Phase 1.
- ✅ **2026-10-29** — Phase 2 contract shipped and the UI is reconciled against it, see §16.
- ✅ **2026-10-29** — CORS now allows `Idempotency-Key` (API commit f347201); preflight from localhost:4200 confirmed.
- ✅ **2026-10-29** — Phase 3 contract shipped and the UI is reconciled against it, including the `services` field you added in dc8c0c7. See §17.
- ✅ **2026-10-29** — Onboarding API (§18). Part A (intake + call slots) ✅ shipped and reconciled (§20). Slot seeding + callback-request ✅ (295705d, reconciled in §21). Part B (documents, e-sign, completion) ✅ c12ad24, reconciled in §22. Email delivery is still a NoOp on the API side.
- ✅ **2026-10-29** — Phase 5 contract shipped and the UI is reconciled against it (§21).
- ✅ **2026-10-29** — `careBooking` and `recordsVault` flags turned on (V14); `GET /features` confirmed. `callbackRequestedAt` added to the onboarding status and read by the UI.
- ✅ **2026-10-29** — Phase 4 contract shipped and the UI is reconciled against it (§19). Real uploads still need `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` configured.
- 🟡 **2026-10-30** — ✅ committed in API 0fe423d (prod included, rows labelled as sample); live after the :8080 restart. **Sample data in every list (product-owner request).** Seed providers (every professional type, a few cities/languages, VIRTUAL + PHYSICAL offerings, open slots), call slots with coordinators, Joy Circle events, BABY_CARE products, and any other list that can be empty, including under `prod`. Mark sample rows as sample in the data.
- 🟡 **2026-10-30** — Parts A–C committed (API 688c3a4 matching, 294b906 coordinators, 839a38c health profile + `HEALTH_DATA`), and the UI is built against them (§25). Live after the :8080 restart, then UI verification. **Part D ✅ shipped (88879af); UI review screen built (§26).** Go-ahead given 2026-10-30 with these product-owner decisions: rules are approved once (not per mother); approvers are MEDICAL_REVIEWER staff or verified (VERIFIED/ACTIVE) GYNECOLOGIST, NUTRITIONIST or REGISTERED_NURSE providers. The UI will add a review screen for approvers once the review endpoints are defined.
- ✅ **2026-10-30** — Professional portal shipped (API 30c56a9) and the UI is reconciled (§26). `HEALTH_DATA` v2 with care-team wording is live (V26). ~~Please send final shapes for `GET /provider/me`, `GET /provider/bookings`, `GET /provider/bookings/{id}/product-suggestions`, `GET`/`PUT /provider/bookings/{id}/product-recommendations` and `GET /me/care-recommendations`, plus a new `HEALTH_DATA` consent version whose text covers care-team access~~.
- 🟡 **2026-10-30** — **Careers + feedback (product owner):** jobs, applications with résumé upload, feedback; stored and emailed to admin@narturebelle.com via an email provider (account + SPF/DKIM DNS needed from the user). Please send final shapes (§28).
- 🟡 **2026-10-30** — The `/providers` enum-filter 500 is believed to be a stale-jar artefact (the jar was rebuilt under the running PID). It should clear on restart, and bad values are now 400 (f213f95). Re-check after the restart.
- 🔴 **2026-10-30** — **Bug:** `GET /providers?professionalType=…` and `?modality=…` return 500 `INTERNAL_ERROR` on :8080. The unfiltered list, `city` and `language` return 200. The Care page's type chips and "Virtual only" checkbox hit this and show "We couldn't load care professionals right now". Needs the API log (the catch-all handler logs the stack trace).
- ✅ **2026-10-30** — `RECORDS_STORAGE` consent type added (API 43c0d60) and the UI now grants and reads it (§0).
- ✅ **2026-10-30** — `GET /nurse-companion/packages` 500 fixed in API 0cd5f32 (live after the 8080 rebuild).
- ✅ **2026-10-30** — `Content-Disposition` exposed in CORS (API 2fa71d8).
- ℹ️ **2026-10-30** — Admin catalog CRUD (`/admin/hospitals|products|checklists`, API 05cffec) noted. **No admin UI yet.** Building one is a product-owner decision; until then, manage the catalog through the API or Swagger.
- 🟡 **2026-10-29** — Phase 6: planned contract received from nb-ecomm-api-a5, UI built against it (§23). 6.1-6.3 running on 8080 (2026-10-30). 6.4 and 6.5 committed in 848ac87. **Still open: rebuild/restart 8080 so they go live, then UI verification** (§0).
- ✅ **2026-10-30** — ~~Phases 5-6 contracts (see §15) needed to reconcile the UI's self-mocked implementations~~. Providers/booking, Records and Reminders are reconciled (§17, §19, §21), and Child/vaccination is built against the real contract (§23). No self-mocked feature data is left in the UI (§24). Phase 7 (real payments) is still blocked on product-owner decisions.
