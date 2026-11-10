"""Run-block defenders ending on the ground (Integration, 2026-11-10). NFL run records carry no block pairs, so a defender
(DL or LB) is 'blocked' while an OL or TE is within 1.2 yd of him for 0.3 s (3 frames). Flagged: a blocked defender who
goes still -- speed under 0.3 yd/s (0.2 s displacement) for 0.8 s -- starting during or within 0.5 s after the block,
more than 2 yd from the ball carrier, with the whole window before the runner's first contact (or the end). Stalemates
and anchors also go still, so this is an upper bound on the NFL; on the sim, the records' true falls give recall and
precision. Same code on NFL (out/mechanics/nfl-plays.jsonl.gz) and the sim's run-frames.mts records.
usage: python3 -I rdfall.py <nfl.jsonl.gz | sim run-frames jsonl> [...]"""
import sys, os, json, gzip, math
def speed(X, i, f):
    a, b = max(0, f - 1), min(len(X) - 1, f + 1)
    return math.hypot(X[b][2 * i] - X[a][2 * i], X[b][2 * i + 1] - X[a][2 * i + 1]) / ((b - a) * 0.1) if b > a else 0.0
def dist(X, i, j, f):
    return math.hypot(X[f][2 * i] - X[f][2 * j], X[f][2 * i + 1] - X[f][2 * j + 1])
for path in sys.argv[1:]:
    op = gzip.open if path.endswith('.gz') else open
    runs = reps = flagged = truth = hit = 0
    for l in op(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'run' or p.get('carrier') is None:
            continue
        X, pl, ev = p['xy'], p['players'], p['events']
        end = min(len(X), int(round(min(ev.get('first_contact', 99), ev.get('end', 99)) / 0.1)))
        if end < 12:
            continue
        runs += 1
        O = [i for i, q in enumerate(pl) if q['group'] in ('OL', 'TE')]
        D = [i for i, q in enumerate(pl) if q['group'] in ('DL', 'LB')]
        found = {}
        for d in D:
            run, blocked = 0, []
            for f in range(end):
                run = run + 1 if any(dist(X, d, o, f) <= 1.2 for o in O) else 0
                if run >= 3:
                    blocked.append(f)
            if not blocked:
                continue
            reps += 1
            bs = set(blocked)
            for f in range(blocked[0], end - 8):
                if not (f in bs or any(g in bs for g in range(f - 5, f))):
                    continue
                if dist(X, d, p['carrier'], f) > 2 and all(speed(X, d, g) < 0.3 for g in range(f, f + 8)):
                    found[d] = f * 0.1; break
        flagged += len(found)
        if 'falls' in p:
            tf = {}
            for d, t in p['falls']:
                tf.setdefault(d, t)
            truth += sum(1 for d, t in tf.items() if t < end * 0.1)
            hit += sum(1 for d, t in found.items() if d in tf and -0.3 <= t - tf[d] <= 1.0)
    print(f"== {os.path.basename(path)}: {runs} runs (>= 1.2 s to first contact), {reps} blocked DL/LB reps; flagged {flagged} ({flagged / max(1, reps):.1%} of reps, {flagged / max(1, runs):.2f} a run)")
    if truth:
        print(f"   sim truth: {truth} defender falls in run blocks before first contact; recall {hit / truth:.0%}; precision {hit / max(1, flagged):.0%}")
