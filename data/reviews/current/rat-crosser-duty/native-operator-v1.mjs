/** Four bounded native controls, no forced throws, sightings or movement.
 * node --import tsx scripts/diag/rat-crosser-duty.mjs OUTPUT.json.gz
 * Run each source once. Recording only copies cached rules/commands/states. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { Rng } from '../../src/core/rng.ts';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.ts';
import { PASS_BY_ID } from '../../src/playbook/concepts.ts';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.ts';
import { FORMATION_BY_ID } from '../../src/playbook/formations.ts';
import { Agent } from '../../src/sim/agent.ts';
import { CoverageDefender } from '../../src/sim/coverage/defender.ts';
import { PlaySim } from '../../src/sim/playsim.ts';
import { movementObjective } from '../../src/sim/movement-objective.ts';
import { sourceVersion } from '../source-version.ts';

const out = process.argv[2], began = performance.now(), source = sourceVersion();
assert.ok(out && !existsSync(out));
const hash = v => createHash('sha256').update(v).digest('hex');
const copy = v => JSON.parse(JSON.stringify(v, (_k,x) => x instanceof Agent ? {agent:x.idx}
  : x instanceof PlaySim ? {sim:true} : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x));
const profile = JSON.parse(readFileSync('config/baseline.json'));
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),profile.flags);
const fixtures = [
  {id:'rat-mesh',coverage:'cover1_off',concept:'mesh',offense:21,defense:22,seed:15,flip:false},
  {id:'rat-mesh-fresh-mirror',coverage:'cover1_off',concept:'mesh',offense:47,defense:48,seed:9,flip:true},
  {id:'rat-verticals',coverage:'cover1_off',concept:'four_verts',offense:21,defense:22,seed:5,flip:false},
  {id:'ordinary-robber-mesh',coverage:'cover1',concept:'mesh',offense:21,defense:22,seed:15,flip:false},
];
const reports = [];
for (const f of fixtures) {
  const sim = new PlaySim({
    offense:pickOffense(generateTeam(new Rng(f.offense),'O','OFF',{strength:.6}),'11'),
    defense:pickDefense(generateTeam(new Rng(f.defense),'D','DEF',{strength:.6}),'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:f.flip,kind:'pass',pass:PASS_BY_ID[f.concept],label:f.concept},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[f.coverage],pressure:null,zoneStyle:'match',label:f.coverage},
    los:40,ballY:26,firstDownX:50,seed:f.seed,record:true,recordEvery:1,recordLevel:'full',
  });
  const initial = copy(sim.agents.map(a=>({index:a.idx,id:a.player.id,slot:a.slot,body:a.body})));
  const rats = sim.defense.filter(a=>a.behavior instanceof CoverageDefender && a.behavior.rule==='rat');
  const rows=[], pending=[];
  for (const a of rats) {
    const b=a.behavior, update=b.update.bind(b);
    b.update=(actor,s)=>{
      const before=copy(actor.body), cmd=update(actor,s);
      pending.push({t:s.t,actor:a.idx,before,job:b.job,rule:copy(b.recordedRule(s.t)),
        man:copy(b.recordedMan()??null),command:copy(cmd),goal:copy(movementObjective(cmd)??null)});
      return cmd;
    };
  }
  sim.event('snap',sim.slot('C')??sim.qb);
  while (sim.phase==='live' && sim.t<5-1e-9) {
    assert.ok(performance.now()-began<25000,'25-second batch budget');
    sim.tick();
    for (const p of pending.splice(0)) rows.push({...p,after:copy(sim.agents[p.actor].body),
      applied:copy(sim.intents[p.actor]),goalAfterModifiers:copy(movementObjective(sim.intents[p.actor])??null)});
    assert.ok(sim.agents.every(a=>[a.pos.x,a.pos.y,a.vel.x,a.vel.y].every(Number.isFinite)));
  }
  const result=sim.buildResult();
  reports.push({fixture:f,initialSha256:hash(JSON.stringify(initial)),actors:initial.map(({body,...a})=>a),
    end:sim.t,censored:sim.phase==='live',outcome:sim.outcome,stats:copy(sim.stats),
    catchAt:sim.catchAt,throwAt:sim.throwAt,rows,
    frames:copy(result.frames),states:copy(result.telemetry.frames),events:copy(sim.events),
    decisions:copy(result.telemetry.decisions),
    endpointSha256:hash(JSON.stringify(copy({bodies:sim.agents.map(a=>a.body),rng:sim.rng,stats:sim.stats,events:sim.events}))) });
}
assert.equal(sourceVersion(),source);
const packet={schema:'rat-crosser-duty-v1',sourceSha256:source,checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  operatorSha256:hash(readFileSync(import.meta.filename)),lockSha256:hash(readFileSync('package-lock.json')),
  flags:profile.flags,worldDefaults:profile.worldDefaults,node:process.version,platform:process.platform,arch:process.arch,
  maxSeconds:5,nativeExecutions:fixtures.length,seconds:(performance.now()-began)/1000,reports};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(packet)));
console.log(JSON.stringify({out,source,seconds:packet.seconds,cases:reports.map(r=>({id:r.fixture.id,initial:r.initialSha256,
  end:r.end,censored:r.censored,outcome:r.outcome,catchAt:r.catchAt,throwAt:r.throwAt,
  jobs:[...new Set(r.rows.map(s=>s.job))],under: r.rows.find(s=>s.rule.reads.some(rd=>rd.release==='under'))?.t??null}))}));
