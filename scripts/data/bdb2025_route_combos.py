"""How NFL offenses combine routes side by side on dropbacks (Big Data Bowl
2025: 2022 weeks 1-9 play data, positions from the tracking weeks present).

At the snap frame (frameType SNAP) each offensive player who ran a route
(player_play wasRunningRoute) is placed left or right of the football from the
quarterback's view (playDirection accounted for) and numbered from the outside
in (#1 = widest). A route runner more than 2 yd behind the ball and within 3 yd
of it laterally, or an RB/FB within 8 yd laterally, is a back ("B"), not a side
receiver. A side is the tuple of routeRan values from #1 inward; the side with
more receivers is "strong", and equal sides are put in alphabetical order.

Reports side tuples by size, full-play pairings, back routes, what the other
side runs opposite common tuples, how concentrated the combinations are, the
mirrored share, routes by receiver number, formation and play-action splits,
and conservative concept names (rules in the output). The route vocabulary and
the RB/FB route mix also use every week of player_play.csv. Cohort: dropbacks,
not nullified, no spikes or kneels. Aggregates only: no game, play or player
identifiers.

  python3 -I scripts/data/bdb2025_route_combos.py <bdb2025 dir> <out.json>
"""
import csv
import glob
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

BACK_DEPTH, BACK_LATERAL, RB_LATERAL = 2.0, 3.0, 8.0

# BDB 2025 routeRan has 12 labels. HITCH covers hitches, curls and sticks; IN
# covers digs and square-ins; CROSS covers shallows, drags and overs; ANGLE is
# a back's angle/Texas route. Names below are given only for exact side tuples
# (#1 widest first) whose route content defines the concept; depth is not in
# the labels, so e.g. a quick out and a deep out are both OUT.
NAMES = {
    ("HITCH", "CORNER"): "Smash",
    ("HITCH", "FLAT"): "Curl-flat",
    ("SLANT", "FLAT"): "Slant-flat",
    ("CORNER", "FLAT"): "Corner-flat",
    ("GO", "FLAT"): "Go-flat",
    ("GO", "OUT"): "Go-out (2-man Sail family)",
    ("GO", "GO"): "Double go (verticals)",
    ("HITCH", "GO"): "Hitch-seam (Hoss)",
    ("GO", "HITCH"): "Go-stick (clear + hitch/stick)",
    ("IN", "GO"): "Dagger (dig under seam)",
    ("POST", "IN"): "Post-dig (Mills family)",
    ("IN", "POST"): "Post-dig (Mills family)",
    ("IN", "CROSS"): "Dig-shallow (Drive family)",
    ("CROSS", "IN"): "Dig-shallow (Drive family)",
    ("HITCH", "HITCH"): "Double hitch (Spacing family)",
    ("SLANT", "SLANT"): "Double slant",
    ("OUT", "OUT"): "Double out",
    ("IN", "IN"): "Double in (Levels family)",
    ("GO", "OUT", "FLAT"): "Sail/Flood (go-out-flat)",
    ("GO", "CORNER", "FLAT"): "Flood (go-corner-flat)",
    ("HITCH", "CORNER", "FLAT"): "Smash-flat (trips)",
    ("GO", "HITCH", "FLAT"): "Stick (go, stick, flat)",
    ("GO", "FLAT", "HITCH"): "Stick (go, flat, stick)",
    ("HITCH", "HITCH", "FLAT"): "Spacing (hitch, hitch, flat)",
    ("HITCH", "HITCH", "HITCH"): "Spacing (triple hitch)",
    ("SLANT", "SLANT", "SLANT"): "Triple slant",
    ("GO", "GO", "GO"): "Trips verticals",
    ("GO", "GO", "GO", "GO"): "Quads verticals",
}
NAME_RULES = [
    "Names apply to exact side tuples ordered from #1 (widest) inward; any other tuple is unnamed (null).",
    "Size 1 sides are named 'Iso <route>' (a label, not a concept). Any side containing SCREEN is 'Screen side'.",
    "HITCH stands for hitch/curl/stick, IN for dig/square-in, CROSS for shallow/drag/over (BDB labels; no depth).",
] + [f"{'-'.join(t)}: {n}" for t, n in NAMES.items()]


def concept(t):
    if not t:
        return None
    if "SCREEN" in t:
        return "Screen side"
    if len(t) == 1:
        return f"Iso {t[0].lower()}"
    return NAMES.get(t)


def dropback(r):
    return (r["isDropback"] == "TRUE" and r["playNullifiedByPenalty"] != "Y" and r["qbSpike"] != "TRUE"
            and r["qbKneel"] in ("0", "FALSE", "NA", ""))


def load(d):
    week = {}
    with open(f"{d}/games.csv", newline="") as f:
        for r in csv.DictReader(f):
            week[r["gameId"]] = int(r["week"])
    position = {}
    with open(f"{d}/players.csv", newline="") as f:
        for r in csv.DictReader(f):
            position[r["nflId"]] = r["position"]
    plays = {}
    with open(f"{d}/plays.csv", newline="") as f:
        for r in csv.DictReader(f):
            if dropback(r):
                plays[(r["gameId"], r["playId"])] = {"pa": r["playAction"] == "TRUE", "align": r["receiverAlignment"],
                                                     "form": r["offenseFormation"], "week": week.get(r["gameId"])}
    routes = defaultdict(dict)
    unlabelled, motion = set(), set()
    with open(f"{d}/player_play.csv", newline="") as f:
        for r in csv.DictReader(f):
            k = (r["gameId"], r["playId"])
            if k in plays and r["wasRunningRoute"] in ("1", "TRUE"):
                if r["routeRan"] in ("NA", ""):
                    unlabelled.add(k)
                routes[k][r["nflId"]] = r["routeRan"]
                if r["inMotionAtBallSnap"] == "TRUE":
                    motion.add((k, r["nflId"]))

    paths = sorted(glob.glob(f"{d}/tracking_week_*.csv"), key=lambda p: int(re.search(r"(\d+)\.csv$", p).group(1)))
    tweeks = [int(re.search(r"(\d+)\.csv$", p).group(1)) for p in paths]
    snaps = {}
    for path in paths:
        with open(path, newline="") as f:
            header = next(csv.reader([f.readline()]))
            col = {k: i for i, k in enumerate(header)}
            for line in f:
                if ',"SNAP",' not in line and ",SNAP," not in line:
                    continue
                g, p, n = (s.strip('"') for s in line.split(",", 3)[:3])
                k = (g, p)
                if k not in routes or (n != "NA" and n not in routes[k]):
                    continue
                r = next(csv.reader([line]))
                frame = int(r[col["frameId"]])
                s = snaps.setdefault(k, {"frame": frame, "dir": r[col["playDirection"]], "ball": None, "xy": {}})
                if frame != s["frame"]:
                    continue
                xy = (float(r[col["x"]]), float(r[col["y"]]))
                if r[col["club"]] == "football":
                    s["ball"] = xy
                else:
                    s["xy"][n] = xy
    return week, position, plays, routes, unlabelled, motion, tweeks, snaps


def classify(snap, runners, position, diag):
    """Sides from the QB's view: lateral > 0 is his left."""
    sign = 1 if snap["dir"] == "right" else -1
    bx, by = snap["ball"]
    left, right, backs = [], [], []
    for n, route in runners.items():
        x, y = snap["xy"][n]
        depth, lat = (bx - x) * sign, (y - by) * sign
        pos = position.get(n, "NA")
        if depth > BACK_DEPTH and (abs(lat) <= BACK_LATERAL or (pos in ("RB", "FB") and abs(lat) <= RB_LATERAL)):
            backs.append((route, pos))
            if pos not in ("RB", "FB"):
                diag["nonRbFbClassedAsBack"] += 1
        else:
            (left if lat >= 0 else right).append((abs(lat), route, pos))
            if pos in ("RB", "FB"):
                diag["rbFbClassedAsSideReceiver"] += 1
            if abs(lat) < 1.0:
                diag["sideReceiverWithin1ydOfBall"] += 1
    left.sort(reverse=True)
    right.sort(reverse=True)
    return left, right, sorted(backs)


def build(d):
    week, position, plays, routes, unlabelled, motion, tweeks, snaps = load(d)
    diag = Counter()
    recs = []
    in_tracking = [k for k, p in plays.items() if p["week"] in tweeks]
    for k in in_tracking:
        if k not in routes:
            diag["noRouteRunners"] += 1
            continue
        if k in unlabelled:
            diag["unlabelledRoute"] += 1
            continue
        s = snaps.get(k)
        if s is None or s["ball"] is None:
            diag["noSnapFrameOrBall"] += 1
            continue
        if any(n not in s["xy"] for n in routes[k]):
            diag["routeRunnerMissingAtSnap"] += 1
            continue
        left, right, backs = classify(s, routes[k], position, diag)
        diag["routeRunners"] += len(routes[k])
        diag["routeRunnersInMotionAtSnap"] += sum((k, nid) in motion for nid in routes[k])
        L, R = tuple(r for _, r, _ in left), tuple(r for _, r, _ in right)
        if len(L) != len(R):
            strong_left = len(L) > len(R)
            strong, weak = (L, R) if strong_left else (R, L)
            sp = [p for _, _, p in (left if strong_left else right)]
            wp = [p for _, _, p in (right if strong_left else left)]
        else:
            strong_left = None
            (strong, sp), (weak, wp) = sorted([(L, [p for _, _, p in left]), (R, [p for _, _, p in right])])
        p = plays[k]
        recs.append({"strong": strong, "weak": weak, "strongPos": sp, "weakPos": wp,
                     "back": tuple(r for r, _ in backs), "backPos": [q for _, q in backs], "strongLeft": strong_left,
                     "pa": p["pa"], "align": p["align"], "form": p["form"]})
    return week, position, plays, routes, tweeks, recs, diag, len(in_tracking)


def share(n, total):
    return round(n / total, 4) if total else None


def key(t):
    return "-".join(t) if t else "(none)"


def tuple_rows(counter, total, k):
    return [{"routes": list(t), "n": n, "share": share(n, total), "concept": concept(t)} for t, n in counter.most_common(k)]


def pair_rows(counter, total, k, back=False):
    out, cum = [], 0
    for pk, n in counter.most_common(k):
        cum += n
        row = {"strong": list(pk[0]), "weak": list(pk[1])}
        if back:
            row["back"] = list(pk[2])
        row.update({"n": n, "share": share(n, total), "cumShare": share(cum, total),
                    "strongConcept": concept(pk[0]), "weakConcept": concept(pk[1])})
        out.append(row)
    return out


def concentration(counter):
    total = sum(counter.values())
    ranked = [n for _, n in counter.most_common()]
    return {"plays": total, "distinct": len(counter),
            "top20Share": share(sum(ranked[:20]), total), "top50Share": share(sum(ranked[:50]), total),
            "top100Share": share(sum(ranked[:100]), total),
            "singletonCombos": sum(1 for n in ranked if n == 1),
            "singletonPlayShare": share(sum(1 for n in ranked if n == 1), total)}


def report(d):
    week, position, plays, routes, tweeks, recs, diag, n_tracking = build(d)
    n = len(recs)

    # Route vocabulary and representativeness, every week (no positions needed).
    vocab_all, vocab_tw, vocab_other = Counter(), Counter(), Counter()
    per_play_tw, per_play_other = [], []
    rbfb_all = Counter()
    for k, rr in routes.items():
        tw = plays[k]["week"] in tweeks
        (per_play_tw if tw else per_play_other).append(len(rr))
        for nid, r in rr.items():
            vocab_all[r] += 1
            (vocab_tw if tw else vocab_other)[r] += 1
            if position.get(nid) in ("RB", "FB"):
                rbfb_all[r] += 1
    tot_tw, tot_other = sum(vocab_tw.values()), sum(vocab_other.values())
    tvd = 0.5 * sum(abs(vocab_tw[r] / tot_tw - vocab_other[r] / tot_other) for r in vocab_all) if tot_tw and tot_other else None

    sides = Counter()
    by_size = defaultdict(Counter)
    pairs, pairs_back = Counter(), Counter()
    opposite = defaultdict(Counter)
    back_routes, back_combo = Counter(), Counter()
    slot_routes, slot_pos = defaultdict(Counter), defaultdict(Counter)
    calc_align, pff_align, form, agree = Counter(), Counter(), Counter(), Counter()
    by_align = defaultdict(Counter)
    pa_sides, nopa_sides, pa_pairs = Counter(), Counter(), Counter()
    concept_side, concept_pairs, named = Counter(), Counter(), Counter()
    tags = Counter()
    strong_left = Counter()
    mirrored = Counter()
    equal_sides = defaultdict(Counter)
    for r in recs:
        s, w = r["strong"], r["weak"]
        a = f"{len(s)}x{len(w)}"
        calc_align[a] += 1
        pff_align[r["align"]] += 1
        form[r["form"]] += 1
        agree[a == r["align"]] += 1
        strong_left[{True: "left", False: "right", None: "equal sides"}[r["strongLeft"]]] += 1
        pairs[(s, w)] += 1
        pairs_back[(s, w, r["back"])] += 1
        by_align[a][(s, w)] += 1
        back_combo[key(r["back"])] += 1
        for b in r["back"]:
            back_routes[b] += 1
            slot_routes["B"][b] += 1
        for b in r["backPos"]:
            slot_pos["B"][b] += 1
        if r["pa"]:
            pa_pairs[(s, w)] += 1
        for t, other, pos in ((s, w, r["strongPos"]), (w, s, r["weakPos"])):
            if not t:
                continue
            sides[t] += 1
            by_size[len(t)][t] += 1
            opposite[t][other] += 1
            (pa_sides if r["pa"] else nopa_sides)[t] += 1
            concept_side[concept(t) or "unnamed"] += 1
            for i, (route, p) in enumerate(zip(t, pos), 1):
                slot_routes[f"#{i}"][route] += 1
                slot_pos[f"#{i}"][p] += 1
        cs, cw = concept(s), concept(w)
        if w:
            named[("neither", "one side", "both sides")[(cs is not None) + (cw is not None)] + " named"] += 1
        else:
            named["one-sided play, " + ("named" if cs else "unnamed")] += 1
        concept_pairs[(cs or "unnamed", cw or ("(none)" if not w else "unnamed"))] += 1
        if s and w:
            mirrored["bothSides"] += 1
            mirrored["exact"] += s == w
            mirrored["sameOutsideRoute"] += s[0] == w[0]
            mirrored["sameConceptName"] += cs is not None and cs == cw
            if len(s) == len(w):
                mirrored["equalSize"] += 1
                mirrored["exactEqualSize"] += s == w
                equal_sides[len(s)][s] += 1
                equal_sides[len(s)][w] += 1
        side_routes = s + w
        cross_sides = ("CROSS" in s) + ("CROSS" in w)
        tags["crossersFromBothSides (Mesh/Drive-like)"] += cross_sides == 2
        tags["3+ GO among side receivers (verticals family)"] += side_routes.count("GO") >= 3
        tags["any SCREEN (incl. back)"] += "SCREEN" in side_routes + r["back"]
        tags["back runs a route"] += bool(r["back"])
        tags["only quick routes (HITCH/SLANT/FLAT/SCREEN/ANGLE/OUT)"] += all(
            x in ("HITCH", "SLANT", "FLAT", "SCREEN", "ANGLE", "OUT") for x in side_routes + r["back"])

    total_sides = sum(sides.values())
    # Exact-mirror rate if the two sides of an equal-size play were drawn independently from that size's side mix.
    independent = sum(sum(c.values()) / 2 * sum((m / sum(c.values())) ** 2 for m in c.values()) for c in equal_sides.values())
    out = {
        "source": f"Big Data Bowl 2025 (NFL 2022): plays/player_play weeks 1-9, tracking week(s) {tweeks} for alignment at the snap",
        "method": {
            "cohort": "isDropback TRUE, not nullified, no spike or kneel, at least one route runner, every route runner and the football present at the snap frame",
            "snap": "frameType SNAP; lateral offset from the football's y, sign flipped for playDirection 'left' so positive is the QB's left",
            "back": f"route runner more than {BACK_DEPTH} yd behind the ball and within {BACK_LATERAL} yd laterally, or RB/FB within {RB_LATERAL} yd laterally",
            "numbering": "side receivers numbered #1 (widest) inward by lateral distance from the ball",
            "strong": "side with more route runners; equal sides (e.g. 2x2) ordered alphabetically by route tuple, so pairings are order-free",
            "alignment": "computed alignment counts route runners only; PFF receiverAlignment also counts non-route eligibles",
        },
        "cohort": {"dropbacksInTrackingWeeks": n_tracking, "plays": n, "excluded": {k: v for k, v in diag.items() if k in (
            "noRouteRunners", "unlabelledRoute", "noSnapFrameOrBall", "routeRunnerMissingAtSnap")},
            "classificationChecks": {k: v for k, v in diag.items() if k in (
                "routeRunners", "routeRunnersInMotionAtSnap", "nonRbFbClassedAsBack", "rbFbClassedAsSideReceiver",
                "sideReceiverWithin1ydOfBall")},
            "playActionShare": share(sum(r["pa"] for r in recs), n),
            "strongSide": dict(strong_left),
            "computedAlignment": {k: {"n": v, "share": share(v, n)} for k, v in calc_align.most_common()},
            "pffReceiverAlignment": {k: {"n": v, "share": share(v, n)} for k, v in pff_align.most_common()},
            "computedMatchesPffAlignment": share(agree[True], n),
            "offenseFormation": {k: {"n": v, "share": share(v, n)} for k, v in form.most_common()}},
        "routeVocabulary": {
            "labels": sorted(vocab_all),
            "allWeeksDropbackRoutes": {r: {"n": c, "share": share(c, sum(vocab_all.values()))} for r, c in vocab_all.most_common()},
            "trackingWeeksShare": {r: share(vocab_tw[r], tot_tw) for r, _ in vocab_all.most_common()},
            "otherWeeksShare": {r: share(vocab_other[r], tot_other) for r, _ in vocab_all.most_common()},
            "routeMixTotalVariationTrackingVsOther": round(tvd, 4) if tvd is not None else None,
            "routeRunnersPerDropback": {"trackingWeeksMean": round(statistics.mean(per_play_tw), 3) if per_play_tw else None,
                                        "otherWeeksMean": round(statistics.mean(per_play_other), 3) if per_play_other else None},
            "notes": NAME_RULES[2],
        },
        "sideTuplesBySize": {str(size): {"sides": sum(c.values()), "shareOfSides": share(sum(c.values()), total_sides),
                                         "distinct": len(c), "top": tuple_rows(c, sum(c.values()), 40)}
                             for size, c in sorted(by_size.items())},
        "pairings": {"note": "strong | weak side tuples, back routes ignored", "top": pair_rows(pairs, n, 80)},
        "pairingsWithBack": {"note": "strong | weak | back route(s)", "top": pair_rows(pairs_back, n, 40, back=True)},
        "backRoutes": {
            "playsWithBackRoute": {"n": sum(1 for r in recs if r["back"]), "share": share(sum(1 for r in recs if r["back"]), n)},
            "perBackRunner": {r: {"n": c, "share": share(c, sum(back_routes.values()))} for r, c in back_routes.most_common()},
            "perPlayCombination": {r: {"n": c, "share": share(c, n)} for r, c in back_combo.most_common(15)},
            "allWeeksRbFbByRosterPosition": {"note": "players.csv RB/FB running routes in every week, including those split out",
                                            "routes": {r: {"n": c, "share": share(c, sum(rbfb_all.values()))} for r, c in rbfb_all.most_common()}},
        },
        "oppositeSide": [{"routes": list(t), "concept": concept(t), "n": c,
                          "opposite": [{"routes": list(o), "n": m, "share": share(m, c), "concept": concept(o)}
                                       for o, m in opposite[t].most_common(5)]}
                         for t, c in sides.most_common(25)],
        "concentration": {"pairings": concentration(pairs), "pairingsWithBack": concentration(pairs_back),
                          "sideTuples": concentration(sides)},
        "mirrored": {"playsWithBothSides": mirrored["bothSides"],
                     "exactSameTupleShareOfBothSides": share(mirrored["exact"], mirrored["bothSides"]),
                     "exactSameTupleShareOfAllPlays": share(mirrored["exact"], n),
                     "equalSizePlays": mirrored["equalSize"],
                     "exactSameTupleShareOfEqualSize": share(mirrored["exactEqualSize"], mirrored["equalSize"]),
                     "expectedShareOfEqualSizeIfSidesIndependent": share(independent, mirrored["equalSize"]),
                     "sameNamedConceptShareOfBothSides": share(mirrored["sameConceptName"], mirrored["bothSides"]),
                     "sameOutsideReceiverRouteShareOfBothSides": share(mirrored["sameOutsideRoute"], mirrored["bothSides"])},
        "routesByReceiverNumber": {
            slot: {"n": sum(c.values()), "routes": {r: share(m, sum(c.values())) for r, m in c.most_common()},
                   "positions": {p: share(m, sum(slot_pos[slot].values())) for p, m in slot_pos[slot].most_common()}}
            for slot, c in sorted(slot_routes.items())},
        "byComputedAlignment": {a: {"n": calc_align[a], "share": share(calc_align[a], n), "top": pair_rows(by_align[a], calc_align[a], 10)}
                                for a, _ in calc_align.most_common() if calc_align[a] >= 100},
        "playAction": {"plays": sum(pa_pairs.values()),
                       "topSideTuplesPlayAction": tuple_rows(pa_sides, sum(pa_sides.values()), 15),
                       "topSideTuplesNoPlayAction": tuple_rows(nopa_sides, sum(nopa_sides.values()), 15),
                       "topPairingsPlayAction": pair_rows(pa_pairs, sum(pa_pairs.values()), 15)},
        "conceptNames": {
            "rules": NAME_RULES,
            "sideShareByConcept": {c: {"n": m, "share": share(m, total_sides)} for c, m in concept_side.most_common()},
            "namedSidesPerPlay": {k: {"n": v, "share": share(v, n)} for k, v in named.most_common()},
            "namedShareOfSidesBySize": {str(size): share(sum(m for t, m in c.items() if concept(t) not in (None, "Screen side")), sum(c.values()))
                                        for size, c in sorted(by_size.items()) if size > 1},
            "topConceptPairings": [{"strong": a, "weak": b, "n": m, "share": share(m, n)} for (a, b), m in concept_pairs.most_common(40)],
        },
        "playLevelTags": {t: {"n": c, "share": share(c, n)} for t, c in tags.items()},
    }
    return out


def main():
    d, path = sys.argv[1], sys.argv[2]
    out = report(d)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({"cohort": {k: out["cohort"][k] for k in ("dropbacksInTrackingWeeks", "plays", "excluded", "classificationChecks")},
                      "vocabulary": out["routeVocabulary"]["labels"], "mirrored": out["mirrored"],
                      "concentration": out["concentration"]}, indent=1))
    for size, v in out["sideTuplesBySize"].items():
        print(f"size {size} ({v['sides']} sides):", "; ".join(f"{key(r['routes'])} {r['share']:.3f}" for r in v["top"][:8]))
    print("top pairings:")
    for r in out["pairings"]["top"][:20]:
        print(f"  {r['n']:4d} {r['share']:.3f}  {key(r['strong'])} | {key(r['weak'])}")


if __name__ == "__main__":
    main()
