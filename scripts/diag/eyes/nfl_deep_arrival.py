"""Ball placement / contest at arrival (BDB 2025 wk1-3, dropback, no PA, C/I/IN).
Run: python3 -I nfl_deep_arrival.py [datadir] [outdir]"""
import csv, sys, os, math, collections, json
import os
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'out', 'eyes')
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3); GO = {'GO', 'POST', 'SEAM'}
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))
         if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE' and r['passResult'] in ('C', 'I', 'IN')}
with open(f'{D}/player_play.csv') as f: hdr = next(csv.reader(f))
pdcols = [c for c in hdr if any(t in c.lower() for t in ('defens', 'deflect', 'tip', 'breakup'))]
target, pd = {}, collections.Counter()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r['wasTargettedReceiver'] == '1': target[k] = (r['nflId'], r['routeRan'])
    if r.get('passDefensed') not in (None, '', 'NA', '0'): pd[k] += 1
ARR = ['pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'pass_outcome_interception', 'pass_outcome_touchdown', 'pass_tipped']
EV = {'pass_forward', *ARR}
fr = collections.defaultdict(lambda: collections.defaultdict(list))
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, fi, cl, x, y, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'frameId', 'club', 'x', 'y', 'event'))
        for row in rd:
            if row[e] not in EV: continue
            k = (row[g], row[p])
            if k in target: fr[k][row[e]].append((row[n], row[cl], int(row[fi]), float(row[x]), float(row[y])))
recs, drops, src = [], collections.Counter(), collections.Counter()
for k, (tid, route) in target.items():
    ev = fr.get(k, {}); pos = plays[k]['possessionTeam']
    pf = [r for r in ev.get('pass_forward', []) if r[1] == 'football']
    arr = [v for v in ARR if any(r[1] == 'football' for r in ev.get(v, []))]
    if not pf or not arr: drops['missing_event'] += 1; continue
    a_ev = min(arr, key=lambda v: next(r[2] for r in ev[v] if r[1] == 'football')); src[a_ev] += 1
    rows = ev[a_ev]; b = next(r for r in rows if r[1] == 'football')
    t = [r for r in rows if r[0] == tid]; df = [r for r in rows if r[1] not in (pos, 'football')]
    if not t or not df: drops['no_target_or_def'] += 1; continue
    bt = math.hypot(t[0][3] - b[3], t[0][4] - b[4]); db = min(math.hypot(d[3] - b[3], d[4] - b[4]) for d in df)
    recs.append(dict(fam='GO' if route in GO else 'OTHER', route=route, res=plays[k]['passResult'], flight=(b[2] - pf[0][2]) / 10,
                     bt=bt, db=db, defcloser=db < bt, pd=pd[k] > 0, arr=a_ev))
json.dump(recs, open(f'{OUT}/nfl_deep_arrival.json', 'w'))
def q(v, p):
    v = sorted(v); i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
pc = lambda rs, f: f'{100*sum(map(f, rs))/len(rs):.0f}%'
FB = [('<0.8', 0, .8), ('0.8-1.2', .8, 1.2), ('1.2-1.8', 1.2, 1.8), ('1.8-2.5', 1.8, 2.5), ('2.5+', 2.5, 99), ('all', -99, 99)]
L = [f'PD-like columns in player_play: {pdcols}; used passDefensed (any defender >0 on play)',
     f'Kept {len(recs)}/{len(target)}; drops {dict(drops)}; arrival event {dict(src)}']
for name, rs0 in (('GO family (GO+POST)', [r for r in recs if r['fam'] == 'GO']), ('All routes', recs)):
    L += [f'\n## {name}', '| flight s | n | ball-tgt p25/p50/p75 | comp | bt>2yd | def-ball p50 | def closer | INT | PD |', '|---|---|---|---|---|---|---|---|---|']
    for lbl, lo, hi in FB:
        rs = [r for r in rs0 if lo <= r['flight'] < hi]
        if not rs: L.append(f'| {lbl} | 0 | | | | | | | |'); continue
        bt = [r['bt'] for r in rs]
        L.append(f'| {lbl} | {len(rs)} | {q(bt,.25):.1f}/{q(bt,.5):.1f}/{q(bt,.75):.1f} | {pc(rs,lambda r:r["res"]=="C")} | {pc(rs,lambda r:r["bt"]>2)} | '
                 f'{q([r["db"] for r in rs],.5):.1f} | {pc(rs,lambda r:r["defcloser"])} | {pc(rs,lambda r:r["res"]=="IN")} | {pc(rs,lambda r:r["pd"])} |')
go = [r for r in recs if r['fam'] == 'GO']
L += ['\n## GO family: completion by ball-to-target at arrival', '| bt yd | n | comp | INT | PD | def closer |', '|---|---|---|---|---|---|']
for lbl, lo, hi in (('<1', 0, 1), ('1-2', 1, 2), ('2-3', 2, 3), ('3+', 3, 999)):
    rs = [r for r in go if lo <= r['bt'] < hi]
    L.append(f'| {lbl} | {len(rs)} | ' + ' | '.join(pc(rs, f) for f in (lambda r: r['res'] == 'C', lambda r: r['res'] == 'IN', lambda r: r['pd'], lambda r: r['defcloser'])) + ' |' if rs else f'| {lbl} | 0 | | | | |')
fb = [r for r in recs if r['arr'] != 'pass_arrived']
L.append(f'\nFallback-arrival plays: {len(fb)} (GO {sum(r["fam"]=="GO" for r in fb)}); their bt p50 {q([r["bt"] for r in fb],.5):.1f} vs pass_arrived p50 {q([r["bt"] for r in recs if r["arr"]=="pass_arrived"],.5):.1f}')
txt = '\n'.join(L); print(txt); open(f'{OUT}/nfl_deep_arrival.md', 'w').write(txt + '\n')
