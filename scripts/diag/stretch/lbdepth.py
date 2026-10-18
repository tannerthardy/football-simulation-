"""Second-level defenders (2-7 yd deep, within 6.5 yd of the ball at the snap,
as in trench/timeline.py) over time by concept family, one operator for NFL
and sim common plays: depth past the line and lateral flow toward the play
side (carrier's direction), split play side / backside of the ball at the
snap; and distance to the nearest OL.
usage: lbdepth.py FAMILY FILE.jsonl.gz [FILE2 ...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import play_side, second_level  # noqa: E402
fam = sys.argv[1]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[2:]:
    o = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw.get('kind') != 'run' or raw.get('carrier') is None or CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
        p = Play(raw); s = play_side(p)
        if s is None: continue
        by = raw['ball_y']; ol = p.who('O', 'OL')
        for i in second_level(p):
            x0, y0 = p.pos(i, 0); side = 'play' if (y0 - by) * s > 0 else 'back'
            for t in (.5, 1.0, 1.5, 2.0, 2.5):
                if not p.live(t): continue
                k = p.k(t); x, y = p.pos(i, k)
                if x is None: continue
                near = min((p.dist(i, b, k) or 99) for b in ol)
                o.setdefault((side, t), []).append((x, (y - y0) * s, near))
    print(path.split('/')[-1], fam)
    for side in ('play', 'back'):
        print('  ', side, ' | '.join(f"{t}s depth {q([a for a,_,_ in v])} flow {q([b for _,b,_ in v])} OL<1.5 {100*sum(c<1.5 for *_,c in v)/len(v):.0f}%" for (sd, t), v in sorted(o.items()) if sd == side))
