import { Component, input, output } from '@angular/core';
import { DragPayload, Item, SlotAddress, TeamUnit, TeamZone, Unit } from '../../core/models';
import { TeamSlotComponent } from './team-slot.component';

@Component({
  selector: 'app-team-area',
  standalone: true,
  imports: [TeamSlotComponent],
  template: `
    @if (zone() === 'board') {
      <div class="board" role="group" aria-label="Terrain : quatre rangées de sept hexagones">
        @for (row of rows; track row) {
          <div class="board-row" [class.offset]="row % 2 === 1">
            @for (column of columns; track column) {
              @let index = row * 7 + column;
              @let entry = slots()[index];
              <app-team-slot [address]="{ zone: 'board', index }" [entry]="entry"
                [unit]="entry ? units().get(entry.unit_id) ?? null : null" [items]="items()"
                [isSelected]="selected()?.zone === 'board' && selected()?.index === index"
                (slotSelected)="slotSelected.emit($event)" (slotRemoved)="slotRemoved.emit($event)"
                (dropped)="dropped.emit($event)" />
            }
          </div>
        }
      </div>
    } @else {
      <div class="bench" role="group" aria-label="Banc : neuf emplacements">
        @for (entry of slots(); track $index) {
          <app-team-slot [address]="{ zone: 'bench', index: $index }" [entry]="entry"
            [unit]="entry ? units().get(entry.unit_id) ?? null : null" [items]="items()"
            [isSelected]="selected()?.zone === 'bench' && selected()?.index === $index"
            (slotSelected)="slotSelected.emit($event)" (slotRemoved)="slotRemoved.emit($event)"
            (dropped)="dropped.emit($event)" />
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .board {
      --hex-width: clamp(42px, 6.1vw, 78px);
      --hex-height: calc(var(--hex-width) * 1.154700538);
      --gap: 5px;
      width: calc(var(--hex-width) * 7.5 + var(--gap) * 6.5);
      margin: auto; padding-bottom: calc(var(--hex-height) * .25);
    }
    .board-row { display: flex; gap: var(--gap); height: calc(var(--hex-height) * .75 + var(--gap)); }
    .board-row.offset { margin-left: calc((var(--hex-width) + var(--gap)) / 2); }
    .board-row app-team-slot { width: var(--hex-width); height: var(--hex-height); flex-shrink: 0; }
    .bench { display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 8px; }
    .bench app-team-slot { width: 100%; aspect-ratio: 1; max-width: 72px; margin: auto; }
    @media (max-width: 1050px) { .board { --hex-width: clamp(35px, 5.3vw, 64px); } }
    @media (max-width: 850px) { .board { --hex-width: clamp(39px, 8.5vw, 68px); } }
    @media (max-width: 480px) { .board { --hex-width: calc((100vw - 75px) / 7.5); --gap: 3px; } .bench { gap: 4px; } }
  `,
})
export class TeamAreaComponent {
  readonly zone = input.required<TeamZone>();
  readonly slots = input.required<(TeamUnit | null)[]>();
  readonly units = input.required<Map<number, Unit>>();
  readonly items = input.required<Map<string, Item>>();
  readonly selected = input<SlotAddress | null>(null);
  readonly slotSelected = output<SlotAddress>();
  readonly slotRemoved = output<SlotAddress>();
  readonly dropped = output<{ address: SlotAddress; payload: DragPayload }>();
  readonly rows = [0, 1, 2, 3];
  readonly columns = [0, 1, 2, 3, 4, 5, 6];
}
