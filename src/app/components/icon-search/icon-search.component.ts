import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IconSearchOptions } from '../../models/icon.model';

@Component({
  selector: 'app-icon-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="search-form" [formGroup]="searchForm" (ngSubmit)="onSearch()">
      <div>
        <label for="name">name</label>
        <input id="name" formControlName="name" type="text" placeholder="home" />
      </div>

      <div>
        <label for="category">category</label>
        <input id="category" formControlName="category" type="text" placeholder="building" />
      </div>

      <div>
        <label for="tags">tags</label>
        <input id="tags" formControlName="tagsInput" type="text" placeholder="house,outline" />
      </div>

      <div class="actions">
        <button type="submit">Search</button>
        <button type="button" (click)="onReset()">Reset</button>
      </div>
    </form>
  `,
  styles: [
    `
      .search-form {
        display: grid;
        gap: 12px;
        background: var(--bg-surface-muted);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        padding: 16px;
      }
      div {
        display: grid;
        gap: 6px;
      }
      label {
        font-weight: 600;
      }
      input {
        padding: 8px;
        border: 1px solid var(--border-strong);
        border-radius: 4px;
        background: var(--bg-input);
        color: var(--text-primary);
      }
      .actions {
        display: flex;
        gap: 8px;
      }
    `
  ]
})
/** Emits a search event each time the user submits the form or resets it. */
export class IconSearchComponent {
  /** Notifies the parent component whenever a new search or reset is performed. */
  @Output() search = new EventEmitter<IconSearchOptions>();

  /** Reactive form that binds the three filter fields (name, category, tags). */
  searchForm: FormGroup;

  constructor(private fb: FormBuilder) {
    // Build the form with empty defaults; tagsInput holds a comma-separated string
    // that is split into an array before emitting the search event.
    this.searchForm = this.fb.group({
      name: [''],
      category: [''],
      tagsInput: ['']
    });
  }

  /**
   * Reads the form values, converts the comma-separated tagsInput into a string array,
   * and emits the search options to the parent via the search output.
   */
  onSearch(): void {
    const formValue = this.searchForm.value;
    const tags = (formValue.tagsInput || '')
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);

    this.search.emit({
      name: formValue.name || undefined,
      category: formValue.category || undefined,
      tags: tags.length > 0 ? tags : undefined
    });
  }

  /**
   * Clears all form fields and emits an empty search so the parent
   * can reset its results list.
   */
  onReset(): void {
    this.searchForm.reset();
    this.search.emit({});
  }
}
