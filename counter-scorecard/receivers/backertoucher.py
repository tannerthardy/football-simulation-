"""Box backers, NFL vs sim through run_film_reference.py's own loaders and definition: first toucher's group (OL/TE/RB),
time of first touch, and the backer's own depth movement before the carrier arrives.
    python3 -I backertoucher.py <repo> <nfl.jsonl.gz> <sim traces...>"""
import sys, statistics as st
from collections import Counter, defaultdict
sys.path.insert(0, sys.argv[1] + '/scripts/mechanics')
import run_film_reference as R
def go(plays, label):
    out = defaultdict(Counter); tt = defaultdict(list); bx = defaultdict(list); n = Counter()
    for play in plays:
        xy, players, c = play['xy'], play['players'], play['carrier']
        if not xy: continue
        dt = 0.1; k = lambda t: min(len(xy) - 1, max(0, int(round(t / dt))))
        ol = [i for i, q in enumerate(players) if q['side'] == 'O' and q['group'] == 'OL']
        if len(ol) < 5: continue
        cy = st.mean(xy[0][i][1] for i in ol)
        blockers = [i for i, q in enumerate(players) if q['side'] == 'O' and q['group'] in ('OL', 'TE', 'RB') and i != c]
        fam = play['concept']
        for j, q in enumerate(players):
            if q['side'] != 'D' or q['group'] != 'LB': continue
            x0, y0 = xy[0][j]
            if not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
            arrive = next((f for f in range(len(xy)) if xy[f][c][0] >= xy[f][j][0] - 1), None)
            last = arrive if arrive is not None else len(xy) - 1
            n[fam] += 1
            hit = next(((f, b) for f in range(3, last) for b in blockers
                        if xy[f][b][0] > -0.5 and ((xy[f][b][0] - xy[f][j][0]) ** 2 + (xy[f][b][1] - xy[f][j][1]) ** 2) ** .5 < 1.5), None)
            bx[fam].append(xy[last][j][0] - x0)
            if hit:
                out[fam][players[hit[1]]['group']] += 1; tt[fam].append(hit[0] * dt)
            else: out[fam]['untouched'] += 1
    for fam in R.CONCEPTS:
        if not n[fam]: continue
        N = n[fam]
        print(f'  {fam:13} {label}: n={N:5} ' + ' '.join(f'{g} {out[fam][g]/N:.0%}' for g in ('OL', 'TE', 'RB', 'untouched'))
              + f' | first touch p50 {st.median(tt[fam]):.1f}s | backer depth change to arrival p50 {st.median(bx[fam]):+.1f}')
go(R.nfl(sys.argv[2]), 'nfl'); go(R.sim(sys.argv[3:]), 'sim')
