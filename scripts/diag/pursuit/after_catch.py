"""After the catch, NFL vs sim, same code (common play format).
    python3 scripts/diag/pursuit/after_catch.py LABEL=path.jsonl.gz ...
How much of the YAC tail comes from open space at the catch, how fast the
defense closes, and how often the first contact is broken."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    yac, near0, near05, near1, close_speed, within5, big, comp_yards, yac_yards = [], [], [], [], [], [], [], 0, 0
    big_open, big_broken, big_n = 0, 0, 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'pass': continue
        ev = raw['events']; t = raw.get('target')
        if t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch'])
        x_catch = p.pos(t, kc)[0]; y = raw['yards'] - x_catch
        yac.append(y); comp_yards += raw['yards']; yac_yards += max(0, y)
        d0 = p.nearest(t, kc); near0.append(d0)
        within5.append(sum(1 for d in p.who('D') if p.dist(d, t, kc) <= 5))
        for lag, store in ((0.5, near05), (1.0, near1)):
            if p.live(ev['catch'] + lag): store.append(p.nearest(t, p.k(ev['catch'] + lag)) - d0)
        # closing speed of each defender within 15 yd toward the carrier over the next 0.6 s
        if p.live(ev['catch'] + 0.6):
            k2 = p.k(ev['catch'] + 0.6)
            for d in p.who('D'):
                if p.dist(d, t, kc) <= 15: close_speed.append((p.dist(d, t, kc) - p.dist(d, t, k2)) / 0.6)
        if y >= 15:
            big_n += 1
            fc = ev.get('first_contact')
            big_open += d0 >= 5
            if fc is not None and fc >= ev['catch'] and p.live(fc + 0.5):
                kf = p.k(fc)
                big_broken += (raw['yards'] - p.pos(t, kf)[0]) >= 5
    n = len(yac)
    print(f'== {label}: {n} completions')
    print(f'  YAC p50 {q(yac,.5):.1f} p90 {q(yac,.9):.1f} p97 {q(yac,.97):.1f} | YAC share of completion yards {yac_yards/max(1,comp_yards):.2f} | YAC>=15 {sum(y>=15 for y in yac)/n:.3f} >=30 {sum(y>=30 for y in yac)/n:.3f}')
    print(f'  at catch: nearest defender p50 {q(near0,.5):.2f} p90 {q(near0,.9):.2f}; defenders within 5 yd p50 {q(within5,.5)}')
    print(f'  nearest-defender change after 0.5 s p50 {q(near05,.5):+.2f}, after 1 s p50 {q(near1,.5):+.2f} p90 {q(near1,.9):+.2f}  (- = defense closing)')
    print(f'  closing speed of defenders within 15 yd (yd/s) p25 {q(close_speed,.25):.2f} p50 {q(close_speed,.5):.2f} p75 {q(close_speed,.75):.2f}')
    print(f'  YAC>=15 plays: {big_n}; open at catch (nearest >= 5 yd) {big_open/max(1,big_n):.2f}; broke first contact by 5+ yd {big_broken/max(1,big_n):.2f}')
