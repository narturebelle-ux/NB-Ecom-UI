import { ApplicationConfig, inject, provideEnvironmentInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatIconRegistry } from '@angular/material/icon';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { SeoTitleStrategy } from './services/seo-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    // Lets every <mat-icon>name</mat-icon> use Material Symbols without repeating fontSet.
    provideEnvironmentInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    })
  ]
};
