"""Zone runs: box LBs (depth 1.6-7 at snap, within 6 yd of the OL centre). First offensive non-carrier within 1.0 yd of him
(before the carrier's first contact or 3 s): toucher class = OL uncovered (no front DL within 1.6 yd of him at snap),
OL covered, other (TE/FB/WR). Share touched by class, touch time and LB depth at touch; for OL also the toucher's
depth/lateral motion 0.5 s before. NFL vs sim, NFL shifted 0.1 s on times."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in ("OUTSIDE ZONE", "INSIDE ZONE"): continue
                c = p["carrier"]; pl = p["players"]; X = p["xy"]
                OL = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
                if len(OL) != 5: continue
                OT = [i for i, q in enumerate(pl) if q["side"] == "O" and i != c and i not in OL]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                fc = p["events"].get("first_contact")
                yield p["cell"]["concept"][:2], [[(r[2*i], r[2*i+1]) for i in OL] for r in X], [[(r[2*i], r[2*i+1]) for i in OT] for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], (int(round(fc*10)) if fc else len(X)), 1
    else:
        for line in open(path):
            r = json.loads(line); off = r["off"]
            idx = [min(range(len(off[0])), key=lambda m: sum(abs(off[f][m][1] - r['ol'][f][k]) for f in range(len(off)))) for k in range(5)]
            oth = [m for m in range(len(off[0])) if m not in idx]
            fc = r.get("contact")
            yield r["concept"][:2], [[f[m] for m in idx] for f in off], [[f[m] for m in oth] for f in off], r["def"], (int(round(fc*10)) if fc else len(off)), 0
for path in sys.argv[1:]:
    R = collections.defaultdict(list); N = collections.Counter()
    for con, ol, ot, df, fc, sh in plays(path):
        cy = sum(o[1] for o in ol[0]) / 5
        dl = [d for d in df[0] if abs(d[0]) <= 1.6]
        cover = ['cov' if any(math.dist(o, d) <= 1.8 and d[0] > o[0] for d in dl) else 'unc' for o in ol[0]]
        end = min(fc, 30, len(df))
        for j, d in enumerate(df[0]):
            if not (1.6 < d[0] <= 7 and abs(d[1]-cy) <= 6): continue
            N[con] += 1; hit = None
            for f in range(3, end):
                for k in range(5):
                    if math.dist(ol[f][k], df[f][j]) <= 1.0: hit = ('OL-' + cover[k], f, k); break
                if not hit:
                    for k in range(len(ot[f])):
                        if math.dist(ot[f][k], df[f][j]) <= 1.0: hit = ('other', f, None); break
                if hit: break
            if not hit: R[(con,'none')].append(1); continue
            cls, f, k = hit
            R[(con,cls)].append((f/10 - .1*sh, df[f][j][0]))
    print("==", path.split('/')[-1])
    for con in ("IN", "OU"):
        n = N[con]; print(f" {con} box LBs {n}  untouched {100*len(R[(con,'none')])/n:.0f}%")
        for cls in ('OL-unc', 'OL-cov', 'other'):
            v = R[(con,cls)]
            if v: print(f"   {cls:7} {100*len(v)/n:3.0f}%  touch t p25/50 {sorted(x[0] for x in v)[len(v)//4]:.1f}/{st.median(x[0] for x in v):.1f}  LB depth p50 {st.median(x[1] for x in v):.1f}")
