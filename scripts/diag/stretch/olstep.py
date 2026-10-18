"""OL first steps by concept family, one operator for NFL and sim common
plays: mean OL depth gained (+ downfield) and lateral (+ play side, the
carrier's direction) at 0.3/0.5/0.7/1.0 s, play-side and backside halves.
usage: olstep.py FAMILY FILE.jsonl.gz [FILE2 ...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import play_side  # noqa: E402
fam = sys.argv[1]
q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
for path in sys.argv[2:]:
    o = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None or CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
        p = Play(raw); s = play_side(p)
        if s is None: continue
        by = raw['ball_y']; ol = p.who('O', 'OL')
        if len(ol) < 5: continue
        for t in (.3, .5, .7, 1.0):
            k = p.k(t)
            for i in ol:
                x0, y0 = p.pos(i, 0); x, y = p.pos(i, k)
                if x is None or x0 is None: continue
                half = 'play' if (y0 - by) * s > .5 else 'back' if (y0 - by) * s < -.5 else 'C'
                o.setdefault((half, t), []).append((x - x0, (y - y0) * s))
    print(path.split('/')[-1], fam)
    for half in ('play', 'C', 'back'):
        print('  ', half.ljust(5), ' | '.join(f"{t:.1f}s depth {q([d for d, _ in o.get((half, t), [])]):+.2f} lat {q([l for _, l in o.get((half, t), [])]):+.2f}" for t in (.3, .5, .7, 1.0)))
