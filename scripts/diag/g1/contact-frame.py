#!/usr/bin/env python3
"""Inspect loaded, declared first-level across-face requests in saved G1 labs.

python3 -I scripts/diag/g1/contact-frame.py native.json --out out/g1/frame.json

Offline actual D/B geometry distinguishes an across-face request from pressure
into the blocker. The runner filter uses only saved consumed pictures. This is
the controlled +x G1 lab, not an NFL force/assignment inference. Missing data is
excluded, never filled from physicalCarrier or an old contactRequest.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path


def analyze(document):
    episodes = defaultdict(list)
    los = document['settings']['los']
    for row in document['rows']:
        if row['input']['kind'] != 'run':
            continue
        for sample in row['samples']:
            request = sample.get('contactRequest')
            if not request or abs(request['t'] - sample['t']) > 1e-8:
                continue
            data = request['data']
            before = sample['before']
            hands = before.get('hands')
            runner = sample.get('acquisition', {}).get('runner')
            velocity = data.get('workOff')
            if not (sample['active'] and (sample.get('runFit') or {}).get('kind') in ('interior', 'edge')
                    and data.get('declared') and velocity and not data.get('exitAim')
                    and runner and runner['cue'].get('carrying') is True
                    and runner['cue']['pos']['x'] > los and hands
                    and math.hypot(hands.get('normalForce') or 0, hands.get('tangentForce') or 0) > 0
                    and before['defender']['supportState'] == before['blocker']['supportState'] == 'up'):
                continue
            defender, blocker = before['defender']['position'], before['blocker']['position']
            dx, dy = blocker['x'] - defender['x'], blocker['y'] - defender['y']
            distance, speed = math.hypot(dx, dy), math.hypot(velocity['x'], velocity['y'])
            if distance <= 1e-9 or speed <= 1e-9:
                continue
            goal = data['defensiveAim']
            inward = (velocity['x'] * dx + velocity['y'] * dy) / distance
            across = abs(velocity['x'] * dy - velocity['y'] * dx) / distance
            episodes[(row['input']['seedName'], sample['defender'], sample['blocker'], sample['rep'])].append({
                't': sample['t'], 'inwardYdPerSecond': inward, 'acrossYdPerSecond': across,
                'inwardFraction': inward / speed,
                'blockerAheadOfApproach': dx * (goal['x'] - defender['x']) + dy * (goal['y'] - defender['y']) > 0,
                'achievedRelativeAwayYdPerSecond': sample['after']['relativeAwaySpeed'],
                'achievedTowardAcquiredRunnerYdPerSecond': sample['after']['towardAcquiredRunnerSpeed']})
    return [{'seedName': key[0], 'defender': key[1], 'blocker': key[2], 'rep': key[3], 'samples': value}
            for key, value in episodes.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('native')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    document = json.loads(Path(args.native).read_text())
    episodes = analyze(document)
    samples = [s for episode in episodes for s in episode['samples']]
    output = {'source': document['sourceBefore'], 'settings': document['settings'],
              'definition': 'Current loaded rep, same-tick contact request, declared acquired carrying picture past +x LOS; not a claim of physically attainable escape.',
              'episodes': episodes, 'sampleCount': len(samples),
              'inwardOver80PercentAndBlockerAhead': sum(s['inwardFraction'] > .8 and s['blockerAheadOfApproach'] for s in samples)}
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(output))
    print(json.dumps({key: output[key] for key in ('source', 'sampleCount', 'inwardOver80PercentAndBlockerAhead')}))


if __name__ == '__main__':
    main()
