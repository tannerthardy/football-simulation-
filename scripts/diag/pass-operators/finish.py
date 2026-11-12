"""The finish after a catch with a defender close (same code, NFL and sim): catches whose nearest defender is 1-3 yd
from the catcher at the ball's arrival (pass_arrived, else catch).

usage: python3 -I scripts/diag/pass-operators/finish.py <plays.jsonl.gz> [...]

Per catch, the nearest defender at arrival ('the finisher'): his speed and closing speed on the catcher (relative
velocity along the line between them) at arrival; time from arrival to first contact (events.first_contact; else
the first frame a defender's centre is within 1.0 yd of the carrier); where contact lands on the catcher (the
contacting defender's bearing relative to the catcher's heading: front < 60 deg, side 60-120, behind > 120); whether
the first-contact defender is the finisher; yards after first contact (carrier x at the play's end minus at first
contact) and the play ending within 1.0 s of first contact; YAC. Split man / zone (play coverage label)."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'catch' not in ev: continue
        c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
        if c is None: continue
        p = Play(raw); ka = p.k(ev.get('pass_arrived', ev['catch'])); ke = min(p.k(ev['end']), p.frames - 1)
        if p.pos(c, ka)[0] is None: continue
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
        if not D: continue
        f = min(D, key=lambda d: p.dist(c, d, ka)); dd = p.dist(c, f, ka)
        if not (1 <= dd < 3): continue
        cov = coverage_family((raw.get('cell') or {}).get('coverage')) or 'other'
        (cx, cy), (fx, fy) = p.pos(c, ka), p.pos(f, ka); L = math.hypot(cx - fx, cy - fy) or 1
        fvx, fvy = p.velocity(f, ka); cvx, cvy = p.velocity(c, ka)
        closing = ((fvx - cvx) * (cx - fx) + (fvy - cvy) * (cy - fy)) / L
        kf = None
        if 'first_contact' in ev and p.k(ev['first_contact']) >= ka: kf = p.k(ev['first_contact'])
        else:
            for k in range(ka, ke + 1):
                if p.pos(c, k)[0] is not None and any(p.pos(d, k)[0] is not None and p.dist(c, d, k) <= 1.0 for d in D): kf = k; break
        xe = next((p.pos(c, k)[0] for k in range(ke, ka - 1, -1) if p.pos(c, k)[0] is not None), None)
        o = {'dd': dd, 'fs': math.hypot(fvx, fvy), 'closing': closing, 'cs': math.hypot(cvx, cvy), 'yac': (xe - cx) if xe is not None else None}
        if kf is not None and kf <= ke and p.pos(c, kf)[0] is not None:
            hit = min((d for d in D if p.pos(d, kf)[0] is not None), key=lambda d: p.dist(c, d, kf))
            vx, vy = p.velocity(c, kf); hx, hy = p.pos(hit, kf)[0] - p.pos(c, kf)[0], p.pos(hit, kf)[1] - p.pos(c, kf)[1]
            sp = math.hypot(vx, vy)
            ang = math.degrees(math.acos(max(-1, min(1, (vx * hx + vy * hy) / ((sp or 1) * (math.hypot(hx, hy) or 1)))))) if sp > 0.5 else None
            o.update(tfc=(kf - ka) * p.dt, side=None if ang is None else 'front' if ang < 60 else 'side' if ang <= 120 else 'behind',
                     finisher=hit == f, after=(xe - p.pos(c, kf)[0]) if xe is not None else None, ends=(ke - kf) * p.dt <= 1.0)
        for key in (cov, 'all'): G[key].append(o)
    print('==', os.path.basename(path))
    for key in ('all', 'man', 'zone'):
        v = G[key]
        if not v: continue
        w = [o for o in v if 'tfc' in o]
        sides = collections.Counter(o['side'] for o in w)
        print(f"  {key:4} catches n {len(v):4} | finisher speed {q([o['fs'] for o in v]):.1f}, closing {q([o['closing'] for o in v]):+.1f} yd/s, catcher speed {q([o['cs'] for o in v]):.1f} | "
              f"contact within the play {100*len(w)/len(v):.0f}%, time to first contact p50 {q([o['tfc'] for o in w]):.2f} s (p75 {q([o['tfc'] for o in w],.75):.2f}) | "
              f"by the finisher {100*sum(o['finisher'] for o in w)/max(1,len(w)):.0f}% | contact front/side/behind {100*sides['front']/max(1,len(w)):.0f}/{100*sides['side']/max(1,len(w)):.0f}/{100*sides['behind']/max(1,len(w)):.0f}% | "
              f"yards after contact p50 {q([o['after'] for o in w if o['after'] is not None]):.1f} (p75 {q([o['after'] for o in w if o['after'] is not None],.75):.1f}), play over within 1 s {100*sum(o['ends'] for o in w)/max(1,len(w)):.0f}% | "
              f"YAC p50 {q([o['yac'] for o in v if o['yac'] is not None]):.1f}")
