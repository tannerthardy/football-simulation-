"""A pass protector on the ground, from tracking alone (Integration, 2026-11-13: ours fall on about a quarter of
dropbacks; what is the NFL's rate?). Same code on NFL tracking and sim exports. Given the sim's review file, it also
scores the proxy against the sim's own fall events (truth).

usage: python3 -I scripts/diag/pass-operators/fall-proxy.py [--role OL|DL] <plays.jsonl.gz>[:<review.json>] [...]

--role DL (2026-11-13, the rusher's lean bound): the same proxy for defensive linemen on dropbacks, with the offense's
OL, TE and RB as the men he was in contact with.

Dropbacks, offensive linemen, from 0.5 s to the throw (the play's end without one). A proxy fall: the lineman's speed
(central difference over +/-0.2 s, as metrics.Play.speed) stays below STILL yd/s for at least HOLD s, the stillness
starting before the throw (it may run on past it, to the play's end) while a DL/LB was within 1.2 yd of him in the 0.5 s
before it; variants also require that man to be more than 1.5 yd from him 0.5 s into it (his man has left him), or the
lineman to have been moving >= 1.0 yd/s in the 0.5 s before (a fall stops a moving man). One per lineman per play.

Truth (sim only): a 'fall' replay event of that lineman between 0.5 s and the throw. A proxy fall matches a truth fall
when the stillness starts within -0.3..+0.8 s of the event.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
# (still yd/s, hold s, require his man to have left, require moving >= 1.0 yd/s in the 0.5 s before)
SETTINGS = ((0.5, 1.0, True, False), (0.5, 1.0, False, False), (0.5, 1.0, False, True), (0.3, 1.0, False, True), (0.5, 0.8, False, True))


def detect(p, ol, dl, k0, kstart, klast, still, hold, left, moving):
    # The stillness starts between k0 and kstart (the throw) and may run on to klast (the play's last usable frame).
    n = int(round(hold / p.dt)); k = k0
    while k <= kstart and k + n <= klast:
        if all(p.pos(ol, j)[0] is not None and p.speed(ol, j) < still for j in range(k, k + n)):
            before = range(max(0, k - int(round(0.5 / p.dt))), k + 1)
            men = [d for d in dl if any(p.pos(d, j)[0] is not None and p.dist(d, ol, j) <= 1.2 for j in before)]
            kk = min(klast, k + int(round(0.5 / p.dt)))
            ok = bool(men) and (not left or all(p.pos(d, kk)[0] is None or p.dist(d, ol, kk) > 1.5 for d in men))
            if ok and moving: ok = max(p.speed(ol, j) for j in before) >= 1.0
            if ok: return k
            k += 1
        else:
            k += 1
    return None


args = sys.argv[1:]; ROLE = 'OL'; TRACES = []
if args[:1] == ['--role']: ROLE = args[1]; args = args[2:]
for arg in args:
    path, _, review = arg.partition(':')
    truth = {}
    if review:
        for pl in json.load(open(review))['plays']:
            truth[pl['id']] = [(e['t'], e['a']) for e in pl.get('events', []) if e.get('type') == 'fall' and 'a' in e]
    res = {s: {'proxy': 0, 'hit': 0, 'falls': 0, 'found': 0} for s in SETTINGS}; drop = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if (ROLE == 'OL' and len(OL) < 5) or not p.who('O', 'QB'): continue
        drop += 1
        DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        if ROLE == 'DL':  # the subjects are the defensive linemen; their opponents the blockers
            BLK = [o for o in p.who('O') if p.pos(o, 0)[0] is not None and p.players[o]['group'] in ('OL', 'TE', 'RB')]
            OL, DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] == 'DL'], BLK
            if not OL: continue
        fw = ev.get('pass_forward'); tend = fw if fw is not None else p.end
        k0, kend, klast = p.k(0.5), min(p.frames - 3, p.k(tend)), p.frames - 3
        tf = [(t, a) for t, a in truth.get(raw.get('id'), []) if a in OL and 0.5 <= t <= tend] if review else []
        for s in SETTINGS:
            r = res[s]
            got = {o: detect(p, o, DL, k0, kend, klast, *s) for o in OL}
            r['proxy'] += sum(v is not None for v in got.values())
            if s == SETTINGS[2] and os.environ.get('FALL_TRACE'):
                for o, k in got.items():
                    if k is not None: TRACES.append((raw.get('id'), o, k * p.dt, [round(p.speed(o, j), 1) for j in range(max(0, k - 6), min(p.frames - 2, k + 12))],
                                                     any(abs(t - k * p.dt) <= 0.8 and a == o for t, a in tf) if review else None))
            if review:
                r['falls'] += len({a for _, a in tf})
                firsts = {}
                for t, a in tf: firsts.setdefault(a, t)
                r['found'] += sum(1 for a, t in firsts.items() if got.get(a) is not None and -0.3 <= got[a] * p.dt - t <= 0.8)
                r['hit'] += sum(1 for o, k in got.items() if k is not None and o in firsts and -0.3 <= k * p.dt - firsts[o] <= 0.8)
    print(f"== {os.path.basename(path)}: dropbacks {drop}")
    for s in SETTINGS:
        r = res[s]
        line = f"   speed < {s[0]} for >= {s[1]} s{', man left' if s[2] else ''}{', was moving' if s[3] else ''}: proxy falls {100 * r['proxy'] / max(1, drop):5.1f} /100 dropbacks (all {ROLE})"
        if review:
            line += (f" | true falls {100 * r['falls'] / max(1, drop):5.1f} /100 | recall {100 * r['found'] / max(1, r['falls']):.0f}%"
                     f" | precision {100 * r['hit'] / max(1, r['proxy']):.0f}%")
        print(line)
    if os.environ.get('FALL_TRACE'):
        import random
        for t in random.Random(int(os.environ['FALL_TRACE'])).sample(TRACES, min(12, len(TRACES))):
            print(f"   trace {t[0]} player {t[1]} still from {t[2]:.1f} s{'' if t[4] is None else (' TRUE FALL' if t[4] else ' (no fall event)')}: speed -0.6..+1.2 s {t[3]}")
        TRACES.clear()
