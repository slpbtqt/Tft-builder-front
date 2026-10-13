import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, API_ROUTES } from './api-config';
import { rows, toBuild, toItem, toMetaComp, toTrait, toUnit, toUnitTrait } from './catalog-adapter';
import { Catalog, CatalogIssue, EMPTY_CATALOG } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  readonly catalog = signal<Catalog>(EMPTY_CATALOG);
  readonly loading = signal(false);
  readonly issues = signal<CatalogIssue[]>([]);
  readonly loaded = signal(false);
  readonly unitsById = computed(() => new Map(this.catalog().units.map(unit => [unit.id, unit])));
  readonly itemsById = computed(() => new Map(this.catalog().items.map(item => [item.id, item])));
  readonly completeComps = computed(() => this.catalog().comps.filter(comp => comp.isComplete));

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.issues.set([]);
    const issues: CatalogIssue[] = [];

    // Independent table requests keep the champion library usable if another route fails.
    const [units, items, traits, unitTraits, builds, compRows] = await Promise.all([
      this.list('unit', toUnit, issues),
      this.list('item', toItem, issues),
      this.list('trait', toTrait, issues),
      this.list('unit_trait', toUnitTrait, issues),
      this.list('build', toBuild, issues),
      this.list('comp', value => value, issues),
    ]);

    const comps = compRows.flatMap(value => {
      try { return [toMetaComp(value, builds, units, items)]; }
      catch { issues.push({ resource: 'comp', message: 'Une composition contient des données invalides.' }); return []; }
    });

    this.catalog.set({ units, items, traits, unitTraits, builds, comps });
    this.issues.set(issues);
    this.loaded.set(true);
    this.loading.set(false);
  }

  private async list<T>(
    resource: keyof typeof API_ROUTES,
    adapt: (value: unknown) => T,
    issues: CatalogIssue[],
  ): Promise<T[]> {
    try {
      const response = await firstValueFrom(this.http.get<unknown>(
        `${this.baseUrl}${API_ROUTES[resource]}`, { timeout: 10000 },
      ));
      return rows(response).map(adapt);
    } catch (error) {
      const message = error instanceof HttpErrorResponse
        ? `HTTP ${error.status || 'connexion impossible'}`
        : 'Réponse incompatible avec le schéma attendu';
      issues.push({ resource, message });
      return [];
    }
  }
}
