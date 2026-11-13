#!/usr/bin/env python3
"""Compare saved approach panels, without simulation or outcome fitting.

python3 scripts/diag/compare-approach-control.py BASELINE.json[.gz] \
    CANDIDATE.json[.gz] OUTPUT.json

Raw reports retain all commands. Compact reports retain complete fixed-film and
witness traces; other rows only support an earliest *retained* comparison.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import sys


def fail(message):
    raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def load(path):
    raw = path.read_bytes()
    decoded = gzip.decompress(raw) if path.suffix == '.gz' else raw
    value = json.loads(decoded, parse_constant=lambda x: fail(f'Nonfinite JSON constant: {x}'))
    return value, {'fileSha256': hashlib.sha256(raw).hexdigest(),
                   'decodedSha256': hashlib.sha256(decoded).hexdigest()}


def finite(value, path='report'):
    if isinstance(value, float) and not math.isfinite(value):
        fail(f'Nonfinite number at {path}')
    if isinstance(value, dict):
        for key, child in value.items():
            finite(child, f'{path}.{key}')
    elif isinstance(value, list):
        for index, child in enumerate(value):
            finite(child, f'{path}[{index}]')


def validate(panel):
    finite(panel)
    if panel.get('schema') != 'approach-control-review-v1':
        fail('Expected approach-control-review-v1')
    required = ('inputs', 'trials', 'cohortHash', 'observerChecks', 'witnessInputs',
                'witnesses', 'witnessCohortHash', 'witnessObserverChecks', 'mirrorChecks', 'resolutionChecks')
    missing = [key for key in required if key not in panel]
    if missing:
        fail(f'Missing required panel fields: {", ".join(missing)}; use the report containing all120 rows and four witnesses')
    for prefix in ('source', 'script'):
        before, after = panel.get(prefix + 'Before'), panel.get(prefix + 'After')
        if before != after or not isinstance(before, str) or not re.fullmatch('[0-9a-f]{64}', before):
            fail(f'Missing or unstable {prefix} pins')
    for row_key, input_key, hash_key, count, check_key in (
            ('trials', 'inputs', 'cohortHash', 120, 'observerChecks'),
            ('witnesses', 'witnessInputs', 'witnessCohortHash', 4, 'witnessObserverChecks')):
        rows, inputs = panel[row_key], panel[input_key]
        ids = [row['id'] for row in rows]
        if len(rows) != count or len(set(ids)) != count or len(inputs) != count:
            fail(f'Expected {count} unique {row_key}')
        if [row['input'] for row in rows] != inputs or digest(inputs) != panel[hash_key]:
            fail(f'{row_key} input identities/hash disagree')
        checks = panel[check_key]
        if not checks or len({check['id'] for check in checks}) != len(checks):
            fail(f'Missing or duplicate {check_key}')
        if any(check['id'] not in ids or check.get('passed') is not True
               or check.get('observed') != check.get('plain') for check in checks):
            fail(f'Failed {check_key}')
        if row_key == 'witnesses' and len(checks) != count:
            fail('Every retrospective witness requires observer equivalence')
        for row in rows:
            if row.get('negativeControl') != (row['input']['geometry'] == 'fasterCarrierEscape'):
                fail(f'Incorrect negative-control label: {row["id"]}')
            if row.get('firstContact') is not None:
                interval = row['firstContact']['interval']
                if len(interval) != 2 or interval[1] <= interval[0]:
                    fail(f'Invalid actual contact interval: {row["id"]}')
    for key in ('mirrorChecks', 'resolutionChecks'):
        checks = panel[key]
        if len(checks) != 60 or len({(check['a'], check['b']) for check in checks}) != 60:
            fail(f'Expected 60 unique {key}')
        ids = {row['id'] for row in panel['trials']}
        if any(check['a'] not in ids or check['b'] not in ids for check in checks):
            fail(f'Unknown row in {key}')
        indexed = {row['id']: row['input'] for row in panel['trials']}
        ignored = 'side' if key == 'mirrorChecks' else 'substeps'
        for check in checks:
            left, right = indexed[check['a']], indexed[check['b']]
            if {k: v for k, v in left.items() if k != ignored} != {k: v for k, v in right.items() if k != ignored}:
                fail(f'Mismatched physical input in {key}: {check["a"]}/{check["b"]}')
            if key == 'mirrorChecks' and (left['side'], right['side']) != (1, -1):
                fail('Mirror check must pair opposite sides')
            if key == 'resolutionChecks' and (left['substeps'], right['substeps']) != (12, 48):
                fail('Refinement check must pair native12 and refined48')


def mean(values):
    return sum(values) / len(values) if values else None


def summarize(rows):
    contacts = [row for row in rows if row['firstContact'] is not None]
    def early_fall(row, body):
        lo, hi = row['firstContact']['interval']
        return any(fall['body'] == body and lo - 1e-9 <= fall['t'] <= hi + .5 + 1e-9
                   for fall in row['falls'])
    return {'rows': len(rows), 'bodyContacts': len(contacts),
            'meanClosestYd': mean([row['closest'] for row in rows]),
            'meanContactClosingYdS': mean([row['firstContact']['contactClosing'] for row in contacts]),
            'carrierFallsDuringContactAndFollowingHalfSecond': sum(early_fall(row, 'carrier') for row in contacts),
            'defenderFallsDuringContactAndFollowingHalfSecond': sum(early_fall(row, 'defender') for row in contacts),
            'maxMomentumResidual': max((row['maxMomentumResidual'] for row in rows), default=None),
            'maxWorkResidual': max((row['maxWorkResidual'] for row in rows), default=None),
            'maxMotorWorkExcess': max((row['maxMotorWorkExcess'] for row in rows), default=None)}


def retained_frames(panel, row):
    if 'frames' in row:
        return row['frames'], 'complete'
    film = next((item for item in panel.get('fixedFilm', []) if item['id'] == row['id']), None)
    if film is not None:
        return film['frames'], 'complete-fixed-film'
    frames = list(row.get('earlyContactWindow', []))
    if row.get('firstOvercommittedApproach'):
        frames.append(row['firstOvercommittedApproach'])
    return sorted({frame['t']: frame for frame in frames}.values(), key=lambda frame: frame['t']), 'retained-windows-only'


def first_difference(before_panel, after_panel, before, after):
    bframes, bscope = retained_frames(before_panel, before)
    aframes, ascope = retained_frames(after_panel, after)
    bm, am = {frame['t']: frame for frame in bframes}, {frame['t']: frame for frame in aframes}
    times = sorted(bm.keys() & am.keys())
    complete = bscope != 'retained-windows-only' and ascope != 'retained-windows-only'
    change = next((t for t in times if bm[t]['intent'] != am[t]['intent']), None)
    physical = next((t for t in times if bm[t]['before'] != am[t]['before']), None)
    result = {'traceScope': {'baseline': bscope, 'candidate': ascope},
              'comparableIntervals': len(times), 'completeTraceComparison': complete,
              'firstDifferentPhysicalStart': physical,
              'firstChangedCommand' if complete else 'earliestRetainedChangedCommand': None}
    if change is not None:
        left, right = bm[change], am[change]
        same_body = left['before'] == right['before']
        same_seen = left.get('perceivedTarget') == right.get('perceivedTarget')
        result['firstChangedCommand' if complete else 'earliestRetainedChangedCommand'] = {
            't': change, 'samePhysicalStart': same_body, 'sameRecordedObservations': same_seen,
            'interpretation': 'different commands from the same body state and observations' if same_body and same_seen
                              else 'commands occur after body state or observations already diverged',
            'baseline': {'intent': left['intent'], 'before': left['before'], 'approach': left.get('approach')},
            'candidate': {'intent': right['intent'], 'before': right['before'], 'approach': right.get('approach')}}
    return result


def numerical_summary(panel):
    mirrors, resolutions = panel['mirrorChecks'], panel['resolutionChecks']
    return {'mirrors': {'pairs': len(mirrors),
                       'bodyContactDisagreements': sum(item['contactStateDisagreement'] for item in mirrors),
                       'worstClosestErrorYd': max(item['closestError'] for item in mirrors),
                       'worstFinalPosition': max(mirrors, key=lambda item: item['finalPositionError'])},
            'nativeVsRefined': {'pairs': len(resolutions),
                                'bodyContactDisagreements': sum(item['contactStateDisagreement'] for item in resolutions),
                                'earlyFallDisagreements': sum(item['earlyFallDisagreement'] for item in resolutions),
                                'worstClosest': max(resolutions, key=lambda item: item['closestError']),
                                'worstContactTimeDifferenceSeconds': max((item['firstContactTimeDifference'] for item in resolutions
                                                                         if item['firstContactTimeDifference'] is not None), default=None)}}


def compare(baseline, candidate):
    for panel in (baseline, candidate):
        validate(panel)
    for field in ('cohortHash', 'witnessCohortHash', 'scriptBefore', 'inputs', 'witnessInputs', 'decisionDt'):
        if baseline[field] != candidate[field]:
            fail(f'Matched panel field differs: {field}')
    before, after = ({row['id']: row for row in panel['trials']} for panel in (baseline, candidate))
    bw, aw = ({row['id']: row for row in panel['witnesses']} for panel in (baseline, candidate))
    if before.keys() != after.keys() or bw.keys() != aw.keys():
        fail('Baseline/candidate row identities differ')
    for left, right in [(before[key], after[key]) for key in before] + [(bw[key], aw[key]) for key in bw]:
        for field in ('input', 'profile', 'selection', 'durationSeconds', 'intendedCarrierSpeed', 'negativeControl'):
            if left[field] != right[field]:
                fail(f'Matched physical input differs: {left["id"]}/{field}')
    def pair_rows(left, right):
        return [{'id': key, 'input': a['input'],
                 'baselineClosestYd': a['closest'], 'candidateClosestYd': right[key]['closest'],
                 'baselineBodyContact': a['firstContact'] is not None,
                 'candidateBodyContact': right[key]['firstContact'] is not None,
                 'baselineFirstContact': a['firstContact']['interval'] if a['firstContact'] else None,
                 'candidateFirstContact': right[key]['firstContact']['interval'] if right[key]['firstContact'] else None,
                 **first_difference(baseline, candidate, a, right[key])} for key, a in left.items()]
    summaries = {}
    for name, panel in (('baseline', baseline), ('candidate', candidate)):
        rows = panel['trials']
        summaries[name] = {'all120': summarize(rows),
                           'positiveNative': summarize([row for row in rows if not row['negativeControl'] and row['input']['substeps'] == 12]),
                           'negativeNative': summarize([row for row in rows if row['negativeControl'] and row['input']['substeps'] == 12]),
                           'byGeometryNative': {geometry: summarize([row for row in rows if row['input']['geometry'] == geometry and row['input']['substeps'] == 12])
                                                for geometry in dict.fromkeys(row['input']['geometry'] for row in rows)},
                           'numerical': numerical_summary(panel)}
    negative_ids = [key for key, row in before.items() if row['negativeControl']]
    return {'schema': 'approach-control-comparison-v1',
            'scope': 'Matched mechanical pursuit/contact evidence; no tackle attempts, grips, evasion or football outcomes.',
            'baselineSource': baseline['sourceBefore'], 'candidateSource': candidate['sourceBefore'],
            'measurementScriptSha256': baseline['scriptBefore'], 'cohortHash': baseline['cohortHash'],
            'witnessCohortHash': baseline['witnessCohortHash'],
            'observerChecks': {name: {'primary': len(panel['observerChecks']), 'witness': len(panel['witnessObserverChecks'])}
                               for name, panel in (('baseline', baseline), ('candidate', candidate))},
            'summaries': summaries, 'negativeControls': {'rows': len(negative_ids),
                'identicalPhysicalAndNextRngSignatures': sum(before[key]['signature'] == after[key]['signature'] for key in negative_ids),
                'changedRows': [key for key in negative_ids if before[key]['signature'] != after[key]['signature']]},
            'primaryPairs': pair_rows(before, after),
            'retrospectiveWitnesses': {'selection': 'Selected after a baseline miss; excluded from primary metrics.',
                                      'pairs': pair_rows(bw, aw)},
            'limits': ['Body contact is distinct from tackle reach, an attempt, a missed tackle or a successful tackle.',
                       'Compact reports cannot identify the first command change outside their retained full-film traces; those comparisons are explicitly labelled earliest retained changes.',
                       'A changed command after physical/perceptual divergence is not a same-state causal controller comparison.',
                       'Contact/fall agreement does not establish full sustained-trajectory convergence.',
                       'These counts are not NFL rates or calibration targets.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    baseline, bsha = load(args.baseline)
    candidate, csha = load(args.candidate)
    result = compare(baseline, candidate)
    result['provenance'] = {'command': [sys.executable, *sys.argv],
                            'comparisonScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                            'baselineInput': {'path': str(args.baseline), **bsha},
                            'candidateInput': {'path': str(args.candidate), **csha}}
    finite(result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'primaryRows': len(result['primaryPairs']),
                      'retrospectiveWitnesses': len(result['retrospectiveWitnesses']['pairs']),
                      'baselineSource': result['baselineSource'], 'candidateSource': result['candidateSource']}))


if __name__ == '__main__':
    main()
