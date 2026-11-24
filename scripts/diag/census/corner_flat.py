"""The corner split by the flat threat, NFL vs ours, one operator (open-census play format).
  python3 -I scripts/diag/census/corner_flat.py NFL_PLAYS.jsonl.gz NFL_CATCHES.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--fam Cover-2,Cover-6] [--out report.md]
Per play and side of the center: #1 = the widest route runner at least 7 yd from the center at the snap; his corner = the CB / DB / nickel nearest #1 at the snap. Flat threat = a route runner on that side other than #1 (the #2 or a back) who is under 6 yd past the line
at 1.5 s and moving outward (away from the center) at more than 2 yd/s there (the centred 0.2 s difference). Cell A = the side has one at 1.5 s; cell B = none.
Corner depth past the line at 2.0 / 2.5 / 3.0 s (the plays whose ball is still held then) and how far under #1 he is at 3.0 s (#1's depth minus his; the distance from #1).
Flat outcome, per play-side: flat THROWS (the target is under 4 yd past the line and 8+ yd from the center's snap line on that side at the release) per 100 play-sides, and the share of them with the nearest defender over 8 yd at the release;
flat COMPLETIONS (caught under 4 yd, 8+ yd out, on that side, screens apart by the proxy of flat_yac_report.py) as a share of the completions to that side in the cell and their YAC to the end of the play (the NFL from the catches file, whose plays are completions only;
ours from the all-dropbacks file). Family by the PFF label (NFL) or the engine's mapped one."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--fam')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
FAMS = sys.argv[sys.argv.index('--fam') + 1].split(',') if '--fam' in sys.argv else ['Cover-2', 'Cover-6']
OL = {'T', 'G', 'C', 'OT', 'OG'}
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'quarters': 'Quarters', 'cover6': 'Cover-6', 'two_man': '2-Man', '2man': '2-Man', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}
def pff(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
def sides(path, src, full):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p.get('rel'); catch = p.get('catch'); recv = p.get('recv')
        if nf < 17: continue
        fam = pff(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        if fam not in FAMS or p.get('screen'): continue
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]; cbs = [i for i, r in enumerate(pl) if r['side'] == 'D' and r['pos'] in ('CB', 'DB', 'NB')]; dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        tgt = next((i for i, r in enumerate(pl) if r.get('target')), None)
        if not cbs: continue
        for sgn in (1, -1):
            side = [i for i in rec if sgn * (Y[i, 0] - c) >= 7]
            if not side: continue
            r1 = max(side, key=lambda i: abs(Y[i, 0] - c)); cb = min(cbs, key=lambda j: math.hypot(X[j, 0] - X[r1, 0], Y[j, 0] - Y[r1, 0]))
            threat = any(i != r1 and sgn * (Y[i, 0] - c) > 0.5 and X[i, 15] < 6 and sgn * (Y[i, 16] - Y[i, 14]) / 0.2 > 2 for i in rec)
            d = {}
            for t in (20, 25, 30):
                if nf > t and (rel is None or rel > t): d[t] = (float(X[cb, t]), float(X[r1, t] - X[cb, t]), float(math.hypot(X[cb, t] - X[r1, t], Y[cb, t] - Y[r1, t])))
            flat_throw = open_throw = False
            if rel is not None and rel < nf and tgt is not None and sgn * (Y[tgt, rel] - c) >= 8 and X[tgt, rel] < 4:
                flat_throw = True; open_throw = min(math.hypot(X[j, rel] - X[tgt, rel], Y[j, rel] - Y[tgt, rel]) for j in dfs) > 8
            comp = flat = False; yac = None
            if catch is not None and recv is not None and recv >= 0 and sgn * (Y[recv, catch] - c) >= 8:
                comp = True
                scr = X[recv, catch] < 1 and sum(1 for o in ols if X[o, catch] - 0 >= 2) >= 2
                if X[recv, catch] < 4 and not scr: flat = True; yac = float(X[recv, -1] - X[recv, catch])
            out.append(dict(fam=fam, A=threat, d=d, ft=flat_throw, ot=open_throw, comp=comp, flat=flat, yac=yac))
    return out
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
nfl_p = sides(args[0], 'nfl', False); nfl_c = sides(args[1], 'nfl', True); sims = [(a.split('/')[-1], sides(a, 'sim', True)) for a in args[2:]]
L = []; P = L.append
for fam in FAMS:
    P(f'## {fam}: the corner by the flat threat on his side\n')
    P('| cell | sample | play-sides | corner depth at 2.0 s p25 / 50 / 75 | at 2.5 s | at 3.0 s | under #1 at 3.0 s p25 / 50 / 75 | distance from #1 at 3.0 s p50 | flat throws per 100 (open at the release) | flat completions: share of completions to that side, YAC mean (n) |'); P('|---|---|---|---|---|---|---|---|---|---|')
    for cell, flag in (('A flat early', True), ('B no flat early', False)):
        for nm, S, C in [('NFL', nfl_p, nfl_c)] + [(n, s, s) for n, s in sims]:
            R = [r for r in S if r['fam'] == fam and r['A'] == flag]; Cc = [r for r in C if r['fam'] == fam and r['A'] == flag]
            if len(R) < 10: P(f'| {cell} | {nm} | {len(R)} | | | | | | | |'); continue
            dd = lambda t: ' / '.join(f'{q([r["d"][t][0] for r in R if t in r["d"]], x):.1f}' for x in (25, 50, 75)) + f' (n {sum(1 for r in R if t in r["d"])})'
            u = [r['d'][30][1] for r in R if 30 in r['d']]; ds = [r['d'][30][2] for r in R if 30 in r['d']]
            ft = [r for r in R if r['ft']]; comps = [r for r in Cc if r['comp']]; fl = [r for r in comps if r['flat']]
            P(f'| {cell} | {nm} | {len(R)} | {dd(20)} | {dd(25)} | {dd(30)} | ' + (' / '.join(f'{q(u, x):.1f}' for x in (25, 50, 75)) if u else '') + f' | {q(ds, 50):.1f} | {100 * len(ft) / len(R):.1f} ({sum(r["ot"] for r in ft)} of {len(ft)}) | '
              + (f'{len(fl) / max(1, len(comps)):.2f}, {np.mean([r["yac"] for r in fl]):.1f} ({len(fl)} of {len(comps)})' if fl else f'- (0 of {len(comps)})') + ' |')
    P('')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
