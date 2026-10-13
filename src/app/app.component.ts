import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { LucideAngularModule, Swords, LayoutGrid, Bookmark, ChevronDown, ChevronRight, ArrowUpRight, Search, Plus, Minus, X, Undo2, Redo2, RotateCcw, Share2, Check, Pencil, Trash2, Info, CircleHelp, Crown, Sparkles, Users, Shield, Crosshair, Zap, Star, ArrowRight, Copy, Download, RefreshCw } from 'lucide-angular';
import { GameApiService } from './game-api.service';
import { ActiveTrait, BoardUnit, Build, Champion, Composition, GameCatalog, Item, SavedBuild, Trait } from './models';
import { calculateTraits, canEquip, validateBuild } from './build-state';
import data from './game-data.json';
import { EXAMPLE_COMPOSITIONS } from './compositions';

@Component({
  selector:'app-root', standalone:true, imports:[LucideAngularModule],
  templateUrl:'./app.component.html', styleUrl:'./app.component.css'
})
export class AppComponent {
  readonly icons={Swords,LayoutGrid,Bookmark,ChevronDown,ChevronRight,ArrowUpRight,Search,Plus,Minus,X,Undo2,Redo2,RotateCcw,Share2,Check,Pencil,Trash2,Info,CircleHelp,Crown,Sparkles,Users,Shield,Crosshair,Zap,Star,ArrowRight,Copy,Download,RefreshCw};
  readonly api=inject(GameApiService);
  readonly champions=signal(data.champions as Champion[]);
  readonly items=signal(data.items as Item[]);
  readonly traits=signal(data.traits as Trait[]);
  readonly compositions=signal(EXAMPLE_COMPOSITIONS);
  readonly view=signal<'builder'|'meta'|'saved'>('builder');
  readonly libraryTab=signal<'champions'|'items'>('champions');
  readonly search=signal(''); readonly cost=signal(0); readonly traitFilter=signal('');
  readonly itemKind=signal<'all'|'completed'|'component'>('completed');
  readonly compSearch=signal(''); readonly compTier=signal('All'); readonly compStrategy=signal('All strategies');
  readonly board=signal<(BoardUnit|null)[]>(Array(28).fill(null)); readonly level=signal(9); readonly buildName=signal('Rebel Jinx');
  readonly selectedCell=signal<number|null>(27); readonly pendingChampion=signal<string|null>(null);
  readonly modal=signal<'save'|'help'|'share'|'reset'|null>(null); readonly modalName=signal(''); readonly shareUrl=signal('');
  readonly toast=signal(''); readonly saved=signal<SavedBuild[]>([]);
  readonly isLive=signal(false); readonly connecting=signal(false); readonly patch=signal('14.24'); readonly setName=signal('Into the Arcane');
  readonly undoStack=signal<Build[]>([]); readonly redoStack=signal<Build[]>([]);
  readonly hoveredItem=signal<Item|null>(null); readonly dragOver=signal<number|null>(null);
  private previousFocus:HTMLElement|null=null;
  private toastTimer:ReturnType<typeof setTimeout>|null=null;
  private drag:{type:'champion'|'unit'|'item';id?:string;cell?:number}|null=null;
  readonly rows=[0,1,2,3]; readonly columns=[0,1,2,3,4,5,6]; readonly slots=[0,1,2];
  readonly unitCount=computed(()=>this.board().filter(Boolean).length);
  readonly totalCost=computed(()=>this.board().reduce((n,u)=>n+(u?this.champion(u.championId)?.cost??0:0),0));
  readonly activeTraits=computed<ActiveTrait[]>(()=>calculateTraits(this.board(),this.champions(),this.traits()));
  readonly activeCount=computed(()=>this.activeTraits().filter(t=>t.active>0).length);
  readonly selectedUnit=computed(()=>this.selectedCell()===null?null:this.board()[this.selectedCell()!]);
  readonly selectedChampion=computed(()=>{const u=this.selectedUnit();return u?this.champion(u.championId):null;});
  readonly filteredChampions=computed(()=>this.champions().filter(c=>(!this.cost()||c.cost===this.cost())&&(!this.traitFilter()||c.traits.includes(this.traitFilter()))&&(c.name+' '+c.traits.join(' ')).toLowerCase().includes(this.search().toLowerCase())));
  readonly filteredItems=computed(()=>this.items().filter(i=>(this.itemKind()==='all'||i.kind===this.itemKind())&&i.name.toLowerCase().includes(this.search().toLowerCase())));
  readonly filteredComps=computed(()=>this.compositions().filter(c=>(this.compTier()==='All'||c.tier===this.compTier())&&(this.compStrategy()==='All strategies'||c.strategy===this.compStrategy())&&(c.name+' '+c.tags.join(' ')).toLowerCase().includes(this.compSearch().toLowerCase())));
  readonly suggestions=computed(()=>this.compositions().filter(c=>c.name!==this.buildName()).slice(0,3));
  readonly recommendedItems=computed(()=>{
    const c=this.selectedChampion(); if(!c)return [];
    const chosen=this.compositions().flatMap(comp=>comp.units).find(u=>u.name===c.name&&u.items?.length);
    const keys=chosen?.items??(c.range<=1?['WarmogsArmor','GargoyleStoneplate','DragonsClaw']:['SpearOfShojin','JeweledGauntlet','ArchangelsStaff']);
    return keys.map(k=>this.itemByKey(k)).filter((i):i is Item=>!!i);
  });
  constructor(){
    effect(()=>{
      const modal=this.modal();
      if(modal){this.previousFocus=document.activeElement as HTMLElement;this.hoveredItem.set(null);document.body.style.overflow='hidden';queueMicrotask(()=> (document.querySelector<HTMLElement>('.modal input')??document.querySelector<HTMLElement>('.modal .modal-close'))?.focus());}
      else {document.body.style.overflow='';this.previousFocus?.focus();}
    });
    let draft:unknown=null;
    try{draft=JSON.parse(localStorage.getItem(this.storageKey('draft'))??'null');}catch{}
    this.loadComposition(EXAMPLE_COMPOSITIONS[0],false);
    this.restoreSaved();
    const shared=new URLSearchParams(location.search).get('build');
    if(shared){try{const decoded=JSON.parse(decodeURIComponent(escape(atob(shared))));const valid=validateBuild(decoded,this.champions(),this.items());if(valid){this.applyBuild(valid);this.notify('Shared composition loaded.');}else this.notify('This shared composition is invalid or uses a different set.');}catch{this.notify('This shared composition could not be loaded.');}}
    else {const valid=validateBuild(draft,this.champions(),this.items());if(valid)this.applyBuild(valid);}
  }
  champion(id:string):Champion|undefined{return this.champions().find(c=>c.id===id);}
  championByName(name:string):Champion|undefined{return this.champions().find(c=>c.name===name);}
  item(id:string):Item|undefined{return this.items().find(i=>i.id===id);}
  itemByKey(key:string):Item|undefined{return this.item('TFT_Item_'+key);}
  trait(name:string):Trait|undefined{return this.traits().find(t=>t.name===name);}
  snapshot():Build{return {name:this.buildName(),level:this.level(),board:structuredClone(this.board())};}
  private remember(){this.undoStack.update(v=>[...v.slice(-49),this.snapshot()]);this.redoStack.set([]);}
  private storageKey(kind:'draft'|'saved'):string{return 'hexforge-'+kind+'-v1-'+(this.isLive()?this.setName()+'-'+this.patch():'arcane-demo');}
  private persist(){try{localStorage.setItem(this.storageKey('draft'),JSON.stringify(this.snapshot()));}catch{this.notify('Browser storage is unavailable. Use Share to keep your build.');}}
  private applyBuild(build:Build){this.buildName.set(build.name);this.level.set(build.level);this.board.set(structuredClone(build.board));this.pendingChampion.set(null);this.selectedCell.set(build.board.findLastIndex(Boolean)>=0?build.board.findLastIndex(Boolean):null);this.persist();}
  loadComposition(comp:Composition,history=true){
    if(history)this.remember();
    const board:(BoardUnit|null)[]=Array(28).fill(null);
    for(const u of comp.units){const c=this.championByName(u.name);if(c)board[u.cell]={championId:c.id,stars:2,items:(u.items??[]).map(k=>this.itemByKey(k)?.id).filter((id):id is string=>!!id)};}
    this.applyBuild({name:comp.name,level:Math.max(8,comp.units.length),board});this.view.set('builder');
    this.selectedCell.set(comp.units.find(u=>u.name===comp.carry)?.cell??null);
    if(history)this.notify(comp.name+' loaded into the builder.');
  }
  switchView(v:'builder'|'meta'|'saved'){this.view.set(v);this.pendingChampion.set(null);}
  switchLibrary(v:'champions'|'items'){this.libraryTab.set(v);this.search.set('');}
  selectChampion(c:Champion){
    this.pendingChampion.set(c.id);
    const free=this.board().findIndex((u,i)=>!u&&(c.range<=1?i<14:i>=14));
    const cell=free>=0?free:this.board().findIndex(u=>!u);
    if(cell>=0)this.placeChampion(c.id,cell);
  }
  placeChampion(id:string,cell:number){
    if(!this.champion(id))return;
    if(!this.board()[cell]&&this.unitCount()>=this.level()){this.notify('Your team is full. Increase the team level or remove a champion.');return;}
    this.remember();this.board.update(b=>{const next=[...b];next[cell]={championId:id,stars:1,items:[]};return next;});this.selectedCell.set(cell);this.pendingChampion.set(null);this.persist();
  }
  clickCell(cell:number){if(this.board()[cell]){this.selectedCell.set(cell);this.pendingChampion.set(null);}else if(this.pendingChampion())this.placeChampion(this.pendingChampion()!,cell);else this.selectedCell.set(null);}
  setLevel(value:number){if(value<this.unitCount()){this.notify('Remove champions before lowering your team level.');return;}this.remember();this.level.set(value);this.persist();}
  changeStars(stars:number){const cell=this.selectedCell();if(cell===null||!this.board()[cell])return;this.remember();this.board.update(b=>b.map((u,i)=>i===cell&&u?{...u,stars}:u));this.persist();}
  equipItem(item:Item,cell=this.selectedCell()){
    if(cell===null||!this.board()[cell]){this.notify('Select a champion on the board to equip an item.');return;}
    const reason=canEquip(this.board()[cell]!,item,this.items());if(reason){this.notify(reason);return;}
    this.remember();this.board.update(b=>b.map((u,i)=>i===cell&&u?{...u,items:[...u.items,item.id]}:u));this.selectedCell.set(cell);this.persist();this.notify(item.name+' equipped.');
  }
  removeItem(slot:number){const cell=this.selectedCell();if(cell===null||!this.selectedUnit())return;this.remember();this.board.update(b=>b.map((u,i)=>i===cell&&u?{...u,items:u.items.filter((_,index)=>index!==slot)}:u));this.persist();}
  removeUnit(cell=this.selectedCell()){if(cell===null||!this.board()[cell])return;this.remember();this.board.update(b=>b.map((u,i)=>i===cell?null:u));if(this.selectedCell()===cell)this.selectedCell.set(null);this.persist();}
  reset(){this.remember();this.applyBuild({name:'Untitled composition',level:9,board:Array(28).fill(null)});this.modal.set(null);this.notify('The board is ready for a new composition.');}
  undo(){const previous=this.undoStack().at(-1);if(!previous)return;this.redoStack.update(v=>[...v,this.snapshot()]);this.undoStack.update(v=>v.slice(0,-1));this.applyBuild(previous);}
  redo(){const next=this.redoStack().at(-1);if(!next)return;this.undoStack.update(v=>[...v,this.snapshot()]);this.redoStack.update(v=>v.slice(0,-1));this.applyBuild(next);}
  dragStart(event:DragEvent,type:'champion'|'unit'|'item',id?:string,cell?:number){this.drag={type,id,cell};event.dataTransfer?.setData('text/plain',JSON.stringify(this.drag));if(event.dataTransfer)event.dataTransfer.effectAllowed=type==='unit'?'move':'copy';}
  dragEnd(){this.drag=null;this.dragOver.set(null);}
  allowDrop(event:DragEvent,cell:number){event.preventDefault();this.dragOver.set(cell);}
  drop(event:DragEvent,cell:number){event.preventDefault();this.dragOver.set(null);const drag=this.drag;if(!drag)return;
    if(drag.type==='champion'&&drag.id)this.placeChampion(drag.id,cell);
    else if(drag.type==='item'&&drag.id){const item=this.item(drag.id);if(item)this.equipItem(item,cell);}
    else if(drag.type==='unit'&&drag.cell!==undefined&&drag.cell!==cell){this.remember();this.board.update(b=>{const next=[...b];[next[cell],next[drag.cell!]]=[next[drag.cell!],next[cell]];return next;});this.selectedCell.set(cell);this.persist();}
    this.drag=null;
  }
  openSave(){this.modalName.set(this.buildName());this.modal.set('save');}
  save(){const name=this.modalName().trim();if(!name){this.notify('Give your composition a name.');return;}if(!this.unitCount()){this.notify('Add a champion before saving your composition.');return;}
    this.remember();this.buildName.set(name.slice(0,80));const saved:SavedBuild={...this.snapshot(),id:crypto.randomUUID(),savedAt:new Date().toISOString()};
    const next=[saved,...this.saved()].slice(0,100);
    try{localStorage.setItem(this.storageKey('saved'),JSON.stringify(next));this.saved.set(next);this.modal.set(null);this.persist();this.notify('Composition saved to My comps.');}catch{this.notify('Your browser could not save this build. Use Share instead.');}
  }
  private restoreSaved(){try{const list=JSON.parse(localStorage.getItem(this.storageKey('saved'))??'[]');if(Array.isArray(list))this.saved.set(list.filter(v=>validateBuild(v,this.champions(),this.items())&&typeof v.id==='string'&&typeof v.savedAt==='string').slice(0,100));}catch{}}
  loadSaved(comp:SavedBuild){this.remember();this.applyBuild(comp);this.view.set('builder');this.notify(comp.name+' loaded.');}
  deleteSaved(id:string){const next=this.saved().filter(c=>c.id!==id);try{localStorage.setItem(this.storageKey('saved'),JSON.stringify(next));this.saved.set(next);this.notify('Saved composition deleted.');}catch{this.notify('Browser storage is unavailable.');}}
  savedChampions(comp:SavedBuild):Champion[]{return comp.board.flatMap(u=>{const c=u?this.champion(u.championId):null;return c?[c]:[];});}
  openShare(){const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(this.snapshot()))));const url=new URL(location.href);url.search='';url.searchParams.set('build',encoded);url.hash='';this.shareUrl.set(url.toString());this.modal.set('share');}
  async copyShare(){try{await navigator.clipboard.writeText(this.shareUrl());this.notify('Composition link copied.');}catch{this.notify('Select and copy the link below.');}}
  downloadBuild(){const url=URL.createObjectURL(new Blob([JSON.stringify(this.snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=this.buildName().replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.json';a.click();URL.revokeObjectURL(url);this.notify('Composition exported as JSON.');}
  notify(message:string){if(this.toastTimer)clearTimeout(this.toastTimer);this.toast.set(message);this.toastTimer=setTimeout(()=>this.toast.set(''),4500);}
  async connectApi(){if(this.connecting())return;this.connecting.set(true);
    try{const catalog=await this.api.loadCatalog();if(!this.validCatalog(catalog))throw new Error('Invalid catalog');
      this.champions.set(catalog.champions);this.items.set(catalog.items);this.traits.set(catalog.traits);this.compositions.set(catalog.compositions);this.patch.set(catalog.patch);this.setName.set(catalog.setName);this.isLive.set(true);this.undoStack.set([]);this.redoStack.set([]);this.saved.set([]);this.restoreSaved();
      if(catalog.compositions[0])this.loadComposition(catalog.compositions[0],false);else this.applyBuild({name:'Untitled composition',level:9,board:Array(28).fill(null)});
      this.modal.set(null);this.notify('Live catalog loaded from your Java backend.');
    }catch{this.notify('The backend catalog is not available yet. You can continue with the Arcane demo.');}finally{this.connecting.set(false);}
  }
  private validCatalog(v:GameCatalog):boolean{
    return !!v&&typeof v.patch==='string'&&typeof v.setName==='string'&&Array.isArray(v.champions)&&v.champions.length>0&&v.champions.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&Number.isFinite(c.cost)&&Array.isArray(c.traits)&&typeof c.image==='string')&&Array.isArray(v.items)&&v.items.every(i=>typeof i.id==='string'&&typeof i.name==='string'&&Array.isArray(i.components))&&Array.isArray(v.traits)&&v.traits.every(t=>typeof t.name==='string'&&Array.isArray(t.thresholds))&&Array.isArray(v.compositions)&&v.compositions.every(c=>typeof c.name==='string'&&Array.isArray(c.units)&&c.units.every(u=>typeof u.name==='string'&&Number.isInteger(u.cell)&&u.cell>=0&&u.cell<28));
  }
  assetError(event:Event){const image=event.target as HTMLImageElement;if(!image.src.endsWith('/favicon.svg'))image.src='favicon.svg';}
  @HostListener('document:keydown',['$event']) keydown(event:KeyboardEvent){
    if(event.key==='Escape'){this.modal.set(null);this.pendingChampion.set(null);return;}
    if(this.modal()){
      if(event.key==='Tab'){const elements=Array.from(document.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input, .modal a[href]'));const first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
      return;
    }
    const target=event.target as HTMLElement;if(['INPUT','SELECT','TEXTAREA'].includes(target.tagName))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?this.redo():this.undo();}
    if((event.key==='Delete'||event.key==='Backspace')&&this.view()==='builder'){event.preventDefault();this.removeUnit();}
  }
}
