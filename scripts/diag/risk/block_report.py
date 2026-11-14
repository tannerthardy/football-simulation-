import sys, json, glob, statistics as st
E = []; n = 0
for f in sorted(glob.glob(sys.argv[1] + '/b*.json')):
  d = json.load(open(f)); E += d['E']; n += d['plays']
def med(R, k, nd=1):
  v = [r[k] for r in R if r.get(k) is not None]
  return f'{st.median(v):.{nd}f}' if v else '-'
C = [e for e in E if 'c_k' in e]
print(f'nfl: plays {n} episodes {len(E)} | contact with the lane blocker {len(C) / max(1, len(E)):.2f}')
print(f'  approach (blocker 2.0-2.5 yd away): speed {med(E, "a_s")} yd/s closing on him {med(E, "a_close")}')
print(f'  at contact: speed {med(C, "c_s")} | engaged (within 1.2 yd) {med(C, "held")} s, share held 0.5 s+ {sum(1 for e in C if e["held"] >= 0.5) / max(1, len(C)):.2f} | largest gap in 0.5 s {med(C, "gap5")} yd (inside 1.2 yd {sum(1 for e in C if e["gap5"] <= 1.2) / max(1, len(C)):.2f})')
print(f'  reaches the catcher within 1 s of contact: {sum(1 for e in C if e["made"]) / max(1, len(C)):.2f}')
