import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import {
  CareersService,
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  Job,
  JobApplication,
  JobInput,
  WORK_MODE_LABELS,
  WorkMode
} from '../../services/careers.service';

/** Admin: post, edit, close and reopen roles, and see who applied. */
@Component({
  selector: 'app-admin-careers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="admin-page">
      <div class="container narrow">
        <header class="head">
          <div>
            <span class="kicker">Admin</span>
            <h1>Careers</h1>
            <p class="hint">Open roles appear on <a routerLink="/careers">/careers</a>. Every application is also emailed to hello&#64;narturebelle.com.</p>
          </div>
          @if (!editing()) { <button class="btn btn-primary" (click)="startNew()"><mat-icon class="icon-sm">add</mat-icon> Post a role</button> }
        </header>

        @if (editing()) {
          <form class="card editor" (ngSubmit)="save()" novalidate>
            <h2>{{ editId() ? 'Edit role' : 'Post a new role' }}</h2>
            <div class="grid">
              <div class="field"><label for="t">Job title *</label><input id="t" name="title" class="form-control" [(ngModel)]="draft.title" /></div>
              <div class="field"><label for="team">Team</label><input id="team" name="team" class="form-control" placeholder="e.g. Care operations" [(ngModel)]="draft.team" /></div>
              <div class="field"><label for="loc">Location *</label><input id="loc" name="location" class="form-control" placeholder="e.g. Bengaluru" [(ngModel)]="draft.location" /></div>
              <div class="field">
                <label for="type">Type *</label>
                <select id="type" name="employmentType" class="form-control" [(ngModel)]="draft.employmentType">
                  @for (t of types; track t) { <option [ngValue]="t">{{ typeLabels[t] }}</option> }
                </select>
              </div>
              <div class="field">
                <label for="mode">Work mode *</label>
                <select id="mode" name="workMode" class="form-control" [(ngModel)]="draft.workMode">
                  @for (m of modes; track m) { <option [ngValue]="m">{{ modeLabels[m] }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label for="sum">One-line summary *</label><input id="sum" name="summary" class="form-control" maxlength="500" [(ngModel)]="draft.summary" /></div>
            <div class="field"><label for="desc">Description *</label><textarea id="desc" name="description" class="form-control" rows="7" maxlength="10000" [(ngModel)]="draft.description"></textarea></div>
            <div class="field">
              <label for="req">Requirements <span class="opt">one per line, up to 30</span></label>
              <textarea id="req" name="requirements" class="form-control" rows="4" [(ngModel)]="requirementsText"></textarea>
            </div>
            @if (formError()) { <p class="error-msg">{{ formError() }}</p> }
            <div class="actions">
              <button type="button" class="btn btn-link" (click)="cancel()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ editId() ? 'Save changes' : 'Publish role' }}</button>
            </div>
          </form>
        }

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p></div>
        } @else {
          @for (j of jobs(); track j.id) {
            <article class="card job" [class.closed]="j.status === 'CLOSED'">
              <div class="job-row">
                <div class="job-main">
                  <strong>{{ j.title }}</strong>
                  <span class="hint">{{ j.location }} · {{ typeLabels[j.employmentType] }} · {{ modeLabels[j.workMode] }} · posted {{ j.postedAt | date:'d MMM y' }}</span>
                </div>
                <span class="status" [class.open]="j.status === 'OPEN'">{{ j.status === 'OPEN' ? 'Open' : 'Closed' }}</span>
              </div>
              <div class="actions">
                <button class="btn btn-link btn-sm" (click)="toggleApplicants(j)">{{ j.applicationCount ?? 0 }} applicant{{ j.applicationCount === 1 ? '' : 's' }}</button>
                <button class="btn btn-link btn-sm" (click)="startEdit(j)">Edit</button>
                @if (j.status === 'OPEN') {
                  <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="close(j)">Close role</button>
                } @else {
                  <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="reopen(j)">Reopen</button>
                }
              </div>
              @if (openApplicants() === j.id) {
                <div class="applicants">
                  @for (a of applicants(); track a.id) {
                    <div class="applicant">
                      <div>
                        <strong>{{ a.fullName }}</strong>
                        <span class="hint">{{ a.email }} · {{ a.phone }}@if (a.location) { · {{ a.location }} }@if (a.yearsExperience !== null) { · {{ a.yearsExperience }} yrs }</span>
                        <span class="hint">Applied {{ a.submittedAt | date:'d MMM y, h:mm a' }} · {{ a.resumeFileName }} ({{ sizeLabel(a.resumeSizeBytes) }})
                          @if (!a.adminNotified) { <span class="not-emailed" title="Email is log-only until the API's email provider is set up, or the send failed">not emailed</span> }
                        </span>
                        @if (a.coverNote) { <p class="note">{{ a.coverNote }}</p> }
                        <div class="links">
                          @if (a.linkedinUrl) { <a [href]="a.linkedinUrl" target="_blank" rel="noopener">LinkedIn</a> }
                          @if (a.portfolioUrl) { <a [href]="a.portfolioUrl" target="_blank" rel="noopener">Portfolio</a> }
                        </div>
                      </div>
                      <button class="btn btn-outline btn-sm" (click)="openResume(a)"><mat-icon class="icon-sm">download</mat-icon> Résumé</button>
                    </div>
                  } @empty {
                    <p class="hint">No applications yet.</p>
                  }
                </div>
              }
            </article>
          } @empty {
            <div class="card empty"><p>No roles yet. Post your first one.</p></div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 2.5rem 0 5rem; }
    .narrow { max-width: 860px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trust-700); }
    h1 { font-size: 2rem; color: var(--sage-900); }
    h2 { font-size: 1.15rem; color: var(--sage-900); margin-bottom: 0.8rem; }
    .card { border-radius: var(--radius-lg, 14px); background: var(--bg-surface); border: 1px solid var(--border-light); padding: 1.1rem 1.25rem; margin-bottom: 0.8rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.85rem; }
    label { font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .opt { font-weight: 400; color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .job.closed { opacity: 0.7; }
    .job-row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .job-main { display: flex; flex-direction: column; gap: 0.2rem; }
    .job-main strong { color: var(--sage-900); }
    .status { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 0.15rem 0.55rem; border-radius: var(--radius-full); background: var(--sage-50); color: var(--text-muted); }
    .status.open { background: var(--solid-sage-700); color: #fff; }
    .applicants { border-top: 1px solid var(--border-subtle); margin-top: 0.75rem; padding-top: 0.5rem; }
    .applicant { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle); }
    .applicant > div { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .applicant strong { color: var(--sage-900); }
    .not-emailed { display: inline-block; margin-left: 0.35rem; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: var(--warn-text); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 999px; padding: 0 0.4rem; }
    .note { font-size: 0.82rem; color: var(--text-secondary); white-space: pre-line; margin-top: 0.25rem; }
    .links { display: flex; gap: 0.75rem; font-size: 0.82rem; }
    .hint { font-size: 0.8rem; color: var(--text-muted); }
    .error-msg { color: var(--danger-text); font-size: 0.85rem; }
    .empty { text-align: center; color: var(--text-secondary); }
  `]
})
export class AdminCareersComponent implements OnInit {
  private careers = inject(CareersService);
  private api = inject(ApiService);

  types = Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[];
  modes = Object.keys(WORK_MODE_LABELS) as WorkMode[];
  typeLabels = EMPLOYMENT_TYPE_LABELS;
  modeLabels = WORK_MODE_LABELS;

  jobs = signal<Job[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  busy = signal(false);
  editing = signal(false);
  editId = signal<number | null>(null);
  formError = signal<string | null>(null);
  openApplicants = signal<number | null>(null);
  applicants = signal<JobApplication[]>([]);

  draft: JobInput = this.blank();
  requirementsText = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.careers.adminJobs().subscribe({
      next: jobs => { this.jobs.set(jobs); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 403 ? 'Only NartureBelle admins can manage roles.'
          : err?.status === 404 ? 'Careers isn’t available on this server yet.' : 'We couldn’t load roles.');
      }
    });
  }

  private blank(): JobInput {
    return { title: '', team: '', location: '', employmentType: 'FULL_TIME', workMode: 'ONSITE', summary: '', description: '', requirements: [] };
  }

  startNew() {
    this.draft = this.blank();
    this.requirementsText = '';
    this.editId.set(null);
    this.formError.set(null);
    this.editing.set(true);
  }

  startEdit(j: Job) {
    this.draft = { title: j.title, team: j.team ?? '', location: j.location, employmentType: j.employmentType, workMode: j.workMode, summary: j.summary, description: j.description, requirements: [...j.requirements] };
    this.requirementsText = j.requirements.join('\n');
    this.editId.set(j.id);
    this.formError.set(null);
    this.editing.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel() {
    this.editing.set(false);
  }

  save() {
    const d = this.draft;
    if (!d.title.trim() || !d.location.trim() || !d.summary.trim() || !d.description.trim()) {
      this.formError.set('Please fill in the title, location, summary and description.');
      return;
    }
    const requirements = this.requirementsText.split('\n').map(r => r.trim()).filter(Boolean);
    if (requirements.length > 30 || requirements.some(r => r.length > 500)) {
      this.formError.set('Please keep requirements to 30 lines of up to 500 characters each.');
      return;
    }
    const body: JobInput = {
      ...d,
      title: d.title.trim(), team: d.team?.trim() || null, location: d.location.trim(), summary: d.summary.trim(), description: d.description.trim(),
      requirements
    };
    this.busy.set(true);
    const id = this.editId();
    (id ? this.careers.updateJob(id, body) : this.careers.createJob(body)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(false);
        this.api.showToast(id ? 'Role updated.' : 'Role published on the careers page.');
        this.load();
      },
      error: err => { this.busy.set(false); this.formError.set(err?.error?.message || 'Couldn’t save the role.'); }
    });
  }

  close(j: Job) {
    this.busy.set(true);
    this.careers.closeJob(j.id).subscribe({
      next: () => { this.busy.set(false); this.api.showToast('Role closed. It no longer appears on the careers page.'); this.load(); },
      error: () => { this.busy.set(false); this.api.showToast('Couldn’t close the role.'); }
    });
  }

  reopen(j: Job) {
    this.busy.set(true);
    this.careers.reopenJob(j.id).subscribe({
      next: () => { this.busy.set(false); this.api.showToast('Role reopened.'); this.load(); },
      error: () => { this.busy.set(false); this.api.showToast('Couldn’t reopen the role.'); }
    });
  }

  toggleApplicants(j: Job) {
    if (this.openApplicants() === j.id) { this.openApplicants.set(null); return; }
    this.openApplicants.set(j.id);
    this.applicants.set([]);
    this.careers.applications(j.id).subscribe({
      next: list => this.applicants.set(list),
      error: () => this.api.showToast('Couldn’t load applicants.')
    });
  }

  /** Downloads the résumé with the admin token and saves it (each download is audited by the API). */
  openResume(a: JobApplication) {
    this.careers.downloadResume(a.id, a.resumeFileName).subscribe({
      next: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.api.showToast(err?.status === 404 ? 'That résumé no longer exists.' : 'Couldn’t download the résumé.')
    });
  }

  sizeLabel(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
