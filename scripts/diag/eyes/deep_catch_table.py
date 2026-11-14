"""How deep balls end, by separation at the throw (deep-catch.ts output). Deep = route go, seam, post, fade.
Ending: INT; defender touched (pbu/deflection, no INT); caught contested (a defender within 1.0 yd of the ball's landing
at the designed arrival); caught clean; dropped (receiver touched it, drop event); off target (receiver > 1.5 yd from the
landing at arrival, untouched); other incomplete. Miss = landing vs aimed point; rcvToBall = receiver to landing at arrival.
Run: python3 -I deep_catch_table.py a.jsonl [b.jsonl ...]"""
import json, sys, collections
R = [json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
D = [r for r in R if any(k in (r.get('route') or '') for k in ('go', 'seam', 'post', 'fade'))]
def ending(r):
    if r['int']: return 'INT'
    if r['pbu']: return 'defender touched'
    if r['caught']: return 'caught contested' if r.get('atArr') and r['atArr']['defToBall'] < 1.0 else 'caught clean'
    if 'drop' in r.get('ballEvents', []): return 'dropped'
    if r.get('atArr') and r['atArr']['rcvToBall'] > 1.5: return 'off target'
    return 'other incomplete'
q = lambda v, p=.5: sorted(v)[int(p * (len(v) - 1))] if v else float('nan')
E = ('caught clean', 'caught contested', 'defender touched', 'INT', 'dropped', 'off target', 'other incomplete')
print(f'deep targets {len(D)} of {len(R)}')
print('| sep at throw | n | ' + ' | '.join(E) + ' | miss p50 | rcv-to-ball p50 | def-to-ball p50 |')
print('|---|---|' + '---|' * (len(E) + 3))
for lab, a, b in (('< 2 yd', 0, 2), ('2+ yd', 2, 99), ('all', 0, 999)):
    rs = [r for r in D if a <= r['sepThrow'] < b]
    c = collections.Counter(ending(r) for r in rs)
    A = [r['atArr'] for r in rs if r.get('atArr')]
    print(f'| {lab} | {len(rs)} | ' + ' | '.join(f'{100*c[e]/max(1,len(rs)):.0f}%' for e in E) +
          f" | {q([r['miss'] for r in rs]):.2f} | {q([x['rcvToBall'] for x in A]):.2f} | {q([x['defToBall'] for x in A]):.2f} |")
