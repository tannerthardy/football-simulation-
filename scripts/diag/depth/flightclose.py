"""COV-1: where closing during the flight is lost, one operator for NFL tracking and sim
common plays (zone coverage only). x is downfield; D0 is the defender nearest the target at the
throw. Sections:
  A. the closing metric (metrics' air.defender_closing) by separation at the throw, with the
     second file re-weighted to the first file's separation mix (pass NFL first);
  B. D0's speed toward the target from -0.4 to +0.8 s around the throw, by band (the ramp after
     the throw is seeing + reacting + running);
  C. D0's state at the throw when the target is under him: downfield speed, speed toward target;
  D. every zone defender 3+ yd off the ball (not rushing): downfield speed around the throw and
     the share running downfield faster than 4 yd/s at the throw.
usage: flightclose.py NFL_PLAYS SIM_PLAYS [SIM_PLAYS...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 2) if v else None
BANDS = ((0, 2), (2, 4), (4, 6), (6, 99))
LAGS = (-.4, -.2, 0, .2, .4, .6, .8)
REL = (-1.0, -.6, -.4, -.2, 0, .2, .4)
name = lambda b: f'{b[0]}-{b[1]}' if b[1] < 99 else f'{b[0]}+'


def toward(p, d, r, k):
    (rx, ry), (dx, dy) = p.pos(r, k), p.pos(d, k)
    if rx is None or dx is None: return None
    gx, gy = rx - dx, ry - dy; n = math.hypot(gx, gy) or 1
    vx, vy = p.velocity(d, k)
    return (vx * gx + vy * gy) / n


def measure(path):
    o = {'A': {b: [] for b in BANDS}, 'B': {b: {l: [] for l in LAGS} for b in BANDS},
         'C': {b: ([], []) for b in BANDS}, 'D': {g: ({t: [] for t in REL}, [0, 0]) for g in ('under', 'deep')}}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; t0, t1 = ev.get('pass_forward'), ev.get('pass_arrived')
        if t0 is None or coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
        p = Play(raw); k0 = p.k(t0)
        for d in p.who('D'):
            x0, x1 = p.pos(d, 0)[0], p.pos(d, p.k(1))[0]
            if x0 is None or x1 is None or x0 < 3 or x1 < x0 - .5 or p.pos(d, k0)[0] is None: continue
            curve, fast = o['D']['under' if x0 < 9 else 'deep']
            fast[1] += 1; fast[0] += p.velocity(d, k0)[0] > 4
            for t in REL:
                if t0 + t >= 0 and p.live(t0 + t) and p.pos(d, p.k(t0 + t))[0] is not None:
                    curve[t].append(p.velocity(d, p.k(t0 + t))[0])
        r = raw.get('target')
        if r is None or t1 is None or t1 <= t0 or p.pos(r, k0)[0] is None: continue
        k1 = p.k(t1); s0, s1 = p.nearest(r, k0), p.nearest(r, k1)
        if s0 is None or s1 is None: continue
        d = min((x for x in p.who('D') if p.pos(x, k0)[0] is not None), key=lambda x: p.dist(x, r, k0))
        b = next(b for b in BANDS if b[0] <= s0 < b[1])
        o['A'][b].append(s0 - s1)
        for l in LAGS:
            if t0 + l <= t1 + 1e-9 and p.live(t0 + l):
                v = toward(p, d, r, p.k(t0 + l))
                if v is not None: o['B'][b][l].append(v)
        if p.pos(d, k0)[0] > p.pos(r, k0)[0]:
            o['C'][b][0].append(p.velocity(d, k0)[0]); o['C'][b][1].append(toward(p, d, r, k0))
    return o


ref = None
for path in sys.argv[1:]:
    o = measure(path); A = o['A']; tot = sum(len(v) for v in A.values())
    print(f"{path.split('/')[-1]}: zone throws {tot}")
    print('  A. closing by separation at the throw (share / mean / p50):  ' + '  '.join(
        f'{name(b)}: {len(A[b]) / tot:.2f} / {mean(A[b])} / {q(A[b])}' for b in BANDS)
        + f'  | all: mean {mean([x for v in A.values() for x in v])}, p50 {q([x for v in A.values() for x in v])}')
    if ref is None: ref = {b: len(A[b]) / tot for b in BANDS}
    else: print(f"     re-weighted to the first file's separation mix: mean {round(sum(ref[b] * sum(A[b]) / len(A[b]) for b in BANDS if A[b]), 2)}")
    print('  B. D0 speed toward the target (yd/s), p50 at lags around the throw:')
    for b in BANDS: print(f'     {name(b):4s} ' + ' '.join(f'{l:+.1f}:{q(o["B"][b][l])}' for l in LAGS))
    print('  C. target under D0 at the throw: D0 downfield speed / speed toward target (p50, n):')
    print('     ' + '  '.join(f'{name(b)}: {q(o["C"][b][0])} / {q(o["C"][b][1])} ({len(o["C"][b][0])})' for b in BANDS))
    print('  D. zone defenders 3+ yd off the ball, downfield speed p50 around the throw; share > 4 yd/s at it:')
    for g, (curve, fast) in o['D'].items():
        print(f'     {g:5s} ' + ' '.join(f'{t:+.1f}:{q(curve[t])}' for t in REL) + f' | > 4 yd/s {fast[0] / max(fast[1], 1):.2f} (n {fast[1]})')
