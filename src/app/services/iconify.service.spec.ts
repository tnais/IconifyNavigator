import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { IconCollection, SearchResult } from '../models/icon.model';
import { IconifyService } from './iconify.service';

async function flushMicrotasks(times = 1): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('IconifyService', () => {
  let service: IconifyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(IconifyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    httpMock.verify();
  });

  it('initializes without preloading icon details', async () => {
    let collections: IconCollection[] = [];
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' },
      tabler: { name: 'Tabler Icons' }
    });
    await initPromise;
    collections = await firstValueFrom(service.getCollections());
    expect(collections.map((c) => c.prefix)).toEqual(['mdi', 'tabler']);
    expect(collections.every((c) => c.icons.length === 0)).toBe(true);
    httpMock.expectNone('https://api.iconify.design/collection?prefix=mdi');
  });

  it('loads icon details lazily on first search', async () => {
    let result: SearchResult | undefined;
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.searchIcons({ name: 'home' }));
    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').flush({
      icons: { home: {}, 'home-outline': {}, heart: {} }
    });
    result = await resultPromise;
    expect(result?.total).toBe(2);
    expect(result?.icons.map((icon) => icon.name)).toEqual(['home', 'home-outline']);
  });

  it('filters icons by icon set name', async () => {
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' },
      tabler: { name: 'Tabler Icons' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.searchIcons({ collectionName: 'material' }));
    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').flush({
      icons: { home: {}, 'home-outline': {} }
    });

    const result = await resultPromise;

    expect(result.total).toBe(2);
    expect(result.icons.every((icon) => icon.collection === 'mdi')).toBe(true);
    expect(result.icons.every((icon) => icon.collectionName === 'Material Design Icons')).toBe(true);
    httpMock.expectNone('https://api.iconify.design/collection?prefix=tabler');
  });

  it('returns the full collection instead of truncating icons', async () => {
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' }
    });
    await initPromise;

    const icons = Object.fromEntries(
      Array.from({ length: 260 }, (_, index) => [`icon-${index + 1}`, {}])
    );

    const resultPromise = firstValueFrom(service.getCollectionIcons('mdi'));
    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').flush({
      icons
    });
    const result = await resultPromise;

    expect(result).toHaveLength(260);
    expect(result.at(-1)?.name).toBe('icon-260');
  });

  it('falls back to local collections snapshot when remote collections request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock
      .expectOne('https://api.iconify.design/collections')
      .flush('server error', { status: 500, statusText: 'Server Error' });
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        httpMock.expectOne('assets/collections.json').flush({
          mdi: { name: 'Material Design Icons' }
        });
        resolve();
      }, 0);
    });

    await expect(initPromise).resolves.toBeUndefined();

    const collections = await firstValueFrom(service.getCollections());
    expect(collections.map((c) => c.prefix)).toEqual(['mdi']);
  });

  it('loads ALL collections when doing a generic search (issue #1 fix)', async () => {
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' },
      tabler: { name: 'Tabler Icons' },
      feather: { name: 'Feather Icons' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.searchIcons({ name: 'home' }));

    // Verify that ALL collections are loaded (not just the first 6)
    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').flush({
      icons: { home: {}, 'home-outline': {} }
    });
    httpMock.expectOne('https://api.iconify.design/collection?prefix=tabler').flush({
      icons: { home: {} }
    });
    httpMock.expectOne('https://api.iconify.design/collection?prefix=feather').flush({
      icons: { 'home-alt': {} }
    });

    const result = await resultPromise;

    // All three collections should be searched
    expect(result.total).toBe(4); // home, home-outline, home (tabler), home-alt
    expect(result.icons.map((icon) => icon.collection).sort()).toEqual(['feather', 'mdi', 'mdi', 'tabler']);
  });

  it('loads generic searches in bounded batches to avoid overwhelming the server', async () => {
    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      a: { name: 'A' },
      b: { name: 'B' },
      c: { name: 'C' },
      d: { name: 'D' },
      e: { name: 'E' },
      f: { name: 'F' },
      g: { name: 'G' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.searchIcons({ name: 'home' }));

    const firstBatch = httpMock.match((request) =>
      request.urlWithParams.startsWith('https://api.iconify.design/collection?prefix=')
    );
    expect(firstBatch).toHaveLength(6);
    firstBatch.forEach((request, index) => {
      request.flush({
        icons: { [`home-${index + 1}`]: {} }
      });
    });

    await flushMicrotasks(3);
    httpMock.expectOne('https://api.iconify.design/collection?prefix=g').flush({
      icons: { 'home-7': {} }
    });

    const result = await resultPromise;
    expect(result.total).toBe(7);
  });

  it('continues generic searches when one collection request fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' },
      pixelarticons: { name: 'Pixelarticons' },
      tabler: { name: 'Tabler Icons' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.searchIcons({ name: 'home' }));

    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').flush({
      icons: { home: {} }
    });
    httpMock
      .expectOne('https://api.iconify.design/collection?prefix=pixelarticons')
      .error(new ProgressEvent('error'));
    httpMock.expectOne('https://api.iconify.design/collection?prefix=tabler').flush({
      icons: { 'home-2': {} }
    });

    const result = await resultPromise;
    expect(result.total).toBe(2);
    expect(result.icons.map((icon) => icon.collection).sort()).toEqual(['mdi', 'tabler']);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('logs request failures before surfacing them to the caller', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const initPromise = service.initialize();
    httpMock.expectOne('iconify-server.txt').flush('https://api.iconify.design');
    await Promise.resolve();
    httpMock.expectOne('https://api.iconify.design/collections').flush({
      mdi: { name: 'Material Design Icons' }
    });
    await initPromise;

    const resultPromise = firstValueFrom(service.getCollectionIcons('mdi'));
    httpMock.expectOne('https://api.iconify.design/collection?prefix=mdi').error(new ProgressEvent('error'));

    await expect(resultPromise).rejects.toThrow("Failed to load collection 'mdi' from Iconify server");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[IconifyService] Request failed:',
      expect.objectContaining({
        resourceName: "collection 'mdi'",
        url: 'https://api.iconify.design/collection?prefix=mdi'
      })
    );
  });
});
