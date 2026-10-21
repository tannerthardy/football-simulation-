"""Shotgun run exchange, NFL tracking vs sim (same operator): QB depth at the
snap > 2.5 yd. Play side = sign of the runner's lateral move by handoff + 1 s.
The back's alignment (depth, lateral relative to the ball, + = play side),
where and when he takes the ball, his speed then, where he crosses the line,
lost runs; split by whether he aligned on the play side or the backside.
usage: gun-mesh.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
FAM = {'OUTSIDE ZONE': 'stretch', 'outsideZone': 'stretch', 'wideZone': 'stretch', 'INSIDE ZONE': 'inside', 'insideZone': 'inside'}
def mesh(rows, label):
    acc = {}
    for raw in rows:
        fam = FAM.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff'); qbs = p.who('O', 'QB')
        if c is None or h is None or not qbs or not p.live(h + 1.0): continue
        if p.pos(qbs[0], 0)[0] is None or p.pos(qbs[0], 0)[0] > -2.5: continue
        by = raw['ball_y']; x0, y0 = p.pos(c, 0); xh, yh = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or xh is None or x1 is None: continue
        s = 1 if y1 - yh >= 0 else -1
        side = 'aligned play side' if (y0 - by) * s > .3 else 'aligned backside' if (y0 - by) * s < -.3 else 'aligned behind'
        cross = None
        for k in range(p.k(h), min(p.frames, p.k(p.end) + 1)):
            cx, cy = p.pos(c, k)
            if cx is not None and cx > 0: cross = (cy - by) * s; break
        g = raw.get('gain', raw.get('yards'))
        acc.setdefault((fam, side), []).append((x0, (y0 - by) * s, h, xh, (yh - by) * s, p.speed(c, p.k(h)), cross, g))
    for (fam, side), v in sorted(acc.items()):
        cr = [a[6] for a in v if a[6] is not None]
        print(f"{label:16s} {fam:7s} {side:17s} n {len(v):4d} | align depth {q([a[0] for a in v])} lat {q([a[1] for a in v])} | handoff at {q([a[2] for a in v])} s, depth {q([a[3] for a in v])} lat {q([a[4] for a in v])} speed {q([a[5] for a in v])} | crosses at {q(cr,.25)}/{q(cr)}/{q(cr,.75)} | lost {100*sum(1 for a in v if a[7] is not None and a[7] < 0)/len(v):.0f}%")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
mesh([r for r in nfl if r.get('kind') == 'run'], 'NFL')
for path in sys.argv[1:]:
    mesh([json.loads(l) for l in gzip.open(path, 'rt')], path.split('/')[-1][:14])
