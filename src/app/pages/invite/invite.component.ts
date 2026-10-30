import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { InviteService, MyReferral } from '../../services/invite.service';

/** "Invite friends": her personal link, progress toward 5 qualified friends, and the free Premium plan. */
@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="invite-page">
      <section class="hero">
        <div class="container narrow">
          <span class="kicker"><mat-icon class="icon-sm">card_giftcard</mat-icon> Invite friends</span>
          <h1>Bring 5 moms.<br />Get Premium free.</h1>
          <p class="lead">When 5 friends join NartureBelle™ through your link and choose a care plan, you get our <strong>Premium plan free</strong>: the full 9 months, with every session included.</p>
        </div>
      </section>

      <div class="container narrow">
        @if (loading()) {
          <p class="hint">Loading your invite link…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p><button class="btn btn-outline btn-sm" (click)="load()">Try again</button></div>
        } @else if (ref(); as r) {
          @if (r.rewardGranted) {
            <section class="card reward">
              <mat-icon class="big">celebration</mat-icon>
              <h2>You did it! Premium is yours.</h2>
              <p>Five friends joined through you, so your free 9-month Premium plan is active, with every session included. We’ve emailed you the details.</p>
              <div class="row">
                <a routerLink="/journey" class="btn btn-primary">Go to my journey</a>
                <a routerLink="/care" class="btn btn-outline">Book a session</a>
              </div>
            </section>
          }

          <section class="card link-card">
            <h2>Your invite link</h2>
            <div class="link-row">
              <code class="link">{{ link() }}</code>
              <button class="btn btn-outline btn-sm" (click)="copy()"><mat-icon class="icon-sm">{{ copied() ? 'check' : 'content_copy' }}</mat-icon> {{ copied() ? 'Copied' : 'Copy' }}</button>
            </div>
            <div class="share-row">
              <a class="share wa" [href]="whatsapp()" target="_blank" rel="noopener"><mat-icon class="icon-sm">chat</mat-icon> Share on WhatsApp</a>
              @if (canNativeShare) { <button class="share" (click)="nativeShare()"><mat-icon class="icon-sm">ios_share</mat-icon> More ways to share</button> }
            </div>
            <p class="hint">Your code: <strong>{{ r.code }}</strong>. Friends pay the normal price; the reward is yours.</p>
          </section>

          <section class="card progress-card">
            <div class="progress-head">
              <h2>Your progress</h2>
              <span class="count"><strong>{{ r.qualified }}</strong> / {{ r.target }}</span>
            </div>
            <div class="slots" [attr.aria-label]="r.qualified + ' of ' + r.target + ' friends have joined and chosen a plan'">
              @for (s of slots(); track $index) {
                <span class="slot" [class.filled]="s"><mat-icon>{{ s ? 'favorite' : 'favorite_border' }}</mat-icon></span>
              }
            </div>
            <p class="hint">
              @if (r.rewardGranted) { Reward unlocked. Thank you for spreading the word! }
              @else if (r.qualified === 0) { A friend counts once she joins through your link and her first care plan is paid. }
              @else { {{ r.target - r.qualified }} more {{ r.target - r.qualified === 1 ? 'friend' : 'friends' }} to go. }
            </p>

            <h3>Friends who joined ({{ r.invited }})</h3>
            @for (f of r.friends; track $index) {
              <div class="friend">
                <span class="avatar">{{ f.name.charAt(0) }}</span>
                <div><strong>{{ f.name }}</strong><span class="hint">Joined {{ f.joinedAt | date:'d MMM y' }}</span></div>
                <span class="state" [class.done]="f.purchased">{{ f.purchased ? 'Chose a plan ✓' : 'Hasn’t chosen a plan yet' }}</span>
              </div>
            } @empty {
              <p class="hint">No one yet. Share your link to get started!</p>
            }
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .invite-page { padding-bottom: 5rem; }
    .narrow { max-width: 760px; }
    .hero { padding: 4rem 0 2.5rem; text-align: center; background: radial-gradient(circle at 20% 10%, #fde8e1, transparent 55%), radial-gradient(circle at 80% 30%, #fff4dc, transparent 55%); }
    .kicker { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    h1 { font-size: clamp(2.1rem, 5.5vw, 3.2rem); line-height: 1.1; color: var(--sage-900); margin: 0.7rem 0 1rem; }
    .lead { font-size: 1.05rem; color: var(--text-secondary); line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .card { background: #fff; border: 1px solid var(--border-light); border-radius: 20px; padding: 1.4rem 1.5rem; margin-top: 1.2rem; }
    h2 { font-size: 1.2rem; color: var(--sage-900); margin-bottom: 0.7rem; }
    h3 { font-size: 0.95rem; color: var(--sage-900); margin: 1.2rem 0 0.5rem; }
    .reward { text-align: center; border-color: #e0a526; background: linear-gradient(180deg, #fff6e0, #fff); }
    .reward .big { font-size: 2.6rem; width: 2.6rem; height: 2.6rem; color: #e0a526; }
    .reward p { color: var(--text-secondary); margin-bottom: 1rem; }
    .row { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .link-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .link { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: var(--sage-50); border-radius: 10px; padding: 0.55rem 0.75rem; font-size: 0.86rem; color: var(--sage-900); }
    .share-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.8rem 0 0.6rem; }
    .share { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 999px; padding: 0.5rem 1rem; font-size: 0.86rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid var(--border-light); background: #fff; color: var(--sage-900); }
    .share.wa { background: #25d366; border-color: #25d366; color: #fff; }
    .progress-head { display: flex; justify-content: space-between; align-items: baseline; }
    .count { font-size: 1rem; color: var(--text-secondary); }
    .count strong { font-size: 1.6rem; color: var(--blush-700); }
    .slots { display: flex; gap: 0.5rem; margin: 0.6rem 0; }
    .slot { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-light); color: var(--border-light); }
    .slot.filled { border: none; background: var(--blush-700); color: #fff; }
    .friend { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 0; border-bottom: 1px solid var(--border-subtle); }
    .friend > div { flex: 1; display: flex; flex-direction: column; }
    .friend strong { color: var(--sage-900); font-size: 0.9rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--sage-700); color: #fff; font-weight: 800; }
    .state { font-size: 0.78rem; color: var(--text-muted); }
    .state.done { color: var(--sage-700); font-weight: 700; }
    .hint { font-size: 0.82rem; color: var(--text-muted); }
    .empty { text-align: center; color: var(--text-secondary); }
    @media (max-width: 480px) { .slot { width: 44px; height: 44px; } }
  `]
})
export class InviteComponent implements OnInit {
  private invite = inject(InviteService);
  private api = inject(ApiService);

  ref = signal<MyReferral | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  copied = signal(false);
  canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  link = computed(() => (this.ref() ? this.invite.shareLink(this.ref()!.code) : ''));
  whatsapp = computed(() => (this.ref() ? this.invite.whatsappLink(this.ref()!.code) : ''));
  slots = computed(() => {
    const r = this.ref();
    if (!r) return [];
    return Array.from({ length: r.target }, (_, i) => r.rewardGranted || i < r.qualified);
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.invite.me().subscribe({
      next: r => { this.ref.set(r); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.errorMsg.set(err?.status === 404 ? 'Invites aren’t available on this server yet.' : 'We couldn’t load your invite link.');
      }
    });
  }

  copy() {
    navigator.clipboard?.writeText(this.link()).then(
      () => { this.copied.set(true); setTimeout(() => this.copied.set(false), 2000); },
      () => this.api.showToast(this.link())
    );
  }

  nativeShare() {
    navigator.share?.({ title: 'Join me on NartureBelle™', text: 'Pregnancy and baby care with verified professionals.', url: this.link() }).catch(() => {});
  }
}
