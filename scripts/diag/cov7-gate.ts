/** Bounded COV-7 activation gate, not a candidate policy or a safety certificate.
 * Uses native calls and one corner's existing PASS_FIRST=0 diagnostic path.
 * Never supplies observations, beliefs, poses, routes, throws or outcomes.
 */
import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync } from 'node:fs';
import { nativeTraceSetup } from './command-trace.js';
import { bytesHash, captureSetup, copySaved, executionIdentity, restoreSetup } from './saved-play.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { ManCoverage } from '../../src/sim/behaviors/defense.js';
import type { Agent } from '../../src/sim/agent.js';

const out = process.argv[2] ?? 'out/cov7-gate';
assert.equal(process.version, 'v22.23.3');
assert.notEqual(process.env.PASS_FIRST, '0', 'Start with accepted PASS_FIRST default');
mkdirSync(out, { recursive: true });
const identity = executionIdentity();
const actor = (a: Agent) => ({ playerId:a.player.id, team:a.team, slot:a.slot, index:a.idx });
// Declared before outcome inspection. No seed/case expansion after failures.
const recipes = ['cover0','cover1_off'].flatMap(coverage =>
  ['toss','pa_shot','slant_flat'].map(concept =>
    ({coverage,concept,seed:1,roster:7,formation:'ace_11',flip:false})));
const summary = [];
for (const recipe of recipes) {
  const bytes = captureSetup({...nativeTraceSetup(recipe),record:true,recordLevel:'full'});
  function run(observe: boolean, support: boolean) {
    const sim = new PlaySim(restoreSetup(bytes));
    const a = sim.slot('CB_S')!;
    assert(a.behavior instanceof ManCoverage);
    const man = a.behavior, primary = man.target;
    const installed = {actor:actor(a),primary:actor(primary),fit:copySaved(a.runFit),
      spot:copySaved(sim.offAlign.spots[primary.slot])};
    const rows: any[] = [];
    const trace = observe ? sim.recordCommands({actor:{team:'D',slot:'CB_S'},from:0,to:20}) : undefined;
    if (observe || support) {
      let row: any;
      const see = sim.see.bind(sim);
      if(observe) sim.see = (observer,target,scale) => {
        const cue = see(observer,target,scale);
        if (row && observer === a) row.observations.push({target:actor(target),scale,cue:copySaved(cue)});
        return cue;
      };
      // Runtime wrappers name the branch actually entered, not another query.
      const methods = man as any;
      for (const name of observe ? ['blockingSupport','trackReceiver'] : []) {
        const method = methods[name].bind(man);
        methods[name] = (...args: any[]) => {if(row)row.branch=name;return method(...args);};
      }
      const update = man.update.bind(man);
      man.update = (self,world) => {
        if(observe) row = {t:world.t,read:self.recog?.read,branch:'other',observations:[],
          body:copySaved(self.body),primaryPosition:{...primary.pos}};
        const previous = process.env.PASS_FIRST;
        try {
          // Diagnostic access to the existing path, only during this actor's
          // update. Force/cutback and all other actors keep their own policy.
          if(support && a.runFit?.kind === 'alley') process.env.PASS_FIRST='0';
          const command=update(self,world);
          if(row){row.command=copySaved(command);rows.push(row);}return command;
        } finally {
          if(previous===undefined)delete process.env.PASS_FIRST;else process.env.PASS_FIRST=previous;
          row=undefined;
        }
      };
    }
    const result=sim.run();
    const execution=copySaved({result,rng:sim.rng,actors:sim.agents.map(p=>({actor:actor(p),body:p.body,mind:p.mind}))});
    return {installed,rows,steps:trace?.steps,execution};
  }
  const plain=run(false,false), baseline=run(true,false), alternative=run(true,true), plainAlternative=run(false,true);
  assert.deepEqual(baseline.execution,plain.execution,'observer changed complete result, bodies, minds or RNG');
  assert.deepEqual(alternative.execution,plainAlternative.execution,'observer changed alternative execution');
  const supportRows=alternative.rows.filter(r=>r.branch==='blockingSupport');
  if(supportRows.length===0)assert.deepEqual(alternative.execution,baseline.execution,'inactive arm changed execution');
  if(supportRows.length){
    const first=supportRows[0], retained=baseline.rows.find(r=>r.t===first.t);
    assert(retained,'missing paired decision');
    assert.deepEqual(first.body,retained.body,'support arms diverged before activation');
    assert.equal(first.read,retained.read);
    assert.deepEqual(first.observations.slice(0,2),retained.observations.slice(0,2),
      'primary/QB entry cues differ before activation');
  }
  const firstDifference=alternative.rows.find((r,i)=>JSON.stringify(r.command)!==JSON.stringify(baseline.rows[i]?.command));
  const item={recipe,setupSha256:bytesHash(bytes),installed:baseline.installed,
    observerEquality:true,supportEntries:supportRows.length,firstSupport:supportRows[0]?.t??null,
    firstRequestDifference:firstDifference?.t??null,
    firstSupportEvidence:supportRows[0]??null,
    result:{baseline:{outcome:baseline.execution.result.outcome,yards:baseline.execution.result.yards},
      alternative:{outcome:alternative.execution.result.outcome,yards:alternative.execution.result.yards}},
    activeCostCertified:false};
  const key=`${recipe.coverage}-${recipe.concept}`;
  writeFileSync(`${out}/${key}.setup.bin`,bytes);
  writeFileSync(`${out}/${key}.json`,JSON.stringify({identity,...item,baseline,alternative},null,2)+'\n');
  const {firstSupportEvidence,...compact}=item;summary.push(compact);
}
writeFileSync(`${out}/summary.json`,JSON.stringify({identity,summary},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
