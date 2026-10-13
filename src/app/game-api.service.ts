import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GameCatalog } from './models';

@Injectable({providedIn:'root'})
export class GameApiService {
  private readonly http = inject(HttpClient);
  // The Java service owns MetaTFT credentials. Never call MetaTFT with a browser-side secret.
  loadCatalog(): Promise<GameCatalog> {
    return firstValueFrom(this.http.get<GameCatalog>('/api/catalog', {timeout:10000}));
  }
}
