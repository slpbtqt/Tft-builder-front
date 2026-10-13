import { Build, Comp, Item, MetaComp, Trait, Unit, UnitTrait } from './models';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Un enregistrement JSON était attendu.');
  }
  return value as Row;
}

/** Accept SQL column names and the camelCase names of existing Java getters. */
function field(source: Row, sql: string, java = sql): unknown {
  return source[sql] ?? source[java] ?? null;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Identifiant numérique invalide.');
  }
  return value;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Valeur numérique invalide.');
  }
  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Texte manquant.');
  return value;
}

function textOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function referenceId(value: unknown): unknown {
  return value && typeof value === 'object' ? row(value)['id'] : value;
}

export function rows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(row(value)['content'])) {
    return row(value)['content'] as unknown[];
  }
  throw new Error('Une liste JSON était attendue.');
}

export function toUnit(value: unknown): Unit {
  const source = row(value);
  return {
    id: integer(source['id']), name: text(source['name']),
    image_link: textOrNull(field(source, 'image_link', 'imageLink')),
  };
}

export function toItem(value: unknown): Item {
  const source = row(value);
  return {
    id: text(source['id']), name: text(source['name']),
    image_link: textOrNull(field(source, 'image_link', 'imageLink')),
    component1_id: textOrNull(referenceId(field(source, 'component1_id', 'component1'))),
    component2_id: textOrNull(referenceId(field(source, 'component2_id', 'component2'))),
  };
}

export function toTrait(value: unknown): Trait {
  const source = row(value);
  return {
    id: text(source['id']), name: text(source['name']),
    image_link: textOrNull(field(source, 'image_link', 'imageLink')),
  };
}

export function toUnitTrait(value: unknown): UnitTrait {
  const source = row(value);
  return {
    id: integer(source['id']),
    unit_id: integer(referenceId(field(source, 'unit_id', 'unit'))),
    trait_id: text(referenceId(field(source, 'trait_id', 'trait'))),
  };
}

export function toBuild(value: unknown): Build {
  const source = row(value);
  const stars = numberOrNull(source['stars']);
  if (stars !== null && ![1, 2, 3].includes(stars)) throw new Error('Étoiles invalides.');
  return {
    id: integer(source['id']),
    avg_placement: numberOrNull(field(source, 'avg_placement', 'avgPlacement')),
    unit_id: integer(referenceId(field(source, 'unit_id', 'unit'))),
    item1_id: textOrNull(referenceId(field(source, 'item1_id', 'item1'))),
    item2_id: textOrNull(referenceId(field(source, 'item2_id', 'item2'))),
    item3_id: textOrNull(referenceId(field(source, 'item3_id', 'item3'))),
    stars,
  };
}

export function toComp(value: unknown): Comp {
  const source = row(value);
  const buildId = referenceId(field(source, 'build_id', 'build'));
  return {
    id: integer(source['id']), name: textOrNull(source['name']),
    avg_placement: numberOrNull(field(source, 'avg_placement', 'avgPlacement')),
    win_rate: numberOrNull(field(source, 'win_rate', 'winRate')),
    difficulty: numberOrNull(source['difficulty']),
    levelling: textOrNull(source['levelling']),
    build_id: buildId === null ? null : integer(buildId),
  };
}

/**
 * schema.sql currently links comp to only ONE build. That is not a complete TFT team.
 * /comp must explicitly supply builds[] (rows) or build_ids[] (references) to enable ranking.
 * A lone build_id is kept for fidelity but never presented as a complete meta composition.
 */
export function toMetaComp(value: unknown, availableBuilds: Build[], units: Unit[], items: Item[]): MetaComp {
  const source = row(value);
  const comp = toComp(source);
  const details = source['builds'] ?? source['build_ids'];
  const builds: Build[] = [];
  let isComplete = Array.isArray(details) && details.length > 0;

  if (Array.isArray(details)) {
    for (const detail of details) {
      const build = typeof detail === 'number'
        ? availableBuilds.find(candidate => candidate.id === detail)
        : toBuild(detail);
      if (build) builds.push(build);
      else isComplete = false;
    }
  }

  const unitIds = new Set(units.map(unit => unit.id));
  const itemIds = new Set(items.map(item => item.id));
  isComplete &&= builds.every(build => unitIds.has(build.unit_id)
    && [build.item1_id, build.item2_id, build.item3_id]
      .every(id => id === null || itemIds.has(id)));

  return { comp, builds, isComplete };
}
