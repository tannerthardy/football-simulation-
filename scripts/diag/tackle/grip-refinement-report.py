"""Reduce the pinned traces, aligning common physical times, not outcome labels.
python3 -I scripts/diag/tackle/grip-refinement-report.py [out/grip-refinement/final]
"""
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv)>1 else 'out/grip-refinement/final')
THRESHOLDS = {'position':.01,'support':.002,'spin':.05,'facing':.01}
def read(p):
    with gzip.open(p,'rt') as f:return json.load(f)
def vec(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
def distance(a,b):
    return {'position':max(vec(x['pos'],y['pos']) for x,y in zip(a,b)),
            'support':max(vec(x['support']['xi'],y['support']['xi']) for x,y in zip(a,b)),
            'spin':max(abs(x['spin']-y['spin']) for x,y in zip(a,b)),
            'facing':max(abs(math.remainder(x['facing']-y['facing'],2*math.pi)) for x,y in zip(a,b))}
def common(a,b):
    fine={round(r['t']+r['h'],8):r for r in b['trace']};first={};maximum={k:0. for k in THRESHOLDS};last=None
    for r in a['trace']:
        t=r['t']+r['h'];q=fine.get(round(t,8))
        if q is None:continue
        d=distance(r['end'],q['end']);last=d
        for k,x in d.items():
            maximum[k]=max(maximum[k],x)
            if x>THRESHOLDS[k] and k not in first:first[k]={'t':t,'difference':x}
    return {'firstThreshold':first,'maxError':maximum,'lastCommonError':last}
def first_event(trace):
    out=[]
    for r in trace:
        for e in r['events']:
            if not e.get('suppressed'):out.append(e)
    return out

def crossing(trace):
    for row in trace:
        for u in row['supportUpdates']:
            p=u.get('phase')
            if not p:continue
            a=p['input'];e,rb,w,h=a['e'],a['rb'],a['w'],a['h'];force=-a['loadVelocity']
            if e<=rb and p['result']['next']>rb and force>w*rb:
                tc=-math.log((force/w-rb)/(force/w-e))/w
                rest=h-tc
                if rest<0:continue
                # Exact first inside-to-outside crossing for frozen input;
                # after it the same outside ramp starts at zero elapsed time.
                y=force*math.expm1(w*rest)/w-a['speed']/a['latency']*(math.expm1(w*rest)-w*rest)/(w*w)
                exact=rb+y
                return {'substepStart':row['t'],'body':u['i'],'input':a,'current':p['result']['next'],
                        'eventAware':exact,'error':exact-p['result']['next'],'crossingAfter':tc,
                        'remainsOutside':y>0}
    return None

def matrix(rows):
    fine=rows[96]['reports'];result=[]
    for n in [12,24,48]:
        errors=[distance(x['poses'],y['poses']) for x,y in zip(rows[n]['reports'],fine)]
        result.append({'n':n,'maxError':{k:max(d[k] for d in errors) for k in THRESHOLDS},
                       'firstThreshold':{k:next(({'t':x['t'],'difference':d[k]} for x,d in zip(rows[n]['reports'],errors) if d[k]>THRESHOLDS[k]),None) for k in THRESHOLDS}})
    return result

m=read(ROOT/'manifest.json.gz');summary={'source':m['source'],'collector':m['collector'],'thresholds':THRESHOLDS,
    'native':[],'fixedDecision':[],'phaseCrossings':[],'limits':['Thresholds mark visible numerical differences; they are not NFL targets or convergence guarantees.',
    'Transient onset errors and comparisons after state transitions must be interpreted separately.',
    'No-grip control forces the same local partition while retaining a single 20 Hz gait plan.']}
for mode in ['center','patch']:
    for side in [1,-1]:
        native={n:read(ROOT/f'native-{mode}-{side}-{n}.json.gz') for n in [12,24,48,96]}
        summary['native'].append({'mode':mode,'side':side,'results':[{ 'n':n,'result':r['result'],'decisions':r['decisions']} for n,r in native.items()],
            'refinement':[{'n':n,**common(native[n],native[96])} for n in [12,24,48]]})
        del native
        for variant in ['full','no-grip','passive','no-balance','passive-no-balance','active-no-balance','support-no-fall','fixed-movement','free','integrated-follow','no-launch','extra-iterations']:
            rows={n:read(ROOT/f'replay-{mode}-{side}-{variant}-{n}.json.gz') for n in [12,24,48,96]}
            assert len({r['initial'] for r in rows.values()})==1
            assert len({r['decisions'] for r in rows.values()})==1
            assert len({r['profiles'] for r in rows.values()})==1
            summary['fixedDecision'].append({'mode':mode,'side':side,'variant':variant,'initial':rows[96]['initial'],'decisions':rows[96]['decisions'],
                 'refinement':matrix(rows),'firstInterval':common({'trace':rows[12]['trace'][:12]}, {'trace':rows[96]['trace'][:96]}),
                 'events':[{ 'n':n,'events':first_event(r['trace'])} for n,r in rows.items()],
                 'budgets':{'maxResidual':max(abs(x['work']['residual']) for r in rows.values() for x in r['reports']),
                    'maxArmExcess':max(v-l for r in rows.values() for x in r['reports'] for v,l in zip(x['armWork'],x['armLimit'])),
                    'maxSupportWorkExcess':max(v-l for r in rows.values() for x in r['reports'] for v,l in zip(x['supportWork'],x['supportLimit']))}})
            if variant=='full':
                for n in [12,24,48,96]:summary['phaseCrossings'].append({'mode':mode,'side':side,'n':n,'crossing':crossing(rows[n]['trace'])})
            del rows
summary['manifest']={'path':str(ROOT/'manifest.json.gz'),'sha256':hashlib.sha256((ROOT/'manifest.json.gz').read_bytes()).hexdigest()}
out=ROOT/'summary.json';out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'out':str(out),'source':m['source'],'native':len(summary['native']),'isolationRows':len(summary['fixedDecision'])}))
