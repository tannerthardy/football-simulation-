#!/usr/bin/env python3
"""How often would a 'slow release => screen' read trip, by route?
Rule R(D): downfield velocity < D at both 0.6 and 0.9 s (central diff +/-0.2 s).
NFL: BDB 2025 detached WR/TE by routeRan; screen blockers as in release_pace.py.
Sim: scripts/diag/route-releases.mts ordinary releases by route id;
SIM_SCREENS: screen-lab output (scripts/diag/screen-lab.mts, #403) for blockers.
usage: python3 -I scripts/mechanics/release_falsetrip.py NFL_PLAYS DATA_DIR SIM_RELEASES SIM_SCREENS"""
import csv, gzip, json, math, random, sys
from collections import defaultdict
nfl_f, data, simr, sims = sys.argv[1:5]
TIMES = (0.6, 0.9)
DS = (1.0, 1.5, 2.0)
def kin(p, j):
    xy, dt = p["xy"], p.get("dt", 0.1); out = []
    for t in TIMES:
        k = int(round(t / dt)); a, b = max(0, k - 2), min(len(xy) - 1, k + 2)
        if b <= a or b - a < 4: return None
        vx = (xy[b][2*j] - xy[a][2*j]) / ((b - a) * dt); vy = (xy[b][2*j+1] - xy[a][2*j+1]) / ((b - a) * dt)
        out.append((math.hypot(vx, vy), vx))
    return out
det = lambda p, j: abs(p["xy"][0][2*j+1] - p.get("ball_y", 26.65)) > 3.5
def wilson(k, n, z=1.96):
    if not n: return (0, 0)
    ph = k / n; d = 1 + z*z/n; c = (ph + z*z/(2*n)) / d; h = z*math.sqrt(ph*(1-ph)/n + z*z/(4*n*n)) / d
    return (max(0, c-h), min(1, c+h))
def row(name, rows):
    n = len(rows)
    if n < 15: return
    cells = []
    for D in DS:
        k = sum(1 for r in rows if r[0][1] < D and r[1][1] < D); lo, hi = wilson(k, n)
        cells.append(f"{100*k/n:5.1f}% [{100*lo:4.1f},{100*hi:4.1f}]")
    d9 = sorted(r[1][1] for r in rows); s9 = sorted(r[1][0] for r in rows)
    print(f"{name:26} n {n:5} | down@0.9 p50 {d9[n//2]:4.1f} spd {s9[n//2]:4.1f} | " + " | ".join(cells))
def boot_p50(rows, i, c, B=2000):
    random.seed(1); v = [r[i][c] for r in rows]; m = []
    for _ in range(B):
        s = sorted(random.choice(v) for _ in v); m.append(s[len(s)//2])
    m.sort(); return m[int(.025*B)], m[int(.975*B)]
pp = defaultdict(list)
for r in csv.DictReader(open(f"{data}/player_play.csv", newline="")): pp[f"{r['gameId']}-{r['playId']}"].append(r)
off = {f"{r['gameId']}-{r['playId']}": r["possessionTeam"] for r in csv.DictReader(open(f"{data}/plays.csv", newline=""))}
nfl = defaultdict(list)
for line in gzip.open(nfl_f, "rt"):
    p = json.loads(line); rows = pp.get(p["id"])
    if not rows or p["id"] not in off: continue
    o = sorted((r for r in rows if r["teamAbbr"] == off[p["id"]]), key=lambda r: r["nflId"])
    if len(o) != sum(pl["side"] == "O" for pl in p["players"]): continue
    route = [r["routeRan"] if r["routeRan"] != "NA" else "" for r in o]
    tgt = next((i for i, r in enumerate(o) if r["wasTargettedReceiver"] == "1"), None)
    screen = tgt is not None and route[tgt] == "SCREEN" and p["players"][tgt]["group"] in ("WR", "TE")
    for j, pl in enumerate(p["players"][:len(o)]):
        if pl["group"] not in ("WR", "TE") or not det(p, j): continue
        k = kin(p, j)
        if not k: continue
        r = route[j]
        if p["kind"] == "run": nfl["run-play WR"].append(k)
        elif screen and j != tgt and not r: nfl["SCREEN BLOCKER"].append(k)
        elif p["kind"] == "pass" and not screen and r: nfl[r].append(k)
        elif p["kind"] == "pass" and not screen and not r: nfl["(no route: block/chip)"].append(k)
print("Trip rule R(D): downfield < D yd/s at both 0.6 and 0.9 s. Cells: rate [95% Wilson], D = " + ", ".join(map(str, DS)))
print("== NFL (BDB 2025, weeks 1-9), detached WR/TE ==")
for g in sorted(nfl, key=lambda g: -len(nfl[g])): row(g, nfl[g])
sb = nfl["SCREEN BLOCKER"]
if sb:
    print(f"  NFL screen blocker p50 95% bootstrap: down@0.6 {boot_p50(sb,0,1)}, down@0.9 {boot_p50(sb,1,1)}, spd@0.9 {boot_p50(sb,1,0)}")
sim = defaultdict(list)
for line in gzip.open(simr, "rt"):
    p = json.loads(line)
    for j, pl in enumerate(p["players"]):
        if pl["side"] != "O" or pl["group"] not in ("WR", "TE") or not det(p, j): continue
        k = kin(p, j)
        if k: sim[p["routes"][j]].append(k)
for line in gzip.open(sims, "rt"):
    p = json.loads(line); sc = p.get("screen") or {}
    if sc.get("group") not in ("WR", "TE"): continue
    for j, pl in enumerate(p["players"]):
        if pl["side"] != "O" or pl["group"] not in ("WR", "TE") or j == sc.get("receiver") or not det(p, j): continue
        k = kin(p, j)
        if k and j in (sc.get("blockers") or []): sim[f"SCREEN BLOCKER {sc['type']}"].append(k)
        elif k: sim[f"screen-play route {sc['type']}"].append(k)
print("== sim ==")
for g in sorted(sim, key=lambda g: -len(sim[g])): row(g, sim[g])
