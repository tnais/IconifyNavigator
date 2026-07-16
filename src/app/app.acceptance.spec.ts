import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './components/app/app.component';
import { IconifyService } from './services/iconify.service';

const collections = [
  {
    prefix: 'mdi',
    name: 'Material Design Icons',
    category: 'Material',
    tags: ['Precise Shapes', 'Has Padding'],
    icons: [],
    lastModified: 0
  },
  {
    prefix: 'tabler',
    name: 'Tabler Icons',
    category: 'UI 24px',
    tags: ['Precise Shapes'],
    icons: [],
    lastModified: 0
  }
];

/** Builds the mock service used across all acceptance specs. */
function buildServiceMock() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    getCollections: jest.fn().mockReturnValue(of(collections)),
    getCollectionIcons: jest.fn().mockReturnValue(
      of([
        { name: 'home', category: 'mdi', tags: ['house'], collection: 'mdi' },
        { name: 'user', category: 'mdi', tags: ['person'], collection: 'mdi' }
      ])
    ),
    getIconUrl: jest.fn().mockImplementation(
      (prefix: string, name: string) => `https://api.iconify.design/${prefix}/${name}.svg`
    ),
    getServerUrl: jest.fn().mockReturnValue('https://api.iconify.design')
  };
}

describe('Acceptance criteria 0.0.1', () => {
  it('renders the app without crashing and shows the collections list', async () => {
    const iconifyService = buildServiceMock();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    });

    const fixture = TestBed.createComponent(AppComponent);
    expect(() => fixture.detectChanges()).not.toThrow();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Iconify Navigator');
    expect(text).toContain('Available icon sets');
    // No icon images should be in the right panel before the user opens a collection.
    const rightPanel = fixture.nativeElement.querySelector('.right-panel');
    expect(rightPanel.querySelectorAll('.icon-img').length).toBe(0);
  });
});

describe('Acceptance criteria 0.0.2', () => {
  let fixture: ComponentFixture<AppComponent>;
  let iconifyService: ReturnType<typeof buildServiceMock>;

  beforeEach(async () => {
    iconifyService = buildServiceMock();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    });
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();
  });

  it('shows two-column layout with left and right panels', () => {
    expect(fixture.nativeElement.querySelector('.left-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.right-panel')).toBeTruthy();
  });

  it('renders Name, Category and Tags for each collection card', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Name:');
    expect(text).toContain('Category:');
    expect(text).toContain('Tags:');
    expect(text).toContain('Material Design Icons');
    expect(text).toContain('Tabler Icons');
  });

  it('shows an "Open" button on each collection card', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.open-button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0].textContent.trim()).toBe('Open');
  });

  it('shows 8 preview icon slots per card (icons + placeholders)', () => {
    // IntersectionObserver mock fires immediately → icons load in ngAfterViewInit.
    const cards = fixture.nativeElement.querySelectorAll('.collection-card');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    const previews = firstCard.querySelectorAll('.collection-preview-img');
    const placeholders = firstCard.querySelectorAll('.preview-placeholder');
    expect(previews.length + placeholders.length).toBe(8);
  });

  it('opens a collection and displays its icons in the right panel', async () => {
    const openButton = fixture.nativeElement.querySelector('.open-button');
    openButton.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Material Design Icons - Icons');
    expect(text).toContain('home');
    expect(text).toContain('user');
  });

  it('does nothing when the same collection is opened again', async () => {
    // Open collection once.
    const openButton = fixture.nativeElement.querySelector('.open-button');
    openButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const callCount = iconifyService.getCollectionIcons.mock.calls.length;

    // Click the same button again — should be a no-op.
    openButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(iconifyService.getCollectionIcons).toHaveBeenCalledTimes(callCount);
  });

  it('replaces the right panel when a different collection is opened', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.open-button');
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Material Design Icons - Icons');

    // Reconfigure mock for the second collection.
    iconifyService.getCollectionIcons.mockReturnValue(
      of([{ name: 'circle', category: 'tabler', tags: [], collection: 'tabler' }])
    );
    buttons[1].click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tabler Icons - Icons');
    expect(text).not.toContain('Material Design Icons - Icons');
  });
});

describe('Acceptance criteria 0.0.3', () => {
  it('opens a parameter dialog when an icon is clicked and updates the generated image tag', async () => {
    const iconifyService = buildServiceMock();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const openButton = fixture.nativeElement.querySelector('.open-button');
    openButton.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const iconImage = fixture.nativeElement.querySelector('.right-panel .icon-img');
    iconImage.click();
    fixture.detectChanges();

    const colorInput = fixture.nativeElement.querySelector('[id="icn.color"]') as HTMLInputElement;
    const widthInput = fixture.nativeElement.querySelector('[id="icn.width"]') as HTMLInputElement;
    const flipSelect = fixture.nativeElement.querySelector('[id="icn.flip"]') as HTMLSelectElement;
    const tagText = fixture.nativeElement.querySelector('[id="icn.tagstring"]') as HTMLTextAreaElement;

    colorInput.value = 'blue';
    colorInput.dispatchEvent(new Event('input'));
    widthInput.value = '32';
    widthInput.dispatchEvent(new Event('input'));
    flipSelect.value = 'vertical';
    flipSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(tagText.value).toContain('<img src="https://api.iconify.design/mdi/home.svg?');
    expect(tagText.value).toContain('color=blue');
    expect(tagText.value).toContain('width=32');
    expect(tagText.value).toContain('flip=vertical');
    expect(fixture.nativeElement.textContent).toContain('copy');
    expect(fixture.nativeElement.textContent).toContain('close');
  });
});

describe('Acceptance criteria 1.0.3', () => {
  it('shows a preview square next to the generated tag string and keeps src aligned with the tag', async () => {
    const iconifyService = buildServiceMock();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const openButton = fixture.nativeElement.querySelector('.open-button');
    openButton.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    const iconImage = fixture.nativeElement.querySelector('.right-panel .icon-img');
    iconImage.click();
    fixture.detectChanges();

    const rotateSelect = fixture.nativeElement.querySelector('[id="icn.rotate"]') as HTMLSelectElement;
    rotateSelect.value = '270';
    rotateSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const previewSquare = fixture.nativeElement.querySelector('.preview-square') as HTMLDivElement;
    const previewImage = fixture.nativeElement.querySelector('.preview-square .preview-img') as HTMLImageElement;
    const tagText = fixture.nativeElement.querySelector('[id="icn.tagstring"]') as HTMLTextAreaElement;
    const tagSrc = tagText.value.match(/src="([^"]+)"/)?.[1];

    expect(previewSquare).toBeTruthy();
    expect(previewImage).toBeTruthy();
    expect(tagSrc).toBeTruthy();
    expect(previewImage.getAttribute('src')).toBe(tagSrc);
    expect(tagText.value).toContain('rotate=270');
  });
});
