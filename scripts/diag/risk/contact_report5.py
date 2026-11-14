import sys, json, glob, statistics as st
P5 = {}; OT = []
for f in sorted(glob.glob(sys.argv[1] + '/w*.json')):
  d = json.load(open(f))
  for k, v in d['P5'].items(): P5.setdefault(k, []).extend(v)
  OT.extend(d['OT'])
def med(R, k, n=1):
  v = [r[k] for r in R if r.get(k) is not None]
  return f'{st.median(v):.{n}f}' if v else '-'
print('part 5, where defenders are when the ball arrives (free plays), NFL pooled weeks')
for nm in ('D1', 'D2'):
  print('  ' + nm + ': ' + ' | '.join(f'{tag} depth {med(P5.get(nm + "|" + tag, []), "depth")} toward own goal {med(P5.get(nm + "|" + tag, []), "back")} (n {len(P5.get(nm + "|" + tag, []))})' for tag in ('rel', 'mid', 'catch')))
R = P5.get('deep|x', [])
if R:
  B = [r['brk'] for r in R if r['brk'] is not None]
  print(f'  deep pair: n {len(R)} depth at the catch {med(R, "depth")} yd (distance {med(R, "dist")}) | toward own goal rel {med(R, "b_rel")} mid {med(R, "b_mid")} catch {med(R, "b_catch")} +0.5 {med(R, "b_p5")} | '
        f'breaks downhill: before the catch {sum(1 for b in B if b < 0) / len(R):.2f}, within 0.5 s after {sum(1 for b in B if 0 <= b <= 0.5) / len(R):.2f}, later or never {1 - sum(1 for b in B if b <= 0.5) / len(R):.2f}; median break {f"{st.median(B):.1f}" if B else "-"} s from the catch')
if OT:
  print(f'  never caught (other): n {len(OT)} defenders upfield of the catcher at the catch {med(OT, "upfield", 0)} | closest any defender got after the catch {med(OT, "closest")} yd (within 1 yd {sum(1 for o in OT if o["closest"] < 1) / len(OT):.2f}) | YAC {med(OT, "yac")}')
