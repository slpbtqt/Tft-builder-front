import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const state = await import('data:text/javascript;base64,'+Buffer.from(compile(readFileSync('src/app/build-state.ts','utf8'))).toString('base64'));
const {champions,items,traits}=JSON.parse(readFileSync('src/app/game-data.json','utf8'));
const {EXAMPLE_COMPOSITIONS}=await import('data:text/javascript;base64,'+Buffer.from(compile(readFileSync('src/app/compositions.ts','utf8'))).toString('base64'));
const unit = name => ({championId:champions.find(c=>c.name===name).id,stars:2,items:[]});
const empty=()=>Array(28).fill(null);
test('duplicate champions do not inflate trait counts',()=>{
  const board=empty();board[0]=unit('Jinx');board[1]=unit('Jinx');board[2]=unit('Akali');
  const active=state.calculateTraits(board,champions,traits);
  assert.equal(active.find(t=>t.name==='Rebel').count,2);
  assert.equal(active.find(t=>t.name==='Rebel').active,0);
  assert.equal(active.find(t=>t.name==='Rebel').next,3);
});
test('trait thresholds activate at three and seven Rebels',()=>{
  const board=empty();['Jinx','Akali','Sett','Illaoi','Ezreal','Vex','Zoe'].forEach((name,i)=>board[i]=unit(name));
  const rebel=state.calculateTraits(board,champions,traits).find(t=>t.name==='Rebel');
  assert.equal(rebel.count,7);assert.equal(rebel.active,7);assert.equal(rebel.next,10);
});
test('item equipment enforces the three-item limit',()=>{
  const champion=unit('Jinx');champion.items=items.slice(0,3).map(i=>i.id);
  assert.match(state.canEquip(champion,items[4],items),/3 items/);
});
test('Thief’s Gloves cannot coexist with other equipped items',()=>{
  const thief=items.find(i=>i.name==="Thief's Gloves");const normal=items.find(i=>i.name==='Infinity Edge');const champion=unit('Jinx');
  assert.equal(state.canEquip(champion,thief,items),null);
  champion.items=[normal.id];assert.match(state.canEquip(champion,thief,items),/Remove other items/);
  champion.items=[thief.id];assert.match(state.canEquip(champion,normal,items),/all three/);
});
test('shared builds reject invalid cells, star levels, champion IDs, item IDs and capacity',()=>{
  const base={name:'Example',level:8,board:empty()};base.board[0]=unit('Jinx');
  assert.deepEqual(state.validateBuild(base,champions,items),base);
  const cases=[{...base,board:[unit('Jinx')]},{...base,level:11},{...base,board:[{...unit('Jinx'),stars:4},...empty().slice(1)]},{...base,board:[{...unit('Jinx'),championId:'unknown'},...empty().slice(1)]},{...base,board:[{...unit('Jinx'),items:['unknown']},...empty().slice(1)]},{...base,level:1,board:[unit('Jinx'),unit('Akali'),...empty().slice(2)]}];
  cases.forEach(build=>assert.equal(state.validateBuild(build,champions,items),null));
});
test('the catalog covers every example composition without lost champions or items',()=>{
  for(const comp of EXAMPLE_COMPOSITIONS){
    const cells=new Set();for(const u of comp.units){assert.ok(champions.some(c=>c.name===u.name),u.name);assert.ok(u.cell>=0&&u.cell<28);assert.ok(!cells.has(u.cell));cells.add(u.cell);for(const key of u.items??[])assert.ok(items.some(i=>i.id==='TFT_Item_'+key),key);}
  }
});
