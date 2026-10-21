"""Outside zone: where the back crosses the line relative to the play-side
end, NFL tracking vs sim (same operator, no labels). Play side = sign of the
runner's lateral move by handoff + 1 s; the end = the widest line defender
on the play side at the snap (x -0.5..2, |y| <= 7 of the ball). At the first
frame the runner is past the line (or the end of the play if he never is):
his lateral position relative to the end (+ = outside him), the end's depth
and lateral move from the snap, and the runner's gain, by crossing class
(inside the end / within 0.5 yd / outside him).
usage: oz-edge.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def edge(rows, label):
    cls = {}; n = 0
    for raw in rows:
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        by = raw['ball_y']; x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1
        line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7
                and (p.pos(i, 0)[1] - by) * s > .5]
        if not line: continue
        e = max(line, key=lambda i: (p.pos(i, 0)[1] - by) * s)
        ey0 = (p.pos(e, 0)[1] - by) * s
        kx = None
        for k in range(p.k(h), min(p.frames, p.k(p.end) + 1)):
            cx, _ = p.pos(c, k)
            if cx is not None and cx > 0: kx = k; break
        crossed = kx is not None
        if kx is None: kx = min(p.frames - 1, p.k(p.end))
        cx, cy = p.pos(c, kx); ex, ey = p.pos(e, kx)
        if cx is None or ex is None: continue
        n += 1
        rel = (cy - by) * s - (ey - by) * s
        k = 'outside' if rel > .5 else 'inside' if rel < -.5 else 'at'
        gain = raw.get('gain', raw.get('yards'))
        if gain is None:
            xe, _ = p.pos(c, min(p.frames - 1, p.k(p.end))); gain = xe
        cls.setdefault(k, []).append((rel, ex, (ey - by) * s - ey0, ey0, gain, crossed, kx * p.dt if hasattr(p, 'dt') else 0))
    print(f"{label:26s} n={n}")
    for k in ('inside', 'at', 'outside'):
        v = cls.get(k, [])
        if not v: continue
        print(f"   {k:8s} {100*len(v)/n:5.1f}% | end at snap lat {q([a[3] for a in v])} | at crossing: end depth {q([a[1] for a in v])} moved {q([a[2] for a in v])} | runner rel end p25/50/75 {q([a[0] for a in v],.25)}/{q([a[0] for a in v])}/{q([a[0] for a in v],.75)} | gain p50 {q([a[4] for a in v])} lost {100*sum(1 for a in v if a[4] < 0)/len(v):.0f}% never crossed {100*sum(1 for a in v if not a[5])/len(v):.0f}%")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
edge([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'OUTSIDE ZONE'], 'NFL outside zone')
edge([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'INSIDE ZONE'], 'NFL inside zone')
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    for c in ('outsideZone', 'wideZone', 'insideZone'):
        sel = [r for r in rows if (r.get('cell') or {}).get('concept') == c]
        if sel: edge(sel, f"{path.split('/')[-1][:10]} {c}")
