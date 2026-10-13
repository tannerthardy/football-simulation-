"""Reduce matched native contact arms, preserving live/censored observations."""
import argparse
import hashlib
import json
from pathlib import Path


def load(path):
    return json.loads(Path(path).read_text())


def samples(row):
    errors = []
    for frame in row['frames']:
        for event in frame.get('contactEvents', []):
            if event['phase'] == 'movement' and event['stretch'] and not event['anchored']:
                velocity, tangent = event['preAnchor'], event['lat']
                errors.append(abs(velocity['x'] * tangent['x'] + velocity['y'] * tangent['y'] - event['lateral']))
    return errors


def approach(row):
    crossing = None
    for frame in row['frames']:
        actor = next((a for a in frame['agents'] if a['id'] == frame.get('carrier') and a['slot'] == 'RB'), None)
        if actor and actor['pos']['x'] >= 40:
            crossing = frame['after']
            break
    # Actual carrier torso contacts and acquired grips; not proximity, a
    # block engagement, or a presumed physical result from a requested action.
    touches = [e['t'] for e in row['events'] if e['type'] == 'carrier_contact']
    first = min(touches, default=None)
    # The exact same-step ordering cannot be reconstructed from tick frames.
    if crossing is not None:
        state = 'clean' if first is None or first > crossing else 'same-step-uncertain' if first >= crossing - .05 - 1e-8 else 'interrupted'
    else:
        state = 'live-unreached' if row['live'] else 'ended-unreached'
    return {'crossingBoundary': crossing, 'firstActualContact': first, 'state': state}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', default='out/coupled-run-contact')
    args = parser.parse_args()
    root = Path(args.directory)
    index = load(root / 'panel-index.json')
    assert len(index['arms']) == 8 and all(a['exitCode'] == 0 for a in index['arms'])
    base = load(root / 'default.json')
    frozen = load('docs/reviews/coupled-run-contact-baseline.json')
    baseline = {r['input']['id']: r for r in base['panel']}
    assert len(baseline) == 60
    assert base['inputs'] == frozen['inputs'] and base['stop'] == frozen['stop']
    assert {key: hashlib.sha256('\n'.join(row['hashes']).encode()).hexdigest()
            for key, row in baseline.items()} == frozen['historySha256']
    reference_profiles = [[p['profile'] for p in r['players']] for r in base['panel']]
    receipt = {'protocol': 'coupled-run-contact-summary-v1', 'baselineCommit': frozen['commit'],
               'candidateSourceSha256': base['provenance']['sourceSha256'],
               'collectorSha256': base['provenance']['probeSha256'],
               'reducerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'inputs': index['inputSha256'], 'defaultHistoryParity': '60/60 exact through 3.5 s',
               'limitations': ['Previously inspected generated controls, not a blind NFL holdout.',
                              'Live rows are right-censored; their gain is a window spot, not a completed outcome.',
                              'Contact frame crossing is tick-bounded; same-step contact/crossing remains uncertain.',
                              'Center hand angular defect and patch promotion failures remain; capacities unchanged.'],
               'arms': []}
    for arm in index['arms']:
        data = base if arm['name'] == 'default' else load(arm['output'])
        run = load(arm['receipt'])
        assert run['exitCode'] == 0 and run['inputsUnchanged']
        assert data['provenance']['sourceSha256'] == base['provenance']['sourceSha256']
        assert data['provenance']['probeSha256'] == base['provenance']['probeSha256']
        assert data['inputs'] == base['inputs']
        assert [[p['profile'] for p in r['players']] for r in data['panel']] == reference_profiles
        pairs, errors = [], []
        for row in data['panel']:
            old = baseline[row['input']['id']]
            assert row['observerNeutral'] and row['initial'] == old['initial']
            errors.extend(samples(row))
            first = next((i for i, (a, b) in enumerate(zip(old['hashes'], row['hashes'])) if a != b), None)
            if first is None and len(old['hashes']) != len(row['hashes']):
                first = min(len(old['hashes']), len(row['hashes']))
            cues = sorted({a['slot'] for f in row['frames'] for a in f['agents'] if 'fit-pull-runner-cue' in a['tags']})
            pairs.append({'id': row['input']['id'], 'kind': row['input']['kind'], 'sameHistory': first is None,
                          'firstChangedBoundary': None if first is None else round((first + 1) * .05, 6),
                          'baselineLive': old['live'], 'candidateLive': row['live'],
                          'baselineSpotOrGain': old['gain'], 'candidateSpotOrGain': row['gain'],
                          'completedGainDelta': None if old['live'] or row['live'] else row['gain'] - old['gain'],
                          'baselineApproach': approach(old), 'candidateApproach': approach(row),
                          'handoverCueSeats': cues})
        receipt['arms'].append({'name': arm['name'], 'flags': run['flags'],
                               'unchanged': sum(p['sameHistory'] for p in pairs),
                               'ended': sum(not p['candidateLive'] for p in pairs),
                               'live': sum(p['candidateLive'] for p in pairs),
                               'stretchNonanchorRequests': len(errors),
                               'meanShoulderComponentError': sum(errors) / len(errors) if errors else None,
                               'maxShoulderComponentError': max(errors, default=None), 'pairs': pairs})
    motor = next(a for a in receipt['arms'] if a['name'] == 'motor')
    assert motor['unchanged'] == 60, 'Motor without controller requests must leave native history exact'
    destination = root / 'summary.json'
    destination.write_text(json.dumps(receipt, indent=2) + '\n')
    print(f'Saved {destination}; all arms match inputs/profiles and observer/plain history.')
    for arm in receipt['arms']:
        print(f"{arm['name']}: {arm['unchanged']}/60 exact; {arm['ended']} ended / {arm['live']} live; shoulder error {arm['meanShoulderComponentError']:.6g}")


if __name__ == '__main__':
    main()
