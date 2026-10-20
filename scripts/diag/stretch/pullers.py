"""Pulling linemen on gap schemes, one operator for NFL tracking and sim
common plays. The puller is the OL with the largest lateral displacement from
the snap to 1.5 s, if over 2 yd. Reported: when he is first 0.6 yd off his
alignment laterally, first 1.5 yd/s laterally, his depth behind the line at
those times and at 1.0 s, his lateral displacement at 0.6/1.0/1.4 s, and the
second-level defenders' lateral speed toward his direction at 0.6/1.0/1.4 s.
usage: pullers.py FILE [--ytg60] [--fam gap_pull]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else 'gap_pull'
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    concept = raw['id'].split('/')[0] if raw.get('source') == 'sim' else (raw.get('cell') or {}).get('concept')
    if CONCEPT_FAMILY.get(concept) != fam: continue
    p = Play(raw); by = raw['ball_y']; k15 = p.k(1.5)
    if k15 >= p.frames: continue
    best = None
    for i in p.who('O', 'OL'):
        if p.pos(i, 0)[0] is None or p.pos(i, k15)[0] is None: continue
        dy = p.pos(i, k15)[1] - p.pos(i, 0)[1]
        if best is None or abs(dy) > abs(best[1]): best = (i, dy)
    if not best or abs(best[1]) < 2: continue
    i, dy = best; s = math.copysign(1, dy); y0 = p.pos(i, 0)[1]; n += 1
    lat = lambda k: (p.pos(i, k)[1] - y0) * s
    k06 = next((k for k in range(k15 + 1) if lat(k) >= .6), None)
    kv = next((k for k in range(1, k15 + 1) if p.speed(i, k) >= 1.5 and (p.pos(i, min(k + 1, k15))[1] - p.pos(i, max(k - 1, 0))[1]) * s > 0), None)
    if k06 is not None: o.setdefault('t06', []).append(k06 * p.dt); o.setdefault('d06', []).append(p.pos(i, k06)[0])
    if kv is not None: o.setdefault('tv', []).append(kv * p.dt)
    o.setdefault('d10', []).append(p.pos(i, p.k(1.0))[0])
    for t in (.6, 1.0, 1.4): o.setdefault(f'lat{t}', []).append(lat(p.k(t)))
    sec = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and 2 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - by) <= 7]
    for t in (.6, 1.0, 1.4):
        k = p.k(t)
        for d in sec:
            a, b = max(0, k - 2), min(p.frames - 1, k + 2)
            if p.pos(d, a)[1] is None or p.pos(d, b)[1] is None: continue
            o.setdefault(f'lb{t}', []).append((p.pos(d, b)[1] - p.pos(d, a)[1]) / ((b - a) * p.dt) * s)
print(f"{path.split('/')[-1][:22]:22s} {fam}: plays with a puller {n}")
print(f"  puller 0.6 yd over at p25/50/75 {q(o.get('t06', []), .25)}/{q(o.get('t06', []))}/{q(o.get('t06', []), .75)} s (depth then {q(o.get('d06', []))}) | 1.5 yd/s lateral at p50 {q(o.get('tv', []))} s | depth at 1.0 s {q(o.get('d10', []))}")
print(f"  puller lateral yd at 0.6/1.0/1.4 s: {q(o.get('lat0.6', []))}/{q(o.get('lat1.0', []))}/{q(o.get('lat1.4', []))} | second level lateral toward the pull at 0.6/1.0/1.4 s: {q(o.get('lb0.6', []))}/{q(o.get('lb1.0', []))}/{q(o.get('lb1.4', []))} yd/s")
