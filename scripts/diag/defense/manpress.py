"""usage: manpress.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Man coverage (Cover 0/1/2-Man labels): each wide receiver's nearest DB at
the snap; press if within 2 yd deep. Separation (nearest defender) at 0.5 /
1.0 / 1.5 / 2.5 s by press vs off, and the press share. One operator."""
import gzip, json, sys, re
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v: round(sorted(v)[len(v)//2], 2) if v else None
for path in sys.argv[1:]:
    b = {('press', t): [] for t in (5, 10, 15, 25)} | {('off', t): [] for t in (5, 10, 15, 25)}
    n = {'press': 0, 'off': 0}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        cov = ((raw.get('cell') or {}).get('coverage') or '').lower().replace('-', '')
        if raw.get('kind') != 'pass' or not re.search(r'cover0|cover1|2man|cover2man', cov): continue
        p = Play(raw); thr = raw['events'].get('pass_forward', 99)
        dbs = [i for i in p.who('D', 'DB') if p.pos(i, 0)[0] is not None]
        for r in p.who('O', 'WR'):
            x0, y0 = p.pos(r, 0)
            if x0 is None or not dbs: continue
            d = min(dbs, key=lambda i: (p.pos(i, 0)[0] - x0) ** 2 + (p.pos(i, 0)[1] - y0) ** 2)
            if abs(p.pos(d, 0)[1] - y0) > 3: continue
            kind = 'press' if p.pos(d, 0)[0] <= 2 else 'off'; n[kind] += 1
            for t in (5, 10, 15, 25):
                k = t
                if k * p.dt >= thr or k >= len(raw['xy']): break
                a = p.pos(r, k)
                if a[0] is None: break
                s = min(((a[0] - p.pos(j, k)[0]) ** 2 + (a[1] - p.pos(j, k)[1]) ** 2) ** .5 for j in p.who('D') if p.pos(j, k)[0] is not None)
                b[(kind, t)].append(s)
    tot = n['press'] + n['off']
    print(path.split('/')[-1], f"press share {100*n['press']/max(1,tot):.0f}% (n {tot})", ' | '.join(f"{k} sep 0.5/1.0/1.5/2.5 s " + '/'.join(str(q(b[(k, t)])) for t in (5, 10, 15, 25)) for k in ('press', 'off')))
