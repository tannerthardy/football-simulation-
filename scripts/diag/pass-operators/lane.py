"""A defender in the receiver's lane before the throw: does the receiver path around him (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/lane.py <plays.jsonl.gz> [...]

Population: pass plays; WR/TE route runners from 0.3 s after the snap to the throw (pass_forward). An encounter starts
at the first frame a defender is 'in his lane': 1.5-4 yd ahead along the receiver's heading (speed >= 2 yd/s) and
within 0.6 yd of that heading line. The receiver's path is then followed to his closest approach to the defender
(or 1.2 s, or the throw).
Per encounter: lateral offset of the receiver from his original line at the closest approach (yd, away from the side
the defender was on = +), when it began (first frame the offset passes 0.3 yd, as time before the closest approach),
the closest distance between their centres (bodies about touch at 0.7), the receiver's speed at the start and at the
closest approach, whether the defender was moving into the receiver (his velocity along the line to the receiver >
0.5 yd/s), and the side taken: away from the defender's offset (his open shoulder) or across him.
Reported by depth of the encounter (< 5, 5-10, 10+) and for all; and for a retreating defender (moving away along
the receiver's line faster than 1 yd/s at the start: Defense's 'runs into a retreating defender' case)."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')


def encounters(p, kr):
    D = p.who('D')
    for r in p.who('O'):
        if p.players[r]['group'] not in ('WR', 'TE'): continue
        k = int(round(0.3 / p.dt)); used = set()
        while k < kr:
            if p.pos(r, k)[0] is None: k += 1; continue
            vx, vy = p.velocity(r, k); s = math.hypot(vx, vy)
            if s < 2: k += 1; continue
            ux, uy = vx / s, vy / s; (rx, ry) = p.pos(r, k); hit = None
            for d in D:
                if d in used or p.pos(d, k)[0] is None: continue
                dx, dy = p.pos(d, k)[0] - rx, p.pos(d, k)[1] - ry
                along, lat = dx * ux + dy * uy, -dx * uy + dy * ux
                if 1.5 <= along <= 4 and abs(lat) <= 0.6: hit = (d, lat); break
            if not hit: k += 1; continue
            d, lat0 = hit; used.add(d)
            end = min(kr, k + int(round(1.2 / p.dt)), p.frames - 1)
            ks = [j for j in range(k, end + 1) if p.pos(r, j)[0] is not None and p.pos(d, j)[0] is not None]
            if len(ks) < 3: k += 1; continue
            kc = min(ks, key=lambda j: p.dist(r, d, j))
            side = -1 if lat0 > 0 else 1   # + = away from the defender's side
            off = lambda j: side * (-(p.pos(r, j)[0] - rx) * uy + (p.pos(r, j)[1] - ry) * ux)
            began = next(((kc - j) * p.dt for j in range(k, kc + 1) if abs(off(j)) > 0.3), None)
            (dxc, dyc), (rxc, ryc) = p.pos(d, kc), p.pos(r, kc); L = math.hypot(rxc - dxc, ryc - dyc) or 1
            dvx, dvy = p.velocity(d, kc); into = (dvx * (rxc - dxc) + dvy * (ryc - dyc)) / L > 0.5
            dv0x, dv0y = p.velocity(d, k); retreat = dv0x * ux + dv0y * uy > 1.0
            yield {'retreat': retreat, 'depth': rx, 'offset': off(kc), 'began': began, 'closest': p.dist(r, d, kc), 'v0': s,
                   'vc': math.hypot(*p.velocity(r, kc)), 'into': into, 'away': off(kc) > 0.3, 'across': off(kc) < -0.3}
            k = kc + 1


for path in sys.argv[1:]:
    G = collections.defaultdict(list); n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'pass_forward' not in ev: continue
        p = Play(raw); n += 1
        for e in encounters(p, p.k(ev['pass_forward'])):
            b = '<5' if e['depth'] < 5 else '5-10' if e['depth'] < 10 else '10+'
            for key in (b, 'all'): G[key].append(e)
    print(f"== {os.path.basename(path)}: {n} pass plays")
    for key in ('<5', '5-10', '10+', 'all'):
        v = G[key]
        if not v: continue
        nd = [e for e in v if not e['into']]
        print(f"  depth {key:5} n {len(v):5} ({100*len(v)/n:.0f} per 100 plays) | offset at passing p25/50/75 {q([e['offset'] for e in v],.25):+.2f} {q([e['offset'] for e in v]):+.2f} {q([e['offset'] for e in v],.75):+.2f} | "
              f"went around (>0.3 yd away) {100*sum(e['away'] for e in v)/len(v):.0f}%, across him {100*sum(e['across'] for e in v)/len(v):.0f}% | began p50 {q([e['began'] for e in v if e['began'] is not None]):.2f} s before | "
              f"closest p50 {q([e['closest'] for e in v]):.2f} yd, bodies touching (<0.7) {100*sum(e['closest']<0.7 for e in v)/len(v):.0f}% | speed {q([e['v0'] for e in v]):.1f} -> {q([e['vc'] for e in v]):.1f} | "
              f"defender not moving into him: n {len(nd)}, touching {100*sum(e['closest']<0.7 for e in nd)/max(1,len(nd)):.0f}%")
        rt = [e for e in v if e['retreat']]
        if rt: print(f"      retreating defender (moving away along his line > 1 yd/s): n {len(rt)} ({100*len(rt)/n:.0f} per 100 plays) | went around {100*sum(e['away'] or e['across'] for e in rt)/len(rt):.0f}% | touching {100*sum(e['closest']<0.7 for e in rt)/len(rt):.0f}% | closest p50 {q([e['closest'] for e in rt]):.2f} | speed {q([e['v0'] for e in rt]):.1f} -> {q([e['vc'] for e in rt]):.1f}")
