"""Line-level finish, NFL side of scripts/diag/_finish.mts: first frame a defender centre is within 1.0 yd of the
carrier within 2 yd of the LOS; carrier speed then and +0.1..+0.5 s; time to the end of tracking; defenders within 1 yd
at +0.3 s. The same code reads NFL tracking (run_film_reference.py loader) and sim dumps from scripts/diag/_finishdump.mts,
both at 0.1 s frames with x = yards past the LOS: speeds are central differences over +-0.1 s; the toucher is the nearest
defender. usage: python3 -I scripts/mechanics/finish_reference.py run_film_reference.py nfl-plays.jsonl.gz [sim.jsonl]"""
import sys, math, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
def sp(xy, f, c):
    a, b = xy[max(0, f-1)][c], xy[min(len(xy)-1, f+1)][c]; k = min(len(xy)-1, f+1) - max(0, f-1)
    return math.dist(a, b) / (k*0.1) if k else 0
import json
def plays(src):
    if src.endswith(".gz"):
        for p in rfr.nfl(src):
            xy, pl, c = p["xy"], p["players"], p["carrier"]
            if c is None or len(xy) < 15: continue
            yield xy, c, [i for i, x in enumerate(pl) if x["side"] == "D"]
    else:
        for line in open(src):
            r = json.loads(line); car, df = r["car"], r["def"]
            if len(car) < 15: continue
            # one row per frame: defenders first, the carrier last
            yield [d + [cc] for d, cc in zip(df, car)], len(df[0]), list(range(len(df[0])))
for src in sys.argv[2:]:
  R = []; SQ = []; DS = []
  for xy, c, D in plays(src):
      for f in range(len(xy)):
          if abs(xy[f][c][0]) < 2 and any(math.dist(xy[f][j], xy[f][c]) < 1.0 for j in D):
              j0 = min((j for j in D if math.dist(xy[f][j], xy[f][c]) < 1.0), key=lambda j: math.dist(xy[f][j], xy[f][c]))
              a, b = xy[max(0, f-1)][c], xy[min(len(xy)-1, f+1)][c]; vx, vy = b[0]-a[0], b[1]-a[1]; vs = math.hypot(vx, vy)
              dx, dy = xy[f][j0][0]-xy[f][c][0], xy[f][j0][1]-xy[f][c][1]; L0 = math.hypot(dx, dy) or 1
              SQ.append((vx*dx+vy*dy)/(vs*L0) if vs > 0.1 else float('nan')); DS.append(sp(xy, f, j0))
              n3 = sum(1 for j in D if math.dist(xy[min(f+3, len(xy)-1)][j], xy[min(f+3, len(xy)-1)][c]) < 1.0)
              R.append((SQ[-1], [sp(xy, min(f+k, len(xy)-1), c) for k in (0, 1, 2, 3, 5)]) + ((len(xy)-1-f)*0.1, n3, xy[-1][c][0]-xy[f][c][0])); break
  q = lambda v, f=.5: sorted(v)[int(f*(len(v)-1))]
  print(f"{src.split('/')[-1]}: line-level first contacts {len(R)}")
  print("carrier speed p50 at 0/+0.1/+0.2/+0.3/+0.5 s: " + " / ".join(f"{q([r[1][k] for r in R]):.2f}" for k in range(5)))
  print(f"time to end p25/50/75 {q([r[2] for r in R],.25):.2f}/{q([r[2] for r in R]):.2f}/{q([r[2] for r in R],.75):.2f} | defenders within 1 yd at +0.3 p50 {q([r[3] for r in R])} | gain after p50 {q([r[4] for r in R]):.1f}")
  sq = [x for x in SQ if x == x]
  print(f"square-ness p25/50/75 {q(sq,.25):.2f}/{q(sq):.2f}/{q(sq,.75):.2f} | cos>0.8 {100*sum(x>0.8 for x in sq)/len(sq):.0f}% | toucher speed p50 {q(DS):.2f}")
  for lab, lo, hi in (("glancing cos<0.3", -2, .3), ("angled 0.3-0.8", .3, .8), ("square cos>0.8", .8, 2)):
      z = [r for r in R if r[0] == r[0] and lo <= r[0] < hi]
      print(f"  {lab:16} n {len(z):4} | speed 0 {q([r[1][0] for r in z]):.2f} -> +0.1 {q([r[1][1] for r in z]):.2f} -> +0.3 {q([r[1][3] for r in z]):.2f} | loss by +0.3 {q([r[1][0]-r[1][3] for r in z]):.2f} | end {q([r[2] for r in z]):.2f} s")
