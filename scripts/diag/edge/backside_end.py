#!/usr/bin/env python3
"""What a wide backside end does after his first steps on a designed run (TKL-2 /
run game, Defense). Same position-only definitions on NFL and run-only sim film,
reusing scripts/mechanics/run_film_reference.py's readers and its edge rule:
the widest DL/LB on the line (x < 1.8) each side, wide when 1.5+ yd outside the
widest inline OL/TE; playside = the side the carrier crosses the line on.

For each wide BACKSIDE end, clocks from the handoff:
  squeeze      lateral move toward the ball's snap y over the first 1.0 s (+ = inside),
               and his depth (x, + = past the line) at 1.0 s
  flatten      first moment he moves toward the play side at 2+ yd/s, held 0.3 s
               (he has left his boot/reverse/cutback check): seconds after the handoff,
               his x then (behind the line < 0), the carrier's x then, and the carrier's
               lateral distance from the end's side of the ball (yd past the snap y)
  never        share who never flatten before the play ends
  chase        from 1.5 to 3.5 s after the snap: mean speed, and mean closing speed on
               the carrier (positive = closing)
  in on play   within 1.5 yd of the carrier on the last frame (run_film_reference's)

    python3 -I scripts/diag/edge/backside_end.py LABEL=plays.jsonl.gz [LABEL=trace.json ...]
      .jsonl.gz: common format (nfl_bdb2025.py --plays-out, or aim-jump/restage.ts output)
      .json:     run-film-trace.ts output
"""
import math, os, statistics as st, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from run_film_reference import nfl, sim  # noqa: E402
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")

def ends(play):
    xy, players, c = play["xy"], play["players"], play["carrier"]
    n = len(xy); k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    ol = [i for i, p in enumerate(players) if p["side"] == "O" and p["group"] == "OL"]
    if n < 15 or len(ol) < 5: return
    cross = next((f * 0.1 for f in range(n) if xy[f][c][0] > 0), None)
    if cross is None or play["handoff"] is None: return
    cy = st.mean(xy[0][i][1] for i in ol)
    inline = [i for i, p in enumerate(players) if p["side"] == "O" and p["group"] in ("OL", "TE") and xy[0][i][0] > -2.2]
    half = max(abs(xy[0][i][1] - cy) for i in ol)
    side = 1 if xy[k(cross)][c][1] > cy else -1
    dfn = [i for i, p in enumerate(players) if p["side"] == "D"]
    for s in (1, -1):
        outer = max((xy[0][i][1] - cy) * s for i in inline if (xy[0][i][1] - cy) * s > 0 and abs(xy[0][i][1] - cy) < half + 2.3)
        cand = [j for j in dfn if xy[0][j][0] < 1.8 and players[j]["group"] in ("DL", "LB") and (xy[0][j][1] - cy) * s > 0]
        if not cand: continue
        j = max(cand, key=lambda j: (xy[0][j][1] - cy) * s)
        if (xy[0][j][1] - cy) * s - outer < 1.5: continue
        yield j, s, s == side, cy, k

def vel(xy, i, f):
    a, b = max(0, f - 2), min(len(xy) - 1, f + 2)
    return ((xy[b][i][0] - xy[a][i][0]) / ((b - a) * .1), (xy[b][i][1] - xy[a][i][1]) / ((b - a) * .1)) if b > a else (0, 0)

def measure(plays):
    R = {"rel": {t: ([], [], []) for t in (0, .5, 1, 1.5, 2, 2.5, 3)}, "ts": {t: ([], [], [], []) for t in (0, .5, 1, 1.5, 2, 2.5, 3)}, "crossed": [], "nocross": 0, "n": 0, "squeeze": [], "x1": [], "flat_t": [], "flat_x": [], "flat_cx": [], "flat_cy": [], "never": 0,
         "speed": [], "close": [], "inon": 0,
         "blk_share": [], "blk_speed": [], "free_speed": [], "blk_lat": [], "free_lat": [], "ever_blocked": 0}
    for play in plays:
        xy, c = play["xy"], play["carrier"]; n = len(xy)
        end = min(n - 1, int(round(play["end"] / .1)))
        for j, s, playside, cy, k in ends(play) or []:
            if playside: continue
            R["n"] += 1; h = k(play["handoff"])
            # Time series after the handoff: lateral position toward the play side measured from the
            # ball's snap y (negative = still on his own side), depth, speed, and closing on the carrier.
            for t, (lat, dep, spd, clo) in R["ts"].items():
                f = h + int(round(t / .1))
                if f > end: continue
                lat.append((cy - xy[f][j][1]) * s); dep.append(xy[f][j][0])
                vx, vy = vel(xy, j, f); spd.append(math.hypot(vx, vy))
                dx, dy = xy[f][c][0] - xy[f][j][0], xy[f][c][1] - xy[f][j][1]; d = math.hypot(dx, dy) or 1
                cvx, cvy = vel(xy, c, f); clo.append(((vx - cvx) * dx + (vy - cvy) * dy) / d)
                rl, cl_, rd = R["rel"][t]
                rl.append((xy[f][j][1] - xy[f][c][1]) * s); cl_.append((cy - xy[f][c][1]) * s); rd.append(xy[f][j][0] - xy[f][c][0])
            # Blocked (position-only, same on both sides): an OL/TE within 1.0 yd. From 0.5 to 3.0 s after
            # the handoff: share of frames blocked, and his speed and lateral speed toward the play side
            # in blocked and in free frames.
            blockers = [i for i, p in enumerate(play["players"]) if p["side"] == "O" and p["group"] in ("OL", "TE")]
            nb = 0; tot = 0; was = False
            for f in range(h + 5, min(end, h + 30) + 1):
                tot += 1; vx, vy = vel(xy, j, f)
                b = any(math.hypot(xy[f][i][0] - xy[f][j][0], xy[f][i][1] - xy[f][j][1]) < 1.0 for i in blockers)
                nb += b; was = was or b
                (R["blk_speed"] if b else R["free_speed"]).append(math.hypot(vx, vy))
                (R["blk_lat"] if b else R["free_lat"]).append(-vy * s)
            if tot: R["blk_share"].append(nb / tot)
            R["ever_blocked"] += was
            cr = next((f for f in range(h, end + 1) if (cy - xy[f][j][1]) * s >= 0), None)
            if cr is None: R["nocross"] += 1
            else: R["crossed"].append((cr - h) * .1)
            y0 = xy[0][j][1]
            R["squeeze"].append((y0 - xy[k(play["handoff"] + 1.0)][j][1]) * s)
            R["x1"].append(xy[k(play["handoff"] + 1.0)][j][0])
            held, flat = 0, None
            for f in range(h, end + 1):
                vx, vy = vel(xy, j, f)
                held = held + 1 if -vy * s >= 2 else 0
                if held >= 3: flat = f - 2; break
            if flat is None: R["never"] += 1
            else:
                R["flat_t"].append((flat - h) * .1); R["flat_x"].append(xy[flat][j][0])
                R["flat_cx"].append(xy[flat][c][0]); R["flat_cy"].append((cy - xy[flat][c][1]) * s)
            sp, cl = [], []
            for f in range(k(1.5), min(end, k(3.5)) + 1):
                vx, vy = vel(xy, j, f); sp.append(math.hypot(vx, vy))
                dx, dy = xy[f][c][0] - xy[f][j][0], xy[f][c][1] - xy[f][j][1]; d = math.hypot(dx, dy) or 1
                cvx, cvy = vel(xy, c, f); cl.append(((vx - cvx) * dx + (vy - cvy) * dy) / d)
            if sp: R["speed"].append(st.mean(sp)); R["close"].append(st.mean(cl))
            R["inon"] += math.hypot(xy[end][j][0] - xy[end][c][0], xy[end][j][1] - xy[end][c][1]) < 1.5
    return R

def show(label, R):
    p = lambda v: f"{q(v, .25):5.2f} / {q(v, .5):5.2f} / {q(v, .75):5.2f}"
    n = max(1, R["n"])
    print(f"== {label}: {R['n']} wide backside ends   (p25 / p50 / p75)")
    print(f"   squeeze inside over 1.0 s after handoff, yd   {p(R['squeeze'])}   depth at 1.0 s {p(R['x1'])}")
    print(f"   flatten and chase: {100 * (1 - R['never'] / n):.0f}% do; s after handoff {p(R['flat_t'])}")
    print(f"      his x then {p(R['flat_x'])}   carrier x then {p(R['flat_cx'])}   carrier yd past the snap y toward the play side {p(R['flat_cy'])}")
    print("   after the handoff:   lateral toward the play side from the ball's snap y | depth | speed | closing on carrier   (medians; n)")
    for t, (lat, dep, spd, clo) in R["ts"].items():
        if lat: print(f"      {t:3.1f} s   {q(lat, .5):6.2f} ({q(lat, .25):5.1f}..{q(lat, .75):5.1f})   {q(dep, .5):5.2f}   {q(spd, .5):4.2f}   {q(clo, .5):5.2f}   n={len(lat)}")
    print("   relative to the carrier: his lateral cushion on his own side of the carrier | carrier toward the play side from the snap y | his depth minus the carrier's")
    for t, (rl, cl_, rd) in R["rel"].items():
        if rl: print(f"      {t:3.1f} s   {q(rl, .5):6.2f} ({q(rl, .25):5.1f}..{q(rl, .75):5.1f})   {q(cl_, .5):6.2f}   {q(rd, .5):6.2f}")
    print(f"   crosses the ball's snap y: {100 * (1 - R['nocross'] / n):.0f}%, s after handoff {p(R['crossed'])}")
    print(f"   blocked (OL/TE within 1.0 yd) 0.5-3.0 s after handoff: ever {100 * R['ever_blocked'] / n:.0f}%, share of frames p50 {q(R['blk_share'], .5):.2f} mean {st.mean(R['blk_share']) if R['blk_share'] else float('nan'):.2f}")
    print(f"      speed blocked {p(R['blk_speed'])}  free {p(R['free_speed'])}")
    print(f"      lateral speed toward the play side: blocked {p(R['blk_lat'])}  free {p(R['free_lat'])}")
    print(f"   1.5-3.5 s: speed {p(R['speed'])}   closing on the carrier {p(R['close'])}   in on the play {100 * R['inon'] / n:.0f}%")

for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    show(label, measure(nfl(path) if path.endswith(".jsonl.gz") else sim(path.split(","))))
