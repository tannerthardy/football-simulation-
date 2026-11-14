import sys, json, glob, statistics as st
P = {}
for f in sorted(glob.glob(sys.argv[1] + '/w*.json')):
  for k, v in json.load(open(f)).items(): P.setdefault(k, []).extend(v)
med = lambda R, key: f'{st.median(r[key] for r in R):.1f}'
print('part 4, near defenders on free plays in the catcher frame (NFL, pooled weeks)')
for nm in ('D1', 'D2'):
  for k in (0, 5, 10):
    R = P.get(f'{nm}|{k}', [])
    if not R: continue
    print(f'  {nm} +{k/10:.1f} s: n {len(R)} depth {med(R, "depth")} yd (upfield of him {sum(1 for r in R if r["depth"] > 0)/len(R):.2f}, 2+ yd upfield {sum(1 for r in R if r["depth"] >= 2)/len(R):.2f}) lateral {med(R, "lat")} yd | toward his own goal {med(R, "back")} yd/s (retreating {sum(1 for r in R if r["back"] > 0.5)/len(R):.2f}) speed {med(R, "spd")}')
