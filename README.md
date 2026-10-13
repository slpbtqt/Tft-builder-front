# Hexforge · TFT Angular frontend

An Angular 20 frontend for the [`tft-team-builder` Java project](https://github.com/3lW30N/tft-team-builder), with an Arcane-inspired interface, a 28-hex board, and free champion item selection.

## Run locally

Requires Node.js 20.19+, 22.12+, or 24+ and npm.

```bash
git clone https://github.com/3lW30N/tft-team-builder-frontend.git
cd tft-team-builder-frontend
npm ci
npm start
```

Open `http://localhost:4200`. The development server proxies `/api/**` to `http://localhost:8080` through `proxy.conf.json`.

```bash
npm run check
npm test
npm run build
```

The production files are emitted directly into `dist/`. Copy the **contents** of `dist/` to Spring Boot's `src/main/resources/static/` to serve the Angular app from the Java origin. Do not commit `node_modules/` or `.angular/`.

## Included workflows

- Click a champion to add them automatically, or drag them onto any board hex.
- Drag an existing champion to move or swap them. Right-click or press Delete to remove one.
- Select a champion to change their stars, equip or remove items, or use a suggested build.
- The three-item limit, unique item rules, and Thief's Gloves restrictions are enforced.
- Hover or focus an item to view its description and component recipe.
- Trait counts consider unique champions, with the catalog's actual trait breakpoints.
- Search and filter champions by cost or trait, and items by component/completed type.
- Load example compositions and filter them by tier, strategy, or trait.
- Undo/redo board edits using the toolbar or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
- Auto-save the draft and save named compositions locally in the current browser.
- Share a URL containing positions, stars, and equipped items, or export the build as JSON.
- Layouts adapt to desktop, tablet, and mobile; touch users can add champions and items by clicking.

## Demo and live data

The Java repository currently has data entities and unfinished endpoint scaffolding; it does **not** expose usable champion, composition, trait, or item GET endpoints. The frontend therefore starts with a clearly labeled historical Set 13 / Into the Arcane catalog from patch 14.24. Its composition examples and tier labels are illustrative, with no invented performance metrics. This is not a claim about the current TFT meta.

The frontend can switch to a live catalog via **About & help → Connect backend**. Add the read-only endpoint described in [API-CONTRACT.md](./API-CONTRACT.md) to the Java service. `src/app/game-api.service.ts` is the single integration point. The Java service should fetch and normalize MetaTFT data server-side and return a complete catalog. Keep MetaTFT credentials on the server.

For a separately hosted frontend, reverse-proxy `/api/` to your Java service; the standalone static preview has no Java service attached. Live catalogs should include matching champions, items, traits, compositions, set name, and patch. Local saves are separated between demo mode and each live set/patch.

## Code map

| File | Purpose |
| --- | --- |
| `src/app/app.component.*` | Signals-based Angular UI and user interactions |
| `src/app/build-state.ts` | Shared-build validation, trait counting, and item rules |
| `src/app/models.ts` | Typed frontend and API models |
| `src/app/game-api.service.ts` | Java catalog integration |
| `src/app/game-data.json` | Historical demo catalog |
| `src/app/compositions.ts` | Example compositions |
| `tests/build-state.test.mjs` | Business-rule tests |
| `public/assets/` | Locally bundled Riot portraits, item/trait art, hero image, and fonts |

## Assets

The historical catalog and TFT images come from [CommunityDragon's 14.24 data](https://raw.communitydragon.org/14.24/cdragon/tft/en_us.json). The hero uses Riot's Jinx splash illustration from Data Dragon. All game artwork belongs to Riot Games; Hexforge is an unofficial fan project. Fonts are Inter and Cinzel; UI icons are Lucide.

`npm test` uses Node's built-in test runner and TypeScript's transpiler, without a separate test framework. Browser QA covers board edits, drag-and-drop, item limits, saved builds, draft persistence, URL import, filters, modal accessibility, mobile overflow, and the API failure/success paths.
