"""QB lane, 2026-11-14: when the drop is finished, by how deep it goes. NFL tracking and sim exports, same code.
Non-designed dropbacks. The drop's depth is the deepest he gets behind his snap spot before the ball leaves; its end
is the first frame he is within 0.25 yd of that depth. Counted only when the ball is still in his hand 0.3 s after
that (so the drop was finished, not cut by the throw). Rows by alignment and depth bin: share of drops, the time the
drop ends (p25/50/75), and the ball's release (p50). For the read plan's rhythm: is a route that is ready 0.7-1.0 s
after he sets late, or is he early?
usage: python3 -I drop-time.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, csv, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
BINS = {'gun': ((0, 2), (2, 3.5), (3.5, 5), (5, 99)), 'under': ((0, 4.5), (4.5, 6.5), (6.5, 8.5), (8.5, 99))}
for arg in args:
    name, paths = arg.split('=', 1); R = {'gun': [], 'under': []}
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None: continue
            qb = qbs[0]; fw = raw['events'].get('pass_forward')
            if fw is None: continue
            kend = min(p.frames - 1, p.k(fw)); x0 = p.pos(qb, 0)[0]
            xs = [p.pos(qb, k)[0] for k in range(kend + 1)]
            if any(x is None for x in xs): continue
            deep = min(xs); depth = x0 - deep
            ke = next(k for k, x in enumerate(xs) if x <= deep + 0.25)
            if (kend - ke) * p.dt < 0.3: continue
            R['gun' if x0 < -3 else 'under'].append((depth, ke * p.dt, fw, (raw.get('cell') or {}).get('concept')))
    print(f"== {name}")
    for aln in ('gun', 'under'):
        S = R[aln]; n = len(S)
        if not n: continue
        print(f"   {aln}: finished drops {n}; depth behind his snap spot p25/50/75 {q([s[0] for s in S], .25):.1f}/{q([s[0] for s in S]):.1f}/{q([s[0] for s in S], .75):.1f} yd; drop ends p25/50/75 {q([s[1] for s in S], .25):.2f}/{q([s[1] for s in S]):.2f}/{q([s[1] for s in S], .75):.2f} s")
        for lo, hi in BINS[aln]:
            B = [s for s in S if lo <= s[0] < hi]
            if len(B) >= 20: print(f"      {lo}-{hi if hi < 99 else '+'} yd deep: {100 * len(B) / n:3.0f}% | drop ends p25/50/75 {q([s[1] for s in B], .25):.2f}/{q([s[1] for s in B]):.2f}/{q([s[1] for s in B], .75):.2f} s | released p50 {q([s[2] for s in B]):.2f} s, {q([s[2] - s[1] for s in B]):.2f} s after it")
