import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { IconifyService } from '../../services/iconify.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let iconifyService: {
    initialize: jest.Mock<Promise<void>, []>;
    getCollections: jest.Mock;
    getCollectionIcons: jest.Mock;
    getIconUrl: jest.Mock;
    getServerUrl: jest.Mock;
  };

  const themeStorageKey = 'iconify-navigator.theme';

  beforeEach(async () => {
    originalMatchMedia = window.matchMedia;
    window.localStorage.removeItem(themeStorageKey);

    iconifyService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getCollections: jest.fn().mockReturnValue(
        of([
          {
            prefix: 'mdi',
            name: 'Material Design Icons',
            category: 'Material',
            tags: ['Precise Shapes'],
            icons: [],
            lastModified: 0
          }
        ])
      ),
      getCollectionIcons: jest.fn().mockReturnValue(
        of([{ name: 'home', category: 'mdi', tags: ['house'], collection: 'mdi' }])
      ),
      getIconUrl: jest.fn().mockImplementation(
        (prefix: string, name: string) => `https://api.iconify.design/${prefix}/${name}.svg`
      ),
      getServerUrl: jest.fn().mockReturnValue('https://api.iconify.design')
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: IconifyService,
          useValue: iconifyService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => {
    window.localStorage.removeItem(themeStorageKey);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia
    });
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders application shell', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Iconify Navigator');
  });

  it('shows collections with name, category, and tags', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Material Design Icons');
    expect(text).toContain('Material');
    expect(text).toContain('Precise Shapes');
  });

  it('uses persisted dark theme preference on startup', async () => {
    window.localStorage.setItem(themeStorageKey, 'dark');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to system preference when no saved theme exists', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles theme and persists user choice', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('.theme-selector') as HTMLSelectElement;
    selector.value = 'dark';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.theme).toBe('dark');
    expect(window.localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('supports Mallard theme selection and persistence', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('.theme-selector') as HTMLSelectElement;
    selector.value = 'mallard';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.theme).toBe('mallard');
    expect(window.localStorage.getItem(themeStorageKey)).toBe('mallard');
    expect(document.documentElement.getAttribute('data-theme')).toBe('mallard');
  });

  it('supports Mallard Dark theme selection and persistence', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('.theme-selector') as HTMLSelectElement;
    selector.value = 'mallard-dark';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.theme).toBe('mallard-dark');
    expect(window.localStorage.getItem(themeStorageKey)).toBe('mallard-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('mallard-dark');
  });
});
