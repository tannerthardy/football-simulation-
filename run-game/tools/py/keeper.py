"""Keeper quality after a zone double releases (block_climb by a member): is the doubled DL still engaged with
an offensive blocker when the carrier crosses the LOS (or at 2.5 s if he never does); the DL's deepest point
behind the LOS after the release (before the carrier crosses); does that DL make first contact on the carrier.
Also all run plays: OL engaged at carrier-cross (share of the 5 OL)."""
import json, sys
from collections import defaultdict
g = defaultdict(lambda: defaultdict(float))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified") or not s.get("scheme"): continue
        fam = {"outsideZone": "OZ", "wideZone": "OZ", "insideZone": "IZ", "splitZone": "IZ"}.get(s["scheme"], "GAP" if s["scheme"] in ("power", "counter", "trap", "duo") else None)
        if not fam: continue
        ag, los = s["agents"], s["los"]; slot = {a["slot"]: a["i"] for a in ag}
        dfn = [a["i"] for a in ag if a["team"] == "D"]; off = {a["i"] for a in ag if a["team"] == "O"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        cross = next((k for k, f in enumerate(fr) if f["c"] >= 0 and ag[f["c"]]["slot"] != "QB" and (f["a"][f["c"]][0] - los) * dirx > 0), None)
        kc = cross if cross is not None else min(len(fr) - 1, 25)
        ev = p["events"]
        fc = next((e for e in ev if e["type"] in ("carrier_contact", "tackle_wrap")), None)
        first = (fc["b"] if fc["a"] in off else fc["a"]) if fc else None
        ol = [slot[o] for o in ("LT", "LG", "C", "RG", "RT") if o in slot]
        G = g[fam]; G["plays"] += 1
        G["ol_engaged_at_cross"] += sum(fr[kc]["a"][o][5] >= 0 for o in ol) / len(ol)
        for e in ev:
            if e["type"] != "block_climb" or e["a"] is None: continue
            climber = e["a"]; plan = ag[climber]
            dl = slot.get(plan["tgt"]) if plan["tgt"] in slot else None
            if dl is None or dl not in dfn: continue
            k0 = min(range(len(fr)), key=lambda k: abs(fr[k]["t"] - e["t"]))
            G["releases"] += 1
            G["kept_at_cross"] += fr[kc]["a"][dl][5] in off
            pen = max((-(fr[k]["a"][dl][0] - los) * dirx for k in range(k0, kc + 1)), default=0)
            G["pen_after"] += pen; G["pen_after_1yd"] += pen > 1
            G["dl_first"] += first == dl
for fam, G in sorted(g.items()):
    r = max(1, G["releases"])
    print(f"{fam}: plays {int(G['plays'])}, OL engaged at carrier-cross {G['ol_engaged_at_cross']/G['plays']:.2f} | releases {int(G['releases'])}: "
          f"released DL still blocked at cross {G['kept_at_cross']/r:.2f}, his max depth after release {G['pen_after']/r:.2f} yd, >1 yd {G['pen_after_1yd']/r:.2f}, he makes first contact {G['dl_first']/r:.3f}")
