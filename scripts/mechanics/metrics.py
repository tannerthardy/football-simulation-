"""Shared mechanism metrics for NFL tracking and simulated plays.

Both adapters (nfl_bdb2025.py and sim-export.ts) write plays in one common
format, and every metric below is computed by the same code on both. That is
the point: a sim-vs-NFL gap can then only come from the football, not from two
different definitions.

Common play format (one JSON object per play):
  id, source           identifiers
  kind                 "run" (designed run) or "pass" (dropback)
  yards                yards gained on the play
  players              [{"side": "O"|"D", "group": QB|RB|WR|TE|OL|DL|LB|DB}]
  dt                   frame spacing in seconds (0.1); frame 0 is the snap
  xy                   per frame, flat [x0, y0, x1, y1, ...]; x is yards past the
                       line of scrimmage in the offense's direction, y across
  ball_y               ball y at the snap
  events               seconds after the snap: handoff, pass_forward,
                       pass_arrived, first_contact, end (whistle or last frame)
  carrier, target      player index or null
  receiver             optional actual catcher index; target remains the throw's
                       intended receiver. Older/NFL plays use target for both.

Positions are compared directly; speeds and accelerations are derived from
positions (quantized to 0.1 yd, as the sim records them) with the same
smoothing on both sides, never from provider speed fields.
"""
import math
from collections import defaultdict
from typing import NamedTuple

GROUPS = ("QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB")
SPEED_HALF = 2        # speed: central difference over +/-0.2 s
ENGAGED_YD = 1.5      # a box defender is "engaged" with an OL this close
PRESSURE_YD = 2.0
PRESSURE_OPERATOR = "sampled-geometric-pressure-v2"


class PressureObservation(NamedTuple):
    frames: range
    first: int | None
    value: float | None
    complete: bool

# Run concepts shared by PFF's labels (NFL) and the sim's schemes. Runs are also
# measured within each family, e.g. "run.handoff_s@outside_zone".
CONCEPT_FAMILY = {
    "INSIDE ZONE": "inside_zone", "insideZone": "inside_zone", "splitZone": "inside_zone",
    "OUTSIDE ZONE": "outside_zone", "outsideZone": "outside_zone", "wideZone": "outside_zone",
    "POWER": "gap_pull", "COUNTER": "gap_pull", "TRAP": "gap_pull", "PULL LEAD": "gap_pull",
    "power": "gap_pull", "counter": "gap_pull", "trap": "gap_pull",
    "MAN": "man_duo", "duo": "man_duo",
    "DRAW": "draw", "draw": "draw",
}


def coverage_family(label):
    """man / zone from PFF (2021-22), NGS (2023) or sim coverage names;
    None for situational or mixed calls (red zone, prevent, split-field)."""
    text = (label or "").lower()
    if text in ("", "na") or any(w in text for w in ("red zone", "goal line", "prevent", "bracket", "misc", "split")):
        return None
    if "man" in text or text.startswith(("cover-0", "cover-1", "cover0", "cover1", "cover_0", "cover_1")):
        return "man"
    return "zone"


class Play:
    def __init__(self, raw):
        self.raw = raw
        self.dt = raw.get("dt", 0.1)
        # The sim records positions to 0.1 yd. Quantize every source the same
        # way so derived speeds and accelerations carry identical noise.
        self.xy = [[None if v is None else round(v, 1) for v in row] for row in raw["xy"]]
        self.n = len(raw["players"])
        self.frames = len(self.xy)
        self.players = raw["players"]
        self.events = raw.get("events", {})
        self.end = self.events.get("end", (self.frames - 1) * self.dt)

    def k(self, t):
        return max(0, min(self.frames - 1, int(round(t / self.dt))))

    def live(self, t):
        # Events can occur between recorded frames. Nearest-frame rounding
        # selects the sample; it must not decide whether the event was live.
        # Require the event itself to be inside both the recording and whistle.
        return 0 <= t <= self.end + 1e-9 and t <= (self.frames - 1) * self.dt + 1e-9

    def pos(self, i, k):
        row = self.xy[k]
        return row[2 * i], row[2 * i + 1]

    def speed(self, i, k):
        a, b = max(0, k - SPEED_HALF), min(self.frames - 1, k + SPEED_HALF)
        (x0, y0), (x1, y1) = self.pos(i, a), self.pos(i, b)
        if b == a or x0 is None or x1 is None:
            return 0.0
        return math.hypot(x1 - x0, y1 - y0) / ((b - a) * self.dt)

    def who(self, side=None, group=None):
        return [i for i, p in enumerate(self.players)
                if (side is None or p["side"] == side) and (group is None or p["group"] == group)]

    def dist(self, i, j, k):
        (xi, yi), (xj, yj) = self.pos(i, k), self.pos(j, k)
        if xi is None or xj is None:
            return math.inf  # one of them is not tracked in this frame
        return math.hypot(xi - xj, yi - yj)

    def box_defenders(self):
        """Defenders aligned on the line inside the box at the snap (an alignment
        proxy, so position labels from either source do not matter)."""
        by = self.raw["ball_y"]
        out = []
        for i in self.who("D"):
            x, y = self.pos(i, 0)
            if -0.5 <= x <= 2.0 and abs(y - by) <= 4.5:
                out.append(i)
        return out

    def box_count(self):
        """Defenders in the box at the snap: within 7 yd of the line and 6.5 yd
        of the ball laterally. Against PFF's defendersInBox on 2021 dropbacks
        this matches exactly on 60% of plays and within one on 96%."""
        by = self.raw["ball_y"]
        return sum(1 for i in self.who("D") if -0.5 <= self.pos(i, 0)[0] <= 7.0 and abs(self.pos(i, 0)[1] - by) <= 6.5)

    def velocity(self, i, k):
        a, b = max(0, k - SPEED_HALF), min(self.frames - 1, k + SPEED_HALF)
        (x0, y0), (x1, y1) = self.pos(i, a), self.pos(i, b)
        if b == a or x0 is None or x1 is None:
            return 0.0, 0.0
        return (x1 - x0) / ((b - a) * self.dt), (y1 - y0) / ((b - a) * self.dt)

    def nearest(self, i, k, side="D"):
        found = min((self.dist(d, i, k) for d in self.who(side)), default=math.inf)
        return found if math.isfinite(found) else None

    def pressure(self, qb):
        """Sampled geometric pressure, v2; see docs/reviews/pressure-measurement.md.

        Admit actual sample times in [0.5, min(release, whistle)], or through
        min(4 s, end) without a release. Never round or clamp those bounds to
        a neighboring frame. Unknown coverage cannot establish a negative;
        an observed positive survives missing samples and recording cutoffs.
        """
        throw = self.events.get("pass_forward")
        end = min(self.end, throw if throw is not None else 4.0)
        start = max(0, math.ceil((0.5 - 1e-9) / self.dt))
        stop = math.floor((end + 1e-9) / self.dt) + 1
        frames = range(start, min(self.frames, stop))
        defenders = self.who("D")
        complete = bool(frames) and bool(defenders) and stop <= self.frames
        first = None
        for k in frames:
            qpos = self.pos(qb, k)
            for d in defenders:
                coords = (*qpos, *self.pos(d, k))
                if not all(v is not None and math.isfinite(v) for v in coords):
                    complete = False
                    continue
                if math.hypot(coords[0] - coords[2], coords[1] - coords[3]) <= PRESSURE_YD:
                    if first is None:
                        first = k
        value = 1.0 if first is not None else 0.0 if complete else None
        return PressureObservation(frames, first, value, complete)


def run_metrics(p, out):
    ev = p.events
    c = p.raw.get("carrier")
    if c is None or p.players[c]["group"] != "RB" or "handoff" not in ev:
        return False
    out["run.handoff_s"].append(ev["handoff"])
    contact = ev.get("first_contact")
    stop = contact if contact is not None else p.end
    cross = next((k * p.dt for k in range(p.k(ev["handoff"]), p.k(stop) + 1)
                  if p.pos(c, k)[0] > 0), None)
    if cross is not None:
        out["run.carrier_cross_los_s"].append(cross)
    if contact is not None:
        ybc = p.pos(c, p.k(contact))[0]
        out["run.first_contact_s"].append(contact)
        out["run.yards_before_contact"].append(ybc)
        out["run.yards_after_contact"].append(p.raw["yards"] - ybc)
    out["run.carrier_peak_speed_before_contact"].append(
        max(p.speed(c, k) for k in range(p.k(ev["handoff"]), p.k(stop) + 1)))
    out["run.yards"].append(p.raw["yards"])
    out["run.defenders_within_2yd_at_end"].append(
        sum(1 for d in p.who("D") if p.dist(d, c, p.k(p.end)) <= 2.0))
    contact_metrics(p, out, "run", c, contact)
    block_metrics(p, out, "run")
    ol = p.who("O", "OL")
    box = p.box_defenders()
    for t in (1.0, 2.0, 3.0):
        if not p.live(t):
            continue
        k = p.k(t)
        engaged = []
        for d in box:
            if ol and min(p.dist(d, o, k) for o in ol) <= ENGAGED_YD:
                engaged.append(p.pos(d, k)[0] - p.pos(d, 0)[0])
        out[f"run.engaged_dl_driven_back_{t:.0f}s"].extend(engaged)
        if t == 3.0 and engaged:
            out["run.max_engaged_dl_driven_back_3s"].append(max(engaged))
        if t == 1.0 and ol:
            out["run.ol_forward_1s"].append(sum(p.pos(o, k)[0] - p.pos(o, 0)[0] for o in ol) / len(ol))
    return True


def pass_metrics(p, out):
    ev = p.events
    qbs = p.who("O", "QB")
    if not qbs:
        return False
    qb = qbs[0]
    throw = ev.get("pass_forward")
    defenders = p.who("D")
    if throw is not None:
        kt = p.k(throw)
        out["pass.time_to_throw"].append(throw)
        out["pass.qb_depth_at_throw"].append(-p.pos(qb, kt)[0])
        out["pass.nearest_defender_to_qb_at_throw"].append(min(p.dist(d, qb, kt) for d in defenders))
    window_end = throw if throw is not None else min(p.end, 4.0)
    pressure = p.pressure(qb)
    pressure_k = pressure.first
    out["pass.pressure_2yd_before_throw"].append(pressure.value)
    out["pass.pressure_2yd_unknown"].append(float(pressure.value is None))
    if pressure_k is not None:
        out["pass.time_to_pressure"].append(pressure_k * p.dt)
    rush_end = p.k(min(window_end, 2.5))
    # Missing coordinates must not crash after recording an unknown pressure,
    # or count a not-observed rusher as an observed non-rusher.
    rushers = []
    for d in defenders:
        xs = [p.pos(d, k)[0] for k in range(0, rush_end + 1)]
        known = [x for x in xs if x is not None and math.isfinite(x)]
        rushers.append(1 if any(x <= -1.0 for x in known) else 0 if len(known) == len(xs) else None)
    out["pass.rushers"].append(sum(rushers) if None not in rushers else None)
    eligible = [i for i in p.who("O") if p.players[i]["group"] in ("WR", "TE", "RB")]
    for t in (1.5, 2.5):
        if p.live(t) and (throw is None or t <= throw):
            k = p.k(t)
            out[f"route.separation_{t}s"].extend(p.nearest(i, k) for i in eligible if p.pos(i, k)[0] >= 3.0)
    target, catch = p.raw.get("target"), ev.get("catch")
    receiver = p.raw.get("receiver", target)
    if target is not None and throw is not None:
        out["route.target_depth_at_throw"].append(p.pos(target, p.k(throw))[0])
    if receiver is not None and catch is not None:
        kc = p.k(catch)
        out["catch.depth"].append(p.pos(receiver, kc)[0])
        out["catch.speed_at_catch"].append(p.speed(receiver, kc))
        out["catch.yards_after_catch"].append(p.raw["yards"] - p.pos(receiver, kc)[0])
        out["catch.defenders_within_5yd_at_catch"].append(
            sum(1 for d in defenders if p.dist(d, receiver, kc) <= 5.0))
        contact = ev.get("first_contact")
        contact_metrics(p, out, "catch", receiver, contact if contact is not None and contact >= catch else None)
    block_metrics(p, out, "pass")
    ol = p.who("O", "OL")
    if ol and p.live(2.0):
        k = p.k(2.0)
        out["pass.ol_depth_given_2s"].append(sum(p.pos(o, 0)[0] - p.pos(o, k)[0] for o in ol) / len(ol))
    for d in p.box_defenders():
        out["pass.box_rusher_speed_0_5s"].append(p.speed(d, p.k(0.5)))
        if p.live(2.0):
            out["pass.box_rusher_depth_2s"].append(-p.pos(d, p.k(2.0))[0])
    air_metrics(p, out)
    return True


def air_metrics(p, out):
    """The ball in the air: from the throw to its arrival, how much the nearest
    defender closes on the targeted receiver."""
    ev, target = p.events, p.raw.get("target")
    throw, arrived = ev.get("pass_forward"), ev.get("pass_arrived")
    if target is None or throw is None or arrived is None or arrived <= throw:
        return False
    kt, ka = p.k(throw), p.k(arrived)
    at_throw, at_arrival = p.nearest(target, kt), p.nearest(target, ka)
    if at_throw is None or at_arrival is None:
        return False
    out["air.time"].append(arrived - throw)
    out["air.target_depth_at_arrival"].append(p.pos(target, ka)[0])
    out["air.separation_at_throw"].append(at_throw)
    out["air.separation_at_arrival"].append(at_arrival)
    out["air.defender_closing"].append(at_throw - at_arrival)
    return True


SPEED_BINS = ((3.0, "slow"), (5.5, "mid"), (float("inf"), "fast"))


def contact_metrics(p, out, label, carrier, contact):
    """What contact does to a ball carrier: his speed going in, what is left
    half a second later, and how far he gets after it, by entry speed."""
    if contact is None or not p.live(contact):
        return
    k = p.k(contact)
    entry = p.speed(carrier, k)
    out[f"contact.{label}.carrier_speed_at_contact"].append(entry)
    bin_name = next(name for top, name in SPEED_BINS if entry < top)
    after = p.raw["yards"] - p.pos(carrier, k)[0]
    # The nearest defender at first contact stands in for the first tackler.
    tackler = min(p.who("D"), key=lambda d: p.dist(d, carrier, k))
    out[f"contact.{label}.tackler_speed_at_contact"].append(p.speed(tackler, k))
    cv, tv = p.velocity(carrier, k), p.velocity(tackler, k)
    if math.hypot(*cv) > 1.0 and math.hypot(*tv) > 1.0:
        cos = (cv[0] * tv[0] + cv[1] * tv[1]) / (math.hypot(*cv) * math.hypot(*tv))
        angle = "headon" if cos < -0.5 else "behind" if cos > 0.5 else "side"
        out[f"contact.{label}.yards_after_contact@{angle}"].append(after)
        out[f"contact.{label}.approach_headon"].append(1.0 if angle == "headon" else 0.0)
    if p.live(contact + 0.5):
        kept = p.speed(carrier, p.k(contact + 0.5))
        out[f"contact.{label}.carrier_speed_0_5s_after"].append(kept)
        # Broke contact: still running (>= 4 yd/s) half a second later and
        # gained at least 5 more yards. A tracking proxy for a broken tackle.
        out[f"contact.{label}.broke_contact"].append(1.0 if kept >= 4.0 and after >= 5.0 else 0.0)
    out[f"contact.{label}.yards_after_contact"].append(after)
    out[f"contact.{label}.yards_after_contact@{bin_name}"].append(after)
    out[f"contact.{label}.contact_to_whistle_s"].append(p.end - contact)


def block_metrics(p, out, kind):
    """Labeled blocker/defender pairs (NFL: PFF block assignment; sim: block
    contact events). OL blockers only. PFF labels blocks on dropbacks only,
    so run plays have no NFL pairs; the run-side drive metric is
    run.engaged_dl_driven_back_*."""
    if kind != "pass":
        return
    for b, d in p.raw.get("blocks") or ():
        if p.players[b]["group"] != "OL" or p.players[d]["side"] != "D":
            continue
        for t in (1.0, 2.0):
            if not p.live(t):
                continue
            k = p.k(t)
            if t == 2.0:
                out["block.pass.still_engaged_2s"].append(1.0 if p.dist(b, d, k) <= ENGAGED_YD else 0.0)
            out[f"block.pass.defender_depth_{t:.0f}s"].append(-p.pos(d, k)[0])


def movement_metrics(p, out):
    end = p.k(p.end)
    for i, pl in enumerate(p.players):
        speeds = [p.speed(i, k) for k in range(0, end + 1)]
        top = max(speeds, default=0.0)
        if top < 1.0:
            continue
        out[f"move.max_speed.{pl['group']}"].append(top)
        accel = [(speeds[k + 2] - speeds[k - 2]) / (4 * p.dt) for k in range(2, len(speeds) - 2)]
        if accel:
            out[f"move.max_accel.{pl['group']}"].append(max(accel))
            out[f"move.max_decel.{pl['group']}"].append(-min(accel))


class Collector:
    def __init__(self):
        self.values = defaultdict(list)
        self.plays = {"run": 0, "pass": 0, "air": 0}

    def add(self, raw):
        p = Play(raw)
        handler = {"run": run_metrics, "pass": pass_metrics, "air": air_metrics}.get(raw["kind"])
        if raw["kind"] == "air":
            if handler(p, self.values):
                self.plays["air"] += 1
                coverage = coverage_family((raw.get("cell") or {}).get("coverage"))
                if coverage:
                    air_metrics(p, _Suffixed(self.values, "@" + coverage))
            return
        if handler and handler(p, self.values):
            self.plays[raw["kind"]] += 1
            movement_metrics(p, self.values)
            family = CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept"))
            if raw["kind"] == "run" and family:
                run_metrics(p, _Suffixed(self.values, "@" + family))
            coverage = coverage_family((raw.get("cell") or {}).get("coverage"))
            if raw["kind"] == "pass" and coverage:
                pass_metrics(p, _Suffixed(self.values, "@" + coverage))
            if raw["kind"] == "run":
                box = p.box_count()
                self.values["run.box_count"].append(box)
                cell = "box6-" if box <= 6 else "box7" if box == 7 else "box8+"
                run_metrics(p, _Suffixed(self.values, "@" + cell))

    def summary(self):
        return {"plays": self.plays, "pressureOperator": PRESSURE_OPERATOR,
                "metrics": {key: describe(vals) for key, vals in sorted(self.values.items())}}


class _Suffixed:
    def __init__(self, store, suffix):
        self.store, self.suffix = store, suffix

    def __getitem__(self, key):
        # Within a cell, skip the finer splits (e.g. contact speed bins).
        return self.store[key + self.suffix] if "@" not in key else []


def describe(values):
    vals = sorted(v for v in values if v is not None and math.isfinite(v))
    if not vals:
        return {"n": 0}
    q = lambda f: round(vals[min(len(vals) - 1, int(f * (len(vals) - 1) + 0.5))], 3)
    return {"n": len(vals), "mean": round(sum(vals) / len(vals), 3),
            "p10": q(.1), "p25": q(.25), "p50": q(.5), "p75": q(.75), "p90": q(.9)}


DEFINITIONS = {
    "run.*": "Designed handoffs to an RB (no QB runs, no scrambles). Times are seconds after the snap.",
    "run.carrier_cross_los_s": "First frame the carrier is past the line, before first contact.",
    "run.yards_before_contact": "Carrier's x at the first-contact event (negative = behind the line).",
    "run.yards_after_contact": "Play yards minus yards before contact.",
    "run.engaged_dl_driven_back_Ns": "Per box defender within 1.5 yd of an OL at N s: yards he has moved toward his own goal since the snap. Live plays only.",
    "run.max_engaged_dl_driven_back_3s": "Per play, the furthest any engaged box defender has been driven back at 3 s.",
    "run.ol_forward_1s": "Mean forward movement of the OL at 1 s.",
    "pass.*": "Dropbacks. Throw = pass_forward event.",
    "pass.pressure_2yd_before_throw": f"{PRESSURE_OPERATOR}: share of known observations with any defender <=2 yd from the QB at recorded times >=0.5 s and <=release/end (no release: end capped at 4 s). Unknown negatives excluded; positives retained. See docs/reviews/pressure-measurement.md.",
    "pass.pressure_2yd_unknown": "Share of QB dropbacks with no pressure-window samples or incomplete coverage and no observed positive. Retained separately from observed negatives.",
    "pass.ol_depth_given_2s": "Mean OL retreat toward the QB at 2 s (includes the normal pass set).",
    "pass.box_rusher_speed_0_5s": "Speed of each box defender at 0.5 s (get-off).",
    "pass.box_rusher_depth_2s": "How far each box defender is into the backfield at 2 s.",
    "pass.separation_at_arrival": "Target receiver to nearest defender when the ball arrives.",
    "run.defenders_within_2yd_at_end": "Defenders within 2 yd of the carrier at the whistle (gang tackling).",
    "run.box_count": "Defenders within 7 yd of the line and 6.5 yd of the ball at the snap (matches PFF's box count within one on 96% of 2021 dropbacks).",
    "run.*@boxN": "The run metric within a box-count cell (box6-, box7, box8+).",
    "contact.run|catch.*": "From the carrier's first contact (run: RB; catch: receiver after the catch): entry speed, speed 0.5 s later, yards after contact (also by entry speed: slow < 3, mid < 5.5, fast yd/s), contact to whistle.",
    "block.pass.*": "Labeled OL/defender pairs on dropbacks (PFF labels pass blocks only). NFL: PFF blocked-player assignment; sim: block-contact events. still_engaged_2s: pair within 1.5 yd at 2 s; defender_depth: how far the blocked defender is into the backfield.",
    "air.*": "Ball in the air, targeted receiver: air time, depth where the ball arrives, nearest defender at the throw and at arrival, and how much that gap closed.",
    "contact.*.tackler_speed_at_contact": "Speed of the defender nearest the carrier at first contact (stand-in for the first tackler).",
    "contact.*.approach_headon": "Share of contacts where carrier and tackler move against each other (velocity angle > 120 deg); yards_after_contact@headon|side|behind splits by that angle.",
    "contact.*.broke_contact": "Share of contacts after which the carrier is still running >= 4 yd/s half a second later and gains >= 5 more yards (tracking proxy for a broken tackle).",
    "catch.defenders_within_5yd_at_catch": "Defenders within 5 yd of the receiver at the catch.",
    "*@man|zone": "The metric within man or zone coverage (PFF / NGS / sim coverage labels).",
    "pass.time_to_pressure": "First observed sampled geometric pressure in the admitted window. Missing earlier samples can hide earlier pressure; not continuous onset or native pressure credit.",
    "pass.rushers": "Defenders who get at least 1 yd into the backfield by the throw or 2.5 s.",
    "route.separation_Ns": "Before the throw, each WR/TE/RB at least 3 yd downfield: distance to the nearest defender.",
    "route.target_depth_at_throw": "Targeted receiver's depth past the line when the ball is thrown.",
    "catch.*": "Completed passes: actual catcher's depth, speed and yards after catch. Uses receiver when present; inputs without that channel fall back to target.",
    "run.*@family": "The same run metric within one concept family (inside_zone, outside_zone, gap_pull, man_duo, draw).",
    "move.*": "Per player per play, from positions: top speed (yd/s), peak acceleration and deceleration (yd/s^2), players who reach at least 1 yd/s.",
}
