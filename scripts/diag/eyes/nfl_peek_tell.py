"""Deep defender 'tell' over verticals on 4-verts shapes (BDB 2025 wk1-3, dropback, no PA).
Run: python3 -I nfl_peek_tell.py [datadir] [outdir]"""
import csv, sys, os, math, collections, json
D = sys.argv[1] if len(sys.argv) > 1 else '/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/user/fb-gather/out/eyes'
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3); MID = 26.65; TS = (20, 22, 24); OPEN_F = 28.5
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))
         if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
pp = collections.defaultdict(list)
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays: pp[k].append(r)
cand = {}
for k, rs in pp.items():
    rec = [r for r in rs if pos.get(r['nflId']) not in ('RB', 'FB')]
    go = [r['nflId'] for r in rec if r['routeRan'] == 'GO']
    loose = [r for r in rec if r['routeRan'] in ('GO', 'POST', 'CORNER')]
    if len(loose) >= 3:
        cand[k] = dict(strict=len(go) >= 3, vert=[r['nflId'] for r in rec if r['routeRan'] in ('GO', 'POST')],
                       route={r['nflId']: r['routeRan'] for r in rec},
                       tgt={r['nflId'] for r in rs if r['wasTargettedReceiver'] == '1'})
trk = collections.defaultdict(list)
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, fi, cl, pd, x, y, o, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 'o', 'event'))
        for row in rd:
            k = (row[g], row[p])
            if k in cand:
                trk[k].append((row[n], row[cl], int(row[fi]), float(row[x]), float(row[y]),
                               float(row[o]) if row[o] not in ('NA', '') else None, row[e], row[pd]))
def ang(a, b):
    d = abs(a - b) % 360; return min(d, 360 - d)
recs, nplays, drops = [], collections.Counter(), collections.Counter()
for k, c in cand.items():
    rows = trk.get(k)
    if not rows: drops['no_tracking'] += 1; continue
    P = {}; evf = collections.defaultdict(list)
    for r in rows:
        P[(r[0], r[2])] = r
        if r[1] == 'football' and r[6] not in ('NA', ''): evf[r[6]].append(r[2])
    if not evf.get('ball_snap'): drops['no_snap'] += 1; continue
    s0 = min(evf['ball_snap']); ball0 = next(r for r in rows if r[1] == 'football' and r[2] == s0)
    sgn = 1 if ball0[7] == 'right' else -1; los = ball0[3]
    pf = min(evf.get('pass_forward', []) + evf.get('autoevent_passforward', []) or [None], key=lambda v: v if v is not None else 1e9)
    sk = min(evf.get('qb_sack', []) + evf.get('qb_strip_sack', []) or [None], key=lambda v: v if v is not None else 1e9)
    end = min(v for v in (pf, sk, 1e9) if v is not None)
    if end - s0 < 24: drops['ball_out_before_2.4s'] += 1; continue
    pr = plays[k]; poss = pr['possessionTeam']
    defs = {r[0] for r in rows if r[1] not in (poss, 'football')}
    nplays['loose'] += 1; nplays['strict'] += c['strict']
    def at(pid, fr):
        if fr == int(fr): return P.get((pid, int(fr)))
        a, b = P.get((pid, int(fr))), P.get((pid, int(fr) + 1))
        if not a or not b: return None
        return (a[0], a[1], fr, (a[3] + b[3]) / 2, (a[4] + b[4]) / 2, a[5], '', a[7])
    def sep(pid, fr):
        rr = at(pid, fr); ds = [at(d, fr) for d in defs]; ds = [d for d in ds if d]
        return min(math.hypot(d[3] - rr[3], d[4] - rr[4]) for d in ds) if rr and ds else None
    cov = pr['pff_passCoverage']; mz = pr['pff_manZone']
    covg = 'Man' if mz == 'Man' else 'Cover-3' if cov.startswith('Cover-3') else 'Cover-2' if cov == 'Cover-2' else \
           'Quarters' if cov == 'Quarters' else 'Cover-6' if 'Cover' in cov and '6' in cov else 'other'
    for v in c['vert']:
        ofr = pf if pf is not None and pf - s0 < OPEN_F else s0 + OPEN_F
        sp = sep(v, ofr)
        if sp is None: drops['no_open_frame'] += 1; continue
        rec = dict(play=k, strict=c['strict'], route=c['route'][v], open=sp >= 2.5, sep=sp, cov=covg, rawcov=cov,
                   target=v in c['tgt'], comp=v in c['tgt'] and pr['passResult'] == 'C', t={})
        for t in TS:
            rr = at(v, s0 + t)
            if not rr: rec['t'][t] = None; continue
            best = None
            for d in defs:
                dd = at(d, s0 + t)
                if dd and sgn * (dd[3] - rr[3]) > 0 and abs(dd[4] - rr[4]) < 10 and (best is None or abs(dd[4] - rr[4]) < abs(best[4] - rr[4])): best = dd
            if not best: rec['t'][t] = 'none'; continue
            mid = 1 if rr[4] < MID else -1
            a1, a2, b1, b2 = at(best[0], s0 + t - 1), at(best[0], s0 + t + 1), at(v, s0 + t - 1), at(v, s0 + t + 1)
            lv = (abs(a2[4] - b2[4]) - abs(a1[4] - b1[4])) / 0.2 if all((a1, a2, b1, b2)) else None
            face = None
            if best[5] is not None:
                to_ball = math.degrees(math.atan2(ball0[3] - best[3], ball0[4] - best[4])) % 360  # o-convention: 0=+y, cw
                face = ang(best[5], to_ball)
            rec['t'][t] = dict(depth=sgn * (best[3] - rr[3]), lat=(best[4] - rr[4]) * mid, lv=lv, face=face, dlos=sgn * (best[3] - los))
        recs.append(rec)
json.dump(recs, open(f'{OUT}/nfl_peek_tell.json', 'w'), default=str)
def q(v, p):
    v = sorted(v); i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
def auc(a, b):
    if not a or not b: return None
    s = sum((x > y) + 0.5 * (x == y) for x in a for y in b); return s / (len(a) * len(b))
Q = [('depth', 'depth over'), ('lat', 'lat offset (+mid)'), ('lv', 'lat vel (+away)'), ('face', 'facing deg'), ('dlos', 'depth past LOS')]
L = [f"Coverage columns: pff_passCoverage, pff_manZone. Plays reaching 2.4 s with ball held: loose {nplays['loose']}, strict(3+ GO) {nplays['strict']}; drops {dict(drops)}"]
def block(name, rs):
    L.append(f"\n## {name}: verticals n={len(rs)}, open later {sum(r['open'] for r in rs)} ({100*sum(r['open'] for r in rs)/max(1,len(rs)):.0f}%), "
             f"targeted {sum(r['target'] for r in rs)}, completed {sum(r['comp'] for r in rs)} (open: tgt {sum(r['target'] for r in rs if r['open'])}/comp {sum(r['comp'] for r in rs if r['open'])})")
    L.append('| t | open | n(def/none) | depth over p50 [IQR] | lat off | lat vel | dLOS p50 | face <45/45-135/>135 |\n|---|---|---|---|---|---|---|---|')
    for t in TS:
        for o in (True, False):
            sub = [r for r in rs if r['open'] == o]; hv = [r['t'][t] for r in sub if isinstance(r['t'].get(t), dict)]
            nn = sum(r['t'].get(t) == 'none' for r in sub)
            if not hv: L.append(f'| {t/10} | {"Y" if o else "N"} | 0/{nn} | | | | | |'); continue
            f = lambda kk: (lambda v: f'{q(v,.5):.1f} [{q(v,.25):.1f},{q(v,.75):.1f}]' if v else '-')([h[kk] for h in hv if h[kk] is not None])
            fc = [h['face'] for h in hv if h['face'] is not None]
            fb = '/'.join(f'{100*sum(lo <= x < hi for x in fc)/len(fc):.0f}' for lo, hi in ((0, 45), (45, 135), (135, 181))) if fc else '-'
            L.append(f"| {t/10} | {'Y' if o else 'N'} | {len(hv)}/{nn} | {f('depth')} | {f('lat')} | {f('lv')} | {q([h['dlos'] for h in hv],.5):.1f} | {fb} |")
    L.append('AUC (P[open value > not-open value]; 0.5 = no signal): ' + '; '.join(
        f"t={t/10}: " + ', '.join(f"{lbl.split()[0]}{'-'+lbl.split()[1] if len(lbl.split())>1 else ''} {a:.2f}" for kk, lbl in Q
                                  for a in [auc([r['t'][t][kk] for r in rs if r['open'] and isinstance(r['t'].get(t), dict) and r['t'][t][kk] is not None],
                                               [r['t'][t][kk] for r in rs if not r['open'] and isinstance(r['t'].get(t), dict) and r['t'][t][kk] is not None])] if a is not None)
        for t in TS))
strict = [r for r in recs if r['strict'] and r['route'] == 'GO']
block('Strict (3+ GO; GO verticals)', strict)
block('Loose (3+ of GO/POST/CORNER; GO+POST verticals)', recs)
L.append('\n## Loose class by coverage, t=2.2 s (open Y vs N medians)\n| cov | n | open% | none% | depth over Y/N | lat off Y/N | lat vel Y/N | face p50 Y/N | best AUC |\n|---|---|---|---|---|---|---|---|---|')
for cg in ('Cover-3', 'Cover-2', 'Quarters', 'Cover-6', 'Man', 'other'):
    rs = [r for r in recs if r['cov'] == cg]
    if not rs: continue
    hv = lambda o, kk: [r['t'][22][kk] for r in rs if r['open'] == o and isinstance(r['t'].get(22), dict) and r['t'][22][kk] is not None]
    md = lambda o, kk: f'{q(hv(o,kk),.5):.1f}' if hv(o, kk) else '-'
    aa = [(abs(a - .5), a, kk) for kk, _ in Q for a in [auc(hv(True, kk), hv(False, kk))] if a is not None]
    b = max(aa)[1:] if aa else (0, '-')
    L.append(f"| {cg} | {len(rs)} | {100*sum(r['open'] for r in rs)/len(rs):.0f} | {100*sum(r['t'].get(22)=='none' for r in rs)/len(rs):.0f} | "
             + ' | '.join(f'{md(True,kk)}/{md(False,kk)}' for kk in ('depth', 'lat', 'lv', 'face')) + f' | {b[1]} {b[0]:.2f} |')
L.append('Raw coverage labels (loose plays): ' + str(dict(collections.Counter(r['rawcov'] for r in {r['play']: r for r in recs}.values()).most_common())))
txt = '\n'.join(L); print(txt); open(f'{OUT}/nfl_peek_tell.md', 'w').write(txt + '\n')
