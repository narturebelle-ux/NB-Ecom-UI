import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, switchMap, tap } from 'rxjs';
import { ChildService } from '../../services/child.service';
import { ApiService } from '../../services/api.service';
import { CHILD_SEX_LABELS, Child, ChildSex, VaccinationItem, VaccinationSchedule, VaccinationStatus } from '../../models/child.models';

@Component({
  selector: 'app-child',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="child-page">
      <div class="container">
        <h1>Child &amp; Vaccination Tracker</h1>
        <div class="draft-notice">
          <mat-icon class="icon-sm">info</mat-icon> This vaccine schedule is a standard reference list, pending clinical review for this product.
          Always confirm the actual schedule with your pediatrician.
        </div>

        <div class="add-child card">
          <h2>Add a child</h2>
          <div class="form-row">
            <input class="form-control" placeholder="Child's name" [(ngModel)]="newName" aria-label="Child's name" />
            <input class="form-control" type="date" [(ngModel)]="newDob" [max]="todayIso" aria-label="Date of birth" />
            <select class="form-control" [(ngModel)]="newSex" aria-label="Sex">
              <option [ngValue]="null">Sex (optional)</option>
              @for (s of sexes; track s) { <option [ngValue]="s">{{ sexLabels[s] }}</option> }
            </select>
            <button class="btn btn-primary" [disabled]="!newName.trim() || !newDob || saving()" (click)="addChild()">Add</button>
          </div>
        </div>

        @if (loading()) {
          <p class="field-hint">Loading…</p>
        } @else if (loadError()) {
          <div class="card error-card">
            <p>{{ loadError() }}</p>
            <button class="btn btn-outline btn-sm" (click)="load()">Try again</button>
          </div>
        } @else {
          @for (child of children(); track child.id) {
            <div class="child-card card">
              <div class="child-head">
                <h2>{{ child.name }}</h2>
                <span class="field-hint">{{ ageLabel(child.dateOfBirth) }}</span>
              </div>
              @if (schedules()[child.id]; as sched) {
                <div class="vax-list">
                  @for (v of sched.items; track v.scheduleItemId) {
                    <div class="vax-row" [class.given]="v.status === 'DONE'">
                      <input type="checkbox" [checked]="v.status === 'DONE'" [disabled]="busy() === key(child, v)"
                             (change)="toggle(child, v)" [attr.aria-label]="v.vaccineName + ' given'" />
                      <span class="vax-name">{{ v.vaccineName }}</span>
                      <span class="vax-age">{{ v.dueAgeLabel }} · {{ v.dueDate | date:'d MMM y' }}</span>
                      @if (v.status === 'DONE') {
                        <span class="field-hint">✓ {{ v.givenAt | date:'mediumDate' }}{{ v.givenWhere ? ' · ' + v.givenWhere : '' }}</span>
                      } @else {
                        <span [class]="'badge ' + v.status.toLowerCase()">{{ statusLabel(v.status) }}</span>
                      }
                    </div>
                  }
                </div>
              } @else {
                <p class="field-hint">Loading schedule…</p>
              }
            </div>
          } @empty {
            <p class="field-hint">No children added yet.</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .child-page { padding: 3rem 0 5rem; max-width: 760px; margin: 0 auto; }
    h1 { font-size: 1.85rem; color: var(--sage-900); margin-bottom: 1rem; text-align: center; }
    .draft-notice { font-size: 0.8rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.7rem 1rem; margin-bottom: 1.5rem; }

    .card { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); padding: 1.5rem; margin-bottom: 1.25rem; }
    .error-card { text-align: center; color: var(--text-secondary); }
    .add-child h2 { font-size: 1.05rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .form-control { padding: 0.55rem 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.88rem; }

    .child-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
    .child-head h2 { font-size: 1.15rem; color: var(--sage-900); }
    .vax-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .vax-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); }
    .vax-row.given .vax-name { text-decoration: line-through; color: var(--text-muted); }
    .vax-name { flex: 1; min-width: 10rem; color: var(--sage-900); font-weight: 600; }
    .vax-age { font-size: 0.75rem; color: var(--text-muted); }
    .badge { font-size: 0.68rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); }
    .badge.overdue { color: #a0281c; background: #fdecea; }
    .badge.due { color: #92610a; background: #fff8eb; }
    .badge.upcoming { color: var(--text-muted); background: var(--sage-50); }

    .btn { padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: 700; font-size: 0.88rem; cursor: pointer; border: none; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ChildComponent implements OnInit {
  private childService = inject(ChildService);
  private api = inject(ApiService);

  sexes = Object.keys(CHILD_SEX_LABELS) as ChildSex[];
  sexLabels = CHILD_SEX_LABELS;
  todayIso = (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date());

  children = signal<Child[]>([]);
  schedules = signal<Record<number, VaccinationSchedule>>({});
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  /** "childId:scheduleItemId" of the vaccine being saved. */
  busy = signal<string | null>(null);

  newName = '';
  newDob = '';
  newSex: ChildSex | null = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.childService.getChildren().pipe(
      switchMap(children => this.childService.migrateLegacy(children).pipe(
        switchMap(migrated => (migrated ? this.childService.getChildren() : [children]))
      )),
      tap(children => this.children.set(children))
    ).subscribe({
      next: children => {
        this.loading.set(false);
        children.forEach(c => this.loadSchedule(c.id));
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.loadError.set('We couldn’t load your children. Please check your connection.');
      }
    });
  }

  private loadSchedule(childId: number) {
    this.childService.getVaccinations(childId).subscribe({
      next: s => this.schedules.update(all => ({ ...all, [childId]: s })),
      error: () => this.api.showToast('Couldn’t load a vaccination schedule.')
    });
  }

  addChild() {
    if (!this.newName.trim() || !this.newDob) return;
    this.saving.set(true);
    this.childService.addChild(this.newName.trim(), this.newDob, this.newSex).subscribe({
      next: child => {
        this.saving.set(false);
        this.children.update(list => [...list, child]);
        this.loadSchedule(child.id);
        this.newName = '';
        this.newDob = '';
        this.newSex = null;
        this.api.showToast('Child added.');
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.api.showToast(err?.error?.message || 'Couldn’t add that child. Please try again.');
      }
    });
  }

  toggle(child: Child, v: VaccinationItem) {
    this.busy.set(this.key(child, v));
    const done = () => { this.busy.set(null); this.loadSchedule(child.id); };
    const req: Observable<unknown> = v.status === 'DONE'
      ? this.childService.unmarkGiven(child.id, v.scheduleItemId)
      : this.childService.markGiven(child.id, v.scheduleItemId, this.todayIso);
    req.subscribe({
      next: done,
      error: () => { done(); this.api.showToast('Couldn’t save that. Please try again.'); }
    });
  }

  key(child: Child, v: VaccinationItem): string {
    return `${child.id}:${v.scheduleItemId}`;
  }

  statusLabel(s: VaccinationStatus): string {
    return { DONE: 'Done', OVERDUE: 'Overdue', DUE: 'Due soon', UPCOMING: 'Upcoming' }[s];
  }

  ageLabel(dob: string): string {
    const months = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months < 1) return 'Newborn';
    if (months < 24) return `${Math.floor(months)} months old`;
    return `${Math.floor(months / 12)} years old`;
  }
}
