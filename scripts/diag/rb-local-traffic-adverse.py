"""Read the existing coupled tapes; zero simulation."""
import gzip,json,math,pathlib
base=pathlib.Path('out/rb-local-traffic');p=json.load(gzip.open(base/'native.json.gz','rt'));out=[]
for play in (15,32):
 a,b=[r for r in p['rows'] if r['play']==play];changes=[];first=b['frames'][0]['t'];columns=[]
 for f,g in zip(a['frames'],b['frames']):
  if len(changes)<6:
   dif=[i for i,(x,y) in enumerate(zip(f['after'],g['after'])) if x!=y]
   if dif:changes.append({'t':f['t'],'bodies':dif})
  if play==32 and 3.05<=f['t']<=3.35:
   columns.append({'t':f['t'],'before':{'pos':f['before'][6]['pos'],'vel':f['before'][6]['vel'],'support':f['before'][6]['support'],'impacts':[x for x in f['report']['contacts'] if 6 in (x['i'],x['j'])]},'after':{'pos':g['before'][6]['pos'],'vel':g['before'][6]['vel'],'support':g['before'][6]['support'],'impacts':[x for x in g['report']['contacts'] if 6 in (x['i'],x['j'])]}})
 def loads(r):
  out={}
  for f in r['frames']:
   for j in f['loads']:
    if j['a']>=11 or j['b']<11:continue
    k=str(j['a'])+'-'+str(j['b']);v=out.setdefault(k,{'normal':0,'tangent':0})
    v['normal']+=max(0,j['normal'])*.05;v['tangent']+=abs(j['tangent'])*.05
  return out
 out.append({'play':play,'firstChangedBodies':changes,'loadsBefore':loads(a),'loadsAfter':loads(b),'wzFallWindow':columns,
  'maxResidual':max(abs(f['report']['work']['residual']) for r in (a,b) for f in r['frames'])})
(base/'adverse.json').write_text(json.dumps({'scope':'Existing coupled tapes only; no new experiment','rows':out},indent=2)+'\n')
print(json.dumps([{k:v for k,v in r.items() if k!='wzFallWindow'} for r in out]))
