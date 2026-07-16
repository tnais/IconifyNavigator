import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CollectionCardComponent } from './collection-card.component';
import { IconifyService } from '../../services/iconify.service';

describe('CollectionCardComponent', () => {
  let component: CollectionCardComponent;
  let fixture: ComponentFixture<CollectionCardComponent>;
  let iconifyService: { getCollectionIcons: jest.Mock; getIconUrl: jest.Mock };

  const testCollection = {
    prefix: 'mdi',
    name: 'Material Design Icons',
    category: 'Material',
    tags: ['Precise Shapes'],
    icons: [],
    lastModified: 0
  };

  beforeEach(async () => {
    iconifyService = {
      getCollectionIcons: jest.fn().mockReturnValue(
        of([
          { name: 'home', category: 'mdi', tags: ['house'], collection: 'mdi' },
          { name: 'star', category: 'mdi', tags: ['favorite'], collection: 'mdi' }
        ])
      ),
      getIconUrl: jest.fn().mockImplementation(
        (prefix: string, name: string) => `https://api.iconify.design/${prefix}/${name}.svg`
      )
    };

    await TestBed.configureTestingModule({
      imports: [CollectionCardComponent],
      providers: [{ provide: IconifyService, useValue: iconifyService }]
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionCardComponent);
    component = fixture.componentInstance;
    component.collection = testCollection;
    fixture.detectChanges();
  });

  it('renders collection name, category and tags', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Name:');
    expect(text).toContain('Material Design Icons');
    expect(text).toContain('Category:');
    expect(text).toContain('Material');
    expect(text).toContain('Tags:');
    expect(text).toContain('Precise Shapes');
  });

  it('shows the "Open" button', () => {
    const button = fixture.nativeElement.querySelector('.open-button');
    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Open');
  });

  it('loads preview icons lazily when card enters the viewport', () => {
    // The IntersectionObserver mock fires synchronously, so icons load in ngAfterViewInit.
    expect(iconifyService.getCollectionIcons).toHaveBeenCalledWith('mdi');
    const previews = fixture.nativeElement.querySelectorAll('.collection-preview-img');
    expect(previews.length).toBeGreaterThan(0);
  });

  it('fills remaining preview slots with placeholder boxes', () => {
    // Mock returns 2 icons; 8 - 2 = 6 placeholder boxes expected.
    const placeholders = fixture.nativeElement.querySelectorAll('.preview-placeholder');
    expect(placeholders.length).toBe(6);
  });

  it('emits the collection when "Open" is clicked', () => {
    const emitted: unknown[] = [];
    component.open.subscribe((c) => emitted.push(c));

    fixture.nativeElement.querySelector('.open-button').click();
    expect(emitted).toEqual([testCollection]);
  });
});
