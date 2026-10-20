#!/usr/bin/env python3
"""Offline measurements/figure only; does not import or execute the simulator.

Run from repository root: python3 out/puller-technique/final-analysis.py
Published packet: --evidence data/reviews/current/puller-technique
  --power-baseline PATH_TO_EXISTING_FULL_OR_COMPACT_POWER_TAPE
No external evidence is downloaded automatically.
"""
import argparse, gzip, hashlib, json, math, os
from collections import defaultdict
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR','/tmp/puller-matplotlib')
os.environ.setdefault('XDG_CACHE_HOME','/tmp/puller-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence',type=Path,default=Path('out/puller-technique'))
parser.add_argument('--power-baseline',type=Path,default=Path('out/run-contact-composition/power-baseline.json.gz'))
parser.add_argument('--output',type=Path,help='Defaults to --evidence; writes JSON, SVG and PNG only.')
args=parser.parse_args()
ROOT = args.evidence.resolve()
DEST = args.output.resolve() if args.output else ROOT
DEST.mkdir(parents=True,exist_ok=True)
REPO = Path.cwd().resolve()
FILES = {
    'K01': {'baseline': ROOT/'k01-baseline.json.gz', 'final': ROOT/'k01-final.json.gz'},
    'K04': {'baseline': ROOT/'k04-baseline.json.gz', 'final': ROOT/'k04-final.json.gz'},
    'Power': {'baseline': args.power_baseline.resolve(), 'final': ROOT/'power-final.json.gz'},
}
def read(p):
    with gzip.open(p, 'rt') as f: return json.load(f)
DATA = {case:{arm:read(path) for arm,path in arms.items()} for case,arms in FILES.items()}
def wrap(x): return math.atan2(math.sin(x), math.cos(x))
def body(f,slot,when='before'): return next(a for a in f[when] if a['slot']==slot)
def command(p,f,slot,raw=False):
    if raw and 'updates' in f:
        u=next((u for u in f['updates'] if u['slot']==slot),None)
        return u['command'] if u else None
    return f['raw' if raw else 'final'][p['slots'].index(slot)]
def desired(cmd,a):
    if 'facing' in cmd: return cmd['facing']
    v=cmd['vel']
    if math.hypot(v['x'],v['y'])>.4: return math.atan2(v['y'],v['x'])
    v=a['vel']
    return math.atan2(v['y'],v['x']) if math.hypot(v['x'],v['y'])>.6 else a['facing']
def windows(samples):
    """Return start-of-tick sample intervals, not assumed continuous contacts."""
    runs=[]
    for t,end,force in samples:
        if runs and abs(t-runs[-1]['lastTickEnd'])<1e-7:
            r=runs[-1];r['lastSampleTick']=t;r['lastTickEnd']=end;r['samples']+=1;r['maxForceKgYdPerS2']=max(r['maxForceKgYdPerS2'],force)
        else:runs.append({'firstSampleTick':t,'lastSampleTick':t,'lastTickEnd':end,'samples':1,'maxForceKgYdPerS2':force})
    return runs
def hand_samples(p):
    groups=defaultdict(list)
    for f in p['frames']:
        for e in f.get('hands',f.get('handsAfter',[])):
            h=e.get('hand',e.get('hands'))
            if h:
                force=math.hypot(h.get('normal',0),h.get('tangent',0))
                if force>1e-9: groups[(e['b'],e['d'])].append((f['t'],f['end'],force))
            # Only the older full Power tape measures individual helper forces.
            for h in e.get('helperHands',[]):
                force=math.hypot(h.get('normal',0),h.get('tangent',0))
                if force>1e-9:groups[(h['h'],e['d'])].append((f['t'],f['end'],force))
    return groups
def rotation(p,slot):
    frames=[f for f in p['frames'] if f['end']<=1.2+1e-8]
    prev=body(frames[0],slot)['facing'];dtotal=0.;achieved=0.;requested=[];rawrequested=[];prevraw=prev;rtotal=0.
    for f in frames:
        a=body(f,slot);q=desired(command(p,f,slot),a)
        dtotal+=abs(wrap(q-prev));prev=q;requested.append(q)
        raw=command(p,f,slot,True)
        if raw:
            qr=desired(raw,a);rtotal+=abs(wrap(qr-prevraw));prevraw=qr;rawrequested.append(qr)
        achieved+=abs(wrap(body(f,slot,'after')['facing']-a['facing']))
    return {'window':[0,1.2], 'achievedAbsoluteRotationDegrees':math.degrees(achieved),
            'finalRequestedHeadingTotalVariationDegrees':math.degrees(dtotal),
            'rawRequestedHeadingTotalVariationDegrees':math.degrees(rtotal),
            'finalBodyFacingDegrees':math.degrees(body(frames[-1],slot,'after')['facing']),
            'finalBodyPosition':body(frames[-1],slot,'after')['pos']}
def phase_entries(p):
    out={}
    for slot in p['slots'][:11]:
        initial=body(p['frames'][0],slot).get('plan')
        if not initial or initial.get('kind')!='pull':continue
        if 'pullIdx' not in initial:
            out[slot]={'available':False,'reason':'Cached tape did not record private pullIdx/corner state.'};continue
        phases={};cleared=None
        for f in p['frames']:
            for when,time in [('before',f['t']),('after',f['t'])]:
                plan=body(f,slot,when).get('plan')
                if plan and 'pullIdx' in plan:
                    phases.setdefault(str(plan['pullIdx']),time)
                    if plan.get('cleared') and cleared is None:cleared=time
        out[slot]={'available':True,'role':initial.get('role'), 'target':initial.get('target'),
                   'firstCommandTickByPhase':phases,'firstClearedCommandTick':cleared,
                   'semantics':'after-controller phase is recorded on its command tick; before may already contain controller changes.'}
    return out
def metrics(p,path):
    slots=p['slots'];off=set(slots[:11]);impacts=defaultdict(list)
    for f in p['frames']:
        for c in f.get('contacts',f.get('report',{}).get('contacts',[])):
            if c.get('impulse',0)<=0:continue
            i,j=c['i'],c['j'];a,b=slots[i],slots[j]
            if a in off and b in off:
                key='/'.join(sorted([a,b]));impacts[key].append({'t':f['t'],'i':i,'j':j,'impulse':c['impulse']})
    event=next((e for e in p['events'] if e['type']=='carrier_contact'),None)
    if event:event={**event,'observer':slots[event['a']],'other':slots[event['b']]}
    los=p['setup']['los'];arrival=None
    for f in p['frames']:
        a=body(f,'RB');b=body(f,'RB','after')
        if b['pos']['x']>=los:
            arrival={'firstPostStepAtOrBeyondLOS':f['end'],'tick':f['t'],'position':b['pos'],
                     'firstEntryFrameAtOrBeyondLOS':next((g['t'] for g in p['frames'] if body(g,'RB')['pos']['x']>=los),None)};break
    groups=hand_samples(p)
    target_changes={}
    for slot in slots[:11]:
        changes=[];prev=None
        for f in p['frames']:
            plan=body(f,slot).get('plan')
            if not plan:continue
            key=(plan.get('kind'),plan.get('role'),plan.get('target'))
            if key!=prev:
                changes.append({'tick':f['t'],'kind':key[0],'role':key[1],'target':key[2]});prev=key
        target_changes[slot]=changes
    result={'path':os.path.relpath(path,REPO),'fileSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'inputSha256':p['inputSha256'],'sourceSha256':p.get('sourceSha256'), 'traceCommit':p.get('commit'),
        'node':p['node'],'settings':p['flags'],'all22Present':all(len(f['before'])==22 for f in p['frames']),
        'censored':p['censored'],'terminalTime':p['frames'][-1]['end'],'result':p['result'],
        'passiveObserverVerified':p.get('passive',p.get('passiveObserverVerified')),
        'phaseEntries':phase_entries(p), 'installedAndLaterTargetChanges':target_changes,
        'actualPrimaryAndMeasuredHelperLoad':{
            '/'.join(k):windows(v) for k,v in groups.items()},
        'individualHelperForceRecorded':'handsAfter' in p['frames'][0],
        'firstCarrierContactEvent':event,'runnerLOSArrival':arrival,
        'openingRotation':{s:rotation(p,s) for s in ['RG','RT','LG']},
        'offensiveTeammateImpacts':{'samples':sum(map(len,impacts.values())),
            'byPair':{k:{'samples':len(v),'sumImpulse':sum(c['impulse'] for c in v),
                        'maxImpulse':max(c['impulse'] for c in v),'firstTick':v[0]['t'],'lastTick':v[-1]['t'],
                        'nativeIndexPairs':sorted({(c['i'],c['j']) for c in v})} for k,v in impacts.items()}}}
    if path==FILES['Power']['baseline']:
        receipt_path=path.parent/'power-baseline-receipt.json'
        if receipt_path.exists():
            receipt=json.loads(receipt_path.read_text());result['sourceSha256']=receipt['sourceSha256']
            result['sourceQualification']='Cached source digest matches accepted 2c98bed9; trace commit is export parent, not runtime pin.'
        elif result['fileSha256'] in ['264ded34e0bc1921d7aeb0ae5b2bdda65b2c2c87bae708cc263154ff7aae0d05','b4874e4e1a8af2e534cee7931f6e0fa5039734c4beb1b79d1a00bc68fab8fc68']:
            result['sourceSha256']='4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571'
            result['sourceQualification']='Exact known full/compact gzip hash matches externally published Power baseline receipt, packet1e2415a70953f69f4e7e71a86136196370f25204; no download performed.'
        else:raise ValueError('Unrecognized Power baseline file without adjacent power-baseline-receipt.json; supply the exact saved evidence.')
    return result

RESULT={case:{arm:metrics(p,FILES[case][arm]) for arm,p in arms.items()} for case,arms in DATA.items()}
COST=[]
for path in sorted(ROOT.glob('*-receipt.json')):
    r=json.loads(path.read_text())
    for c in r.get('commands',[]):
        cmd=c['command'];kind='native' if any('scripts/diag/puller-technique.ts' in x for x in cmd) else 'typecheck' if 'typecheck' in cmd else 'focused_or_launcher'
        COST.append({'receipt':path.name,'commit':r.get('commit'),'sourceSha256':r.get('sourceSha256'),
                     'category':kind,'exitCode':c.get('exitCode'),'seconds':c['elapsedSeconds'],'command':cmd})
OUT={'runtimeCommit':'459f7506f8219df404cc9df59aa03aadf3ffb673','acceptedComparisonCommit':'2c98bed94adad8087c65f381d4090444ad283985',
     'definitions':{'rotation':'Absolute wrapped per-tick executed facing deltas, through the step ending1.20s. Requested heading variation uses the exact defaultFacing fallback from kinematics.ts; not physical execution.',
       'forceUnits':'Raw engine force: kg*yd/s^2. Raw engine impulse: kg*yd/s. No SI conversion is applied; these are not newtons or newton-seconds.',
       'load':'Nonzero hypot(primary normal,tangent); individual helpers only when their forces were actually recorded. Tick-start labels with end bounds, not exact continuous force integrals.',
       'phase':'Controller phase-entry command ticks; cached Power baseline has no phase telemetry.',
       'impacts':'Positive native report contact impulse between two offensive slots, identified using native i/j. Samples can repeat a physical encounter.',
       'firstRBContact':'First native carrier_contact event, separate from terminal tackle.',
       'context':'All22 players react normally; terminal continuations are uncensored. No film, new simulation or future-path forcing.',
       'lateRetargetQualification':'Final K01 RG changes from DE_W to LB_W at3.75, after first RB contact3.70. Its later Will force is not end-kick protection. Existing availability/retarget gate risk is preserved for review, not bundled into this patch.',
       'PowerRoleQualification':'Power LG has installed pullRole kick and target LB_S in this one-back setup. It makes useful second-level contact but is not relabeled a conventional lead/wrap job.'},
     'cases':RESULT,'cost':{'receipts':COST,'sumRecordedNewCommandSeconds':sum(c['seconds'] for c in COST),
       'nativeSeconds':sum(c['seconds'] for c in COST if c['category']=='native'),
       'finalNativeSeconds':sum(c['seconds'] for c in COST if c['category']=='native' and '-final-receipt' in c['receipt']),
       'note':'Totals include receipted rejected/intermediate native runs and failed launch/check attempts. Cached Power baseline reused; its prior execution excluded. No costs inferred for unreceipted work.'}}
(DEST/'final-metrics.json').write_text(json.dumps(OUT,indent=2)+'\n')

# One static comparison: body rotation, actual route against acquired clearance,
# and measured hand loads. Source tapes are read once; no simulator execution.
plt.rcParams.update({'font.size':11,'axes.spines.top':False,'axes.spines.right':False,
                     'font.family':'DejaVu Sans','svg.fonttype':'none'})
fig,axes=plt.subplots(2,2,figsize=(14,9.5),gridspec_kw={'height_ratios':[1,1.12]})
colors={'baseline':'#a64127','final':'#126e9d'}
def unwrap(values):
    if not values:return []
    out=[values[0]]
    for i in range(1,len(values)):out.append(out[-1]+wrap(values[i]-values[i-1]))
    return [math.degrees(x) for x in out]
for ax,slot in zip(axes[0],['RG','RT']):
    for arm,p in DATA['K01'].items():
        fs=[f for f in p['frames'] if f['end']<=1.2+1e-8]
        ax.plot([0]+[f['end'] for f in fs],unwrap([body(fs[0],slot)['facing']]+[body(f,slot,'after')['facing'] for f in fs]),color=colors[arm],lw=2.6,label=arm.title()+' body')
        ax.plot([f['t'] for f in fs],unwrap([desired(command(p,f,slot),body(f,slot)) for f in fs]),color=colors[arm],ls='--',lw=1.4,alpha=.8)
    before=RESULT['K01']['baseline']['openingRotation'][slot]['achievedAbsoluteRotationDegrees']
    after=RESULT['K01']['final']['openingRotation'][slot]['achievedAbsoluteRotationDegrees']
    ax.set(title=f'K01 {slot}: opening facing',xlabel='Seconds after snap',ylabel='Unwrapped angle (degrees)')
    ax.text(.03,.96,f'Total executed turn: {before:.0f}° → {after:.0f}°',transform=ax.transAxes,va='top',bbox={'facecolor':'white','alpha':.85,'edgecolor':'none'})
    ax.grid(alpha=.2);ax.axhline(0,color='#777',lw=.5)
axes[0,0].legend(handles=[Line2D([0],[0],color=colors['baseline'],lw=2.6,label='Before body'),Line2D([0],[0],color=colors['final'],lw=2.6,label='Final body'),Line2D([0],[0],color='#555',ls='--',label='Requested heading')],loc='lower left',fontsize=9)
ax=axes[1,0]
for arm,p in DATA['K01'].items():
    fs=[f for f in p['frames'] if f['t']<=3+1e-8];rad=p['profiles'][p['slots'].index('RT')]['radius']
    ax.plot([f['t'] for f in fs],[body(f,'RT')['pos']['x']-40 for f in fs],color=colors[arm],lw=2.6,label=arm.title()+' RT center')
    fs2=[f for f in fs if body(f,'RT')['plan'].get('pullRead') and body(f,'RT')['plan']['pullRead'].get('clearanceX') is not None]
    ax.plot([f['t'] for f in fs2],[body(f,'RT')['plan']['pullRead']['clearanceX']-rad-40 for f in fs2],color=colors[arm],ls=':',lw=1.7,alpha=.9)
ax.set(title='K01 RT: achieved depth vs acquired rear wall',xlabel='Seconds after snap',ylabel='Center x relative to LOS (yards)')
ax.text(.03,.96,'Dotted: held rear-wall boundary for the center\nActual center below dotted line = acquired rear clearance',transform=ax.transAxes,va='top',fontsize=9,bbox={'facecolor':'white','alpha':.9,'edgecolor':'none'})
ax.grid(alpha=.2);ax.legend(loc='lower right',fontsize=9)
ax=axes[1,1]
for row,(case,pair) in enumerate([('K01',('RG','DE_W')),('K01',('LT','LB_W')),('K01',('H','LB_M')),('Power',('LG','LB_S'))]):
    for arm,shift in [('baseline',.14),('final',-.14)]:
        for window in RESULT[case][arm]['actualPrimaryAndMeasuredHelperLoad'].get('/'.join(pair),[]):
            ax.broken_barh([(window['firstSampleTick'],window['lastTickEnd']-window['firstSampleTick'])],(row+shift-.105,.21),facecolors=colors[arm])
ax.set_yticks(range(4),['K01 RG → end','K01 LT → Will','K01 H → Mike','Power LG → Sam'])
ax.invert_yaxis();ax.set(xlim=(0,4.7),xlabel='Seconds after snap',title='Actual nonzero hand-load samples')
ax.grid(axis='x',alpha=.2)
ax.text(.06,1.14,'Before: no LT/Will hand-load samples',fontsize=8.8,color=colors['baseline'])
fig.suptitle('Pulling technique: reduce opening rotation and stabilize the rear-clearance objective',fontsize=15,x=.03,ha='left',y=.986)
fig.text(.03,.947,'Accepted develop 2c98bed9 (rust) → candidate 459f7506 (blue). All22 players react normally; same frozen inputs and capabilities.',fontsize=10,color='#444')
fig.text(.03,.022,'Native endings: K01 6.33 → 5.86yd; K04 5.37 → 6.13yd; Power 4.15 → 3.92yd. Ordinary tackles remain. No gain target or guaranteed collection.\nSolid facing curves are achieved execution; dashed curves are current requests. Hand bars show sampled force, not an assignment or compression requirement.\nK01 RT/Sam has no hand load; Sam never reaches the observed RB route. Force presence alone does not prove full route protection.',fontsize=9,color='#444')
fig.tight_layout(rect=[.02,.10,.985,.925],h_pad=2.4,w_pad=3)
fig.savefig(DEST/'comparison.svg',facecolor='white')
fig.savefig(DEST/'comparison.png',dpi=160,facecolor='white')
print(json.dumps({'artifacts':['final-metrics.json','comparison.svg','comparison.png'],'nativeSeconds':OUT['cost']['nativeSeconds'],'finalNativeSeconds':OUT['cost']['finalNativeSeconds'],'allReceiptedCommandSeconds':OUT['cost']['sumRecordedNewCommandSeconds'],
 'brief':{case:{arm:{'gain':m['result']['gain'],'firstContact':m['firstCarrierContactEvent'],'phases':m['phaseEntries'],'rotation':{s:round(v['achievedAbsoluteRotationDegrees'],2) for s,v in m['openingRotation'].items()},'teammateImpactSamples':m['offensiveTeammateImpacts']['samples']} for arm,m in arms.items()} for case,arms in RESULT.items()}},indent=2))
