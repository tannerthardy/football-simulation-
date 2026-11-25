"""The NFL side of the passer's gates (Rules, 2026-11-24; docs/reviews/2026-11-24-qb-decision-plan.md section 4), with
the same operator on ours. Two tables, on dropbacks that are not play action:

1. Release - break by route family: the target's break (route_chart.py's rule: a stop's plant, the turn peak of the
   other planted families) against the release, s (negative = the ball out before the break). Families: stops (HITCH),
   outs (OUT), ins (IN), slants (SLANT), by break-depth band.
2. What is thrown when: the target's class by release-time band (s after the snap). Classes:
   screen (PFF SCREEN or our screen call), back (RB/FB, any route but a screen), flat (WR/TE FLAT or ANGLE),
   deep (GO, POST, CORNER, WHEEL by the label: a post's first turn can be its stem), quick (any other planted route
   breaking under 7.5 yd), intermediate (planted 7.5-18 yd, and CROSS), deep also for planted 18 yd or deeper, other (no
   label in the families, or a break not found).
Limit: the break needs 0.6 s of track after it, and the target's track ends at the ball's arrival, so a planted route
caught within about 0.6 s of its break has no break: the earliest throws are missing from table 1 (their count is
printed), which biases its p25 late. Table 2 classes those by the target's depth at the arrival.
--check N prints N plays per side (release, target, label, break time and depth) to check the operator by hand.
  python3 -I qb_gates.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz [--md OUT.md] [--check N]"""
import gzip, json, math, sys, collections
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from route_chart import SIM, PLANTED, OPEN, analyse, band, q, f1

OL = {'T', 'G', 'C', 'OT', 'OG'}
BACKS = {'RB', 'FB', 'HB'}
DEEP_OPEN = {'GO', 'POST', 'CORNER', 'WHEEL'}
TBANDS = [(0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.0), (3.0, 3.5), (3.5, 99)]
CLASSES = ['screen', 'back', 'flat', 'quick', 'intermediate', 'deep', 'other']


def targets(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('rel') is None or p.get('qb') is None: continue
        if not nfl and p.get('motion'): pass  # motion kept: the throw is the question here
        pl = p['players']
        ti = [i for i, r in enumerate(pl) if r.get('target') and r['side'] == 'O']
        if len(ti) != 1: continue
        i = ti[0]; r = pl[i]
        X = np.array(p['x'], dtype=float); Y = np.array(p['y'], dtype=float)
        rel = p['rel']
        if nfl: lab = r.get('routeRan'); scr = lab == 'SCREEN'
        else:
            rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = SIM.get(rid, rid); scr = bool(p.get('screen'))
        cut = p.get('arr') if nfl else (p['catch'] if p.get('catch') is not None and p.get('recv') == i else rel + 7)
        cut = min(cut if cut is not None else X.shape[1] - 1, X.shape[1] - 1)
        row = dict(src='NFL' if nfl else 'ours', lab=lab, rid=lab, pos=r.get('pos'), x=X[i, :cut + 1], y=Y[i, :cut + 1],
                   out=1.0 if Y[i, 0] >= Y[p['qb'], 0] else -1.0, tgt=True, rel=rel, catch=None, Xf=X[i], Yf=Y[i], dx0=[])
        res = analyse(row) if lab in PLANTED or lab in OPEN else {'found': False}
        if scr: cls = 'screen'
        elif r.get('pos') in BACKS: cls = 'back'
        elif lab in ('FLAT', 'ANGLE'): cls = 'flat'
        elif lab in DEEP_OPEN: cls = 'deep'  # by the label: a post's or corner's first turn can be its stem
        elif lab in PLANTED and res.get('depth') is not None:
            d = res['depth']; cls = 'quick' if d < 7.5 else 'intermediate' if d < 18 else 'deep'
        elif lab in PLANTED:
            # Break not found: on early throws the track ends at the ball's arrival, before the 0.6 s the turn rule needs
            # after a break. Classed by his depth at the arrival; release - break is left out (see the module note).
            d = float(row['x'][-1]); cls = 'quick' if d < 7.5 else 'intermediate' if d < 18 else 'deep'
        elif lab == 'CROSS': cls = 'intermediate'
        else: cls = 'other'
        yield dict(id=p.get('id'), rel=rel / 10, lab=lab, pos=r.get('pos'), cls=cls, t=res.get('t'), depth=res.get('depth'),
                   relmb=(rel / 10 - res['t']) if res.get('t') is not None else None)


def tband(t):
    return next(f"{a:g}-{b:g}" if b < 99 else f"{a:g}+" for a, b in TBANDS if a <= t < b)


def main():
    md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
    check = int(sys.argv[sys.argv.index('--check') + 1]) if '--check' in sys.argv else 0
    data = {}
    for a in sys.argv[1:]:
        if '=' in a:
            k, path = a.split('=', 1); data[k] = list(targets(path, k == 'NFL'))
    out = ['## Release - break by route family (targets, dropbacks without play action)\n',
           'Negative = the ball out before the break. p25 / p50 / p75 (n).\n',
           '| family | break band | ' + ' | '.join(data) + ' |', '|---|---|' + '---|' * len(data)]
    for fam in ('HITCH', 'OUT', 'IN', 'SLANT'):
        for bd in ('<3', '3-7.5', '7.5-12', '12-18', '18-60'):
            cells = []
            for k, R in data.items():
                v = [r['relmb'] for r in R if r['lab'] == fam and r['relmb'] is not None and band(r['depth']) == bd]
                cells.append(f"{f1(q(v, .25))} / {f1(q(v, .5))} / {f1(q(v, .75))} ({len(v)})" if len(v) >= 8 else f"- ({len(v)})")
            out.append(f"| {fam} | {bd} | " + ' | '.join(cells) + ' |')
        miss = [f"{k} {sum(1 for r in R if r['lab'] == fam and r['relmb'] is None)}" for k, R in data.items()]
        out.append(f"| {fam} | break not found | " + ' | '.join(miss) + ' |')
    for k, R in data.items():
        out += [f'\n## What is thrown when: {k}, target class by release time (row %, dropbacks without play action)\n',
                '| release s | n | ' + ' | '.join(CLASSES) + ' |', '|---|---|' + '---|' * len(CLASSES)]
        for a, b in TBANDS:
            v = [r for r in R if a <= r['rel'] < b]
            c = collections.Counter(r['cls'] for r in v)
            out.append(f"| {tband(a)} | {len(v)} | " + ' | '.join(f"{100 * c[x] / len(v):.0f}" if v else '-' for x in CLASSES) + ' |')
        c = collections.Counter(r['cls'] for r in R)
        out.append(f"| all | {len(R)} | " + ' | '.join(f"{100 * c[x] / len(R):.0f}" for x in CLASSES) + ' |')
        out.append(f"\nRelease time p25 / p50 / p75 by class ({k}): " + '; '.join(
            f"{x} {f1(q([r['rel'] for r in R if r['cls'] == x], .25))} / {f1(q([r['rel'] for r in R if r['cls'] == x], .5))} / "
            f"{f1(q([r['rel'] for r in R if r['cls'] == x], .75))}" for x in CLASSES if any(r['cls'] == x for r in R)))
    if check:
        for k, R in data.items():
            out.append(f'\n## Check: first {check} plays, {k}\n')
            out.append('| play | release s | target pos | label | class | break s | break depth | release - break |')
            out.append('|---|---|---|---|---|---|---|---|')
            for r in R[:check]:
                out.append(f"| {r['id']} | {r['rel']:.1f} | {r['pos']} | {r['lab']} | {r['cls']} | {f1(r['t'])} | {f1(r['depth'])} | {f1(r['relmb'])} |")
    text = '\n'.join(out)
    print(text)
    if md: open(md, 'w').write(text + '\n')


if __name__ == '__main__':
    main()
