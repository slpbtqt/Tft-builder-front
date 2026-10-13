import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Item, SlotAddress, TeamUnit, Unit } from '../../core/models';
import { GameImageComponent } from '../../shared/game-image.component';
import { UI_ICONS } from '../../shared/icons';

@Component({
  selector: 'app-unit-inspector', standalone: true,
  imports: [GameImageComponent, LucideAngularModule],
  templateUrl: './unit-inspector.component.html',
  styleUrl: './unit-inspector.component.css',
})
export class UnitInspectorComponent {
  readonly icons = UI_ICONS;
  readonly unit = input<Unit | null>(null);
  readonly entry = input<TeamUnit | null>(null);
  readonly address = input<SlotAddress | null>(null);
  readonly items = input.required<Map<string, Item>>();
  readonly starsChanged = output<1 | 2 | 3>();
  readonly itemRemoved = output<number>();
  readonly chooseItems = output<void>();
  readonly moveToBoard = output<void>();
  readonly moveToBench = output<void>();
  readonly choosePosition = output<void>();
  readonly removeUnit = output<void>();
  readonly starLevels = [1, 2, 3] as const;
  readonly equippedCount = computed(() => this.itemSlots().filter(Boolean).length);
  readonly itemSlots = computed(() => {
    const entry = this.entry();
    if (!entry) return [];
    return [entry.item1_id, entry.item2_id, entry.item3_id]
      .map(id => id ? this.items().get(id) ?? null : null);
  });
}
