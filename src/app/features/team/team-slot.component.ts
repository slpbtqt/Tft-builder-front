import { Component, computed, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DragPayload, Item, SlotAddress, TeamUnit, Unit } from '../../core/models';
import { itemIds } from '../../core/team-rules';
import { readDrag, writeDrag } from '../../core/drag-data';
import { GameImageComponent } from '../../shared/game-image.component';
import { UI_ICONS } from '../../shared/icons';

@Component({
  selector: 'app-team-slot',
  standalone: true,
  imports: [GameImageComponent, LucideAngularModule],
  template: `
    <div class="slot" [class.hex]="address().zone === 'board'"
         [class.square]="address().zone === 'bench'" [class.filled]="entry()"
         [class.selected]="isSelected()" [class.drop-target]="dragOver()"
         (dragover)="$event.preventDefault(); dragOver.set(true)"
         (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
      <button class="slot-button" [attr.aria-label]="label()"
              [attr.aria-pressed]="isSelected()" [draggable]="!!entry()"
              (click)="slotSelected.emit(address())" (dragstart)="onDrag($event)"
              (contextmenu)="$event.preventDefault(); slotRemoved.emit(address())">
        <span class="slot-border"></span>
        <span class="slot-inner">
          @if (entry() && unit()) {
            <app-game-image [imageLink]="unit()!.image_link" [label]="unit()!.name" />
            <span class="portrait-shade"></span>
          } @else {
            <lucide-icon [img]="icons.Plus" [size]="18" class="empty-plus" />
          }
        </span>
        @if (entry()) {
          <span class="stars">{{ '★'.repeat(entry()!.stars) }}</span>
          <span class="unit-name">{{ unit()?.name }}</span>
        }
      </button>
      @if (equippedItems().length) {
        <div class="equipped-items">
          @for (item of equippedItems(); track $index) {
            <span class="mini-item" [title]="item.name">
              <app-game-image [imageLink]="item.image_link" [label]="item.name" />
            </span>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './team-slot.component.css',
})
export class TeamSlotComponent {
  readonly icons = UI_ICONS;
  readonly address = input.required<SlotAddress>();
  readonly entry = input<TeamUnit | null>(null);
  readonly unit = input<Unit | null>(null);
  readonly items = input.required<Map<string, Item>>();
  readonly isSelected = input(false);
  readonly slotSelected = output<SlotAddress>();
  readonly slotRemoved = output<SlotAddress>();
  readonly dropped = output<{ address: SlotAddress; payload: DragPayload }>();
  readonly dragOver = signal(false);

  readonly equippedItems = computed(() => this.entry()
    ? itemIds(this.entry()!).flatMap(id => this.items().has(id) ? [this.items().get(id)!] : []) : []);
  readonly label = computed(() => {
    const zone = this.address().zone === 'board' ? 'terrain' : 'banc';
    return `${this.unit()?.name ?? 'Case libre'}, ${zone}, emplacement ${this.address().index + 1}`;
  });

  onDrag(event: DragEvent): void {
    if (this.entry()) writeDrag(event, { kind: 'placement', from: this.address() });
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const payload = readDrag(event);
    if (payload) this.dropped.emit({ address: this.address(), payload });
  }
}
