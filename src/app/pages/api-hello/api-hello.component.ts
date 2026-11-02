import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

/** Connection check: calls one API's hello endpoint and shows who answered. The route supplies the inputs. */
@Component({
  selector: 'app-api-hello',
  standalone: true,
  template: `
    <div class="hello-page">
      <div class="card">
        <span class="kicker">Connection check</span>
        <h1>{{ apiName() }}</h1>
        @if (!url()) {
          <p class="status bad">This API isn't set up in this environment.</p>
        } @else if (message()) {
          <p class="message">{{ message() }}</p>
          <p class="status ok">Reply received: {{ statusCode() }}</p>
        } @else if (errorMsg()) {
          <p class="status bad">{{ errorMsg() }}</p>
        } @else {
          <p class="status">Calling the API…</p>
        }
        @if (url()) { <p class="meta">Request sent to <code>{{ url() }}</code></p> }
        @if (service()) { <p class="meta">Answered by <code>{{ service() }}</code></p> }
      </div>
    </div>
  `,
  styles: [`
    .hello-page { min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
    .card { width: 100%; max-width: 560px; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 20px; padding: 2rem; text-align: center; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-700); }
    h1 { font-size: 1.6rem; color: var(--sage-900); margin: 0.5rem 0 1rem; }
    .message { font-size: 2rem; font-weight: 700; color: var(--sage-700); margin-bottom: 0.5rem; }
    .status { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; }
    .status.ok { color: var(--sage-700); font-weight: 700; }
    .status.bad { color: var(--danger-text); font-weight: 700; }
    .meta { font-size: 0.82rem; color: var(--text-muted); margin: 0.25rem 0; overflow-wrap: anywhere; }
    code { color: var(--text-primary); }
  `]
})
export class ApiHelloComponent implements OnInit {
  private http = inject(HttpClient);

  apiName = input.required<string>();
  url = input.required<string>();

  message = signal<string | null>(null);
  service = signal<string | null>(null);
  statusCode = signal<number | null>(null);
  errorMsg = signal<string | null>(null);

  ngOnInit() {
    if (!this.url()) return;
    this.http.get<{ message: string; service: string }>(this.url(), { observe: 'response' }).subscribe({
      next: res => {
        this.message.set(res.body?.message ?? null);
        this.service.set(res.body?.service ?? null);
        this.statusCode.set(res.status);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.status ? `The API answered with an error: ${err.status}` : 'The API did not answer. Is it running?');
      }
    });
  }
}
