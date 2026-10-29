import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChildService } from '../../services/child.service';
import { ApiService } from '../../services/api.service';
import { Child, VaccinationRecord } from '../../models/child.models';

@Component({
  selector: 'app-child',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="child-page">
      <div class="container">
        <h1>Child &amp; Vaccination Tracker</h1>
        <div class="draft-notice">
          ⚠️ This vaccine schedule is a standard reference list, pending clinical review for this product.
          Always confirm the actual schedule with your pediatrician.
        </div>

        <div class="add-child card">
          <h2>Add a Child</h2>
          <div class="form-row">
            <input class="form-control" placeholder="Child's name" [(ngModel)]="newName" />
            <input class="form-control" type="date" [(ngModel)]="newDob" />
            <button class="btn btn-primary" [disabled]="!newName.trim() || !newDob" (click)="addChild()">Add</button>
          </div>
        </div>

        @for (child of children(); track child.id) {
          <div class="child-card card">
            <div class="child-head">
              <h2>{{ child.name }}</h2>
              <span class="field-hint">{{ ageLabel(child.dob) }}</span>
            </div>
            <div class="vax-list">
              @for (v of vaccinations(child.id); track v.id) {
                <label class="vax-row" [class.given]="v.given">
                  <input type="checkbox" [checked]="v.given" (change)="toggle(v)" />
                  <span class="vax-name">{{ v.vaccineName }}</span>
                  <span class="vax-age">due at {{ v.dueAgeMonths }} mo</span>
                  @if (v.given) {
                    <span class="field-hint">✓ {{ v.givenAt | date:'mediumDate' }}</span>
                  } @else if (ageMonths(child.dob) >= v.dueAgeMonths) {
                    <span class="overdue-badge">Overdue</span>
                  }
                </label>
              }
            </div>
          </div>
        } @empty {
          <p class="field-hint">No children added yet.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .child-page { padding: 3rem 0 5rem; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.85rem; color: var(--sage-900); margin-bottom: 1rem; text-align: center; }
    .draft-notice { font-size: 0.8rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.7rem 1rem; margin-bottom: 1.5rem; }

    .card { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); padding: 1.5rem; margin-bottom: 1.25rem; }
    .add-child h2 { font-size: 1.05rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .form-control { padding: 0.55rem 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.88rem; }

    .child-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
    .child-head h2 { font-size: 1.15rem; color: var(--sage-900); }
    .vax-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .vax-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
    .vax-row.given .vax-name { text-decoration: line-through; color: var(--text-muted); }
    .vax-name { flex: 1; color: var(--sage-900); font-weight: 600; }
    .vax-age { font-size: 0.75rem; color: var(--text-muted); }
    .overdue-badge { font-size: 0.68rem; font-weight: 800; color: #a0281c; background: #fdecea; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); }

    .btn { padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: 700; font-size: 0.88rem; cursor: pointer; border: none; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ChildComponent implements OnInit {
  private childService = inject(ChildService);
  private api = inject(ApiService);

  children = signal<Child[]>([]);
  newName = '';
  newDob = '';

  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    this.children.set(this.childService.getChildren());
  }

  addChild() {
    if (!this.newName.trim() || !this.newDob) return;
    this.childService.addChild(this.newName.trim(), this.newDob);
    this.newName = '';
    this.newDob = '';
    this.refresh();
    this.api.showToast('Child added.');
  }

  vaccinations(childId: string): VaccinationRecord[] {
    return this.childService.getVaccinations(childId);
  }

  toggle(v: VaccinationRecord) {
    this.childService.markGiven(v.id, !v.given);
    this.refresh();
  }

  ageMonths(dob: string): number {
    return this.childService.ageInMonths(dob);
  }

  ageLabel(dob: string): string {
    const months = this.ageMonths(dob);
    if (months < 1) return 'Newborn';
    if (months < 24) return `${Math.floor(months)} months old`;
    return `${Math.floor(months / 12)} years old`;
  }
}
