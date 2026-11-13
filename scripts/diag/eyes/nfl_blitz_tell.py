"""Blitz predictability from the snap picture (BDB 2025 wk1-3, dropback, no PA, all results).
Run: python3 -I nfl_blitz_tell.py [datadir] [outdir]"""
import csv, sys, os, collections, json
D = sys.argv[1] if len(sys.argv) > 1 else '/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/user/fb-gather/out/eyes'
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3)
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))
         if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
rushers, tgtpos = collections.Counter(), {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r['wasInitialPassRusher'] in ('1', 'TRUE'): rushers[k] += 1
    if r['wasTargettedReceiver'] == '1': tgtpos[k] = pos.get(r['nflId'], '?')
snap = collections.defaultdict(list)
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, cl, pd, x, y, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'club', 'playDirection', 'x', 'y', 'event'))
        for row in rd:
            if row[e] != 'ball_snap': continue
            k = (row[g], row[p])
            if k in plays: snap[k].append((row[n], row[cl], float(row[x]), float(row[y]), row[pd]))
OL = {'T', 'G', 'C'}; recs, drops = [], collections.Counter()
for k, pr in plays.items():
    rows = snap.get(k)
    if not rows: drops['no_snap_frame'] += 1; continue
    b = [r for r in rows if r[1] == 'football']
    if not b: drops['no_ball'] += 1; continue
    bx, by = b[0][2], b[0][3]; sg = 1 if b[0][4] == 'right' else -1; off = pr['possessionTeam']
    D_ = [r for r in rows if r[1] not in (off, 'football')]; O = [r for r in rows if r[1] == off]
    dep = lambda r: sg * (r[2] - bx)
    ol = [r for r in O if pos.get(r[0]) in OL]
    if len(ol) < 5: drops['lt5_OL'] += 1; continue
    lo, hi = min(r[3] for r in ol), max(r[3] for r in ol)
    te = [r for r in O if pos.get(r[0]) == 'TE' and abs(dep(r)) <= 2 and
          (abs(r[3] - lo) <= 1.5 if r[3] < (lo + hi) / 2 else abs(r[3] - hi) <= 1.5)]
    box = sum(0 <= dep(r) <= 7.5 and abs(r[3] - by) <= 6 for r in D_)
    deep = sorted((dep(r) for r in D_), reverse=True)
    recs.append(dict(blitz=rushers[k] >= 5, rushers=rushers[k], box=box, online=sum(0 <= dep(r) <= 2 for r in D_),
                     deepest=deep[0], high=sum(d > 10 for d in deep), blk=5 + len(te), cov=pr['pff_passCoverage'],
                     res=pr['passResult'], ttt=float(pr['timeToThrow']) if pr['timeToThrow'] not in ('NA', '') else None,
                     tpos=tgtpos.get(k)))
json.dump(recs, open(f'{OUT}/nfl_blitz_tell.json', 'w'))
def q(v, p):
    v = sorted(v); i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
def auc(a, b):
    c = collections.Counter(b); nb = len(b); s = 0
    below = {v: sum(c[u] for u in c if u < v) for v in set(a)}
    for v in a: s += below[v] + 0.5 * c[v]
    return s / (len(a) * nb)
br = lambda rs: f'{100*sum(r["blitz"] for r in rs)/len(rs):.0f}% ({len(rs)})' if rs else '- (0)'
for r in recs: r['bmb'] = r['box'] - r['blk']; r['shell'] = 'two-high' if r['high'] >= 2 else 'one-high' if r['high'] == 1 else 'zero-high'
B = [r for r in recs if r['blitz']]; N = [r for r in recs if not r['blitz']]
L = [f"Plays {len(recs)} (dropped {dict(drops)}); blitz (5+ initial rushers) {len(B)} = {100*len(B)/len(recs):.0f}%; "
     f"blockers dist {dict(sorted(collections.Counter(r['blk'] for r in recs).items()))}"]
L += ['\n**1. Blitz rate (n)**', '| box-blk | ≤-1 | 0 | +1 | +2 | +3+ |', '|---|---|---|---|---|---|',
      '| | ' + ' | '.join(br([r for r in recs if f(r['bmb'])]) for f in (lambda v: v <= -1, lambda v: v == 0, lambda v: v == 1, lambda v: v == 2, lambda v: v >= 3)) + ' |',
      '| on line | ≤4 | 5 | 6 | 7+ | |', '|---|---|---|---|---|---|',
      '| | ' + ' | '.join(br([r for r in recs if f(r['online'])]) for f in (lambda v: v <= 4, lambda v: v == 5, lambda v: v == 6, lambda v: v >= 7)) + ' | |',
      '| shell | two-high | one-high | zero-high | | |', '|---|---|---|---|---|---|',
      '| | ' + ' | '.join(br([r for r in recs if r['shell'] == s]) for s in ('two-high', 'one-high', 'zero-high')) + ' | | |']
L.append(f"\n**2. AUC for blitz:** box-blk {auc([r['bmb'] for r in B],[r['bmb'] for r in N]):.2f}, on-line {auc([r['online'] for r in B],[r['online'] for r in N]):.2f}, "
         f"box {auc([r['box'] for r in B],[r['box'] for r in N]):.2f}, -#deep>10 {auc([-r['high'] for r in B],[-r['high'] for r in N]):.2f}, -deepest depth {auc([-r['deepest'] for r in B],[-r['deepest'] for r in N]):.2f}")
L += ['Rule "on-line ≥ X or box-blk ≥ Y": hit% / false-alarm% (flagged share)', '| X \\ Y | ≥1 | ≥2 | ≥3 | never |', '|---|---|---|---|---|']
for X in (5, 6, 7, 99):
    cells = []
    for Y in (1, 2, 3, 99):
        f = lambda r: r['online'] >= X or r['bmb'] >= Y
        cells.append(f"{100*sum(map(f,B))/len(B):.0f}/{100*sum(map(f,N))/len(N):.0f} ({100*sum(map(f,recs))/len(recs):.0f})")
    L.append(f"| {'never' if X == 99 else '≥'+str(X)} | " + ' | '.join(cells) + ' |')
L += ['\n**3. By pff_passCoverage**', '| coverage | n | blitz | box p50 | on-line p50 | box-blk p50 | 2-high% |', '|---|---|---|---|---|---|---|']
for cv, c in collections.Counter(r['cov'] for r in recs).most_common():
    rs = [r for r in recs if r['cov'] == cv]
    if len(rs) < 15: continue
    L.append(f"| {cv} | {len(rs)} | {100*sum(r['blitz'] for r in rs)/len(rs):.0f}% | {q([r['box'] for r in rs],.5):.0f} | {q([r['online'] for r in rs],.5):.0f} | "
             f"{q([r['bmb'] for r in rs],.5):.0f} | {100*sum(r['shell']=='two-high' for r in rs)/len(rs):.0f}% |")
L += ['\n**4. Offense: blitz vs no blitz**', '| | n | quick (<1.8s) per play | sack% | scramble% | TTT p50 | quick-throw target pos share |', '|---|---|---|---|---|---|---|']
for nm, rs in (('blitz', B), ('no blitz', N)):
    qk = [r for r in rs if r['ttt'] is not None and r['ttt'] < 1.8 and r['res'] in ('C', 'I', 'IN')]
    ps = collections.Counter(r['tpos'] for r in qk)
    L.append(f"| {nm} | {len(rs)} | {100*len(qk)/len(rs):.0f}% | {100*sum(r['res']=='S' for r in rs)/len(rs):.1f}% | {100*sum(r['res']=='R' for r in rs)/len(rs):.1f}% | "
             f"{q([r['ttt'] for r in rs if r['ttt'] is not None],.5):.2f} | " + ', '.join(f'{p} {100*v/len(qk):.0f}%' for p, v in ps.most_common(4)) + f' (n={len(qk)}) |')
txt = '\n'.join(L); print(txt); open(f'{OUT}/nfl_blitz_tell.md', 'w').write(txt + '\n')
