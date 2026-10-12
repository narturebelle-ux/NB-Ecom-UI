import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { PregnancyStage } from '../../models/maternal.models';

@Component({
  selector: 'app-assessment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (api.isAssessmentOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-dialog card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="close()">✕</button>

          <!-- Step Indicators -->
          <div class="step-progress">
            <div class="step-dot" [class.active]="step >= 1" [class.done]="step > 1">1</div>
            <div class="step-line" [class.done]="step > 1"></div>
            <div class="step-dot" [class.active]="step >= 2" [class.done]="step > 2">2</div>
            <div class="step-line" [class.done]="step > 2"></div>
            <div class="step-dot" [class.active]="step >= 3">3</div>
          </div>

          <!-- STEP 1: Select Stage -->
          @if (step === 1) {
            <div class="step-content">
              <span class="step-badge">Step 1 of 3</span>
              <h2>Where are you on your pregnancy journey?</h2>
              <p class="step-sub">Select your current month to help us filter clinical essentials for your body's stage.</p>

              <div class="stage-selection-grid">
                <button type="button" class="stage-card" [class.selected]="selectedStage === 'MONTH_3'" (click)="selectStage('MONTH_3')">
                  <span class="stage-icon">🌱</span>
                  <div class="stage-info">
                    <strong>Month 1 – 3</strong>
                    <span>1st Trimester • Weeks 1 to 12</span>
                    <small>Nausea, organogenesis & early care</small>
                  </div>
                </button>

                <button type="button" class="stage-card" [class.selected]="selectedStage === 'MONTH_6'" (click)="selectStage('MONTH_6')">
                  <span class="stage-icon">🌸</span>
                  <div class="stage-info">
                    <strong>Month 4 – 6</strong>
                    <span>2nd Trimester • Weeks 13 to 27</span>
                    <small>Growing bump, stretch marks & sleep</small>
                  </div>
                </button>

                <button type="button" class="stage-card" [class.selected]="selectedStage === 'MONTH_9'" (click)="selectStage('MONTH_9')">
                  <span class="stage-icon">🤱</span>
                  <div class="stage-info">
                    <strong>Month 7 – 9+</strong>
                    <span>3rd Trimester • Weeks 28 to 40+</span>
                    <small>Labor preparation & hospital bags</small>
                  </div>
                </button>
              </div>

              <div class="modal-footer">
                <button class="btn btn-primary btn-lg full-w" [disabled]="!selectedStage" (click)="step = 2">
                  Continue to Symptoms Check &rarr;
                </button>
              </div>
            </div>
          }

          <!-- STEP 2: Select Current Symptoms -->
          @if (step === 2) {
            <div class="step-content">
              <span class="step-badge">Step 2 of 3</span>
              <h2>What discomforts are you feeling right now?</h2>
              <p class="step-sub">We'll recommend strictly mandatory items for these symptoms and tell you what to avoid.</p>

              <div class="symptoms-grid">
                @for (sym of availableSymptoms; track sym.id) {
                  <button type="button" class="symptom-chip" [class.selected]="isSymptomSelected(sym.id)" (click)="toggleSymptom(sym.id)">
                    <span class="chip-icon">{{ sym.icon }}</span>
                    <span>{{ sym.label }}</span>
                  </button>
                }
              </div>

              <div class="modal-footer step-actions">
                <button class="btn btn-outline" (click)="step = 1">&larr; Back</button>
                <button class="btn btn-primary btn-lg" (click)="step = 3">
                  Next: Generate Routine &rarr;
                </button>
              </div>
            </div>
          }

          <!-- STEP 3: Unlock Tailored Routine -->
          @if (step === 3) {
            <div class="step-content">
              <span class="step-badge">Final Step</span>
              <h2>Unlock Your Doctor-Approved Routine</h2>
              <p class="step-sub">Enter your details to generate your tailored Mandatory vs. Optional guide + claim your <strong>10% Welcome Voucher (NARTURE10)</strong>.</p>

              <form (ngSubmit)="submitAssessment()" class="lead-form">
                <div class="form-group">
                  <label class="form-label">Your Name</label>
                  <input type="text" [(ngModel)]="leadName" name="name" placeholder="e.g. Radhika Sharma" class="form-control" required />
                </div>

                <div class="form-group">
                  <label class="form-label">WhatsApp / Mobile Number *</label>
                  <input type="tel" [(ngModel)]="leadPhone" name="phone" placeholder="e.g. 9876543210" class="form-control" required />
                  <small class="form-hint">Used to deliver your doctor visit checklist and session links.</small>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">City (Optional)</label>
                    <input type="text" [(ngModel)]="leadCity" name="city" placeholder="e.g. Bengaluru" class="form-control" />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">Expected Due Date (Optional)</label>
                    <input type="date" [(ngModel)]="leadDueDate" name="dueDate" class="form-control" />
                  </div>
                </div>

                <div class="privacy-note">
                  🔒 We respect mother's privacy. Zero spam. Only clinical tips & accredited clinic recommendations.
                </div>

                <div class="modal-footer step-actions">
                  <button type="button" class="btn btn-outline" (click)="step = 2">&larr; Back</button>
                  <button type="submit" class="btn btn-primary btn-lg" [disabled]="!leadPhone || isSubmitting">
                    {{ isSubmitting ? 'Analyzing Needs...' : 'View My Routine & Claim 10% Off' }}
                  </button>
                </div>
              </form>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
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
      max-width: 580px;
      padding: 2.5rem;
      border-radius: var(--radius-xl);
      position: relative;
      box-shadow: var(--shadow-xl);
      animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-close {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--sage-50);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: all var(--transition-fast);
    }
    .modal-close:hover {
      background: var(--blush-100);
      color: var(--blush-900);
    }

    .step-progress {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      gap: 0.5rem;
    }
    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sage-50);
      color: var(--text-muted);
      border: 1.5px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .step-dot.active {
      background: var(--sage-700);
      color: #fff;
      border-color: var(--sage-700);
    }
    .step-dot.done {
      background: var(--sage-100);
      color: var(--sage-800);
      border-color: var(--sage-200);
    }
    .step-line {
      width: 40px;
      height: 2px;
      background: var(--border-light);
    }
    .step-line.done {
      background: var(--sage-700);
    }

    .step-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--blush-700);
      margin-bottom: 0.5rem;
    }
    .step-content h2 {
      font-size: 1.65rem;
      margin-bottom: 0.5rem;
      color: var(--sage-900);
    }
    .step-sub {
      color: var(--text-secondary);
      font-size: 0.92rem;
      margin-bottom: 1.5rem;
    }

    .stage-selection-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .stage-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.1rem;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-light);
      background: var(--bg-surface);
      text-align: left;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .stage-card:hover {
      border-color: var(--sage-600);
      background: var(--sage-50);
    }
    .stage-card.selected {
      border-color: var(--sage-700);
      background: var(--sage-50);
      box-shadow: 0 4px 12px rgba(46,79,62,0.1);
    }
    .stage-icon {
      font-size: 2rem;
    }
    .stage-info strong {
      display: block;
      font-size: 1.05rem;
      color: var(--sage-900);
    }
    .stage-info span {
      display: block;
      font-size: 0.85rem;
      color: var(--blush-700);
      font-weight: 600;
    }
    .stage-info small {
      display: block;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .symptoms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .symptom-chip {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-light);
      background: var(--bg-surface);
      cursor: pointer;
      font-size: 0.88rem;
      color: var(--text-primary);
      font-weight: 600;
      transition: all var(--transition-fast);
      text-align: left;
    }
    .symptom-chip:hover {
      border-color: var(--sage-600);
    }
    .symptom-chip.selected {
      background: var(--sage-700);
      color: #fff;
      border-color: var(--sage-700);
    }
    .chip-icon {
      font-size: 1.25rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 {
      flex: 1;
    }
    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .privacy-note {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }
    .step-actions {
      justify-content: space-between;
    }
    .full-w {
      width: 100%;
    }

    @media (max-width: 600px) {
      .modal-dialog {
        padding: 1.5rem;
      }
      .symptoms-grid {
        grid-template-columns: 1fr;
      }
      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `]
})
export class AssessmentModalComponent {
  api = inject(ApiService);
  router = inject(Router);

  step = 1;
  selectedStage: PregnancyStage = 'MONTH_3';
  selectedSymptoms: string[] = [];

  leadName = '';
  leadPhone = '';
  leadCity = '';
  leadDueDate = '';
  isSubmitting = false;

  availableSymptoms = [
    { id: 'NAUSEA', icon: '🍋', label: 'Morning Sickness & Nausea' },
    { id: 'BACK_PAIN', icon: '🦴', label: 'Lower Back & Pelvic Strain' },
    { id: 'INSOMNIA', icon: '🌙', label: 'Difficulty Sleeping / Insomnia' },
    { id: 'STRETCH_MARKS', icon: '🧴', label: 'Stretching Skin & Itchiness' },
    { id: 'SWOLLEN_FEET', icon: '🦶', label: 'Swollen Feet & Cramping' },
    { id: 'LABOR_ANXIETY', icon: '🏥', label: 'Labor & Delivery Readiness' }
  ];

  selectStage(stage: PregnancyStage) {
    this.selectedStage = stage;
  }

  isSymptomSelected(id: string): boolean {
    return this.selectedSymptoms.includes(id);
  }

  toggleSymptom(id: string) {
    if (this.isSymptomSelected(id)) {
      this.selectedSymptoms = this.selectedSymptoms.filter(s => s !== id);
    } else {
      this.selectedSymptoms.push(id);
    }
  }

  close() {
    this.api.isAssessmentOpen.set(false);
    this.step = 1;
  }

  submitAssessment() {
    if (!this.leadPhone) return;

    this.isSubmitting = true;
    const payload = {
      name: this.leadName || 'Expecting Mother',
      phone: this.leadPhone,
      stage: this.selectedStage,
      symptoms: this.selectedSymptoms,
      city: this.leadCity,
      dueDate: this.leadDueDate || null,
      leadSource: 'ASSESSMENT_TOOL'
    };

    this.api.submitAssessment(payload).subscribe(() => {
      this.isSubmitting = false;
      this.api.showToast('Your personalized Doctor-Approved plan is ready! Coupon NARTURE10 applied.');
      this.close();

      // Navigate directly to their stage page
      let targetUrl = '/products/month-3';
      if (this.selectedStage === 'MONTH_6') targetUrl = '/products/month-6';
      if (this.selectedStage === 'MONTH_9') targetUrl = '/products/month-9';

      this.router.navigateByUrl(targetUrl);
    });
  }
}
