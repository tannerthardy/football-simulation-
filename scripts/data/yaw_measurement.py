"""Shared offline turning operator for NFL CSVs and normalized simulator paths.

Primary measurements retain all orientation excursions. The sensitivity view
omits flagged middle body frames; it is not cleaned truth or a capacity bound.
"""
import argparse
from bisect import bisect_left
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import sys

VERSION = 'turning-v2'
DEFENDERS = {'CB', 'SS', 'FS', 'S', 'DB', 'ILB', 'MLB', 'OLB', 'LB'}
OTHER_POSITIONS = {'QB', 'RB', 'HB', 'FB', 'WR', 'TE', 'C', 'G', 'T', 'OT', 'OG', 'OL',
                   'DL', 'DE', 'DT', 'NT', 'EDGE', 'LS', 'K', 'P', 'KR', 'PR'}
FREQUENCY_BINS = ((1, 2), (2, 4), (4, 6), (6, 99))
PATH_BINS = ((0, 2), (2, 4), (4, 6), (6, 99))
POLICY = dict(maxGapSeconds=.15, windowSeconds=.2, endpointToleranceSeconds=.002,
              excursionDegrees=90, returnToleranceDegrees=15, turnDegrees=150,
              turnDeadbandDegS=30, minimumTravelSpeedYdS=1)


def circular_difference(a, b):
    # Same shortest-arc convention as orientation_motion_audit.circular_difference.
    return (a - b + 180) % 360 - 180


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def angle(value):
    value = number(value)
    return value if value is not None and 0 <= value <= 360 else None


def stats(values, digits=1):
    values = sorted(values)
    def q(p):
        return round(values[min(len(values) - 1, int(p * len(values)))], digits) if values else None
    return dict(n=len(values), p50=q(.5), p90=q(.9), p99=q(.99),
                max=round(values[-1], digits) if values else None)


def pin(path):
    path = Path(path)
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return dict(path=str(path), bytes=path.stat().st_size, sha256=digest.hexdigest())


def clean(rows):
    """Collapse identical observations; reject ambiguous clocks/frames."""
    times, frames, duplicates = {}, {}, 0
    for row in rows:
        t = number(row.get('t'))
        if t is None:
            return None, 'missingOrInvalidClock', duplicates
        row = {**row, 't': t}
        if t in times:
            if times[t] != row:
                return None, 'conflictingDuplicateClock', duplicates
            duplicates += 1
            continue
        frame = row.get('frame')
        if frame is not None and frame in frames and frames[frame] != row:
            return None, 'conflictingDuplicateFrame', duplicates
        times[t] = row
        if frame is not None:
            frames[frame] = row
    return [times[t] for t in sorted(times)], None, duplicates


def connected(a, b, max_gap):
    return (0 < b['t'] - a['t'] <= max_gap + 1e-9
            and (a.get('frame') is None or b.get('frame') is None or b['frame'] == a['frame'] + 1))


def runs(valid, rows, max_gap):
    result, current = [], []
    for i, good in enumerate(valid):
        if current and (not good or not connected(rows[i - 1], rows[i], max_gap)):
            result.append(current)
            current = []
        if good:
            current.append(i)
    return result + ([current] if current else [])


def position_motion(rows, max_gap):
    """Centered position secants; one-sided at each contiguous run's endpoints."""
    for row in rows:
        row['x'], row['y'] = number(row.get('x')), number(row.get('y'))
    valid = [number(r.get('x')) is not None and number(r.get('y')) is not None for r in rows]
    for row in rows:
        row['speed'], row['travel'] = None, None
    for run in runs(valid, rows, max_gap):
        for k, i in enumerate(run):
            a, b = rows[run[max(0, k - 1)]], rows[run[min(len(run) - 1, k + 1)]]
            dt = b['t'] - a['t']
            if dt <= 0:
                continue
            vx, vy = (b['x'] - a['x']) / dt, (b['y'] - a['y']) / dt
            rows[i]['speed'] = math.hypot(vx, vy)
            if rows[i]['speed'] > 0:
                rows[i]['travel'] = math.degrees(math.atan2(vy, vx)) % 360


def isolated_excursions(rows, policy):
    flagged = set()
    for k in range(1, len(rows) - 1):
        a, b, c = rows[k - 1:k + 2]
        if any(angle(r.get('body')) is None for r in (a, b, c)):
            continue
        if not connected(a, b, policy['maxGapSeconds']) or not connected(b, c, policy['maxGapSeconds']):
            continue
        first, second = circular_difference(b['body'], a['body']), circular_difference(c['body'], b['body'])
        reverses_or_ambiguous = first * second < 0 or max(abs(first), abs(second)) >= 180 - 1e-9
        if (reverses_or_ambiguous and min(abs(first), abs(second)) >= policy['excursionDegrees']
                and abs(circular_difference(c['body'], a['body'])) <= policy['returnToleranceDegrees']):
            flagged.add(k)
    return flagged


def binof(speed, bins):
    if speed is not None:
        return next((f'{lo}-{hi} yd/s' for lo, hi in bins if lo <= speed < hi), None)
    return None


def collect(rows, omit_body, policy, frequency, extremes, audit):
    for channel, field in (('bodyRotation', 'body'), ('travelDirectionChange', 'travel')):
        valid = [angle(r.get(field)) is not None and (field != 'body' or i not in omit_body)
                 and (field != 'travel' or (number(r.get('speed')) is not None
                      and r['speed'] >= policy['minimumTravelSpeedYdS'])) for i, r in enumerate(rows)]
        best = {}
        for run in runs(valid, rows, policy['maxGapSeconds']):
            times = [rows[i]['t'] for i in run]
            for at, i in enumerate(run):
                row = rows[i]
                fb = binof(number(row.get('speed')), FREQUENCY_BINS)
                pb = binof(number(row.get('speed')), PATH_BINS)
                if at + 1 < len(run):
                    other = rows[run[at + 1]]
                    delta = abs(circular_difference(other[field], row[field]))
                    if fb:
                        frequency[fb][channel + 'DegS'].append(delta / (other['t'] - row['t']))
                        audit[channel + 'AdjacentPairs'] += 1
                        audit[channel + 'LargeAdjacentStepsAtLeast90'] += delta >= 90
                target = row['t'] + policy['windowSeconds']
                end_at = bisect_left(times, target - policy['endpointToleranceSeconds'] - 1e-9, lo=at + 1)
                end = (run[end_at] if end_at < len(run) and abs(times[end_at] - target)
                       <= policy['endpointToleranceSeconds'] + 1e-9 else None)
                if end is None:
                    if at + 1 < len(run):
                        reason = ('partialTerminalWindows' if rows[run[-1]]['t'] - row['t']
                                  < policy['windowSeconds'] - policy['endpointToleranceSeconds'] else 'windowsWithoutEndpoint')
                        audit[channel + ':' + reason] += 1
                    continue
                duration = rows[end]['t'] - row['t']
                delta = abs(circular_difference(rows[end][field], row[field]))
                if fb:
                    frequency[fb][channel + 'WindowDegrees'].append(delta)
                    frequency[fb][channel + 'WindowElapsedSeconds'].append(duration)
                if pb:
                    best[pb] = max(best.get(pb, 0), delta / duration)
            # 3deg/0.1s legacy deadband expressed as a rate for irregular clocks.
            k = 0
            while k < len(run) - 1:
                start, acc, j, sign = k, 0., k, 0
                while j < len(run) - 1:
                    a, b = rows[run[j]], rows[run[j + 1]]
                    delta = circular_difference(b[field], a[field])
                    if abs(delta) / (b['t'] - a['t']) < policy['turnDeadbandDegS'] - 1e-9:
                        if acc == 0:
                            start = j + 1
                        j += 1
                        continue
                    if sign and (delta > 0) != (sign > 0):
                        break
                    sign = 1 if delta > 0 else -1
                    acc += abs(delta)
                    j += 1
                    if acc >= policy['turnDegrees']:
                        pb = binof(number(rows[run[start]].get('speed')), PATH_BINS)
                        if pb:
                            extremes[pb][channel + 'Turn150Seconds'].append(rows[run[j]]['t'] - rows[run[start]]['t'])
                        break
                k = max(j, k + 1)
        for pb, value in best.items():
            extremes[pb][channel + 'Fastest02sDegSPerPath'].append(value)
    for i, row in enumerate(rows):
        fb = binof(number(row.get('speed')), FREQUENCY_BINS)
        if fb and i not in omit_body and angle(row.get('body')) is not None and angle(row.get('travel')) is not None:
            frequency[fb]['bodyVsTravelDegrees'].append(abs(circular_difference(row['body'], row['travel'])))


def summarize(frequency, extremes):
    result = dict(frequencyByStartSpeed={}, pathExtremesByEntrySpeed={})
    for lo, hi in FREQUENCY_BINS:
        name = f'{lo}-{hi} yd/s'
        bucket, out = frequency[name], {}
        for channel in ('bodyRotation', 'travelDirectionChange'):
            out[channel + 'DegS'] = stats(bucket[channel + 'DegS'])
            windows = bucket[channel + 'WindowDegrees']
            out[channel + 'SwingAtLeast90In02s'] = dict(n=len(windows), count=sum(v >= 90 for v in windows),
                share=round(sum(v >= 90 for v in windows) / len(windows), 4) if windows else None,
                elapsedSeconds=stats(bucket[channel + 'WindowElapsedSeconds'], 6))
        angles = bucket['bodyVsTravelDegrees']
        out['bodyVsTravelDegrees'] = stats(angles)
        out['bodyVsTravelShares'] = dict(n=len(angles), **{label: round(sum(test(v) for v in angles) / len(angles), 3)
            if angles else None for label, test in [('alignedBelow60', lambda a: a < 60),
            ('oblique60To120', lambda a: 60 <= a < 120), ('opposedAtLeast120', lambda a: a >= 120)]})
        result['frequencyByStartSpeed'][name] = out
    for lo, hi in PATH_BINS:
        name = f'{lo}-{hi} yd/s'
        result['pathExtremesByEntrySpeed'][name] = {channel + metric: stats(extremes[name][channel + metric], 6 if metric.endswith('Seconds') else 1)
            for channel in ('bodyRotation', 'travelDirectionChange')
            for metric in ('Fastest02sDegSPerPath', 'Turn150Seconds')}
    return result


def report(data):
    policy = POLICY.copy()
    quality = Counter(data.get('quality', {}))
    stores = [(defaultdict(lambda: defaultdict(list)), defaultdict(lambda: defaultdict(list)), Counter()) for _ in range(2)]
    elapsed, flags = [], []
    for path in data['paths']:
        rows, failure, duplicates = clean(path['rows'])
        quality['exactDuplicateRowsCollapsed'] += duplicates
        if failure:
            quality[failure + 'Paths'] += 1
            continue
        for row in rows:
            row['body'], row['travel'] = angle(row.get('body')), angle(row.get('travel'))
            speed = number(row.get('speed'))
            row['speed'] = speed if speed is not None and speed >= 0 else None
        if path.get('deriveMotion'):
            position_motion(rows, policy['maxGapSeconds'])
        if 'afterTime' in path:
            rows = [r for r in rows if r['t'] > path['afterTime']]
        if not rows:
            quality['noPostSnapRowsPaths'] += 1
            continue
        quality['retainedPaths'] += 1
        quality['retainedRows'] += len(rows)
        elapsed += [b['t'] - a['t'] for a, b in zip(rows, rows[1:])]
        quality['gapIntervals'] += sum(b['t'] - a['t'] > policy['maxGapSeconds'] + 1e-9 for a, b in zip(rows, rows[1:]))
        quality['frameIdGapIntervals'] += sum(a.get('frame') is not None and b.get('frame') is not None
            and b['frame'] != a['frame'] + 1 for a, b in zip(rows, rows[1:]))
        for field in ('body', 'travel', 'speed'):
            quality['missingOrInvalid:' + field] += sum((angle(r.get(field)) if field != 'speed' else number(r.get(field))) is None for r in rows)
        flagged = isolated_excursions(rows, policy)
        flags += [dict(path=path['id'], time=rows[i]['t'], frameId=rows[i].get('frame'),
            clockOrigin=path.get('clockOrigin'), bodyDegrees=rows[i]['body'],
            previousBodyDegrees=rows[i - 1]['body'], nextBodyDegrees=rows[i + 1]['body'],
            adjacentElapsedSeconds=[round(rows[i]['t'] - rows[i - 1]['t'], 6), round(rows[i + 1]['t'] - rows[i]['t'], 6)],
            endpointReturnDegrees=abs(circular_difference(rows[i + 1]['body'], rows[i - 1]['body']))) for i in sorted(flagged)]
        for omitted, (frequency, extremes, audit) in zip((set(), flagged), stores):
            collect(rows, omitted, policy, frequency, extremes, audit)
    output = dict(schemaVersion=2, measurementVersion=VERSION, source=data['source'], inputs=data['inputs'],
        eligibility=data['eligibility'], cadence=data['cadence'], quality=dict(quality),
        tool={**pin(__file__), 'python': sys.version.split()[0]}, policy=policy, observedStepSeconds=stats(elapsed, 6),
        filtering=dict(roles=sorted(DEFENDERS), angleRangeDegrees=[0, 360], speed='finite and nonnegative; no fitted upper-speed cutoff',
                       postSnap='NFL AFTER_SNAP or strictly after labelled ball_snap; simulator frame.t > 0',
                       conflicts='Reject whole player-play path; exact normalized observations collapse', interpolation=False),
        definitions=dict(angles='Shortest circular endpoint differences in degrees, same convention as orientation_motion_audit; o/facing is a body-orientation proxy, dir/position secant is travel direction.',
            windows='Complete observed nominal .2s windows only, no interpolation; divide by actual endpoint elapsed seconds. Missing angles and gaps split runs. Partial terminal windows are counted separately, never padded.',
            frequency='Adjacent-pair distributions and overlapping window shares, binned by speed at start. Alignment is frame-pooled. Every metric has its own n; observations are correlated, not independent athletes.',
            extremes='One fastest complete .2s endpoint-swing rate per player-play path and entry-speed bin; same-direction cumulative >=150deg marker uses a 30deg/s deadband (legacy 3deg per .1s). Neither measures physical turning capacity.',
            sensitivity='Raw retains excursions. Alternative omits a middle BODY frame with two >=90deg opposite shortest steps (or ambiguous 180deg steps) and <=15deg endpoint return, splitting body runs and alignment only. A flag is not proof of tracking error; travel is unchanged. Thresholds are declared analysis markers, not fitted NFL limits.',
            eligibility='Rows before timing/window filters; paths are unique game/play/player identities across declared tracking inputs (sim: replay/player slots). Only explicit CB/S/LB roles are eligible; unknown labels never become defenders.',
            cadence='Timestamps take precedence; naive NFL timestamps are explicitly UTC. Missing/invalid timestamps never fall back row by row. Without a time column, frameId times the declared cadence is required.',
            gapRule='Intervals above .15s or nonconsecutive frame IDs (when present) split runs for these nominal 10Hz audits; lower-cadence inputs are incompatible with this operator. No temporal interpolation.',
            quantiles='Legacy index min(n-1,floor(p*n)); angular rates rounded to 1 decimal, durations and clock statistics to 6 decimals. Empty summaries retain n=0 and null values.',
            comparison=data['comparison']))
    for label, (frequency, extremes, audit) in zip(('raw', 'withoutFlaggedBodyFrames'), stores):
        output[label] = {**summarize(frequency, extremes), 'opportunities': dict(audit)}
    output['orientationExcursions'] = dict(n=len(flags), examples=flags[:20], examplesTruncated=len(flags) > 20)
    failures = any(v and (k.startswith('missingOrInvalid:') or k.endswith('Paths') and k != 'retainedPaths'
                         or k == 'playsWithoutReplay') for k, v in quality.items())
    measured = sum(v['n'] for bucket in output['raw']['pathExtremesByEntrySpeed'].values() for v in bucket.values())
    measured += sum(bucket[channel + 'DegS']['n'] for bucket in output['raw']['frequencyByStartSpeed'].values()
                    for channel in ('bodyRotation', 'travelDirectionChange'))
    output['status'] = ('unavailable' if not measured else
                        'partial' if data['eligibility']['paths']['unknown'] or failures else 'ok')
    return output


def load_nfl(paths, roster=None, cadence=None):
    paths = [Path(p) for p in paths]
    if len({p.resolve() for p in paths}) != len(paths):
        raise ValueError('Repeated tracking input file')
    players = Path(roster) if roster else paths[0].with_name('players.csv')
    positions = defaultdict(set)
    if players.exists():
        with players.open() as handle:
            for row in csv.DictReader(handle):
                positions[row['nflId']].add((row.get('position') or '').strip().upper())
    counts = {unit: Counter(dict(eligible=0, excluded=0, unknown=0)) for unit in ('rows', 'paths')}
    reasons, quality, series, clocks = Counter(), Counter(), defaultdict(list), Counter()
    cohorts = defaultdict(set)
    identities = [pin(p) for p in paths] + ([pin(players)] if players.exists() else [dict(path=str(players), status='unavailable')])
    for input_index, path in enumerate(paths):
        with path.open() as handle:
            reader = csv.DictReader(handle)
            required = {'gameId', 'playId', 'nflId'}
            if not required.issubset(reader.fieldnames or []):
                raise ValueError(f'Missing required tracking columns in {path}: {sorted(required - set(reader.fieldnames or []))}')
            identities[input_index]['columns'] = reader.fieldnames
            timestamped = 'time' in reader.fieldnames
            for row in reader:
                nid = row.get('nflId', '')
                p = positions.get(nid, set())
                missing_id = nid in ('', 'NA', None)
                football = missing_id and row.get('club', '').lower() == 'football'
                reason = ('nonPlayer' if football else 'missingPlayerId' if missing_id
                          else 'missingPathIdentity' if not row.get('gameId') or not row.get('playId')
                          else 'rosterUnavailable' if not players.exists() else 'unmatchedPlayerId' if nid not in positions
                          else 'ambiguousPosition' if len(p) != 1 else 'missingPosition' if not next(iter(p))
                          else 'unknownPositionLabel' if next(iter(p)) not in DEFENDERS | OTHER_POSITIONS else 'position')
                state = ('excluded' if football else 'unknown' if reason != 'position'
                         else 'eligible' if next(iter(p)) in DEFENDERS else 'excluded')
                counts['rows'][state] += 1
                key = (row.get('gameId'), row.get('playId'), nid)
                cohorts[key].add((state, reason))
                if state == 'eligible':
                    # Inventory other roles without retaining their tracking payloads.
                    compact = {k: row.get(k) for k in ('time', 'frameId', 's', 'o', 'dir', 'frameType', 'event')}
                    series[key].append((compact, timestamped))
    normalized = []
    for key, cohort in cohorts.items():
        states = {state for state, _ in cohort}
        state = next(iter(states)) if len(states) == 1 else 'unknown'
        counts['paths'][state] += 1
        reasons[state + ':' + (next(iter(cohort))[1] if len(cohort) == 1 else 'conflictingEligibility')] += 1
        if state != 'eligible':
            continue
        records = series.pop(key)
        if len({timestamped for _, timestamped in records}) > 1:
            quality['mixedClockSourcesPaths'] += 1
            continue
        rows, clock_origin = [], None
        for row, timestamped in records:
            frame, t = number(row.get('frameId')), None
            if timestamped:
                try:
                    clock = datetime.fromisoformat(row.get('time', '').replace('Z', '+00:00'))
                    if clock.tzinfo is None:
                        clock = clock.replace(tzinfo=timezone.utc)
                    if clock_origin is None:
                        clock_origin = clock
                    # Subtract datetimes before converting: epoch floats lose precision
                    # at the legacy 3deg/.1s deadband boundary.
                    t = (clock - clock_origin).total_seconds()
                except (ValueError, TypeError):
                    pass
            elif cadence is not None and frame is not None and frame.is_integer() and frame >= 0:
                t = frame * cadence
            clocks['timestampRows' if timestamped else 'declaredCadenceRows' if cadence is not None else 'clockUnavailableRows'] += 1
            clocks['invalidClockRows'] += t is None
            rows.append(dict(t=t, frame=frame, speed=number(row.get('s')), body=angle(row.get('o')),
                             travel=angle(row.get('dir')), frameType=row.get('frameType'), event=row.get('event')))
        rows, failure, duplicates = clean(rows)
        quality['exactDuplicateRowsCollapsed'] += duplicates
        if failure:
            quality[failure + 'Paths'] += 1
            continue
        if any(r['frameType'] for r in rows):
            rows = [r for r in rows if r['frameType'] == 'AFTER_SNAP']
        else:
            snaps = [r['t'] for r in rows if r['event'] == 'ball_snap']
            if not snaps:
                quality['unknownSnapBoundaryPaths'] += 1
                continue
            rows = [r for r in rows if r['t'] > min(snaps)]
        if not rows:
            quality['noPostSnapRowsPaths'] += 1
            continue
        normalized.append(dict(id='/'.join(str(k) for k in key), rows=rows,
                               clockOrigin=clock_origin.isoformat() if clock_origin else None))
    return dict(source='Declared NFL-format tracking CSV; roster-confirmed CB/S/LB paths', inputs=identities,
        eligibility={**{k: dict(v) for k, v in counts.items()}, 'pathReasons': dict(reasons)}, quality=dict(quality), paths=normalized,
        cadence=dict(timestampPreferred=True, fallbackSeconds=cadence, naiveTimestampZone='UTC',
                     timestampSeconds='Relative to first encountered timestamp per path; origin retained in excursion examples', **clocks),
        comparison='NFL uses provider s, o, dir and AFTER_SNAP (or t > labelled ball_snap). Simulator uses recorded facing and centered position secants, with one-sided edge derivatives, at t > 0. Provider smoothing and o/dir semantics are not independently validated; record truncation and selected roles can differ. No gaze, force, technique-label or capacity inference.')


def nfl_main(view):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tracking', nargs='+', type=Path)
    parser.add_argument('--players', type=Path)
    parser.add_argument('--cadence', type=float, help='Declared seconds/frame without a time column; never overrides timestamps')
    args = parser.parse_args()
    if args.cadence is not None and (not math.isfinite(args.cadence) or args.cadence <= 0):
        parser.error('--cadence must be positive and finite')
    result = report(load_nfl(args.tracking, args.players, args.cadence))
    result['view'], result['entryPoint'] = view, pin(sys.argv[0])
    json.dump(result, sys.stdout, indent=2, allow_nan=False)
    print()
    return 1 if result['status'] == 'unavailable' else 0


if __name__ == '__main__':
    json.dump(report(json.load(sys.stdin)), sys.stdout, indent=2, allow_nan=False)
    print()
