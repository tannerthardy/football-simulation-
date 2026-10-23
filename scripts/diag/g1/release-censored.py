#!/usr/bin/env python3
"""Censor-aware companion to the historical #221 review's release.py.

python3 -I scripts/diag/g1/release-censored.py base=plays.jsonl.gz candidate=plays.jsonl.gz --out out/g1/release.json

Reads saved common plays only. Raw stored positions, one-sided velocities,
fixed initial blocker, real .2s elapsed clearance, explicit exposure/censoring.
Its numbers are NOT compatible with the historical NFL54%/0.18yd/s operator.
"""
import argparse
import gzip
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

OPERATOR = 'g1-release-reconstructed-v1'
NEAR = 1.0
CLEAR_SECONDS = .2
POST_SECONDS = .3
EPS = 1e-8


def number(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


def position(raw, i, k):
    if not 0 <= k < len(raw['xy']):
        return None
    row = raw['xy'][k]
    if not isinstance(row, list) or len(row) < 2 * i + 2:
        return None
    p = number(row[2 * i]), number(row[2 * i + 1])
    return p if None not in p else None


def dist(a, b):
    return math.dist(a, b) if a is not None and b is not None else None


def crossing(raw, c, start, last, threshold):
    """First at/past sample needs a consecutive valid negative-side bracket."""
    previous = None
    unknown = 0
    for k in range(start, last + 1):
        p = position(raw, c, k)
        if p is None:
            unknown += 1
            previous = None
            continue
        if p[0] >= threshold:
            if previous is not None and previous[0] == k - 1 and previous[1] < threshold:
                return {'status': 'observed', 'frame': k, 'time': k * raw['dt'], 'unknownBefore': unknown}
            return {'status': 'unbracketed_at_or_past', 'frame': None, 'time': None, 'unknownBefore': unknown}
        previous = k, p[0]
    return {'status': 'unknown_missing_samples' if unknown else 'not_reached_within_boundary',
            'frame': None, 'time': None, 'unknownBefore': unknown}


def near_state(raw, d, off, k):
    dp = position(raw, d, k)
    if dp is None:
        return 'unknown'
    distances = [dist(dp, position(raw, o, k)) for o in off]
    if any(v is not None and v <= NEAR for v in distances):
        return 'near'
    return 'unknown' if any(v is None for v in distances) else 'clear'


def stats(values):
    vals = sorted(values)
    def percentile(q):
        x = q * (len(vals) - 1)
        lo = math.floor(x)
        return vals[lo] + (vals[math.ceil(x)] - vals[lo]) * (x - lo)
    return {'n': len(vals), 'mean': sum(vals) / len(vals) if vals else None,
            **{name: percentile(q) if vals else None for name, q in [('p25', .25), ('p50', .5), ('p75', .75)]}}


def episode(raw, d, b, off, los, five, last):
    dt = raw['dt']
    start = los['frame']
    states = {k: near_state(raw, d, off, k) for k in range(start, last + 1)}
    clear_start = None
    release = None
    for k, state in states.items():
        if state != 'clear':
            clear_start = None
        else:
            clear_start = k if clear_start is None else clear_start
            if (k - clear_start) * dt >= CLEAR_SECONDS - EPS:
                release = {'frame': clear_start, 'time': clear_start * dt,
                           'confirmedFrame': k, 'confirmedTime': k * dt,
                           'secondsAfterLOS': (clear_start - start) * dt}
                break
    # A drift interval must end before clear onset and keep the SAME initial
    # blocker within1yd at both endpoints. No released motion enters the mean.
    drift = []
    drift_until = release['frame'] - 1 if release else last
    for k in range(start + 1, drift_until + 1):
        d0, d1 = position(raw, d, k - 1), position(raw, d, k)
        b0, b1 = position(raw, b, k - 1), position(raw, b, k)
        if any(p is None for p in (d0, d1, b0, b1)):
            continue
        l0, l1 = math.dist(d0, b0), math.dist(d1, b1)
        if not EPS < l0 <= NEAR or l1 > NEAR:
            continue
        relative = [(d1[j] - b1[j] - d0[j] + b0[j]) / dt for j in (0, 1)]
        radial = sum(relative[j] * (d0[j] - b0[j]) / l0 for j in (0, 1))
        drift.append({'frame': k, 'endTime': k * dt, 'radialYdPerSecond': radial})
    post = {'status': 'no_confirmed_release', 'towardRunnerSpeed': None}
    if release:
        target = release['time'] + POST_SECONDS
        k = round(target / dt)
        post = {'status': 'unavailable_checkpoint', 'time': target, 'frame': None, 'towardRunnerSpeed': None}
        if abs(k * dt - target) <= EPS and 0 < k <= last:
            state = states.get(k, 'unknown')
            if any(states[j] == 'unknown' for j in range(release['frame'], k + 1)):
                post['status'] = 'unknown_observations'
            elif any(states[j] == 'near' for j in range(release['frame'], k + 1)):
                post['status'] = 'recontact_before_checkpoint'
            elif state == 'clear':
                d0, d1 = position(raw, d, k - 1), position(raw, d, k)
                cp = position(raw, raw['carrier'], k)
                if d0 is not None and d1 is not None and cp is not None:
                    length = math.dist(cp, d1)
                    if length > EPS:
                        velocity = [(d1[j] - d0[j]) / dt for j in (0, 1)]
                        post = {'status': 'observed', 'time': k * dt, 'frame': k,
                                'towardRunnerSpeed': sum(velocity[j] * (cp[j] - d1[j]) / length for j in (0, 1))}
                    else:
                        post['status'] = 'coincident_runner'
                else:
                    post['status'] = 'unknown_observations'
    five_observed = five['status'] == 'observed'
    unknown_before_five = five_observed and any(states[k] == 'unknown' for k in range(start, five['frame'] + 1))
    confirmed_by_five = bool(release and five_observed and release['confirmedFrame'] <= five['frame'])
    started_by_five = bool(release and five_observed and release['frame'] <= five['frame'])
    return {'playId': raw.get('id'), 'source': raw.get('source'), 'cell': raw.get('cell'),
            'carrier': raw['carrier'], 'defender': d, 'fixedBlocker': b,
            'los': los, 'five': five, 'release': release,
            'releaseStatus': 'observed' if release else 'unknown_missing_observations' if 'unknown' in states.values() else 'not_observed_within_boundary',
            'freeByFive': {'exposed': five_observed,
                           'confirmed': True if confirmed_by_five else None if unknown_before_five else False if five_observed else None,
                           'retrospectiveStartBeforeFive': started_by_five if five_observed else None},
            'unknownFrames': sum(s == 'unknown' for s in states.values()),
            'drift': {'definition': 'One-sided defender-minus-fixed-blocker velocity projected on interval-start outward radial axis; both endpoints within1yd before first confirmed-clear onset.',
                      'intervals': drift, 'episodeMean': sum(v['radialYdPerSecond'] for v in drift) / len(drift) if drift else None},
            'postRelease0p3': post}


def analyze(raw):
    if 'common' in raw:
        raw = raw['common']
    if raw.get('kind') != 'run':
        return {'status': 'excluded', 'reason': 'not_designed_run', 'episodes': []}
    c, players = raw.get('carrier'), raw.get('players', [])
    if not isinstance(c, int) or isinstance(c, bool) or not 0 <= c < len(players) or players[c].get('group') != 'RB' or players[c].get('side') != 'O':
        return {'status': 'excluded', 'reason': 'missing_or_non_RB_carrier', 'episodes': []}
    dt = number(raw.get('dt'))
    end = number((raw.get('events') or {}).get('end'))
    handoff = number((raw.get('events') or {}).get('handoff'))
    if dt is None or dt <= 0 or end is None or handoff is None or handoff < 0 or not raw.get('xy'):
        return {'status': 'excluded', 'reason': 'invalid_clock_handoff_or_end_boundary', 'episodes': []}
    raw = {**raw, 'dt': dt}
    recording_end = (len(raw['xy']) - 1) * dt
    boundary = min(end, recording_end)
    boundary_kind = 'recording_censor' if recording_end < end - EPS else 'supplied_end_boundary'
    for name, value in (raw.get('events') or {}).items():
        t = number(value)
        if t is not None and ('fumble' in name.lower() or 'interception' in name.lower()) and 0 <= t <= boundary:
            boundary, boundary_kind = t, 'observed_possession_change_censor'
    start = max(0, math.ceil((handoff - EPS) / dt))
    last = min(len(raw['xy']) - 1, math.floor((boundary + EPS) / dt))
    if boundary_kind == 'observed_possession_change_censor':
        last = min(last, math.ceil((boundary - EPS) / dt) - 1)
    if start > last:
        return {'status': 'excluded', 'reason': 'handoff_outside_live_recording', 'episodes': []}
    los = crossing(raw, c, start, last, 0)
    if los['status'] != 'observed':
        return {'status': 'excluded', 'reason': 'unobserved_LOS_crossing_' + los['status'], 'episodes': []}
    five = crossing(raw, c, los['frame'], last, 5)
    off = [i for i, p in enumerate(players) if p.get('side') == 'O' and i != c]
    eps, skipped = [], Counter()
    for d in [i for i, p in enumerate(players) if p.get('side') == 'D' and p.get('group') == 'DL']:
        dp = position(raw, d, los['frame'])
        distances = [(dist(dp, position(raw, b, los['frame'])), b) for b in off]
        if not off or dp is None or any(v is None for v, _ in distances):
            skipped['unknown_initial_defender_or_blocker'] += 1
            continue
        nearest, b = min(distances)
        if nearest <= NEAR:
            item = episode(raw, d, b, off, los, five, last)
            item['analysisBoundary'] = {'kind': boundary_kind, 'time': boundary, 'lastObservedFrame': last}
            eps.append(item)
        else:
            skipped['not_near_at_LOS'] += 1
    return {'status': 'analyzed', 'playId': raw.get('id'), 'episodes': eps,
            'fiveCrossing': five, 'skippedDL': dict(skipped), 'analysisBoundary': boundary_kind}


def summary(plays):
    analyzed = [p for p in plays if p['status'] == 'analyzed']
    episodes = [e for p in analyzed for e in p['episodes']]
    exposed = [e for e in episodes if e['freeByFive']['exposed']]
    yes = sum(e['freeByFive']['confirmed'] is True for e in exposed)
    unknown = sum(e['freeByFive']['confirmed'] is None for e in exposed)
    return {'rows': len(plays), 'analyzedRunsCrossingLOS': len(analyzed), 'blockedDLEpisodesAtLOS': len(episodes),
            'exclusions': dict(Counter(p['reason'] for p in plays if p['status'] == 'excluded')),
            'fiveCrossingExposureByPlay': dict(Counter(p['fiveCrossing']['status'] for p in analyzed)),
            'fiveCrossingExposureByBlockedEpisode': dict(Counter(e['five']['status'] for e in episodes)),
            'blockedEpisodeAnalysisBoundaries': dict(Counter(e['analysisBoundary']['kind'] for e in episodes)),
            'freeByFive': {'observedFiveDenominator': len(exposed), 'confirmedReleaseByFive': yes,
                           'unknownBeforeFive': unknown, 'unreachedOrUnobservedFive': len(episodes) - len(exposed),
                           'observedConfirmedFractionLowerBound': yes / len(exposed) if exposed else None,
                           'fractionUpperBoundIncludingUnknown': (yes + unknown) / len(exposed) if exposed else None,
                           'retrospectiveStartBeforeFive': sum(e['freeByFive']['retrospectiveStartBeforeFive'] is True for e in exposed)},
            'releaseStatus': dict(Counter(e['releaseStatus'] for e in episodes)),
            'releaseSecondsAfterLOSObservedOnly': stats([e['release']['secondsAfterLOS'] for e in episodes if e['release']]),
            'blockedRadialDriftEpisodeMeanYdPerSecond': stats([e['drift']['episodeMean'] for e in episodes if e['drift']['episodeMean'] is not None]),
            'blockedRadialDriftPooledIntervalsYdPerSecond': stats([v['radialYdPerSecond'] for e in episodes for v in e['drift']['intervals']]),
            'postRelease0p3Exposure': dict(Counter(e['postRelease0p3']['status'] for e in episodes)),
            'postRelease0p3TowardRunnerSpeedYdPerSecond': stats([e['postRelease0p3']['towardRunnerSpeed'] for e in episodes if e['postRelease0p3']['status'] == 'observed'])}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('inputs', nargs='+', help='LABEL=common.jsonl[.gz]')
    ap.add_argument('--out', type=Path)
    args = ap.parse_args()
    result = {'operator': OPERATOR,
              'operatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'historicalNumericCompatibility': False,
              'definitions': {'release': 'All known noncarrier offense strictly farther than1yd for consecutive samples spanning at least .2s. First-clear timestamp plus confirmation retained. Unknown resets clearance.',
                              'freeByFive': 'Denominator only actually observed consecutive-valid runner +5 crossings; primary requires release confirmation by that sample. Retrospective clear onset is separate; unknowns give bounds.',
                              'driftWeighting': 'Episode means have equal episode weight; pooled one-sided intervals are separately weighted per interval. No re-quantization or smoothing.',
                              'post': 'Actual aligned live release+.3 checkpoint, continuously clear since release; one-sided defender velocity toward current runner position. No interpolation/clamping.'},
              'limits': ['Reconstructed from published contract, not original release.py bytes; cannot reproduce or numerically compare the historical NFL54%/+0.18yd/s rows.',
                         'Proximity release is not engine disengagement, a continuous physical block, a shed technique, or a causal force measurement.',
                         'Common events.end may be whistle or recording cutoff. This operator bounds exposure but cannot recover missing terminal provenance.',
                         'Fixed carrier identity follows a labeled RB; unrecorded possession changes cannot be recovered.',
                         'Source adapters may already resample/impute or omit identities; this operator cannot undo that. It uses supplied raw xy without further interpolation or rounding.',
                         'Observed-release medians condition on a recorded release; unresolved episodes remain explicitly counted, not assigned infinite or zero release times.'],
              'inputs': []}
    for item in args.inputs:
        label, path = item.split('=', 1)
        p = Path(path)
        digest = hashlib.sha256()
        with p.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(block)
        source_sha = digest.hexdigest()
        opener = gzip.open if p.suffix == '.gz' else open
        with opener(p, 'rt') as stream:
            plays = [analyze(json.loads(line)) for line in stream if line.strip()]
        result['inputs'].append({'label': label, 'path': str(p), 'bytes': p.stat().st_size,
                                 'sha256': source_sha, 'summary': summary(plays), 'plays': plays})
    data = json.dumps(result, indent=1, allow_nan=False) + '\n'
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(data)
    else:
        print(data, end='')


if __name__ == '__main__':
    main()
