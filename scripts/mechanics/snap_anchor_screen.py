#!/usr/bin/env python3
"""Reproduce the nominated snap-anchor screen; NOT an eligibility classifier.

python3 -I scripts/mechanics/snap_anchor_screen.py EXISTING.jsonl.gz > out/screen.json
The bounds below reproduce the original outcome-independent gross screen.
A hit is not proven corruption and must not be auto-excluded. No raw scan,
coordinate repair, outcome selection, simulation or shared loader edit occurs.
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys

path=Path(sys.argv[1])
with path.open('rb') as f:input_sha=hashlib.file_digest(f,'sha256').hexdigest()
hits=[];ordinal=0
with gzip.open(path,'rt') as f:
    for line in f:
        r=json.loads(line)
        if r['kind']!='run' or r['carrier'] is None:continue
        ol=[i for i,q in enumerate(r['players']) if q['group']=='OL']
        mean=sum(r['xy'][0][2*i] for i in ol)/len(ol)
        reasons=[]
        if not 0<=r['ball_y']<=160/3:reasons.append('ball_y_outside_field')
        if mean < -5 or mean > 2:reasons.append('gross_snap_LOS_anchor_screen_not_final_eligibility')
        if reasons:hits.append({'input_sha256':input_sha,'filtered_run_ordinal':ordinal,'play_id':r['id'],'concept':r['cell']['concept'],'ball_y':r['ball_y'],'mean_OL_x':mean,'screen_reasons':reasons})
        ordinal+=1
print(json.dumps({'schema':'snap-anchor-screen-v1','input_sha256':input_sha,'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'loaded_runs':ordinal,'predicate':'ball_y outside [0,160/3] OR mean(all listed OL snap x) < -5 OR > 2','screen_only':True,'hits':hits},indent=2))
