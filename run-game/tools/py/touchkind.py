"""First OL touch on a box backer, NFL vs sim (run_film_reference loaders and definition): was that OL also within
1.5 yd of a DL at that moment (working in the wash) or free; his lateral travel toward the play and depth then."""
import sys, statistics as st
from collections import Counter, defaultdict
sys.path.insert(0, sys.argv[1] + '/scripts/mechanics')
import run_film_reference as R
def go(plays, label):
    res = defaultdict(Counter); lat = defaultdict(list); dep = defaultdict(list); n = Counter()
    for play in plays:
        xy, players, c = play['xy'], play['players'], play['carrier']
        if not xy: continue
        ol = [i for i, q in enumerate(players) if q['side'] == 'O' and q['group'] == 'OL']
        dl = [i for i, q in enumerate(players) if q['side'] == 'D' and q['group'] == 'DL']
        if len(ol) < 5: continue
        cy = st.mean(xy[0][i][1] for i in ol)
        cross = next((f for f in range(len(xy)) if xy[f][c][0] > 0), len(xy) - 1)
        side = 1 if xy[cross][c][1] > cy else -1
        fam = play['concept']
        D = lambda f, a, b: ((xy[f][a][0] - xy[f][b][0]) ** 2 + (xy[f][a][1] - xy[f][b][1]) ** 2) ** .5
        for j, q in enumerate(players):
            if q['side'] != 'D' or q['group'] != 'LB': continue
            x0, y0 = xy[0][j]
            if not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
            arrive = next((f for f in range(len(xy)) if xy[f][c][0] >= xy[f][j][0] - 1), None)
            last = arrive if arrive is not None else len(xy) - 1
            n[fam] += 1
            hit = next(((f, b) for f in range(3, last) for b in ol if xy[f][b][0] > -0.5 and D(f, b, j) < 1.5), None)
            if not hit: continue
            f, b = hit
            wash = any(D(f, b, d) < 1.5 for d in dl)
            res[fam]['OL touch, also on a DL (wash)' if wash else 'OL touch, free (climbed)'] += 1
            lat[fam].append((xy[f][b][1] - xy[0][b][1]) * side); dep[fam].append(xy[f][b][0])
    for fam in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER'):
        N = n[fam]
        if not N: continue
        print(f'  {fam:13} {label}: n={N} ' + '; '.join(f'{k} {v/N:.0%}' for k, v in sorted(res[fam].items()))
              + f' | toucher lateral toward play p50 {st.median(lat[fam]):+.1f} yd, depth p50 {st.median(dep[fam]):+.1f}')
go(R.nfl(sys.argv[2]), 'nfl'); go(R.sim(sys.argv[3:]), 'sim')
