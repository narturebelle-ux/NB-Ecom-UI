import { HealthRecord } from './records.models';

/**
 * File storage rules for the records vault (F9-S19, D48/D49).
 *
 * The Care API is the source of truth: GET /records/upload-rules returns the size, type and quota limits,
 * and the UI checks a file against them before uploading, so a mother doesn't wait on an upload the API
 * will refuse. The UI never knows the bucket, its region or any key: it only ever gets short-lived signed
 * links from the API.
 */

export type FileKind = 'DOCUMENT' | 'VIDEO';

export interface UploadKindRule {
  kind: FileKind;
  mimeTypes: string[];
  /** Lower-case, without the dot. */
  extensions: string[];
  maxBytes: number;
}

export interface UploadRules {
  kinds: UploadKindRule[];
  /** Total storage allowed per mother (D49: about 10 GB), or null if the API doesn't say. */
  quotaBytes: number | null;
  usedBytes: number | null;
}

/**
 * Used when the API doesn't have GET /records/upload-rules yet: the limits it enforces today
 * (25 MB, PDF/JPEG/PNG/HEIC) and no videos, because today's API refuses them.
 */
export const FALLBACK_UPLOAD_RULES: UploadRules = {
  kinds: [{
    kind: 'DOCUMENT',
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'],
    extensions: ['pdf', 'jpg', 'jpeg', 'png', 'heic'],
    maxBytes: 25 * 1024 * 1024
  }],
  quotaBytes: null,
  usedBytes: null
};

/** For files whose type the browser leaves empty (HEIC on Windows, some phone videos). */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp'
};

function extensionOf(name: string): string {
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
}

/** The file's type, or one worked out from its extension when the browser leaves it empty. */
export function fileMimeType(file: File): string {
  if (file.type) return file.type;
  return MIME_BY_EXTENSION[extensionOf(file.name)] ?? 'application/octet-stream';
}

/** The rule this file falls under, by type first and then by extension. */
export function ruleForFile(file: File, rules: UploadRules): UploadKindRule | null {
  const mime = fileMimeType(file);
  const ext = extensionOf(file.name);
  return rules.kinds.find(k => k.mimeTypes.includes(mime))
    ?? (file.type ? null : rules.kinds.find(k => k.extensions.includes(ext)) ?? null);
}

/** For the file picker's `accept`: extensions too, because some browsers don't know HEIC's or MOV's type. */
export function acceptAttribute(rules: UploadRules): string {
  return rules.kinds.flatMap(k => [...k.extensions.map(e => '.' + e), ...k.mimeTypes]).join(',');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${+(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function typeList(rule: UploadKindRule): string {
  const names = [...new Set(rule.extensions.map(e => (e === 'jpg' ? 'jpeg' : e).toUpperCase()))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0] ?? '';
}

/** "PDF, JPEG, PNG or HEIC up to 25 MB; videos (MP4 or MOV) up to 2 GB" for the file picker. */
export function rulesHint(rules: UploadRules): string {
  return rules.kinds.map(k => k.kind === 'VIDEO'
    ? `videos (${typeList(k)}) up to ${formatBytes(k.maxBytes)}`
    : `${typeList(k)} up to ${formatBytes(k.maxBytes)}`).join('; ');
}

/** A message for the mother if the API would refuse the file, otherwise null. */
export function uploadProblem(file: File, rules: UploadRules): string | null {
  const rule = ruleForFile(file, rules);
  if (!rule) {
    const doc = rules.kinds.find(k => k.kind === 'DOCUMENT');
    const video = rules.kinds.find(k => k.kind === 'VIDEO');
    return `Please choose ${doc ? `a ${typeList(doc)} file` : 'a supported file'}${video ? `, or a ${typeList(video)} video` : ''}.`;
  }
  if (file.size === 0) return 'That file is empty. Please choose another one.';
  if (file.size > rule.maxBytes) {
    return `That ${rule.kind === 'VIDEO' ? 'video' : 'file'} is larger than ${formatBytes(rule.maxBytes)}. Please choose a smaller one.`;
  }
  if (rules.quotaBytes != null && rules.usedBytes != null && rules.usedBytes + file.size > rules.quotaBytes) {
    const left = Math.max(0, rules.quotaBytes - rules.usedBytes);
    return `This would go over your ${formatBytes(rules.quotaBytes)} of storage (${formatBytes(left)} left). ` +
      'Delete files you no longer need, or download old videos and delete them, then try again.';
  }
  return null;
}

// ── Records as stored files ─────────────────────────────────────────────────

export function recordKind(r: HealthRecord): FileKind {
  return r.kind ?? (r.mimeType?.startsWith('video/') ? 'VIDEO' : 'DOCUMENT');
}

export type FileReadiness = 'READY' | 'CHECKING' | 'BLOCKED' | 'REMOVED';

/**
 * Whether the file can be opened (Care API §10a). New uploads stay unavailable until the malware scan clears
 * them (F9-S6). A video in trash is also `available: false`, but it's removed, not being checked. Older files
 * without a scanner say NOT_SCANNED and stay openable, as before.
 */
export function fileReadiness(r: HealthRecord): FileReadiness {
  if (r.trashedAt) return 'REMOVED';
  if (r.scanStatus === 'INFECTED' || r.scanStatus === 'SCAN_FAILED') return 'BLOCKED';
  if (r.available === false || r.scanStatus === 'PENDING') return 'CHECKING';
  return 'READY';
}

/** What to tell the mother when the API refuses a play or download link (Care API §10a.8, all 409). */
export function openRefusalMessage(code: string | null | undefined): string {
  switch (code) {
    case 'FILE_NOT_READY': return 'This file is still being checked for viruses. Please try again in a few minutes.';
    case 'FILE_BLOCKED': return 'This file didn’t pass our virus check, so it can’t be opened.';
    case 'FILE_IN_TRASH': return 'This video has been removed. Contact support if you need it back.';
    case 'FILE_DELETED': return 'This file has been deleted.';
    default: return 'This file can’t be opened right now. Please try again later.';
  }
}

// ── Video retention (D49) ───────────────────────────────────────────────────

/** Videos are kept 30 days (D49); the warning shows for the last 7, i.e. from day 23. */
export const VIDEO_KEEP_DAYS = 30;
export const VIDEO_WARNING_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * When the video will be removed, as the API reports it. The UI doesn't work it out from the upload date,
 * because what the 30 days count from is still an open owner decision (D49).
 */
export function videoRemovalDate(r: HealthRecord): Date | null {
  if (recordKind(r) !== 'VIDEO' || !r.removalAt || r.trashedAt) return null;
  const d = new Date(r.removalAt);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * True from the API's `warnFrom` (day 23 of 30) until the video is removed. Only if an older response has
 * no `warnFrom` does the UI fall back to 7 days before `removalAt`.
 */
export function videoNeedsWarning(r: HealthRecord, now: Date = new Date()): boolean {
  const removal = videoRemovalDate(r);
  if (!removal) return false;
  const given = r.warnFrom ? new Date(r.warnFrom).getTime() : NaN;
  const from = isNaN(given) ? removal.getTime() - VIDEO_WARNING_DAYS * DAY_MS : given;
  return now.getTime() >= from && now.getTime() < removal.getTime();
}

/** Whole days until removal, rounded up, so "removed tomorrow" reads as 1. */
export function daysUntilRemoval(r: HealthRecord, now: Date = new Date()): number | null {
  const removal = videoRemovalDate(r);
  return removal ? Math.max(0, Math.ceil((removal.getTime() - now.getTime()) / DAY_MS)) : null;
}

/** Until when support can restore a video from trash: the API's `permanentDeletionAt` (D49: 7 days). */
export const TRASH_KEEP_DAYS = 7;
export function restorableUntil(r: HealthRecord): Date | null {
  if (!r.trashedAt) return null;
  const given = r.permanentDeletionAt ? new Date(r.permanentDeletionAt) : null;
  if (given && !isNaN(given.getTime())) return given;
  const d = new Date(r.trashedAt);
  return isNaN(d.getTime()) ? null : new Date(d.getTime() + TRASH_KEEP_DAYS * DAY_MS);
}

/** A video can't be shared past its removal date (API: 400 VALIDATION_FAILED, fields.expiresAt). */
export function latestShareEnd(r: HealthRecord, wanted: Date): Date {
  const removal = videoRemovalDate(r);
  return removal && wanted.getTime() > removal.getTime() ? removal : wanted;
}
