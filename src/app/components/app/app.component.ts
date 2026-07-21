import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IconifyService } from '../../services/iconify.service';
import { IconCollection } from '../../models/icon.model';
import { IconBrowserComponent } from '../icon-browser/icon-browser.component';

/**
 * IconifyNavigator v1.0.4
 *
 * Main application component for browsing and managing Iconify icon collections.
 * Features:
 * - Icon collection browser with search and filtering
 * - Search by name, category, tags, and icon set name
 * - Icon detail panel with customizable parameters
 * - Dark/light theme support
 * - Lazy-loaded infinite scroll
 * - Docker containerization support
 * - Desktop app packaging via Electron
 */
type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, IconBrowserComponent],
  template: `
    <div class="container">
      <header>
        <div>
          <h1>Iconify Navigator</h1>
          <p>Search Iconify icons by name, category and tags</p>
        </div>
        <button type="button" class="theme-toggle" (click)="toggleTheme()">
          Theme: {{ theme === 'dark' ? 'Dark' : 'Light' }}
        </button>
      </header>

      <main>
        <p *ngIf="loading">Initializing...</p>
        <p *ngIf="error" class="error">{{ error }}</p>
        <app-icon-browser *ngIf="!loading && !error" [collections]="collections"></app-icon-browser>
      </main>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 20px;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }
      header p {
        margin: 4px 0 0;
      }
      .theme-toggle {
        border: 1px solid var(--border-strong);
        border-radius: 6px;
        background: var(--bg-surface);
        color: var(--text-primary);
        font-weight: 600;
        padding: 8px 12px;
      }
      .theme-toggle:hover {
        background: var(--bg-surface-muted);
      }
      .error {
        color: var(--error);
      }
    `
  ]
})
export class AppComponent implements OnInit {
  private readonly themeStorageKey = 'iconify-navigator.theme';

  /** True while initialize() is running; hides the browser and shows a spinner. */
  loading = true;

  /** Populated if initialization fails; displayed as an error banner to the user. */
  error: string | null = null;

  /** Full list of available icon collections fetched from the Iconify server. */
  collections: IconCollection[] = [];

  /** Active UI theme for the Angular app. */
  theme: ThemeMode = 'light';

  constructor(private iconifyService: IconifyService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  /** Applies theme preference from localStorage or system settings, then initializes the app. */
  ngOnInit(): void {
    this.applyInitialTheme();
    void this.initialize();
  }

  /** Switches between light and dark theme and persists the user's explicit preference. */
  toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark', true);
  }

  /**
   * Loads the Iconify server URL and the list of available collections.
   * On success the icon browser is revealed; on failure an error message is shown.
   * The finally block ensures the loading flag is cleared regardless of outcome
   * and that the OnPush component re-renders via markForCheck + ngZone.run.
   */
  private async initialize(): Promise<void> {
    try {
      await this.iconifyService.initialize();
      this.collections = await firstValueFrom(this.iconifyService.getCollections());
      this.error = null;
    } catch (error: any) {
      this.error = error?.message || 'Initialization failed';
    } finally {
      this.loading = false;
      // ngZone.run ensures the OnPush change detection cycle runs after this async operation.
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
    }
  }

  /**
   * Reads the theme preference from localStorage or detects system dark mode preference.
   * Falls back to 'light' if localStorage is unavailable or the stored value is invalid.
   */
  private applyInitialTheme(): void {
    const storedTheme = this.readStoredTheme();
    if (storedTheme) {
      this.setTheme(storedTheme, false);
      return;
    }

    this.setTheme(this.prefersDarkScheme() ? 'dark' : 'light', false);
  }

  /**
   * Sets the active theme, applies it to the DOM, and optionally persists it to localStorage.
   */
  private setTheme(theme: ThemeMode, persist: boolean): void {
    this.theme = theme;

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    if (persist) {
      this.writeStoredTheme(theme);
    }
  }

  /**
   * Reads the theme preference from localStorage, validating that the value is 'light' or 'dark'.
   * Returns null if localStorage is unavailable or the stored value is invalid.
   */
  private readStoredTheme(): ThemeMode | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const value = window.localStorage.getItem(this.themeStorageKey);
    if (value === 'light' || value === 'dark') {
      return value;
    }
    return null;
  }

  /**
   * Persists the theme preference to localStorage for automatic recall on next visit.
   * Silently ignores errors (e.g., quota exceeded, localStorage unavailable).
   */
  private writeStoredTheme(theme: ThemeMode): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(this.themeStorageKey, theme);
    } catch (error) {
      console.warn('Unable to persist theme preference:', error);
    }
  }

  /**
   * Checks if the user's system settings prefer dark mode.
   * Returns false if matchMedia is unavailable (e.g., in jsdom test environments).
   */
  private prefersDarkScheme(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
