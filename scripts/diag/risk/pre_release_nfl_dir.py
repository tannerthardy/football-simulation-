# Local variant of coverage/C14-int-diag scripts/diag/pass-operators/pre_release_nfl.py: reads the extracted data/raw/bdb2025/big-data-bowl-data in place instead of the archive zip (same records; the argument ARCHIVE is ignored, pass x).
"""Build pre-release records from BDB 2025 raw tracking (the archive zip, read in place; nothing extracted).
Completed passes, not nullified; zone only by default, or cov=Man / cov=all (break_release.py uses all, with manzone). Per play, from the snap to the catch at 10 Hz: every player's
position, normalised so the offence attacks +x from the line of scrimmage (the ball's x at the snap), and the QB's
body orientation as a math angle in the same frame, and every player's orientation (fo). Output: the record format read by pre_release.py.
usage: python3 -I scripts/diag/pass-operators/pre_release_nfl.py ARCHIVE.zip OUT.jsonl.gz [weeks=1,2,3] [cov=Zone|Man|all] [tail=0]
(tail: frames kept after the catch, 10 Hz)"""
import sys, csv, io, gzip, json, math, zipfile, collections as C

GROUP = {'QB': 'QB', 'WR': 'WR', 'TE': 'TE', 'RB': 'RB', 'FB': 'RB', 'T': 'OL', 'G': 'OL', 'C': 'OL',
         'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'LB': 'LB',
         'CB': 'DB', 'SS': 'DB', 'FS': 'DB', 'DB': 'DB'}
zpath, out = sys.argv[1], sys.argv[2]
opt = dict(a.split('=') for a in sys.argv[3:])
weeks = [int(w) for w in opt.get('weeks', '1,2,3').split(',')]
COV = opt.get('cov', 'Zone'); TAIL = int(opt.get('tail', '0'))
class _Dir:   # the archive's members read in place from the extracted BDB 2025 directory
    def open(self, name): return open('/home/user/football-simulation-/data/raw/bdb2025/' + name, 'rb')
z = _Dir(); D = 'big-data-bowl-data/'
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
pos = {r['nflId']: GROUP.get(r['position']) for r in rd('players.csv')}
plays = {}
for r in rd('plays.csv'):
    if (COV == 'all' or r['pff_manZone'] == COV) and r['passResult'] == 'C' and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(poss=r['possessionTeam'], coverage=r['pff_passCoverage'], manzone=r['pff_manZone'])
target = {}
for r in rd('player_play.csv'):
    k = (r['gameId'], r['playId'])
    if k in plays and r['wasTargettedReceiver'] == '1': target[k] = r['nflId']
n = 0
with gzip.open(out, 'wt') as fo:
    for w in weeks:
        rows = C.defaultdict(list)
        for r in rd(f'tracking_week_{w}.csv'):
            k = (r['gameId'], r['playId'])
            if k in target: rows[k].append(r)
        for k, R in rows.items():
            frames = C.defaultdict(dict); ev = {}; ball = {}; dirn = R[0]['playDirection']
            for r in R:
                f = int(r['frameId'])
                if r['event'] not in ('', 'NA') and r['event'] not in ev: ev[r['event']] = f
                if r['nflId'] in ('', 'NA'): ball[f] = (float(r['x']), float(r['y'])); continue
                frames[f][r['nflId']] = r
            snap = ev.get('ball_snap'); rel = ev.get('pass_forward'); cat = ev.get('pass_outcome_caught')
            if snap is None or rel is None or cat is None or not (snap < rel < cat) or snap not in ball: continue
            los = ball[snap][0]; sg = 1 if dirn == 'right' else -1
            ids = sorted({i for f in frames.values() for i in f}, key=lambda i: i)
            club = {i: next(r['club'] for r in R if r['nflId'] == i) for i in ids}
            players = [dict(side='O' if club[i] == plays[k]['poss'] else 'D', group=pos.get(i)) for i in ids]
            if target[k] not in ids: continue
            qbs = [j for j, p in enumerate(players) if p['side'] == 'O' and p['group'] == 'QB']
            if len(qbs) != 1: continue
            xy, qbf, fol = [], [], []
            for f in range(snap, min(cat + TAIL, max(frames)) + 1):
                fr = frames.get(f, {}); row = []; orow = []
                for i in ids:
                    r = fr.get(i)
                    if r is None: row += [None, None]; orow.append(None); continue
                    x, y = float(r['x']), float(r['y'])
                    row += [round((x - los) * sg, 2), round(y if sg > 0 else 53.3 - y, 2)]
                    if r['o'] in ('', 'NA'): orow.append(None)
                    else: oo = math.radians(float(r['o'])); orow.append(round(math.atan2(math.cos(oo) * sg, math.sin(oo) * sg), 2))
                xy.append(row); fol.append(orow)
                rq = fr.get(ids[qbs[0]])
                if rq is None or rq['o'] in ('', 'NA'): qbf.append(None); continue
                o = math.radians(float(rq['o'])); vx, vy = math.sin(o) * sg, math.cos(o) * sg
                qbf.append(round(math.atan2(vy, vx), 3))
            by = ball[snap][1] if sg > 0 else 53.3 - ball[snap][1]
            fo.write(json.dumps(dict(src='nfl-bdb2025', id=f'{k[0]}-{k[1]}', dt=0.1, players=players, xy=xy, qbf=qbf, fo=fol,
                                     release=rel - snap, catch=cat - snap, target=ids.index(target[k]), qb=qbs[0],
                                     coverage=plays[k]['coverage'], manzone=plays[k]['manzone'], ball_y=round(by, 2))) + '\n'); n += 1
        print(f'week {w}: {len(rows)} zone completions with a target; written so far {n}', file=sys.stderr)
