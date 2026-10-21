"""Second-level blocking on runs, NFL tracking vs sim (same operator, no
labels). Linebackers = defenders 2.5-8 yd off the ball within 5 yd of it
laterally at the snap. For each: the first time an offensive lineman or
tight end comes within 1.2 yd of him (a contact proxy) before the whistle;
the share contacted by 1.5/2.0/2.5 s and ever; his depth at handoff+1.0 s;
and whether he was within 1.5 yd of the carrier at the whistle (in on the
tackle), split by contacted or not. By run family.
usage: second-level.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
FAM = {'OUTSIDE ZONE': 'zone', 'INSIDE ZONE': 'zone', 'outsideZone': 'zone', 'wideZone': 'zone', 'insideZone': 'zone',
       'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'DUO': 'gap', 'power': 'gap', 'counter': 'gap', 'trap': 'gap', 'duo': 'gap'}
def level(rows, label):
    acc = {}
    for raw in rows:
        fam = FAM.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None: continue
        by = raw['ball_y']; kend = min(p.frames - 1, p.k(p.end))
        blockers = p.who('O', 'OL') + p.who('O', 'TE')
        for l in p.who('D'):
            x, y = p.pos(l, 0)
            if x is None or not (2.5 <= x <= 8 and abs(y - by) <= 5): continue
            touch = None
            for k in range(0, kend + 1):
                if any(p.dist(b, l, k) < 1.2 for b in blockers): touch = k * p.dt; break
            lx, ly = p.pos(l, kend); cx, cy = p.pos(c, kend)
            inon = lx is not None and cx is not None and math.hypot(lx - cx, ly - cy) < 1.5
            d1 = p.pos(l, p.k(h + 1.0))[0] if p.live(h + 1.0) else None
            acc.setdefault(fam, []).append((touch, inon, d1, p.end))
    for fam, v in sorted(acc.items()):
        t = [a[0] for a in v if a[0] is not None]
        by = lambda s: 100 * sum(1 for a in v if a[0] is not None and a[0] <= s) / len(v)
        free = [a for a in v if a[0] is None]; hit = [a for a in v if a[0] is not None]
        print(f"{label:22s} {fam:4s} LBs {len(v):5d} | OL/TE within 1.2 yd by 1.5/2.0/2.5 s {by(1.5):4.1f}/{by(2.0):4.1f}/{by(2.5):4.1f}% ever {100*len(t)/len(v):4.1f}% (p50 {q(t)} s) | depth at handoff+1 {q([a[2] for a in v if a[2] is not None])} | in on tackle: contacted {100*sum(a[1] for a in hit)/max(1,len(hit)):4.1f}% untouched {100*sum(a[1] for a in free)/max(1,len(free)):4.1f}% | play length p50 {q([a[3] for a in v])}")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
level([r for r in nfl if r.get('kind') == 'run'], 'NFL')
for path in sys.argv[1:]:
    level([json.loads(l) for l in gzip.open(path, 'rt')], path.split('/')[-1][:12])
