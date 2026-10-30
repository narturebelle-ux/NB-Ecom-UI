import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { IdeaCardComponent } from '../../components/idea-card/idea-card.component';
import {
  IDEA_DESCRIPTION_MAX,
  IDEA_TITLE_MAX,
  Idea,
  IdeaSort,
  IdeasMeta,
  IdeasService,
  ideaErrorMessage
} from '../../services/ideas.service';

/** Idea pool campaign page: share an idea, rally votes, see what moms have already changed (Idea Impact). */
@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, IdeaCardComponent],
  template: `
    <div class="ideas-page">
      <!-- ===== Hero ===== -->
      <section class="hero">
        <div class="container narrow">
          <span class="kicker"><mat-icon class="icon-sm">lightbulb</mat-icon> The NartureBelle™ Idea Pool</span>
          <h1>Your idea could change<br />motherhood care.</h1>
          <p class="lead">
            You know what mothers need better than anyone. Share one idea. Rally your circle.
            When it reaches <strong>{{ (meta()?.voteGoal ?? 1000) | number }} member votes</strong>, our team builds it, and every mom benefits.
          </p>
          @if (meta(); as m) {
            @if (m.open) {
              <span class="status open"><span class="dot"></span> The pool is open. Ideas and votes are welcome now</span>
            } @else {
              <span class="status closed">The pool has closed. Thank you, moms! Browse the ideas and see what we’re building.</span>
            }
          }
          <div class="hero-cta">
            @if (meta()?.open) { <a class="btn btn-primary btn-lg" href="#share" (click)="scrollTo($event, 'share')">Share your idea</a> }
            <a class="btn btn-outline btn-lg" href="#pool" (click)="scrollTo($event, 'pool')">See the ideas</a>
          </div>
        </div>
      </section>

      <!-- ===== How it works ===== -->
      <section class="container narrow steps">
        <div class="step"><span class="n">1</span><strong>Share your idea</strong><span>Something that would make pregnancy, postpartum or baby care easier, from sessions to the app itself.</span></div>
        <div class="step"><span class="n">2</span><strong>Rally your circle</strong><span>Send your idea to friends and family. Votes from NartureBelle™ members with a care plan count toward the goal.</span></div>
        <div class="step"><span class="n">3</span><strong>We make it real</strong><span>Ideas that reach the goal go to our team. The ones we build are celebrated on Idea Impact below.</span></div>
      </section>

      <!-- ===== Share an idea ===== -->
      @if (meta()?.open) {
        <section class="container narrow" id="share">
          <div class="share-panel">
            @if (justPosted(); as p) {
              <div class="posted">
                <h2><mat-icon>celebration</mat-icon> Your idea is in the pool!</h2>
                <p>Now share it. Every member who votes brings it closer to <strong>{{ p.voteGoal | number }}</strong>.</p>
                <app-idea-card [idea]="p" [poolOpen]="true" />
                <button class="btn btn-link btn-sm" (click)="justPosted.set(null)">Share another idea</button>
              </div>
            } @else {
              <h2>What would make it better?</h2>
              <p class="hint">Pick the area your idea is about.</p>
              <div class="cats" role="radiogroup" aria-label="Category">
                @for (c of meta()?.categories ?? []; track c.code) {
                  <button type="button" role="radio" class="cat-tile" [class.on]="draft.category === c.code" [attr.aria-checked]="draft.category === c.code" (click)="draft.category = c.code">
                    <mat-icon>{{ categoryIcon(c.code) }}</mat-icon>
                    <strong>{{ c.label }}</strong>
                    <span>{{ c.description }}</span>
                  </button>
                }
              </div>

              <div class="field">
                <label for="ititle">Your idea in one line</label>
                <input id="ititle" class="form-control big-input" [maxlength]="titleMax" placeholder="e.g. A night-time lactation helpline" [(ngModel)]="draft.title" />
                <span class="count">{{ draft.title.length }}/{{ titleMax }}</span>
              </div>
              <div class="field">
                <label for="idesc">Tell us more</label>
                <textarea id="idesc" class="form-control" rows="5" [maxlength]="descMax" placeholder="What would it look like, and how would it help mothers like you?" [(ngModel)]="draft.description"></textarea>
                <span class="count">{{ draft.description.length }}/{{ descMax }}</span>
              </div>
              <label class="consent">
                <input type="checkbox" [(ngModel)]="draft.featureConsent" />
                If my idea is made real, feature me by name on Idea Impact.
              </label>
              <p class="hint public-note"><mat-icon class="icon-sm">visibility</mat-icon> Your idea appears in the public pool as <strong>{{ publicName() }}</strong>. We never show your email or phone.</p>
              @if (postError()) { <p class="error-msg">{{ postError() }}</p> }
              <button class="btn btn-primary btn-lg" [disabled]="posting() || !canPost()" (click)="post()">{{ posting() ? 'Posting…' : 'Post my idea' }}</button>
            }
          </div>
        </section>
      }

      <!-- ===== Pool ===== -->
      <section class="container pool" id="pool">
        <div class="pool-head">
          <h2>The idea pool</h2>
          <div class="sort" role="tablist">
            <button role="tab" [class.on]="sort() === 'top'" [attr.aria-selected]="sort() === 'top'" (click)="setSort('top')">Most votes</button>
            <button role="tab" [class.on]="sort() === 'new'" [attr.aria-selected]="sort() === 'new'" (click)="setSort('new')">Newest</button>
          </div>
        </div>
        <div class="chips">
          <button class="chip" [class.on]="category() === null" (click)="setCategory(null)">All</button>
          @for (c of meta()?.categories ?? []; track c.code) {
            <button class="chip" [class.on]="category() === c.code" (click)="setCategory(c.code)">{{ c.label }}</button>
          }
        </div>
        @if (loading()) {
          <p class="hint">Loading ideas…</p>
        } @else if (loadError()) {
          <div class="empty"><p>{{ loadError() }}</p><button class="btn btn-outline btn-sm" (click)="loadPool()">Try again</button></div>
        } @else {
          <div class="grid">
            @for (i of pool(); track i.id) {
              <app-idea-card [idea]="i" [poolOpen]="!!meta()?.open" [busy]="busyId() === i.id" (voteToggle)="toggleVote($event)" />
            } @empty {
              <div class="empty span"><mat-icon>emoji_objects</mat-icon><p>No ideas here yet. Yours could be the first!</p></div>
            }
          </div>
        }
      </section>

      <!-- ===== My ideas ===== -->
      @if (myIdeas().length) {
        <section class="container mine">
          <h2>Your ideas</h2>
          <div class="grid">
            @for (i of myIdeas(); track i.id) { <app-idea-card [idea]="i" [poolOpen]="!!meta()?.open" /> }
          </div>
        </section>
      }

      <!-- ===== Idea Impact ===== -->
      <section class="impact-band">
        <div class="container">
          <span class="kicker light"><mat-icon class="icon-sm">auto_awesome</mat-icon> Idea Impact</span>
          <h2>Ideas moms made real</h2>
          @if (impact().length) {
            <div class="grid">
              @for (i of impact(); track i.id) {
                <div class="impact-card">
                  <span class="when">Made real {{ i.implementedAt | date:'MMM y' }}</span>
                  <h3>{{ i.title }}</h3>
                  @if (i.impactNote) { <p>{{ i.impactNote }}</p> }
                  <span class="who">Idea by {{ i.authorName }} · {{ i.paidVotes | number }} member votes</span>
                </div>
              }
            </div>
          } @else {
            <p class="impact-empty">The first ideas are being voted on now. Those we build will be celebrated right here.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ideas-page { padding-bottom: 0; }
    .narrow { max-width: 900px; }
    .hero { padding: 4.5rem 0 3rem; text-align: center; background: radial-gradient(circle at 20% 10%, var(--sage-100), transparent 55%), radial-gradient(circle at 85% 30%, var(--gold-100), transparent 55%); }
    .kicker { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .kicker.light { color: #ffd68a; }
    .hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1.1; color: var(--sage-900); margin: 0.8rem 0 1rem; }
    .lead { font-size: 1.1rem; color: var(--text-secondary); max-width: 640px; margin: 0 auto 1.2rem; line-height: 1.6; }
    .status { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.85rem; font-weight: 700; padding: 0.4rem 0.9rem; border-radius: 999px; }
    .status.open { background: var(--sage-100); color: var(--sage-700); }
    .status.closed { background: var(--gold-100); color: var(--gold-700); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sage-500); animation: pulse 1.6s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .hero-cta { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; margin-top: 1.4rem; }
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 2.5rem auto; }
    .step { display: flex; flex-direction: column; gap: 0.35rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 18px; padding: 1.2rem; }
    .step .n { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--solid-blush-700); color: #fff; font-weight: 800; }
    .step strong { color: var(--sage-900); }
    .step span:last-child { font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; }
    .share-panel { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 24px; padding: 1.8rem; box-shadow: 0 12px 40px rgba(21, 48, 42, 0.07); margin-bottom: 2.5rem; }
    .share-panel h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 1.5rem; color: var(--sage-900); margin-bottom: 0.3rem; }
    .posted { text-align: center; }
    .posted h2 { justify-content: center; color: var(--blush-700); }
    .posted p { color: var(--text-secondary); margin-bottom: 1rem; }
    .cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.6rem; margin: 0.8rem 0 1.2rem; }
    .cat-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; text-align: left; border: 1.5px solid var(--border-light); background: var(--bg-surface); border-radius: 14px; padding: 0.8rem; cursor: pointer; }
    .cat-tile mat-icon { color: var(--blush-700); }
    .cat-tile strong { font-size: 0.86rem; color: var(--sage-900); }
    .cat-tile span { font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; }
    .cat-tile.on { border-color: var(--blush-700); background: var(--blush-50); box-shadow: 0 0 0 3px rgba(179, 90, 72, 0.12); }
    .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
    .field label { font-size: 0.86rem; font-weight: 700; color: var(--sage-900); }
    .big-input { font-size: 1.1rem; padding: 0.7rem 0.9rem; }
    .count { align-self: flex-end; font-size: 0.72rem; color: var(--text-muted); }
    .consent { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 0.4rem; }
    .public-note { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 1rem; }
    .hint { font-size: 0.82rem; color: var(--text-muted); }
    .error-msg { color: var(--danger-text); font-size: 0.86rem; margin-bottom: 0.6rem; }
    .pool { margin-bottom: 3rem; }
    .pool-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .pool-head h2, .mine h2 { font-size: 1.6rem; color: var(--sage-900); }
    .sort { display: inline-flex; border: 1.5px solid var(--border-light); border-radius: 999px; overflow: hidden; }
    .sort button { border: none; background: var(--bg-surface); padding: 0.4rem 0.9rem; font-weight: 700; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; }
    .sort button.on { background: var(--solid-sage-700); color: #fff; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 1rem 0 1.2rem; }
    .chip { border: 1.5px solid var(--border-light); background: var(--bg-surface); border-radius: 999px; padding: 0.38rem 0.85rem; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    .chip.on { background: var(--solid-blush-700); border-color: var(--solid-blush-700); color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem; }
    .span { grid-column: 1 / -1; }
    .empty { text-align: center; color: var(--text-secondary); padding: 2rem; }
    .empty mat-icon { color: var(--gold-500); }
    .mine { margin-bottom: 3rem; }
    .impact-band { background: var(--solid-sage-900); color: #fff; padding: 3.5rem 0; }
    .impact-band h2 { font-size: 2rem; margin: 0.5rem 0 1.5rem; color: #fff; }
    .impact-card { background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 18px; padding: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .impact-card h3 { color: #fff; font-size: 1.05rem; }
    .impact-card p { color: rgba(255, 255, 255, 0.85); font-size: 0.88rem; line-height: 1.5; }
    .when { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #ffd68a; }
    .who { font-size: 0.78rem; color: rgba(255, 255, 255, 0.65); }
    .impact-empty { color: rgba(255, 255, 255, 0.8); }
  `]
})
export class IdeasComponent implements OnInit {
  private ideas = inject(IdeasService);
  api = inject(ApiService);

  titleMax = IDEA_TITLE_MAX;
  descMax = IDEA_DESCRIPTION_MAX;

  meta = signal<IdeasMeta | null>(null);
  pool = signal<Idea[]>([]);
  impact = signal<Idea[]>([]);
  myIdeas = signal<Idea[]>([]);
  category = signal<string | null>(null);
  sort = signal<IdeaSort>('top');
  loading = signal(true);
  loadError = signal<string | null>(null);
  busyId = signal<number | null>(null);
  posting = signal(false);
  postError = signal<string | null>(null);
  justPosted = signal<Idea | null>(null);

  draft = { category: '', title: '', description: '', featureConsent: false };

  /** How her name shows publicly: first name + last initial (the API derives it the same way). */
  publicName = computed(() => {
    const u = this.api.currentUser();
    const first = u?.firstName?.trim() || 'Your first name';
    const last = u?.lastName?.trim();
    return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
  });

  ngOnInit() {
    this.ideas.meta().subscribe({ next: m => this.meta.set(m), error: () => {} });
    this.ideas.impact().subscribe({ next: list => this.impact.set(list), error: () => {} });
    if (this.api.currentUser()) this.ideas.mine().subscribe({ next: list => this.myIdeas.set(list), error: () => {} });
    this.loadPool();
  }

  loadPool() {
    this.loading.set(true);
    this.loadError.set(null);
    this.ideas.list(this.category(), this.sort()).subscribe({
      next: list => { this.pool.set(list); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.loadError.set(err?.status === 404 ? 'The idea pool isn’t open on this server yet.' : 'We couldn’t load ideas right now.');
      }
    });
  }

  setCategory(c: string | null) { this.category.set(c); this.loadPool(); }
  setSort(s: IdeaSort) { this.sort.set(s); this.loadPool(); }

  canPost(): boolean {
    return !!this.draft.category && this.draft.title.trim().length >= 5 && this.draft.description.trim().length >= 10;
  }

  post() {
    if (!this.canPost()) { this.postError.set('Pick a category, and give your idea a title and a few words of detail.'); return; }
    this.posting.set(true);
    this.postError.set(null);
    this.ideas.post({ ...this.draft, title: this.draft.title.trim(), description: this.draft.description.trim() }).subscribe({
      next: idea => {
        this.posting.set(false);
        this.justPosted.set(idea);
        this.myIdeas.update(list => [idea, ...list]);
        this.draft = { category: '', title: '', description: '', featureConsent: false };
        if (this.sort() === 'new') this.loadPool();
      },
      error: err => { this.posting.set(false); this.postError.set(ideaErrorMessage(err)); }
    });
  }

  toggleVote(idea: Idea) {
    this.busyId.set(idea.id);
    (idea.votedByMe ? this.ideas.unvote(idea.id) : this.ideas.vote(idea.id)).subscribe({
      next: updated => {
        this.busyId.set(null);
        this.pool.update(list => list.map(i => (i.id === updated.id ? updated : i)));
      },
      error: err => {
        this.busyId.set(null);
        const msg = ideaErrorMessage(err);
        if (msg) this.api.showToast(msg);
      }
    });
  }

  categoryIcon(code: string): string {
    return ({
      CARE_AND_SESSIONS: 'medical_services',
      NUTRITION_AND_WELLNESS: 'spa',
      BABY_AND_POSTPARTUM: 'child_care',
      COMMUNITY: 'diversity_3',
      APP_EXPERIENCE: 'phone_iphone'
    } as Record<string, string>)[code] ?? 'lightbulb';
  }

  scrollTo(e: Event, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
