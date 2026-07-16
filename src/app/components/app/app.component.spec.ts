import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { IconifyService } from '../../services/iconify.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let iconifyService: {
    initialize: jest.Mock<Promise<void>, []>;
    getCollections: jest.Mock;
    getCollectionIcons: jest.Mock;
    getIconUrl: jest.Mock;
    getServerUrl: jest.Mock;
  };

  beforeEach(async () => {
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
});
