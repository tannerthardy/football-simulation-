"""Double-team lifecycle: when a member turns to the backer (target change),
when he first loads him, versus the first carrier contact.
python -I scripts/diag/zone-lab/combos.py 'out/zone-lab/X-*.jsonl.gz' [concepts]"""
import glob, gzip, json, sys
from collections import Counter, defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt')]
conc = sys.argv[2].split(',') if len(sys.argv) > 2 else ['iz', 'oz', 'wz']
stat = defaultdict(Counter); turn = defaultdict(list); load = defaultdict(list)
for r in rows:
    if 'error' in r or r['concept'] not in conc: continue
    fc = (r.get('firstContact') or {}).get('t') or r['t']
    seen = set()
    for slot, p in r['plan0'].items():
        cb = p['combo']
        if not cb or not cb['backer'] or tuple(cb['members']) in seen: continue
        seen.add(tuple(cb['members']))
        bi = r['slots'].index(cb['backer']); mi = [r['slots'].index(m) for m in cb['members']]
        t_turn = next((f['t'] for f in r['frames'] if any(tg[0] in mi and tg[1] == bi for tg in f['tg'])), None)
        t_load = min([r['loadFirst'][k] for k in r['loadFirst'] if k.split('>')[1] == cb['backer'] and k.split('>')[0] in cb['members']] or [None], key=lambda x: x if x is not None else 99)
        k = r['concept']
        stat[k]['combos'] += 1
        if t_turn is None: stat[k]['never turned to backer'] += 1
        elif t_turn > fc: stat[k]['turned after first contact'] += 1
        elif t_load is None or t_load > fc: stat[k]['turned, no load before contact'] += 1
        else: stat[k]['loaded backer before contact'] += 1
        if t_turn is not None: turn[k].append(t_turn)
        if t_load is not None: load[k].append(t_load)
for k in stat:
    n = stat[k]['combos']; tt = sorted(turn[k]); tl = sorted(load[k])
    print(f"== {k}: {n} doubles with a backer; turn-to-backer median {tt[len(tt)//2] if tt else float('nan'):.2f}s, backer load median {tl[len(tl)//2] if tl else float('nan'):.2f}s")
    for c, v in stat[k].most_common():
        if c != 'combos': print(f"   {c:34s} {v:4d} {v/n:4.0%}")
