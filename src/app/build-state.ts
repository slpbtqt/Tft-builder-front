import { ActiveTrait, BoardUnit, Build, Champion, Item, Trait } from './models';
export const MAX_HEXES = 28;
export function calculateTraits(board: (BoardUnit|null)[], champions: Champion[], traits: Trait[]): ActiveTrait[] {
  const distinct = new Set(board.flatMap(unit => unit ? [unit.championId] : []));
  const counts = new Map<string,number>();
  champions.filter(c => distinct.has(c.id)).forEach(c => c.traits.forEach(t => counts.set(t, (counts.get(t)??0)+1)));
  return traits.filter(t => counts.has(t.name)).map(t => {
    const count = counts.get(t.name)!;
    const thresholds = [...t.thresholds].sort((a,b)=>a-b);
    return {...t,count,active:thresholds.filter(n=>n<=count).at(-1)??0,next:thresholds.find(n=>n>count)??null};
  }).sort((a,b)=>Number(b.active>0)-Number(a.active>0)||b.count-a.count||a.name.localeCompare(b.name));
}
export function canEquip(unit: BoardUnit, item: Item, items: Item[]): string | null {
  if(unit.items.length>=3) return 'This champion already has 3 items. Remove one to make room.';
  const thief = items.find(i=>i.name==="Thief's Gloves")?.id;
  if(unit.items.includes(thief??'')) return "Thief’s Gloves uses all three item slots.";
  if(item.id===thief && unit.items.length) return "Remove other items before equipping Thief’s Gloves.";
  if(item.unique && unit.items.includes(item.id)) return 'This item can only be equipped once per champion.';
  return null;
}
export function validateBuild(value: unknown, champions: Champion[], items: Item[]): Build | null {
  if(!value || typeof value!=='object') return null;
  const v=value as Partial<Build>;
  if(typeof v.name!=='string' || v.name.length>80 || !Number.isInteger(v.level) || v.level!<1 || v.level!>10 || !Array.isArray(v.board) || v.board.length!==MAX_HEXES) return null;
  const ids=new Set(champions.map(c=>c.id)); const itemIds=new Set(items.map(i=>i.id));
  if(v.board.filter(Boolean).length>v.level!) return null;
  for(const unit of v.board) {
    if(unit===null) continue;
    if(!unit || !ids.has(unit.championId) || ![1,2,3].includes(unit.stars) || !Array.isArray(unit.items) || unit.items.length>3 || !unit.items.every(i=>itemIds.has(i))) return null;
    const scratch:BoardUnit={championId:unit.championId,stars:unit.stars,items:[]};
    for(const id of unit.items) { if(canEquip(scratch,items.find(i=>i.id===id)!,items)) return null; scratch.items.push(id); }
  }
  return structuredClone(v as Build);
}
