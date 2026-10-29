/**
 * Phase 4 (Records vault & sharing) — implemented client-side, same reasoning as Phases 2/3.
 *
 * IMPORTANT SAFETY NOTE: this mock deliberately never reads or stores actual file content —
 * only metadata (name, category, size, type, timestamp) captured from the browser's File
 * object. The real Phase 4 API spec calls for encrypted object storage with short-lived
 * signed URLs; faking that client-side (e.g. stuffing file bytes into localStorage,
 * unencrypted, on a device) would be actively misleading about how a health-document
 * feature handles sensitive data. Every page built against this shows an explicit
 * "not secure storage yet" notice — do not remove it when the real API lands either,
 * until that real storage is actually wired up.
 */

export type RecordCategory = 'SCAN' | 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'OTHER';

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  SCAN: 'Ultrasound / Scan',
  LAB_REPORT: 'Lab Report',
  PRESCRIPTION: 'Prescription',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  OTHER: 'Other'
};

export interface RecordDoc {
  id: string;
  name: string;
  category: RecordCategory;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface RecordShare {
  id: string;
  recordId: string;
  sharedWithLabel: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export type AccessAction = 'UPLOAD' | 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'DELETE';

export interface AccessLogEntry {
  id: string;
  recordId: string;
  recordName: string;
  action: AccessAction;
  at: string;
  detail?: string;
}
