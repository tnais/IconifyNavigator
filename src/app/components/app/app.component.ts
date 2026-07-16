import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IconifyService } from '../../services/iconify.service';
import { IconCollection } from '../../models/icon.model';
import { IconBrowserComponent } from '../icon-browser/icon-browser.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, IconBrowserComponent],
  template: `
    <div class="container">
      <header>
        <h1>Iconify Navigator</h1>
        <p>Search Iconify icons by name, category and tags</p>
      </header>

      <main>
        <p *ngIf="loading">Initializing...</p>
        <p *ngIf="error" class="error">{{ error }}</p>
        <app-icon-browser *ngIf="!loading && !error" [collections]="collections"></app-icon-browser>
      </main>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 20px;
      }
      header {
        margin-bottom: 20px;
      }
      .error {
        color: #b00020;
      }
    `
  ]
})
export class AppComponent implements OnInit {
  /** True while initialize() is running; hides the browser and shows a spinner. */
  loading = true;

  /** Populated if initialization fails; displayed as an error banner to the user. */
  error: string | null = null;

  /** Full list of available icon collections fetched from the Iconify server. */
  collections: IconCollection[] = [];

  constructor(private iconifyService: IconifyService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    void this.initialize();
  }

  /**
   * Loads the Iconify server URL and the list of available collections.
   * On success the icon browser is revealed; on failure an error message is shown.
   * The finally block ensures the loading flag is cleared regardless of outcome
   * and that the OnPush component re-renders via markForCheck + ngZone.run.
   */
  private async initialize(): Promise<void> {
    try {
      await this.iconifyService.initialize();
      this.collections = await firstValueFrom(this.iconifyService.getCollections());
      this.error = null;
    } catch (error: any) {
      this.error = error?.message || 'Initialization failed';
    } finally {
      this.loading = false;
      // ngZone.run ensures the OnPush change detection cycle runs after this async operation.
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
    }
  }
}
