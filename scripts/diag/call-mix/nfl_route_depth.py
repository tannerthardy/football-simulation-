"""NFL routes run by label and break depth, per down-and-distance bucket (call-mix fit input).

  python3 -I scripts/diag/call-mix/nfl_route_depth.py data/raw/bdb2025/big-data-bowl-data 1,2,3 > out/call-mix/nfl_routes.jsonl

One row per route runner (player_play wasRunningRoute) on a dropback (not nullified, no spike or kneel).
Depth = the runner's deepest point downfield of the ball's snap spot from the snap to the throw
(pass_forward), or to 3.0 s if the ball is not thrown by then. For HITCH (hitch, curl, comeback),
OUT (quick out, out, deep out) and IN (short in, dig) that is the break depth: the route stops,
flattens or comes back after it. BDB's labels carry no depth; this splits them as the sim's route
tree does (hitch 5, curl 11, comeback 14; quick_out 5, out 10, deep_out 14; short_in 5, dig 12)."""
import csv, json, sys, collections
D = sys.argv[1]; weeks = sys.argv[2].split(',')
T = lambda v: v in ('1', 'TRUE', 'True')
plays = {}
for p in csv.DictReader(open(f'{D}/plays.csv')):
    if T(p['isDropback']) and p['playNullifiedByPenalty'] != 'Y' and not T(p['qbSpike']) and not T(p['qbKneel']):
        plays[(p['gameId'], p['playId'])] = p
route = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and T(r['wasRunningRoute']) and r['routeRan'] not in ('', 'NA'):
        route[(k, r['nflId'])] = r['routeRan']
for w in weeks:
    cur, rows = None, []
    def flush():
        if cur is None: return
        p = plays[cur]
        snap = next((int(r['frameId']) for r in rows if r['event'] == 'ball_snap'), None)
        if snap is None: return
        fwd = next((int(r['frameId']) for r in rows if r['event'] == 'pass_forward'), None)
        end = min(fwd if fwd is not None else 10 ** 9, snap + 30)
        dirn = 1 if rows[0]['playDirection'] == 'right' else -1
        ball = next((float(r['x']) for r in rows if r['nflId'] in ('', 'NA') and int(r['frameId']) == snap), None)
        if ball is None: return
        deep = collections.defaultdict(lambda: -99.0)
        for r in rows:
            f = int(r['frameId'])
            if snap <= f <= end and (cur, r['nflId']) in route:
                deep[r['nflId']] = max(deep[r['nflId']], (float(r['x']) - ball) * dirn)
        for pid, d in deep.items():
            print(json.dumps({'down': int(p['down']), 'dist': int(p['yardsToGo']), 'pa': T(p['playAction']),
                              'label': route[(cur, pid)], 'depth': round(d, 1), 'thrown': fwd is not None}))
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        if k != cur:
            flush(); cur, rows = k, []
        rows.append(r)
    flush()
