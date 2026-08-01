/**
 * IconifyNavigator v1.0.4
 * 
 * Service for communicating with Iconify API.
 * 
 * Responsibilities:
 * - Manage Iconify server URL configuration
 * - Fetch and cache icon collections
 * - Search icons across collections with progress tracking
 * - Build URLs for icon requests with parameters
 * - Handle timeouts and errors
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, from, of, Subject } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { Icon, IconCollection, IconSearchOptions, SearchResult, SearchProgress } from '../models/icon.model';

@Injectable({
  providedIn: 'root'
})
export class IconifyService {
  /** Base URL of the Iconify API server; overridden at startup from assets/iconify-server.txt. */
  private iconifyServerUrl = 'https://api.iconify.design';

  /** In-memory cache of all known collections, populated once during initialize(). */
  private readonly collectionsCache$ = new BehaviorSubject<IconCollection[]>([]);

  /** Subject that emits search progress updates as collections are loaded during search. */
  private readonly searchProgress$ = new Subject<SearchProgress>();

  /** Maximum number of collections whose icons are loaded simultaneously during a search. */
  private readonly maxCollectionsToLoad = 6;

  /** Milliseconds before an HTTP request is considered timed out. */
  private readonly requestTimeoutMs = 8000;

  /** Tracks which collection prefixes have already had their icons loaded. */
  private readonly loadedPrefixes = new Set<string>();

  constructor(private http: HttpClient) {}

  /**
   * Called once at application startup.
   * Reads the server URL from a local text file, then pre-fetches the list of collections.
   * Icon data is NOT loaded here — it is fetched lazily when the user opens a collection or searches.
   */
  async initialize(): Promise<void> {
    try {
      const content = await firstValueFrom(
        this.http
          .get('iconify-server.txt', { responseType: 'text' })
          .pipe(timeout({ first: this.requestTimeoutMs }))
      );
      const parsed = this.parseServerUrl(content || '');
      if (parsed) {
        this.iconifyServerUrl = parsed;
      }
    } catch {
      this.iconifyServerUrl = 'https://api.iconify.design';
    }

    try {
      await this.loadCollectionsMetadata();
    } catch {
      if (this.collectionsCache$.value.length === 0) {
        this.collectionsCache$.next([]);
      }
    }
  }

  /** Returns all known collections, loading them from the API if the cache is empty. */
  getCollections(): Observable<IconCollection[]> {
    if (this.collectionsCache$.value.length > 0) {
      return of(this.collectionsCache$.value);
    }

    return from(this.loadCollectionsMetadata()).pipe(map(() => this.collectionsCache$.value));
  }

  /** Emits search progress updates (loading collections, matching icons found, etc.). */
  getSearchProgress(): Observable<SearchProgress> {
    return this.searchProgress$.asObservable();
  }

  /**
   * Searches icons across a batch of pre-loaded collections using in-memory filtering.
   * Matches against name, category, and tags according to the supplied options.
   * Emits progress updates via getSearchProgress() observable.
   */
  searchIcons(options: IconSearchOptions): Observable<SearchResult> {
    return from(this.searchIconsInternal(options));
  }

  /**
   * Fetches all icons belonging to a single collection identified by its prefix.
   * Results are cached so subsequent calls for the same prefix are instant.
   */
  getCollectionIcons(prefix: string): Observable<Icon[]> {
    return from(this.getCollectionIconsInternal(prefix));
  }

  /**
   * Returns the URL that renders a single icon as an inline SVG via the Iconify API.
   * The URL pattern is: {serverUrl}/{prefix}/{iconName}.svg
   */
  getIconUrl(prefix: string, iconName: string): string {
    return `${this.iconifyServerUrl}/${prefix}/${iconName}.svg`;
  }

  /** Returns the currently configured Iconify server URL. */
  getServerUrl(): string {
    return this.iconifyServerUrl;
  }

  /**
   * Internal helper to fetch all icons for a collection, with caching.
   * Returns cached data if already loaded; otherwise fetches from the API and updates the cache.
   */
  private async getCollectionIconsInternal(prefix: string): Promise<Icon[]> {
    if (this.collectionsCache$.value.length === 0) {
      await this.loadCollectionsMetadata();
    }

    if (this.loadedPrefixes.has(prefix)) {
      const cached = this.collectionsCache$.value.find((c) => c.prefix === prefix);
      if (cached) return cached.icons;
    }

    const loaded = await this.loadCollection(prefix);

    const current = this.collectionsCache$.value;
    const merged = current.map((c) => (c.prefix === prefix ? loaded : c));
    if (loaded.icons.length > 0) {
      this.loadedPrefixes.add(prefix);
    }
    this.collectionsCache$.next(merged);

    return loaded.icons;
  }

  /**
   * Extracts the first non-comment, non-empty line from the server URL text file.
   * Lines beginning with # or // are treated as comments and ignored.
   */
  private parseServerUrl(fileContent: string): string {
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
    return lines[0] || '';
  }

  /**
   * Loads collection metadata from the /collections endpoint.
   * Falls back to a bundled snapshot at assets/collections.json when the API is unreachable.
   * Guard: if the cache is already populated this is a no-op to prevent duplicate loads.
   */
  private async loadCollectionsMetadata(): Promise<IconCollection[]> {
    if (this.collectionsCache$.value.length > 0) {
      return this.collectionsCache$.value;
    }

    let collectionsMap: Record<string, { name?: string; category?: string; tags?: string[] }> = {};
    try {
      collectionsMap = await this.requestWithTimeout<Record<string, { name?: string; category?: string; tags?: string[] }>>(
        `${this.iconifyServerUrl}/collections`,
        'collections'
      );
    } catch {
      try {
        collectionsMap = await this.requestWithTimeout<Record<string, { name?: string; category?: string; tags?: string[] }>>(
          'assets/collections.json',
          'local collections snapshot'
        );
      } catch {
        collectionsMap = {};
      }
    }

    const collections = Object.keys(collectionsMap || {}).map((prefix) => ({
      prefix,
      name: collectionsMap[prefix]?.name || prefix,
      category: collectionsMap[prefix]?.category,
      tags: collectionsMap[prefix]?.tags,
      icons: [],
      lastModified: Date.now()
    }));

    this.collectionsCache$.next(collections);
    return collections;
  }

  /** Ensures metadata is loaded, then delegates to the in-memory search with progress tracking. */
  private async searchIconsInternal(options: IconSearchOptions): Promise<SearchResult> {
    const collections = await this.ensureSearchCollectionsLoadedWithProgress(options);
    return this.performSearch(collections, options);
  }

  /**
   * Loads collections while emitting progress updates to indicate search status.
   * Shows user which collection is being loaded and how many have been processed.
   */
  private async ensureSearchCollectionsLoadedWithProgress(options?: IconSearchOptions): Promise<IconCollection[]> {
    if (this.collectionsCache$.value.length === 0) {
      await this.loadCollectionsMetadata();
    }

    const current = this.collectionsCache$.value;
    const collectionNameQuery = options?.collectionName?.trim().toLowerCase();
    let prefixesToLoad: string[] = [];

    if (collectionNameQuery) {
      prefixesToLoad = current
        .filter(
          (collection) =>
            collection.name.toLowerCase().includes(collectionNameQuery) ||
            collection.prefix.toLowerCase().includes(collectionNameQuery)
        )
        .filter((collection) => !this.loadedPrefixes.has(collection.prefix))
        .map((collection) => collection.prefix);
    } else {
      // For generic searches, load ALL collections
      prefixesToLoad = current
        .filter((collection) => !this.loadedPrefixes.has(collection.prefix))
        .map((collection) => collection.prefix);
    }

    if (prefixesToLoad.length === 0) {
      return current;
    }

    // Emit initial progress
    this.searchProgress$.next({
      totalCollections: prefixesToLoad.length,
      loadedCollections: 0,
      matchedIcons: 0,
      complete: false
    });

    // Load all prefixes and emit progress for each
    const loadedCollections = await Promise.all(
      prefixesToLoad.map(async (prefix, index) => {
        const collection = await this.loadCollection(prefix);
        
        // Emit progress after each collection is loaded
        this.searchProgress$.next({
          totalCollections: prefixesToLoad.length,
          loadedCollections: index + 1,
          currentCollection: collection.name,
          matchedIcons: collection.icons.length,
          complete: index + 1 === prefixesToLoad.length
        });

        return collection;
      })
    );

    const loadedByPrefix = new Map(loadedCollections.map((collection) => [collection.prefix, collection]));
    const merged = current.map((collection) => loadedByPrefix.get(collection.prefix) || collection);

    merged.forEach((collection) => {
      if (collection.icons.length > 0) {
        this.loadedPrefixes.add(collection.prefix);
      }
    });

    this.collectionsCache$.next(merged);
    return merged;
  }

  /**
   * Loads collections based on search options to ensure comprehensive search results.
   * - If searching by collection name: loads only matching collections
   * - If doing a generic search: loads ALL collections to ensure no results are missed
   * Note: Results are cached after loading, so subsequent searches are instant.
   * This is retained as fallback; use ensureSearchCollectionsLoadedWithProgress for actual searches.
   */
  private async ensureSearchCollectionsLoaded(options?: IconSearchOptions): Promise<IconCollection[]> {
    if (this.collectionsCache$.value.length === 0) {
      await this.loadCollectionsMetadata();
    }

    const current = this.collectionsCache$.value;
    const collectionNameQuery = options?.collectionName?.trim().toLowerCase();

    if (collectionNameQuery) {
      const prefixesToLoad = current
        .filter(
          (collection) =>
            collection.name.toLowerCase().includes(collectionNameQuery) ||
            collection.prefix.toLowerCase().includes(collectionNameQuery)
        )
        .filter((collection) => !this.loadedPrefixes.has(collection.prefix))
        .map((collection) => collection.prefix);

      if (prefixesToLoad.length === 0) {
        return current;
      }

      const loadedCollections = await Promise.all(prefixesToLoad.map((prefix) => this.loadCollection(prefix)));
      const loadedByPrefix = new Map(loadedCollections.map((collection) => [collection.prefix, collection]));
      const merged = current.map((collection) => loadedByPrefix.get(collection.prefix) || collection);
      merged.forEach((collection) => {
        if (collection.icons.length > 0) {
          this.loadedPrefixes.add(collection.prefix);
        }
      });

      this.collectionsCache$.next(merged);
      return merged;
    }

    // For generic searches (no collection name filter), load ALL collections to ensure complete results.
    // Load unloaded collections in batches to avoid overwhelming the server.
    const prefixesToLoad = current
      .filter((collection) => !this.loadedPrefixes.has(collection.prefix))
      .map((collection) => collection.prefix);

    if (prefixesToLoad.length === 0) {
      return current;
    }

    const loadedCollections = await Promise.all(prefixesToLoad.map((prefix) => this.loadCollection(prefix)));
    const loadedByPrefix = new Map(loadedCollections.map((collection) => [collection.prefix, collection]));

    const merged = current.map((collection) => loadedByPrefix.get(collection.prefix) || collection);
    merged.forEach((collection) => {
      if (collection.icons.length > 0) {
        this.loadedPrefixes.add(collection.prefix);
      }
    });

    this.collectionsCache$.next(merged);
    return merged;
  }

  /**
   * Fetches icon names for a single collection via GET /collection?prefix={prefix}.
   * The API may return icons in three shapes:
   *   - flat `icons` object  → keys are icon names
   *   - `categories` object  → values are arrays of icon names grouped by category
   *   - `uncategorized` array → icon names that belong to no category
   * All three shapes are merged so the full collection can be displayed.
   */
  private async loadCollection(prefix: string): Promise<IconCollection> {
    const remoteCollection = await this.requestWithTimeout<{
      icons?: Record<string, unknown>;
      categories?: Record<string, string[]>;
      uncategorized?: string[];
    }>(
      `${this.iconifyServerUrl}/collection?prefix=${encodeURIComponent(prefix)}`,
      `collection '${prefix}'`
    );

    const collections = this.collectionsCache$.value;
    const metadata = collections.find((collection) => collection.prefix === prefix);

    // The API may return icons as a flat object (keys = names) or grouped under `categories`/`uncategorized`
    const fromFlat = Object.keys(remoteCollection?.icons || {});
    const fromCategories = Object.values(remoteCollection?.categories || {}).flat();
    const fromUncategorized = remoteCollection?.uncategorized || [];
    const iconNames = fromFlat.length > 0 ? fromFlat : [...fromCategories, ...fromUncategorized];

    const category = (metadata?.prefix || prefix).toLowerCase();

    const icons: Icon[] = iconNames.map((name) => ({
      name,
      collection: prefix,
      collectionName: metadata?.name || prefix,
      category,
      tags: this.createTagsFromIconName(name, category)
    }));

    return {
      prefix,
      name: metadata?.name || prefix,
      icons,
      lastModified: metadata?.lastModified || Date.now()
    };
  }

  /**
   * Derives searchable tags from an icon name by splitting on separators
   * (hyphens, underscores, colons, spaces) and appending the collection prefix as a tag.
   */
  private createTagsFromIconName(iconName: string, category: string): string[] {
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
  private performSearch(collections: IconCollection[], options: IconSearchOptions): SearchResult {
    const name = options.name?.toLowerCase();
    const category = options.category?.toLowerCase();
    const collectionName = options.collectionName?.toLowerCase();
    const tags = options.tags?.map((tag) => tag.toLowerCase()) || [];

    const matchingCollections = collections.filter((collection) => {
      return (
        !collectionName ||
        collection.name.toLowerCase().includes(collectionName) ||
        collection.prefix.toLowerCase().includes(collectionName)
      );
    });

    const icons = matchingCollections.flatMap((collection) =>
      collection.icons.filter((icon) => {
        const matchesName = !name || icon.name.toLowerCase().includes(name);
        const matchesCategory = !category || (icon.category || '').toLowerCase() === category;
        const matchesTags =
          tags.length === 0 ||
          tags.some((tag) => (icon.tags || []).map((iconTag) => iconTag.toLowerCase()).includes(tag));

        return matchesName && matchesCategory && matchesTags;
      })
    );

    return {
      icons,
      total: icons.length,
      search: options
    };
  }

  /**
   * Wraps HttpClient.get() with a timeout and error conversion to Exception.
   * Throws an Error with a human-readable message on timeout or network failure.
   */
  private async requestWithTimeout<T>(url: string, resourceName: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>(url).pipe(timeout({ first: this.requestTimeoutMs })));
    } catch (error) {
      throw new Error(`Failed to load ${resourceName} from Iconify server: ${this.toErrorMessage(error)}`);
    }
  }

  /**
   * Extracts a human-readable error message from an unknown error object.
   * Falls back to a generic message if the error has no readable message property.
   */
  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'request did not complete';
  }
}
