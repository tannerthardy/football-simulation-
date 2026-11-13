"""After the first front-on hit: how the runner's carry ends, NFL against sim arms (Integration, 2026-11-10). Same contacts
and code as frontcourse.py (front-on first contact at -1..3 yd). Per hitter class (blocked / shed / free): share of
plays over by +0.5 / +1.0 s after contact, the runner's speed along the approach axis at +0.2 / 0.3 / 0.5 / 1.0 s
(medians; plays already over drop out), and the gain after contact.
usage: python3 -I carry.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, os, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]   # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
sys.argv = _argv
med = lambda v: st.median([x for x in v if x is not None]) if any(x is not None for x in v) else float('nan')
for p in sys.argv[1:]:
    R = fc.course(p)
    print(f"== {os.path.basename(p)}: {len(R)} front-on first contacts")
    for lab, sel in (('all', lambda r: True), ('blocked', lambda r: r['cls'] == 'blocked'), ('shed', lambda r: r['cls'] == 'shed'), ('free', lambda r: r['cls'] == 'free')):
        S = [r for r in R if sel(r)]
        if not S:
            continue
        v = lambda o: med([r['vr'][o] for r in S])
        print(f"   {lab:8} n {len(S):4} | over by +0.5 / +1.0 s {100*sum(r['t_end'] <= .5 for r in S)/len(S):3.0f}% / {100*sum(r['t_end'] <= 1.0 for r in S)/len(S):3.0f}%"
              f" | runner speed +0.2 / 0.3 / 0.5 / 1.0 s {v(2):.2f} / {v(3):.2f} / {v(5):.2f} / {v(10):.2f} | gain after {med([r['gain'] for r in S]):.2f}, to end {med([r['t_end'] for r in S]):.1f} s")
