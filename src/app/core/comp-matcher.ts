import { Build, CompMatch, MetaComp, TeamState, TeamUnit } from './models';
import { itemIds } from './team-rules';

export const MATCH_WEIGHTS = { champions: 0.8, items: 0.2 } as const;

function commonItems(required: string[], equipped: string[]): number {
  const remaining = [...equipped];
  let matches = 0;
  for (const id of required) {
    const index = remaining.indexOf(id);
    if (index < 0) continue;
    matches += 1;
    remaining.splice(index, 1);
  }
  return matches;
}

/**
 * Owned units = board + bench. Duplicate copies cannot inflate champion coverage.
 * With item comparison: 80% champion coverage + 20% correct items on the correct unit.
 * Without required items (or when disabled): 100% champion coverage.
 * Actual avg_placement breaks ties; no tier or meta statistic is fabricated.
 */
export function closestComps(state: TeamState, comps: MetaComp[], includeItems: boolean): CompMatch[] {
  const owned = [...state.board, ...state.bench].filter((unit): unit is TeamUnit => unit !== null);
  const ownedIds = new Set(owned.map(unit => unit.unit_id));
  if (!ownedIds.size) return [];

  return comps.filter(meta => meta.isComplete && meta.builds.length > 0).map(metaComp => {
    const uniqueBuilds = new Map<number, Build>();
    for (const build of metaComp.builds) {
      if (!uniqueBuilds.has(build.unit_id)) uniqueBuilds.set(build.unit_id, build);
    }
    const targets = [...uniqueBuilds.values()];
    const matchedUnitIds = targets.filter(build => ownedIds.has(build.unit_id)).map(build => build.unit_id);
    const missingUnitIds = targets.filter(build => !ownedIds.has(build.unit_id)).map(build => build.unit_id);
    let matchedItems = 0;
    let requiredItems = 0;

    for (const build of targets) {
      const required = itemIds(build);
      requiredItems += required.length;
      const candidates = owned.filter(unit => unit.unit_id === build.unit_id);
      matchedItems += Math.max(0, ...candidates.map(unit => commonItems(required, itemIds(unit))));
    }

    const championCoverage = matchedUnitIds.length / targets.length;
    const score = includeItems && requiredItems > 0
      ? (championCoverage * MATCH_WEIGHTS.champions + matchedItems / requiredItems * MATCH_WEIGHTS.items) * 100
      : championCoverage * 100;

    return { metaComp, score: Math.round(score), matchedUnitIds, missingUnitIds, matchedItems, requiredItems };
  }).filter(match => match.matchedUnitIds.length > 0)
    .sort((left, right) => right.score - left.score
      || (left.metaComp.comp.avg_placement ?? Infinity) - (right.metaComp.comp.avg_placement ?? Infinity)
      || left.metaComp.comp.id - right.metaComp.comp.id);
}
