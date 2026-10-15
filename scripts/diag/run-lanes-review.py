"""Read frozen run-lane captures; reuse the established timing and load operators.

This executes zero simulation steps. Original receipts count live all-22 50 ms
World steps, not controller scratch previews or unit-test World steps. All wall
runtime includes those previews. Ace12 is balanced at midfield: flipping the
formation exchanges Y/H duties while strongSign remains -1. The historical
case ID "mirror" is not an exact reflected play. Keep the established signs.
"""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[2]
def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result
review = module('tempo', Path(__file__).with_name('run-tempo-report.py'))
opening = review.opening
FINAL = '1c4fe7fdef9377436543fd94571689279be84fa061b16e2b46c0602567565527'
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def read(path): return json.loads(gzip.decompress(Path(path).read_bytes()))

def summarize(case):
    result = review.summarize(case)
    if case['input']['concept'].startswith('wz_'):
        assert case['input']['formation'] == 'ace_12'
        rows = opening.opening_rows('measurement', case)
        result['blockingExecution'] = opening.summarize(rows)
    result['offensiveTeammateImpulse'] = sum(h['impulse'] for h in result['teammateImpacts'] if h['team'] == 'O')
    result['maxWorkResidual'] = max(abs(f['report']['work']['residual']) for f in case['frames'])
    return result

def main():
    start = time.perf_counter()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--raw', type=Path, default=ROOT / 'out/run-lanes')
    args = p.parse_args()
    manifest = json.loads((ROOT / 'config/run-lanes.json').read_text())
    supplement = json.loads((ROOT / 'config/run-lanes-schemes.json').read_text())
    wanted = {c['id']: c for c in [*manifest['inputs'], *supplement['inputs'], manifest['freshTransferDeclaredBeforeResults']]}
    flags = json.loads((ROOT / 'config/baseline.json').read_text())['flags']
    refs = {}
    ref_files = [
        '/workspace/run-tempo-climb/out/tempo-climb/current-zone.json.gz',
        '/workspace/wide-zone-flow/out/wide-zone-flow/packaging/decoded-final.json.gz',
        '/workspace/wide-zone-flow/out/wide-zone-flow/packaging/decoded-fresh-final.json.gz',
        '/workspace/joined-release-transfer/out/run-transfer/pr50.json.gz',
        '/workspace/run-tempo-climb/out/tempo-climb/run-lanes-fresh-reference.json.gz',
    ]
    reference_sources = []
    for name in ref_files:
        cap = read(name)
        assert cap['flags'] == flags
        reference_sources.append(dict(path=name, sha256=sha(name), code=cap['revision'], source=cap['sourceSha256']))
        for c in cap['panel']:
            ident = c['input']['id']
            if ident not in wanted: continue
            expected = review.PR52 if c['input']['concept'] in ('iz_strong', 'iz_weak', 'split_zone') or ident == manifest['freshTransferDeclaredBeforeResults']['id'] else review.PR50
            if cap['sourceSha256'] != expected: continue
            assert ident not in refs and c['input'] == wanted[ident], ident
            refs[ident] = c
    assert set(refs) == set(wanted)
    final_files = ['scoped-interior.json.gz', 'scoped-wide.json.gz', 'scoped-counter.json.gz', 'scoped-schemes.json.gz', 'scoped-under.json.gz']
    finals, captures, trials = {}, [], []
    for path in sorted(args.raw.glob('*.json.gz')):
        cap = read(path)
        if cap.get('protocol') != 'run-scheme-transfer-capture-v1': continue
        assert cap['flags'] == flags and cap['from'] == 0 and cap['stop'] == 3 and not cap['diagnosticBypass']
        captures.append(dict(path=str(path.resolve()), sha256=sha(path), code=cap['revision'], source=cap['sourceSha256'],
            arm=cap['arm'], plays=cap['newSimulationPlays'], liveOuterSteps=cap['newWorldSteps'], collectorSeconds=cap['elapsedSeconds'],
            cases=[c['input']['id'] for c in cap['panel']], retained=path.name in final_files))
        local = []
        for c in cap['panel']:
            ident = c['input']['id']; ref = refs[ident]
            assert c['input'] == wanted[ident] and c['restoredFromSnap'] and not c['actions']
            assert ref['initializedInformation'] == c['initializedInformation']
            for a,b in zip(ref['actors'], c['actors']):
                for key in ('idx','slot','team','profile','player','initialBody'):
                    assert a[key] == b[key], (ident, key)
            summary = summarize(c)
            if path.name in final_files:
                assert cap['sourceSha256'] == FINAL and ident not in finals
                physical_exact = len(ref['frames']) == len(c['frames']) and all(all(x[key] == y[key] for key in ('beforeBodies','afterBodies','requested','final','report')) for x,y in zip(ref['frames'],c['frames']))
                if c['input']['concept'] in ('counter','trap'): assert physical_exact, ident
                finals[ident] = dict(input=c['input'], code=cap['revision'], source=cap['sourceSha256'], physicalExactToReference=physical_exact,
                    before=summarize(ref), after=copy.deepcopy(summary))
            # Compact failed-trial outcomes retain every load/impact/timing;
            # exact own bodies/pictures remain in the lossless capture bundles.
            for climb in summary['climbs']:
                impact = climb.get('firstDownManImpact')
                if impact: climb['firstDownManImpact'] = {k:impact[k] for k in ('entry','target','impulse')}
            summary.pop('blockingExecution',None)
            local.append(dict(id=ident, **summary))
        trials.append(dict(path=path.name, code=cap['revision'], source=cap['sourceSha256'], cases=local))
    assert set(finals) == set(wanted)
    receipts=[]
    for path in sorted(args.raw.glob('*.json')):
        data=json.loads(path.read_text())
        if 'baseline' not in data or 'commands' not in data: continue
        receipts.append(dict(path=path.name, code=data['commit'], source=data['sourceSha256'],
            frozen=data.get('inputsUnchanged'), exitCode=data['exitCode'], commands=data['commands']))
    assert all(r['frozen'] for r in receipts), 'A receipt changed its frozen inputs'
    args.out.mkdir(parents=True,exist_ok=True)
    total = dict(newLiveOpenings=sum(c['plays'] for c in captures)+1,
        newLiveOuterSteps=sum(c['liveOuterSteps'] for c in captures)+60,
        collectorSeconds=sum(c['collectorSeconds'] for c in captures)+read(ref_files[-1])['elapsedSeconds'],
        includesOneFreshReference=True,
        finalCandidateOpenings=12, finalCandidateOuterSteps=720,
        finalCandidateCollectorSeconds=sum(c['collectorSeconds'] for c in captures if c['retained']),
        receiptCommandSeconds=sum(cmd['elapsedSeconds'] for r in receipts for cmd in r['commands']))
    out=dict(protocol='run-lanes-review-v1', finalSource=FINAL, cases=finals, references=reference_sources,
        captures=captures, receipts=receipts, runtime=total, newWorldSteps=0,
        timingOperatorSha256=sha(review.metrics.__file__),loadOperatorSha256=sha(opening.__file__),
        scriptSha256=sha(__file__),elapsedSeconds=time.perf_counter()-start)
    (args.out/'summary.json').write_text(json.dumps(out,indent=2)+'\n')
    (args.out/'trials-summary.json.gz').write_bytes(gzip.compress(json.dumps(trials,separators=(',',':')).encode(),mtime=0))
    print(json.dumps(dict(runtime=total,newWorldSteps=0,elapsedSeconds=time.perf_counter()-start)))
if __name__ == '__main__': main()
