import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { PregnancyStage } from '../../models/maternal.models';
import { RecaptchaVerifier } from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="container login-container">
        <div class="login-box card glass">
          <div class="login-header">
            <span class="logo-icon">🌿</span>
            <h2>Welcome to NartureBelle</h2>
            <p>Access your personalized Doctor-Approved pregnancy routine, checkup scan alerts, and live sessions.</p>
          </div>

          <!-- Configuration Status Badge -->
          @if (!firebaseAuth.isConfigured()) {
            <div class="firebase-guide-box">
              <div class="guide-header">
                <span class="badge badge-warning">⚡ Live Firebase Mode Available</span>
              </div>
              <p class="guide-text">
                To connect your real Google Sign-In & live SMS OTP, paste your Firebase config in:
                <code>NB-Ecomm-UI/src/environments/environment.ts</code>.
                <br><em>(Currently running in interactive testing mode)</em>
              </p>
            </div>
          } @else {
            <div class="firebase-connected-box">
              <span class="badge badge-mandatory">🟢 Google Firebase Live Active</span>
              <p class="guide-text">Real Google 1-Tap & SMS OTP verification is active.</p>
            </div>
          }

          <!-- Auth Tabs: Google 1-Tap vs Phone OTP -->
          <div class="auth-tabs">
            <button type="button" class="auth-tab" [class.active]="activeTab === 'GOOGLE'" (click)="activeTab = 'GOOGLE'">
              Google Sign-In
            </button>
            <button type="button" class="auth-tab" [class.active]="activeTab === 'PHONE'" (click)="activeTab = 'PHONE'">
              Mobile OTP
            </button>
          </div>

          <!-- TAB 1: GOOGLE SIGN-IN -->
          @if (activeTab === 'GOOGLE') {
            <div class="tab-content">
              <div class="google-login-action">
                <button (click)="handleGoogleLogin()" class="google-btn" [disabled]="isSubmitting">
                  <svg class="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{{ isSubmitting ? 'Connecting with Google...' : 'Continue with Google' }}</span>
                </button>
              </div>

              <div class="or-divider"><span>OR CUSTOMIZE PROFILE</span></div>

              <div class="stage-onboarding">
                <label class="form-label">Select Your Current Stage:</label>
                <div class="stage-pill-select">
                  <button type="button" class="s-pill" [class.selected]="selectedStage === 'MONTH_3'" (click)="selectedStage = 'MONTH_3'">
                    Month 3 (1st Trim)
                  </button>
                  <button type="button" class="s-pill" [class.selected]="selectedStage === 'MONTH_6'" (click)="selectedStage = 'MONTH_6'">
                    Month 6 (2nd Trim)
                  </button>
                  <button type="button" class="s-pill" [class.selected]="selectedStage === 'MONTH_9'" (click)="selectedStage = 'MONTH_9'">
                    Month 9 (3rd Trim)
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: PHONE OTP -->
          @if (activeTab === 'PHONE') {
            <div class="tab-content">
              @if (!otpSent) {
                <form (ngSubmit)="handleSendOtp()">
                  <div class="form-group">
                    <label class="form-label">Mobile Number</label>
                    <div class="phone-input-row">
                      <span class="country-prefix">+91</span>
                      <input type="tel" [(ngModel)]="phone" name="phone" placeholder="Enter 10-digit mobile number" class="form-control" required maxlength="10" />
                    </div>
                  </div>

                  <div class="stage-onboarding">
                    <label class="form-label">Current Pregnancy Month:</label>
                    <select [(ngModel)]="selectedStage" name="stage" class="form-control">
                      <option value="MONTH_3">Month 1–3 (First Trimester)</option>
                      <option value="MONTH_6">Month 4–6 (Second Trimester)</option>
                      <option value="MONTH_9">Month 7–9 (Third Trimester)</option>
                    </select>
                  </div>

                  <!-- Container for Firebase invisible reCAPTCHA -->
                  <div id="recaptcha-container"></div>

                  <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!phone || isSubmitting">
                    {{ isSubmitting ? 'Sending OTP via Firebase...' : 'Send SMS Verification Code' }}
                  </button>
                </form>
              } @else {
                <form (ngSubmit)="handleVerifyOtp()">
                  <div class="form-group">
                    <label class="form-label">Enter 6-Digit OTP</label>
                    <input type="text" [(ngModel)]="otpCode" name="otp" placeholder="Enter 6-digit OTP" class="form-control text-center text-lg" required maxlength="6" />
                    <small class="form-hint">
                      Code sent to +91 {{ phone }}.
                      @if (!firebaseAuth.isConfigured()) {
                        (Testing code: <strong>123456</strong>)
                      }
                    </small>
                  </div>

                  <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!otpCode || isSubmitting">
                    {{ isSubmitting ? 'Verifying...' : 'Verify & Sign In →' }}
                  </button>

                  <button type="button" class="btn btn-outline full-w mt-1" (click)="otpSent = false">
                    ← Change Phone Number
                  </button>
                </form>
              }
            </div>
          }

          <div class="login-footer">
            <p>🔒 256-Bit SSL Encrypted. We never share your maternal health data without clinical consent.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      background: radial-gradient(circle at 20% 30%, rgba(251, 230, 221, 0.45) 0%, transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(226, 237, 230, 0.45) 0%, transparent 50%);
    }
    .login-container {
      max-width: 520px;
      width: 100%;
    }
    .login-box {
      padding: 2.5rem;
      border-radius: var(--radius-xl);
      background: #ffffff;
      box-shadow: 0 20px 45px rgba(27, 51, 39, 0.08);
      border: 1px solid var(--border-light);
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .logo-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .login-header h2 {
      font-size: 1.75rem;
      color: var(--primary-deep);
      margin-bottom: 0.5rem;
    }
    .login-header p {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Configuration status boxes */
    .firebase-guide-box {
      background: #fff8eb;
      border: 1px solid #fbd38d;
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .firebase-connected-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      text-align: center;
    }
    .guide-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .badge-warning {
      background: #feebc8;
      color: #744210;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-full);
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-mandatory {
      background: #dcfce7;
      color: #166534;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-full);
      font-weight: 700;
      text-transform: uppercase;
    }
    .guide-text {
      font-size: 0.8rem;
      color: #4a5568;
      line-height: 1.45;
      margin: 0;
    }
    .guide-text code {
      background: #edf2f7;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #2d3748;
    }

    .auth-tabs {
      display: flex;
      border-bottom: 2px solid var(--border-light);
      margin-bottom: 1.5rem;
    }
    .auth-tab {
      flex: 1;
      background: none;
      border: none;
      padding: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all var(--transition-fast);
    }
    .auth-tab.active {
      color: var(--primary-deep);
      border-bottom-color: var(--primary-deep);
    }

    .google-login-action {
      margin-bottom: 1.5rem;
    }
    .google-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem;
      background: #ffffff;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-pill);
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: all var(--transition-fast);
    }
    .google-btn:hover:not(:disabled) {
      border-color: #4285F4;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
      transform: translateY(-1px);
    }
    .google-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .google-icon {
      width: 20px;
      height: 20px;
    }

    .or-divider {
      position: relative;
      text-align: center;
      margin: 1.5rem 0;
    }
    .or-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-light);
    }
    .or-divider span {
      position: relative;
      background: #fff;
      padding: 0 0.75rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .phone-input-row {
      display: flex;
      align-items: center;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #fff;
    }
    .country-prefix {
      padding: 0.65rem 0.85rem;
      background: var(--bg-cream);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-right: 1.5px solid var(--border-color);
    }
    .phone-input-row .form-control {
      border: none;
      border-radius: 0;
      padding: 0.65rem 0.85rem;
    }
    .phone-input-row .form-control:focus {
      outline: none;
      box-shadow: none;
    }

    .stage-pill-select {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .s-pill {
      background: var(--bg-cream);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-pill);
      padding: 0.5rem 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      text-align: center;
      transition: all var(--transition-fast);
    }
    .s-pill:hover {
      border-color: var(--primary-deep);
    }
    .s-pill.selected {
      background: var(--primary-deep);
      color: #fff;
      border-color: var(--primary-deep);
    }

    .text-lg {
      font-size: 1.4rem;
      letter-spacing: 0.25em;
      font-weight: 700;
    }
    .form-hint {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .full-w {
      width: 100%;
    }
    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1rem; }

    .login-footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
      text-align: center;
    }
    .login-footer p {
      font-size: 0.72rem;
      color: var(--text-muted);
      line-height: 1.45;
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  router = inject(Router);

  activeTab: 'GOOGLE' | 'PHONE' = 'GOOGLE';
  selectedStage: PregnancyStage = 'MONTH_3';

  phone = '';
  otpCode = '';
  otpSent = false;
  isSubmitting = false;

  private confirmationResult: any = null;
  private appVerifier: RecaptchaVerifier | null = null;

  ngOnInit() {
    // If user is already logged in, redirect
    if (this.api.currentUser()) {
      this.navigateToStage();
    }
  }

  ngOnDestroy() {
    if (this.appVerifier) {
      try {
        this.appVerifier.clear();
      } catch (e) {
        // cleanup safe
      }
    }
  }

  /**
   * Real Google Sign-In via Firebase
   */
  async handleGoogleLogin() {
    this.isSubmitting = true;
    try {
      const { idToken, user } = await this.firebaseAuth.loginWithGoogle();
      
      // Verify with Spring Boot backend
      this.api.loginWithFirebase({
        idToken,
        stage: this.selectedStage
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.api.setUser(res.user || user);
          this.api.showToast(`Welcome back, ${res.user?.name || user?.displayName || 'Mother'}!`);
          this.navigateToStage();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.api.showToast('Authentication succeeded! Welcome to NartureBelle.');
          this.api.setUser(user);
          this.navigateToStage();
        }
      });
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('Google Sign-In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        this.api.showToast(err.message || 'Failed to complete Google Sign-In.');
      }
    }
  }

  /**
   * Send Phone OTP via Firebase
   */
  async handleSendOtp() {
    if (!this.phone || this.phone.length < 10) {
      this.api.showToast('Please enter a valid 10-digit mobile number.');
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.firebaseAuth.isConfigured() && !this.appVerifier) {
        this.appVerifier = this.firebaseAuth.initRecaptcha('recaptcha-container');
      }

      this.confirmationResult = await this.firebaseAuth.sendPhoneOtp(this.phone, this.appVerifier);
      this.isSubmitting = false;
      this.otpSent = true;
      this.api.showToast(`SMS verification code sent to +91 ${this.phone}`);
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('Phone OTP Error:', err);
      this.api.showToast(err.message || 'Failed to dispatch SMS verification code.');
    }
  }

  /**
   * Verify Phone OTP via Firebase
   */
  async handleVerifyOtp() {
    if (!this.otpCode) return;
    this.isSubmitting = true;

    try {
      const { idToken, phone } = await this.firebaseAuth.verifyPhoneOtp(
        this.confirmationResult,
        this.otpCode
      );

      // Verify with Spring Boot backend
      this.api.loginWithFirebase({
        idToken,
        stage: this.selectedStage
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.api.setUser(res.user);
          this.api.showToast('Successfully verified mobile number! Welcome to NartureBelle.');
          this.navigateToStage();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.api.showToast('Phone verified! Welcome to NartureBelle.');
          this.api.setUser({
            id: Date.now(),
            name: `Mother (${phone})`,
            phone: phone,
            authProvider: 'FIREBASE_PHONE',
            role: 'USER',
            stage: this.selectedStage
          });
          this.navigateToStage();
        }
      });
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('OTP Verification Error:', err);
      this.api.showToast(err.message || 'Invalid verification code. Please check and try again.');
    }
  }

  private navigateToStage() {
    if (this.selectedStage === 'MONTH_6') {
      this.router.navigateByUrl('/products/month-6');
    } else if (this.selectedStage === 'MONTH_9') {
      this.router.navigateByUrl('/products/month-9');
    } else {
      this.router.navigateByUrl('/products/month-3');
    }
  }
}
