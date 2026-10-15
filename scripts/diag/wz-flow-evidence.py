"""Portable wide-zone evidence; no simulation or game-code import.

Encode:
 python3 scripts/diag/wz-flow-evidence.py encode out/wide-zone-flow/retained.json.gz \
   --out docs/reviews/wide-zone-flow/final.jsonrefs.gz

Decode and replay:
 python3 scripts/diag/wz-flow-evidence.py decode docs/reviews/wide-zone-flow/before.jsonrefs.gz \
   --out out/wide-zone-flow/decoded-before.json.gz
 python3 scripts/diag/wz-flow-evidence.py decode docs/reviews/wide-zone-flow/final.jsonrefs.gz \
   --out out/wide-zone-flow/decoded-final.json.gz
 python3 scripts/diag/wz-flow-replay.py --before out/wide-zone-flow/decoded-before.json.gz \
   --candidate out/wide-zone-flow/decoded-final.json.gz --out out/wide-zone-flow/decoded-replay

The core selection retains all 22 before/after bodies, raw/final requests,
behaviors, engagements, joints, pending impulses, complete StepReports, consumed
opponent/teammate cues, initial information and original state/information hashes.
It omits writes/methods/phases debug duplication and per-tick observer/RNG
snapshots. It is sufficient for offline metrics/replay, not a native restart.
--mode full preserves every parsed JSON field, including selected diagnostic
packets. Types, numbers, arrays and object key order round-trip exactly. File
formatting changes; source file SHA and retained compact-JSON SHA are distinct.

Every container is an explicit ['@', index] reference to a preceding table
entry. Entries are ['o', [[key, value], ...]] or ['a', [value, ...]]. Original
arrays/objects are always table entries, so literal marker-like data is safe.
Both commands validate the retained digest; encoding also checks the full
round trip before writing. Python's standard library is the only dependency.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import time


def compact(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def pack(root):
    nodes, index = [], {}
    visited = 0

    def walk(value):
        nonlocal visited
        if isinstance(value, (dict, list)):
            visited += 1
            if isinstance(value, dict):
                children = [(k, walk(v)) for k, v in value.items()]
                signature = ('o', tuple((k, v[1]) for k, v in children))
                node = ['o', [[k, v[0]] for k, v in children]]
            else:
                children = [walk(v) for v in value]
                signature = ('a', tuple(v[1] for v in children))
                node = ['a', [v[0] for v in children]]
            ident = index.get(signature)
            if ident is None:
                ident = len(nodes)
                index[signature] = ident
                nodes.append(node)
            return ['@', ident], ('r', ident)
        # bool/int are separate JSON types; preserve signed floating zero too.
        key = (type(value).__name__, value.hex() if isinstance(value, float) and value == 0 else value)
        return value, ('p', key)

    encoded, _ = walk(root)
    return {'encoding': 'json-container-table-v1', 'root': encoded, 'nodes': nodes}, visited


def unpack(document):
    if document['encoding'] != 'json-container-table-v1':
        raise ValueError('Unsupported evidence encoding')
    values = []

    def deref(value):
        if not isinstance(value, list):
            return value
        if len(value) != 2 or value[0] != '@' or type(value[1]) is not int or not 0 <= value[1] < len(values):
            raise ValueError('Invalid evidence reference')
        return values[value[1]]

    for kind, payload in document['nodes']:
        if kind not in ('o', 'a'):
            raise ValueError('Invalid evidence node type')
        values.append({key: deref(value) for key, value in payload} if kind == 'o'
                      else [deref(value) for value in payload])
    return deref(document['root'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('encode', 'decode'))
    parser.add_argument('input', type=Path)
    parser.add_argument('--mode', choices=('full', 'core'), default='core')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    started = time.perf_counter()
    source_bytes = args.input.read_bytes()
    source = json.loads(gzip.decompress(source_bytes) if args.input.suffix == '.gz' else source_bytes)
    if args.command == 'decode':
        if source['protocol'] != 'wide-zone-portable-reference-table-v1':
            raise ValueError('Unsupported evidence protocol')
        restored = compact(unpack(source['data']))
        if sha(restored) != source['retainedJsonSha256']:
            raise ValueError('Retained evidence digest mismatch')
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_bytes(gzip.compress(restored, compresslevel=9, mtime=0)
                             if args.out.suffix == '.gz' else restored)
        print(json.dumps({'input': str(args.input.resolve()), 'output': str(args.out.resolve()),
                          'retainedJsonSha256': sha(restored), 'digestVerified': True,
                          'newWorldSteps': 0, 'elapsedSeconds': time.perf_counter() - started}))
        return
    omissions = []
    if args.mode == 'core':
        for panel in source['panel']:
            for key in ('writes', 'methods', 'phases'):
                panel.pop(key, None)
            for frame in panel['frames']:
                for key in ('observerState', 'rngBefore'):
                    frame.pop(key, None)
        omissions = ['panel[].writes', 'panel[].methods', 'panel[].phases',
                     'panel[].frames[].observerState', 'panel[].frames[].rngBefore']
    semantic = compact(source)
    encoded, visited = pack(source)
    result = {'protocol': 'wide-zone-portable-reference-table-v1',
              'source': {'path': str(args.input.resolve()), 'sha256': sha(source_bytes),
                         'revision': source.get('revision'), 'runtime': source.get('sourceSha256'),
                         'protocol': source.get('protocol')},
              'mode': args.mode, 'omitted': omissions, 'retainedJsonSha256': sha(semantic),
              'data': encoded}
    packed = gzip.compress(compact(result), compresslevel=9, mtime=0)
    restored = unpack(encoded)
    assert restored == source
    assert compact(restored) == semantic
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(packed)
    receipt = {'input': str(args.input.resolve()), 'mode': args.mode,
               'originalGzipBytes': len(source_bytes), 'retainedRawBytes': len(semantic),
               'referenceTableGzipBytes': len(packed),
               'containersVisited': visited, 'uniqueContainers': len(encoded['nodes']),
               'output': str(args.out.resolve()), 'outputSha256': sha(packed),
               'sourceSha256': sha(source_bytes), 'retainedJsonSha256': sha(semantic),
               'roundTripExact': True, 'newWorldSteps': 0,
               'elapsedSeconds': time.perf_counter() - started}
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
