#!/usr/bin/env python3
"""Compare this one frozen panel from saved native JSON; zero simulations.

Positions supply geometry; body.velocity supplies velocity. Never infer a
discarded request from final intent or classify a football win from yardage.
"""
import argparse
import gzip
import hashlib
import json
import math
from collections import Counter
from pathlib import Path


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def at(d, t):
    fs = d['result']['frames']
    if t < 0 or t > fs[-1]['t'] + 1e-7:
        return None
    j = min(range(len(fs)), key=lambda i: abs(fs[i]['t'] - t))
    return fs[j], d['result']['telemetry']['frames'][j]


def xy(f, i):
    return f['agents'][3*i:3*i+2]


def distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def snap(d, t, i, target):
    pair = at(d, t)
    if pair is None:
        return None
    f, s = pair
    a = s['agents'][i]
    p, q = xy(f, i), xy(f, target)
    v = a['body']['velocity']
    gap = distance(p, q)
    # Projection of this defender's own achieved velocity toward the actual
    # target position, not relative closing speed or an attainable intercept.
    projection = sum(v[k]*(q[k]-p[k]) for k in range(2))/gap if gap else None
    return {'t': f['t'], 'idx': i, 'id': d['actors'][i]['id'],
            'slot': d['actors'][i]['slot'], 'xy': p,
            'targetIdx': target, 'targetId': d['actors'][target]['id'],
            'targetXY': q, 'gap': round(gap, 4),
            'xLead': round(p[0]-q[0], 4),
            'ownVelocityTowardTarget': round(projection, 4) if projection is not None else None,
            'state': a, 'cue': [c for c in s.get('perception', [])
                                if c['a'] == i and c['b'] == target],
            'requestStages': {'original': None, 'intermediate': None,
                              'final': a.get('intent')}}


def exposure(d):
    r, actors = d['result'], d['actors']
    stats = r['stats']
    who = stats.get('receiver' if d['setup']['offCall']['kind'] == 'pass' else 'rusher')
    idx = next((a['idx'] for a in actors if a['id'] == who), None)
    phase_type = 'catch' if d['setup']['offCall']['kind'] == 'pass' else 'handoff'
    start = next((e['t'] for e in r['events'] if e['type'] == phase_type), None)
    contacts = sorted([e for e in r['events'] if idx is not None and start is not None
                and e['t'] >= start and e['type'] in ('carrier_contact', 'tackle_wrap', 'hit')
                and idx in (e.get('a'), e.get('b'))], key=lambda e: e['t'])
    return {'actorIdx': idx, 'actorId': who, 'phase': phase_type, 'start': start,
            'firstRecordedContact': contacts[0] if contacts else None,
            'outcome': r['outcome'], 'yards': r['offenseYards'],
            'duration': r['duration'], 'stats': stats,
            'events': r['events'], 'finalRng': d['final']['rng']}


def validate(root, manifest, entry):
    p = root / 'cases' / f"{entry['id']}.json"
    assert sha(p) == entry['sha256'], p
    d = json.loads(p.read_text())
    plan = next(c for c in manifest['cases'] if c['id'] == entry['id'])
    assert d['setup'] == plan['setup'] and d['inputSha256'] == plan['inputSha256'] == entry['inputSha256']
    assert d['manifestSha256'] == manifest['manifestSha256']
    assert not any(d['censoring'].values()), p
    assert len(d['actors']) == len({a['id'] for a in d['actors']}) == 22
    assert all(a['idx'] == i for i, a in enumerate(d['actors']))
    fs, ts = d['result']['frames'], d['result']['telemetry']['frames']
    assert len(fs) == len(ts)
    assert all(f['t'] == t['t'] and len(f['agents']) == 66 and len(t['agents']) == 22 for f, t in zip(fs, ts))
    assert all(abs(b['t']-a['t']-.05) < 1e-7 for a, b in zip(fs, fs[1:]))
    assert all(a['body']['energy'] == 1 for a in d['initial']['agents'])
    ids = {a['id'] for a in d['actors']}
    assert all(d['result']['stats'].get(k) is None or d['result']['stats'][k] in ids
               for k in ('receiver', 'rusher', 'target', 'passer', 'interceptedBy'))
    return d


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--baseline', type=Path, required=True)
    ap.add_argument('--candidate', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    roots = [args.baseline, args.candidate]
    ms = [json.loads((p/'manifest.json').read_text()) for p in roots]
    ss = [json.loads((p/'summary.json').read_text()) for p in roots]
    assert ms[0]['cases'] == ms[1]['cases']
    for k in ('flags', 'node', 'platform', 'arch', 'worldDefaults'):
        assert ms[0]['provenance'][k] == ms[1]['provenance'][k], k
    for p, s in zip(roots, ss):
        receipt = json.loads((p/'run-receipt.json').read_text())
        assert receipt['inputsUnchanged'] and receipt['exitCode'] == 0
        assert s['status'] == 'complete' and s['complete'] == 48 and not s['partial'] and not s['skipped']
    rows = []
    support_ids = {'A003', 'A006', 'A015', 'A018', 'A027', 'A030', 'A039', 'A042'}
    for entries in zip(*(s['rows'] for s in ss)):
        ds = [validate(p, m, e) for p, m, e in zip(roots, ms, entries)]
        b, c = ds
        assert b['actors'] == c['actors'] and b['initial'] == c['initial']
        first_state = next((x['t'] for x, y in zip(b['result']['telemetry']['frames'], c['result']['telemetry']['frames'])
                            if x['agents'] != y['agents']), None)
        first_position = next((x['t'] for x, y in zip(b['result']['frames'], c['result']['frames'])
                               if x['agents'] != y['agents']), None)
        row = {'id': b['caseId'], 'matchup': b['matchup'], 'concept': b['concept'],
               'kind': b['setup']['offCall']['kind'], 'actors': b['actors'],
               'inputSha256': b['inputSha256'], 'rawSha256': [e['sha256'] for e in entries],
               'initialExactlyEqual': True, 'firstRecordedAgentStateDifference': first_state,
               'firstRoundedPositionOrFacingDifference': first_position,
               'resultExactlyEqual': b['result'] == c['result'],
               'arms': [exposure(d) for d in ds]}
        row['actorDivergences'] = []
        for i, actor in enumerate(b['actors']):
            changes = {}
            for field in ('intent', 'body', 'job'):
                changes[field] = next((x['t'] for x, y in zip(b['result']['telemetry']['frames'], c['result']['telemetry']['frames'])
                                       if x['agents'][i].get(field) != y['agents'][i].get(field)), None)
            row['actorDivergences'].append({'idx': i, 'id': actor['id'], **changes})
        if row['kind'] == 'run':
            rb = row['arms'][0]['actorIdx']
            tcontact = row['arms'][0]['firstRecordedContact']['t']
            row['runDefenseAtBaselineFirstContact'] = [
                [snap(d, tcontact, i, rb) for i in range(15, 22)] for d in ds]
            row['plannedBlockAccessWitness'] = []
            for d, arm in zip(ds, row['arms']):
                # This descriptive check addresses the old RT/Y -> LB_M
                # concern. Any installed climb responsibility is kept in
                # native state; absence of these hand loads is not a bug label.
                tc = arm['firstRecordedContact']['t']
                samples = [{'t': f['t'], 'block': block}
                           for f in d['result']['telemetry']['frames'] if f['t'] <= tc
                           for block in f.get('blocks', [])
                           if block['b'] == 15 and block['a'] in (2, 7)]
                row['plannedBlockAccessWitness'].append(samples)
        if b['caseId'] in support_ids:
            rb = next(a['idx'] for a in b['actors'] if a['slot'] == 'RB')
            fs = next(a['idx'] for a in b['actors'] if a['slot'] == 'FS')
            tcontact = row['arms'][0]['firstRecordedContact']['t']
            row['support'] = [{'at2': snap(d, 2, fs, rb),
                               'atBaselineFirstContact': snap(d, tcontact, fs, rb),
                               'atOwnFirstContact': snap(d, arm['firstRecordedContact']['t'], fs, rb),
                               'supportDecisions': [x for x in d['result']['telemetry']['decisions']
                                                    if x.get('kind') == 'coverage-run-fit' and x['a'] == fs],
                               'nativeWindow': [snap(d, round(t/20, 2), fs, rb)
                                                for t in range(28, 51)]}
                              for d, arm in zip(ds, row['arms'])]
        if row['kind'] == 'pass':
            # Union keeps the same actors in both arms, including a catcher
            # who no longer catches. Nearest endpoints never silently swap IDs.
            targets = {a['actorIdx'] for a in row['arms'] if a['actorIdx'] is not None}
            targets |= {a['idx'] for a in b['actors'] if a['id'] in
                        [arm['stats'].get('target') for arm in row['arms']]}
            times = {e['t'] for arm in row['arms'] for e in arm['events']
                     if e['type'] in ('throw', 'catch', 'drop', 'pbu', 'incomplete')}
            row['passGeometry'] = []
            for target in sorted(targets):
                defenders = {a['idx'] for a in b['actors'] if a['slot'] in ('FS', 'SS', 'LB_M', 'NB')}
                for d in ds:
                    for t in times:
                        pair = at(d, t)
                        if pair:
                            f, _ = pair
                            defenders.update(sorted((a['idx'] for a in d['actors'] if a['team'] == 'D'),
                                                   key=lambda i: distance(xy(f, i), xy(f, target)))[:2])
                for t in sorted(times | {round(t+.5, 2) for t in times}):
                    row['passGeometry'].append({'target': target, 't': t, 'arms':
                        [[snap(d, t, i, target) for i in sorted(defenders)] for d in ds]})
        # Actual sampled contact and hand-engagement evidence; proximity is
        # not substituted for a block, tackle, grip force or exact first impact.
        row['interactionEvidence'] = []
        for d in ds:
            pairs = {}
            blockpairs = {}
            for f in d['result']['telemetry']['frames']:
                for x in f.get('contacts', []):
                    if x.get('impulse', 0) <= 0:
                        continue
                    key = tuple(sorted((x['a'], x['b'])))
                    v = pairs.setdefault(key, {'pair': key, 'sameTeam': d['actors'][key[0]]['team'] == d['actors'][key[1]]['team'],
                                               'first': f['t'], 'last': f['t'], 'samples': 0, 'maxSampleImpulse': 0})
                    v['last'] = f['t']; v['samples'] += 1
                    v['maxSampleImpulse'] = max(v['maxSampleImpulse'], x['impulse'])
                for x in f.get('blocks', []):
                    # Preserve block objects without inferring forces from gaps.
                    key = json.dumps({k: x.get(k) for k in ('a', 'b', 'blocker', 'defender')}, sort_keys=True)
                    if key not in blockpairs:
                        blockpairs[key] = {'first': f['t'], 'sample': x}
            row['interactionEvidence'].append({'sampledContactPairs': list(pairs.values()),
                                               'firstBlockSamples': list(blockpairs.values())})
        if b['caseId'] in ('A006', 'A008', 'A020', 'A027', 'A032', 'A042', 'A044'):
            row['witnessWindows'] = []
            for d in ds:
                target = next((a['idx'] for a in d['actors'] if a['id'] ==
                               (d['result']['stats'].get('receiver') or d['result']['stats'].get('target') or d['result']['stats'].get('rusher'))), None)
                inds = sorted({target, 15, 17, 19, 20, 21})
                row['witnessWindows'].append([
                    {'t': f['t'], 'actors': [snap(d, f['t'], i, target) for i in inds],
                     'sampledContacts': s.get('contacts', []), 'blocks': s.get('blocks', []),
                     'tackle': s.get('tackle'), 'ball': s.get('ball')}
                    for f, s in zip(d['result']['frames'], d['result']['telemetry']['frames'])
                    if 1.5 <= f['t'] <= (5.2 if b['caseId'] == 'A020' else 3.8)])
        rows.append(row)
    counts = []
    for arm in range(2):
        passes = [r['arms'][arm] for r in rows if r['kind'] == 'pass']
        counts.append({'plannedRuns': 24, 'calledPasses': 24,
                       'catches': sum(x['stats']['completed'] for x in passes),
                       'contactedCatches': sum(x['phase'] == 'catch' and x['firstRecordedContact'] is not None for x in passes),
                       'sacks': sum(x['stats']['sacked'] for x in passes),
                       'scrambles': sum(x['stats']['scramble'] for x in passes),
                       'passOutcomes': dict(Counter(x['outcome'] for x in passes)),
                       'runYards': sum(r['arms'][arm]['yards'] for r in rows if r['kind'] == 'run')})
    out = {'schema': 'accepted-panel-pr82-paired-v1', 'operatorSha256': sha(Path(__file__)),
           'manifests': [m['manifestSha256'] for m in ms], 'provenance': [m['provenance'] for m in ms],
           'candidateCollection': {k: ss[1][k] for k in ('status', 'complete', 'partial', 'skipped', 'elapsedMs', 'cpuMs', 'budget')},
           'exposures': counts, 'exactResultCases': [r['id'] for r in rows if r['resultExactlyEqual']],
           'limits': ['Selected panel, not simulator defect rate.', 'Native .05s bins; positions rounded .1 yd, stored velocity .01 yd/s.',
                      'Original/intermediate requests unavailable; final intent cannot reconstruct them.',
                      'Cue may be projected; age retained without reprojecting.', 'Contact samples incomplete; contact event is not grip/gaze/force ground truth.',
                      'Fixed seed does not preserve RNG draw assignment after divergent behavior; only final RNG saved.'],
           'rows': rows}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(out, separators=(',', ':'))+'\n').encode()
    args.out.write_bytes(gzip.compress(payload, mtime=0) if args.out.suffix == '.gz' else payload)
    print(json.dumps({'validatedPairs': len(rows), 'exposures': counts, 'exactResults': out['exactResultCases'],
                      'output': str(args.out), 'bytes': args.out.stat().st_size, 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()
