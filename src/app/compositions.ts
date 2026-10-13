import { Composition } from './models';
// Curated example builds for the historical Arcane catalog. No live rankings or statistics are claimed.
export const EXAMPLE_COMPOSITIONS: Composition[] = [
  {
    id: 'rebel-jinx', name: 'Rebel Jinx', subtitle: 'A little chaos. A lot of damage.', tier: 'S', strategy: 'Fast 9', difficulty: 'Medium',
    tags: ['Rebel', 'Ambusher', 'Sentinel'], carry: 'Jinx',
    units: [
      {name:'Irelia',cell:1}, {name:'Sett',cell:3}, {name:'Illaoi',cell:4,items:['WarmogsArmor','GargoyleStoneplate','Redemption']},
      {name:'Akali',cell:8}, {name:'Ekko',cell:13}, {name:'Rumble',cell:0}, {name:'Ezreal',cell:23},
      {name:'Zoe',cell:25,items:['SpearOfShojin','JeweledGauntlet','Leviathan']},
      {name:'Jinx',cell:27,items:['InfinityEdge','LastWhisper','SpearOfShojin']}
    ]
  },
  {
    id:'enforcer-caitlyn', name:'Enforcer Caitlyn', subtitle:'Piltover’s finest, reporting for duty.', tier:'S', strategy:'Fast 8',difficulty:'Medium',
    tags:['Enforcer','Sniper','Sentinel'],carry:'Caitlyn',
    units:[{name:'Steb',cell:0},{name:'Loris',cell:2,items:['WarmogsArmor','GargoyleStoneplate','DragonsClaw']},{name:'Vi',cell:4,items:['Bloodthirster','TitansResolve','SteraksGage']},{name:'Camille',cell:8},{name:'Twisted Fate',cell:15},{name:'Maddie',cell:21},{name:'Caitlyn',cell:27,items:['InfinityEdge','LastWhisper','SpearOfShojin']},{name:'Illaoi',cell:6}]
  },
  {
    id:'black-rose',name:'Black Rose Silco',subtitle:'Every rose has its thorns.',tier:'A',strategy:'Fast 8',difficulty:'Medium',
    tags:['Black Rose','Dominator','Visionary'],carry:'Silco',
    units:[{name:'Elise',cell:2,items:['WarmogsArmor','GargoyleStoneplate','Redemption']},{name:'Vladimir',cell:4},{name:'Dr. Mundo',cell:5},{name:'Blitzcrank',cell:1},{name:'Cassiopeia',cell:21},{name:'Morgana',cell:23},{name:'Silco',cell:27,items:['SpearOfShojin','JeweledGauntlet','ArchangelsStaff']},{name:'LeBlanc',cell:25}]
  },
  {
    id:'family',name:'Family Reunion',subtitle:'The undercity looks after its own.',tier:'A',strategy:'Slow roll',difficulty:'Easy',
    tags:['Family','Pit Fighter','Scrap'],carry:'Violet',
    units:[{name:'Violet',cell:2,items:['Bloodthirster','TitansResolve','SteraksGage']},{name:'Vander',cell:3,items:['WarmogsArmor','GargoyleStoneplate','Redemption']},{name:'Vi',cell:4},{name:'Scar',cell:0},{name:'Gangplank',cell:8},{name:'Ekko',cell:14},{name:'Powder',cell:21,items:['SpearOfShojin','JeweledGauntlet','RabadonsDeathcap']},{name:'Sevika',cell:6}]
  },
  {
    id:'academy',name:'Academy Heimerdinger',subtitle:'A perfectly calculated victory.',tier:'A',strategy:'Fast 8',difficulty:'Easy',
    tags:['Academy','Visionary','Sentinel'],carry:'Heimerdinger',
    units:[{name:'Leona',cell:1},{name:'Illaoi',cell:3,items:['WarmogsArmor','GargoyleStoneplate','DragonsClaw']},{name:'Rell',cell:4},{name:'Jayce',cell:8},{name:'Ezreal',cell:23},{name:'Heimerdinger',cell:27,items:['BlueBuff','ArchangelsStaff','JeweledGauntlet']},{name:'Lux',cell:21},{name:'Rumble',cell:6}]
  },
  {
    id:'automata',name:'Automata Kog’Maw',subtitle:'Small carry. Enormous appetite.',tier:'B',strategy:'Slow roll',difficulty:'Easy',
    tags:['Automata','Sniper','Watcher'],carry:"Kog'Maw",
    units:[{name:'Amumu',cell:2,items:['WarmogsArmor','GargoyleStoneplate','DragonsClaw']},{name:'Blitzcrank',cell:4},{name:'Nocturne',cell:8},{name:'Scar',cell:1},{name:'Zeri',cell:21},{name:"Kog'Maw",cell:27,items:['GuinsoosRageblade','ArchangelsStaff','HextechGunblade']},{name:'Malzahar',cell:25},{name:'Garen',cell:5}]
  }
];
