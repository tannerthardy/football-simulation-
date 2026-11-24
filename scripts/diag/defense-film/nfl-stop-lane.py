"""NFL side of stop_lane.py (Integration, 2026-11-24): adds each offensive player's BDB routeRan (`routeId`) and keeps
each defender's PFF assignment, on the NFL defense-film rows (nfl-defense-film.py), passes only. The film orders
players by (offence first, roster position, nflId); the same order is rebuilt from player_play.csv for the play, and
a row is kept only when the rebuilt positions match the film's.
usage: python3 -I scripts/diag/defense-film/nfl-stop-lane.py FILM.jsonl OUT.jsonl"""
import json, os, sys
import pandas as pd
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
OFF = {(r.gameId, r.playId): r.possessionTeam for r in plays.itertuples()}
pos = dict(zip(*[pd.read_csv(os.path.join(D, 'players.csv'))[c] for c in ('nflId', 'position')]))
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'teamAbbr', 'routeRan'])
G = {k: v for k, v in pp.groupby(['gameId', 'playId'])}
out = open(sys.argv[2], 'w'); n = bad = 0
for l in open(sys.argv[1]):
    r = json.loads(l)
    if r['kind'] != 'pass': continue
    g, p = map(int, r['id'].split('-')); T = G.get((g, p))
    if T is None or len(T) != 22: bad += 1; continue
    off = OFF[(g, p)]
    ids = sorted(T.itertuples(), key=lambda q: (q.teamAbbr != off, pos.get(q.nflId, ''), q.nflId))
    if [pos.get(q.nflId, '') for q in ids] != [pl['pos'] for pl in r['players']]: bad += 1; continue
    for pl, q in zip(r['players'], ids):
        pl['routeId'] = q.routeRan if isinstance(q.routeRan, str) else None
    out.write(json.dumps(r) + '\n'); n += 1
print('pass plays', n, 'dropped', bad)
