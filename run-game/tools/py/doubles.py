"""Zone doubles from run traces: for each combo (2 OL with plan 'combo' on the same DL, with a climb backer),
was the backer touched by an offensive blocker before the carrier reached him; did the doubled DL make the
first contact; how deep did the doubled DL get (yd behind the LOS) before the carrier crossed; contact behind LOS.
usage: doubles.py trace.json..."""
import json, sys
from collections import defaultdict
agg = defaultdict(lambda: defaultdict(float))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified") or not s.get("scheme"):
            continue
        fam = "OZ" if s["scheme"] in ("outsideZone", "wideZone") else "IZ" if s["scheme"] in ("insideZone", "splitZone") else None
        if not fam:
            continue
        ag, los = s["agents"], s["los"]
        dfn = {a["i"] for a in ag if a["team"] == "D"}; off = {a["i"] for a in ag if a["team"] == "O"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        slot = {a["slot"]: a["i"] for a in ag}
        pairs = defaultdict(list)
        for a in ag:
            if a["team"] == "O" and a["plan"] == "combo" and a["tgt"]:
                mates = [b["i"] for b in ag if b["team"] == "O" and b is not a and b["tgt"] == a["tgt"] and b["plan"] in ("reach", "drive", "cutoff", "combo", "down")]
                pairs[(a["tgt"], a["climb"])] = [a["i"], *mates]
        ev = p["events"]
        fc = next((e for e in ev if e["type"] in ("carrier_contact", "tackle_wrap")), None)
        first = None
        if fc:
            first = fc["b"] if fc["a"] is not None and fc["a"] in off else fc["a"]
        cross = next((f["t"] for f in fr if f["c"] >= 0 and ag[f["c"]]["slot"] != "QB" and (f["a"][f["c"]][0] - los) * dirx > 0), None)
        g = agg[fam]
        g["plays"] += 1
        g["behind"] += 1 if fc and fr and any(abs(f["t"] - fc["t"]) < 0.06 and f["c"] >= 0 and (f["a"][f["c"]][0] - los) * dirx < 0 for f in fr) else 0
        g["yards"] += p["yards"]
        for (dl, lb), mem in pairs.items():
            if len(mem) < 2 or dl not in slot:
                continue
            d = slot[dl]; g["doubles"] += 1
            g["dl_first"] += 1 if first == d else 0
            pen = 0.0
            for f in fr:
                if cross is not None and f["t"] > cross:
                    break
                pen = max(pen, -(f["a"][d][0] - los) * dirx)
            g["dl_pen"] += pen
            g["dl_pen1"] += 1 if pen > 1.0 else 0
            if lb and lb in slot:
                b = slot[lb]; g["withlb"] += 1
                touched = False
                for f in fr:
                    c = f["c"]
                    if c >= 0 and ag[c]["slot"] != "QB" and (f["a"][b][0] - f["a"][c][0]) * dirx <= 0.5:
                        break
                    if f["a"][b][5] in off:
                        touched = True; break
                g["lb_touched"] += touched
                g["lb_first"] += 1 if first == b else 0
for fam, g in sorted(agg.items()):
    n, dbl, wl = g["plays"], max(1, g["doubles"]), max(1, g["withlb"])
    print(f"{fam}: plays {int(n)} yd/play {g['yards']/n:.2f} contact-behind-LOS {g['behind']/n:.2f} | doubles {int(g['doubles'])}: "
          f"DL first contact {g['dl_first']/dbl:.3f}, DL max pen {g['dl_pen']/dbl:.2f} yd, pen>1yd {g['dl_pen1']/dbl:.3f} | "
          f"climb backer touched before carrier {g['lb_touched']/wl:.3f}, backer first contact {g['lb_first']/wl:.3f}")
