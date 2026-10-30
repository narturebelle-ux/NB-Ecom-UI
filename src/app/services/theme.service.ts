import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'nb_theme';

/**
 * Light / dark mode. Follows the device setting until the user picks one with the navbar toggle; the choice is then
 * remembered on this device. The inline script in index.html applies the same logic before first paint, so there's no flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    this.apply(this.theme());
    // Keep following the device setting until she makes her own choice.
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', e => {
      if (!this.saved()) this.set(e.matches ? 'dark' : 'light', false);
    });
  }

  toggle() {
    this.set(this.theme() === 'dark' ? 'light' : 'dark', true);
  }

  private set(theme: Theme, remember: boolean) {
    this.theme.set(theme);
    this.apply(theme);
    if (remember) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage blocked: applies for this visit only */ }
    }
  }

  private apply(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private initial(): Theme {
    return this.saved() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  private saved(): Theme | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch {
      return null;
    }
  }
}
