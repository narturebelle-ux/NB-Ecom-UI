import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concat, forkJoin, last, map, of, switchMap, toArray } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { Child, ChildSex, VaccinationItem, VaccinationSchedule } from '../models/child.models';

/** Phase 6 — /me/children and their vaccination schedules (see child.models.ts). */
@Injectable({ providedIn: 'root' })
export class ChildService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/me/children`;

  getChildren(): Observable<Child[]> {
    return this.http.get<Child[]>(this.baseUrl);
  }

  addChild(name: string, dateOfBirth: string, sex: ChildSex | null): Observable<Child> {
    return this.http.post<Child>(this.baseUrl, { name, dateOfBirth, sex });
  }

  updateChild(id: number, patch: { name?: string; dateOfBirth?: string; sex?: ChildSex | null }): Observable<Child> {
    return this.http.patch<Child>(`${this.baseUrl}/${id}`, patch);
  }

  getVaccinations(childId: number): Observable<VaccinationSchedule> {
    return this.http.get<VaccinationSchedule>(`${this.baseUrl}/${childId}/vaccinations`);
  }

  /** Idempotent upsert. */
  markGiven(childId: number, scheduleItemId: number, givenAt: string, givenWhere?: string): Observable<VaccinationItem> {
    return this.http.put<VaccinationItem>(`${this.baseUrl}/${childId}/vaccinations/${scheduleItemId}`, {
      givenAt,
      givenWhere: givenWhere || null
    });
  }

  unmarkGiven(childId: number, scheduleItemId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${childId}/vaccinations/${scheduleItemId}`);
  }

  // ---------- one-time migration from the browser-only version ----------

  /**
   * Children (and vaccines ticked as given) saved by the earlier browser-only tracker are pushed to
   * the API once, matched to the server schedule by vaccine name, then removed from localStorage.
   * Only runs when the server has no children yet, so it can't duplicate anything.
   */
  migrateLegacy(serverChildren: Child[]): Observable<boolean> {
    const legacy = this.readLegacy();
    if (!legacy || serverChildren.length) return of(false);
    if (!legacy.children.length) { this.clearLegacy(); return of(false); }
    const uploads = legacy.children.map(lc =>
      this.addChild(lc.name, lc.dob, null).pipe(
        switchMap(child => {
          const given = legacy.vaccinations.filter(v => v.childId === lc.id && v.given);
          if (!given.length) return of(child);
          return this.getVaccinations(child.id).pipe(
            switchMap(schedule => {
              const marks = given
                .map(g => ({ g, item: schedule.items.find(i => i.vaccineName === g.vaccineName) }))
                .filter(x => !!x.item)
                .map(({ g, item }) => this.markGiven(child.id, item!.scheduleItemId, (g.givenAt ?? new Date().toISOString()).slice(0, 10)));
              return marks.length ? forkJoin(marks).pipe(map(() => child)) : of(child);
            })
          );
        })
      )
    );
    return concat(...uploads).pipe(toArray(), last(), map(() => { this.clearLegacy(); return true; }));
  }

  private readLegacy(): { children: LegacyChild[]; vaccinations: LegacyVaccination[] } | null {
    const id = this.api.currentUser()?.id;
    if (!id) return null;
    try {
      const c = localStorage.getItem(`nb_children_${id}`);
      if (!c) return null;
      return { children: JSON.parse(c), vaccinations: JSON.parse(localStorage.getItem(`nb_vaccinations_${id}`) || '[]') };
    } catch {
      return null;
    }
  }

  private clearLegacy() {
    const id = this.api.currentUser()?.id;
    try {
      localStorage.removeItem(`nb_children_${id}`);
      localStorage.removeItem(`nb_vaccinations_${id}`);
    } catch { /* storage blocked */ }
  }
}

interface LegacyChild { id: string; name: string; dob: string; }
interface LegacyVaccination { childId: string; vaccineName: string; given: boolean; givenAt: string | null; }
