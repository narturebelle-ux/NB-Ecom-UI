import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CareersService, EMPLOYMENT_TYPE_LABELS, Job, WORK_MODE_LABELS } from '../../services/careers.service';

/** Public careers page: open roles. */
@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="careers-page">
      <section class="hero">
        <div class="container narrow">
          <span class="kicker">Careers</span>
          <h1>Help us care for mothers</h1>
          <p class="lead">We’re an early-stage team building care that knows every mother: her stage, her language and her story. If that matters to you, we’d love to hear from you.</p>
        </div>
      </section>

      <section class="container narrow">
        <h2>Open roles</h2>
        @if (loading()) {
          <p class="hint">Loading roles…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p><button class="btn btn-outline btn-sm" (click)="load()">Try again</button></div>
        } @else {
          @for (j of jobs(); track j.id) {
            <a class="job card" [routerLink]="['/careers', j.id]">
              <div class="job-main">
                <h3>{{ j.title }}</h3>
                <p class="summary">{{ j.summary }}</p>
                <div class="meta">
                  @if (j.team) { <span><mat-icon class="icon-sm">groups</mat-icon> {{ j.team }}</span> }
                  <span><mat-icon class="icon-sm">location_on</mat-icon> {{ j.location }}</span>
                  <span><mat-icon class="icon-sm">work</mat-icon> {{ typeLabel(j) }}</span>
                  <span><mat-icon class="icon-sm">home_work</mat-icon> {{ modeLabel(j) }}</span>
                </div>
              </div>
              <span class="view">View &amp; apply <mat-icon class="icon-sm">arrow_forward</mat-icon></span>
            </a>
          } @empty {
            <div class="card empty">
              <mat-icon>work_outline</mat-icon>
              <p>There are no open roles right now. We’re growing, so check back soon.</p>
            </div>
          }
        }

        <div class="card ideas">
          <mat-icon>lightbulb</mat-icon>
          <div>
            <strong>Not looking for a job, but have an idea?</strong>
            <p>We’re early and listening. Tell us what would make NartureBelle better.</p>
          </div>
          <a routerLink="/feedback" class="btn btn-outline btn-sm">Share an idea</a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .careers-page { padding-bottom: 5rem; }
    .narrow { max-width: 860px; }
    .hero { padding: 4rem 0 2.5rem; text-align: center; background: linear-gradient(180deg, var(--sage-50), transparent); }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .hero h1 { font-size: clamp(2rem, 4.5vw, 2.8rem); color: var(--sage-900); margin: 0.6rem 0; }
    .lead { font-size: 1.05rem; color: var(--text-secondary); max-width: 620px; margin: 0 auto; line-height: 1.6; }
    h2 { font-size: 1.4rem; color: var(--sage-900); margin: 1.5rem 0 0.9rem; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); }
    .job { display: flex; gap: 1rem; align-items: center; padding: 1.15rem 1.3rem; margin-bottom: 0.8rem; text-decoration: none; color: inherit; }
    .job:hover { border-color: var(--sage-700); }
    .job-main { flex: 1; min-width: 0; }
    .job h3 { font-size: 1.1rem; color: var(--sage-900); }
    .summary { font-size: 0.88rem; color: var(--text-secondary); margin: 0.3rem 0 0.5rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; font-size: 0.8rem; color: var(--text-muted); }
    .meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
    .view { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; color: var(--sage-700); white-space: nowrap; }
    .empty { padding: 2rem; text-align: center; color: var(--text-secondary); }
    .empty mat-icon { color: var(--sage-700); }
    .ideas { display: flex; gap: 1rem; align-items: center; padding: 1.1rem 1.3rem; margin-top: 2rem; background: var(--sage-50); flex-wrap: wrap; }
    .ideas mat-icon { color: var(--blush-700); }
    .ideas div { flex: 1; min-width: 14rem; }
    .ideas strong { color: var(--sage-900); }
    .ideas p { font-size: 0.86rem; color: var(--text-secondary); }
    .hint { color: var(--text-muted); }
    @media (max-width: 560px) { .job { flex-direction: column; align-items: flex-start; } }
  `]
})
export class CareersComponent implements OnInit {
  private careers = inject(CareersService);

  jobs = signal<Job[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.careers.getJobs().subscribe({
      next: jobs => { this.jobs.set(jobs); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('We couldn’t load open roles right now.'); }
    });
  }

  typeLabel(j: Job): string { return EMPLOYMENT_TYPE_LABELS[j.employmentType] ?? j.employmentType; }
  modeLabel(j: Job): string { return WORK_MODE_LABELS[j.workMode] ?? j.workMode; }
}
