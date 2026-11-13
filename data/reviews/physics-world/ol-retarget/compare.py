#!/usr/bin/env python3
"""Reproduce the matched ownership/motion comparison without resimulating plays.

python3 data/reviews/physics-world/ol-retarget/compare.py [before.gz after.gz output.json]
Use --skip-guards when comparing newly collected panels without matching guards.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def read(path):
    with gzip.open(path, 'rt') if path.suffix == '.gz' else path.open() as stream:
        return json.load(stream)


def label(path):
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def pin(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def events(trial, kind):
    return [event for event in trial['result']['events'] if event['type'] == kind]


def non_event_result(trial):
    return {key: value for key, value in trial['result'].items() if key != 'events'}


def guard_comparison(before_source, after_source, pins):
    """Existing guards keep their own independent collector/profile pins."""
    prior = HERE.parent / 'projected-help'
    reports = {}
    for kind, filename in [('runs', 'current-runs.json.gz'),
                           ('tackles', 'current-tackles.json.gz'),
                           ('games', 'current-games9.json')]:
        paths = [prior / filename, HERE / filename]
        b, a = [read(path) for path in paths]
        assert b['sourceBefore'] == b['sourceAfter'] == before_source
        assert a['sourceBefore'] == a['sourceAfter'] == after_source
        assert b['scriptSha256'] == a['scriptSha256'], f'{kind} collector changed'
        pins.update({label(path): pin(path) for path in paths})
        if kind == 'runs':
            assert b['cohort'] == a['cohort']
            pairs = list(zip(b['trials'], a['trials']))
            assert len(b['trials']) == len(a['trials']) == 144
            assert all(x['id'] == y['id'] for x, y in pairs)
            reports[kind] = {'inputs': list(map(label, paths)), 'collectorSha256': a['scriptSha256'],
                'matchedInputs': len(pairs), 'completeRowsExact': sum(x == y for x, y in pairs),
                'creditedGainExact': sum(x['yards'] == y['yards'] for x, y in pairs),
                'beforeSummary': b['summary'], 'afterSummary': a['summary']}
        elif kind == 'tackles':
            for key in ['inputSha256', 'cohortSha256', 'profilesSha256']:
                assert b[key] == a[key]
            assert len(b['primary']) == len(a['primary']) == 56
            assert len(b['witnesses']) == len(a['witnesses']) == 8
            reports[kind] = {'inputs': list(map(label, paths)), 'collectorSha256': a['scriptSha256'],
                'primaryCount': 56, 'witnessCount': 8,
                'completePrimaryRowsExact': sum(x == y for x, y in zip(b['primary'], a['primary'])),
                'completeWitnessRowsExact': sum(x == y for x, y in zip(b['witnesses'], a['witnesses'])),
                'beforePrimarySummary': b['primarySummary'], 'afterPrimarySummary': a['primarySummary']}
        else:
            for key in ['seed', 'rosterSha256', 'excludedWarmGameSeed']:
                assert b[key] == a[key]
            assert len(b['games']) == len(a['games']) == 2
            assert [g['seed'] for g in b['games']] == [g['seed'] for g in a['games']]
            clean_game = lambda game: {k: v for k, v in game.items() if k not in ['wallMs', 'cpuMs']}
            clean_physics = lambda physics: {k: v for k, v in physics.items()
                if k not in ['nativeWorldTickMedianMs', 'nativeWorldTickP95Ms']}
            reports[kind] = {'inputs': list(map(label, paths)), 'collectorSha256': a['scriptSha256'],
                'matchedInitialRosterAndSeedGames': 2,
                'beforeGames': [clean_game(g) for g in b['games']],
                'afterGames': [clean_game(g) for g in a['games']],
                'beforePhysics': clean_physics(b['physics']), 'afterPhysics': clean_physics(a['physics']),
                'scope': 'Two games are regression guards. Later decisions, RNG and calls diverge; no causal attribution of passing statistics or performance benchmark.'}
    return reports


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path, nargs='?', default=HERE / 'panel-before.json.gz')
    parser.add_argument('after', type=Path, nargs='?', default=HERE / 'panel-after.json.gz')
    parser.add_argument('output', type=Path, nargs='?', default=HERE / 'comparison.json')
    parser.add_argument('--skip-guards', action='store_true')
    args = parser.parse_args()
    paths = [args.before, args.after]
    b, a = [read(path) for path in paths]
    assert b['sourceBefore'] == b['sourceAfter']
    assert a['sourceBefore'] == a['sourceAfter']
    assert b['collectorSha256'] == a['collectorSha256']
    assert b['moduleSha256']['src/physics/world.ts'] == a['moduleSha256']['src/physics/world.ts']
    assert b['cohort'] == a['cohort']
    assert len(b['trials']) == len(a['trials']) == 144
    pairs = list(zip(b['trials'], a['trials']))
    assert all(x['id'] == y['id'] and x['initialSha256'] == y['initialSha256']
        and x['profileSha256'] == y['profileSha256'] for x, y in pairs)
    assert all(x['observerVerified'] and x['observedSignature'] == x['plainSignature']
        for phase in [b, a] for x in phase['trials'])
    witnesses = []
    # The first two are among the predetermined fixed films. The Counter
    # transition is a retrospective inspection, with no additional film drawn.
    for trial_id in ['OR-R1-wz_strong-over-R-S3', 'OR-R1-iz_strong-over-R-S3',
                     'OR-R3-counter-over-L-S11']:
        x, y = next((x, y) for x, y in pairs if x['id'] == trial_id)
        first = x['firstStale']
        time, actor = first['t'], first['observer']
        snapshots = []
        for phase, trial in [('before', x), ('after', y)]:
            update = next(u for u in trial['updates'] if u['t'] == time and u['observer'] == actor)
            snapshots.append({'phase': phase, 't': time, 'actor': actor,
                'before': next(m for m in update['before'] if m['slot'] == actor),
                'after': next(m for m in update['after'] if m['slot'] == actor),
                'oldCombinationAfter': update['oldCombinationAfter'], 'requested': update['requested'],
                'deliveredStep': next((d for d in update['deliveredStep'] if d['slot'] == actor), None),
                'events': update['events']})
        witnesses.append({'id': trial_id,
            'selection': 'fixed-before-outcomes' if trial_id in b['filmIds'] else 'retrospective-transition-inspection-no-film',
            'beforeGain': x['result']['offenseYards'], 'afterGain': y['result']['offenseYards'],
            'transition': snapshots})
    changes = []
    for x, y in pairs:
        if x['observedSignature'] == y['observedSignature']:
            continue
        nx, ny = non_event_result(x), non_event_result(y)
        changes.append({'id': x['id'], 'beforeGain': x['result']['offenseYards'],
            'afterGain': y['result']['offenseYards'], 'beforeStaleUpdates': x['staleMemberUpdates'],
            'afterStaleUpdates': y['staleMemberUpdates'],
            'nonEventResultChanges': {k: {'before': nx.get(k), 'after': ny.get(k)}
                for k in sorted(set(nx) | set(ny)) if nx.get(k) != ny.get(k)},
            'beforeCancelled': x['cancelledTransitions'], 'afterCancelled': y['cancelledTransitions']})
    pins = {label(path): pin(path) for path in paths}
    report = {'schema': 'ol-retarget-comparison-v1', 'inputs': list(map(label, paths)),
        'comparisonToolSha256': pin(Path(__file__)), 'inputSha256': pins,
        'beforeSource': b['sourceBefore'], 'afterSource': a['sourceBefore'],
        'collectorSha256': b['collectorSha256'], 'worldSha256': a['moduleSha256']['src/physics/world.ts'],
        'matchedInputProfileCount': len(pairs),
        'observerVerifiedBefore': b['summary']['observerVerifiedCount'],
        'observerVerifiedAfter': a['summary']['observerVerifiedCount'],
        'beforeSummary': b['summary'], 'afterSummary': a['summary'],
        'completeObservedExecutionExact': sum(x['observedSignature'] == y['observedSignature'] for x, y in pairs),
        'nonEventResultExact': sum(non_event_result(x) == non_event_result(y) for x, y in pairs),
        'creditedGainExact': sum(x['result']['offenseYards'] == y['result']['offenseYards'] for x, y in pairs),
        'earnedClimbEventsExact': sum(events(x, 'block_climb') == events(y, 'block_climb') for x, y in pairs),
        'firstCarrierContactEventsExact': sum(events(x, 'carrier_contact')[:1] == events(y, 'carrier_contact')[:1] for x, y in pairs),
        'handoffEventsExact': sum(events(x, 'handoff') == events(y, 'handoff') for x, y in pairs),
        'blockContactEventsExact': sum(events(x, 'block_contact') == events(y, 'block_contact') for x, y in pairs),
        'conservation': {phase: {key: max(t[key] for t in panel['trials']) for key in
            ['maxMomentumResidual', 'maxWorkResidual', 'maxMotorWorkExcess']}
            for phase, panel in [('before', b), ('after', a)]}, 'changes': changes, 'witnesses': witnesses,
        'limits': ['Snapshot ownership correction is demonstrated; this panel does not establish a run-efficiency improvement.',
            'Complete execution signatures include new diagnostic events; a different signature alone does not prove a changed physical path.',
            'The fixed WZ witness changes real native-step motion, but its rounded 10Hz film positions and credited gain remain identical.',
            'Result statistics and credited yardage are distinct from the native-step requested/achieved motion and load.']}
    if not args.skip_guards:
        report['guards'] = guard_comparison(b['sourceBefore'], a['sourceBefore'], pins)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': label(args.output), 'matchedInputs': len(pairs),
        'completeObservedExecutionExact': report['completeObservedExecutionExact'],
        'beforeStaleSnaps': b['summary']['staleSnaps'], 'afterStaleSnaps': a['summary']['staleSnaps']}))


if __name__ == '__main__':
    main()
