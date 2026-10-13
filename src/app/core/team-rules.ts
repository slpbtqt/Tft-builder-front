import { Build, SlotAddress, TeamState, TeamUnit, Trait, TraitCount, UnitTrait } from './models';

export const BOARD_SIZE = 28;
export const BENCH_SIZE = 9;

export function emptyTeam(level = 8): TeamState {
  return { board: Array(BOARD_SIZE).fill(null), bench: Array(BENCH_SIZE).fill(null), level };
}

export function newTeamUnit(unit_id: number): TeamUnit {
  return { unit_id, stars: 1, item1_id: null, item2_id: null, item3_id: null };
}

export function itemIds(unit: Pick<Build, 'item1_id' | 'item2_id' | 'item3_id'>): string[] {
  return [unit.item1_id, unit.item2_id, unit.item3_id].filter((id): id is string => id !== null);
}

/** Match schema.sql's chk_item_item_order before any future persistence to build. */
export function withItems(unit: TeamUnit, ids: string[]): TeamUnit {
  const ordered = [...ids].sort();
  return {
    ...unit,
    item1_id: ordered[0] ?? null,
    item2_id: ordered[1] ?? null,
    item3_id: ordered[2] ?? null,
  };
}

export function boardCount(state: TeamState): number {
  return state.board.filter(Boolean).length;
}

/** Swap occupied slots; enforce level only when the move adds a unit to the board. */
export function moveUnit(state: TeamState, from: SlotAddress, to: SlotAddress): TeamState | null {
  const moving = state[from.zone][from.index];
  if (!moving) return null;
  const target = state[to.zone][to.index];
  if (from.zone === 'bench' && to.zone === 'board' && !target && boardCount(state) >= state.level) {
    return null;
  }
  const next = structuredClone(state);
  next[from.zone][from.index] = target;
  next[to.zone][to.index] = moving;
  return next;
}

/** Only board units count towards traits; duplicate copies and duplicate links count once. */
export function traitCounts(state: TeamState, traits: Trait[], links: UnitTrait[]): TraitCount[] {
  const unitIds = new Set(state.board.flatMap(unit => unit ? [unit.unit_id] : []));
  const members = new Map<string, Set<number>>();
  for (const link of links) {
    if (!unitIds.has(link.unit_id)) continue;
    if (!members.has(link.trait_id)) members.set(link.trait_id, new Set());
    members.get(link.trait_id)!.add(link.unit_id);
  }
  return traits.filter(trait => members.has(trait.id))
    .map(trait => ({ trait, count: members.get(trait.id)!.size }))
    .sort((left, right) => right.count - left.count || left.trait.name.localeCompare(right.trait.name));
}
