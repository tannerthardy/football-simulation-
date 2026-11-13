"""Summarise player-spread.mts output like skill_spread.py: per position group, player medians p10/p50/p90 and
split-half reliability (Spearman-Brown corrected). usage: python3 -I player-spread-summary.py a.jsonl [b.jsonl ...]"""
import sys, json, math, statistics as st, collections as C, re
MIN = {'lead': 40, 'rel': 8, 'angle': 8, 'appr': 8, 'ended': 8}
def grp(slot):
    s = slot.split('_')[0]
    if re.match(r'^(DE|DT|NT|DL|E|T|N)', s): return 'DL'
    if re.match(r'^(CB|NB|DB|C)', s) and not s.startswith('CB') is False: return 'CB'
    if re.match(r'^(FS|SS|S)$', s): return 'S'
    if 'LB' in s or s in ('M', 'W', 'Sam', 'Will', 'Mike'): return 'LB'
    return 'CB' if s.startswith(('CB', 'NB', 'DB', 'NICKEL', 'DIME')) else 'other'
S = C.defaultdict(lambda: C.defaultdict(lambda: ([], [])))
for f in sys.argv[1:]:
    for l in open(f):
        try: o = json.loads(l)
        except Exception: continue
        S[o['m']][(grp(o['pos']), o['id'])][o['half']].append(o['v'])
def pear(a, b):
    ma, mb = st.mean(a), st.mean(b); sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
print('slots seen:', sorted({k[0] for m in S for k in S[m]}))
for m in ('lead', 'rel', 'angle', 'appr', 'ended'):
    for g in ('DL', 'LB', 'CB', 'S'):
        keys = [k for k in S[m] if k[0] == g and len(S[m][k][0]) + len(S[m][k][1]) >= MIN[m]]
        if len(keys) < 6: print(f'  {m:5} {g:2} players {len(keys)} (too few)'); continue
        med = sorted(st.median(S[m][k][0] + S[m][k][1]) for k in keys)
        both = [k for k in keys if len(S[m][k][0]) >= MIN[m] // 3 and len(S[m][k][1]) >= MIN[m] // 3]
        r = pear([st.median(S[m][k][0]) for k in both], [st.median(S[m][k][1]) for k in both]) if len(both) >= 5 else float('nan')
        q = lambda p: med[int(p * (len(med) - 1))]
        print(f'  {m:5} {g:2} players {len(keys):3}: player medians p10/p50/p90 {q(.1):6.1f} {q(.5):6.1f} {q(.9):6.1f} | split-half r {r:5.2f} (corrected {2*r/(1+r) if r == r and r > -1 else float("nan"):5.2f}, {len(both)})')
