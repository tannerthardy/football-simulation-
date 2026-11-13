#!/usr/bin/env python3
"""Read-only outcomes/process review of combo-transfer-review-v1 native panels.

    python scripts/diag/run-outcome-review.py summarize panel.json.gz report.json
    python scripts/diag/run-outcome-review.py compare before.json.gz after.json.gz report.json

No simulation is run, no gain is inferred from terminal ball position, and
supplemental witnesses are never pooled with the ordinary panel. Censored gains
are displayed separately from naturally completed football outcomes.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

SCHEMA = 'combo-transfer-review-v1'
OUTPUT_SCHEMA = 'native-run-outcome-review-v1'
OL_SLOTS = {'LT', 'LG', 'C', 'RG', 'RT'}
PIN = re.compile(r'^[0-9a-f]{64}$')
EPS = 1e-6


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def quantile(values, probability):
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * probability
    low = int(math.floor(index))
    high = int(math.ceil(index))
    return ordered[low] + (ordered[high] - ordered[low]) * (index - low)


def distribution(values):
    valid = [v for v in values if finite(v)]
    return {'n': len(valid), 'mean': statistics.fmean(valid) if valid else None,
            'median': quantile(valid, .5), 'p10': quantile(valid, .1),
            'p90': quantile(valid, .9), 'min': min(valid) if valid else None,
            'max': max(valid) if valid else None}


def rate(count, denominator):
    return {'count': count, 'denominator': denominator,
            'percent': 100 * count / denominator if denominator else None}


def events(trial, kind):
    return [event for event in trial['result']['events'] if event.get('type') == kind]


def slot(trial, index):
    players = trial['initialProjection']['players']
    return players[index]['slot'] if isinstance(index, int) and not isinstance(index, bool) and 0 <= index < len(players) else None


def contact_evidence(row, climber, backer):
    load = row.get('nativeLoad')
    if not isinstance(load, dict):
        return {'nativeLoadAvailable': False, 'positiveHandForce': None, 'positiveBodyImpulse': None}
    joints = load.get('liveHandsAfterPhysics')
    contacts = load.get('physicalContacts')
    positive_hand = None
    if isinstance(joints, list):
        forces = [math.hypot(j.get('normalForce', 0), j.get('tangentForce', 0)) for j in joints
                  if {j.get('a'), j.get('b')} == {climber, backer}
                  and finite(j.get('normalForce', 0)) and finite(j.get('tangentForce', 0))]
        positive_hand = any(force > EPS for force in forces)
    positive_body = None
    if isinstance(contacts, list):
        positive_body = any(c.get('other') == backer and finite(c.get('impulse')) and c['impulse'] > EPS for c in contacts)
    return {'nativeLoadAvailable': True, 'positiveHandForce': positive_hand,
            'positiveBodyImpulse': positive_body}


def climb_evidence(trial):
    """Lower-bound post-release evidence from first-pair records, not full contact history."""
    rows = []
    for event in events(trial, 'block_climb'):
        climber, backer = slot(trial, event.get('a')), slot(trial, event.get('b'))
        metrics = trial['olMetrics'].get(climber) if climber else None
        available = isinstance(metrics, dict) and isinstance(metrics.get('firstHands'), list) and isinstance(metrics.get('firstContacts'), list)
        hand_rows, body_rows = [], []
        if available and finite(event.get('t')):
            hand_rows = [r for r in metrics['firstHands'] if r.get('other') == backer and finite(r.get('t')) and r['t'] >= event['t'] - 1e-9]
            body_rows = [r for r in metrics['firstContacts'] if r.get('other') == backer and finite(r.get('t')) and r['t'] >= event['t'] - 1e-9]
        hand_evidence = [contact_evidence(r, climber, backer) for r in hand_rows]
        body_evidence = [contact_evidence(r, climber, backer) for r in body_rows]
        rows.append({'t': event.get('t') if finite(event.get('t')) else None,
                     'climber': climber, 'backer': backer, 'note': event.get('note'),
                     'isOLClimber': climber in OL_SLOTS, 'firstPairMetricsAvailable': available,
                     'laterRecordedFirstHandContact': bool(hand_rows) if available else None,
                     'laterRecordedPositiveHandForce': any(r['positiveHandForce'] is True for r in hand_evidence) if available else None,
                     'laterRecordedFirstBodyContact': bool(body_rows) if available else None,
                     'laterRecordedPositiveBodyImpulse': any(r['positiveBodyImpulse'] is True for r in body_evidence) if available else None,
                     'handLoadRecordsAvailable': sum(r['nativeLoadAvailable'] for r in hand_evidence),
                     'bodyLoadRecordsAvailable': sum(r['nativeLoadAvailable'] for r in body_evidence),
                     'rawReference': f'olMetrics.{climber}.firstHands / firstContacts' if metrics else None})
    return rows


def first_event_time(trial, kind):
    times = [event.get('t') for event in events(trial, kind) if finite(event.get('t'))]
    return min(times) if times else None


def trial_record(trial, distance):
    result, stats = trial['result'], trial['result']['stats']
    gain = result.get('offenseYards')
    gain = gain if finite(gain) else None
    eligible = trial['naturalEnd'] and gain is not None
    climbs = climb_evidence(trial)
    holding_events = [e for e in result['events'] if e.get('type') == 'holding']
    penalty_events = [e for e in result['events'] if e.get('type') in {'holding', 'penalty'}]
    handoff, snap = first_event_time(trial, 'handoff'), first_event_time(trial, 'snap')
    return {'id': trial['id'], 'run': trial['run'], 'front': trial['front'],
            'flip': trial['flip'], 'seed': trial['seed'], 'roster': trial['roster'],
            'formation': trial['formation'], 'supplemental': trial['supplemental'],
            'outcome': result['outcome'], 'naturalEnd': trial['naturalEnd'],
            'finiteOffenseYards': gain is not None, 'offenseYards': gain,
            'gainEligible': eligible,
            'firstDown40PercentGainProxy': gain >= .4 * distance if eligible and distance is not None else None,
            'gainDistanceConversion': gain >= distance if eligible and distance is not None else None,
            'recordedTurnover': result.get('turnover') if isinstance(result.get('turnover'), bool) else None,
            'duration': result.get('duration') if finite(result.get('duration')) else None,
            'yardsBeforeContact': stats.get('yardsBeforeContact') if finite(stats.get('yardsBeforeContact')) else None,
            'handoffAt': handoff, 'snapAt': snap,
            'handoffDelayFromSnap': handoff - snap if handoff is not None and snap is not None and handoff >= snap else None,
            'fumbleEvents': len(events(trial, 'fumble')),
            'recordedFumbleLost': stats.get('fumbleLost') if isinstance(stats.get('fumbleLost'), bool) else None,
            'missedTackleEvents': len(events(trial, 'missed_tackle')),
            'brokenTackleEvents': len(events(trial, 'broken_tackle')),
            'recordedMissedTackles': stats.get('missedTackles') if finite(stats.get('missedTackles')) else None,
            'recordedBrokenTackles': stats.get('brokenTackles') if finite(stats.get('brokenTackles')) else None,
            'holdingEventFlags': len(holding_events), 'penaltyEventFlags': len(penalty_events),
            'wholePlayClimbs': len(climbs), 'climbs': climbs,
            'oldCommandLocalClimbs': trial.get('earnedClimbs') if finite(trial.get('earnedClimbs')) else None,
            'olFalls': sum(m.get('falls', 0) for m in trial['olMetrics'].values() if finite(m.get('falls', 0))),
            'olDowns': sum(m.get('downs', 0) for m in trial['olMetrics'].values() if finite(m.get('downs', 0))),
            'profileSha256': trial['profileSha256'], 'initialSha256': trial['initialSha256']}


def aggregate(records, distance):
    natural = [r for r in records if r['naturalEnd']]
    censors = [r for r in records if not r['naturalEnd']]
    eligible = [r for r in records if r['gainEligible']]
    values = [r['offenseYards'] for r in eligible]
    climbs = [c for r in records for c in r['climbs']]
    ol_climbs = [c for c in climbs if c['isOLClimber']]
    available_climbs = [c for c in ol_climbs if c['firstPairMetricsAvailable']]
    successes = [r for r in records if r['firstDown40PercentGainProxy'] is not None]
    conversions = [r for r in records if r['gainDistanceConversion'] is not None]
    def stat_total(key):
        valid = [r[key] for r in records if r[key] is not None]
        return {'recordedTotal': sum(valid), 'snapsWithFiniteField': len(valid)}
    return {'counts': {'snaps': len(records), 'naturalEnds': len(natural), 'censors': len(censors),
                       'finiteOffenseYards': sum(r['finiteOffenseYards'] for r in records),
                       'nonfiniteOrMissingOffenseYards': sum(not r['finiteOffenseYards'] for r in records),
                       'naturallyFinishedFiniteGains': len(eligible),
                       'outcomes': dict(sorted(Counter(r['outcome'] for r in records).items()))},
            'yards': {'naturalFinished': distribution(values),
                      'censoredRecorded': distribution([r['offenseYards'] for r in censors]),
                      'allObservedFiniteDescriptiveOnly': distribution([r['offenseYards'] for r in records])},
            'gainRates': {'negative': rate(sum(v < 0 for v in values), len(values)),
                          'zero': rate(sum(v == 0 for v in values), len(values)),
                          'stuff': rate(sum(v <= 0 for v in values), len(values)),
                          'runs10Plus': rate(sum(v >= 10 for v in values), len(values)),
                          'runs20Plus': rate(sum(v >= 20 for v in values), len(values)),
                          'firstDown40PercentGainProxy': rate(sum(r['firstDown40PercentGainProxy'] for r in successes), len(successes)),
                          'gainDistanceConversion': rate(sum(r['gainDistanceConversion'] for r in conversions), len(conversions))},
            'fixedPanelDistanceToGain': distance,
            'yardsBeforeContactProxy': distribution([r['yardsBeforeContact'] for r in records]),
            'handoff': {'snapsWithHandoffEvent': sum(r['handoffAt'] is not None for r in records),
                        'eventTime': distribution([r['handoffAt'] for r in records]),
                        'delayFromRecordedSnap': distribution([r['handoffDelayFromSnap'] for r in records])},
            'eventsAndFlags': {'fumbleEvents': sum(r['fumbleEvents'] for r in records),
                               'snapsWithFumbleEvent': sum(r['fumbleEvents'] > 0 for r in records),
                               'snapsWithRecordedFumbleLost': sum(r['recordedFumbleLost'] is True for r in records),
                               'snapsWithKnownFumbleLostField': sum(r['recordedFumbleLost'] is not None for r in records),
                               'missedTackleEvents': sum(r['missedTackleEvents'] for r in records),
                               'brokenTackleEvents': sum(r['brokenTackleEvents'] for r in records),
                               'recordedMissedTackles': stat_total('recordedMissedTackles'),
                               'recordedBrokenTackles': stat_total('recordedBrokenTackles'),
                               'holdingEventFlags': sum(r['holdingEventFlags'] for r in records),
                               'snapsWithHoldingEventFlag': sum(r['holdingEventFlags'] > 0 for r in records),
                               'penaltyEventFlags': sum(r['penaltyEventFlags'] for r in records),
                               'snapsWithPenaltyEventFlag': sum(r['penaltyEventFlags'] > 0 for r in records)},
            'process': {'wholePlayClimbs': len(climbs), 'wholePlayOLClimbs': len(ol_climbs),
                        'snapsWithWholePlayClimb': sum(r['wholePlayClimbs'] > 0 for r in records),
                        'oldCommandLocalClimbs': stat_total('oldCommandLocalClimbs'),
                        'olClimbsWithFirstPairMetrics': len(available_climbs),
                        'olClimbsWithLaterRecordedFirstHandContact': sum(c['laterRecordedFirstHandContact'] is True for c in available_climbs),
                        'olClimbsWithLaterRecordedPositiveHandForce': sum(c['laterRecordedPositiveHandForce'] is True for c in available_climbs),
                        'olClimbsWithLaterRecordedFirstBodyContact': sum(c['laterRecordedFirstBodyContact'] is True for c in available_climbs),
                        'olClimbsWithLaterRecordedPositiveBodyImpulse': sum(c['laterRecordedPositiveBodyImpulse'] is True for c in available_climbs),
                        'olClimbsWithLaterRecordedPositiveHandOrBodyLoad': sum(c['laterRecordedPositiveHandForce'] is True or c['laterRecordedPositiveBodyImpulse'] is True for c in available_climbs),
                        'olFalls': sum(r['olFalls'] for r in records), 'olDowns': sum(r['olDowns'] for r in records)}}


def check_pin(value, field):
    if not isinstance(value, str) or not PIN.fullmatch(value):
        raise ValueError(f'{field}: missing or malformed SHA-256')


def validate_report(report):
    if report.get('schema') != SCHEMA:
        raise ValueError('Unsupported collector schema')
    for key in ('sourceBefore', 'sourceAfter', 'collectorSha256'):
        check_pin(report.get(key), key)
    if report['sourceBefore'] != report['sourceAfter']:
        raise ValueError('Engine source changed during collector run')
    if not isinstance(report.get('cohort'), dict) or not isinstance(report.get('moduleSha256'), dict):
        raise ValueError('Missing cohort or module source pins')
    for key, value in report['moduleSha256'].items():
        check_pin(value, key)
    ids = set()
    for key, supplemental in (('trials', False), ('supplementalTrials', True)):
        if not isinstance(report.get(key), list):
            raise ValueError(f'Missing {key} array')
        for trial in report[key]:
            if not isinstance(trial.get('id'), str) or not trial['id'] or trial['id'] in ids:
                raise ValueError('Missing or duplicate trial ID')
            ids.add(trial['id'])
            if trial.get('supplemental') is not supplemental:
                raise ValueError(f'{trial["id"]}: ordinary/supplemental mismatch')
            if trial.get('observerVerified') is not True or trial.get('observedSignature') != trial.get('plainSignature'):
                raise ValueError(f'{trial["id"]}: observer/plain execution mismatch')
            for field in ('observedSignature', 'plainSignature', 'initialSha256', 'profileSha256'):
                check_pin(trial.get(field), f'{trial["id"]}.{field}')
            for field in ('run', 'front', 'formation'):
                if not isinstance(trial.get(field), str):
                    raise ValueError(f'{trial["id"]}: missing {field}')
            if any(field not in trial for field in ('flip', 'seed', 'roster')):
                raise ValueError(f'{trial["id"]}: missing identity inputs')
            result = trial.get('result')
            if not isinstance(result, dict) or not isinstance(result.get('events'), list) or not isinstance(result.get('stats'), dict) or not isinstance(result.get('outcome'), str):
                raise ValueError(f'{trial["id"]}: incomplete public result')
            if not isinstance(trial.get('naturalEnd'), bool) or trial['naturalEnd'] != (result['outcome'] != 'timeout'):
                raise ValueError(f'{trial["id"]}: censor/natural outcome mismatch')
            projection = trial.get('initialProjection')
            if not isinstance(projection, dict) or not isinstance(projection.get('players'), list) or 'ownership' not in projection or not isinstance(trial.get('olMetrics'), dict):
                raise ValueError(f'{trial["id"]}: missing initial projection or OL process metrics')
    return report


def distance_to_gain(report):
    start, end = report['cohort'].get('los'), report['cohort'].get('firstDownX')
    return end - start if finite(start) and finite(end) and end > start else None


def population_summary(records, distance):
    by_run, by_front, by_joint = defaultdict(list), defaultdict(list), defaultdict(list)
    for row in records:
        by_run[row['run']].append(row)
        by_front[row['front']].append(row)
        by_joint[(row['run'], row['front'])].append(row)
    return {'overall': aggregate(records, distance),
            'byRun': {key: aggregate(rows, distance) for key, rows in sorted(by_run.items())},
            'byFront': {key: aggregate(rows, distance) for key, rows in sorted(by_front.items())},
            'byRunAndFront': [{'run': key[0], 'front': key[1], 'summary': aggregate(rows, distance)} for key, rows in sorted(by_joint.items())],
            'trials': records}


DEFINITIONS = {
    'gain': 'result.offenseYards only; terminal endX/endY may belong to a defensive fumble return and never supply offensive gain.',
    'gainEligibility': 'Finite offenseYards on naturalEnd=true. Timeout gains are descriptive censored observations, never natural gain-rate outcomes.',
    'successProxy': 'Gain at least 40% of recorded cohort firstDownX minus los. Panel has no per-play down field: this is a fixed first-down proxy, not an observed first-down award or a general 40/60/100 success metric.',
    'conversion': 'Gain at least recorded cohort distance to gain; turnover/legal award are distinct and not inferred.',
    'penaltyFlags': 'holding and penalty event labels only. Acceptance, enforcement, no-play status and all other foul types are not supplied by this collector and are not invented.',
    'yardsBeforeContact': 'Finite result.stats.yardsBeforeContact, with its own n; engine carrier-contact proxy, not independent NFL first-body-contact truth. All observed field values are descriptive, including censors.',
    'climbs': 'Whole result.events block_climb counts, including prepass events missed by old earnedClimbs command-local capture.',
    'climbContact': 'OL firstHands/firstContacts for the emitted backer at recorded tick start t >= climb t (1e-9 tolerance). Positive pair hand-force magnitude/body impulse exceeds 1e-6. First-pair records are lower-bound evidence: an earlier first contact or zero first force can hide later useful contact. Absence does not prove never touched, sustained control or a successful block.',
    'adversePairs': 'Descriptive paired deterioration in completed gain, success/conversion, censoring, turnover/fumble, OL falls/downs or holding flags. All pairs are retained; these categories do not establish the first causal divergence.',
    'population': 'Ordinary trials and supplementalTrials remain separate at every summary/comparison layer; fixed balanced panels are not NFL playcalling rates.'}


def source_metadata(report):
    return {key: report[key] for key in ('schema', 'sourceBefore', 'sourceAfter', 'collectorSha256', 'moduleSha256', 'cohort')}


def summarize_report(report):
    validate_report(report)
    distance = distance_to_gain(report)
    ordinary = [trial_record(t, distance) for t in report['trials']]
    supplemental = [trial_record(t, distance) for t in report['supplementalTrials']]
    return {'schema': OUTPUT_SCHEMA, 'mode': 'summary', 'source': source_metadata(report),
            'definitions': DEFINITIONS,
            'ordinary': population_summary(ordinary, distance),
            'supplemental': population_summary(supplemental, distance)}


def adverse_reasons(before, after):
    reasons = []
    if before['gainEligible'] and after['gainEligible'] and after['offenseYards'] < before['offenseYards']:
        reasons.append('naturallyFinishedOffenseYardsDecreased')
    for key in ('firstDown40PercentGainProxy', 'gainDistanceConversion'):
        if before[key] is True and after[key] is False:
            reasons.append(key + 'Lost')
    if before['naturalEnd'] and not after['naturalEnd']:
        reasons.append('newCensor')
    if before['recordedTurnover'] is False and after['recordedTurnover'] is True:
        reasons.append('newRecordedTurnover')
    if before['recordedFumbleLost'] is False and after['recordedFumbleLost'] is True:
        reasons.append('newRecordedFumbleLost')
    for key in ('fumbleEvents', 'olFalls', 'olDowns', 'holdingEventFlags'):
        if after[key] > before[key]:
            reasons.append(key + 'Increased')
    return reasons


def compare_reports(before, after):
    validate_report(before)
    validate_report(after)
    for key in ('schema', 'collectorSha256', 'cohort'):
        if before[key] != after[key]:
            raise ValueError(f'Comparison {key} mismatch')
    paired = {}
    for population, input_key in (('ordinary', 'trials'), ('supplemental', 'supplementalTrials')):
        old = {t['id']: t for t in before[input_key]}
        new = {t['id']: t for t in after[input_key]}
        if old.keys() != new.keys():
            raise ValueError(f'Comparison {population} ID mismatch')
        pairs = []
        distance = distance_to_gain(before)
        for trial in before[input_key]:
            other = new[trial['id']]
            for key in ('run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental', 'profileSha256', 'initialSha256', 'initialProjection'):
                if trial[key] != other[key]:
                    raise ValueError(f'{trial["id"]}: comparison {key} mismatch')
            b, a = trial_record(trial, distance), trial_record(other, distance)
            reasons = adverse_reasons(b, a)
            pairs.append({'id': trial['id'], 'run': trial['run'], 'front': trial['front'],
                          'before': b, 'after': a,
                          'yardsDelta': a['offenseYards'] - b['offenseYards'] if a['offenseYards'] is not None and b['offenseYards'] is not None else None,
                          'identicalCompleteExecution': trial['observedSignature'] == other['observedSignature'],
                          'identicalCompletePublicResult': trial['result'] == other['result'],
                          'identicalRecordedOLMetrics': trial['olMetrics'] == other['olMetrics'],
                          'adverseReasons': reasons})
        paired[population] = {'snaps': len(pairs),
                              'identicalCompleteExecutions': sum(p['identicalCompleteExecution'] for p in pairs),
                              'identicalCompletePublicResults': sum(p['identicalCompletePublicResult'] for p in pairs),
                              'identicalRecordedOLMetrics': sum(p['identicalRecordedOLMetrics'] for p in pairs),
                              'adversePairCount': sum(bool(p['adverseReasons']) for p in pairs),
                              'adverseCategories': dict(sorted(Counter(reason for p in pairs for reason in p['adverseReasons']).items())),
                              'allPairs': pairs,
                              'adversePairs': [p for p in pairs if p['adverseReasons']]}
    return {'schema': OUTPUT_SCHEMA, 'mode': 'comparison', 'definitions': DEFINITIONS,
            'beforeSummary': summarize_report(before), 'afterSummary': summarize_report(after),
            'pairs': paired}


def read_report(path):
    path = Path(path)
    raw = path.read_bytes()
    data = gzip.decompress(raw) if path.suffix == '.gz' else raw
    return json.loads(data), {'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('summarize', 'compare'))
    parser.add_argument('inputs', nargs='+', help='one or two native reports, followed by output JSON')
    args = parser.parse_args()
    expected = 2 if args.mode == 'summarize' else 3
    if len(args.inputs) != expected:
        parser.error(f'{args.mode} requires {expected - 1} input report(s) and one output path')
    reports, receipts = [], []
    for path in args.inputs[:-1]:
        report, receipt = read_report(path)
        reports.append(report)
        receipts.append(receipt)
    output = summarize_report(reports[0]) if args.mode == 'summarize' else compare_reports(*reports)
    output['inputFiles'] = receipts
    output['tool'] = {'path': 'scripts/diag/run-outcome-review.py',
                      'sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    target = Path(args.inputs[-1])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'output': str(target), 'mode': args.mode,
                      'ordinarySnaps': len(reports[0]['trials']),
                      'supplementalSnaps': len(reports[0]['supplementalTrials'])}))


if __name__ == '__main__':
    main()
