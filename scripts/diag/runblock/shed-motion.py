"""Leverage sheds by eventual stoppers: over the 0.5 s before the shed, who
moved? Defender gain toward the carrier relative to the blocker, blocker
travel along his drive line, and both bodies' travel. Input: film JSON."""
import json, math, sys
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    gain, bdrive, bmove, dmove, dpen = [], [], [], [], []
    for r in json.load(open(path)):
        if 'film' not in r or 'contact' not in r: continue
        slots = r['slots']; s = slots.index(r['contact']['stopper'])
        for sh in r['sheds']:
            if sh['d'] != r['contact']['stopper'] or 'leverage' not in sh['why']: continue
            b = slots.index(sh['b'])
            fr = [f for f in r['film'] if sh['t'] - 0.5 - 1e-6 <= f[0] <= sh['t'] + 1e-6 and any(e[0] == b and e[1] == s for e in f[3])]
            if len(fr) < 4: continue
            f0, f1 = fr[0], fr[-1]
            e0 = next(e for e in f0[3] if e[0] == b and e[1] == s)
            D0, B0, D1, B1 = f0[2][s], f0[2][b], f1[2][s], f1[2][b]
            C = f1[2][f1[1]]
            u = (C[0] - D1[0], C[1] - D1[1]); L = math.hypot(*u) or 1; u = (u[0] / L, u[1] / L)
            rel0 = (D0[0] - B0[0], D0[1] - B0[1]); rel1 = (D1[0] - B1[0], D1[1] - B1[1])
            gain.append((rel1[0] - rel0[0]) * u[0] + (rel1[1] - rel0[1]) * u[1])
            dv = (e0[3], e0[4]); dl = math.hypot(*dv) or 1
            bdrive.append(((B1[0] - B0[0]) * dv[0] + (B1[1] - B0[1]) * dv[1]) / dl)
            bmove.append(math.hypot(B1[0] - B0[0], B1[1] - B0[1])); dmove.append(math.hypot(D1[0] - D0[0], D1[1] - D0[1]))
            dpen.append(-(D1[0] - D0[0]))
    print(f"{label}: n={len(gain)} | defender gain toward ball rel. blocker p50 {q(gain,.5):+.2f} yd | blocker travel along drive p50 {q(bdrive,.5):+.2f} | blocker travel {q(bmove,.5):.2f} defender travel {q(dmove,.5):.2f} | defender into backfield p50 {q(dpen,.5):+.2f}")
