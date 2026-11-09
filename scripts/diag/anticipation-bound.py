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
- context ("experience"): the mean future displacement of players who looked the same at that moment, learned
  on half the plays (split by play id) and tested on the other half. Context uses observables only: group,
  speed, heading relative to downfield, depth from the LOS, which side of the ball and how wide, and time
  since the snap. Displacement is learned in the player's own travel frame, mirrored so + is toward his
  sideline. That makes it "keeps going / breaks in / breaks out". No route, assignment or concept is used.
- read: context, also conditioned on the play's kind (run or pass), falling back to context. This is a
  correct run/pass read: the ceiling of what a defender's read of the play adds. In the engine it is
  gated by the defender's own read, which can be wrong (play action, draws).
- misread: the same, conditioned on the wrong kind. The cost of being fooled.
- foreign (--apply prior.json): another source's exported prior, with the correct read, e.g. the NFL table on
  sim plays. Where foreign is much worse than the own-source read, that group's movement there is not
  NFL-like (a place to look, not a target).

The freeze curve is the no-anticipation bound. The best of the honest predictors (cv, damped or ca) is
what an observer can achieve from motion alone. Role, route and concept priors could do better; that is
the headroom for experienced players.

usage: python3 -I scripts/diag/anticipation-bound.py <nfl.jsonl.gz | sim.jsonl.gz> [more] [--export prior.json] [--apply other-prior.json]
--export writes the context prior (trained on all plays) as an aggregate table: key -> horizon -> [along, across, n].
Keys prefixed 'run|' or 'pass|' are conditioned on the play's kind. Keys ending in '*' pool all time bins; the engine falls back to them when the timed cell is too thin."""
import sys, json, gzip, math, statistics as st, collections, zlib

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




def ctx(p, X, i, t0, g):
    """Observable context key and travel frame for player i at frame t0."""
    x0, y0 = pos(X, t0, i); x2, y2 = pos(X, t0 - 2, i)
    vx, vy = (x0 - x2) / 0.2, (y0 - y2) / 0.2
    sp = math.hypot(vx, vy)
    ball_y = p.get("ball_y", 26.65)
    side = 1 if y0 >= ball_y else -1                     # + y toward his own sideline
    hd = math.atan2(vy * side, vx) if sp > 0.3 else 0.0  # heading vs downfield (+x), mirrored
    key = (g, min(4, int(sp // 1.5)), int(((hd + math.pi) / (2 * math.pi)) * 8) % 8,
           0 if x0 < 0 else 1 if x0 < 5 else 2 if x0 < 12 else 3,
           0 if abs(y0 - ball_y) < 5 else 1 if abs(y0 - ball_y) < 13 else 2,
           0 if t0 < 10 else 1 if t0 < 20 else 2)
    ux, uy = (vx / sp, vy / sp) if sp > 0.3 else (1.0, 0.0)
    return key, ux, uy, side


def to_frame(dx, dy, ux, uy, side):
    """World displacement -> (along travel, across travel toward his sideline)."""
    return dx * ux + dy * uy, (-dx * uy + dy * ux) * side


def from_frame(a, c, ux, uy, side):
    c *= side
    return a * ux - c * uy, a * uy + c * ux


def train(paths):
    """Mean displacement per (context, horizon) over the training half."""
    acc = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for path in paths:
        for p in plays(path):
            if zlib.crc32(str(p.get("id")).encode()) % 2:
                continue
            X, pl = p["xy"], p["players"]
            for i, q in enumerate(pl):
                for t0 in T0:
                    if t0 + max(H) >= len(X) or t0 < 4:
                        continue
                    key, ux, uy, side = ctx(p, X, i, t0, q.get("group", "?"))
                    x0, y0 = pos(X, t0, i)
                    for h in H:
                        tx, ty = pos(X, t0 + h, i)
                        a, c = to_frame(tx - x0, ty - y0, ux, uy, side)
                        for k in (key, (p.get("kind"),) + key):
                            cell = acc[(k, h)]; cell[0] += a; cell[1] += c; cell[2] += 1
    return {k: (v[0] / v[2], v[1] / v[2]) for k, v in acc.items() if v[2] >= 20}

EXPORT = sys.argv[sys.argv.index("--export") + 1] if "--export" in sys.argv else None
APPLY = sys.argv[sys.argv.index("--apply") + 1] if "--apply" in sys.argv else None
FILES = [a for a in sys.argv[1:] if a.endswith((".gz", ".jsonl")) and a not in (EXPORT, APPLY)]
FOREIGN = {}
if APPLY:  # another source's exported prior (e.g. NFL applied to sim plays): a transfer check
    for k, cell in json.load(open(APPLY))["cells"].items():
        for h, v in cell.items():
            FOREIGN[(k, round(float(h) * 10))] = (v[0], v[1])
PRIOR = train(FILES)
if EXPORT:
    full = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for path in FILES:
        for p in plays(path):
            X, pl = p["xy"], p["players"]
            for i, q in enumerate(pl):
                for t0 in T0:
                    if t0 + max(H) >= len(X) or t0 < 4:
                        continue
                    key, ux, uy, side = ctx(p, X, i, t0, q.get("group", "?"))
                    x0, y0 = pos(X, t0, i)
                    for h in H:
                        tx, ty = pos(X, t0 + h, i)
                        a, c = to_frame(tx - x0, ty - y0, ux, uy, side)
                        kind = p.get("kind") if p.get("kind") in ("run", "pass") else None
                        for k in (key, key[:-1] + ("*",)) + (((kind,) + key, (kind,) + key[:-1] + ("*",)) if kind else ()):
                            cell = full[(k, h)]; cell[0] += a; cell[1] += c; cell[2] += 1
    out = {}
    for (key, h), (a, c, n) in full.items():
        if n >= 20:
            out.setdefault("|".join(map(str, key)), {})[str(h / 10)] = [round(a / n, 3), round(c / n, 3), n]
    json.dump({"source": [f.split("/")[-1] for f in FILES], "key": "group|speedBin(1.5 yd/s)|heading8(mirrored to own sideline)|depthBin(<0,0-5,5-12,12+)|wideBin(<5,5-13,13+ yd from ball)|tBin(<1,1-2,2+ s, * = pooled)",
               "frame": "along travel, across toward own sideline (yd)", "cells": out}, open(EXPORT, "w"))
    print("exported", len(out), "context keys ->", EXPORT)

for path in FILES:
    E = collections.defaultdict(list)
    for p in plays(path):
        if not zlib.crc32(str(p.get("id")).encode()) % 2:
            continue
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
                    key, ux, uy, side = ctx(p, X, i, t0, g)
                    pr = PRIOR.get((key, h))
                    if pr:
                        dx, dy = from_frame(pr[0], pr[1], ux, uy, side)
                        errs["context"] = math.hypot(tx - (x0 + dx), ty - (y0 + dy))
                        pk = PRIOR.get(((p.get("kind"),) + key, h)) or pr
                        dx, dy = from_frame(pk[0], pk[1], ux, uy, side)
                        errs["read"] = math.hypot(tx - (x0 + dx), ty - (y0 + dy))
                        other = {"run": "pass", "pass": "run"}.get(p.get("kind"))
                        pm = PRIOR.get(((other,) + key, h)) or pr
                        dx, dy = from_frame(pm[0], pm[1], ux, uy, side)
                        errs["misread"] = math.hypot(tx - (x0 + dx), ty - (y0 + dy))
                    fk = "|".join(map(str, key)); fp = None
                    if FOREIGN:
                        kind = p.get("kind")
                        pooled = "|".join(map(str, key[:-1])) + "|*"
                        fp = (FOREIGN.get((f"{kind}|{fk}", h)) or FOREIGN.get((f"{kind}|{pooled}", h))
                              or FOREIGN.get((fk, h)) or FOREIGN.get((pooled, h)))
                    if fp:
                        dx, dy = from_frame(fp[0], fp[1], ux, uy, side)
                        errs["foreign"] = math.hypot(tx - (x0 + dx), ty - (y0 + dy))
                    errs["best"] = min(v for k, v in errs.items() if k not in ("context", "read", "misread", "foreign"))
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
                for k in ("freeze", "cv", "damped", "ca", "context", "read", "misread", "foreign", "best") if E[(g, h, k)])
            rows.append(f"    {h / 10:.1f}s: {cell}")
        n = len(E[(g, H[0], "freeze")])
        if n:
            print(f"  {g} (samples {n})")
            print("\n".join(rows))
