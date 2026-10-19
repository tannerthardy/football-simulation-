"""Read selected files from #141's published bundle; run zero simulations.

Usage: python reduce-evidence.py /path/to/extracted-evidence > saved-reduction.json
Extract the four paths below from evidence.tar.gz at cd5c47eb, not a new replay.
"""
import gzip
import hashlib
import json
import math
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
files = {
    'contractBase': 'out/vertical-roof/hosts/base/out/catch-opportunity-physics/contracts.json',
    'contractFinal': 'out/vertical-roof/hosts/final/out/catch-opportunity-physics/contracts.json',
    'comebackBase': 'out/flex-three-probes/hosts/base/out/catch-opportunity-physics/G1-P192-base.json.gz',
    'comebackPlant': 'out/vertical-roof/hosts/plant-aware/out/catch-opportunity-physics/G1-P192.json.gz',
}
result = {'archiveCommit': 'cd5c47eb9fb244ad4a7136b207009ce740bbb319',
          'archiveSha256': 'de56edc8ab23fa6dc4c72816c0e90344a34b0ea6313647aa2600366617a573e5',
          'inputs': {}, 'contracts': {}, 'comeback': {}}
for label, relative in files.items():
    p = root / relative
    result['inputs'][label] = {'path': relative, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    d = json.load(gzip.open(p, 'rt') if p.suffix == '.gz' else p.open())
    if label.startswith('contract'):
        cases = {}
        for case in d:
            changes = []
            for slot in ['CB_W', 'FS']:
                previous = None
                for row in case['passive']:
                    a = next(a for a in row['agents'] if a['slot'] == slot)
                    rule = a.get('rule', {})
                    key = (a.get('job'), rule.get('mode'), rule.get('judgment'))
                    if key != previous:
                        changes.append({'t': row['t'], 'slot': slot, 'job': a.get('job'), 'rule': rule})
                    previous = key
            cases[case['id']] = changes
        result['contracts'][label] = cases
    else:
        ss = next(a['i'] for a in d['agents'] if a['slot'] == 'SS')
        z = next(a['i'] for a in d['agents'] if a['slot'] == 'Z')
        rows = []
        for tick in d['ticks']:
            if not any(abs(tick['t'] - t) < 1e-8 for t in [2.7, 2.75, 2.8, 2.95, 3.1, 3.4, 3.8]):
                continue
            a = next(a for a in tick['before'] if a['i'] == ss)
            r = next(a for a in tick['before'] if a['i'] == z)
            dx, dy = a['pos']['x'] - r['pos']['x'], a['pos']['y'] - r['pos']['y']
            rows.append({'t': tick['t'], 'longitudinalLead': dx, 'lateralOffset': abs(dy), 'gap': math.hypot(dx, dy),
                         'defenderVelocity': a['vel'], 'receiverVelocity': r['vel'],
                         'request': tick['request'][ss], 'achieved': next(a for a in tick['achieved'] if a['i'] == ss)})
        reads = [r for r in d.get('reads', []) if r['a'] == ss and r['target'] == z]
        first_plant = next(({'t': r['t'], 'acquiredAt': r['t'] - r['cue']['age'],
                             'previousCue': prev['cue'], 'cue': r['cue'], 'seen': r['seen']}
                            for prev, r in zip(reads, reads[1:])
                            if r['cue']['vel']['x'] < prev['cue']['vel']['x'] - .1), None)
        result['comeback'][label] = {'source': d['source'], 'inputHash': d['inputHash'],
                                    'nativeHash': d['nativeHash'], 'horizon': d['horizon'], 'censored': d['censored'],
                                    'events': [e for e in d['events'] if e['type'] in ['throw', 'catch']],
                                    'firstAcquiredPlant': first_plant, 'rows': rows}
b, p = result['comeback']['comebackBase'], result['comeback']['comebackPlant']
assert b['inputHash'] == p['inputHash'] and b['nativeHash'] == p['nativeHash']
assert b['events'][0]['b'] == p['events'][0]['b'] == 8  # X, not comeback Z.
assert p['firstAcquiredPlant']['t'] == 2.75
assert all(p['censored'] for p in [b, p])
json.dump(result, sys.stdout, indent=2)
print()
