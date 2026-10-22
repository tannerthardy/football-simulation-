"""Line flow by run concept family, one operator for NFL tracking and sim
common plays. For OL and DL while an opponent is within 1.0 yd (a proximity
proxy, not an engagement), 0.3-3 s after the snap: mean velocity toward the
play side (the sign of the carrier's lateral displacement at 3 s), by window
0.3-1 / 1-2 / 2-3 s. RB carries only.
usage: lineflow.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
mean = lambda v: round(sum(v) / len(v), 2) if v else None
for path in sys.argv[1:]:
    W = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB': continue
        k3 = p.k(min(3.0, p.end)); cy3 = p.pos(c, k3)[1]
        if cy3 is None: continue
        side = 1 if cy3 - raw['ball_y'] > 0 else -1
        for k in range(p.k(0.3), k3):
            t = k * p.dt; w = '0.3-1' if t < 1 else '1-2' if t < 2 else '2-3'
            for grp, opp in (('OL', p.who('D', 'DL') + p.who('D', 'LB')), ('DL', p.who('O', 'OL') + p.who('O', 'TE'))):
                for i in p.who('O' if grp == 'OL' else 'D', grp):
                    if p.pos(i, k)[0] is None or min((p.dist(o, i, k) for o in opp), default=9) > 1.0: continue
                    W.setdefault((fam, grp, w), []).append(p.velocity(i, k)[1] * side)
    print(path.split('/')[-1])
    for fam in ('inside_zone', 'outside_zone', 'man_duo', 'gap_pull'):
        print(f'  {fam:13s} ' + ' | '.join(f'{grp} ' + ' '.join(f'{mean(W.get((fam, grp, w), []))}' for w in ('0.3-1', '1-2', '2-3')) for grp in ('OL', 'DL')))
