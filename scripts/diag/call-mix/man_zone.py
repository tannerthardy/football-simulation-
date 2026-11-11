"""Man vs zone yield after the catch (report only; docs/reviews/2026-11-11-cover-mix.md).

  python3 -I scripts/diag/call-mix/man_zone.py out/call-mix/nfl.jsonl <collect.jsonl>[,...]

From collect.ts rows (sim) and nfl_calls.py rows (NFL): yards a dropback, completion and YAC (median / trimmed
under 30 / mean +/- SE) by coverage family; and man (C0, C1, C2 man) vs zone within situation (1st & 10;
2nd/3rd & 7+) and by targeted-route class. Sim YAC is native stats.yac; NFL YAC is BDB 2025's charted
yardageGainedAfterTheCatch."""
import json, math, sys
from statistics import mean, median, pstdev
LABEL = {'hitch': 'HITCH', 'curl': 'HITCH', 'comeback': 'HITCH', 'stick': 'HITCH', 'hook': 'HITCH', 'quick_out': 'OUT', 'out': 'OUT',
         'deep_out': 'OUT', 'arrow': 'FLAT', 'flat': 'FLAT', 'back_flat': 'FLAT', 'swing': 'FLAT', 'checkdown': 'FLAT', 'checkdown*': 'FLAT',
         'angle': 'ANGLE', 'dig': 'IN', 'short_in': 'IN', 'slant': 'SLANT', 'go': 'GO', 'fade': 'GO', 'seam': 'GO', 'seam_read': 'GO',
         'post': 'POST', 'corner': 'CORNER', 'shallow': 'CROSS', 'shallow_high': 'CROSS', 'cross': 'CROSS', 'wheel': 'WHEEL'}
MAN = {'cover0', 'cover1', 'cover2man'}
FAMS = ['cover0', 'cover1', 'cover2man', 'cover2', 'cover3', 'cover4', 'cover6']
def klass(lab, air):
    if lab is None: return None
    if lab in ('FLAT', 'ANGLE', 'SCREEN'): return 'flat'
    if lab in ('HITCH', 'OUT', 'IN', 'SLANT', 'CORNER') and air is not None: return 'quick' if air < 10 else 'breaking' if air < 20 else 'deep'
    return 'cross' if lab == 'CROSS' else 'deep'
N = [json.loads(l) for l in open(sys.argv[1])]
P = []
for path in sys.argv[2].split(','):
    for l in open(path):
        r = json.loads(l)
        if r.get('rec') == 'play' and r['callKind'] == 'pass':
            r['fam'] = 'cover2' if r['covFamily'] == 'tampa2' else r['covFamily']
            t = r['target']; r['k'] = klass(LABEL.get(t['route']) if t else None, r['air'])
            P.append(r)
def yac(v): return f"{median(v):.1f} / {mean([x for x in v if x < 30]):.2f} / {mean(v):.2f}+/-{pstdev(v) / math.sqrt(len(v)):.2f}" if len(v) > 1 else '-'
def sim_row(A):
    at = [r for r in A if r['att']]; c = [r for r in at if r['cmp']]; y = [r['yac'] for r in c if r['yac'] is not None]
    return f"n{len(A):5} yd/db {mean(r['yards'] for r in A):5.2f}+/-{pstdev([r['yards'] for r in A]) / math.sqrt(len(A)):.2f} cmp {100 * len(c) / max(1, len(at)):3.0f}% YAC {yac(y)}"
print(f'sim: {len(P)} called passes; NFL: {len(N)} dropbacks')
print('-- by coverage family (sim | NFL)')
for f in FAMS:
    A = [r for r in P if r['fam'] == f]; B = [r for r in N if r['covFamily'] == f and r['yards'] is not None]
    yb = [r['yac'] for r in B if r['res'] == 'C' and r['yac'] is not None]
    if A: print(f"  {f:9} {sim_row(A)} | n{len(B):5} yd/db {mean(r['yards'] for r in B):5.2f} YAC {yac(yb)}")
print('-- man vs zone within situation (sim)')
for name, sel in (('1st & 10', lambda r: r['down'] == 1), ('2nd/3rd & 7+', lambda r: r['down'] >= 2 and r['dist'] >= 7)):
    for m in (True, False):
        print(f"  {name:13} {'man ' if m else 'zone'} {sim_row([r for r in P if sel(r) and (r['fam'] in MAN) == m])}")
print('-- YAC mean by targeted class, man | zone (sim)')
for k in ('quick', 'flat', 'cross', 'breaking', 'deep'):
    a = [r['yac'] for r in P if r['k'] == k and r['fam'] in MAN and r['cmp'] and r['yac'] is not None]
    b = [r['yac'] for r in P if r['k'] == k and r['fam'] not in MAN and r['cmp'] and r['yac'] is not None]
    print(f"  {k:9} man n{len(a):4} {mean(a):5.2f} | zone n{len(b):4} {mean(b):5.2f}")
