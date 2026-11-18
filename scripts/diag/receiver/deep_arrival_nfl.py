"""NFL deep-throw arrival geometry on one operator (BDB 2025, 2022 weeks 1-9; common format + the football track).
Throws with pass_forward and pass_arrived tagged, a named target, ball at least MIN yd past the line at arrival, no play action when the
concept is known. Per throw: |football - target| (2D) at pass_arrived and every 0.1 s from -0.5 to +0.5 s around it, the target's speed,
the football's speed at arrival, and the throw's result. usage: python3 -I deep_arrival_nfl.py [PLAYS.jsonl.gz BALL.jsonl.gz] [MIN=15]"""
import gzip, json, math, sys
plays = sys.argv[1] if len(sys.argv) > 2 else 'out/split59/nfl-plays.jsonl.gz'
ballf = sys.argv[2] if len(sys.argv) > 2 else 'out/split59/nfl-ball.jsonl.gz'
MIN = float(sys.argv[-1]) if len(sys.argv) in (2, 4) else 15.0
B = {}
for l in gzip.open(ballf, 'rt'):
    r = json.loads(l); B[r['id']] = r
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
OFF = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
rows = []
for l in gzip.open(plays, 'rt'):
    r = json.loads(l); r = r.get('common', r)
    if r['kind'] != 'pass' or r['id'] not in B or r['target'] is None: continue
    ev = r['events']
    if 'pass_arrived' not in ev or 'pass_forward' not in ev: continue
    dt = r['dt']; k1 = round(ev['pass_arrived'] / dt); t = r['target']; b = B[r['id']]['b']; F = len(r['xy'])
    if k1 + 5 >= F or k1 - 5 < 0 or len(b) != F: continue
    if b[k1][0] < MIN: continue
    d = []
    for o in OFF:
        k = k1 + o; x, y = r['xy'][k][2 * t], r['xy'][k][2 * t + 1]
        d.append(math.hypot(b[k][0] - x, b[k][1] - y))
    sp = lambda k: math.hypot(r['xy'][k + 1][2 * t] - r['xy'][k - 1][2 * t], r['xy'][k + 1][2 * t + 1] - r['xy'][k - 1][2 * t + 1]) / (2 * dt)
    bs = math.hypot(b[k1 + 1][0] - b[k1 - 1][0], b[k1 + 1][1] - b[k1 - 1][1]) / (2 * dt)
    comp = B[r['id']]['passResult'] == 'C'
    rows.append(dict(id=r['id'], d=d, rs=sp(k1), bs=bs, comp=comp, air=b[k1][0], flight=ev['pass_arrived'] - ev['pass_forward'], cov=(r.get('cell') or {}).get('coverage'), side=min(b[k1][1], 53.33 - b[k1][1])))
print(f'n {len(rows)} (ball >= {MIN} yd past the line at pass_arrived); completion {sum(x["comp"] for x in rows)/len(rows):.2f}')
def tab(name, S):
    if not S: return
    d0 = [x['d'][5] for x in S]
    print(f'{name:28s} n {len(S):4d} ball-to-receiver at arrival p25/p50/p75 {q(d0,.25)}/{q(d0)}/{q(d0,.75)}  >2 yd {sum(v>2 for v in d0)/len(d0):.2f}  comp {sum(x["comp"] for x in S)/len(S):.2f}  receiver speed {q([x["rs"] for x in S])}  football speed {q([x["bs"] for x in S])}')
tab('all', rows); tab('outside (<=12 yd from sideline)', [x for x in rows if x['side'] <= 12]); tab('complete', [x for x in rows if x['comp']]); tab('incomplete', [x for x in rows if not x['comp']])
tab('air 15-25', [x for x in rows if x['air'] < 25]); tab('air 25+', [x for x in rows if x['air'] >= 25])
print('median |ball - receiver| by time from pass_arrived (s):')
print('  t      ' + ' '.join(f'{o/10:5.1f}' for o in OFF))
print('  all    ' + ' '.join(f'{q([x["d"][i] for x in rows]):5.2f}' for i in range(len(OFF))))
print('  compl  ' + ' '.join(f'{q([x["d"][i] for x in rows if x["comp"]]):5.2f}' for i in range(len(OFF))))
print('  incomp ' + ' '.join(f'{q([x["d"][i] for x in rows if not x["comp"]]):5.2f}' for i in range(len(OFF))))
