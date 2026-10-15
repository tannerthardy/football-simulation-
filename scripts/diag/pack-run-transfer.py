"""Pack core run captures losslessly using the existing reference-table codec.

--capture label=path.json.gz (repeat) --out path.jsonrefs.gz
Decode with wz-flow-evidence.py. The decoded root has captures[label].data;
extract that object to a normal capture JSON/gzip for replay/report scripts.
Core data is offline evidence, not a native restart. Original raw file digests
and retained compact-JSON digests are deliberately separate.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import time
spec=importlib.util.spec_from_file_location('codec',Path(__file__).with_name('wz-flow-evidence.py'))
codec=importlib.util.module_from_spec(spec);spec.loader.exec_module(codec)


def main():
    started=time.perf_counter();parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture',action='append',required=True);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    omitted=['panel[].writes','panel[].methods','panel[].phases','panel[].frames[].observerState','panel[].frames[].rngBefore']
    root={'protocol':'run-transfer-core-bundle-v1','captures':{},'omitted':omitted}
    records=[]
    for item in args.capture:
        label,name=item.split('=',1);path=Path(name);raw=path.read_bytes();data=json.loads(gzip.decompress(raw))
        source={'path':str(path.resolve()),'rawSha256':hashlib.sha256(raw).hexdigest(),'revision':data['revision'],
            'runtime':data['sourceSha256'],'originalGzipBytes':len(raw)}
        for case in data['panel']:
            for key in ['writes','methods','phases']:case.pop(key,None)
            for frame in case['frames']:
                for key in ['observerState','rngBefore']:frame.pop(key,None)
        root['captures'][label]={'source':source,'data':data}
        records.append({'label':label,**source,'cases':[{'id':c['input']['id'],'frames':len(c['frames']),
            'stateHashes':len(c['hashes']),'informationHashes':len(c['informationHashes'])}for c in data['panel']]})
    semantic=codec.compact(root);encoded,visited=codec.pack(root)
    restored=codec.unpack(encoded)
    assert restored==root and codec.compact(restored)==semantic
    result={'protocol':'wide-zone-portable-reference-table-v1','source':{'kind':'run-transfer-core-bundle'},
        'mode':'core-bundle','omitted':omitted,'retainedJsonSha256':hashlib.sha256(semantic).hexdigest(),'data':encoded}
    packed=gzip.compress(codec.compact(result),compresslevel=9,mtime=0)
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_bytes(packed)
    manifest={'protocol':'run-transfer-bundle-manifest-v1','captures':records,'bundle':str(args.out),
        'bytes':len(packed),'sha256':hashlib.sha256(packed).hexdigest(),'retainedJsonSha256':result['retainedJsonSha256'],
        'roundTripExact':True,'containersVisited':visited,'uniqueContainers':len(encoded['nodes']),
        'omitted':omitted,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'codecSha256':hashlib.sha256(Path(codec.__file__).read_bytes()).hexdigest(),
        'newWorldSteps':0,'elapsedSeconds':time.perf_counter()-started}
    args.out.with_name('evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({k:manifest[k]for k in ['bytes','roundTripExact','newWorldSteps','elapsedSeconds']}))

if __name__=='__main__':main()
