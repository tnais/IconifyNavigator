import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon, IconCollection } from '../../models/icon.model';
import { IconifyService } from '../../services/iconify.service';

/**
 * CollectionCardComponent renders a single collection entry in the left panel.
 *
 * Each card shows:
 *   - Name, Category, and Tags metadata (labels match Iconify API attribute names)
 *   - A 2×4 preview grid of the first 8 icons from the collection (24×24 px each)
 *   - An "Open" button that notifies the parent to display the full icon set
 *
 * Icons are loaded LAZILY: the IntersectionObserver fires only when the card enters
 * the browser viewport, so icons for off-screen cards are never fetched at startup.
 * This satisfies the "must not preload data" acceptance criterion.
 */
@Component({
  selector: 'app-collection-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="collection-card">

      <!-- ── Metadata ─────────────────────────────── -->
      <div class="collection-meta">
        <p><strong>Name:</strong> {{ collection.name }}</p>
        <p *ngIf="collection.category"><strong>Category:</strong> {{ collection.category }}</p>
        <p *ngIf="collection.tags && collection.tags.length > 0">
          <strong>Tags:</strong> {{ collection.tags.join(', ') }}
        </p>
      </div>

      <!-- ── Icon preview grid (2 rows × 4 columns) ─ -->
      <div class="preview-grid">
        <img
          *ngFor="let icon of previewIcons"
          [src]="getIconUrl(icon)"
          [alt]="icon.name"
          class="collection-preview-img"
          width="24"
          height="24"
        />
        <!-- Grey placeholder boxes fill the grid while icons are still loading. -->
        <div *ngFor="let _ of placeholders" class="preview-placeholder"></div>
      </div>

      <!-- ── Open button ──────────────────────────── -->
      <button (click)="open.emit(collection)" class="open-button">Open</button>

    </div>
  `,
  styles: [
    `
      .collection-card {
        border: 1px solid var(--border-default);
        border-radius: 6px;
        padding: 12px;
        background: var(--bg-card);
        margin-bottom: 8px;
        display: flex;
      }
      .collection-meta {
        width: 55%;
      }
      .collection-meta p {
        margin: 2px 0;
        font-size: 0.85rem;
      }
      /* 2 rows × 4 columns, each cell 24×24 px */
      .preview-grid {
        display: grid;
        grid-template-columns: repeat(4, 24px);
        grid-template-rows: repeat(2, 24px);
        gap: 4px;
        margin: 8px 0;
      }
      .collection-preview-img {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }
      .preview-placeholder {
        width: 24px;
        height: 24px;
        background: var(--bg-surface-muted);
        border-radius: 4px;
      }
      .open-button {
        padding: 6px 16px;
        margin-left: 4px;
        background-color: var(--accent);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        height: 25%;
      }
      .open-button:hover {
        background-color: var(--accent-hover);
      }
    `
  ]
})
export class CollectionCardComponent implements AfterViewInit, OnDestroy {
  /** The collection whose metadata and icon previews this card displays. */
  @Input() collection!: IconCollection;

  /** Fired when the user clicks "Open", carrying the collection to display in full. */
  @Output() open = new EventEmitter<IconCollection>();

  /** The first 8 icons loaded for preview; starts empty until the card enters the viewport. */
  previewIcons: Icon[] = [];

  /**
   * Returns an array of `null` values whose length makes the preview grid always
   * contain exactly 8 cells, filling remaining slots with placeholder boxes.
   */
  get placeholders(): null[] {
    return Array(Math.max(0, 8 - this.previewIcons.length)).fill(null);
  }

  private observer?: IntersectionObserver;

  constructor(
    private el: ElementRef<HTMLElement>,
    private iconifyService: IconifyService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Sets up an IntersectionObserver so icon preview data is fetched only when
   * this card scrolls into the browser's viewport.
   *
   * Fallback: when IntersectionObserver is unavailable (jsdom / server-side),
   * icons are loaded immediately to keep tests and SSR consistent.
   */
  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Test / SSR environment: load immediately without observer.
      this.loadPreviewIcons();
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.loadPreviewIcons();
          // Disconnect once loaded — we only need icons fetched once per card.
          this.observer?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Returns the Iconify SVG render URL for a given icon. */
  getIconUrl(icon: Icon): string {
    return this.iconifyService.getIconUrl(icon.collection, icon.name);
  }

  /**
   * Requests the full icon list for this collection from the service (which
   * caches results), then slices to the first 8 for the preview grid.
   * detectChanges() forces an immediate re-render of this OnPush component.
   */
  private loadPreviewIcons(): void {
    this.iconifyService.getCollectionIcons(this.collection.prefix).subscribe({
      next: (icons) => {
        this.previewIcons = icons.slice(0, 8);
        this.cdr.detectChanges();
      },
      error: () => {
        // On error, leave the grid showing placeholder boxes.
        this.previewIcons = [];
        this.cdr.detectChanges();
      }
    });
  }
}
