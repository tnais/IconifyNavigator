import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { IconCollection, SearchResult } from '../models/icon.model';
import { IconifyService } from './iconify.service';

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

  it('falls back to local collections snapshot when remote collections request fails', async () => {
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
});
