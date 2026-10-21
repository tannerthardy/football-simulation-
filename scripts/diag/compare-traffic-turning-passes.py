#!/usr/bin/env python3
"""Read-only matched24 native passing controls for the teammate-turn policy.

python3 scripts/diag/compare-traffic-turning-passes.py before/raw.json.gz \
    after/raw.json.gz expected_source output.json
An eight-second live endpoint remains censored, never assigned final yards.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

BASE = 'dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843'
COLLECTOR = '5a4152372b7744aa15c0f2f2f67111c59a65e3fb5b1159cc17c3ffee2fbfa94b'


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def metrics(rows):
    stats = [r['end']['stats'] for r in rows]
    times = [s['timeToThrow'] for s in stats if 'timeToThrow' in s]
    return {'inputs': len(rows), 'censored': sum(r['end']['censored'] for r in rows),
            'attempts': sum(s['attempted'] for s in stats),
            'completions': sum(s['completed'] for s in stats),
            'interceptions': sum('interceptedBy' in s for s in stats),
            'sacks': sum(s['sacked'] for s in stats),
            'meanThrowTime': sum(times)/len(times) if times else None,
            'meanThrowTimeDenominator': len(times)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('expected_source')
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    before, after = read(args.before), read(args.after)
    for report, source in [(before, BASE), (after, args.expected_source)]:
        require(report['sourceSha256'] == source, 'Source mismatch')
        require(report['toolSha256'] == COLLECTOR, 'Collector changed')
        require(len(report['rows']) == len(report['controls']) == 24, 'Population changed')
        require(all(all(c[k] for k in ('initial', 'endpoint', 'result', 'nextRng'))
                    for c in report['controls']), 'Observer changed execution/RNG')
    require(before['inputs'] == after['inputs'] and before['inputSha256'] == after['inputSha256']
            and before['inspectionSeconds'] == after['inspectionSeconds'], 'Cohort/endpoint changed')
    old = {r['id']: r for r in before['rows']}
    new = {r['id']: r for r in after['rows']}
    require(old.keys() == new.keys(), 'IDs changed')
    pairs = []
    for id_, b in old.items():
        a = new[id_]
        for key in ('initialPhysicalProjection', 'initialCalls', 'profileSha256', 'initialSignature'):
            require(b[key] == a[key], f'Initial inputs changed: {id_}/{key}')
        pairs.append({'id': id_, 'before': {'end': b['end'], 'result': b['result']},
                      'after': {'end': a['end'], 'result': a['result']},
                      'identicalEndpoint': b['endpointSignature'] == a['endpointSignature'],
                      'changedThrowFields': [k for k in ('timeToThrow', 'target', 'airYards',
                          'attempted', 'completed', 'interceptedBy', 'separation')
                          if b['end']['stats'].get(k) != a['end']['stats'].get(k)]})
    result = {'schema': 'traffic-turning-passing-comparison-v1',
              'sources': {'before': BASE, 'after': args.expected_source},
              'inputFiles': {str(p): sha(p) for p in (args.before, args.after)},
              'toolSha256': sha(__file__), 'commonInitialInputsExact': 24,
              'before': metrics(before['rows']), 'after': metrics(after['rows']),
              'pairs': pairs,
              'limitations': ['24 fixed inputs/two roster pairs are not NFL prevalence or independent roster samples.',
                  'One baseline live endpoint is censored; no final yards assigned.',
                  'Observer/plain controls verify native state/result/next RNG on these inputs.',
                  'Unchanged throw decisions do not imply unchanged defender geometry or catch outcomes.',
                  'Private QB/route information debt and pressure/throwing mechanisms remain unchanged.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ('sources', 'commonInitialInputsExact', 'before', 'after')}, indent=2))


if __name__ == '__main__':
    main()
