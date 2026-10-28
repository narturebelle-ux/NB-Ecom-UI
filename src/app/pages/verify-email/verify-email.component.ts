import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { goToPostAuthDestination } from '../../services/post-auth-redirect';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-verify-email',
  standalone: true,
  template: `
    <div class="verify-wrapper">
      <div class="verify-card card glass">
        <span class="icon">📧</span>
        <h2>Verify your email</h2>
        <p class="lead">
          We've sent a verification link to <strong>{{ email() }}</strong>.
          Click the link in that email, then come back here.
        </p>

        @if (statusMsg()) {
          <div class="status-banner" [class.is-error]="isError()">{{ statusMsg() }}</div>
        }

        <div class="actions">
          <button
            class="btn btn-primary btn-lg full-w"
            (click)="checkVerified()"
            [disabled]="checking()"
          >
            {{ checking() ? 'Checking…' : "I've verified" }}
          </button>

          <button
            class="btn btn-outline full-w mt-1"
            (click)="resend()"
            [disabled]="cooldown() > 0 || resending()"
          >
            {{ cooldown() > 0 ? 'Resend email (' + cooldown() + 's)' : (resending() ? 'Sending…' : 'Resend email') }}
          </button>

          <button class="btn-link mt-2" (click)="signOut()">
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-wrapper {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
    }
    .verify-card {
      max-width: 480px;
      width: 100%;
      padding: 2.5rem;
      text-align: center;
      border-radius: var(--radius-xl);
      background: #fff;
      box-shadow: 0 20px 45px rgba(27, 51, 39, 0.08);
      border: 1px solid var(--border-light);
    }
    .icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    h2 { font-size: 1.5rem; color: var(--primary-deep); margin-bottom: 0.75rem; }
    .lead { font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem; }

    .status-banner {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      font-size: 0.88rem;
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

    .actions { display: flex; flex-direction: column; gap: 0.6rem; }
    .btn {
      padding: 0.8rem 1.25rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #1b3327; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline {
      background: transparent;
      border: 1.5px solid #d5e0d8;
      color: #4a6355;
    }
    .btn-outline:hover:not(:disabled) { background: #f0f5f1; }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-link {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.82rem;
      text-decoration: underline;
      cursor: pointer;
      padding: 0.4rem;
    }
    .full-w { width: 100%; }
    .mt-1 { margin-top: 0.1rem; }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class VerifyEmailComponent implements OnDestroy {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  checking = signal(false);
  resending = signal(false);
  cooldown = signal(0);
  statusMsg = signal<string | null>(null);
  isError = signal(false);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  email() {
    return this.firebaseAuth.getCurrentEmail() || this.api.currentUser()?.email || 'your email address';
  }

  async checkVerified() {
    this.checking.set(true);
    this.statusMsg.set(null);

    try {
      await this.firebaseAuth.reloadAndGetFreshToken();

      this.api.loginWithFirebase().subscribe({
        next: (res) => {
          this.checking.set(false);
          if (res) {
            this.api.setUser(res);
          }
          if (res?.emailVerified) {
            // firstName/lastName for an email/password account are only a guess derived
            // from the email address (vs. Google's real display name) — say so here,
            // the first moment this name is ever shown, rather than presenting it as fact.
            this.api.showToast(
              res.firstName
                ? `Email verified! We guessed your name as ${res.firstName}${res.lastName ? ' ' + res.lastName : ''} — update it in your profile if that's not right.`
                : 'Email verified! Welcome back.'
            );
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
            goToPostAuthDestination(this.api, this.router, returnUrl);
          } else {
            this.statusMsg.set("Still not verified — make sure you've clicked the link in the email, then try again.");
            this.isError.set(true);
          }
        },
        error: () => {
          this.checking.set(false);
          this.statusMsg.set('Could not confirm verification status. Please try again.');
          this.isError.set(true);
        }
      });
    } catch (err: any) {
      this.checking.set(false);
      this.statusMsg.set(err?.message || 'Something went wrong. Please try again.');
      this.isError.set(true);
    }
  }

  async resend() {
    if (this.cooldown() > 0) return;
    this.resending.set(true);
    this.statusMsg.set(null);

    try {
      await this.firebaseAuth.resendVerificationEmail();
      this.statusMsg.set('Verification email sent.');
      this.isError.set(false);
      this.startCooldown();
    } catch (err: any) {
      this.statusMsg.set(err?.message || 'Could not resend the email. Please try again shortly.');
      this.isError.set(true);
    } finally {
      this.resending.set(false);
    }
  }

  signOut() {
    this.firebaseAuth.logout().finally(() => {
      this.api.logout();
      this.router.navigate(['/auth/login']);
    });
  }

  private startCooldown() {
    this.cooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldown() - 1;
      this.cooldown.set(next);
      if (next <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }
}
