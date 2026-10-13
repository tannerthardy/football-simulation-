"""Summarize saved native film; no rerun, outcome selection or policy change."""
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path('out/catch-transition')
INPUT = Path('data/reviews/current/catch-transition-inputs.json')


def read(path):
    return json.loads(Path(path).read_text())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def trace(case):
    with gzip.open(case['artifact']['path']) as f:
        return json.load(f)


def compact_geometry(g):
    if not g:
        return None
    keys = ('distance', 'closing', 'transverseSpeed', 'rearCos', 'defenderSpeed', 'runnerSpeed')
    return {**{k: g[k] for k in keys}, 'headingDifferenceDegrees': math.degrees(g['headingDifference']),
            'defenderVelocity': g['defender']['vel'], 'runnerVelocity': g['runner']['vel']}


packet = read(INPUT)
fixtures = {c['id']: c for c in packet['clips']}


def measure(case):
    d = trace(case)
    a = d['selectedDefender']['idx']
    receiver_id = d['actualReceiverId']
    fixture = fixtures[d['id']]
    players = list(fixture['setup']['offense'].values()) + list(fixture['setup']['defense'].values())
    assert players[a]['id'] == d['selectedDefender']['id']
    carrier = next((i for i, p in enumerate(players) if p['id'] == receiver_id), None)
    h = next((h for h in d['holds'] if h['defender'] == a and h['carrier'] == carrier), None)
    acq = d['acquisition']
    snapshots = []
    if h and h['firstLoaded'] is not None:
        load = h['firstLoaded']
        for delta in (0, .1, .2, .4, .8):
            rows = [r for r in d['rows'] if r['world'] and r['t'] + .05 >= load - 1e-8]
            r = min(rows, key=lambda r: abs(r['t'] + .05 - load - delta))
            if abs(r['t'] + .05 - load - delta) > 1e-6:
                continue
            w = r['world']
            c = w['after'][carrier]
            s = c['support']
            j = next((j for j in w['grasps'] if j['a'] == a and j['b'] == carrier), None)
            snapshots.append({'worldBoundary': r['t'] + .05, 'elapsedFromLoad': delta,
                'runnerVelocity': c['vel'], 'runnerSpeed': math.hypot(*c['vel'].values()),
                'runnerSupport': s['state'], 'runnerXi': s['xi'], 'runnerXiNorm': math.hypot(*s['xi'].values()),
                'runnerFoot': s.get('foot'), 'defenderSupport': w['after'][a]['support']['state'],
                'reportedForce': j.get('force') if j else None, 'capacity': j['capacity'] if j else None,
                'broken': j.get('broken', False) if j else None})
    containment = []
    if h and h['brokenAt'] is not None:
        for delta in (0, .5, 1):
            r = min((r for r in d['rows'] if r['world']), key=lambda r: abs(r['t'] + .05 - h['brokenAt'] - delta))
            w = r['world']
            c = w['after'][carrier]
            speed = math.hypot(*c['vel'].values())
            defenders = []
            for b in w['after'][11:]:
                if b['idx'] == a:
                    continue
                dx, dy = b['pos']['x'] - c['pos']['x'], b['pos']['y'] - c['pos']['y']
                defenders.append({'idx': b['idx'], 'id': players[b['idx']]['id'], 'distance': math.hypot(dx, dy),
                    'offset': {'x': dx, 'y': dy}, 'alongRunner': (dx*c['vel']['x'] + dy*c['vel']['y']) / max(1e-9, speed),
                    'velocity': b['vel'], 'requestedVelocity': w['applied'][b['idx']]['vel'], 'support': b['support']['state']})
            containment.append({'worldBoundary': r['t'] + .05, 'nearest': sorted(defenders, key=lambda b: b['distance'])[:3],
                                'aheadAlongRunner': [b for b in defenders if b['alongRunner'] > 0]})
    return {'id': d['id'], 'geometry': d['geometry'], 'drawSource': case.get('drawSource', 'natural'),
        'sourceTrace': case['artifact'], 'signature': d['signature'], 'observerVerified': case['observerVerified'],
        'selectedDefender': d['selectedDefender'], 'actualReceiverId': receiver_id,
        'outcome': d['result']['outcome'], 'possession': d['result']['possession'], 'yac': d['result']['stats'].get('yac'),
        'penalty': d['result'].get('penalty'), 'censored': d['censored'], 'changedCalls': d['changedCalls'],
        'interceptedBy': d['result']['stats'].get('interceptedBy'),
        'acquisition': None if not acq else {**{k: acq[k] for k in ('t','q','base','nativeExecution','appliedExecution','nativeQuality','appliedQuality','rngSha256')},
            'geometry': compact_geometry(acq['geometry']), 'nativeLegPlacement': acq['before']['legs'], 'capacityAtAcquisition': acq['after']['capacity']},
        'selectedHold': None if not h else {**{k: h[k] for k in ('origin','firstLoaded','brokenAt','initialCapacity','legs')},
            'entryGeometry': compact_geometry(h['entryGeometry']),
            'loadedSurvival': (h['brokenAt'] if h['brokenAt'] is not None else d['result']['duration']) - h['firstLoaded'],
            'survivalEndpoint': 'slip' if h['brokenAt'] is not None else 'natural completed play; no observed slip'},
        'holds': d['holds'], 'recoverySnapshots': snapshots, 'containment': containment,
        'contactEvents': [e for e in d['result']['events'] if e['type'] in ('catch','interception','tackle_wrap','broken_tackle','fall','tackle','touchdown')]}


matrix, panel = read(ROOT/'portable-matrix/summary.json'), read(ROOT/'portable-panel/summary.json')
p4 = {g: trace(next(o for c in panel['cases'] if c['id']=='R6103-S3001-P4' for o in c['outcomes'] if o['geometry']==g)) for g in ('baseline','arrival')}
phase = {g: [{k: r[k] for k in ('t','phaseBefore','raw','decision','forecast')} for r in d['rows'] if 2.75 <= r['t'] <= 3.05] for g,d in p4.items()}
random = {}
for g,d in p4.items():
    random[g] = [x for x in d['randomCalls'] if x['name']=='normal' and 3.4<=x['t']<=3.6 and any('at attempt' in c for c in x['caller'])]
divergence = next(({'callIndex': i, 'baseline': b, 'arrival': a} for i,(b,a) in enumerate(zip(p4['baseline']['randomCalls'],p4['arrival']['randomCalls'])) if b!=a), None)
receipts = [ROOT/f'{name}-receipt.json' for name in ('matrix','panel','portable-matrix','portable-panel','checks')]
result = {'schema':'catch-transition-diagnosis-v1','input':{'path':str(INPUT),'sha256':digest(INPUT)},
    'analysisSource':{'path':__file__,'sha256':digest(__file__),
                      'figureScript':{'path':'scripts/diag/catch-transition-figures.py','sha256':digest('scripts/diag/catch-transition-figures.py')}},
    'matrix': {'provenance':matrix['provenance'],'witnesses':matrix['witnesses'],'cases':[measure(c) for c in matrix['cases']]},
    'panel': {'provenance':panel['provenance'],'cases':[{'id':c['id'],'outcomes':[measure(o) for o in c['outcomes']]} for c in panel['cases']]},
    'p4BoundaryFilm':phase,'p4ActualNormalDraws':random,'p4FirstRandomCallDivergence':divergence,
    'launcherReceipts':[{'path':str(p),'sha256':digest(p),'receipt':read(p)} for p in receipts],
    'counting':'Eight inspected inputs. Initial six matrix arms and sixteen panel arms each verified observed/plain (44 full runs). Portable replay repeats the same 44 runs; no extra population or fresh-transfer evidence.',
    'diagnosis':'Weaker execution suffices for both P4 geometries to slip and concede TD; stronger execution finishes both. Moving arrival changes geometry and delays acquisition one tick, rerouting the shared RNG stream through block execution before the tackle. Catch-to-pursuit handoff reduces command discontinuity; a harmful transition defect is not established. No new controller patch or promotion.',
    'limits':'Geometry rows retain their own leg-placement draw, approach/contact history and other native randomness. This factorial does not isolate leg placement, estimate tackle probability or establish NFL calibration. Free previews do not forecast cuts, contacts or loaded recovery. Complete outcomes are separate from short measured recovery intervals.'}
destination=Path('data/reviews/current/catch-transition-diagnosis.json')
destination.write_text(json.dumps(result,separators=(',',':'))+'\n')
print(json.dumps({'destination':str(destination),'bytes':destination.stat().st_size,'matrixArms':len(matrix['cases']),'panelInputs':len(panel['cases'])}))
