"""QB lane, 2026-11-15: measurement 4 of the drop set. Does his read move with his feet?
Reads drop-reads.ts rows. Footwork events from his trajectory (0.05 s), with drop-steps.py's definitions: the plant
(after his fastest backward movement, the first sample he moves back slower than 1 yd/s), and each hitch (a forward
movement of 0.3+ yd after the plant: its start and its end, a stop under 0.5 yd/s). For his read changes (the read
index moving on, after the first) and his eye changes (sim.qbEyes to a new man), the time from the nearest footwork
event, against what a change at a random moment in the same window would show (the share of the window within
+/-0.15 s of an event). And the release: within 0.15 s of a footwork event ('on a step') or not.
As taught (docs/football-handbook/qb-drops-and-pocket.md): read 1 at the plant, each later read on a hitch, the ball
out on the plant or the hitch.
usage: python3 -I drop_reads_table.py rows.jsonl ..."""
import sys, json, math
DT, W = 0.05, 0.15
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))


def events(xs, end):
    n = min(len(xs), int(round(end / DT)) + 1)
    X = xs[:n]
    if n < 8: return None
    v = lambda k: (X[min(k + 1, n - 1)] - X[max(k - 1, 0)]) / ((min(k + 1, n - 1) - max(k - 1, 0)) * DT)
    deep = min(X); kd = next(k for k, x in enumerate(X) if x <= deep + 0.25)
    if X[0] - deep < 1: return None
    kpk = min(range(1, kd + 1), key=v)
    kt = next((k for k in range(kpk, n) if v(k) > -1.0), n - 1)
    ev = [('plant', kt * DT)]; moving = False
    for k in range(kt, n):
        if not moving and v(k) > 0.5: moving, k0 = True, k
        elif moving and (abs(v(k)) < 0.5 or k == n - 1):
            moving = False
            if X[k] - X[k0] >= 0.3: ev += [('hitch', k0 * DT), ('hitch-end', k * DT)]
    return ev


rows = [json.loads(l) for f in sys.argv[1:] for l in open(f)]
G = {}
for r in rows:
    end = r['rel'] if r['rel'] is not None else len(r['xs']) * DT
    ev = events(r['xs'], end)
    if not ev: continue
    plant = ev[0][1]; times = [t for _, t in ev]
    key = (r['drop'] or '?', r.get('kind') or '?')
    g = G.setdefault(key, {'n': 0, 'first': [], 'adv': [], 'eye': [], 'cover': [], 'rel': [], 'relOn': 0, 'nrel': 0, 'hitch': 0})
    g['n'] += 1; g['hitch'] += any(k == 'hitch' for k, _ in ev)
    # The window his changes could fall in: from the snap to the release (or the end).
    lo, hi = 0.0, end
    cov = sum(max(0.0, min(hi, t + W) - max(lo, t - W)) for t in times) / max(hi - lo, 1e-6)
    g['cover'].append(min(1.0, cov))
    near = lambda t: min(times, key=lambda e: abs(e - t))
    adv = [t for t, _ in r['adv'][1:] if t <= end]
    if adv: g['first'].append(adv[0] - plant)
    for t in adv: g['adv'].append(t - near(t))
    for t, s in r.get('eyes', [])[2:]:  # the first placement is at the set (the plant): not a change
        if t <= end and s is not None: g['eye'].append(t - near(t))
    if r['rel'] is not None:
        g['nrel'] += 1; d = r['rel'] - near(r['rel']); g['rel'].append(r['rel'] - plant)
        if abs(d) <= W: g['relOn'] += 1
print(f"dropbacks {len(rows)}; footwork events by drop-steps.py's definitions; 'on' = within {W} s of a footwork event")
for key in sorted(G, key=lambda k: -G[k]['n']):
    g = G[key]
    if g['n'] < 10: continue
    on = lambda L: f"{100 * sum(1 for d in L if abs(d) <= W) / len(L):.0f}%" if L else '-'
    print(f"  {key[0]:>10} {key[1]:<9} n {g['n']:4d} | a hitch {100 * g['hitch'] / g['n']:.0f}% | chance of 'on' {100 * q(g['cover']):.0f}%"
          f" | read changes {len(g['adv'])} on {on(g['adv'])}, first change from the plant p25/50/75 {q(g['first'], .25):+.2f}/{q(g['first']):+.2f}/{q(g['first'], .75):+.2f} s"
          f" | eye changes {len(g['eye'])} on {on(g['eye'])} | release from the plant p50 {q(g['rel']):+.2f} s, on a footwork event {100 * g['relOn'] / max(g['nrel'], 1):.0f}%")
