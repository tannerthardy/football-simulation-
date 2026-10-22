"""How many games a game-level arm comparison needs, and how long paired
games stay paired. Sim exports only (common play format; ids S<seed>-P<n>).

usage:
  python3 -I scripts/diag/arm-power.py noise SIM.jsonl.gz [...]
  python3 -I scripts/diag/arm-power.py pair ARM_A.jsonl.gz ARM_B.jsonl.gz

noise: per-game rates of pressure (metrics.py: a defender within 2 yd of the
QB from 0.5 s to the throw, or the end capped at 4 s; dropbacks without
play action) and run yards (designed runs: mean, and share of runs
reaching 20 yd). It reports the plays per game, the observed game-to-game
SD against the SD that independent plays would give (the design effect),
and the games per arm needed to detect a given difference with two
independent arms (two-sided 5%, 80% power, design effect applied).

pair: the same seeds in two arms (for example a flag off and on). For each
game, the first play whose recording differs (kind, yards or any position),
how many plays are identical before it, and the paired difference over
those plays (zero by construction) against the rest. If the arms share
plays until a change first matters, a paired comparison can only use the
first differing play of each game plus the identical prefix.
"""
import gzip
import json
import math
import os
import re
import sys
from collections import defaultdict

Z = 1.96 + 0.84  # two-sided 5%, 80% power


def plays(path):
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        m = re.match(r"S(\d+)-P(\d+)$", str(raw.get("id", "")))
        if m:
            yield int(m.group(1)), int(m.group(2)), raw


def pressured(raw):
    xy, P = raw["xy"], raw["players"]
    qb = next((i for i, p in enumerate(P) if p["side"] == "O" and p["group"] == "QB"), None)
    if qb is None:
        return None
    ev = raw.get("events", {})
    end = ev.get("pass_forward", min(ev.get("end", 4.0), 4.0))
    for k in range(5, min(len(xy) - 1, int(round(end / 0.1))) + 1):
        qx, qy = xy[k][2 * qb], xy[k][2 * qb + 1]
        if qx is None:
            continue
        for i, p in enumerate(P):
            if p["side"] == "D" and xy[k][2 * i] is not None and math.hypot(xy[k][2 * i] - qx, xy[k][2 * i + 1] - qy) <= 2.0:
                return True
    return False


def noise(paths):
    G = defaultdict(lambda: {"pr": [], "ry": []})
    for path in paths:
        for seed, _, raw in plays(path):
            c = (raw.get("cell") or {}).get("concept") or ""
            if raw.get("kind") == "pass" and not c.startswith("pa_"):
                v = pressured(raw)
                if v is not None:
                    G[(path, seed)]["pr"].append(v)
            elif raw.get("kind") == "run":
                G[(path, seed)]["ry"].append(raw["yards"])
    games = list(G.values())
    n = len(games)
    print(f"games {n}")
    for name, key, fn, diffs in (
            ("pressure rate", "pr", lambda v: sum(v) / len(v), (0.03, 0.05, 0.10)),
            ("run yards per carry", "ry", lambda v: sum(v) / len(v), (0.3, 0.5, 1.0)),
            ("runs reaching 20 yd", "ry", lambda v: sum(x >= 20 for x in v) / len(v), (0.01, 0.02, 0.04))):
        per = [fn(g[key]) for g in games if g[key]]
        m = sum(len(g[key]) for g in games) / n
        allv = [x for g in games for x in g[key]]
        if key == "ry" and name.startswith("runs"):
            allv = [x >= 20 for x in allv]
        mu = sum(allv) / len(allv)
        sd_play = math.sqrt(sum((x - mu) ** 2 for x in allv) / (len(allv) - 1))
        gm = sum(per) / len(per)
        sd_game = math.sqrt(sum((x - gm) ** 2 for x in per) / (len(per) - 1))
        deff = max(1.0, (sd_game / (sd_play / math.sqrt(m))) ** 2)
        print(f"  {name}: mean {mu:.3f}; {m:.0f} per game; per-play SD {sd_play:.3f}; game-to-game SD {sd_game:.3f} "
              f"(independent plays would give {sd_play / math.sqrt(m):.3f}; design effect {deff:.2f})")
        print("    games per arm to detect a difference of " + ", ".join(
            f"{d:g}: {math.ceil(2 * (Z * sd_play) ** 2 * deff / d ** 2 / m)}" for d in diffs) +
            f"  | 95% half-width of a difference with 4 / 8 / 16 games per arm: " +
            "/".join(f"{1.96 * sd_play * math.sqrt(2 * deff / (g * m)):.3f}" for g in (4, 8, 16)))


def pair(a, b):
    A = {(s, n): r for s, n, r in plays(a)}
    B = {(s, n): r for s, n, r in plays(b)}
    seeds = sorted({s for s, _ in A} & {s for s, _ in B})
    firsts, total = [], 0
    for s in seeds:
        ids = sorted(n for (t, n) in A if t == s and (s, n) in B)
        total += len(ids)
        first = next((i for i, n in enumerate(ids) if A[(s, n)]["xy"] != B[(s, n)]["xy"] or A[(s, n)]["kind"] != B[(s, n)]["kind"]), None)
        firsts.append(len(ids) if first is None else first)
        if first is not None:
            ra = A[(s, ids[first])]
            print(f"  seed {s}: {first} identical plays, first difference at play {ids[first]} ({ra['kind']}, yards {ra['yards']:.1f} vs {B[(s, ids[first])]['yards']:.1f})")
        else:
            print(f"  seed {s}: all {len(ids)} plays identical")
    print(f"games {len(seeds)}, plays {total}; identical prefix median {sorted(firsts)[len(firsts) // 2]} plays "
          f"({100 * sum(firsts) / max(1, total):.0f}% of plays before the first difference)")


mode, args = sys.argv[1], [a for a in sys.argv[2:] if a.endswith(".gz")]
print(f"== {mode}: {', '.join(os.path.basename(a) for a in args)}")
noise(args) if mode == "noise" else pair(*args)
