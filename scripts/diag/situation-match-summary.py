#!/usr/bin/env python3
"""Read the bounded pilot's saved outputs; no new data collection or simulation.

python3 -I scripts/diag/situation-match-summary.py out/situation-pilot
Group membership is fixed at the snap. Missing samples never become zeros.
"""
import json
import math
import statistics
import sys
from pathlib import Path


def valid(pos):
    return pos is not None and len(pos) == 2 and all(isinstance(x, (float, int)) and math.isfinite(x) for x in pos)


def groups(snap, ball_y):
    # Box and central line windows from scripts/mechanics/metrics.py;
    # second level from scripts/diag/trench/run-sequence.py. Geometry, not duties.
    d = {i: v for i, v in snap.items() if v['side'] == 'D' and valid(v['pos'])}
    return {
        'box': [i for i, v in d.items() if -.5 <= v['pos'][0] <= 7 and abs(v['pos'][1] - ball_y) <= 6.5],
        'centralLine': [i for i, v in d.items() if -.5 <= v['pos'][0] <= 2 and abs(v['pos'][1] - ball_y) <= 4.5],
        'secondLevel': [i for i, v in d.items() if 2 < v['pos'][0] <= 7 and abs(v['pos'][1] - ball_y) <= 6.5],
        'ol': [i for i, v in snap.items() if v['side'] == 'O' and v['position'] in {'C', 'G', 'T', 'LG', 'RG', 'LT', 'RT'}],
    }


def measure(snap, phases, ball_y):
    fixed = groups(snap, ball_y)
    result = {'groupIds': fixed, 'counts': {g: len(ids) for g, ids in fixed.items()},
              'snap': {}, 'phases': {}}
    for position in ('RB', 'TE'):
        result['snap'][position] = [{'id': i, 'position': a['pos'], 'lateralFromBall': a['pos'][1] - ball_y}
                                   for i, a in snap.items() if a['side'] == 'O' and a['position'] == position and valid(a['pos'])]
    for t, phase in phases.items():
        result['phases'][t] = {}
        for group, ids in fixed.items():
            known = [i for i in ids if phase is not None and i in phase and valid(phase[i]['pos']) and valid(snap[i]['pos'])]
            velocity_known = [i for i in known if valid(phase[i]['vel'])]
            complete = bool(ids) and len(known) == len(ids)
            values = {'expected': len(ids), 'observed': len(known), 'velocityObserved': len(velocity_known),
                      'meanAbsoluteLateralDisplacement': None, 'meanSignedLateralDisplacement': None,
                      'meanDepth': None, 'meanAbsoluteLateralSpeed': None}
            if complete:
                dy = [phase[i]['pos'][1] - snap[i]['pos'][1] for i in ids]
                values.update(meanAbsoluteLateralDisplacement=statistics.mean(map(abs, dy)),
                              meanSignedLateralDisplacement=statistics.mean(dy),
                              meanDepth=statistics.mean(phase[i]['pos'][0] for i in ids))
            if ids and len(velocity_known) == len(ids):
                values['meanAbsoluteLateralSpeed'] = statistics.mean(abs(phase[i]['vel'][1]) for i in ids)
            result['phases'][t][group] = values
    return result


def nfl_metrics(play):
    def actors(phase):
        if phase is None:
            return None
        return {a['nflId']: {'side': a['side'], 'position': a['position'],
                            'pos': phase['actors'][a['nflId']]['position'],
                            'vel': phase['actors'][a['nflId']]['velocity']} for a in play['actors']}
    snap = actors(play['phases']['snap'])
    phases = {str(t): actors(play['phases'][name]) for t, name in
              ((.5, 'snapPlus0p5'), (1, 'snapPlus1p0'), (2, 'snapPlus2p0'))}
    return {'id': f"{play['gameId']}-{play['playId']}", 'source': 'NFL',
            **measure(snap, phases, play['ballAtSnap'][1]),
            'ending': play['ending'], 'officialYards': play['officialYards'],
            'handoffSeconds': play['phases']['handoff']['seconds'] if play['phases']['handoff'] else None,
            'firstLOSSeconds': play['phases']['firstLOS']['seconds'] if play['phases']['firstLOS'] else None,
            'firstContactSeconds': play['phases']['firstContact']['seconds'] if play['phases']['firstContact'] else None}


def native_metrics(row):
    def actors(phase):
        if phase is None or not phase['live']:
            return None
        listed = {'LT': 'T', 'RT': 'T', 'LG': 'G', 'RG': 'G', 'C': 'C', 'Y': 'TE'}
        return {a['id']: {**a, 'position': listed.get(a['slot'], a['position'])} for a in phase['actors']}
    snap = actors(row['phases']['0'])
    phases = {str(t): actors(row['phases'].get(str(t))) for t in (.5, 1, 2)}
    return {'id': row['case']['id'], 'source': 'sim', 'run': row['run'], 'seed': row['seed'],
            **measure(snap, phases, row['case']['ballY']),
            'ending': row['result']['outcome'], 'yards': row['result']['yards'],
            'handoffSeconds': next((e['t'] for e in row['result']['events'] if e['type'] == 'handoff'), None),
            'nativeFirstCarrierCollisionYards': row['result']['stats'].get('yardsBeforeContact')}


def main():
    directory = Path(sys.argv[1])
    nfl = json.loads((directory / 'nfl.json').read_text())
    native = json.loads((directory / 'native.json').read_text())
    output = {'schema': 'bounded-situation-comparison-v1',
              'definitions': {
                  'groups': 'Fixed snap IDs; centralLine/box from mechanics/metrics.py; secondLevel from run-sequence.py. Alignment windows are not roster groups or installed duties.',
                  'phases': 'Exact .5/1/2s. A missing/ended phase or partially observed group is unavailable, not zero. NFL uses only original stored samples. Native uses passive body snapshots after tick at stated time.',
                  'velocity': 'NFL stored s/dir; sim instantaneous achieved body velocity. Provider smoothing unknown; not equivalent acceleration estimates.',
                  'direction': 'Absolute lateral movement avoids inventing the called run side; signed values/IDs remain for inspection. More lateral movement alone is not a better decision.',
                  'contact': 'NFL annotated first_contact and native first carrier-body collision are different operators; no shared grip/contact causal grade.',
                  'weighting': 'Separate plays and execution draws, no pooled NFL-versus-sim population rate or confidence interval.'},
              'nfl': [nfl_metrics(p) for p in nfl['plays'] if p['status'] == 'analyzed'],
              'sim': [native_metrics(r) for r in native['rows']]}
    (directory / 'comparison.json').write_text(json.dumps(output, indent=1, allow_nan=False) + '\n')
    for r in output['nfl'] + output['sim']:
        print(r['source'], r['id'], r.get('run', ''), r.get('seed', ''), r['counts'],
              'secondLevelAbsDy@1s', r['phases']['1']['secondLevel']['meanAbsoluteLateralDisplacement'])


if __name__ == '__main__':
    main()
