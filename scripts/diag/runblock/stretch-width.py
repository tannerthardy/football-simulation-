"""Stretch-run width scorecard, NFL tracking vs sim (same operator, no
labels). Outside/wide zone only. Play side = sign of the runner's lateral
move by handoff + 1 s. From the snap, toward the play side (yd), medians at
0.5/1.0/1.5/2.0/2.5 s: the ball carrier (the back before the handoff), his
depth, offensive linemen, inline tight ends, line defenders and backers
(2.5-8 yd off the ball within 5 yd of it at the snap), each split by where
they stood at the snap: play side (+ps), within 0.5 yd of the ball (mid) or
backside (-bs). Then where and when
the carrier crosses the line, his speed at the handoff, and lost runs.
usage: stretch-width.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
T = [.5, 1.0, 1.5, 2.0, 2.5]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def width(rows, label):
    acc = {}; cross, tcross, hs, lost, n = [], [], [], 0, 0
    for raw in rows:
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        by = raw['ball_y']; x0, y0 = p.pos(c, 0); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1; n += 1
        groups = {'carrier': [c], 'OL': p.who('O', 'OL'), 'TE': [i for i in p.who('O', 'TE') if p.pos(i, 0)[0] is not None and p.pos(i, 0)[0] > -1.5],
                  'DL': [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7],
                  'LB': [i for i in p.who('D') if p.pos(i, 0)[0] is not None and 2.5 <= p.pos(i, 0)[0] <= 8 and abs(p.pos(i, 0)[1] - by) <= 5]}
        for g0, ids in groups.items():
            for i in ids:
                xs, ys = p.pos(i, 0)
                if xs is None: continue
                g = g0 if g0 == 'carrier' else g0 + ('+ps' if (ys - by) * s > .5 else '-bs' if (ys - by) * s < -.5 else ' mid')
                for t in T:
                    if not p.live(t): continue
                    x, y = p.pos(i, p.k(t))
                    if x is None: continue
                    acc.setdefault((g, t), []).append((y - ys) * s)
                    if g == 'carrier': acc.setdefault(('depth', t), []).append(x)
        hs.append(p.speed(c, p.k(h)))
        for k in range(p.k(h), min(p.frames, p.k(p.end) + 1)):
            cx, cy = p.pos(c, k)
            if cx is not None and cx > 0: cross.append((cy - by) * s); tcross.append(k * p.dt); break
        g = raw.get('gain', raw.get('yards'))
        if g is not None and g < 0: lost += 1
    print(f"{label:24s} n={n} | crosses at lateral p25/50/75 {q(cross,.25)}/{q(cross)}/{q(cross,.75)} at {q(tcross)} s | handoff speed {q(hs)} | lost {100*lost/max(1,n):.1f}%")
    for g in ('carrier', 'depth', 'OL+ps', 'OL mid', 'OL-bs', 'TE+ps', 'TE-bs', 'DL+ps', 'DL mid', 'DL-bs', 'LB+ps', 'LB mid', 'LB-bs'):
        print(f"   {g:8s} " + '  '.join(f"{t:.1f}s {q(acc.get((g, t), [])) if acc.get((g, t)) else '-':>5}" for t in T))
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
width([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'OUTSIDE ZONE'], 'NFL outside zone')
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    sel = [r for r in rows if (r.get('cell') or {}).get('concept') in ('outsideZone', 'wideZone')]
    if sel: width(sel, path.split('/')[-1][:14] + ' stretch')
