"""Do paths flow or scribble? Per player, snap to min(end, 3.5 s), 10 Hz,
positions smoothed by nothing. Over sliding 1.0 s windows (step 0.5 s):
  travel     path length (yd)
  straight   net displacement / path length (1 = straight line, 0 = back where he started)
Windows with travel >= 0.5 yd only. Also total path length per player, and
the share of 1 s windows that are 'scribbles' (straightness < 0.6). By group;
the same operator for NFL (--ytg60) and sim.
usage: hooks.py FILE [--ytg60] [--concepts "outside zone,inside zone"] (NFL labels or sim id prefixes)"""
import gzip, json, math, sys
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = [c for c in (sys.argv[sys.argv.index('--concepts') + 1].split(',') if '--concepts' in sys.argv else []) if c]
acc = {}
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))] if v else float('nan')
for line in gzip.open(path, 'rt'):
    r = json.loads(line); r = r.get('common', r)
    if r.get('kind') != 'run' or r.get('carrier') is None: continue
    if ytg is not None and r.get('source') != 'sim' and ytg.get(r['id'], 0) < 60: continue
    con = str((r.get('cell') or {}).get('concept') or '').lower()
    if want and not any(str(r['id']).lower().startswith(c + '/') or con == c for c in want): continue
    xy, dt, ev = r['xy'], r['dt'], r.get('events') or {}
    k1 = int(round(min(ev.get('end', 3.5), 3.5, (len(xy) - 1) * dt) / dt))
    if k1 < 10: continue
    for i, pl in enumerate(r['players']):
        if i == r['carrier']: continue
        pts = [(xy[k][2 * i], xy[k][2 * i + 1]) for k in range(k1 + 1)]
        if any(p[0] is None for p in pts): continue
        g = f"{pl['side']} {pl['group']}"
        a = acc.setdefault(g, {'st': [], 'tr': [], 'total': [], 'lat': []})
        seg = [math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1)]
        a['total'].append(sum(seg)); a['lat'].append(abs(pts[-1][1] - pts[0][1]))
        w = int(round(1 / dt)); s = max(1, w // 2)
        for k in range(0, len(pts) - w, s):
            tr = sum(seg[k:k + w])
            if tr < .5: continue
            net = math.hypot(pts[k + w][0] - pts[k][0], pts[k + w][1] - pts[k][1])
            a['st'].append(net / tr); a['tr'].append(tr)
print(path.split('/')[-1][:30], ','.join(want))
print(f"  {'group':6s} {'path yd p50':>11s} {'net lateral p50':>15s} {'1s straightness p10/p25/p50':>28s} {'scribble share':>14s}")
for g in sorted(acc):
    a = acc[g]
    if len(a['total']) < 20: continue
    print(f"  {g:6s} {q(a['total'], .5):11.1f} {q(a['lat'], .5):15.1f} {q(a['st'], .1):12.2f}/{q(a['st'], .25):.2f}/{q(a['st'], .5):.2f} {sum(x < .6 for x in a['st']) / max(1, len(a['st'])):14.0%}")
