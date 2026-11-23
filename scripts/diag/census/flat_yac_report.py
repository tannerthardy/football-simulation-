"""Flat catches: how much of the YAC they are, NFL vs ours, one operator (open-census play format through the end of the play: nfl_catches.py, sim_plays.mts --full).
  python3 -I scripts/diag/census/flat_yac_report.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--out report.md]

Flat catch (completions only): caught within 4 yd of the line of scrimmage in depth (behind the line included) and at least 8 yd laterally from the ball's snap position (the center's y at the snap). Screens are separated: a catch behind the
line (x under 1 yd) with at least two offensive linemen downfield of the line by 2 yd or more at the catch (the same proxy on both sides; ours also by the call's screen tag, printed as a check). Receiver type: back (RB / FB / HB), TE, slot (a WR within 13 yd of the
center at the snap), wide (a WR 13 yd or more out). YAC = the receiver's downfield yards from the catch to the end of the play. Post-catch geometry (defenders within 5 / 8 yd of the catcher at the catch, the nearest defender's distance, closing speed over 0.2 s,
inside / outside, ahead / behind) and the first-defender outcome classes come from Defense's pursuit operator (scripts/diag/census/pursuit/pursuit-an.py, defense/pursuit-operator), fed rows built from the positions here on both sides (velocities by a centred 0.2 s difference).
At the throw: the nearest non-lineman defender to the receiver (distance, depth, width from the sideline). Ours only: the seat that owned the flat by the call (the man on him, or the zone defender whose landmark is nearest him) and its technique label at the throw."""
import gzip, json, sys, math, collections, importlib.util, os
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
spec = importlib.util.spec_from_file_location('pursuit_an', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pursuit', 'pursuit-an.py')); PA = importlib.util.module_from_spec(spec); spec.loader.exec_module(PA)
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}; DL = {'DE', 'DT', 'NT'}
def pff_label(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'cover6': 'Cover-6', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}

def rows_of(paths, src):
    out = []
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; c = p['catch']; r = p['recv']; nf = X.shape[1]
            if c is None or c >= nf - 2: continue
            cs = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] == 'C']; ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]
            yc = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
            cx, cy = float(X[r, c]), float(Y[r, c])
            fam = pff_label(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other'); man = (p.get('manzone') == 'Man') if src == 'nfl' else bool(p.get('man'))
            pos = pl[r]['pos']; dy0 = abs(float(Y[r, 0]) - yc)
            typ = 'back' if pos in BACK else 'TE' if pos == 'TE' else 'wide' if dy0 >= 13 else 'slot'
            flat = cx <= 4.0 and abs(cy - yc) >= 8.0
            screen_proxy = (cx < 1.0 and sum(1 for i in ol if X[i, c] >= 2.0) >= 2) or bool(p.get('screen'))  # the proxy on both sides; ours also by the call's screen tag (the proxy alone misses most of ours)
            yac = float(X[r, nf - 1] - cx)
            row = dict(src=src, id=p['id'], fam=fam, man=man, typ=typ, flat=flat, screen=screen_proxy, tag=bool(p.get('screen')), yac=yac, cx=cx, cy=cy, p=p, X=X, Y=Y, c=c, r=r, nf=nf, yc=yc)
            out.append(row)
    return out

def build_row(R):
    p, X, Y, c, r, nf = R['p'], R['X'], R['Y'], R['c'], R['r'], R['nf']; pl = p['players']
    def trk(i, o=False):
        out = []
        for f in range(c, nf):
            a, b = max(c, f - 1), min(nf - 1, f + 1); dt = (b - a) / 10.0 or 0.1
            vx, vy = (X[i, b] - X[i, a]) / dt, (Y[i, b] - Y[i, a]) / dt
            out.append([round((f - c) / 10, 1), float(X[i, f]), float(Y[i, f]), round(vx, 2), round(vy, 2)] + ([0.0] if o else []))
        return out
    defs = {str(i): trk(i, True) for i, q in enumerate(pl) if q['side'] == 'D'}
    offs = {str(i): trk(i) for i, q in enumerate(pl) if q['side'] == 'O' and i != r and i != p['qb']}
    return dict(src=R['src'], key=R['id'], man=R['man'], air=None, end='end', car=trk(r), defs=defs, offs=offs, ev=[])

def q3(v): return f'{np.percentile(v, 50):.1f} ({np.percentile(v, 25):.1f}-{np.percentile(v, 75):.1f})' if len(v) else '-'
def pr(v, p): return float(np.percentile(v, p)) if len(v) else float('nan')

def throw_geometry(R):
    p, X, Y, r = R['p'], R['X'], R['Y'], R['r']; f = p['rel']; pl = p['players']
    if f is None or f >= R['nf']: return None
    ds = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['pos'] not in DL and not str(q.get('slot', '')).startswith(('DE_', 'DT_'))]
    if not ds: return None
    d = [math.hypot(X[i, f] - X[r, f], Y[i, f] - Y[r, f]) for i in ds]; j = ds[int(np.argmin(d))]
    return dict(dist=min(d), depth=float(X[j, f]), width=float(min(Y[j, f], 53.33 - Y[j, f])), rdepth=float(X[r, f]), rwidth=float(min(Y[r, f], 53.33 - Y[r, f])), slot=pl[j].get('slot') or pl[j]['pos'])

def owner_of(R):
    """Ours only: the seat that owned the flat by the call at the throw: the man on him, else the zone defender whose landmark is nearest him (within 9 yd); and his technique label."""
    p = R['p']; d = (p.get('def') or {}).get('rel')
    if not d: return None
    slot = p['players'][R['r']].get('slot'); f = p['rel']; rx, ry = float(R['X'][R['r'], f]), float(R['Y'][R['r'], f])
    man = [e for e in d if e.get('kind') == 'man' and e.get('target') == slot]
    if man:
        t = man[0].get('tech') or {}; lab = 'man' + (' press' if t.get('press') else '') + (' hips open' if t.get('hipsOpen') else '') + (' trail' if t.get('trail') else '') + (' over the top' if t.get('overTop') else '')
        return man[0]['slot'], 'man', lab
    zs = [(math.hypot(e['lm'][0] - rx, e['lm'][1] - ry), e) for e in d if e.get('kind') == 'zone' and e.get('lm')]
    if zs:
        dd, e = min(zs, key=lambda z: z[0])
        if dd <= 9.0: return e['slot'], 'zone', f"zone ({e.get('style') or '?'})" + (f" target {e['target']}" if e.get('target') else ' no target')
    # a zone seat whose landmark is not recorded (the engine holds none for him): the zone defender standing nearest the receiver at the throw, within 9 yd
    pl = p['players']; best = None
    for e in d:
        if e.get('kind') != 'zone' or e.get('lm'): continue
        j = next((i for i, q in enumerate(pl) if q['side'] == 'D' and q.get('slot') == e['slot']), None)
        if j is None: continue
        dd = math.hypot(float(R['X'][j, f]) - rx, float(R['Y'][j, f]) - ry)
        if dd <= 9.0 and (best is None or dd < best[0]): best = (dd, e)
    if best: return best[1]['slot'], 'zone', f"zone ({best[1].get('style') or '?'}, no landmark recorded)" + (f" target {best[1]['target']}" if best[1].get('target') else ' no target')
    return None
def owner_pos(R):
    """Where the owning seat stood at the throw (depth, width from the sideline) and, for a zone seat, where his landmark is."""
    o = owner_of(R)
    if not o: return None
    p = R['p']; f = p['rel']; j = next((i for i, q in enumerate(p['players']) if q['side'] == 'D' and q.get('slot') == o[0]), None)
    if j is None: return None
    lm = next((e.get('lm') for e in p['def']['rel'] if e.get('slot') == o[0]), None)
    return dict(kind=o[1], depth=float(R['X'][j, f]), width=float(min(R['Y'][j, f], 53.33 - R['Y'][j, f])), lmd=(lm[0] if lm else None), lmw=(min(lm[1], 53.33 - lm[1]) if lm else None))

lines = []; P = lambda s='': lines.append(s)
nfl = rows_of([args[0]], 'nfl'); sim = rows_of(args[1:], 'sim')
P('## Flat catches: share of completions and of YAC, NFL vs ours\n')
P(f'NFL {len(nfl)} completions, ours {len(sim)} (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.\n')
def share_table(title, key, vals):
    P(f'### By {title}\n'); P('| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |'); P('|---|---|---|---|---|---|---|---|---|')
    for v in vals:
        cells = []
        yl = []
        for rows in (nfl, sim):
            allc = rows; allyac = sum(r['yac'] for r in allc); sel = [r for r in rows if r['flat'] and not r['screen'] and (v is None or r[key] == v)]
            cells += [str(len(sel)), f'{len(sel) / max(len(allc), 1):.3f}', f'{sum(r["yac"] for r in sel) / max(allyac, 1e-9):.3f}']; yl.append(f'{pr([r["yac"] for r in sel], 50):.1f} / {pr([r["yac"] for r in sel], 90):.1f}')
        P(f'| {"all flat (screens apart)" if v is None else v} | ' + ' | '.join([cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], yl[0], yl[1]]) + ' |')
    P('')
share_table('all', 'typ', [None])
for key, title, vals in (('typ', 'receiver type', ['back', 'TE', 'slot', 'wide']), ('fam', 'coverage family', ['Cover-3', 'Cover-1', 'Cover-2', 'Quarters', 'Cover-6', 'Cover-0', '2-Man']), ('man', 'man / zone', [False, True])):
    share_table(title, key, vals)
sc = [(len([r for r in rows if r['screen']]), len(rows)) for rows in (nfl, sim)]
P(f'Screens (apart from the flat rows): NFL by the proxy {sc[0][0]} of {sc[0][1]} completions ({sc[0][0] / sc[0][1]:.3f}; a lower bound, since the proxy needs linemen downfield at the catch), ours {sc[1][0]} of {sc[1][1]} ({sc[1][0] / sc[1][1]:.3f}; by the call\'s screen tag or the proxy). Share of all YAC from screens: NFL {sum(r["yac"] for r in nfl if r["screen"]) / sum(r["yac"] for r in nfl):.3f}, ours {sum(r["yac"] for r in sim if r["screen"]) / sum(r["yac"] for r in sim):.3f}.\n')
sh = lambda rows, f: (sum(1 for r in rows if f(r)) / len(rows), sum(r['yac'] for r in rows if f(r)) / sum(r['yac'] for r in rows))
ne = [sh(rows, lambda r: r['cx'] <= 4.0 and not r['screen']) for rows in (nfl, sim)]
nl = [sh(rows, lambda r: r['cx'] <= 4.0 and not r['screen'] and abs(r['cy'] - r['yc']) < 8.0) for rows in (nfl, sim)]
nd = [sh(rows, lambda r: r['cx'] > 4.0) for rows in (nfl, sim)]
P('Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC\n'); P('| catch | NFL | ours |'); P('|---|---|---|')
P(f'| within 4 yd of the line, any width | {ne[0][0]:.3f} / {ne[0][1]:.3f} | {ne[1][0]:.3f} / {ne[1][1]:.3f} |'); P(f'| within 4 yd of the line and inside 8 yd of the ball | {nl[0][0]:.3f} / {nl[0][1]:.3f} | {nl[1][0]:.3f} / {nl[1][1]:.3f} |'); P(f'| deeper than 4 yd | {nd[0][0]:.3f} / {nd[0][1]:.3f} | {nd[1][0]:.3f} / {nd[1][1]:.3f} |')
P('')

# post-catch geometry and outcome, flat catches without screens
def analyse_all(rows):
    out = []
    for R in rows:
        if not (R['flat'] and not R['screen']): continue
        a = PA.analyse(build_row(R))
        if isinstance(a, dict): out.append((R, a))
    return out
an = {'NFL': analyse_all(nfl), 'ours': analyse_all(sim)}
P('## At the catch (flat catches, screens apart): Defense\'s pursuit operator on rows built from the positions\n')
P('| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |'); P('|---|---|---|---|---|---|---|---|---|---|')
for lab, rs in an.items():
    A = [a for _, a in rs]; n = max(len(A), 1)
    contact = [a['contact_t'] for a in A if a['contact_t'] is not None]; yac = [R['yac'] for R, _ in rs]
    P(f'| {lab} | {len(A)} | {q3([a["d1dist"] for a in A])} | {np.mean([a["bands"][5] for a in A]):.2f} / {np.mean([a["bands"][8] for a in A]):.2f} | {pr([a["d1clos"] for a in A if a["d1clos"] is not None], 50):.1f} | ' + ' / '.join(f'{sum(a["d1pos"] == x for a in A) / n:.2f}' for x in ('ahead', 'level', 'behind')) + f' | {sum(a["d1out"] for a in A) / n:.2f} / {1 - sum(a["d1out"] for a in A) / n:.2f} | {pr(yac, 50):.1f} / {pr(yac, 75):.1f} / {pr(yac, 90):.1f} | {np.mean([y >= 10 for y in yac]):.3f} | {len(contact) / n:.2f}, {pr(contact, 50):.1f} |')
P('')
P('### First-defender outcome (Defense\'s classes), share of flat catches\n')
outs = ['trailing from the catch (never level)', 'never reached', 'stopped (tackle or held for help)', 'contact, then play ended elsewhere', 'missed (contact range, then beaten)', 'beaten without contact']
P('| outcome | NFL | ours |'); P('|---|---|---|')
for o in outs:
    P(f'| {o} | ' + ' | '.join(f'{sum(a["outcome"].startswith(o.split(" (")[0]) for _, a in rs) / max(len(rs), 1):.3f}' for rs in an.values()) + ' |')
P('')
# at the throw
P('## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver\n')
P('| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |'); P('|---|---|---|---|---|---|---|')
for lab, rows in (('NFL', nfl), ('ours', sim)):
    G = [g for g in (throw_geometry(R) for R in rows if R['flat'] and not R['screen']) if g]
    P(f'| {lab} | {len(G)} | {q3([g["dist"] for g in G])} | {q3([g["depth"] for g in G])} | {q3([g["width"] for g in G])} | {q3([g["rdepth"] for g in G])} | {q3([g["rwidth"] for g in G])} |')
P('')
OP = [g for g in (owner_pos(R) for R in sim if R['flat'] and not R['screen']) if g]
P('Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):\n'); P('| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |'); P('|---|---|---|---|---|---|')
for kind in ('man', 'zone'):
    g = [x for x in OP if x['kind'] == kind]
    P(f'| {kind} | {len(g)} | {q3([x["depth"] for x in g])} | {q3([x["width"] for x in g])} | {q3([x["lmd"] for x in g if x["lmd"] is not None])} | {q3([x["lmw"] for x in g if x["lmw"] is not None])} |')
P('')
P('## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)\n')
cnt = collections.Counter(); tot = 0
for R in sim:
    if R['flat'] and not R['screen']:
        o = owner_of(R); tot += 1; cnt[o if o else ('(no seat within 9 yd)', '', '')] += 1
P(f'{tot} flat catches.\n'); P('| count | share | seat | kind | technique label |'); P('|---|---|---|---|---|')
for (slot, kind, lab), n in cnt.most_common(5): P(f'| {n} | {n / max(tot, 1):.2f} | {slot} | {kind} | {lab} |')
P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
