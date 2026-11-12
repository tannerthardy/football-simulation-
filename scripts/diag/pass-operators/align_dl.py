"""usage: python3 -I scripts/diag/pass-operators/align_dl.py <plays.jsonl.gz> [...]

WR alignment against the defensive line, same code for NFL and sim common format. Pass plays; for each WR at the
snap: his split from the end of the line on his side (lateral distance outside the outermost OL there, yd), and
whether his nearest defender is within 2.5 yd and a defensive lineman. By split band, and by sim formation when the
play carries one (the NFL common format does not). Also how many WRs per play align within 2 yd of the line's end."""
import sys, os, json, gzip, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
BANDS = ((-9, 2), (2, 4), (4, 7), (7, 99))
for path in sys.argv[1:]:
    by_band = collections.defaultdict(lambda: [0, 0, 0]); by_form = collections.defaultdict(lambda: [0, 0, 0]); wrs = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        p = Play(raw)
        if p.frames < 2: continue
        pl = raw['players']; bx = raw.get('ball_y', 26.65)
        OL = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'OL' and p.pos(i, 0)[0] is not None]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        if not OL or not D: continue
        form = (raw.get('cell') or {}).get('formation')
        for r, a in enumerate(pl):
            if a['side'] != 'O' or a['group'] != 'WR' or p.pos(r, 0)[0] is None: continue
            ry = p.pos(r, 0)[1]; side = 1 if ry > bx else -1
            end = max(side * (p.pos(o, 0)[1] - bx) for o in OL)
            split = side * (ry - bx) - end
            c = min(D, key=lambda d: p.dist(r, d, 0))
            tight = p.dist(r, c, 0) <= 2.5
            dl = tight and pl[c]['group'] == 'DL'
            wrs += 1
            for key, tab in ((next(f'{lo}-{hi}' for lo, hi in BANDS if lo <= split < hi), by_band), (form, by_form if form else None)):
                if tab is None: continue
                tab[key][0] += 1; tab[key][1] += tight; tab[key][2] += dl
    tot = [sum(v[i] for v in by_band.values()) for i in range(3)]
    print(f'== {os.path.basename(path)}: WRs {wrs} | defender within 2.5 yd {100*tot[1]/max(1,tot[0]):.0f}%, of them a lineman {100*tot[2]/max(1,tot[1]):.0f}% | WR with a lineman nearest {100*tot[2]/max(1,tot[0]):.1f}% of WRs')
    for lo, hi in BANDS:
        v = by_band[f'{lo}-{hi}']
        print(f'   split {lo:>3}-{hi:<3} yd outside the line: {100*v[0]/max(1,tot[0]):4.0f}% of WRs | tight {100*v[1]/max(1,v[0]):3.0f}% | lineman nearest {100*v[2]/max(1,v[0]):4.1f}%')
    for k, v in sorted(by_form.items(), key=lambda kv: -kv[1][0]):
        print(f'   {k:22} WRs {v[0]:5} | tight {100*v[1]/max(1,v[0]):3.0f}% | lineman nearest {100*v[2]/max(1,v[0]):4.1f}%')
