/** Represents a single icon entry within a collection. */
export interface Icon {
  /** Icon name as returned by the Iconify API (e.g. "home", "account-circle"). */
  name: string;

  /** Collection prefix used as a broad category label (e.g. "material-symbols"). */
  category?: string;

  /** Searchable keywords derived from the icon name tokens plus the collection prefix. */
  tags?: string[];

  /** Prefix of the collection this icon belongs to (e.g. "mdi", "tabler"). */
  collection: string;
}

/** Metadata and icon list for one Iconify icon set (e.g. Material Design Icons). */
export interface IconCollection {
  /** Unique short identifier used in all API calls (e.g. "mdi", "material-symbols"). */
  prefix: string;

  /** Human-readable display name (e.g. "Material Design Icons"). */
  name: string;

  /** Optional grouping label assigned by Iconify (e.g. "Material"). */
  category?: string;

  /** Optional descriptive keywords for the collection (e.g. ["Precise Shapes"]). */
  tags?: string[];

  /**
   * Icons that have been loaded for this collection.
   * Empty array until the user opens the collection or a search triggers a load.
   */
  icons: Icon[];

  /** Unix timestamp (ms) of the last time this collection was modified on the server. */
  lastModified: number;
}

/** Parameters for filtering icons. All fields are optional; omitting a field means "match all". */
export interface IconSearchOptions {
  /** Substring to match against icon names (case-insensitive). */
  name?: string;

  /** Exact collection prefix to restrict results to one icon set. */
  category?: string;

  /** Substring to match against the icon set display name or prefix. */
  collectionName?: string;

  /** One or more tags; an icon matches if it contains at least one of them. */
  tags?: string[];
}

/** The result object returned by a search operation. */
export interface SearchResult {
  /** Filtered list of icons matching the search criteria. */
  icons: Icon[];

  /** Total number of matching icons (equal to icons.length). */
  total: number;

  /** The original options that produced this result, for reference. */
  search: IconSearchOptions;
}
