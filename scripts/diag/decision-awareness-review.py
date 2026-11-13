#!/usr/bin/env python3
"""Compare two saved native decision-awareness panels without simulation.

python3 scripts/diag/decision-awareness-review.py before.json.gz after.json.gz output.json
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def read(path):
    raw = Path(path).read_bytes()
    packet = json.loads(gzip.decompress(raw))
    assert packet['schema'] == 'decision-awareness-native-v1'
    assert packet['sourceBefore'] == packet['sourceAfter']
    assert packet['summary']['observerVerified'] == len(packet['rows']) == 96
    assert all(row['observerVerified'] for row in packet['rows'])
    return packet, hashlib.sha256(raw).hexdigest()


def compare(before_path, after_path):
    before, before_sha = read(before_path)
    after, after_sha = read(after_path)
    matching = ['toolSha256', 'cohort', 'rostersSha256', 'sharedWorldSha256']
    for key in matching:
        assert before[key] == after[key], f'Mismatched {key}'
    assert [r['id'] for r in before['rows']] == [r['id'] for r in after['rows']]
    fields = ['offenseYards', 'outcome', 'duration', 'stats', 'penalty', 'qbReport', 'executionSha256']
    pairs = []
    for old, new in zip(before['rows'], after['rows']):
        assert old['profilesSha256'] == new['profilesSha256'], old['id']
        first = next((a['t'] for a, b in zip(old['samples'], new['samples'])
                      if a['qb']['belief'] != b['qb']['belief']), None)
        pairs.append({'id': old['id'], 'unchangedExecution': old['executionSha256'] == new['executionSha256'],
                      'firstDifferentQBBeliefAt': first,
                      'offenseYardsDelta': new['offenseYards'] - old['offenseYards'],
                      'before': {k: old.get(k) for k in fields},
                      'after': {k: new.get(k) for k in fields}})
    return {'schema': 'decision-awareness-passing-comparison-v1',
            'beforeSource': before['sourceBefore'], 'afterSource': after['sourceBefore'],
            'matched': matching + ['all case IDs', 'all initial player/profile hashes'],
            'inputs': [{'path': str(before_path), 'sha256': before_sha},
                       {'path': str(after_path), 'sha256': after_sha}],
            'toolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'definitions': {
                'execution': 'Complete result excluding optional recording plus final bodies/intents/minds/RNG state. QB belief samples are separate observational state.',
                'lowerOffenseYards': 'Direction of gain change, not a physics or football quality judgment.',
                'sample': 'Balanced diagnostic calls, not selected NFL calls or league-rate estimates.',
                'firstDifferentQBBeliefAt': 'First unequal belief in the common paired tick prefix; later divergent play lengths are not paired observations.',
            },
            'summary': {'before': before['summary'], 'after': after['summary'],
                        'identicalCompleteExecutions': sum(p['unchangedExecution'] for p in pairs),
                        'changedBeliefs': sum(p['firstDifferentQBBeliefAt'] is not None for p in pairs),
                        'lowerOffenseYards': sum(p['offenseYardsDelta'] < 0 for p in pairs),
                        'changedQBReports': sum(a['qbReport'] != b['qbReport'] for a, b in zip(before['rows'], after['rows'])),
                        'correctPostLabels': sum(bool(r['qbReport'] and r['qbReport'].get('post') == r['qbReport']['actual']) for r in after['rows'])},
            'pairs': pairs}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before')
    parser.add_argument('after')
    parser.add_argument('output')
    args = parser.parse_args()
    result = compare(args.before, args.after)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result['summary'][k] for k in ['identicalCompleteExecutions', 'changedBeliefs', 'lowerOffenseYards', 'changedQBReports', 'correctPostLabels']}))
