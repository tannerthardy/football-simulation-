"""How strength scales with body mass in NFL combine athletes: estimate b in force ~ mass^b.

Input: nflverse combine CSV (https://github.com/nflverse/nflverse-data/releases/download/combine/combine.csv),
downloaded to ignored raw storage. Columns used: pos, ht ("6-4"), wt (lb), bench (225 lb reps), vertical (in).

Estimators (each a model assumption, stated with its limits):
- Upper body: bench 1RM by Epley, 225 * (1 + reps / 30) lb. Reps at a fixed 225 lb mix strength with
  muscular endurance, and Epley is least reliable at high reps, so this is a press-strength index.
- Legs: mean vertical push-off force from jump height h, F = m g (1 + h / d), with push-off depth
  d = 0.25 * height (a counter-movement depth assumption). Peak power by Sayers (W = 60.7 cm + 45.3 kg - 2055)
  is reported for reference only; power is not force.
Fit: ordinary least squares of log(estimate) on log(mass), pooled and within position groups (pooled
within-group slope with group intercepts), plus bootstrap 95% intervals. Within-group slopes separate body
size from position selection; neither removes training selection.

usage: python3 -I scripts/mechanics/leg_force_allometry.py <combine.csv> [--json out.json]
"""
import csv, json, math, random, sys, statistics as st

GROUPS = {"OL": {"OT", "OG", "C", "OL", "G", "T"}, "DL": {"DT", "DE", "NT", "DL", "EDGE"}, "LB": {"ILB", "OLB", "LB"},
          "TE": {"TE"}, "RB": {"RB", "FB"}, "WR": {"WR"}, "DB": {"CB", "S", "DB", "SS", "FS", "SAF"}, "QB": {"QB"}}
G = 9.81


def group(pos):
    return next((g for g, s in GROUPS.items() if pos in s), None)


def inches(ht):
    try:
        f, i = ht.split("-")
        return 12 * int(f) + int(i)
    except (ValueError, AttributeError):
        return None


def rows(path):
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            g, h = group(r["pos"]), inches(r["ht"])
            try:
                wt = float(r["wt"])
            except ValueError:
                continue
            if g is None or h is None or wt <= 0:
                continue
            yield g, wt * 0.45359237, h * 0.0254, r


def slope(xs, ys):
    mx, my = st.fmean(xs), st.fmean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx > 0 else float("nan")


def within(pts):
    """Pooled within-group slope: demean x and y by group, then one slope."""
    by = {}
    for g, x, y in pts:
        by.setdefault(g, []).append((x, y))
    xs, ys = [], []
    for v in by.values():
        if len(v) < 10:
            continue
        mx, my = st.fmean(a for a, _ in v), st.fmean(b for _, b in v)
        xs += [a - mx for a, _ in v]; ys += [b - my for _, b in v]
    return slope(xs, ys) if xs else float("nan")


def boot(pts, fn, n=400, seed=7):
    rng = random.Random(seed)
    vals = sorted(fn([pts[rng.randrange(len(pts))] for _ in pts]) for _ in range(n))
    return vals[int(0.025 * n)], vals[int(0.975 * n)]


def fit(pts, label):
    pooled = lambda p: slope([x for _, x, _ in p], [y for _, _, y in p])
    groups = {}
    for g in GROUPS:
        p = [q for q in pts if q[0] == g]
        if len(p) >= 30:
            groups[g] = {"n": len(p), "b": round(pooled(p), 3)}
    out = {"estimate": label, "n": len(pts), "pooled_b": round(pooled(pts), 3), "pooled_ci95": [round(v, 3) for v in boot(pts, pooled)],
           "within_group_b": round(within(pts), 3), "within_group_ci95": [round(v, 3) for v in boot(pts, within)], "by_group": groups}
    return out


def main():
    path = sys.argv[1]
    bench, legF, power = [], [], []
    for g, m, hgt, r in rows(path):
        lm = math.log(m)
        if r["bench"]:
            reps = float(r["bench"])
            if reps > 0:
                bench.append((g, lm, math.log(225 * (1 + reps / 30))))
        if r["vertical"]:
            h = float(r["vertical"]) * 0.0254
            if h > 0:
                legF.append((g, lm, math.log(m * G * (1 + h / (0.25 * hgt)))))
                p = 60.7 * h * 100 + 45.3 * m - 2055
                if p > 0:
                    power.append((g, lm, math.log(p)))
    res = {"source": "nflverse combine.csv", "fits": [fit(bench, "bench 1RM (Epley from 225 lb reps)"),
                                                     fit(legF, "vertical push-off force m g (1 + h / 0.25 height)"),
                                                     fit(power, "Sayers peak power (reference only)")]}
    print(json.dumps(res, indent=1))
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w") as fh:
            json.dump(res, fh, indent=1)


if __name__ == "__main__":
    main()
