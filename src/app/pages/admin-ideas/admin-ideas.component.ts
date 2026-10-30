import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { Idea, IdeaStatus, IdeasService } from '../../services/ideas.service';

/** Admin: review ideas, move them to Under review / Implemented (with a public impact note) / Declined. */
@Component({
  selector: 'app-admin-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="admin-page">
      <div class="container narrow">
        <span class="kicker">Admin</span>
        <h1>Idea pool</h1>
        <p class="hint">Public page: <a routerLink="/ideas">/ideas</a>. Ideas marked Implemented appear on Idea Impact with your note. Declined ideas disappear from the pool.</p>

        <div class="tabs">
          @for (t of tabs; track t.label) {
            <button class="tab" [class.on]="status() === t.status" (click)="setStatus(t.status)">{{ t.label }}</button>
          }
        </div>

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p></div>
        } @else {
          @for (i of list(); track i.id) {
            <article class="card">
              <div class="head">
                <div>
                  <span class="meta">{{ i.number }} · {{ i.categoryLabel }} · {{ i.authorName }} · {{ i.createdAt | date:'d MMM y' }}</span>
                  <h3>{{ i.title }}</h3>
                </div>
                <span class="st">{{ statusLabel(i.status) }}</span>
              </div>
              <p class="desc">{{ i.description }}</p>
              <p class="votes"><strong>{{ i.paidVotes | number }}</strong> / {{ i.voteGoal | number }} paid votes · {{ i.votes - i.paidVotes | number }} unpaid @if (i.goalReached) { · <strong class="goal">goal reached</strong> }</p>
              @if (i.impactNote) { <p class="note"><mat-icon class="icon-sm">celebration</mat-icon> {{ i.impactNote }}</p> }

              @if (implementingId() === i.id) {
                <div class="impl">
                  <label [for]="'note' + i.id">What changed? (shown publicly on Idea Impact)</label>
                  <textarea [id]="'note' + i.id" class="form-control" rows="3" maxlength="1000" [(ngModel)]="impactNote"></textarea>
                  <div class="actions">
                    <button class="btn btn-link btn-sm" (click)="implementingId.set(null)">Cancel</button>
                    <button class="btn btn-primary btn-sm" [disabled]="!impactNote.trim() || busy()" (click)="change(i, 'IMPLEMENTED')">Mark implemented</button>
                  </div>
                </div>
              } @else {
                <div class="actions">
                  @if (i.status !== 'UNDER_REVIEW') { <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="change(i, 'UNDER_REVIEW')">Under review</button> }
                  @if (i.status !== 'IMPLEMENTED') { <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="startImplement(i)">Implemented…</button> }
                  @if (i.status !== 'DECLINED') { <button class="btn btn-link btn-sm danger" [disabled]="busy()" (click)="change(i, 'DECLINED')">Decline</button> }
                  @if (i.status !== 'OPEN') { <button class="btn btn-link btn-sm" [disabled]="busy()" (click)="change(i, 'OPEN')">Reopen</button> }
                </div>
              }
            </article>
          } @empty {
            <div class="card empty"><p>No ideas here.</p></div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 2.5rem 0 5rem; }
    .narrow { max-width: 860px; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trust-700); }
    h1 { font-size: 2rem; color: var(--sage-900); }
    .hint { font-size: 0.82rem; color: var(--text-muted); }
    .tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 1rem 0; }
    .tab { border: 1.5px solid var(--border-light); background: #fff; border-radius: 999px; padding: 0.38rem 0.85rem; font-weight: 600; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; }
    .tab.on { background: var(--sage-700); border-color: var(--sage-700); color: #fff; }
    .card { background: #fff; border: 1px solid var(--border-light); border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: 0.8rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; }
    .meta { font-size: 0.74rem; color: var(--text-muted); }
    h3 { font-size: 1.02rem; color: var(--sage-900); }
    .st { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--trust-700); white-space: nowrap; }
    .desc { font-size: 0.86rem; color: var(--text-secondary); white-space: pre-line; }
    .votes { font-size: 0.82rem; color: var(--text-secondary); }
    .goal { color: var(--sage-700); }
    .note { display: flex; gap: 0.35rem; font-size: 0.84rem; color: #7a5410; background: #fff4dc; border-radius: 10px; padding: 0.5rem 0.7rem; }
    .impl { display: flex; flex-direction: column; gap: 0.35rem; }
    .impl label { font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .actions { display: flex; justify-content: flex-end; gap: 0.4rem; flex-wrap: wrap; }
    .danger { color: #a0281c; }
    .empty { text-align: center; color: var(--text-secondary); }
  `]
})
export class AdminIdeasComponent implements OnInit {
  private ideas = inject(IdeasService);
  private api = inject(ApiService);

  tabs: { label: string; status: IdeaStatus | null }[] = [
    { label: 'All', status: null },
    { label: 'Open', status: 'OPEN' },
    { label: 'Under review', status: 'UNDER_REVIEW' },
    { label: 'Implemented', status: 'IMPLEMENTED' },
    { label: 'Declined', status: 'DECLINED' }
  ];
  status = signal<IdeaStatus | null>(null);
  list = signal<Idea[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  busy = signal(false);
  implementingId = signal<number | null>(null);
  impactNote = '';

  ngOnInit() { this.load(); }

  setStatus(s: IdeaStatus | null) { this.status.set(s); this.load(); }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.ideas.adminList(this.status()).subscribe({
      next: list => { this.list.set([...list].sort((a, b) => b.paidVotes - a.paidVotes)); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 403 ? 'Only NartureBelle™ admins can manage ideas.' : err?.status === 404 ? 'The idea pool isn’t available on this server yet.' : 'We couldn’t load ideas.');
      }
    });
  }

  startImplement(i: Idea) {
    this.impactNote = i.impactNote ?? '';
    this.implementingId.set(i.id);
  }

  change(i: Idea, status: IdeaStatus) {
    this.busy.set(true);
    this.ideas.setStatus(i.id, status, status === 'IMPLEMENTED' ? this.impactNote.trim() : undefined).subscribe({
      next: () => { this.busy.set(false); this.implementingId.set(null); this.api.showToast(`${i.number} is now ${this.statusLabel(status).toLowerCase()}.`); this.load(); },
      error: err => {
        this.busy.set(false);
        this.api.showToast(err?.error?.code === 'IMPACT_NOTE_REQUIRED' ? 'Please say what changed before marking it implemented.' : err?.error?.message || 'Couldn’t update the idea.');
      }
    });
  }

  statusLabel(s: IdeaStatus): string {
    return { OPEN: 'Open', UNDER_REVIEW: 'Under review', IMPLEMENTED: 'Implemented', DECLINED: 'Declined' }[s];
  }
}
