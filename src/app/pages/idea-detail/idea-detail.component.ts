import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { IdeaCardComponent } from '../../components/idea-card/idea-card.component';
import { Idea, IdeasMeta, IdeasService, ideaErrorMessage } from '../../services/ideas.service';

/** Public page for one idea: the target of every share link. Explains how a friend's vote counts. */
@Component({
  selector: 'app-idea-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, IdeaCardComponent],
  template: `
    <div class="idea-page">
      <div class="container narrow">
        @if (commerce.canShareIdeas()) { <a routerLink="/ideas" class="back"><mat-icon class="icon-sm">arrow_back</mat-icon> All ideas</a> }

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (!idea()) {
          <div class="card empty">
            <p>{{ notFound() ? 'This idea isn’t in the pool any more.' : 'We couldn’t load this idea right now.' }}</p>
            @if (commerce.canShareIdeas()) { <a routerLink="/ideas" class="btn btn-outline btn-sm">See all ideas</a> }
          </div>
        } @else {
          <span class="kicker"><mat-icon class="icon-sm">lightbulb</mat-icon> A mom’s idea for NartureBelle™</span>
          <app-idea-card [idea]="idea()!" [big]="true" [poolOpen]="!!meta()?.open" [busy]="busy()" (voteToggle)="toggleVote($event)" />

          @if (!idea()!.mine && idea()!.status === 'OPEN' && meta()?.open) {
            <section class="card how">
              <h2>Help this idea happen</h2>
              <ol>
                <li><strong>Create a free account</strong> on NartureBelle™ and tap <em>Vote</em>.</li>
                <li><strong>Choose a care plan</strong>. Votes from members with a plan count toward the
                  {{ idea()!.voteGoal | number }}-vote goal.</li>
                <li><strong>Pass it on</strong> to other moms you know.</li>
              </ol>
              @if (!api.currentUser()) {
                <div class="cta">
                  <a class="btn btn-primary" [routerLink]="['/auth/signup']" [queryParams]="{ returnUrl: '/ideas/' + idea()!.id }">Create an account &amp; vote</a>
                  <a class="btn btn-outline" [routerLink]="['/auth/login']" [queryParams]="{ returnUrl: '/ideas/' + idea()!.id }">I already have one</a>
                </div>
              } @else {
                <div class="cta"><a class="btn btn-outline" routerLink="/plans">See care plans</a></div>
              }
            </section>
          }
          @if (idea()!.mine) {
            <p class="mine-note"><mat-icon class="icon-sm">campaign</mat-icon> This is your idea. Share the link above with moms and families you know. Every member vote brings it closer.</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .idea-page { padding: 2rem 0 5rem; background: radial-gradient(circle at 15% 0%, #fde8e1, transparent 45%); }
    .narrow { max-width: 760px; }
    .back { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--trust-700); text-decoration: none; margin-bottom: 1rem; }
    .kicker { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--blush-700); margin-bottom: 0.7rem; }
    .card { background: #fff; border: 1px solid var(--border-light); border-radius: 18px; padding: 1.3rem 1.4rem; margin-top: 1.2rem; }
    .how h2 { font-size: 1.2rem; color: var(--sage-900); margin-bottom: 0.6rem; }
    .how ol { padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.7; }
    .cta { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
    .mine-note { display: flex; gap: 0.4rem; align-items: center; margin-top: 1rem; font-size: 0.9rem; color: var(--sage-900); background: var(--sage-50); border-radius: 12px; padding: 0.75rem 0.9rem; }
    .empty { text-align: center; color: var(--text-secondary); }
    .hint { color: var(--text-muted); }
  `]
})
export class IdeaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ideas = inject(IdeasService);
  api = inject(ApiService);
  commerce = inject(CommerceService);

  idea = signal<Idea | null>(null);
  meta = signal<IdeasMeta | null>(null);
  loading = signal(true);
  notFound = signal(false);
  busy = signal(false);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.ideas.meta().subscribe({ next: m => this.meta.set(m), error: () => {} });
    this.ideas.get(id).subscribe({
      next: i => { this.idea.set(i); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notFound.set(err?.status === 404); }
    });
  }

  toggleVote(i: Idea) {
    if (!this.api.currentUser()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/ideas/' + i.id } });
      return;
    }
    this.busy.set(true);
    (i.votedByMe ? this.ideas.unvote(i.id) : this.ideas.vote(i.id)).subscribe({
      next: updated => { this.busy.set(false); this.idea.set(updated); },
      error: err => {
        this.busy.set(false);
        const msg = ideaErrorMessage(err);
        if (msg) this.api.showToast(msg);
      }
    });
  }
}
