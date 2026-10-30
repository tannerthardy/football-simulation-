"""Per installed puller role: engaged anyone, first engaged man deeper than the carrier at that frame,
engaged a man >=1 yd past LOS before the carrier reached him (and he was not the first-contact man)."""
import json, sys
from collections import defaultdict
agg = defaultdict(lambda: [0, 0, 0, 0, 0])
ex = []
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; c = (s.get("concept") or "").upper()
        if c not in ("COUNTER", "POWER", "TRAP"):
            continue
        ag, los, fr = s["agents"], s["los"], p["frames"]
        if not fr or p.get("nullified"):
            continue
        dfn = {a["i"] for a in ag if a["team"] == "D"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        ev = p["events"]
        turned = {e["a"] for e in ev if e["type"] == "pull_turn_up"}
        fc = next((e for e in ev if e["type"] in ("carrier_contact", "tackle_wrap")), None)
        tackler = None
        if fc:
            tackler = fc["b"] if fc["a"] is not None and ag[fc["a"]]["team"] == "O" else fc["a"]
        for a in ag:
            if a["team"] != "O" or a["plan"] != "pull":
                continue
            i, role = a["i"], a["role"] or "?"
            key = (c, role + ("+up" if i in turned else ""))
            g = agg[key]; g[0] += 1
            hit = next(((f, f["a"][i][5]) for f in fr if f["a"][i][5] in dfn), None)
            if not hit:
                continue
            g[1] += 1
            f, d = hit
            car = f["c"]
            if car >= 0 and ag[car]["slot"] != "QB" and (f["a"][car][0] - f["a"][d][0]) * dirx > 0.5:
                g[2] += 1
            depth = (f["a"][d][0] - los) * dirx
            before = car >= 0 and (f["a"][d][0] - f["a"][car][0]) * dirx > 0.5 and (fc is None or f["t"] < fc["t"])
            if depth >= 1 and before:
                g[3] += 1
                if d != tackler:
                    g[4] += 1
                    if p["id"].endswith(".s0") and role in ("lead",) or i in turned:
                        ex.append((p["id"], c, a["slot"], key[1], ag[d]["slot"], f["t"], round(depth, 1), fc["t"] if fc else None, round(p["yards"], 2)))
print("concept role: n, engaged, first man deeper than carrier, 2nd-level load before carrier reached him, ...not the first-contact man")
for k, v in sorted(agg.items()):
    print(f"  {k[0]:8s} {k[1]:9s} {v[0]:5d} {v[1]/max(1,v[0]):5.0%} {v[2]:4d} ({v[2]/max(1,v[1]):4.0%} of engaged) {v[3]:4d} {v[4]:4d}")
print("examples (lead or turned-up, shift 0):", len([e for e in ex if e[0].endswith('.s0')]))
for e in [e for e in ex if e[0].endswith('.s0')][:20]:
    print("  ", *e)
