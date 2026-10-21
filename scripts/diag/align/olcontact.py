"""Time from the snap until each offensive lineman (and inline TE) first comes
within 1.2 yd (centre to centre) of a defender who started on the line (<2 yd
deep), on zone runs: NFL tracking vs sim, same code. Reports p25/p50/p75 by
position and the lineman's depth behind the ball at the snap.
usage: olcontact.py FILE [FILE ...]"""
import gzip, json, sys
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
ZONE = ('INSIDE ZONE', 'OUTSIDE ZONE', 'insideZone', 'outsideZone', 'wideZone')
for path in sys.argv[1:]:
    t = {'C': [], 'G': [], 'T': [], 'TE': []}; dep = {'C': [], 'G': [], 'T': [], 'TE': []}
    for line in gzip.open(path, 'rt'):
        r = json.loads(line)
        if r.get('kind') != 'run' or (r.get('cell') or {}).get('concept') not in ZONE: continue
        xy, P, dt = r['xy'], r['players'], r['dt']
        x0 = xy[0]
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and x0[2 * i] is not None], key=lambda i: x0[2 * i + 1])
        if len(ol) != 5: continue
        los, by = x0[2 * ol[2]] + .3, x0[2 * ol[2] + 1]
        tack = max(abs(x0[2 * ol[0] + 1] - by), abs(x0[2 * ol[4] + 1] - by))
        te = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'TE' and x0[2 * i] is not None
              and 0 < abs(x0[2 * i + 1] - by) - tack < 2.6 and los - x0[2 * i] < 2.5]
        dl = [i for i, p in enumerate(P) if p['side'] == 'D' and x0[2 * i] is not None and x0[2 * i] - los < 2]
        named = [(ol[2], 'C'), (ol[1], 'G'), (ol[3], 'G'), (ol[0], 'T'), (ol[4], 'T')] + [(i, 'TE') for i in te]
        for i, pos in named:
            dep[pos].append(los - x0[2 * i])
            for k in range(min(len(xy), int(2.0 / dt))):
                f = xy[k]
                if f[2 * i] is None: continue
                if any(f[2 * d] is not None and ((f[2 * i] - f[2 * d]) ** 2 + (f[2 * i + 1] - f[2 * d + 1]) ** 2) ** .5 < 1.2 for d in dl):
                    t[pos].append(k * dt); break
    print(f"== {path.split('/')[-1]}")
    for pos in t:
        if t[pos]: print(f"  {pos:2s} n {len(t[pos]):5d} depth p50 {q(dep[pos]):.2f} | first within 1.2 yd of a DL: p25/50/75 {q(t[pos], .25)}/{q(t[pos])}/{q(t[pos], .75)} s")
