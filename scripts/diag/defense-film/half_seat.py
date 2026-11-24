"""Where a deep-half safety stands against #1 and #2 on his side (Coverage, 2026-11-24, after HALF_DECLARE's two attempts:
is the half's job an over-the-top carry of the vertical, or a between-threats landmark, "inside-out, deeper than the
deepest"?). One operator, positions only, on defense-film rows (NFL: nfl-stop-lane.py, PFF 2L / 2R; ours:
sim-stop-lane.mts, roles deep_half_s / deep_half_w). Dropbacks, his side = his side of the ball at the snap, with #1
and #2 there (receivers outside the backfield, outermost #1). At t = 0.5 ... 3.0 s, before the throw:
  route state: neither / #2 / #1 / both vertical (vertical: past 6 yd and climbing over 1.5 yd/s, or past 9 yd);
  his class, on the outward axis from the ball: outside #1 (beyond #1's line by 1+ yd) / on #1 (+-1 yd) / between /
  on #2 (+-1 yd) / inside #2 outside the hash / at or inside the hash (within 3.6 yd of the field's centre line,
  and inside #2);
  his depth over the deepest of #1 and #2;
  his corner: the CB nearest #1 at the snap on his side; squat (cloud) if that corner's depth gain by 1.5 s is under
  1.5 yd, else bail.
usage: python3 -I scripts/diag/defense-film/half_seat.py LABEL 'glob' [LABEL 'glob' ...]"""
import json, sys, glob, math, collections
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}
CLASSES = ('outside #1', 'on #1', 'between', 'on #2', 'inside #2', 'hash/inside')
TS = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)


def is_half(src, p):
    return (p.get('assign') in ('2L', '2R')) if src == 'nfl' else (p.get('role') in ('deep_half_s', 'deep_half_w'))


def rows(paths):
    out = []
    for f in paths:
        for l in open(f):
            r = json.loads(l)
            if r['kind'] != 'pass' or not r.get('dropback', True) or r.get('pa'): continue
            T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            src = r['src']; by = r['ballY']; P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1]); pl = r['players']; thr = r.get('throw')
            rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and not (P(i, k0)[0] < -2.5 and abs(P(i, k0)[1] - by) < 4.5)]
            kk = lambda t: min(range(len(T)), key=lambda k: abs(T[k] - t))
            for h, p in enumerate(pl):
                if p['side'] != 'D' or not is_half(src, p): continue
                s = 1 if P(h, k0)[1] > by else -1
                side = sorted([i for i in rec if (P(i, k0)[1] - by) * s > 0], key=lambda i: -abs(P(i, k0)[1] - by))
                if len(side) < 2: continue
                n1, n2 = side[0], side[1]
                cbs = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['pos'] == 'CB' and (P(i, k0)[1] - by) * s > 0]
                corner = None
                if cbs:
                    c = min(cbs, key=lambda i: math.dist(P(i, k0), P(n1, k0))); k15 = kk(1.5)
                    if abs(T[k15] - 1.5) < 0.06: corner = 'squat' if P(c, k15)[0] - P(c, k0)[0] < 1.5 else 'bail'
                def vert(i, k):
                    a, b = max(0, k - 1), min(len(T) - 1, k + 1); vx = (P(i, b)[0] - P(i, a)[0]) / (T[b] - T[a])
                    return (P(i, k)[0] > 6 and vx > 1.5) or P(i, k)[0] > 9
                for t in TS:
                    k = kk(t)
                    if abs(T[k] - t) > 0.06 or (thr is not None and t > thr): continue
                    o = lambda i: (P(i, k)[1] - by) * s
                    oh, o1, o2 = o(h), o(n1), o(n2)
                    if oh > o1 + 1: c_ = 'outside #1'
                    elif abs(oh - o1) <= 1: c_ = 'on #1'
                    elif abs(oh - o2) <= 1: c_ = 'on #2'
                    elif o2 < oh < o1: c_ = 'between'
                    elif abs(P(h, k)[1] - 26.67) <= 3.6: c_ = 'hash/inside'
                    else: c_ = 'inside #2'
                    v1, v2 = vert(n1, k), vert(n2, k)
                    st = 'both' if v1 and v2 else '#1 vertical' if v1 else '#2 vertical' if v2 else 'neither'
                    out.append(dict(t=t, st=st, cls=c_, over=P(h, k)[0] - max(P(n1, k)[0], P(n2, k)[0]), corner=corner, fam=r['cov']['fam'],
                                    rel1=oh - o1, rel2=oh - o2))
    return out


def pc(a, b): return f'{100 * a / max(1, b):3.0f}'


args = sys.argv[1:]
for lab, pat in zip(args[::2], args[1::2]):
    A = rows(sorted(glob.glob(pat)))
    print(f'\n## {lab} (half-moments {len(A)})')
    print('| route state | corner | t s | n | ' + ' | '.join(CLASSES) + ' | depth over the deepest p50 | to #1 / to #2 p50 (yd, + outside) |')
    print('|---|---|---|---|' + '---|' * len(CLASSES) + '---|---|')
    for st in ('neither', '#2 vertical', '#1 vertical', 'both'):
        for cn in ('all', 'squat', 'bail'):
            for t in TS:
                S = [r for r in A if r['st'] == st and r['t'] == t and (cn == 'all' or r['corner'] == cn)]
                if len(S) < 10: continue
                C = collections.Counter(r['cls'] for r in S)
                print(f"| {st} | {cn} | {t} | {len(S)} | " + ' | '.join(pc(C[c], len(S)) for c in CLASSES)
                      + f" | {np.median([r['over'] for r in S]):+.1f} | {np.median([r['rel1'] for r in S]):+.1f} / {np.median([r['rel2'] for r in S]):+.1f} |")
