"""Zone OL climbers (>= 3 yd upfield of their snap spot at 2.5 s): heading turn rate (10 Hz, 0.2 s central diff, speed > 1.5)
before vs after first second-level contact (a defender >= 1.5 yd past the LOS within 1.0 yd of him), and speed then. NFL vs sim."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["cell"]["concept"] not in ("OUTSIDE ZONE", "INSIDE ZONE"): continue
                pl = p["players"]; OL = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                if len(OL) != 5: continue
                yield p["cell"]["concept"][:2], [[(r[2*i], r[2*i+1]) for i in OL] for r in p["xy"]], [[(r[2*i], r[2*i+1]) for i in D] for r in p["xy"]]
    else:
        for line in open(path):
            if not line.startswith("{"): continue
            r = json.loads(line); off = r["off"]; ys = r["ol"][0]
            idx = [min(range(len(off[0])), key=lambda m: sum(abs(off[f][m][1] - r['ol'][f][k]) for f in range(len(off)))) for k in range(5)]
            yield r["concept"][:2], [[f[m] for m in idx] for f in off], r["def"]
for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for con, ol, df in plays(path):
        n = len(ol)
        if n < 27: continue
        for i in range(5):
            if ol[25][i][0] - ol[0][i][0] < 3: continue
            touch = next((f for f in range(3, 26) if any(dx >= 1.5 and math.hypot(dx - ol[f][i][0], dy - ol[f][i][1]) < 1.0 for dx, dy in df[f])), None)
            R[(con, "touched")].append(touch is not None)
            hd = lambda f: math.atan2(ol[f+1][i][1]-ol[f-1][i][1], ol[f+1][i][0]-ol[f-1][i][0])
            for f in range(5, 22):
                sp = math.hypot(ol[f+1][i][0]-ol[f-1][i][0], ol[f+1][i][1]-ol[f-1][i][1]) / .2
                if sp < 1.5: continue
                ph = "pre" if touch is None or f < touch else "post"
                R[(con, ph)].append(abs(math.atan2(math.sin(hd(f+1)-hd(f)), math.cos(hd(f+1)-hd(f)))) * 57.3 / .1); R[(con, ph+"sp")].append(sp)
    print("==", path.split("/")[-1])
    for con in ("IN", "OU"):
        T = R[(con, "touched")]
        print(f"  {con}Z climbers {len(T)} reach 2nd level {100*sum(T)/max(1,len(T)):.0f}% | before contact turn p50 {st.median(R[(con,'pre')]):.0f} speed {st.median(R[(con,'presp')]):.1f} (n{len(R[(con,'pre')])}) | after turn p50 {st.median(R[(con,'post')]):.0f} speed {st.median(R[(con,'postsp')]):.1f} (n{len(R[(con,'post')])})")
