"""Sim counter log cases (kicker outside his end by > .25 yd within 1.5 yd before the carrier crosses): per play a
timeline 1.4..3.0 s of carrier / kicker / end / wrap / PST / PSG as (lateral from snap PST, + outside; x from LOS),
engagement partner, and the carrier's crossing lateral rel the end. usage: logfilm.py N traces..."""
import json, math, sys
N = int(sys.argv[1]); shown = 0
for path in sys.argv[2:]:
    for pi, p in enumerate(json.load(open(path))):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]; fr = p["frames"]; n = len(fr)
        car = next((f["c"] for f in fr if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or n < 30: continue
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in fr]
        lead = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "lead"]
        kick = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "kick"]
        if len(lead) != 1 or len(kick) != 1 or ag[kick[0]]["tgt"] not in slot: continue
        i, k = lead[0], kick[0]; e = slot.index(ag[k]["tgt"])
        ps = 1 if (xy[15][k][1] - xy[0][k][1]) > 0 else -1
        ol = [q for q, a in enumerate(ag) if a["slot"] in ("LT", "LG", "C", "RG", "RT") and a["plan"] != "pull"]
        olr = sorted(ol, key=lambda q: -xy[0][q][1] * ps); pst, psg = olr[0], olr[1]
        crs = next((f for f in range(n) if xy[f][car][0] >= 0), n - 1)
        f0 = next((f for f in range(crs) if math.dist(xy[f][k], xy[f][e]) < 1.5 and (xy[f][k][1] - xy[f][e][1]) * ps > .25), None)
        if f0 is None or (xy[crs][car][1] - xy[crs][e][1]) * ps > 0: continue
        y0 = xy[0][pst][1]
        P = lambda f, q: f"{(xy[f][q][1]-y0)*ps:+5.1f},{xy[f][q][0]:+5.1f}" + (f"~{slot[fr[f]['a'][q][5]]}" if fr[f]['a'][q][5] >= 0 else "")
        print(f"== {path.split('trace-')[-1]}#{pi} {s['formation']} vs {s['front']} kick {slot[k]}->{slot[e]} wrap {slot[i]}->{ag[i]['tgt']} PST {slot[pst]}->{ag[pst]['tgt']} PSG {slot[psg]}->{ag[psg]['tgt']} log ev {[ev['t'] for ev in p['events'] if ev['type']=='block_log']} cross {crs/10}")
        others = [q for q, a in enumerate(ag) if a["team"] == "D" and q != e and abs((xy[0][q][1] - y0) * ps) < 5 and xy[0][q][0] < 6]
        print("    t  carrier        kicker         end            wrap           PST            PSG     | " + " ".join(slot[q] for q in others))
        for f in range(14, min(n, crs + 4), 2):
            print(f"  {f/10:.1f} " + "  ".join(f"{P(f, q):14}" for q in (car, k, e, i, pst, psg)) + " | " + " ".join(P(f, q) for q in others))
        shown += 1
        if shown >= N: sys.exit()
