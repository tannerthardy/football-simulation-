"""NFL (BDB 2025, 2022 weeks 1-9) designed runs (a handoff) in the open-census play format, recorded through the end of the play (the control for post_catch_accel.py: catch = the handoff frame, recv = the rusher).
  python3 -I scripts/diag/census/nfl_catches.py DATA_DIR OUT.jsonl.gz
A play: positions every 0.1 s from the snap (frame 0) to the end of the play (first tackle / out of bounds / touchdown / fumble event after the catch, 15 s at most); x = yards past the line (the football's x at the snap, offense
direction), y across. catch = the pass_outcome_caught frame, recv = the receiver (hadPassReception), rel = the pass_forward frame, end = the last frame. players as in nfl_plays.py. One operator reads both sides (flat_yac_report.py)."""
import csv, gzip, json, sys, collections
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]
pos_of = {r['nflId']: r['position'] for r in csv.DictReader(open(D + '/players.csv'))}
plays = {}
for r in csv.DictReader(open(D + '/plays.csv')):
    if r['isDropback'] == 'FALSE' and r['playNullifiedByPenalty'] != 'Y' and r['qbKneel'] != 'TRUE' and r['qbSneak'] != 'TRUE': plays[(r['gameId'], r['playId'])] = r
pp = collections.defaultdict(dict)
for r in csv.DictReader(open(D + '/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays: pp[k][r['nflId']] = r
END = {'tackle', 'out_of_bounds', 'touchdown', 'fumble', 'qb_slide', 'safety', 'fumble_defense_recovered', 'fumble_offense_recovered'}
WHY = collections.Counter(); n_out = 0
with gzip.open(OUT, 'wt') as out:
    for w in range(1, 10):
        cur = None; rows = []
        def flush(key, rows):
            global n_out
            if key not in plays or not rows: return
            p = plays[key]; meta = pp[key]; off = p['possessionTeam']
            by = collections.defaultdict(list)
            for r in rows: by[r[2]].append(r)
            ev = {}
            for r in rows:
                e = r[17]
                if e != 'NA' and e not in ev: ev[e] = int(r[4])
            snap, catch = ev.get('ball_snap'), ev.get('handoff'); rel = snap
            if snap is None or catch is None: WHY['noevent'] += 1; return
            ends = [f for e, f in ev.items() if e in END and f >= catch]
            last = min(min(ends) if ends else catch + 60, snap + 150)
            if last <= catch: WHY['short'] += 1; return
            nf = last - snap + 1
            fb = {int(r[4]): r for r in by.get('NA', [])}
            if snap not in fb: WHY['nofb'] += 1; return
            ids = [i for i in by if i != 'NA']
            if len(ids) != 22: WHY['ids'] += 1; return
            sgn = 1 if rows[0][9] == 'right' else -1; los = float(fb[snap][10])
            X = np.full((22, nf), np.nan); Y = np.full((22, nf), np.nan); roster = []
            for i, nid in enumerate(ids):
                team = by[nid][0][8]; m = meta.get(nid, {})
                roster.append({'side': 'O' if team == off else 'D', 'pos': pos_of.get(nid, '?'), 'id': nid, 'route': m.get('wasRunningRoute') == '1', 'target': m.get('wasTargettedReceiver') == '1',
                               'recv': m.get('hadRushAttempt') == '1', 'motion': (m.get('inMotionAtBallSnap') == 'TRUE' or m.get('motionSinceLineset') == 'TRUE')})
                for r in by[nid]:
                    f = int(r[4]) - snap
                    if 0 <= f < nf: X[i, f] = sgn * (float(r[10]) - los); Y[i, f] = float(r[11])
            if np.isnan(X).any() or np.isnan(Y).any(): WHY['nan'] += 1; return
            qbs = sorted([i for i, r in enumerate(roster) if r['side'] == 'O' and r['pos'] == 'QB'], key=lambda i: X[i, 0])
            rc = [i for i, r in enumerate(roster) if r['recv']]
            if not qbs or not rc: WHY['noqb/recv'] += 1; return
            out.write(json.dumps({'src': 'nfl', 'id': f'{key[0]}-{key[1]}', 'cov': p['pff_passCoverage'], 'manzone': p['pff_manZone'], 'align': p['receiverAlignment'], 'pa': False,
                                  'players': roster, 'qb': qbs[0], 'rel': 0, 'catch': catch - snap, 'recv': rc[0], 'x': np.round(X, 2).tolist(), 'y': np.round(Y, 2).tolist()}) + '\n'); n_out += 1
        for r in csv.reader(open(f'{D}/tracking_week_{w}.csv')):
            if r[0] == 'gameId': continue
            k = (r[0], r[1])
            if k != cur: flush(cur, rows); cur = k; rows = []
            if k in plays: rows.append(r)
        flush(cur, rows)
        print('week', w, n_out, dict(WHY), file=sys.stderr)
print(n_out, 'completions ->', OUT, dict(WHY), file=sys.stderr)
