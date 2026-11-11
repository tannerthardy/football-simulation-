#!/usr/bin/env python3
"""Screen-pass blocking operator: one position-only measurement for NFL
tracking (nfl_screens.py output) and sim screen plays in the same common
play format (scripts/mechanics/metrics.py docstring).

    python3 -I scripts/mechanics/screen_reference.py PLAYS.jsonl.gz [MORE.jsonl.gz ...] [--by group|type] [--json OUT]

A play needs: xy (x = yards past the LOS in the offense's direction), players
(side, group), events (pass_forward, catch or pass_arrived, end), target, and
optionally screen.receiver / screen.group / screen.type.

Definitions (all from positions, 0.1 s frames):
- screen receiver r: screen.receiver, else target. Group: his position group
  (WR/TE/RB); "type" uses screen.type when the source labels one.
- t_throw = pass_forward; t_catch = pass_arrived, else catch (completions only).
  NFL `catch` is pass_outcome_caught, ~0.3 s after the ball arrives; the
  sim's catch is the moment of possession, which matches pass_arrived.
- catch point: r's position at t_catch; depth = x, width = |y - ball_y|.
- released OL: an OL whose x first exceeds +1.0 yd within t_catch + 1.5 s;
  release time = first time his x > 0 (crossing the LOS). Released OL count.
- convoy at the catch: offensive players other than r that are ahead of him
  (x > r.x - 0.5) and within 6 yd laterally and 10 yd in distance; defenders
  in the same window are threats. Reported: blockers, threats, blockers -
  threats.
- block in space: an offensive non-carrier within 1.2 yd (centre to centre)
  of a defender for >= 0.3 s, starting after t_catch - 1.0 s, with the
  contact point > 1 yd past the LOS or > 5 yd laterally from the ball. Per
  play: number of such blocks, and for each, the time of first contact
  relative to t_catch and its distance from the carrier at that time.
- first defender to the carrier: first defender within 1.5 yd of the carrier
  after t_catch. "Blocked first": he had a block in space (above) before that
  moment, i.e. he got off a block; else "unblocked". Time after catch and
  the carrier's gain (x - catch x) at that moment.
- YAC (positional): carrier x at the end minus catch x. Yards: the play's yards.
- nearest defender at the catch: distance from the carrier to the closest
  defender at t_catch (is the ball thrown into a covered man?).
- threat ranking (target selection, independent of what the blocking did):
  defenders ranked by distance to the carrier at t_catch, excluding any
  already in a block in space at that moment. "Near-3 blocked": the share of
  the three nearest that a block in space reaches before the end (or before
  he reaches the carrier, whichever is first). "Rank of blocked men": each
  block's defender's rank at the catch (1 = nearest); blocks on men ranked
  past 5 are spent on players far from the ball. The first defender to the
  carrier gets his rank too, and if he was blocked, how long he was within
  NEAR of a blocker before he arrived.
- block duration (blocks starting from t_catch - 0.3 s on): first contact
  until blocker and defender are apart (> NEAR) for 0.2 s, or the end;
  "still on at the whistle" when they never separate.
- nearby coverage defenders (DB/LB within 12 yd of the catch point at the
  catch): distance to the catch point at the throw; velocity toward the
  catcher at the catch and 0.5 s later (central difference over +/-0.2 s);
  "slow" = under 1 yd/s at the catch (standing, turning, or on the ground).
Prints tables; --json writes per-play rows.
"""
import argparse
import collections
import gzip
import json
import math
import statistics as st
import sys

NEAR, HOLD, FIRST = 1.2, 0.3, 1.5


def load(paths):
    for p in paths:
        op = gzip.open if p.endswith(".gz") else open
        with op(p, "rt") as fh:
            text = fh.read()
        text = text.strip()
        if text.startswith("["):
            yield from json.loads(text)
        else:
            for line in text.splitlines():
                if line.strip():
                    yield json.loads(line)


def pos(play, k, j):
    row = play["xy"][min(k, len(play["xy"]) - 1)]
    return row[2 * j], row[2 * j + 1]


def measure(play):
    dt = play.get("dt", 0.1)
    ev = play.get("events", {})
    sc = play.get("screen") or {}
    r = sc.get("receiver", play.get("target"))
    if r is None:
        return None
    t_catch = ev.get("pass_arrived", ev.get("catch"))
    t_throw = ev.get("pass_forward")
    caught = "catch" in ev or sc.get("passResult") == "C" or play.get("carrier") == r
    players = play["players"]
    nfr = len(play["xy"])
    k = lambda t: max(0, min(nfr - 1, int(round(t / dt))))
    end = ev.get("end", (nfr - 1) * dt)
    row = {"id": play.get("id"), "source": play.get("source"), "group": players[r]["group"],
           "type": sc.get("type") or players[r]["group"], "yards": play.get("yards"), "caught": bool(caught and t_catch is not None),
           "t_throw": t_throw, "t_catch": t_catch}
    off = [j for j, p in enumerate(players) if p["side"] == "O"]
    de = [j for j, p in enumerate(players) if p["side"] == "D"]
    ol = [j for j in off if players[j]["group"] == "OL"]
    ball_y = play.get("ball_y", 0)
    if t_catch is None:
        return row
    kc = k(t_catch)
    rx, ry = pos(play, kc, r)
    row.update(depth=round(rx, 2), width=round(abs(ry - ball_y), 2))
    # Released OL.
    rel = []
    for j in ol:
        up = next((f for f in range(0, k(t_catch + 1.5) + 1) if pos(play, f, j)[0] > 1.0), None)
        if up is None:
            continue
        cross = next((f for f in range(0, up + 1) if pos(play, f, j)[0] > 0), up)
        rel.append(round(cross * dt, 2))
    row.update(released_ol=len(rel), ol_release_t=sorted(rel))
    # Convoy at the catch.
    def window(j):
        x, y = pos(play, kc, j)
        return x > rx - 0.5 and abs(y - ry) <= 6 and math.hypot(x - rx, y - ry) <= 10
    blockers = [j for j in off if j != r and window(j)]
    threats = [j for j in de if window(j)]
    row.update(convoy_blockers=len(blockers), convoy_threats=len(threats), convoy_margin=len(blockers) - len(threats),
               convoy_ol=sum(players[j]["group"] == "OL" for j in blockers))
    # Blocks in space.
    k0, k1 = k(max(0, t_catch - 1.0)), k(end)
    need = max(1, int(round(HOLD / dt)))
    blocks = []
    blocked_at = {}
    for b in off:
        if b == r:
            continue
        for d in de:
            run = 0
            for f in range(k0, k1 + 1):
                bx, by = pos(play, f, b); dx, dy = pos(play, f, d)
                if math.hypot(bx - dx, by - dy) <= NEAR:
                    run += 1
                    if run == need:
                        f0 = f - need + 1
                        cx, cy = (bx + dx) / 2, (by + dy) / 2
                        if cx > 1.0 or abs(cy - ball_y) > 5:
                            carx, cary = pos(play, f0, r)
                            # Duration: from first contact until they are apart (> NEAR) for 0.2 s, or the end.
                            g, apart = f0, 0
                            while g <= k1 and apart < 2:
                                ex, ey = pos(play, g, b); fx, fy = pos(play, g, d)
                                apart = apart + 1 if math.hypot(ex - fx, ey - fy) > NEAR else 0
                                g += 1
                            blocks.append({"blocker": players[b]["group"], "t_rel": round(f0 * dt - t_catch, 2),
                                           "to_carrier": round(math.hypot(dx - carx, dy - cary), 2),
                                           "dur": round((g - f0 - apart) * dt, 2), "to_end": g > k1})
                            blocked_at[d] = min(blocked_at.get(d, f0), f0)
                        break
                else:
                    run = 0
    row.update(space_blocks=len(blocks), blocks=blocks)
    # First defender to the carrier.
    first = None
    for f in range(kc, k1 + 1):
        cx, cy = pos(play, f, r)
        near = [d for d in de if math.hypot(pos(play, f, d)[0] - cx, pos(play, f, d)[1] - cy) <= FIRST]
        if near:
            d = min(near, key=lambda d: math.hypot(pos(play, f, d)[0] - cx, pos(play, f, d)[1] - cy))
            first = {"group": players[d]["group"], "t_after": round((f - kc) * dt, 2), "gain": round(cx - rx, 2),
                     "was_blocked": d in blocked_at and blocked_at[d] < f}
            break
    row.update(first=first, yac=round(pos(play, k1, r)[0] - rx, 2))
    # Threat ranking at the catch.
    engaged_at_catch = {d for d, f0 in blocked_at.items() if f0 <= kc}
    ranked = sorted((d for d in de if d not in engaged_at_catch),
                    key=lambda d: math.hypot(pos(play, kc, d)[0] - rx, pos(play, kc, d)[1] - ry))
    rank = {d: i + 1 for i, d in enumerate(ranked)}
    row.update(nearest_d=round(min(math.hypot(pos(play, kc, d)[0] - rx, pos(play, kc, d)[1] - ry) for d in de), 2) if de else None)
    def arrives(d):
        for f in range(kc, k1 + 1):
            cx, cy = pos(play, f, r)
            if math.hypot(pos(play, f, d)[0] - cx, pos(play, f, d)[1] - cy) <= FIRST:
                return f
        return k1 + 1
    near3 = ranked[:3]
    if first is not None:
        fd = next((d for d in de if math.hypot(pos(play, kc + int(round(first['t_after'] / dt)), d)[0] - pos(play, kc + int(round(first['t_after'] / dt)), r)[0],
                                                pos(play, kc + int(round(first['t_after'] / dt)), d)[1] - pos(play, kc + int(round(first['t_after'] / dt)), r)[1]) <= FIRST), None)
        first['rank'] = rank.get(fd, 0)
        # Block held how long before he came off it (frames within NEAR of any blocker, from first contact).
        if fd in blocked_at:
            first['block_s'] = round(sum(1 for f in range(blocked_at[fd], kc + int(round(first['t_after'] / dt)))
                                         if any(math.hypot(pos(play, f, b)[0] - pos(play, f, fd)[0], pos(play, f, b)[1] - pos(play, f, fd)[1]) <= NEAR for b in off if b != r)) * dt, 2)
    row.update(near3_blocked=sum(1 for d in near3 if d in blocked_at and blocked_at[d] < arrives(d)), near3=len(near3),
               blocked_ranks=sorted(rank[d] for d in blocked_at if d in rank))
    # Nearby coverage defenders: distance at the throw, closing speed at the catch and +0.5 s.
    def vel(f, j):
        a, b = pos(play, max(0, f - 2), j), pos(play, min(nfr - 1, f + 2), j)
        span = (min(nfr - 1, f + 2) - max(0, f - 2)) * dt or dt
        return (b[0] - a[0]) / span, (b[1] - a[1]) / span
    near = []
    kt = k(t_throw) if t_throw is not None else kc
    for d in de:
        if players[d]["group"] not in ("DB", "LB"):
            continue
        dx, dy = pos(play, kc, d)
        if math.hypot(dx - rx, dy - ry) > 12:
            continue
        def closing(f):
            cx, cy = pos(play, f, r); px, py = pos(play, f, d); vx, vy = vel(f, d)
            n = math.hypot(cx - px, cy - py) or 1
            return (vx * (cx - px) + vy * (cy - py)) / n
        tx, ty = pos(play, kt, d)
        near.append({"group": players[d]["group"], "dist_throw": round(math.hypot(tx - rx, ty - ry), 2),
                     "close_catch": round(closing(kc), 2), "close_05": round(closing(min(k1, kc + 5)), 2),
                     "speed_catch": round(math.hypot(*vel(kc, d)), 2)})
    row.update(near=near)
    return row


def q(v):
    v = sorted(x for x in v if x is not None)
    if not v:
        return "-"
    return f"{v[len(v)//4]:.2f}/{v[len(v)//2]:.2f}/{v[(3*len(v))//4]:.2f}"


def table(rows, key):
    out = collections.defaultdict(list)
    for x in rows:
        out[x[key]].append(x)
    for g, R in sorted(out.items(), key=lambda kv: -len(kv[1])):
        C = [x for x in R if x["caught"] and x.get("depth") is not None]
        print(f"\n== {g}: plays {len(R)}, caught {len(C)}")
        if not C:
            continue
        mean = lambda v: round(st.mean(v), 2) if v else None
        print(f"  t_throw p25/50/75 {q([x['t_throw'] for x in C])} | catch depth {q([x['depth'] for x in C])} | width {q([x['width'] for x in C])}")
        print(f"  yards {q([x['yards'] for x in C])} (mean {mean([x['yards'] for x in C if x['yards'] is not None])}) | positional YAC {q([x['yac'] for x in C])}")
        print(f"  released OL per play: {dict(sorted(collections.Counter(x['released_ol'] for x in C).items()))} | first OL crossing LOS {q([x['ol_release_t'][0] for x in C if x['ol_release_t']])} s")
        print(f"  convoy at catch: blockers {q([x['convoy_blockers'] for x in C])}, OL among them {q([x['convoy_ol'] for x in C])}, threats {q([x['convoy_threats'] for x in C])}, margin {q([x['convoy_margin'] for x in C])}")
        sb = [b for x in C for b in x['blocks']]
        print(f"  blocks in space per play {q([x['space_blocks'] for x in C])} | by blocker {dict(collections.Counter(b['blocker'] for b in sb).most_common())}")
        after = [b for b in sb if b['t_rel'] >= -0.3]
        if after:
            print(f"  blocks in space from the catch on: duration {q([b['dur'] for b in after])} s | still on at the whistle {sum(b['to_end'] for b in after)/len(after):.0%}")
        print(f"  block first contact rel. catch {q([b['t_rel'] for b in sb])} s | defender's distance to carrier then {q([b['to_carrier'] for b in sb])} yd")
        N = [n for x in C for n in x.get('near', [])]
        if N:
            print(f"  nearby DB/LB (<=12 yd of catch): {len(N)} | dist at throw {q([n['dist_throw'] for n in N])} | closing at catch {q([n['close_catch'] for n in N])}, +0.5 s {q([n['close_05'] for n in N])} | slow (<1 yd/s) at catch {sum(n['speed_catch'] < 1 for n in N)/len(N):.0%}")
        nd = [x['nearest_d'] for x in C if x.get('nearest_d') is not None]
        if nd:
            print(f"  nearest defender at catch {q(nd)} yd | within 2 yd {sum(v < 2 for v in nd)/len(nd):.0%}")
        n3 = sum(x['near3'] for x in C)
        br = [k for x in C for k in x['blocked_ranks']]
        if n3:
            print(f"  near-3 at catch blocked before reaching carrier {sum(x['near3_blocked'] for x in C)/n3:.0%} | rank of blocked men {q(br)}, ranked past 5 {sum(k > 5 for k in br)/max(1, len(br)):.0%}")
        F = [x['first'] for x in C if x['first']]
        if F:
            print(f"  first defender's rank at catch {q([f.get('rank', 0) for f in F])} | rank 1-2 {sum(1 <= f.get('rank', 0) <= 2 for f in F)/len(F):.0%} | blocked ones: time in block before arriving {q([f['block_s'] for f in F if 'block_s' in f])} s")
            print(f"  first defender to carrier: after {q([f['t_after'] for f in F])} s, carrier gain then {q([f['gain'] for f in F])} | unblocked {sum(not f['was_blocked'] for f in F)/len(F):.0%} | by group {dict(collections.Counter(f['group'] for f in F).most_common())}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plays", nargs="+")
    ap.add_argument("--by", default="group", choices=["group", "type"])
    ap.add_argument("--json")
    ap.add_argument("--ol-max", type=int, help="keep caught plays with at most this many released OL (a WR now/bubble screen with no line release)")
    a = ap.parse_args()
    rows = [m for m in (measure(p) for p in load(a.plays)) if m]
    if a.ol_max is not None:
        rows = [m for m in rows if m.get("released_ol", 99) <= a.ol_max]
    print(f"{len(rows)} screen plays from {', '.join(sorted({str(r['source']) for r in rows}))}")
    table(rows, a.by)
    if a.json:
        with open(a.json, "w") as fh:
            json.dump(rows, fh)


if __name__ == "__main__":
    sys.exit(main())
