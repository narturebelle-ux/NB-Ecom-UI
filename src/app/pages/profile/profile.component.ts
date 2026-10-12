import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
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
            <span class="field-hint">🔒 Managed by your sign-in provider</span>
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
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Pregnancy Stage</label>
              <select class="form-control" [(ngModel)]="form.stage" name="stage">
                <option value="">— Select your stage —</option>
                <option value="MONTH_3">Month 3 (1st Trimester)</option>
                <option value="MONTH_6">Month 6 (2nd Trimester)</option>
                <option value="MONTH_9">Month 9 (3rd Trimester)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Due Date</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="form.dueDate"
                name="dueDate"
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              @if (saving()) { ⏳ Saving… } @else { 💾 Update Profile }
            </button>
            <button type="button" class="btn btn-outline" (click)="signOut()">
              🚪 Sign Out
            </button>
          </div>
        </form>

        <!-- Auth Info Card -->
        <div class="auth-info-card">
          <span class="auth-badge">
            @if (api.currentUser()?.authProvider === 'GOOGLE' || api.currentUser()?.authProvider === 'GOOGLE.COM') {
              🔵 Signed in with Google
            } @else if (api.currentUser()?.authProvider === 'PHONE' || api.currentUser()?.authProvider === 'PHONE.PHONE') {
              📱 Signed in with Phone OTP
            } @else {
              ✅ {{ api.currentUser()?.authProvider || 'Authenticated' }}
            }
          </span>
          <span class="member-since">
            Member since {{ memberSince() }}
          </span>
        </div>

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
    .field-hint {
      font-size: 0.77rem;
      color: #8a9e90;
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

    .auth-info-card {
      background: #fff;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      border: 1px solid #e8ede9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .auth-badge {
      font-size: 0.85rem;
      font-weight: 600;
      color: #2e4f3e;
    }
    .member-since {
      font-size: 0.8rem;
      color: #8a9e90;
    }
  `]
})
export class MyProfileComponent implements OnInit {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  router = inject(Router);

  saving = signal(false);
  statusMsg = signal<string | null>(null);
  isError = signal(false);

  form = {
    firstName: '',
    lastName: '',
    phone: '',
    stage: '',
    dueDate: ''
  };

  ngOnInit() {
    const user = this.api.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.form.firstName = user.firstName || (user.name?.split(' ')[0] ?? '');
    this.form.lastName = user.lastName || (user.name?.split(' ').slice(1).join(' ') ?? '');
    this.form.phone = user.phone || '';
    this.form.stage = user.stage || '';
    this.form.dueDate = user.dueDate || '';
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

    this.api.updateProfile(user.id, {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      phone: this.form.phone.trim() || undefined,
      stage: this.form.stage || undefined,
      dueDate: this.form.dueDate || undefined
    }).subscribe(res => {
      this.saving.set(false);
      if (res?.success && res?.user) {
        // Merge updated user back into the signal + localStorage
        this.api.setUser({ ...user, ...res.user });
        this.showStatus('Profile updated successfully! ✨', false);
      } else if (res?.success === false) {
        this.showStatus(res.message || 'Update failed. Please try again.', true);
      } else {
        // fallback for offline/mock
        const updatedUser = {
          ...user,
          firstName: this.form.firstName.trim(),
          lastName: this.form.lastName.trim(),
          name: `${this.form.firstName.trim()} ${this.form.lastName.trim()}`.trim(),
          phone: this.form.phone.trim() || user.phone,
          stage: this.form.stage || user.stage,
          dueDate: this.form.dueDate || user.dueDate
        };
        this.api.setUser(updatedUser as any);
        this.showStatus('Profile saved locally (server offline).', false);
      }
    });
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
}
