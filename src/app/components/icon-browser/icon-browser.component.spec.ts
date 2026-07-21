import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IconBrowserComponent } from './icon-browser.component';
import { IconifyService } from '../../services/iconify.service';

describe('IconBrowserComponent', () => {
  let component: IconBrowserComponent;
  let fixture: ComponentFixture<IconBrowserComponent>;
  let iconifyService: {
    searchIcons: jest.Mock;
    getCollectionIcons: jest.Mock;
    getIconUrl: jest.Mock;
    getServerUrl: jest.Mock;
  };

  const mdi = {
    prefix: 'mdi',
    name: 'Material Design Icons',
    category: 'Material',
    tags: ['Precise Shapes', 'Has Padding'],
    icons: [],
    lastModified: 0
  };

  const tabler = {
    prefix: 'tabler',
    name: 'Tabler Icons',
    category: 'UI 24px',
    tags: ['Precise Shapes'],
    icons: [],
    lastModified: 0
  };

  beforeEach(async () => {
    iconifyService = {
      searchIcons: jest.fn().mockReturnValue(
        of({
          icons: [
            {
              name: 'home',
              category: 'building',
              collectionName: 'Material Design Icons',
              tags: ['house'],
              collection: 'mdi'
            }
          ],
          total: 1,
          search: { name: 'home' }
        })
      ),
      getCollectionIcons: jest.fn().mockReturnValue(
        of([
          {
            name: 'home',
            category: 'mdi',
            collectionName: 'Material Design Icons',
            tags: ['house'],
            collection: 'mdi'
          }
        ])
      ),
      getIconUrl: jest.fn().mockReturnValue('https://api.iconify.design/mdi/home.svg'),
      getServerUrl: jest.fn().mockReturnValue('https://api.iconify.design')
    };

    await TestBed.configureTestingModule({
      imports: [IconBrowserComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    }).compileComponents();

    fixture = TestBed.createComponent(IconBrowserComponent);
    component = fixture.componentInstance;
    component.collections = [mdi, tabler];
    fixture.detectChanges();
  });

  it('renders left panel with collection cards', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Available icon sets');
    expect(text).toContain('Material Design Icons');
    expect(text).toContain('Tabler Icons');
  });

  it('shows an "Open" button for each collection card', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.open-button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('Open');
  });

  it('opens a collection and displays icons in the right panel', async () => {
    component.onOpenCollection(mdi);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.openedCollection).toBe(mdi);
    expect(iconifyService.getCollectionIcons).toHaveBeenCalledWith('mdi');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Material Design Icons - Icons');
    expect(text).toContain('icon set:');
    expect(text).toContain('category:');
  });

  it('renders opened collection icons in scroll-driven batches', async () => {
    iconifyService.getCollectionIcons.mockReturnValue(
      of(
        Array.from({ length: 50 }, (_, index) => ({
          name: `icon-${index + 1}`,
          category: 'mdi',
          collectionName: 'Material Design Icons',
          tags: [`tag-${index + 1}`],
          collection: 'mdi'
        }))
      )
    );

    component.onOpenCollection(mdi);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.right-panel .icon-img').length).toBe(48);

    component.onRightPanelScroll({
      target: {
        scrollTop: 1000,
        clientHeight: 500,
        scrollHeight: 1400
      }
    } as unknown as Event);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.visibleCollectionIcons.length).toBe(50);
    expect(fixture.nativeElement.querySelectorAll('.right-panel .icon-img').length).toBe(50);
  });

  it('does nothing when the same collection is opened twice', () => {
    component.onOpenCollection(mdi);
    // getCollectionIcons may have already been called by CollectionCardComponent (lazy preview);
    // record the count AFTER first onOpenCollection.
    const countAfterFirst = (iconifyService.getCollectionIcons as jest.Mock).mock.calls.length;

    component.onOpenCollection(mdi); // same collection → should be a no-op
    expect(iconifyService.getCollectionIcons).toHaveBeenCalledTimes(countAfterFirst);
  });

  it('replaces the right panel when a different collection is opened', () => {
    component.onOpenCollection(mdi);
    expect(component.openedCollection?.prefix).toBe('mdi');

    component.onOpenCollection(tabler);
    expect(component.openedCollection?.prefix).toBe('tabler');
  });

  it('searches and shows results in the right panel', () => {
    component.onSearch({ name: 'home' });
    expect(iconifyService.searchIcons).toHaveBeenCalledWith({ name: 'home' });
    expect(component.icons.length).toBe(1);
  });

  it('clears the opened collection when a search is performed', () => {
    component.onOpenCollection(mdi);
    expect(component.openedCollection).toBeTruthy();

    component.onSearch({ name: 'home' });
    expect(component.openedCollection).toBeNull();
  });

  it('opens the icon dialog when an icon in the right panel is clicked', async () => {
    component.onOpenCollection(mdi);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const iconImage = fixture.nativeElement.querySelector('.right-panel .icon-img');
    iconImage.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[id="icn.color"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[id="icn.width"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[id="icn.height"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[id="icn.flip"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[id="icn.rotate"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[id="icn.tagstring"]')).toBeTruthy();
  });

  it('updates tag string when dialog fields change', async () => {
    component.onOpenCollection(mdi);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.right-panel .icon-img').click();
    fixture.detectChanges();

    const colorInput = fixture.nativeElement.querySelector('[id="icn.color"]') as HTMLInputElement;
    const widthInput = fixture.nativeElement.querySelector('[id="icn.width"]') as HTMLInputElement;
    const flipSelect = fixture.nativeElement.querySelector('[id="icn.flip"]') as HTMLSelectElement;
    const tagText = fixture.nativeElement.querySelector('[id="icn.tagstring"]') as HTMLTextAreaElement;

    colorInput.value = 'red blue';
    colorInput.dispatchEvent(new Event('input'));
    widthInput.value = '24';
    widthInput.dispatchEvent(new Event('input'));
    flipSelect.value = 'horizontal';
    flipSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(tagText.value).toContain('<img src="https://api.iconify.design/mdi/home.svg?');
    expect(tagText.value).toContain('color=red%20blue');
    expect(tagText.value).toContain('width=24');
    expect(tagText.value).toContain('flip=horizontal');
  });

  it('shows live preview using the same src as the generated img tag', async () => {
    component.onOpenCollection(mdi);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.right-panel .icon-img').click();
    fixture.detectChanges();

    const colorInput = fixture.nativeElement.querySelector('[id="icn.color"]') as HTMLInputElement;
    colorInput.value = '#0f0';
    colorInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const tagText = fixture.nativeElement.querySelector('[id="icn.tagstring"]') as HTMLTextAreaElement;
    const previewImg = fixture.nativeElement.querySelector('.preview-square .preview-img') as HTMLImageElement;
    const expectedSrc = tagText.value.match(/src="([^"]+)"/)?.[1];

    expect(previewImg).toBeTruthy();
    expect(expectedSrc).toBeTruthy();
    expect(previewImg.getAttribute('src')).toBe(expectedSrc);
  });
});
