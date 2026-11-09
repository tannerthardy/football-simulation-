"""Run plays: first contact deeper than 1 yd behind the LOS. Hitter class (blocked at contact / shed within 1 s / free) and group
(by snap depth), share and share ending <=0; carrier speed at contact (0.2 s central diff). NFL vs sim, same operator."""
import sys, json, gzip, math, statistics as st, collections
CON = set(sys.argv[1].split(','))
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in CON: continue
                c = p["carrier"]; pl = p["players"]; X = p["xy"]
                O = [i for i, q in enumerate(pl) if q["side"] == "O" and i != c]; OLy = [[r[2*i+1] for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"] for r in X]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                yield p["yards"], [(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in O] for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], p["events"].get("handoff") or 0, OLy
    else:
        for line in open(path):
            r = json.loads(line)
            if r["concept"] in CON: yield r["yards"], [tuple(x) for x in r["car"]], r["off"], r["def"], r["handoff"], r["ol"]
for path in sys.argv[2:]:
    R = collections.defaultdict(list); n = 0
    for yds, C, off, df, ho, OLy in plays(path):
        if len(OLy[0]) != 5 or len(OLy) < 11: continue
        ys = sorted(OLy[0]); cy = sum(ys)/5; fl = sum(OLy[10])/5 - cy
        h = max(1, int(round(ho * 10)))
        for f in range(h, len(C) - 1):
            j = min(range(len(df[f])), key=lambda j: math.dist(df[f][j], C[f]))
            if math.dist(df[f][j], C[f]) > 1.0: continue
            if C[f][0] >= -1: break
            near = lambda g: min(math.dist(o, df[g][j]) for o in off[g]) <= 1.2
            cls = 'blocked' if near(f) else ('shed' if sum(near(g) for g in range(max(0, f-10), f)) >= 3 else 'free')
            x0 = df[0][j][0]; y0 = df[0][j][1]; grp = 'DL' if x0 <= 1.6 else 'LB' if x0 <= 7 else 'DB'
            if grp == 'DL' and (y0 < ys[0]-.5 or y0 > ys[-1]+.5): grp = 'edgeBS' if (y0-cy)*fl < 0 else 'edgePS'
            R[cls+'/'+grp].append((yds <= 0, sp)) if False else None
            sp = math.dist(C[f+1], C[f-1]) * 5
            sp = math.dist(C[f+1], C[f-1]) * 5
            R[cls].append((yds <= 0, sp)); R[cls+'/'+grp].append((yds <= 0, sp)); R[grp].append((yds <= 0, sp)); R['all'].append((yds <= 0, sp)); n += 1; break
    print("==", path.split('/')[-1], 'deep contacts', n)
    for k in sorted(R):
        v = R[k]
        if v: print(f"   {k:7} {100*len(v)/n:3.0f}%  end<=0 {100*sum(a for a, _ in v)/len(v):3.0f}%  carrier speed at contact p50 {st.median(s for _, s in v):.2f}")
