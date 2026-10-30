# UI Brief — Phase 0 (Foundations) + Phase 1 (Registration, consent & journey)

**For:** the UI agent working in `NB-Ecomm-UI`.
**Context:** read `../NARTUREBELLE_ROADMAP.md` first. NartureBelle is a **care-coordination platform** (professional care packages, providers, records), not a product store. Products become personalised recommendations much later.
**Order:** step 0 can start now. The Phase 1 steps start once the API agent publishes the **"Phase 0/1 contract"** section in `../NB-Ecomm-API/UI_INTEGRATION_GUIDE.md`. Build against that contract, not against guesses.

## Product-owner decisions already made (do not change)
- **Firebase stays** (Google, email+password, phone).
- **Sign-up must stay minimal.** Do not ask for the pregnancy stage or due date during sign-up. The journey stage and the optional expected delivery date (EDD) are set in **Profile**.
- No payments in this phase.

## Rules
- Do not hard-code prices, session counts or clinical advice in templates. Content comes from the API.
- Any clinical next-action with `reviewStatus = PENDING_CLINICAL_REVIEW` shows a small "Draft — pending clinical review" label (in every environment until the content is approved).
- Use the existing interceptor, guards, signals and toast. Keep the current visual style.
- Never show health details in toasts, page titles or URLs.

---

## Step 0 — Commit what's already done
About 880 lines of finished sign-in, profile, verify-email, interceptor and environment work are uncommitted on `develop`. Commit them first (in logical commits), then branch `feature/phase-0-1`.

## Phase 0 — Foundations

**0.1 New navigation shell**
- Signed-in primary nav: **Home · My Journey · Care · Records · Child · Profile & Privacy**, plus **AI**, which shows only when its flag is on.
- Show **Care / Records / Child / AI** only when their flags (`careBooking`, `recordsVault`, `childTracker`, `aiAssistant`) are on. They're all off for now, so the real nav today is Home · My Journey · Profile & Privacy.
- Organise routes into lazy-loaded areas (`/journey`, `/profile`, later `/care`, `/records`, `/child`, `/provider`, `/admin`) so the provider and admin portals slot in later.
- Mobile menu: the same items.

**0.2 Reposition the public home page**
- Rewrite the landing page around the care-coordination message from blueprint §1:
  - professional-led, stage-aware care from pregnancy to postpartum, with child care up to 7
  - verified professionals
  - secure records
  - a "What NartureBelle is / is not" section (not emergency care, not a replacement for your doctor)
- Primary CTA: **Get started** → sign-up. **No prices on the home page** (plans arrive in Phase 2 from the API).

**0.3 Hide the store**
- Hide the Month 3/6/9 product pages, product cards, the cart drawer and the "Add to cart" buttons behind `productRecommendations` (off). The routes redirect home while it's off.
- Hide the assessment modal, lead forms, nurse-companion booking and doctor-live RSVP behind `legacyLeadForms` (off).
- **Hide; don't delete.** Later phases reuse this code.

**0.4 Use `/me`**
- Switch profile reads and writes to `GET/PATCH /api/v1/me` once the API ships them. Read `roles[]` instead of `role`, and update `adminGuard` to accept any `*_ADMIN` role.

**0.5 Show the full name**
- Navbar user menu and profile header: **First Last** (fall back to first name, then email). Phone-only users with no name: "Add your name" link → profile.

## Phase 1 — Registration, consent & journey

**1.1 Simplify sign-in/sign-up**
- Remove the pregnancy-stage pills from all login, sign-up and phone flows. Remove the `nb_pending_stage` localStorage workaround and the stage-sync-after-login code in `login.component.ts` and `verify-email.component.ts`.
- After any successful sign-in: `POST /auth/firebase` → `GET /me` → route:
  1. email unverified → `/auth/verify-email` (existing)
  2. `pendingConsents` not empty → `/onboarding/consent`
  3. otherwise → `returnUrl` or `/journey`

**1.2 Consent screen** (`/onboarding/consent`)
- Load `GET /consent-documents/current` and show Terms and Privacy (title, version, rendered markdown in a scrollable panel or expandable section).
- One required checkbox each, then **Continue**, which posts both with `POST /me/consents` and goes to `/journey`.
- `CONSENT_VERSION_OUTDATED` → reload the documents and show "Our terms were just updated, please review."
- Add a `consentGuard` on `/journey`, `/profile/journey` and future care areas. The interceptor also handles `403 CONSENT_REQUIRED` → `/onboarding/consent?returnUrl=...`.

**1.3 My Journey dashboard** (`/journey`)
- Data: `GET /me/dashboard`.
- Greeting with the first name.
- **`journeySetupRequired: true`** → a friendly "Set up your journey" card explaining why it helps (personalised next steps), with a button → `/profile/journey`. Make it clear that it's optional.
- **With a journey:**
  - a stage chip (e.g. "Pregnancy · Week 22 · 2nd trimester", where week and trimester appear only if the API returns them)
  - an "Upcoming care" timeline listing `nextActions` (professional type, title, description), with the draft label where required
  - an "Edit" link → `/profile/journey`
- Copy must make clear these are recommendations, not diagnoses. Late joiners never see earlier steps marked as done.

**1.4 Profile & Privacy** (`/profile`, tabbed or sectioned)
- **Personal details:** the existing form, switched to `PATCH /me`.
- **My Journey details** (`/profile/journey`):
  - journey stage select (Pregnancy, Preparing for delivery, Delivered, Postpartum recovery, Child care 0–7)
  - **optional** EDD date picker, shown for Pregnancy and Preparing for delivery, with "I don't know yet" allowed
  - no journey yet → `POST /me/journeys`; otherwise `PATCH /me/journeys/{id}`
  - handle `JOURNEY_ALREADY_ACTIVE` by reloading
  - show the stage-change history, if the API returns it
- **Consent center:** list each consent with its version and grant/revoke dates, plus **Revoke**. The revoke confirmation must explain that revoking Terms/Privacy pauses access to personalised care until re-accepted.
- Keep the existing phone-linking and sign-out sections.

**1.5 Error handling**
- `VALIDATION_FAILED`: show the `fields` messages next to their inputs.

---

## Definition of done
- [ ] Walk through and verify against the running API (`npm run serve:staging`):
  - [ ] new email sign-up → verify email → consent → empty dashboard with the set-up card → set stage + EDD in profile → dashboard shows week, trimester and next actions
  - [ ] Google sign-in (verified) → consent → dashboard
  - [ ] a returning user with consent goes straight to `/journey`
  - [ ] revoke consent → redirected to the consent screen on the next visit to `/journey`
  - [ ] setting the stage without an EDD works
- [ ] `ng build -c staging` passes with no new warnings, and the layout works at phone width.
- [ ] Hidden store and lead pages are unreachable while their flags are off.
- [ ] `API_Integration.md` is updated with what was consumed, any mismatches found, and open requests. Tick the matching boxes in `../NARTUREBELLE_ROADMAP.md` with the date.
- [ ] Report anything you had to decide that isn't covered here, rather than guessing silently.
