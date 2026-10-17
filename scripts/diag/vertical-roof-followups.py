#!/usr/bin/env python3
"""Two declared follow-ups only: finish the adverse prefixes; freeze two fresh calls.

Reuses the archived native runner and source hosts. No game/roster campaign,
download, outcome selection, source mutation or automatic baseline generation.
"""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/vertical-roof'
HOSTS = OUT / 'hosts'


def replace(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)


def run(host, script, ids):
    subprocess.run(['node', '--import', 'tsx', 'scripts/' + script, 'run', *ids], cwd=host, check=True, timeout=30)


def extend():
    host = HOSTS / 'candidate'
    text = (host / 'scripts/vertical-roof.ts').read_text()
    text = replace(text, 'horizon=horizons[id]??6', 'horizon=12')
    text = replace(text, '${id}.json.gz', '${id}-extended.json.gz')
    text = replace(text, 'mode+\'-summary.json\'', 'mode+\'-extended-summary.json\'')
    target = host / 'scripts/vertical-roof-extend.ts'
    target.write_text(text)
    run(host, target.name, ['G1-P185', 'G4-P156'])
    import gzip
    rows = []
    for case in ['G1-P185', 'G4-P156']:
        load = lambda suffix: json.loads(gzip.decompress((host / f'out/catch-opportunity-physics/{case}{suffix}.json.gz').read_bytes()))
        old, new = load(''), load('-extended')
        assert old['source'] == new['source'] and old['inputHash'] == new['inputHash']
        assert new['ticks'][:len(old['ticks'])] == old['ticks']
        assert new['events'][:len(old['events'])] == old['events']
        rows.append({'id': case, 'prefixIdentical': True, 'censored': new['censored'], 't': new['t'], 'result': new['result']})
    (OUT / 'continuations.json').write_text(json.dumps(rows, indent=2) + '\n')


def transfer():
    base = HOSTS / 'base'
    generator = '''import {writeFileSync} from 'node:fs';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {PlaySim} from '../src/sim/playsim.js';
const offense=generateTeam(new Rng(6201),'Fresh vertical offense','FVO',{strength:.6});
const defense=generateTeam(new Rng(6202),'Fresh vertical defense','FVD',{strength:.6});
const fixtures=[];
for(const [id,form,concept,coverage,seed] of [
 ['F-QUARTERS-VERTICALS','gun_doubles_11','four_verts','cover4',6203],
 ['F-COVER2-SMASH','gun_trips_11','smash','cover2_match',6204]]){
 const setup={offense:pickOffense(offense,'11'),defense:pickDefense(defense,'nickel'),
 offCall:{formation:FORMATION_BY_ID[form],flip:false,kind:'pass',pass:PASS_BY_ID[concept],label:id},
 defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[coverage],pressure:null,zoneStyle:'match',label:id},
 los:40,ballY:26.67,firstDownX:50,seed,audibles:false,record:true,recordLevel:'full'};
 const sim=new PlaySim(setup);
 fixtures.push({id,setup,constructorRng:structuredClone(sim.rng),initial:sim.agents.map(a=>({id:a.player.id,slot:a.slot,energy:a.body.energy,profile:a.profile}))});
}
writeFileSync('../../fresh-inputs.json',JSON.stringify({teamSeeds:[6201,6202],fixtures},null,2)+'\\n');
'''
    (base / 'scripts/vertical-roof-freeze.ts').write_text(generator)
    frozen = OUT / 'fresh-inputs.json'
    assert not frozen.exists(), 'Preserve the existing frozen inputs; no seed regeneration'
    subprocess.run(['node', '--import', 'tsx', 'scripts/vertical-roof-freeze.ts'], cwd=base, check=True, timeout=10)
    restorer = '''import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PlaySim} from '../../src/sim/playsim.js';
const frozen=JSON.parse(readFileSync('out/catch-opportunity-physics/fresh-inputs.json','utf8'));
export function reconstruct(id:string){const f=frozen.fixtures.find((q:any)=>q.id===id);assert(f);
 const setup=structuredClone(f.setup),sim=new PlaySim(setup);
 assert.deepEqual(structuredClone(sim.rng),f.constructorRng);
 assert.deepEqual(sim.agents.map(a=>({id:a.player.id,slot:a.slot,energy:a.body.energy,profile:a.profile})),f.initial);
 return {id,status:'constructor-match',setup,sim,native:null,ob:{kind:'frozen-fresh-input',...f}};}
'''
    for arm in ['base', 'candidate']:
        host = HOSTS / ('transfer-' + arm)
        assert not host.exists(), f'Preserve {host}'
        shutil.copytree(HOSTS / arm / 'src', host / 'src')
        (host / 'scripts').mkdir()
        shutil.copyfile(ROOT / 'scripts/source-version.ts', host / 'scripts/source-version.ts')
        shared = host / 'out/catch-opportunity-physics'
        shared.mkdir(parents=True)
        shutil.copyfile(frozen, shared / 'fresh-inputs.json')
        (shared / 'fresh-reconstruct.ts').write_text(restorer)
        text = (HOSTS / arm / 'scripts/vertical-roof.ts').read_text()
        text = replace(text, 'catch-opportunity-physics/reconstruct.js', 'catch-opportunity-physics/fresh-reconstruct.js')
        begin, end = text.index(' const parity={'), text.index(' const output={')
        text = text[:begin] + ' const parity=null;\n' + text[end:]
        text = replace(text, "if(prep.arm==='base')assert", 'if(parity)assert')
        (host / 'scripts/vertical-roof-transfer.ts').write_text(text)
        prep = {'arm': 'transfer-' + arm, 'frozenInputSha256': hashlib.sha256(frozen.read_bytes()).hexdigest(),
                'runnerSha256': hashlib.sha256(text.encode()).hexdigest(), 'restorerSha256': hashlib.sha256(restorer.encode()).hexdigest(),
                'sourceHost': str(HOSTS / arm), 'teamSeeds': [6201, 6202], 'playSeeds': [6203, 6204],
                'sourceBase': '0000e560e0dbe31905151465152d412ba838803d'}
        (host / 'preparation.json').write_text(json.dumps(prep, indent=2) + '\n')
        run(host, 'vertical-roof-transfer.ts', ['F-QUARTERS-VERTICALS', 'F-COVER2-SMASH'])


def repeat_transfer():
    # Only the new braking branch is under review. Reuse frozen inputs and
    # accepted baseline; never regenerate the rosters or rerun that baseline.
    old = HOSTS / 'transfer-candidate'
    host = HOSTS / 'transfer-plant-aware'
    assert not host.exists(), 'Preserve existing transfer evidence'
    shutil.copytree(HOSTS / 'plant-aware' / 'src', host / 'src')
    shutil.copytree(old / 'scripts', host / 'scripts')
    shared = host / 'out/catch-opportunity-physics'
    shared.mkdir(parents=True)
    for name in ['fresh-inputs.json', 'fresh-reconstruct.ts']:
        shutil.copyfile(old / 'out/catch-opportunity-physics' / name, shared / name)
    prep = json.loads((old / 'preparation.json').read_text())
    prep.update({'arm': 'transfer-plant-aware', 'sourceHost': str(HOSTS / 'plant-aware')})
    (host / 'preparation.json').write_text(json.dumps(prep, indent=2) + '\n')
    run(host, 'vertical-roof-transfer.ts', ['F-QUARTERS-VERTICALS', 'F-COVER2-SMASH'])


if __name__ == '__main__':
    actions = {'extend': extend, 'transfer': transfer, 'repeat-transfer': repeat_transfer}
    assert len(sys.argv) == 2 and sys.argv[1] in actions
    actions[sys.argv[1]]()
