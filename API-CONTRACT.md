# Java frontend integration

## `GET /api/catalog`

This is a **proposed aggregate endpoint**, not an endpoint that already exists in the Java repository. Angular calls it from `GameApiService.loadCatalog()`. It should return the current game catalog and normalized MetaTFT composition results together, so units, items, traits, and rankings always refer to the same set and patch.

```typescript
interface GameCatalog {
  setName: string;                     // e.g. "Into the Arcane"
  patch: string;                       // e.g. "14.24"
  updatedAt?: string;                  // ISO 8601
  champions: Champion[];
  items: Item[];
  traits: Trait[];
  compositions: Composition[];
}
interface Champion {
  id: string;                         // stable ID; matches BoardUnit.championId
  name: string;
  cost: number;
  traits: string[];                   // display names; match Trait.name
  image: string;                      // absolute URL or same-origin asset path
  splash: string;
  health: number;
  attack: number;
  armor: number;
  range: number;
  ability: string;
}
interface Item {
  id: string;                         // stable ID
  name: string;
  image: string;
  components: string[];               // component Item IDs; [] for components
  description: string;                // plain text, with values resolved server-side
  kind: "completed" | "component";
  unique: boolean;                    // maximum one of this item per champion
}
interface Trait {
  id: string;
  name: string;
  image: string;
  thresholds: number[];               // e.g. [3, 5, 7, 10]
}
interface Composition {
  id: string;
  name: string;
  subtitle: string;
  tier: "S" | "A" | "B";
  strategy: string;                   // "Fast 8", "Fast 9", or "Slow roll"
  difficulty: string;                 // "Easy", "Medium", etc.
  tags: string[];                     // Trait names
  carry: string;                      // Champion name
  units: {
    name: string;                     // Champion name
    cell: number;                     // 0..27, row-major: 4 rows × 7 columns
    items?: string[];                 // see item-key note below
  }[];
  avgPlacement?: number;              // absolute average, e.g. 4.12
  winRate?: number;                   // percent 0..100, e.g. 14.5, not 0.145
  top4Rate?: number;                  // percent 0..100
}
```

Item keys in `Composition.units[].items` currently use the suffix of a `TFT_Item_*` ID. For example, `"InfinityEdge"` resolves to `"TFT_Item_InfinityEdge"`. To use another ID scheme, change `itemByKey()` in `app.component.ts` to look up the full ID returned by your API; ensure the composition DTO uses that same scheme. Individual `BoardUnit.items` in saved/shared builds already use full item IDs.

The Java `Comp` model's `avgPlacement`, `winRate`, and `levelling` map to `Composition.avgPlacement`, `Composition.winRate`, and `Composition.strategy`. Its current `Build`/`Unit` relationships do not encode an entire positioned board; use a DTO with the units array above for the frontend rather than serializing recursive JPA entities. Map `imageLink` to `image`. Supply cost, traits, and positions in the DTO.

## Save/share format

```typescript
interface Build {
  name: string;
  level: number;                      // 1..10; UI supports levels 6..10
  board: (BoardUnit | null)[];        // exactly 28 entries; null means empty
}
interface BoardUnit {
  championId: string;
  stars: number;                      // 1, 2, or 3
  items: string[];                    // 0..3 full item IDs
}
```

Named saves are browser-local. A share link uses a `build` query parameter containing base64-encoded UTF-8 JSON. Incoming builds are validated against the active catalog and the champion/item rules. Server persistence or accounts can be added later without changing board semantics.

## Server behavior

Return `application/json`, with all catalog arrays present. Do not forward secrets to the browser. Cache MetaTFT upstream results server-side and normalize their schema before returning it. Angular displays optional performance statistics only when supplied by the live API. It keeps the demo usable when the backend is missing or the response is invalid, and shows a notification.

In development, `proxy.conf.json` forwards `/api` to Spring Boot on port 8080. In production, serving Angular from Spring Boot's static resources needs no CORS configuration; a separate frontend origin needs an `/api` reverse proxy or an explicit API-origin change in `GameApiService` and the corresponding backend CORS policy.
