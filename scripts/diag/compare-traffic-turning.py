#!/usr/bin/env python3
"""Compare a frozen turning candidate with the published cutoff-only run panel.

python3 scripts/diag/compare-traffic-turning.py candidate.json.gz source output.json
Reuses the unchanged collector/metric definitions, not its older baseline.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


COMMON = module(Path('scripts/diag/combo-attention-compare.py'), 'turning_common')
LIMITS = module(Path('scripts/diag/compare-combo-transfer.py'), 'turning_limits')
BASELINE = Path('data/reviews/physics-world/position-technique/installed-cutoff/candidate.json.gz')
BASE_SOURCE = 'dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843'
COLLECTOR = '1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('expected_source')
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    before, after = read(BASELINE), read(args.candidate)
    for report, source in [(before, BASE_SOURCE), (after, args.expected_source)]:
        require(report['schema'] == 'combo-transfer-review-v1', 'Unexpected schema')
        require(report['sourceBefore'] == report['sourceAfter'] == source, 'Source changed or pin mismatch')
        require(report['collectorSha256'] == COLLECTOR, 'Collector changed')
        require(len(report['trials']) == 160 and len(report['supplementalTrials']) == 2, 'Population changed')
        require(all(t['observerVerified'] and t['observedSignature'] == t['plainSignature']
                    for t in report['trials'] + report['supplementalTrials']), 'Observer perturbed execution')
    require(before['cohort'] == after['cohort'], 'Cohort changed')
    pairs, supplemental = [], []
    for group, destination in [('trials', pairs), ('supplementalTrials', supplemental)]:
        old = {t['id']: t for t in before[group]}
        new = {t['id']: t for t in after[group]}
        require(old.keys() == new.keys(), 'Input IDs changed')
        for id_, baseline in old.items():
            candidate = new[id_]
            for key in ('initialProjection', 'initialSha256', 'profileSha256'):
                require(baseline[key] == candidate[key], f'Initial inputs changed: {id_}/{key}')
            destination.append(COMMON.pair(baseline, candidate))
    physics = {'before': LIMITS.physics_limits(before), 'after': LIMITS.physics_limits(after)}
    for limits in physics.values():
        require(all(v <= 1e-8 for k, v in limits.items() if k != 'observedNativeTicks'),
                'Observed physical budget exceeds bound')
    output = {
        'schema': 'traffic-turning-run-comparison-v1',
        'sources': {'baseline': BASE_SOURCE, 'candidate': args.expected_source},
        'toolSha256': sha(__file__),
        'inputFiles': {str(p): sha(p) for p in (BASELINE, args.candidate)},
        'commonInitialInputsExact': 162,
        'ordinary': {'before': COMMON.metrics(before['trials']), 'after': COMMON.metrics(after['trials'])},
        'supplemental': {'before': COMMON.metrics(before['supplementalTrials']),
                         'after': COMMON.metrics(after['supplementalTrials'])},
        'observedNativeLimits': physics, 'pairs': pairs, 'supplementalPairs': supplemental,
        'adverse2YardPairs': [p for p in pairs if p['yardsDelta'] <= -2],
        'beneficial2YardPairs': [p for p in pairs if p['yardsDelta'] >= 2],
        'limitations': [
            'Balanced fixed160 inputs and2 supplements are not NFL frequencies or independent roster samples.',
            'Whole-play yards and OL falls do not prove fewer teammate collisions or correct assignments.',
            'The old collector observes RunBlocker updates, not every spacing decision or every player load.',
            'Observed native budget checks cover saved OL loads; controlled turning tests check their own World loads.',
            'Shared physics/capacity laws are unchanged; this compares a command policy, not NFL physical calibration.',
            'Natural finish and observer neutrality apply to these retained inputs only.'
        ]
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({k: output[k] for k in ('sources', 'commonInitialInputsExact', 'ordinary',
                                           'supplemental', 'observedNativeLimits')}, indent=2))
    print(json.dumps({'adverse2YardPairs': len(output['adverse2YardPairs']),
                      'beneficial2YardPairs': len(output['beneficial2YardPairs'])}))


if __name__ == '__main__':
    main()
