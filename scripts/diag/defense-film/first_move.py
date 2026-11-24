"""Recognition from positions (Integration, 2026-11-24): how soon and which way box linebackers and safeties commit after
the snap, NFL vs ours, on the defense-film rows (nfl-defense-film.py, sim-defense-film.mts; positions only).
Box linebacker: LB group (LB / ILB / MLB / OLB) 1.5-7 yd deep and within 6 yd of the ball laterally at the snap.
Safety: S / SS / FS (and ours: S). A committed movement: the first frame at which he is more than 0.5 yd from his snap
spot and moving faster than 1 yd/s (centred over 0.2 s). Its direction, from the displacement then: downhill (toward
the line, depth falling, |dx| >= |dy|), backward (depth rising), lateral. Wrong way first: downhill on a straight
dropback (pass, no play action, not a screen), backward on a run. Reversal: the time from the first move until his depth
speed has the other sign at over 1 yd/s, or none by 3.0 s. Play types: run, play action, dropback, screen (ours only:
the NFL rows do not separate screens, which stay in the NFL dropbacks).
usage: python3 -I scripts/diag/defense-film/first_move.py NFL.jsonl SIM.jsonl [SIM2 ...]"""
import json, sys, math, collections
import numpy as np
LB = {'LB', 'ILB', 'MLB', 'OLB'}; SF = {'S', 'SS', 'FS'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):4.2f} ({q(v, .25):4.2f}-{q(v, .75):4.2f})' if len(v) else '   -'
def pct(a, b): return f'{100 * a / max(1, b):4.1f}%'


def ptype(r):
    if r['kind'] == 'run': return 'run'
    if r.get('pa'): return 'play action'
    if r['src'] == 'sim' and not r.get('dropback'): return 'screen'
    return 'dropback'


def rows(paths):
    out = []
    for p in paths:
        for l in open(p):
            r = json.loads(l); T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            pt = ptype(r); P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
            by = r.get('ballY', 26.67)
            for i, pl in enumerate(r['players']):
                if pl['side'] != 'D': continue
                x0, y0 = P(i, k0)
                g = 'box LB' if pl['pos'] in LB and 1.5 <= x0 <= 7 and abs(y0 - by) <= 6 else 'S' if pl['pos'] in SF else None
                if not g: continue
                first = None
                for k in range(k0 + 2, len(T) - 2):
                    if T[k] > 3.0: break
                    dx, dy = P(i, k)[0] - x0, P(i, k)[1] - y0
                    v = math.dist(P(i, k + 2), P(i, k - 2)) / max(1e-6, T[k + 2] - T[k - 2])
                    if math.hypot(dx, dy) > 0.5 and v > 1:
                        first = (k, dx, dy); break
                row = dict(g=g, pt=pt, t=None)
                if first:
                    k, dx, dy = first
                    d = 'lateral' if abs(dy) > abs(dx) else 'downhill' if dx < 0 else 'backward'
                    wrong = (pt == 'dropback' and d == 'downhill') or (pt == 'run' and d == 'backward')
                    rev = None
                    if wrong:
                        s = -1 if dx < 0 else 1
                        for kk in range(k + 1, len(T) - 2):
                            if T[kk] > 3.0: break
                            vx = (P(i, kk + 2)[0] - P(i, kk - 2)[0]) / max(1e-6, T[kk + 2] - T[kk - 2])
                            if vx * s < -1: rev = T[kk] - T[k]; break
                    row.update(t=T[k], d=d, wrong=wrong, rev=rev)
                out.append(row)
    return out


for lab, P in (('NFL', sys.argv[1:2]), ('sim', sys.argv[2:])):
    A = rows(P)
    print(f'\n## {lab}')
    print('| group | play type | n | committed by 3 s | time to first committed move p50 (p25-p75) s | downhill / lateral / backward | wrong way first | its reversal: share reversed by 3 s, time p50 (p25-p75) |')
    print('|---|---|---|---|---|---|---|---|')
    for g in ('box LB', 'S'):
        for pt in ('run', 'play action', 'dropback', 'screen'):
            G = [r for r in A if r['g'] == g and r['pt'] == pt]
            if len(G) < 10: continue
            M = [r for r in G if r['t'] is not None]; C = collections.Counter(r['d'] for r in M)
            W_ = [r for r in M if r['wrong']]; R = [r['rev'] for r in W_ if r['rev'] is not None]
            print(f'| {g} | {pt} | {len(G)} | {pct(len(M), len(G))} | {f3([r["t"] for r in M])} | {pct(C["downhill"], len(M))} / {pct(C["lateral"], len(M))} / {pct(C["backward"], len(M))} | {pct(len(W_), len(M))} | {pct(len(R), len(W_))}, {f3(R)} |')
