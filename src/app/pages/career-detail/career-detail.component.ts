import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  ApplicationForm,
  CareersService,
  EMPLOYMENT_TYPE_LABELS,
  Job,
  RESUME_ACCEPT,
  PHONE_PATTERN,
  RESUME_MAX_BYTES,
  URL_PATTERN,
  WORK_MODE_LABELS
} from '../../services/careers.service';

/** One open role, with the application form (résumé upload). Applications are emailed to admin@narturebelle.com by the API. */
@Component({
  selector: 'app-career-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="job-page">
      <div class="container narrow">
        <a routerLink="/careers" class="back"><mat-icon class="icon-sm">arrow_back</mat-icon> All roles</a>

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (!job()) {
          <div class="card empty"><p>{{ errorMsg() || 'This role isn’t open any more.' }}</p><a routerLink="/careers" class="btn btn-outline btn-sm">See open roles</a></div>
        } @else {
          @if (job(); as j) {
            <header>
              <h1>{{ j.title }}</h1>
              <div class="meta">
                @if (j.team) { <span><mat-icon class="icon-sm">groups</mat-icon> {{ j.team }}</span> }
                <span><mat-icon class="icon-sm">location_on</mat-icon> {{ j.location }}</span>
                <span><mat-icon class="icon-sm">work</mat-icon> {{ typeLabels[j.employmentType] }}</span>
                <span><mat-icon class="icon-sm">home_work</mat-icon> {{ modeLabels[j.workMode] }}</span>
                <span><mat-icon class="icon-sm">event</mat-icon> Posted {{ j.postedAt | date:'d MMM y' }}</span>
              </div>
            </header>

            <section class="card body">
              <p class="description">{{ j.description }}</p>
              @if (j.requirements.length) {
                <h2>What we’re looking for</h2>
                <ul>@for (r of j.requirements; track r) { <li>{{ r }}</li> }</ul>
              }
            </section>

            @if (submitted()) {
              <section class="card done">
                <mat-icon>check_circle</mat-icon>
                <h2>Thank you for applying</h2>
                <p>We’ve received your application for <strong>{{ j.title }}</strong>. Our team will review it and get back to you by email.</p>
                <a routerLink="/careers" class="btn btn-outline btn-sm">See other roles</a>
              </section>
            } @else {
              <section class="card apply" id="apply">
                <h2>Apply for this role</h2>
                <form (ngSubmit)="submit()" #f="ngForm" novalidate>
                  <div class="grid">
                    <div class="field">
                      <label for="fullName">Full name <span class="req">*</span></label>
                      <input id="fullName" name="fullName" class="form-control" required maxlength="120" [(ngModel)]="form.fullName" autocomplete="name" />
                    </div>
                    <div class="field">
                      <label for="email">Email <span class="req">*</span></label>
                      <input id="email" name="email" type="email" class="form-control" required [(ngModel)]="form.email" autocomplete="email" />
                    </div>
                    <div class="field">
                      <label for="phone">Phone <span class="req">*</span></label>
                      <input id="phone" name="phone" type="tel" class="form-control" required maxlength="20" [(ngModel)]="form.phone" autocomplete="tel" />
                    </div>
                    <div class="field">
                      <label for="location">Current city</label>
                      <input id="location" name="location" class="form-control" maxlength="120" [(ngModel)]="form.location" />
                    </div>
                    <div class="field">
                      <label for="linkedin">LinkedIn profile</label>
                      <input id="linkedin" name="linkedinUrl" type="url" class="form-control" placeholder="https://linkedin.com/in/…" [(ngModel)]="form.linkedinUrl" />
                    </div>
                    <div class="field">
                      <label for="portfolio">Portfolio / website</label>
                      <input id="portfolio" name="portfolioUrl" type="url" class="form-control" [(ngModel)]="form.portfolioUrl" />
                    </div>
                    <div class="field">
                      <label for="years">Years of experience</label>
                      <input id="years" name="yearsExperience" type="number" min="0" max="50" class="form-control" [(ngModel)]="form.yearsExperience" />
                    </div>
                    <div class="field">
                      <label for="resume">Résumé <span class="req">*</span></label>
                      <input id="resume" type="file" class="form-control" [accept]="resumeAccept" (change)="pickResume($event)" />
                      <span class="hint">PDF or Word, up to 4 MB.</span>
                    </div>
                  </div>
                  <div class="field">
                    <label for="cover">Why NartureBelle? <span class="opt">optional</span></label>
                    <textarea id="cover" name="coverNote" class="form-control" rows="4" maxlength="3000" [(ngModel)]="form.coverNote"></textarea>
                  </div>
                  <!-- Honeypot: hidden from people; bots fill it in and the API discards the submission. -->
                  <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" [(ngModel)]="form.website" />

                  <label class="consent">
                    <input type="checkbox" name="privacyConsent" [(ngModel)]="form.privacyConsent" />
                    I agree that NartureBelle may store my application and résumé and contact me about this and future roles.
                  </label>

                  @if (formError()) { <p class="error-msg">{{ formError() }}</p> }
                  <button type="submit" class="btn btn-primary btn-lg" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Submit application' }}</button>
                </form>
              </section>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .job-page { padding: 2rem 0 5rem; }
    .narrow { max-width: 820px; }
    .back { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--trust-700); text-decoration: none; margin-bottom: 1rem; }
    h1 { font-size: clamp(1.7rem, 3.5vw, 2.3rem); color: var(--sage-900); }
    h2 { font-size: 1.15rem; color: var(--sage-900); margin: 0.5rem 0 0.75rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; font-size: 0.84rem; color: var(--text-muted); margin: 0.5rem 0 1.25rem; }
    .meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); padding: 1.3rem 1.4rem; margin-bottom: 1.25rem; }
    .description { white-space: pre-line; color: var(--text-secondary); line-height: 1.7; }
    ul { padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.9rem 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
    label { font-size: 0.84rem; font-weight: 600; color: var(--sage-900); }
    .req { color: #a0281c; }
    .opt { font-weight: 400; color: var(--text-muted); font-size: 0.78rem; }
    .hint { font-size: 0.76rem; color: var(--text-muted); }
    .hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
    .consent { display: flex; gap: 0.5rem; align-items: flex-start; font-weight: 400; font-size: 0.84rem; color: var(--text-secondary); margin: 0.4rem 0 1rem; }
    .error-msg { color: #a0281c; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .done { text-align: center; }
    .done mat-icon { color: var(--sage-700); font-size: 2.2rem; width: 2.2rem; height: 2.2rem; }
    .done p { color: var(--text-secondary); margin-bottom: 1rem; }
    .empty { text-align: center; color: var(--text-secondary); }
  `]
})
export class CareerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private careers = inject(CareersService);

  typeLabels = EMPLOYMENT_TYPE_LABELS;
  modeLabels = WORK_MODE_LABELS;
  resumeAccept = RESUME_ACCEPT;

  job = signal<Job | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  sending = signal(false);
  submitted = signal(false);
  formError = signal<string | null>(null);
  resume: File | null = null;

  form: ApplicationForm = {
    fullName: '', email: '', phone: '', location: '', linkedinUrl: '', portfolioUrl: '',
    yearsExperience: null, coverNote: '', privacyConsent: false, website: ''
  };

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.careers.getJob(id).subscribe({
      next: j => { this.job.set(j.status === 'OPEN' ? j : null); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        if (err?.status !== 404) this.errorMsg.set('We couldn’t load this role right now.');
      }
    });
  }

  pickResume(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.formError.set(null);
    if (file && file.size > RESUME_MAX_BYTES) {
      this.resume = null;
      (e.target as HTMLInputElement).value = '';
      this.formError.set('Your résumé is larger than 4 MB. Please upload a smaller file.');
      return;
    }
    if (file && !/\.(pdf|docx?)$/i.test(file.name)) {
      this.resume = null;
      (e.target as HTMLInputElement).value = '';
      this.formError.set('Please upload your résumé as a PDF or Word document.');
      return;
    }
    this.resume = file;
  }

  private problem(): string | null {
    const f = this.form;
    if (!f.fullName.trim() || !f.email.trim() || !f.phone.trim()) return 'Please fill in your name, email and phone.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Please enter a valid email address.';
    if (!PHONE_PATTERN.test(f.phone.trim())) return 'Please enter a valid phone number (7–20 digits; + ( ) - and spaces are fine).';
    if (f.linkedinUrl.trim() && !URL_PATTERN.test(f.linkedinUrl.trim())) return 'Your LinkedIn link should start with https://';
    if (f.portfolioUrl.trim() && !URL_PATTERN.test(f.portfolioUrl.trim())) return 'Your portfolio link should start with https://';
    if (!this.resume) return 'Please attach your résumé.';
    if (!f.privacyConsent) return 'Please agree to us storing your application so we can review it.';
    return null;
  }

  submit() {
    const job = this.job();
    const problem = this.problem();
    if (problem || !job) { this.formError.set(problem); return; }
    this.sending.set(true);
    this.formError.set(null);
    this.careers.apply(job.id, this.form, this.resume!).subscribe({
      next: () => { this.sending.set(false); this.submitted.set(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: err => {
        this.sending.set(false);
        const code = err?.error?.code;
        this.formError.set(
          code === 'JOB_CLOSED' ? 'Sorry, this role has just closed.'
          : code === 'RESUME_TOO_LARGE' || err?.status === 413 ? 'Your résumé is larger than 4 MB.'
          : code === 'RESUME_TYPE_NOT_ALLOWED' ? 'Please upload your résumé as a PDF or Word document.'
          : code === 'TOO_MANY_REQUESTS' || err?.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.'
          : code === 'VALIDATION_FAILED' ? (err?.error?.fields?.resume ? 'Please attach your résumé.' : err?.error?.message || 'Please check your details and try again.')
          : err?.status === 404 ? 'Applications aren’t open on this server yet. Please email admin@narturebelle.com instead.'
          : 'We couldn’t send your application. Please try again.'
        );
      }
    });
  }
}
