"""One operator for NFL tracking and sim common plays. Outside zone: OL displacement from the snap (forward / lateral toward the play) at 0.3/0.5/0.8/1.0 s,
by OL position order relative to the play side (playside tackle .. backside tackle), and distance to the
nearest defender. usage: ozpath.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    W = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != 'outside_zone': continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB': continue
        k3 = p.k(min(3.0, p.end)); cy3 = p.pos(c, k3)[1]
        if cy3 is None: continue
        side = 1 if cy3 - raw['ball_y'] > 0 else -1
        ols = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
        if len(ols) != 5: continue
        ols.sort(key=lambda i: -p.pos(i, 0)[1] * side)  # playside first
        for rank, i in enumerate(ols):
            x0, y0 = p.pos(i, 0)
            for t in (0.3, 0.5, 0.8, 1.0):
                k = p.k(t); x, y = p.pos(i, k)
                if x is None: continue
                nd = min((p.dist(d, i, k) for d in p.who('D')), default=9)
                W.setdefault((rank, t), []).append((x - x0, (y - y0) * side, nd))
    print(path.split('/')[-1])
    names = ['PST', 'PSG', 'C', 'BSG', 'BST']
    for rank in range(5):
        print(f'  {names[rank]}: ' + ' | '.join(f't{t}: fwd {q([s[0] for s in W.get((rank, t), [])])} lat {q([s[1] for s in W.get((rank, t), [])])} near {q([s[2] for s in W.get((rank, t), [])])}' for t in (0.3, 0.5, 1.0)))
