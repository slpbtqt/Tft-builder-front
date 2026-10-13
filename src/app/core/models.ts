/** Domain rows use the exact names and ID types from the Java repository's schema.sql. */
export interface Unit {
  id: number;
  name: string;
  image_link: string | null;
}

export interface Item {
  id: string;
  name: string;
  image_link: string | null;
  component1_id: string | null;
  component2_id: string | null;
}

export interface Trait {
  id: string;
  name: string;
  image_link: string | null;
}

export interface UnitTrait {
  id: number;
  unit_id: number;
  trait_id: string;
}

export interface Build {
  id: number;
  avg_placement: number | null;
  unit_id: number;
  item1_id: string | null;
  item2_id: string | null;
  item3_id: string | null;
  stars: number | null;
}

export interface Comp {
  id: number;
  name: string | null;
  avg_placement: number | null;
  win_rate: number | null;
  difficulty: number | null;
  levelling: string | null;
  build_id: number | null;
}

/** API projection, not a new database row. A full meta team needs several builds. */
export interface MetaComp {
  comp: Comp;
  builds: Build[];
  isComplete: boolean;
}

/** Unsaved placement: do not invent a database build.id for a unit on the board. */
export interface TeamUnit {
  unit_id: number;
  stars: 1 | 2 | 3;
  item1_id: string | null;
  item2_id: string | null;
  item3_id: string | null;
}

export type TeamZone = 'board' | 'bench';
export interface SlotAddress { zone: TeamZone; index: number; }
export interface TeamState {
  board: (TeamUnit | null)[];
  bench: (TeamUnit | null)[];
  level: number;
}

export interface TraitCount { trait: Trait; count: number; }
export interface CompMatch {
  metaComp: MetaComp;
  score: number;
  matchedUnitIds: number[];
  missingUnitIds: number[];
  matchedItems: number;
  requiredItems: number;
}

export interface Catalog {
  units: Unit[];
  items: Item[];
  traits: Trait[];
  unitTraits: UnitTrait[];
  builds: Build[];
  comps: MetaComp[];
}

export interface CatalogIssue { resource: string; message: string; }
export const EMPTY_CATALOG: Catalog = {
  units: [], items: [], traits: [], unitTraits: [], builds: [], comps: [],
};

export type DragPayload =
  | { kind: 'unit'; unit_id: number }
  | { kind: 'item'; item_id: string }
  | { kind: 'placement'; from: SlotAddress };
