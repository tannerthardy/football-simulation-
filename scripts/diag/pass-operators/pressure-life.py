"""What ends a pressured dropback (Integration, 2026-11-10). Same code on NFL (out/mechanics/nfl-plays.jsonl.gz) and the
sim's pass-frames.mts records; 0.1 s frames from the snap. First pressure as pressure-shape.py (first defender within
2 yd of the QB from 0.3 s, before the throw). Resolution: the throw (pass_forward); else a scramble if the QB crosses the
line, else a sack/end in his hands. Over the window pressure -> resolution: its length; the QB's displacement and mean
speed (escape / step-up); the rusher's closest approach and his closing speed over the first 0.3 s; the share of frames
with an offensive player within 1.2 yd of the rusher (held/slowed by a blocker still on him). For sacks/ends: time from
2 yd to 1 yd (contact) and from 1 yd to the end. Rows by resolution, as shares of pressured dropbacks.
usage: python3 -I pressure-life.py <nfl.jsonl.gz | sim pass-frames jsonl> [...]"""
import sys, os, json, gzip, math, statistics as st, collections as C
med = lambda a: round(st.median(a), 2) if a else float('nan')
for path in sys.argv[1:]:
    op = gzip.open if path.endswith('.gz') else open
    n = 0; M = C.defaultdict(list); cnt = C.Counter()
    for l in op(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass':
            continue
        pl, X = p['players'], p['xy']
        Q = [i for i, a in enumerate(pl) if a['group'] == 'QB']
        if len(Q) != 1:
            continue
        q = Q[0]; O = [i for i, a in enumerate(pl) if a['side'] == 'O' and i != q]; D = [i for i, a in enumerate(pl) if a['side'] == 'D']
        thr = p['events'].get('pass_forward'); last = len(X) - 1
        endT = p['events'].get('end'); endF = min(last, int(round(endT / 0.1))) if endT is not None else last
        res_f = min(last, int(round(thr / 0.1))) if thr is not None else endF
        if res_f < 8:
            continue
        n += 1
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1]); dist = lambda i, j, f: math.dist(P(i, f), P(j, f))
        hit = None
        for f in range(3, res_f):
            dm, d = min((dist(dd, q, f), dd) for dd in D)
            if dm <= 2.0:
                hit = (f, d); break
        if not hit:
            continue
        f, d = hit
        if thr is not None:
            kind = 'throw'
        elif any(X[g][2 * q] > 0 for g in range(f, endF + 1)):
            kind = 'scramble'
        else:
            kind = 'sack/end'
        cnt[kind] += 1
        w = range(f, res_f + 1)
        M[kind + '|len'].append((res_f - f) * 0.1)
        M[kind + '|qdisp'].append(math.dist(P(q, f), P(q, res_f)))
        M[kind + '|qspeed'].append(sum(math.dist(P(q, g), P(q, g + 1)) for g in range(f, res_f)) / max(0.1, (res_f - f) * 0.1))
        M[kind + '|closest'].append(min(dist(d, q, g) for g in w))
        g3 = min(res_f, f + 3); M[kind + '|close'].append((dist(d, q, f) - dist(d, q, g3)) / max(0.1, (g3 - f) * 0.1))
        M[kind + '|held'].append(sum(1 for g in w if min(dist(o, d, g) for o in O) <= 1.2) / len(w))
        if kind == 'sack/end':
            c1 = next((g for g in w if dist(d, q, g) <= 1.0), None)
            if c1 is not None:
                M['sack|to1'].append((c1 - f) * 0.1); M['sack|1toEnd'].append((res_f - c1) * 0.1)
                # Neutral end for both sources: the QB stopped (under 0.5 yd/s for 0.3 s), not the record's end marker.
                sp = lambda g: math.dist(P(q, g), P(q, min(last, g + 1))) / 0.1
                stop = next((g for g in range(c1, last - 2) if all(sp(h) < 0.5 for h in range(g, g + 3))), None)
                if stop is not None:
                    M['sack|1toStop'].append((stop - c1) * 0.1)
    tot = sum(cnt.values())
    print(f"== {os.path.basename(path)}: {n} dropbacks, {tot} pressured ({tot / max(1, n):.1%})")
    for k in ('throw', 'sack/end', 'scramble'):
        print(f"   {k:9s} {cnt[k]:5d} ({cnt[k] / max(1, tot):4.0%} of pressured, {cnt[k] / max(1, n):5.1%} of dropbacks) | window {med(M[k + '|len'])} s | QB moved {med(M[k + '|qdisp'])} yd at {med(M[k + '|qspeed'])} yd/s | rusher closest {med(M[k + '|closest'])} yd, closing {med(M[k + '|close'])} yd/s over 0.3 s | blocker within 1.2 yd of him {med(M[k + '|held']):.0%} of the window")
    print(f"   sacks/ends: 2 yd -> 1 yd {med(M['sack|to1'])} s, 1 yd -> end marker {med(M['sack|1toEnd'])} s, 1 yd -> QB stopped {med(M['sack|1toStop'])} s (n {len(M['sack|to1'])}, {len(M['sack|1toStop'])})")
