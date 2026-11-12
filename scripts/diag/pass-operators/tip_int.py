"""usage: python3 -I scripts/diag/pass-operators/tip_int.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

Interceptions off a touched ball (same code, NFL and sim). A touch is read from the ball's own track: between the
release and the end of the play, a frame where the ball's ground velocity turns > 25 deg or loses > 35% of its speed
while it is within 1.5 yd of a player, and after which it is still a ball in flight (>= 4 yd/s over the next 0.1 s,
or, 'popped', slower: a dropped / knocked-up ball) and loose 0.2 s later (no player within 0.8 yd of it). Who it came off: the nearest player at that frame (offense = off the
receiver, defense = a defender's tip). Outcome: interception (NFL: the play-by-play's 'int'; sim: labels.interception),
completion, or incomplete. Reported:
 - of interceptions, the share whose ball was touched first, by whom;
 - of touched balls (not caught by the offense), the share ending as an interception, by depth of the touch (short
   < 10 yd past the line, deep 10+) and by defenders within 2.5 yd of the ball at the touch."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
BALL = {}
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); bp = sys.argv.pop(i + 1); sys.argv.pop(i)
    for l in gzip.open(bp, 'rt'):
        b = json.loads(l); BALL[b['id']] = b
def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-6 or nb < 1e-6: return 0.0
    return math.degrees(math.acos(max(-1, min(1, (ax * bx + ay * by) / (na * nb)))))
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        lab = r.get('labels') or {}
        if lab.get('throwaway'): continue
        meta = BALL.get(r.get('id'))
        bxy = r.get('bxy') or (meta or {}).get('b')
        if not bxy: continue
        p = Play(r); dt = p.dt
        kf = p.k(ev['pass_forward']); ke = min(p.k(ev['end']), len(bxy) - 1, p.frames - 1)
        intc = bool(meta.get('int')) if meta is not None and 'common' not in r and r.get('bxy') is None else bool(lab.get('interception'))
        if meta is not None and r.get('bxy') is None: intc = bool(meta.get('int'))
        comp = 'catch' in ev and not intc
        players = list(range(len(r['players'])))
        touch = None
        for k in range(kf + 2, ke - 1):
            ax, ay = bxy[k][0] - bxy[k - 1][0], bxy[k][1] - bxy[k - 1][1]
            bx, by = bxy[k + 1][0] - bxy[k][0], bxy[k + 1][1] - bxy[k][1]
            va, vb = math.hypot(ax, ay) / dt, math.hypot(bx, by) / dt
            if va < 6: continue
            if not (ang(ax, ay, bx, by) > 25 or vb < 0.65 * va): continue
            popped = vb < 4  # its speed collapsed at a player: a possession, or a ball knocked up/dropped there
            # and it is loose afterwards: 0.2 s later no player within 0.8 yd of it (a runner carrying it is not a tip)
            k2 = min(ke, k + 2)
            if min((math.hypot(p.pos(i, k2)[0] - bxy[k2][0], p.pos(i, k2)[1] - bxy[k2][1]) for i in players if p.pos(i, k2)[0] is not None), default=99) <= 0.8: continue
            near = [(math.hypot(p.pos(i, k)[0] - bxy[k][0], p.pos(i, k)[1] - bxy[k][1]), i) for i in players if p.pos(i, k)[0] is not None]
            if not near: continue
            d0, i0 = min(near)
            if d0 > 1.5: continue
            ndef = sum(1 for d, i in near if d <= 2.5 and r['players'][i]['side'] == 'D')
            # how long it stays loose: frames until a player is within 0.8 yd of it again (cap 1.5 s)
            loose = next((j - k for j in range(k + 1, min(ke, k + 15) + 1)
                          if min((math.hypot(p.pos(i, j)[0] - bxy[j][0], p.pos(i, j)[1] - bxy[j][1]) for i in players if p.pos(i, j)[0] is not None), default=99) <= 0.8 and j > k2), 15) * dt
            touch = dict(k=k, by=r['players'][i0]['side'], ndef=ndef, popped=popped, loose=loose, depth=bxy[k][0] - (bxy[kf][0] if r.get('bxy') is None else 0))
            break
        # depth past the line: NFL common x is relative to the line; the sim export too (bxy[0] is the ball in the QB's hands)
        if touch: touch['depth'] = bxy[touch['k']][0]
        thru = None
        if intc:
            t_ = r['target']; D = [i for i in players if r['players'][i]['side'] == 'D' and p.pos(i, ke)[0] is not None]
            if D and p.pos(t_, kf)[0] is not None:
                ic = min(D, key=lambda i: math.hypot(p.pos(i, ke)[0] - bxy[ke][0], p.pos(i, ke)[1] - bxy[ke][1]))
                kr = next((k for k in range(kf + 1, ke + 1) if p.pos(t_, k)[0] is not None and math.hypot(p.pos(t_, k)[0] - bxy[k][0], p.pos(t_, k)[1] - bxy[k][1]) <= 1.5), None)
                ki = next((k for k in range(kf + 1, ke + 1) if p.pos(ic, k)[0] is not None and math.hypot(p.pos(ic, k)[0] - bxy[k][0], p.pos(ic, k)[1] - bxy[k][1]) <= 0.7), None)
                d_ic = math.hypot(p.pos(ic, kr)[0] - p.pos(t_, kr)[0], p.pos(ic, kr)[1] - p.pos(t_, kr)[1]) if kr is not None else None
                thru = dict(yes=kr is not None and ki is not None and ki - kr >= 1, lag=(ki - kr) * dt if kr is not None and ki is not None else None, d=d_ic,
                            depth=bxy[kr][0] if kr is not None else bxy[ke][0], label=','.join(((r.get('labels') or {}).get('ballEvents') or [])[:2]))
        rows.append(dict(int=intc, comp=comp, touch=touch, thru=thru))
    ints = [o for o in rows if o['int']]; T = [o for o in rows if o['touch'] and not o['comp']]
    print(f"== {os.path.basename(path)}: targeted throws {len(rows)}, interceptions {len(ints)} ({100*len(ints)/max(1,len(rows)):.1f}%)")
    th = [o for o in ints if o['thru'] and o['thru']['yes']]
    print(f"   THROUGH THE RECEIVER (ball within 1.5 yd of the target >= 0.1 s before the interceptor has it): {len(th)}/{len(ints)} ({100*len(th)/max(1,len(ints)):.0f}%) = {100*len(th)/max(1,len(rows)):.2f}% of targeted throws"
          + (f" | lag p50 {sorted(o['thru']['lag'] for o in th)[len(th)//2]:.1f} s, interceptor from the receiver then p50 {sorted(o['thru']['d'] for o in th)[len(th)//2]:.1f} yd, short (< 10 yd) {100*sum(o['thru']['depth'] < 10 for o in th)/len(th):.0f}%" if th else ''))
    if th and th[0]['thru']['label']: print('     sim ball events on those:', collections.Counter(o['thru']['label'] for o in th).most_common(5))
    ti = [o for o in ints if o['touch']]
    by = collections.Counter(o['touch']['by'] for o in ti)
    print(f"   interceptions off a touched ball: {len(ti)}/{len(ints)} ({100*len(ti)/max(1,len(ints)):.0f}%) | off the receiver (O) {by.get('O',0)}, off a defender (D) {by.get('D',0)}")
    print(f"   touched balls not caught by the offense: {len(T)} | -> interception {100*sum(o['int'] for o in T)/max(1,len(T)):.0f}%, incomplete {100*sum(not o['int'] for o in T)/max(1,len(T)):.0f}%")
    for lab, f in (('popped (speed collapsed, still loose)', lambda o: o['touch']['popped']), ('deflected (kept flying)', lambda o: not o['touch']['popped'])):
        v = [o for o in T if f(o)]; vi = [o for o in ti if f(o)]
        if v: print(f"     {lab:38} n {len(v):4} ({100*len(v)/max(1,len(rows)):.1f}% of throws) -> interception {100*sum(o['int'] for o in v)/len(v):3.0f}% | of all picks {100*len(vi)/max(1,len(ints)):.0f}% | loose for p50 {sorted(o['touch']['loose'] for o in v)[len(v)//2]:.1f} s")
    for lab, f in (('off the receiver', lambda o: o['touch']['by'] == 'O'), ('off a defender', lambda o: o['touch']['by'] == 'D')):
        v = [o for o in T if f(o)]
        if v: print(f"     {lab:17} n {len(v):4} -> interception {100*sum(o['int'] for o in v)/len(v):3.0f}%")
    for lab, f in (('short < 10', lambda o: o['touch']['depth'] < 10), ('deep 10+', lambda o: o['touch']['depth'] >= 10)):
        for nl, g in (('0-1 defenders within 2.5 yd', lambda o: o['touch']['ndef'] <= 1), ('2+ defenders', lambda o: o['touch']['ndef'] >= 2)):
            v = [o for o in T if f(o) and g(o)]
            if v: print(f"     {lab:10} {nl:28} n {len(v):4} -> interception {100*sum(o['int'] for o in v)/len(v):3.0f}%")
