"""Pass-rush get-off as Next Gen Stats defines it: time from the snap frame
until a line defender (< 2 yd deep at the snap) crosses the line of
scrimmage (his torso past the ball's line), interpolated on frames; edge =
outside the offensive tackles at the snap, interior = between them. Pass
plays only; rushers who never cross by 3 s are counted separately. NFL
tracking and sim exports, one code path (the tracked snap frame lags the
snap by about 0.1 s, so absolute NFL times read early by about that much).
usage: getoff-cross.py FILE [FILE ...]"""
import gzip, json, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
    out = {'edge': [], 'interior': []}; never = {'edge': 0, 'interior': 0}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); r = raw.get('common', raw)
        if r.get('kind') != 'pass': continue
        xy, P, dt = r['xy'], r['players'], r.get('dt', .1)
        if not xy or xy[0] is None: continue
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[0][2 * i] is not None]
        if len(ol) != 5: continue
        ys = sorted(xy[0][2 * i + 1] for i in ol)
        for i, p in enumerate(P):
            if p['side'] != 'D' or p['group'] != 'DL' or xy[0][2 * i] is None: continue
            x0 = xy[0][2 * i]
            if x0 > 2 or x0 < 0: continue
            kind = 'edge' if not ys[0] - .3 <= xy[0][2 * i + 1] <= ys[-1] + .3 else 'interior'
            t = None
            for k in range(1, min(len(xy), 31)):
                a, b = xy[k - 1][2 * i], xy[k][2 * i]
                if a is None or b is None: break
                if b <= 0 < a: t = (k - 1 + a / (a - b)) * dt; break
            if t is None: never[kind] += 1
            else: out[kind].append(t)
    print(f"== {path.split('/')[-1]}")
    for k, v in out.items():
        print(f"  {k:9s} n {len(v):5d} cross p10/50/90 {q(v,.1):.2f}/{q(v):.2f}/{q(v,.9):.2f} s | never by 3 s {100*never[k]/max(1,never[k]+len(v)):.0f}%")
