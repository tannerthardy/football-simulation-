"""Receivers' stalk blocks on runs, NFL tracking vs sim (same operator, no
labels). For each wide receiver (outside the box at the snap, |y - ball| >
6) the man is the nearest defensive back within 9 yd of him at the snap.
Measured: whether the pair ever comes within 1.2 yd (a contact proxy)
before the whistle and when; the pair's distance at handoff + 1.5 s; and
whether that back was within 1.5 yd of the carrier at the whistle (in on
the tackle) and his depth then. By run family (zone: inside/outside zone;
gap: power/counter/trap/duo).
usage: stalk.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
FAM = {'OUTSIDE ZONE': 'zone', 'INSIDE ZONE': 'zone', 'outsideZone': 'zone', 'wideZone': 'zone', 'insideZone': 'zone',
       'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'DUO': 'gap', 'power': 'gap', 'counter': 'gap', 'trap': 'gap', 'duo': 'gap'}
def stalk(rows, label):
    acc = {}
    for raw in rows:
        fam = FAM.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None: continue
        by = raw['ball_y']; kend = min(p.frames - 1, p.k(p.end))
        for w in p.who('O', 'WR'):
            wx, wy = p.pos(w, 0)
            if wx is None or abs(wy - by) <= 6: continue
            dbs = [d for d in p.who('D', 'DB') if p.pos(d, 0)[0] is not None and p.dist(w, d, 0) < 9]
            if not dbs: continue
            d = min(dbs, key=lambda d: p.dist(w, d, 0))
            touch = next((k * p.dt for k in range(0, kend + 1) if p.dist(w, d, k) < 1.2), None)
            mid = p.dist(w, d, p.k(h + 1.5)) if p.live(h + 1.5) else None
            dx, dy = p.pos(d, kend); cx, cy = p.pos(c, kend)
            inon = dx is not None and cx is not None and math.hypot(dx - cx, dy - cy) < 1.5
            a = acc.setdefault(fam, []); a.append((touch, mid, inon, p.dist(w, d, 0)))
    for fam, v in sorted(acc.items()):
        t = [a[0] for a in v if a[0] is not None]
        print(f"{label:22s} {fam:4s} pairs {len(v):5d} | start dist p50 {q([a[3] for a in v])} | within 1.2 yd ever {100*len(t)/len(v):4.1f}% at p50 {q(t)} s | dist at handoff+1.5 p25/50/75 {q([a[1] for a in v if a[1] is not None],.25)}/{q([a[1] for a in v if a[1] is not None])}/{q([a[1] for a in v if a[1] is not None],.75)} | his back in on the tackle {100*sum(a[2] for a in v)/len(v):4.1f}% (when never within 1.2: {100*sum(a[2] for a in v if a[0] is None)/max(1,sum(1 for a in v if a[0] is None)):4.1f}%)")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
stalk([r for r in nfl if r.get('kind') == 'run'], 'NFL')
for path in sys.argv[1:]:
    stalk([json.loads(l) for l in gzip.open(path, 'rt')], path.split('/')[-1][:12])
