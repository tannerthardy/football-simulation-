"""Outside-zone runner track, NFL tracking vs sim, same operator: at the
handoff, his depth/lateral; his depth when he is 2/4/6 yd to the play side
of the ball; where (laterally) he crosses the line; time handoff -> crossing;
and the share of runs lost (<0). Play side = sign of his lateral move by
handoff + 1.0 s (no charted direction in tracking).
usage: oz-track.py SIM_COMMON.jsonl.gz [...]   (sim: cell.concept outsideZone/wideZone)"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def track(rows, label):
    hand, d2, d4, d6, cross, tcross, lost, n = [], [], [], [], [], [], 0, 0
    for raw in rows:
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        by = raw['ball_y']; k0 = p.k(h)
        x0, y0 = p.pos(c, k0); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1
        n += 1; lost += raw['yards'] < 0
        hand.append((x0, (y0 - by) * s))
        got = {}
        for k in range(k0, min(p.frames, p.k(p.end) + 1)):
            x, y = p.pos(c, k)
            if x is None: continue
            lat = (y - by) * s
            for L in (2, 4, 6):
                if L not in got and lat >= L: got[L] = x
            if x >= 0 and 'x' not in got: got['x'] = (lat, k * p.dt - h)
        if 2 in got: d2.append(got[2])
        if 4 in got: d4.append(got[4])
        if 6 in got: d6.append(got[6])
        if 'x' in got: cross.append(got['x'][0]); tcross.append(got['x'][1])
    print(f"{label:22s} n={n} lost {lost/n:.3f} | handoff depth {q([a for a,_ in hand])} lat {q([b for _,b in hand])} | depth at lat +2/+4/+6: {q(d2)} ({len(d2)/n:.2f}) / {q(d4)} ({len(d4)/n:.2f}) / {q(d6)} ({len(d6)/n:.2f}) | crosses at lat p25/50/75 {q(cross,.25)}/{q(cross)}/{q(cross,.75)} after {q(tcross)} s")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
track([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'OUTSIDE ZONE'], 'NFL outside zone')
track([r for r in nfl if r.get('kind') == 'run' and (r.get('cell') or {}).get('concept') == 'INSIDE ZONE'], 'NFL inside zone')
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    for c in ('outsideZone', 'wideZone', 'insideZone'):
        sel = [r for r in rows if (r.get('cell') or {}).get('concept') == c]
        if sel: track(sel, f"{path.split('/')[-1][:10]} {c}")
