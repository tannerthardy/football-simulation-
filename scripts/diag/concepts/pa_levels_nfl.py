"""NFL side of pa-levels.ts (same operator): traditional drop-backs, play action vs not, by alignment (BDB 2025 weeks
given). LBs: off-ball box defenders at the snap (3-8 yd off the line, within 6 yd of the ball); safeties: 9+ yd deep.
Group depth off the line at the snap, 0.5..2.5 s and at pass_forward; for a defender who came 0.3 yd or more
downhill, when he turned back (first retreat at 0.5 yd/s or more after his deepest downhill point, before the
pass) and his depth at the throw; the throw's air yards (passLength), time to throw, completion and YAC.
   python3 -I scripts/diag/concepts/pa_levels_nfl.py <bdb2025 dir> [weeks]  -> prints the summary table
"""
import csv, sys, json, statistics as st
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = {}
for r in csv.DictReader(open(f'{root}/plays.csv')):
    if r['isDropback'] not in ('TRUE', 'True', '1') or r['dropbackType'] != 'TRADITIONAL' or r['offenseFormation'] == 'EMPTY': continue
    plays[(r['gameId'], r['playId'])] = {'pa': r['playAction'] in ('TRUE', 'True', '1'), 'def': r['defensiveTeam'], 'gun': r['offenseFormation'] == 'SHOTGUN',
        'air': float(r['passLength']) if r['passLength'] not in ('', 'NA') else None, 'res': r['passResult'], 'yds': float(r['yardsGained'] or 0),
        'ttt': float(r['timeToThrow']) if r['timeToThrow'] not in ('', 'NA') else None}
tr = defaultdict(lambda: defaultdict(dict)); snap = {}; rel = {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            if r['event'] == 'ball_snap': snap[k] = (float(r['x']), float(r['y']), f, 1 if r['playDirection'] == 'right' else -1)
            if r['event'] == 'pass_forward': rel[k] = f
            continue
        if r['club'] == plays[k]['def']: tr[k][r['nflId']][f] = float(r['x']), float(r['y'])
rows = []
for k, P in tr.items():
    if k not in snap: continue
    bx, by, sf, d = snap[k]; rf = rel.get(k)
    dep = lambda x: (x - bx) * d
    groups = {'lbs': [], 'saf': []}
    for pid, fr in P.items():
        if sf not in fr: continue
        x0, y0 = fr[sf]; d0 = dep(x0)
        g = 'lbs' if 3 <= d0 <= 8 and abs(y0 - by) <= 6 else 'saf' if d0 >= 9 else None
        if not g: continue
        at = {t: dep(fr[sf + int(t * 10)][0]) for t in (0.5, 1.0, 1.5, 2.0, 2.5) if sf + int(t * 10) in fr}
        end = rf if rf else sf + 40
        mn, mt, turn = d0, sf, None
        for f in range(sf + 1, end + 1):
            if f not in fr or f - 1 not in fr: continue
            dd = dep(fr[f][0])
            if dd < mn: mn, mt = dd, f
            v = (dep(fr[f][0]) - dep(fr[f - 1][0])) / 0.1
            if turn is None and d0 - mn >= 0.3 and v >= 0.5: turn = (f - sf) / 10
        groups[g].append({'snap': d0, 'at': at, 'bite': d0 - mn, 'biteT': (mt - sf) / 10, 'turn': turn, 'throwD': dep(fr[rf][0]) if rf and rf in fr else None})
    rows.append({**plays[k], **groups})
json.dump(rows, open('/tmp/claude-0/-home-user-football-simulation-/da394129-5cff-5f9c-a470-5d59064c1c67/scratchpad/nfl_levels.json', 'w'))
print('saved', len(rows))
