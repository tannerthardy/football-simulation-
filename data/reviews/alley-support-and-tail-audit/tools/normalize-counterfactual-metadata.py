"""Correct descriptive metadata in saved candidate packets without simulation.

Preserve original bytes, the originally executed collector hash, and the complete
row payload. The updated collector is not represented as having produced these
already executed packets.
"""
from pathlib import Path
import gzip
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / 'metadata-original'
ARCHIVE.mkdir(exist_ok=True)

def digest_bytes(data):
    return hashlib.sha256(data).hexdigest()

def digest_json(value):
    return digest_bytes(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())

method = ('Original league rosters and game seed reproduce the unchanged baseline601 native Game prefix and selected PlaySim constructor. '
          'The selected initial state and earlier history match the original light game. '
          'Only the selected ManCoverage.update method is borrowed from the candidate after initial capture. '
          'Actual behavior/see/World calls are wrapped once without extra observations, decisions, RNG or prescribed movement. '
          'Observed execution projections, every whole-tick hash, natural result and copied next RNG match a fresh unobserved run with the same selected-policy swap. '
          'The target log is captured after normal Game bookkeeping. '
          'Changed target outcomes and post-swap state/log/RNG are not required to match the original light game.')
limits = ['Selected mechanism witnesses and predeclared controls, not frequency or calibration estimates.',
          'Prehistory is reproduced natively; module WeakMaps are not serialized or independently hashed.',
          'Stops after selected snap naturally finishes and normal Game bookkeeping; no full-game-after-target parity claim.',
          'Full telemetry and raw diagnostic support/world fields are diagnostic, not information supplied to controllers.',
          'Only ManCoverage.update is swapped on the selected snap; this is not a complete candidate Game/PlaySim execution.',
          'Original light-game outcome parity is intentionally not claimed for the selected-policy counterfactual.',
          'Candidate plain-log checksum is not separately retained; observer/plain equality is directly checked for raw result, initial/final state, complete tick signatures and next RNG.']

executed = ROOT / 'selected-counterfactual.executed.ts'
corrected = ROOT / 'selected-counterfactual.ts'
executed_hash = digest_bytes(executed.read_bytes())
corrected_hash = digest_bytes(corrected.read_bytes())
assert executed_hash != corrected_hash
assert method in corrected.read_text()
rows = []
for play_id in ['G4-P127', 'G3-P099', 'G4-P012', 'G2-P188']:
    path = ROOT / 'counterfactual' / f'{play_id}-candidate.json.gz'
    original = ARCHIVE / path.name
    if not original.exists():
        shutil.copyfile(path, original)
    original_bytes = original.read_bytes()
    before = json.loads(gzip.decompress(original_bytes))
    assert before['toolSha256'] == executed_hash
    assert before['row']['phase'] == 'selected-alley-policy'
    assert before['row']['observerVerified']
    assert not before['row']['ordinaryLightVerified']
    after = dict(before, method=method, limits=limits)
    changed = [k for k in before if before[k] != after[k]]
    assert sorted(changed) == ['limits', 'method']
    assert digest_json(before['row']) == digest_json(after['row'])
    assert {k:v for k,v in before.items() if k not in ['method','limits']} == {k:v for k,v in after.items() if k not in ['method','limits']}
    after_bytes = gzip.compress(json.dumps(after, separators=(',', ':')).encode(), compresslevel=9, mtime=0)
    path.write_bytes(after_bytes)
    rows.append({'id':play_id, 'path':str(path.relative_to(ROOT)),
                 'originalBackup':str(original.relative_to(ROOT)),
                 'originalFileSha256':digest_bytes(original_bytes),
                 'correctedFileSha256':digest_bytes(after_bytes),
                 'rowSha256Before':digest_json(before['row']),
                 'rowSha256After':digest_json(after['row']),
                 'changedTopLevelKeys':changed,
                 'preservedExecutionToolSha256':after['toolSha256']})

receipt = {'schema':'selected-counterfactual-metadata-normalization-v1',
           'method':'Metadata-only repair of inherited candidate method/limits wording. No simulation rerun, no outcome/state/telemetry/RNG changes. Original execution collector bytes and packet bytes are preserved separately. Packet toolSha256 continues to identify the collector actually executed, not the later corrected collector.',
           'normalizationToolSha256':digest_bytes(Path(__file__).read_bytes()),
           'executedCollectorPath':executed.name, 'executedCollectorSha256':executed_hash,
           'correctedFutureCollectorPath':corrected.name, 'correctedFutureCollectorSha256':corrected_hash,
           'rows':rows}
(ROOT / 'metadata-normalization-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps({'cases':len(rows), 'executedCollectorSha256':executed_hash,
                  'correctedFutureCollectorSha256':corrected_hash,
                  'rowPayloadsUnchanged':all(r['rowSha256Before']==r['rowSha256After'] for r in rows)}))
