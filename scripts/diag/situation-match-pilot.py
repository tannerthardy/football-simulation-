#!/usr/bin/env python3
"""Qualify one G2 situation, not an NFL replay framework.

python3 -I scripts/diag/situation-match-pilot.py --nfl-dir DIR --out-dir out/situation-pilot [--extract]
Reuses the frozen metadata and same-identity run-sequence operators. No download.
The native-input file is an explicit allowlist of pre-snap setup values.
"""
import argparse
import importlib.util
import json
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


BENCH = module('situation_bench', ROOT / 'scripts/data/run_concept_situation_benchmark.py')
SEQ = module('situation_sequence', ROOT / 'scripts/diag/trench/run-sequence.py')
BASE = BENCH.BASE
NOMINAL_11 = 'QB=1|RB=1|FB=0|TE=1|WR=3|OL=5|other=0'
WEEK1 = {'file': 'tracking_week_1.csv', 'bytes': 971403802,
         'sha256': 'dc47c829ef917cb6533c6baedd01964823939a4e9cba807090d2784aa1fd149c'}
PLAY_LABELS = ['offenseFormation', 'receiverAlignment', 'pff_runConceptPrimary',
               'pff_runConceptSecondary', 'pff_passCoverage', 'pff_manZone', 'rushLocationType']


def summarize_values(rows, field):
    counts = Counter(r.get(field, '') for r in rows)
    return {'rows': len(rows), 'missing': sum(n for v, n in counts.items() if v in BASE.MISSING),
            'values': dict(sorted(counts.items()))}


def qualifies(play, annotation, game):
    """No gain, ending, actual run side or future geometry enters the match."""
    return (BASE.selection_reason(play) is None and game['week'] == '1'
            and BASE.primary_label(play) == 'OUTSIDE ZONE'
            and play['offenseFormation'] == 'SINGLEBACK' and play['receiverAlignment'] == '2x2'
            and annotation['listedPersonnel'] == NOMINAL_11
            and annotation['carrierPosition'] == 'RB'
            and play['pff_passCoverage'] == 'Cover-3'
            and play['down'] in ('1', '2') and 7 <= float(play['yardsToGo']) <= 10
            and play['pff_runPassOption'] == '0'
            and play['pff_runConceptSecondary'] in BASE.MISSING
            and all(annotation['motion'][f]['class'] == 'negativeAll11Known'
                    for f in ('inMotionAtBallSnap', 'shiftSinceLineset')))


def native_input(play, nfl):
    """Never forward NFL trajectories, outcomes, actual rush side, ratings or assignments."""
    if nfl['status'] != 'analyzed' or nfl['coverage']['defenders'] != 11:
        raise ValueError('Pilot requires an analyzed all-22 snap')
    goal = BENCH.distance_to_goal(play)
    if goal is None or not 0 < goal < 100:
        raise ValueError('Unknown/out-of-scope field position')
    by = nfl['ballAtSnap'][1]
    if not 0 <= by <= 160 / 3:
        raise ValueError('Invalid snap lateral ball coordinate')
    ends = [a['nflId'] for a in nfl['actors'] if a['side'] == 'O' and a['position'] == 'TE']
    if len(ends) != 1:
        raise ValueError('Expected one listed TE for the pilot')
    end_pos = nfl['phases']['snap']['actors'][ends[0]]['position']
    if end_pos is None or abs(end_pos[1] - by) < .5:
        raise ValueError('Unknown/ambiguous snap TE side')
    # ace_11 installs Y on R (negative y); flip mirrors to positive y.
    return {'id': f"{play['gameId']}-{play['playId']}", 'down': int(play['down']),
            'distance': float(play['yardsToGo']), 'los': 110 - goal, 'ballY': by,
            'flip': end_pos[1] > by}


def audit(directory):
    sources = BASE.verify_inputs(directory, BENCH.PINS)
    tables = {name: list(BASE.rows(directory / f'{name}.csv'))
              for name in ('games', 'plays', 'players', 'player_play')}
    plays = tables['plays']
    games = {r['gameId']: r for r in tables['games']}
    positions = {r['nflId']: r['position'] for r in tables['players']}
    meta = {BASE.play_key(r): r for r in plays}
    offense, rushers = defaultdict(list), defaultdict(list)
    for row in tables['player_play']:
        k = BASE.play_key(row)
        if row['teamAbbr'] == meta[k]['possessionTeam']:
            offense[k].append(row)
        if BASE.truth(row['hadRushAttempt']):
            rushers[k].append(row)
    annotations = {k: BENCH.player_annotation(offense[k], rushers[k], positions) for k in meta}
    cohorts = {'all': plays, 'designedRun': [r for r in plays if BASE.selection_reason(r) is None],
               'dropback': [r for r in plays if BASE.truth(r['isDropback'])]}
    matches = sorted((r for r in plays if qualifies(r, annotations[BASE.play_key(r)], games[r['gameId']])),
                     key=lambda r: (int(r['gameId']), int(r['playId'])))
    selected = matches[:3]
    if len(selected) != 3:
        raise ValueError(f'Expected three supported pilot examples, got {len(selected)}')
    pp = tables['player_play']
    routes = [r for r in pp if BASE.truth(r['wasRunningRoute'])]
    eligible_def = [r for r in pp if r['teamAbbr'] == meta[BASE.play_key(r)]['defensiveTeam']
                    and BASE.truth(meta[BASE.play_key(r)]['isDropback'])]
    nonrush_def = [r for r in eligible_def if BENCH.boolean(r['wasInitialPassRusher']) is False]
    run_annotations = [annotations[BASE.play_key(r)] for r in cohorts['designedRun']]
    inventory = {
        'schema': 'bounded-situation-qualification-v1', 'sources': sources,
        'availableTracking': [{'file': p.name, 'bytes': p.stat().st_size, 'hashChecked': False}
                              for p in sorted(directory.glob('tracking_week_*.csv'))],
        'tables': {name: {'rows': len(rows), 'columns': list(rows[0])} for name, rows in tables.items()},
        'labelsByEligibility': {name: {f: summarize_values(rows, f) for f in PLAY_LABELS}
                               for name, rows in cohorts.items()},
        'routeLabelsAmongFlaggedRunners': summarize_values(routes, 'routeRan'),
        'coverageAssignmentAmongDropbackDefenders': summarize_values(eligible_def, 'pff_defensiveCoverageAssignment'),
        'coverageAssignmentAmongKnownNonrushDropbackDefenders': summarize_values(nonrush_def, 'pff_defensiveCoverageAssignment'),
        'dropbackDefenderRusherFlag': summarize_values(eligible_def, 'wasInitialPassRusher'),
        'designedRunNominalPersonnel': dict(Counter(a['listedPersonnel'] for a in run_annotations)),
        'designedRunMotion': {f: dict(Counter(a['motion'][f]['class'] for a in run_annotations))
                             for f in ('inMotionAtBallSnap', 'motionSinceLineset', 'shiftSinceLineset')},
        'selection': {'rule': 'Week1; eligible designed OUTSIDEZONE; SINGLEBACK; nominal11; 2x2; exact Cover-3; RB carrier; down1/2 distance7–10; nonRPO; missing secondary; all11 known no motion-at-snap and no shift. First three numeric game/play IDs. No gain or ending filter.',
                      'matchesBeforeCap': len(matches),
                      'declaration': 'Selected after inspecting metadata exposure and candidate IDs, not a blinded preregistration. Existing designed-run eligibility requires finite gain and observed actual run location; its value never selects call direction.',
                      'plays': [{**{f: r[f] for f in ('gameId', 'playId', 'offenseFormation', 'receiverAlignment',
                                                    'pff_runConceptPrimary', 'pff_runConceptSecondary',
                                                    'pff_passCoverage', 'down', 'yardsToGo')},
                                 'annotation': annotations[BASE.play_key(r)]} for r in selected]},
        'unsupported': ['Named defensive fronts and installed run gaps/force duties absent.',
                        'Nominal personnel is a complete roster-position join, not charted package or alignment.',
                        'OUTSIDEZONE does not distinguish wide zone/stretch technique or called direction.',
                        'Run location is realized post-snap location, not a called-side label.',
                        'Coverage is provider charting of the play, not proof of the installed call.',
                        'Route labels exist; named pass concepts, progression, option rules and private intentions do not.',
                        'Motion negatives require all11 known; missing never means stationary.',
                        'Tracking cannot measure gaze, assignment, continuous grip or force.']}
    return inventory, selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--nfl-dir', type=Path, required=True)
    parser.add_argument('--out-dir', type=Path, default=Path('out/situation-pilot'))
    parser.add_argument('--extract', action='store_true')
    args = parser.parse_args()
    started = time.perf_counter()
    inventory, selected = audit(args.nfl_dir)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / 'inventory.json').write_text(json.dumps(inventory, indent=1) + '\n')
    if args.extract:
        selection = {'plays': [{'gameId': p['gameId'], 'playId': p['playId'], 'week': 1} for p in selected],
                     'sources': inventory['sources'] + [WEEK1]}
        path = args.out_dir / 'selection.json'
        path.write_text(json.dumps(selection, indent=1) + '\n')
        out = args.out_dir / 'nfl.json'
        if SEQ.run_query(argparse.Namespace(nfl_dir=args.nfl_dir, selection=path, out=out)):
            raise RuntimeError('Existing sequence query failed')
        measured = json.loads(out.read_text())
        by_key = {(r['gameId'], r['playId']): r for r in measured['plays']}
        inputs = {'schema': 'g2-coarse-situation-input-v1',
                  'cases': [native_input(p, by_key[(p['gameId'], p['playId'])]) for p in selected]}
        (args.out_dir / 'inputs.json').write_text(json.dumps(inputs, indent=1) + '\n')
    print(json.dumps({'selected': inventory['selection']['plays'], 'elapsedSeconds': time.perf_counter() - started,
                      'outDir': str(args.out_dir)}, indent=1))


if __name__ == '__main__':
    main()
