"""Offensive line splits and depths at the snap by scheme and situation (NFL
tracking; sim exports for comparison). Does the line set by the call (zone vs
gap), by the play side, the situation (short yardage, goal line), the
formation (gun, under center) and the team, or is it one fixed set?

Splits are centre-to-centre lateral gaps between adjacent OL (and tackle to
inline TE); depth is yards behind the ball (centre's front +0.3). Play side
= the runner's lateral move from handoff to handoff + 1 s (runs only).
usage: olsplits.py FILE [FILE ...] [--kind run|pass]"""
import csv, glob, gzip, json, sys
from collections import defaultdict

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else None
def fmt(v): return f"{q(v):4.2f} [{q(v,.25):4.2f},{q(v,.75):4.2f}]" if v else '   -'
FAM = lambda c: ('zone' if 'ZONE' in c.upper() or c in ('insideZone', 'outsideZone', 'wideZone', 'iz', 'oz', 'wz') else
                 'gap' if any(k in c.upper() for k in ('POWER', 'COUNTER', 'TRAP', 'PULL')) else
                 'duo/man' if c.upper() in ('DUO', 'MAN') else 'other') if c else '?'
ctx = {}
for path in glob.glob('data/raw/bdb2025/**/plays.csv', recursive=True) + glob.glob('data/raw/bdb2019/**/plays.csv', recursive=True):
    for r in csv.DictReader(open(path)):
        ctx[f"{r['gameId']}-{r['playId']}"] = r

KIND = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'run'
for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
    g = defaultdict(lambda: defaultdict(list))
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != KIND: continue
        xy, P = raw['xy'][0], raw['players']
        pos = lambda i, k=0: (raw['xy'][k][2 * i], raw['xy'][k][2 * i + 1]) if k < len(raw['xy']) and raw['xy'][k][2 * i] is not None else None
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i)], key=lambda i: pos(i)[1])
        if len(ol) != 5: continue
        los = pos(ol[2])[0] + .3
        c = raw.get('carrier'); h = (raw.get('events') or {}).get('handoff')
        ps = 0
        if c is not None and h is not None:
            k0, k1 = int(round(h / raw['dt'])), int(round((h + 1) / raw['dt']))
            a, b = pos(c, k0), pos(c, min(k1, len(raw['xy']) - 1))
            if a and b: ps = 1 if b[1] - a[1] > .5 else -1 if b[1] - a[1] < -.5 else 0
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and pos(i)]
        gun = bool(qb) and los - pos(qb[0])[0] > 2.5
        cx = ctx.get(raw['id'], {})
        try: togo, yl = int(cx.get('yardsToGo') or 0), int(cx.get('absoluteYardlineNumber') or 50)
        except ValueError: togo, yl = 0, 50
        cell = raw.get('cell') or {}
        keys = ['all', f"concept {FAM(cell.get('concept'))}", 'gun' if gun else 'under center']
        if cx: keys.append('short (1-2 to go)' if togo <= 2 else 'normal')
        if cx and cx.get('down') in ('3', '4') and togo >= 7: keys.append('3rd/4th, 7+ to go')
        if cx.get('possessionTeam'): keys.append('team ' + cx['possessionTeam'])
        sp = [pos(ol[k + 1])[1] - pos(ol[k])[1] for k in range(4)]  # left to right
        depth = [los - pos(i)[0] for i in ol]
        for key in keys:
            d = g[key]
            d['C-G'] += [sp[1], sp[2]]; d['G-T'] += [sp[0], sp[3]]
            d['width'].append(pos(ol[4])[1] - pos(ol[0])[1])
            d['depth G'] += [depth[1], depth[3]]; d['depth T'] += [depth[0], depth[4]]; d['depth C'].append(depth[2])
            if ps:  # play side vs backside splits (right = +y)
                right = ps > 0
                d['G-T play'].append(sp[3] if right else sp[0]); d['G-T back'].append(sp[0] if right else sp[3])
            d['n'].append(1)
    print(f"== {path.split('/')[-1]}")
    teams = sorted([k for k in g if k.startswith('team ')], key=lambda k: q(g[k]['width']))
    for key in [k for k in g if not k.startswith('team ')] + (teams[:3] + teams[-3:] if teams else []):
        d = g[key]
        if len(d['n']) < 30: continue
        print(f"  {key:22s} n {len(d['n']):5d} | width {fmt(d['width'])} | C-G {fmt(d['C-G'])} G-T {fmt(d['G-T'])} (play {fmt(d['G-T play'])} back {fmt(d['G-T back'])}) | depth C {fmt(d['depth C'])} G {fmt(d['depth G'])} T {fmt(d['depth T'])}")
    if teams: print(f"  team width p50 range: {q(g[teams[0]]['width']):.2f} ({teams[0]}) .. {q(g[teams[-1]]['width']):.2f} ({teams[-1]}) over {len(teams)} teams")
