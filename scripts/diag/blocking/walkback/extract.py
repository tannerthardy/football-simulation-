"""Re-implements held-walkback.py's pair logic exactly, keeps per-pair detail, and adds uncovered-OL records.
usage: python3 -I extract.py plays.jsonl.gz players.csv out.pkl"""
import sys, json, gzip, math, csv, pickle
sys.path.insert(0, '/home/user/football-simulation-/scripts/mechanics')
from metrics import Play
plays_path, players_path, out = sys.argv[1:4]
weight = {}
with open(players_path, newline='') as h:
    for r in csv.DictReader(h):
        try: weight[str(r['nflId'])] = float(r['weight'])
        except ValueError: pass
pairs, unc = [], []
for line in gzip.open(plays_path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'pass' or not raw.get('xy'): continue
    p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
    players = raw['players']
    OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
    qbs = p.who('O', 'QB')
    if len(OL) < 5 or not qbs: continue
    qb = qbs[0]; D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
    for b in OL[1:4]:
        wb = weight.get(str(players[b].get('id')))
        # uncovered per ol-set-depth.py: no defender within 1.2 yd from snap through 2.0 s / throw
        kend = min(p.k(2.0), p.k(end))
        covered = False
        for k in range(0, kend + 1):
            bx, by = p.pos(b, k)
            if bx is None: continue
            for d in D:
                dx, dy = p.pos(d, k)
                if dx is not None and math.hypot(dx - bx, dy - by) <= 1.2: covered = True; break
            if covered: break
        if not covered and wb is not None:
            fr = []
            for k in range(1, min(p.k(2.5), p.k(end)) + 1):
                (bx, by), (pbx, pby), (qx, qy) = p.pos(b, k), p.pos(b, k - 1), p.pos(qb, k)
                if None in (bx, pbx, qx): break
                ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1
                fr.append((k * p.dt, ((bx - pbx) * ux + (by - pby) * uy) / L / p.dt))
            unc.append({'pid': raw['id'], 'wb': wb, 'fr': fr})
        if wb is None: continue
        start = None; r = None
        for k in range(p.k(0.2), min(p.k(2.0), p.k(end)) + 1):
            bx, by = p.pos(b, k)
            if bx is None: continue
            near = [(math.hypot(p.pos(d, k)[0] - bx, p.pos(d, k)[1] - by), d) for d in D if p.pos(d, k)[0] is not None]
            near = [x for x in near if x[0] <= 1.2]
            if near: start = k; r = min(near)[1]; break
        if start is None: continue
        wr = weight.get(str(players[r].get('id')))
        if wr is None: continue
        t0 = start * p.dt; prev = None; fr = []; endreason = 'time'
        for k in range(start, p.k(min(end, t0 + 2.5)) + 1):
            (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(r, k), p.pos(qb, k)
            if None in (bx, rx, qx): endreason = 'missing'; break
            ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1
            sx, sy = rx - bx, ry - by; sep = math.hypot(sx, sy)
            ang = math.degrees(math.atan2((sx * -uy + sy * ux) / L, -(sx * ux + sy * uy) / L))
            if sep > 1.2 or abs(ang) > 70: endreason = 'sep' if sep > 1.2 else 'angle'; break
            # other defenders within 2 yd of blocker (not r); other OL within 2 yd of rusher (not b)
            od = sum(1 for d in D if d != r and p.pos(d, k)[0] is not None and p.dist(d, b, k) <= 2.0)
            oo = sum(1 for o in OL if o != b and p.dist(o, r, k) <= 2.0)
            row = {'k': k, 'dtc': k * p.dt - t0, 't': k * p.dt, 'sep': sep, 'spd_b': p.speed(b, k), 'spd_r': p.speed(r, k), 'od': od, 'oo': oo}
            if prev is not None:
                (pbx, pby), (prx, pry) = prev
                vx = ((bx - pbx) + (rx - prx)) / 2 / p.dt; vy = ((by - pby) + (ry - pry)) / 2 / p.dt
                lx, ly = qx - rx, qy - ry; ll = math.hypot(lx, ly) or 1
                row['vp'] = (vx * lx + vy * ly) / ll
                row['vb'] = ((bx - pbx) * ux + (by - pby) * uy) / L / p.dt   # blocker alone, toward QB
                row['vr'] = ((rx - prx) * lx + (ry - pry) * ly) / ll / p.dt   # rusher alone, toward QB
            fr.append(row)
            prev = ((bx, by), (rx, ry))
        pairs.append({'pid': raw['id'], 'b': b, 'r': r, 'wb': wb, 'wr': wr, 'rg': players[r]['group'], 'rpos': players[r].get('pos'),
                      'bpos': players[b].get('pos'), 't0': t0, 'fr': fr, 'endreason': endreason, 'throw': end})
pickle.dump({'pairs': pairs, 'unc': unc}, open(out, 'wb'))
print(len(pairs), len(unc))
