"""Archive all 24 summaries/first-load observations and six predetermined traces.
Usage: python3 pack-traces.py FULL_RAW_JSON_GZ OUTPUT_JSON_GZ
No simulation, trace reselection, or changes to measurements.
"""
import gzip
import hashlib
import json
import sys
from pathlib import Path

source, output = map(Path, sys.argv[1:])
raw_bytes = source.read_bytes()
raw = json.loads(gzip.decompress(raw_bytes))
concepts = ['iz_strong', 'wz_strong', 'power', 'trap', 'counter', 'oz_strong']
fixed = [f'OLB-R1-{concept}-R-S3' for concept in concepts]
assert len(raw['rows']) == 24
assert sum(row['id'] in fixed for row in raw['rows']) == 6
archived = {key: value for key, value in raw.items() if key != 'rows'}
archived['schema'] = 'ol-base-fixed-traces-v1'
archived['originalSchema'] = raw['schema']
archived['originalRawSha256'] = hashlib.sha256(raw_bytes).hexdigest()
archived['traceSelection'] = {'fixedIds': fixed, 'policy': 'First roster, unflipped six concepts, fixed before outcomes.',
    'preserved': 'All 24 inputs, profiles, initial/end states, first acquisitions, actual first-load records, summaries and invariants. All physical tick traces for six fixed clips.',
    'omitted': 'Detailed tick traces for other 18 inputs; regenerate with pinned collector and engine source.'}
archived['rows'] = [{key: value for key, value in row.items() if key != 'rows' or row['id'] in fixed} for row in raw['rows']]
output.write_bytes(gzip.compress((json.dumps(archived, separators=(',', ':')) + '\n').encode(), compresslevel=9, mtime=0))
print(output, output.stat().st_size)
