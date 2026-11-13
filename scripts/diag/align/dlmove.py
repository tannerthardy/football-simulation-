"""Called line movement at the snap: one operator for tracking (nfl_dlmove.py)
and the sim. Observation only.

Front players: defenders within 2 yd of the ball's line at the snap and 7.5 yd
of the ball laterally. A front player "moves" when he is 0.35 yd or more to a
side 0.3 s after the snap, earlier than a reaction to the man in front allows.
Per play:
  none    nobody moves
  angle   one or two move (same way)
  slant   three or more move the same way
  pinch   players on both sides move inward (toward the ball)
  mixed   anything else
Direction is read against the front's strength (the attached end's side,
else the receivers'), and on runs against where the play went (the ball
carrier's side 0.5 s after the snap, or PFF's run concept with direction).

    python3 -I scripts/diag/align/dlmove.py out/align/nfl-dlmove.csv.gz [--by down|pers|pass]
"""
import collections
import csv
import gzip
import sys

OL = {"T", "G", "C"}
MOVE = 0.35


def plays(path):
    cur, key = [], None
    with gzip.open(path, "rt") as handle:
        for r in csv.DictReader(handle):
            k = (r["gameId"], r["playId"])
            if k != key and cur:
                yield cur
                cur = []
            key = k
            for c in ("x0", "y0", "y1", "y2", "y3", "y5", "x5"):
                r[c] = float(r[c])
            cur.append(r)
    if cur:
        yield cur


def look(rows):
    O = [r for r in rows if r["side"] == "O"]
    D = [r for r in rows if r["side"] == "D"]
    ol = sorted([r for r in O if r["position"] in OL], key=lambda r: r["y0"])
    if len(ol) != 5 or len(D) < 10:
        return None
    tack = {1: ol[4]["y0"], -1: -ol[0]["y0"]}
    te = {k: [r for r in O if r["position"] == "TE" and 0 < r["y0"] * k - tack[k] < 2.6 and r["x0"] > -2.5] for k in (1, -1)}
    rec = {k: sum(1 for r in O if r["position"] not in OL and r["position"] != "QB" and r["y0"] * k > 0
                  and not (r["x0"] < -2.5 and abs(r["y0"]) < 3.5)) for k in (1, -1)}
    st = 1 if len(te[1]) > len(te[-1]) else -1 if len(te[-1]) > len(te[1]) else 1 if rec[1] > rec[-1] else -1 if rec[-1] > rec[1] else 1
    front = [d for d in D if d["x0"] <= 2.0 and abs(d["y0"]) <= 7.5]
    if len(front) < 3:
        return None
    moves = [(d, d["y3"] - d["y0"]) for d in front]
    movers = [(d, m) for d, m in moves if abs(m) >= MOVE]
    signs = [1 if m > 0 else -1 for _, m in movers]
    if not movers:
        kind, dirn = "none", 0
    elif all(s == signs[0] for s in signs):
        kind, dirn = ("slant" if len(movers) >= 3 else "angle"), signs[0]
    elif all((d["y0"] > 0) != (m > 0) for d, m in movers) and any(d["y0"] > 0 for d, _ in movers) and any(d["y0"] < 0 for d, _ in movers):
        kind, dirn = "pinch", 0
    else:
        kind, dirn = "mixed", 0
    run = rows[0]["isDropback"].upper() != "TRUE"
    carrier = None
    if run:
        backs = [r for r in O if r["position"] in ("RB", "FB", "QB")]
        if backs:
            b = max(backs, key=lambda r: abs(r["y5"] - r["y0"]) if r["position"] != "QB" else -1)
            carrier = 1 if b["y5"] > b["y0"] + .5 else -1 if b["y5"] < b["y0"] - .5 else 0
    speed = sum(abs(m) for _, m in moves) / len(moves) / 0.3
    return {"kind": kind, "dir_strength": dirn * st, "dir_play": (dirn * carrier) if (carrier and dirn) else 0,
            "run": run, "n": len(movers), "nfront": len(front), "speed": speed,
            "down": rows[0]["down"], "togo": rows[0]["yardsToGo"], "form": rows[0]["offenseFormation"],
            "concept": rows[0]["pff_runConceptPrimary"]}


def pct(c, n):
    return " ".join(f"{k} {v / n:.0%}" for k, v in sorted(c.items(), key=lambda kv: -kv[1]))


def report(path, by):
    out = [x for p in plays(path) if (x := look(p))]
    print(f"{path.split('/')[-1]}: {len(out)} plays")
    groups = collections.defaultdict(list)
    for x in out:
        groups["run" if x["run"] else "pass"].append(x)
        if by == "down":
            d = x["down"]; t = int(x["togo"]) if str(x["togo"]).isdigit() else 10
            groups[("run " if x["run"] else "pass ") + (f"{d} short" if t <= 2 else f"{d} long")].append(x)
        elif by == "form":
            groups[("run " if x["run"] else "pass ") + x["form"]].append(x)
        elif by == "concept" and x["run"]:
            groups["run " + (x["concept"] or "-")].append(x)
    for k in sorted(groups):
        g = groups[k]
        n = len(g)
        if n < 40:
            continue
        sl = [x for x in g if x["kind"] in ("slant", "angle")]
        print(f"  {k:24s} n {n:5d} | {pct(collections.Counter(x['kind'] for x in g), n)}"
              f" | slant/angle toward strength {sum(x['dir_strength'] > 0 for x in sl) / max(1, len(sl)):.0%}"
              + (f", toward the play {sum(x['dir_play'] > 0 for x in sl) / max(1, sum(x['dir_play'] != 0 for x in sl)):.0%}" if k.startswith("run") else "")
              + f" | mean |lateral| speed to 0.3 s {sum(x['speed'] for x in g) / n:.2f} yd/s")


if __name__ == "__main__":
    by = sys.argv[sys.argv.index("--by") + 1] if "--by" in sys.argv else ""
    for a in sys.argv[1:]:
        if a.endswith(".gz"):
            report(a, by)
