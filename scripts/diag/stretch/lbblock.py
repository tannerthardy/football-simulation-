"""Second-level block episodes, one operator for NFL and sim common plays.
Second level as in trench/timeline.py. An episode starts at the first frame
after 0.5 s with an OL within 1.0 yd of the defender and ends when no OL is
within 1.5 yd (or the play ends: censored). Reported: how many second-level
defenders get one, its duration, and at its end the defender's distance to
the runner and whether the runner is still behind him (runner depth < his).
Split by run family. usage: lbblock.py FAMILY FILE.jsonl.gz [FILE2 ...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import second_level  # noqa: E402
fam = sys.argv[1]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[2:]:
    n = got = cens = 0; dur, dist, ahead = [], [], 0; ends = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw.get('kind') != 'run' or raw.get('carrier') is None or CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
        p = Play(raw); c = raw['carrier']; ol = p.who('O', 'OL')
        end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        for d in second_level(p):
            n += 1
            near = lambda k, r: any((p.dist(d, b, k) or 99) <= r for b in ol)
            k0 = next((k for k in range(p.k(.5), end + 1) if near(k, 1.0)), None)
            if k0 is None: continue
            got += 1
            k1 = next((k for k in range(k0, end + 1) if not near(k, 1.5)), None)
            if k1 is None: cens += 1; continue
            dur.append((k1 - k0) * p.dt); ends += 1
            (dx, dy), (cx, cy) = p.pos(d, k1), p.pos(c, k1)
            if dx is None or cx is None: continue
            dist.append(math.hypot(dx - cx, dy - cy)); ahead += cx < dx
    print(f"{path.split('/')[-1]:22s} {fam}: second-level {n}, blocked {100*got/max(1,n):.0f}%, censored {100*cens/max(1,got):.0f}% | ended: duration p25/50/75 {q(dur,.25)}/{q(dur)}/{q(dur,.75)} s, dist to runner p50 {q(dist)}, runner still short of him {100*ahead/max(1,ends):.0f}%")
