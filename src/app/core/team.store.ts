import { Injectable, computed, signal } from '@angular/core';
import { Item, SlotAddress, TeamState, TeamUnit, TeamZone } from './models';
import { isSlotAddress } from './drag-data';
import { boardCount, emptyTeam, itemIds, moveUnit, newTeamUnit, withItems } from './team-rules';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  readonly state = signal<TeamState>(emptyTeam());
  readonly selected = signal<SlotAddress | null>(null);
  readonly version = signal(0);
  private readonly history = signal<TeamState[]>([]);
  private readonly future = signal<TeamState[]>([]);

  readonly boardCount = computed(() => boardCount(this.state()));
  readonly benchCount = computed(() => this.state().bench.filter(Boolean).length);
  readonly ownedCount = computed(() => this.boardCount() + this.benchCount());
  readonly canUndo = computed(() => this.history().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  readonly selectedUnit = computed(() => this.get(this.selected()));

  get(address: SlotAddress | null): TeamUnit | null {
    return address && isSlotAddress(address) ? this.state()[address.zone][address.index] : null;
  }

  select(address: SlotAddress): void {
    this.selected.set(this.get(address) ? address : null);
  }

  add(unit_id: number, zone: TeamZone): string | null {
    const index = this.state()[zone].findIndex(unit => unit === null);
    if (index < 0) return zone === 'bench' ? 'Le banc est plein.' : 'Le terrain est plein.';
    return this.place(unit_id, { zone, index });
  }

  place(unit_id: number, address: SlotAddress): string | null {
    if (!isSlotAddress(address)) return 'Emplacement invalide.';
    if (this.get(address)) return 'Cette case est occupée. Déplacez le champion ou choisissez une case libre.';
    if (address.zone === 'board' && this.boardCount() >= this.state().level) {
      return 'Le terrain a atteint sa limite. Augmentez le niveau ou déplacez un champion sur le banc.';
    }
    const next = structuredClone(this.state());
    next[address.zone][address.index] = newTeamUnit(unit_id);
    this.commit(next);
    this.selected.set(address);
    return null;
  }

  move(from: SlotAddress, to: SlotAddress): string | null {
    if (!isSlotAddress(from) || !isSlotAddress(to)) return 'Emplacement invalide.';
    if (from.zone === to.zone && from.index === to.index) return null;
    const next = moveUnit(this.state(), from, to);
    if (!next) return 'Déplacement impossible : le terrain est plein ou le champion a été retiré.';
    this.commit(next);
    this.selected.set(to);
    return null;
  }

  moveSelectedTo(zone: TeamZone): string | null {
    const from = this.selected();
    if (!from) return 'Sélectionnez un champion.';
    const index = this.state()[zone].findIndex(unit => unit === null);
    if (index < 0) return zone === 'bench' ? 'Le banc est plein.' : 'Le terrain est plein.';
    return this.move(from, { zone, index });
  }

  setLevel(level: number): string | null {
    if (!Number.isInteger(level) || level < 1 || level > 10) return 'Le niveau doit être compris entre 1 et 10.';
    if (level < this.boardCount()) return 'Placez des champions sur le banc avant de réduire le niveau.';
    if (level === this.state().level) return null;
    this.commit({ ...this.state(), level });
    return null;
  }

  setStars(stars: 1 | 2 | 3): void {
    const address = this.selected();
    const unit = this.get(address);
    if (address && unit && stars !== unit.stars) this.replace(address, { ...unit, stars });
  }

  equip(item: Item, address = this.selected()): string | null {
    const unit = this.get(address);
    if (!address || !unit) return 'Sélectionnez un champion sur le terrain ou sur le banc.';
    const equipped = itemIds(unit);
    if (equipped.length >= 3) return 'Ce champion possède déjà trois objets. Retirez-en un pour continuer.';
    this.replace(address, withItems(unit, [...equipped, item.id]));
    this.selected.set(address);
    return null;
  }

  removeItem(index: number): void {
    const address = this.selected();
    const unit = this.get(address);
    if (address && unit) this.replace(address, withItems(unit, itemIds(unit).filter((_, i) => i !== index)));
  }

  remove(address = this.selected()): void {
    if (!address || !this.get(address)) return;
    this.replace(address, null);
    if (this.selected()?.zone === address.zone && this.selected()?.index === address.index) {
      this.selected.set(null);
    }
  }

  clear(): void {
    if (!this.ownedCount()) return;
    this.commit(emptyTeam(this.state().level));
    this.selected.set(null);
  }

  undo(): void {
    const previous = this.history().at(-1);
    if (!previous) return;
    this.future.update(states => [...states, structuredClone(this.state())]);
    this.history.update(states => states.slice(0, -1));
    this.restore(previous);
  }

  redo(): void {
    const next = this.future().at(-1);
    if (!next) return;
    this.history.update(states => [...states, structuredClone(this.state())]);
    this.future.update(states => states.slice(0, -1));
    this.restore(next);
  }

  /** A catalog refresh must not leave placements pointing to deleted DB rows. */
  reconcile(unitIds: Set<number>, itemIdsInCatalog: Set<string>): void {
    const next = structuredClone(this.state());
    let changed = false;
    for (const zone of ['board', 'bench'] as const) {
      next[zone] = next[zone].map(unit => {
        if (!unit) return null;
        if (!unitIds.has(unit.unit_id)) { changed = true; return null; }
        const equipped = itemIds(unit);
        const validItems = equipped.filter(id => itemIdsInCatalog.has(id));
        if (equipped.length !== validItems.length) changed = true;
        return withItems(unit, validItems);
      });
    }
    if (changed) {
      this.history.set([]);
      this.future.set([]);
      this.restore(next);
    }
  }

  private replace(address: SlotAddress, unit: TeamUnit | null): void {
    const next = structuredClone(this.state());
    next[address.zone][address.index] = unit;
    this.commit(next);
  }

  private commit(state: TeamState): void {
    this.history.update(states => [...states.slice(-49), structuredClone(this.state())]);
    this.future.set([]);
    this.restore(state);
  }

  private restore(state: TeamState): void {
    this.state.set(structuredClone(state));
    this.version.update(version => version + 1);
    if (!this.get(this.selected())) this.selected.set(null);
  }
}
