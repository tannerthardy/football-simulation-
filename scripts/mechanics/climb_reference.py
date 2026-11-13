#!/usr/bin/env python3
"""Zone climbs and lineman starts, measured the same way on NFL and sim plays.

    python3 -I scripts/mechanics/climb_reference.py out/mechanics/nfl-plays-w12.jsonl.gz \
        out/mechanics/sim-plays-dev.jsonl.gz > out/mechanics/climb-reference.json

Reads plays in the common format (metrics.py) written by nfl_bdb2025.py
--plays-out and sim-export.ts. Every number below comes from positions only,
with metrics.py's speed operator, on both sides (KNOWN_PROBLEMS RUN-12).

Climbs (designed inside/outside zone runs with a handoff):
- first level: defenders within 1.5 yd of the line at the snap; backers: LB
  group 2.5-8 yd deep and within 6 yd of the ball at the snap;
- a climber is an OL who reaches 2 yd past the line before the carrier does.
  He came off a double/first-level man ("combo") if he was within 1.5 yd
  (ENGAGED_YD) of a first-level defender for at least 0.2 s before; otherwise
  he is "uncovered" and leaves at the snap;
- release: his last frame engaged with a first-level defender before he
  reaches 2 yd (combo), or the snap (uncovered);
- his backer: the box backer he comes closest to in the 2 s after release;
  contact: first frame within 1.5 yd of that backer; arrival: the carrier
  first within 1 yd of the backer's depth (x >= backer x - 1).

Lineman starts: an OL episode starts on any frame he is under 1 yd/s, from
0.2 s after the snap ("engaged" if within 1.5 yd of a defender then, "set"
otherwise), and counts if he is above 2 yd/s within 1 s (he is trying to go).
Reported: speed 0.5 and 1.0 s later and distance covered in that 1.0 s. One
episode per player per play (the first). From the snap itself: OL on gap/pull
runs who move more than 3 yd across the field in the first 1.5 s (pullers).
"""
import gzip
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import CONCEPT_FAMILY, ENGAGED_YD, SPEED_HALF  # noqa: E402

ZONE = {"inside_zone", "outside_zone"}


def plays(path):
    with gzip.open(path, "rt") as handle:
        for line in handle:
            yield json.loads(line)


class Play:
    def __init__(self, raw):
        self.raw, self.dt, self.xy = raw, raw["dt"], raw["xy"]
        self.players, self.n = raw["players"], len(raw["xy"])
        self.end = min(self.n - 1, int(round(raw["events"].get("end", (self.n - 1) * self.dt) / self.dt)))

    def pos(self, i, k):
        row = self.xy[min(max(k, 0), self.n - 1)]
        return row[2 * i], row[2 * i + 1]

    def dist(self, i, j, k):
        a, b = self.pos(i, k), self.pos(j, k)
        return math.hypot(a[0] - b[0], a[1] - b[1])

    def speed(self, i, k):
        lo, hi = max(0, k - SPEED_HALF), min(self.n - 1, k + SPEED_HALF)
        if hi == lo:
            return 0.0
        a, b = self.pos(i, lo), self.pos(i, hi)
        return math.hypot(b[0] - a[0], b[1] - a[1]) / ((hi - lo) * self.dt)


def pct(values):
    if not values:
        return {"n": 0}
    s = sorted(values)
    q = lambda p: round(s[min(len(s) - 1, int(p * (len(s) - 1) + 0.5))], 2)
    return {"n": len(s), "p10": q(.1), "p25": q(.25), "p50": q(.5), "p75": q(.75), "p90": q(.9),
            "mean": round(sum(s) / len(s), 2)}


def share(flags):
    return {"n": len(flags), "share": round(sum(flags) / len(flags), 3) if flags else None}


def climbs(p, out):
    carrier = p.raw.get("carrier")
    if carrier is None or "handoff" not in p.raw["events"]:
        return
    ball_y = p.raw["ball_y"]
    off_ol = [i for i, pl in enumerate(p.players) if pl["side"] == "O" and pl["group"] == "OL"]
    defense = [i for i, pl in enumerate(p.players) if pl["side"] == "D"]
    first = [d for d in defense if p.pos(d, 0)[0] <= 1.5]
    backers = [d for d in defense if p.players[d]["group"] == "LB"
               and 2.5 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - ball_y) <= 6]
    if not backers:
        return
    carrier_at = next((k for k in range(p.end + 1) if p.pos(carrier, k)[0] >= 2), p.end + 1)
    for o in off_ol:
        reach = next((k for k in range(min(carrier_at, p.end + 1)) if p.pos(o, k)[0] >= 2), None)
        if reach is None:
            continue
        engaged = [k for k in range(reach) if any(p.dist(o, d, k) <= ENGAGED_YD for d in first)]
        combo = len(engaged) * p.dt >= 0.2
        release = engaged[-1] if combo else 0
        window = range(release, min(p.end, release + int(2 / p.dt)) + 1)
        backer = min(backers, key=lambda d: min(p.dist(o, d, k) for k in window))
        contact = next((k for k in range(release, p.end + 1) if p.dist(o, backer, k) <= ENGAGED_YD), None)
        arrive = next((k for k in range(p.end + 1) if p.pos(carrier, k)[0] >= p.pos(backer, k)[0] - 1), None)
        kind = "combo" if combo else "uncovered"
        out[f"climb.release_s.{kind}"].append(release * p.dt)
        out[f"climb.backer_distance_at_release.{kind}"].append(p.dist(o, backer, release))
        k5 = min(p.end, release + int(.5 / p.dt))
        if k5 > release:
            out[f"climb.departure_speed_0.5s.{kind}"].append(
                math.hypot(p.pos(o, k5)[0] - p.pos(o, release)[0], p.pos(o, k5)[1] - p.pos(o, release)[1]) / ((k5 - release) * p.dt))
        stop = min(x for x in (contact, arrive, p.end) if x is not None)
        if stop > release:
            out[f"climb.peak_speed.{kind}"].append(max(p.speed(o, k) for k in range(release, stop + 1)))
        before = contact is not None and (arrive is None or contact <= arrive)
        out[f"climb.backer_contacted_before_carrier.{kind}"].append(1.0 if before else 0.0)
        if contact is not None and arrive is not None:
            out[f"climb.contact_minus_arrival_s.{kind}"].append((contact - arrive) * p.dt)


def starts(p, out):
    defense = [i for i, pl in enumerate(p.players) if pl["side"] == "D"]
    one, half = int(round(1 / p.dt)), int(round(.5 / p.dt))
    for o, pl in enumerate(p.players):
        if pl["side"] != "O" or pl["group"] != "OL":
            continue
        for k in range(int(round(.2 / p.dt)), p.end - one + 1):
            if p.speed(o, k) >= 1.0:
                continue
            if max(p.speed(o, j) for j in range(k, k + one + 1)) <= 2.0:
                continue
            state = "engaged" if any(p.dist(o, d, k) <= ENGAGED_YD for d in defense) else "set"
            out[f"start.speed_0.5s.{state}"].append(p.speed(o, k + half))
            out[f"start.speed_1.0s.{state}"].append(p.speed(o, k + one))
            a, b = p.pos(o, k), p.pos(o, k + one)
            out[f"start.distance_1.0s.{state}"].append(math.hypot(b[0] - a[0], b[1] - a[1]))
            break
    if CONCEPT_FAMILY.get((p.raw.get("cell") or {}).get("concept") or "") != "gap_pull" or p.end < 15:
        return
    for o, pl in enumerate(p.players):
        if pl["side"] == "O" and pl["group"] == "OL" and abs(p.pos(o, 15)[1] - p.pos(o, 0)[1]) > 3:
            out["start.puller_speed_0.5s"].append(p.speed(o, 5))
            out["start.puller_speed_1.0s"].append(p.speed(o, 10))
            out["start.puller_distance_1.0s"].append(math.hypot(p.pos(o, 10)[0] - p.pos(o, 0)[0], p.pos(o, 10)[1] - p.pos(o, 0)[1]))


def measure(path):
    from collections import defaultdict
    out, count = defaultdict(list), {"zone_runs": 0, "runs": 0}
    for raw in plays(path):
        if raw["kind"] != "run":
            continue
        p = Play(raw)
        count["runs"] += 1
        starts(p, out)
        if CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept") or "") in ZONE:
            count["zone_runs"] += 1
            climbs(p, out)
    return {"plays": count, **{k: (share(v) if "contacted" in k else pct(v)) for k, v in sorted(out.items())}}


def main(paths):
    print(json.dumps({Path(p).name: measure(p) for p in paths}, indent=1))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
