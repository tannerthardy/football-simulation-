"""Defensive line get-off relative to the offensive line on the same play,
NFL tracking and sim exports, one code path. First movement = displacement
from the snap position crossing 0.15 yd (interpolated between frames). Each
line defender (< 2 yd deep, within the tackle box + 2 yd) is compared with
the offensive lineman nearest him at the snap and with the line's median
start, so the tracked snap frame's offset cancels.
usage: getoff-rel.py FILE [FILE ...] [--kind run|pass|all]"""
import gzip, json, math, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
KIND = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'all'
def first_move(xy, i, dt, thr=.15):
    x0, y0 = xy[0][2 * i], xy[0][2 * i + 1]
    prev = 0.0
    for k in range(1, min(len(xy), 25)):
        if xy[k][2 * i] is None: return None
        d = math.hypot(xy[k][2 * i] - x0, xy[k][2 * i + 1] - y0)
        if d >= thr: return (k - 1 + (thr - prev) / max(d - prev, 1e-9)) * dt
        prev = d
    return None
for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
    vsOL, vsLine, olStart, dlStart, sameFrame = [], [], [], [], 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); r = raw.get('common', raw)
        if KIND != 'all' and r.get('kind') != KIND: continue
        if r.get('kind') not in ('run', 'pass'): continue
        xy, P, dt = r['xy'], r['players'], r.get('dt', .1)
        if not xy or xy[0] is None: continue
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[0][2 * i] is not None]
        if len(ol) != 5: continue
        los = max(xy[0][2 * i] for i in ol) + .3
        by = sorted(xy[0][2 * i + 1] for i in ol)[2]
        half = max(abs(xy[0][2 * i + 1] - by) for i in ol) + 2
        starts = {i: first_move(xy, i, dt) for i in ol}
        if any(v is None for v in starts.values()): continue
        lineT = sorted(starts.values())[2]
        olStart.extend(starts.values())
        for i, p in enumerate(P):
            if p['side'] != 'D' or xy[0][2 * i] is None: continue
            if xy[0][2 * i] - los > 2 or abs(xy[0][2 * i + 1] - by) > half: continue
            t = first_move(xy, i, dt)
            if t is None: continue
            o = min(ol, key=lambda j: math.hypot(xy[0][2 * j] - xy[0][2 * i], xy[0][2 * j + 1] - xy[0][2 * i + 1]))
            dlStart.append(t); vsOL.append(t - starts[o]); vsLine.append(t - lineT)
    n = len(vsOL)
    print(f"== {path.split('/')[-1]} ({KIND}) line defenders {n}")
    print(f"  OL first move after the snap frame: p10/25/50/75/90 {q(olStart,.1):.2f}/{q(olStart,.25):.2f}/{q(olStart):.2f}/{q(olStart,.75):.2f}/{q(olStart,.9):.2f} s")
    print(f"  DL first move after the snap frame:  p10/25/50/75/90 {q(dlStart,.1):.2f}/{q(dlStart,.25):.2f}/{q(dlStart):.2f}/{q(dlStart,.75):.2f}/{q(dlStart,.9):.2f} s")
    print(f"  DL minus the OL in front of him:     p10/25/50/75/90 {q(vsOL,.1):+.2f}/{q(vsOL,.25):+.2f}/{q(vsOL):+.2f}/{q(vsOL,.75):+.2f}/{q(vsOL,.9):+.2f} s | DL first {100*sum(x<0 for x in vsOL)/max(n,1):.0f}%")
    print(f"  DL minus the line's median start:    p10/25/50/75/90 {q(vsLine,.1):+.2f}/{q(vsLine,.25):+.2f}/{q(vsLine):+.2f}/{q(vsLine,.75):+.2f}/{q(vsLine,.9):+.2f} s")
