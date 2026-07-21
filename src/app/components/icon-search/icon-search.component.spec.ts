import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconSearchComponent } from './icon-search.component';

describe('IconSearchComponent', () => {
  let component: IconSearchComponent;
  let fixture: ComponentFixture<IconSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconSearchComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses attribute names as labels', () => {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('label')).map((label: any) =>
      label.textContent.trim()
    );
    expect(labels).toEqual(['name', 'category', 'icon set', 'tags']);
  });

  it('emits parsed search options', () => {
    const emitSpy = jest.spyOn(component.search, 'emit');
    component.searchForm.setValue({
      name: 'home',
      category: 'building',
      collectionName: 'material',
      tagsInput: 'house, outline'
    });
    component.onSearch();
    expect(emitSpy).toHaveBeenCalledWith({
      name: 'home',
      category: 'building',
      collectionName: 'material',
      tags: ['house', 'outline']
    });
  });
});
