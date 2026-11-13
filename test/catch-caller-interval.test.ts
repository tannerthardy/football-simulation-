import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { Vec2, Vec3 } from '../src/core/vec.js';
import * as geometry from '../src/physics/catch-opportunity.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Player } from '../src/players/types.js';
import { resolveCatchOpportunities, TRACKING_REACH_BONUS } from '../src/sim/catching.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

type Case = {id:string;slot:'NB'|'H';player:Player;energy:number;t:number;retry:number;releaseT:number;
  tracking:boolean;deflected:boolean;body0:Vec2;body1:Vec2;ball0:Vec3;ball1:Vec3;ballVel:Vec3;
  envelope:geometry.CatchEnvelope};
const saved = JSON.parse(readFileSync(new URL('./fixtures/catch-caller-inputs.json',import.meta.url),'utf8')) as {cases:Case[]};
afterEach(()=>vi.restoreAllMocks());

/** Exact saved player/envelope and endpoint caller contract, not a restored
 * World checkpoint. Opposing decision geometries below are explicitly staged. */
function scene(id='G1-P020') {
  const f=saved.cases.find(c=>c.id===id)!;
  const offense=pickOffense(generateTeam(new Rng(7),'O','OFF'),'11');
  const defense=pickDefense(generateTeam(new Rng(19),'D','DEF'),'nickel');
  if(f.slot==='H')offense.H=structuredClone(f.player);else defense.NB=structuredClone(f.player);
  const sim=new PlaySim({offense,defense,
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:''},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:''},
    los:40,ballY:26,firstDownX:50,seed:1,energy:new Map([[f.player.id,f.energy]])});
  for(const other of sim.agents){other.body.pos={x:10+other.idx*2,y:2};other.body.vel={x:0,y:0};}
  const a=sim.slot(f.slot)!;a.body.pos={...f.body1};a.noCatchUntil=f.retry;a.tags.add('looking');
  if(f.tracking)a.tags.add('onBall');
  sim.ball={kind:'air',flight:{pos:{...f.ball1},vel:{...f.ballVel},drag:0},thrower:sim.qb,
    target:a.team==='O'?a:null,releaseT:f.releaseT,releaseX:40,intended:{...f.ball1},arrivalT:f.t,
    deflected:f.deflected,throwaway:false};sim.t=f.t;
  const starts=sim.agents.map(other=>({...other.pos}));starts[a.idx]={...f.body0};
  return{sim,a,f,starts,resolve:()=>resolveCatchOpportunities(sim,f.ball0,f.ball1,starts)};
}

describe('live same-interval catch caller',()=>{
  it('rejects the saved P020 invalid interception without a draw, retry or flight change',()=>{
    const {sim,a,f,resolve}=scene(),rng=JSON.stringify(sim.rng);
    if(sim.ball.kind!=='air')throw Error('Expected staged flight');
    const before={...sim.ball,flight:structuredClone(sim.ball.flight)};
    expect(a.profile.reach+TRACKING_REACH_BONUS).toBe(f.envelope.reach);
    expect(a.profile.reactReach+.5*(a.profile.maxCatchHeight-a.profile.reactReach)).toBe(f.envelope.top);
    const chance=vi.spyOn(sim.rng,'chance').mockReturnValue(true);resolve();
    expect(chance).not.toHaveBeenCalled();expect(sim.ball).toEqual(before);
    expect(a.noCatchUntil).toBe(f.retry);expect(sim.events).toEqual([]);
    expect(sim.stats.interceptedBy).toBeUndefined();expect(JSON.stringify(sim.rng)).toBe(rng);
  });

  it.each(['G2-P107','G2-P143'])('preserves the saved reachable caller/control %s',id=>{
    const {sim,a,f,resolve}=scene(id),query=vi.spyOn(geometry,'closestCatchOpportunity');
    const chance=vi.spyOn(sim.rng,'chance').mockReturnValue(true);resolve();
    expect(query.mock.results.some(r=>r.value?.s===1)).toBe(true);
    expect(chance).toHaveBeenCalledTimes(1);
    expect(sim.carrier).toBe(a);
    expect(id==='G2-P143'?sim.stats.receiver:sim.stats.interceptedBy).toBe(f.player.id);
  });

  it('can acquire a simultaneous moving encounter missed by freezing the final body',()=>{
    const {sim,a,starts}=scene();const reach=a.profile.reach+TRACKING_REACH_BONUS;
    const prev={x:50,y:26,z:1},cur={x:51,y:26,z:1};
    starts[a.idx]={x:50.2,y:26+reach-.10};a.body.pos={x:50.2,y:26+reach+.10};
    expect(Math.abs(a.pos.y-prev.y)).toBeGreaterThan(reach);
    vi.spyOn(sim.rng,'chance').mockReturnValue(true);
    resolveCatchOpportunities(sim,prev,cur,starts);expect(sim.carrier).toBe(a);
  });

  it('does not silently substitute a final position for a missing supplied endpoint',()=>{
    const {sim,f}=scene();const chance=vi.spyOn(sim.rng,'chance');
    resolveCatchOpportunities(sim,f.ball0,f.ball1,[]);
    expect(chance).not.toHaveBeenCalled();expect(sim.ball.kind).toBe('air');
  });

  it('treats an omitted interval as an explicit static query, with no stale tick history',()=>{
    const {sim,a,f,resolve}=scene();resolve();
    vi.spyOn(sim.rng,'chance').mockReturnValue(true);
    resolveCatchOpportunities(sim,f.ball0,f.ball1);expect(sim.carrier).toBe(a);
  });

  it.each([false,true])('passes actual same-step endpoints through tick, new release=%s',newRelease=>{
    const {sim,a}=scene();
    for(const other of sim.agents){other.behavior={kind:'hold',update:()=>({vel:{x:0,y:0}})};other.snapReadyAt=0;}
    a.body.vel={x:2,y:1};a.noCatchUntil=-1;
    const flight={pos:{x:90,y:40,z:2},vel:{x:5,y:0,z:0},drag:0};
    if(sim.ball.kind!=='air')throw Error('Expected staged flight');sim.ball.flight=flight;
    if(newRelease){
      sim.ball={kind:'held',carrier:sim.qb};
      let thrown=false;
      sim.qb.behavior={kind:'throw',update:()=>{
        if(!thrown){
          thrown=true;sim.throwBall(sim.qb,null,{x:5,y:0,z:0},{x:95,y:40,z:2},1);
          if(sim.ball.kind==='air')sim.ball.flight=structuredClone(flight);
        }
        return{vel:{x:0,y:0}};
      }};
    }
    const query=vi.spyOn(geometry,'closestCatchOpportunity');
    const step=sim.world.step.bind(sim.world);let entry:Vec2={...a.pos},attained:Vec2={...a.pos};
    vi.spyOn(sim.world,'step').mockImplementation((intents,dt)=>{
      entry={...a.pos};const report=step(intents,dt);attained={...a.pos};return report;
    });
    // A fresh throw retains the existing 0.1s catch exclusion. Two early ticks
    // still move, then a later opportunity must use its own interval.
    let queried=0;
    for(let n=0;n<(newRelease?4:2);n++){
      query.mockClear();sim.tick();
      if(query.mock.calls.length){
        queried++;
        const call=query.mock.calls.find(([,end])=>end===a.pos)!;
        expect(call).toBeDefined();expect(call[0]).toEqual(entry);expect(call[1]).toEqual(attained);
        expect(call[0]).not.toBe(a.pos);expect(entry).not.toEqual(attained);
      }
    }
    expect(queried).toBeGreaterThan(0);
    if(!newRelease){
      query.mockClear();const p={x:90,y:40,z:2};resolveCatchOpportunities(sim,p,p);
      const call=query.mock.calls.find(([,end])=>end===a.pos)!;expect(call[0]).toBe(a.pos);
    }
  });

  it('preserves a tracking receiver’s full leap above ordinary reactive reach',()=>{
    const {sim,a}=scene('G2-P143');const z=(a.profile.reactReach+a.profile.maxCatchHeight)/2;
    expect(z).toBeGreaterThan(a.profile.reactReach);expect(z).toBeLessThan(a.profile.maxCatchHeight);
    const ball={...a.pos,z};vi.spyOn(sim.rng,'chance').mockReturnValue(true);
    resolveCatchOpportunities(sim,ball,ball);expect(sim.carrier).toBe(a);
  });

  it('preserves a genuine defensive PBU and its changed flight',()=>{
    const {sim,a,f,resolve}=scene('G2-P107');if(sim.ball.kind!=='air')throw Error('Expected air');
    sim.ball.deflected=false;const velocity={...sim.ball.flight.vel};vi.spyOn(sim.rng,'next').mockReturnValue(.3);
    resolve();expect(sim.ball.kind).toBe('air');
    if(sim.ball.kind!=='air')throw Error('Expected tipped flight');
    expect(sim.stats.passDefendedBy).toBe(a.player.id);expect(sim.ball.deflected).toBe(true);
    expect(sim.events.some(e=>e.type==='pbu')).toBe(true);expect(sim.ball.flight.vel).not.toEqual(velocity);
    // The breaker may replay the tip after a beat; with TIP_AWAY his breakup
    // sent it away from his own hands for the rest of this flight.
    expect(a.noCatchUntil).toBe(f.t+(process.env.TIP_AWAY!=='0'?10:.25));
  });

  it('keeps a failed ordinary defensive opportunity an untouched flight',()=>{
    const {sim,f,resolve}=scene('G2-P107');if(sim.ball.kind!=='air')throw Error('Expected air');
    sim.ball.deflected=false;const flight=structuredClone(sim.ball.flight);vi.spyOn(sim.rng,'next').mockReturnValue(.999);
    resolve();expect(sim.events).toEqual([]);expect(sim.ball.kind).toBe('air');
    if(sim.ball.kind==='air'){expect(sim.ball.deflected).toBe(false);expect(sim.ball.flight).toEqual(flight);}
    expect(sim.stats.interceptedBy).toBeUndefined();expect(sim.slot(f.slot)!.noCatchUntil).toBe(f.retry);
  });

  it('retains a failed tipped-ball retry deadline and respects it on repeated queries',()=>{
    const {sim,a,f,resolve}=scene('G2-P107');const chance=vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    resolve();expect(a.noCatchUntil).toBe(f.t+1);expect(chance).toHaveBeenCalledTimes(1);
    resolve();expect(chance).toHaveBeenCalledTimes(1);expect(sim.ball.kind).toBe('air');
  });

  it('resolves available defenders in increasing closest-opportunity fraction',()=>{
    const {sim,a,starts}=scene();const other=sim.slot('DE_W')!;
    a.body.pos={x:50.8,y:26};other.body.pos={x:53.2,y:26};other.tags.add('looking');
    starts[a.idx]={...a.pos};starts[other.idx]={...other.pos};vi.spyOn(sim.rng,'chance').mockReturnValue(true);
    resolveCatchOpportunities(sim,{x:50,y:26,z:1},{x:54,y:26,z:1},starts);
    // DE_W precedes NB in the agent array, but its closest fraction is later.
    expect(other.idx).toBeLessThan(a.idx);expect(sim.carrier).toBe(a);
  });
});
