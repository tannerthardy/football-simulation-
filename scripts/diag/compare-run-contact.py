#!/usr/bin/env python3
"""Compare saved, source-pinned run panels; no simulation or outcome fitting.

python3 scripts/diag/compare-run-contact.py baseline-compact.json.gz \
  candidate-compact.json.gz comparison.json \
  --rejected-witness rejected-allocation-witness.json
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


def load(path):
    raw = path.read_bytes()
    decoded = gzip.decompress(raw) if path.suffix == '.gz' else raw
    report = json.loads(decoded, parse_constant=lambda value: fail(f'Nonfinite JSON constant {value}'))
    return report, hashlib.sha256(raw).hexdigest()


def finite(value, path='report'):
    if isinstance(value, float) and not math.isfinite(value):
        fail(f'Nonfinite number at {path}')
    if isinstance(value, dict):
        for key, item in value.items():
            finite(item, f'{path}.{key}')
    elif isinstance(value, list):
        for index, item in enumerate(value):
            finite(item, f'{path}[{index}]')


def pinned(report):
    finite(report)
    before, after = report.get('sourceBefore'), report.get('sourceAfter')
    if before != after or not isinstance(before, str) or not re.fullmatch('[0-9a-f]{64}', before):
        fail('Missing or mismatched engine source pins')
    if not re.fullmatch('[0-9a-f]{64}', report.get('scriptSha256', '')):
        fail('Missing measurement-script hash')


def validate_panel(report):
    pinned(report)
    if report.get('schema') not in ('run-contact-review-v1', 'run-contact-review-compact-v1'):
        fail('Unsupported run panel schema')
    rows = report['trials']
    ids = [row['id'] for row in rows]
    if len(rows) != 144 or len(set(ids)) != 144:
        fail('Expected144 unique controlled snap identities')
    checked = sum(row.get('observerVerified') is True for row in rows)
    if checked < 7 or checked != report['observerVerifiedCount'] or any(row.get('observerVerified') is False for row in rows):
        fail('Recording/observer equivalence verification is missing or failed')
    summary = report['summary']
    mean = sum(row['yards'] for row in rows) / len(rows)
    if summary['snaps'] != 144 or not math.isclose(mean, summary['meanYards'], rel_tol=0, abs_tol=1e-10):
        fail('Panel summary does not agree with its saved rows')
    if summary['stuffs'] != sum(row['yards'] <= 0 for row in rows) or summary['explosives10'] != sum(row['yards'] >= 10 for row in rows):
        fail('Stuff/explosive counts do not agree with saved credited gains')


def quantile(values, probability):
    ordered = sorted(values)
    return ordered[math.floor((len(ordered) - 1) * probability)] if ordered else None


def witness(row):
    contact = row['firstContact']
    samples = [sample for sample in row.get('contactWindow', [])
               if contact and sample['t'] >= contact['t'] + .049 and sample['afterPhysics']]
    if not samples:
        fail('Requested witness needs its retained native contact window')
    sample = samples[0]
    support = sample['afterPhysics']['support']
    return {'id': row['id'], 'gain': row['yards'], 'outcome': row['outcome'], 'firstContact': contact,
            'followingTickStart': sample['t'], 'followingTickEnd': sample['tickEnd'],
            'followingCaptureDeviationYd': math.hypot(support['xi']['x'], support['xi']['y']),
            'followingSupportState': support['state'], 'falls': row['carrierFalls']}


def compare(baseline, candidate, witness_id, rejected=None):
    for panel in (baseline, candidate):
        validate_panel(panel)
    if baseline['cohort'] != candidate['cohort'] or baseline['scriptSha256'] != candidate['scriptSha256']:
        fail('Baseline/candidate cohort or measurement-script hash differs')
    before = {row['id']: row for row in baseline['trials']}
    after = {row['id']: row for row in candidate['trials']}
    if before.keys() != after.keys():
        fail('Baseline/candidate144 snap identities differ')
    if [cell['run'] for cell in baseline['byConcept']] != [cell['run'] for cell in candidate['byConcept']]:
        fail('Concept summaries differ in identity or order')
    if witness_id not in before:
        fail('Requested diagnostic witness is absent')
    pairs = []
    for key, left in before.items():
        right = after[key]
        if any(left[field] != right[field] for field in ('run', 'roster', 'front', 'flip', 'seed')):
            fail(f'Matched input fields differ for {key}')
        pairs.append({'id': key, **{field: left[field] for field in ('run', 'roster', 'front', 'flip', 'seed')},
                      'baselineGain': left['yards'], 'candidateGain': right['yards'], 'gainDelta': right['yards'] - left['yards'],
                      'baselineBeforeContact': left['firstContact'], 'candidateBeforeContact': right['firstContact'],
                      'baselineAfterContact': left['yardsAfterFirstContact'], 'candidateAfterContact': right['yardsAfterFirstContact'],
                      'beforeContactIdentical': left['firstContact'] == right['firstContact'],
                      'baselineFinish': left['finishCause'], 'candidateFinish': right['finishCause'],
                      'baselineFalls': left['carrierFalls'], 'candidateFalls': right['carrierFalls'],
                      'baselineBroken': left['brokenHolds'], 'candidateBroken': right['brokenHolds']})
    diagnostic = {'baseline': witness(before[witness_id]), 'candidate': witness(after[witness_id])}
    if rejected:
        pinned(rejected)
        if rejected['trial']['id'] != witness_id or rejected['cohort'] != baseline['cohort']:
            fail('Rejected witness does not describe the same controlled input/cohort')
        diagnostic.update(rejected=witness(rejected['trial']), rejectedSource=rejected['sourceBefore'])
    return {'schema': 'run-contact-comparison-v1', 'status': 'Paired controlled regression evidence; not NFL calibration',
            'baselineSource': baseline['sourceBefore'], 'candidateSource': candidate['sourceBefore'],
            'scriptSha256': baseline['scriptSha256'], 'identicalCohort': True, 'identicalScript': True,
            'observerChecks': {'baseline': baseline['observerVerifiedCount'], 'candidate': candidate['observerVerifiedCount']},
            'cohort': baseline['cohort'], 'baseline': baseline['summary'], 'candidate': candidate['summary'],
            'afterContactQuantiles': {name: {str(q): quantile([row['yardsAfterFirstContact'] for row in panel['trials']
                                                             if row['yardsAfterFirstContact'] is not None], q)
                                               for q in (.1, .5, .75, .9, .95)}
                                     for name, panel in (('baseline', baseline), ('candidate', candidate))},
            'weakReachWitness': diagnostic,
            'byConcept': [{'run': left['run'], 'baseline': left, 'candidate': right}
                          for left, right in zip(baseline['byConcept'], candidate['byConcept'])],
            'pairedRows': pairs,
            'limits': baseline['limitations'] + [
                'Shared recovery allocation also changes ordinary blocking/contact; outcomes are not exclusively effects of the runner held-support motor.',
                'These small controlled counts and gain changes are neither calibrated NFL rates nor proof of improved football realism.',
                'The13th film input is a labelled diagnostic selected after a rejected prototype failed; the original12 inputs were chosen before outcomes.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--rejected-witness', type=Path)
    parser.add_argument('--witness-id', default='RC-R3-counter-under-L-S3')
    args = parser.parse_args()
    baseline, bsha = load(args.baseline)
    candidate, csha = load(args.candidate)
    rejected, rsha = load(args.rejected_witness) if args.rejected_witness else (None, None)
    result = compare(baseline, candidate, args.witness_id, rejected)
    result['provenance'] = {'command': [sys.executable, *sys.argv],
                            'comparisonScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                            'baselineFileSha256': bsha, 'candidateFileSha256': csha, 'rejectedWitnessFileSha256': rsha}
    finite(result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'snaps': len(result['pairedRows']),
                      'baselineSource': result['baselineSource'], 'candidateSource': result['candidateSource'],
                      'stuffs': [result['baseline']['stuffs'], result['candidate']['stuffs']],
                      'observerChecks': result['observerChecks']}))


if __name__ == '__main__':
    main()
