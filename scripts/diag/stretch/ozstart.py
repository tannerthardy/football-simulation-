"""Outside zone from the snap, one operator for NFL tracking and sim common plays:
OL and DL lateral velocity toward the play side every 0.1 s to 1.5 s (all players, not only in contact), lateral yards gained, and the share within 1.0 yd of an opponent. RB carries only. usage: ozstart.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
mean = lambda v: round(sum(v) / len(v), 2) if v else None
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
        for k in range(1, min(p.frames, 16)):
            for grp, own, opp in (('OL', 'O', 'D'), ('DL', 'D', 'O')):
                for i in p.who(own, grp):
                    if p.pos(i, k)[0] is None: continue
                    near = min((p.dist(o, i, k) for o in p.who(opp)), default=9) <= 1.0
                    W.setdefault((grp, k), []).append((p.velocity(i, k)[1] * side, near, p.pos(i, k)[1] * side - p.pos(i, 0)[1] * side if p.pos(i, 0)[1] is not None else 0))
    print(path.split('/')[-1])
    for grp in ('OL', 'DL'):
        print(f'  {grp} t:      ' + ' '.join(f'{k / 10:5.1f}' for k in range(1, 16)))
        print(f'  {grp} vel:    ' + ' '.join(f'{mean([s[0] for s in W.get((grp, k), [])]):5.2f}' for k in range(1, 16)))
        print(f'  {grp} lat yd: ' + ' '.join(f'{mean([s[2] for s in W.get((grp, k), [])]):5.2f}' for k in range(1, 16)))
        print(f'  {grp} near%:  ' + ' '.join(f'{100 * mean([s[1] for s in W.get((grp, k), [])]):5.0f}' for k in range(1, 16)))
