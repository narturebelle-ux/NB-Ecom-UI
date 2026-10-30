/**
 * Phase 4 (Records vault & sharing) — real contract, NB-Ecomm-API UI_INTEGRATION_GUIDE.md §10.
 * Files go to Supabase Storage via short-lived signed URLs; no permanent public URLs exist.
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
  /** Always NOT_SCANNED today — the API has no real malware scanning yet. */
  scanStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordUploadUrl {
  objectPath: string;
  uploadUrl: string;
  token: string;
  expiresAt: string;
}

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
