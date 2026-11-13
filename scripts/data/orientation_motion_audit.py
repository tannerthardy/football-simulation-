#!/usr/bin/env python3
"""Small, source-pinned audit of provider o/dir, not eyes or footwork labels.

Select the earliest tracked REG game in each requested season before reading
its angles. Default: 2023 and 2025. Requires pandas/numpy, no downloads.
python3 scripts/data/orientation_motion_audit.py <bdb2027-directory> <output.json>
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import platform

import numpy as np
import pandas as pd


TRACK_COLUMNS = ['game_id', 'play_id', 'nfl_id', 'time', 'x', 'y', 's', 'o', 'dir', 'event']
LABEL_COLUMNS = ['game_id', 'play_id', 'nfl_id', 'lined_up_position',
                 'play_direction', 'play_nullified_by_penalty', 'pass_result']
KEY_COLUMNS = ['game_id', 'play_id', 'nfl_id']
SPEED_BINS = [(1., 2., '[1,2)'), (2., 4., '[2,4)'), (4., 6., '[4,6)'), (6., 15.01, '6+')]


def file_pin(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return {'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def circular_difference(a, b):
    """Signed shortest difference in degrees; invariant under common rotation."""
    return (np.asarray(a) - np.asarray(b) + 180.) % 360. - 180.


def stats(values):
    a = np.asarray(values, dtype=float)
    a = a[np.isfinite(a)]
    if not len(a):
        return {'n': 0}
    return {'n': int(len(a)), 'p10': float(np.quantile(a, .1)),
            'p50': float(np.median(a)), 'p90': float(np.quantile(a, .9)),
            'mean': float(np.mean(a))}


def clean_trajectory(g):
    """Reject ambiguous clocks; never silently choose conflicting duplicates."""
    g = g.copy()
    g['parsed_time'] = pd.to_datetime(g.time, format='ISO8601', utc=True, errors='coerce')
    if g.parsed_time.isna().any():
        return None, 'malformedClock', 0
    compare = [c for c in TRACK_COLUMNS if c in g.columns]
    deduped = g.drop_duplicates(subset=compare)
    exact_duplicates = len(g) - len(deduped)
    if deduped.duplicated('parsed_time', keep=False).any():
        return None, 'conflictingDuplicateClock', exact_duplicates
    g = deduped.sort_values('parsed_time').copy()
    # Datetime integers use the Series' storage unit (e.g. us in pandas 3),
    # so normalize before converting to epoch seconds.
    g['seconds'] = g.parsed_time.dt.as_unit('ns').astype('int64') / 1e9
    for column in ['x', 'y', 's', 'o', 'dir']:
        g[column] = pd.to_numeric(g[column], errors='coerce')
    return g, None, exact_duplicates


def contiguous_runs(valid, times):
    """No interpolation: a missing/invalid frame or non-10Hz step breaks a run."""
    runs, current = [], []
    for i, good in enumerate(valid):
        contiguous = i > 0 and abs((times[i] - times[i - 1]) - .1) <= .002
        if not good or (current and not contiguous):
            if current:
                runs.append(current)
            current = []
        if good:
            current.append(i)
    if current:
        runs.append(current)
    return runs


def measure_window(g):
    """Declared descriptive markers, not backpedal, gaze or motor-capacity truth."""
    t = g.seconds.to_numpy(dtype=float)
    speed = g.s.to_numpy(dtype=float)
    orientation = g.o.to_numpy(dtype=float)
    direction = g.dir.to_numpy(dtype=float)
    coordinates = np.isfinite(g.x) & np.isfinite(g.y)
    # Tolerate 1yd of tracking/boundary error; an explicit gross screen only.
    coordinates &= g.x.between(-1, 121) & g.y.between(-1, 54.34)
    good_speed = np.isfinite(speed) & (speed >= 0) & (speed <= 15)
    good_o = np.isfinite(orientation) & (orientation >= 0) & (orientation <= 360)
    good_dir = np.isfinite(direction) & (direction >= 0) & (direction <= 360)
    base = coordinates.to_numpy() & good_speed
    valid_motion = base & good_o & good_dir & (speed >= 1)
    runs = [r for r in contiguous_runs(valid_motion, t)
            if len(r) >= 4 and t[r[-1]] - t[r[0]] >= .3 - .002]
    indices = np.array([i for run in runs for i in run], dtype=int)
    angle = np.abs(circular_difference(orientation[indices], direction[indices]))
    bins = {}
    for lower, upper, name in SPEED_BINS:
        keep = (speed[indices] >= lower) & (speed[indices] < upper)
        a = angle[keep]
        if len(a):
            bins[name] = {'angles': a.tolist(), 'frames': int(len(a)),
                          'alignedFrames': int((a < 60).sum()),
                          'opposedFrames': int((a >= 120).sum())}
    # Non-overlapping fixed .5s opportunities within each complete slow run.
    # Endpoint angular change misses turns which reverse or make a full circle.
    slow_runs = contiguous_runs(base & good_o & (speed < 1), t)
    slow_changes = []
    for run in slow_runs:
        for start in range(0, len(run) - 5, 6):
            first, last = run[start], run[start + 5]
            if abs((t[last] - t[first]) - .5) <= .002:
                slow_changes.append(float(abs(circular_difference(orientation[last], orientation[first]))))
    return {
        'framesInWindow': len(g), 'invalidCoordinates': int((~coordinates).sum()),
        'invalidSpeed': int((~good_speed).sum()), 'missingOrInvalidO': int((~good_o).sum()),
        'missingOrInvalidDir': int((~good_dir).sum()),
        'non10HzSteps': int((np.abs(np.diff(t) - .1) > .002).sum()),
        'sustainedMotionRuns': len(runs), 'sustainedMotionFrames': int(len(indices)),
        'speedBins': bins, 'slowOrientationOpportunities': len(slow_changes),
        'slowOrientationChanges': slow_changes,
        'slowOrientationChangeAtLeast45': sum(a >= 45 for a in slow_changes),
    }


def summarize(observations):
    """Show frame-pooled rates and athlete-balanced summaries separately."""
    grouped = defaultdict(lambda: defaultdict(list))
    for role, player, measurement in observations:
        grouped[role][player].append(measurement)
    output = {}
    for role, players in sorted(grouped.items()):
        measurements = [m for paths in players.values() for m in paths]
        bins = {}
        for _, _, name in SPEED_BINS:
            all_bins = [m['speedBins'][name] for m in measurements if name in m['speedBins']]
            player_bins = [[m['speedBins'][name] for m in paths if name in m['speedBins']]
                           for paths in players.values()]
            player_bins = [b for b in player_bins if b]
            n = sum(b['frames'] for b in all_bins)
            if not n:
                continue
            angles = [a for b in all_bins for a in b['angles']]
            bins[name] = {
                'frames': n, 'players': len(player_bins), 'paths': len(all_bins),
                'framePooledAbsODirDifferenceDegrees': stats(angles),
                'framePooledAlignedFractionBelow60': sum(b['alignedFrames'] for b in all_bins) / n,
                'framePooledOpposedFractionAtLeast120': sum(b['opposedFrames'] for b in all_bins) / n,
                'playerMedianAbsODirDifferenceDegrees': stats([
                    np.median([a for b in bs for a in b['angles']]) for bs in player_bins]),
                'playerOpposedFractions': stats([
                    sum(b['opposedFrames'] for b in bs) / sum(b['frames'] for b in bs)
                    for bs in player_bins]),
            }
        slow = [a for m in measurements for a in m['slowOrientationChanges']]
        output[role] = {
            'players': len(players), 'paths': len(measurements),
            'windowFrames': sum(m['framesInWindow'] for m in measurements),
            'sustainedMotionPaths': sum(m['sustainedMotionFrames'] > 0 for m in measurements),
            'sustainedMotionRuns': sum(m['sustainedMotionRuns'] for m in measurements),
            'speedBins': bins,
            'slowOrientation': {'nonOverlappingHalfSecondOpportunities': len(slow),
                'absEndpointChangeDegrees': stats(slow),
                'atLeast45Count': sum(a >= 45 for a in slow),
                'atLeast45Fraction': sum(a >= 45 for a in slow) / len(slow) if slow else None},
        }
    return output


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('directory', type=Path)
    ap.add_argument('output', type=Path)
    ap.add_argument('--season', action='append', type=int)
    args = ap.parse_args()
    seasons = sorted(set(args.season or [2023, 2025]))
    games = pd.read_csv(args.directory / 'games.csv', dtype={'game_id': str})
    labels = pd.read_csv(args.directory / 'player_play.csv', usecols=LABEL_COLUMNS,
                         dtype={k: str for k in KEY_COLUMNS})
    if labels.duplicated(KEY_COLUMNS, keep=False).any():
        raise ValueError('Ambiguous player_play keys: cannot silently pick a label')
    label_map = {tuple(r[k] for k in KEY_COLUMNS): r for r in labels.to_dict('records')}
    inputs = {name: file_pin(args.directory / name) for name in ['games.csv', 'player_play.csv']}
    cohort, observations, season_reports = [], [], {}
    for season in seasons:
        path = args.directory / f'game_tracking_{season}.csv'
        inputs[path.name] = file_pin(path)
        inventory, rows = Counter(), 0
        # Inventory consumes only IDs; angles/outcomes do not choose a game.
        for chunk in pd.read_csv(path, usecols=['game_id'], dtype={'game_id': str}, chunksize=250000):
            rows += len(chunk)
            inventory.update({k: int(v) for k, v in chunk.game_id.value_counts().items()})
        regular = set(games[(games.season == season) & (games.season_type == 'REG')].game_id)
        eligible = regular & inventory.keys()
        if not eligible:
            raise ValueError(f'No tracked REG game in season {season}')
        game = min(eligible, key=int)
        info = games[games.game_id == game].iloc[0].to_dict()
        print(f'Predeclared selection {season}: {game}, {inventory[game]} rows, {info["home_team_abbr"]}/{info["visitor_team_abbr"]}', flush=True)
        selected = []
        for chunk in pd.read_csv(path, usecols=TRACK_COLUMNS, dtype={k: str for k in KEY_COLUMNS}, chunksize=250000):
            selected.append(chunk[chunk.game_id == game])
        selected = pd.concat(selected, ignore_index=True)
        counts, quality, retained_rows, paths = Counter(), Counter(), 0, []
        for key, group in selected.groupby(KEY_COLUMNS, sort=True, dropna=False):
            counts['pathsRead'] += 1
            label = label_map.get(key)
            if label is None:
                counts['missingLabel'] += 1
                continue
            if label['play_nullified_by_penalty'] != 'N':
                counts['nullifiedOrUnknownPenaltyStatus'] += 1
                continue
            if pd.isna(label['pass_result']) or str(label['pass_result']).strip() == '':
                counts['noPassLabel'] += 1
                continue
            clean, failure, duplicates = clean_trajectory(group)
            quality['exactDuplicateRowsCollapsed'] += duplicates
            if failure:
                counts[failure] += 1
                continue
            snap = clean[clean.event == 'ball_snap'].seconds
            release = clean[clean.event.isin(['pass_forward', 'autoevent_passforward'])].seconds
            if snap.empty or release.empty:
                counts['missingSnapOrRelease'] += 1
                continue
            start = float(snap.min())
            later_release = release[release >= start]
            if later_release.empty:
                counts['releaseBeforeSnapOnly'] += 1
                continue
            end = min(float(later_release.min()), start + 3.)
            contact = clean[(clean.event == 'first_contact') & (clean.seconds > start)].seconds
            if not contact.empty:
                end = min(end, float(contact.min()))
            window = clean[clean.seconds.between(start, end)]
            if window.empty:
                counts['emptyWindow'] += 1
                continue
            measured = measure_window(window)
            counts['retainedWindowPaths'] += 1
            counts['withSustainedMotion'] += measured['sustainedMotionFrames'] > 0
            retained_rows += len(window)
            for k in ['invalidCoordinates', 'invalidSpeed', 'missingOrInvalidO', 'missingOrInvalidDir', 'non10HzSteps']:
                quality[k] += measured[k]
            role = str(label['lined_up_position'])
            if pd.isna(label['lined_up_position']):
                role = 'UNKNOWN'
            observations.append((f'{season}:{role}', key[2], measured))
            paths.append({'gameId': key[0], 'playId': key[1], 'nflId': key[2], 'role': role,
                          'playDirection': None if pd.isna(label['play_direction']) else str(label['play_direction']),
                          'start': start, 'end': end, 'measurement': measured})
        season_reports[str(season)] = {
            'trackingRowsInventoried': rows, 'trackedGames': len(inventory),
            'trackedREGGames': len(eligible), 'selectedGame': info,
            'selectedRawRows': len(selected),
            'selectedRawPlayers': int(selected.nfl_id.nunique()),
            'selectedRawPlays': int(selected.play_id.nunique()),
            'retainedWindowRows': retained_rows,
            'retainedPlayers': len({p['nflId'] for p in paths}),
            'retainedPlays': len({p['playId'] for p in paths}),
            'counts': dict(counts), 'quality': dict(quality), 'paths': paths,
        }
        cohort.append({'season': season, 'gameId': game, 'rawRows': len(selected)})
    report = {
        'schemaVersion': 1, 'source': 'Local Kaggle NFL Big Data Bowl 2027 snapshot; selected athletes',
        'sourceUrl': 'https://www.kaggle.com/competitions/nfl-big-data-bowl-2027/data',
        'inputs': inputs, 'labelRowsRead': len(labels),
        'tool': {'path': 'scripts/data/orientation_motion_audit.py',
                                  **file_pin(Path(__file__)), 'python': platform.python_version(),
                                  'pandas': pd.__version__, 'numpy': np.__version__},
        'selection': {'rule': 'Earliest numeric tracked game_id with games.season_type=REG in each declared season; select before angles',
                      'seasons': seasons, 'cohort': cohort},
        'method': {'window': 'Non-nullified, pass-labelled player paths: snap to earliest later release, later labelled first_contact, or 3 seconds',
                   'angles': 'Absolute shortest circular difference of provider o and dir; no x/y heading conversion. Physical facing interpretation is conditional on the two fields sharing an angular convention.',
                   'fieldSemantics': 'Provider dir and o are candidate travel-direction and body-orientation proxies. An older BDB2019 schema defines dir as motion angle; a current BDB2027 field dictionary and o convention have not been independently retrieved.',
                   'playDirection': 'Labels retained; a common angular rotation cancels in o-dir and within-path o change. This does not prove that the two provider fields share a convention.',
                   'sustainedMotion': 'At least four valid consecutive 10Hz frames (>=.3 seconds) with provider speed >=1 yd/s; frame speed bins [1,2),[2,4),[4,6),6+',
                   'grossScreen': 'Finite x/y within field plus 1yd tolerance, finite s in [0,15]yd/s, required angles in [0,360]; not fitted NFL limits',
                   'slowOrientation': 'Non-overlapping .5s windows entirely below 1yd/s, absolute endpoint o change; >=45deg is an analysis marker, not a measured technique label',
                   'angleCategories': '<60deg aligned proxy,60–120deg oblique proxy,>=120deg opposed proxy; analysis thresholds, not coach labels',
                   'weighting': 'Both pooled frames and within-athlete median/fraction distributions; report denominators. No uncertainty claim from two games.'},
        'limits': ['Not all-22; selected draft/combine cohort, two deterministically chosen games.',
                   'Orientation is not eye tracking, attention, a foot plant, verified backpedal or shuffle.',
                   'Pre-release windows omit runs, many sacks, later pursuit and post-contact recovery; unlabelled contacts may remain.',
                   'Provider smoothing and low-speed heading uncertainty are not independently known; slow windows do not use dir.',
                   'No orientation interpolation across invalid frames or clock gaps; conflicting duplicates reject a path.',
                   'Direction conventions and o semantics require a first-party current dictionary before comparing absolute body-facing to engine facing.',
                   'No engine retuning, force inference, held-out prediction, NFL prevalence or generated-player quality claim.'],
        'seasonAudit': season_reports, 'bySeasonAndRole': summarize(observations),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(f'Wrote {args.output}', flush=True)


if __name__ == '__main__':
    main()
