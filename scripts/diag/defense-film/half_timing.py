"""When a deep half starts for #1 when #2 goes under (Coverage, 2026-11-24, HALF_SEAT's stop point: with #1 vertical and
#2 under 6 yd, our half is 6.8 yd inside #1 at 2.5 s against the NFL's 2.3). One operator, positions only, on
defense-film rows (NFL nfl-stop-lane.py, PFF 2L / 2R; ours sim-stop-lane.mts, roles deep_half_s / _w; ours also carries
HALF_SEAT's declaration as a '|D' suffix on the defender's frame label). Dropbacks, his side with #1 and #2 (as
half_seat.py); kept when at 2.5 s (before the throw) #1 is vertical and #2 is not and is under 6 yd. Per half:
  #2's release: first frame #2 is 2 yd from his snap spot;
  #2's break: first frame after the release with #2 under 6 yd and either not climbing (upfield under 1 yd/s) or moving
    across (lateral over 2 yd/s and more than his climb) or coming back (the same geometry HALF_SEAT declares on, read from
    the true positions, without a hold or a perception delay);
  his first committed move toward #1: first frame he is 1 yd outward of his snap spot (toward #1's side) and moving
    outward over 1 yd/s;
  his outward speed from that move to 2.5 s, and his outward change by 1.0 / 1.5 / 2.0 / 2.5 s;
  ours: HALF_SEAT's declaration time.
With --go, only plays where #1's labelled route is a go (NFL routeRan GO; ours go / fade) (Rules: 'vertical at 2.5 s'
also catches posts, digs and corners in their stems).
usage: python3 -I scripts/diag/defense-film/half_timing.py [--go] LABEL 'glob' [LABEL 'glob' ...]"""
import json, sys, glob, math
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}
GO_ONLY = '--go' in sys.argv
GO = {'GO', 'go', 'fade'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):4.2f} ({q(v, .25):4.2f}-{q(v, .75):4.2f}) n {len(v)}' if len(v) else '-'


def rows(paths):
    out = []
    for f in paths:
        for l in open(f):
            r = json.loads(l)
            if r['kind'] != 'pass' or not r.get('dropback', True) or r.get('pa'): continue
            T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            src = r['src']; by = r['ballY']; P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1]); pl = r['players']; thr = r.get('throw')
            if thr is not None and thr < 2.5: continue
            rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and not (P(i, k0)[0] < -2.5 and abs(P(i, k0)[1] - by) < 4.5)]
            kk = lambda t: min(range(len(T)), key=lambda k: abs(T[k] - t))
            def vel(i, k):
                a, b = max(0, k - 1), min(len(T) - 1, k + 1)
                return ((P(i, b)[0] - P(i, a)[0]) / (T[b] - T[a]), (P(i, b)[1] - P(i, a)[1]) / (T[b] - T[a]))
            for h, p in enumerate(pl):
                ok = (p.get('assign') in ('2L', '2R')) if src == 'nfl' else (p.get('role') in ('deep_half_s', 'deep_half_w'))
                if p['side'] != 'D' or not ok: continue
                s = 1 if P(h, k0)[1] > by else -1
                side = sorted([i for i in rec if (P(i, k0)[1] - by) * s > 0], key=lambda i: -abs(P(i, k0)[1] - by))
                if len(side) < 2: continue
                n1, n2 = side[0], side[1]; k25 = kk(2.5)
                if abs(T[k25] - 2.5) > 0.06: continue
                vert = lambda i, k: (P(i, k)[0] > 6 and vel(i, k)[0] > 1.5) or P(i, k)[0] > 9
                if not vert(n1, k25) or vert(n2, k25) or P(n2, k25)[0] >= 6: continue
                if GO_ONLY and pl[n1].get('routeId') not in GO: continue
                rel = brk = mv = dec = None
                for k in range(k0 + 1, k25 + 1):
                    if rel is None and math.dist(P(n2, k), P(n2, k0)) >= 2: rel = T[k]
                    if rel is not None and brk is None:
                        vx, vy = vel(n2, k)
                        if P(n2, k)[0] < 6 and (vx < 1 or (abs(vy) > 2 and abs(vy) > vx)): brk = T[k]
                    out_h = (P(h, k)[1] - P(h, k0)[1]) * s
                    if mv is None and out_h >= 1 and vel(h, k)[1] * s > 1: mv = T[k]
                    if src == 'sim' and dec is None and r.get('lab') and r['lab'][k] and r['lab'][k][h].endswith('|D'): dec = T[k]
                outw = lambda t: (P(h, kk(t))[1] - P(h, k0)[1]) * s
                spd = (outw(2.5) - outw(mv)) / (2.5 - mv) if mv is not None and mv < 2.4 else None
                out.append(dict(rel=rel, brk=brk, mv=mv, dec=dec, spd=spd, o=[outw(t) for t in (1.0, 1.5, 2.0, 2.5)],
                                to1=(P(h, k25)[1] - P(n1, k25)[1]) * s, to1_0=(P(h, k0)[1] - P(n1, k0)[1]) * s,
                                n1out=(P(n1, k25)[1] - P(n1, k0)[1]) * s, w1=abs(P(n1, k0)[1] - by), wh=abs(P(h, k0)[1] - by)))
    return out


args = [x for x in sys.argv[1:] if x != '--go']
for lab, pat in zip(args[::2], args[1::2]):
    A = rows(sorted(glob.glob(pat)))
    print(f'\n## {lab}: halves with #1 vertical and #2 under at 2.5 s: {len(A)}')
    print(f"  #2 release t: {f3([r['rel'] for r in A if r['rel'] is not None])}")
    print(f"  #2 under/out break t: {f3([r['brk'] for r in A if r['brk'] is not None])}")
    print(f"  half's first committed move toward #1 t: {f3([r['mv'] for r in A if r['mv'] is not None])} (none by 2.5 s: {sum(r['mv'] is None for r in A)})")
    print(f"  move minus #2 break: {f3([r['mv'] - r['brk'] for r in A if r['mv'] is not None and r['brk'] is not None])}")
    print(f"  move minus #2 release: {f3([r['mv'] - r['rel'] for r in A if r['mv'] is not None and r['rel'] is not None])}")
    if any(r['dec'] is not None for r in A) or 'ours' in lab:
        print(f"  HALF_SEAT declaration t: {f3([r['dec'] for r in A if r['dec'] is not None])} (none by 2.5 s: {sum(r['dec'] is None for r in A)})")
        print(f"  move minus declaration: {f3([r['mv'] - r['dec'] for r in A if r['mv'] is not None and r['dec'] is not None])}")
    print(f"  outward speed from the move to 2.5 s (yd/s): {f3([r['spd'] for r in A if r['spd'] is not None])}")
    print('  outward change by 1.0 / 1.5 / 2.0 / 2.5 s: ' + ' / '.join(f'{q([r["o"][j] for r in A]):+.1f}' for j in range(4)) + f"; to #1 at 2.5 s {q([r['to1'] for r in A]):+.1f}")
    print(f"  decomposition (medians): to #1 at the snap {q([r['to1_0'] for r in A]):+.1f} + his outward {q([r['o'][3] for r in A]):+.1f} - #1's outward {q([r['n1out'] for r in A]):+.1f}; at the snap #1 {q([r['w1'] for r in A]):.1f} and he {q([r['wh'] for r in A]):.1f} yd from the ball")
