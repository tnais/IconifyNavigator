/**
 * Iconify API service for the React application.
 *
 * Mirrors the logic of the Angular IconifyService using plain fetch() and
 * async/await instead of HttpClient and RxJS Observables.  The module keeps
 * its own in-memory state (server URL + collections cache) so it behaves as a
 * singleton across the lifetime of the page.
 */

import { Icon, IconCollection, IconSearchOptions, SearchResult } from '../models/icon.model';

/** URL of the Iconify API server; replaced at startup from /iconify-server.txt. */
let iconifyServerUrl = 'https://api.iconify.design';

/** Cached list of all available collections; populated once during initialize(). */
let collectionsCache: IconCollection[] = [];

/**
 * Tracks which collection prefixes have had their icon list fully loaded so that
 * subsequent calls return cached data instantly without another network request.
 */
const loadedPrefixes = new Set<string>();

/** Maximum number of collections pre-loaded per search batch. */
const MAX_COLLECTIONS_TO_LOAD = 6;

/** Maximum number of icons retained per collection to avoid UI overload. */
const MAX_ICONS_PER_COLLECTION = 250;

/** Milliseconds before an HTTP request is considered timed out. */
const REQUEST_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called once at application startup.
 * Reads the Iconify server URL from /iconify-server.txt (same origin as the
 * app, per the project acceptance criteria), then pre-fetches the list of
 * available collections.  Icon data is NOT loaded here — it is fetched lazily
 * when the user opens a collection or triggers a search.
 */
export async function initialize(): Promise<void> {
  try {
    const res = await fetch('iconify-server.txt');
    const text = await res.text();
    const parsed = parseServerUrl(text);
    if (parsed) iconifyServerUrl = parsed;
  } catch {
    // Silently keep the hardcoded default when the file is unreachable.
  }

  try {
    await loadCollectionsMetadata();
  } catch {
    // Silently keep the empty cache; the UI will show an empty list.
  }
}

/** Returns the currently configured Iconify server base URL. */
export function getServerUrl(): string {
  return iconifyServerUrl;
}

/** Returns the full collections cache as loaded during initialize(). */
export function getCollections(): IconCollection[] {
  return collectionsCache;
}

/**
 * Fetches all icons belonging to a single collection identified by its prefix.
 * Results are cached so subsequent calls for the same prefix return instantly.
 */
export async function getCollectionIcons(prefix: string): Promise<Icon[]> {
  // Return from cache if this collection has already been fully loaded.
  if (loadedPrefixes.has(prefix)) {
    const cached = collectionsCache.find((c) => c.prefix === prefix);
    if (cached) return cached.icons;
  }

  const loaded = await loadCollection(prefix);

  // Merge the newly fetched collection into the cache.
  collectionsCache = collectionsCache.map((c) => (c.prefix === prefix ? loaded : c));
  if (loaded.icons.length > 0) loadedPrefixes.add(prefix);

  return loaded.icons;
}

/**
 * Returns the URL that renders a single icon as an inline SVG via the Iconify
 * API.  Pattern: {serverUrl}/{prefix}/{iconName}.svg
 */
export function getIconUrl(prefix: string, iconName: string): string {
  return `${iconifyServerUrl}/${prefix}/${iconName}.svg`;
}

/**
 * Searches icons across a batch of pre-loaded collections using in-memory
 * filtering.  Matches against name, category, and tags per the supplied options.
 */
export async function searchIcons(options: IconSearchOptions): Promise<SearchResult> {
  if (collectionsCache.length === 0) await loadCollectionsMetadata();

  // Pre-load up to MAX_COLLECTIONS_TO_LOAD collections that haven't been fetched yet.
  const toLoad = collectionsCache
    .filter((c) => !loadedPrefixes.has(c.prefix))
    .slice(0, MAX_COLLECTIONS_TO_LOAD)
    .map((c) => c.prefix);

  if (toLoad.length > 0) {
    const loaded = await Promise.all(toLoad.map(loadCollection));
    const byPrefix = new Map(loaded.map((c) => [c.prefix, c]));
    collectionsCache = collectionsCache.map((c) => byPrefix.get(c.prefix) ?? c);
    loaded.forEach((c) => {
      if (c.icons.length > 0) loadedPrefixes.add(c.prefix);
    });
  }

  return performSearch(collectionsCache, options);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the first non-comment, non-empty line from the server URL text file.
 * Lines beginning with # or // are treated as comments and ignored.
 */
function parseServerUrl(fileContent: string): string {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
  return lines[0] ?? '';
}

/**
 * Loads collection metadata from the /collections endpoint.
 * Falls back to a bundled snapshot at /collections.json when the API is unreachable.
 * Guard: if the cache is already populated this is a no-op to prevent duplicate loads.
 */
async function loadCollectionsMetadata(): Promise<void> {
  if (collectionsCache.length > 0) return;

  let map: Record<string, { name?: string; category?: string; tags?: string[] }> = {};
  try {
    map = await fetchWithTimeout(`${iconifyServerUrl}/collections`);
  } catch {
    try {
      map = await fetchWithTimeout('collections.json');
    } catch {
      map = {};
    }
  }

  collectionsCache = Object.keys(map).map((prefix) => ({
    prefix,
    name: map[prefix]?.name ?? prefix,
    category: map[prefix]?.category,
    tags: map[prefix]?.tags,
    icons: [],
    lastModified: Date.now()
  }));
}

/**
 * Fetches icon names for a single collection via GET /collection?prefix={prefix}.
 *
 * The Iconify API may return icons in three shapes:
 *   - flat `icons` object  → keys are icon names
 *   - `categories` object  → values are arrays of icon names grouped by category
 *   - `uncategorized` array → icon names that belong to no category
 * All three shapes are merged and capped at MAX_ICONS_PER_COLLECTION.
 */
async function loadCollection(prefix: string): Promise<IconCollection> {
  const data = await fetchWithTimeout<{
    icons?: Record<string, unknown>;
    categories?: Record<string, string[]>;
    uncategorized?: string[];
  }>(`${iconifyServerUrl}/collection?prefix=${encodeURIComponent(prefix)}`);

  const metadata = collectionsCache.find((c) => c.prefix === prefix);

  // Resolve icon names from whichever shape the API returned.
  const fromFlat = Object.keys(data?.icons ?? {});
  const fromCategories = Object.values(data?.categories ?? {}).flat();
  const fromUncategorized = data?.uncategorized ?? [];
  const allNames = fromFlat.length > 0 ? fromFlat : [...fromCategories, ...fromUncategorized];
  const iconNames = allNames.slice(0, MAX_ICONS_PER_COLLECTION);

  const category = prefix.toLowerCase();
  const icons: Icon[] = iconNames.map((name) => ({
    name,
    collection: prefix,
    category,
    tags: createTagsFromIconName(name, category)
  }));

  return {
    prefix,
    name: metadata?.name ?? prefix,
    category: metadata?.category,
    tags: metadata?.tags,
    icons,
    lastModified: metadata?.lastModified ?? Date.now()
  };
}

/**
 * Derives searchable tags from an icon name by splitting on common separators
 * (hyphens, underscores, colons, spaces) and appending the collection prefix.
 */
function createTagsFromIconName(iconName: string, category: string): string[] {
  const tokens = iconName
    .split(/[-_:\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 1);
  return [...new Set([...tokens, category])];
}

/**
 * Filters icons across all loaded collections using the supplied search options.
 * All comparisons are case-insensitive. An absent option means "match everything".
 */
/**
 * Filters icons across all loaded collections using the supplied search options.
 * All comparisons are case-insensitive. An absent option means "match everything".
 */
function performSearch(collections: IconCollection[], options: IconSearchOptions): SearchResult {
  const name = options.name?.toLowerCase();
  const category = options.category?.toLowerCase();
  const tags = options.tags?.map((tag) => tag.toLowerCase()) ?? [];

  const icons = collections.flatMap((coll) =>
    coll.icons.filter((icon) => {
      const matchesName = !name || icon.name.toLowerCase().includes(name);
      const matchesCategory = !category || (icon.category ?? '').toLowerCase() === category;
      const matchesTags =
        tags.length === 0 ||
        tags.some((tag) => (icon.tags ?? []).map((t) => t.toLowerCase()).includes(tag));

      return matchesName && matchesCategory && matchesTags;
    })
  );

  return { icons, total: icons.length, search: options };
}

/**
 * Wraps fetch() with an AbortController-based timeout.
 * Throws if the request exceeds REQUEST_TIMEOUT_MS or returns a non-OK status.
 */
async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
