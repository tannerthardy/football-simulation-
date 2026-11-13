"""Summarise peek-tell.mts rows: per time, open-later yes/no, medians and IQRs of the capping defender's depth over the
vertical, lateral offset (+ toward the middle), lateral velocity (+ away), facing shares; AUC of each quantity for
"open later"; by coverage.  python3 -I scripts/diag/eyes/peek_tell_table.py out/eyes/peek-tell.jsonl"""
import json, sys, collections
R = [json.loads(l) for l in open(sys.argv[1])]
def q(v):
    v = sorted(v); return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[3*len(v)//4]:.1f}" if len(v) >= 4 else '-'
def auc(pos, neg):
    if not pos or not neg: return None
    s = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg); return s / (len(pos) * len(neg))
for T in ('2', '2.2', '2.4'):
    X = [(r, r['t'].get(T)) for r in R if r['t'].get(T)]
    none = [r for r, x in X if x.get('none')]
    Y = [(r, x) for r, x in X if not x.get('none')]
    print(f"\n## t = {T} s  (n {len(X)}; no defender over him {len(none)}, of them open {sum(r['open'] for r in none)})")
    for k in ('over', 'lat', 'vlat', 'defDepth'):
        o = [x[k] for r, x in Y if r['open']]; c = [x[k] for r, x in Y if not r['open']]
        a = auc(o, c)
        print(f"  {k:8} open {q(o)} n{len(o)} | not {q(c)} n{len(c)} | AUC {a:.2f}" if a is not None else f"  {k:8} -")
    for lab, sel in (('open', True), ('not', False)):
        F = collections.Counter(x['facing'] for r, x in Y if r['open'] == sel); n = sum(F.values())
        print(f"  facing {lab}: " + ', '.join(f"{f} {100 * F[f] / max(1, n):.0f}%" for f in ('qb', 'turned', 'away')))
print('\nopen-later share by coverage:', {c: f"{100*sum(r['open'] for r in R if r['coverage']==c)/max(1,sum(1 for r in R if r['coverage']==c)):.0f}%" for c in sorted({r['coverage'] for r in R})})
