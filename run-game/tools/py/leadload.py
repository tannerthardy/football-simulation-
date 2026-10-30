"""Lead/turned-up pullers loading a second-level defender before the runner arrives.
usage: leadload.py trace.json... ; prints counts by concept and shift-0 examples."""
import json, sys
from collections import defaultdict
agg = defaultdict(lambda: [0, 0, 0, 0])  # leads, loaded any, loaded 2nd level before runner reaches him, same and not tackler
ex = []
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; c = (s.get("concept") or "").upper()
        if c not in ("COUNTER", "POWER", "TRAP"):
            continue
        ag, los, fr = s["agents"], s["los"], p["frames"]
        dfn = [a["i"] for a in ag if a["team"] == "D"]
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        turned = {e["a"] for e in p["events"] if e["type"] == "pull_turn_up"}
        leads = [a["i"] for a in ag if a["team"] == "O" and a["plan"] == "pull" and (a["role"] == "lead" or a["i"] in turned)]
        contact = next((e["t"] for e in p["events"] if e["type"] in ("carrier_contact", "tackle_wrap")), None)
        tackler = next((e["b"] if e["a"] == next((f["c"] for f in fr if f["c"] >= 0), -1) else e["a"] for e in p["events"] if e["type"] in ("carrier_contact", "tackle_wrap")), None)
        for i in leads:
            agg[c][0] += 1
            hit = None
            for f in fr:
                d = f["a"][i][5]
                if d >= 0 and d in dfn:
                    hit = (f["t"], d, f); break
            if not hit:
                continue
            agg[c][1] += 1
            t, d, f = hit
            depth = (f["a"][d][0] - los) * dirx
            car = f["c"]
            # runner has not reached the man: carrier exists and is still behind him in x
            before = car >= 0 and (f["a"][d][0] - f["a"][car][0]) * dirx > 0.5 and (contact is None or t < contact)
            if depth >= 1 and before:
                agg[c][2] += 1
                if d != tackler:
                    agg[c][3] += 1
                    if p["id"].endswith(".s0"):
                        ex.append((p["id"], c, ag[i]["slot"], ag[d]["slot"], round(t, 2), round(depth, 1), contact, round(p["yards"], 2)))
print("concept: lead pullers, engaged anyone, loaded a man >=1 yd past LOS before the runner reached him, of which not the first-contact man")
for c, v in sorted(agg.items()):
    print(f"  {c:8s} {v[0]:5d} {v[1]:5d} ({v[1]/max(1,v[0]):.0%}) {v[2]:5d} ({v[2]/max(1,v[0]):.0%}) {v[3]:5d}")
print("shift-0 examples:", len(ex))
for e in ex[:25]:
    print("  ", *e)
