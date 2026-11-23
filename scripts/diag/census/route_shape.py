"""Flat-route shape, NFL vs ours, one operator (open-census play format; NFL from nfl_plays.py with routeRan, ours from sim_plays.mts --full --all with route ids and drawn waypoints).
  python3 -I scripts/diag/census/route_shape.py NFL_PLAYS.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--out report.md] [--nfl-catches NFLCATCH.jsonl.gz]

Flat-route runner = a route runner whose lateral displacement from his snap spot is 6+ yd and whose depth is under 5 yd at 2.0 s after the snap (targeted or not), on plays that last 2.0 s (the record runs to the release for NFL, to the end of the play for ours).
Lateral is oriented toward the side he goes (so the displacement is positive). Groups: back (RB / FB / HB), TE, slot (a WR within 13 yd of the center at the snap) and wide (13 yd or more). Per group and, for ours, per route id (and NFL per routeRan label):
depth past the line at 0.5 s steps to 3.0 s (where the record lasts), lateral distance covered by 2.0 s and 3.0 s, mean speed over 0.5-2.0 s (path length / time), the path's angle to the line of scrimmage over 0-2.0 s and over 1.0-2.0 s
(0 degrees = along the line, 90 = straight upfield), the share targeted, the release time of the plays and, for caught flat targets, depth at the catch and the ball's flight time. Ours: the drawn waypoints per route id beside the mean path actually run."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--nfl-catches')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
NFLC = sys.argv[sys.argv.index('--nfl-catches') + 1] if '--nfl-catches' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
def pct(v, q): return float(np.percentile(v, q)) if len(v) else float('nan')

def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; nf = X.shape[1]
        if nf <= 20: continue
        cs = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] == 'C']; ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]
        yc = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
        for i, q in enumerate(pl):
            if q['side'] != 'O' or i == p['qb'] or not q['route']: continue
            dy = Y[i, 20] - Y[i, 0]; depth2 = X[i, 20]
            if abs(dy) < 6.0 or depth2 >= 5.0: continue
            sg = 1.0 if dy > 0 else -1.0
            lat = sg * (Y[i, :] - Y[i, 0]); dep = X[i, :] - X[i, 0]; d0 = float(X[i, 0])
            pos = q['pos']; typ = 'back' if pos in BACK else 'TE' if pos == 'TE' else 'wide' if abs(float(Y[i, 0]) - yc) >= 13 else 'slot'
            seg = lambda a, b: math.degrees(math.atan2(X[i, b] - X[i, a], abs(Y[i, b] - Y[i, a]) + 1e-9))
            path = sum(math.hypot(X[i, f + 1] - X[i, f], Y[i, f + 1] - Y[i, f]) for f in range(5, 20)) / 1.5
            rid = (p.get('routes') or {}).get(str(i)) if src == 'sim' else None
            out.append(dict(src=src, typ=typ, target=bool(q.get('target')), depth=[float(X[i, f]) for f in range(0, min(nf, 31))], lat=[float(lat[f]) for f in range(0, min(nf, 31))], d0=d0, ang=seg(0, 20), ang2=seg(10, 20), spd=path,
                            rel=(p['rel'] / 10.0 if p.get('rel') is not None else None), label=(rid['id'] if rid else q.get('routeRan')), wp=(rid['wp'] if rid else None), sg=sg, y0=float(Y[i, 0]), catch=(p.get('catch') if p.get('recv') == i else None),
                            cdepth=(float(X[i, p['catch']]) if p.get('recv') == i and p.get('catch') is not None else None), flight=(((p['catch'] - p['rel']) / 10.0) if p.get('recv') == i and p.get('catch') is not None and p.get('rel') is not None else None)))
    return out

nfl = rows_of(args[0], 'nfl'); sims = {a.split('/')[-1]: rows_of(a, 'sim') for a in args[1:]}
sim = [r for v in sims.values() for r in v]
lines = []; P = lambda s='': lines.append(s)
TS = [0, 5, 10, 15, 20, 25, 30]
def line(lab, R):
    if len(R) < 8: return f'| {lab} | {len(R)} | | | | | | | | | | | | |'
    dep = []
    for k in TS:
        v = [r['depth'][k] for r in R if len(r['depth']) > k]
        dep.append(f'{np.median(v):.1f}' if len(v) >= 8 else '-')
    lat2 = np.median([r['lat'][20] for r in R]); l3 = [r['lat'][30] for r in R if len(r['lat']) > 30]
    rl = [r['rel'] for r in R if r['rel'] is not None]
    return f'| {lab} | {len(R)} | ' + ' | '.join(dep) + f' | {lat2:.1f} | {np.median(l3):.1f} | {np.median([r["spd"] for r in R]):.1f} | {np.median([r["ang"] for r in R]):.0f} / {np.median([r["ang2"] for r in R]):.0f} | {np.mean([r["target"] for r in R]):.2f} | {np.median(rl):.1f} |' if l3 else f'| {lab} | {len(R)} | ' + ' | '.join(dep) + f' | {lat2:.1f} | - | {np.median([r["spd"] for r in R]):.1f} | {np.median([r["ang"] for r in R]):.0f} / {np.median([r["ang2"] for r in R]):.0f} | {np.mean([r["target"] for r in R]):.2f} | {np.median(rl):.1f} |'
HEAD = '| group | n | depth 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | lateral by 2.0 s | by 3.0 s | speed 0.5-2.0 s | angle to the line 0-2 s / 1-2 s | targeted | release (s) |'
def table(title, rows_by):
    P(f'### {title}\n'); P(HEAD); P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for lab, R in rows_by: P(line(lab, R))
    P('')
P('## Flat routes: the shape of the route as run, NFL vs ours\n')
P(f'Flat-route runners (6+ yd lateral and under 5 yd deep at 2.0 s): NFL {len(nfl)}, ours {len(sim)}. Medians; depth in yd past the line; lateral and angle as defined in the script header.\n')
grp = lambda rows, t: [r for r in rows if r['typ'] == t]
table('By receiver type', [(f'{s} {t}', grp(rows, t)) for t in ('back', 'TE', 'slot', 'wide') for s, rows in (('NFL', nfl), ('ours', sim))] + [('NFL all', nfl), ('ours all', sim)])
for t in ('back', 'slot', 'wide'):
    labs = collections.Counter(r['label'] for r in grp(sim, t) if r['label']); labn = collections.Counter(r['label'] for r in grp(nfl, t) if r['label'])
    rows_by = [(f'ours {t} route {l}', [r for r in grp(sim, t) if r['label'] == l]) for l, n in labs.most_common(6) if n >= 8] + [(f'NFL {t} {l}', [r for r in grp(nfl, t) if r['label'] == l]) for l, n in labn.most_common(5) if n >= 8]
    if rows_by: table(f'{t}: by our route id and by the NFL route label', rows_by)
# climb
P('### Do ours climb more? Depth at 2.0 s and 3.0 s and the angle to the line, same geometric class, difference ours minus NFL (median)\n')
P('| group | depth at 2.0 s | depth at 3.0 s | angle 0-2 s | angle 1-2 s |'); P('|---|---|---|---|---|')
for t in ('back', 'TE', 'slot', 'wide'):
    a, b = grp(sim, t), grp(nfl, t)
    if len(a) < 8 or len(b) < 8: continue
    d = lambda f: np.median([f(r) for r in a]) - np.median([f(r) for r in b])
    d3a = [r['depth'][30] for r in a if len(r['depth']) > 30]; d3b = [r['depth'][30] for r in b if len(r['depth']) > 30]
    P(f'| {t} | {d(lambda r: r["depth"][20]):+.1f} | {(np.median(d3a) - np.median(d3b)) if len(d3a) >= 8 and len(d3b) >= 8 else float("nan"):+.1f} | {d(lambda r: r["ang"]):+.0f} | {d(lambda r: r["ang2"]):+.0f} |')
P('')
# catches
P('### Flat targets that were caught: depth at the catch and the ball\'s flight\n')
P('| | n | depth at the catch p50 (p25-p75) | flight time (s) p50 |'); P('|---|---|---|---|')
if NFLC:
    nc = rows_of(NFLC, 'nfl')
    c = [r for r in nc if r['cdepth'] is not None]
    P(f'| NFL (completions, through the play) | {len(c)} | {pct([r["cdepth"] for r in c], 50):.1f} ({pct([r["cdepth"] for r in c], 25):.1f}-{pct([r["cdepth"] for r in c], 75):.1f}) | {pct([r["flight"] for r in c if r["flight"] is not None], 50):.1f} |')
c = [r for r in sim if r['cdepth'] is not None]
P(f'| ours | {len(c)} | {pct([r["cdepth"] for r in c], 50):.1f} ({pct([r["cdepth"] for r in c], 25):.1f}-{pct([r["cdepth"] for r in c], 75):.1f}) | {pct([r["flight"] for r in c if r["flight"] is not None], 50):.1f} |')
P('')
# drawn vs run
P('### Ours: the drawn waypoints per route id beside the mean path actually run (lateral toward the side he goes, depth past the line, both relative to his snap spot)\n')
P('| route id | n | drawn waypoints (lateral, depth) | run at 1.0 s | 2.0 s | 3.0 s |'); P('|---|---|---|---|---|---|')
byid = collections.defaultdict(list)
for r in sim:
    if r['label'] and r['wp']: byid[r['label']].append(r)
for l, R in sorted(byid.items(), key=lambda kv: -len(kv[1]))[:12]:
    if len(R) < 5: continue
    wp = []
    for k in range(len(R[0]['wp'])):
        v = [(r['sg'] * (r['wp'][k][1] - r['wp'][0][1]), r['wp'][k][0] - r['wp'][0][0]) for r in R if len(r['wp']) > k]
        wp.append(f'({np.median([a for a, _ in v]):.1f}, {np.median([b for _, b in v]):.1f})')
    run = lambda k: (f'({np.median([r["lat"][k] for r in R if len(r["lat"]) > k]):.1f}, {np.median([r["depth"][k] - r["d0"] for r in R if len(r["depth"]) > k]):.1f})' if sum(len(r['lat']) > k for r in R) >= 5 else '-')
    P(f'| {l} | {len(R)} | {" → ".join(wp)} | {run(10)} | {run(20)} | {run(30)} |')
P('')
# Every drawn route id with a sideways leg (not only the ones that satisfy the flat geometry): drawn against run.
P('### Ours: every route id whose drawn path ends 6+ yd to the side or is a flat / swing / arrow / bubble / shoot, drawn against run (all runners of the id, no geometry filter)\n')
P('| route id | runners | drawn waypoints (lateral, depth rel. start) | run at 1.0 s | 2.0 s | 3.0 s | share that meet the flat geometry |'); P('|---|---|---|---|---|---|---|')
allr = collections.defaultdict(list)
for pth in args[1:]:
    for l in gzip.open(pth, 'rt'):
        pp = json.loads(l); X = np.array(pp['x']); Y = np.array(pp['y'])
        if X.shape[1] <= 30: continue
        for i, rid in (pp.get('routes') or {}).items():
            i = int(i); dy = Y[i, 20] - Y[i, 0]; sg = 1.0 if dy > 0 else -1.0
            allr[rid['id']].append(dict(wp=rid['wp'], sg=sg, lat=[sg * (Y[i, f] - Y[i, 0]) for f in (10, 20, 30)], dep=[X[i, f] - X[i, 0] for f in (10, 20, 30)], geo=(abs(dy) >= 6.0 and X[i, 20] < 5.0)))
for rid, R in sorted(allr.items(), key=lambda kv: -len(kv[1])):
    wp0 = R[0]['wp']
    if len(R) < 8 or not wp0: continue
    side = abs(wp0[-1][1] - wp0[0][1]) >= 6.0
    if not (side or any(k in rid for k in ('flat', 'swing', 'arrow', 'bubble', 'shoot', 'stick'))): continue
    drawn = ' → '.join(f'({np.median([r["sg"] * (r["wp"][k][1] - r["wp"][0][1]) for r in R if len(r["wp"]) > k]):.1f}, {np.median([r["wp"][k][0] - r["wp"][0][0] for r in R if len(r["wp"]) > k]):.1f})' for k in range(len(wp0)))
    run = lambda j: f'({np.median([r["lat"][j] for r in R]):.1f}, {np.median([r["dep"][j] for r in R]):.1f})'
    P(f'| {rid} | {len(R)} | {drawn} | {run(0)} | {run(1)} | {run(2)} | {np.mean([r["geo"] for r in R]):.2f} |')
P('')
P('All our route ids in these games: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(allr.items(), key=lambda kv: -len(kv[1]))) + '.\n')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
