"""Saved A020/A042 review; ROOT contains paired.json.gz and two restored arms.

Read four already recorded native cases. No engine import or simulation.
Positions are rounded recorder samples; velocity comes from stored body state.
"""
import argparse
import gzip
import hashlib
import json
import math
import time
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sample(d, t, runner, indices):
    if t > d['result']['frames'][-1]['t']:
        return {'t': t, 'unavailable': 'after last completed-play frame',
                'lastFrame': d['result']['frames'][-1]['t']}
    f = next(f for f in d['result']['frames'] if f['t'] == t)
    s = next(s for s in d['result']['telemetry']['frames'] if s['t'] == t)
    rp = f['agents'][3*runner:3*runner+2]
    rv = s['agents'][runner]['body']['velocity']
    speed = math.hypot(*rv)
    actors = []
    for i in dict.fromkeys(indices):
        pos = f['agents'][3*i:3*i+2]
        delta = [pos[k]-rp[k] for k in (0, 1)]
        actors.append({'idx': i, 'pos': pos, 'state': s['agents'][i],
                       'runnerGapYd': math.hypot(*delta),
                       'leadAlongRunnerVelocityYd': sum(delta[k]*rv[k] for k in (0, 1))/speed if speed else None,
                       'consumedPictures': [c for c in s.get('perception', []) if c['a'] == i and
                            (i == runner and (d['actors'][c['b']]['team'] == 'D' or c['b'] == 7)
                             or c['b'] in [runner, s['agents'][i].get('target'), 0])]})
    return {'t': t, 'actors': actors}


ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('--saved', type=Path, required=True)
ap.add_argument('--out', type=Path, required=True)
args = ap.parse_args()
assert not args.out.exists(), 'Refuse overwrite'
started = time.monotonic()
paired_path = args.saved/'paired.json.gz'
assert sha(paired_path) == '1753b7cbdd9e6f80cd834c259ffc6903365f0ac74c2e051e2d81cd268cf3bf4b'
paired = json.loads(gzip.decompress(paired_path.read_bytes()))
packet = {'schema': 'a020-a042-first-difference-v1', 'operatorSha256': sha(Path(__file__)),
          'pairedSource': '40af332f3c988b5abe19d9236b49a43bde27200c',
          'rawArtifact': 'ebef199a3986b2749e5c8c86921cfd6c7e42b2b4',
          'provenance': paired['provenance'], 'nativeExecutions': 0, 'cases': [],
          'limits': ['Post-step rounded positions and stored velocities are distinct.',
                     'Consumed pictures are recorded values, not a complete ordered query tape.',
                     'Original/intermediate requests and per-attempt draw/quality/force tapes are absent.',
                     'Recorded body contacts are not the grasp-joint load.',
                     'Different final RNG states cannot identify the responsible execution draw.']}
specs = [('A020', 10, 17, [9, 10, 17, 20, 21],
          [2.45, 2.5, 2.9, 3.35, 3.55, 3.6, 4.55, 4.6, 4.65, 5.0, 5.4], 3.55),
         ('A042', 6, 21, [6, 17, 18, 20, 21],
          [1.55, 1.6, 2, 2.55, 2.6, 3.25, 3.3, 3.35, 3.55, 3.6, 3.65], 2.55)]
for case, runner, first, indices, times, equal_until in specs:
    row = next(r for r in paired['rows'] if r['id'] == case)
    paths = [args.saved/arm/(case+'.json') for arm in ['baseline', 'candidate']]
    assert [sha(p) for p in paths] == row['rawSha256']
    ds = [json.loads(p.read_bytes()) for p in paths]
    b, c = ds
    assert b['setup'] == c['setup'] and b['initial'] == c['initial']
    assert b['initialBodies'] == c['initialBodies'] and b['actors'] == c['actors']
    assert b['inputSha256'] == c['inputSha256'] == row['inputSha256']
    assert not any(b['censoring'].values()) and not any(c['censoring'].values())
    bf, cf = [d['result']['telemetry']['frames'] for d in ds]
    fork = next(x['t'] for x, y in zip(bf, cf) if x['agents'] != y['agents'])
    assert fork == row['firstRecordedAgentStateDifference']
    assert all(x['agents'] == y['agents'] for x, y in zip(bf, cf) if x['t'] < fork)
    assert all(x['agents'][runner] == y['agents'][runner] for x, y in zip(bf, cf) if x['t'] <= equal_until)
    fork_frames = [next(s for s in fs if s['t'] == fork) for fs in [bf, cf]]
    changed = [i for i in range(22) if fork_frames[0]['agents'][i] != fork_frames[1]['agents'][i]]
    item = {'case': case, 'actors': b['actors'], 'inputSha256': row['inputSha256'],
            'nativeSha256': row['rawSha256'], 'initialExactlyEqual': True,
            'allRecordedAgentStatesEqualBefore': fork,
            'runnerRecordedStateEqualThrough': equal_until,
            'firstRecordedDifference': {'t': fork, 'actorIndices': changed,
                                        'samples': [sample(d, fork, runner, changed) for d in ds]},
            'arms': []}
    for d in ds:
        r = d['result']
        contact = next(e for e in r['events'] if e['type'] == 'carrier_contact')
        assert contact['b'] == first and contact['a'] == runner
        item['arms'].append({'outcome': r['outcome'], 'stats': r['stats'],
            'events': [e for e in r['events'] if e['type'] in
                       ['throw', 'catch', 'handoff', 'carrier_contact', 'tackle_wrap', 'broken_tackle',
                        'tackle', 'touchdown', 'missed_tackle', 'fall']],
            'firstGraspSample': sample(d, contact['t'], runner, [runner, first, 20, 21]),
            'firstTacklerReachYd': d['initial']['agents'][first]['profile']['reach'],
            'firstTacklerBodyRadiusYd': d['initial']['agents'][first]['profile']['radius'],
            'runnerBodyRadiusYd': d['initial']['agents'][runner]['profile']['radius'],
            'firstTacklerOpportunityDecisions': [v for v in r['telemetry']['decisions']
                if v.get('a') == first and v['kind'] == 'tackle-opportunity' and contact['t']-1 <= v['t'] <= contact['t']+.1],
            'supportDecisions': [v for v in r['telemetry']['decisions'] if v['kind'] == 'coverage-run-fit'],
            'sampledFirstTacklerBodyContacts': [{'t': s['t'], **hit}
                for s in r['telemetry']['frames'] for hit in s.get('contacts', [])
                if {hit['a'], hit['b']} == {runner, first}],
            'firstRunnerCueByEventualTackler': next((s['t'] for s in r['telemetry']['frames']
                if any(p['a'] == first and p['b'] == runner for p in s.get('perception', []))), None),
            'samples': [sample(d, t, runner, indices) for t in times],
            'finalRng': d['final']['rng']})
    packet['cases'].append(item)
packet['savedAnalysisSeconds'] = time.monotonic()-started
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(packet, separators=(',', ':'), allow_nan=False)+'\n')
print(json.dumps({'out': str(args.out), 'bytes': args.out.stat().st_size,
                  'sha256': sha(args.out), 'seconds': packet['savedAnalysisSeconds'], 'nativeExecutions': 0}))
