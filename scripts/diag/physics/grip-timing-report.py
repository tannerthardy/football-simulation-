"""Compact before/after receipt. Raw packets and force traces stay in out/."""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/grip-timing')
out = Path(sys.argv[2] if len(sys.argv) > 2 else root / 'summary.json')
b = json.loads((root / 'baseline.json').read_text())
c = json.loads((root / 'candidate.json').read_text())
gate = json.loads(Path('out/grip-timing-final-gate.json').read_text())
old_gate = json.loads(Path('out/contact-foundations/patch-gate.json').read_text())
usage = [json.loads(s) for s in Path('out/grip-timing-gate-usage.jsonl').read_text().splitlines()]
assert b['inputManifest'] == c['inputManifest'] and b['flags'] == c['flags']
def failures(g):
    return [a['fullName'] for t in g['testResults'] for a in t['assertionResults'] if a['status'] == 'failed']
old_failures, new_failures = failures(old_gate), failures(gate)

def error(run, reference):
    return dict(position=max(((p['pos']['x']-reference['end'][i]['pos']['x'])**2
        +(p['pos']['y']-reference['end'][i]['pos']['y'])**2)**.5 for i,p in enumerate(run['end'])),
        spin=max(abs(p['spin']-reference['end'][i]['spin']) for i,p in enumerate(run['end'])),
        facing=max(abs(p['facing']-reference['end'][i]['facing']) for i,p in enumerate(run['end'])))

frozen = [dict(id=f['id'], variant=f['variant'], before=error(f['before'], f['reference']),
    candidate=error(f['candidate'], f['reference']), integration=f['candidate']['integration'],
    momentumError=f['candidate']['momentumError'], workError=f['candidate']['energyError']) for f in c['frozen']]
native = []
mirror_error = 0.
for i in c['inputs']:
    row = {**i, 'runs': []}
    for n in (12, 96):
        old = next(r for r in b['native'] if r['id']==i['id'] and r['n']==n)
        new = next(r for r in c['native'] if r['id']==i['id'] and r['n']==n and r['timing']=='resolved')
        # This operator includes misses/proximity in its legacy afterContact
        # marker. Use acquired-grip advance here; do not label it NFL YAC.
        fields = ('ending', 'endWhy', 'finish', 'firstGrip', 'advanceAfterGrip', 'carrierState')
        row['runs'].append(dict(n=n, before={k:old['result'][k] for k in fields},
            candidate={k:new['result'][k] for k in fields}, seconds=dict(before=old['seconds'], candidate=new['seconds']),
            accounting=new['stats']))
    if i['side'] > 0:
        native.append(row)
    else:
        positive = next(q for q in native if q['name']==i['name'])
        for a,z in zip(positive['runs'],row['runs']):
            for kind in ('before','candidate'):
                assert a[kind]['ending']==z[kind]['ending']
                if a[kind]['advanceAfterGrip'] is not None and z[kind]['advanceAfterGrip'] is not None:
                    mirror_error=max(mirror_error,abs(a[kind]['advanceAfterGrip']-z[kind]['advanceAfterGrip']))
def counts(rows, n, timing=None):
    results=[r['result']['ending'] for r in rows if r['n']==n and (timing is None or r['timing']==timing)]
    return {k:results.count(k) for k in ('tackled', 'escaped', 'censored')}
retained=[]
for name in new_failures:
    u=next(r for r in usage if r['fullName']==name)
    retained.append(dict(name=name, **{k:u[k] for k in ('trials','intervals','limited')}))
result={k:c[k] for k in ('source','node','flags','inputs','inputManifest','candidate','frozenReferencePartitions')}
result.update(baseline=b['baseline'], baselineSource=b['source'], checkpoints=b['checkpoints'],
    note='API option only, default midpoint. No capacity/recovery-law change or patch promotion. Native gain is advance after the acquired grip, not actual-contact or NFL YAC.',
    frozen=[r for r in frozen if not r['id'].endswith('--1')], nativePositive=native,
    mirrorEndingsEqual=True, mirrorMaxAdvanceDifference=mirror_error,
    counts={str(n):dict(before=counts(b['native'],n), candidate=counts(c['native'],n,'resolved')) for n in (12,96)},
    defaultResultParity=sum(1 for r in c['native'] if r['timing']=='midpoint' and r['result']==next(o['result'] for o in b['native'] if o['id']==r['id'] and o['n']==r['n'])),
    gate=dict(total=gate['numTotalTests'], passed=gate['numPassedTests'], failed=gate['numFailedTests'],
        retained=retained, added=sorted(set(new_failures)-set(old_failures)), removed=sorted(set(old_failures)-set(new_failures))))
# Acquired packet identities are useful; the duplicate native attempts are not.
result['checkpoints']=[{k:r[k] for k in ('id','checksum','checkpoint','endpoint','observerParity')} for r in b['checkpoints']]
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result,indent=2)+'\n')
print(f'{out}: default parity {result["defaultResultParity"]}/{len(c["inputs"])}; gate {gate["numPassedTests"]}/{gate["numTotalTests"]}')
