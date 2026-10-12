import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ChecklistTask, HospitalPartner, PregnancyStage } from '../../models/maternal.models';

@Component({
  selector: 'app-checklists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="checklist-header">
      <div class="container text-center">
        <span class="badge badge-sage">Stream 02: Clinical Guidance & Hospital Network</span>
        <h1>Prenatal Doctor Visit & Medical Scan Checklists</h1>
        <p class="header-desc">
          Know exactly what ultrasound scans, blood markers, and clinical questions are mandatory for each month of pregnancy, plus accredited maternity centers near you.
        </p>

        <!-- Stage Filter Tabs -->
        <div class="stage-tabs">
          <button (click)="filterStage('ALL')" class="tab-btn" [class.active]="selectedStage === 'ALL'">All Trimesters</button>
          <button (click)="filterStage('MONTH_3')" class="tab-btn" [class.active]="selectedStage === 'MONTH_3'">Month 3 (NT Scan)</button>
          <button (click)="filterStage('MONTH_6')" class="tab-btn" [class.active]="selectedStage === 'MONTH_6'">Month 6 (Anomaly Scan)</button>
          <button (click)="filterStage('MONTH_9')" class="tab-btn" [class.active]="selectedStage === 'MONTH_9'">Month 9 (Labor Prep)</button>
        </div>
      </div>
    </header>

    <main class="container checklist-body">
      <div class="checklist-layout">
        <!-- Left Column: Medical Tasks & Scan Guide -->
        <div class="tasks-column">
          <div class="tasks-header">
            <h2>Medical Tests & Questions For Your OB-GYN</h2>
            <span class="task-count">{{ filteredTasks.length }} Tasks</span>
          </div>

          <div class="tasks-list">
            @for (task of filteredTasks; track task.id) {
              <div class="task-card card" [class.mandatory-test]="task.isMandatoryMedicalTest">
                <div class="task-top">
                  <div class="task-meta">
                    <span class="due-pill">{{ task.weeksDue }}</span>
                    <span class="category-pill">{{ task.category }}</span>
                    @if (task.isMandatoryMedicalTest) {
                      <span class="mandatory-flag">🟢 Mandatory Clinical Test</span>
                    }
                  </div>
                  <h3 class="task-title">{{ task.testName }}</h3>
                  <p class="task-desc">{{ task.description }}</p>
                </div>

                <!-- Sponsored Partner Ad Strip within Checklist Item -->
                @if (task.sponsoredPartnerName) {
                  <div class="partner-ad-box">
                    <div class="partner-ad-badge">
                      <span>🏥 Recommended Clinical Partner</span>
                      <span class="discount-code">{{ task.sponsoredPartnerBadge }}</span>
                    </div>
                    <div class="partner-ad-content">
                      <div class="partner-title">
                        <strong>{{ task.sponsoredPartnerName }}</strong>
                        <span class="facility-type">• {{ task.recommendedFacilityType }}</span>
                      </div>
                      <div class="partner-action">
                        @if (task.partnerDiscountCode) {
                          <span class="code-pill">Coupon: <strong>{{ task.partnerDiscountCode }}</strong></span>
                        }
                        <a [href]="task.partnerBookingUrl" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
                          Book Slot &rarr;
                        </a>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Right Column: Local Hospitals & Ultrasound Scan Labs (Stream 2 Monetization) -->
        <div class="hospitals-column">
          <div class="hospital-filter-card card glass">
            <h3>Find Accredited Centers Near You</h3>
            <p>Filter accredited maternity hospitals and 4D fetal ultrasound units in your city:</p>

            <div class="city-selector">
              <label class="form-label">Select City:</label>
              <select [(ngModel)]="selectedCity" (change)="onCityChange()" class="form-control">
                <option value="">All Major Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Hyderabad">Hyderabad</option>
              </select>
            </div>

            <div class="pincode-box mt-2">
              <label class="form-label">Or Enter Pincode:</label>
              <div class="pincode-input-row">
                <input type="text" [(ngModel)]="searchPincode" placeholder="e.g. 560017" class="form-control" />
                <button (click)="onPincodeSearch()" class="btn btn-secondary btn-sm">Filter</button>
              </div>
            </div>
          </div>

          <!-- Hospitals List -->
          <div class="hospitals-list mt-3">
            <h4 class="partner-list-heading">Vetted Maternity Centers ({{ hospitals.length }})</h4>

            @for (hosp of hospitals; track hosp.id) {
              <div class="hospital-item card">
                <img [src]="hosp.imageUrl" [alt]="hosp.name" class="hosp-thumb" />
                <div class="hosp-details">
                  <div class="hosp-tier-row">
                    <span class="tier-badge">{{ hosp.partnerTier.replace('_', ' ') }}</span>
                    <span class="rating">★ {{ hosp.rating }} ({{ hosp.reviewCount }})</span>
                  </div>
                  <h4 class="hosp-name">{{ hosp.name }}</h4>
                  <p class="hosp-address">📍 {{ hosp.city }} • {{ hosp.address }}</p>
                  <p class="hosp-spec">🩺 {{ hosp.specialty }}</p>

                  <div class="hosp-perk">
                    <span>🎁 <strong>NartureBelle Partner Offer:</strong> {{ hosp.discountDetails }}</span>
                  </div>

                  <div class="hosp-action-row">
                    <button (click)="requestHospitalTour(hosp)" class="btn btn-primary btn-sm full-w">
                      Request Free Hospital Tour / Callback
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </main>

    <!-- Hospital Tour Callback Modal -->
    @if (selectedHospitalForTour) {
      <div class="modal-backdrop" (click)="selectedHospitalForTour = null">
        <div class="modal-dialog card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="selectedHospitalForTour = null">✕</button>
          <span class="badge badge-sage">Partner Concierge</span>
          <h2>Tour {{ selectedHospitalForTour.name }}</h2>
          <p class="sub">Our hospital partner desk will schedule your private walkthrough of labor suites and fetal scan labs.</p>

          <form (ngSubmit)="submitTourRequest()" class="mt-2">
            <div class="form-group">
              <label class="form-label">Your Name</label>
              <input type="text" [(ngModel)]="tourName" name="name" placeholder="Radhika Sharma" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp / Phone Number *</label>
              <input type="tel" [(ngModel)]="tourPhone" name="phone" placeholder="9876543210" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Expected Due Month</label>
              <select [(ngModel)]="tourStage" name="stage" class="form-control">
                <option value="MONTH_3">Month 1–3 (1st Trimester)</option>
                <option value="MONTH_6">Month 4–6 (2nd Trimester)</option>
                <option value="MONTH_9">Month 7–9 (Delivery Soon)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-lg full-w mt-2">
              Confirm Free Tour Request
            </button>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .checklist-header {
      padding: 3.5rem 0 2.5rem 0;
      background: linear-gradient(135deg, #f0f6f2 0%, #faf7f2 100%);
      border-bottom: 1px solid var(--border-light);
    }
    .text-center {
      text-align: center;
    }
    .checklist-header h1 {
      font-size: 2.35rem;
      color: var(--sage-900);
      margin: 0.5rem 0;
    }
    .header-desc {
      max-width: 680px;
      margin: 0 auto 2rem auto;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .stage-tabs {
      display: inline-flex;
      background: #fff;
      padding: 0.35rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .tab-btn {
      padding: 0.5rem 1.25rem;
      border-radius: var(--radius-full);
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .tab-btn.active {
      background: var(--sage-700);
      color: #fff;
      box-shadow: 0 2px 8px rgba(46,79,62,0.25);
    }

    .checklist-body {
      padding-top: 3.5rem;
      padding-bottom: 5rem;
    }
    .checklist-layout {
      display: grid;
      grid-template-columns: 1.25fr 0.85fr;
      gap: 2.5rem;
    }

    /* Tasks Column */
    .tasks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .tasks-header h2 {
      font-size: 1.45rem;
      color: var(--sage-900);
    }
    .task-count {
      font-weight: 700;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .task-card {
      padding: 1.75rem;
      border-radius: var(--radius-lg);
      background: #fff;
    }
    .task-card.mandatory-test {
      border-left: 4px solid var(--tier-mandatory-text);
    }
    .task-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
      flex-wrap: wrap;
    }
    .due-pill {
      background: var(--sage-100);
      color: var(--sage-900);
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm);
    }
    .category-pill {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    .mandatory-flag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--tier-mandatory-text);
      background: var(--tier-mandatory-bg);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .task-title {
      font-size: 1.2rem;
      color: var(--sage-900);
      margin-bottom: 0.4rem;
    }
    .task-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Partner Ad Box inside Task */
    .partner-ad-box {
      margin-top: 1.25rem;
      background: var(--bg-cream);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
    }
    .partner-ad-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--blush-700);
      margin-bottom: 0.5rem;
    }
    .discount-code {
      color: var(--tier-mandatory-text);
    }
    .partner-ad-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .partner-title strong {
      font-size: 0.95rem;
      color: var(--sage-900);
    }
    .facility-type {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .partner-action {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .code-pill {
      font-size: 0.78rem;
      background: #fff;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--sage-700);
    }

    /* Hospital Column */
    .hospital-filter-card {
      padding: 1.75rem;
      border-radius: var(--radius-lg);
      background: #fff;
    }
    .hospital-filter-card h3 {
      font-size: 1.25rem;
      color: var(--sage-900);
      margin-bottom: 0.35rem;
    }
    .hospital-filter-card p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    .pincode-input-row {
      display: flex;
      gap: 0.5rem;
    }
    .mt-2 { margin-top: 0.75rem; }
    .mt-3 { margin-top: 1.5rem; }

    .partner-list-heading {
      font-size: 1.1rem;
      color: var(--sage-900);
      margin-bottom: 1rem;
    }
    .hospitals-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .hospital-item {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .hosp-thumb {
      height: 140px;
      width: 100%;
      object-fit: cover;
    }
    .hosp-details {
      padding: 1.25rem;
    }
    .hosp-tier-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.72rem;
      font-weight: 800;
      margin-bottom: 0.35rem;
    }
    .tier-badge {
      color: var(--gold-700);
      background: var(--gold-100);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .rating {
      color: #b8812c;
    }
    .hosp-name {
      font-size: 1.1rem;
      color: var(--sage-900);
      margin-bottom: 0.25rem;
    }
    .hosp-address {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .hosp-spec {
      font-size: 0.82rem;
      color: var(--sage-800);
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    .hosp-perk {
      background: var(--sage-50);
      border-left: 3px solid var(--sage-700);
      padding: 0.5rem 0.75rem;
      font-size: 0.78rem;
      color: var(--sage-900);
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
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
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    @media (max-width: 992px) {
      .checklist-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ChecklistsComponent implements OnInit {
  api = inject(ApiService);

  allTasks: ChecklistTask[] = [];
  filteredTasks: ChecklistTask[] = [];
  hospitals: HospitalPartner[] = [];

  selectedStage: string = 'ALL';
  selectedCity: string = '';
  searchPincode: string = '';

  selectedHospitalForTour: HospitalPartner | null = null;
  tourName = '';
  tourPhone = '';
  tourStage = 'MONTH_6';

  ngOnInit() {
    this.api.getChecklists().subscribe(tasks => {
      this.allTasks = tasks;
      this.filteredTasks = tasks;
    });

    this.api.getHospitals().subscribe(hosps => {
      this.hospitals = hosps;
    });
  }

  filterStage(stage: string) {
    this.selectedStage = stage;
    if (stage === 'ALL') {
      this.filteredTasks = this.allTasks;
    } else {
      this.filteredTasks = this.allTasks.filter(t => t.stage === stage);
    }
  }

  onCityChange() {
    this.api.getHospitals(this.selectedCity, this.searchPincode).subscribe(hosps => {
      this.hospitals = hosps;
    });
  }

  onPincodeSearch() {
    this.api.getHospitals(this.selectedCity, this.searchPincode).subscribe(hosps => {
      this.hospitals = hosps;
    });
  }

  requestHospitalTour(hosp: HospitalPartner) {
    this.selectedHospitalForTour = hosp;
  }

  submitTourRequest() {
    if (!this.tourPhone) return;

    this.api.showToast(`Tour requested at ${this.selectedHospitalForTour?.name}! A hospital coordinator will call you.`);
    this.selectedHospitalForTour = null;
    this.tourName = '';
    this.tourPhone = '';
  }
}
