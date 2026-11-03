"""Zone doubles by the DL's flow, NFL vs sim, same operator (dblflow selection). Per double: dominant class over its
frames (TO COVERED / SQUARE / TO HELPER by DL lateral velocity signed toward the uncovered member, 0.6 yd/s), its end
(first frame either member >= 1.3 yd from the DL, by 2.5 s), who left (covered/uncovered, the one >= 1.3; both = 'both'),
the leaver's distance to the nearest LB 0.5 s after leaving, and whether he touched an LB (1.5 yd) within 1.0 s of leaving.
Also the start time. usage: dblleave.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players = p["xy"], p["players"]; n = len(xy)
    if n < 27: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    lb = [i for i, g in enumerate(grp) if g == "LB"]
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]; run = 0; start = None
                for k in range(min(10, n)):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                cov, unc = (a, b) if d(0, a, t) < d(0, b, t) else (b, a)
                cls = Counter(); end = None; spd = []
                for k in range(max(2, start), 26):
                    if d(k, a, t) >= 1.3 or d(k, b, t) >= 1.3: end = k; break
                    side = 1 if xy[k][unc][1] >= xy[k][cov][1] else -1
                    v = (xy[k][t][1] - xy[k - 2][t][1]) / 0.2 * side
                    cls["SQUARE" if abs(v) < 0.6 else ("TO HELPER" if v > 0 else "TO COVERED")] += 1
                    hv = (xy[k][unc][1] - xy[k - 2][unc][1]) / 0.2 * side; cv = (xy[k][cov][1] - xy[k - 2][cov][1]) / 0.2 * side
                    spd.append((v, hv, cv, d(k, unc, t), d(k, cov, t)))
                if not cls: continue
                dom = cls.most_common(1)[0][0]
                row = {"start": start / 10, "end": end / 10 if end else None}
                if spd:
                    row["dlv"] = sum(x[0] for x in spd) / len(spd); row["hv"] = sum(x[1] for x in spd) / len(spd); row["cv"] = sum(x[2] for x in spd) / len(spd)
                    row["hd"] = spd[-1][3]; row["cd"] = spd[-1][4]
                if end:
                    lc, lu = d(end, cov, t) >= 1.3, d(end, unc, t) >= 1.3
                    who = "both" if lc and lu else ("covered" if lc else "uncovered"); row["who"] = who
                    m = unc if who == "uncovered" else cov
                    k5 = min(n - 1, end + 5)
                    if lb: row["lb05"] = min(math.dist(xy[k5][m], xy[k5][j]) for j in lb)
                    row["touch"] = any(math.dist(xy[k][m], xy[k][j]) < 1.5 for k in range(end, min(n, end + 11)) for j in lb)
                    row["dur"] = (end - start) / 10
                R[(c, p["src"], dom)].append(row); R[(c, p["src"], "ALL")].append(row)
def q(v, p=.5): v = sorted(x for x in v if x is not None); return f"{v[int(p*(len(v)-1))]:.2f}" if v else "  - "
print("concept src class: n | share | ends by 2.5 s | end t p25/med/p75 | double dur med | who leaves (unc/cov/both) | leaver LB dist +0.5 s | touches LB in 1 s")
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        tot = len(R[(c, src, "ALL")]) or 1
        for cl in ("ALL", "TO COVERED", "SQUARE", "TO HELPER"):
            r = R[(c, src, cl)]
            if not r: continue
            e = [x for x in r if x["end"] is not None]; w = Counter(x["who"] for x in e)
            print(f"      lateral speed toward helper side: DL {q([x.get('dlv') for x in r])} helper {q([x.get('hv') for x in r])} covered {q([x.get('cv') for x in r])} | last frame dist to DL: helper {q([x.get('hd') for x in r])} covered {q([x.get('cd') for x in r])}")
            print(f"{c[:2]} {src} {cl:10s} n {len(r):4d} {len(r)/tot:4.0%} | ends {len(e)/len(r):4.0%} | {q([x['end'] for x in e],.25)}/{q([x['end'] for x in e])}/{q([x['end'] for x in e],.75)} | {q([x['dur'] for x in e])} | "
                  f"{w['uncovered']/max(1,len(e)):3.0%}/{w['covered']/max(1,len(e)):3.0%}/{w['both']/max(1,len(e)):3.0%} | {q([x.get('lb05') for x in e])} | {sum(x['touch'] for x in e)/max(1,len(e)):4.0%}")
