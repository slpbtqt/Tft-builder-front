import { Component, computed, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Item, Trait, Unit, UnitTrait } from '../../core/models';
import { writeDrag } from '../../core/drag-data';
import { GameImageComponent } from '../../shared/game-image.component';
import { UI_ICONS } from '../../shared/icons';

@Component({
  selector: 'app-champion-library',
  standalone: true,
  imports: [GameImageComponent, LucideAngularModule],
  templateUrl: './champion-library.component.html',
  styleUrl: './champion-library.component.css',
})
export class ChampionLibraryComponent {
  readonly icons = UI_ICONS;
  readonly itemKinds = [
    { value: 'all', label: 'Tous' },
    { value: 'completed', label: 'Objets complets' },
    { value: 'component', label: 'Composants' },
  ] as const;
  readonly units = input.required<Unit[]>();
  readonly items = input.required<Item[]>();
  readonly traits = input.required<Trait[]>();
  readonly unitTraits = input.required<UnitTrait[]>();
  readonly loading = input(false);
  readonly tab = input<'units' | 'items'>('units');
  readonly tabChanged = output<'units' | 'items'>();
  readonly unitPicked = output<Unit>();
  readonly itemPicked = output<Item>();
  readonly search = signal('');
  readonly traitId = signal('');
  readonly itemKind = signal<'all' | 'completed' | 'component'>('all');
  readonly hoveredItem = signal<Item | null>(null);

  readonly filteredUnits = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const allowed = new Set(this.unitTraits()
      .filter(link => link.trait_id === this.traitId()).map(link => link.unit_id));
    return this.units().filter(unit => (!this.traitId() || allowed.has(unit.id))
      && unit.name.toLocaleLowerCase().includes(search));
  });

  readonly filteredItems = computed(() => this.items().filter(item => {
    const completed = !!(item.component1_id || item.component2_id);
    return item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())
      && (this.itemKind() === 'all' || (this.itemKind() === 'completed') === completed);
  }));

  switchTab(tab: 'units' | 'items'): void {
    this.search.set('');
    this.hoveredItem.set(null);
    this.tabChanged.emit(tab);
  }

  traitsFor(unit_id: number): string {
    const ids = new Set(this.unitTraits().filter(link => link.unit_id === unit_id).map(link => link.trait_id));
    return this.traits().filter(trait => ids.has(trait.id)).map(trait => trait.name).join(' · ');
  }

  components(item: Item): Item[] {
    return [item.component1_id, item.component2_id].flatMap(id => {
      const component = this.items().find(candidate => candidate.id === id);
      return component ? [component] : [];
    });
  }

  startUnitDrag(event: DragEvent, unit: Unit): void {
    writeDrag(event, { kind: 'unit', unit_id: unit.id });
  }

  startItemDrag(event: DragEvent, item: Item): void {
    writeDrag(event, { kind: 'item', item_id: item.id });
  }

  clearFilters(): void {
    this.search.set('');
    this.traitId.set('');
    this.itemKind.set('all');
  }
}
