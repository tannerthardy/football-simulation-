"""What the throws made with a rusher on the QB are (Integration for Tanner, 2026-11-11): same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/hit-throws.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

Population: dropbacks (kind pass) with a forward pass, where a defender's centre comes within 1.0 yd of the QB's at
or before the release frame (pass_forward) -- qb-contact.py's definition. Clean throws (no defender within 1 yd)
are the comparison column. Needs the ball track: sim records carry it (bxy, sim-export.ts); NFL records take it from
the side file written by scripts/mechanics/nfl_bdb2025_ball.py (--ball), merged by id.

 1 Phase: time from first contact (1 yd) to the release frame: <=0.2 s (in the delivery), 0.3-0.5, 0.6-1.0, >1.0.
 2 Where the ball went. Landing point B = the ball at pass_arrived, else at the end (the incompletion). Miss = |B -
   target at that frame|: on target <=1.5 yd, ordinary 1.5-4, wild >4; the larger of the along-throw (long/short,
   from the ball at release to the target) and lateral (wide) parts names the error.
 3 Openness at release: the target's separation (nearest defender) -- tight <1.5, mid 1.5-3, open >=3, no target;
   'a more open man': another WR/TE/RB with separation >= max(3, target + 2).
 4 Throwaway (geometric): the ball goes out of bounds before B, or no WR/TE/RB is within 5 yd of B. Cross-checked
   against the source's own call: NFL play description names no receiver; sim labels.throwaway. Legal-throwaway
   position: the QB outside the tackles' snap positions (+0.5 yd) at release, or the ball's B past the line.
 5 Result: complete ('catch'), interception (NFL hadInterception; sim labels.interception), else incomplete, typed
   in order: thrown away (4), defended (a defender within 1.0 yd of B and nearer it than the target), off target
   (miss > 1.5: long / short / wide), catchable not caught (miss <= 1.5, nobody on the ball: drops and contested
   balls the defender did not reach). Cross-check: NFL passDefensed; sim ball events (pbu/drop/miss/deflection).
Then completion by phase x openness.
Limits: tracking has no arm, so 'contact' is a body within 1 yd, not a hit on the arm; the ball's height is not in
the NFL track (a ball over everyone's head and a ball at the feet both read 'miss'); B is the ball at the arrival /
incompletion tag, ~0.1 s quantized.
"""
import gzip, json, math, os, sys, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa

ELIG = ('WR', 'TE', 'RB')
WIDTH = 160 / 3
pct = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'


def load_ball(path):
    out = {}
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); out[r['id']] = r
    return out


def phase(dt):
    return '<=0.2' if dt <= 0.25 else '0.3-0.5' if dt <= 0.55 else '0.6-1.0' if dt <= 1.05 else '>1.0'


def analyse(raw, side):
    p = Play(raw); ev = raw['events']
    if raw['kind'] != 'pass' or ev.get('pass_forward') is None: return None
    qbs = p.who('O', 'QB')
    if not qbs: return None
    q = qbs[0]
    if side is not None:
        bxy = side['b']; labels = side
    else:
        bxy = raw.get('bxy'); labels = raw.get('labels', {})
    if not bxy: return None
    kf = p.k(ev['pass_forward'])
    if kf >= len(bxy) or p.pos(q, kf)[0] is None: return None
    D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
    kc = next((k for k in range(0, kf + 1) if p.pos(q, k)[0] is not None and any(p.pos(d, k)[0] is not None and p.dist(q, d, k) <= 1.0 for d in D)), None)
    o = {'hit': kc is not None}
    if kc is not None: o['phase'] = phase((kf - kc) * p.dt)
    # landing point
    t = raw.get('target')
    ta = ev.get('pass_arrived', ev.get('end'))
    ka = min(p.k(ta), len(bxy) - 1, p.frames - 1)
    if ka == len(bxy) - 1 and ka > kf + 1 and abs(bxy[ka][0]) < 0.05 and abs(bxy[ka][1] - raw['ball_y']) < 0.05: ka -= 1  # dead-ball reset frame
    o['arrTag'] = 'pass_arrived' in ev
    if 'pass_arrived' not in ev and t is not None:
        # No arrival tag: the ball's nearest approach to the target, from 0.3 s after release to the end.
        ks = [k for k in range(min(kf + 3, ka), ka + 1) if p.pos(t, k)[0] is not None]
        if ks: ka = min(ks, key=lambda k: math.hypot(bxy[k][0] - p.pos(t, k)[0], bxy[k][1] - p.pos(t, k)[1]))
    elif t is not None:
        # The arrival tag is quantized (0.1 s) and NFL tags can lead the ball; take the nearer of the tag frame and
        # its neighbours (+-0.1 s, ~2 yd of flight), the same on both sources.
        ks = [k for k in (ka - 1, ka, ka + 1) if kf < k < len(bxy) and k < p.frames and p.pos(t, k)[0] is not None]
        if ks: ka = min(ks, key=lambda k: math.hypot(bxy[k][0] - p.pos(t, k)[0], bxy[k][1] - p.pos(t, k)[1]))
    B = bxy[ka]
    oob = any(b[1] < 0 or b[1] > WIDTH for b in bxy[kf:ka + 1])
    E = [i for i in p.who('O') if p.players[i]['group'] in ELIG and p.pos(i, ka)[0] is not None]
    near = min((math.hypot(p.pos(i, ka)[0] - B[0], p.pos(i, ka)[1] - B[1]) for i in E), default=99)
    o['geo_away'] = oob or near > 5
    o['oob'] = oob
    # Thrown away = the source's own call that the pass had no intended receiver (NFL: the play description names
    # none; sim: QBPass.throwAway). The geometric test is the cross-check.
    o['away'] = (not side['namedReceiver']) if side is not None else bool(labels.get('throwaway'))
    # legal throwaway position: outside the tackles' snap y (+0.5) at release, or B past the line
    OL = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
    if len(OL) >= 2:
        ys = [p.pos(i, 0)[1] for i in OL]; qy = p.pos(q, kf)[1]
        o['outside'] = qy < min(ys) - 0.5 or qy > max(ys) + 0.5
    else: o['outside'] = None
    o['pastlos'] = B[0] > 0
    # openness at release
    def sep(i, k):
        return min((p.dist(i, d, k) for d in D), default=99)
    Er = [i for i in p.who('O') if p.players[i]['group'] in ELIG and p.pos(i, kf)[0] is not None]
    if t is not None and not o['away'] and p.pos(t, kf)[0] is not None:
        ts = sep(t, kf); o['open'] = 'tight' if ts < 1.5 else 'mid' if ts < 3 else 'open'; o['tsep'] = ts
        other = max((sep(i, kf) for i in Er if i != t), default=0)
        o['better'] = other >= max(3, ts + 2)
        if p.pos(t, ka)[0] is not None:
            tx, ty = p.pos(t, ka); m = math.hypot(B[0] - tx, B[1] - ty); o['miss'] = m
            rx, ry = bxy[kf]; ux, uy = tx - rx, ty - ry; L = math.hypot(ux, uy) or 1
            along = ((B[0] - tx) * ux + (B[1] - ty) * uy) / L; lat = abs((B[0] - tx) * uy - (B[1] - ty) * ux) / L
            o['err'] = ('long' if along > 0 else 'short') if abs(along) >= lat else 'wide'
            dball = min((math.hypot(p.pos(d, ka)[0] - B[0], p.pos(d, ka)[1] - B[1]) for d in D if p.pos(d, ka)[0] is not None), default=99)
            o['defended'] = dball <= 1.0 and dball < m
    else:
        o['open'] = 'no target'; o['better'] = None
    # result
    if 'catch' in ev: res = 'complete'
    elif (side['int'] if side is not None else labels.get('interception')): res = 'int'
    else: res = 'incomplete'
    o['res'] = res
    if res == 'incomplete':
        if o['away']: o['inc'] = 'thrown away'
        elif o.get('defended'): o['inc'] = 'defended'
        elif o.get('miss') is not None and o['miss'] > 1.5: o['inc'] = 'off target ' + o['err']
        elif o.get('miss') is not None: o['inc'] = 'catchable not caught'
        else: o['inc'] = 'unclassified'
    o['xlabel'] = ('pbu' if side['pbu'] else '-') if side is not None else ','.join(e for e in labels.get('ballEvents', []) if e not in ('incomplete', 'catch')) or '-'
    return o


def report(path, ball):
    R = {'hit': [], 'clean': []}; skipped = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        side = None
        if ball is not None:
            side = ball.get(raw['id'])
            if side is None: skipped += raw['events'].get('pass_forward') is not None; continue
        o = analyse(raw, side)
        if o is None: continue
        R['hit' if o['hit'] else 'clean'].append(o)
    H, Cl = R['hit'], R['clean']
    print(f"== {os.path.basename(path)}: throws with a defender within 1 yd before the ball is out n {len(H)} | clean n {len(Cl)}" + (f" | {skipped} throws without a ball track skipped" if skipped else ''))
    def dist(rows, key, order=None):
        c = collections.Counter(r.get(key) for r in rows); n = len(rows)
        ks = order or sorted(c, key=lambda k: -c[k])
        return ' | '.join(f"{k} {pct(c[k], n)}" for k in ks if c[k])
    res = lambda rows: f"complete {pct(sum(r['res'] == 'complete' for r in rows), len(rows))}, int {pct(sum(r['res'] == 'int' for r in rows), len(rows))} (n {len(rows)})"
    print(f" result: hit {res(H)} | clean {res(Cl)}")
    print(f" 1 phase (contact -> release): {dist(H, 'phase', ['<=0.2', '0.3-0.5', '0.6-1.0', '>1.0'])}")
    for name, rows in (('hit', H), ('clean', Cl)):
        tg = [r for r in rows if r.get('miss') is not None and not r['away']]
        mb = collections.Counter('on target' if r['miss'] <= 1.5 else 'ordinary' if r['miss'] <= 4 else 'wild' for r in tg)
        er = collections.Counter(r['err'] for r in tg if r['miss'] > 1.5)
        m = sorted(r['miss'] for r in tg)
        print(f" 2 ball vs target [{name}] (targeted, not thrown away, n {len(tg)}): " + ' | '.join(f"{k} {pct(mb[k], len(tg))}" for k in ('on target', 'ordinary', 'wild'))
              + f" | misses >1.5: " + ' '.join(f"{k} {pct(er[k], sum(er.values()))}" for k in ('long', 'short', 'wide')) + (f" | miss p50 {m[len(m) // 2]:.1f} yd" if m else ''))
        bt = [r for r in rows if r.get('better') is not None]
        print(f" 3 openness [{name}]: {dist(rows, 'open', ['tight', 'mid', 'open', 'no target'])} | a more open man existed {pct(sum(r['better'] for r in bt), len(bt))}")
        aw = [r for r in rows if r['away']]; ga = [r for r in rows if r['geo_away']]
        both = sum(r['away'] and r['geo_away'] for r in rows)
        legal = sum(1 for r in aw if r['outside'] or r['pastlos'])
        print(f" 4 thrown away [{name}]: source's call (no intended receiver) {pct(len(aw), len(rows))}, from a legal spot (QB outside the tackles or ball past the line) {pct(legal, len(aw))}, out of bounds {pct(sum(r['oob'] for r in aw), len(aw))} | cross-check, geometric (oob or nobody within 5 yd of the ball) {pct(len(ga), len(rows))}, both {both}")
        tg2 = [r for r in rows if not r['away']]
        print(f"   arrival tag present on targeted throws {pct(sum(r['arrTag'] for r in tg2), len(tg2))}")
        inc = [r for r in rows if r['res'] == 'incomplete']
        print(f" 5 incompletions [{name}] (n {len(inc)}, {pct(len(inc), len(rows))} of throws): {dist(inc, 'inc', ['thrown away', 'defended', 'off target long', 'off target short', 'off target wide', 'catchable not caught', 'unclassified'])}")
        xl = collections.Counter((r['inc'], r['xlabel']) for r in inc)
        print(f"   source labels by type: " + '; '.join(f"{k[0]}/{k[1]} {v}" for k, v in sorted(xl.items(), key=lambda kv: -kv[1])[:12]))
    print(" completion by phase x openness (hit throws): cells n>=5")
    for ph in ('<=0.2', '0.3-0.5', '0.6-1.0', '>1.0'):
        cells = []
        for op in ('tight', 'mid', 'open', 'no target'):
            rows = [r for r in H if r['phase'] == ph and r['open'] == op]
            if rows: cells.append(f"{op} {pct(sum(r['res'] == 'complete' for r in rows), len(rows)) if len(rows) >= 5 else '·'} (n {len(rows)})")
        print(f"   {ph:8s}: " + ' | '.join(cells))
    cells = []
    for op in ('tight', 'mid', 'open', 'no target'):
        rows = [r for r in Cl if r['open'] == op]
        cells.append(f"{op} {pct(sum(r['res'] == 'complete' for r in rows), len(rows))} (n {len(rows)})")
    print(f"   clean   : " + ' | '.join(cells))


if __name__ == '__main__':
    args = sys.argv[1:]; ball = None
    if '--ball' in args:
        i = args.index('--ball'); ball = load_ball(args[i + 1]); del args[i:i + 2]
    for path in args: report(path, ball)
