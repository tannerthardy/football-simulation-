"""CALL_MIX preference table: per down-and-distance bucket, the coordinator's preference for each route class,
fitted so the called routes-run class mix matches NFL dropbacks in that bucket.

  python3 -I scripts/diag/call-mix/fit.py out/call-mix/plays.jsonl out/call-mix/nfl_routes.jsonl out/call-mix/profiles.json [--write]

Inputs:
  plays.jsonl     collect.ts on league-sampled games with CALL_MIX off: each called pass's concept, down,
                  distance and the routes its receivers ran (the call itself, not the QB's choice).
  nfl_routes.jsonl nfl_route_depth.py: NFL routes run by label and break depth (BDB 2025 weeks 1-3).
  profiles.json   profiles.ts: each concept's installed route-class profile and the class of every route id
                  (src/game/call-mix.ts; the same rule as the engine).
Model: in bucket b a concept's call share is w0[b][c] * prod_k pref[b][k] ** profile[c][k], where w0 is today's
call share (smoothed toward the concept's overall share with 10 pseudo-calls). The routes-run mix is the
call-share-weighted sum of each concept's measured routes. pref minimises KL(NFL mix || sim mix) +
LAM * sum_k log(pref_k)^2 with pref in [1/6, 6], normalised to a geometric mean of 1.
NFL classes: HITCH/OUT/IN under 8 yd deep and SLANT are quick, 8+ breaking; FLAT and ANGLE flat; CROSS cross;
GO/POST/CORNER/WHEEL vertical. SCREEN is left out of the target and reported as the remainder.
--write updates config/call-mix.json and the generated table in src/game/call-mix.ts."""
import json, math, sys, collections, re
LAM = 0.01
KS = ['quick', 'flat', 'cross', 'breaking', 'vertical']
BUCKETS = ['1st', '2nd_short', '2nd_med', '2nd_long', '3rd_short', '3rd_med', '3rd_long']
def bucket(down, dist):
    if down <= 1: return '1st'
    return f"{'2nd' if down == 2 else '3rd'}_{'short' if dist <= 3 else 'med' if dist <= 7 else 'long'}"
def nfl_class(label, depth):
    if label in ('HITCH', 'OUT', 'IN'): return 'quick' if depth < 8 else 'breaking'
    if label == 'SLANT': return 'quick'
    if label in ('FLAT', 'ANGLE'): return 'flat'
    if label == 'CROSS': return 'cross'
    if label == 'SCREEN': return None
    return 'vertical'
S = [json.loads(l) for l in open(sys.argv[1])]
P = [r for r in S if r.get('rec') == 'play' and r['callKind'] == 'pass']
NR = [json.loads(l) for l in open(sys.argv[2])]
PR = json.load(open(sys.argv[3])); prof, rcls = PR['profiles'], PR['routes']
cons = sorted(prof)
# each concept's measured routes run (per play): class counts / plays
RR = {c: [0.0] * len(KS) for c in cons}; nplays = collections.Counter()
for r in P:
    nplays[r['concept']] += 1
    for x in r['routes']:
        rid = 'checkdown' if x['route'] in ('checkdown*',) else x['route']
        if rid == 'block' or rid not in rcls: continue
        RR[r['concept']][KS.index(rcls[rid])] += 1
RR = {c: [v / max(1, nplays[c]) for v in RR[c]] for c in cons}
overall = {c: nplays[c] / len(P) for c in cons}
out = {'schema': 'call-mix-v1', 'source': {
    'nfl': 'BDB 2025 weeks 1-3 dropbacks, routes run by label and break depth (scripts/diag/call-mix/nfl_route_depth.py)',
    'sim': f'{len(P)} called passes, CALL_MIX off, collect.ts (league-sampled games)', 'lambda': LAM,
    'model': 'call weight x prod_k pref[k] ** profile[k]; fitted routes-run class mix vs NFL, SCREEN excluded'},
    'classes': KS, 'pref': {}, 'fit': {}}
for b in BUCKETS:
    calls = collections.Counter(r['concept'] for r in P if bucket(r['down'], r['dist']) == b); nb = sum(calls.values())
    w0 = {c: (calls[c] + 10 * overall[c]) / (nb + 10) for c in cons}
    nc = collections.Counter(nfl_class(r['label'], r['depth']) for r in NR if bucket(r['down'], r['dist']) == b)
    scr = nc.pop(None, 0); tot = sum(nc.values()); tgt = [nc[k] / tot for k in KS]
    def mix(lp):
        s = {c: w0[c] * math.exp(sum(prof[c][k] * lp[i] for i, k in enumerate(KS))) for c in cons}
        v = [sum(s[c] * RR[c][i] for c in cons) for i in range(len(KS))]; z = sum(v)
        return [x / z for x in v]
    def loss(lp):
        m = mix(lp); return sum(t * math.log(t / max(1e-9, x)) for t, x in zip(tgt, m) if t > 0) + LAM * sum(x * x for x in lp)
    lp = [0.0] * len(KS); lim = math.log(6)
    for it in range(300):
        for i in range(len(KS)):
            for step in (0.2, -0.2, 0.05, -0.05, 0.01, -0.01):
                old, ol = lp[i], loss(lp); lp[i] = max(-lim, min(lim, old + step))
                if loss(lp) >= ol - 1e-12: lp[i] = old
    g = sum(lp) / len(lp); lp = [x - g for x in lp]
    f0, f = mix([0.0] * len(KS)), mix(lp)
    out['pref'][b] = {k: round(math.exp(x), 3) for k, x in zip(KS, lp)}
    out['fit'][b] = {'n_sim_calls': nb, 'n_nfl_routes': tot + scr, 'nfl_screen_share': round(scr / (tot + scr), 3),
                     'nfl': {k: round(t, 3) for k, t in zip(KS, tgt)}, 'sim_off': {k: round(x, 3) for k, x in zip(KS, f0)},
                     'sim_fitted': {k: round(x, 3) for k, x in zip(KS, f)}}
    print(f"{b:10} calls {nb:4} nfl {tot + scr:5} screen {100 * scr / (tot + scr):3.1f}% | " + ' '.join(
        f"{k[:5]} {100 * a:4.1f}->{100 * x:4.1f} ({100 * t:4.1f})" for k, a, x, t in zip(KS, f0, f, tgt)) + ' | pref ' + ' '.join(f"{math.exp(x):.2f}" for x in lp), file=sys.stderr)
if '--write' in sys.argv:
    open('config/call-mix.json', 'w').write(json.dumps(out, indent=1) + '\n')
    ts = open('src/game/call-mix.ts').read()
    rows = '\n'.join(f"  '{b}': {{ " + ', '.join(f"{k}: {out['pref'][b][k]}" for k in KS) + ' },' for b in BUCKETS)
    ts = re.sub(r"(export const CALL_MIX_PREF: Record<CallBucket, Record<RouteClass, number>> = \{\n)(.*?)(\n\};)", lambda m: m.group(1) + rows + m.group(3), ts, flags=re.S)
    open('src/game/call-mix.ts', 'w').write(ts)
else:
    print(json.dumps(out, indent=1))
