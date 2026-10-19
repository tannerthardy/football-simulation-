"""Runner speed along his path by concept family, one operator for NFL
tracking and sim common plays: speed at the handoff, at depth -3, -1.5 and 0
(crossing), at +2 and +4 yd, the time from the handoff to the crossing, and
his speed relative to his own peak in the play. usage: rbspeed.py FAMILY FILE [FILE2 ...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
fam = sys.argv[1]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
F = json.load(open('out/mechanics/nfl-formation.json'))
for path in sys.argv[2:]:
    o = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None or CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
        if raw.get('source') != 'sim' and F.get(raw['id']) not in ('SINGLEBACK', 'I_FORM'): continue
        p = Play(raw); c = raw['carrier']; h = (raw.get('events') or {}).get('handoff')
        if h is None or raw['players'][c]['group'] != 'RB': continue
        end = min(p.frames - 1, int(p.end / p.dt + 1e-9)); kh = p.k(h)
        peak = max(p.speed(c, k) or 0 for k in range(0, end + 1))
        o.setdefault('hand', []).append(p.speed(c, kh))
        for mark in (-3, -1.5, 0, 2, 4):
            k = next((k for k in range(kh, end + 1) if (p.pos(c, k)[0] or -99) >= mark), None)
            if k is None: continue
            o.setdefault(mark, []).append(p.speed(c, k)); o.setdefault(f'rel{mark}', []).append(p.speed(c, k) / max(1, peak))
            if mark == 0: o.setdefault('t', []).append((k - kh) * p.dt)
    print(f"{path.split('/')[-1][:20]:20s} {fam}: n {len(o.get('hand', []))} | speed at handoff {q(o.get('hand', []))} | at -3 {q(o.get(-3, []))} -1.5 {q(o.get(-1.5, []))} LOS {q(o.get(0, []))} +2 {q(o.get(2, []))} +4 {q(o.get(4, []))} yd/s | share of own peak at LOS {q(o.get('rel0', []))} | handoff->LOS {q(o.get('t', []))} s")
