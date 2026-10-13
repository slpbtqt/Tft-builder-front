import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogService } from './core/catalog.service';
import { TeamStore } from './core/team.store';
import { closestComps } from './core/comp-matcher';
import { traitCounts } from './core/team-rules';
import { CompMatch, DragPayload, Item, SlotAddress, TeamZone, Unit } from './core/models';
import { TeamAreaComponent } from './features/team/team-area.component';
import { UnitInspectorComponent } from './features/team/unit-inspector.component';
import { ChampionLibraryComponent } from './features/library/champion-library.component';
import { CompResultsComponent } from './features/results/comp-results.component';
import { GameImageComponent } from './shared/game-image.component';
import { UI_ICONS } from './shared/icons';

@Component({
  selector: 'app-root', standalone: true,
  imports: [LucideAngularModule, TeamAreaComponent, UnitInspectorComponent,
    ChampionLibraryComponent, CompResultsComponent, GameImageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly icons = UI_ICONS;
  readonly catalog = inject(CatalogService);
  readonly team = inject(TeamStore);
  readonly addTarget = signal<TeamZone>('bench');
  readonly libraryTab = signal<'units' | 'items'>('units');
  readonly includeItems = signal(true);
  readonly movingFrom = signal<SlotAddress | null>(null);
  readonly matches = signal<CompMatch[]>([]);
  readonly calculatedVersion = signal<number | null>(null);
  readonly calculatedWithItems = signal(true);
  readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedUnit = computed(() => {
    const entry = this.team.selectedUnit();
    return entry ? this.catalog.unitsById().get(entry.unit_id) ?? null : null;
  });
  readonly traitCounts = computed(() => traitCounts(this.team.state(),
    this.catalog.catalog().traits, this.catalog.catalog().unitTraits));
  readonly resultsDirty = computed(() => this.calculatedVersion() !== this.team.version()
    || this.calculatedWithItems() !== this.includeItems());
  readonly canCalculate = computed(() => this.team.ownedCount() > 0
    && this.catalog.completeComps().length > 0 && !this.catalog.loading());
  readonly levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor() { void this.reloadCatalog(); }

  async reloadCatalog(): Promise<void> {
    await this.catalog.load();
    // Preserve the user's team through a transient request failure; data is not replaced by mocks.
    if (!this.catalog.issues().some(issue => issue.resource === 'unit' || issue.resource === 'item')) {
      this.team.reconcile(new Set(this.catalog.unitsById().keys()), new Set(this.catalog.itemsById().keys()));
    }
    this.calculatedVersion.set(null);
    this.matches.set([]);
  }

  addUnit(unit: Unit): void {
    this.report(this.team.add(unit.id, this.addTarget()));
  }

  selectSlot(address: SlotAddress): void {
    const from = this.movingFrom();
    if (from) {
      this.report(this.team.move(from, address));
      this.movingFrom.set(null);
    } else this.team.select(address);
  }

  dropAt(event: { address: SlotAddress; payload: DragPayload }): void {
    this.movingFrom.set(null);
    const { address, payload } = event;
    if (payload.kind === 'placement') this.report(this.team.move(payload.from, address));
    if (payload.kind === 'unit' && this.catalog.unitsById().has(payload.unit_id)) {
      this.report(this.team.place(payload.unit_id, address));
    }
    if (payload.kind === 'item') {
      const item = this.catalog.itemsById().get(payload.item_id);
      if (item) this.report(this.team.equip(item, address));
    }
  }

  changeLevel(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.report(this.team.setLevel(Number(select.value)));
    select.value = String(this.team.state().level);
  }

  equip(item: Item): void { this.report(this.team.equip(item)); }

  startMove(): void {
    this.movingFrom.set(this.team.selected());
    this.notify('Cliquez sur une case du terrain ou du banc. Une case occupée échangera les champions.');
  }

  moveSelectedTo(zone: TeamZone): void {
    this.movingFrom.set(null);
    this.report(this.team.moveSelectedTo(zone));
  }

  calculate(): void {
    if (!this.canCalculate()) return;
    this.matches.set(closestComps(this.team.state(), this.catalog.completeComps(), this.includeItems()));
    this.calculatedVersion.set(this.team.version());
    this.calculatedWithItems.set(this.includeItems());
    this.scrollToResults();
  }

  scrollToResults(): void {
    document.getElementById('meta-results')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  private report(message: string | null): void { if (message) this.notify(message); }

  private notify(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(''), 5000);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.movingFrom.set(null); this.toast.set(''); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.movingFrom.set(null);
      event.shiftKey ? this.team.redo() : this.team.undo();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.movingFrom.set(null);
      this.team.remove();
    }
  }
}
