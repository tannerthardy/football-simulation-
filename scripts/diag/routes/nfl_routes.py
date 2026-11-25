"""NFL (BDB 2025, 2022 weeks 1-9) dropbacks for the route timing chart, in Tools' open-census play format (nfl_plays.py,
tools/open-census 0a0c86fa5), recorded past the release so breaks after it are seen: from the snap (frame 0) to the
ball's arrival (pass_arrived, or the first pass_outcome_* event) or 6.0 s, whichever is first; with no throw, to the
first sack / run / fumble event or 4.5 s. x = yards past the line in the offense's direction, y across (not mirrored,
as nfl_plays.py). Adds: arr (arrival frame), catch (pass_outcome_caught frame), recv (the target if caught).
  python3 -I scripts/diag/routes/nfl_routes.py DATA_DIR OUT.jsonl.gz [--weeks 1-9]"""
import csv, gzip, json, sys, collections
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]
weeks = range(1, 10)
if '--weeks' in sys.argv:
    a, b = sys.argv[sys.argv.index('--weeks') + 1].split('-'); weeks = range(int(a), int(b) + 1)
pos_of = {r['nflId']: r['position'] for r in csv.DictReader(open(D + '/players.csv'))}
plays = {}
for r in csv.DictReader(open(D + '/plays.csv')):
    if r['isDropback'] == 'TRUE' and r['passResult'] in ('C', 'I', 'S', 'R', 'IN') and r['playNullifiedByPenalty'] != 'Y' and r['qbSpike'] != 'TRUE':
        plays[(r['gameId'], r['playId'])] = r
pp = collections.defaultdict(dict)
for r in csv.DictReader(open(D + '/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays: pp[k][r['nflId']] = r
STOP = {'qb_sack', 'qb_strip_sack', 'run', 'fumble', 'qb_slide', 'out_of_bounds', 'tackle'}
n_out = 0
WHY = collections.Counter()
with gzip.open(OUT, 'wt') as out:
    for w in weeks:
        cur = None; rows = []
        def flush(key, rows):
            global n_out
            if key not in plays or not rows: return
            p = plays[key]; meta = pp[key]; off = p['possessionTeam']
            by = collections.defaultdict(list)
            for r in rows: by[r[2]].append(r)  # nflId
            snap = rel = None; endf = None
            ball = by.get('NA', [])
            for r in rows:
                ev = r[17]
                if ev == 'ball_snap' and snap is None: snap = int(r[4])
            if snap is None: WHY['nosnap'] += 1; return
            arr = catch = None
            for r in rows:
                ev = r[17]
                if ev in ('pass_forward', 'pass_shovel') and rel is None: rel = int(r[4])
                if ev in STOP and endf is None and int(r[4]) > snap: endf = int(r[4])
                if rel is not None and arr is None and (ev == 'pass_arrived' or ev.startswith('pass_outcome')) and int(r[4]) > rel: arr = int(r[4])
                if ev == 'pass_outcome_caught' and catch is None: catch = int(r[4])
            last = min(arr if arr is not None else snap + 60, snap + 60) if rel is not None else min(endf if endf else snap + 45, snap + 45)
            if last - snap < 10: WHY['short'] += 1; return
            nf = last - snap + 1
            fb = {int(r[4]): r for r in ball}
            if snap not in fb: WHY['nofb'] += 1; return
            sgn = 1 if rows[0][9] == 'right' else -1
            los = float(fb[snap][10])
            ids = [i for i in by if i != 'NA']
            if len(ids) != 22: WHY['ids%d' % len(ids)] += 1; return
            X = np.full((22, nf), np.nan); Y = np.full((22, nf), np.nan); roster = []
            for i, nid in enumerate(ids):
                team = by[nid][0][8]; side = 'O' if team == off else 'D'; m = meta.get(nid, {})
                roster.append({'side': side, 'pos': pos_of.get(nid, '?'), 'id': nid, 'route': m.get('wasRunningRoute') == '1', 'routeRan': m.get('routeRan'), 'target': m.get('wasTargettedReceiver') == '1',
                               'motion': (m.get('inMotionAtBallSnap') == 'TRUE' or m.get('motionSinceLineset') == 'TRUE')})
                for r in by[nid]:
                    f = int(r[4]) - snap
                    if 0 <= f < nf: X[i, f] = sgn * (float(r[10]) - los); Y[i, f] = float(r[11])
            if np.isnan(X).any() or np.isnan(Y).any(): WHY['nan'] += 1; return
            qbs = [i for i, r in enumerate(roster) if r['side'] == 'O' and r['pos'] == 'QB']  # hadDropback is only set on completions and sacks in this file; the QB is the offense's QB
            qbs.sort(key=lambda i: X[i, 0])  # a second QB on the field (a trick play) is the one nearer the line: the deepest is the passer
            if not qbs: WHY['noqb'] += 1; return
            out.write(json.dumps({'src': 'nfl', 'id': f'{key[0]}-{key[1]}', 'cov': p['pff_passCoverage'], 'manzone': p['pff_manZone'], 'align': p['receiverAlignment'],
                                  'pa': p['playAction'] == 'TRUE', 'form': p['offenseFormation'], 'players': roster, 'qb': qbs[0],
                                  'rel': (rel - snap) if rel is not None else None, 'result': p['passResult'],
                                  'arr': (arr - snap) if arr is not None else None, 'catch': (catch - snap) if catch is not None and catch - snap < nf else None,
                                  'recv': next((i for i, r in enumerate(roster) if r['target']), -1) if catch is not None else -1,
                                  'x': np.round(X, 2).tolist(), 'y': np.round(Y, 2).tolist()}) + '\n'); n_out += 1
        for r in csv.reader(open(f'{D}/tracking_week_{w}.csv')):
            if r[0] == 'gameId': continue
            k = (r[0], r[1])
            if k != cur: flush(cur, rows); cur = k; rows = []
            if k in plays: rows.append(r)
        flush(cur, rows)
        print('week', w, n_out, dict(WHY), file=sys.stderr)
print(n_out, 'dropbacks ->', OUT, dict(WHY), file=sys.stderr)
