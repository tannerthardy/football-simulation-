"""BALL_DRAG off vs on over many games (run_pairs.mts output, one file list per arm): designed runs stratified, and the pass side split into mechanisms.
  python3 -I scripts/diag/ball/run_strata.py --off f1.json f2.json ... --on g1.json g2.json ... [--out report.md]
Designed runs (kind 'run'): yards per carry and share of snaps by down, distance to go (1-3 / 4-7 / 8+), yardline (own side / midfield / opponent 40 and in), and by what the previous play was
(a completed pass, an incomplete pass, a sack/other, a run, a kick/other). Standardised comparison: the on-arm's stratum means weighted by the off-arm's mix (down x distance x field) and the reverse.
Pass side (plays with an attempt): completion, uncontested drop (dropped flag), pass breakup, interception, sack, throwaway and the rest of the incompletions (off target or covered with no breakup), per throw."""
import json, sys, collections, math
import numpy as np
argv = sys.argv[1:]
OUT = argv[argv.index('--out') + 1] if '--out' in argv else None
io = argv.index('--off'); ion = argv.index('--on')
offf = [a for a in argv[io + 1:ion] if not a.startswith('--')]; onf = [a for a in argv[ion + 1:] if not a.startswith('--') and a != OUT]
def load(files):
    G = []
    for f in files: G.extend(json.load(open(f)))
    return G
def rows(G):
    R = []
    for g in G:
        prev = None
        for p in g['plays']:
            k = p['key'].split('|'); off, quarter, clock, down, dist, yl = k[0], k[1], k[2], k[3], k[4], k[5]
            try: down = int(down); dist = float(dist); yl = float(yl)
            except Exception: prev = p; continue
            R.append(dict(kind=p['kind'], yards=p['yards'], down=down, dist=dist, yl=yl, text=p['text'], st=p.get('st'), prev=(prev or {}).get('kind'), prevtext=(prev or {}).get('text', ''), prevst=(prev or {}).get('st')))
            prev = p
    return R
O = rows(load(offf)); N = rows(load(onf))
db = lambda d: '1-3' if d <= 3 else '4-7' if d <= 7 else '8+'
fb = lambda y: 'own' if y >= 60 else 'mid' if y >= 40 else 'opp40'   # yardline = yards to the opponent's goal line
def prevtype(r):
    if r['prev'] == 'pass': st = r['prevst'] or {}; return 'prev complete' if st.get('c') else 'prev sack' if st.get('s') else 'prev incomplete'
    return 'prev run' if r['prev'] == 'run' else 'prev other'
L = []; P = L.append
P(f'## BALL_DRAG off vs on, {len(offf)} and {len(onf)} files of paired-seed games (off {len(load(offf))} games, on {len(load(onf))})\n')
runs = lambda R: [r for r in R if r['kind'] == 'run' and r['down'] in (1, 2, 3, 4)]
snaps = lambda R: [r for r in R if r['kind'] in ('run', 'pass')]
Ro, Rn = runs(O), runs(N)
P(f'Designed runs: off {len(Ro)} carries, {np.mean([r["yards"] for r in Ro]):.2f} yd/carry; on {len(Rn)}, {np.mean([r["yards"] for r in Rn]):.2f}. Run share of run+pass snaps: off {len(Ro) / len(snaps(O)):.3f}, on {len(Rn) / len(snaps(N)):.3f}. Stuffed (0 yd or less): off {np.mean([r["yards"] <= 0 for r in Ro]):.3f}, on {np.mean([r["yards"] <= 0 for r in Rn]):.3f}.\n')
def table(title, keyf, keys):
    P(f'### {title}\n'); P('| stratum | off n | off share of carries | off yd/carry | on n | on share | on yd/carry | on - off |'); P('|---|---|---|---|---|---|---|---|')
    for k in keys:
        a = [r['yards'] for r in Ro if keyf(r) == k]; b = [r['yards'] for r in Rn if keyf(r) == k]
        if len(a) < 10 or len(b) < 10: P(f'| {k} | {len(a)} | | | {len(b)} | | | |'); continue
        P(f'| {k} | {len(a)} | {len(a) / len(Ro):.3f} | {np.mean(a):.2f} | {len(b)} | {len(b) / len(Rn):.3f} | {np.mean(b):.2f} | {np.mean(b) - np.mean(a):+.2f} |')
    P('')
table('By distance to go', lambda r: db(r['dist']), ['1-3', '4-7', '8+'])
table('By down', lambda r: r['down'], [1, 2, 3, 4])
table('By field position (yards to the opponent goal line: own side 60+, midfield 40-60, opponent 40 and in)', lambda r: fb(r['yl']), ['own', 'mid', 'opp40'])
table('By the previous play', prevtype, ['prev complete', 'prev incomplete', 'prev sack', 'prev run', 'prev other'])
# standardised difference
def strata(r): return (r['down'] if r['down'] < 4 else 3, db(r['dist']), fb(r['yl']))
def mean_by(R):
    d = collections.defaultdict(list)
    for r in R: d[strata(r)].append(r['yards'])
    return d
mo, mn = mean_by(Ro), mean_by(Rn)
def std(wt, m1, m2):
    num = den = 0
    for s, v in wt.items():
        if s in m2 and len(m2[s]) >= 3 and len(m1[s]) >= 3: num += len(v) * (np.mean(m2[s]) - np.mean(m1[s])); den += len(v)
    return num / den, den
d1, n1 = std(mo, mo, mn); d2, n2 = std(mn, mo, mn)
P(f'Standardised on down x distance x field position (strata with at least 3 carries in both arms): on - off, weighted by the off arm\'s mix {d1:+.2f} yd/carry (on {n1} carries covered of {len(Ro)}); weighted by the on arm\'s mix {d2:+.2f} (of {len(Rn)}). Unstandardised {np.mean([r["yards"] for r in Rn]) - np.mean([r["yards"] for r in Ro]):+.2f}.\n')
# bootstrap SE of the unstandardised difference
rng = np.random.default_rng(1); ya = np.array([r['yards'] for r in Ro]); yb = np.array([r['yards'] for r in Rn])
bs = [rng.choice(yb, len(yb)).mean() - rng.choice(ya, len(ya)).mean() for _ in range(2000)]
P(f'Bootstrap standard error of the unstandardised difference: {np.std(bs):.2f} yd/carry.\n')
# pass side
P('### Pass side, per attempt (plays with an attempt)\n'); P('| arm | attempts | complete | drop | breakup | interception | sack (per dropback) | throwaway | other incomplete (off target or covered, no breakup) |'); P('|---|---|---|---|---|---|---|---|---|')
for lab, R in (('off', O), ('on', N)):
    pa = [r for r in R if r['kind'] == 'pass' and r['st']]
    att = [r for r in pa if r['st']['a']]
    c = sum(r['st']['c'] for r in att); d = sum(r['st']['d'] for r in att); pb = sum(r['st']['pbu'] for r in att); it = sum(r['st']['i'] for r in att); th = sum(r['st']['t'] for r in att)
    oth = len(att) - c - d - pb - it - th
    P(f'| {lab} | {len(att)} | {c / len(att):.3f} ({c}) | {d / len(att):.3f} ({d}) | {pb / len(att):.3f} ({pb}) | {it / len(att):.3f} ({it}) | {sum(r["st"]["s"] for r in pa) / len(pa):.3f} ({sum(r["st"]["s"] for r in pa)} of {len(pa)}) | {th / len(att):.3f} ({th}) | {oth / len(att):.3f} ({oth}) |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
