"""CALL_MIX card: arms of collect.ts (unpaired games) side by side, with the NFL. Report only.

  python3 -I scripts/diag/call-mix/card.py out/call-mix/nfl.jsonl off=a.jsonl[,b.jsonl] on=c.jsonl[,d.jsonl] ...

Rows lean on the stable measures (Integration, 2026-11-11): target shares by class and label, completion and
yards an attempt by class, time to throw, sack rate. YAC is median / trimmed mean (catches with 30+ yd YAC
dropped) / mean +/- SE. Arms re-roll their plays, so they are compared as unpaired samples."""
import json, sys, math, collections
from statistics import mean, median, pstdev
LABEL = {'hitch': 'HITCH', 'curl': 'HITCH', 'comeback': 'HITCH', 'stick': 'HITCH', 'hook': 'HITCH', 'quick_out': 'OUT', 'out': 'OUT',
         'deep_out': 'OUT', 'arrow': 'FLAT', 'flat': 'FLAT', 'back_flat': 'FLAT', 'swing': 'FLAT', 'checkdown': 'FLAT', 'checkdown*': 'FLAT',
         'angle': 'ANGLE', 'back_out': 'OUT', 'dig': 'IN', 'short_in': 'IN', 'slant': 'SLANT', 'go': 'GO', 'fade': 'GO', 'seam': 'GO', 'seam_read': 'GO',
         'post': 'POST', 'corner': 'CORNER', 'shallow': 'CROSS', 'shallow_high': 'CROSS', 'cross': 'CROSS', 'wheel': 'WHEEL'}
KS = ['quick <10', 'flat/screen/angle', 'cross', 'breaking 10-19', 'vertical/deep']
def klass(label, air):
    if label is None: return None
    if label in ('FLAT', 'ANGLE', 'SCREEN'): return 'flat/screen/angle'
    if label in ('HITCH', 'OUT', 'IN', 'SLANT', 'CORNER') and air is not None:
        if air < 10: return 'quick <10'
        if air < 20: return 'breaking 10-19'
    if label == 'CROSS': return 'cross'
    return 'vertical/deep'
def sim_rows(paths):
    out = []
    for p in paths.split(','):
        for l in open(p):
            r = json.loads(l)
            if r.get('rec') != 'play' or r['callKind'] != 'pass': continue
            t = r['target']; r['label'] = LABEL.get(t['route']) if t else None
            r['k'] = klass(r['label'], r['air'])
            r['res'] = 'S' if r['sack'] else 'IN' if r['int'] else 'C' if r['cmp'] else 'I' if r['att'] else 'R'
            out.append(r)
    return out
N = [json.loads(l) for l in open(sys.argv[1])]
for r in N: r['k'] = klass(r['route'], r['air']); r['label'] = r['route']
arms = [(a.split('=')[0], sim_rows(a.split('=')[1])) for a in sys.argv[2:]] + [('NFL', N)]
def att(R): return [r for r in R if r['res'] in ('C', 'I', 'IN')]
def yac(R):
    v = [r['yac'] for r in R if r['res'] == 'C' and r['yac'] is not None]
    if len(v) < 2: return '-'
    t = [x for x in v if x < 30]
    return f"{median(v):.1f} / {mean(t):.2f} / {mean(v):.2f}+/-{pstdev(v) / math.sqrt(len(v)):.2f}"
W = 28
def row(name, f): print(f"  {name:28}" + ''.join(f"{f(R):>{W}}" for _, R in arms))
print('  ' + ' ' * 28 + ''.join(f"{a:>{W}}" for a, _ in arms))
row('dropbacks', lambda R: str(len(R)))
row('yards a dropback', lambda R: f"{mean(r['yards'] for r in R if r['yards'] is not None):.2f}")
row('yards an attempt', lambda R: f"{mean(r['yards'] for r in att(R)):.2f}")
row('completion', lambda R: f"{100 * sum(r['res'] == 'C' for r in att(R)) / len(att(R)):.1f}%")
row('sack rate', lambda R: f"{100 * sum(r['res'] == 'S' for r in R) / len(R):.1f}%")
row('INT / attempt', lambda R: f"{100 * sum(r['res'] == 'IN' for r in att(R)) / len(att(R)):.1f}%")
row('time to throw p50', lambda R: (lambda v: f"{median(v):.2f}" if v else '-')([r['ttt'] for r in att(R) if r.get('ttt')]))
row('YAC med / trim30 / mean+/-SE', yac)
print('  -- target share by class (attempts)')
for k in KS: row(k, lambda R, k=k: f"{100 * sum(r['k'] == k for r in att(R)) / max(1, sum(1 for r in att(R) if r['k'])):.1f}%")
print('  -- yards an attempt / completion by class')
for k in KS: row(k, lambda R, k=k: (lambda A: f"{mean(r['yards'] for r in A):.1f} / {100 * sum(r['res'] == 'C' for r in A) / len(A):.0f}% n{len(A)}" if A else '-')([r for r in att(R) if r['k'] == k]))
print('  -- target share by label (attempts)')
labs = ['HITCH', 'OUT', 'FLAT', 'IN', 'GO', 'CROSS', 'SLANT', 'POST', 'CORNER', 'SCREEN', 'ANGLE']
for lab in labs: row(lab, lambda R, lab=lab: f"{100 * sum(r['label'] == lab for r in att(R)) / max(1, sum(1 for r in att(R) if r['label'])):.1f}%")
print('  -- called concept share (sim)')
cons = sorted({r['concept'] for _, R in arms[:-1] for r in R})
for c in cons: row(c, lambda R, c=c: f"{100 * sum(r.get('concept') == c for r in R) / len(R):.1f}%" if R and 'concept' in R[0] else '-')
