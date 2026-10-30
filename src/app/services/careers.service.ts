import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Careers + ideas/feedback — API 2366d6c (UI_INTEGRATION_GUIDE.md §14). Applications and feedback are stored by
 * the API and emailed to admin@narturebelle.com (log-only until the API's email provider is configured).
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
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;
export const RESUME_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable({ providedIn: 'root' })
export class CareersService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ---------- public ----------

  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/careers/jobs`);
  }

  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/careers/jobs/${id}`);
  }

  apply(jobId: number, form: ApplicationForm, resume: File): Observable<{ id: number; submittedAt: string }> {
    const data = new FormData();
    data.append('fullName', form.fullName.trim());
    data.append('email', form.email.trim());
    data.append('phone', form.phone.trim());
    if (form.location.trim()) data.append('location', form.location.trim());
    if (form.linkedinUrl.trim()) data.append('linkedinUrl', form.linkedinUrl.trim());
    if (form.portfolioUrl.trim()) data.append('portfolioUrl', form.portfolioUrl.trim());
    if (form.yearsExperience !== null && form.yearsExperience !== undefined) data.append('yearsExperience', String(form.yearsExperience));
    if (form.coverNote.trim()) data.append('coverNote', form.coverNote.trim());
    data.append('privacyConsent', String(form.privacyConsent));
    data.append('website', form.website);
    data.append('resume', resume, resume.name);
    return this.http.post<{ id: number; submittedAt: string }>(`${this.baseUrl}/careers/jobs/${jobId}/applications`, data);
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

  /** The file itself (Content-Disposition: attachment); every download is audited by the API. */
  downloadResume(applicationId: number, fallbackName: string): Observable<{ blob: Blob; filename: string }> {
    return this.http.get(`${this.baseUrl}/admin/careers/applications/${applicationId}/resume`, { responseType: 'blob', observe: 'response' }).pipe(
      map(res => {
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        return { blob: res.body as Blob, filename: match ? decodeURIComponent(match[1]) : fallbackName };
      })
    );
  }
}
