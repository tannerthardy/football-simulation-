"""NFL side of the deep-ball table (Integration, 2026-11-24, DEPTH_FIRST): BDB 2025 plays.csv + player_play.csv, weeks
1-9, every targeted pass (passResult C / I / IN, passLength given): the targeted receiver's routeRan, PFF's coverage
(single-high: Cover-1 / Cover-3 variants; two-high: Cover-2 / Cover-4 / Cover-6 / 2-Man; else other), air yards
(passLength), completion and interception. Prints per game: targeted passes, 20+ air-yard attempts and completions,
and by shell x route (POST, GO, CORNER, everything else 20+): attempts, completion %, interception %.
usage: python3 -I scripts/diag/defense-film/nfl_deep_ball.py"""
import csv, os, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
P = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(D + '/plays.csv'))}
route = {}
for r in csv.DictReader(open(D + '/player_play.csv')):
    if r['wasTargettedReceiver'] == '1': route[(r['gameId'], r['playId'])] = r['routeRan']
def shell(c):
    c = c or ''
    if c.startswith('Cover-1') or c.startswith('Cover-3'): return 'single-high'
    if c.startswith(('Cover-2', 'Cover-4', 'Cover-6', '2-Man', 'Quarters', 'Cover 6')): return 'two-high'
    return 'other'
rows = []
for k, p in P.items():
    if p['passResult'] not in ('C', 'I', 'IN') or p['passLength'] in ('', 'NA'): continue
    rows.append(dict(g=k[0], air=float(p['passLength']), c=p['passResult'] == 'C', i=p['passResult'] == 'IN', sh=shell(p['pff_passCoverage']), rt=route.get(k, 'NA'), cov=p['pff_passCoverage']))
games = len({r['g'] for r in rows}) * 2  # per team-game, as ours (two offences a game)
deep = [r for r in rows if r['air'] >= 20]
print(f'NFL: team-games {games}; targeted {len(rows) / games:.1f} per team-game; 20+ air attempts {len(deep) / games:.2f}, completions {sum(r["c"] for r in deep) / games:.2f} per team-game (comp {100 * sum(r["c"] for r in deep) / len(deep):.1f}%)')
print('coverage labels:', collections.Counter(r['cov'] for r in rows).most_common(14))
for sh in ('single-high', 'two-high'):
    for rt in ('POST', 'GO', 'CORNER', 'other'):
        S = [r for r in deep if r['sh'] == sh and (r['rt'] == rt if rt != 'other' else r['rt'] not in ('POST', 'GO', 'CORNER'))]
        if S: print(f'  {sh:11s} {rt:6s} 20+: n {len(S):4d}, per team-game {len(S) / games:.3f}, comp {100 * sum(r["c"] for r in S) / len(S):5.1f}%, int {100 * sum(r["i"] for r in S) / len(S):4.1f}%')
