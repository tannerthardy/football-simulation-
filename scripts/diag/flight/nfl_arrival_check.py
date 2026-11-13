"""Is BDB 2025 pass_arrived the ball at the hands? For completed passes: the ball's distance to the targeted receiver
from 3 frames before pass_arrived to 3 after, and the frame of closest approach relative to pass_arrived, by the
thrower-to-catch distance bin. Prints a summary and a few plays per bin frame by frame.
   python3 -I scripts/diag/flight/nfl_arrival_check.py <bdb2025 dir> [weeks]
"""
import csv, sys, random
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1').split(',')]
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{root}/plays.csv')) if r['passResult'] == 'C'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
tgt = {}
for r in csv.DictReader(open(f'{root}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
ball = defaultdict(dict); ev = defaultdict(dict); qb = defaultdict(dict); rc = defaultdict(dict)
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            ball[k][f] = (float(r['x']), float(r['y']))
            e = r['event']
            if e in ('pass_forward', 'pass_arrived', 'pass_outcome_caught', 'pass_tipped') and e not in ev[k]: ev[k][e] = f
        elif pos.get(r['nflId']) == 'QB' and r['club'] == plays[k]['possessionTeam']: qb[k][f] = (float(r['x']), float(r['y']))
        elif r['nflId'] == tgt.get(k): rc[k][f] = (float(r['x']), float(r['y']))
d = lambda a, b: ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** .5
bins = defaultdict(list)
for k, e in ev.items():
    if 'pass_forward' not in e or 'pass_arrived' not in e: continue
    f0, f1 = e['pass_forward'], e['pass_arrived']
    if f0 not in qb[k] or f1 not in ball[k] or f1 not in rc[k]: continue
    dist = d(ball[k][f1], qb[k][f0]); b = min(8, int(dist // 5))
    rows = [(o, d(ball[k][f1 + o], rc[k][f1 + o])) for o in range(-3, 4) if f1 + o in ball[k] and f1 + o in rc[k]]
    closest = min(rows, key=lambda r: r[1])[0]
    bins[b].append({'k': k, 'rows': rows, 'closest': closest, 'tipped': 'pass_tipped' in e, 'caught': e.get('pass_outcome_caught', 0) - f1})
random.seed(1)
for b in sorted(bins):
    L = bins[b]; n = len(L)
    at = sum(1 for x in L if x['closest'] == 0) / n; pm1 = sum(1 for x in L if abs(x['closest']) <= 1) / n
    late = sum(1 for x in L if x['closest'] > 1) / n; early = sum(1 for x in L if x['closest'] < -1) / n
    d0 = sorted(dict(x['rows'])[0] for x in L if 0 in dict(x['rows']))
    print(f"{b*5:>2}-{b*5+5 if b < 8 else '':<3} n{n:<4} closest at arrived {at:.0%}, within 1 frame {pm1:.0%}, >1 late {late:.0%}, >1 early {early:.0%}; "
          f"ball-receiver at arrived p50 {d0[len(d0)//2]:.2f} p90 {d0[int(len(d0)*.9)]:.2f} yd; tipped {sum(x['tipped'] for x in L)}")
    for x in random.sample(L, min(3, n)):
        print('     ', x['k'], ' '.join(f"{o:+d}:{v:.1f}" for o, v in x['rows']), f"caught +{x['caught']}f")
