"""Handoff health per arm: run plays (not draw, not qb draw) where the QB ends up the carrier, where an
'exchange passed outside reach' read fires, fumbles before the carrier crosses the LOS, and handoff time."""
import json, sys
from collections import Counter
c = Counter(); ht = []
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or s.get("scheme") in ("draw", "qbDraw", None): continue
        ag = s["agents"]; c["plays"] += 1
        ev = p["events"]
        carriers = {ag[f["c"]]["slot"] for f in fr if f["c"] >= 0}
        if "QB" in carriers and not (carriers - {"QB"}): c["QB keeps (no handoff)"] += 1
        if any(e["type"] == "read" and e.get("note") and "outside reach" in e["note"] for e in ev): c["exchange passed outside reach"] += 1
        if any(e["type"] in ("fumble", "loose_ball") for e in ev): c["fumble (any time)"] += 1
        h = next((e["t"] for e in ev if e["type"] == "handoff"), None)
        if h is not None: ht.append(h)
ht.sort()
print({k: (v if k == "plays" else f"{v} ({v/c['plays']:.1%})") for k, v in c.items()}, "handoff median", ht[len(ht)//2] if ht else None)
