"""Reproduce approach-candidate comparisons from recorded native evidence.

Contact is the first opposing carrier body contact/hit/wrap since possession,
including contact before commitment. Arrival uses the frozen committed point.
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys


def load(path):
    return json.loads(Path(path).read_text())['panel']


def measure(p):
    rb = next(a['id'] for a in p['players'] if a['slot'] == 'RB')
    teams = {a['id']: a['team'] for a in p['players']}
    events = [e for e in p['events'] if
              (e['type'] == 'carrier_contact' and e.get('a') == rb and teams.get(e.get('b')) == 'D') or
              (e['type'] in ['hit', 'tackle_wrap'] and e.get('b') == rb and teams.get(e.get('a')) == 'D')]
    contact = events[0] if events else None
    pos = next((q['pos'] for q in p['path'] if contact and q['t'] > contact['t'] + 1e-9), None)
    d = p['decision']
    arrival = next((q['t'] for q in p['path'] if d and q['t'] > d['t'] and q.get('carrier') == rb
                    and math.hypot(q['pos']['x'] - d['entry']['x'], q['pos']['y'] - d['entry']['y']) <= .65), None)
    crossing = next((q['t'] for q in p['path'] if q.get('carrier') == rb and q['pos']['x'] >= 40), None)
    risk = d['risks'][d['answer']] if d else None
    safe = arrival is not None and (not contact or arrival <= contact['t'])
    return {'gain': p['gain'], 'censored': p['censored'], 'answer': d['answer'] if d else None,
            'decisionAt': d['t'] if d else None, 'entry': d['entry'] if d else None, 'risk': risk,
            'arrivalAt': arrival, 'safeArrival': safe, 'firstContactAt': contact['t'] if contact else None,
            'firstContactDepth': pos['x'] - 40 if pos else None,
            'firstContactDefender': (contact.get('b') if contact['type'] == 'carrier_contact' else contact.get('a')) if contact else None,
            'crossedLOSClean': crossing is not None and (not contact or crossing <= contact['t']),
            'scoredSafe': risk is not None and risk < .6,
            'falseClean': risk is not None and risk < .6 and not safe}


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/run-read-approach')
    output = Path(sys.argv[2] if len(sys.argv) > 2 else 'data/reviews/run-read-approach/summary.json')
    oldroot = Path('out/run-read-information')
    result = {'baseline': '9e752b76e6053400f086cbcec7613c6ab1663e86',
              'candidate': 'RUN_READ=1 RUN_READ_TURN=1; parked, both default-off',
              'arrivalRadius': .65, 'stop': 8, 'contactScope': 'first opposing carrier contact since possession',
              'yardageThreshold': .5, 'sets': {}}
    baseline_on = load(oldroot / 'current-on.json')
    baseline_off = load(oldroot / 'current-off.json')
    for name, old_path, after_path, off_path, after_off_path in [
        ('ordinary', oldroot / 'current-on.json', root / 'ordinary-after-on.json', oldroot / 'current-off.json', root / 'ordinary-after-off.json'),
        ('fresh', root / 'fresh-before-on.json', root / 'fresh-after-on.json', root / 'fresh-before-off.json', root / 'fresh-after-off.json')]:
        old, after, off, after_off = map(load, [old_path, after_path, off_path, after_off_path])
        assert len(old) == len(after) == len(off) == len(after_off)
        rows = []
        for a, b, c, d in zip(old, after, off, after_off):
            assert a['input'] == b['input'] == c['input'] == d['input']
            assert c['hashes'] == d['hashes'], 'Read-off execution changed'
            assert b['observerNeutral'] and d['observerNeutral']
            rows.append({'input': a['input'], 'before': measure(a), 'candidate': measure(b),
                         'readOffGain': c['gain'], 'readOffCensored': c['censored'], 'delta': b['gain'] - a['gain']})
        summary = {'n': len(rows), 'gainBefore': statistics.mean(p['gain'] for p in old),
                   'gainCandidate': statistics.mean(p['gain'] for p in after), 'gainReadOff': statistics.mean(p['gain'] for p in off),
                   'improved': sum(r['delta'] >= .5 for r in rows), 'regressed': sum(r['delta'] <= -.5 for r in rows),
                   'offExactParity': len(off), 'candidateObserverNeutral': len(after)}
        for label, data in [('before', old), ('candidate', after)]:
            ms = [measure(p) for p in data]
            summary[label] = {'safeArrivals': sum(m['safeArrival'] for m in ms), 'scoredSafe': sum(m['scoredSafe'] for m in ms),
                              'falseClean': sum(m['falseClean'] for m in ms), 'cleanLOSCrossings': sum(m['crossedLOSClean'] for m in ms),
                              'censored': sum(m['censored'] for m in ms)}
        result['sets'][name] = {'summary': summary, 'rows': rows}
    original_summary = json.loads(Path('data/reviews/run-read-information/summary.json').read_text())
    corridors = [r for r in original_summary['rows'] if r['delta'] <= -.5 and r['primary'] == 'missing blocked corridor']
    result['corridorBacktrace'] = []
    for row in corridors:
        on = next(p for p in baseline_on if p['input'] == row['input'])
        off = next(p for p in baseline_off if p['input'] == row['input'])
        first_difference = next((round(a['t'] - .05, 2) for a, b in zip(on['path'], off['path']) if a['command'] != b['command']), None)
        first_low_risk = next((e for e in on['observations'] if e['phase'] == 'read' and e['canCommit'] and any(v < .6 for v in e['risks'].values())), None)
        result['corridorBacktrace'].append({'input': row['input'], 'decisionAt': on['decision']['t'],
            'firstCommandDifferenceAt': first_difference, 'firstLowRiskAt': first_low_risk['t'] if first_low_risk else None,
            'firstLowRisks': first_low_risk['risks'] if first_low_risk else None, 'measured': measure(on)})
    result['retainedKeyTakeovers'] = []
    for row in original_summary['rows']:
        if row['delta'] > -.5 or not row.get('heldThroughLateralDLTakeover'):
            continue
        p = next(p for p in baseline_on if p['input'] == row['input'])
        roles = {a['id']: a['slot'] for a in p['players']}
        reads = [e for e in p['observations'] if e['phase'] == 'read' and e['t'] <= p['decision']['t']]
        takeover = next(e for e in reads if e['physicalKey'] is not None and e['physicalKey'] != e['key']
                        and roles[e['physicalKey']].startswith('D') and e['keyBody']['pos']['x'] - 40 < 2)
        def snapshot(e):
            q = next((q for q in p['path'] if q['t'] == e['t']), p['path'][0])
            floor = max((a['pos']['y'] - 80 / 3) * e['side'] for a in q['surface'] if roles[a['id']] in ['LT', 'LG', 'C', 'RG', 'RT']) - .6
            return {'t': e['t'], 'held': roles[e['key']], 'physicalFirst': roles.get(e['physicalKey']),
                    'consumedCandidate': roles.get(e['candidateKey']), 'heldLatitude': (e['keyBody']['pos']['y'] - 80 / 3) * e['side'],
                    'floor': floor, 'heldVelocity': e['keyBody']['vel']}
        result['retainedKeyTakeovers'].append({'input': row['input'], 'acquisition': snapshot(reads[0]), 'takeover': snapshot(takeover)})
    # Ensure parking preserves both the failing witness and successful control,
    # and that the explicit flag exactly reproduces the tested candidate.
    for flag_file, reference in [('flag-default-check.json', baseline_on), ('flag-candidate-check.json', load(root / 'ordinary-after-on.json'))]:
        for p in load(root / flag_file):
            match = next(q for q in reference if q['input'] == p['input'])
            assert p['hashes'] == match['hashes'], 'Parked flag changed the tested behavior'
    old_control = next(p for p in baseline_on if p['input']['id'] == 'oz_strong s3 41/42 over')
    new_control = next(p for p in load(root / 'ordinary-after-on.json') if p['input'] == old_control['input'])
    assert old_control['path'] == new_control['path'] and old_control['events'] == new_control['events']
    result['successfulControlExactMotionAndEvents'] = True
    result['receipts'] = {}
    for path in sorted(root.glob('*.json')):
        raw = path.read_bytes()
        result['receipts'][str(path)] = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + '\n')
    (output.parent / 'input-manifest.json').write_text(json.dumps({'ordinaryManifest': '../run-read-information/input-manifest.json',
        'freshInputs': json.loads((root / 'fresh-inputs.json').read_text()),
        'freshPredeclaredSHA256': hashlib.sha256((root / 'fresh-inputs.json').read_bytes()).hexdigest()}, indent=2) + '\n')
    print(json.dumps({k: v['summary'] for k, v in result['sets'].items()}, indent=2))


if __name__ == '__main__':
    main()
