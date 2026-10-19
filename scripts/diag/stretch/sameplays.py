"""Are two lab arms the same plays? Per case id: gain and every common-format
position frame compared exactly. Prints matched ids, gain mismatches and
trajectory mismatches. usage: sameplays.py ARM_A ARM_B"""
import gzip, json, sys
load = lambda l: {r['id']: r for r in map(json.loads, gzip.open(f'out/open-field/all/{l}.jsonl.gz', 'rt'))}
a, b = load(sys.argv[1]), load(sys.argv[2])
ids = sorted(set(a) & set(b))
gain = sum(1 for i in ids if a[i]['gain'] != b[i]['gain'])
xy = sum(1 for i in ids if a[i].get('common', {}).get('xy') != b[i].get('common', {}).get('xy'))
print(f"{sys.argv[1]} vs {sys.argv[2]}: ids {len(a)}/{len(b)}, shared {len(ids)}, gain mismatches {gain}, trajectory mismatches {xy}")
