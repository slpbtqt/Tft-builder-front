import { Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CompMatch, Item, Unit } from '../../core/models';
import { GameImageComponent } from '../../shared/game-image.component';
import { UI_ICONS } from '../../shared/icons';

@Component({
  selector: 'app-comp-results', standalone: true,
  imports: [GameImageComponent, LucideAngularModule],
  templateUrl: './comp-results.component.html',
  styleUrl: './comp-results.component.css',
})
export class CompResultsComponent {
  readonly icons = UI_ICONS;
  readonly matches = input.required<CompMatch[]>();
  readonly units = input.required<Map<number, Unit>>();
  readonly items = input.required<Map<string, Item>>();
  readonly calculated = input(false);
  readonly dirty = input(false);
  readonly catalogReady = input(false);
  readonly includeItems = input(true);
  readonly limit = signal(5);
  readonly expandedId = signal<number | null>(null);
  readonly visibleMatches = computed(() => this.matches().slice(0, this.limit()));

  showMore(): void {
    this.limit.update(value => value + 5);
  }

  toggleDetails(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  stat(value: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
  }
}
