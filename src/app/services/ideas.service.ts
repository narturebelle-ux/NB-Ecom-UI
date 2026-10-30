import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Idea pool & Idea Impact (API UI_INTEGRATION_GUIDE.md §15, branch feature/idea-impact).
 * Members post ideas and vote; only votes from members with a PAID order count toward the goal.
 * Public reads accept an optional token (the auth interceptor adds it when signed in) for votedByMe / mine.
 */

export type IdeaStatus = 'OPEN' | 'UNDER_REVIEW' | 'IMPLEMENTED' | 'DECLINED';
export type IdeaSort = 'top' | 'new';

export interface IdeaCategory {
  code: string;
  label: string;
  description: string;
}

export interface IdeasMeta {
  /** false once the pool closes (ideaPool flag): browsing stays up, posting and voting stop. */
  open: boolean;
  voteGoal: number;
  categories: IdeaCategory[];
}

export interface Idea {
  id: number;
  /** e.g. "IDEA-0042" */
  number: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  /** First name + last initial ("Asha R."), or "A NartureBelle mom" on Impact without feature consent. */
  authorName: string;
  status: IdeaStatus;
  votes: number;
  paidVotes: number;
  voteGoal: number;
  goalReached: boolean;
  impactNote: string | null;
  implementedAt: string | null;
  createdAt: string;
  votedByMe?: boolean;
  mine?: boolean;
  featureConsent?: boolean;
}

export interface NewIdea {
  category: string;
  title: string;
  description: string;
  featureConsent: boolean;
}

export const IDEA_TITLE_MAX = 120;
export const IDEA_DESCRIPTION_MAX = 1500;

@Injectable({ providedIn: 'root' })
export class IdeasService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  meta(): Observable<IdeasMeta> {
    return this.http.get<IdeasMeta>(`${this.baseUrl}/ideas/meta`);
  }

  list(category: string | null, sort: IdeaSort): Observable<Idea[]> {
    let params = new HttpParams().set('sort', sort);
    if (category) params = params.set('category', category);
    return this.http.get<Idea[]>(`${this.baseUrl}/ideas`, { params });
  }

  get(id: number): Observable<Idea> {
    return this.http.get<Idea>(`${this.baseUrl}/ideas/${id}`);
  }

  impact(): Observable<Idea[]> {
    return this.http.get<Idea[]>(`${this.baseUrl}/ideas/impact`);
  }

  mine(): Observable<Idea[]> {
    return this.http.get<Idea[]>(`${this.baseUrl}/me/ideas`);
  }

  post(idea: NewIdea): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/me/ideas`, idea);
  }

  vote(id: number): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/ideas/${id}/vote`, {});
  }

  unvote(id: number): Observable<Idea> {
    return this.http.delete<Idea>(`${this.baseUrl}/ideas/${id}/vote`);
  }

  // ---------- admin ----------

  adminList(status: IdeaStatus | null): Observable<Idea[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Idea[]>(`${this.baseUrl}/admin/ideas`, { params });
  }

  setStatus(id: number, status: IdeaStatus, impactNote?: string): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/admin/ideas/${id}/status`, { status, impactNote: impactNote || null });
  }

  /** The public page people land on from a share. */
  shareUrl(idea: Idea): string {
    return `${window.location.origin}/ideas/${idea.id}`;
  }

  whatsappUrl(idea: Idea): string {
    const text = `I shared an idea to make NartureBelle™ better for moms: “${idea.title}”. Please vote for it here: ${this.shareUrl(idea)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
}

/** Human error for a vote/post failure, or null when the interceptor already handled it. */
export function ideaErrorMessage(err: any): string | null {
  const code = err?.error?.code;
  if (code === 'IDEA_SELF_VOTE') return 'That’s your idea. Share it so others can vote for it!';
  if (code === 'IDEA_NOT_OPEN') return 'Voting has closed for this idea. It’s being reviewed by our team.';
  if (code === 'IDEA_POOL_CLOSED') return 'The idea pool has closed. Thank you for taking part!';
  if (err?.status === 429) return 'You’ve shared 5 ideas today. Please come back tomorrow for more.';
  if (err?.status === 401 || err?.status === 403) return null;
  return err?.error?.message || 'Something went wrong. Please try again.';
}
