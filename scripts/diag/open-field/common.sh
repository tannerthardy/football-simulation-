#!/bin/bash
# Merge a trace label's shards into all/LABEL.jsonl.gz and a concept-tagged
# common-format file all/LABEL-common.jsonl.gz (for scripts/diag/trench/timeline.py).
P=${PY:-python3}
l=$1; mkdir -p out/open-field/all
zcat out/open-field/$l-[0-3].jsonl.gz | gzip > out/open-field/all/$l.jsonl.gz
$P -I -c "
import gzip,json
M={'iz':'insideZone','oz':'outsideZone','wz':'wideZone','power':'power','counter':'counter','duo':'duo','trap':'trap'}
out=gzip.open('out/open-field/all/$l-common.jsonl.gz','wt')
for line in gzip.open('out/open-field/all/$l.jsonl.gz','rt'):
  r=json.loads(line); c=r.get('common')
  if not c: continue
  c['cell']={'concept':M.get(r['concept'],r['concept']),'coverage':None}; out.write(json.dumps(c)+'\n')
out.close()"
