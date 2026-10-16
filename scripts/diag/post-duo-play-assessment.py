#!/usr/bin/env python3
"""Four saved #84 play pairs and completed NFL geometry only; no simulation.

Reuses the author's packet schema/event and stored-body measurement definitions
from combo-football-surface-report.py. No framework, inferred contact or tuning.
"""
import argparse
import gzip
import hashlib
import json
import math
import subprocess
import time
from pathlib import Path

ACCEPTED = '86250bb4f0c6f421878c204161864d523c3e30b6'
AUTHOR = '70ed238a2246cd89d3c4108d647245baf5ff70bb'
SOURCE = 'dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3'
OLD_SOURCE = '78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read(p):
    return json.load(gzip.open(p, 'rt')) if p.suffix == '.gz' else json.loads(p.read_text())


def events(r, kind):
    return sorted((e for e in r['events'] if e['type'] == kind), key=lambda e: e['t'])


def speed(b):
    return math.hypot(b['vel']['x'], b['vel']['y'])


def frame(r, t):
    return next((f for f in r['frames'] if f['t'] == t), None)


def pair_reps(f, a, b):
    return [e for e in f['beforeReps'] if e['d'] == b and (e['b'] == a or a in e['helpers'])]


def recorded_load(e):
    # Holding/lateral load can be useful without positive normal push.
    # An absent component stays unknown, never a manufactured zero.
    return bool(e['hands']) and any(abs(e['hands'][k]) > 1e-6
        for k in ('normal', 'tangent') if e['hands'].get(k) is not None)


def snapshot(r, t, a, b):
    f = frame(r, t)
    if f is None:
        return None
    own, other = f['before'][a], f['before'][b]
    call = next((c for c in r['calls'] if c['t'] == t and c['a'] == a and c['method'] == 'update'), None)
    plan = call['before'] if call else None
    dr = plan.get('departureRead') if plan else None
    telemetry = next((s for s in r['result']['telemetry']['frames'] if s['t'] == t), None)
    return {'t': t, 'actorId': r['initial'][a]['id'], 'targetId': r['initial'][b]['id'],
            'beforeWorld': {'actorPosition': own['pos'], 'targetPosition': other['pos'],
                            'actorStoredVelocity': own['vel'], 'targetStoredVelocity': other['vel'],
                            'gap': math.dist(own['pos'].values(), other['pos'].values())},
            'capturedStages': {'commandAfterCoverageContainment': f['raw'][a],
                               'beforeSpacingAfterContactAndBond': f['preSpacing'][a] if f['preSpacing'] else None,
                               'finalBeforeWorld': f['final'][a]},
            'producerUpdate': call['returned'] if call else None,
            'installedOrCurrentPlan': plan,
            'cachedDepartureCue': None if not dr else {
                'lastReadAt': dr['at'], 'secondsSinceThatRead': round(t-dr['at'], 9),
                'nextRead': dr['nextRead'], 'backerPicture': dr['backer'],
                'policy': 'Picture age is retained at its consumption time. Cache residence is separate; no position re-projection.'},
            'outputReplayResponsibility': telemetry['agents'][a] if telemetry else None,
            'actualEngagementsBeforeWorld': pair_reps(f, a, b)}


def measures(r):
    fs = r['frames']
    los = next(f for f in fs if f['before'][6]['pos']['x'] >= 35)
    contact = events(r, 'carrier_contact')[0]
    rg_lb = [{'t': f['t'], **c} for f in fs for c in f['report']['contacts']
             if {c['i'], c['j']} == {5, 15} and c['impulse'] > 0]
    loaded = [{'t': f['t'], 'engagement': e} for f in fs for e in pair_reps(f, 5, 15)
              if e['hands'] and e['hands'].get('normal') is not None and e['hands']['normal'] > 0]
    any_load = [{'t': f['t'], 'engagement': e} for f in fs for e in pair_reps(f, 5, 15) if recorded_load(e)]
    before_contact = [f for f in fs if f['t'] <= contact['t'] and f['t'] >= 1.05]
    nearest = min(before_contact, key=lambda f: math.dist(f['before'][5]['pos'].values(), f['before'][15]['pos'].values()))
    sample_times = sorted({1.05, 1.5, 2.0, 2.35, 2.6, los['t'], contact['t'], nearest['t']})
    # Useful block witnesses are actual primary/helper engagements and loads,
    # not inferred from low separation or assignment labels.
    chosen_pairs = [(2, 13), (5, 15), (7, 15), (2, 15)]
    blocks = []
    for a, b in chosen_pairs:
        loaded_pair = [{'t': f['t'], 'engagement': e} for f in fs for e in pair_reps(f, a, b)
                       if e['hands'] and e['hands'].get('normal') is not None and e['hands']['normal'] > 0]
        blocks.append({'actorId': r['initial'][a]['id'], 'targetId': r['initial'][b]['id'],
                       'firstObservedPositiveNormalLoad': loaded_pair[0] if loaded_pair else None,
                       'firstObservedAnyHandLoad': next(({'t': f['t'], 'engagement': e}
                           for f in fs for e in pair_reps(f, a, b) if recorded_load(e)), None)})
    approach = [f for f in fs if 1.05 <= f['t'] <= contact['t']]
    return {'source': r['source'], 'phase': r['phase'], 'censor': r['censor'],
            'nativeEnd': r['endTime'], 'yardsDescriptiveOnly': r['yards'],
            'runnerLosTickBeforeWorld': los['t'], 'runnerLosStoredSpeed': speed(los['before'][6]),
            'firstCarrierContactEvent': contact,
            'firstRecordedRgLbPositiveImpulse': rg_lb[0] if rg_lb else None,
            'firstObservedRgLbPositiveNormalLoad': loaded[0] if loaded else None,
            'firstObservedRgLbAnyHandLoad': any_load[0] if any_load else None,
            'rgApproachStageComparisons': {'nativeSamples': len(approach),
                'preSpacingUnavailable': sum(f['preSpacing'] is None for f in approach),
                'allThreeEqualWhenAvailable': all(f['raw'][5] == f['preSpacing'][5] == f['final'][5]
                    for f in approach if f['preSpacing'] is not None)},
            'rgLbEngagementSamplesWithNormalUnavailable': sum(e['hands'] is None or e['hands'].get('normal') is None
                for f in fs for e in pair_reps(f, 5, 15)),
            'rgLbBlockContactEvents': [e for e in events(r, 'block_contact') if {e.get('a'), e.get('b')} == {5, 15}],
            'closestRgLbPreCarrierContact': snapshot(r, nearest['t'], 5, 15),
            'rgLbApproachSamples': [snapshot(r, t, 5, 15) for t in sample_times],
            'selectedActualLoads': blocks,
            'offensivePositiveImpulseSamples': [{'t': f['t'], **c} for f in fs for c in f['report']['contacts']
                                                if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 0],
            'events': r['events']}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--author-root', type=Path, required=True, help='Extracted author evidence tree, preserving repository-relative paths')
    ap.add_argument('--nfl-geometry', type=Path, required=True)
    ap.add_argument('--prior-panel-root', type=Path, help='Optional original #82 raw directory; historical observer-compatibility check only')
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    start, cpu = time.perf_counter(), time.process_time()
    root = args.author_root/'data/reviews/current/combo-football-surface'
    manifest = read(root/'artifacts.json')
    for path, expected in manifest.items():
        p = args.author_root/path
        assert p.stat().st_size == expected['bytes'] and sha(p) == expected['sha256'], path
    # Source compatibility is earned by exact tree equality, not commit labels.
    git = lambda *a: subprocess.check_output(['git', *a])
    protected = ['src', 'test', 'config', 'package.json', 'package-lock.json', '.nvmrc', 'scripts/baseline.mjs']
    assert git('diff', '--name-only', ACCEPTED, '4af71ac8a8f320456e87a027579200469a0c1ee0', '--', *protected) == b''
    h = hashlib.sha256()
    for name in git('ls-tree', '-r', '--name-only', ACCEPTED, 'src').decode().splitlines():
        h.update(name.encode()+b'\0'+git('show', ACCEPTED+':'+name)+b'\0')
    assert h.hexdigest() == SOURCE
    names = ['current', 'current-a018', 'under-baseline', 'candidate-a030', 'candidate-controls', 'under-candidate']
    packets = {n: read(root/(n+'.json.gz')) for n in names}
    base = {r['id']: r for n in names[:3] for r in packets[n]['rows']}
    cand = {r['id']: r for n in names[3:] for r in packets[n]['rows']}
    assert set(base) == set(cand) == {'A018', 'A030', 'A027', 'DuoUnder'}
    flags = read(root/'receipts/focused.json')['flags']
    profile = read(Path('config/baseline.json'))
    assert flags == profile['flags'] and len(flags) == 44
    rows, observer_checks = [], []
    inputs = {r['id']: r for r in read(args.author_root/'data/reviews/current/second-level-access/inputs.json')['rows']}
    inputs.update({r['id']: r for r in read(root/'transfer-input.json')['rows']})
    for key in ['A018', 'A030', 'A027', 'DuoUnder']:
        b, c = base[key], cand[key]
        assert b['initial'] == c['initial'] and b['inputSha256'] == c['inputSha256'] == inputs[key]['inputSha256']
        assert len(b['initial']) == len({a['id'] for a in b['initial']}) == 22
        assert b['source'] == OLD_SOURCE and c['source'] == SOURCE
        for r in (b, c):
            assert r['phase'] == 'dead' and r['censor'] == 'native ending'
            assert all(len(f['before']) == len(f['after']) == len(f['raw']) == len(f['final']) == 22 for f in r['frames'])
            assert all(abs(y['t']-x['t']-.05) < 1e-7 for x, y in zip(r['frames'], r['frames'][1:]))
        ps = [p['receipt'] for p in packets.values() if any(r['id'] == key for r in p['rows'])]
        assert all(p['flags'] == flags and p['worldDefaults'] == profile['worldDefaults'] and p['node'] == 'v22.23.3' for p in ps)
        assert len({p['collectorSha256'] for p in ps}) == 1
        first = next(((x, y) for x, y in zip(b['frames'], c['frames']) if x != y), None)
        rows.append({'id': key, 'inputSha256': b['inputSha256'],
                     'call': {k: inputs[key]['setup'][k] for k in ['offCall', 'defCall', 'seed', 'los', 'ballY', 'down', 'firstDownX']},
                     'identities': [{k: a[k] for k in ['idx', 'id', 'slot']} for a in b['initial']],
                     'exactAllFrames': b['frames'] == c['frames'], 'exactResult': b['result'] == c['result'],
                     'firstDifference': None if not first else {'t': first[0]['t'], 'entering22BodiesEqual': first[0]['before'] == first[1]['before'],
                         'changedRawActors': [i for i in range(22) if first[0]['raw'][i] != first[1]['raw'][i]],
                         'postStepRngEqual': first[0]['rng'] == first[1]['rng']},
                     'arms': [measures(r) for r in (b, c)]})
        if args.prior_panel_root and key != 'DuoUnder':
            prior = read(args.prior_panel_root/'cases'/(key+'.json'))['result']
            assert len([e for e in prior['events'] if e['type'] == 'snap']) == 1
            normalized = dict(prior, events=[e for e in prior['events'] if e['type'] != 'snap'])
            assert normalized == b['result']
            observer_checks.append({'id': key, 'resultEqualExceptSnapLabel': True,
                                    'reason': 'PlaySim.run injects snap; owner step collector uses tick directly. Preserve event distinction; do not insert a fictitious label.'})
    nfl = read(args.nfl_geometry)
    assert nfl['sourceReturnSha256'] == '4a57b09d246587843f9eb8ac3d03e6fcceb25e0276e679b33371cc63138c272d'
    nfl_rows = []
    for r in nfl['cases']:
        release, catch = r['snapshots'][0], r['snapshots'][-1]
        fixed = release['nearest_id']
        original = next(d for d in catch['defenders'] if d['id'] == fixed)
        nearest = next(d for d in catch['defenders'] if d['id'] == catch['nearest_id'])
        nfl_rows.append({'id': r['id'], 'receiverId': r['receiverId'], 'releaseNearestId': fixed,
                         'releaseNearestAtCatch': original, 'catchNearest': nearest,
                         'originalEventTimes': r['originalEvents'],
                         'catchToAnnotatedFirstContact': r['catchToAnnotatedFirstContactSeconds'],
                         'frameProvenance': r['originalFrameProvenance'], 'snapshots': r['snapshots']})
    output = {'schema': 'post-duo-four-pair-assessment-v1', 'measurementSha256': sha(Path(__file__)),
              'acceptedCommit': ACCEPTED, 'compatibleSourceSha256': SOURCE, 'authorEvidence': AUTHOR,
              'verifiedAuthorArtifacts': len(manifest), 'reusedExecutedCollectorReceipts': {n: p['receipt'] for n, p in packets.items()},
              'priorPanelObserverChecks': observer_checks, 'priorPanelNotPostDuoEvidence': True,
              'rows': rows, 'nfl': {'question': nfl['question'], 'sourceGeometrySha256': sha(args.nfl_geometry),
                  'originalReturnSha256': nfl['sourceReturnSha256'], 'cases': nfl_rows,
                  'limits': 'Four already returned contained Quarters/POST catches; no explosive controls. No contact actor, installed role, cue, gaze or force. Positions/events only, no legacy finite-difference speeds. Not Duo run-blocking evidence or current simulator calibration.'},
              'newSimulations': 0, 'newGames': 0, 'newTests': 0, 'rawNflScans': 0,
              'cost': {'savedReductionWallSeconds': time.perf_counter()-start, 'savedReductionCpuSeconds': time.process_time()-cpu}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps({'validatedPairs': len(rows), 'artifacts': len(manifest), 'newSimulations': 0, 'cost': output['cost'],
                      'summary': [{'id': r['id'], 'exact': r['exactAllFrames'], 'arms': [{k: a[k] for k in ['runnerLosTickBeforeWorld', 'runnerLosStoredSpeed', 'firstRecordedRgLbPositiveImpulse', 'firstObservedRgLbPositiveNormalLoad']} for a in r['arms']]} for r in rows]}))


if __name__ == '__main__':
    main()
