"""Pursuit aim, same operator on NFL and sim common-format plays.
usage: python3 -I scripts/mechanics/pursuit_aim.py A.jsonl.gz [B.jsonl.gz ...]
Reports aim lead, forecast error, re-steering (>15 deg in 0.2 s) by distance band and by pursuer/carrier
speed ratio, and the response to runner cuts. Inputs: nfl_bdb2025.py and sim-export.ts common format.
Carrier: designed-run carrier once past the line, or the receiver from the catch, until the end.
Pursuer samples: defender 1.5-15 yd from the carrier, moving >2 yd/s, no other offensive player within
1.0 yd, not behind the carrier (bearing within 135 deg of his heading), carrier moving >2 yd/s.
"""
import gzip, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrics import Play  # noqa
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
def ang(ax, ay, bx, by): return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))
def measure(path):
    lead = {}; fe = {1: [], 2: [], 3: []}; cut = []; resteer = []; n = 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line); raw = raw.get("common", raw)
        if not raw.get("xy"): continue
        if raw["kind"] == "run" and raw.get("carrier") is not None:
            c = raw["carrier"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end))
            k0 = next((k for k in range(last + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        elif raw["kind"] == "pass" and raw.get("receiver") is not None and "catch" in raw.get("events", {}):
            c = raw["receiver"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end)); k0 = p.k(raw["events"]["catch"]) + 1
        else: continue
        if k0 is None or any(p.pos(c, k)[0] is None for k in range(k0, last + 1)): continue
        n += 1
        dfn = [d for d in p.who("D") if p.pos(d, 0)[0] is not None]
        mates = [o for o in p.who("O") if o != c]
        # first frame each defender is within 1.5 yd of the carrier
        reach = {d: next((k for k in range(k0, last + 1) if p.dist(c, d, k) <= 1.5), None) for d in dfn}
        for k in range(k0, last + 1):
            cx, cy = p.pos(c, k); vcx, vcy = p.velocity(c, k); cs = math.hypot(vcx, vcy)
            # forecast error of the straight-line extrapolation
            for h in (1, 2, 3):
                kk = k + int(round(h / p.dt))
                if kk <= last and cs > 2:
                    ax, ay = p.pos(c, kk); fe[h].append(math.hypot(ax - (cx + vcx * h), ay - (cy + vcy * h)))
            if cs < 2: continue
            # runner cut: heading change >30 deg over the last 0.5 s
            kb = k - int(round(0.5 / p.dt))
            if kb >= k0:
                pvx, pvy = p.velocity(c, kb)
                dc = ang(vcx, vcy, pvx, pvy) if math.hypot(pvx, pvy) > 2 else 0
            else: dc = 0
            for d in dfn:
                dx, dy = p.pos(d, k); rx, ry = cx - dx, cy - dy; dist = math.hypot(rx, ry)
                if not 1.5 <= dist <= 15 or ang(vcx, vcy, -rx, -ry) > 135: continue
                if any(p.dist(o, d, k) <= 1.0 for o in mates): continue
                vdx, vdy = p.velocity(d, k); s = math.hypot(vdx, vdy)
                if s < 2: continue
                # implied lead: the carrier-path time his heading points at
                best = None
                for i in range(0, 81):
                    t = i * 0.05; px, py = cx + vcx * t - dx, cy + vcy * t - dy
                    a = ang(vdx, vdy, px, py)
                    if best is None or a < best[0]: best = (a, t)
                ttc = (reach[d] - k) * p.dt if reach[d] is not None and reach[d] > k else None
                band = "ttc<1" if ttc is not None and ttc < 1 else "ttc1-2" if ttc is not None and ttc < 2 else "ttc2+" if ttc is not None else "never"
                for key in ("all", band, "d" + ("0-5" if dist < 5 else "5-10" if dist < 10 else "10-15")):
                    L = lead.setdefault(key, {"n": 0, "lead": [], "miss": 0, "ratio": []})
                    L["n"] += 1
                    if best[0] <= 10:
                        L["lead"].append(best[1])
                        if ttc: L["ratio"].append(best[1] / ttc)
                    else: L["miss"] += 1
                # re-steering: his heading change over the next 0.2 s
                k2 = k + int(round(0.2 / p.dt))
                if k2 <= last:
                    v2 = p.velocity(d, k2)
                    if math.hypot(*v2) > 2:
                        r_ = ang(vdx, vdy, *v2); resteer.append(r_)
                        bk = "1.5-3" if dist < 3 else "3-6" if dist < 6 else "6-10" if dist < 10 else "10-15"
                        RB.setdefault(bk, []).append(r_)
                        rat = s / max(cs, 0.1)
                        rk = "slow<0.8" if rat < 0.8 else "match0.8-1.1" if rat < 1.1 else "fast>1.1"
                        RS.setdefault(bk + " " + rk, []).append(r_)
                        # closing: rate of distance change (negative = closing)
                        RC.setdefault(bk, []).append(rat)
                # response to a cut, for defenders 3-12 yd away
                if dc > 30 and 3 <= dist <= 12:
                    out = []
                    for h in (0.3, 0.6, 1.0):
                        kh = k + int(round(h / p.dt))
                        if kh > last: out.append(None); continue
                        v2 = p.velocity(d, kh); out.append(ang(vdx, vdy, *v2) if math.hypot(*v2) > 1 else None)
                    cut.append((dc, out))
    return n, lead, fe, cut, resteer
RB = {}; RS = {}; RC = {}
for path in sys.argv[1:]:
    RB.clear(); RS.clear(); RC.clear()
    n, lead, fe, cut, rs = measure(path)
    print(f"== {os.path.basename(path)}: {n} carries")
    print("  straight-line forecast error (yd), median / p75:", {h: (round(q(v, .5), 2), round(q(v, .75), 2), len(v)) for h, v in fe.items()})
    for key in ("all", "ttc<1", "ttc1-2", "ttc2+", "never", "d0-5", "d5-10", "d10-15"):
        L = lead.get(key)
        if not L: continue
        print(f"  {key:7s} n={L['n']:6d} aims at carrier path {100*(1-L['miss']/L['n']):3.0f}%  lead median {q(L['lead'],.5):.2f}s p75 {q(L['lead'],.75):.2f}s  lead/ttc median {q(L['ratio'],.5):.2f}")
    print(f"  re-steer: heading change over 0.2 s median {q(rs,.5):.1f} deg, p90 {q(rs,.9):.1f}, share >15 deg {100*sum(r>15 for r in rs)/max(1,len(rs)):.1f}%  n={len(rs)}")
    tot = sum(len(v) for v in RB.values())
    for bk in ("1.5-3", "3-6", "6-10", "10-15"):
        v = RB.get(bk, [])
        print(f"  re-steer {bk:5s} yd: share >15 deg {100*sum(r>15 for r in v)/max(1,len(v)):5.1f}%  of samples {100*len(v)/max(1,tot):4.1f}%  of all re-steers {100*sum(r>15 for r in v)/max(1,sum(r>15 for r in rs)):4.1f}%")
    for bk in ("1.5-3", "3-6", "6-10", "10-15"):
        print(f"  speed ratio pursuer/carrier {bk:5s} yd: median {q(RC.get(bk, []), .5):.2f}  p25 {q(RC.get(bk, []), .25):.2f}")
        for rk in ("slow<0.8", "match0.8-1.1", "fast>1.1"):
            v = RS.get(bk + " " + rk, [])
            print(f"     {rk:13s} samples {100*len(v)/max(1,len(RB.get(bk, []))):4.0f}%  re-steer >15 {100*sum(r>15 for r in v)/max(1,len(v)):5.1f}%")
    for i, h in enumerate((0.3, 0.6, 1.0)):
        v = [o[i] for _, o in cut if o[i] is not None]
        print(f"  after a runner cut >30 deg: pursuer heading change at +{h}s median {q(v,.5):.0f} deg (n={len(v)})")
