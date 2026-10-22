"""The first second of NFL pass protection: how offensive linemen set, how
line rushers close, and when and where each rusher first meets a listed
blocker (Big Data Bowl 2025 tracking, 2022 weeks 1-9). Aggregates only: no
game, play or player identifiers are written.

  python3 -I scripts/data/bdb2025_pass_set_contact.py <bdb2025 dir> <out.json>

Cohort: as bdb2025_pocket_push.py, TRADITIONAL dropbacks only (not
nullified, no spike or kneel), split by play action and by shotgun (QB 2.5+
yd deep at the snap) vs under center.

Geometry, in yards: depth = (LOS x - x) toward the offense's own end zone,
so positive is behind the line (LOS = the football's x at the snap); a
rusher with depth >= 0 has crossed the line. Distances are between tracking
centers at 10 Hz. Times are from the tracked snap frame (the ball_snap
event), which reads about 0.1 s after the true snap (docs/reviews/presnap.md
on claude/run-game-v3: 56-63% of linemen are already moving in its first
0.1 s), so each time is also given relative to the play's line start: the
median first-movement time (0.15 yd from the snap position, interpolated)
of the five offensive linemen, which cancels the frame offset.

Line rushers: wasInitialPassRusher, on the defense's side within 2.0 yd of
the LOS at the snap (torso not past the ball's x) and moving under 1.0 yd/s
at the snap (stems and pre-snap movement counted and left out). Interior: roster DT/NT or lined up
between the tackles; edge otherwise, if within 4 yd outside a tackle.
Listed blockers: offensive players who list him in blockedPlayerNFLId1-3.
Contact: the first frame his nearest listed blocker is within 1.0 yd
(also 1.25 yd), searched until the play's end (throw, sack, scramble,
fumble) or 3.0 s; plays that end first are counted as censored.
OL set: each roster T/G/C, retreat (depth gained since the snap) and
outward lateral (away from the center's snap position) at each slice.
"""
import csv
import glob
import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from multiprocessing import Pool

D, OUT = sys.argv[1], sys.argv[2]
SLICES = (1, 2, 3, 4, 5, 7, 10, 15, 20)  # tenths of a second after the snap
STORE = 30
CONTACT, LOOSE = 1.0, 1.25
OL_POS = {"T", "G", "C"}
ENDS = {"pass_forward": "throw", "pass_shovel": "throw", "qb_sack": "sack", "qb_strip_sack": "sack", "run": "scramble", "fumble": "fumble"}
TRICK = {"handoff", "lateral", "snap_direct"}


def yes(v):
    return v in ("1", "TRUE")


pos = {}
with open(f"{D}/players.csv", newline="") as f:
    for r in csv.DictReader(f):
        pos[r["nflId"]] = r["position"]

filt = Counter()
plays = {}
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["isDropback"] != "TRUE":
            continue
        filt["dropbacks"] += 1
        if r["playNullifiedByPenalty"] == "Y":
            filt["nullified"] += 1
            continue
        if r["qbSpike"] == "TRUE" or r["qbKneel"] not in ("0", "FALSE", "NA", ""):
            filt["spikeOrKneel"] += 1
            continue
        if r["dropbackType"] != "TRADITIONAL":
            filt["droppedType:" + r["dropbackType"]] += 1
            continue
        filt["kept"] += 1
        plays[(r["gameId"], r["playId"])] = {"off": r["possessionTeam"], "def": r["defensiveTeam"], "pa": r["playAction"] == "TRUE", "los": float(r["absoluteYardlineNumber"])}

pp = defaultdict(lambda: {"passer": None, "rushers": set(), "blockers": defaultdict(set), "ngs": {}})
with open(f"{D}/player_play.csv", newline="") as f:
    for r in csv.DictReader(f):
        k = (r["gameId"], r["playId"])
        if k not in plays:
            continue
        q = pp[k]
        i = r["nflId"]
        if yes(r["hadDropback"]):
            q["passer"] = i
        if yes(r["wasInitialPassRusher"]):
            q["rushers"].add(i)
            if r["getOffTimeAsPassRusher"] != "NA":
                q["ngs"][i] = float(r["getOffTimeAsPassRusher"])
        for n in (1, 2, 3):
            b = r[f"blockedPlayerNFLId{n}"]
            if b != "NA":
                q["blockers"][b].add(i)
pp = dict(pp)
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])


def first_move(track, s, thr=0.15):
    x0 = track.get(s)
    if x0 is None:
        return None
    prev = 0.0
    for f in range(s + 1, s + STORE + 1):
        pt = track.get(f)
        if pt is None:
            return None
        d = dist(pt, x0)
        if d >= thr:
            return (f - 1 - s + (thr - prev) / max(d - prev, 1e-9)) / 10
        prev = d
    return None


def process(k, P, S, club, events, direction, V, C):
    p = plays[k]
    cohorts = ("all", "pa" if p["pa"] else "noPA")
    s = min((f for f, e in events if e == "ball_snap"), default=None)

    def bad(why):
        C["excluded:" + why] += 1

    if s is None:
        return bad("noSnap")
    after = sorted((f, e) for f, e in events if f >= s)
    end = next(((f, ENDS[e]) for f, e in after if e in ENDS), None)
    endF = end[0] if end else None
    if any(e in TRICK and (endF is None or f < endF) for f, e in after):
        return bad("handoffLateralOrDirectSnap")
    q = pp.get(k, {"passer": None, "rushers": set(), "blockers": {}, "ngs": {}})
    off = [i for i, c in club.items() if c == p["off"]]
    qb = q["passer"] if q["passer"] in P else next((i for i in off if pos.get(i) == "QB"), None)
    if qb is None or s not in P[qb]:
        return bad("noQB")
    ol = [i for i in off if pos.get(i) in OL_POS and s in P[i]]
    if len(ol) != 5:
        return bad("not5OL")
    sign = 1 if direction == "right" else -1
    los = P["ball"][s][0] if s in P.get("ball", {}) else p["los"]
    dep = lambda pt: (los - pt[0]) * sign
    ol.sort(key=lambda i: P[i][s][1])
    ylo, yhi = P[ol[0]][s][1], P[ol[-1]][s][1]
    cy = P[ol[2]][s][1]
    gun = dep(P[qb][s]) >= 2.5
    cohorts += ("gun" if gun else "under",)
    starts = [first_move(P[i], s) for i in ol]
    lineStart = sorted(starts)[2] if all(v is not None for v in starts) else None
    liveEnd = min(endF, s + STORE + 1) if endF is not None else s + STORE + 1
    for c in cohorts:
        C[c + ":plays"] += 1
        C[c + ":lineStartKnown"] += lineStart is not None
        if lineStart is not None:
            V[(c, "lineStart")].append(lineStart)

    # OL set by position.
    for i in ol:
        x0 = P[i][s]
        out = 1 if x0[1] >= cy else -1
        key = pos[i] if pos[i] != "C" else "C"
        for t10 in SLICES:
            f = s + t10
            if f >= liveEnd or f not in P[i]:
                continue
            pt = P[i][f]
            for c in cohorts:
                V[(c, f"olRetreat:{key}", t10)].append(dep(pt) - dep(x0))
                if key != "C":
                    V[(c, f"olOutward:{key}", t10)].append((pt[1] - x0[1]) * out)
                V[(c, f"olSpeed:{key}", t10)].append(S[i].get(f, float("nan")))

    blk = q["blockers"]
    for d in q["rushers"]:
        if d not in P or s not in P[d] or club.get(d) != p["def"]:
            continue
        d0 = P[d][s]
        if dep(d0) < -2.0:
            continue
        if dep(d0) >= 0:
            C["rushersPastBallAtSnap"] += 1
            continue
        y = d0[1]
        if pos.get(d) in ("DT", "NT") or ylo < y < yhi:
            g = "interior"
        elif ylo - 4 <= y <= yhi + 4:
            g = "edge"
        else:
            continue
        if S[d].get(s, 0.0) >= 1.0:
            for c in cohorts:
                C[f"{c}:{g}:movingAtSnap"] += 1
            continue
        bl = [b for b in blk.get(d, ()) if b in P and s in P[b] and club.get(b) == p["off"]]
        for c in cohorts:
            C[f"{c}:{g}:rushers"] += 1
            C[f"{c}:{g}:listedBlockers{min(len(bl), 2)}"] += 1
        # Closure and depth at slices.
        for t10 in SLICES:
            f = s + t10
            if f >= liveEnd or f not in P[d]:
                continue
            for c in cohorts:
                V[(c, f"rusherDepth:{g}", t10)].append(dep(P[d][f]))
                V[(c, f"rusherSpeed:{g}", t10)].append(S[d].get(f, float("nan")))
            bf = [b for b in bl if f in P[b]]
            if bf:
                m = min(dist(P[b][f], P[d][f]) for b in bf)
                for c in cohorts:
                    V[(c, f"sepToListedBlocker:{g}", t10)].append(m)
        # Get-off: first crossing of the LOS (interpolated), until the end or 3 s.
        cross = None
        prev = dep(d0)
        for f in range(s + 1, liveEnd):
            if f not in P[d]:
                break
            dd = dep(P[d][f])
            if dd >= 0:
                cross = (f - 1 - s + (0 - prev) / max(dd - prev, 1e-9)) / 10
                break
            prev = dd
        for c in cohorts:
            if cross is not None:
                V[(c, f"crossLOS:{g}")].append(cross)
                if lineStart is not None:
                    V[(c, f"crossLOSMinusLineStart:{g}")].append(cross - lineStart)
                if d in q["ngs"]:
                    V[(c, f"crossLOSMinusNGSGetOff:{g}")].append(cross - q["ngs"][d])
            else:
                C[f"{c}:{g}:notCrossedBeforeEnd"] += 1
                C[f"{c}:{g}:notCrossed:{'censored' if endF is not None and endF < s + STORE + 1 else 'by3s'}"] += 1
        if not bl:
            for c in cohorts:
                C[f"{c}:{g}:noListedBlocker"] += 1
            continue
        sep0 = min(dist(P[b][s], d0) for b in bl)
        for c in cohorts:
            V[(c, f"sepAtSnap:{g}")].append(sep0)
        hit = {}
        mins = []
        for f in range(s, liveEnd):
            bf = [b for b in bl if f in P[b]]
            if f not in P[d] or not bf:
                break
            b, m = min(((b, dist(P[b][f], P[d][f])) for b in bf), key=lambda z: z[1])
            mins.append(m)
            for thr, name in ((CONTACT, "contact"), (LOOSE, "within1.25")):
                if name not in hit and m <= thr:
                    hit[name] = (f, b)
        for c in cohorts:
            if mins:
                V[(c, f"minSepFirst1.5s:{g}")].append(min(mins[:16]))
        for name in ("contact", "within1.25"):
            if name not in hit:
                for c in cohorts:
                    C[f"{c}:{g}:{name}:none:{'censored' if endF is not None and endF < s + STORE + 1 else 'by3s'}"] += 1
                continue
            f, b = hit[name]
            t = (f - s) / 10
            for c in cohorts:
                C[f"{c}:{g}:{name}:found"] += 1
                C[f"{c}:{g}:{name}:{'atSnap' if f == s else 'after'}"] += 1
                V[(c, f"{name}Time:{g}")].append(t)
                if lineStart is not None:
                    V[(c, f"{name}MinusLineStart:{g}")].append(t - lineStart)
                V[(c, f"{name}RusherDepth:{g}")].append(dep(P[d][f]))
                V[(c, f"{name}BlockerDepth:{g}")].append(dep(P[b][f]))
                V[(c, f"{name}BlockerRetreat:{g}")].append(dep(P[b][f]) - dep(P[b][s]))
                V[(c, f"{name}RusherTravel:{g}")].append(dist(P[d][f], d0))
                C[f"{c}:{g}:{name}:rusherCrossedFirst"] += dep(P[d][f]) >= 0
                C[f"{c}:{g}:{name}:blockerByPos:{pos.get(b)}"] += 1


def week(path):
    V, C = defaultdict(list), Counter()
    with open(path, newline="") as fh:
        header = next(csv.reader([fh.readline()]))
        col = {name: i for i, name in enumerate(header)}
        cur, buf, snap = None, None, None
        for line in fh:
            g, pl, _ = line.split(",", 2)
            k = (g, pl)
            if k != cur:
                if buf is not None:
                    process(cur, *buf, V, C)
                cur = k
                # positions, speeds, club, events, direction; snap frame kept separately
                buf = [defaultdict(dict), defaultdict(dict), {}, set(), None] if k in plays else None
                snap = None
            if buf is None or "BEFORE_SNAP" in line:
                continue
            r = next(csv.reader([line]))
            fid = int(r[col["frameId"]])
            ev = r[col["event"]]
            if ev != "NA":
                buf[3].add((fid, ev))
                if ev == "ball_snap" and snap is None:
                    snap = fid
            if snap is not None and fid > snap + STORE:
                continue
            xy = (float(r[col["x"]]), float(r[col["y"]]))
            n = r[col["nflId"]]
            if n == "NA":
                buf[0]["ball"][fid] = xy
                continue
            buf[0][n][fid] = xy
            buf[1][n][fid] = float(r[col["s"]])
            buf[2][n] = r[col["club"]]
            buf[4] = r[col["playDirection"]]
        if buf is not None:
            process(cur, *buf, V, C)
    return dict(V), C


def qt(s, p):
    i = p * (len(s) - 1)
    lo = int(i)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (i - lo)


def summ(v):
    s = sorted(x for x in v if x == x)
    if not s:
        return {"n": 0}
    return {"n": len(s), "mean": round(statistics.mean(s), 3), **{f"p{int(p * 100)}": round(qt(s, p), 3) for p in (0.1, 0.25, 0.5, 0.75, 0.9)}}


if __name__ == "__main__":
    V, C = defaultdict(list), Counter()
    with Pool(4) as pool:
        for v, c in pool.imap_unordered(week, sorted(glob.glob(f"{D}/tracking_week_*.csv"))):
            for key, x in v.items():
                V[key].extend(x)
            C.update(c)
    out = {"source": "Big Data Bowl 2025 tracking, 2022 weeks 1-9; aggregates only", "playFilter": dict(filt), "counts": dict(sorted(C.items())), "values": {}}
    for key in sorted(V, key=str):
        name = ":".join(str(x) for x in key[:2]) + (f"@{key[2] / 10:.1f}s" if len(key) > 2 else "")
        out["values"][name] = summ(V[key])
    with open(OUT, "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote", OUT)
