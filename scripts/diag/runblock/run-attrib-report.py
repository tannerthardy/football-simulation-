"""Summarize run-attrib.py output: first stopper class by outcome and concept.
python3 -I scripts/diag/run-attrib-report.py LABEL=file.json [...]"""
import json, sys
from collections import Counter, defaultdict
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = [r for r in json.load(open(path))]
    n = len(rows); ys = [r['yards'] for r in rows]
    print(f"== {label}: {n} designed runs | median {q(ys,.5):.1f} | <=1 yd {sum(y<=1 for y in ys)/n:.2f} | 10+ {sum(y>=10 for y in ys)/n:.2f} | 20+ {sum(y>=20 for y in ys)/n:.2f}")
    for name, sel in (('all', lambda r: True), ('stuffed (<=1 yd)', lambda r: r['yards'] <= 1), ('10+ yd', lambda r: r['yards'] >= 10)):
        sub = [r for r in rows if sel(r)]
        c = Counter(r['contact']['cls'] if 'contact' in r else 'no contact' for r in sub)
        print(f"  {name:17} n={len(sub):3} " + ' | '.join(f"{k} {v/len(sub):.2f}" for k, v in c.most_common()))
    st = [r for r in rows if r['yards'] <= 1 and 'contact' in r]
    print('  stuffed: stopper group ' + ', '.join(f"{k} {v}" for k, v in Counter(r['contact']['group'] for r in st).most_common()))
    print('  stuffed: owner kind of stopper ' + ', '.join(f"{k} {v}" for k, v in Counter((r['contact']['owner'] or {}).get('kind', 'none') + ('/' + r['contact']['owner']['role'] if (r['contact']['owner'] or {}).get('role') else '') for r in st).most_common()))
    print('  stuffed: contact depth p25/p50/p75 ' + '/'.join(f"{q([r['contact']['depth'] for r in st], f):.1f}" for f in (.25, .5, .75)))
    by = defaultdict(list)
    for r in rows: by[r['scheme']].append(r)
    print('  by scheme: n, median, stuff rate, top stopper classes on stuffs')
    for s, rs in sorted(by.items(), key=lambda kv: -len(kv[1])):
        yy = [r['yards'] for r in rs]; stf = [r for r in rs if r['yards'] <= 1 and 'contact' in r]
        cc = Counter(r['contact']['cls'] for r in stf).most_common(3)
        print(f"    {s:12} n={len(rs):3} med {q(yy,.5):4.1f} stuff {sum(y<=1 for y in yy)/len(rs):.2f} 10+ {sum(y>=10 for y in yy)/len(rs):.2f} | " + ', '.join(f"{k} {v}" for k, v in cc))
