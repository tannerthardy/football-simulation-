"""Zone runs, NFL vs sim: first contact = first frame after the handoff a defender centre is within 1.0 yd of the carrier.
The hitter: 'blocked at contact' (an offensive non-carrier within 1.2 yd then), 'shed' (within 1.2 yd of one for >=3 frames in the
prior 1.0 s, not at contact), or 'free'. Group by depth at snap (line <=1.6, box LB 1.6-7, else DB). Yards by class."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in ("OUTSIDE ZONE", "INSIDE ZONE"): continue
                c = p["carrier"]; pl = p["players"]; X = p["xy"]
                O = [i for i, q in enumerate(pl) if q["side"] == "O" and i != c]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                yield p["cell"]["concept"][:2], p["yards"], [(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in O] for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], p["events"].get("handoff") or 0
    else:
        for line in open(path):
            r = json.loads(line); yield r["concept"][:2], r["yards"], [tuple(x) for x in r["car"]], r["off"], r["def"], r["handoff"]
for path in sys.argv[1:]:
    C = collections.defaultdict(collections.Counter); Y = collections.defaultdict(list)
    for con, yds, car, off, df, ho in plays(path):
        h = max(1, int(round(ho * 10)))
        for f in range(h, len(car)):
            j = min(range(len(df[f])), key=lambda j: math.dist(df[f][j], car[f]))
            if math.dist(df[f][j], car[f]) > 1.0: continue
            near = lambda g: min(math.dist(o, df[g][j]) for o in off[g]) <= 1.2
            cls = 'blocked' if near(f) else ('shed' if sum(near(g) for g in range(max(0, f-10), f)) >= 3 else 'free')
            x0 = df[0][j][0]; grp = 'DL' if x0 <= 1.6 else 'LB' if x0 <= 7 else 'DB'
            C[con][f'{grp} {cls}'] += 1; C[con]['n'] += 1; Y[(con, cls)].append(min(yds, 20)); break
    print("==", path.split('/')[-1])
    for con in ("OU", "IN"):
        n = C[con]['n']; print(f"  {con} n{n} " + "  ".join(f"{k} {100*v/n:.0f}%" for k, v in sorted(C[con].items(), key=lambda kv: -kv[1]) if k != 'n'))
        print("     yards<20 by hitter class: " + "  ".join(f"{c} {st.mean(Y[(con,c)]):.2f} ({100*len(Y[(con,c)])/n:.0f}%)" for c in ('free','shed','blocked') if Y[(con,c)]))
