"""Table for target-route.ts rows: share of targets by route label, per arm. Labels (mine, by route id; Rules+Coaching's
cut may group differently): FLAT = flat, arrow, back_flat, swing, checkdown, back_out, bubble, now_screen, slip_screen,
te_screen, tunnel; CROSS = cross, shallow, shallow_high, under; IN = dig, short_in, slant; DEEP = go, fade, seam,
seam_read, post, corner, deep_out, wheel; SHORT-OUT = quick_out, out, stick, hitch, curl, hook, comeback, angle.
   python3 -I target_route_table.py name=rows.jsonl ...   (first arm is the reference for the differences)"""
import json, sys
G = {'FLAT': 'flat arrow back_flat swing checkdown back_out bubble now_screen slip_screen te_screen tunnel'.split(), 'CROSS': 'cross shallow shallow_high under'.split(),
     'IN': 'dig short_in slant'.split(), 'DEEP': 'go fade seam seam_read post corner deep_out wheel'.split(), 'SHORT-OUT': 'quick_out out stick hitch curl hook comeback angle'.split()}
lab = lambda r: next((k for k, v in G.items() if r in v), 'OTHER')
ref = None; print(f"{'arm':22s} {'n':>5s}  " + '  '.join(f"{k:>9s}" for k in list(G) + ['OTHER']) + '   back check-down   comp   INT')
for arg in sys.argv[1:]:
    name, path = arg.split('=', 1); R = [json.loads(l) for p in path.split(',') for l in open(p) if l.startswith('{')]; n = len(R)
    sh = {k: 100 * sum(lab(r['route']) == k for r in R) / max(1, n) for k in list(G) + ['OTHER']}
    if ref is None: ref = sh
    print(f"{name:22s} {n:5d}  " + '  '.join(f"{sh[k]:5.1f}{sh[k] - ref[k]:+5.1f}" if ref is not sh else f"{sh[k]:9.1f}" for k in sh) + f"   {100 * sum(r['route'] in ('checkdown', 'back_flat', 'back_out') for r in R) / max(1, n):6.1f}%        {100 * sum(r['cmp'] for r in R) / max(1, n):4.1f}  {100 * sum(r['int'] for r in R) / max(1, n):4.1f}")
