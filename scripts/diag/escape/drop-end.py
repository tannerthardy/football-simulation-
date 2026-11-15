"""QB lane, 2026-11-15: how the drop ends. Same code on NFL tracking and sim exports; non-designed gun dropbacks, no
play action, no screens, the ball still in his hand 0.6 s after he reaches his depth. Aligned on the moment he first
comes within 0.25 yd of the deepest point he reaches before the throw ('top'), his upfield velocity (yd/s, from
positions 0.1 s apart) from 0.4 s before to 0.6 s after it, by how deep the drop went; and his peak backward speed,
and how long from 90% of his depth to the top (the brake). Does he arrive planted, or still going back?
usage: python3 -I drop-end.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, csv, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|bubble|tunnel|slip|now_', re.I)
OFF = (-0.4, -0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6)
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))
for arg in args:
    name, paths = arg.split('=', 1); R = {}
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); con = str((raw.get('cell') or {}).get('concept') or '')
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE' or pf['playAction'] == 'TRUE'): continue
            if raw.get('source') == 'sim' and (DES.search(con) or 'pa' in con.split('+') or con.startswith('pa_')): continue
            p = Play(raw); qbs = p.who('O', 'QB'); fw = raw['events'].get('pass_forward')
            if not qbs or fw is None or p.pos(qbs[0], 0)[0] is None or p.pos(qbs[0], 0)[0] >= -3: continue
            qb = qbs[0]; kend = min(p.frames - 1, p.k(fw)); xs = [p.pos(qb, k)[0] for k in range(kend + 1)]
            if any(x is None for x in xs): continue
            x0 = xs[0]; deep = min(xs); depth = x0 - deep
            if depth < 1.0: continue
            kt = next(k for k, x in enumerate(xs) if x <= deep + 0.25)
            if (kend - kt) * p.dt < 0.6 or kt < 5: continue
            v = lambda k: (xs[k + 1] - xs[k - 1]) / (2 * p.dt) if 0 < k < len(xs) - 1 else None
            prof = [v(kt + int(round(o / p.dt))) for o in OFF]
            if any(x is None for x in prof): continue
            k90 = next(k for k, x in enumerate(xs) if x0 - x >= 0.9 * depth)
            peak = -min(v(k) for k in range(1, kt + 1))
            b = '1-2' if depth < 2 else '2-3.5' if depth < 3.5 else '3.5-5' if depth < 5 else '5+'
            R.setdefault(b, []).append((prof, peak, (kt - k90) * p.dt))
    print(f"== {name}")
    for b in ('1-2', '2-3.5', '3.5-5', '5+'):
        S = R.get(b, [])
        if len(S) < 20: continue
        print(f"   drop {b} yd (n {len(S)}): peak backward speed p50 {q([s[1] for s in S]):.1f} yd/s | 90% of depth to the top p50 {q([s[2] for s in S]):.2f} s")
        print("      upfield velocity p50 at t - top (s): " + '  '.join(f"{o:+.1f}: {q([s[0][i] for s in S]):+.2f}" for i, o in enumerate(OFF)))
        print("      share moving back faster than 1 yd/s:  " + '  '.join(f"{o:+.1f}: {100 * sum(1 for s in S if s[0][i] < -1) / len(S):3.0f}%" for i, o in enumerate(OFF)))
