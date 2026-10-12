import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DoctorSession } from '../../models/maternal.models';

@Component({
  selector: 'app-doctors-live',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="live-header">
      <div class="container text-center">
        <span class="live-badge-pill">
          <span class="live-dot"></span> Interactive Masterclasses
        </span>
        <h1>NartureBelle Doctor Live: Weekly OB-GYN Webinars</h1>
        <p class="header-desc">
          Direct access to senior Obstetricians, Fetal Medicine Specialists, and Certified Midwives. Ask your live doubts on nausea, ultrasound scans, safe sleep, and natural birthing.
        </p>
      </div>
    </header>

    <main class="container live-body">
      <div class="sessions-grid">
        @for (session of sessions; track session.id) {
          <div class="session-card card">
            <div class="session-banner-wrap">
              <img [src]="session.bannerUrl" [alt]="session.doctorName" class="session-banner" />
              <div class="session-overlay">
                <span class="stage-tag">{{ session.targetStage.replace('_', ' ') }} FOCUS</span>
                <span class="attendee-tag">👥 {{ session.attendeeCount }} Registered</span>
              </div>
            </div>

            <div class="session-content">
              <div class="doctor-badge-row">
                <div class="doc-text">
                  <h3>{{ session.doctorName }}</h3>
                  <p class="doc-title">{{ session.doctorTitle }}</p>
                  <p class="doc-hospital">🏥 {{ session.hospitalAffiliation }}</p>
                </div>
              </div>

              <h2 class="session-topic">{{ session.topic }}</h2>
              <p class="session-desc">{{ session.description }}</p>

              <div class="session-schedule-box">
                <div class="time-item">
                  <span class="icon">📅</span>
                  <div>
                    <strong>Date & Time</strong>
                    <span>{{ session.sessionDate }}</span>
                  </div>
                </div>
                <div class="time-item">
                  <span class="icon">⏱️</span>
                  <div>
                    <strong>Duration</strong>
                    <span>{{ session.durationMinutes }} Minutes Live Q&A</span>
                  </div>
                </div>
              </div>

              <div class="session-action">
                <button (click)="openRsvp(session)" class="btn btn-primary btn-lg full-w">
                  Reserve Free Seat &rarr;
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </main>

    <!-- RSVP Modal -->
    @if (selectedSession) {
      <div class="modal-backdrop" (click)="selectedSession = null">
        <div class="modal-dialog card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="selectedSession = null">✕</button>
          <span class="badge badge-mandatory">Free Webinar Registration</span>
          <h2>Reserve Seat for {{ selectedSession.doctorName }}</h2>
          <p class="sub">Topic: {{ selectedSession.topic }}</p>

          <form (ngSubmit)="confirmRsvp()" class="mt-2">
            <div class="form-group">
              <label class="form-label">Your Full Name *</label>
              <input type="text" [(ngModel)]="rsvpName" name="name" placeholder="Radhika Sharma" class="form-control" required />
            </div>

            <div class="form-group">
              <label class="form-label">WhatsApp Number (For Zoom Link) *</label>
              <input type="tel" [(ngModel)]="rsvpPhone" name="phone" placeholder="9876543210" class="form-control" required />
            </div>

            <div class="form-group">
              <label class="form-label">Have a question for the doctor? (Optional)</label>
              <textarea [(ngModel)]="rsvpQuestion" name="question" placeholder="e.g. Can I take paracetamol for mild headaches in week 10?" class="form-control" rows="2"></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!rsvpPhone">
              Confirm Registration & Get Link
            </button>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .live-header {
      padding: 3.5rem 0 2.5rem 0;
      background: linear-gradient(135deg, #fdf3ef 0%, #faf7f2 100%);
      border-bottom: 1px solid var(--border-light);
    }
    .text-center { text-align: center; }
    .live-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #fde8e8;
      color: #9b1c1c;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e02424;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
    .live-header h1 {
      font-size: 2.35rem;
      color: var(--sage-900);
      margin-bottom: 0.5rem;
    }
    .header-desc {
      max-width: 680px;
      margin: 0 auto;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .live-body {
      padding-top: 3.5rem;
      padding-bottom: 5rem;
    }
    .sessions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .session-card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .session-banner-wrap {
      position: relative;
      height: 180px;
    }
    .session-banner {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .session-overlay {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stage-tag {
      background: var(--sage-900);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
    }
    .attendee-tag {
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .session-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .doc-text h3 {
      font-size: 1.15rem;
      color: var(--sage-900);
    }
    .doc-title {
      font-size: 0.8rem;
      color: var(--blush-700);
      font-weight: 600;
    }
    .doc-hospital {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
      margin-bottom: 1rem;
    }

    .session-topic {
      font-size: 1.2rem;
      color: var(--sage-900);
      margin-bottom: 0.5rem;
      line-height: 1.35;
    }
    .session-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }

    .session-schedule-box {
      background: var(--bg-cream);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-bottom: 1.5rem;
    }
    .time-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.82rem;
    }
    .time-item strong {
      display: block;
      color: var(--sage-900);
    }
    .time-item span {
      color: var(--text-secondary);
    }

    .session-action {
      margin-top: auto;
    }
    .full-w { width: 100%; }
    .mt-2 { margin-top: 0.75rem; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(27, 51, 39, 0.65);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-dialog {
      background: #fff;
      width: 100%;
      max-width: 500px;
      padding: 2.25rem;
      border-radius: var(--radius-xl);
      position: relative;
    }
    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sage-50);
      cursor: pointer;
    }
    .sub {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    @media (max-width: 992px) {
      .sessions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DoctorsLiveComponent implements OnInit {
  api = inject(ApiService);

  sessions: DoctorSession[] = [];
  selectedSession: DoctorSession | null = null;

  rsvpName = '';
  rsvpPhone = '';
  rsvpQuestion = '';

  ngOnInit() {
    this.api.getDoctorSessions().subscribe(s => {
      this.sessions = s;
    });
  }

  openRsvp(session: DoctorSession) {
    this.selectedSession = session;
  }

  confirmRsvp() {
    if (!this.rsvpPhone) return;

    const payload = {
      sessionId: this.selectedSession?.id,
      motherName: this.rsvpName || 'Expecting Mother',
      phone: this.rsvpPhone,
      stage: this.selectedSession?.targetStage,
      userQuestion: this.rsvpQuestion
    };

    this.api.rsvpDoctor(payload).subscribe((res: any) => {
      this.api.showToast(res.message);
      if (this.selectedSession) {
        this.selectedSession.attendeeCount++;
      }
      this.selectedSession = null;
      this.rsvpName = '';
      this.rsvpPhone = '';
    });
  }
}
