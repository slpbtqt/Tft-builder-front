import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Synthetic database rows are isolated to tests and never imported by the Angular app.
const output = mkdtempSync(join(tmpdir(), 'tft-core-tests-'));
for (const name of ['models', 'team-rules', 'comp-matcher', 'catalog-adapter', 'drag-data']) {
  const code = ts.transpileModule(readFileSync(`src/app/core/${name}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  writeFileSync(join(output, `${name}.mjs`), code);
}
const load = name => import(pathToFileURL(join(output, `${name}.mjs`)));
const rules = await load('team-rules');
const matcher = await load('comp-matcher');
const adapter = await load('catalog-adapter');
const drag = await load('drag-data');
const units = [1, 2, 3].map(id => ({ id, name: `Unit ${id}`, image_link: null }));
const items = ['a', 'b', 'c'].map(id => ({ id, name: `Item ${id}`, image_link: null, component1_id: null, component2_id: null }));
const build = (unit_id, equipped = [], id = unit_id) => ({
  id, unit_id, avg_placement: null, stars: 2,
  item1_id: equipped[0] ?? null, item2_id: equipped[1] ?? null, item3_id: equipped[2] ?? null,
});
const comp = (id, builds, avg_placement = null) => ({
  comp: { id, name: `Comp ${id}`, avg_placement, win_rate: null, difficulty: null, levelling: null, build_id: null },
  builds, isComplete: true,
});

test('new teams start with 28 empty board hexes and nine empty bench slots', () => {
  const team = rules.emptyTeam();
  assert.equal(team.board.length, 28);
  assert.equal(team.bench.length, 9);
  assert.equal(team.board.filter(Boolean).length + team.bench.filter(Boolean).length, 0);
});

test('bench-to-board movement preserves stars and equipment without mutating the previous state', () => {
  const team = rules.emptyTeam();
  team.bench[4] = { ...rules.newTeamUnit(1), stars: 3, item1_id: 'a', item2_id: 'b' };
  const moved = rules.moveUnit(team, { zone: 'bench', index: 4 }, { zone: 'board', index: 8 });
  assert.deepEqual(moved.board[8], team.bench[4]);
  assert.equal(moved.bench[4], null);
  assert.ok(team.bench[4]);
});

test('full boards reject extra bench units but allow cross-zone swaps', () => {
  const team = rules.emptyTeam(1);
  team.board[0] = rules.newTeamUnit(1);
  team.bench[0] = rules.newTeamUnit(2);
  assert.equal(rules.moveUnit(team, { zone: 'bench', index: 0 }, { zone: 'board', index: 1 }), null);
  const swapped = rules.moveUnit(team, { zone: 'bench', index: 0 }, { zone: 'board', index: 0 });
  assert.equal(swapped.board[0].unit_id, 2);
  assert.equal(swapped.bench[0].unit_id, 1);
});

test('item slots obey the database alphabetical-order constraint', () => {
  const equipped = rules.withItems(rules.newTeamUnit(1), ['c', 'a', 'b']);
  assert.deepEqual(rules.itemIds(equipped), ['a', 'b', 'c']);
  assert.equal(rules.withItems(equipped, ['c', 'a']).item3_id, null);
});

test('traits exclude bench units and deduplicate champion copies and database links', () => {
  const team = rules.emptyTeam();
  team.board[0] = rules.newTeamUnit(1); team.board[1] = rules.newTeamUnit(1);
  team.bench[0] = rules.newTeamUnit(2);
  const trait = { id: 't', name: 'Trait', image_link: null };
  const links = [
    { id: 1, unit_id: 1, trait_id: 't' }, { id: 2, unit_id: 1, trait_id: 't' },
    { id: 3, unit_id: 2, trait_id: 't' },
  ];
  assert.equal(rules.traitCounts(team, [trait], links)[0].count, 1);
});

test('composition matching includes bench champions and reports missing units', () => {
  const team = rules.emptyTeam();
  team.board[0] = rules.newTeamUnit(1); team.bench[0] = rules.newTeamUnit(2);
  const [match] = matcher.closestComps(team, [comp(1, [build(1), build(2), build(3)])], false);
  assert.equal(match.score, 67);
  assert.deepEqual(match.matchedUnitIds, [1, 2]);
  assert.deepEqual(match.missingUnitIds, [3]);
});

test('correct equipment affects proximity and one item cannot satisfy duplicate requirements', () => {
  const team = rules.emptyTeam(); team.board[0] = rules.withItems(rules.newTeamUnit(1), ['a']);
  const matches = matcher.closestComps(team, [comp(1, [build(1, ['a', 'a'])]), comp(2, [build(1, ['b', 'c'])])], true);
  assert.equal(matches[0].metaComp.comp.id, 1);
  assert.equal(matches[0].matchedItems, 1);
  assert.equal(matches[0].score, 90);
  assert.equal(matches[1].score, 80);
  assert.equal(matcher.closestComps(team, [comp(1, [build(1, ['a', 'a'])])], false)[0].score, 100);
});

test('empty inventories, unrelated comps, and incomplete meta teams produce no matches', () => {
  const team = rules.emptyTeam();
  assert.deepEqual(matcher.closestComps(team, [comp(1, [build(1)])], true), []);
  team.board[0] = rules.newTeamUnit(1);
  assert.deepEqual(matcher.closestComps(team, [{ ...comp(1, [build(1)]), isComplete: false }, comp(2, [build(2)])], false), []);
});

test('real avg_placement breaks ties between equal proximity scores', () => {
  const team = rules.emptyTeam(); team.board[0] = rules.newTeamUnit(1);
  const matches = matcher.closestComps(team, [comp(1, [build(1)], 4.3), comp(2, [build(1)], 3.8)], false);
  assert.deepEqual(matches.map(match => match.metaComp.comp.id), [2, 1]);
});

test('SQL and Java JSON normalize to identical database field names and ID types', () => {
  assert.deepEqual(adapter.toUnit({ id: 7, name: 'Unit', imageLink: 'portrait.png' }), { id: 7, name: 'Unit', image_link: 'portrait.png' });
  const item = adapter.toItem({ id: 'c', name: 'Combined', imageLink: null, component1: { id: 'a' }, component2: { id: 'b' } });
  assert.equal(item.component1_id, 'a'); assert.equal(item.component2_id, 'b');
  assert.deepEqual(adapter.toUnitTrait({ id: 2, unit: { id: 1 }, trait: { id: 't' } }), { id: 2, unit_id: 1, trait_id: 't' });
  assert.throws(() => adapter.toUnit({ id: 'TFT13_Unit', name: 'Unit' }), /numérique/);
});

test('a single comp.build_id is never represented as a complete meta team', () => {
  const raw = { ...comp(1, []).comp, build_id: 1 };
  assert.equal(adapter.toMetaComp(raw, [build(1)], units, items).isComplete, false);
  assert.equal(adapter.toMetaComp({ ...raw, build_ids: [1, 2] }, [build(1), build(2)], units, items).isComplete, true);
  assert.equal(adapter.toMetaComp({ ...raw, builds: [build(99)] }, [], units, items).isComplete, false);
  assert.equal(adapter.toMetaComp({ ...raw, build_ids: [404] }, [], units, items).isComplete, false);
});

test('external drag data cannot introduce invalid addresses or malformed payloads', () => {
  const event = payload => ({ dataTransfer: { getData: () => JSON.stringify(payload) } });
  assert.equal(drag.isSlotAddress({ zone: 'bench', index: 9 }), false);
  assert.equal(drag.isSlotAddress({ zone: 'board', index: 27 }), true);
  assert.equal(drag.isSlotAddress({ zone: 'other', index: 0 }), false);
  assert.equal(drag.readDrag(event({ kind: 'placement', from: { zone: 'board', index: 99 } })), null);
  assert.equal(drag.readDrag(event({ kind: 'unit', unit_id: 'string-id' })), null);
  assert.equal(drag.readDrag(event(null)), null);
  assert.deepEqual(drag.readDrag(event({ kind: 'unit', unit_id: 1 })), { kind: 'unit', unit_id: 1 });
});
