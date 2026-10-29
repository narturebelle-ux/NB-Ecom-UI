import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AccessAction, AccessLogEntry, RecordCategory, RecordDoc, RecordShare } from '../models/records.models';

/**
 * Phase 4 (Records vault & sharing) — client-side only. See records.models.ts for why
 * this never persists actual file content, only metadata. Not synced to any backend.
 */
@Injectable({ providedIn: 'root' })
export class RecordsService {
  private api = inject(ApiService);

  getRecords(): RecordDoc[] {
    return this.readJson<RecordDoc[]>(this.recordsKey(), []);
  }

  getRecord(id: string): RecordDoc | undefined {
    return this.getRecords().find(r => r.id === id);
  }

  /** Captures only metadata from the File object — never reads its content. */
  addRecord(file: File, category: RecordCategory): RecordDoc {
    const record: RecordDoc = {
      id: 'rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: file.name,
      category,
      mimeType: file.type || 'unknown',
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString()
    };
    const records = this.getRecords();
    records.push(record);
    this.writeJson(this.recordsKey(), records);
    this.logAccess(record.id, record.name, 'UPLOAD');
    return record;
  }

  updateMetadata(id: string, name: string, category: RecordCategory) {
    const records = this.getRecords();
    const record = records.find(r => r.id === id);
    if (!record) return;
    record.name = name;
    record.category = category;
    this.writeJson(this.recordsKey(), records);
  }

  deleteRecord(id: string) {
    const record = this.getRecord(id);
    if (!record) return;
    const records = this.getRecords().filter(r => r.id !== id);
    this.writeJson(this.recordsKey(), records);
    const shares = this.getShares().filter(s => s.recordId !== id);
    this.writeJson(this.sharesKey(), shares);
    this.logAccess(id, record.name, 'DELETE');
  }

  recordViewed(id: string) {
    const record = this.getRecord(id);
    if (record) this.logAccess(id, record.name, 'VIEW');
  }

  recordDownloaded(id: string) {
    const record = this.getRecord(id);
    if (record) this.logAccess(id, record.name, 'DOWNLOAD');
  }

  getShares(): RecordShare[] {
    return this.readJson<RecordShare[]>(this.sharesKey(), []);
  }

  getSharesForRecord(recordId: string): RecordShare[] {
    return this.getShares().filter(s => s.recordId === recordId);
  }

  shareRecord(recordId: string, sharedWithLabel: string, expiryDays: number): RecordShare {
    const record = this.getRecord(recordId);
    if (!record) throw new Error('Record not found.');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const share: RecordShare = {
      id: 'shr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      recordId,
      sharedWithLabel,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null
    };
    const shares = this.getShares();
    shares.push(share);
    this.writeJson(this.sharesKey(), shares);
    this.logAccess(recordId, record.name, 'SHARE', `with ${sharedWithLabel} for ${expiryDays} day(s)`);
    return share;
  }

  revokeShare(shareId: string) {
    const shares = this.getShares();
    const share = shares.find(s => s.id === shareId);
    if (!share) return;
    share.revokedAt = new Date().toISOString();
    this.writeJson(this.sharesKey(), shares);
  }

  isShareActive(share: RecordShare): boolean {
    return !share.revokedAt && new Date(share.expiresAt).getTime() > Date.now();
  }

  getAccessLog(): AccessLogEntry[] {
    return this.readJson<AccessLogEntry[]>(this.logKey(), [])
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  private logAccess(recordId: string, recordName: string, action: AccessAction, detail?: string) {
    const entry: AccessLogEntry = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      recordId,
      recordName,
      action,
      at: new Date().toISOString(),
      detail
    };
    const log = this.readJson<AccessLogEntry[]>(this.logKey(), []);
    log.push(entry);
    this.writeJson(this.logKey(), log);
  }

  private recordsKey(): string {
    return `nb_records_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private sharesKey(): string {
    return `nb_record_shares_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private logKey(): string {
    return `nb_record_access_log_${this.api.currentUser()?.id ?? 'guest'}`;
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
