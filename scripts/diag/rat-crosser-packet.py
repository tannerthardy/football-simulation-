"""Reduce saved native recordings for review; never runs a simulation.
Keep all actors' body/request telemetry, events, contacts and cached rat reads.
The bulky perception transcript retains only the rat's unique consumed pictures;
other observers' pictures are omitted, with counts and raw-file SHA256 recorded.
python3 scripts/diag/rat-crosser-packet.py INPUT_DIRECTORY OUTPUT_DIRECTORY
"""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import sys

source, target = map(Path,sys.argv[1:])
target.mkdir(parents=True,exist_ok=True)
for path in sorted(source.glob('*.json.gz')):
    raw = path.read_bytes()
    packet = json.loads(gzip.decompress(raw))
    kept, omitted = 0, 0
    for rep in packet['reports']:
        for state in rep['states']:
            pictures, unique = [], set()
            for picture in state.get('perception',[]):
                key = json.dumps(picture,sort_keys=True)
                if picture['a'] == 15 and key not in unique:
                    pictures.append(picture)
                    unique.add(key)
                else:
                    omitted += 1
            kept += len(pictures)
            state['perception'] = pictures
    packet['recordingReduction'] = dict(rawSha256=hashlib.sha256(raw).hexdigest(),
                                        retainedRatPictures=kept,omittedOtherOrDuplicatePictures=omitted,
                                        policy='All body/request/contact/event/goal/read records unchanged; only perception transcript reduced.')
    (target/path.name).write_bytes(gzip.compress(json.dumps(packet,separators=(',',':')).encode(),mtime=0))
for path in source.glob('*.json'):
    if 'commands' in json.loads(path.read_text()):
        shutil.copyfile(path,target/path.name)
print(json.dumps({p.name:p.stat().st_size for p in target.iterdir() if p.is_file()}))
