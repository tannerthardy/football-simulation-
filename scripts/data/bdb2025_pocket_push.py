"""How NFL pockets get pushed and collapse (Big Data Bowl 2025 tracking,
2022 season, the tracking weeks present). Aggregates only: no game, play or
player identifiers are written.

  python3 -I scripts/data/bdb2025_pocket_push.py <bdb2025 dir> <out.json>

Cohort: dropbacks (isDropback), not nullified, no spike or kneel, and
dropbackType TRADITIONAL (scrambles and designed rollouts left out), with
tracking. Sensitivity cohorts: TRADITIONAL without play action, and
TRADITIONAL plus the SCRAMBLE* dropback types.

Window: from the snap until the first pass_forward / pass_shovel (throw),
qb_sack / qb_strip_sack (sack), run (scramble) or fumble, capped at 4.5 s.
Time slices: a play is live at t if that event has not happened by snap + t
(strictly). Whole-play proximity scans every frame from 0.5 s up to and
including the event frame (as bdb2025_pocket.py), capped at 4.5 s. Plays
with a handoff, lateral or direct snap before the end are dropped.

Geometry, in yards: depth = (LOS x - x) toward the offense's own end zone,
so positive is behind the line (LOS = the football's x at the snap).
Distances are between tracking centers at 10 Hz. Rushers:
wasInitialPassRusher. A defender's blockers: offensive players who list him
in blockedPlayerNFLId1-3. Attached: a listed blocker within 1.5 yd of him
(also reported at 1.0 yd); detached: has a listed blocker, none within 1.5
yd (not yet engaged, or beaten/shed); unblocked: no listed blocker. Free =
detached + unblocked. Tackles: the two outermost OL (roster T/G/C) by
lateral position at the snap. Interior rusher: roster DT/NT or lined up
between the tackles at the snap; other rushers are edge rushers. Interior
push uses interior rushers on the line (within 2 yd of the LOS at the snap)
and, for each, his nearest listed blocker at that moment. 2-yd proximity: any
defender within 2 yd of the QB (the passer, hadDropback).
"""
import csv
import glob
import json
import math
import statistics
import sys
from collections import Counter, defaultdict

D, OUT = sys.argv[1], sys.argv[2]
SLICES = (5, 10, 15, 20, 25, 30, 35)  # tenths of a second after the snap
CAP = 45
STORE = 100  # frames of positions kept after the snap (uncapped cross-check)
ATTACH, TIGHT = 1.5, 1.0
OL_POS = {"T", "G", "C"}
ENDS = {"pass_forward": "throw", "pass_shovel": "throw", "qb_sack": "sack", "qb_strip_sack": "sack", "run": "scramble", "fumble": "fumble"}
OUTCOMES = ("throw", "sack", "scramble", "fumble")
STATES = ("attached", "detached", "unblocked")
TRICK = {"handoff", "lateral", "snap_direct"}
SCRAMBLE_TYPES = {"SCRAMBLE", "SCRAMBLE_ROLLOUT_LEFT", "SCRAMBLE_ROLLOUT_RIGHT"}


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
        dt = r["dropbackType"]
        if dt != "TRADITIONAL" and dt not in SCRAMBLE_TYPES:
            filt["droppedType:" + dt] += 1
            continue
        filt["kept:" + dt] += 1
        plays[(r["gameId"], r["playId"])] = {
            "off": r["possessionTeam"], "def": r["defensiveTeam"], "type": dt, "pa": r["playAction"] == "TRUE",
            "los": float(r["absoluteYardlineNumber"]), "unblockedPressure": r["unblockedPressure"] == "TRUE",
        }

pp = defaultdict(lambda: {"passer": None, "rushers": set(), "blockers": defaultdict(set), "pff": []})
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
        if r["causedPressure"] == "TRUE":
            ttp = r["timeToPressureAsPassRusher"]
            q["pff"].append((i, float(ttp) if ttp != "NA" else None))
        for n in (1, 2, 3):
            b = r[f"blockedPlayerNFLId{n}"]
            if b != "NA":
                q["blockers"][b].add(i)

COH = ("trad", "tradNoPA", "tradScr")
V = {c: defaultdict(list) for c in COH}
C = {c: Counter() for c in COH}
losSigned = []
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])


def process(k, P, club, events, snapF, ball, direction):
    p = plays[k]
    if p["type"] == "TRADITIONAL":
        cohorts = ("trad", "tradScr") if p["pa"] else ("trad", "tradNoPA", "tradScr")
    else:
        cohorts = ("tradScr",)
    s = min((f for f, e in events if e == "ball_snap"), default=snapF)

    def bad(why):
        for c in cohorts:
            C[c]["excluded:" + why] += 1

    if s is None:
        return bad("noSnap")
    after = sorted((f, e) for f, e in events if f >= s)
    end = next(((f, ENDS[e]) for f, e in after if e in ENDS), None)
    endF = end[0] if end else None
    if any(e in TRICK and (endF is None or f < endF) for f, e in after):
        return bad("handoffLateralOrDirectSnap")
    q = pp[k]
    off = [i for i, c in club.items() if c == p["off"]]
    dfn = [i for i, c in club.items() if c == p["def"]]
    qb = q["passer"] if q["passer"] in P else next((i for i in off if pos.get(i) == "QB"), None)
    if qb is None or s not in P[qb]:
        return bad("noQB")
    ol = [i for i in off if pos.get(i) in OL_POS and s in P[i]]
    if len(ol) < 5:
        return bad("fewerThan5OL")
    sign = 1 if direction == "right" else -1
    if s in ball:
        los = ball[s][0]
        losSigned.append((p["los"] - los) * sign)
    else:
        los = p["los"]
    dep = lambda pt: (los - pt[0]) * sign
    ol.sort(key=lambda i: P[i][s][1])
    tk = (ol[0], ol[-1])
    ylo, yhi = P[tk[0]][s][1], P[tk[1]][s][1]
    rushers = [i for i in q["rushers"] if i in P and s in P[i] and club.get(i) == p["def"]]
    group = {i: "interior" if pos.get(i) in ("DT", "NT") or ylo < P[i][s][1] < yhi else "edge" for i in rushers}
    onLine = {i for i in rushers if group[i] == "interior" and dep(P[i][s]) >= -2.0}
    blk = {d: [b for b in q["blockers"].get(d, ()) if b in P and club.get(b) == p["off"]] for d in dfn}
    others = [i for i in off if i != qb]
    gun = dep(P[qb][s]) >= 2.5
    liveEnd = min(endF, s + CAP + 1) if endF is not None else s + CAP + 1  # slices: f < liveEnd
    scanEnd = min(endF + 1, s + CAP + 1) if endF is not None else s + CAP + 1  # whole play, end frame included

    def status(d, f):
        """(state, nearest listed blocker separation or None)."""
        if not blk[d]:
            return "unblocked", None
        sep = [dist(P[b][f], P[d][f]) for b in blk[d] if f in P[b]]
        if not sep:  # listed blocker not tracked at this frame (rare)
            return "detached", None
        m = min(sep)
        return ("attached" if m <= ATTACH else "detached"), m

    def anyOffAttached(d, f):
        return any(f in P[o] and dist(P[o][f], P[d][f]) <= ATTACH for o in others)

    def tight(sep):
        return sep is not None and sep <= TIGHT

    for c in cohorts:
        C[c]["plays"] += 1
        C[c]["end:" + (end[1] if end else "none")] += 1
        if endF is not None and endF > s + CAP:
            C[c]["endAfterCap"] += 1
        C[c]["gun" if gun else "under"] += 1

    # Time slices.
    for t10 in SLICES:
        f = s + t10
        if f >= liveEnd or f not in P[qb]:
            continue
        Q = P[qb][f]
        qd = dep(Q)
        row = defaultdict(list)
        cnt = Counter()
        cnt["live"] += 1
        row["qbDepth"].append(qd)
        row["qbDepth:" + ("gun" if gun else "under")].append(qd)
        olf = [i for i in ol if f in P[i]]
        for i in olf:
            row["olDepth:" + pos[i]].append(dep(P[i][f]))
            if pos[i] != "T":
                row["olDepth:interior"].append(dep(P[i][f]))
        live_r = [i for i in rushers if f in P[i]]
        dr = {i: dist(P[i][f], Q) for i in live_r}
        if dr:
            m = min(dr.values())
            row["pocket:qbToNearestRusher"].append(m)
            row["pocket:qbDepthMinusDeepestRusherDepth"].append(qd - max(dep(P[i][f]) for i in live_r))
            for g in ("interior", "edge"):
                gd = [v for i, v in dr.items() if group[i] == g]
                if gd:
                    row[f"pocket:qbToNearest{g.title()}Rusher"].append(min(gd))
            for b in (2, 3, 4):
                cnt[f"nearestRusherWithin{b}"] += m < b
        dd = [dist(P[d][f], Q) for d in dfn if f in P[d]]
        if dd:
            row["pocket:qbToNearestDefender"].append(min(dd))
        for i in live_r:
            row["rusherToQB:" + group[i]].append(dr[i])
            st, sep = status(i, f)
            cnt[f"rusherStatus:{group[i]}:{st}"] += 1
            if i in onLine:
                row["push:rusherDepth"].append(dep(P[i][f]))
                bl = [b for b in blk[i] if f in P[b]]
                if bl:
                    b = min(bl, key=lambda b: dist(P[b][f], P[i][f]))
                    row["push:blockerDepth"].append(dep(P[b][f]))
                    row["push:blockerRetreatSinceSnap"].append(dep(P[b][f]) - dep(P[b][s]))
                    row["push:separation"].append(dist(P[b][f], P[i][f]))
                    cnt["push:attached"] += st == "attached"
                    cnt["push:withBlocker"] += 1
        for b in (2, 3):
            near = [d for d in dfn if f in P[d] and dist(P[d][f], Q) < b]
            cnt[f"playsWithDefenderWithin{b}"] += bool(near)
            for d in near:
                st, sep = status(d, f)
                cnt[f"near{b}:{st}"] += 1
                cnt[f"near{b}:attached1.0"] += tight(sep)
                cnt[f"near{b}:anyOffenseWithin1.5"] += anyOffAttached(d, f)
                cnt[f"near{b}:initialRusher"] += d in q["rushers"]
                cnt[f"near{b}:n"] += 1
        if len(olf) >= 5 and all(f in P[i] for i in tk):
            row["shape:tackleWidth"].append(abs(P[tk[0]][f][1] - P[tk[1]][f][1]))
            mo = statistics.mean(dep(P[i][f]) for i in olf)
            row["shape:meanOLDepth"].append(mo)
            row["shape:qbDepthMinusMeanOLDepth"].append(qd - mo)
            row["shape:qbToNearestOL"].append(min(dist(P[i][f], Q) for i in olf))
        for c in cohorts:
            for key, v in row.items():
                V[c][(key, t10)].extend(v)
            for key, v in cnt.items():
                C[c][(key, t10)] += v

    # Whole play: first frame from 0.5 s with a defender within 2 yd of the QB.
    first = None
    ever = set()
    uncapped = False
    for f in range(s + 5, (endF + 1) if endF is not None else s + STORE + 1):
        if f not in P[qb]:
            continue
        Q = P[qb][f]
        near = sorted((dist(P[d][f], Q), d) for d in dfn if f in P[d] and dist(P[d][f], Q) < 2)
        if not near:
            continue
        uncapped = True
        if f >= scanEnd:
            break
        sts = [status(d, f) for _, d in near]
        ever.update("attached" if x == "attached" else "free" for x, _ in sts)
        if first is None:
            d0 = near[0][1]
            first = (f, sts[0][0], tight(sts[0][1]), any(x == "attached" for x, _ in sts), anyOffAttached(d0, f), d0 in q["rushers"], d0 in group and group[d0])
    for c in cohorts:
        C[c]["within2Uncapped"] += uncapped
        for e in ever:
            C[c][f"everWithin2:{e}"] += 1
        if first is None:
            continue
        f, st, att10, anyAtt, offAtt, isRusher, grp = first
        C[c]["within2"] += 1
        C[c][f"first:{st}"] += 1
        C[c]["first:attached1.0"] += att10
        C[c]["first:anyAttached"] += anyAtt
        C[c]["first:anyOffenseWithin1.5"] += offAtt
        C[c]["first:initialRusher"] += isRusher
        C[c][f"first:group:{grp or 'notInitialRusher'}"] += 1
        V[c][("timeOfFirst", None)].append((f - s) / 10)
        C[c]["first:atOutcomeFrame"] += f == endF
        if endF is None:
            C[c]["first:noOutcome"] += 1
            continue
        for g in {"all", "attached" if st == "attached" else "free", st}:
            V[c][(f"toOutcome:{g}", None)].append((endF - f) / 10)
            C[c][f"outcome:{g}:{end[1]}"] += 1

    # PFF pressures (causedPressure) at timeToPressureAsPassRusher.
    for c in cohorts:
        if q["pff"]:
            C[c]["pff:pressuredPlays"] += 1
            C[c]["pff:unblockedPressureFlag"] += p["unblockedPressure"]
    for d, ttp in q["pff"]:
        if ttp is None or d not in blk:
            continue
        f = s + round(ttp * 10)
        if f not in P[d] or f not in P[qb]:
            continue
        st, sep = status(d, f)
        dq = dist(P[d][f], P[qb][f])
        for c in cohorts:
            C[c][f"pff:{st}"] += 1
            C[c]["pff:attached1.0"] += tight(sep)
            C[c]["pff:anyOffenseWithin1.5"] += anyOffAttached(d, f)
            C[c]["pff:n"] += 1
            C[c]["pff:afterOutcome"] += endF is not None and f > endF
            V[c][("pff:timeToPressure", None)].append(ttp)
            V[c][("pff:distanceToQB:all", None)].append(dq)
            V[c][(f"pff:distanceToQB:{'attached' if st == 'attached' else 'free'}", None)].append(dq)


weeks = sorted(glob.glob(f"{D}/tracking_week_*.csv"))
seen = set()
reentered = 0
for path in weeks:
    with open(path, newline="") as fh:
        header = next(csv.reader([fh.readline()]))
        col = {name: i for i, name in enumerate(header)}
        cur, buf = None, None
        for line in fh:
            g, pl, _ = line.split(",", 2)
            k = (g, pl)
            if k != cur:
                if buf is not None:
                    process(cur, *buf)
                reentered += k in seen
                seen.add(k)
                cur = k
                # positions by player, club by player, events, SNAP frame, ball, direction
                buf = [defaultdict(dict), {}, set(), None, {}, None] if k in plays else None
            if buf is None or "BEFORE_SNAP" in line:
                continue
            r = next(csv.reader([line]))
            fid = int(r[col["frameId"]])
            if r[col["frameType"]] == "SNAP" and buf[3] is None:
                buf[3] = fid
            ev = r[col["event"]]
            if ev != "NA":
                buf[2].add((fid, ev))
            if buf[3] is not None and fid > buf[3] + STORE:
                continue
            xy = (float(r[col["x"]]), float(r[col["y"]]))
            if r[col["nflId"]] == "NA":
                buf[4][fid] = xy
                continue
            buf[0][r[col["nflId"]]][fid] = xy
            buf[1][r[col["nflId"]]] = r[col["club"]]
            buf[5] = r[col["playDirection"]]
        if buf is not None:
            process(cur, *buf)


def qt(s, p):
    i = p * (len(s) - 1)
    lo = int(i)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (i - lo)


def summ(v, tails=False):
    if not v:
        return {"n": 0}
    s = sorted(v)
    out = {"n": len(s), "mean": round(statistics.mean(s), 2), "p25": round(qt(s, 0.25), 2), "median": round(qt(s, 0.5), 2), "p75": round(qt(s, 0.75), 2)}
    if tails:
        out["p10"] = round(qt(s, 0.1), 2)
        out["p90"] = round(qt(s, 0.9), 2)
    return out


pct = lambda a, b: round(100 * a / b, 1) if b else None
T = lambda t10: f"{t10 / 10:.1f}"


def block(c):
    v, n = V[c], C[c]
    N = n["plays"]
    bys = lambda key: {T(t): summ(v[(key, t)]) for t in SLICES}

    def statuses(prefix):
        res = {}
        for t in SLICES:
            tot = sum(n[(f"{prefix}:{s}", t)] for s in STATES)
            res[T(t)] = {"n": tot, **{s + "Pct": pct(n[(f"{prefix}:{s}", t)], tot) for s in STATES}}
        return res

    near = {}
    for b in (2, 3):
        near[f"within{b}yd"] = {}
        for t in SLICES:
            m = n[(f"near{b}:n", t)]
            near[f"within{b}yd"][T(t)] = {
                "playsPctOfLive": pct(n[(f"playsWithDefenderWithin{b}", t)], n[("live", t)]),
                "defenders": m,
                **{s + "Pct": pct(n[(f"near{b}:{s}", t)], m) for s in STATES},
                "freePct": pct(n[(f"near{b}:detached", t)] + n[(f"near{b}:unblocked", t)], m),
                "attachedWithin1.0Pct": pct(n[(f"near{b}:attached1.0", t)], m),
                "anyOffensivePlayerWithin1.5Pct": pct(n[(f"near{b}:anyOffenseWithin1.5", t)], m),
                "initialRusherPct": pct(n[(f"near{b}:initialRusher", t)], m),
            }

    w = n["within2"]
    first = {
        "playsPctOfDropbacks": pct(w, N), "plays": w,
        "playsPctUncapped": pct(n["within2Uncapped"], N),
        "playsPctStrictlyBeforeOutcomeFrame": pct(w - n["first:atOutcomeFrame"], N),
        "firstAtOutcomeFramePct": pct(n["first:atOutcomeFrame"], w),
        "nearestAtFirstMomentPct": {s: pct(n[f"first:{s}"], w) for s in STATES},
        "nearestAttachedWithin1.0Pct": pct(n["first:attached1.0"], w),
        "anyDefenderWithin2AttachedPct": pct(n["first:anyAttached"], w),
        "nearestHasAnyOffensivePlayerWithin1.5Pct": pct(n["first:anyOffenseWithin1.5"], w),
        "nearestByRusherGroupPct": {g: pct(n[f"first:group:{g}"], w) for g in ("edge", "interior", "notInitialRusher")},
        "attachedFirstPressurePctOfDropbacks": pct(n["first:attached"], N),
        "everAttachedWithin2PctOfDropbacks": pct(n["everWithin2:attached"], N),
        "everFreeWithin2PctOfDropbacks": pct(n["everWithin2:free"], N),
        "timeOfFirst": summ(v[("timeOfFirst", None)], True),
        "noOutcomeEvent": n["first:noOutcome"],
        "firstToOutcomeSeconds": {g: summ(v[(f"toOutcome:{g}", None)], True) for g in ("all", "attached", "free") + STATES[1:]},
        "outcomeMixPct": {},
    }
    for g in ("all", "attached", "free") + STATES[1:]:
        tot = sum(n[f"outcome:{g}:{e}"] for e in OUTCOMES)
        first["outcomeMixPct"][g] = {"n": tot, **{e: pct(n[f"outcome:{g}:{e}"], tot) for e in OUTCOMES}}

    return {
        "plays": N,
        "alignment": {"shotgunPistolPct": pct(n["gun"], N), "underCenterPct": pct(n["under"], N)},
        "endEvents": {e: n["end:" + e] for e in OUTCOMES + ("none",)},
        "endAfter4.5s": n["endAfterCap"],
        "excluded": {k.split(":", 1)[1]: x for k, x in n.items() if isinstance(k, str) and k.startswith("excluded:")},
        "liveAtT": {T(t): {"n": n[("live", t)], "pctOfCohort": pct(n[("live", t)], N)} for t in SLICES},
        "qbDepth": {"all": bys("qbDepth"), "shotgunPistol": bys("qbDepth:gun"), "underCenter": bys("qbDepth:under")},
        "olDepth": {g: bys("olDepth:" + g) for g in ("T", "G", "C", "interior")},
        "pocket": {
            **{key: bys("pocket:" + key) for key in ("qbToNearestRusher", "qbToNearestInteriorRusher", "qbToNearestEdgeRusher", "qbToNearestDefender", "qbDepthMinusDeepestRusherDepth")},
            "nearestRusherWithinPctOfLive": {T(t): {f"{b}yd": pct(n[(f"nearestRusherWithin{b}", t)], n[("live", t)]) for b in (2, 3, 4)} for t in SLICES},
        },
        "interiorPush": {
            **{key: bys("push:" + key) for key in ("rusherDepth", "blockerDepth", "blockerRetreatSinceSnap", "separation")},
            "attachedPct": {T(t): pct(n[("push:attached", t)], n[("push:withBlocker", t)]) for t in SLICES},
        },
        "rusherStatus": {g: statuses(f"rusherStatus:{g}") for g in ("edge", "interior")},
        "rusherToQB": {g: bys("rusherToQB:" + g) for g in ("edge", "interior")},
        "nearQB": near,
        "firstWithin2": first,
        "pocketShape": {key: bys("shape:" + key) for key in ("tackleWidth", "meanOLDepth", "qbDepthMinusMeanOLDepth", "qbToNearestOL")},
        "pffPressure": {
            "pressuredPlaysPct": pct(n["pff:pressuredPlays"], N),
            "unblockedPressureFlagPctOfPressured": pct(n["pff:unblockedPressureFlag"], n["pff:pressuredPlays"]),
            "pressuresMeasured": n["pff:n"],
            "afterOutcomeEvent": n["pff:afterOutcome"],
            "statusAtPressurePct": {s: pct(n[f"pff:{s}"], n["pff:n"]) for s in STATES},
            "attachedWithin1.0Pct": pct(n["pff:attached1.0"], n["pff:n"]),
            "anyOffensivePlayerWithin1.5Pct": pct(n["pff:anyOffenseWithin1.5"], n["pff:n"]),
            "timeToPressure": summ(v[("pff:timeToPressure", None)], True),
            "distanceToQB": {g: summ(v[(f"pff:distanceToQB:{g}", None)], True) for g in ("all", "attached", "free")},
        },
    }


main = block("trad")
noPA = block("tradNoPA")
scr = block("tradScr")
out = {
    "source": f"Big Data Bowl 2025 (2022 season) tracking, {len(weeks)} week(s) present; plays.csv, player_play.csv, players.csv",
    "units": "yards and seconds; depth = yards behind the LOS (positive toward the offense's own end zone); t = seconds after the snap",
    "definitions": " ".join(__doc__.split("Window:", 1)[1].split()),
    "caveats": [
        "Slices after ~2 s are survivors: only plays not yet thrown/sacked, a selected subset (n and pctOfCohort in liveAtT).",
        "Distances are between tracking centers (shoulder pads); bodies in contact are ~0.6-1.0 yd apart center to center.",
        "Attached is a geometric proxy (a PFF-listed blocker within 1.5 yd), not a block-state label; blockers listed for chips or double teams count.",
        "OL and blocker depth include the voluntary pass set, not only push; blockerRetreatSinceSnap is retreat for any reason.",
        "Depths are from the football's tracked center at the snap; the play-by-play yard line (absoluteYardlineNumber) sits a median 0.34 yd further downfield (losCheck).",
        "Proximity counts the outcome frame itself (as bdb2025_pocket.py); about a fifth of first 2-yd proximities happen on the throw/sack frame (firstAtOutcomeFramePct), so firstToOutcomeSeconds p10 is 0.",
        "Under-center snaps put the QB within 3 yd of the nose at 0.5 s; whole-play proximity starts at 0.5 s as in bdb2025_pocket.py.",
        "Two regular-season weeks only; play-level dependence (several rushers per play) is not accounted for in the shares.",
    ],
    "cohortFilter": {k: v for k, v in sorted(filt.items())},
    "restriction": "Primary cohort is dropbackType TRADITIONAL only: scrambles (SCRAMBLE, SCRAMBLE_ROLLOUT_*), designed rollouts, designed runs and unknown types are excluded, which removes most pressure-to-scramble plays (see withScrambles).",
    "trackingPlaysOutOfOrder": reentered,
    "losCheck": {"medianBallDepthBehindAbsoluteYardline": round(statistics.median(losSigned), 2), "medianAbsDiff": round(statistics.median(abs(x) for x in losSigned), 2)},
    "traditional": main,
    "sensitivity": {
        "traditionalNoPlayAction": {key: noPA[key] for key in ("plays", "liveAtT", "qbDepth", "olDepth", "pocket", "interiorPush", "rusherStatus", "nearQB", "firstWithin2", "pocketShape")},
        "withScrambles": {key: scr[key] for key in ("plays", "endEvents", "liveAtT", "nearQB", "firstWithin2", "pffPressure")},
    },
}
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps({"plays": main["plays"], "excluded": main["excluded"], "endEvents": main["endEvents"], "losCheck": out["losCheck"]}, indent=1))
