/**
 * Represents a single icon entry within an icon collection.
 * Matches the shape used when browsing or searching icons.
 */
export interface Icon {
  /** The icon's identifier within its collection, e.g. "home" or "arrow-right". */
  name: string;

  /** The prefix of the collection this icon belongs to, e.g. "mdi". */
  collection: string;

  /** Optional category label, derived from the collection prefix. */
  category?: string;

  /** Searchable keywords derived by splitting the icon name on separators. */
  tags?: string[];
}

/**
 * Metadata and cached icon list for one Iconify icon set.
 * Populated from the /collections endpoint; icons are loaded lazily.
 */
export interface IconCollection {
  /** Unique prefix identifying this collection in the Iconify API, e.g. "mdi". */
  prefix: string;

  /** Human-readable display name of the collection, e.g. "Material Design Icons". */
  name: string;

  /** Optional category label returned by the /collections endpoint. */
  category?: string;

  /** Optional tag list returned by the /collections endpoint. */
  tags?: string[];

  /** Icons loaded for this collection; empty until the user opens the set. */
  icons: Icon[];

  /** Unix timestamp (ms) of the collection's last modification on the server. */
  lastModified: number;
}

/** Options supplied when performing an in-memory icon search. */
export interface IconSearchOptions {
  /** Filter by icon name (case-insensitive substring match). */
  name?: string;

  /** Filter by category (case-insensitive exact match). */
  category?: string;

  /** Filter by tags (at least one tag must match). */
  tags?: string[];
}

/** The result of an icon search operation. */
export interface SearchResult {
  /** Flattened list of icons that matched all supplied criteria. */
  icons: Icon[];

  /** Total number of matching icons. */
  total: number;

  /** The options that produced this result, useful for labelling the UI. */
  search: IconSearchOptions;
}
