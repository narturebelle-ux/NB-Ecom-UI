/**
 * Phase 4 (Records vault & sharing) — real contract, NB-Ecomm-API UI_INTEGRATION_GUIDE.md §10.
 * Files go to private storage (Supabase today, AWS S3 in Mumbai per D48) via short-lived signed links only;
 * no permanent or public file URLs exist, and the UI never knows the bucket or any storage key.
 */

export type RecordCategory = 'SCAN' | 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'OTHER';

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  SCAN: 'Ultrasound / Scan',
  LAB_REPORT: 'Lab Report',
  PRESCRIPTION: 'Prescription',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  OTHER: 'Other'
};

export interface HealthRecord {
  id: number;
  userId: number;
  category: RecordCategory;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  /**
   * NOT_SCANNED for files without a scanner (Supabase). With S3 (Care API §10a): PENDING until the malware
   * scan finishes, then CLEAN, INFECTED or SCAN_FAILED (the last two are blocked).
   */
  scanStatus: string;
  createdAt: string;
  updatedAt: string;
  /** F9-S19 fields, optional until the Care API's S3 storage ships. */
  kind?: 'DOCUMENT' | 'VIDEO';
  /** False while the file can't be opened yet, e.g. until the malware scan clears it. */
  available?: boolean;
  /** Videos only: when the video moves to trash (D49: kept 30 days). */
  removalAt?: string | null;
  /** Videos only: show the removal warning from here (day 23). */
  warnFrom?: string | null;
  /** Set once the video is in trash (it stays in the list, `available: false`). */
  trashedAt?: string | null;
  /** Set while in trash: support can restore it until then; after that it leaves the list. */
  permanentDeletionAt?: string | null;
}

/**
 * POST /records/upload-url. Today (Supabase) it has `uploadUrl` + `token` and no `mode`.
 * With S3: `mode` SINGLE (one signed PUT) or MULTIPART (large videos, uploaded in parts).
 */
export interface RecordUploadUrl {
  mode?: 'SINGLE' | 'MULTIPART';
  objectPath: string;
  uploadUrl?: string;
  /** Supabase only. */
  token?: string;
  /** Extra headers the signed PUT must carry, if the API signed any. */
  headers?: Record<string, string>;
  uploadId?: string;
  partSizeBytes?: number;
  partCount?: number;
  expiresAt: string;
}

export interface RecordPartUrl {
  partNumber: number;
  url: string;
  expiresAt?: string;
}

export type DownloadDisposition = 'inline' | 'attachment';

export interface RecordDownloadUrl {
  downloadUrl: string;
  expiresAt: string;
}

export type ShareTargetType = 'PROVIDER' | 'BOOKING';

export interface RecordShare {
  id: number;
  recordId: number;
  shareTargetType: ShareTargetType;
  targetProviderId?: number | null;
  targetBookingId?: number | null;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export type AccessAction = 'UPLOAD' | 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'REVOKE_SHARE' | 'DELETE';

export interface AccessLogEntry {
  id: number;
  recordId: number;
  recordName: string;
  action: AccessAction;
  actorRelationship: string;
  occurredAt: string;
}

/** Formats a Date as a zone-less local "yyyy-MM-ddTHH:mm:ss" — the API's LocalDateTime shape. */
export function toLocalDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
