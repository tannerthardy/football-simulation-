"""Sim counter snap assignments: wrap (lead puller) target vs combo climb targets (climb field of any plan) and other
blockers' targets; box backers (LB, < 6 yd deep, within 6 of the ball) and whether each has an owner; for each
counter play the play-side-most box backer's owner. usage: ctrasg.py traces..."""
import json, sys, collections
C = collections.Counter()
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]; fr = p["frames"]
        if not fr: continue
        xy = [(q[0] - s["los"], q[1]) for q in fr[0]["a"]]
        lead = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "lead"]
        kick = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "kick"]
        if len(lead) != 1 or len(kick) != 1: continue
        C["plays"] += 1
        w = ag[lead[0]]["tgt"]
        ps = 1 if xy[kick[0]][1] < xy[lead[0]][1] else -1  # kicker (BSG) is nearer the play side than the BST
        ps = -ps if False else ps
        # play side: direction from BST to BSG
        ps = 1 if xy[kick[0]][1] - xy[lead[0]][1] > 0 else -1
        climbs = [a["climb"] for a in ag if a["team"] == "O" and a["climb"]]
        tg = [a["tgt"] for i, a in enumerate(ag) if a["team"] == "O" and i != lead[0] and a["tgt"]]
        C["wrap tgt also a climb target"] += w in climbs
        C["wrap tgt also another's target"] += w in tg
        C["wrap tgt None"] += w is None
        by = s["ballY"]
        box = [i for i, a in enumerate(ag) if a["team"] == "D" and a["pos"] in ("LB", "MLB", "OLB", "ILB") and 1.5 < xy[i][0] < 6 and abs(xy[i][1] - by) < 6]
        if not box: continue
        own = lambda d: [a["slot"] + ("(wrap)" if j == lead[0] else "(climb)" if a["climb"] == slot[d] else "") for j, a in enumerate(ag) if a["team"] == "O" and (a["tgt"] == slot[d] or a["climb"] == slot[d])]
        psb = max(box, key=lambda i: (xy[i][1] - by) * ps)
        o = own(psb)
        C[f"play-side backer owners: {'+'.join(sorted(x.split('(')[1] if '(' in x else 'other' for x in o)) or 'NONE'}"] += 1
        unowned = [i for i in box if not own(i)]
        C[f"box backers unowned: {len(unowned)} of {len(box)}"] += 1
for k, v in sorted(C.items()): print(f"{v:5} {k}")
