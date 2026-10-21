#!/usr/bin/env python3
"""Compare matching tackle-timing cohorts; keep retrospective cases separate.

python3 scripts/diag/compare-tackle-timing.py BASE.json[.gz] CAND.json[.gz] OUTPUT.json
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def read(path):
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)


def pin(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(report):
    require(report['schema'] == 'tackle-timing-review-v1', 'Unsupported report schema')
    require(report['sourceBefore'] == report['sourceAfter'], 'Engine changed during measurement')
    require(len(report['primary']) == 56 and len(report['witnesses']) == 8, 'Incomplete cohort')
    rows = report['primary'] + report['witnesses']
    require(len({r['id'] for r in rows}) == 64, 'Duplicate fixture IDs')
    require([r['input'] for r in report['primary']] == report['primaryInputs'], 'Primary input mismatch')
    require([r['input'] for r in report['witnesses']] == report['witnessInputs'], 'Witness input mismatch')
    require(all(r['input']['group'] == 'primary' for r in report['primary']), 'Witness pooled into primary')
    require(all(r['input']['group'] != 'primary' for r in report['witnesses']), 'Primary pooled into witnesses')
    checks = report['observerChecks']
    require([c['id'] for c in checks] == [r['id'] for r in rows], 'Observer cohort mismatch')
    require(all(c['passed'] and c['observed'] == c['plain'] for c in checks), 'Observer changed physical state')
    require(report['recording']['recordedAndUnrecordedMatches'] == 9, 'Incomplete film recording checks')
    return rows


def pair(before, after):
    for key in ['id', 'input', 'selection', 'profile', 'profileSha256', 'speed']:
        require(before[key] == after[key], f'Matched fixture changed {key}: {before["id"]}')

    def compact(row):
        return {'firsts': row['firsts'], 'firstAttempt': row['attempts'][0] if row['attempts'] else None,
                'final': {k: row['final'][k] for k in ['elapsed', 'phase', 'outcome', 'endSpot',
                    'missedTackles', 'brokenTackles', 'draws']},
                'physicalSignature': row['signature']}

    first = None
    for old, new in zip(before['states'], after['states']):
        if pin(old) != pin(new):
            first = {'tickEnd': old['t'], 'baseline': old, 'candidate': new}
            break
    if first is None and len(before['states']) != len(after['states']):
        first = {'tickEnd': None, 'reason': 'Recorded endpoint lengths differ'}
    return {'id': before['id'], 'input': before['input'], 'profileSha256': before['profileSha256'],
            'baseline': compact(before), 'candidate': compact(after),
            'firstRetainedPhysicalDifference': first}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    baseline, candidate = read(args.baseline), read(args.candidate)
    validate(baseline)
    validate(candidate)
    for key in ['scriptSha256', 'inputSha256', 'cohortSha256', 'profilesSha256', 'definitions',
                'primaryInputs', 'witnessInputs', 'filmIds']:
        require(baseline[key] == candidate[key], f'Measurement mismatch: {key}')
    primary = [pair(b, c) for b, c in zip(baseline['primary'], candidate['primary'])]
    witnesses = [pair(b, c) for b, c in zip(baseline['witnesses'], candidate['witnesses'])]
    escape = [p for p in primary if p['input']['geometry'] == 'fasterCarrierEscape']
    output = {'schema': 'tackle-timing-comparison-v1', 'baselineSource': baseline['sourceBefore'],
        'candidateSource': candidate['sourceBefore'], 'measurementScriptSha256': baseline['scriptSha256'],
        'inputSha256': baseline['inputSha256'], 'cohortSha256': baseline['cohortSha256'],
        'profilesSha256': baseline['profilesSha256'],
        'observerChecks': {'baseline': len(baseline['observerChecks']), 'candidate': len(candidate['observerChecks'])},
        'summaries': {'baselinePrimary': baseline['primarySummary'], 'candidatePrimary': candidate['primarySummary'],
            'baselineWitnesses': baseline['witnessSummary'], 'candidateWitnesses': candidate['witnessSummary']},
        'byGeometry': {'baseline': baseline['byGeometry'], 'candidate': candidate['byGeometry']},
        'mirrorChecks': {'baseline': baseline['mirrors'], 'candidate': candidate['mirrors']},
        'escapeControls': {'cases': len(escape), 'identicalPhysicalSignatures': sum(
            p['baseline']['physicalSignature'] == p['candidate']['physicalSignature'] for p in escape)},
        'primaryPairs': primary, 'retrospectiveWitnessPairs': witnesses,
        'limits': ['56 mirrored primary rows are 28 unmirrored inputs using two roster pairs and two reused play seeds.',
            'Eight retrospective witness rows remain separate; there is no NFL tackle-rate estimate.',
            'Attempt events retain tick-start labels; first-attempt geometry is measured after that tick physics.',
            'Live at the six-second window end is censored, not an engine timeout or a missed tackle.',
            'First retained differences are sampled at 50 ms, not continuous contact-onset measurements.'],
        'provenance': {label: {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
            for label, path in [('baseline', args.baseline), ('candidate', args.candidate)]}}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'primary': len(primary), 'witnesses': len(witnesses),
        'changedPrimary': sum(p['firstRetainedPhysicalDifference'] is not None for p in primary),
        'changedFirstAttempt': sum(p['baseline']['firsts']['attempt'] != p['candidate']['firsts']['attempt'] for p in primary),
        'escapeControls': output['escapeControls']}))


if __name__ == '__main__':
    main()
