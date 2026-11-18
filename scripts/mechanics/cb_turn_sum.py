"""Summary of cb_turn series (NFL or sim, same fields): by group (man/zone x press/off), at t = 0.5 .. 3.0 s, medians of
facing vs travel (0 forward, 180 backpedal), facing to QB (cos), speed, receiver speed, cushion; and the share 'turned'
(facing within 60 deg of travel while moving 2+ yd/s), and the first t at which half the group is turned."""
import sys, json, statistics as st
for f in sys.argv[1:]:
    R = json.load(open(f)); print(f"== {f.split('/')[-1]}: {len(R)} corners")
    for mz in ('Man', 'Zone'):
        for press in (True, False):
            G = [r for r in R if r['mz'] == mz and r['press'] == press]
            if len(G) < 5: continue
            print(f"  {mz} {'press' if press else 'off'} n {len(G)} (snap gap p50 {st.median(r['d0'] for r in G):.1f} yd)")
            half = None
            for k in range(0, 31):
                rows = [r['series'][k] for r in G if len(r['series']) > k]
                turned = sum(1 for x in rows if x['face_vs_travel'] <= 60 and x['s'] >= 2) / len(rows)
                if half is None and turned >= 0.5: half = k / 10
                if k in (5, 8, 10, 12, 15, 20, 25, 30):
                    m = lambda key: st.median(x[key] for x in rows)
                    print(f"    t {k/10:.1f}: face-vs-travel {m('face_vs_travel'):5.0f} | face QB {m('face_qb'):5.2f} | speed {m('s'):4.1f} (WR {m('wr_s'):4.1f}) | cushion {m('cushion'):5.1f} | turned {turned:.2f}")
            print(f"    first t half turned: {half}")
