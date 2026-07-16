import { useState } from 'react';
import { Icon, IconCollection, IconSearchOptions } from '../../models/icon.model';
import * as iconifyService from '../../services/iconifyService';
import IconSearch from '../IconSearch/IconSearch';
import CollectionCard from '../CollectionCard/CollectionCard';

interface Props {
  /** All available icon collections passed in from the root App component. */
  collections: IconCollection[];
}

interface IconTagDialogState {
  color: string;
  width: string;
  height: string;
  flip: '' | 'horizontal' | 'vertical';
  rotate: '' | '90' | '180' | '270';
}

/**
 * IconBrowser is the main UI shell of the React application.
 *
 * Layout — two fixed panels side by side:
 *   LEFT  — scrollable list of collection cards (search form + metadata + 8-icon previews)
 *   RIGHT — scrollable icon grid for the selected collection, or search results
 *
 * Open behaviour (per acceptance criteria 0.0.2):
 *   - "Open" on a collection NOT currently displayed → loads and shows its full icon list
 *   - "Open" on the collection ALREADY displayed → does nothing
 */
function IconBrowser({ collections }: Props) {
  /** The collection whose full icon set is currently shown in the right panel. */
  const [openedCollection, setOpenedCollection] = useState<IconCollection | null>(null);

  /** Full icon list for the opened collection; populated after Open is clicked. */
  const [collectionIcons, setCollectionIcons] = useState<Icon[]>([]);

  /** True while icon data for the opened collection is being fetched. */
  const [loadingIcons, setLoadingIcons] = useState(false);

  /** Icons returned by the most recent text search. */
  const [icons, setIcons] = useState<Icon[]>([]);

  /** True while a search request is in flight. */
  const [loading, setLoading] = useState(false);

  /** True once the user has submitted at least one search. */
  const [searched, setSearched] = useState(false);

  /** Error message when the most recent operation failed; null otherwise. */
  const [error, setError] = useState<string | null>(null);

  /** Selected icon used for dialog-driven tag generation. */
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);

  /** Current form values inside the icon tag dialog. */
  const [tagDialog, setTagDialog] = useState<IconTagDialogState>(createInitialDialogState);

  /** Generated read-only <img /> HTML tag shown in the dialog. */
  const [tagString, setTagString] = useState('');

  /** Returns the Iconify SVG render URL for a given icon. */
  function getIconUrl(icon: Icon): string {
    return iconifyService.getIconUrl(icon.collection, icon.name);
  }

  /**
   * Called when the user clicks "Open" on a collection card.
   *
   * - Same collection already displayed → do nothing (AC 0.0.2).
   * - Different collection → clear the right panel, fetch icons, update display.
   */
  function onOpenCollection(collection: IconCollection): void {
    if (openedCollection?.prefix === collection.prefix) {
      console.log('[IconBrowser] Collection already open, doing nothing:', collection.prefix);
      return;
    }

    console.log('[IconBrowser] Opening collection:', collection.prefix);
    setOpenedCollection(collection);
    setCollectionIcons([]);
    setLoadingIcons(true);
    // Dismiss any search results so only the collection view is shown.
    setSearched(false);
    setIcons([]);

    iconifyService
      .getCollectionIcons(collection.prefix)
      .then((loaded) => {
        console.log('[IconBrowser] Loaded icons:', loaded.length, 'for', collection.prefix);
        setCollectionIcons(loaded);
        setLoadingIcons(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load icons';
        console.error('[IconBrowser] Error loading icons:', err);
        setError(msg);
        setLoadingIcons(false);
      });
  }

  /**
   * Triggered by the search form.
   * Clears the opened collection so search results are shown in the right panel.
   */
  function onSearch(options: IconSearchOptions): void {
    console.log('[IconBrowser] Searching:', options);
    setOpenedCollection(null);
    setCollectionIcons([]);
    setLoading(true);
    setError(null);
    setSearched(true);

    iconifyService
      .searchIcons(options)
      .then((result) => {
        console.log('[IconBrowser] Search completed, found', result.icons.length, 'icons');
        setIcons(result.icons);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to search icons';
        setError(msg);
        setLoading(false);
      });
  }

  function openIconDialog(icon: Icon): void {
    setSelectedIcon(icon);
    const initial = createInitialDialogState();
    setTagDialog(initial);
    setTagString(buildTagString(icon, initial));
  }

  function closeIconDialog(): void {
    setSelectedIcon(null);
    setTagDialog(createInitialDialogState());
    setTagString('');
  }

  function onDialogFieldChange<K extends keyof IconTagDialogState>(field: K, value: IconTagDialogState[K]): void {
    if (!selectedIcon) return;
    const next = { ...tagDialog, [field]: value };
    setTagDialog(next);
    setTagString(buildTagString(selectedIcon, next));
  }

  async function copyTagString(): Promise<void> {
    if (!tagString) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(tagString);
      return;
    }

    const copyArea = document.createElement('textarea');
    copyArea.value = tagString;
    document.body.appendChild(copyArea);
    copyArea.select();
    document.execCommand('copy');
    document.body.removeChild(copyArea);
  }

  return (
    <div className="browser-layout">
      {/* ══ LEFT PANEL: collection list ════════════════════════════════ */}
      <div className="left-panel">
        <IconSearch onSearch={onSearch} />
        <section>
          <h2>Available icon sets</h2>
          {collections.length === 0 && <p>Loading sets...</p>}
          <div className="collections-list">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.prefix}
                collection={collection}
                onOpen={onOpenCollection}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ══ RIGHT PANEL: icon detail / search results ══════════════════ */}
      <div className="right-panel">
        {/* Empty state */}
        {!openedCollection && !searched && (
          <p className="right-empty-hint">
            Click <strong>Open</strong> on a collection to browse its icons,
            or use the search form to find specific icons.
          </p>
        )}

        {/* Full icon grid for the selected collection */}
        {openedCollection && (
          <section>
            <h2>{openedCollection.name} - Icons</h2>
            {loadingIcons && <p>Loading icons...</p>}
            {collectionIcons.length > 0 && (
              <div className="grid">
                {collectionIcons.map((icon) => (
                  <article key={icon.name} className="card icon-clickable" onClick={() => openIconDialog(icon)}>
                    <div className="icon-preview">
                      {/* Eager loading ensures icons have non-zero naturalWidth for tests */}
                      <img src={getIconUrl(icon)} alt={icon.name} className="icon-img" />
                    </div>
                    <h3 className="icon-name">{icon.name}</h3>
                    <p className="icon-tags">
                      <strong>tags:</strong> {(icon.tags ?? []).join(', ') || 'n/a'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Search results */}
        {!openedCollection && searched && (
          <section>
            <h2>Search Results</h2>
            {loading && <p>Searching...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && <p>Found {icons.length} icon(s)</p>}
            {icons.length > 0 && (
              <div className="grid">
                {icons.map((icon) => (
                  <article key={icon.name} className="card icon-clickable" onClick={() => openIconDialog(icon)}>
                    <div className="icon-preview">
                      <img src={getIconUrl(icon)} alt={icon.name} className="icon-img" />
                    </div>
                    <h3 className="icon-name">{icon.name}</h3>
                    <p className="icon-tags">
                      <strong>tags:</strong> {(icon.tags ?? []).join(', ') || 'n/a'}
                    </p>
                    <p>
                      <strong>collection:</strong> {icon.collection}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {selectedIcon && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Icon tag builder">
            <div className="dialog-grid">
              <input
                id="icn.color"
                value={tagDialog.color}
                onChange={(e) => onDialogFieldChange('color', e.target.value)}
                type="text"
                placeholder="color"
              />
              <input
                id="icn.width"
                value={tagDialog.width}
                onChange={(e) => onDialogFieldChange('width', e.target.value)}
                type="text"
                placeholder="width"
              />
              <input
                id="icn.height"
                value={tagDialog.height}
                onChange={(e) => onDialogFieldChange('height', e.target.value)}
                type="text"
                placeholder="height"
              />
              <select id="icn.flip" value={tagDialog.flip} onChange={(e) => onDialogFieldChange('flip', e.target.value as IconTagDialogState['flip'])}>
                <option value=""></option>
                <option value="horizontal">horizontal</option>
                <option value="vertical">vertical</option>
              </select>
              <select id="icn.rotate" value={tagDialog.rotate} onChange={(e) => onDialogFieldChange('rotate', e.target.value as IconTagDialogState['rotate'])}>
                <option value=""></option>
                <option value="90">90</option>
                <option value="180">180</option>
                <option value="270">270</option>
              </select>
            </div>

            <textarea id="icn.tagstring" readOnly value={tagString} />

            <div className="dialog-actions">
              <button type="button" onClick={() => void copyTagString()}>
                copy
              </button>
              <button type="button" onClick={closeIconDialog}>
                close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IconBrowser;

function createInitialDialogState(): IconTagDialogState {
  return {
    color: '',
    width: '',
    height: '',
    flip: '',
    rotate: ''
  };
}

function buildTagString(icon: Icon, options: IconTagDialogState): string {
  const params: string[] = [];
  const appendParam = (name: string, value: string): void => {
    const normalized = value.trim();
    if (normalized.length > 0) {
      params.push(`${name}=${encodeURIComponent(normalized)}`);
    }
  };

  appendParam('color', options.color);
  appendParam('width', options.width);
  appendParam('height', options.height);
  appendParam('flip', options.flip);
  appendParam('rotate', options.rotate);

  const baseSrc = `${iconifyService.getServerUrl()}/${icon.collection}/${icon.name}.svg`;
  const src = params.length > 0 ? `${baseSrc}?${params.join('&')}` : baseSrc;
  return `<img src="${src}" />`;
}
