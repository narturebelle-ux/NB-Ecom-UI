import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { Idea, IdeasService } from '../../services/ideas.service';

/** One idea: progress toward the paid-vote goal, vote button and share actions. */
@Component({
  selector: 'app-idea-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    @let i = idea();
    <article class="idea" [class.big]="big()" [class.done]="i.status === 'IMPLEMENTED'">
      <div class="top">
        <span class="cat">{{ i.categoryLabel }}</span>
        <span class="num">{{ i.number }}</span>
        @if (i.status === 'UNDER_REVIEW') { <span class="badge review">Under review</span> }
        @if (i.status === 'IMPLEMENTED') { <span class="badge impl"><mat-icon class="icon-sm">auto_awesome</mat-icon> Made real</span> }
        @if (i.goalReached && i.status === 'OPEN') { <span class="badge goal">Goal reached!</span> }
        @if (i.mine) { <span class="badge mine">Your idea</span> }
      </div>

      @if (big()) { <h1>{{ i.title }}</h1> } @else { <h3><a [routerLink]="['/ideas', i.id]">{{ i.title }}</a></h3> }
      <p class="desc" [class.clamp]="!big()">{{ i.description }}</p>
      <p class="by">Shared by {{ i.authorName }} · {{ i.createdAt | date:'d MMM' }}</p>

      <div class="progress" [attr.aria-label]="i.paidVotes + ' of ' + i.voteGoal + ' member votes'">
        <div class="bar"><div class="fill" [style.width.%]="pct()"></div></div>
        <div class="nums">
          <span><strong>{{ i.paidVotes | number }}</strong> / {{ i.voteGoal | number }} member votes</span>
          <span class="all">{{ i.votes | number }} total</span>
        </div>
      </div>

      @if (i.status === 'IMPLEMENTED' && i.impactNote) {
        <p class="impact"><mat-icon class="icon-sm">celebration</mat-icon> {{ i.impactNote }}</p>
      }

      <div class="actions">
        @if (i.status === 'OPEN' && poolOpen() && !i.mine) {
          <button type="button" class="vote" [class.on]="i.votedByMe" [disabled]="busy()" (click)="voteToggle.emit(i)" [attr.aria-pressed]="!!i.votedByMe">
            <mat-icon class="icon-sm">{{ i.votedByMe ? 'favorite' : 'favorite_border' }}</mat-icon>
            {{ i.votedByMe ? 'Voted' : 'Vote' }}
          </button>
        }
        <a class="share wa" [href]="whatsapp()" target="_blank" rel="noopener"><mat-icon class="icon-sm">chat</mat-icon> WhatsApp</a>
        <button type="button" class="share" (click)="copy()"><mat-icon class="icon-sm">{{ copied() ? 'check' : 'link' }}</mat-icon> {{ copied() ? 'Copied' : 'Copy link' }}</button>
        @if (canNativeShare) {
          <button type="button" class="share" (click)="nativeShare()"><mat-icon class="icon-sm">ios_share</mat-icon> Share</button>
        }
      </div>
    </article>
  `,
  styles: [`
    .idea { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 18px; padding: 1.1rem 1.2rem; display: flex; flex-direction: column; gap: 0.55rem; height: 100%; }
    .idea.big { padding: 1.6rem 1.7rem; border-radius: 22px; box-shadow: 0 10px 40px rgba(21, 48, 42, 0.08); }
    .idea.done { border-color: var(--gold-500); background: linear-gradient(180deg, var(--gold-100), var(--bg-surface)); }
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
    .cat { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--blush-700); }
    .num { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
    .badge { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; padding: 0.12rem 0.5rem; border-radius: 999px; }
    .review { background: var(--trust-100); color: var(--trust-900); }
    .impl { background: var(--gold-100); color: var(--gold-700); }
    .goal { background: var(--solid-sage-700); color: #fff; }
    .mine { background: var(--sage-50); color: var(--sage-900); }
    h1 { font-size: clamp(1.5rem, 3.5vw, 2.1rem); color: var(--sage-900); line-height: 1.25; }
    h3 { font-size: 1.05rem; line-height: 1.35; }
    h3 a { color: var(--sage-900); text-decoration: none; }
    h3 a:hover { text-decoration: underline; }
    .desc { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line; }
    .big .desc { font-size: 1rem; }
    .clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .by { font-size: 0.76rem; color: var(--text-muted); }
    .progress { margin-top: auto; }
    .bar { height: 10px; border-radius: 999px; background: var(--sage-50); overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--blush-700), var(--gold-500)); min-width: 4px; transition: width 0.6s ease; }
    .nums { display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.3rem; }
    .nums strong { color: var(--sage-900); }
    .all { color: var(--text-muted); }
    .impact { display: flex; gap: 0.35rem; font-size: 0.85rem; color: var(--gold-700); background: var(--gold-100); border-radius: 10px; padding: 0.55rem 0.7rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.2rem; }
    .vote, .share { display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 999px; padding: 0.42rem 0.9rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid var(--border-light); background: var(--bg-surface); color: var(--sage-900); }
    .vote { background: var(--solid-blush-700); border-color: var(--solid-blush-700); color: #fff; }
    .vote.on { background: var(--bg-surface); color: var(--blush-700); }
    .vote:disabled { opacity: 0.6; cursor: wait; }
    .share.wa { border-color: var(--sage-500); color: var(--sage-700); }
  `]
})
export class IdeaCardComponent {
  private ideas = inject(IdeasService);
  private api = inject(ApiService);

  idea = input.required<Idea>();
  poolOpen = input(true);
  busy = input(false);
  big = input(false);
  voteToggle = output<Idea>();

  copied = signal(false);
  canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  pct = computed(() => Math.min(100, (this.idea().paidVotes / Math.max(1, this.idea().voteGoal)) * 100));
  whatsapp = computed(() => this.ideas.whatsappUrl(this.idea()));

  copy() {
    const url = this.ideas.shareUrl(this.idea());
    navigator.clipboard?.writeText(url).then(
      () => { this.copied.set(true); setTimeout(() => this.copied.set(false), 2000); },
      () => this.api.showToast(url)
    );
  }

  nativeShare() {
    const i = this.idea();
    navigator.share?.({ title: i.title, text: `Vote for this idea on NartureBelle™: “${i.title}”`, url: this.ideas.shareUrl(i) }).catch(() => {});
  }
}
