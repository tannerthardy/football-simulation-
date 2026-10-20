"""Receivers on DBs in run plays, one operator for NFL tracking and sim common
plays. A DB counts as stalked when an offensive WR or TE stays within NEAR yd
of him for at least HOLD s (cumulative) before the run ends: a proximity proxy
for a perimeter block, not a contact label. Per DB: whether he ever got within
REACH yd of the carrier after the snap, and whether he was the first defender
to do so. Split by stalked or not; also per run reaching +10.
usage: dbstalk.py FILE [FILE ...] [--ytg60] [--concept iz|oz]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
NEAR, HOLD, REACH = 1.0, 0.4, 1.5
files = [a for a in sys.argv[1:] if not a.startswith('--') and a.endswith('.gz')]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
s = dict(plays=0, dbs=0, stalked=0, st_reach=0, ns_reach=0, st_first=0, ns_first=0, runs10=0, r10_st=0, r10_st_reach=0)
toward, start, depth0, closing = [], [], [], []
bins = {}
relx = []; stalkt = []
for path in files:
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
        if want and raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') != {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE'}.get(want): continue
        if want and raw.get('source') == 'sim' and not raw['id'].startswith(want + '/'): continue
        p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        s['plays'] += 1
        rec = [i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] in ('WR', 'TE') and i != c]
        first = None
        for k in range(end + 1):
            hits = [d for d in p.who('D') if p.dist(c, d, k) <= REACH]
            if hits: first = min(hits, key=lambda d: p.dist(c, d, k)); break
        reached10 = any((p.pos(c, k)[0] or -99) >= 10 for k in range(end + 1))
        kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
        s['runs10'] += reached10; anyst = anyr = False
        for d in p.who('D'):
            if p.players[d]['group'] != 'DB': continue
            s['dbs'] += 1
            reach = any(p.dist(c, d, k) <= REACH for k in range(end + 1))
            ks = [k for k in range(end + 1) if any(p.dist(d, r, k) <= NEAR for r in rec)]
            st = len(ks) * p.dt >= HOLD
            if st:
                # While a receiver is on him: his velocity toward the carrier, and
                # how fast the gap to the carrier closes (both bodies moving).
                for k in ks:
                    (dx, dy), (cx, cy), vd, vc = p.pos(d, k), p.pos(c, k), p.velocity(d, k), p.velocity(c, k)
                    if dx is None or cx is None: continue
                    g = math.hypot(cx - dx, cy - dy) or 1
                    toward.append((vd[0] * (cx - dx) + vd[1] * (cy - dy)) / g)
                    closing.append(-((vc[0] - vd[0]) * (cx - dx) + (vc[1] - vd[1]) * (cy - dy)) / g)
                start.append(ks[0] * p.dt); depth0.append(p.pos(d, ks[0])[0])
                if kx is not None: relx.append((ks[0] - kx) * p.dt)
                stalkt.append(len(ks) * p.dt)
                # The carrier's closest approach while the receiver is on him,
                # and whether the DB then gets within REACH of the carrier.
                m = min(p.dist(c, d, k) for k in ks)
                b = '<2' if m < 2 else '2-4' if m < 4 else '4-6' if m < 6 else '6+'
                r = bins.setdefault(b, [0, 0]); r[0] += 1; r[1] += reach
            key = 'st' if st else 'ns'
            s['stalked'] += st; s[key + '_reach'] += reach; s[key + '_first'] += d == first
            if st: anyst = True; anyr = anyr or reach
        if reached10 and anyst: s['r10_st'] += 1; s['r10_st_reach'] += anyr
n, st = s['plays'], s['stalked']; ns = s['dbs'] - st
print(f"{files[0].split('/')[-1][:28]:28s} runs {n}: DBs/run {s['dbs']/n:.2f}, stalked/run {st/n:.2f} ({100*st/max(1,s['dbs']):.0f}% of DBs) | "
      f"reach carrier: stalked {100*s['st_reach']/max(1,st):.0f}%  not {100*s['ns_reach']/max(1,ns):.0f}% | first to reach: stalked {s['st_first']/n:.2f}/run  not {s['ns_first']/n:.2f}/run | "
      f"runs to +10 with a stalked DB {s['r10_st']}/{s['runs10']}, stalked DB reached carrier on {100*s['r10_st_reach']/max(1,s['r10_st']):.0f}%")
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
print(f"   stalk starts p25/p50/p75 {q(start,.25)}/{q(start)}/{q(start,.75)} s at DB depth {q(depth0,.25)}/{q(depth0)}/{q(depth0,.75)} yd | while stalked: DB speed toward carrier p25/p50/p75 {q(toward,.25)}/{q(toward)}/{q(toward,.75)}, gap closing {q(closing,.25)}/{q(closing)}/{q(closing,.75)} yd/s")
print("   by the carrier's closest approach while stalked: " + ' | '.join(f"{b} n {bins[b][0]} reach {100*bins[b][1]/bins[b][0]:.0f}%" for b in ('<2', '2-4', '4-6', '6+') if b in bins))
print(f"   stalk start relative to the carrier's line crossing p25/p50/p75 {q(relx,.25)}/{q(relx)}/{q(relx,.75)} s | time stalked per stalked DB p25/p50/p75 {q(stalkt,.25)}/{q(stalkt)}/{q(stalkt,.75)} s")
