"""Where a sim arm's 20+ yd completions come from, two sim arms compared (sim only: needs the installed-route label).

usage: python3 -I scripts/diag/pass-operators/bigplay.py <off.jsonl.gz> [...] -- <on.jsonl.gz> [...]

Targeted throws (no throwaways): totals; 20+ completions per 100 attempts by air yards (target's x at arrival) and by
the target's installed route family / id (players[i].route); what the catch looked like on 20+ completions (nearest
defender distance, speed, velocity along the catcher's run, how the play ended from labels.carrierContacts); and the
catcher's speed at the catch vs his top speed in the 1.5 s before the throw and during the flight."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def air_bin(a): return 'behind' if a < 0 else '0-10' if a < 10 else '10-20' if a < 20 else '20+'
def load(paths):
    out = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); ev = raw['events']
            if raw['kind'] != 'pass' or 'pass_forward' not in ev or raw.get('labels', {}).get('throwaway'): continue
            t = raw.get('target')
            if t is None: continue
            p = Play(raw); kt = p.k(ev['pass_forward'])
            route = raw['players'][t].get('route') or '?'
            fam = route.split(':')[0]; rid = route.split(':')[-1]
            o = dict(fam=fam, rid=rid, yards=raw['yards'], comp='catch' in ev, src=os.path.basename(path))
            ka = p.k(ev.get('pass_arrived', ev.get('end')))
            if p.pos(t, ka)[0] is None: continue
            o['air'] = p.pos(t, ka)[0]; o['bin'] = air_bin(o['air'])
            if o['comp']:
                c = raw.get('receiver', t)
                if c is None: c = t
                cx, cy = p.pos(c, ka); vx, vy = p.velocity(c, ka); cs = math.hypot(vx, vy)
                o['cs'] = cs
                pre = [p.speed(c, k) for k in range(max(0, kt - 15), kt + 1) if p.pos(c, k)[0] is not None]
                o['pre'] = max(pre) if pre else None
                o['maxflight'] = max([p.speed(c, k) for k in range(kt, ka + 1) if p.pos(c, k)[0] is not None] or [0])
                D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
                f = min(D, key=lambda d: p.dist(c, d, ka)); o['dd'] = p.dist(c, f, ka)
                fvx, fvy = p.velocity(f, ka); o['ds'] = math.hypot(fvx, fvy)
                # turned: defender's velocity along the catcher's run direction
                o['along'] = (fvx * vx + fvy * vy) / cs if cs > .5 else 0
                o['ahead'] = (p.pos(f, ka)[0] - cx)  # defender downfield of the catcher (+)
                ac = raw['labels'].get('carrierContacts') or []
                ty = [e['type'] for e in ac]
                o['how'] = ('untouched' if not ac else 'broke' if 'broken_tackle' in ty else 'missed' if 'missed_tackle' in ty
                            else 'carried a wrap 5+' if 'tackle_wrap' in ty and 'first_contact' in ev and raw['yards'] - p.pos(c, p.k(ev['first_contact']))[0] >= 5 else 'tackled')
                o['yac'] = raw['yards'] - o['air']
            out.append(o)
    return out
i = sys.argv.index('--'); A = {'off': load(sys.argv[1:i]), 'on': load(sys.argv[i + 1:])}
for k, v in A.items():
    c = [o for o in v if o['comp']]
    print(f"{k}: attempts {len(v)} completions {len(c)} ({100*len(c)/len(v):.1f}%) 20+ {sum(o['yards']>=20 for o in c)} ({100*sum(o['yards']>=20 for o in c)/len(v):.1f}%/att) 40+ {sum(o['yards']>=40 for o in c)} | yds/att {sum(o['yards'] for o in v if o['comp'])/len(v):.2f} | YAC/rec {sum(o['yac'] for o in c)/len(c):.2f}")
print('\n20+ completions per 100 attempts, by air-yards bin (attempts, completion%, YAC p50, 20+/100att)')
for b in ('behind', '0-10', '10-20', '20+'):
    row = []
    for k, v in A.items():
        w = [o for o in v if o['bin'] == b]; c = [o for o in w if o['comp']]
        row.append(f"{k} n{len(w):4} comp {100*len(c)/max(1,len(w)):4.1f}% YAC {q([o['yac'] for o in c]):4.1f} (p75 {q([o['yac'] for o in c],.75):4.1f}) 20+ {100*sum(o['yards']>=20 for o in c)/max(1,len(w)):4.1f}")
    print(f"  {b:7} " + ' | '.join(row))
print('\nby route family (attempts, comp%, YAC p50/p75, 20+/100 att, 20+ count)')
fams = sorted({o['fam'] for v in A.values() for o in v})
for fm in fams:
    row = []
    for k, v in A.items():
        w = [o for o in v if o['fam'] == fm]; c = [o for o in w if o['comp']]
        row.append(f"{k} n{len(w):4} {100*len(c)/max(1,len(w)):4.1f}% YAC {q([o['yac'] for o in c]):4.1f}/{q([o['yac'] for o in c],.75):4.1f} 20+ {100*sum(o['yards']>=20 for o in c)/max(1,len(w)):4.1f} ({sum(o['yards']>=20 for o in c)})")
    print(f"  {fm:12} " + ' | '.join(row))
print('\ntop route ids by 20+ count change (on - off)')
ids = collections.Counter(); 
for k, sgn in (('on', 1), ('off', -1)):
    for o in A[k]:
        if o['comp'] and o['yards'] >= 20: ids[(o['fam'], o['rid'])] += sgn
for (fm, rid), d in sorted(ids.items(), key=lambda x: -x[1])[:12]:
    n = {k: sum(1 for o in A[k] if o['rid'] == rid) for k in A}
    print(f"  {fm}:{rid:22} {d:+d}  (attempts off {n['off']} on {n['on']})")
print('\n20+ completions: what the catch looked like')
for k, v in A.items():
    c = [o for o in v if o['comp'] and o['yards'] >= 20]
    print(f"  {k} n{len(c)}: air p50 {q([o['air'] for o in c]):.1f} | YAC p50 {q([o['yac'] for o in c]):.1f} | catcher speed {q([o['cs'] for o in c]):.1f} | nearest D dist {q([o['dd'] for o in c]):.1f} speed {q([o['ds'] for o in c]):.1f} along-catcher {q([o['along'] for o in c]):+.1f} | D downfield of catcher {100*sum(o['ahead']>0 for o in c)/max(1,len(c)):.0f}% | "
          + ' '.join(f"{h} {100*n/len(c):.0f}%" for h, n in collections.Counter(o['how'] for o in c).most_common()))
print('\nall completions: catcher speed at the catch vs his top speed in the 1.5 s before the throw')
for k, v in A.items():
    c = [o for o in v if o['comp'] and o['pre'] is not None]
    for b in ('behind', '0-10', '10-20', '20+'):
        w = [o for o in c if o['bin'] == b]
        if not w: continue
        print(f"  {k} {b:7} n{len(w):4} catch {q([o['cs'] for o in w]):.1f} | pre-throw top {q([o['pre'] for o in w]):.1f} | in-flight top {q([o['maxflight'] for o in w]):.1f} | catch > pre-throw top +0.5: {100*sum(o['cs']>o['pre']+.5 for o in w)/len(w):.0f}% | in-flight top > pre +1: {100*sum(o['maxflight']>o['pre']+1 for o in w)/len(w):.0f}%")
