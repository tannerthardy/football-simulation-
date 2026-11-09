#!/usr/bin/env python3
"""Screen scorecard: one table per screen type, NFL vs sim, same code.

    python3 -I scripts/mechanics/screen_scorecard.py NFL.jsonl.gz SIM.jsonl.gz

Each row is one measurement. NFL is shown as p25/p50/p75 and the sim as its
median. Flags on the sim median:
  !   outside the NFL interquartile range (p25-p75)
  !!  outside NFL p10-p90
A flag is a place to look, not a number to tune toward (docs/NFL_DATA.md).

Types are classified the same way for NFL and sim:
  RB    screen receiver is an RB (sim: slip screen)
  TE    screen receiver is a TE (sim: TE screen)
  WR-out / WR-in / WR-now   detached WR whose motion from snap to catch is
        > 1.5 yd away from the ball / toward it / neither
        (sim: bubble / tunnel / bunch now), as quick_screen_reference.py.
Plays enter a row only when that row is defined: catch rows need a catch.

Rows:
  thrown -> caught         share of thrown screens caught (all thrown plays)
  never thrown             sim only: share of called screens with no throw
  throw time               snap -> pass_forward (s)
  flight                   pass_forward -> catch (s)
  catch depth              catcher x at the catch (yd past the LOS; - = behind)
  catch width              |catcher y - ball y| at the catch
  receiver depth at throw  screen receiver x at the throw
  receiver release (RB/TE) first time his move toward the catch side > 1 yd
                           (a TE who slides with his man in the set reads as
                           released early: use with the film)
  OL released              OL whose x passes +1 yd within catch + 1.5 s
  OL depth at throw        released OL x at the throw (p50 over linemen)
  first OL past LOS - throw  (s); + = after the throw
  OL in front at catch     OL ahead of the catcher (x > catcher x - 0.5),
                           within 6 yd laterally and 10 yd
  blockers in front        same window, any offensive player but the catcher
  nearest DL at throw      screen receiver to the nearest DL
  nearest defender at catch
  first defender within 1 yd: time after the catch (s), carrier gain then (yd)
  yards (caught)           play yards on completions
  YAC (positional)         final carrier x - catch x
"""
import argparse
import collections
import gzip
import json
import math
import sys

TYPES = ["RB", "TE", "WR-out", "WR-in", "WR-now"]


def load(path):
    with (gzip.open if path.endswith(".gz") else open)(path, "rt") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def classify(p, r):
    g = p["players"][r]["group"]
    if g in ("RB", "TE"):
        return g
    if g != "WR":
        return None
    ev, xy, dt, by = p["events"], p["xy"], p.get("dt", 0.1), p.get("ball_y", 26.65)
    if abs(xy[0][2 * r + 1] - by) <= 3.5:
        return None
    t_end = ev.get("pass_arrived", ev.get("catch"))
    if t_end is None:
        return None
    k = min(len(xy) - 1, int(round(t_end / dt)))
    s = 1 if xy[0][2 * r + 1] > by else -1
    lat = (xy[k][2 * r + 1] - xy[0][2 * r + 1]) * s
    return "WR-out" if lat > 1.5 else "WR-in" if lat < -1.5 else "WR-now"


def measure(p):
    sc = p.get("screen") or {}
    r = sc.get("receiver")
    if r is None:
        return None
    ev = p["events"]
    thrown = "pass_forward" in ev
    if not thrown:
        # Sim only: a called screen never thrown. Classify by the receiver group,
        # and WRs by their called type, since there is no catch to classify by.
        g = p["players"][r]["group"]
        t = {"bubble_screen": "WR-out", "tunnel_screen": "WR-in", "bunch_now_screen": "WR-now", "wide_now_screen": "WR-now"}.get(sc.get("type"), g)
        return {"type": t, "never": 1}
    t = classify(p, r)
    if t is None:
        # A sim WR screen thrown and not caught has no catch to classify by:
        # use its called type. (NFL incompletions classify by pass_arrived.)
        t = {"bubble_screen": "WR-out", "tunnel_screen": "WR-in", "bunch_now_screen": "WR-now", "wide_now_screen": "WR-now"}.get(sc.get("type"))
    if t is None:
        return None
    xy, dt, by = p["xy"], p.get("dt", 0.1), p.get("ball_y", 26.65)
    P = lambda k, j: xy[max(0, min(len(xy) - 1, k))][2 * j: 2 * j + 2]
    k = lambda t_: int(round(t_ / dt))
    pl = p["players"]
    OL = [j for j, x in enumerate(pl) if x["group"] == "OL"]
    DL = [j for j, x in enumerate(pl) if x["side"] == "D" and x["group"] == "DL"]
    D = [j for j, x in enumerate(pl) if x["side"] == "D"]
    O = [j for j, x in enumerate(pl) if x["side"] == "O" and j != r]
    tt = ev["pass_forward"]
    kt = k(tt)
    caught = "catch" in ev
    row = {"type": t, "never": 0, "caught": 1 if caught else 0, "t_throw": tt,
           "rcv_depth_throw": P(kt, r)[0]}
    if DL:
        row["dl_throw"] = min(math.dist(P(kt, r), P(kt, j)) for j in DL)
    s = 1 if xy[0][2 * r + 1] > by else -1
    if t in ("RB", "TE"):
        for kk in range(len(xy)):
            if (xy[kk][2 * r + 1] - xy[0][2 * r + 1]) * s > 1.0:
                row["rcv_release"] = kk * dt
                break
    # The ball at the receiver. NFL `catch` is pass_outcome_caught, ~0.3 s
    # later; the sim's catch is possession, which matches pass_arrived.
    tc = ev.get("pass_arrived", ev.get("catch"))
    horizon = (tc if tc is not None else tt + 1.0) + 1.5
    released = [j for j in OL if any(P(kk, j)[0] > 1.0 for kk in range(0, min(len(xy), k(horizon) + 1)))]
    row["ol_released"] = len(released)
    if released:
        depths = sorted(P(kt, j)[0] for j in released)
        row["ol_depth_throw"] = depths[len(depths) // 2]
        cross = [next((kk * dt for kk in range(len(xy)) if P(kk, j)[0] > 0), None) for j in released]
        cross = [c for c in cross if c is not None]
        if cross:
            row["ol_cross_rel"] = min(cross) - tt
    if not caught:
        return row
    kc = k(tc)
    row["flight"] = tc - tt
    cx, cy = P(kc, r)
    row["catch_depth"] = cx
    row["catch_width"] = abs(cy - by)

    def ahead(j):
        x, y = P(kc, j)
        return x > cx - 0.5 and abs(y - cy) <= 6 and math.dist((x, y), (cx, cy)) <= 10
    row["ol_front"] = sum(1 for j in OL if ahead(j))
    row["blk_front"] = sum(1 for j in O if ahead(j))
    row["near_def_catch"] = min(math.dist((cx, cy), P(kc, j)) for j in D)
    for kk in range(kc, len(xy)):
        if min(math.dist(P(kk, r), P(kk, j)) for j in D) < 1.0:
            row["first_def_t"] = (kk - kc) * dt
            row["first_def_gain"] = P(kk, r)[0] - cx
            break
    row["yards"] = p.get("yards")
    row["yac"] = P(len(xy) - 1, r)[0] - cx if p.get("carrier") in (None, r) else None
    return row


def pct(v, f):
    v = sorted(x for x in v if x is not None)
    if not v:
        return None
    return v[min(len(v) - 1, max(0, int(f * len(v))))]


ROWS = [
    ("thrown -> caught", "caught", "rate"),
    ("never thrown", "never", "rate"),
    ("throw time (s)", "t_throw", "q"),
    ("flight (s)", "flight", "q"),
    ("catch depth (yd)", "catch_depth", "q"),
    ("catch width (yd)", "catch_width", "q"),
    ("receiver depth at throw", "rcv_depth_throw", "q"),
    ("receiver release (s)", "rcv_release", "q"),
    ("OL released / play", "ol_released", "q"),
    ("OL depth at throw (yd)", "ol_depth_throw", "q"),
    ("first OL past LOS - throw (s)", "ol_cross_rel", "q"),
    ("OL in front at catch", "ol_front", "q"),
    ("blockers in front at catch", "blk_front", "q"),
    ("nearest DL at throw (yd)", "dl_throw", "q"),
    ("nearest defender at catch (yd)", "near_def_catch", "q"),
    ("first defender: time after catch (s)", "first_def_t", "q"),
    ("first defender: carrier gain (yd)", "first_def_gain", "q"),
    ("yards (caught)", "yards", "q"),
    ("YAC (yd)", "yac", "q"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nfl")
    ap.add_argument("sim")
    a = ap.parse_args()
    data = {}
    for name, path in (("nfl", a.nfl), ("sim", a.sim)):
        g = collections.defaultdict(list)
        for p in load(path):
            m = measure(p)
            if m:
                g[m["type"]].append(m)
        data[name] = g
    flags = collections.Counter()
    for t in TYPES:
        N, S = data["nfl"].get(t, []), data["sim"].get(t, [])
        if not S:
            continue
        print(f"\n== {t}: NFL {len(N)} plays, sim {len(S)} plays")
        print(f"  {'':38s} {'NFL p25/p50/p75':>20s} {'sim p50':>9s}")
        for label, key, kind in ROWS:
            if kind == "rate":
                if key == "never":
                    sv = [x["never"] for x in S]
                    print(f"  {label:38s} {'(all thrown)':>20s} {sum(sv)/len(sv):9.0%}")
                    continue
                nv = [x[key] for x in N if not x["never"]]
                sv = [x[key] for x in S if not x["never"]]
                if not nv or not sv:
                    continue
                nr, sr = sum(nv) / len(nv), sum(sv) / len(sv)
                f = "!!" if abs(sr - nr) > 0.15 else "!" if abs(sr - nr) > 0.07 else ""
                flags[f] += bool(f)
                print(f"  {label:38s} {nr:20.0%} {sr:9.0%} {f}")
                continue
            nv = [x.get(key) for x in N if x.get(key) is not None]
            sv = [x.get(key) for x in S if x.get(key) is not None]
            if len(nv) < 5 or len(sv) < 3:
                continue
            p10, p25, p50, p75, p90 = (pct(nv, f) for f in (0.1, 0.25, 0.5, 0.75, 0.9))
            sm = pct(sv, 0.5)
            f = "!!" if sm < p10 or sm > p90 else "!" if sm < p25 or sm > p75 else ""
            if f:
                flags[f] += 1
            print(f"  {label:38s} {p25:6.2f}/{p50:6.2f}/{p75:6.2f} {sm:9.2f} {f}")
    print(f"\nflags: ! {flags['!']}  !! {flags['!!']}  (rates: ! > 7 points, !! > 15 points from NFL)")


if __name__ == "__main__":
    sys.exit(main())
