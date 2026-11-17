"""Summary of und-trace.mts output: per role (underneath / deep), request stability, request vs facing and the turn,
asked speed, and speed at the release / +0.3 / +0.6 s in the play vs the lone-body replay of the same commands.
usage: python3 scripts/diag/yac/und-trace.py OUT.json"""
import json, math, sys
R = json.load(open(sys.argv[1]))
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
for role in ('und', 'deep'):
    S = [r for r in R if r['role'] == role]
    if not S: continue
    ang0, turn, big, rev, tot, row = [], [], 0, 0, 0.0, {}
    for r in S:
        L = r['L']
        dirs = [math.atan2(s['rv']['y'], s['rv']['x']) if math.hypot(s['rv']['x'], s['rv']['y']) > 0.5 else None for s in L]
        ch = [wrap(b - a) if a is not None and b is not None else 0 for a, b in zip(dirs, dirs[1:])]
        tot += L[-1]['t'] - L[0]['t']
        for k, c in enumerate(ch):
            if abs(c) > math.radians(20):
                big += 1
                if any(abs(ch[j]) > math.radians(20) and ch[j] * c < 0 for j in range(k + 1, min(len(ch), k + 7))): rev += 1
        if dirs[0] is not None:
            a0 = abs(math.degrees(wrap(dirs[0] - L[0]['f']))); ang0.append(a0)
            if a0 >= 30:
                tt = next((s['t'] for i, s in enumerate(L) if dirs[i] is not None and abs(math.degrees(wrap(dirs[i] - s['f']))) < 30), None)
                if tt is not None: turn.append(tt)
        for t in (0.0, 0.3, 0.6):
            k = min(range(len(L)), key=lambda i: abs(L[i]['t'] - t))
            if abs(L[k]['t'] - t) < 0.03:
                row.setdefault(t, ([], [], []))
                row[t][0].append(L[k]['sp']); row[t][1].append(r['rsp'][k] if k < len(r['rsp']) else float('nan')); row[t][2].append(math.hypot(L[k]['rv']['x'], L[k]['rv']['y']))
    print(f"{role}: n {len(S)} | >20 deg re-aims {big / max(tot, 1e-9):.2f}/s, reversed {rev / max(tot, 1e-9):.2f}/s | request vs facing at release p50 {q(ang0):.0f} p75 {q(ang0, .75):.0f} deg | turn to <30 deg p50 {q(turn):.2f} s")
    print('   speed play / lone replay / asked at release, +0.3, +0.6 s: ' + ' | '.join(f"{t:+.1f}s {q(v[0]):.1f}/{q(v[1]):.1f}/{q(v[2]):.1f} (n {len(v[0])})" for t, v in sorted(row.items())))
