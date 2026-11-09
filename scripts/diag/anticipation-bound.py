"""How predictable is a player you stop watching? Bounds for out-of-view anticipation (field of view, G10).

The same operator runs on NFL tracking and sim exports (common play format: `players[].group`, `xy` frames at
0.1 s). For each player and each sample time t0 in [0.5, 3.0] s, every predictor uses only that player's own
positions up to t0, which is what an observer who last saw him at t0 could know. Each one predicts his position
at t0 + h, for h in 0.3 / 0.6 / 1.0 / 1.5 s. Error is the distance to where he actually was, in yd.

Predictors (observable motion only; no route, assignment or ball knowledge):
- freeze: the last seen position (no anticipation).
- cv: constant velocity from the last 0.2 s.
- damped: velocity decaying with tau = 0.6 s (he will slow or turn).
- ca: constant acceleration from the last 0.4 s, speed capped at 10 yd/s.
- best: the per-sample minimum of the four, an optimistic oracle among these observable-only predictors.

The freeze curve is the no-anticipation bound. The best of the honest predictors (cv, damped or ca) is
what an observer can achieve from motion alone. Role, route and concept priors could do better; that is
the headroom for experienced players.

usage: python3 -I scripts/diag/anticipation-bound.py <nfl.jsonl.gz | sim.jsonl.gz> [more]"""
import sys, json, gzip, math, statistics as st, collections

H = (3, 6, 10, 15)          # horizons in frames (0.1 s)
T0 = range(5, 31, 5)        # sample times 0.5 .. 3.0 s


def plays(path):
    op = gzip.open if path.endswith(".gz") else open
    with op(path, "rt") as f:
        for line in f:
            if not line.startswith("{"):
                continue
            p = json.loads(line)
            if "players" not in p or "xy" not in p:
                continue
            yield p


def pos(X, f, i):
    return X[f][2 * i], X[f][2 * i + 1]


for path in sys.argv[1:]:
    E = collections.defaultdict(list)
    for p in plays(path):
        X, pl = p["xy"], p["players"]
        n = len(X)
        for i, q in enumerate(pl):
            g = q.get("group", "?")
            for t0 in T0:
                if t0 + max(H) >= n or t0 < 4:
                    continue
                x0, y0 = pos(X, t0, i)
                x2, y2 = pos(X, t0 - 2, i)
                x4, y4 = pos(X, t0 - 4, i)
                vx, vy = (x0 - x2) / 0.2, (y0 - y2) / 0.2
                ux, uy = (x2 - x4) / 0.2, (y2 - y4) / 0.2
                ax, ay = (vx - ux) / 0.2, (vy - uy) / 0.2
                for h in H:
                    s = h / 10
                    tx, ty = pos(X, t0 + h, i)
                    tau = 0.6
                    damp = tau * (1 - math.exp(-s / tau))
                    cx, cy = x0 + vx * s + 0.5 * ax * s * s, y0 + vy * s + 0.5 * ay * s * s
                    sp = math.hypot(vx + ax * s, vy + ay * s)
                    if sp > 10:
                        cx, cy = x0 + vx * s, y0 + vy * s
                    errs = {
                        "freeze": math.hypot(tx - x0, ty - y0),
                        "cv": math.hypot(tx - (x0 + vx * s), ty - (y0 + vy * s)),
                        "damped": math.hypot(tx - (x0 + vx * damp), ty - (y0 + vy * damp)),
                        "ca": math.hypot(tx - cx, ty - cy),
                    }
                    errs["best"] = min(errs.values())
                    for k, v in errs.items():
                        E[(g, h, k)].append(v)
                        E[("all", h, k)].append(v)
    print("==", path.split("/")[-1], "  median error (yd) by horizon; p90 in brackets")
    groups = ["all"] + sorted({g for g, _, _ in E if g != "all"})
    for g in groups:
        rows = []
        for h in H:
            cell = " ".join(
                f"{k} {st.median(E[(g, h, k)]):.2f}[{sorted(E[(g, h, k)])[int(.9 * (len(E[(g, h, k)]) - 1))]:.2f}]"
                for k in ("freeze", "cv", "damped", "ca", "best") if E[(g, h, k)])
            rows.append(f"    {h / 10:.1f}s: {cell}")
        n = len(E[(g, H[0], "freeze")])
        if n:
            print(f"  {g} (samples {n})")
            print("\n".join(rows))
