#!/usr/bin/env python3
"""Compare fixed ordinary OL panels without resimulating or selecting winners.

python3 scripts/diag/compare-ol-technique.py before.json.gz after.json.gz output.json
Supplemental prior recovery witnesses are always separate from pooled results.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def pin(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def companion_film(path):
    direct = Path(str(path).removesuffix('.json.gz') + '-film.json.gz')
    published = path.with_name(path.name.replace('panel-', 'film-', 1))
    return direct if direct.exists() or not path.name.startswith('panel-') else published


def event_list(trial, kind):
    return [event for event in trial['result']['events'] if event['type'] == kind]


def non_event_result(trial):
    return {key: value for key, value in trial['result'].items() if key != 'events'}


def metrics(trials):
    ol = [m for trial in trials for m in trial['olMetrics'].values()]
    contacts = [c for m in ol for c in m['firstContacts'] if c['otherTeam'] == 'D']
    hands = [c for m in ol for c in m['firstHands']]
    first_carrier = [event_list(t, 'carrier_contact')[0]['t'] for t in trials if event_list(t, 'carrier_contact')]
    outcome = [t['result'] for t in trials]
    mean = lambda values: sum(values) / len(values) if values else None
    summable = ['controllerUpdates', 'freeApproachUpdates', 'engagedUpdates', 'targetChanges',
        'lateKeeperFreeUpdates', 'observedSecondLevelFirstLevelKindUpdates',
        'armImpulseSum', 'armWorkSum', 'groundImpulseMagnitudeSum', 'supportMotorWorkSum',
        'deliveredStrikeCount', 'falls', 'downs']
    return {
        'snaps': len(trials), 'naturalEnds': sum(t['naturalEnd'] for t in trials),
        'observerVerifiedCount': sum(t['observerVerified'] for t in trials),
        'meanYards': mean([r['offenseYards'] for r in outcome]),
        'stuffs': sum(r['offenseYards'] <= 0 for r in outcome),
        'runs10Plus': sum(r['offenseYards'] >= 10 for r in outcome),
        'earnedClimbs': sum(t['earnedClimbs'] for t in trials),
        'cancellations': sum(t['cancelledTransitions'] for t in trials),
        'staleUpdates': sum(t['staleMemberUpdates'] for t in trials),
        'firstCarrierContactCount': len(first_carrier), 'meanFirstCarrierContactTime': mean(first_carrier),
        'ol': {key: sum(m[key] for m in ol) for key in summable},
        'firstNativeOLDefenderBodyContacts': len(contacts),
        'firstSurvivingOLHandsContacts': len(hands),
        'firstNativeOLDefenderBodyMeanAbsLateralToPlanDrive': mean([c['lateralErrorToDrive'] for c in contacts]),
        'firstSurvivingOLHandsMeanAbsLateralToPlanDrive': mean([c['lateralErrorToDrive'] for c in hands]),
        'maxMomentumResidual': max(t['maxMomentumResidual'] for t in trials),
        'maxWorkResidual': max(t['maxWorkResidual'] for t in trials),
        'maxMotorWorkExcess': max(t['maxMotorWorkExcess'] for t in trials),
    }


def verify_pairs(before, after):
    assert len(before) == len(after)
    pairs = list(zip(before, after))
    for b, a in pairs:
        assert b['id'] == a['id']
        assert b['profileSha256'] == a['profileSha256'], f"Physical profiles changed: {b['id']}"
        for key in ['roster', 'run', 'front', 'flip', 'seed', 'supplemental', 'formation']:
            assert b[key] == a[key]
        for t in [b, a]:
            assert t['observerVerified'] and t['observedSignature'] == t['plainSignature']
    return pairs


def transition_witness(trial, actor, time, film):
    row = next((r for r in trial['updates'] if r['observer'] == actor and r['t'] == time), None)
    source = 'retained-panel-transition'
    if row is None:
        # Corrected ownership no longer triggers the legacy issue counter.
        # The fixed witness retains every actual controller update regardless.
        tick = next((t for t in film.get('trace', []) if t['t'] == time), None)
        row = next((r for r in tick['updates'] if r['observer'] == actor), None) if tick else None
        if row is None:
            return None
        row = {**row, 'deliveredStep': row.get('deliveredStep', tick['deliveredStep'])}
        source = 'fixed-full-native-film'
    return {'snapshotSource': source, **{key: row[key] for key in ['t', 'observer', 'classification', 'beforeBody', 'afterBody',
        'targetGeometry', 'requested', 'consumedImages', 'events', 'deliveredStep']}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    before, after = read(args.before), read(args.after)
    film_paths = [companion_film(path) for path in [args.before, args.after]]
    films = [read(path) if path.exists() else None for path in film_paths]
    assert before['schema'] == after['schema'] == 'ol-technique-review-v1'
    for phase in [before, after]:
        assert phase['sourceBefore'] == phase['sourceAfter']
    assert before['collectorSha256'] == after['collectorSha256']
    assert before['cohort'] == after['cohort']
    assert before['moduleSha256']['src/physics/world.ts'] == after['moduleSha256']['src/physics/world.ts']
    assert before['filmIds'] == after['filmIds']
    for panel, film in zip([before, after], films):
        if film is not None:
            assert film['sourceBefore'] == film['sourceAfter'] == panel['sourceBefore']
            assert film['collectorSha256'] == panel['collectorSha256']
            assert [play['id'] for play in film['plays']] == panel['filmIds']
    pooled = verify_pairs(before['trials'], after['trials'])
    supplemental = verify_pairs(before['supplementalTrials'], after['supplementalTrials'])
    assert len(pooled) == 160 and len(supplemental) == 2
    changes = []
    for b, a in pooled:
        if b['observedSignature'] == a['observedSignature']:
            continue
        rb, ra = non_event_result(b), non_event_result(a)
        changes.append({'id': b['id'], 'beforeGain': b['result']['offenseYards'], 'afterGain': a['result']['offenseYards'],
            'nonEventResultChanges': {key: {'before': rb.get(key), 'after': ra.get(key)}
                for key in sorted(set(rb) | set(ra)) if rb.get(key) != ra.get(key)},
            'beforeLateKeeperUpdates': sum(m['lateKeeperFreeUpdates'] for m in b['olMetrics'].values()),
            'afterLateKeeperUpdates': sum(m['lateKeeperFreeUpdates'] for m in a['olMetrics'].values())})
    summaries = {'before': metrics(before['trials']), 'after': metrics(after['trials'])}
    witnesses = []
    for b, a in supplemental:
        actor, time = ('LT', 3.55) if b['run'] == 'oz_strong' else ('RT', 2.75)
        witnesses.append({'id': b['id'], 'selection': 'named-prior-ordinary-witness-not-pooled',
            'beforeGain': b['result']['offenseYards'], 'afterGain': a['result']['offenseYards'],
            'beforeMetrics': metrics([b]), 'afterMetrics': metrics([a]),
            'beforeTransition': transition_witness(b, actor, time,
                next((play for play in films[0]['plays'] if play['id'] == b['id']), {}) if films[0] else {}),
            'afterTransition': transition_witness(a, actor, time,
                next((play for play in films[1]['plays'] if play['id'] == a['id']), {}) if films[1] else {})})
    report = {'schema': 'ol-technique-comparison-v1', 'beforeSource': before['sourceBefore'],
        'afterSource': after['sourceBefore'], 'collectorSha256': before['collectorSha256'],
        'comparisonToolSha256': pin(Path(__file__)),
        'inputSha256': {str(path): pin(path) for path in [args.before, args.after, *film_paths] if path.exists()},
        'worldSha256': after['moduleSha256']['src/physics/world.ts'],
        'matchedPooledInputProfiles': len(pooled), 'matchedSupplementalInputProfiles': len(supplemental),
        'initialControllerStateExact': sum(b['initialSha256'] == a['initialSha256'] for b, a in pooled),
        'completeObservedExecutionExact': sum(b['observedSignature'] == a['observedSignature'] for b, a in pooled),
        'nonEventResultExact': sum(non_event_result(b) == non_event_result(a) for b, a in pooled),
        'creditedGainExact': sum(b['result']['offenseYards'] == a['result']['offenseYards'] for b, a in pooled),
        'handoffEventsExact': sum(event_list(b, 'handoff') == event_list(a, 'handoff') for b, a in pooled),
        'firstCarrierContactEventsExact': sum(event_list(b, 'carrier_contact')[:1] == event_list(a, 'carrier_contact')[:1] for b, a in pooled),
        'summary': summaries,
        'byConcept': {run: {phase: metrics([t for t in panel['trials'] if t['run'] == run])
            for phase, panel in [('before', before), ('after', after)]} for run in before['cohort']['runs']},
        'byFront': {front: {phase: metrics([t for t in panel['trials'] if t['front'] == front])
            for phase, panel in [('before', before), ('after', after)]} for front in before['cohort']['fronts']},
        'changes': changes, 'supplementalWitnesses': witnesses,
        'limits': [
            'The balanced one-roster panel is not a naturally distributed NFL outcome sample.',
            'Initial controller state may intentionally change; physical profile and fixed input setup matches are enforced.',
            'Second-level/first-level-kind counter is descriptive observed depth >=2 yd, not a proof of bad football technique.',
            'Native center offset to intended drive is not an outcome-calibrated leverage score or proof of winning a block.',
            'First surviving hand contacts omit hands removed within the tick; total native delivered arm impulses/work retain those loads.',
            'Wall/CPU time includes observation, full replay recording and plain controls, so it is not a solver benchmark.',
        ]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'matchedPooledInputProfiles': len(pooled),
        'creditedGainExact': report['creditedGainExact'], 'summary': summaries}, indent=2))


if __name__ == '__main__':
    main()
