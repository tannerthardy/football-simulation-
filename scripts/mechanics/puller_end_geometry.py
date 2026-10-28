#!/usr/bin/env python3
"""Observable puller/end geometry, not assignments, contact or technique intent.

python3 -I scripts/mechanics/puller_end_geometry.py CACHE.jsonl.gz \
  [--sim TRACE.json ... --sim-source REVISION ...] [--out out/mechanics/puller.json]
python3 -I scripts/mechanics/puller_end_geometry.py --self-test

Uses run_film_reference's loaders, concept mapping and exact puller rule.
NFL cache is converted JSONL (BDB2025 covers 2022 weeks 1-9, not a season).
No simulation, download, resampling or change to the shared loader.
"""
import argparse
import collections
import dataclasses
import gzip
import hashlib
import itertools
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_film_reference as reference  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CONCEPTS = ('POWER', 'COUNTER', 'TRAP')
CLASSES = ('kick_like', 'log_like', 'turn_up_like', 'uncertain')


@dataclasses.dataclass(frozen=True)
class Criteria:
    arrival_radius: float = 1.2
    end_displacement: float = .5
    relation_margin: float = .25
    end_tie_width: float = .75
    follow_frames: int = 5             # 0.5 s, at the fixed 10 Hz clock
    coupled_radius: float = 1.5
    coupled_samples: int = 4           # at least four of six near samples


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def records(path, source):
    """Enrich the unchanged loader with IDs/audit fields it deliberately omits.

    Two streamed reads of the small converted input; never two raw CSV scans.
    Cache actor indices are preserved. NFL IDs are used only when the cache
    actually carries them. A missing gap audit is reported, not invented.
    """
    if source == 'nfl':
        def raw_runs():
            with gzip.open(path, 'rt') as handle:
                for line in handle:
                    p = json.loads(line)
                    if p['kind'] == 'run' and p['carrier'] is not None:
                        if p.get('dt') != .1:
                            raise ValueError('NFL converted input must declare dt=0.1')
                        yield p
        normalized, raw = reference.nfl(path), raw_runs()
    else:
        with Path(path).open() as handle:
            original = json.load(handle)
        # The shared loader checks the first 30 frames. Check the whole
        # recorded window too; an offset/irregular late frame is not repaired.
        for p in original:
            if any(abs(f['t'] - k*.1) > .011 for k, f in enumerate(p['frames'])):
                raise ValueError('Sim trace requires time-zero, aligned 10 Hz frames')
        raw = (p for p in original if not p['nullified'] and any(
            f['c'] >= 0 and p['setup']['agents'][f['c']]['slot'] != 'QB' for f in p['frames']))
        normalized = reference.sim([str(path)])
    sentinel = object()
    for ordinal, (play, original) in enumerate(itertools.zip_longest(normalized, raw, fillvalue=sentinel)):
        if play is sentinel or original is sentinel:
            raise ValueError('Source metadata and shared loader selection disagree')
        if len(play['xy']) != len(original['xy'] if source == 'nfl' else original['frames']):
            raise ValueError('Metadata/frame alignment differs from the shared loader')
        if source == 'nfl' and (play['carrier'] != original['carrier'] or play['concept'] != original['cell']['concept']):
            raise ValueError('NFL metadata identity mismatch')
        play['_id'] = original.get('id', f'ordinal-{ordinal}')
        play['_input'] = str(path)
        play['_week'] = original.get('week')
        play['_ids'] = original.get('tracking_ids')
        play['_observed'] = original.get('sample_observed')
        if source == 'sim':
            play['_observed'] = [[True]*len(play['players']) for _ in play['xy']]
        mask = play['_observed']
        if mask is not None and (len(mask) != len(play['xy']) or any(len(m) != len(play['players']) for m in mask)):
            raise ValueError('Observed-sample audit dimensions do not match the trajectories')
        yield play


def classify(play, i, criteria=Criteria()):
    xy, players = play['xy'], play['players']
    if not xy or not math.isfinite(play['end']) or play['end'] < 0:
        raise ValueError('Missing/invalid recorded play end')
    last = min(len(xy)-1, int(math.floor(play['end']/.1 + 1e-7)))
    rule_last = min(last, 25)
    x0, y0 = xy[0][i]
    direction = next((1 if xy[f][i][1] > y0 else -1 for f in range(rule_last+1)
                      if abs(xy[f][i][1]-y0) >= 3), None)
    row = {'source': play['src'], 'input': play.get('_input'), 'play': play.get('_id'), 'concept': play['concept'],
           'week': play.get('_week'), 'puller': i,
           'puller_id': play.get('_ids', [])[i] if play.get('_ids') else None,
           'class': 'uncertain', 'reason': '', 'direction': direction, 'arrival': None, 'turn': None,
           'audit': 'available' if play.get('_observed') is not None else 'not_available',
           'short_detection_window': last < 25}
    def uncertain(reason):
        row['reason'] = reason
        return row
    if direction is None or not reference.puller(xy[:last+1], i, rule_last):
        return uncertain('not_a_ruled_puller')
    observed = play.get('_observed')
    if observed is not None and any(not observed[f][i] for f in range(rule_last+1)):
        return uncertain('imputed_puller_detection_window')
    ol = [j for j, p in enumerate(players) if p['side'] == 'O' and p['group'] == 'OL']
    if len(ol) < 5:
        return uncertain('fewer_than_five_OL')
    cy = statistics.mean(xy[0][j][1] for j in ol)
    front = [j for j, p in enumerate(players) if p['side'] == 'D' and p['group'] in ('DL', 'LB')
             and xy[0][j][0] < 1.8 and (xy[0][j][1]-cy)*direction > 0]
    if not front:
        return uncertain('no_snap_front_end')
    front.sort(key=lambda j: (xy[0][j][1]-cy)*direction, reverse=True)
    end = front[0]
    row['end'] = end
    row['end_id'] = play.get('_ids', [])[end] if play.get('_ids') else None
    row['end_snap_depth'] = xy[0][end][0]
    ambiguous = len(front) > 1 and abs(xy[0][front[0]][1]-xy[0][front[1]][1]) < criteria.end_tie_width
    def separation(j, f):
        return math.dist(xy[f][i], xy[f][j])
    def metric(f):
        t = f*.1
        return {'frame': f, 'time': round(t, 2), 'from_handoff': None if play['handoff'] is None else t-play['handoff'],
                'puller_depth': xy[f][i][0], 'distance_to_end': separation(end, f), 'end_depth': xy[f][end][0]}
    eligible = [f for f in range(6, min(last, 40)+1) if abs(xy[f][i][1]-y0) >= 2]
    if eligible:
        row['minimum_end_separation'] = min(separation(end, f) for f in eligible)
        row['deepest_puller_before_2_5'] = min(xy[f][i][0] for f in range(rule_last+1))
    arrival = next((f for f in eligible if separation(end, f) < criteria.arrival_radius), None)
    if arrival is not None:
        row['arrival'] = metric(arrival)
    # Sustained upfield segment after lateral displacement: two successive
    # 0.2 s windows each advance >=0.4 yd, with dx >=2*abs(dy).
    def upfield(f):
        return all(xy[b][i][0]-xy[a][i][0] >= .4 and
                   xy[b][i][0]-xy[a][i][0] >= 2*abs(xy[b][i][1]-xy[a][i][1])
                   for a, b in [(f, f+2), (f+2, f+4)])
    turn = next((f for f in eligible if f+4 <= last and upfield(f)), None)
    if turn is not None:
        row['turn'] = metric(turn)
    turn_first = turn is not None and (arrival is None or turn+4 < arrival)
    through = max(rule_last, turn+4 if turn_first else arrival+criteria.follow_frames
                  if arrival is not None else min(last, 40))
    if observed is not None and any(not observed[f][j] for f in range(min(last, through)+1) for j in [i]+front):
        return uncertain('imputed_encounter_window')
    if ambiguous:
        return uncertain('multiple_snap_end_candidates')
    other = next((f for f in eligible if any(separation(j, f) < criteria.arrival_radius for j in front[1:])), None)
    row['other_front_arrival'] = None if other is None else round(other*.1, 2)
    if other is not None and (arrival is None or other < arrival):
        return uncertain('another_front_defender_encountered_first')
    if turn_first:
        if separation(end, turn) >= criteria.coupled_radius and (xy[turn][i][1]-xy[turn][end][1])*direction <= -criteria.relation_margin:
            row.update({'class': 'turn_up_like', 'reason': 'upfield_segment_inside_end_before_end_arrival'})
            return row
    if arrival is None:
        return uncertain('no_end_arrival_or_clear_turn')
    post = arrival+criteria.follow_frames
    if post > last:
        return uncertain('post_arrival_window_censored')
    near = sum(separation(end, f) < criteria.coupled_radius for f in range(arrival, post+1))
    displacement = (xy[post][end][1]-xy[arrival][end][1])*direction
    relation0 = (xy[arrival][i][1]-xy[arrival][end][1])*direction
    relation1 = (xy[post][i][1]-xy[post][end][1])*direction
    row.update({'post_end_displacement': displacement, 'post_relation': relation1, 'near_samples': near})
    if near < criteria.coupled_samples:
        return uncertain('brief_proximity_not_sustained')
    if displacement >= criteria.end_displacement and max(relation0, relation1) <= -criteria.relation_margin:
        row.update({'class': 'kick_like', 'reason': 'end_moves_out_with_puller_on_inside'})
    elif displacement <= -criteria.end_displacement and relation1 >= criteria.relation_margin:
        row.update({'class': 'log_like', 'reason': 'end_moves_in_with_puller_on_outside'})
    else:
        return uncertain('end_motion_or_relative_side_not_decisive')
    return row


def measure(plays):
    rows, counts = [], collections.Counter()
    sensitivity = [dataclasses.replace(Criteria(), arrival_radius=x) for x in (1., 1.4)]
    sensitivity += [dataclasses.replace(Criteria(), end_displacement=x) for x in (.3, .7)]
    for p in plays:
        counts['loader_plays'] += 1
        if p['concept'] not in CONCEPTS:
            counts['non_gap_concept'] += 1
            continue
        counts[f"plays:{p['src']}:{p['concept']}"] += 1
        if p['_week'] is not None:
            counts[f"week:{p['_week']}"] += 1
        last = min(len(p['xy'])-1, int(math.floor(p['end']/.1+1e-7)))
        if last < 0:
            counts['empty_recorded_window'] += 1
            continue
        n = 0
        for i, q in enumerate(p['players']):
            if q['side'] != 'O' or q['group'] != 'OL':
                continue
            ruled = reference.puller(p['xy'][:last+1], i, min(25, last))
            if p['src'] == 'sim' and q.get('plan') == 'pull':
                counts['sim_installed_pullers'] += 1
                counts['sim_installed_caught_by_rule'] += ruled
            if not ruled:
                continue
            n += 1
            row = classify(p, i)
            alternatives = [classify(p, i, c)['class'] for c in sensitivity]
            row['sensitivity_classes'] = alternatives
            row['threshold_sensitive'] = any(c != row['class'] for c in alternatives)
            rows.append(row)
        counts['gap_plays_without_ruled_puller'] += n == 0
    return rows, dict(counts)


def median(values):
    values = [v for v in values if v is not None]
    return None if not values else round(statistics.median(values), 2)


def tables(rows, counts):
    lines = ['# Puller/end geometry proxies', '',
             'Kick/log landmarks are first proximity arrivals; turn-up landmarks are segment onsets, not arrivals.',
             'Depth x is yards past the LOS (negative = backfield). Distances are yards; clocks are seconds from snap.', '',
             '| Source | Concept | Plays | Pullers | Kick-like | Log-like | Turn-up-like | Uncertain | Threshold-sensitive |',
             '|---|---|---:|---:|---:|---:|---:|---:|---:|']
    for src in sorted({r['source'] for r in rows}):
        for concept in CONCEPTS:
            group = [r for r in rows if r['source'] == src and r['concept'] == concept]
            by = collections.Counter(r['class'] for r in group)
            lines.append(f"| {src} | {concept} | {counts.get(f'plays:{src}:{concept}', 0)} | {len(group)} | "
                         + ' | '.join(str(by[k]) for k in CLASSES) + f" | {sum(r['threshold_sensitive'] for r in group)} |")
    lines += ['', '| Source | Pattern / landmark | N | Time | Puller depth | Distance to end | End depth |',
              '|---|---|---:|---:|---:|---:|---:|']
    for src in sorted({r['source'] for r in rows}):
        for cls in CLASSES[:-1]:
            group = [r for r in rows if r['source'] == src and r['class'] == cls]
            key = 'turn' if cls == 'turn_up_like' else 'arrival'
            points = [r[key] for r in group]
            label = cls+' / '+('turn onset' if key == 'turn' else 'arrival')
            cells = [median([p[k] for p in points]) for k in ('time', 'puller_depth', 'distance_to_end', 'end_depth')]
            lines.append(f"| {src} | {label} | {len(points)} | "+' | '.join('—' if v is None else str(v) for v in cells)+' |')
    reasons = collections.Counter(r['reason'] for r in rows if r['class'] == 'uncertain')
    lines += ['', 'Uncertain reasons: '+', '.join(f'{k}={v}' for k, v in sorted(reasons.items())), '',
              f"No gap audit supplied for {sum(r['audit']=='not_available' for r in rows)} puller rows. "
              'Known filled encounter samples are not classified.',
              'Sensitivity changes one threshold at a time: arrival radius 1.0/1.4 yd or end displacement 0.3/0.7 yd.',
              'NFL BDB2025 coverage is 2022 weeks 1–9, not the entire season; actual input weeks appear in the JSON counts.',
              'Concepts and pullers are the shared reference definitions. Duo is INSIDE ZONE, outside this gap subset.',
              'The end is the widest snap-aligned DL/LB (x<1.8) on the pull side, not a proven blocking assignment. '
              'TRAP often targets an interior man. Multiple close-width candidates and earlier other-front encounters stay uncertain.',
              'Tracking proximity is not physical contact, holding, grip, gaze or intent. A turn-up can be a planned lead/climb.',
              'The 3-yard rule misses short pulls; two pullers from one play are correlated. This is a selected trajectory cohort.',
              'Only OL pullers are included; FB/TE kick-outs and short traps are not represented by this rule.',
              'Sim data, when supplied, must start at zero and remain aligned at 10 Hz; installed-only pullers are counted separately.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('nfl', nargs='?', type=Path)
    parser.add_argument('--sim', nargs='*', type=Path, default=[])
    parser.add_argument('--sim-source', nargs='*', default=[])
    parser.add_argument('--out', type=Path, default=Path('out/mechanics/puller-end-geometry.json'))
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.nfl is None or len(args.sim) != len(args.sim_source):
        parser.error('Provide a converted NFL cache and one explicit --sim-source revision per sim trace')
    paths = [('nfl', args.nfl, 'BDB2025 converted 2022 input')]+[('sim', p, r) for p, r in zip(args.sim, args.sim_source)]
    rows, counts = measure(itertools.chain.from_iterable(records(p, src) for src, p, _ in paths))
    git = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], capture_output=True, text=True)
    result = {'schema': 'puller-end-geometry-v1', 'sourceRevision': git.stdout.strip(),
              'operatorSha256': digest(__file__), 'loaderSha256': digest(reference.__file__),
              'inputs': [{'source': src, 'path': str(p), 'sourceLabel': label, 'bytes': p.stat().st_size, 'sha256': digest(p)} for src, p, label in paths],
              'criteria': dataclasses.asdict(Criteria()), 'counts': counts, 'rows': rows,
              'simStatus': 'supplied' if args.sim else 'not supplied; no current-sim measurement claimed'}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2)+'\n')
    table = tables(rows, counts)
    args.out.with_suffix('.md').write_text(table)
    print(table)
    return 0


def self_test():
    import copy
    import tempfile
    import unittest

    def synthetic(pattern='kick'):
        players = [{'side': 'O', 'group': 'OL'} for _ in range(5)]
        players += [{'side': 'O', 'group': 'RB'}, {'side': 'D', 'group': 'DL'}]
        xy = []
        for f in range(36):
            if pattern == 'log':
                px = -1.2 if f < 15 else -.3
                py = -3+7.7*min(f, 15)/15-max(0, f-15)*.15
                ey = 4-max(0, f-15)*.15
            else:
                px = -.3 if pattern != 'turn' else -1+max(0, f-15)*.25
                py = -3+.4*min(f, 15)+(max(0, f-15)*.15 if pattern == 'kick' else 0)
                ey = 6 if pattern == 'turn' else 4+(max(0, f-15)*.15 if pattern == 'kick' else 0)
            xy.append([(px, py), (0, -1.5), (0, 0), (0, 1.5), (0, 3), (-4+f*.2, 0), (.2, ey)])
        return {'src': 'nfl', 'concept': 'POWER', 'players': players, 'xy': xy, 'carrier': 5,
                'handoff': .5, 'end': 3.5, '_week': 1, '_id': 'declared-synthetic',
                '_observed': [[True]*7 for _ in xy]}

    class Contracts(unittest.TestCase):
        def test_decisive_geometry_and_landmarks(self):
            for pattern, label in [('kick', 'kick_like'), ('log', 'log_like'), ('turn', 'turn_up_like')]:
                with self.subTest(pattern=pattern):
                    row = classify(synthetic(pattern), 0)
                    self.assertEqual(row['class'], label)
                    self.assertEqual((row['turn'] if pattern == 'turn' else row['arrival'])['time'], 1.5)

        def test_mirrored_and_translated_geometry(self):
            for pattern in ('kick', 'log', 'turn'):
                original = synthetic(pattern)
                for sign in (-1, 1):
                    moved = copy.deepcopy(original)
                    moved['xy'] = [[(x, sign*y+9) for x, y in frame] for frame in moved['xy']]
                    self.assertEqual(classify(moved, 0)['class'], classify(original, 0)['class'])

        def test_neutral_end_is_not_awarded_a_technique(self):
            self.assertEqual(classify(synthetic('neutral'), 0)['class'], 'uncertain')

        def test_end_and_sample_ambiguity(self):
            p = synthetic()
            p['players'].append({'side': 'D', 'group': 'LB'})
            for frame, mask in zip(p['xy'], p['_observed']):
                frame.append((.2, 3.75)); mask.append(True)
            self.assertEqual(classify(p, 0)['reason'], 'multiple_snap_end_candidates')
            p = synthetic(); p['_observed'][8][0] = False
            self.assertEqual(classify(p, 0)['reason'], 'imputed_puller_detection_window')
            p = synthetic(); p['_observed'][19][6] = False
            self.assertEqual(classify(p, 0)['reason'], 'imputed_encounter_window')

        def test_short_end_censors_followup(self):
            p = synthetic(); p['end'] = 1.8
            self.assertEqual(classify(p, 0)['reason'], 'post_arrival_window_censored')

        def test_loader_mapping_clock_and_plan_audit(self):
            p = synthetic()
            raw = {'id': 'synthetic-sim', 'nullified': False,
                   'setup': {'concept': 'power', 'los': 40, 'agents': [
                       {'team': q['side'], 'pos': 'OG' if q['group'] == 'OL' else q['group'],
                        'slot': 'RB' if i == 5 else str(i), 'plan': 'pull' if i == 0 else None}
                       for i, q in enumerate(p['players'])]},
                   'frames': [{'t': f*.1, 'c': 5, 'a': [[x+40, y] for x, y in frame]} for f, frame in enumerate(p['xy'])],
                   'events': [{'t': .5, 'type': 'handoff'}, {'t': 3.5, 'type': 'tackle'}]}
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory)/'sim.json'; path.write_text(json.dumps([raw]))
                normalized = list(records(path, 'sim'))
                rows, counts = measure(normalized)
                self.assertEqual(len(rows), 1)
                self.assertEqual(counts['sim_installed_caught_by_rule'], 1)
                self.assertEqual(reference.SIM_CONCEPT['duo'], 'INSIDE ZONE')
                raw['frames'][30]['t'] += .05
                path.write_text(json.dumps([raw]))
                with self.assertRaisesRegex(ValueError, 'aligned 10 Hz'):
                    list(records(path, 'sim'))

        def test_unknown_audit_is_explicit(self):
            p = synthetic(); p.pop('_observed')
            self.assertEqual(classify(p, 0)['audit'], 'not_available')

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Contracts)
    return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main())
