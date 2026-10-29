import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { ConsentDocument } from '../../models/maternal.models';

/**
 * Terms & privacy consent screen (roadmap §1.1 UI). Reached right after sign-up/sign-in via
 * goToPostAuthDestination() whenever GET /me reports pendingConsents, and also reachable
 * directly if the API ever rejects a request with 403 CONSENT_REQUIRED (handled by
 * auth.interceptor.ts). Fetches the currently active documents (public) and this user's
 * pending list, then grants whichever ones are outstanding in one action.
 */
@Component({
  selector: 'app-consent',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="consent-wrapper">
      <div class="consent-card card glass">
        <mat-icon class="hero-icon">verified_user</mat-icon>
        <h1>Before we continue</h1>
        <p class="lead">
          Please review and accept the following to keep using NartureBelle. These govern how your
          care information is used and shared with your care team — you can review or revoke them
          anytime from Profile &amp; Privacy.
        </p>

        @if (loading()) {
          <p class="status">Loading…</p>
        } @else if (documents().length === 0) {
          <p class="status">Nothing pending — you're all set.</p>
          <button class="btn btn-primary btn-lg full-w" (click)="proceed()">Continue</button>
        } @else {
          <div class="doc-list">
            @for (doc of documents(); track doc.id) {
              <div class="doc-block">
                <div class="doc-head">
                  <h3>{{ doc.title || doc.type }}</h3>
                  <span class="doc-version">v{{ doc.version }}</span>
                </div>
                <div class="doc-body">{{ doc.bodyMarkdown }}</div>
              </div>
            }
          </div>

          @if (errorMsg()) {
            <div class="status-banner is-error">{{ errorMsg() }}</div>
          }

          <label class="agree-row">
            <input type="checkbox" [checked]="agreed()" (change)="agreed.set(!agreed())" />
            <span>I have read and agree to the above.</span>
          </label>

          <button class="btn btn-primary btn-lg full-w" [disabled]="!agreed() || granting()" (click)="grantAll()">
            {{ granting() ? 'Saving…' : 'Agree & Continue' }}
          </button>
        }

        <button class="btn-link mt-2" (click)="signOut()">Sign out instead</button>
      </div>
    </div>
  `,
  styles: [`
    .consent-wrapper {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
    }
    .consent-card {
      max-width: 560px;
      width: 100%;
      padding: 2.5rem;
      text-align: center;
      border-radius: var(--radius-xl);
      background: #fff;
      box-shadow: 0 20px 45px rgba(27, 51, 39, 0.08);
      border: 1px solid var(--border-light);
    }
    .icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    h1 { font-size: 1.5rem; color: var(--primary-deep); margin-bottom: 0.75rem; }
    .lead { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem; text-align: left; }
    .status { font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem; }

    .doc-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem; text-align: left; }
    .doc-block {
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .doc-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: var(--sage-50);
    }
    .doc-head h3 { font-size: 0.95rem; color: var(--sage-900); margin: 0; }
    .doc-version { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
    .doc-body {
      padding: 0.85rem 1rem;
      max-height: 160px;
      overflow-y: auto;
      font-size: 0.82rem;
      line-height: 1.55;
      color: var(--text-secondary);
      white-space: pre-wrap;
    }

    .agree-row {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      text-align: left;
      font-size: 0.86rem;
      color: var(--text-secondary);
      margin-bottom: 1.25rem;
      cursor: pointer;
    }
    .agree-row input { margin-top: 0.15rem; }

    .status-banner {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      text-align: left;
    }
    .status-banner.is-error {
      background: #fdecea;
      color: #a0281c;
      border: 1px solid #f5b7b1;
    }

    .btn { padding: 0.8rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #1b3327; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .full-w { width: 100%; }
    .btn-link { background: none; border: none; color: var(--text-muted); font-size: 0.82rem; text-decoration: underline; cursor: pointer; padding: 0.4rem; margin-top: 0.75rem; }
  `]
})
export class ConsentComponent implements OnInit {
  private api = inject(ApiService);
  private firebaseAuth = inject(FirebaseAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  granting = signal(false);
  agreed = signal(false);
  errorMsg = signal<string | null>(null);
  documents = signal<ConsentDocument[]>([]);

  private pendingTypes: string[] = [];

  ngOnInit() {
    this.api.getMyConsents().subscribe({
      next: (status) => {
        this.pendingTypes = status.pending || [];
        if (this.pendingTypes.length === 0) {
          this.loading.set(false);
          this.documents.set([]);
          return;
        }
        this.api.getConsentDocuments().subscribe({
          next: (docs) => {
            this.documents.set(docs.filter(d => this.pendingTypes.includes(d.type)));
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.errorMsg.set('Could not load the terms & privacy documents. Please try again.');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Could not check your consent status. Please try again.');
      }
    });
  }

  grantAll() {
    if (!this.agreed() || this.documents().length === 0) return;
    this.granting.set(true);
    this.errorMsg.set(null);

    const docs = this.documents();
    let index = 0;
    const next = () => {
      if (index >= docs.length) {
        this.granting.set(false);
        this.proceed();
        return;
      }
      const doc = docs[index];
      this.api.grantConsent(doc.type, doc.version).subscribe({
        next: () => {
          index++;
          next();
        },
        error: (err) => {
          this.granting.set(false);
          this.errorMsg.set(err?.error?.message || `Could not save your agreement to ${doc.title || doc.type}. Please try again.`);
        }
      });
    };
    next();
  }

  proceed() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl || '/journey');
  }

  signOut() {
    this.firebaseAuth.logout().finally(() => {
      this.api.logout();
      this.router.navigate(['/auth/login']);
    });
  }
}
