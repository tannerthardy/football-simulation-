"""How the defense answers one pre-snap motion: one operator for tracking
(nfl_motion.py) and the sim (sim_motion.ts). Observation only.

Per play with one motion man M (positions at the line set and at the snap,
x off the ball toward the defense, y across from the ball):
  kind     jet (M still moving at the snap), empty (M starts in the backfield
           and ends detached), across (M ends on the other side of the ball),
           same (in, return or a short move on his side)
  travel   a non-lineman moved with M at least 60% of M's lateral move, the
           same way, and ends within 3 yd of him laterally
  lock     man coverage with a matched defender (PFF primary matchup / the
           sim's man target): was that defender already on M at the line set
           (within 4 yd laterally)? Lock = yes (he carried M); trade = no
  crossers non-linemen whose lateral side flips across the ball (|y| > 1.5);
           far crossers also moved more than 5 yd
  shell    deep defenders (> 9.5 yd) at the line set and at the snap
  strength the receivers' count side at the line set and at the snap
  over_M   who ends nearest M laterally (under 8 deep): DB, LB or DL

    python3 -I scripts/diag/align/motionlook.py out/align/nfl-motion.csv.gz [out/align/sim-motion.csv.gz] [--by kind|cov]
"""
import collections
import csv
import gzip
import sys

DB = {"CB", "DB", "SS", "FS", "S"}
LB = {"ILB", "MLB", "OLB", "LB"}
OL = {"T", "G", "C"}


def group(pos):
    return "DB" if pos in DB else "LB" if pos in LB else "DL"


def plays(path):
    cur, key = [], None
    with gzip.open(path, "rt") as handle:
        for r in csv.DictReader(handle):
            k = (r["gameId"], r["playId"])
            if k != key and cur:
                yield cur
                cur = []
            key = k
            for c in ("xLS", "yLS", "xSN", "ySN"):
                r[c] = float(r[c])
            cur.append(r)
    if cur:
        yield cur


def look(rows):
    O = [r for r in rows if r["side"] == "O"]
    D = [r for r in rows if r["side"] == "D"]
    M = [r for r in O if r["isMotion"] in ("1", "TRUE")]
    if len(M) != 1 or len(D) != 11:
        return None
    m = M[0]
    if m["position"] in ("QB",) or m["position"] in OL:
        return None
    dy = m["ySN"] - m["yLS"]
    back = m["xLS"] < -2.5 and abs(m["yLS"]) < 3.5
    if m["inMotionAtBallSnap"].upper() == "TRUE":
        kind = "jet"
    elif back and (abs(m["ySN"]) > 3.5 or m["xSN"] > -2):
        kind = "empty"
    elif m["yLS"] * m["ySN"] < 0 and abs(m["yLS"]) > 1 and abs(m["ySN"]) > 1:
        kind = "across"
    else:
        kind = "same"
    if abs(dy) < 2 and kind != "jet":
        return None
    nonl = [d for d in D if group(d["position"]) != "DL"]
    travel = [d for d in nonl if (d["ySN"] - d["yLS"]) * dy > 0 and abs(d["ySN"] - d["yLS"]) >= .6 * abs(dy)
              and abs(d["ySN"] - m["ySN"]) < 3]
    crossers = [d for d in nonl if d["yLS"] * d["ySN"] < 0 and abs(d["yLS"]) > 1.5 and abs(d["ySN"]) > 1.5]
    far = [d for d in crossers if abs(d["ySN"] - d["yLS"]) > 5]
    deep = lambda key: sum(1 for d in D if d[key] > 9.5)
    def strength(xk, yk):
        rec = [r for r in O if r["position"] not in OL and r["position"] != "QB" and not (r[xk] < -2.5 and abs(r[yk]) < 3.5)]
        a, b = sum(r[yk] > 0 for r in rec), sum(r[yk] < 0 for r in rec)
        return 1 if a > b else -1 if b > a else 0
    sLS, sSN = strength("xLS", "yLS"), strength("xSN", "ySN")
    under = [d for d in D if d["xSN"] < 8]
    over = min(under, key=lambda d: abs(d["ySN"] - m["ySN"])) if under else None
    matched = [d for d in D if d["matchup"] and d["matchup"] == m["nflId"]]
    lock = None
    if matched:
        lock = abs(matched[0]["yLS"] - m["yLS"]) < 4
    man = rows[0]["pff_manZone"]
    return {
        "kind": kind, "cov": man if man in ("Man", "Zone") else "other", "travel": bool(travel),
        "traveler": group(travel[0]["position"]) if travel else "-", "lock": lock,
        "crossers": len(crossers), "far": len(far), "shellLS": min(deep("xLS"), 2), "shellSN": min(deep("xSN"), 2),
        "strengthChange": sLS != 0 and sSN != 0 and sLS != sSN,
        "over": group(over["position"]) if over is not None and abs(over["ySN"] - m["ySN"]) < 3 else "none",
        "dy": abs(dy),
    }


def pct(c, n):
    return " ".join(f"{k} {v / n:.0%}" for k, v in sorted(c.items(), key=lambda kv: -kv[1]))


def report(path, by):
    out = [x for p in plays(path) if (x := look(p))]
    print(f"{path.split('/')[-1]}: {len(out)} plays")
    groups = collections.defaultdict(list)
    for x in out:
        groups[(x["kind"], x["cov"])].append(x)
        groups[(x["kind"], "all")].append(x)
    for k in sorted(groups):
        g = groups[k]
        n = len(g)
        if n < 25:
            continue
        locks = [x["lock"] for x in g if x["lock"] is not None]
        sc = [x for x in g if x["strengthChange"]]
        print(f"  {k[0]:6s} {k[1]:5s} n {n:5d} | travel {sum(x['travel'] for x in g) / n:4.0%}"
              f" (by {pct(collections.Counter(x['traveler'] for x in g if x['travel']), max(1, sum(x['travel'] for x in g)))})"
              f" | lock {sum(locks) / len(locks):4.0%} of {len(locks)}" if locks else
              f"  {k[0]:6s} {k[1]:5s} n {n:5d} | travel {sum(x['travel'] for x in g) / n:4.0%} | lock -", end="")
        print(f" | crossers {pct(collections.Counter(min(x['crossers'], 2) for x in g), n)}"
              f" | far-crossers {sum(x['far'] > 0 for x in g) / n:.0%}"
              f" | shell LS>SN {pct(collections.Counter(f'{x['shellLS']}>{x['shellSN']}' for x in g), n)}"
              f" | str-change {len(sc) / n:4.0%} (crossers {sum(x['crossers'] > 0 for x in sc) / max(1, len(sc)):.0%})"
              f" | over M {pct(collections.Counter(x['over'] for x in g), n)}")


if __name__ == "__main__":
    by = "kind"
    for a in sys.argv[1:]:
        if a.endswith(".gz"):
            report(a, by)
