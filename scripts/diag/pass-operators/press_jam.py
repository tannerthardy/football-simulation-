"""The press at the line, both sides (same code, NFL and sim): what the corner does and what contact costs.

usage: python3 -I scripts/diag/pass-operators/press_jam.py <plays.jsonl.gz> [...]

Population: pass plays; each WR with a defender within 2.5 yd of him at the snap ('the corner'), alignment wide
(widest on his side) or inside. Tracking has no hands, so contact is a proxy: centres within 1.0 yd. Per pair:
  - corner's first step: his downfield (+ = giving ground) and lateral move toward the receiver's release over
    0.3 and 0.5 s; his speed at 0.5 s;
  - contact in the first 1.0 s: any, first time, frames within 1.0 yd;
  - the receiver: speed at 0.5 and 0.8 s, distance covered by 0.8 s, depth at 0.8 / 1.5 s, lateral at 0.8 s;
    split by contact / no contact, so the contact's cost is the difference at the same alignment;
  - when he is level with the corner (receiver x >= corner x);
  - sim only: the sim's own jam events (labels.jams, if exported)."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        p = Play(raw)
        if p.frames < 16: continue
        pl = raw['players']; bx = raw.get('ball_y', 26.65)
        WR = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'WR' and p.pos(i, 0)[0] is not None]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        fam = coverage_family((raw.get('cell') or {}).get('coverage')) or 'other'
        for r in WR:
            c = min(D, key=lambda d: p.dist(r, d, 0))
            if p.dist(r, c, 0) > 2.5: continue
            (rx, ry), (cx, cy) = p.pos(r, 0), p.pos(c, 0); side = 1 if ry > bx else -1
            wide = all(side * (p.pos(o, 0)[1] - ry) <= 0 for o in WR if o != r and side * (p.pos(o, 0)[1] - bx) > 0)
            k3, k5, k8, k10, k15 = p.k(0.3), p.k(0.5), p.k(0.8), p.k(1.0), min(p.frames - 1, p.k(1.5))
            rel = (p.pos(r, k8)[1] - ry)  # receiver's lateral move by 0.8 s
            rs = 1 if rel >= 0 else -1
            cont = [k for k in range(0, k10 + 1) if p.dist(r, c, k) <= 1.0]
            dist08 = sum(math.hypot(p.pos(r, k)[0] - p.pos(r, k - 1)[0], p.pos(r, k)[1] - p.pos(r, k - 1)[1]) for k in range(1, k8 + 1))
            level = next((k * p.dt for k in range(1, min(p.frames, p.k(3.0))) if p.pos(r, k)[0] >= p.pos(c, k)[0]), None)
            o = dict(wide=wide, fam=fam, cgive3=p.pos(c, k3)[0] - cx, cgive5=p.pos(c, k5)[0] - cx,
                     clat5=(p.pos(c, k5)[1] - cy) * rs, cs5=p.speed(c, k5), contact=bool(cont), tc=cont[0] * p.dt if cont else None,
                     nc=len(cont) * p.dt, rs5=p.speed(r, k5), rs8=p.speed(r, k8), d08=dist08, x08=p.pos(r, k8)[0] - rx,
                     x15=p.pos(r, k15)[0] - rx, lat08=abs(rel), level=level, gap0=p.dist(r, c, 0))
            jams = (raw.get('labels') or {}).get('jams')
            if jams is not None: o['jam'] = any(j.get('c') == c and j.get('r') == r for j in jams)
            for key in ('all', 'wide' if wide else 'inside', fam):
                G[key].append(o)
    print(f'== {os.path.basename(path)}')
    for key in ('all', 'wide', 'inside', 'man', 'zone'):
        v = G[key]
        if not v: continue
        lv = [o['level'] for o in v if o['level'] is not None]
        print(f"  {key:6} n {len(v):5} | snap gap {q([o['gap0'] for o in v]):.2f} | corner at 0.3 / 0.5 s: gives {q([o['cgive3'] for o in v]):+.2f} / {q([o['cgive5'] for o in v]):+.2f} yd, "
              f"toward release {q([o['clat5'] for o in v]):+.2f}, speed {q([o['cs5'] for o in v]):.1f} | contact in 1.0 s {100*sum(o['contact'] for o in v)/len(v):.0f}%"
              + (f" (sim jam events {100*sum(o.get('jam', 0) for o in v)/len(v):.0f}%)" if 'jam' in v[0] else '')
              + f" | level with corner p50 {q(lv):.1f} s ({100*len(lv)/len(v):.0f}% by 3 s)")
        for lab, w in (('contact', [o for o in v if o['contact']]), ('none', [o for o in v if not o['contact']])):
            if not w: continue
            print(f"     {lab:7} n {len(w):5} | first contact p50 {q([o['tc'] for o in w if o['tc'] is not None]):.2f} s, frames within 1 yd p50 {q([o['nc'] for o in w]):.1f} s | "
                  f"rec speed 0.5 / 0.8 s {q([o['rs5'] for o in w]):.1f} / {q([o['rs8'] for o in w]):.1f} | path by 0.8 s {q([o['d08'] for o in w]):.2f} yd, depth 0.8 / 1.5 s {q([o['x08'] for o in w]):.2f} / {q([o['x15'] for o in w]):.2f}, lateral 0.8 s {q([o['lat08'] for o in w]):.2f}")
