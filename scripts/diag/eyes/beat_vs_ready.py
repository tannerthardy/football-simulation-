"""Each read's installed beat against its route's ready time, CONCEPT_DROPS off and on (beat-vs-ready.ts rows).
Flags: EARLY where the beat comes more than 0.2 s before the route is ready (the feet arrive at a closed route; for
the two routes of a keyed high-low, more than a hitch past that, since the high is thrown when the key commits),
LATE where it comes more than a hitch (0.4 s) after (the route has been open a step). For Rules' drop marking.
usage: python3 -I beat_vs_ready.py off.jsonl on.jsonl"""
import sys, json
EARLY, LATE = 0.2, 0.4
L = lambda f: {(r['concept'], r['formation']): r for r in map(json.loads, open(f))}
A, B = L(sys.argv[1]), L(sys.argv[2])
tally = {'off': [0, 0, 0], 'on': [0, 0, 0]}
place = {}
def cell(r, key=None):
    d = r['beat'] - r['ready']
    # A keyed high-low is one look on one beat (Rules, #780): he reads the defender on the beat, throws the low on time
    # and the high when the man commits and it opens within a hitch after. So a key route is EARLY only past a hitch.
    early = EARLY + (LATE if key and r['ref'] in key else 0)
    tag = 'EARLY' if d < -early - 1e-6 else 'LATE' if d > LATE + 1e-6 else 'ok'
    return d, tag, f"{r['ref']}:{r['step']} {r['beat']:.2f}/{r['ready']:.2f} {d:+.2f} {tag if tag != 'ok' else ''}".rstrip()
print("concept / formation | drop off -> on | per read (place, ref:step beat/ready beat-ready FLAG), off then on")
for k in A:
    a, b = A[k], B.get(k)
    if not a['installed']: print(f"{k[0]} / {k[1]}: not installed"); continue
    for name, r in (('off', a), ('on', b)):
        for x in r['reads']:
            d, tag, _ = cell(x, r.get('key')); tally[name][0 if tag == 'ok' else 1 if tag == 'EARLY' else 2] += 1
            pl = place.setdefault((name, x['place'] if x['place'] in (1, 2, 'outlet') else '3+'), [0, 0, 0]); pl[0 if tag == 'ok' else 1 if tag == 'EARLY' else 2] += 1
    print(f"{k[0]} / {k[1]} | set {a['set']} -> {b['set']}")
    for name, r in (('off', a), ('on', b)):
        print(f"   {name:3}: " + ' | '.join(f"{x['place']} {cell(x, r.get('key'))[2]}" for x in r['reads']))
for name, (ok, e, l) in tally.items(): print(f"{name}: reads ok {ok}, EARLY {e}, LATE {l}")
print("by place (reads 3+ share the second hitch's beat; in QB_FOOTWORK bit 1 they move on by the dwell):")
for name in ('off', 'on'):
    print(f"  {name}: " + ' | '.join(f"read {p}: ok {v[0]} EARLY {v[1]} LATE {v[2]}" for (n, p), v in sorted(place.items(), key=lambda kv: str(kv[0][1])) if n == name))
