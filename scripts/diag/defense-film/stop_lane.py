"""The underneath defender at a stop or out route's break (Integration, 2026-11-24; the QB lane's anticipation price:
staged stop routes are thrown before the break 30% of the time against the NFL's 50%, shut mostly by a defender about
1.8 yd inside the hitch, in the lane). One operator, positions only, on film rows with routeId (nfl-stop-lane.py,
sim-stop-lane.mts).
Routes: stop = NFL HITCH (BDB has no curl label) / ours hitch, quick_hitch, curl, comeback; out = NFL OUT / ours
quick_out, out, deep_out. Number: at the snap, the receivers outside the backfield on each side of the ball, outermost
#1. Break, from his path (0.1 s frames, velocity centred over 0.2 s, upfield = toward the defense): after he has
climbed at over 3 yd/s, a stop's break is the first frame his upfield speed is under 1 yd/s; an out's, the first frame
from 0.4 s his outward speed is over 2 yd/s and over his upfield speed, past 1 yd deep. Depth band of the break
3-7.5 / 7.5-12 yd. Every such route counts toward the share thrown before its break; the positions are taken at 0.3 s
before the break and at it, each only if it is not after the throw (a thrown-early route has no break sample): the nearest underneath defender (not a rusher, not a deep seat: NFL PFF assignment, ours the installed role) to the
receiver: distance, inside (toward the ball's snap y) or outside, under (shallower) or over; his perpendicular distance
to the ball's lane (the segment from the QB then to the receiver's break point) and whether he is beside it (projection
within the segment); in the lane = within 1.5 yd and beside it; his speed toward the break point; his seat (hook /
curl-flat / flat / man / other); by coverage family.
usage: python3 -I scripts/diag/defense-film/stop_lane.py LABEL 'glob' [LABEL 'glob' ...]"""
import json, sys, glob, math, collections
import numpy as np
STOP = {'HITCH', 'hitch', 'quick_hitch', 'curl', 'comeback'}; OUT = {'OUT', 'quick_out', 'out', 'deep_out'}
NFL_DEEP = {'3L', '3R', '3M', '2L', '2R', '4IL', '4IR', '4OL', '4OR', 'DF', 'PRE'}
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}


def seat(src, p):
    if src == 'nfl':
        a = p.get('assign') or ''
        if a in NFL_DEEP: return 'deep'
        return {'HCL': 'hook', 'HCR': 'hook', 'HOL': 'hook', 'CFL': 'curl-flat', 'CFR': 'curl-flat', 'FL': 'flat', 'FR': 'flat', 'MAN': 'man'}.get(a, 'other')
    r = p.get('role') or ''
    if r.startswith(('deep_', 'quarter_', 'tampa_mid')): return 'deep'
    if r in ('rush', 'blitz'): return 'rush'
    if r == 'man': return 'man'
    if r.startswith(('hook', 'hole', 'middle', 'robber', 'lurk', 'tampa')): return 'hook'
    if r.startswith('curl'): return 'curl-flat'
    if r.startswith('flat'): return 'flat'
    return 'other'


def rows(paths):
    out = []
    for f in paths:
        for l in open(f):
            r = json.loads(l)
            if r['kind'] != 'pass' or not r.get('dropback', True): continue
            T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            src = r['src']; by = r['ballY']; P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1]); pl = r['players']
            qb = next((i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] == 'QB'), None)
            if qb is None: continue
            thr = r.get('throw')
            rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and not (P(i, k0)[0] < -2.5 and abs(P(i, k0)[1] - by) < 4.5)]
            num = {}
            for s in (-1, 1):
                S = sorted([i for i in rec if (P(i, k0)[1] - by) * s > 0], key=lambda i: -abs(P(i, k0)[1] - by))
                for j, i in enumerate(S): num[i] = j + 1
            under = [i for i, p in enumerate(pl) if p['side'] == 'D' and not (src == 'nfl' and p.get('rush')) and seat(src, p) not in ('deep', 'rush')]
            def vel(i, k):
                a, b = max(0, k - 1), min(len(T) - 1, k + 1)
                return ((P(i, b)[0] - P(i, a)[0]) / (T[b] - T[a]), (P(i, b)[1] - P(i, a)[1]) / (T[b] - T[a]))
            for i in rec:
                rid = pl[i].get('routeId'); kind = 'stop' if rid in STOP else 'out' if rid in OUT else None
                if not kind or num.get(i, 9) > 2: continue
                side = 1 if P(i, k0)[1] > by else -1; climbed = 0; kb = None
                for k in range(k0 + 1, len(T) - 1):
                    vu, vl = vel(i, k); climbed = max(climbed, vu)
                    if climbed < 3: continue
                    if kind == 'stop' and vu < 1: kb = k; break
                    if kind == 'out' and T[k] >= 0.4 and vl * side > 2 and vl * side > vu and P(i, k)[0] > 1: kb = k; break
                if kb is None: continue
                tb = T[kb]; depth = P(i, kb)[0]
                band = '3-7.5' if 3 <= depth < 7.5 else '7.5-12' if 7.5 <= depth < 12 else None
                if not band or not under: continue
                early = thr is not None and thr < tb
                out.append(dict(src=src, kind=kind, num=num[i], band=band, at='route', fam=r['cov']['fam'], early=early, tb=tb))
                B = P(i, kb)
                for lab, tt in (('-0.3 s', tb - 0.3), ('break', tb)):
                    k = min(range(len(T)), key=lambda kk: abs(T[kk] - tt))
                    if abs(T[k] - tt) > 0.06 or (thr is not None and tt > thr + 0.05): continue
                    R = P(i, k); Q = P(qb, k)
                    d = min(under, key=lambda j: math.dist(P(j, k), R)); Dp = P(d, k); vd = vel(d, k)
                    sx, sy = B[0] - Q[0], B[1] - Q[1]; L2 = sx * sx + sy * sy or 1e-9
                    u = ((Dp[0] - Q[0]) * sx + (Dp[1] - Q[1]) * sy) / L2
                    perp = abs((Dp[0] - Q[0]) * sy - (Dp[1] - Q[1]) * sx) / math.sqrt(L2)
                    tob = (B[0] - Dp[0], B[1] - Dp[1]); nb = math.hypot(*tob) or 1e-9
                    out.append(dict(src=src, kind=kind, num=num[i], band=band, at=lab, fam=r['cov']['fam'], dist=math.dist(Dp, R),
                                    inside=(Dp[1] - R[1]) * -side > 0, under=Dp[0] < R[0], perp=perp, beside=0 <= u <= 1,
                                    lane=perp <= 1.5 and 0 <= u <= 1, vtob=(vd[0] * tob[0] + vd[1] * tob[1]) / nb, seat=seat(src, pl[d]), tb=tb, lab=(r.get('lab') or [None] * len(T))[k][d] if (r.get('lab') or [None] * len(T))[k] else None))
    return out


def q(v): return float(np.median(v)) if len(v) else float('nan')
def pc(a, b): return f'{100 * a / max(1, b):3.0f}%'


args = sys.argv[1:]
for lab, pat in zip(args[::2], args[1::2]):
    A = rows(sorted(glob.glob(pat)))
    print(f'\n## {lab}')
    print('| route | # | break depth | routes | thrown before the break | at | n | break t p50 | dist p50 | inside | under | lane perp p50 | in the lane (<=1.5 yd, beside) | speed toward break p50 | seat: hook / curl-flat / flat / man / other |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for kind in ('stop', 'out'):
        for nm in (1, 2):
            for band in ('3-7.5', '7.5-12'):
                Rt = [r for r in A if r['kind'] == kind and r['num'] == nm and r['band'] == band and r['at'] == 'route']
                for at in ('-0.3 s', 'break'):
                    S = [r for r in A if r['kind'] == kind and r['num'] == nm and r['band'] == band and r['at'] == at]
                    if len(S) < 8: continue
                    C = collections.Counter(r['seat'] for r in S)
                    print(f"| {kind} | #{nm} | {band} | {len(Rt)} | {pc(sum(r['early'] for r in Rt), len(Rt))} | {at} | {len(S)} | {q([r['tb'] for r in S]):.2f} | {q([r['dist'] for r in S]):.1f} | {pc(sum(r['inside'] for r in S), len(S))} | {pc(sum(r['under'] for r in S), len(S))} | {q([r['perp'] for r in S]):.1f} | {pc(sum(r['lane'] for r in S), len(S))} | {q([r['vtob'] for r in S]):+.1f} | " + ' / '.join(pc(C[s], len(S)) for s in ('hook', 'curl-flat', 'flat', 'man', 'other')) + ' |')
    L = collections.Counter(r['lab'] for r in A if r['at'] == 'break' and r['lane'] and r.get('lab'))
    if L: print('\nthe in-lane defender\'s movement label at the break (ours):', ', '.join(f'{k} {v}' for k, v in L.most_common(10)))
    L = collections.Counter(r['lab'] for r in A if r['at'] == 'break' and r.get('lab'))
    if L: print('all nearest defenders\' labels at the break:', ', '.join(f'{k} {v}' for k, v in L.most_common(10)))
    print('\nin the lane at the break, by coverage family (stop + out, both bands, #1 + #2):')
    for fam in ('cover1', 'cover2', 'cover3', 'cover4', 'cover6', 'tampa2', 'cover0', 'cover2man'):
        S = [r for r in A if r['fam'] == fam and r['at'] == 'break']
        if len(S) >= 8: print(f"  {fam:9s} n {len(S):4d}: in the lane {pc(sum(r['lane'] for r in S), len(S))}, perp p50 {q([r['perp'] for r in S]):.1f}, dist p50 {q([r['dist'] for r in S]):.1f}")
