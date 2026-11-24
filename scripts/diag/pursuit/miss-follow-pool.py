"""Pool miss-follow-tap.mts files per arm (2026-11-24): python3 -I miss-follow-pool.py ARM=GLOB ...
Per arm and play type: plays, attempts per play, miss rate per attempt, misses per play; after a catch miss, the next
attempt made and the yards after; per seed set, the next-attempt-made rate (the outcome Integration asked to settle)."""
import json, glob, sys
for arg in sys.argv[1:]:
    arm, pat = arg.split('=', 1); F = sorted(glob.glob(pat))
    D = [json.load(open(f)) for f in F]
    for pt in ('catch', 'run'):
        P = sum(d.get('plays', {}).get(pt, 0) for d in D); A = [a for d in D for a in d.get('attempts', []) if a['ptype'] == pt]
        R = [r for d in D for r in d['rows'] if r['ptype'] == pt]; m = sum(a['missed'] for a in A)
        made = [r for r in R if r['next'] and r['next']['made']]
        ya = [r['yardsAfter'] for r in R if r['yardsAfter'] is not None]
        print(f"{arm:<5} {pt:<5} files {len(F)} plays {P} | attempts {len(A)} ({len(A)/max(1,P):.2f}/play) missed {100*m/max(1,len(A)):.1f}% | misses+breaks {len(R)} ({len(R)/max(1,P):.3f}/play)"
              f" | after a miss: next attempt made {100*len(made)/max(1,len(R)):.0f}%, yards after mean {sum(ya)/max(1,len(ya)):.2f}")
    per = []
    for f, d in zip(F, D):
        R = [r for r in d['rows'] if r['ptype'] == 'catch']
        per.append(f"{d['firstSeed']}: {100*sum(1 for r in R if r['next'] and r['next']['made'])/max(1,len(R)):.0f}% of {len(R)}")
    print(f"{arm:<5} catch next-made by seed set: " + ', '.join(per))
