"""usage: python3 -I scripts/diag/pass-operators/tight_release.py <plays.jsonl.gz> [...]

Receivers aligned tight to the line, whatever their listed position (WR or TE), same code for NFL and sim: lateral
split within 2 yd outside the outermost OL on his side at the snap. On the ball = his depth within 0.6 yd of the
deepest-forward OL's x; off the ball otherwise. Per group: listed position mix, nearest defender within 2.5 yd and
a lineman, bodies touching; and for routing, his depth off the line, his split from the tackle and the widest DL on his side relative to the tackle (+ = outside), that defender (centres < 0.8 yd in 1.0 s), and press_stall.py's stall against him."""
import sys, os, json, gzip, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        p = Play(raw)
        if p.frames < 22: continue
        pl = raw['players']; bx = raw.get('ball_y', 26.65)
        OL = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'OL' and p.pos(i, 0)[0] is not None]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        if len(OL) < 4 or not D: continue
        olx = max(p.pos(o, 0)[0] for o in OL)
        for r, a in enumerate(pl):
            if a['side'] != 'O' or a['group'] not in ('WR', 'TE') or p.pos(r, 0)[0] is None: continue
            ry = p.pos(r, 0)[1]; side = 1 if ry > bx else -1
            split = side * (ry - bx) - max(side * (p.pos(o, 0)[1] - bx) for o in OL)
            if split > 2 or split < -0.5: continue
            on = p.pos(r, 0)[0] >= olx - 0.6
            tackle = max(side * (p.pos(o, 0)[1] - bx) for o in OL)
            DLs = [d for d in D if pl[d]['group'] == 'DL' and side * (p.pos(d, 0)[1] - bx) > 0]
            edge = max((side * (p.pos(d, 0)[1] - bx) - tackle for d in DLs), default=None)
            c = min(D, key=lambda d: p.dist(r, d, 0)); near = p.dist(r, c, 0) <= 2.5
            k10, k2 = p.k(1.0), p.k(0.2)
            touch = near and min(p.dist(r, c, k) for k in range(0, k10 + 1)) < 0.8
            stall = near and any(p.pos(r, k)[0] < p.pos(c, k)[0] and p.dist(r, c, k) <= 1.5 and p.speed(r, k) < 4 and p.speed(r, k + k2) <= p.speed(r, k) + 0.1
                                 for k in range(p.k(0.1), p.k(0.9) + 1) if k + k2 < p.frames)
            G['on the ball' if on else 'off the ball'].append(dict(pos=a['group'], near=near, dl=near and pl[c]['group'] == 'DL', touch=touch, stall=stall,
                                                                  ahead=p.pos(c, 0)[0] - p.pos(r, 0)[0] if near else None, lat=abs(p.pos(c, 0)[1] - ry) if near else None,
                                                                  depth=olx - p.pos(r, 0)[0], split=split, edge=edge))
    tot = sum(len(v) for v in G.values())
    print(f'== {os.path.basename(path)}: receivers within 2 yd of the line\'s end {tot}')
    for k in ('on the ball', 'off the ball'):
        v = G[k]; n = max(1, len(v)); dl = [o for o in v if o['dl']]
        mix = collections.Counter(o['pos'] for o in v)
        print(f'   {k:12} n {len(v):5} ({100*len(v)/max(1,tot):.0f}%) {dict(mix)} | defender within 2.5 yd {100*sum(o["near"] for o in v)/n:3.0f}%, a lineman {100*len(dl)/n:3.0f}% '
              f'(at ahead {q([o["ahead"] for o in dl]):.2f} / lateral {q([o["lat"] for o in dl]):.2f}) | touching {100*sum(o["touch"] for o in v)/n:3.0f}% | stalled {100*sum(o["stall"] for o in v)/n:3.0f}%')
        for lab, w in (('all', v), ('lineman nearest', dl), ('no lineman nearest', [o for o in v if not o['dl']])):
            e = [o['edge'] for o in w if o['edge'] is not None]
            if w: print(f'      {lab:18} n {len(w):5} | his depth off the line p50 {q([o["depth"] for o in w]):.2f} (p25-p75 {q([o["depth"] for o in w], .25):.2f}-{q([o["depth"] for o in w], .75):.2f}) | split from the tackle {q([o["split"] for o in w]):.2f} | widest DL vs the tackle {q(e):+.2f} (p25-p75 {q(e, .25):+.2f}/{q(e, .75):+.2f})')
        if dl: print(f'      with a lineman nearest: touching {100*sum(o["touch"] for o in dl)/len(dl):.0f}%, stalled {100*sum(o["stall"] for o in dl)/len(dl):.0f}%')
