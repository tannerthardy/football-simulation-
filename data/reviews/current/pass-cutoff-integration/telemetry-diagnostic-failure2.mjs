/** Diagnose the existing failed recorder contract; no assertion/source edits. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {Rng} from '../../../../src/core/rng.ts';
import {CENTER_Y} from '../../../../src/core/field.ts';
import {generateTeam,pickDefense,pickOffense} from '../../../../src/league/team.ts';
import {PASS_BY_ID,RUN_BY_ID} from '../../../../src/playbook/concepts.ts';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../../../src/playbook/defense.ts';
import {FORMATION_BY_ID} from '../../../../src/playbook/formations.ts';
import {PlaySim} from '../../../../src/sim/playsim.ts';
import {CoverageDefender} from '../../../../src/sim/coverage/defender.ts';
import {PassProtector,isOL} from '../../../../src/sim/behaviors/blocking.ts';
import {goTo,stand,track} from '../../../../src/sim/behaviors/common.ts';
import {traits,passSetDepth} from '../../../../src/sim/engagement.ts';
import {clamp,norm,sub} from '../../../../src/core/vec.ts';

const base='8c891f4cf887b54297efbbc4c7993ba5e2f318b5';
const [destination='out/pass-cutoff-review/telemetry-contract']=process.argv.slice(2);
const testSource=readFileSync('test/replay-telemetry.test.ts','utf8');
const parse=(name,source)=>ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
const testAST=parse('replay-telemetry.test.ts',testSource);
const setupCode=testAST.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='setup').getText(testAST);
const compile=(code,bindings)=>new Function(...Object.keys(bindings),
  ts.transpile(code,{target:ts.ScriptTarget.ES2022})+`\nreturn ${code.match(/function\s+(\w+)/)[1]};`)(...Object.values(bindings));
const offense=generateTeam(new Rng(21),'Offense','OFF',{strength:.6});
const defense=generateTeam(new Rng(22),'Defense','DEF',{strength:.6});
const setup=compile(setupCode,{offense,defense,pickOffense,pickDefense,FORMATION_BY_ID,
  PASS_BY_ID,RUN_BY_ID,COVERAGE_BY_ID,FRONT_BY_ID,CENTER_Y});
const source=execFileSync('git',['show',`${base}:src/sim/behaviors/blocking.ts`],{encoding:'utf8'});
const ast=parse('blocking.ts',source);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='PassProtector');
const method=cls.members.find(n=>n.name?.getText(ast)==='update').getText(ast);
const fn=name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast);
const cutOffPoint=compile(fn('cutOffPoint'),{clamp,norm,sub}),runLook=compile(fn('runLook'),{});
const rollback=compile('function '+method,{isOL,passSetDepth,stand,goTo,track,runLook,norm,sub,traits,clamp,cutOffPoint});
const native=PassProtector.prototype.update,rows=[],started=performance.now();
for(const arm of ['accepted','candidate']){
  PassProtector.prototype.update=arm==='accepted'?rollback:native;
  const sim=new PlaySim(setup('pass','full'));
  const readers=new Map(),transitions=[];let count=sim.trace.data.decisions.length;
  // Install-time choices are already recorded by the constructor. Retain
  // their actual coverage instances before any live transition.
  for(const a of sim.agents)if(a.behavior instanceof CoverageDefender)
    for(const h of a.behavior.history)readers.set(`${h.t}:${a.idx}`,a.behavior);
  for(let i=0;i<45&&sim.phase==='live';i++){
    const t=sim.t;
    for(const a of sim.agents)if(a.behavior instanceof CoverageDefender)readers.set(`${t}:${a.idx}`,a.behavior);
    sim.tick();
    for(const d of sim.trace.data.decisions.slice(count)){
      assert(readers.get(`${d.t}:${d.a}`) instanceof CoverageDefender);
      assert(readers.get(`${d.t}:${d.a}`).history.some(h=>h.t===d.t&&h.job===d.chose));
    }
    count=sim.trace.data.decisions.length;
    for(const a of sim.defense){
      const original=readers.get(`${t}:${a.idx}`);
      if(original&&a.behavior!==original)transitions.push({t:sim.t,idx:a.idx,slot:a.slot,
        from:original.kind,to:a.behavior.kind,carrier:sim.carrier?.idx,throwAt:sim.throwAt});
    }
  }
  const before=sim.trace.data.decisions.slice(),first=JSON.stringify(sim.trace.data.frames[0]);
  const checks=before.map(d=>({t:d.t,idx:d.a,job:d.chose,
    currentIsCoverage:sim.agents[d.a].behavior instanceof CoverageDefender,
    currentKind:sim.agents[d.a].behavior.kind,
    historicalReaderExists:readers.has(`${d.t}:${d.a}`),
    historicalChoiceMatches:readers.get(`${d.t}:${d.a}`).history.some(h=>h.t===d.t&&h.job===d.chose),
    unavailableCauseExplicit:d.cue===null&&d.detail.includes('Causal trigger is not exposed')}));
  assert(before.length>0);assert(checks.every(x=>x.historicalChoiceMatches&&x.unavailableCauseExplicit));
  const perception=sim.trace.data.frames.some(f=>f.perception?.length);
  const qbBelief=sim.trace.data.frames.some(f=>f.qb?.belief&&Object.keys(f.qb.belief).length);
  assert(perception&&qbBelief);
  sim.agents[0].body.pos.x+=10;
  sim.agents[0].runFit={gap:'A',side:1,kind:'interior',technique:'control',edge:'box',pace:'stack'};
  if(sim.phase==='live')sim.tick();
  assert.equal(JSON.stringify(sim.trace.data.frames[0]),first);
  rows.push({arm,endTime:sim.t,phase:sim.phase,throwAt:sim.throwAt,decisionCount:checks.length,
    historicalReaderContractPass:true,currentBehaviorAssumptionPass:checks.every(x=>x.currentIsCoverage),
    copiedSourceImmutable:true,perceptionPresent:perception,qbBeliefPresent:qbBelief,transitions,
    invalidCurrentBehaviorReferences:checks.filter(x=>!x.currentIsCoverage),events:sim.events});
}
PassProtector.prototype.update=native;
const result={schema:'pass-cutoff-telemetry-contract-diagnostic-v1',acceptedDevelop:base,
  candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  testSourceSha256:createHash('sha256').update(testSource).digest('hex'),
  question:'Is the failed historical coverage-choice assertion a recorder defect or a current-behavior assumption after a legitimate transition?',
  rows,completedGames:0,shortSegments:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(destination,{recursive:true});writeFileSync(destination+'/receipt.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
