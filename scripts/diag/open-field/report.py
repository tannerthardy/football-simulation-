"""One run-game report for a traced label, every operator beside 2022 NFL
runs measured by the same code. Tail rates use NFL runs with 60+ yd to the
goal (lab plays start 70 yd out); conditional tails are field-position limited.
Errors and non-terminal plays are counted, never silently dropped.

usage: report.py LABEL   (expects out/open-field/all/LABEL.jsonl.gz and -common; see common.sh)
"""
import gzip, json, math, subprocess, sys
from collections import Counter
L = sys.argv[1]
ROOT = 'out/open-field/all'
rows = [json.loads(l) for l in gzip.open(f'{ROOT}/{L}.jsonl.gz', 'rt') if l.strip()]
err = [r for r in rows if 'error' in r]; ok = [r for r in rows if 'error' not in r]
nonterm = [r for r in ok if r.get('terminal') is False]
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
nfl = [r for r in nfl if r.get('kind') == 'run' and r.get('carrier') is not None]
far = [r for r in nfl if ytg.get(r['id'], 0) >= 60]
def dist(g):
    g = sorted(g); n = len(g); q = lambda f: g[int(f * (n - 1))]
    return f"n {n:5d} mean {sum(g)/n:5.2f} p10 {q(.1):5.1f} p50 {q(.5):5.1f} p90 {q(.9):5.1f} | neg {100*sum(x<0 for x in g)/n:4.1f}% 4+ {100*sum(x>=4 for x in g)/n:4.1f}% 10+ {100*sum(x>=10 for x in g)/n:4.1f}% 20+ {100*sum(x>=20 for x in g)/n:4.1f}% 40+ {100*sum(x>=40 for x in g)/n:4.2f}%"
def cond(g):
    out = []
    for lo in (10, 20):
        k = [x for x in g if x >= lo]
        out.append(f"P(40+|{lo}+) {sum(x>=40 for x in k)}/{len(k)}={sum(x>=40 for x in k)/max(1,len(k)):.2f}")
    return '  '.join(out)
print(f"== {L}: plays {len(rows)}, errors {len(err)}, non-terminal at 20 s {len(nonterm)}")
g = [r['gain'] for r in ok]
print('  sim  ', dist(g)); print('  NFL60', dist([r['yards'] for r in far])); print('  NFL  ', dist([r['yards'] for r in nfl]))
print('  tail sim', cond(g), ' | NFL60', cond([r['yards'] for r in far]))
NFLC = {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE', 'wz': 'OUTSIDE ZONE', 'power': 'POWER', 'counter': 'COUNTER', 'trap': 'TRAP', 'duo': 'MAN'}
for c in sorted({r['concept'] for r in ok}):
    print(f"    {c:8s}", dist([r['gain'] for r in ok if r['concept'] == c]))
    ref = [r['yards'] for r in far if (r.get('cell') or {}).get('concept') == NFLC.get(c)]
    if ref: print(f"    {'NFL60':8s}", dist(ref), NFLC[c].lower())
PY = sys.executable
def run(*a):
    return subprocess.run([PY, '-I', *a], capture_output=True, text=True).stdout
mech = run('scripts/diag/open-field/mech.py', f'{ROOT}/{L}.jsonl.gz', 'run.yards_before_contact', 'run.yards_after_contact',
           'run.engaged_dl_driven_back_2s', 'run.max_engaged_dl_driven_back_3s', 'run.first_contact_s', 'run.carrier_cross_los_s', 'contact.run.broke_contact')
print(mech.rstrip())
ft = run('scripts/diag/open-field/firsttackler.py', f'{ROOT}/{L}.jsonl.gz', '--sim-trace')
print('  first contact (nearest defender):', ' | '.join(x.strip() for x in ft.splitlines()[1:]))
tm = run('scripts/diag/open-field/timing.py', f'{ROOT}/{L}.jsonl.gz', '--sim-trace')
print('  secondary depth:', ' | '.join(x.strip() for x in tm.splitlines()[2:6]))
lb = run('scripts/diag/open-field/lbpass.py', f'{ROOT}/{L}.jsonl.gz', '--sim-trace')
print('  second level passed:', ' | '.join(x.strip() for x in lb.splitlines()[1:]))
tl = run('scripts/diag/trench/timeline.py', 'out/mechanics/nfl-plays.jsonl.gz', f'{ROOT}/{L}-common.jsonl.gz')
keep = ('==', 'lat DL 1.0', 'lat DL 2.0', 'lat LB 2.0', 'lat OL 2.0', 'OL lat speed engaged', 'engaged DL depth 2.0', 'engaged DL depth 3.0', 'first block duration', 'doubles per play', 'double duration')
for line in tl.splitlines():
    if line.startswith('==') and 'sim 0 runs' in line: skip = True; continue
    if line.startswith('=='): skip = False
    if not locals().get('skip') and any(line.strip().startswith(k) for k in keep): print('  ' + line.strip())
