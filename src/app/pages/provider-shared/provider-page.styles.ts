/**
 * Shared look for the professional screens: the same values as the mother's onboarding and My Journey
 * pages (fonts and colours come from the global theme), so light and dark mode follow automatically.
 */
export const PROVIDER_PAGE_STYLES = `
  .provider-page { padding: 3rem 0 5rem; min-height: calc(100vh - 160px); }
  .narrow { max-width: 780px; }
  .wide { max-width: 1160px; }
  .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
  .page-header { text-align: center; margin-bottom: 2rem; }
  .page-header h1 { font-size: clamp(1.8rem, 3.5vw, 2.4rem); margin: 0.5rem 0; }
  .page-header p { color: var(--text-secondary); max-width: 560px; margin: 0 auto; }

  .stepper { list-style: none; display: flex; justify-content: space-between; margin: 0 auto 2rem; max-width: 720px; position: relative; padding: 0; }
  .stepper::before { content: ''; position: absolute; top: 17px; left: 6%; right: 6%; height: 2px; background: var(--border-light); }
  .step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; flex: 1; }
  .step-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 2px solid var(--border-light); font-weight: 700; font-size: 0.85rem; color: var(--text-muted); transition: all var(--transition-smooth); z-index: 1; }
  .step-dot mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
  .step.current .step-dot { border-color: var(--sage-700); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }
  .step.done .step-dot { background: var(--solid-sage-700); border-color: var(--sage-700); color: #fff; }
  .step-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-align: center; }
  .step.current .step-label { color: var(--sage-900); }

  .ob-card { border-radius: var(--radius-xl); padding: 2.25rem; }
  .ob-card h2 { font-size: 1.5rem; margin-bottom: 0.35rem; }
  .sub { color: var(--text-secondary); margin-bottom: 1.75rem; font-size: 0.95rem; }

  fieldset { border: none; margin-bottom: 1.4rem; padding: 0; }
  legend, .field label { display: block; font-size: 0.85rem; font-weight: 700; color: var(--sage-900); margin-bottom: 0.55rem; }
  .req { color: var(--blush-700); }
  .opt { font-weight: 500; color: var(--text-muted); font-size: 0.78rem; }
  .field { margin-bottom: 1.25rem; }
  .hint { display: block; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }
  .field-error { display: block; font-size: 0.8rem; color: var(--danger-text); margin-top: 0.25rem; }
  .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

  .choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .choice-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .choice { padding: 0.7rem 1rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-weight: 600; font-size: 0.88rem; color: var(--text-secondary); transition: all var(--transition-fast); cursor: pointer; }
  .choice:hover { border-color: var(--sage-500); }
  .choice.selected { border-color: var(--sage-700); background: var(--sage-50); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }
  .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .check { display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-size: 0.86rem; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
  .check.on { border-color: var(--sage-600); background: var(--sage-50); color: var(--sage-900); }
  .check input, .agree input { accent-color: var(--sage-700); }
  .agree { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.88rem; color: var(--text-secondary); cursor: pointer; margin-bottom: 0.75rem; }
  .agree input { margin-top: 0.2rem; }

  .error { display: flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); font-size: 0.86rem; margin-bottom: 1rem; }
  .why-box { background: var(--trust-50); border: 1px solid var(--trust-200); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 0.88rem; }
  .why-box strong { display: flex; align-items: center; gap: 0.35rem; color: var(--trust-900); margin-bottom: 0.5rem; }
  .proto { display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: var(--warn-text); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; margin-bottom: 1rem; }
  .doc-body { white-space: pre-line; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6; background: var(--bg-surface); border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; max-height: 320px; overflow-y: auto; }
  .sign-box { background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; }
  .signature { font-family: var(--font-serif); font-style: italic; font-size: 1.25rem; }

  .actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
  .actions.split { justify-content: space-between; }
  .actions.center { justify-content: center; }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .btn-link { font-size: 0.85rem; font-weight: 600; color: var(--sage-800); }

  .panel { border-radius: var(--radius-xl); padding: 1.5rem 1.6rem; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
  .panel h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.08rem; color: var(--sage-900); margin: 0; }
  .panel h3 mat-icon { color: var(--sage-600); font-size: 22px; width: 22px; height: 22px; }
  .muted { color: var(--text-muted); font-size: 0.85rem; }
  .row-item { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; margin-bottom: 0.5rem; border-radius: var(--radius-lg); background: var(--bg-surface); border: 1px solid var(--border-light); text-decoration: none; color: inherit; }
  a.row-item:hover { border-color: var(--sage-700); }
  .row-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .row-main strong { color: var(--sage-900); font-size: 0.92rem; }
  .row-main span { font-size: 0.8rem; color: var(--text-muted); }
  .badge-pill { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.3rem 0.75rem; border-radius: var(--radius-full); background: var(--sage-100); color: var(--sage-800); white-space: nowrap; }
  .badge-pill.warn { background: var(--warn-bg); color: var(--warn-text); }
  .badge-pill.blush { background: var(--blush-100); color: var(--blush-800); }
  .badge-pill.danger { background: var(--danger-bg); color: var(--danger-text); }

  @media (max-width: 640px) {
    .ob-card { padding: 1.5rem; }
    .row-2, .check-grid, .choice-grid { grid-template-columns: 1fr; }
    .step-label { display: none; }
    .row-item { flex-wrap: wrap; }
    .row-main { min-width: 9rem; }
  }
`;

/** Saves a file the browser received from the API. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
