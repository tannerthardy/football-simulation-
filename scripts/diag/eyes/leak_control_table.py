"""QB lane 2026-11-24: leak-control.ts rows -> thrown vs not-thrown coverers' closing on the spot, matched on route
family and phase (0.2 s bins of decision minus break), split by whether the coverer can see the passer.
Matched difference = mean over (fam, phase bin) cells with both groups of (thrown - not thrown), weighted by thrown n.
usage: python3 -I leak_control_table.py name=rows.jsonl[,more] ..."""
import sys, json, math
from collections import defaultdict


def mean(v): return sum(v) / len(v) if v else float('nan')


for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = []
    for p in paths.split(','):
        for line in open(p):
            line = line.strip()
            if line.startswith('{'): R += json.loads(line)['rows']
    C = [dict(r, dWind=r['closeWind'] - r['closeBase'], dPost=(r['closePost'] - r['closeBase']) if r.get('closePost') is not None else None) for r in R if r.get('c') and r.get('closeWind') is not None and r.get('closeBase') is not None and r.get('phase') is not None and r['fam'] != 'vertical']
    print(f"== {name}: receivers {len(R)}, with a coverer and a break {len(C)} (thrown {sum(r['thrown'] for r in C)})")
    for lab, F in (('all', lambda r: True), ('coverer sees the passer', lambda r: r['sees']), ('coverer cannot see him', lambda r: not r['sees']),
                   ('man on him', lambda r: r.get('man')), ('passer looking within 20 deg (not thrown) vs thrown', None)):
        X = [r for r in C if (F(r) if F else (r['thrown'] or r['qbLook'] <= 20))]
        cell = defaultdict(lambda: ([], []))
        for r in X:
            b = (r['fam'], math.floor(r['phase'] / 0.2))
            cell[b][0 if r['thrown'] else 1].append(r)
        diffs, wts, dpost, drecv, dd, ddp = [], [], [], [], [], []
        for b, (T, N) in cell.items():
            if T and N:
                diffs.append(mean([r['closeWind'] for r in T]) - mean([r['closeWind'] for r in N])); wts.append(len(T))
                pt = [r['closePost'] for r in T if r['closePost'] is not None]; pn = [r['closePost'] for r in N if r['closePost'] is not None]
                if pt and pn: dpost.append((mean(pt) - mean(pn), len(T)))
                dd.append(mean([r['dWind'] for r in T]) - mean([r['dWind'] for r in N]))
                qt = [r['dPost'] for r in T if r['dPost'] is not None]; qn = [r['dPost'] for r in N if r['dPost'] is not None]
                if qt and qn: ddp.append((mean(qt) - mean(qn), len(T)))
                drecv.append(mean([r['closeRecvWind'] for r in T]) - mean([r['closeRecvWind'] for r in N]))
        w = sum(wts) or 1
        T = [r for r in X if r['thrown']]; N = [r for r in X if not r['thrown']]
        print(f"  {lab:52s} thrown n {len(T):4d} close(windup) {mean([r['closeWind'] for r in T]):+.2f} | not thrown n {len(N):5d} {mean([r['closeWind'] for r in N]):+.2f}"
              f" | matched diff windup {sum(d * k for d, k in zip(diffs, wts)) / w:+.2f} yd/s (cells {len(diffs)}, thrown in cells {sum(wts)})"
              f" | CHANGE from baseline: windup {sum(d * k for d, k in zip(dd, wts)) / w:+.2f}, post {sum(d * k for d, k in ddp) / (sum(k for _, k in ddp) or 1):+.2f}"
              f" | base {mean([r['closeBase'] for r in T]):+.2f}/{mean([r['closeBase'] for r in N]):+.2f} | post-release {sum(d * k for d, k in dpost) / (sum(k for _, k in dpost) or 1):+.2f} | on the receiver (windup) {mean(drecv):+.2f}")
