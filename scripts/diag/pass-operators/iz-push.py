"""Inside zone: yards before contact and the double teams' push (Integration, 2026-11-14, ENGAGE_TRUNK's IZ row). Sim exports.

usage: python3 -I scripts/diag/pass-operators/iz-push.py <plays.jsonl.gz> [...]

Per inside-zone run: yards before contact (the carrier's yards past the line at the export's first_contact) and the
yards. Double teams: each DL with two OL within 1.2 yd at 0.8 s; his displacement downfield (toward the defense's goal,
yd) from 0.8 to 1.6 s, and whether a combo member has left him by 1.6 s (only one OL within 1.2 yd).
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    ybc, yds, push, left, n = [], [], [], 0, 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'run' or (raw.get('cell') or {}).get('concept') != 'insideZone' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); c = raw.get('carrier')
        x0 = p.pos(c, 0)[0] if c is not None else None
        los = min(p.pos(o, 0)[0] for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None) if p.who('O', 'OL') else 0
        fc = ev.get('first_contact')
        if c is not None and fc is not None and p.k(fc) < p.frames and p.pos(c, p.k(fc))[0] is not None:
            ybc.append(p.pos(c, p.k(fc))[0] - los)
        yds.append(min(20, raw.get('yards') or 0))
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        k1, k2 = p.k(0.8), p.k(1.6)
        if k2 >= p.frames: continue
        for d in p.who('D'):
            if p.players[d]['group'] != 'DL' or p.pos(d, k1)[0] is None or p.pos(d, k2)[0] is None: continue
            m1 = [o for o in OL if p.dist(o, d, k1) <= 1.2]
            if len(m1) < 2: continue
            n += 1
            push.append(p.pos(d, k2)[0] - p.pos(d, k1)[0])
            if sum(1 for o in OL if p.dist(o, d, k2) <= 1.2) < 2: left += 1
    print(f"== {os.path.basename(path)}: IZ runs {len(yds)} | yards (capped 20) p50 {q(yds):.1f} mean {sum(yds) / max(1, len(yds)):.2f} | yards before contact p25/50/75 {q(ybc, .25):.1f}/{q(ybc):.1f}/{q(ybc, .75):.1f}")
    print(f"   double teams at 0.8 s {n}: the DL driven downfield 0.8 -> 1.6 s p25/50/75 {q(push, .25):+.2f}/{q(push):+.2f}/{q(push, .75):+.2f} yd | a member has left by 1.6 s {100 * left / max(1, n):.0f}%")
