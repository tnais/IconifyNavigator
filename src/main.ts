import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/components/app/app.component';

/**
 * IconifyNavigator v1.0.4
 * Main entry point for the Angular application
 *
 * Bootstraps the AppComponent with the required providers:
 * - provideHttpClient(): Enables HttpClient for API communication with Iconify servers
 */
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()]
}).catch((err) => console.error(err));
