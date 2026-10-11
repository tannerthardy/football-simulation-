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

Positions are compared directly; speeds and accelerations are derived from
positions (quantized to 0.1 yd, as the sim records them) with the same
smoothing on both sides, never from provider speed fields.
"""
import math
from collections import defaultdict

GROUPS = ("QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB")
SPEED_HALF = 2        # speed: central difference over +/-0.2 s
ENGAGED_YD = 1.5      # a box defender is "engaged" with an OL this close
PRESSURE_YD = 2.0

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


class Play:
    def __init__(self, raw):
        self.raw = raw
        self.dt = raw.get("dt", 0.1)
        # The sim records positions to 0.1 yd. Quantize every source the same
        # way so derived speeds and accelerations carry identical noise.
        self.xy = [[round(v, 1) for v in row] for row in raw["xy"]]
        self.n = len(raw["players"])
        self.frames = len(self.xy)
        self.players = raw["players"]
        self.events = raw.get("events", {})
        self.end = self.events.get("end", (self.frames - 1) * self.dt)

    def k(self, t):
        return max(0, min(self.frames - 1, int(round(t / self.dt))))

    def live(self, t):
        return t <= self.end + 1e-9 and self.k(t) * self.dt >= t - 1e-9

    def pos(self, i, k):
        row = self.xy[k]
        return row[2 * i], row[2 * i + 1]

    def speed(self, i, k):
        a, b = max(0, k - SPEED_HALF), min(self.frames - 1, k + SPEED_HALF)
        if b == a:
            return 0.0
        (x0, y0), (x1, y1) = self.pos(i, a), self.pos(i, b)
        return math.hypot(x1 - x0, y1 - y0) / ((b - a) * self.dt)

    def who(self, side=None, group=None):
        return [i for i, p in enumerate(self.players)
                if (side is None or p["side"] == side) and (group is None or p["group"] == group)]

    def dist(self, i, j, k):
        (xi, yi), (xj, yj) = self.pos(i, k), self.pos(j, k)
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
    pressured = any(min(p.dist(d, qb, k) for d in defenders) <= PRESSURE_YD
                    for k in range(p.k(0.5), p.k(window_end) + 1))
    out["pass.pressure_2yd_before_throw"].append(1.0 if pressured else 0.0)
    ol = p.who("O", "OL")
    if ol and p.live(2.0):
        k = p.k(2.0)
        out["pass.ol_depth_given_2s"].append(sum(p.pos(o, 0)[0] - p.pos(o, k)[0] for o in ol) / len(ol))
    for d in p.box_defenders():
        out["pass.box_rusher_speed_0_5s"].append(p.speed(d, p.k(0.5)))
        if p.live(2.0):
            out["pass.box_rusher_depth_2s"].append(-p.pos(d, p.k(2.0))[0])
    target, arrived = p.raw.get("target"), ev.get("pass_arrived")
    if target is not None and arrived is not None:
        ka = p.k(arrived)
        out["pass.separation_at_arrival"].append(min(p.dist(d, target, ka) for d in defenders))
    return True


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
        self.plays = {"run": 0, "pass": 0}

    def add(self, raw):
        p = Play(raw)
        handler = {"run": run_metrics, "pass": pass_metrics}.get(raw["kind"])
        if handler and handler(p, self.values):
            self.plays[raw["kind"]] += 1
            movement_metrics(p, self.values)
            family = CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept"))
            if raw["kind"] == "run" and family:
                run_metrics(p, _Suffixed(self.values, "@" + family))

    def summary(self):
        return {"plays": self.plays,
                "metrics": {key: describe(vals) for key, vals in sorted(self.values.items())}}


class _Suffixed:
    def __init__(self, store, suffix):
        self.store, self.suffix = store, suffix

    def __getitem__(self, key):
        return self.store[key + self.suffix]


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
    "pass.pressure_2yd_before_throw": "Share of dropbacks with a defender within 2 yd of the QB between 0.5 s and the throw (or 4 s).",
    "pass.ol_depth_given_2s": "Mean OL retreat toward the QB at 2 s (includes the normal pass set).",
    "pass.box_rusher_speed_0_5s": "Speed of each box defender at 0.5 s (get-off).",
    "pass.box_rusher_depth_2s": "How far each box defender is into the backfield at 2 s.",
    "pass.separation_at_arrival": "Target receiver to nearest defender when the ball arrives.",
    "run.*@family": "The same run metric within one concept family (inside_zone, outside_zone, gap_pull, man_duo, draw).",
    "move.*": "Per player per play, from positions: top speed (yd/s), peak acceleration and deceleration (yd/s^2), players who reach at least 1 yd/s.",
}
