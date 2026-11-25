import sys, json, glob, statistics as st
R = []
for f in sorted(glob.glob(sys.argv[1] + '/w*.json')): R += json.load(open(f))
TS = ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5']
def cls(d): return 'shallow(<8)' if d < 8 else 'mid(8-18)' if d < 18 else 'deep(18+)'
def show(label, rows):
    if len(rows) < 8: return
    print(f'{label:34s} n {len(rows):4d} | ' + ' '.join(f'{st.median(r["sp"][t] for r in rows):5.2f}' for t in TS) + f' | depth at 3 s {st.median(r["depth3"] for r in rows):.1f} yd')
print('speed (yd/s, median) by time since the snap, ball still held:   ' + ' '.join(f'{t:>5s}' for t in TS))
for rt in ('GO', 'CROSS', 'IN'):
    A = [r for r in R if r['route'] == rt and 'depth3' in r]
    show(f'{rt} all', A)
    for c in ('shallow(<8)', 'mid(8-18)', 'deep(18+)'):
        for cv in ('Zone', 'Man'):
            show(f'{rt} {c} {cv}', [r for r in A if cls(r['depth3']) == c and r['cov'] == cv])
