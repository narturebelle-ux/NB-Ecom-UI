import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService } from '../../services/provider-application.service';
import {
  ChangeRequest,
  ChangeType,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  PROFESSION_LABELS,
  ProviderProfile
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

const CHANGE_LABELS: Record<ChangeType, string> = { PROFILE: 'Public profile', NAME: 'Legal name', LICENCE: 'Licence', BANK: 'Bank details' };

/** Profile and documents: what's on file, and requests to change it. Old details stay until staff approve. */
@Component({
  selector: 'app-provider-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">Your practice</span>
          <h1>Profile and documents</h1>
          <p>Your details stay as they are until our team approves a change.</p>
        </header>

        @if (loading()) {
          <div class="panel glass"><div class="skeleton" style="height: 160px"></div></div>
        } @else if (errorMsg() && !profile()) {
          <div class="panel glass">
            <p class="muted">{{ errorMsg() }}</p>
            <div class="actions center"><a class="btn-link" routerLink="/provider">Back to dashboard</a></div>
          </div>
        } @else if (profile(); as p) {
          <section class="panel glass block">
            <div class="panel-head"><h3><mat-icon>badge</mat-icon> Public profile</h3><button class="btn-link" (click)="open('PROFILE')">Request a change</button></div>
            <dl>
              <dt>Display name</dt><dd>{{ p.displayName }}</dd>
              <dt>Profession</dt><dd>{{ professionLabel(p) }}</dd>
              <dt>Bio</dt><dd>{{ p.bio || '-' }}</dd>
              <dt>City</dt><dd>{{ p.city || '-' }}</dd>
              <dt>Languages</dt><dd>{{ p.languages.join(', ') || '-' }}</dd>
              <dt>Confirmed experience</dt><dd>{{ p.confirmedExperienceYears ?? '-' }} years</dd>
              <dt>Care stages</dt><dd>{{ p.clearedStages.join(', ') || '-' }}</dd>
              <dt>Prescribing</dt><dd>{{ p.canPrescribe ? 'Eligible once prescribing is available' : 'Not part of this role' }}</dd>
            </dl>
          </section>

          <section class="panel glass block">
            <div class="panel-head"><h3><mat-icon>workspace_premium</mat-icon> Licence and name</h3></div>
            <dl>
              <dt>Legal name</dt><dd>{{ p.legalName || '-' }} <button class="btn-link" (click)="open('NAME')">Change</button></dd>
              <dt>Registration number</dt><dd>{{ p.registrationNumber || '-' }} <button class="btn-link" (click)="open('LICENCE')">Update licence</button></dd>
              <dt>Council</dt><dd>{{ p.council || '-' }}</dd>
              <dt>Licence expiry</dt><dd>{{ p.licenceExpiresOn ? (p.licenceExpiresOn | date:'d MMMM y') : 'Not set' }}</dd>
            </dl>
          </section>

          <section class="panel glass block">
            <div class="panel-head"><h3><mat-icon>account_balance</mat-icon> Bank and tax</h3><button class="btn-link" (click)="open('BANK')">Request a change</button></div>
            @if (p.bank; as b) {
              <dl>
                <dt>Account</dt><dd>{{ b.accountHolderName }}, ending {{ b.accountLast4 }}</dd>
                <dt>IFSC</dt><dd>{{ b.ifsc }}</dd>
                <dt>GSTIN</dt><dd>{{ b.gstin || 'Not GST registered' }}</dd>
              </dl>
            } @else { <p class="muted">No bank details on file.</p> }
          </section>

          @if (editing(); as type) {
            <section class="panel glass block">
              <div class="panel-head"><h3><mat-icon>edit</mat-icon> Change: {{ changeLabel(type) }}</h3></div>
              @switch (type) {
                @case ('PROFILE') {
                  <div class="field"><label for="dn">Display name</label><input id="dn" class="form-control" [(ngModel)]="form['displayName']" /></div>
                  <div class="field"><label for="bio">Bio</label><textarea id="bio" class="form-control" rows="3" [(ngModel)]="form['bio']"></textarea></div>
                  <div class="row-2">
                    <div class="field"><label for="city">City</label><input id="city" class="form-control" [(ngModel)]="form['city']" /></div>
                    <div class="field"><label for="lang">Languages</label><input id="lang" class="form-control" placeholder="Separated by commas" [(ngModel)]="form['languages']" /></div>
                  </div>
                }
                @case ('NAME') {
                  <div class="field"><label for="ln">Legal name</label><input id="ln" class="form-control" [(ngModel)]="form['legalName']" /></div>
                }
                @case ('LICENCE') {
                  <div class="row-2">
                    <div class="field"><label for="rn">Registration number</label><input id="rn" class="form-control" [(ngModel)]="form['registrationNumber']" /></div>
                    <div class="field"><label for="exp">New expiry date</label><input id="exp" type="date" class="form-control" [(ngModel)]="form['registrationExpiry']" /></div>
                  </div>
                }
                @case ('BANK') {
                  <div class="field"><label for="h">Account holder name</label><input id="h" class="form-control" [(ngModel)]="form['accountHolderName']" /></div>
                  <div class="row-2">
                    <div class="field"><label for="a">Account number</label><input id="a" class="form-control" autocomplete="off" [(ngModel)]="form['accountNumber']" /></div>
                    <div class="field"><label for="a2">Account number again</label><input id="a2" class="form-control" autocomplete="off" [(ngModel)]="form['accountNumberConfirm']" /></div>
                  </div>
                  <div class="row-2">
                    <div class="field"><label for="i">IFSC</label><input id="i" class="form-control" maxlength="11" [(ngModel)]="form['ifsc']" /></div>
                    <div class="field"><label for="t">Account type</label>
                      <select id="t" class="form-control" [(ngModel)]="form['accountType']"><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option></select>
                    </div>
                  </div>
                  <div class="field"><label for="g">GSTIN, if registered</label><input id="g" class="form-control" maxlength="15" [(ngModel)]="form['gstin']" /></div>
                }
              }
              @if (needsDocument(type)) {
                <div class="field">
                  <label>{{ type === 'NAME' ? 'Proof of the name change' : 'Your renewed certificate' }} <span class="req">*</span></label>
                  <input type="file" [accept]="documentAccept" (change)="chooseFile($event)" />
                  <span class="hint">PDF, JPG or PNG, up to 4 MB.</span>
                </div>
              }
              @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
              <div class="actions">
                <button class="btn btn-outline" (click)="editing.set(null)">Cancel</button>
                <button class="btn btn-primary" [disabled]="busy()" (click)="send(type)">Send for review</button>
              </div>
            </section>
          }

          @if (requests().length) {
            <section class="panel glass block">
              <div class="panel-head"><h3><mat-icon>history</mat-icon> Your requests</h3></div>
              @for (r of requests(); track r.id) {
                <div class="row-item">
                  <span class="row-main"><strong>{{ changeLabel(r.type) }}</strong><span>{{ r.createdAt | date:'d MMM y' }}@if (r.decisionReason) { · {{ r.decisionReason }} }</span></span>
                  <span class="badge-pill" [class.warn]="r.status === 'PENDING'" [class.danger]="r.status === 'REJECTED'">{{ statusLabel(r.status) }}</span>
                  @if (r.status === 'PENDING' && r.documentRequired && !r.documentAttached) {
                    <label class="btn btn-outline btn-sm file-btn">Upload document<input type="file" [accept]="documentAccept" (change)="uploadFor(r, $event)" /></label>
                  }
                </div>
              }
              @if (requestError()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ requestError() }}</div> }
            </section>
          }
          <div class="actions center"><a class="btn-link" routerLink="/provider">Back to dashboard</a></div>
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .block { margin-bottom: 1.25rem; }
    .file-btn { position: relative; overflow: hidden; cursor: pointer; }
    .file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    dl { display: grid; grid-template-columns: minmax(130px, 200px) 1fr; gap: 0.55rem 1rem; margin: 0; }
    dt { font-size: 0.8rem; color: var(--text-muted); }
    dd { margin: 0; font-size: 0.9rem; color: var(--sage-900); }
    @media (max-width: 640px) { dl { grid-template-columns: 1fr; } dd { margin-bottom: 0.4rem; } }
  `]
})
export class ProviderAccountComponent implements OnInit {
  private applications = inject(ProviderApplicationService);
  private api = inject(ApiService);

  documentAccept = DOCUMENT_ACCEPT;
  loading = signal(true);
  busy = signal(false);
  errorMsg = signal<string | null>(null);
  requestError = signal<string | null>(null);
  profile = signal<ProviderProfile | null>(null);
  requests = signal<ChangeRequest[]>([]);
  editing = signal<ChangeType | null>(null);
  form: Record<string, string> = {};
  private file: File | null = null;

  ngOnInit() {
    forkJoin({ profile: this.applications.profile(), requests: this.applications.changeRequests() }).subscribe({
      next: ({ profile, requests }) => { this.profile.set(profile); this.requests.set(requests); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 404 || err?.status === 403
          ? 'Your profile details aren’t available here yet. Please contact our team to change them.'
          : 'We couldn’t load your profile. Please try again.');
      }
    });
  }

  professionLabel(p: ProviderProfile): string {
    return PROFESSION_LABELS[p.profession] ?? p.profession;
  }

  changeLabel(type: ChangeType): string {
    return CHANGE_LABELS[type];
  }

  statusLabel(status: string): string {
    return ({ PENDING: 'In review', APPROVED: 'Approved', REJECTED: 'Not approved' } as Record<string, string>)[status] ?? status;
  }

  needsDocument(type: ChangeType): boolean {
    return type === 'NAME' || type === 'LICENCE';
  }

  open(type: ChangeType) {
    const p = this.profile();
    this.errorMsg.set(null);
    this.file = null;
    this.form = type === 'PROFILE' && p
      ? { displayName: p.displayName ?? '', bio: p.bio ?? '', city: p.city ?? '', languages: p.languages.join(', ') }
      : type === 'LICENCE' && p ? { registrationNumber: p.registrationNumber ?? '', registrationExpiry: '' }
      : type === 'BANK' ? { accountType: 'SAVINGS' } : {};
    this.editing.set(type);
  }

  chooseFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && file.size > DOCUMENT_MAX_BYTES) {
      this.errorMsg.set('Please choose a file of 4 MB or less.');
      this.file = null;
      return;
    }
    this.errorMsg.set(null);
    this.file = file;
  }

  send(type: ChangeType) {
    if (this.needsDocument(type) && !this.file) {
      this.errorMsg.set('Please attach the supporting document.');
      return;
    }
    this.busy.set(true);
    this.errorMsg.set(null);
    this.applications.requestChange(type, this.values(type)).subscribe({
      next: request => {
        this.requests.set([request, ...this.requests()]);
        this.busy.set(false);
        this.editing.set(null);
        if (this.file) {
          this.attach(request, this.file);
        } else {
          this.api.showToast('Your request has been sent for review.');
        }
      },
      error: err => this.fail(err, 'We couldn’t send your request. Please try again.')
    });
  }

  private values(type: ChangeType): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    Object.entries(this.form).forEach(([key, value]) => { if (value !== '') values[key] = value; });
    if (type === 'PROFILE' && this.form['languages'] !== undefined) {
      values['languages'] = this.form['languages'].split(',').map(l => l.trim()).filter(Boolean);
    }
    if (type === 'BANK') values['gstRegistered'] = !!this.form['gstin'];
    return values;
  }

  uploadFor(request: ChangeRequest, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > DOCUMENT_MAX_BYTES) {
      this.requestError.set('Please choose a file of 4 MB or less.');
      return;
    }
    this.attach(request, file);
  }

  /** The request is already saved, so a failed upload is retried from its row in the list. */
  private attach(request: ChangeRequest, file: File) {
    this.requestError.set(null);
    this.applications.attachChangeDocument(request.id, file).subscribe({
      next: updated => {
        this.requests.set(this.requests().map(r => r.id === updated.id ? updated : r));
        this.api.showToast('Your request has been sent for review.');
      },
      error: err => this.requestError.set(err?.error?.message || 'Your request is saved, but the document didn’t upload. Please try uploading it again below.')
    });
  }

  private fail(err: any, fallback: string) {
    this.busy.set(false);
    this.errorMsg.set(err?.error?.message || fallback);
  }
}
