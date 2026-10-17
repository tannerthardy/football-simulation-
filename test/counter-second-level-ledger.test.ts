import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { RunBlocker, planRunBlocking } from '../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());

describe('Counter immediate and conditional second-level jobs share the count',()=>{
  it.each(['K01','K02','K03'])('gives the wrapper and free climber distinct backers before conditional work: %s',id=>{
    const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id===id).setup) as PlaySetup);
    const bodies=structuredClone(sim.agents.map(a=>a.body)),rng=JSON.stringify(sim.rng);
    const plans=planRunBlocking(sim,sim.offCall.run!);
    const immediate=[...plans].filter(([,p])=>p.kind==='climb'||p.kind==='pull'&&p.pullRole==='lead');
    const targets=immediate.map(([,p])=>p.target);
    expect(immediate.length).toBeGreaterThan(0);
    expect(targets.every(Boolean)).toBe(true);
    expect(new Set(targets).size).toBe(targets.length);
    const wrapper=immediate.find(([,p])=>p.pullRole==='lead')!;
    expect(wrapper[1].target?.slot).toBe('LB_M');
    const combos=new Set([...plans.values()].map(p=>p.combination).filter(Boolean));
    for(const combo of combos)if(combo!.backer)expect(targets).not.toContain(combo!.backer);
    // Installation chooses jobs only. Ordinary bodies, acquisition, movement,
    // hand eligibility, keeper security and release still have to earn them.
    expect(sim.agents.map(a=>a.body)).toEqual(bodies);
    expect(JSON.stringify(sim.rng)).toBe(rng);
    expect(sim.world.joints).toHaveLength(0);
  });
  it('leaves the Under helper in its first-level double when the immediate jobs spend both backers',()=>{
    const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id==='K02').setup) as PlaySetup);
    const helper=sim.slot('LG')!.behavior as RunBlocker;
    expect(helper.plan.combination?.backer).toBeNull();
    expect(helper.plan.combination?.released).toBe(false);
    expect(helper.plan.target?.slot).toBe('DT_W');
    expect((sim.slot('RG')!.behavior as RunBlocker).plan.target?.slot).toBe('DE_W');
    expect((sim.slot('H')!.behavior as RunBlocker).plan.target?.slot).toBe('LB_W');
  });
});
