"""QB lane: the fit for QB_PHASE, from our own outcomes. Reads deep-forced.ts rows (mode all: every throw he chooses,
with the nearest defender's state at the release). What a quarterback can see of that man:
  closeness c = 1 at 1 yd of separation or less, falling to 0 at 3 yd;
  match     v = 1 when the defender's velocity equals the receiver's, falling to 0 when it differs by the larger of
              the receiver's speed and 3 yd/s (he is running with him, or he is not);
  phase     = c x v;
  leverage  = the defender's offset from the receiver along the receiver's line to the aim point: 1 at 1.5 yd toward
              the aim or more, 0.5 level with him, 0 at 1.5 yd behind (trailing).
The belief's cost of a defender in phase is  phase x (TRAIL + (LEVER - TRAIL) x leverage): the share of the completion
he takes away. This script prints completion by phase and by leverage, and the two numbers that best reproduce
completion relative to the throws with no defender in phase (least squares over the cells), for the receiver engine
the rows were taken on. Refit whenever the receiver or the coverage at the catch changes.
usage: python3 -I phase_fit.py name=rows.jsonl,... [name2=...]"""
import sys, json
clamp = lambda x, lo=0.0, hi=1.0: max(lo, min(hi, x))
def feats(r):
    s = r['see']; c = clamp((3 - r['sep']) / 2); v = clamp(1 - s['dv'] / max(s['recSpeed'], 3.0))
    return c * v, clamp(0.5 + s['along'] / 3.0)
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1)
    R = [r for p in paths.split(',') for l in open(p) if l.startswith('{') and l.rstrip().endswith('}') for r in [json.loads(l)] if r.get('see') and r.get('arr') and r.get('P') is not None]
    F = [(feats(r), r) for r in R]; rate = lambda S: sum(r['cmp'] for _, r in S) / max(1, len(S))
    base = [x for x in F if x[0][0] < 0.05]; b = rate(base)
    print(f"== {name}: throws {len(R)}; no defender in phase (phase < 0.05): n {len(base)}, complete {100 * b:.0f}%")
    print("   by phase:")
    for lo, hi in ((0.05, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1.01)):
        S = [x for x in F if lo <= x[0][0] < hi]
        if len(S) >= 15: print(f"     {lo:.2f}-{hi:.2f}: n {len(S):4d} | complete {100 * rate(S):3.0f}% ({rate(S) / b:.2f} of base) | picked {sum(r['picked'] for _, r in S)} | he priced {sum(r['P'] for _, r in S) / len(S):.2f}, pOpen {sum(r['pOpen'] for _, r in S) / len(S):.2f} | separation {sorted(r['sep'] for _, r in S)[len(S) // 2]:.1f}")
    print("   phase 0.25 and over, by leverage:")
    cells = []
    for plo, phi in ((0.25, 0.6), (0.6, 1.01)):
        for llo, lhi in ((0, 0.34), (0.34, 0.67), (0.67, 1.01)):
            S = [x for x in F if plo <= x[0][0] < phi and llo <= x[0][1] < lhi]
            if len(S) >= 12:
                ph = sum(x[0][0] for x in S) / len(S); lv = sum(x[0][1] for x in S) / len(S); cells.append((ph, lv, 1 - rate(S) / b, len(S)))
                print(f"     phase {plo:.2f}-{phi:.2f} leverage {llo:.2f}-{lhi:.2f}: n {len(S):3d} | complete {100 * rate(S):3.0f}% | cost {1 - rate(S) / b:+.2f} | picked {sum(r['picked'] for _, r in S)}")
    # least squares: cost = phase x (T + (L - T) x leverage), weighted by n
    best = None
    for ti in range(0, 81, 2):
        for li in range(0, 101, 2):
            T, Lv = ti / 100, li / 100; e = sum(n * (c - ph * (T + (Lv - T) * lv)) ** 2 for ph, lv, c, n in cells)
            if best is None or e < best[0]: best = (e, T, Lv)
    if best: print(f"   fit over {len(cells)} cells: TRAIL {best[1]:.2f}, LEVER {best[2]:.2f} (the share of the completion a defender fully in phase takes: trailing; with leverage)")
