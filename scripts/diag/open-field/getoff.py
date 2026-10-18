"""First-movement time after the snap (displacement >= 0.15 yd from the snap
position), box defenders and OL, one operator for NFL and sim common plays.
usage: getoff.py FILE.jsonl.gz [--sim-trace] [--kind run|pass]"""
import gzip, json, math, sys
trace = '--sim-trace' in sys.argv
kind = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'run'
q = lambda xs, f: round(sorted(xs)[int(f * (len(xs) - 1))], 2) if xs else None
dl, ol = [], []
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != kind: continue
    xy = r['xy']; dt = r.get('dt', .1); by = r['ball_y']; P = r['players']
    for i, p in enumerate(P):
        x0, y0 = xy[0][2*i], xy[0][2*i+1]
        if x0 is None: continue
        box = p['side'] == 'D' and -0.5 <= x0 <= 2.0 and abs(y0 - by) <= 4.5
        line_ = p['side'] == 'O' and p['group'] == 'OL'
        if not (box or line_): continue
        t = next((k * dt for k in range(1, min(len(xy), 20)) if xy[k][2*i] is not None and math.hypot(xy[k][2*i] - x0, xy[k][2*i+1] - y0) >= .15), None)
        if t is not None: (dl if box else ol).append(t)
print(sys.argv[1], kind, f"box defenders first move p25/p50/p75 {q(dl,.25)}/{q(dl,.5)}/{q(dl,.75)} (n {len(dl)})   OL {q(ol,.25)}/{q(ol,.5)}/{q(ol,.75)}")
