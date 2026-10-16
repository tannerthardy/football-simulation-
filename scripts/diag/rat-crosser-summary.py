"""Saved-record comparison only. No simulation, imputation or new observations.
python3 scripts/diag/rat-crosser-summary.py out/rat-crosser-duty OUTPUT.json
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

root, output = map(Path, sys.argv[1:])

def load(name):
    return json.loads(gzip.decompress((root / name).read_bytes()))

base = load('baseline.json.gz')
candidate = load('candidate-lateral.json.gz')
arms = [base['reports'] + load('drive-baseline.json.gz')['reports'],
        candidate['reports'] + load('drive-candidate.json.gz')['reports']]
for name in ['candidate-lateral.json.gz', 'drive-baseline.json.gz', 'drive-candidate.json.gz']:
    packet = load(name)
    for field in ['node', 'lockSha256', 'flags', 'worldDefaults', 'platform', 'arch']:
        assert packet[field] == base[field], (name, field)
assert load('drive-baseline.json.gz')['sourceSha256'] == base['sourceSha256']
assert load('drive-candidate.json.gz')['sourceSha256'] == candidate['sourceSha256']

def frame(rep, t):
    return next(f for f in rep['frames'] if abs(f['t'] - t) < 1e-8)

def geometry(rep, t, defender, receiver):
    f = frame(rep, t)
    sf = next(f for f in rep['states'] if abs(f['t'] - t) < 1e-8)
    dp, rp = [f['agents'][i*3:i*3+2] for i in [defender, receiver]]
    dv, rv = [sf['agents'][i]['body']['velocity'] for i in [defender, receiver]]
    speed = math.hypot(*rv)
    ux, uy = (rv[0]/speed, rv[1]/speed) if speed else (1,0)
    dx, dy = dp[0]-rp[0], dp[1]-rp[1]
    heading = math.atan2(dv[1], dv[0]) - math.atan2(rv[1], rv[0])
    return dict(t=t, defender=defender, receiver=receiver, separation=math.hypot(dx,dy),
                defenderPosition=dp, receiverPosition=rp, defenderVelocity=dv, receiverVelocity=rv,
                alongRunner=dx*ux+dy*uy, transverse=dx*(-uy)+dy*ux,
                velocityAngleDegrees=abs(math.degrees(math.atan2(math.sin(heading),math.cos(heading)))),
                defenderState=sf['agents'][defender]['body']['state'])

def outcome(rep):
    catch = next((e for e in rep['events'] if e['type'] == 'catch'), None)
    runner = catch['a'] if catch else None
    relevant = [e for e in rep['events'] if e['type'] in
                ['throw','catch','interception','carrier_contact','tackle_wrap','broken_tackle','tackle']]
    grips = []
    for e in relevant:
        if e['type'] != 'tackle_wrap' or e.get('b') != runner:
            continue
        end = next((x for x in relevant if x['t'] > e['t'] and
                    ((x['type']=='broken_tackle' and x.get('b')==e['a']) or x['type']=='tackle')), None)
        grips.append(dict(start=e['t'], defender=e['a'],
                          geometry=geometry(rep,e['t'],e['a'],runner),
                          survivedRecordedSeconds=(end['t'] if end else rep['end'])-e['t'],
                          endEvent=end['type'] if end else 'right-censored'))
    return dict(end=rep['end'], censored=rep['censored'], outcome=rep['outcome'],
                actualCatcher=runner, catcherId=rep['actors'][runner]['id'] if runner is not None else None,
                events=relevant, grips=grips,
                finalYac=rep['stats'].get('yac') if not rep['censored'] else None,
                lastRecordedTime=rep['frames'][-1]['t'],
                observedProgressSinceCatch=(rep['frames'][-1]['agents'][runner*3]-catch['pos']['x']) if catch else None)

comparisons = []
for b,c in zip(*arms):
    assert b['fixture'] == c['fixture']
    assert b['initialSha256'] == c['initialSha256']
    first = next((r for r in c['rows'] if r['rule']['cut'] is not None), None)
    if first:
        baseline_entry = next(r for r in b['rows'] if r['t'] == first['t'])
        assert baseline_entry['before'] == first['before'], 'Entry bodies differ before the new decision'
    unchanged = b['endpointSha256'] == c['endpointSha256']
    if c['fixture']['id'] in ['rat-verticals','ordinary-robber-mesh']:
        assert unchanged
        assert b['frames'] == c['frames']
        assert [s['agents'] for s in b['states']] == [s['agents'] for s in c['states']]
    samples = []
    if first:
        for t in [1.8,2,2.4,3]:
            samples.append(dict(t=t, baseline=geometry(b,t,first['actor'],first['rule']['cut']),
                                candidate=geometry(c,t,first['actor'],first['rule']['cut'])))
    comparisons.append(dict(fixture=c['fixture'], initialSha256=c['initialSha256'],
                            endpointEqual=unchanged,
                            firstCut={k:first[k] for k in ['t','actor','before','rule','command','goal']} if first else None,
                            approach=samples, baseline=outcome(b), candidate=outcome(c)))

receipts = []
for path in sorted(root.glob('*.json')):
    value = json.loads(path.read_text())
    if 'commands' in value and 'sourceSha256' in value:
        receipts.append(dict(path=path.name,source=value['sourceSha256'],exitCode=value['exitCode'],
                             seconds=sum(c['elapsedSeconds'] for c in value['commands'])))
result = dict(schema='rat-crosser-summary-v1', baseline=base['sourceSha256'], candidate=candidate['sourceSha256'],
              interpretation='Recorded rounded replay geometry, not gaze, exact impact-time geometry or grasp force. No-contact is not a broken hold. Censored YAC is never reported as a completed outcome.',
              comparisons=comparisons,receipts=receipts,totalLauncherSeconds=sum(r['seconds'] for r in receipts),
              inputs={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.glob('*.gz'))})
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(output=str(output),cases=len(comparisons),unchanged=sum(c['endpointEqual'] for c in comparisons),
                      launcherSeconds=result['totalLauncherSeconds'])))
