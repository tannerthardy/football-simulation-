#!/usr/bin/env python3
"""Compare all retained coverage-help panel phases without resimulating.

python data/reviews/physics-world/visible-help/compare.py BEFORE POSE_ONLY FINAL OUTPUT
Inputs are raw.json.gz from the unchanged coverage-help-review.ts collector.
"""
from __future__ import annotations
import collections
import gzip
import hashlib
import json
import pathlib
import sys


def read(path):
    p = pathlib.Path(path)
    raw = p.read_bytes()
    report = json.loads(gzip.decompress(raw) if p.suffix == '.gz' else raw)
    if report.get('schema') != 'coverage-help-review-v1':
        raise ValueError(f'{path}: unexpected panel schema')
    return report, hashlib.sha256(raw).hexdigest()


def without_buffer(context):
    # Pose adds one ring-buffer field. All other physical/controller/RNG
    # fields remain part of the comparison, including current hand loads.
    return {k: v for k, v in context.items() if k != 'perception'}


def stable_hash(value):
    # A comparison-artifact hash, not the collector's JS serialization hash.
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def gain(row):
    end = row['end']
    if end['censored'] or not end.get('endSpot') or end['possession'] != 'O':
        return None
    return end['endSpot']['x'] - 40


def anatomy(row):
    end = row['end']; stats = end['stats']; events = row['endpointContext']['events']
    counted = collections.Counter(e['type'] for e in events)
    catch = next((e for e in events if e['type'] == 'catch'), None)
    natural_gain = gain(row)
    return {
        't': end['t'], 'outcome': end['outcome'], 'censored': end['censored'],
        'possession': end['possession'], 'endSpot': end.get('endSpot'),
        'attempted': bool(stats.get('attempted')), 'completed': bool(stats.get('completed')),
        'sacked': bool(stats.get('sacked')), 'scramble': bool(stats.get('scramble')),
        'enginePressureFlag': bool(stats.get('pressured')),
        'throwaway': bool(stats.get('throwaway')), 'dropped': bool(stats.get('dropped')),
        'interceptedBy': stats.get('interceptedBy'), 'target': stats.get('target'),
        'timeToThrow': stats.get('timeToThrow'), 'airYards': stats.get('airYards'),
        'separation': stats.get('separation'), 'naturalOffenseEndAdvance': natural_gain,
        'naturalCompletedAdvance20Plus': bool(stats.get('completed')) and natural_gain is not None and natural_gain >= 20,
        'catchEvent': catch,
        'brokenTackles': stats.get('brokenTackles'), 'missedTackles': stats.get('missedTackles'),
        'eventCounts': dict(counted),
        'falls': [e for e in events if e['type'] == 'fall'],
        'penalty': end.get('penalty'),
    }


def totals(rows):
    samples = [anatomy(r) for r in rows]
    advances = [s['naturalOffenseEndAdvance'] for s in samples if s['completed'] and s['naturalOffenseEndAdvance'] is not None]
    return {
        'plays': len(samples), 'naturalEnds': sum(not s['censored'] for s in samples),
        'liveCensors': sum(s['censored'] for s in samples),
        'attemptsAtEndpoint': sum(s['attempted'] for s in samples),
        'completionsAtEndpoint': sum(s['completed'] for s in samples),
        'enginePressureFlags': sum(s['enginePressureFlag'] for s in samples),
        'sacks': sum(s['sacked'] for s in samples), 'scrambles': sum(s['scramble'] for s in samples),
        'throwaways': sum(s['throwaway'] for s in samples), 'drops': sum(s['dropped'] for s in samples),
        'interceptions': sum(s['interceptedBy'] is not None for s in samples),
        'naturalCompletedAdvances': advances,
        'meanNaturalCompletedAdvance': sum(advances) / len(advances) if advances else None,
        'naturalCompletedAdvances20Plus': sum(s['naturalCompletedAdvance20Plus'] for s in samples),
        'falls': sum(len(s['falls']) for s in samples),
        'brokenTackles': sum(s['brokenTackles'] or 0 for s in samples),
        'missedTackles': sum(s['missedTackles'] or 0 for s in samples),
    }


def decision_key(d):
    return d['t'], d['observer']


def decision_map(row):
    out = {}
    for d in row['decisions']:
        key = decision_key(d)
        if key in out:
            raise ValueError(f'Duplicate decision key {row["id"]}/{key}')
        out[key] = d
    return out


def witness(row):
    # Fixed natural input and time retained from the pre-candidate audit.
    if row['id'] != 'HELP-R2-gun_trips_11-smash-cover4-S3':
        return None
    d = next((d for d in row['decisions'] if d['t'] == 1.6 and d['slot'] == 'CB_S'), None)
    if not d:
        return {'id': row['id'], 'time': 1.6, 'recordedFreshDecision': False}
    own = next((r for r in d['cachedReceiverReads'] if r['r']['slot'] == 'Z'), None)
    return {'id': row['id'], 'time': 1.6, 'recordedFreshDecision': True,
            'primary': d['primary'], 'chosen': d['chosen'], 'reason': d['reason'],
            'ownConsumedReceiver': own, 'capQueries': d['queries']}


def short_cushion(report):
    unique = {}
    for row in report['rows']:
        for d in row['decisions']:
            for q in d['queries']:
                c = next((c for c in q['candidates'] if c['accepted']), None)
                if c and c['straightLineTimeUntilLevel'] is not None and c['straightLineTimeUntilLevel'] < .5:
                    unique[(row['id'], d['t'], d['observer'], q['route']['r']['idx'], c['target'])] = (d, c)
    return {
        'uniquePlayTimeObserverReceiverHelperTuples': len(unique),
        'hiddenHelperJobs': dict(collections.Counter(c['actualHidden']['hiddenJob'] for d, c in unique.values())),
        'decisionReasons': dict(collections.Counter(d['reason'] for d, c in unique.values())),
    }


def main(args):
    if len(args) != 4:
        raise SystemExit(__doc__)
    names = ['before', 'poseOnly', 'primaryStem']
    reports = {}; phase_meta = {}
    for name, path in zip(names, args[:3]):
        report, raw_hash = read(path)
        reports[name] = report
        phase_meta[name] = {'path': path, 'rawSha256': raw_hash,
                            'sourceSha256': report['sourceSha256'], 'toolSha256': report['toolSha256'],
                            'sourceVersionToolSha256': report['sourceVersionToolSha256'],
                            'inputSha256': report['inputSha256'], 'profilesSha256': report['profilesSha256'],
                            'node': report['node'], 'inspectionSeconds': report['inspectionSeconds'],
                            'summary': report['summary'], 'footballAnatomy': totals(report['rows']),
                            'shortCushion': short_cushion(report),
                            'observerNeutrality': report['observerNeutrality']}
        if len(report['rows']) != 24 or len(report['observerNeutrality']) != 24:
            raise ValueError(f'{name}: expected all24 fixed inputs and controls')
        if any(not c['initial'] or not c['final'] for c in report['observerNeutrality']):
            raise ValueError(f'{name}: observer/recording changed execution')
    baseline = reports['before']; ids = [r['id'] for r in baseline['rows']]
    for name in names[1:]:
        report = reports[name]
        if [r['id'] for r in report['rows']] != ids:
            raise ValueError(f'{name}: changed panel order or inputs')
        for key in ['toolSha256', 'sourceVersionToolSha256', 'inputSha256', 'profilesSha256', 'inputs', 'inspectionSeconds']:
            if baseline[key] != report[key]:
                raise ValueError(f'{name}: mismatched {key}')
    paired = []; all_initial = True; all_pose_end = True
    for ix, before in enumerate(baseline['rows']):
        pose_only = reports['poseOnly']['rows'][ix]; final = reports['primaryStem']['rows'][ix]
        initial_equal = all(without_buffer(before['initialContext']) == without_buffer(r['initialContext']) for r in [pose_only, final])
        profile_equal = all(before['players'] == r['players'] for r in [pose_only, final])
        pose_end_equal = without_buffer(before['endpointContext']) == without_buffer(pose_only['endpointContext'])
        final_end_equal = without_buffer(before['endpointContext']) == without_buffer(final['endpointContext'])
        all_initial = all_initial and initial_equal and profile_equal
        all_pose_end = all_pose_end and pose_end_equal
        maps = {name: decision_map(reports[name]['rows'][ix]) for name in names}
        changes = []
        for key in sorted(set(maps['poseOnly']) | set(maps['primaryStem'])):
            old = maps['poseOnly'].get(key); new = maps['primaryStem'].get(key)
            old_choice = None if old is None else {'primary': old['primary'], 'chosen': old['chosen'], 'reason': old['reason']}
            new_choice = None if new is None else {'primary': new['primary'], 'chosen': new['chosen'], 'reason': new['reason']}
            if old_choice != new_choice:
                changes.append({'t': key[0], 'observer': key[1], 'slot': (new or old)['slot'],
                                'poseOnly': old_choice, 'primaryStem': new_choice})
        ba = anatomy(before); fa = anatomy(final)
        bg = ba['naturalOffenseEndAdvance']; fg = fa['naturalOffenseEndAdvance']
        paired.append({'id': before['id'], 'input': before['input'],
                       'identicalInitialFootballContextAllPhases': initial_equal,
                       'identicalPlayerProfilesAllPhases': profile_equal,
                       'poseOnlyEndpointFootballContextExact': pose_end_equal,
                       'primaryStemEndpointFootballContextExact': final_end_equal,
                       'primaryStemEndpointChangedFields': [k for k in sorted(set(before['endpointContext']) | set(final['endpointContext']))
                           if k != 'perception' and before['endpointContext'].get(k) != final['endpointContext'].get(k)],
                       'naturalOffenseAdvanceDelta': fg - bg if bg is not None and fg is not None else None,
                       'gainComparisonUnavailable': bg is None or fg is None,
                       'footballAnatomy': {name: anatomy(reports[name]['rows'][ix]) for name in names},
                       'phaseSummaries': {name: reports[name]['rows'][ix]['summary'] for name in names},
                       'changedRetainedFreshDecisionRecords': changes,
                       'addedRetainedFreshDecisions': sum(r['poseOnly'] is None for r in changes),
                       'removedRetainedFreshDecisions': sum(r['primaryStem'] is None for r in changes),
                       'matchedFreshDecisionChoiceChanges': sum(r['poseOnly'] is not None and r['primaryStem'] is not None for r in changes),
                       'initialFootballContextHashes': {name: stable_hash(without_buffer(reports[name]['rows'][ix]['initialContext'])) for name in names},
                       'endpointFootballContextHashes': {name: stable_hash(without_buffer(reports[name]['rows'][ix]['endpointContext'])) for name in names}})
    if not all_initial:
        raise ValueError('Paired initial physical/controller/RNG states or players differ')
    if not all_pose_end:
        raise ValueError('Expected pose-only ordinary control endpoint equality failed; inspect all retained rows')
    out = {'schema': 'coverage-help-three-phase-comparison-v1',
           'comparisonToolSha256': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
           'phases': phase_meta,
           'identicalInitialFootballContextAllPhases': all_initial,
           'poseOnlyEndpointFootballContextExactAll24': all_pose_end,
           'primaryStemEndpointChangedCases': sum(not r['primaryStemEndpointFootballContextExact'] for r in paired),
           'changedRetainedFreshDecisionRecords': sum(len(r['changedRetainedFreshDecisionRecords']) for r in paired),
           'addedRetainedFreshDecisions': sum(r['addedRetainedFreshDecisions'] for r in paired),
           'removedRetainedFreshDecisions': sum(r['removedRetainedFreshDecisions'] for r in paired),
           'matchedFreshDecisionChoiceChanges': sum(r['matchedFreshDecisionChoiceChanges'] for r in paired),
           'witness': {name: witness(next(r for r in reports[name]['rows'] if r['id'] == 'HELP-R2-gun_trips_11-smash-cover4-S3')) for name in names},
           'pairs': paired,
           'definitions': {
               'footballContextComparison': 'Exclude only perception ring-buffer layout. Compare full recorded body/support, controller/belief, RNG, current hand-joint state, ball, events, intents, penalties and game outcome state.',
               'naturalOffenseEndAdvance': 'Natural uncensored offense-possession endpoint x minus suppliedLOS40. A field-advance measurement, not buildResult yards or a game efficiency rate. Live censors and defensive possession have null advance.',
               'explosiveMeasurement': '20+yd natural offense field advance following a completion; all completion/live/turnover endpoints retained separately. No credit for a still-live completion.',
               'pressureFlag': 'Existing engine pressured flag copied as-is. This panel does not independently establish pressure or validate its NFL incidence.',
               'forceAccounting': 'Underlying physics unchanged. Current support loads/hand state and all body/controller/RNG states retained; this collector does not record substep force/work invariants and makes no new force-accounting claim.',
               'decisions': 'Only fresh decisions with real cap queries are retained; cached repeats or decisions with no cap queries are not counted as new fresh records. Added/removed retained records can reflect new cap queries during an unchanged decision; matched choice changes are reported separately.',
           },
           'limits': [
               'Fixed ordinary pass panel is a paired mechanics guard, not NFL-rate calibration or an unbiased league sample. Two artificial rosters/calls atLOS40, no situational playcalling.',
               'Every pair and adverse change is retained. Natural gain comparisons are unavailable when either endpoint is live-censored or defensive possession; no imputation.',
               'The6yd maximum cap distance remains unchanged. The new early-primary safeguard tests the observed own vertical stem only and does not establish a physically reliable general roof-capability model.',
               'Sampled pose and exact consumed receiver motion remain distinct from hidden current support/jobs/targets. Hidden state is diagnostic evidence only.',
               'Short-cushion counts contain repeated queries. They are not errors or independent plays; simple straight-line projection does not prove a cap physically cannot hold.',
           ]}
    output = pathlib.Path(args[3]); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(out, indent=2) + '\n')
    print(json.dumps({'output': str(output), 'comparisonToolSha256': out['comparisonToolSha256'],
                      'poseOnlyEndpointFootballContextExactAll24': all_pose_end,
                      'primaryStemEndpointChangedCases': out['primaryStemEndpointChangedCases'],
                      'changedRetainedFreshDecisionRecords': out['changedRetainedFreshDecisionRecords'],
                      'addedRetainedFreshDecisions': out['addedRetainedFreshDecisions'],
                      'removedRetainedFreshDecisions': out['removedRetainedFreshDecisions'],
                      'matchedFreshDecisionChoiceChanges': out['matchedFreshDecisionChoiceChanges'],
                      'phaseAnatomy': {name: phase_meta[name]['footballAnatomy'] for name in names}}))


if __name__ == '__main__':
    main(sys.argv[1:])
