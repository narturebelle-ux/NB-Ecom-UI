import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Child, VACCINE_SCHEDULE, VaccinationRecord } from '../models/child.models';

/** Phase 6 (Child profile + vaccination tracker) — client-side only, not synced to a backend. */
@Injectable({ providedIn: 'root' })
export class ChildService {
  private api = inject(ApiService);

  getChildren(): Child[] {
    return this.readJson<Child[]>(this.childrenKey(), []);
  }

  addChild(name: string, dob: string): Child {
    const child: Child = { id: 'child_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name, dob };
    const children = this.getChildren();
    children.push(child);
    this.writeJson(this.childrenKey(), children);
    this.seedVaccinations(child.id);
    return child;
  }

  private seedVaccinations(childId: string) {
    const records = this.readJson<VaccinationRecord[]>(this.vaccinationsKey(), []);
    for (const v of VACCINE_SCHEDULE) {
      records.push({
        id: 'vax_' + childId + '_' + v.vaccineName.replace(/\s+/g, '_'),
        childId,
        vaccineName: v.vaccineName,
        dueAgeMonths: v.dueAgeMonths,
        given: false,
        givenAt: null
      });
    }
    this.writeJson(this.vaccinationsKey(), records);
  }

  getVaccinations(childId: string): VaccinationRecord[] {
    return this.readJson<VaccinationRecord[]>(this.vaccinationsKey(), [])
      .filter(v => v.childId === childId)
      .sort((a, b) => a.dueAgeMonths - b.dueAgeMonths);
  }

  markGiven(id: string, given: boolean) {
    const records = this.readJson<VaccinationRecord[]>(this.vaccinationsKey(), []);
    const record = records.find(r => r.id === id);
    if (!record) return;
    record.given = given;
    record.givenAt = given ? new Date().toISOString() : null;
    this.writeJson(this.vaccinationsKey(), records);
  }

  ageInMonths(dob: string): number {
    const ms = Date.now() - new Date(dob).getTime();
    return ms / (1000 * 60 * 60 * 24 * 30.44);
  }

  private childrenKey(): string {
    return `nb_children_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private vaccinationsKey(): string {
    return `nb_vaccinations_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
