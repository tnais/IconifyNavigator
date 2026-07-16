import { useState, useEffect, useRef } from 'react';
import { Icon, IconCollection } from '../../models/icon.model';
import * as iconifyService from '../../services/iconifyService';

interface Props {
  /** The collection whose metadata and icon previews this card displays. */
  collection: IconCollection;
  /** Fired when the user clicks the "Open" button. */
  onOpen: (collection: IconCollection) => void;
}

/**
 * CollectionCard renders a single collection entry in the left panel.
 *
 * Each card shows:
 *  - Name, Category, Tags metadata (labels match Iconify API attribute names)
 *  - A 2×4 grid of the first 8 preview icons (48×48 px, class collection-preview-img)
 *  - An "Open" button to display the full icon set in the right panel
 *
 * Icons are fetched LAZILY: an IntersectionObserver fires only when the card enters
 * the viewport, so icons for off-screen cards are never fetched at startup.
 */
function CollectionCard({ collection, onOpen }: Props) {
  /** First 8 icons loaded for the preview grid; empty until the card is visible. */
  const [previewIcons, setPreviewIcons] = useState<Icon[]>([]);

  /**
   * Grey placeholder boxes fill the 8-cell grid while icons are still loading.
   * Length = max(0, 8 - previewIcons.length).
   */
  const placeholders = Array(Math.max(0, 8 - previewIcons.length)).fill(null);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadIcons = () => {
      iconifyService
        .getCollectionIcons(collection.prefix)
        .then((icons) => setPreviewIcons(icons.slice(0, 8)))
        .catch(() => setPreviewIcons([]));
    };

    // Use IntersectionObserver for lazy loading; fall back to immediate load
    // in environments that don't support it (Node / jsdom in tests).
    if (typeof IntersectionObserver === 'undefined') {
      loadIcons();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadIcons();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [collection.prefix]);

  return (
    <div className="collection-card" ref={cardRef}>
      {/* ── Metadata ─────────────────────────────── */}
      <div className="collection-meta">
        <p>
          <strong>Name:</strong> {collection.name}
        </p>
        {collection.category && (
          <p>
            <strong>Category:</strong> {collection.category}
          </p>
        )}
        {collection.tags && collection.tags.length > 0 && (
          <p>
            <strong>Tags:</strong> {collection.tags.join(', ')}
          </p>
        )}
      </div>

      {/* ── Icon preview grid (2 rows × 4 columns, 48×48 px each) ─────── */}
      <div className="preview-grid">
        {previewIcons.map((icon) => (
          <img
            key={icon.name}
            src={iconifyService.getIconUrl(icon.collection, icon.name)}
            alt={icon.name}
            className="collection-preview-img"
            width={48}
            height={48}
          />
        ))}
        {/* Fill remaining cells with grey placeholder boxes */}
        {placeholders.map((_, i) => (
          <div key={`ph-${i}`} className="preview-placeholder" />
        ))}
      </div>

      {/* ── Open button ────────────────────────────────────────────────── */}
      <button onClick={() => onOpen(collection)} className="open-button">
        Open
      </button>
    </div>
  );
}

export default CollectionCard;
