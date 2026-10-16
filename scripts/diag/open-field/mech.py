"""Shared run mechanism metrics (scripts/mechanics/metrics.py) on open-field
traces' common plays, beside the committed NFL reference. Lab plays have no
concept/box cells beyond what the operator infers.
usage: mech.py out/open-field/all/X.jsonl.gz [keys...]"""
import gzip, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts/mechanics'))
from metrics import Collector  # noqa: E402
ROOT = Path(__file__).resolve().parents[3]
nfl = json.load(open(ROOT / 'data/reviews/mechanics/nfl-bdb2022.json'))['metrics']
col = Collector()
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if r.get('common'): col.add(r['common'])
m = col.summary()['metrics']
keys = sys.argv[2:] or ['run.yards', 'run.yards_before_contact', 'run.yards_after_contact', 'run.engaged_dl_driven_back_1s',
                        'run.engaged_dl_driven_back_2s', 'run.engaged_dl_driven_back_3s', 'run.max_engaged_dl_driven_back_3s',
                        'run.ol_forward_1s', 'run.box_count', 'run.first_contact_s']
for k in keys:
    s, n = m.get(k, {}), nfl.get(k, {})
    f = lambda d: ' '.join(f"{q}={d.get(q)}" for q in ('n', 'mean', 'p10', 'p50', 'p90'))
    print(f"{k:38s} sim {f(s)}\n{'':38s} nfl {f(n)}")
