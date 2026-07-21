import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconifyService } from '../../services/iconify.service';
import { Icon, IconCollection, IconSearchOptions } from '../../models/icon.model';
import { IconSearchComponent } from '../icon-search/icon-search.component';
import { CollectionCardComponent } from '../collection-card/collection-card.component';

interface IconTagDialogState {
  color: string;
  width: string;
  height: string;
  flip: '' | 'horizontal' | 'vertical';
  rotate: '' | '90' | '180' | '270';
}

/**
 * IconBrowserComponent is the main UI shell of the application.
 *
 * Layout — two fixed panels side by side:
 *   LEFT  — scrollable list of collection cards (search form + metadata + 8-icon preview per card)
 *   RIGHT — scrollable icon grid for the currently selected collection, or search results
 *
 * Open behaviour (per acceptance criteria 0.0.2):
 *   - Clicking "Open" on a collection that is NOT currently displayed → loads and shows its icons
 *   - Clicking "Open" on the collection that IS already displayed → does nothing
 */
@Component({
  selector: 'app-icon-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, IconSearchComponent, CollectionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="browser-layout">

      <!-- ══ LEFT PANEL: collection list ══════════════════════════════ -->
      <div class="left-panel">
        <app-icon-search (search)="onSearch($event)"></app-icon-search>

        <section>
          <h2>Available icon sets</h2>
          <p *ngIf="collections.length === 0">Loading sets...</p>

          <!-- Each card handles its own lazy icon loading via IntersectionObserver -->
          <div class="collections-list">
            <app-collection-card
              *ngFor="let collection of collections"
              [collection]="collection"
              (open)="onOpenCollection($event)"
            ></app-collection-card>
          </div>
        </section>
      </div>

      <!-- ══ RIGHT PANEL: icon detail / search results ════════════════ -->
      <div class="right-panel" (scroll)="onRightPanelScroll($event)">

        <!-- Empty state — shown before the user opens any collection or searches -->
        <p *ngIf="!openedCollection && !searched" class="right-empty-hint">
          Click <strong>Open</strong> on a collection to browse its icons,
          or use the search form to find specific icons.
        </p>

        <!-- Collection icon grid -->
        <section *ngIf="openedCollection">
          <h2>{{ openedCollection.name }} - Icons</h2>
          <p *ngIf="loadingIcons">Loading icons...</p>
          <div class="grid" *ngIf="visibleCollectionIcons.length > 0">
            <article class="card icon-clickable" *ngFor="let icon of visibleCollectionIcons" (click)="openIconDialog(icon)">
              <div class="icon-preview">
                <img [src]="getIconUrl(icon)" [alt]="icon.name" class="icon-img" loading="lazy" />
              </div>
              <h3 class="icon-name">{{ icon.name }}</h3>
              <p class="icon-tags"><strong>tags:</strong> {{ (icon.tags || []).join(', ') || 'n/a' }}</p>
            </article>
          </div>
          <p *ngIf="openedCollection && !loadingIcons && hasMoreCollectionIcons" class="collection-load-hint">
            Scroll to load more icons...
          </p>
        </section>

        <!-- Search results (shown when the user has searched but no collection is open) -->
        <section *ngIf="!openedCollection && searched">
          <h2>Search Results</h2>
          <p *ngIf="loading">Searching...</p>
          <p *ngIf="error" class="error">{{ error }}</p>
          <p *ngIf="!loading">Found {{ icons.length }} icon(s)</p>
          <div class="grid" *ngIf="icons.length > 0">
            <article class="card icon-clickable" *ngFor="let icon of icons" (click)="openIconDialog(icon)">
              <div class="icon-preview">
                <img [src]="getIconUrl(icon)" [alt]="icon.name" class="icon-img" loading="lazy" />
              </div>
              <h3 class="icon-name">{{ icon.name }}</h3>
              <p class="icon-tags"><strong>tags:</strong> {{ (icon.tags || []).join(', ') || 'n/a' }}</p>
              <p><strong>collection:</strong> {{ icon.collection }}</p>
            </article>
          </div>
        </section>

      </div>

      <div class="dialog-backdrop" *ngIf="selectedIcon">
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Icon tag builder">
          <div class="dialog-grid">
            <input
              [ngModel]="tagDialog.color"
              (ngModelChange)="onDialogFieldChange('color', $event)"
              id="icn.color"
              type="text"
              placeholder="color"
            />
            <input
              [ngModel]="tagDialog.width"
              (ngModelChange)="onDialogFieldChange('width', $event)"
              id="icn.width"
              type="text"
              placeholder="width"
            />
            <input
              [ngModel]="tagDialog.height"
              (ngModelChange)="onDialogFieldChange('height', $event)"
              id="icn.height"
              type="text"
              placeholder="height"
            />
            <select
              [ngModel]="tagDialog.flip"
              (ngModelChange)="onDialogFieldChange('flip', $event)"
              id="icn.flip"
            >
              <option value=""></option>
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
            <select
              [ngModel]="tagDialog.rotate"
              (ngModelChange)="onDialogFieldChange('rotate', $event)"
              id="icn.rotate"
            >
              <option value=""></option>
              <option value="1">90</option>
              <option value="2">180</option>
              <option value="3">270</option>
            </select>
          </div>

          <div class="dialog-preview-row">
            <textarea id="icn.tagstring" readonly [value]="tagString"></textarea>
            <div class="preview-square" aria-label="Icon preview">
              <img *ngIf="tagPreviewSrc" [src]="tagPreviewSrc" [alt]="selectedIcon?.name || 'icon preview'" class="preview-img" />
            </div>
          </div>

          <div class="dialog-actions">
            <button type="button" (click)="copyTagString()">copy</button>
            <button type="button" (click)="closeIconDialog()">close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Two fixed panels; right panel only scrolls (acceptance criterion 0.0.2) */
      .browser-layout {
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: 16px;
        height: calc(100vh - 140px);
      }
      .left-panel {
        overflow-y: auto;
        padding-right: 8px;
        border-right: 1px solid var(--border-default);
      }
      .right-panel {
        overflow-y: auto;
        padding-left: 8px;
      }
      .left-panel h2,
      .right-panel h2 {
        margin-bottom: 12px;
      }
      .collections-list {
        margin-top: 8px;
      }
      .right-empty-hint {
        color: var(--text-secondary);
        margin-top: 40px;
        text-align: center;
      }
      /* Icon grid in the right panel */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .card {
        border: 1px solid var(--border-default);
        border-radius: 6px;
        padding: 10px;
        background: var(--bg-surface);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .icon-clickable {
        cursor: pointer;
      }
      .icon-preview {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 56px;
        margin-bottom: 8px;
      }
      .icon-img {
        width: 48px;
        height: 48px;
        object-fit: contain;
      }
      .icon-name {
        font-size: 0.75rem;
        word-break: break-all;
        margin: 4px 0;
      }
      .icon-tags {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin: 2px 0;
      }
      .error {
        color: var(--error);
      }
      .collection-load-hint {
        color: var(--text-secondary);
        margin: 12px 0 0;
        text-align: center;
      }
      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: var(--overlay-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .dialog {
        width: min(760px, 96vw);
        background: var(--bg-surface);
        border-radius: 8px;
        border: 1px solid var(--border-default);
        padding: 16px;
        display: grid;
        gap: 12px;
      }
      .dialog-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr 1fr 1fr;
      }
      .dialog-grid input,
      .dialog-grid select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--border-strong);
        border-radius: 4px;
        background: var(--bg-input);
        color: var(--text-primary);
      }
      #icn\\.tagstring {
        width: 100%;
        height: 96px;
        resize: none;
        padding: 8px;
        border: 1px solid var(--border-strong);
        border-radius: 4px;
        background: var(--bg-input);
        color: var(--text-primary);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        box-sizing: border-box;
      }
      .dialog-preview-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 96px;
        gap: 10px;
        align-items: stretch;
      }
      .preview-square {
        width: 96px;
        height: 96px;
        border: 1px solid var(--border-strong);
        border-radius: 4px;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .preview-img {
        max-width: 100%;
        max-height: 100%;
        width: 48px;
        height: 48px;
        object-fit: contain;
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `
  ]
})
export class IconBrowserComponent {
  /** Number of collection icons rendered at a time before the next scroll-driven batch loads. */
  private readonly collectionIconBatchSize = 48;

  /** Collections passed in from the parent; rendered as cards in the left panel. */
  @Input() collections: IconCollection[] = [];

  /** The collection whose full icon set is currently shown in the right panel. */
  openedCollection: IconCollection | null = null;

  /** Icons for the currently opened collection; populated asynchronously after Open is clicked. */
  collectionIcons: Icon[] = [];

  /** Icons from the opened collection that are currently rendered in the grid. */
  visibleCollectionIcons: Icon[] = [];

  /** True while the icon list for the opened collection is being fetched. */
  loadingIcons = false;

  /** Icons returned by the most recent text search; shown in the right panel. */
  icons: Icon[] = [];

  /** True while a search is in flight. */
  loading = false;

  /** True once the user has submitted at least one search. */
  searched = false;

  /** Error message when the most recent search or open failed; null otherwise. */
  error: string | null = null;

  /** Selected icon for tag generation; null means dialog is closed. */
  selectedIcon: Icon | null = null;

  /** Current dialog field values used to build the image URL query string. */
  tagDialog: IconTagDialogState = this.createInitialDialogState();

  /** Read-only textarea content containing the generated <img /> tag. */
  tagString = '';
  /** URL used by both the generated tag and the live preview image. */
  tagPreviewSrc = '';

  /** True when there are still unrendered icons left for the opened collection. */
  get hasMoreCollectionIcons(): boolean {
    return this.visibleCollectionIcons.length < this.collectionIcons.length;
  }

  constructor(private iconifyService: IconifyService, private cdr: ChangeDetectorRef) {}

  /** Returns the Iconify SVG render URL for a given icon. */
  getIconUrl(icon: Icon): string {
    return this.iconifyService.getIconUrl(icon.collection, icon.name);
  }

  /**
   * Called when the user clicks "Open" on a collection card.
   *
   * - If the same collection is already displayed in the right panel, does nothing
   *   (acceptance criterion: "do nothing, leaving the currently displayed icons there").
   * - Otherwise, clears the right panel and fetches the new collection's full icon list.
   */
  onOpenCollection(collection: IconCollection): void {
    // Guard: do nothing when the requested collection is already displayed.
    if (this.openedCollection?.prefix === collection.prefix) {
      console.log('[IconBrowser] Collection already open, doing nothing:', collection.prefix);
      return;
    }

    console.log('[IconBrowser] Opening collection:', collection.prefix);
    this.openedCollection = collection;
    this.collectionIcons = [];
    this.visibleCollectionIcons = [];
    this.loadingIcons = true;
    // Clear any previous search results so only the collection view is shown.
    this.searched = false;
    this.icons = [];
    this.cdr.detectChanges();

    this.iconifyService.getCollectionIcons(collection.prefix).subscribe({
      next: (icons) => {
        console.log('[IconBrowser] Loaded icons:', icons.length, 'for', collection.prefix);
        this.collectionIcons = icons;
        this.visibleCollectionIcons = icons.slice(0, this.collectionIconBatchSize);
        this.loadingIcons = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[IconBrowser] Failed to load collection icons:', err);
        this.collectionIcons = [];
        this.visibleCollectionIcons = [];
        this.loadingIcons = false;
        this.error = err?.message || 'Failed to load icons';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Triggered by the search form submission.
   * Clears the opened collection view and populates the right panel with search results.
   */
  onSearch(options: IconSearchOptions): void {
    console.log('[IconBrowser] Searching with options:', options);
    // Dismiss any currently open collection so the search results are shown.
    this.openedCollection = null;
    this.collectionIcons = [];
    this.visibleCollectionIcons = [];
    this.loading = true;
    this.error = null;
    this.searched = true;
    this.cdr.markForCheck();

    this.iconifyService.searchIcons(options).subscribe({
      next: (result) => {
        console.log('[IconBrowser] Search completed, found', result.icons.length, 'icons');
        this.icons = result.icons;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[IconBrowser] Search error:', err);
        this.error = err?.message || 'Failed to search icons';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Appends the next batch of collection icons when the right panel approaches the bottom.
   * Called from the scroll container so the full collection is revealed incrementally.
   */
  onRightPanelScroll(_event?: Event): void {
    if (!this.openedCollection || this.loadingIcons || !this.hasMoreCollectionIcons) {
      return;
    }

    const nextIcons = this.collectionIcons.slice(
      this.visibleCollectionIcons.length,
      this.visibleCollectionIcons.length + this.collectionIconBatchSize
    );

    if (nextIcons.length === 0) {
      return;
    }

    this.visibleCollectionIcons = [...this.visibleCollectionIcons, ...nextIcons];
    this.cdr.detectChanges();
  }

  /** Opens the icon parameter dialog and initializes the generated <img /> tag. */
  openIconDialog(icon: Icon): void {
    this.selectedIcon = icon;
    this.tagDialog = this.createInitialDialogState();
    this.updateTagString();
    this.cdr.detectChanges();
  }

  /** Closes the dialog and clears all temporary state. */
  closeIconDialog(): void {
    this.selectedIcon = null;
    this.tagDialog = this.createInitialDialogState();
    this.tagString = '';
    this.tagPreviewSrc = '';
    this.cdr.detectChanges();
  }

  /** Updates one dialog field, then regenerates the output tag string. */
  onDialogFieldChange<K extends keyof IconTagDialogState>(field: K, value: IconTagDialogState[K]): void {
    this.tagDialog = {
      ...this.tagDialog,
      [field]: value
    };
    this.updateTagString();
  }

  /** Copies the generated tag string to the clipboard. */
  async copyTagString(): Promise<void> {
    if (!this.tagString) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(this.tagString);
      return;
    }

    const copyArea = document.createElement('textarea');
    copyArea.value = this.tagString;
    document.body.appendChild(copyArea);
    copyArea.select();
    document.execCommand('copy');
    document.body.removeChild(copyArea);
  }

  /**
   * Rebuilds the HTML tag string and preview URL based on the current dialog field values.
   * This is called whenever any dialog field changes so the tag preview is always up-to-date.
   */
  private updateTagString(): void {
    if (!this.selectedIcon) {
      this.tagString = '';
      return;
    }

    const queryParams: string[] = [];
    const maybeAppendParam = (name: string, value: string): void => {
      const normalized = value.trim();
      if (normalized.length > 0) {
        queryParams.push(`${name}=${encodeURIComponent(normalized)}`);
      }
    };

    maybeAppendParam('color', this.tagDialog.color);
    maybeAppendParam('width', this.tagDialog.width);
    maybeAppendParam('height', this.tagDialog.height);
    maybeAppendParam('flip', this.tagDialog.flip);
    maybeAppendParam('rotate', this.tagDialog.rotate);

    const cs = this.iconifyService.getServerUrl();
    const last_char = cs.substring(cs.length - 1);
    const baseSrc = last_char === '/' ? `${cs}${this.selectedIcon.collection}/${this.selectedIcon.name}.svg`
        : `${cs}/${this.selectedIcon.collection}/${this.selectedIcon.name}.svg`;
    const src = queryParams.length > 0 ? `${baseSrc}?${queryParams.join('&')}` : baseSrc;
    this.tagPreviewSrc = src;
    this.tagString = `<img src="${src}" />`;
  }

  /**
   * Creates a fresh IconTagDialogState with all fields initialized to empty strings.
   * Used when opening the dialog or resetting it after closing.
   */
  private createInitialDialogState(): IconTagDialogState {
    return {
      color: '',
      width: '',
      height: '',
      flip: '',
      rotate: ''
    };
  }
}
