"""Receivers on runs, NFL vs sim, same operator: each WR's first defender within 1.2 yd (frames 2..carrier cross+6),
his group, box membership (snap depth < 7.5, |lat to OL centre| < 8) and the snap lateral |dy| WR-to-him; by WR split
(|WR - OL centre| at snap) and concept. usage: wrfirst.py mech_dir nfl.jsonl.gz traces... (env CONCEPTS=a,b)"""
import sys, os, math, collections, statistics as st
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
CONS = os.environ.get("CONCEPTS")
CONS = set(CONS.split(",")) if CONS else None
C = collections.defaultdict(collections.Counter); L = collections.defaultdict(list)
def split(w): return "core<6" if w < 6 else "slot6-11" if w < 11 else "wide11+"
def measure(p):
    if CONS and p["concept"] not in CONS: return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 10: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / len(ol)
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    src = p["src"]; C[src]["snaps"] += 1
    defs = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB")]
    end = min(len(xy), cross + 6)
    for w in [i for i, g in enumerate(grp) if g == "WR" and i != car]:
        sp = split(abs(xy[0][w][1] - cy)); C[src][f"{sp} n"] += 1
        first = None
        for k in range(2, end):
            hit = [j for j in defs if math.dist(xy[k][w], xy[k][j]) < 1.2]
            if hit: first = min(hit, key=lambda j: math.dist(xy[k][w], xy[k][j])); break
        if first is None: C[src][f"{sp} nobody"] += 1; continue
        j = first; box = xy[0][j][0] < 7.5 and abs(xy[0][j][1] - cy) < 8
        tag = f"{grp[j]}{' box' if box else ''}"
        C[src][f"{sp} {tag}"] += 1
        L[(src, sp, tag)].append(abs(xy[0][j][1] - xy[0][w][1]))
        L[(src, sp, "any")].append(abs(xy[0][j][1] - xy[0][w][1]))
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
print({s: C[s]["snaps"] for s in C})
pct = lambda v, q: sorted(v)[min(len(v) - 1, int(q * len(v)))] if v else float('nan')
for sp in ("core<6", "slot6-11", "wide11+"):
    for src in ("nfl", "sim"):
        c = C[src]; n = c[f"{sp} n"]
        if not n: continue
        tags = ["nobody", "DB", "DB box", "LB", "LB box", "DL", "DL box"]
        print(f"{sp:9} {src}: WR/snap {n/c['snaps']:.2f} first: " + " ".join(f"{t} {c[f'{sp} {t}']/n:.2f}" for t in tags))
        for t in ("DB", "DB box", "LB box", "DL box", "any"):
            v = L[(src, sp, t)]
            if len(v) >= 5: print(f"      {t:7} snap lateral to WR: p50 {pct(v,.5):.1f} p75 {pct(v,.75):.1f} p90 {pct(v,.9):.1f} max {max(v):.1f} (n {len(v)})")
