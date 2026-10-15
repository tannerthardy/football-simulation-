"""Tracking-only YAC geometry; no engine simulations or outcome tuning.

nfl RAW_DIR OUT.json --games 4
sim CHECKPOINT_ROOT OUT.json
Same position/velocity operator for both; closest defender identity is held.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import gzip
import math
import statistics
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def digest(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def position(p, actor, t):
    q = max(0, min(len(p['xy']) - 1, t / p['dt']))
    lo, hi = int(q), min(len(p['xy']) - 1, math.ceil(q))
    u = q - lo
    return tuple(p['xy'][lo][2 * actor + j] * (1 - u) + p['xy'][hi][2 * actor + j] * u for j in range(2))


def velocity(p, actor, t):
    lo, hi = max(0, t - .1), min(p['end'], t + .1)
    if hi - lo < .05:
        return (0, 0)
    a, b = position(p, actor, lo), position(p, actor, hi)
    return tuple((b[j] - a[j]) / (hi - lo) for j in range(2))


def features(p):
    t, r = p['catch'], p['receiver']
    rp, rv = position(p, r, t), velocity(p, r, t)
    defenders = [i for i, a in enumerate(p['players']) if a['side'] == 'D']
    dist = lambda i, at: math.dist(position(p, i, at), position(p, r, at))
    d = min(defenders, key=lambda i: dist(i, t))
    dp, dv, distance = position(p, d, t), velocity(p, d, t), dist(d, t)
    ux, uy = (rp[0] - dp[0]) / max(1e-9, distance), (rp[1] - dp[1]) / max(1e-9, distance)
    rel = (dv[0] - rv[0], dv[1] - rv[1])
    closing = rel[0] * ux + rel[1] * uy
    cross = abs(rel[1] * ux - rel[0] * uy)
    speed = math.hypot(*rv)
    rear = (dp[0] - rp[0]) * rv[0] + (dp[1] - rp[1]) * rv[1]
    times = [t + k * .1 for k in range(int((min(p['end'], t + 1) - t) / .1 + 1e-6) + 1)]
    after = min(dist(d, at) for at in times)
    all_near = [(at, i) for at in times for i in defenders if dist(i, at) <= 1.5]
    first_near = min(all_near, default=None)
    return {'id': p['id'], 'receiver': p['players'][r]['id'], 'nearestAtCatch': p['players'][d]['id'],
            'coverage': p.get('coverage'), 'yac': p['yac'], 'outcome': p['outcome'],
            'catchDepth': rp[0], 'catchSpeed': speed, 'nearestGap': distance,
            'nearestSpeed': math.hypot(*dv), 'closing': closing, 'transverse': cross,
            'nearestBehind': rear < 0, 'nearestMinimumNext1s': after,
            'firstProximityWithin1s': None if first_near is None else
            {'delay': first_near[0] - t, 'defender': p['players'][first_near[1]]['id']},
            'oneSecondObserved': p['end'] >= t + 1 - 1e-9,
            'endDelay': p['end'] - t,
            'within5': sum(dist(i, t) <= 5 for i in defenders),
            'defendersAheadWithin12': sum(position(p, i, t)[0] >= rp[0] and dist(i, t) <= 12 for i in defenders)}


def stats(rows):
    def quant(v, q):
        v = sorted(v)
        if not v:
            return None
        k = (len(v) - 1) * q
        return v[int(k)] * (1 - k % 1) + v[math.ceil(k)] * (k % 1)
    keys = ['yac', 'catchDepth', 'catchSpeed', 'nearestGap', 'nearestSpeed', 'closing', 'transverse', 'within5', 'defendersAheadWithin12']
    return {'n': len(rows), **{k: {'mean': statistics.mean(r[k] for r in rows) if rows else None,
                                  'median': quant([r[k] for r in rows], .5),
                                  'p90': quant([r[k] for r in rows], .9)} for k in keys},
            'noProximityWithin1s': sum(r['firstProximityWithin1s'] is None for r in rows),
            'earlyEndingBefore1s': sum(not r['oneSecondObserved'] for r in rows),
            'nearestBehind': sum(r['nearestBehind'] for r in rows)}


def summary(rows):
    cells = {'all': rows, 'explosive20': [r for r in rows if r['yac'] >= 20],
             'ordinaryUnder10': [r for r in rows if r['yac'] < 10],
             'nearAtCatch3': [r for r in rows if r['nearestGap'] <= 3],
             'fastCatch7': [r for r in rows if r['catchSpeed'] >= 7]}
    return {k: stats(v) for k, v in cells.items()}


def nfl(raw, games):
    import sys
    sys.path.insert(0, str(ROOT / 'scripts/mechanics'))
    import nfl_bdb2025 as adapter
    adapter.DATA = raw
    pos, meta = adapter.load_meta()
    completed, penalties, receipts = {}, set(), {}
    with (raw / 'plays.csv').open(newline='') as f:
        for r in csv.DictReader(f):
            receipts[(r['gameId'], r['playId'])] = r
    with (raw / 'player_play.csv').open(newline='') as f:
        for r in csv.DictReader(f):
            key = r['gameId'], r['playId']
            if r['penaltyNames'] not in ('NA', ''):
                penalties.add(key)
            if r['hadPassReception'] == '1':
                completed[key] = (r['nflId'], float(r['yardageGainedAfterTheCatch']))
    selected, rows, skipped = [], [], []
    for key, tracking in adapter.stream([1], meta, pos):
        if key[0] not in selected:
            if len(selected) == games:
                break
            selected.append(key[0])  # Declared file order, before checking outcomes.
        if key not in completed or key in penalties or receipts[key]['playNullifiedByPenalty'] == 'Y':
            continue
        actual, yac = completed[key]
        m = {**meta[key], 'target': actual}
        p = adapter.convert(key, tracking, m, pos)
        if not p or 'catch' not in p['events']:
            skipped.append({'id': '-'.join(key), 'reason': 'missing full tracks or catch event'})
            continue
        ids = sorted({r[2]: r[8] for r in tracking if r[2] != 'NA'}.items(), key=lambda x: (x[1] != m['offense'], x[0]))
        for a, (pid, _) in zip(p['players'], ids):
            a['id'] = pid
        p.update(receiver=p['target'], catch=p['events']['catch'], end=p['events']['end'], yac=yac,
                 outcome=next((r[17] for r in tracking if r[17] in adapter.END_EVENTS), 'unknown'), coverage=m['coverage'])
        rows.append(features(p))
    return rows, {'selectedGames': selected, 'selection': 'First four whole games encountered in week1 file order, chosen before outcomes; no league-wide claim.',
                  'archiveSha256': '743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3',
                  'metadataSha256': {n: digest(raw / n) for n in ['plays.csv', 'players.csv', 'player_play.csv']},
                  'adapterSha256': digest(ROOT / 'scripts/mechanics/nfl_bdb2025.py'), 'skipped': skipped}


def sim(root, fixtures):
    rows, provenance = [], {}
    for name in fixtures:
        path = root / name / 'game.json.gz'
        game = json.loads(gzip.decompress(path.read_bytes()))
        provenance[name] = {'sha256': digest(path), 'engine': game['provenance']}
        for p in game['log']:
            if p.get('foul') or p.get('nullified') or not p.get('stats', {}).get('completed'):
                continue
            replay = p['replay']
            c = next(e for e in replay['events'] if e['type'] == 'catch')
            frames = replay['frames']
            # Native saved positions are at 10 Hz with rounding to .1 yd.
            # All packets here start at t=0 and sample every .1 until the final frame.
            # Regrid with interpolation to avoid treating a fractional final frame as .1 later.
            times = [f['t'] for f in frames]
            xy = []
            for k in range(round(times[-1] * 10) + 1):
                t = min(k * .1, times[-1])
                hi = next((i for i, at in enumerate(times) if at >= t - 1e-9), len(times) - 1)
                lo = max(0, hi - 1)
                u = (t - times[lo]) / max(1e-9, times[hi] - times[lo]) if hi != lo else 0
                xy.append([frames[lo]['agents'][3 * i + j] * (1 - u) + frames[hi]['agents'][3 * i + j] * u
                           - (replay['los'] if j == 0 else 0) for i in range(22) for j in range(2)])
            players = [{**a, 'side': a['team'], 'id': f"{i}:{a['slot']}"} for i, a in enumerate(replay['players'])]
            players[c['a']]['id'] = p['stats']['receiver']
            common = {'id': f"{name}/P{p['index'] + 1}", 'receiver': c['a'], 'players': players,
                      'xy': xy, 'dt': .1, 'catch': c['t'], 'end': min(times[-1], (len(xy) - 1) * .1),
                      'yac': p['stats']['yac'], 'outcome': p['outcome'], 'coverage': p.get('plan', {}).get('coverage')}
            rows.append(features(common))
    return rows, provenance


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['nfl', 'sim'])
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--games', type=int, default=4)
    parser.add_argument('--fixtures', nargs='+', default=['zone-reference', 'spread-air', 'power-zone', 'west-spread'])
    args = parser.parse_args()
    began = time.perf_counter()
    rows, provenance = nfl(args.input, args.games) if args.mode == 'nfl' else sim(args.input, args.fixtures)
    packet = {'schema': 'yac-arrival-geometry-v1', 'mode': args.mode, 'provenance': provenance,
              'operatorSha256': digest(__file__), 'seconds': time.perf_counter() - began,
              'definitions': 'Actual receiver; nearest defender selected once at catch; central position difference over +/- .1 s, clipped at ending. Swept trajectory not a grip/force or official missed-tackle measurement. 1.5 yd proximity proxy; early endings retained separately. NFL YAC from actual receiver label; sim native YAC. Both exclude all flagged player penalties/nullifications.',
              'summary': summary(rows), 'rows': rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(packet, indent=2) + '\n')
    print(json.dumps({'mode': args.mode, 'catches': len(rows), 'seconds': packet['seconds'],
                      'summary': {k: {a: v[a] for a in ['n', 'noProximityWithin1s', 'earlyEndingBefore1s']} for k, v in packet['summary'].items()}}))
