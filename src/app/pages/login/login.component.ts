import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { goToPostAuthDestination } from '../../services/post-auth-redirect';
import { User, isVerifiedUser } from '../../models/maternal.models';
import { RecaptchaVerifier, GoogleAuthProvider, AuthCredential } from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper">
      <div class="container login-container">
        <div class="login-box card glass">
          <div class="login-header">
            <img src="favicon.svg" alt="" class="logo-icon">
            @if (isSignUp) {
              <h2>Create your account</h2>
              <p>Start your care journey in a few minutes. Signing up is free. You only pay once you choose a care plan.</p>
            } @else {
              <h2>Welcome back</h2>
              <p>Sign in to your care journey: your plan, your care team and your records, all in one private place.</p>
            }
          </div>

          @if (isSignUp) {
            <ol class="next-steps">
              <li><span>1</span> Create your account</li>
              <li><span>2</span> Tell us about you</li>
              <li><span>3</span> Choose a plan and meet your coordinator</li>
            </ol>
          }

          <!-- Developer-only notice; end users on a configured build never see infrastructure status. -->
          @if (!firebaseAuth.isConfigured()) {
            <div class="firebase-guide-box">
              <div class="guide-header">
                <span class="badge badge-warning">Developer mode</span>
              </div>
              <p class="guide-text">
                To connect your real Google Sign-In & live SMS OTP, paste your Firebase config in:
                <code>NB-Ecomm-UI/src/environments/environment.ts</code>.
                <br><em>(Currently running in interactive testing mode)</em>
              </p>
            </div>
          }

          @if (accountLinkNotice()) {
            <div class="link-notice"><mat-icon class="icon-sm">link</mat-icon> {{ accountLinkNotice() }}</div>
          }

          <!-- Auth Tabs -->
          <div class="auth-tabs">
            <button type="button" class="auth-tab" [class.active]="activeTab === 'GOOGLE'" (click)="activeTab = 'GOOGLE'">
              Google
            </button>
            <button type="button" class="auth-tab" [class.active]="activeTab === 'PHONE'" (click)="activeTab = 'PHONE'">
              Mobile OTP
            </button>
            <button type="button" class="auth-tab" [class.active]="activeTab === 'EMAIL'" (click)="activeTab = 'EMAIL'">
              Email
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
                  <span>{{ isSubmitting ? 'Connecting with Google...' : (isSignUp ? 'Sign up with Google' : 'Continue with Google') }}</span>
                </button>
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
                    {{ isSubmitting ? 'Verifying...' : (isSignUp ? 'Verify & Create Account →' : 'Verify & Sign In →') }}
                  </button>

                  <button type="button" class="btn btn-outline full-w mt-1" (click)="otpSent = false">
                    ← Change Phone Number
                  </button>
                </form>
              }
            </div>
          }

          <!-- TAB 3: EMAIL + PASSWORD -->
          @if (activeTab === 'EMAIL') {
            <div class="tab-content">
              @if (emailMode === 'SIGN_IN') {
                <form (ngSubmit)="handleEmailSignIn()">
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" [(ngModel)]="password" name="password" placeholder="Your password" class="form-control" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!email || !password || isSubmitting">
                    {{ isSubmitting ? 'Signing in...' : 'Sign In' }}
                  </button>
                  <div class="email-links">
                    <button type="button" class="btn-link" (click)="switchEmailMode('SIGN_UP')">Create an account</button>
                    <button type="button" class="btn-link" (click)="switchEmailMode('FORGOT_PASSWORD')">Forgot password?</button>
                  </div>
                </form>
              }

              @if (emailMode === 'SIGN_UP') {
                <form (ngSubmit)="handleEmailSignUp()">
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" [(ngModel)]="email" name="signupEmail" placeholder="you@example.com" class="form-control" required />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Password</label>
                      <input type="password" [(ngModel)]="password" name="signupPassword" placeholder="At least 6 characters" class="form-control" required minlength="6" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Confirm Password</label>
                      <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Re-enter password" class="form-control" required />
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!email || !password || isSubmitting">
                    {{ isSubmitting ? 'Creating account...' : 'Create Account' }}
                  </button>
                  <div class="email-links">
                    <button type="button" class="btn-link" (click)="switchEmailMode('SIGN_IN')">Already have an account? Sign in</button>
                  </div>
                </form>
              }

              @if (emailMode === 'FORGOT_PASSWORD') {
                <form (ngSubmit)="handleForgotPassword()">
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" [(ngModel)]="email" name="forgotEmail" placeholder="you@example.com" class="form-control" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!email || isSubmitting">
                    {{ isSubmitting ? 'Sending...' : 'Send Reset Link' }}
                  </button>
                  <div class="email-links">
                    <button type="button" class="btn-link" (click)="switchEmailMode('SIGN_IN')">← Back to sign in</button>
                  </div>
                </form>
              }
            </div>
          }

          <p class="switch-page">
            @if (isSignUp) {
              Already have an account? <a [routerLink]="['/auth/login']" [queryParams]="returnUrl ? { returnUrl } : {}">Sign in</a>
            } @else {
              New to NartureBelle? <a [routerLink]="['/auth/signup']" [queryParams]="returnUrl ? { returnUrl } : {}">Create an account</a>
            }
          </p>

          <div class="login-footer">
            <p><mat-icon class="icon-sm">lock</mat-icon> Encrypted in transit. We never share your health data without your consent.</p>
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
    .next-steps { list-style: none; padding: 0.85rem 1rem; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; background: var(--sage-50); border: 1px solid var(--sage-100); border-radius: var(--radius-md); }
    .next-steps li { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--sage-900); }
    .next-steps span { width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; background: var(--sage-700); color: #fff; font-size: 0.72rem; font-weight: 700; }
    .switch-page { text-align: center; font-size: 0.88rem; color: var(--text-secondary); margin: 1.5rem 0 0; }
    .switch-page a { font-weight: 700; color: var(--sage-700); }
    .logo-icon {
      width: 56px;
      height: 56px;
      display: block;
      margin: 0 auto 0.85rem;
      border-radius: 50%;
      box-shadow: var(--shadow-md);
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

    .link-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: var(--trust-50);
      border: 1px solid var(--trust-200);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.82rem;
      color: var(--trust-900);
      line-height: 1.45;
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
      font-size: 0.9rem;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 480px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .form-group {
      margin-bottom: 1.1rem;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 0.35rem;
    }
    .form-control {
      padding: 0.65rem 0.85rem;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 0.95rem;
      width: 100%;
      box-sizing: border-box;
    }

    .email-links {
      display: flex;
      justify-content: space-between;
      margin-top: 0.85rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--primary-deep);
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
      padding: 0.2rem;
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
  route = inject(ActivatedRoute);

  activeTab: 'GOOGLE' | 'PHONE' | 'EMAIL' = 'GOOGLE';
  emailMode: 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' = 'SIGN_IN';

  phone = '';
  otpCode = '';
  otpSent = false;

  email = '';
  password = '';
  confirmPassword = '';

  isSubmitting = false;
  returnUrl: string | null = null;

  private confirmationResult: any = null;
  private appVerifier: RecaptchaVerifier | null = null;

  /** Signal-less; plain field is fine since it's read once per render via template binding. */
  private accountLinkNoticeMsg: string | null = null;
  private pendingCredential: AuthCredential | null = null;

  accountLinkNotice(): string | null {
    return this.accountLinkNoticeMsg;
  }

  /** /auth/signup reuses this page with sign-up wording; Firebase creates the account either way. */
  isSignUp = false;

  ngOnInit() {
    this.isSignUp = this.route.snapshot.data['mode'] === 'signup';
    if (this.isSignUp) this.emailMode = 'SIGN_UP';
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (this.api.currentUser()) {
      goToPostAuthDestination(this.api, this.router, this.returnUrl);
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

  switchEmailMode(mode: 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD') {
    this.emailMode = mode;
  }

  /**
   * Real Google Sign-In via Firebase
   */
  async handleGoogleLogin() {
    this.isSubmitting = true;
    try {
      const { user } = await this.firebaseAuth.loginWithGoogle();
      this.completeFirebaseLogin(user);
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('Google Sign-In Error:', err);

      if (err.code === 'auth/account-exists-with-different-credential') {
        await this.handleAccountExistsError(err);
        return;
      }
      if (err.code !== 'auth/popup-closed-by-user') {
        this.api.showToast(err.message || 'Failed to complete Google Sign-In.');
      }
    }
  }

  /**
   * Firebase throws this when a Google sign-in attempt matches an email that already
   * has an account via a different method (e.g. email+password). Recover the pending
   * Google credential, tell the user which method to use, and switch them to it —
   * handleEmailSignIn() will link the credential once they sign in successfully.
   */
  private async handleAccountExistsError(err: any) {
    const email = err.customData?.email;
    this.pendingCredential = GoogleAuthProvider.credentialFromError(err);

    if (!email) {
      this.api.showToast('An account already exists with a different sign-in method.');
      return;
    }

    const methods = await this.firebaseAuth.getSignInMethodsForEmail(email);
    const methodLabel = methods.includes('password') ? 'email & password' : (methods[0] || 'a different method');

    this.email = email;
    this.accountLinkNoticeMsg = `An account already exists for ${email} using ${methodLabel}. Sign in below and your Google account will be linked automatically.`;
    this.activeTab = 'EMAIL';
    this.emailMode = 'SIGN_IN';
  }

  /**
   * Email + password sign-in
   */
  async handleEmailSignIn() {
    if (!this.email || !this.password) return;
    this.isSubmitting = true;

    try {
      const { user } = await this.firebaseAuth.loginWithEmail(this.email, this.password);

      if (this.pendingCredential) {
        try {
          await this.firebaseAuth.linkPendingCredential(this.pendingCredential);
          this.api.showToast('Your Google account has been linked to this account.');
        } catch (linkErr) {
          console.warn('Credential linking failed:', linkErr);
        }
        this.pendingCredential = null;
        this.accountLinkNoticeMsg = null;
      }

      this.completeFirebaseLogin(user);
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('Email Sign-In Error:', err);
      this.api.showToast(this.friendlyAuthError(err));
    }
  }

  /**
   * Email + password sign-up. Firebase sends the verification email automatically
   * (handled inside FirebaseAuthService.signUpWithEmail); the new account starts
   * unverified, so completeFirebaseLogin() will route to the verify-email page.
   */
  async handleEmailSignUp() {
    if (!this.email || !this.password) return;
    if (this.password !== this.confirmPassword) {
      this.api.showToast('Passwords do not match.');
      return;
    }

    this.isSubmitting = true;
    try {
      const { user } = await this.firebaseAuth.signUpWithEmail(this.email, this.password);
      this.completeFirebaseLogin(user);
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('Email Sign-Up Error:', err);

      if (err.code === 'auth/email-already-in-use') {
        this.api.showToast('An account with this email already exists — sign in instead.');
        this.password = '';
        this.confirmPassword = '';
        this.emailMode = 'SIGN_IN';
        return;
      }
      this.api.showToast(this.friendlyAuthError(err));
    }
  }

  /** Turns common Firebase auth error codes into plain-language messages instead of raw "Firebase: Error (auth/...)" text. */
  private friendlyAuthError(err: any): string {
    switch (err?.code) {
      case 'auth/weak-password':
        return 'Please choose a stronger password (at least 6 characters).';
      case 'auth/invalid-email':
        return 'That email address looks invalid.';
      case 'auth/network-request-failed':
        return 'Network error — please check your connection and try again.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts — please wait a moment and try again.';
      default:
        return err?.message?.replace(/^Firebase:\s*/i, '') || 'Something went wrong. Please try again.';
    }
  }

  async handleForgotPassword() {
    if (!this.email) return;
    this.isSubmitting = true;

    try {
      await this.firebaseAuth.sendPasswordReset(this.email);
      this.api.showToast(`If an account exists for ${this.email}, a reset link has been sent.`);
      this.emailMode = 'SIGN_IN';
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      this.api.showToast(err.message || 'Could not send reset email. Please try again.');
    } finally {
      this.isSubmitting = false;
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
      const { phone } = await this.firebaseAuth.verifyPhoneOtp(this.confirmationResult, this.otpCode);
      this.completeFirebaseLogin({
        name: `Mother (${phone})`,
        phone,
        phoneVerified: true,
        authProvider: 'FIREBASE_PHONE',
        role: 'USER'
      });
    } catch (err: any) {
      this.isSubmitting = false;
      console.error('OTP Verification Error:', err);
      this.api.showToast(err.message || 'Invalid verification code. Please check and try again.');
    }
  }

  /**
   * Shared post-sign-in step for all three methods: the Firebase client SDK is already
   * signed in by this point, so the auth interceptor will attach the fresh ID token
   * automatically — no need to pass it explicitly here. Calls POST /api/v1/auth/firebase
   * (no request body — the real API takes none) and stores the returned user directly
   * (the API returns the user object itself, not wrapped).
   *
   * Per roadmap §1 UI, journey stage/EDD are never collected at sign-up — they're set later
   * in Profile → My Journey. If verified, goToPostAuthDestination() checks for pending
   * consents and routes to the consent screen or straight to /journey. If not yet verified
   * (fresh email/password signup), route to verify-email instead.
   */
  private completeFirebaseLogin(fallbackUser: Partial<User> | any) {
    this.api.loginWithFirebase().subscribe({
      next: (user: any) => {
        const resolvedUser = user || fallbackUser;
        this.api.setUser(resolvedUser);

        if (isVerifiedUser(resolvedUser)) {
          this.api.showToast(`Welcome, ${resolvedUser.firstName || resolvedUser.name || resolvedUser.email || 'Mother'}!`);
          goToPostAuthDestination(this.api, this.router, this.returnUrl);
        } else {
          this.isSubmitting = false;
          const queryParams = this.returnUrl ? { returnUrl: this.returnUrl } : {};
          this.router.navigate(['/auth/verify-email'], { queryParams });
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        // A real HTTP error means the backend rejected the token — never fabricate a
        // session on a real rejection (ApiService's own catchError already handles the
        // true-network-failure dev fallback before this error callback ever runs).
        this.api.showToast(err?.error?.message || 'Could not verify your sign-in with the server. Please try again.');
      }
    });
  }
}
