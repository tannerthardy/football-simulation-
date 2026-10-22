#!/usr/bin/env python3
"""Where pass pressure comes from: one operator for tracked and simulated
dropbacks in the common play format (scripts/mechanics/metrics.Play), so
both sides are measured by identical code. Observation only.

Per dropback, from 0.5 s to the throw (or 4 s / the end):
  pressure    the first frame a defender is within 2 yd of the QB
              (metrics.py's definition); the pressurer is that defender
  hazard      pressures per dropback still clean, unthrown and live, by
              0.5 s bin: the rate the pocket breaks, apart from when the QB
              throws
  rushers     defenders who cross 1 yd behind the line by 2.5 s
              (metrics.py), aligned on the edge (outside the tackle) or
              inside; who blocks each: the protector (OL/TE/RB) with most
              frames within 1.5 yd of him after 0.3 s (none: unblocked);
              doubled: two protectors within 1.5 yd on 3+ frames
  win         a blocked rusher is past his blocker when he is 0.3 yd
              nearer the QB than him (the blocker no longer between); the
              rep holds until then. An edge rusher reaching the tackle's
              depth (0.3 yd deeper) is reported apart: tackles ride arcs
              past the QB. Way: outside or inside the blocker where he got past
              (lateral side relative to the QB), or not past him by the
              pressure (driven back into the QB)
  pocket      OL mean depth behind the line at 1, 2 and 3 s

    python3 -I scripts/diag/passpro/pressure.py PLAYS.jsonl.gz [PLAYS ...] [--limit N]
"""
import gzip
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'mechanics'))
from metrics import ENGAGED_YD, PRESSURE_OPERATOR, Play  # noqa: E402

FILES = [a for a in sys.argv[1:] if a.endswith('.gz')]
LIMIT = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
PROTECT = {'OL', 'TE', 'RB'}


def slots(p):
    """OL by lateral order at the snap: T G C G T (None unless five)."""
    ol = sorted(p.who('O', 'OL'), key=lambda i: p.pos(i, 0)[1] if p.pos(i, 0)[1] is not None else 0)
    if len(ol) != 5:
        return None
    return dict(zip(ol, ['T', 'G', 'C', 'G', 'T'])), ol


def measure(p, acc):
    qbs = p.who('O', 'QB')
    if p.raw.get('kind') != 'pass' or len(qbs) != 1:
        return
    qb = qbs[0]
    s = slots(p)
    if s is None or p.pos(qb, 0)[0] is None:
        return
    slot, ol = s
    by = p.raw['ball_y']
    throw = p.events.get('pass_forward')
    end = min(p.end, throw if throw is not None else 4.0)
    if end < 0.6:
        return
    acc['plays'] += 1
    D = p.who('D')
    prot = [i for i in p.who('O') if p.players[i]['group'] in PROTECT]
    k1 = p.k(end)
    pressure = p.pressure(qb)
    pk = pressure.first
    acc['pressureObserved'] += pressure.value is not None
    acc['pressureUnknown'] += pressure.value is None
    # Hazard: at risk while clean, unthrown and live.
    for b in range(1, 8):
        lo, hi = b * .5, b * .5 + .5
        if not pressure.complete or end <= lo or (pk is not None and pk * p.dt < lo):
            continue
        acc['risk'][lo] += 1
        if pk is not None and lo <= pk * p.dt < hi:
            acc['hit'][lo] += 1
    for t in (1.0, 2.0, 3.0):
        if p.live(t) and t <= end:
            xs = [p.pos(o, p.k(t))[0] for o in ol]
            if None not in xs:
                acc[f'pocket{t:.0f}'].append(-sum(xs) / 5)
    # Rushers and who blocks them.
    rush_end = p.k(min(end, 2.5))
    rushers = [d for d in D if min((p.pos(d, k)[0] for k in range(0, rush_end + 1) if p.pos(d, k)[0] is not None), default=9) <= -1.0]
    tack = {1: max(p.pos(o, 0)[1] - by for o in ol), -1: min(p.pos(o, 0)[1] - by for o in ol)}
    acc['rushers'].append(len(rushers))
    kp = pk if pk is not None else k1
    info = {}
    for d in rushers:
        y0 = p.pos(d, 0)[1] - by
        side = 1 if y0 > 0 else -1
        spot = 'edge' if abs(y0) > abs(tack[side]) + .5 else 'inside'
        frames = Counter()
        doubled = 0
        for k in range(p.k(.3), kp + 1):
            near = [o for o in prot if p.dist(o, d, k) <= ENGAGED_YD]
            frames.update(near)
            doubled += len(near) >= 2
        blocker = frames.most_common(1)[0][0] if frames and frames.most_common(1)[0][1] >= 3 else None
        who = None if blocker is None else slot.get(blocker, p.players[blocker]['group'])
        beat = None
        if blocker is not None:
            beat = next((k for k in range(p.k(.3), k1 + 1)
                         if p.dist(d, qb, k) < p.dist(blocker, qb, k) - .3), None)
            deep = next((k for k in range(p.k(.3), k1 + 1)
                         if p.pos(d, k)[0] is not None and p.pos(blocker, k)[0] is not None
                         and p.pos(d, k)[0] < p.pos(blocker, k)[0] - .3), None)
            if who == 'T' and spot == 'edge':
                acc['edge_deep'].append(math.inf if deep is None else deep * p.dt)
                acc['edge_beat'].append(math.inf if beat is None else beat * p.dt)
        g = p.players[d]['group']
        info[d] = (spot, who, blocker, doubled >= 3, g, beat)
        key = f"{spot} {g}"
        acc['rusher_kind'][key] += 1
        acc['blocked_by'][f"{spot}: {who or 'unblocked'}"] += 1
        if doubled >= 3:
            acc['doubled'][spot] += 1
        if blocker is not None and who in ('T', 'G', 'C'):
            # Rep survival: still in front of his man at t (censored by the throw).
            for t in (1.0, 1.5, 2.0, 2.5, 3.0):
                if t > end:
                    break
                acc['rep_risk'][(who, t)] += 1
                if beat is not None and beat * p.dt <= t:
                    acc['rep_lost'][(who, t)] += 1
    if pk is None:
        return
    acc['pressured'] += 1
    acc['ttp'].append(pk * p.dt)
    d = min(D, key=lambda i: p.dist(i, qb, pk))
    if d not in info:
        acc['by'][f"non-rusher {p.players[d]['group']}"] += 1
        return
    spot, who, blocker, dbl, g, beat = info[d]
    if blocker is None:
        acc['by'][f'{spot} {g}: unblocked'] += 1
        acc['way']['unblocked'] += 1
        return
    acc['by'][f'{spot} {g}: beat {who}'] += 1
    if beat is None or beat > pk:
        way = 'on the block (driven back)'
    else:
        # The side he got past on, where he got past.
        (_, yd), (_, yb), (_, yq) = p.pos(d, beat), p.pos(blocker, beat), p.pos(qb, beat)
        way = 'outside' if (yd - yb) * (yb - yq) > 0 else 'inside'
        acc['beat_t'][spot].append(beat * p.dt)
    acc['way'][way] += 1
    acc['way_by'][f'{spot}: {way}'] += 1


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else math.nan


def pct(c, n, k=8):
    return '  '.join(f'{key} {100 * v / n:.0f}%' for key, v in c.most_common(k))


for path in FILES:
    acc = defaultdict(list)
    for key in ('plays', 'pressured', 'pressureObserved', 'pressureUnknown'):
        acc[key] = 0
    acc['beat_t'] = defaultdict(list)
    acc['edge_deep'], acc['edge_beat'] = [], []
    for key in ('risk', 'hit', 'rusher_kind', 'blocked_by', 'doubled', 'by', 'way', 'way_by', 'rep_risk', 'rep_lost'):
        acc[key] = Counter()
    with gzip.open(path, 'rt') as f:
        for n, line in enumerate(f):
            if LIMIT and n >= LIMIT:
                break
            measure(Play(json.loads(line)), acc)
    N, P = acc['plays'], acc['pressured']
    R = sum(acc['rusher_kind'].values())
    observed = acc['pressureObserved']
    rate = f"{100 * P / observed:.1f}%" if observed else 'unknown'
    print(f"== {Path(path).name}: {N} dropbacks, pressured {rate} (known {observed}, unknown {acc['pressureUnknown']}; {PRESSURE_OPERATOR}), time to pressure p25/50/75 "
          f"{q(acc['ttp'], .25):.2f}/{q(acc['ttp'], .5):.2f}/{q(acc['ttp'], .75):.2f}")
    print('   hazard per 0.5 s (complete windows only; pressures / clean, unthrown, live): ' + '  '.join(
        f"{lo:.1f}-{lo + .5:.1f} {100 * acc['hit'][lo] / acc['risk'][lo]:.1f}% (n {acc['risk'][lo]})" for lo in sorted(acc['risk']) if acc['risk'][lo]))
    print('   pocket: OL depth p50 at 1/2/3 s ' + ' / '.join(f"{q(acc[f'pocket{t}'], .5):.2f}" for t in (1, 2, 3)))
    print(f"   rushers per dropback: {pct(Counter(acc['rushers']), N, 5)}")
    print(f"   rushers: {pct(acc['rusher_kind'], R)}")
    print(f"   blocked by: {pct(acc['blocked_by'], R, 12)}")
    print(f"   doubled: " + '  '.join(f"{s} {100 * acc['doubled'][s] / max(1, sum(v for k, v in acc['rusher_kind'].items() if k.startswith(s))):.0f}%" for s in ('edge', 'inside')))
    print('   rep holds (blocker still in front) at t, by blocker: ' + ' | '.join(
        f"{w}: " + ' '.join(f"{t:.1f}s {100 * (1 - acc['rep_lost'][(w, t)] / acc['rep_risk'][(w, t)]):.0f}%" for t in (1.0, 1.5, 2.0, 2.5, 3.0) if acc['rep_risk'][(w, t)])
        for w in ('T', 'G', 'C')))
    print(f"   pressure by: {pct(acc['by'], P, 12)}")
    print(f"   way: {pct(acc['way'], P)}")
    print(f"   way by spot: {pct(acc['way_by'], P)}")
    ed, eb = acc['edge_deep'], acc['edge_beat']
    if ed:
        print('   edge on a tackle: share at the tackle\'s depth / past him (nearer the QB) by 1.0/1.5/2.0/2.5 s: ' + '  '.join(
            f"{t:.1f}s {100 * sum(x <= t for x in ed) / len(ed):.0f}/{100 * sum(x <= t for x in eb) / len(eb):.0f}%" for t in (1.0, 1.5, 2.0, 2.5)) + f' (n {len(ed)}, censored at the throw)')
    print('   pressurer got past his blocker at p25/50/75: ' + ' | '.join(
        f"{s} {q(v, .25):.2f}/{q(v, .5):.2f}/{q(v, .75):.2f} (n {len(v)})" for s, v in sorted(acc['beat_t'].items())))
