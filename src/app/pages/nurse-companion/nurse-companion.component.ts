import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { NursePackage, PregnancyStage } from '../../models/maternal.models';

@Component({
  selector: 'app-nurse-companion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Header -->
    <header class="nurse-header">
      <div class="container header-grid">
        <div class="header-text">
          <span class="badge badge-blush">Stream 03: Dedicated Care Services</span>
          <h1>Your Personal Maternal Care Nurse on Call: "Maa Sakhi"</h1>
          <p class="lead-desc">
            You don't have to navigate pregnancy alone. Have a certified senior female nurse assigned exclusively to you for daily WhatsApp guidance, lab report deciphering, and compassionate handholding.
          </p>

          <div class="nurse-key-highlights">
            <div class="h-item">
              <span class="icon">💬</span>
              <div>
                <strong>Daily WhatsApp Reassurance</strong>
                <span>Direct line to your assigned senior nurse</span>
              </div>
            </div>
            <div class="h-item">
              <span class="icon">📑</span>
              <div>
                <strong>Scan & Blood Report Clarifications</strong>
                <span>Instant explanations before your doctor visit</span>
              </div>
            </div>
            <div class="h-item">
              <span class="icon">🗣️</span>
              <div>
                <strong>Multilingual Care</strong>
                <span>Hindi, English, Telugu, Tamil, Kannada & Marathi</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive WhatsApp Chat Simulation -->
        <div class="chat-mockup-wrapper">
          <div class="phone-frame card">
            <div class="chat-header">
              <div class="nurse-profile">
                <img src="https://images.unsplash.com/photo-1594824813500-2921516e537c?auto=format&fit=crop&w=200&q=80" alt="Nurse Sister Deepa" class="avatar" />
                <div>
                  <strong>Sister Deepa, RN</strong>
                  <span class="status">🟢 Active Now • NartureBelle Care Companion</span>
                </div>
              </div>
            </div>

            <div class="chat-messages">
              <div class="msg incoming">
                <p>Namaste Radhika ji! How are your morning cramps today? Did the ginger drops help soothe the nausea?</p>
                <span class="time">9:15 AM</span>
              </div>
              <div class="msg outgoing">
                <p>Hello Sister Deepa! The drops helped a lot, but I just got my NT scan report. The nuchal fold says 1.6mm. Is that safe?</p>
                <span class="time">9:22 AM</span>
              </div>
              <div class="msg incoming">
                <p>Yes, absolutely! 1.6mm is well within the healthy normal range (under 2.5mm). Your baby's neck fold is completely normal. Take a deep breath! ❤️</p>
                <span class="time">9:25 AM</span>
              </div>
            </div>
            <div class="chat-footer">
              <span>🔒 256-Bit Confidential Maternal Helpline</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="container nurse-body">
      <!-- Section Header -->
      <div class="section-header">
        <span class="tagline">Personalized Care Packages</span>
        <h2>Choose Your Nurse Care Plan</h2>
        <p>Simple, transparent plans designed for peace of mind across your pregnancy milestones.</p>
      </div>

      <!-- Packages Grid -->
      <div class="packages-grid">
        @for (pkg of packages; track pkg.id) {
          <div class="package-card card" [class.featured-pkg]="pkg.badge === 'MOST POPULAR' || pkg.badge === 'COMPLETE PEACE OF MIND'">
            @if (pkg.badge) {
              <div class="pkg-badge-strip">
                <span class="badge" [ngClass]="pkg.badge === 'MOST POPULAR' ? 'badge-mandatory' : 'badge-gold'">
                  {{ pkg.badge }}
                </span>
              </div>
            }

            <div class="pkg-header">
              <h3>{{ pkg.name }}</h3>
              <p class="pkg-tagline">{{ pkg.tagLine }}</p>
              <div class="pkg-price-row">
                <span class="price-val">₹{{ pkg.price }}</span>
                @if (pkg.originalPrice) {
                  <span class="orig-val">₹{{ pkg.originalPrice }}</span>
                }
                <span class="duration-val">/ {{ pkg.duration }}</span>
              </div>
            </div>

            <p class="pkg-desc">{{ pkg.description }}</p>

            <ul class="features-list">
              @for (feat of pkg.features; track feat) {
                <li><span class="tick">✓</span> {{ feat }}</li>
              }
            </ul>

            <div class="pkg-action">
              <button (click)="openBooking(pkg)" class="btn btn-primary btn-lg full-w">
                Book Dedicated Nurse &rarr;
              </button>
            </div>
          </div>
        }
      </div>
    </main>

    <!-- Nurse Booking Modal -->
    @if (selectedPackage) {
      <div class="modal-backdrop" (click)="selectedPackage = null">
        <div class="modal-dialog card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="selectedPackage = null">✕</button>
          <span class="badge badge-blush">Personal Nurse Assignment</span>
          <h2>Book {{ selectedPackage.name }}</h2>
          <p class="sub">Our clinical care coordinator will call you to introduce your assigned nurse companion.</p>

          <form (ngSubmit)="confirmBooking()" class="mt-2">
            <div class="form-group">
              <label class="form-label">Your Full Name *</label>
              <input type="text" [(ngModel)]="bookingName" name="name" placeholder="e.g. Radhika Sharma" class="form-control" required />
            </div>

            <div class="form-group">
              <label class="form-label">WhatsApp / Phone Number *</label>
              <input type="tel" [(ngModel)]="bookingPhone" name="phone" placeholder="e.g. 9876543210" class="form-control" required />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Current Trimester</label>
                <select [(ngModel)]="bookingStage" name="stage" class="form-control">
                  <option value="MONTH_3">Month 1–3 (1st Trimester)</option>
                  <option value="MONTH_6">Month 4–6 (2nd Trimester)</option>
                  <option value="MONTH_9">Month 7–9 (Delivery Prep)</option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label class="form-label">Preferred Language</label>
                <select [(ngModel)]="bookingLanguage" name="lang" class="form-control">
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Any specific questions or health notes? (Optional)</label>
              <textarea [(ngModel)]="bookingNotes" name="notes" placeholder="e.g. Having severe morning sickness, looking for diet advice" class="form-control" rows="2"></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg full-w mt-2" [disabled]="!bookingPhone">
              Confirm & Assign My Nurse Companion
            </button>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .nurse-header {
      padding: 4.5rem 0 3.5rem 0;
      background: radial-gradient(circle at 10% 20%, rgba(251, 230, 221, 0.7) 0%, transparent 60%),
                  radial-gradient(circle at 90% 80%, rgba(226, 237, 230, 0.7) 0%, transparent 60%);
      border-bottom: 1px solid var(--border-light);
    }
    .header-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 3.5rem;
      align-items: center;
    }
    .nurse-header h1 {
      font-size: 2.6rem;
      color: var(--sage-900);
      margin: 0.75rem 0 1rem 0;
      line-height: 1.2;
    }
    .lead-desc {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .nurse-key-highlights {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .h-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
    }
    .h-item .icon {
      font-size: 1.5rem;
    }
    .h-item strong {
      display: block;
      font-size: 0.95rem;
      color: var(--sage-900);
    }
    .h-item span {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* WhatsApp Phone Simulation */
    .phone-frame {
      background: #f7f3ee;
      border-radius: 36px;
      overflow: hidden;
      border: 6px solid #2d3748;
      box-shadow: var(--shadow-xl);
    }
    .chat-header {
      background: var(--sage-800);
      color: #fff;
      padding: 1rem 1.25rem;
    }
    .nurse-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #fff;
    }
    .nurse-profile strong {
      display: block;
      font-size: 0.95rem;
    }
    .nurse-profile .status {
      font-size: 0.72rem;
      color: #a3e6cb;
    }
    .chat-messages {
      padding: 1.5rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 280px;
      overflow-y: auto;
    }
    .msg {
      max-width: 82%;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      line-height: 1.45;
      position: relative;
    }
    .msg.incoming {
      background: #fff;
      color: var(--text-primary);
      align-self: flex-start;
      border-bottom-left-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .msg.outgoing {
      background: #d9fdd3;
      color: #0c381e;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .msg .time {
      display: block;
      font-size: 0.65rem;
      color: var(--text-muted);
      text-align: right;
      margin-top: 0.35rem;
    }
    .chat-footer {
      background: #eae5de;
      padding: 0.6rem 1rem;
      text-align: center;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .nurse-body {
      padding-top: 5rem;
      padding-bottom: 5rem;
    }
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .package-card {
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .featured-pkg {
      border: 2px solid var(--sage-700);
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }
    .pkg-badge-strip {
      margin-bottom: 1rem;
    }
    .pkg-header h3 {
      font-size: 1.4rem;
      color: var(--sage-900);
      margin-bottom: 0.35rem;
    }
    .pkg-tagline {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }
    .pkg-price-row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .price-val {
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 700;
      color: var(--sage-900);
    }
    .orig-val {
      font-size: 1rem;
      color: var(--text-muted);
      text-decoration: line-through;
    }
    .duration-val {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .pkg-desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .features-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 2rem;
      flex-grow: 1;
    }
    .features-list li {
      font-size: 0.85rem;
      color: var(--text-secondary);
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .features-list .tick {
      color: var(--tier-mandatory-text);
      font-weight: 800;
    }
    .full-w {
      width: 100%;
    }

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
      max-width: 520px;
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
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 { flex: 1; }
    .mt-2 { margin-top: 0.75rem; }

    @media (max-width: 992px) {
      .header-grid {
        grid-template-columns: 1fr;
      }
      .packages-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NurseCompanionComponent implements OnInit {
  api = inject(ApiService);

  packages: NursePackage[] = [];
  selectedPackage: NursePackage | null = null;

  bookingName = '';
  bookingPhone = '';
  bookingStage = 'MONTH_6';
  bookingLanguage = 'English';
  bookingNotes = '';

  ngOnInit() {
    this.api.getNursePackages().subscribe(pkgs => {
      this.packages = pkgs;
    });
  }

  openBooking(pkg: NursePackage) {
    this.selectedPackage = pkg;
  }

  confirmBooking() {
    if (!this.bookingPhone) return;

    const payload = {
      clientName: this.bookingName || 'Expecting Mother',
      clientPhone: this.bookingPhone,
      currentStage: this.bookingStage,
      preferredLanguage: this.bookingLanguage,
      packageId: this.selectedPackage?.id,
      notes: this.bookingNotes
    };

    this.api.bookNurse(payload).subscribe((res: any) => {
      this.api.showToast(res.message);
      this.selectedPackage = null;
      this.bookingName = '';
      this.bookingPhone = '';
    });
  }
}
