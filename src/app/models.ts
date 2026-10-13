export interface Champion {
  id: string; name: string; cost: number; traits: string[]; image: string; splash: string;
  health: number; attack: number; armor: number; range: number; ability: string;
}
export interface Item {
  id: string; name: string; image: string; components: string[]; description: string;
  kind: 'completed' | 'component'; unique: boolean;
}
export interface Trait { id: string; name: string; image: string; thresholds: number[]; }
export interface BoardUnit { championId: string; stars: number; items: string[]; }
export interface Build { name: string; level: number; board: (BoardUnit | null)[]; }
export interface SavedBuild extends Build { id: string; savedAt: string; }
export interface Composition {
  id: string; name: string; subtitle: string; tier: 'S' | 'A' | 'B'; strategy: string;
  difficulty: string; tags: string[]; carry: string; units: {name: string; cell: number; items?: string[]}[];
  avgPlacement?: number; winRate?: number; top4Rate?: number;
}
export interface GameCatalog {
  champions: Champion[]; items: Item[]; traits: Trait[]; compositions: Composition[];
  setName: string; patch: string; updatedAt?: string;
}
export interface ActiveTrait extends Trait { count: number; active: number; next: number | null; }
