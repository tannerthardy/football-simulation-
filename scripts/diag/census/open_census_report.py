"""Open-receiver census: one operator on NFL (BDB 2025) and sim dropbacks in the open-census play format (nfl_plays.py, sim_plays.mts).
  python3 -I scripts/diag/census/open_census_report.py NFL.jsonl.gz SIM.jsonl.gz [SIM2.jsonl.gz ...] [--out report.md] [--wide wide.json] [--check 12]

Moments: the release (the frame the ball is thrown) and, on dropbacks, fixed times 1.5 / 2.0 / 2.5 / 3.0 s after the snap while the ball is still held (so
untargeted receivers and unthrown plays count). Receivers: every offensive player (not the QB) running a route (PFF wasRunningRoute; the sim's behavior is a route).
Per receiver-moment: d1 / d2 the distance to the nearest / second-nearest defender (all 11); the nearest one's relation to him relative to the passer
(front: nearer the passer than he is along the receiver-to-passer line by more than 1 yd; behind: farther by more than 1 yd; level), inside / outside (toward the middle
of the field or toward the sideline by more than 0.5 yd; else head-up) and closing / opening (the change of that distance over the last 0.3 s beyond 0.5 yd/s); depth (yards past
the line), distance from the sideline, whether he was the target (release only; the target of a fixed moment is the play's target).
Wide open = d1 beyond the NFL's own 90th percentile for that (moment kind, depth band): a threshold from the NFL distribution, applied to both sides.
Formation label (both sides, from the snap positions): receivers each side of the center, backs in the backfield excluded; compared with PFF's receiverAlignment on NFL to check the operator."""
import gzip, json, sys, math, collections
import numpy as np

_skip = {i + 1 for i, a in enumerate(sys.argv) if a in ('--out', '--wide', '--check')}
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and i not in _skip]
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
NFL = args[0]; SIMS = args[1:]
OUT = opt('--out'); WIDE = opt('--wide'); NCHECK = int(opt('--check', '12'))
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
FIXED = (15, 20, 25, 30)
BANDS = [(-99, 0, 'behind LOS'), (0, 5, '0-5'), (5, 10, '5-10'), (10, 15, '10-15'), (15, 20, '15-20'), (20, 99, '20+')]
band = lambda d: next(l for a, b, l in BANDS if a <= d < b)

def pff_label(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'quarters': 'Quarters', 'cover6': 'Cover-6', 'two_man': '2-Man', '2man': '2-Man', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}

def load(path):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); p['X'] = np.array(p['x']); p['Y'] = np.array(p['y']); out.append(p)
    return out

def alignment(p):
    pl = p['players']; X = p['X'][:, 0]; Y = p['Y'][:, 0]
    ol = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
    cs = [i for i in ol if pl[i]['pos'] == 'C']
    c = float(Y[cs[0]]) if cs else float(np.median(Y[ol])) if ol else 26.67
    L = R = nb = 0
    for i, r in enumerate(pl):
        if r['side'] != 'O' or r['pos'] in OL or r['pos'] == 'QB' or i == p['qb']: continue
        if r['pos'] in BACK and X[i] < -1.0 and abs(Y[i] - c) < 4.0: nb += 1; continue
        if Y[i] - c > 0.5: R += 1
        elif Y[i] - c < -0.5: L += 1
        else: R += 1  # in the box line, counted with the strong side
    return f'{max(L, R)}x{min(L, R)}', nb

def moments(p):
    rel = p['rel']; nf = p['X'].shape[1]; m = []
    if rel is not None and rel < nf: m.append(('rel', rel))
    for f in FIXED:
        if f < nf and (rel is None or f < rel): m.append(('fix', f))
    return m

def census(plays, src):
    rows = []; plays_meta = []
    for p in plays:
        pl = p['players']; qb = p['qb']; X, Y = p['X'], p['Y']
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]
        dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        if not rec: continue
        al, nb = alignment(p)
        emp = (nb == 0)
        mot = bool(p.get('motion')) if src == 'sim' else any(r.get('motion') for r in pl if r['side'] == 'O')
        if src == 'nfl': fam = pff_label(p['cov']); man = p['manzone']; ours = ''
        else: fam = OURS.get(p.get('fam'), 'other'); man = 'Man' if p.get('man') else 'Zone'; ours = p.get('fam')
        meta = dict(id=p['id'], fam=fam, ours=ours, cov=p.get('cov'), man=man, align=al, pff_align=p.get('align'), empty=emp, motion=mot, pa=bool(p.get('pa')), motion_empty=mot and emp, concept=p.get('concept'))
        plays_meta.append(meta)
        for kind, f in moments(p):
            for i in rec:
                rx, ry = X[i, f], Y[i, f]; qx, qy = X[qb, f], Y[qb, f]
                d = np.array([math.hypot(X[j, f] - rx, Y[j, f] - ry) for j in dfs]); o = np.argsort(d)
                j1, j2 = dfs[o[0]], dfs[o[1]]
                ux, uy = qx - rx, qy - ry; un = math.hypot(ux, uy) or 1.0; ux /= un; uy /= un
                vx, vy = X[j1, f] - rx, Y[j1, f] - ry
                along = vx * ux + vy * uy
                relpos = 'front' if along > 1.0 else 'behind' if along < -1.0 else 'level'
                toward_mid = 1.0 if (26.67 - ry) >= 0 else -1.0
                lat = (Y[j1, f] - ry) * toward_mid
                io = 'inside' if lat > 0.5 else 'outside' if lat < -0.5 else 'head-up'
                dxg = X[j1, f] - rx  # offense moves +x: a defender downfield of him is between him and the goal line
                lev = 'over the top' if dxg > 1.0 else 'trailing' if dxg < -1.0 else 'level'
                rclass = 'behind' if rx < 0 else 'checkdown' if (pl[i]['pos'] in BACK and rx < 3.0) else 'main'
                f0 = max(0, f - 3); dprev = math.hypot(X[j1, f0] - X[i, f0], Y[j1, f0] - Y[i, f0])
                rate = (d[o[0]] - dprev) / (0.1 * (f - f0)) if f > f0 else 0.0
                cl = 'closing' if rate < -0.5 else 'opening' if rate > 0.5 else 'steady'
                rows.append(dict(play=p['id'], kind=kind, f=f, slot=pl[i].get('slot') or pl[i].get('id'), depth=float(rx), side=float(min(ry, 53.33 - ry)), d1=float(d[o[0]]), d2=float(d[o[1]]), rel=relpos, io=io, cl=cl, lev=lev, rclass=rclass,
                                 target=bool(pl[i].get('target')), band=band(float(rx)), **{k: meta[k] for k in ('fam', 'man', 'align', 'empty', 'motion', 'motion_empty', 'pa')}, j1=pl[j1].get('slot') or pl[j1].get('id')))
    return rows, plays_meta

def pct(v, q): return float(np.percentile(v, q)) if len(v) else float('nan')
def dist(v): return ' / '.join(f'{pct(v, q):.1f}' for q in (10, 25, 50, 75, 90)) if len(v) else '-'

nfl_plays = load(NFL); nfl_rows, nfl_meta = census(nfl_plays, 'nfl')
thr = {}
for kind in ('rel', 'fix'):
    for _, _, b in BANDS:
        v = [r['d1'] for r in nfl_rows if r['kind'] == kind and r['band'] == b]
        thr[(kind, b)] = pct(v, 90) if len(v) >= 50 else float('nan')

lines = []
P = lambda s='': lines.append(s)
P('# Open-receiver census, NFL (BDB 2025 weeks 1-9) vs ours\n')
P(f'NFL: {len(nfl_plays)} dropbacks, {len(set(r["play"] for r in nfl_rows))} with a route runner at a sampled moment, {len(nfl_rows)} receiver-moments. Wide-open thresholds are the NFL p90 of d1 by (moment kind, depth band):\n')
P('| moment | ' + ' | '.join(b for _, _, b in BANDS) + ' |'); P('|---|' + '---|' * len(BANDS))
for kind, lab in (('rel', 'release'), ('fix', 'fixed 1.5-3.0 s')):
    P(f'| {lab} | ' + ' | '.join(f'{thr[(kind, b)]:.1f}' for _, _, b in BANDS) + ' |')
P('')

def wide(r): return r['d1'] > thr[(r['kind'], r['band'])]

def tables(rows, meta, name):
    P(f'## {name}\n')
    P(f'{len(meta)} dropbacks, {len(rows)} receiver-moments (release {sum(r["kind"]=="rel" for r in rows)}, fixed {sum(r["kind"]=="fix" for r in rows)}).\n')
    P('### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band\n')
    P('| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |'); P('|---|---|---|---|---|---|---|')
    for _, _, b in BANDS:
        a = [r for r in rows if r['kind'] == 'rel' and r['band'] == b]; c = [r for r in rows if r['kind'] == 'fix' and r['band'] == b]
        P(f'| {b} | {len(a)} | {dist([r["d1"] for r in a])} | {dist([r["d2"] for r in a])} | {len(c)} | {dist([r["d1"] for r in c])} | {dist([r["d2"] for r in c])} |')
    P('\n### Relation of the nearest defender (share of receiver-moments)\n')
    P('| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |'); P('|---|---|---|---|---|---|---|---|---|---|')
    for kind, lab in (('rel', 'release'), ('fix', 'fixed')):
        a = [r for r in rows if r['kind'] == kind]; n = max(len(a), 1)
        s = lambda key, val: f'{sum(r[key] == val for r in a) / n:.2f}'
        P(f'| {lab} | ' + ' | '.join([s('rel', 'front'), s('rel', 'level'), s('rel', 'behind'), s('io', 'inside'), s('io', 'head-up'), s('io', 'outside'), s('cl', 'closing'), s('cl', 'steady'), s('cl', 'opening')]) + ' |')
    P('\n### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)\n')
    P('| receiver-moments | over the top | level | trailing |'); P('|---|---|---|---|')
    for lab, sel in (('all, release', lambda r: r['kind'] == 'rel'), ('all, fixed', lambda r: r['kind'] == 'fix'), ('wide open, release', lambda r: r['kind'] == 'rel' and wide(r)), ('wide open, fixed', lambda r: r['kind'] == 'fix' and wide(r))):
        a = [r for r in rows if sel(r)]; n = max(len(a), 1)
        P(f'| {lab} (n {len(a)}) | ' + ' | '.join(f'{sum(r["lev"] == v for r in a) / n:.2f}' for v in ('over the top', 'level', 'trailing')) + ' |')
    P('\n### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)\n')
    P('| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |'); P('|---|---|---|---|---|---|---|---|')
    for gl, gsel in (('all', lambda r: True), ('man', lambda r: r['man'] == 'Man'), ('zone', lambda r: r['man'] == 'Zone')):
        for kind, klab in (('rel', 'release'), ('fix', 'any fixed time')):
            mp = collections.defaultdict(lambda: [0.0] * 1)
            plays_k = {r['play'] for r in rows if r['kind'] == kind and gsel(r)}
            mx = collections.defaultdict(float)
            for r in rows:
                if r['kind'] == kind and gsel(r) and r['rclass'] == 'main': mx[r['play']] = max(mx[r['play']], r['d1'])
            nm = [r for r in rows if r['kind'] == kind and gsel(r) and r['rclass'] == 'main']
            P(f'| {gl} | {klab} | {len(plays_k)} | ' + ' | '.join(f'{sum(mx[x] > T for x in plays_k) / max(len(plays_k), 1):.3f}' for T in (8, 10, 12, 15)) + f' | {sum(r["d1"] > 10 for r in nm) / max(len(nm), 1):.4f} |')
    for cls, cl in (('behind', 'behind the line'), ('checkdown', 'back within 3 yd of the line')):
        a = [r for r in rows if r['rclass'] == cls]
        pl_ = {r['play'] for r in a}
        mx = collections.defaultdict(float)
        for r in a: mx[r['play']] = max(mx[r['play']], r['d1'])
        P(f'| {cl} (separately), any moment | all | {len(pl_)} | ' + ' | '.join(f'{sum(mx[x] > T for x in pl_) / max(len(pl_), 1):.3f}' for T in (8, 10, 12, 15)) + f' | {sum(r["d1"] > 10 for r in a) / max(len(a), 1):.4f} |')
    P('\n### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open\n')
    byplay = collections.defaultdict(lambda: {'rel': False, 'fix': False, 'hasrel': False, 'hasfix': False})
    for r in rows:
        q = byplay[r['play']]
        q['has' + r['kind']] = True
        if wide(r): q[r['kind']] = True
    P(f'- at the release: {sum(q["rel"] for q in byplay.values())} of {sum(q["hasrel"] for q in byplay.values())} thrown dropbacks ({sum(q["rel"] for q in byplay.values()) / max(sum(q["hasrel"] for q in byplay.values()), 1):.3f}); receiver-moments {sum(wide(r) for r in rows if r["kind"]=="rel") / max(sum(r["kind"]=="rel" for r in rows), 1):.3f}')
    P(f'- at any fixed time while the ball was held: {sum(q["fix"] for q in byplay.values())} of {sum(q["hasfix"] for q in byplay.values())} dropbacks ({sum(q["fix"] for q in byplay.values()) / max(sum(q["hasfix"] for q in byplay.values()), 1):.3f}); receiver-moments {sum(wide(r) for r in rows if r["kind"]=="fix") / max(sum(r["kind"]=="fix" for r in rows), 1):.3f}')
    pers = collections.defaultdict(set); hasp = set()
    for r in rows:
        if r['kind'] == 'fix':
            hasp.add(r['play'])
            if wide(r): pers[(r['play'], r['slot'])].add(r['f'])
    perp = {k[0] for k, v in pers.items() if any((f + 5) in v for f in v)}
    P(f'- wide open at two consecutive fixed times (0.5 s apart, same receiver): {len(perp)} of {len(hasp)} dropbacks ({len(perp) / max(len(hasp), 1):.3f})')
    for kind, lab in (('rel', 'release'), ('fix', 'fixed')):
        v = [r['d1'] for r in rows if r['kind'] == kind]
        P(f'- d1 tail at {lab}: p90 {pct(v, 90):.1f}, p95 {pct(v, 95):.1f}, p99 {pct(v, 99):.1f}; share of receiver-moments with d1 over 5 yd {np.mean(np.array(v) > 5):.3f}, over 7 yd {np.mean(np.array(v) > 7):.3f}, over 9 yd {np.mean(np.array(v) > 9):.3f}')
    tg = [r for r in rows if r['kind'] == 'rel' and r['target']]
    P(f'- the targeted receiver at release (n {len(tg)}): d1 {dist([r["d1"] for r in tg])}, wide open {sum(wide(r) for r in tg) / max(len(tg), 1):.3f}; untargeted route runners at release d1 {dist([r["d1"] for r in rows if r["kind"]=="rel" and not r["target"]])}')
    P('')
    for key, title in (('fam', 'coverage family'), ('man', 'man / zone'), ('align', 'formation (receivers each side)'), ('empty', 'empty backfield'), ('motion', 'motion'), ('motion_empty', 'motion with empty'), ('pa', 'play action')):
        P(f'### By {title}\n')
        P('| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |'); P('|---|---|---|---|---|---|---|---|---|---|')
        groups = collections.defaultdict(list)
        for r in rows: groups[r[key]].append(r)
        for g in sorted(groups, key=lambda g: -len(groups[g])):
            a = [r for r in groups[g] if r['kind'] == 'rel']; c = [r for r in groups[g] if r['kind'] == 'fix']
            if len(a) + len(c) < 30: continue
            pl = {r['play'] for r in groups[g]}
            wr = sum(byplay[x]['rel'] for x in pl if byplay[x]['hasrel']) / max(sum(byplay[x]['hasrel'] for x in pl), 1)
            wf = sum(byplay[x]['fix'] for x in pl if byplay[x]['hasfix']) / max(sum(byplay[x]['hasfix'] for x in pl), 1)
            f = lambda v: f'{pct(v, 50):.1f} / {pct(v, 90):.1f}' if len(v) else '-'
            P(f'| {g} | {len(pl)} | {len(a)} | {f([r["d1"] for r in a])} | {sum(wide(r) for r in a) / max(len(a), 1):.3f} | {wr:.3f} | {len(c)} | {f([r["d1"] for r in c])} | {sum(wide(r) for r in c) / max(len(c), 1):.3f} | {wf:.3f} |')
        P('')

tables(nfl_rows, nfl_meta, 'NFL')
wide_export = []
for sp in SIMS:
    sim_plays = load(sp); rows, meta = census(sim_plays, 'sim')
    tables(rows, meta, 'Ours: ' + sp.split('/')[-1])
    simd = {p['id']: p for p in sim_plays}
    for r in rows:
        if wide(r):
            p = simd[r['play']]; key = 'rel' if r['kind'] == 'rel' else str(r['f'])
            wide_export.append(dict(play=r['play'], concept=p.get('concept'), cov=p.get('cov'), fam=p.get('fam'), form=p.get('form'), t=r['f'] / 10, kind=r['kind'], receiver=r['slot'], depth=round(r['depth'], 1), d1=round(r['d1'], 2), d2=round(r['d2'], 2),
                                    nearest=r['j1'], rel=r['rel'], io=r['io'], cl=r['cl'], target=r['target'], defenders=p['def'].get(key)))
    if WIDE: json.dump(wide_export, open(WIDE, 'w'))

P('## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)\n')
P('| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |'); P('|---|---|---|---|---|---|---|---|---|')
def cellrow(lab, rows_):
    out = []
    for kind in ('fix', 'rel'):
        for g in ('Cover-2', 'Cover-6'):
            a = [wide(r) for r in rows_ if r['kind'] == kind and r['band'] == '10-15' and r['fam'] == g]
            out += [str(len(a)), f'{np.mean(a):.3f}' if a else '-']
    P(f'| {lab} | ' + ' | '.join(out) + ' |')
cellrow('NFL', nfl_rows)
for sp in SIMS: cellrow(sp.split('/')[-1], census(load(sp), 'sim')[0])
P('')

# Cells where ours differs from the NFL: share of receiver-moments wide open (the NFL p90 of its own depth band), by (coverage family, depth band, moment kind) and (man/zone, band, kind).
P('## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side\n')
for sp in SIMS:
    srows, _ = census(load(sp), 'sim')
    for key, title in (('fam', 'coverage family'), ('man', 'man / zone'), ('align', 'formation'), ('pa', 'play action')):
        cells = []
        for kind in ('rel', 'fix'):
            for _, _, b in BANDS:
                for g in sorted({r[key] for r in srows}):
                    a = [wide(r) for r in nfl_rows if r['kind'] == kind and r['band'] == b and r[key] == g]; c = [wide(r) for r in srows if r['kind'] == kind and r['band'] == b and r[key] == g]
                    if len(a) < 40 or len(c) < 40: continue
                    pa, pc = np.mean(a), np.mean(c); se = math.sqrt(pa * (1 - pa) / len(a) + pc * (1 - pc) / len(c)) or 1.0
                    cells.append(((pc - pa) / se, kind, b, g, len(a), len(c), pa, pc))
        cells.sort(key=lambda t: -abs(t[0]))
        P(f'### By {title} ({sp.split("/")[-1]}), top 8 by |z|\n'); P('| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |'); P('|---|---|---|---|---|---|---|---|')
        for z, kind, b, g, na, nc, pa, pc in cells[:8]: P(f'| {z:+.1f} | {kind} | {b} | {g} | {na} | {nc} | {pa:.3f} | {pc:.3f} |')
        P('')

# Operator check.
P('## Operator check\n')
agree = [(m['align'], m['pff_align']) for m in nfl_meta if m['pff_align'] not in (None, 'NA')]
P(f'Formation operator vs PFF receiverAlignment on NFL: {sum(a == b for a, b in agree)} of {len(agree)} agree ({sum(a == b for a, b in agree) / max(len(agree), 1):.3f}); most common disagreements: ' + ', '.join(f'{a} for {b} x{n}' for (a, b), n in collections.Counter((a, b) for a, b in agree if a != b).most_common(5)) + '.\n')

def indep(p, f, slot):
    """A second implementation from the raw arrays: stacked norms for the distances, polar angles for the relation."""
    pl = p['players']; X, Y = p['X'], p['Y']; q = p['qb']
    i = next(k for k, r in enumerate(pl) if (r.get('slot') or r.get('id')) == slot and r['side'] == 'O')
    D = np.array([[X[k, f], Y[k, f]] for k, r in enumerate(pl) if r['side'] == 'D']); ids = [k for k, r in enumerate(pl) if r['side'] == 'D']
    r0 = np.array([X[i, f], Y[i, f]]); dd = np.linalg.norm(D - r0, axis=1); o = np.argsort(dd)
    v = D[o[0]] - r0; tq = math.atan2(Y[q, f] - r0[1], X[q, f] - r0[0]); td = math.atan2(v[1], v[0]); phi = td - tq
    along = float(np.linalg.norm(v) * math.cos(phi)); rel = 'front' if along > 1.0 else 'behind' if along < -1.0 else 'level'
    mid = 1.0 if 26.67 >= r0[1] else -1.0; lat = v[1] * mid; io = 'inside' if lat > 0.5 else 'outside' if lat < -0.5 else 'head-up'
    return float(dd[o[0]]), float(dd[o[1]]), rel, io

rng = np.random.default_rng(1)
for name, plays, src in ([('NFL', nfl_plays, 'nfl')] + [('ours', load(SIMS[0]), 'sim')] if SIMS else [('NFL', nfl_plays, 'nfl')]):
    P(f'### {name}: {NCHECK} plays at the release, every route runner: the operator against a second implementation (stacked norms, polar angles)\n')
    bad = 0; nrow = 0; md = 0.0; done = 0
    for k in rng.permutation(len(plays)):
        p = plays[int(k)]
        if p['rel'] is None: continue
        rows, _ = census([p], src); rr = [r for r in rows if r['kind'] == 'rel']
        if not rr: continue
        f = p['rel']; q = p['qb']; txtl = []
        for r in rr:
            d1, d2, rel, io = indep(p, f, r['slot']); nrow += 1; md = max(md, abs(d1 - r['d1']), abs(d2 - r['d2'])); bad += (rel != r['rel']) + (io != r['io'])
            txtl.append(f'{r["slot"]} d1 {r["d1"]:.1f} d2 {r["d2"]:.1f} {r["rel"]}/{r["io"]}/{r["cl"]}' + ('' if (rel, io) == (r['rel'], r['io']) else ' [MISMATCH]'))
        P(f'- {p["id"]} {p.get("cov")} rel frame {f} QB ({p["X"][q, f]:.1f}, {p["Y"][q, f]:.1f}): ' + '; '.join(txtl))
        done += 1
        if done >= NCHECK: break
    P(f'\nSecond implementation: {nrow} receiver rows, max |d1|, |d2| difference {md:.4f} yd, relation / side mismatches {bad}.\n')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
