"""Late-throw completion, first wrong stage (coverage lane, 2026-11-14). Common play format (NFL nfl_bdb2025.py, sim
sim-export.ts), the same population and outcome rules as scripts/diag/escape/completion-by-time.py (non-designed
dropbacks, targeted throws, throw-aways out; NFL result from plays.csv). By release-time bin and coverage family:
completion; the target's separation (nearest defender) at the snap + 1/2/3 s up to the release, at the release, and at
the arrival; and what kind of throw it is: depth of the target at the arrival, the target's speed at the release
(settled under 1.5 yd/s), the QB's speed at the release (on the move over 2 yd/s) and his depth behind the line.
usage: python3 -I late_throw.py --plays-csv plays.csv name=a.jsonl.gz[,b.jsonl.gz] ..."""
import sys, gzip, json, csv, re, math, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'mechanics'))
from metrics import coverage_family
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
EDGES = (2.0, 2.5, 3.0, 3.5, 4.0)
LABS = ['<2.0'] + [f"{EDGES[i]:.1f}-{EDGES[i + 1]:.1f}" for i in range(len(EDGES) - 1)] + ['4.0+']
def pos(raw, f, j):
    xy = raw['xy']; f = max(0, min(len(xy) - 1, f)); return xy[f][2 * j], xy[f][2 * j + 1]
def speed(raw, f, j):
    a, b = pos(raw, f - 2, j), pos(raw, f + 2, j); return math.hypot(b[0] - a[0], b[1] - a[1]) / (4 * raw['dt'])
def sep(raw, f, t, D):
    p = pos(raw, f, t); return min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in (pos(raw, f, j) for j in D))
def q(v):
    v = sorted(v); return '-' if len(v) < 5 else '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75))
for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass': continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            ev = raw['events']; fw = ev.get('pass_forward'); lab = raw.get('labels') or {}; t = raw.get('target')
            if fw is None or t is None: continue
            if pf is not None:
                if pf['passResult'] not in ('C', 'I', 'IN'): continue
                if pf['passResult'] == 'I' and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription']): continue
                cmp = pf['passResult'] == 'C'
            else:
                if lab.get('throwaway'): continue
                cmp = ('catch' in ev) and not lab.get('interception')
            D = [j for j, p in enumerate(raw['players']) if p['side'] == 'D']
            QB = next((j for j, p in enumerate(raw['players']) if p['side'] == 'O' and p['group'] == 'QB'), None)
            if not D or QB is None: continue
            dt = raw['dt']; fr = round(fw / dt); fa = round(ev.get('pass_arrived', fw + 0.8) / dt)
            r = dict(bin=sum(fw >= e for e in EDGES), cov=coverage_family((raw.get('cell') or {}).get('coverage')) or 'other', cmp=cmp,
                     rel=sep(raw, fr, t, D), arr=sep(raw, fa, t, D), depth=pos(raw, fa, t)[0], tspd=speed(raw, fr, t),
                     qspd=speed(raw, fr, QB), qx=pos(raw, fr, QB)[0])
            for s in (1, 2, 3):
                if s * 1.0 < fw: r[f's{s}'] = sep(raw, round(s / dt), t, D)
            rows.append(r)
    print(f'== {name}: n {len(rows)}')
    for cov in ('all', 'man', 'zone'):
        R = [r for r in rows if cov == 'all' or r['cov'] == cov]
        print(f'  -- {cov}')
        for b, l in enumerate(LABS):
            B = [r for r in R if r['bin'] == b]
            if len(B) < 5: continue
            m = lambda f: sum(f(r) for r in B) / len(B)
            print(f"   {l:8s} n {len(B):4d} comp {100 * m(lambda r: r['cmp']):3.0f}% | sep snap+1/+2/+3 s {q([r['s1'] for r in B if 's1' in r])} > {q([r['s2'] for r in B if 's2' in r])} > {q([r['s3'] for r in B if 's3' in r])} | release {q([r['rel'] for r in B])} | arrival {q([r['arr'] for r in B])} | depth {q([r['depth'] for r in B])} | target settled {100 * m(lambda r: r['tspd'] < 1.5):.0f}% | QB moving {100 * m(lambda r: r['qspd'] > 2):.0f}%, depth {q([r['qx'] for r in B])}")
