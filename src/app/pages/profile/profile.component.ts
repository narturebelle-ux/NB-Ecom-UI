import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecaptchaVerifier } from 'firebase/auth';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { NotificationService } from '../../services/notification.service';
import { User, ConsentDocument, ConsentStatus, ConsentDocumentType } from '../../models/maternal.models';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../../models/notification.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="profile-page">
      <div class="profile-container">

        <!-- Header -->
        <div class="profile-header">
          <div class="avatar-circle">
            <span class="avatar-emoji">🌸</span>
          </div>
          <div class="profile-title">
            <h1>My Profile</h1>
            <p class="profile-subtitle">{{ api.currentUser()?.email || api.currentUser()?.phone || 'NartureBelle Member' }}</p>
          </div>
        </div>

        <!-- Success / Error Banner -->
        @if (statusMsg()) {
          <div class="status-banner" [class.is-error]="isError()">
            <span>{{ isError() ? '⚠️' : '✅' }}</span>
            {{ statusMsg() }}
          </div>
        }

        <!-- Edit toggle -->
        <div class="edit-toggle-row">
          <span class="edit-toggle-label">{{ editMode() ? 'Editing — make your changes below' : 'Edit Profile Details' }}</span>
          <label class="switch">
            <input type="checkbox" [checked]="editMode()" (change)="toggleEditMode()">
            <span class="slider"></span>
          </label>
        </div>

        <!-- Profile Form -->
        <form class="profile-form" (ngSubmit)="saveProfile()">

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="form.firstName"
                name="firstName"
                placeholder="e.g. Priya"
                required
                [disabled]="!editMode()"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="form.lastName"
                name="lastName"
                placeholder="e.g. Sharma"
                [disabled]="!editMode()"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input
              type="email"
              class="form-control readonly-field"
              [value]="api.currentUser()?.email || ''"
              readonly
              title="Email cannot be changed here. Use your Google/Firebase account settings."
            />
            <span class="field-hint auth-status">
              @if (api.currentUser()?.authProvider === 'GOOGLE' || api.currentUser()?.authProvider === 'GOOGLE.COM') {
                🔵 Signed in with Google
              } @else if (api.currentUser()?.authProvider === 'PHONE' || api.currentUser()?.authProvider === 'PHONE.PHONE') {
                📱 Signed in with Phone OTP
              } @else if (api.currentUser()?.emailVerified) {
                ✅ Verified
              } @else {
                ⚠️ Not verified yet
              }
              · 🔒 Managed by your sign-in provider
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <div class="phone-input-row">
              <span class="phone-prefix">+91</span>
              <input
                type="tel"
                class="form-control"
                [(ngModel)]="form.phone"
                name="phone"
                placeholder="10-digit mobile number"
                maxlength="10"
                pattern="[0-9]{10}"
                [disabled]="!editMode()"
              />
            </div>
          </div>

          <!-- Phone verification (Firebase linkWithPhoneNumber) is temporarily hidden —
               not needed right now. Logic stays in the component, just not rendered. -->

          <div class="journey-pointer">
            <span>🌱</span>
            <span>Your pregnancy stage and due date now live in <a routerLink="/journey">My Journey</a>, not here.</span>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="!editMode() || saving()">
              @if (saving()) { ⏳ Saving… } @else { 💾 Update Profile }
            </button>
            <button type="button" class="btn btn-outline" (click)="signOut()">
              🚪 Sign Out
            </button>
          </div>
        </form>

        <!-- Consent Center (roadmap §1.1 UI) -->
        <div class="consent-center">
          <h2 class="section-title">Consent &amp; Privacy</h2>

          @if (consentLoading()) {
            <p class="field-hint">Loading…</p>
          } @else {
            @for (doc of consentDocuments(); track doc.id) {
              <div class="consent-row">
                <div class="consent-info">
                  <strong>{{ doc.title || doc.type }}</strong>
                  <span class="field-hint">
                    v{{ doc.version }} ·
                    @if (isGranted(doc.type)) {
                      Granted {{ grantedDate(doc.type) }}
                    } @else {
                      Not granted
                    }
                  </span>
                </div>
                @if (isGranted(doc.type)) {
                  <button class="btn-link" [disabled]="consentActionBusy()" (click)="revoke(doc.type)">Revoke</button>
                } @else {
                  <button class="btn-link" [disabled]="consentActionBusy()" (click)="grant(doc)">Grant</button>
                }
              </div>
            }
          }
        </div>

        <!-- Notification Preferences (roadmap §Phase 5 UI) -->
        <div class="consent-center">
          <h2 class="section-title">Notification Preferences</h2>
          <p class="field-hint prefs-note">Preferences only — no messages are actually sent by any channel yet; only in-app reminders are real right now.</p>
          <label class="pref-row">
            <input type="checkbox" [(ngModel)]="notifPrefs.inApp" name="prefInApp" (ngModelChange)="savePrefs()" />
            In-app reminders
          </label>
          <label class="pref-row">
            <input type="checkbox" [(ngModel)]="notifPrefs.email" name="prefEmail" (ngModelChange)="savePrefs()" />
            Email
          </label>
          <label class="pref-row">
            <input type="checkbox" [(ngModel)]="notifPrefs.sms" name="prefSms" (ngModelChange)="savePrefs()" />
            SMS
          </label>
          <label class="pref-row">
            <input type="checkbox" [(ngModel)]="notifPrefs.whatsapp" name="prefWhatsapp" (ngModelChange)="savePrefs()" />
            WhatsApp
          </label>
        </div>

        <!-- Self-service export / deletion (roadmap §Phase 6) -->
        <div class="consent-center">
          <h2 class="section-title">Your Data</h2>
          <p class="field-hint prefs-note">
            Exports/clears what this prototype keeps on this device only (plan, bookings, records
            metadata, reminders). It does not delete your real account or server-side data — no
            DELETE /me endpoint exists yet.
          </p>
          <div class="data-actions">
            <button type="button" class="btn-link" (click)="exportData()">⬇️ Download my data (JSON)</button>
            <button type="button" class="btn-link danger" (click)="confirmingDelete.set(true)" [hidden]="confirmingDelete()">🗑️ Delete local data</button>
          </div>
          @if (confirmingDelete()) {
            <div class="delete-confirm">
              <span>This clears everything this prototype stored on this device and signs you out. Are you sure?</span>
              <button type="button" class="btn-link danger" (click)="deleteLocalData()">Yes, delete it</button>
              <button type="button" class="btn-link" (click)="confirmingDelete.set(false)">Cancel</button>
            </div>
          }
        </div>

        <p class="member-since">Member since {{ memberSince() }}</p>

      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: var(--bg-main, #f9f6f2);
      padding: 2rem 1rem 4rem;
    }
    .profile-container {
      max-width: 560px;
      margin: 0 auto;
    }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .avatar-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f3e8e2, #e8f0ec);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #c8ddd0;
      flex-shrink: 0;
    }
    .avatar-emoji { font-size: 2rem; }
    .profile-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1b3327;
      margin: 0 0 0.25rem;
    }
    .profile-subtitle {
      font-size: 0.9rem;
      color: #6b7a6e;
      margin: 0;
    }

    .status-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      background: #e8f5ec;
      color: #1b6b3a;
      border: 1px solid #b2dfca;
    }
    .status-banner.is-error {
      background: #fdecea;
      color: #a0281c;
      border-color: #f5b7b1;
    }

    .profile-form {
      background: #fff;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(27,51,39,0.06);
      border: 1px solid #e8ede9;
      margin-bottom: 1.25rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 480px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1.25rem;
    }
    .form-label {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4a6355;
    }
    .form-control {
      padding: 0.7rem 1rem;
      border: 1.5px solid #d5e0d8;
      border-radius: 10px;
      font-size: 0.95rem;
      color: #1b3327;
      background: #fff;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .form-control:focus {
      outline: none;
      border-color: #4a6355;
      box-shadow: 0 0 0 3px rgba(74,99,85,0.12);
    }
    .readonly-field {
      background: #f6f8f6;
      color: #8a9e90;
      cursor: not-allowed;
    }
    .form-control:disabled {
      background: #f6f8f6;
      color: #8a9e90;
      cursor: not-allowed;
    }
    .field-hint {
      font-size: 0.77rem;
      color: #8a9e90;
    }
    .auth-status {
      font-weight: 600;
      color: #4a6355;
    }
    .phone-input-row {
      display: flex;
      align-items: center;
    }
    .phone-prefix {
      background: #f0f5f1;
      border: 1.5px solid #d5e0d8;
      border-right: none;
      padding: 0.7rem 0.85rem;
      border-radius: 10px 0 0 10px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #4a6355;
      white-space: nowrap;
    }
    .phone-input-row .form-control {
      border-radius: 0 10px 10px 0;
    }

    .verify-phone-block {
      margin-bottom: 1.25rem;
    }
    .verified-pill {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #1b6b3a;
      background: #e8f5ec;
      border: 1px solid #b2dfca;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full, 999px);
    }
    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .form-actions {
      display: flex;
      gap: 0.85rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #2e4f3e;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) { background: #1b3327; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline {
      background: transparent;
      border: 1.5px solid #d5e0d8;
      color: #4a6355;
    }
    .btn-outline:hover { background: #f0f5f1; }
    .btn-link {
      background: none;
      border: none;
      color: #4a6355;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
      padding: 0.4rem;
    }

    .member-since {
      font-size: 0.8rem;
      color: #8a9e90;
      text-align: center;
      margin: 0;
    }

    .journey-pointer {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #f0f5f1;
      border: 1px solid #d5e0d8;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: #4a6355;
      margin-bottom: 1.25rem;
    }
    .journey-pointer a { color: #2e4f3e; font-weight: 700; text-decoration: underline; }

    .consent-center {
      background: #fff;
      border-radius: 16px;
      padding: 1.5rem 2rem;
      box-shadow: 0 4px 24px rgba(27,51,39,0.06);
      border: 1px solid #e8ede9;
      margin-bottom: 1.25rem;
    }
    .section-title {
      font-size: 1.1rem;
      color: #1b3327;
      margin: 0 0 1rem;
    }
    .consent-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-top: 1px solid #f0f3f1;
    }
    .consent-row:first-of-type { border-top: none; }
    .consent-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .consent-info strong { font-size: 0.92rem; color: #1b3327; }

    .prefs-note { margin-bottom: 0.85rem; }
    .pref-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; color: #4a6355; padding: 0.4rem 0; cursor: pointer; }
    .data-actions { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .delete-confirm { margin-top: 0.75rem; padding: 0.85rem 1rem; background: #fdecea; border: 1px solid #f5b7b1; border-radius: 10px; font-size: 0.85rem; color: #a0281c; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .btn-link.danger { color: #a0281c; }

    .edit-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      border: 1px solid #e8ede9;
      border-radius: 12px;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .edit-toggle-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #1b3327;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: #d5e0d8;
      border-radius: 999px;
      transition: background 0.2s;
    }
    .slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .switch input:checked + .slider {
      background: #2e4f3e;
    }
    .switch input:checked + .slider::before {
      transform: translateX(20px);
    }
  `]
})
export class MyProfileComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  saving = signal(false);
  statusMsg = signal<string | null>(null);
  isError = signal(false);

  consentLoading = signal(true);
  consentActionBusy = signal(false);
  consentDocuments = signal<ConsentDocument[]>([]);
  consentStatus = signal<ConsentStatus | null>(null);

  notifPrefs: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  confirmingDelete = signal(false);

  form = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  // Fields stay read-only (and Update Profile disabled) until the user flips this on —
  // auto-locks again after a successful save.
  editMode = signal(false);

  toggleEditMode() {
    this.editMode.set(!this.editMode());
  }

  // Phone-number verification (linkWithPhoneNumber), separate from the plain
  // "Mobile Number" field above — this updates the verified phoneVerified flag.
  phoneLinkStep = signal<'idle' | 'enter-number' | 'otp-sent'>('idle');
  linkPhoneNumber = '';
  linkOtpCode = '';
  linkingPhone = signal(false);
  private linkConfirmationResult: any = null;
  private linkAppVerifier: RecaptchaVerifier | null = null;

  ngOnInit() {
    // authGuard guarantees a signed-in user by the time this component loads.
    this.populateForm(this.api.currentUser());

    // Refresh from the server (GET /api/v1/me — roadmap §0.6) so the page reflects
    // server-truth rather than whatever was cached at login time.
    this.api.getMe().subscribe({
      next: (user) => {
        if (user) {
          this.api.setUser(user);
          this.populateForm(user);
        }
      },
      error: () => {
        // Keep showing the cached user; interceptor already handled 401/403 side effects.
      }
    });

    this.loadConsents();
    this.notifPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...this.notifications.getPreferences() };
  }

  savePrefs() {
    this.notifications.savePreferences(this.notifPrefs);
    this.api.showToast('Notification preferences saved.');
  }

  exportData() {
    const uid = this.api.currentUser()?.id ?? 'guest';
    const keys = Object.keys(localStorage).filter(k => k.includes(`_${uid}`) || k === 'nb_user');
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narturebelle-data-${uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteLocalData() {
    const uid = this.api.currentUser()?.id ?? 'guest';
    const keys = Object.keys(localStorage).filter(k => k.includes(`_${uid}`) || k === 'nb_user');
    keys.forEach(k => localStorage.removeItem(k));
    this.confirmingDelete.set(false);
    this.firebaseAuth.logout().finally(() => {
      this.api.logout();
      this.router.navigate(['/']);
    });
  }

  private loadConsents() {
    this.consentLoading.set(true);
    this.api.getMyConsents().subscribe({
      next: (status) => {
        this.consentStatus.set(status);
        this.api.getConsentDocuments().subscribe({
          next: (docs) => {
            this.consentDocuments.set(docs);
            this.consentLoading.set(false);
          },
          error: () => this.consentLoading.set(false)
        });
      },
      error: () => this.consentLoading.set(false)
    });
  }

  isGranted(type: ConsentDocumentType): boolean {
    return !this.consentStatus()?.pending.includes(type);
  }

  grantedDate(type: ConsentDocumentType): string {
    const grant = this.consentStatus()?.history.find(c => c.documentType === type && !c.revokedAt);
    if (!grant?.grantedAt) return '';
    try {
      return new Date(grant.grantedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }

  grant(doc: ConsentDocument) {
    this.consentActionBusy.set(true);
    this.api.grantConsent(doc.type, doc.version).subscribe({
      next: () => {
        this.consentActionBusy.set(false);
        this.loadConsents();
      },
      error: (err) => {
        this.consentActionBusy.set(false);
        this.api.showToast(err?.error?.message || 'Could not save your agreement. Please try again.');
      }
    });
  }

  revoke(type: ConsentDocumentType) {
    this.consentActionBusy.set(true);
    this.api.revokeConsent(type).subscribe({
      next: () => {
        this.consentActionBusy.set(false);
        this.loadConsents();
      },
      error: (err) => {
        this.consentActionBusy.set(false);
        this.api.showToast(err?.error?.message || 'Could not revoke. Please try again.');
      }
    });
  }

  private populateForm(user: User | null) {
    if (!user) return;
    this.form.firstName = user.firstName || (user.name?.split(' ')[0] ?? '');
    this.form.lastName = user.lastName || (user.name?.split(' ').slice(1).join(' ') ?? '');
    this.form.phone = user.phone || '';
  }

  saveProfile() {
    const user = this.api.currentUser();
    if (!user?.id) return;

    if (!this.form.firstName.trim()) {
      this.showStatus('First name is required.', true);
      return;
    }

    this.saving.set(true);
    this.statusMsg.set(null);

    this.api.updateMe({
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      phone: this.form.phone.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        // PATCH /me returns the updated user directly (not wrapped) — e.g. changing
        // phone resets phoneVerified server-side, so this merge also picks that up.
        this.api.setUser(res);
        this.populateForm(res);
        this.editMode.set(false);
        this.showStatus('Profile updated successfully! ✨', false);
      },
      error: (err) => {
        this.saving.set(false);
        // 401/403 side effects (sign-out+redirect, verify-email redirect, toast) are
        // already handled by the auth interceptor; just stop the spinner and explain.
        if (err?.status !== 401 && err?.status !== 403) {
          this.showStatus(err?.error?.message || 'Update failed. Please try again.', true);
        }
      }
    });
  }

  async startPhoneLink() {
    if (!this.linkPhoneNumber) return;
    this.linkingPhone.set(true);

    try {
      if (this.firebaseAuth.isConfigured() && !this.linkAppVerifier) {
        this.linkAppVerifier = this.firebaseAuth.initRecaptcha('profile-recaptcha-container');
      }
      this.linkConfirmationResult = await this.firebaseAuth.linkPhoneToAccount(this.linkPhoneNumber, this.linkAppVerifier);
      this.phoneLinkStep.set('otp-sent');
      this.api.showToast(`Verification code sent to +91 ${this.linkPhoneNumber}`);
    } catch (err: any) {
      this.api.showToast(err?.message || 'Could not send verification code.');
    } finally {
      this.linkingPhone.set(false);
    }
  }

  async confirmPhoneLink() {
    if (!this.linkOtpCode) return;
    this.linkingPhone.set(true);

    try {
      await this.firebaseAuth.confirmPhoneLink(this.linkConfirmationResult, this.linkOtpCode);

      this.api.loginWithFirebase().subscribe({
        next: (user) => {
          this.linkingPhone.set(false);
          if (user) {
            this.api.setUser(user);
            this.populateForm(user);
          }
          this.phoneLinkStep.set('idle');
          this.linkPhoneNumber = '';
          this.linkOtpCode = '';
          this.api.showToast('Phone number verified! ✨');
        },
        error: () => {
          this.linkingPhone.set(false);
          this.api.showToast('Phone verified with Firebase, but syncing with the server failed. Try reloading the page.');
        }
      });
    } catch (err: any) {
      this.linkingPhone.set(false);
      this.api.showToast(err?.message || 'Invalid verification code.');
    }
  }

  signOut() {
    this.firebaseAuth.logout()
      .then(() => {
        this.api.logout();
        this.router.navigate(['/']);
      })
      .catch(() => {
        // Firebase logout failed, still clear local session
        this.api.logout();
        this.router.navigate(['/']);
      });
  }

  memberSince(): string {
    const user = this.api.currentUser();
    if (!user?.createdAt) return 'recently';
    try {
      return new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return 'recently';
    }
  }

  private showStatus(msg: string, error: boolean) {
    this.statusMsg.set(msg);
    this.isError.set(error);
    if (!error) {
      setTimeout(() => this.statusMsg.set(null), 4000);
    }
  }

  ngOnDestroy() {
    if (this.linkAppVerifier) {
      try {
        this.linkAppVerifier.clear();
      } catch (e) {
        // cleanup safe
      }
    }
  }
}
