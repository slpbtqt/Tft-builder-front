import json,re,pathlib,concurrent.futures,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
# Optional first argument supplies an existing catalog. Otherwise download the historical snapshot.
catalog_path=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'.angular'/'arcane-catalog.json'
if not catalog_path.exists():
    catalog_path.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['curl','-fLsS','--max-time','60','https://raw.communitydragon.org/14.24/cdragon/tft/en_us.json','-o',str(catalog_path)],check=True)
x=json.loads(catalog_path.read_text()); s=next(s for s in x['setData'] if s['number']==13)
queue=[]
def asset(path,kind,id):
    local=f'assets/{kind}/{id}.png'
    url='https://raw.communitydragon.org/14.24/game/'+path.lower().replace('.tex','.png')
    queue.append((url,root/'public'/local))
    return local
champs=[]
for c in s['champions']:
    if not c['apiName'].startswith('TFT13_') or not c['traits'] or not 1<=c['cost']<=6: continue
    champs.append({'id':c['apiName'],'name':c['name'],'cost':c['cost'],'traits':c['traits'],'image':asset(c['squareIcon'],'champions',c['apiName']),'splash':asset(c['icon'],'champions',c['apiName']+'-splash'),'health':c['stats']['hp'],'attack':round(c['stats']['damage']),'armor':c['stats']['armor'],'range':c['stats']['range'],'ability':c['ability']['name']})
champs.sort(key=lambda c:(c['cost'],c['name']))
components=['BFSword','RecurveBow','NeedlesslyLargeRod','TearOfTheGoddess','ChainVest','NegatronCloak','GiantsBelt','SparringGloves','Spatula','FryingPan']
items=[]
for i in x['items']:
    if not i.get('apiName') or not i.get('name') or not i['apiName'].startswith('TFT_Item_') or i['name'].startswith('tft_'): continue
    if not i['composition'] and i['apiName'].removeprefix('TFT_Item_') not in components: continue
    if i['composition'] and not all(v.startswith('TFT_Item_') for v in i['composition']): continue
    desc=re.sub('<[^>]*>',' ',i['desc']); desc=re.sub(r'@([^@]+)@',lambda m:str(round(i['effects'].get(m.group(1),0),2)) if m.group(1) in i['effects'] else 'bonus',desc)
    desc=desc.replace('&nbsp;',' '); desc=re.sub('%i:[^%]+%','',desc); desc=re.sub(r'\s+',' ',desc).strip()
    items.append({'id':i['apiName'],'name':i['name'],'image':asset(i['icon'],'items',i['apiName']),'components':i['composition'],'description':desc,'kind':'completed' if i['composition'] else 'component','unique':i['unique']})
traits=[{'id':t['apiName'],'name':t['name'],'image':asset(t['icon'],'traits',t['apiName']),'thresholds':[e['minUnits'] for e in t['effects']]} for t in s['traits'] if any(t['name'] in c['traits'] for c in champs)]
(root/'src/app/game-data.json').write_text(json.dumps({'champions':champs,'items':items,'traits':traits},indent=2))
def fetch(pair):
    url,dest=pair
    try:
        dest.parent.mkdir(parents=True,exist_ok=True)
        subprocess.run(['curl','-fLsS','--max-time','25',url,'-o',str(dest)],check=True,capture_output=True)
        return None
    except Exception as e: return f'{dest.name}: {e}'
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    errors=[e for e in pool.map(fetch,queue) if e]
print(f'{len(champs)} champions, {len(items)} items, {len(traits)} traits; {len(queue)-len(errors)}/{len(queue)} assets downloaded')
for e in errors: print(e)
