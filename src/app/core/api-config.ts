import { InjectionToken } from '@angular/core';

declare global {
  interface Window { TFT_CONFIG?: { apiBaseUrl?: string }; }
}

/** Edit public/config.js to change the server without rebuilding Angular. */
export const API_BASE_URL = new InjectionToken<string>('TFT API base URL', {
  providedIn: 'root',
  factory: () => (window.TFT_CONFIG?.apiBaseUrl ?? '/api').replace(/\/$/, ''),
});

/** Routes are grouped here so they can follow future Spring controller mappings. */
export const API_ROUTES = {
  unit: '/unit',
  item: '/item',
  trait: '/trait',
  unit_trait: '/unit_trait',
  build: '/build',
  comp: '/comp',
} as const;
