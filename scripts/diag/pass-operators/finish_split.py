"""Yards after first contact on completions, split by the contact's geometry (same code, NFL and sim), to tell a
worse arrival from a weaker tackle.

usage: python3 -I scripts/diag/pass-operators/finish_split.py [--runs] <nfl.jsonl.gz> <sim.jsonl.gz> [...]

Population: completions with a first contact after arrival (events.first_contact; else the first frame a defender's
centre is within 1.0 yd of the catcher). Also the subset whose nearest defender was 1-3 yd away at arrival.
--runs: designed runs instead, from the handoff, with first contact 3+ yd past the line (the second level); the
subset is the same population.
At first contact: side = the contacting defender's bearing from the catcher's heading (front < 60 deg, side 60-120,
behind > 120); his speed; the catcher's speed (bins < 4, 4-6, > 6 yd/s). Per cell: n, yards after contact p50/p75
(carrier x at the end minus at contact), the play ending within 1.0 s of contact, and seconds from contact to the end p50.
Standardised: each sim file's cell mix with the first file's (NFL) per-cell values; if it lands near the sim's own total,
the difference is the cell mix (arrival); if it lands near the NFL total, the tackle in the cell gives up more.
Sim only (labels.carrierContacts): how the play ended after first contact."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
sb = lambda s: '<4' if s < 4 else '4-6' if s <= 6 else '>6'
SIDES, SB = ('front', 'side', 'behind'), ('<4', '4-6', '>6')

RUNS = '--runs' in sys.argv

def rows(path):
    out = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if RUNS:
            if raw.get('kind') != 'run' or 'handoff' not in ev or raw.get('carrier') is None: continue
            c = raw['carrier']; t0 = ev['handoff']
        else:
            if raw.get('kind') != 'pass' or 'catch' not in ev: continue
            c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
            if c is None: continue
            t0 = ev.get('pass_arrived', ev['catch'])
        p = Play(raw); ka = p.k(t0); ke = min(p.k(ev['end']), p.frames - 1)
        if p.pos(c, ka)[0] is None: continue
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
        if not D: continue
        dd = min(p.dist(c, d, ka) for d in D)
        kf = None
        if 'first_contact' in ev and p.k(ev['first_contact']) >= ka: kf = p.k(ev['first_contact'])
        else:
            for k in range(ka, ke + 1):
                if p.pos(c, k)[0] is not None and any(p.pos(d, k)[0] is not None and p.dist(c, d, k) <= 1.0 for d in D): kf = k; break
        if kf is None or kf > ke or p.pos(c, kf)[0] is None: continue
        if RUNS and p.pos(c, kf)[0] < 3: continue
        xe = next((p.pos(c, k)[0] for k in range(ke, kf - 1, -1) if p.pos(c, k)[0] is not None), None)
        if xe is None: continue
        hit = min((d for d in D if p.pos(d, kf)[0] is not None), key=lambda d: p.dist(c, d, kf))
        vx, vy = p.velocity(c, kf); cs = math.hypot(vx, vy)
        hx, hy = p.pos(hit, kf)[0] - p.pos(c, kf)[0], p.pos(hit, kf)[1] - p.pos(c, kf)[1]
        if cs > 0.5:
            ang = math.degrees(math.acos(max(-1, min(1, (vx * hx + vy * hy) / (cs * (math.hypot(hx, hy) or 1))))))
            side = 'front' if ang < 60 else 'side' if ang <= 120 else 'behind'
        else: side = 'front'  # a standing catcher is met, not run down
        fvx, fvy = p.velocity(hit, kf)
        o = dict(side=side, fs=sb(math.hypot(fvx, fvy)), cs=sb(cs), after=xe - p.pos(c, kf)[0], ends=(ke - kf) * p.dt <= 1.0, tdown=(ke - kf) * p.dt, near=RUNS or 1 <= dd < 3)
        ac = (raw.get('labels') or {}).get('carrierContacts')
        if ac is not None:
            types = [e['type'] for e in ac]
            wraps = {e['d'] for e in ac if e['type'] == 'tackle_wrap'}
            first = next((e['d'] for e in ac if e['type'] in ('hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle')), None)
            if 'missed_tackle' in types: how = 'missed'
            elif 'broken_tackle' in types: how = 'broke'
            elif not wraps: how = 'no wrap (oob/td/other)'
            elif wraps - {first}: how = 'second defender'
            elif o['after'] >= 2: how = 'dragged 2+ yd'
            else: how = 'finisher'
            o['how'] = how
        out.append(o)
    return out

def fmt(v):
    if not v: return '     -'
    a = [o['after'] for o in v]
    return f"n{len(v):4} {q(a):4.1f}/{q(a,.75):4.1f} {100*sum(o['ends'] for o in v)/len(v):3.0f}% {q([o['tdown'] for o in v]):.1f}s"

D = {os.path.basename(f): rows(f) for f in sys.argv[1:] if not f.startswith('--')}
names = list(D); ref = names[0]
for sub, keep in ((('designed runs, first contact 3+ yd past the line', lambda o: True),) if RUNS else (('all completions with contact', lambda o: True), ('nearest defender 1-3 yd at arrival', lambda o: o['near']))):
    print(f'\n### {sub}  (cells: n, yards after contact p50/p75, play over within 1 s, contact to end p50)')
    R = {n: [o for o in D[n] if keep(o)] for n in names}
    print('total            ' + ' | '.join(f'{n[:14]:14} {fmt(R[n])}' for n in names))
    for dim, levels in (('side', SIDES), ('fs', SB), ('cs', SB)):
        for lv in levels:
            print(f'{dim:4} {lv:7}     ' + ' | '.join(f'{100*sum(o[dim]==lv for o in R[n])/max(1,len(R[n])):3.0f}% {fmt([o for o in R[n] if o[dim]==lv])}' for n in names))
    # side x finisher speed (catcher speed pooled), and side x catcher speed
    for dim in ('fs', 'cs'):
        print(f'side x {dim}')
        for s in SIDES:
            for lv in SB:
                print(f'  {s:6} {lv:4}    ' + ' | '.join(f'{fmt([o for o in R[n] if o["side"]==s and o[dim]==lv])}' for n in names))
    # standardisation on the full 27 cells, falling back to side x fs then side when the NFL cell has < 15
    def cellval(o, f):
        for key in ((o['side'], o['fs'], o['cs']), (o['side'], o['fs']), (o['side'],)):
            v = [x for x in R[ref] if (x['side'], x['fs'], x['cs'])[:len(key)] == key]
            if len(v) >= 15: return f(v)
        return f(R[ref])
    mean = lambda v: sum(min(15, max(-5, x['after'])) for x in v) / len(v)
    endr = lambda v: sum(x['ends'] for x in v) / len(v)
    for n in names[1:]:
        if not R[n]: continue
        print(f'standardised {n}: own mean after (clipped -5..15) {mean(R[n]):.2f}, own over-in-1s {100*endr(R[n]):.0f}% | '
              f'NFL cell values on its mix {sum(cellval(o, mean) for o in R[n])/len(R[n]):.2f}, {100*sum(cellval(o, endr) for o in R[n])/len(R[n]):.0f}% | NFL own {mean(R[ref]):.2f}, {100*endr(R[ref]):.0f}%')
    for n in names[1:]:
        hs = [o for o in R[n] if 'how' in o]
        if not hs: continue
        print(f'how it ended after first contact, {n}:')
        for how, k in collections.Counter(o['how'] for o in hs).most_common():
            v = [o for o in hs if o['how'] == how]
            print(f'   {how:24} {100*k/len(hs):3.0f}%  {fmt(v)}')
