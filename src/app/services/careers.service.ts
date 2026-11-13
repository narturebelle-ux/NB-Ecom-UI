import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UploadRules } from '../models/storage.models';
import { FileUpload, StorageTransport, fetchUploadRules, useOldDownload } from './file-upload';

/**
 * Careers + ideas/feedback — API 2366d6c (UI_INTEGRATION_GUIDE.md §14). Applications and feedback are stored by
 * the API and emailed to hello@narturebelle.com (log-only until the API's email provider is configured).
 */

/** Same rules as the API: 7-20 of + digits spaces ( ) - */
export const PHONE_PATTERN = /^[+0-9 ()\-]{7,20}$/;
export const URL_PATTERN = /^https?:\/\/\S+$/i;

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type WorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship'
};
export const WORK_MODE_LABELS: Record<WorkMode, string> = { ONSITE: 'On-site', REMOTE: 'Remote', HYBRID: 'Hybrid' };

export interface Job {
  id: number;
  title: string;
  team: string | null;
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  summary: string;
  description: string;
  requirements: string[];
  postedAt: string;
  status: 'OPEN' | 'CLOSED';
  closedAt: string | null;
  /** Admin list only. */
  applicationCount?: number;
}

export type JobInput = Pick<Job, 'title' | 'team' | 'location' | 'employmentType' | 'workMode' | 'summary' | 'description' | 'requirements'>;

export interface JobApplication {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  yearsExperience: number | null;
  coverNote: string | null;
  resumeFileName: string;
  resumeSizeBytes: number;
  jobId: number;
  /** false while email is log-only (provider not configured) or the send failed. */
  adminNotified: boolean;
  submittedAt: string;
}

export interface ApplicationForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  yearsExperience: number | null;
  coverNote: string;
  privacyConsent: boolean;
  /** Honeypot: hidden from people, bots fill it in. */
  website: string;
}

/** 4 MB: the API is hosted on Vercel, which rejects request bodies over 4.5 MB. */
/**
 * Résumés before the API moves them to S3 (§37): PDF or Word, 4 MB, sent through the API. Pages compare by
 * reference (`rules === RESUME_FORM_RULES`) to pick the old upload.
 */
export const RESUME_FORM_RULES: UploadRules = {
  kinds: [{
    kind: 'DOCUMENT',
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['pdf', 'doc', 'docx'],
    maxBytes: 4 * 1024 * 1024
  }],
  quotaBytes: null,
  usedBytes: null
};

export interface ApplicationReceipt { id: number; submittedAt: string; }

/** The form's fields as the API takes them, trimmed, with empty optional ones left out. */
function applicationFields(form: ApplicationForm): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {
    fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim()
  };
  if (form.location.trim()) fields['location'] = form.location.trim();
  if (form.linkedinUrl.trim()) fields['linkedinUrl'] = form.linkedinUrl.trim();
  if (form.portfolioUrl.trim()) fields['portfolioUrl'] = form.portfolioUrl.trim();
  if (form.yearsExperience !== null && form.yearsExperience !== undefined) fields['yearsExperience'] = form.yearsExperience;
  if (form.coverNote.trim()) fields['coverNote'] = form.coverNote.trim();
  fields['privacyConsent'] = form.privacyConsent;
  fields['website'] = form.website;
  return fields;
}

@Injectable({ providedIn: 'root' })
export class CareersService {
  private http = inject(HttpClient);
  private transport = inject(StorageTransport);
  private readonly baseUrl = environment.apiUrl;
  /** Base wait between upload retries; tests set it to 0. */
  retryBaseMs = 1000;

  // ---------- public ----------

  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/careers/jobs`);
  }

  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/careers/jobs/${id}`);
  }

  /** What a résumé may be. RESUME_FORM_RULES means the old 4 MB form upload through the API (§37). */
  resumeRules(jobId: number): Observable<UploadRules> {
    return fetchUploadRules(this.http, `${this.baseUrl}/careers/jobs/${jobId}/files/upload-rules`, RESUME_FORM_RULES);
  }

  /**
   * Sends the résumé straight to S3, then the application with a pointer to it (§37). Saving the stored
   * file *is* the application, so Retry after a failed send doesn't upload the résumé again.
   */
  startApplication(jobId: number, form: ApplicationForm, resume: File): FileUpload<ApplicationReceipt> {
    return new FileUpload<ApplicationReceipt>(resume, {
      base: `${this.baseUrl}/careers/jobs/${jobId}/files`,
      context: {},
      save: stored => this.http.post<ApplicationReceipt>(`${this.baseUrl}/careers/jobs/${jobId}/applications`,
        { ...applicationFields(form), resume: stored })
    }, this.http, this.transport, this.retryBaseMs);
  }

  /** Before the API moves résumés to S3: the whole application as one form POST, résumé included. */
  apply(jobId: number, form: ApplicationForm, resume: File): Observable<ApplicationReceipt> {
    const data = new FormData();
    Object.entries(applicationFields(form)).forEach(([key, value]) => data.append(key, String(value)));
    data.append('resume', resume, resume.name);
    return this.http.post<ApplicationReceipt>(`${this.baseUrl}/careers/jobs/${jobId}/applications`, data);
  }

  sendFeedback(body: { name?: string; email?: string; message: string; rating?: number | null; page?: string; website: string }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/feedback`, body);
  }

  // ---------- admin ----------

  adminJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/admin/careers/jobs`);
  }

  createJob(job: JobInput): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/admin/careers/jobs`, job);
  }

  updateJob(id: number, job: JobInput): Observable<Job> {
    return this.http.put<Job>(`${this.baseUrl}/admin/careers/jobs/${id}`, job);
  }

  closeJob(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/admin/careers/jobs/${id}/close`, {});
  }

  reopenJob(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/admin/careers/jobs/${id}/reopen`, {});
  }

  applications(jobId: number): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.baseUrl}/admin/careers/jobs/${jobId}/applications`);
  }

  /**
   * A staff download, audited by the API. Résumés on S3 come back as a short-lived signed link (§37); while
   * the API doesn't have the link call yet, or the résumé is an older one in Postgres, it comes through the API as before.
   */
  downloadResume(applicationId: number, fallbackName: string): Observable<{ url: string } | { blob: Blob; filename: string }> {
    return this.http.post<{ downloadUrl: string }>(`${this.baseUrl}/admin/careers/applications/${applicationId}/resume/download-url`,
      { disposition: 'attachment' }).pipe(
      map(res => ({ url: res.downloadUrl }) as { url: string }),
      catchError(err => useOldDownload(err) ? this.resumeBlob(applicationId, fallbackName) : throwError(() => err))
    );
  }

  private resumeBlob(applicationId: number, fallbackName: string): Observable<{ blob: Blob; filename: string }> {
    return this.http.get(`${this.baseUrl}/admin/careers/applications/${applicationId}/resume`, { responseType: 'blob', observe: 'response' }).pipe(
      map(res => {
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        return { blob: res.body as Blob, filename: match ? decodeURIComponent(match[1]) : fallbackName };
      })
    );
  }
}
