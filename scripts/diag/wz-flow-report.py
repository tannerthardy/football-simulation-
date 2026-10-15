"""Compare short native wide-zone captures, without new simulation steps.

Decode portable captures with wz-flow-evidence.py first. Forces include either
player's transmitted hand load; they do not certify offensive control or wins.
"""
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('opening', Path(__file__).with_name('wz-execution-report.py'))
opening = importlib.util.module_from_spec(spec)
spec.loader.exec_module(opening)


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--fresh-before', type=Path)
    parser.add_argument('--fresh-candidate', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    assert bool(args.fresh_before) == bool(args.fresh_candidate)
    pairs = [('original', args.before, args.candidate)]
    if args.fresh_before:
        pairs.append(('fresh', args.fresh_before, args.fresh_candidate))
    result, timeline = {'protocol': 'wide-zone-flow-report-v1', 'pairs': []}, []
    for label, before_path, candidate_path in pairs:
        before, candidate = read(before_path), read(candidate_path)
        assert before['flags'] == candidate['flags'] and before['worldDefaults'] == candidate['worldDefaults']
        assert before['from'] == candidate['from'] == 0 and before['stop'] == candidate['stop'] == 3
        assert not before['diagnosticBypass'] and not candidate['diagnosticBypass']
        assert [c['input'] for c in before['panel']] == [c['input'] for c in candidate['panel']]
        pair = {'label': label, 'captures': [], 'cases': []}
        for arm, path, cap in [('before', before_path, before), ('candidate', candidate_path, candidate)]:
            pair['captures'].append({'arm': arm, 'path': str(path.resolve()),
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'revision': cap['revision'], 'runtime': cap['sourceSha256'],
                'elapsedSeconds': cap['elapsedSeconds'], 'newWorldSteps': cap['newWorldSteps']})
        for old, new in zip(before['panel'], candidate['panel']):
            assert old['restoredFromSnap'] and new['restoredFromSnap'] and not old['actions'] and not new['actions']
            for a, b in zip(old['actors'], new['actors']):
                for key in ['idx', 'slot', 'team', 'player', 'profile', 'initialBody']:
                    assert a[key] == b[key], (old['input']['id'], a['slot'], key)
            assert old['initializedInformation'] == new['initializedInformation']
            case = {'input': old['input'], 'arms': {}}
            for arm, cap in [('before', old), ('candidate', new)]:
                rows = opening.opening_rows(arm, cap)
                timeline += rows
                hits = [{'entry': f['t'], **contact} for f in cap['frames'] for contact in f['report']['contacts']
                    if contact['impulse'] > 1e-8 and cap['actors'][contact['i']]['team'] == cap['actors'][contact['j']]['team']]
                case['arms'][arm] = {'end': cap['end'], 'censored': cap['censored'], 'handoffAt': cap['handoffAt'],
                    'slotsAt2': opening.summarize([r for r in rows if r['after'] <= 2]),
                    'slotsFull': opening.summarize(rows), 'handLoadsByOpponent': opening.hand_loads(cap),
                    'teammateImpacts': hits}
            pair['cases'].append(case)
        result['pairs'].append(pair)
    args.out.mkdir(parents=True, exist_ok=True)
    with gzip.open(args.out / 'timeline.csv.gz', 'wt', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(timeline[0]))
        writer.writeheader(); writer.writerows(timeline)
    result.update({'newWorldSteps': 0, 'timelineRows': len(timeline), 'elapsedSeconds': time.perf_counter()-started,
        'measurementScriptSha256': hashlib.sha256(Path(opening.__file__).read_bytes()).hexdigest(),
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    (args.out / 'summary.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['newWorldSteps', 'timelineRows', 'elapsedSeconds']}))


if __name__ == '__main__':
    main()
