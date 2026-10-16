"""Offline run-action campaign analysis. No simulations; reads pinned cache indices."""
import collections,gzip,hashlib,json,math,statistics,sys
from pathlib import Path
OUT=Path(sys.argv[1] if len(sys.argv)>1 else 'out/run-action-analysis');OUT.mkdir(parents=True,exist_ok=True)
def load(p):
 p=Path(p);return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_text())
def avg(a):return statistics.mean(a) if a else None
def med(a):return statistics.median(a) if a else None
def quant(a,p):
 if not a:return None
 b=sorted(a);x=(len(b)-1)*p;i=int(x);return b[i]+(b[min(i+1,len(b)-1)]-b[i])*(x-i)
def group(rows,keys):
 g=collections.defaultdict(list)
 for r in rows:g[tuple(r['case'][k] for k in keys)].append(r)
 return g
def stats(rows):
 complete=[r for r in rows if r['metrics']['terminal']];ys=[r['metrics']['gain'] for r in complete]
 return dict(n=len(rows),terminal=len(ys),censored=len(rows)-len(ys),mean=avg(ys),median=med(ys),q25=quant(ys,.25),q75=quant(ys,.75),minimum=min(ys) if ys else None,maximum=max(ys) if ys else None,
  stuff=avg([y<=0 for y in ys]),under2=avg([y<2 for y in ys]),explosive10=avg([y>=10 for y in ys]),explosive20=avg([y>=20 for y in ys]),success=avg([r['metrics']['success'] for r in complete]),
  turnovers=avg([r['metrics']['turnover'] for r in rows]),sacks=avg([r['metrics']['sacked'] for r in rows]),completed=avg([r['metrics']['completed'] for r in rows]),attempted=avg([r['metrics']['attempted'] for r in rows]),
  pressure=avg([r['metrics']['pressured'] for r in rows]),peerContact=avg([bool(r['observation']['offenseImpacts']) for r in rows]),
  noExchange=avg([r['metrics']['handoff'] is None for r in rows]),retainedSnap=avg([r['metrics']['retainedSnap'] for r in rows]),
  firstContactYards=med([r['metrics']['contactYards'] for r in rows if r['metrics']['contactYards'] is not None and r['metrics']['firstContact'] and r['metrics']['firstContact']['a']<11 and r['metrics']['firstContact']['b']>=11]))
def firstreads(row,prefix):
 reads={}
 for e in row['observation']['events']:
  if e['type']=='read' and row['observation']['initial'][e['a']]['slot'].startswith(prefix):
   slot=row['observation']['initial'][e['a']]['slot'];reads.setdefault(slot,(e['note'].split(';')[0],e['t']))
 return reads
def snapshot(r,t):
 return next((f for f in r['observation']['frames'] if abs(f['afterAt']-t)<1e-5),None)
def motion(r,t,prefix):
 f=snapshot(r,t)
 if not f:return None
 initial={a['slot']:a for a in r['observation']['initial']}
 agents=[a for a in f['agents'] if a['slot'].startswith(prefix)]
 return avg([a['pos']['x']-initial[a['slot']]['pos']['x'] for a in agents])
def indicators(r):
 o=r['observation'];native=r['metrics']['firstContact'];fc=next((e for e in o['events'] if e['type']=='carrier_contact' and e.get('a',99)<11 and e.get('b',0)>=11),None);names=[a['slot'] for a in o['initial']]
 d=names[fc['b']] if fc and fc.get('b') is not None else None
 loadAtContact=[p for p in o['contactLoads'] if p['defender']==d] if fc==native else []
 bypair={(p['blocker'],p['defender']):p for p in o['loads']}
 assigned=[]
 for p in o['installed']:
  targets=[p['target']] if p['target'] and p['target'].startswith('LB') else []
  if p['climb'] and p['climb'].startswith('LB'):targets.append(p['climb'])
  for target in set(targets):
   actual=bypair.get((p['slot'],target));assigned.append({'blocker':p['slot'],'target':target,'kind':p['kind'],
    'loadedByContact':actual is not None and (not fc or actual['first']<=fc['t']+.05), 'firstLoad':actual['first'] if actual else None})
 init={a['slot']:a for a in o['initial']};side=r['snapSide']
 openings={}
 for t in [1,2]:
  f=snapshot(r,t)
  if not f:continue
  ol=[a for a in f['agents'] if a['slot'] in ['LT','LG','C','RG','RT']]
  loaded={p['blocker'] for p in f['loads']}
  firstlevel={p['slot'] for p in o['installed'] if p['kind'] in ['drive','down','reach','cutoff','combo']}
  openings[str(t)]={'olLateral':avg([(a['pos']['y']-init[a['slot']]['pos']['y'])*side for a in ol]),
   'olForward':avg([a['pos']['x']-init[a['slot']]['pos']['x'] for a in ol]),
   'loadedFirstLevelForward':avg([a['pos']['x']-init[a['slot']]['pos']['x'] for a in ol if a['slot'] in loaded&firstlevel]),
   'loadedFirstLevelN':sum(a['slot'] in loaded&firstlevel for a in ol),
   'requestModified':avg([math.hypot(a['raw']['vel']['x']-a['final']['vel']['x'],a['raw']['vel']['y']-a['final']['vel']['y'])>1e-8 for a in ol])}
 return {'firstOffensiveCarrierContact':fc,'firstDefender':d,'loadedFirstDefenderAtContact':bool(loadAtContact) if fc is not None and fc==native else None,'contactBlockers':loadAtContact,
  'offensivePeerImpacts':len(o['offenseImpacts']),'peakPeerImpulse':max((i['impulse'] for i in o['offenseImpacts']),default=0),'secondLevelJobs':assigned,'opening':openings,'lbFirstRunShare':avg([x[0]=='run' for x in firstreads(r,'LB').values()]),
  'lbForward1':motion(r,1,'LB'),'lbForward2':motion(r,2,'LB'),'safetyFirstRunShare':avg([x[0]=='run' for k in ['FS','SS'] for x in firstreads(r,k).values()])}
allrows=[];indices=[]
for host,path,manifestpath in [('accepted','out/run-action-accepted/index.json','data/reviews/current/run-action-suite/accepted-manifest.json.gz'),('perimeter','out/run-action-perimeter/index.json','data/reviews/current/run-action-suite/perimeter-manifest.json.gz')]:
 if not Path(path).exists():continue
 idx=load(path);m=load(manifestpath);indices.append({'host':host,**{k:v for k,v in idx.items() if k!='rows'}})
 for entry in idx['rows']:
  saved=load(entry['path']);r=saved['row'];r['host']=host
  c=r['case'];f=m['formations'][c['formation']]
  # All current inputs use ballY26.67. Read actual strength from audited
  # defender fits: alignment tie is field-side, not call.flip.
  # The run's actual aim side is also explicit in installed pin/pull drives;
  # compute strength with the manifest via published convention for these
  # formations (Ace tie right; wing/TE counts can differ).
  sy={'L':0,'R':0};te={'L':False,'R':False}
  for slot,a in f['slots'].items():
   if a['depth']>=3 and (a['side']=='C' or (isinstance(a['split'],(int,float)) and a['split']<3.5)):continue
   if a['side'] in sy:sy[a['side']]+=1;te[a['side']]|=a['split']=='inline'
  strong='L' if sy['L']>sy['R'] or sy['L']==sy['R'] and te['L'] and not te['R'] else 'R'
  r['snapSide']=(1 if strong=='L' else -1)*(1 if c['direction']=='strong' else -1)
  r['indicators']=indicators(r);r['observation']={'offenseImpacts':r['observation']['offenseImpacts']};allrows.append(r)
primary=[r for r in allrows if r['case']['phase']=='primary'];proto=[r for r in allrows if r['host']=='perimeter'];pa=[r for r in allrows if r['case']['phase']=='pa']
compact=[]
for r in allrows:
 compact.append({k:r[k] for k in ['case','status','metrics','host','indicators','elapsedMs','physicalSignature']})
byfamily={k[0]:stats(v) for k,v in group(primary,['family']).items()};byproto={k[0]:stats(v) for k,v in group(proto,['family']).items()}
bylook={k[0]:stats(v) for k,v in group(primary,['look']).items()}
heat=[{'family':k[0],'look':k[1],**stats(v)} for k,v in group(primary,['family','look']).items()]
byroster=[{'family':k[0],'roster':k[1],**stats(v)} for k,v in group(primary,['family','roster']).items()]
transfer=[]
for k,v in group([r for r in allrows if r['case']['phase']=='transfer'],['family','formation']).items():
 base=[r for r in primary if r['case']['family']==k[0] and r['case']['roster']=='pair11' and r['case']['seed']==77 and r['case']['look'] in ['over3','under3','wide9','tite4']]
 transfer.append({'family':k[0],'formation':k[1],'transfer':stats(v),'matchedPrimary':stats(base)})
pairs=[]
for key,rows in group(pa,['package','look','roster','seed','context']).items():
 arms={r['case']['arm']:r for r in rows}
 if set(arms)!={'pa','plain'}:raise ValueError(('Missing paired arm',key))
 a,b=arms['pa'],arms['plain'];ma,mb=a['metrics'],b['metrics'];ia,ib=a['indicators'],b['indicators']
 pairs.append({'package':key[0],'look':key[1],'roster':key[2],'seed':key[3],'context':key[4],
  'paCase':a['case']['id'],'plainCase':b['case']['id'],'gainDelta':ma['gain']-mb['gain'] if ma['terminal'] and mb['terminal'] else None,
  'completionDelta':int(ma['completed'])-int(mb['completed']),'sackDelta':int(ma['sacked'])-int(mb['sacked']),
  'turnoverDelta':int(ma['turnover'])-int(mb['turnover']),
  'lbRunReadDelta':ia['lbFirstRunShare']-ib['lbFirstRunShare'] if ia['lbFirstRunShare'] is not None and ib['lbFirstRunShare'] is not None else None,
  'lbForward1Delta':ia['lbForward1']-ib['lbForward1'] if ia['lbForward1'] is not None and ib['lbForward1'] is not None else None,
  'pa':ma,'plain':mb,'paRead':ia['lbFirstRunShare'],'plainRead':ib['lbFirstRunShare']})
pa_summary=[]
for key in [(p,c) for p in ['postdig','flood','shot'] for c in ['neutral','runheavy','passalert']]:
 p=[x for x in pairs if (x['package'],x['context'])==key];a=[r for r in pa if (r['case']['package'],r['case']['context'],r['case']['arm'])==(*key,'pa')];b=[r for r in pa if (r['case']['package'],r['case']['context'],r['case']['arm'])==(*key,'plain')]
 pa_summary.append({'package':key[0],'context':key[1],'pairs':len(p),'pa':stats(a),'plain':stats(b),
  **{name:avg([x[name] for x in p if x[name] is not None]) for name in ['gainDelta','completionDelta','sackDelta','turnoverDelta','lbRunReadDelta','lbForward1Delta']},
  'paLbFirstRun':avg([x['paRead'] for x in p if x['paRead'] is not None]),'plainLbFirstRun':avg([x['plainRead'] for x in p if x['plainRead'] is not None])})
# Select a fixed diagnostic packet after the census: best and worst gain in
# each primary family, and largest positive/negative paired PA delta. These
# expose contrasts and are explicitly retrospective, not independent tests.
witness=[]
for family in byfamily:
 rows=[r for r in primary if r['case']['family']==family and r['metrics']['terminal']]
 for label,choose in [('minimum',min),('maximum',max)]:
  r=choose(rows,key=lambda r:(r['metrics']['gain'],r['case']['id']));witness.append({'selection':family+'/'+label,'id':r['case']['id'],'gain':r['metrics']['gain']})
for pkg in ['postdig','flood','shot']:
 rows=[p for p in pairs if p['package']==pkg and p['gainDelta'] is not None]
 for label,choose in [('minimum',min),('maximum',max)]:
  p=choose(rows,key=lambda p:(p['gainDelta'],p['paCase']));witness.append({'selection':pkg+'/paired-'+label,'id':p['paCase'],'plain':p['plainCase'],'delta':p['gainDelta']})
summary={'schema':'run-action-analysis-v1','indices':indices,'n':len(allrows),'primary':byfamily,'prototype':byproto,'byLook':bylook,'heat':heat,'roster':byroster,'transfer':transfer,'playAction':pa_summary,'pairs':pairs,'witnesses':witness,
 'flags':indices[0]['provenance']['flags'],'limitations':['Two fixed ordinary generated pairs, two execution seeds: descriptive stress coverage, not NFL frequencies or a representative league estimate.','PA pair changes the existing generic OL run show plus QB/RB fake and its protection availability; later execution draws need not stay matched.','Native fake scheme tags are aliases, not different run-line, pull, slice, fake-pitch or boot installations.','A loaded first-contact defender or unachieved second-level job is an investigation flag, not a demonstrated controller error.','20-second live endings are censored, excluded from terminal gain/success statistics.','Opening clocks use exact saved1/2s states; .5s was bracketed by .4/.6s sampling and is not interpolated.']}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');(OUT/'rows.json.gz').write_bytes(gzip.compress(json.dumps(compact,separators=(',',':')).encode()))
print(json.dumps({'n':len(allrows),'primary':byfamily,'prototype':byproto,'pa':pa_summary},indent=2))
