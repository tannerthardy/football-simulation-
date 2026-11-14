"""NFL BDB 2025 check-down / hot-to-the-back measurement (plays + player_play only).

Usage: python3 -I nfl_checkdown.py [DATA_DIR] [OUT_DIR] [MAX_WEEK]
Sample: isDropback TRUE, playAction FALSE, exactly one wasTargettedReceiver=1.
"""
import csv, collections, json, os, sys

DATA = sys.argv[1] if len(sys.argv) > 1 else "/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/user/fb-back/out/backs"
MAXW = int(sys.argv[3]) if len(sys.argv) > 3 else 3
RB = {"RB", "FB"}
HOT = 1.8

def rd(name):
    with open(os.path.join(DATA, name), newline="") as f:
        yield from csv.DictReader(f)

weeks = {r["gameId"]: int(r["week"]) for r in rd("games.csv")}
pos = {r["nflId"]: r["position"] for r in rd("players.csv")}
plays = {}
for r in rd("plays.csv"):
    if weeks.get(r["gameId"], 99) > MAXW: continue
    if r["isDropback"] != "TRUE" or r["playAction"] != "FALSE": continue
    try: ttt = float(r["timeToThrow"])
    except ValueError: ttt = None
    plays[(r["gameId"], r["playId"])] = {"ttt": ttt, "res": r["passResult"], "off": r["possessionTeam"],
                                         "routes": [], "rb_routes": [], "tgt": [], "rushers": 0}
for r in rd("player_play.csv"):
    p = plays.get((r["gameId"], r["playId"]))
    if p is None: continue
    ps = pos.get(r["nflId"], "?")
    if r["teamAbbr"] == p["off"]:
        rt = r["routeRan"] if r["routeRan"] not in ("", "NA") else None
        if rt:
            (p["rb_routes"] if ps in RB else p["routes"]).append(rt)
        if r["wasTargettedReceiver"] == "1":
            p["tgt"].append((ps, rt))
    elif r["wasInitialPassRusher"] == "1":
        p["rushers"] += 1

def classify(rs):
    c = collections.Counter(rs)
    out = []
    if c["GO"] >= 3: out.append("four_verts_strict")
    if c["GO"] + c["POST"] + c["CORNER"] >= 3: out.append("four_verts_loose")
    if c["GO"] >= 2 and c["HITCH"] >= 1: out.append("verts_hitch")
    if c["GO"] >= 1 and c["FLAT"] >= 1 and c["HITCH"] >= 1: out.append("fade_flat")
    if c["HITCH"] >= 3: out.append("hitches")
    return out or ["other"]

def q(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs: return "n=0"
    g = lambda f: xs[min(len(xs) - 1, int(f * (len(xs) - 1) + 0.5))]
    return f"{g(.25):.2f}/{g(.5):.2f}/{g(.75):.2f} (n={len(xs)})"

def pct(a, b): return f"{100*a/b:.1f}% ({a}/{b})" if b else "- (0/0)"

sample = [p for p in plays.values() if len(p["tgt"]) == 1]
drop_multi = sum(1 for p in plays.values() if len(p["tgt"]) > 1)
lines = [f"# NFL check-down / hot-to-back, weeks 1-{MAXW}",
         f"dropback non-PA plays: {len(plays)}; with exactly one target: {len(sample)}; multi-target dropped: {drop_multi}", ""]

# (a)
order = ["four_verts_strict", "four_verts_loose", "verts_hitch", "fade_flat", "hitches", "other", "ALL"]
agg = {k: collections.defaultdict(list) for k in order}
for p in sample:
    tp, tr = p["tgt"][0]
    isrb = tp in RB
    for k in classify(p["routes"]) + ["ALL"]:
        a = agg[k]
        a["n"].append(1); a["rb"].append(isrb); a["rbflat"].append(isrb and tr == "FLAT")
        a["rbran"].append(bool(p["rb_routes"]))
        a["ttt_rb" if isrb else "ttt_oth"].append(p["ttt"])
        if isrb: a["rbroute"].append(tr or "none")
lines += ["## (a) concept shape (classes overlap; 'other' = none of the five)",
          "| class | plays | tgt->RB | tgt->RB FLAT | RB ran route | TTT RB p25/50/75 | TTT other p25/50/75 |",
          "|---|---|---|---|---|---|---|"]
for k in order:
    a = agg[k]; n = len(a["n"])
    lines.append(f"| {k} | {n} | {pct(sum(a['rb']), n)} | {pct(sum(a['rbflat']), n)} | {pct(sum(a['rbran']), n)} | {q(a['ttt_rb'])} | {q(a['ttt_oth'])} |")
lines += ["", "RB targeted route distribution:"]
for k in order:
    c = collections.Counter(agg[k]["rbroute"])
    lines.append(f"- {k} (n={sum(c.values())}): " + ", ".join(f"{r} {v}" for r, v in c.most_common()))

# (b)
lines += ["", "## (b) blitz (>=5 initial pass rushers) vs non-blitz", "| | non-blitz | blitz |", "|---|---|---|"]
grp = {False: [], True: []}
for p in sample: grp[p["rushers"] >= 5].append(p)
allp = list(plays.values())
nb = sum(1 for p in allp if p["rushers"] >= 5)
rush_hist = collections.Counter(p["rushers"] for p in allp)
def row(label, f):
    lines.append(f"| {label} | {pct(sum(1 for p in grp[False] if f(p)), len(grp[False]))} | {pct(sum(1 for p in grp[True] if f(p)), len(grp[True]))} |")
rbt = lambda p: p["tgt"][0][0] in RB
quick = lambda p: p["ttt"] is not None and p["ttt"] < HOT
row("tgt->RB", rbt)
row(f"hot to back (RB tgt, TTT<{HOT})", lambda p: rbt(p) and quick(p))
row(f"quick throw any (TTT<{HOT})", quick)
row("RB ran a route", lambda p: bool(p["rb_routes"]))
lines.append(f"| TTT p25/50/75 | {q([p['ttt'] for p in grp[False]])} | {q([p['ttt'] for p in grp[True]])} |")
lines += ["", f"blitz rate, all dropback non-PA plays (incl. sacks/scrambles): {pct(nb, len(allp))}; targeted sample: {pct(len(grp[True]), len(sample))}",
          "rusher count histogram (all dropback non-PA): " + ", ".join(f"{k}:{v}" for k, v in sorted(rush_hist.items())), ""]
for b in (False, True):
    qs = [p for p in grp[b] if quick(p)]
    c = collections.Counter({"RB": 0, "WR": 0, "TE": 0})
    for p in qs:
        ps = p["tgt"][0][0]; c["RB" if ps in RB else ps if ps in ("WR", "TE") else "other"] += 1
    lines.append(f"quick-throw target position, {'blitz' if b else 'non-blitz'} (n={len(qs)}): " + ", ".join(f"{k} {pct(v, len(qs))}" for k, v in c.most_common()))

os.makedirs(OUT, exist_ok=True)
txt = "\n".join(lines) + "\n"
with open(os.path.join(OUT, f"nfl_checkdown_w1-{MAXW}.md"), "w") as f: f.write(txt)
print(txt)
