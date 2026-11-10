"""Pass blockers ending on the ground before the throw (Integration, 2026-11-10). Tracking has no 'down' flag, so: an OL
in a block ([OL, DL] in 'blocks') who goes still -- speed under 0.5 yd/s, from 0.1 s frame displacement over 0.2 s -- for
at least 1.0 s (a fall plus a get-up), starting at least 0.3 s after the snap and at least 1.0 s before the throw (or the
end), while his rusher at the start is within 2 yd and at the end is at least 2.5 yd from him (the man he was blocking left;
a set, anchored blocker keeps a rusher on him, and one who lost his man chases or turns rather than stands for a second).
Same code on NFL (out/mechanics/nfl-plays.jsonl.gz) and the sim's pass-frames.mts records; on the sim the record's true
falls give the operator's recall and precision. Rates are per dropback and per OL-rep.
usage: python3 -I olfall.py <nfl.jsonl.gz | sim pass-frames jsonl> [...]"""
import sys, os, json, gzip, math
def plays(path):
    op = gzip.open if path.endswith('.gz') else open
    for l in op(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') == 'pass' and p.get('blocks') is not None:
            yield p
def speed(X, i, f):
    a, b = max(0, f - 1), min(len(X) - 1, f + 1)
    if b == a:
        return 0.0
    return math.hypot(X[b][2 * i] - X[a][2 * i], X[b][2 * i + 1] - X[a][2 * i + 1]) / ((b - a) * 0.1)
def dist(X, i, j, f):
    return math.hypot(X[f][2 * i] - X[f][2 * j], X[f][2 * i + 1] - X[f][2 * j + 1])
RULES = {  # name: (speed limit yd/s, frames still, rusher must have left)
    'strict': (0.5, 10, True),
    # Upper bound: still for 0.8 s with no departure condition. Also counts an anchored stalemate, so on the NFL it can
    # only overstate falls. A sim fall slides ~0.6 s, then lies still through the get-up (pass-frames.mts truth).
    'bound': (0.3, 8, False),
}
def flag(X, ol, dl, end, lim, k, left):
    f = 3
    while f + k < end:
        if all(speed(X, ol, g) < lim for g in range(f, f + k)) and dist(X, ol, dl, f) <= 2 and (not left or dist(X, ol, dl, f + k) >= 2.5):
            return f * 0.1
        f += 1
    return None
for path, rule in [(a, r) for a in sys.argv[1:] for r in RULES]:
    lim, k, left = RULES[rule]
    n = reps = flagged = truth = hit = 0
    plays_flag = 0
    for p in plays(path):
        X = p['xy']; thr = p['events'].get('pass_forward'); end = len(X) if thr is None else min(len(X), int(round(thr / 0.1)))
        n += 1
        found = set()
        for ol, dl in p['blocks']:
            reps += 1
            t0 = flag(X, ol, dl, end, lim, k, left)
            if t0 is not None:
                found.add((ol, t0))
        flagged += len(found); plays_flag += bool(found)
        if 'falls' in p:
            tf = {}
            for ol, t in p['falls']:
                tf.setdefault(ol, t)
            truth += len(tf)
            hit += sum(1 for ol, t in found if ol in tf and -0.3 <= t - tf[ol] <= 1.0)
    print(f"== {os.path.basename(path)} [{rule}]: {n} dropbacks, {reps} OL-DL reps; flagged {flagged} ({flagged / max(1, reps):.1%} of reps, {plays_flag / max(1, n):.1%} of dropbacks)")
    if truth:
        print(f"   sim truth: {truth} OL falls before the throw; recall {hit / truth:.0%}; precision {hit / max(1, flagged):.0%}")
