import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService } from '../../services/provider-application.service';
import { WorkspaceModality, WorkspaceService, WorkspaceSlot } from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

/** A professional's own services and open slots, during setup and once live. */
@Component({
  selector: 'app-provider-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">Your practice</span>
          <h1>Services and availability</h1>
          <p>What you offer, and when mothers can book you. Your fee is fixed per completed session.</p>
        </header>

        @if (loading()) {
          <div class="panel glass"><div class="skeleton" style="height: 120px"></div></div>
        } @else if (loadError()) {
          <div class="panel glass">
            <p class="muted">{{ loadError() }}</p>
            <div class="actions"><a class="btn btn-outline" routerLink="/provider/apply">Back to your application</a></div>
          </div>
        } @else {
          <section class="panel glass block">
            <div class="panel-head"><h3><mat-icon>medical_services</mat-icon> Your services</h3></div>
            @for (s of services(); track s.id) {
              <div class="row-item">
                <span class="row-main"><strong>{{ s.name }}</strong><span>{{ s.modality === 'VIRTUAL' ? 'Online' : 'In person' }} · {{ s.durationMinutes }} minutes</span></span>
                <span class="badge-pill" [class.warn]="!s.active">{{ s.active ? 'Active' : 'Off' }}</span>
                <button class="btn-link" (click)="toggleService(s)">{{ s.active ? 'Turn off' : 'Turn on' }}</button>
              </div>
            } @empty { <p class="muted">No services yet.</p> }

            <div class="row-2 add">
              <div class="field"><label for="sname">Service name <span class="req">*</span></label>
                <input id="sname" class="form-control" maxlength="150" placeholder="e.g. Consultation" [(ngModel)]="serviceName" /></div>
              <div class="field"><label for="smode">Mode <span class="req">*</span></label>
                <select id="smode" class="form-control" [(ngModel)]="serviceModality">
                  <option value="VIRTUAL">Online</option><option value="PHYSICAL">In person</option>
                </select></div>
            </div>
            <div class="row-2">
              <div class="field"><label for="slen">Length in minutes <span class="req">*</span></label>
                <input id="slen" type="number" min="10" max="180" class="form-control" [(ngModel)]="serviceMinutes" /></div>
            </div>
            <div class="actions"><button class="btn btn-outline" [disabled]="busy() || !serviceName.trim() || !serviceMinutes" (click)="addService()">Add service</button></div>
          </section>

          <section class="panel glass block">
            <div class="panel-head"><h3><mat-icon>event_available</mat-icon> Your open slots</h3></div>
            @for (s of slots(); track s.id) {
              <div class="row-item">
                <span class="row-main"><strong>{{ s.startAt | date:'EEE d MMM y' }}</strong><span>{{ s.startAt | date:'h:mm a' }} to {{ s.endAt | date:'h:mm a' }}</span></span>
                <button class="btn-link" (click)="removeSlot(s)">Remove</button>
              </div>
            } @empty { <p class="muted">No open slots yet.</p> }

            <div class="row-2 add">
              <div class="field"><label for="sdate">Date <span class="req">*</span></label>
                <input id="sdate" type="date" class="form-control" [min]="minDate" [(ngModel)]="slotDate" /></div>
              <div class="field"><label for="stime">Start time <span class="req">*</span></label>
                <input id="stime" type="time" class="form-control" [(ngModel)]="slotTime" /></div>
            </div>
            <div class="row-2">
              <div class="field"><label for="sdur">Length in minutes <span class="req">*</span></label>
                <input id="sdur" type="number" min="10" max="180" class="form-control" [(ngModel)]="slotMinutes" /></div>
            </div>
            <div class="actions"><button class="btn btn-outline" [disabled]="busy() || !slotDate || !slotTime || !slotMinutes" (click)="addSlot()">Add slot</button></div>
          </section>

          @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
          <div class="actions center"><a class="btn-link" [routerLink]="backLink()">Back</a></div>
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .block { margin-bottom: 1.25rem; }
    .add { margin-top: 1.25rem; }
  `]
})
export class ProviderAvailabilityComponent implements OnInit {
  private applications = inject(ProviderApplicationService);
  private api = inject(ApiService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  busy = signal(false);
  errorMsg = signal<string | null>(null);
  services = signal<WorkspaceService[]>([]);
  slots = signal<WorkspaceSlot[]>([]);
  backLink = signal('/provider');

  minDate = new Date().toISOString().slice(0, 10);
  serviceName = '';
  serviceModality: WorkspaceModality = 'VIRTUAL';
  serviceMinutes: number | null = 30;
  slotDate = '';
  slotTime = '';
  slotMinutes: number | null = 30;

  ngOnInit() {
    if (this.applications.isApplicant()) this.backLink.set('/provider/setup');
    forkJoin({ services: this.applications.services(), slots: this.applications.slots() }).subscribe({
      next: ({ services, slots }) => { this.services.set(services); this.slots.set(slots); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.loadError.set(err?.status === 404 || err?.status === 403
          ? 'This opens once your application is approved.'
          : 'We couldn’t load your availability. Please try again.');
      }
    });
  }

  addService() {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.applications.addService({ name: this.serviceName.trim(), description: null, modality: this.serviceModality, durationMinutes: Number(this.serviceMinutes) }).subscribe({
      next: service => {
        this.busy.set(false);
        this.services.set([service, ...this.services()]);
        this.serviceName = '';
        this.api.showToast('Service added.');
      },
      error: err => this.fail(err, 'We couldn’t add that service.')
    });
  }

  toggleService(service: WorkspaceService) {
    this.applications.setServiceActive(service.id, !service.active).subscribe({
      next: updated => this.services.set(this.services().map(s => s.id === updated.id ? updated : s)),
      error: err => this.fail(err, 'We couldn’t change that service.')
    });
  }

  addSlot() {
    const start = new Date(`${this.slotDate}T${this.slotTime}:00`);
    const end = new Date(start.getTime() + Number(this.slotMinutes) * 60000);
    this.busy.set(true);
    this.errorMsg.set(null);
    this.applications.addSlots([{ startAt: this.localIso(start), endAt: this.localIso(end) }]).subscribe({
      next: added => {
        this.busy.set(false);
        this.slots.set([...this.slots(), ...added].sort((a, b) => a.startAt.localeCompare(b.startAt)));
        this.slotTime = '';
        this.api.showToast('Slot added.');
      },
      error: err => this.fail(err, 'We couldn’t add that slot.')
    });
  }

  removeSlot(slot: WorkspaceSlot) {
    this.applications.removeSlot(slot.id).subscribe({
      next: () => this.slots.set(this.slots().filter(s => s.id !== slot.id)),
      error: err => this.fail(err, 'We couldn’t remove that slot.')
    });
  }

  private fail(err: any, fallback: string) {
    this.busy.set(false);
    this.errorMsg.set(err?.error?.message || fallback);
  }

  /** The API stores local times, the same as NB-Ecom-API's slots. */
  private localIso(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }
}
