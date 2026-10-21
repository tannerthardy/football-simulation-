"""What backside interior DL key in the first half second of a run (NFL
tracking vs sim, same code). Play side = the runner's lateral move from the
handoff to handoff + 1 s. Backside DL = defenders under 2 yd off the ball
whose snap lateral lies on the backside of the ball, inside the tackle + 1.
For each: lateral velocity toward the play at 0.3/0.5/1.0 s after the snap,
against cues that exist by then: the line's mean lateral step at 0.2/0.3 s
(the offensive line's flow), the back's snap offset from the ball toward the
play (offset back), and the concept family. Reports the DL's play-side
motion by cue bucket and the correlations.
usage: bsdl_key.py FILE [FILE ...]"""
import gzip, json, sys, statistics as st
def corr(a, b):
    if len(a) < 10: return float('nan')
    ma, mb = st.mean(a), st.mean(b); sa, sb = st.pstdev(a), st.pstdev(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / len(a) / (sa * sb) if sa and sb else float('nan')
FAM = lambda c: 'zone' if c and ('ZONE' in c.upper() or c in ('insideZone', 'outsideZone', 'wideZone')) else 'gap' if c and any(k in c.upper() for k in ('POWER', 'COUNTER', 'TRAP')) else 'other'
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line)
        if r.get('kind') != 'run' or r.get('carrier') is None: continue
        h = (r.get('events') or {}).get('handoff')
        if h is None: continue
        dt, xy, P, c = r['dt'], r['xy'], r['players'], r['carrier']
        k = lambda t: min(len(xy) - 1, int(round(t / dt)))
        pos = lambda i, t: (xy[k(t)][2 * i], xy[k(t)][2 * i + 1]) if xy[k(t)][2 * i] is not None else None
        a, b = pos(c, h), pos(c, h + 1)
        if not a or not b or abs(b[1] - a[1]) < .5: continue
        ps = 1 if b[1] > a[1] else -1
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i, 0)], key=lambda i: pos(i, 0)[1])
        if len(ol) != 5: continue
        by, los = pos(ol[2], 0)[1], pos(ol[2], 0)[0] + .3
        tack = max(abs(pos(ol[0], 0)[1] - by), abs(pos(ol[4], 0)[1] - by))
        lat = lambda i, t: (pos(i, t)[1] - by) * ps
        flow = {t: st.mean([lat(i, t) - lat(i, 0) for i in ol]) / t for t in (.2, .3)}
        rb = pos(c, 0); off = (rb[1] - by) * ps if rb else 0
        for i, p in enumerate(P):
            if p['side'] != 'D' or not pos(i, 0) or not pos(i, 1.0): continue
            d0 = pos(i, 0)
            if d0[0] - los > 2 or lat(i, 0) > -.3 or abs(lat(i, 0)) > tack + 1: continue
            v = {t: (lat(i, t + .1) - lat(i, t - .1)) / .2 for t in (.3, .5, 1.0)}
            rows.append({'v': v, 'flow': flow, 'off': off, 'fam': FAM((r.get('cell') or {}).get('concept'))})
    print(f"== {path.split('/')[-1]} backside DL n {len(rows)}")
    for fam in ('zone', 'gap', 'all'):
        rs = [x for x in rows if fam == 'all' or x['fam'] == fam]
        if len(rs) < 20: continue
        print(f"  {fam:5s} n {len(rs):5d} | DL toward play (yd/s) at .3/.5/1.0 s: " + '/'.join(f"{st.median([x['v'][t] for x in rs]):+.2f}" for t in (.3, .5, 1.0))
              + f" | line flow at .2/.3 s {st.median([x['flow'][.2] for x in rs]):+.2f}/{st.median([x['flow'][.3] for x in rs]):+.2f}"
              + f" | corr(DL .5, line flow .3) {corr([x['v'][.5] for x in rs], [x['flow'][.3] for x in rs]):+.2f}"
              + f" corr(DL .5, back offset) {corr([x['v'][.5] for x in rs], [x['off'] for x in rs]):+.2f}")
        for name, sel in (('line steps to play (>+.5 yd/s at .3)', lambda x: x['flow'][.3] > .5), ('line steps away/none', lambda x: x['flow'][.3] <= .5),
                          ('back offset to play (>+.5)', lambda x: x['off'] > .5), ('back behind QB/away', lambda x: x['off'] <= .5)):
            ss = [x for x in rs if sel(x)]
            if len(ss) >= 20: print(f"      {name:38s} n {len(ss):5d} DL at .3/.5: {st.median([x['v'][.3] for x in ss]):+.2f}/{st.median([x['v'][.5] for x in ss]):+.2f}")
