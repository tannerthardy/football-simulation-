"""Outside zone front, NFL tracking vs sim, same operator: defenders on the
line at the snap (x -0.5..2, |y| <= 7 of the ball), split by side of the
runner's lateral move (play side = sign of his move by handoff+1 s), and
their mean depth (+ = driven back, - = penetrated) and lateral position
(play side +) at snap+1.5/2.0/2.5 s; and for each play the deepest
play-side penetration and how close (yd) the nearest line defender came to
the runner while he was behind the line.
usage: oz-front.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def front(rows, label):
    acc = {}; deep, near, n = [], [], 0
    for raw in rows:
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        by = raw['ball_y']; x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1; n += 1
        line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7]
        for i in line:
            side = 'ps' if (p.pos(i, 0)[1] - by) * s > .5 else 'bs' if (p.pos(i, 0)[1] - by) * s < -.5 else 'mid'
            for t in (1.5, 2.0, 2.5):
                if not p.live(t): continue
                x, y = p.pos(i, p.k(t))
                if x is None: continue
                acc.setdefault((side, t), []).append((x, (y - by) * s - (p.pos(i, 0)[1] - by) * s))
        for i in p.who('O', 'OL'):
            x00, y00 = p.pos(i, 0)
            if x00 is None: continue
            for t in (1.5, 2.0, 2.5):
                if not p.live(t): continue
                x, y = p.pos(i, p.k(t))
                if x is None: continue
                acc.setdefault('OL', []).append((t, (y - y00) * s)); acc.setdefault('OLd', []).append((t, x - x00, 0))
        ps = [i for i in line if (p.pos(i, 0)[1] - by) * s > .5]
        dmin, nmin = 9, 9
        for k in range(p.k(h), min(p.frames, p.k(p.end) + 1)):
            cx, cy = p.pos(c, k)
            if cx is None or cx > 0: break
            for i in line:
                x, y = p.pos(i, k)
                if x is None: continue
                nmin = min(nmin, math.hypot(x - cx, y - cy))
            for i in ps:
                x, _ = p.pos(i, k)
                if x is not None: dmin = min(dmin, x)
        deep.append(dmin); near.append(nmin)
    ol = acc.get('OL', [])
    print(f"{label:24s} n={n} | OL lateral at 1.5/2.0/2.5 s: " + ' / '.join(str(q([b for t_, b in ol if t_ == t])) for t in (1.5, 2.0, 2.5)) + ' | OL depth: ' + ' / '.join(str(q([a for t_, a, *_ in [(t2, d2) for t2, d2, _ in acc.get('OLd', [])] if t_ == t])) for t in (1.5, 2.0, 2.5)))
    print(f"{'':24s} deepest play-side DL p25/50 {q(deep,.25)}/{q(deep)} | nearest line defender to runner behind LOS p25/50 {q(near,.25)}/{q(near)}")
    for side in ('ps', 'mid', 'bs'):
        print('   ' + side + ' ' + ' | '.join(f"t{t}: depth {q([a for a,_ in acc.get((side,t),[])])} lat {q([b for _,b in acc.get((side,t),[])])}" for t in (1.5, 2.0, 2.5)))
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
front([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'OUTSIDE ZONE'], 'NFL outside zone')
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    for c in ('outsideZone', 'wideZone'):
        sel = [r for r in rows if (r.get('cell') or {}).get('concept') == c]
        if sel: front(sel, f"{path.split('/')[-1][:10]} {c}")
