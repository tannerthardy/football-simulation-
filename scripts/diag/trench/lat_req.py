import json, sys, statistics as st
for path in sys.argv[1:]:
    reps = json.load(open(path))
    print('==', path)
    for fam in (('outsideZone', 'wideZone'), ('insideZone', 'splitZone'), ('power', 'counter', 'trap')):
        rows = []
        for r in reps:
            if r['concept'] not in fam: continue
            ss = [s for s in r['samples'] if 0.3 <= s['t'] <= 2.0 and s['intentBy'] is not None]
            if len(ss) < 8: continue
            sgn = 1 if st.mean(s['intentBy'] for s in ss) >= 0 else -1
            rows.append({k: st.mean(s[k] * (sgn if k in ('intentBy', 'vBy', 'intentDy', 'vDy') else 1) for s in ss if s[k] is not None)
                         for k in ('intentBy', 'vBy', 'intentDy', 'vDy', 'facingBmove', 'handSteer', 'handHold', 'tangent', 'normal', 'control')})
        if not rows: continue
        m = lambda k: st.median(x[k] for x in rows)
        print(f"  {'/'.join(fam):26} n={len(rows):4}  blocker lateral req {m('intentBy'):5.2f} got {m('vBy'):5.2f} | defender req {m('intentDy'):5.2f} got {m('vDy'):5.2f} | blocker facing·move {m('facingBmove'):4.2f} | steer {m('handSteer'):5.0f} hold {m('handHold'):4.0f} tangent {m('tangent'):5.0f} normal {m('normal'):5.0f} ctrl {m('control'):4.2f}")
