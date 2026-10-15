"""Read saved all-22 evidence with the existing NFL timing/load operators.

No simulation or controller queries. Reference source assertions deliberately
reject similarly named exploratory captures from before PR50 publication.
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import time


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


root = Path(__file__).resolve().parents[2]
metrics = module('metrics', root / 'scripts/mechanics/metrics.py')
opening = module('opening', Path(__file__).with_name('wz-execution-report.py'))
PR52 = '66e59745bc3db3d20797951f1ee8bb4b75df4bb019eaef5a2eb24e32873e3c08'
PR50 = 'afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def impacts(case):
    actors = case['actors']
    return [dict(entry=f['t'], a=actors[h['i']]['slot'], b=actors[h['j']]['slot'],
                 team=actors[h['i']]['team'], impulse=h['impulse'])
            for f in case['frames'] for h in f['report']['contacts']
            if h['impulse'] > 1e-8 and actors[h['i']]['team'] == actors[h['j']]['team']]


def timing(case):
    actors, frames = case['actors'], case['frames']
    rb = next(a['idx'] for a in actors if a['slot'] == 'RB')
    handoff = case['handoffAt']
    event = next((e['t'] for e in case['events'] if
                  (e['type'] == 'carrier_contact' and rb in (e.get('a'), e.get('b')))
                  or (e['type'] in ('tackle_wrap', 'hit', 'tackle') and e.get('b') == rb)), None)
    native_cross = next((f['after'] for f in frames if f['after'] >= handoff
                         and f['afterBodies'][rb]['pos']['x'] > 40), None)
    hb = next(f['beforeBodies'][rb] for f in frames if abs(f['t'] - handoff) < 1e-8)
    groups = {'LT': 'OL', 'LG': 'OL', 'C': 'OL', 'RG': 'OL', 'RT': 'OL', 'H': 'TE', 'Y': 'TE'}
    players = [dict(side=a['team'], group=groups.get(a['slot'],
               a['slot'] if a['slot'] in ('QB', 'RB') else a['slot'].split('_')[0])) for a in actors]
    xy = []
    for k in range(int(case['end'] * 10 + 1e-8) + 1):
        t = round(k / 10, 1)
        bodies = frames[0]['beforeBodies'] if t == 0 else next(f['afterBodies'] for f in frames if abs(f['after'] - t) < 1e-8)
        xy.append([v for b in bodies for v in (b['pos']['x'] - 40, b['pos']['y'])])
    events = dict(handoff=handoff, end=case['end'])
    if event is not None:
        events['first_contact'] = event
    # Outcomes from a three-second censor are never treated as final yardage.
    common = dict(kind='run', carrier=rb, players=players, xy=xy, dt=.1,
                  ball_y=26.666666666666668, events=events, yards=0)
    out = defaultdict(list)
    metrics.run_metrics(metrics.Play(common), out)
    shared_cross = out.get('run.carrier_cross_los_s', [])
    return dict(handoff=handoff, nativeCross=native_cross,
                nativeHandoffToCross=None if native_cross is None else native_cross - handoff,
                firstRecordedDefenderContact=event,
                sharedBeforeContactCross=shared_cross[0] if shared_cross else None,
                speedAtHandoff=math.hypot(*hb['vel'].values()),
                end=case['end'], censored=case['censored'])


def summarize(case):
    loads = opening.hand_loads(case)
    linebacker = {a: {d: value for d, value in ds.items() if d.startswith('LB')}
                  for a, ds in loads.items() if any(d.startswith('LB') for d in ds)}
    attempts = {}
    for frame in case['frames']:
        for a, behavior in zip(case['actors'], frame['behavior']):
            plan = behavior.get('plan')
            if a['team'] != 'O' or not isinstance(plan, dict) or plan.get('kind') != 'climb' or not plan.get('target'):
                continue
            target = case['actors'][plan['target']['agent']]
            if not target['slot'].startswith('LB'):
                continue
            key = f"{a['slot']}:{target['slot']}"
            attempt = attempts.setdefault(key, dict(slot=a['slot'], target=target['slot'],
                firstClimb=frame['t'], minCenterDistance=math.inf, minAt=None,
                firstDownManImpact=None))
            distance = math.dist(frame['beforeBodies'][a['idx']]['pos'].values(),
                                 frame['beforeBodies'][target['idx']]['pos'].values())
            if distance < attempt['minCenterDistance']:
                attempt.update(minCenterDistance=distance, minAt=frame['t'])
            for h in frame['report']['contacts']:
                if a['idx'] not in (h['i'], h['j']) or h['impulse'] <= 1e-8:
                    continue
                other = case['actors'][h['j'] if h['i'] == a['idx'] else h['i']]
                if other['team'] == 'D' and other['slot'].startswith(('DT', 'DE', 'NT')) and attempt['firstDownManImpact'] is None:
                    attempt['firstDownManImpact'] = dict(entry=frame['t'], target=other['slot'], impulse=h['impulse'],
                        ownBody=frame['beforeBodies'][a['idx']], requested=frame['requested'][a['idx']], final=frame['final'][a['idx']],
                        consumedPictures=[v for v in case['cues'] if v['observer'] == a['idx'] and v['target'] == other['idx'] and v['t'] <= frame['t']][-2:])
    return dict(timing=timing(case), handLoads=loads, linebackerLoads=linebacker,
                teammateImpacts=impacts(case), climbs=list(attempts.values()),
                events=case['events'])


def main():
    start = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', action='append', required=True)
    parser.add_argument('--trial', action='append', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((root / 'config/run-tempo-collection.json').read_text())
    wanted = {i['id']: i for i in manifest['inputs']}
    refs, cases, captures, raw_cases = {}, {}, [], {}
    for role, items in [('reference', args.reference), ('trial', args.trial)]:
        for item in items:
            label, name = item.split('=', 1)
            path = Path(name)
            cap = json.loads(gzip.decompress(path.read_bytes()))
            if role == 'reference':
                assert cap['sourceSha256'] in (PR50, PR52), (label, 'unverified reference source')
            assert cap['from'] == 0 and cap['stop'] == 3 and not cap['diagnosticBypass']
            assert cap['flags'] == json.loads((root / 'config/baseline.json').read_text())['flags']
            captures.append(dict(label=label, role=role, revision=cap['revision'], runtime=cap['sourceSha256'],
                rawSha256=digest(path), elapsedSeconds=cap['elapsedSeconds'],
                nativeSteps=cap['newWorldSteps'], originalCapturePlays=cap['newSimulationPlays']))
            arm = 'reference' if role == 'reference' else cap['arm']
            for case in cap['panel']:
                ident = case['input']['id']
                if ident not in wanted:
                    continue
                assert case['input'] == wanted[ident] and case['restoredFromSnap'] and not case['actions']
                expected = PR52 if case['input']['concept'] in ('iz_strong', 'iz_weak', 'split_zone') else PR50
                if role == 'reference' and cap['sourceSha256'] != expected:
                    continue
                if role == 'reference':
                    assert ident not in refs, ident
                    refs[ident] = case
                else:
                    ref = refs[ident]
                    assert ref['initializedInformation'] == case['initializedInformation']
                    for a, b in zip(ref['actors'], case['actors']):
                        for key in ('idx', 'slot', 'team', 'profile', 'player', 'initialBody'):
                            assert a[key] == b[key], (ident, key)
                raw_cases[(arm, ident)] = case
                result = summarize(case)
                result.update(revision=cap['revision'], sourceSha256=cap['sourceSha256'], capture=label)
                cases.setdefault(ident, dict(input=case['input'], arms={}))["arms"][arm] = result
    assert set(refs) == set(wanted)
    comparisons = []
    for (arm, ident), case in raw_cases.items():
        if arm == 'reference':
            continue
        ref = refs[ident]
        first = {}
        for a, b in zip(ref['frames'], case['frames']):
            for actor in case['actors']:
                i = actor['idx']
                if actor['slot'] not in first and a['requested'][i] != b['requested'][i]:
                    first[actor['slot']] = dict(entry=b['t'], before=a['requested'][i], after=b['requested'][i],
                        beforeJob=a['behavior'][i], afterJob=b['behavior'][i])
        comparisons.append(dict(case=ident, arm=arm, firstRequestedDifference=first))
    nfl = {}
    for season in ('2022', '2017'):
        path = root / f'data/reviews/mechanics/nfl-bdb{season}.json'
        data = json.loads(path.read_text())
        nfl[season] = dict(source=data['source'], provenance=data['provenance'], aggregateSha256=digest(path),
            metrics={k: v for k, v in data['metrics'].items() if k.startswith(('run.handoff_s', 'run.carrier_cross_los_s', 'run.carrier_peak_speed_before_contact'))})
    args.out.mkdir(parents=True, exist_ok=True)
    result = dict(protocol='run-tempo-and-climb-review-v1', captures=captures, cases=cases,
        comparisons=comparisons, nfl=nfl, newWorldSteps=0, elapsedSeconds=time.perf_counter()-start,
        scriptSha256=digest(Path(__file__)), sharedTimingOperatorSha256=digest(Path(metrics.__file__)),
        loadOperatorSha256=digest(Path(opening.__file__)))
    (args.out / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
    for ident, record in cases.items():
        print(ident)
        for arm, value in record['arms'].items():
            hits = [h for h in value['teammateImpacts'] if h['team'] == 'O']
            print(arm, value['timing'], 'offensiveImpacts', len(hits), sum(h['impulse'] for h in hits))
    print(json.dumps(dict(newWorldSteps=0, elapsedSeconds=result['elapsedSeconds'])))


if __name__ == '__main__':
    main()
