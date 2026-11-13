/** Candidate-only sidecar from the frozen C common tap; never resimulates C. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const output=process.argv[2];
const prepareOnly=process.argv[3]==='--prepare-only';
if((process.argv.length!==3&&!prepareOnly)||process.argv.length>4||!output?.endsWith('.json.gz'))throw new Error('Usage: collect-four.ts OUTPUT.json.gz [--prepare-only]');
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const commonPath='scripts/diag/combo-attention-witness.ts';
const commonSha='46e3be84d1e29f81f4d2be60b94e7ae6759587ceef266a16d0581d1a82149ccb';
let instrument=readFileSync(commonPath,'utf8');
if(sha(instrument)!==commonSha)throw new Error('Frozen common tap changed');
const replace=(old:string,next:string)=>{if(instrument.split(old).length!==2)throw new Error(`Unexpected boundary: ${old.slice(0,90)}`);instrument=instrument.replace(old,next)};
replace("import { sourceVersion } from '../source-version.js';","import { sourceVersion } from '../../scripts/source-version.js';");
replace("const fixed = [{run: 'iz_strong', front: 'over', seed: 3}, {run: 'duo', front: 'odd', seed: 11}, {run: 'power', front: 'under', seed: 3}];",
 "const fixed = [{run:'power',front:'under',seed:3},{run:'split_zone',front:'tite',seed:3}];");
replace("formation: 'ace_11', coverage:","formations: {power:'ace_11',split_zone:'gun_wing_12'}, coverage:");
replace("selection: 'Six ordinary inputs fixed before candidate outcomes: IZ Over R/L seed3, Duo Odd R/L seed11, Power Under R/L seed3. This is a mechanism panel, not an NFL sample.'",
 "selection: 'Four predeclared existing cutoff witnesses: Power Under R/L S3 and inside-shade Split/Tite R/L S3, roster31/32. Candidate-only; promoted C cached data reused separately. Same inputs diagnose mechanics, not NFL rates.'");
replace("const formation = FORMATION_BY_ID.ace_11, personnel = FRONT_BY_ID[c.front].personnel[0];",
 "const formation = FORMATION_BY_ID[c.run==='split_zone'?'gun_wing_12':'ace_11'], personnel = FRONT_BY_ID[c.front].personnel[0];");
replace("pullRole: p.pullRole ?? null, pullPath: p.pullPath?.map(vec) ?? null, combination:",
 "pullRole: p.pullRole ?? null, pullPath: p.pullPath?.map(vec) ?? null, contactFit: p.contactFit ? {target:p.contactFit.target.slot,axis:vec(p.contactFit.axis),sealTarget:p.contactFit.sealTarget} : null, combination:");
replace("const ticks: any[] = [], climbs: any[] = [], backerContacts: any[] = [];",
 `const cutoffBlocker=sim.slot(flip?'RT':'LT')!, installedPlan=plan(cutoffBlocker)!;
  const installedTarget=(cutoffBlocker.behavior as RunBlocker).plan.target!;
  const surfaceInstallation={blocker:cutoffBlocker.slot,defender:installedTarget.slot,bodyContact:cutoffBlocker.profile.radius+installedTarget.profile.radius,
    blockerPos:vec(cutoffBlocker.pos),defenderPos:vec(installedTarget.pos),plan:structuredClone(installedPlan)};
  const ticks: any[] = [], climbs: any[] = [], backerContacts: any[] = [];`);
replace("activeTick = {t: this.t, beforeCombinations:",
 "activeTick = {t:this.t,beforeAllBodiesSha256:hash(this.agents.map(a=>a.body)),beforeAllAssignmentsSha256:hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)}))),beforeCutoff:body(cutoffBlocker),beforeCombinations:");
replace("activeTick.completedAt = this.t;",
 `activeTick.completedAt = this.t;
    activeTick.afterAllBodiesSha256=hash(this.agents.map(a=>a.body));
    activeTick.completedIntentSha256=hash(this.intents);
    activeTick.afterAllAssignmentsSha256=hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)})));
    activeTick.afterCutoff=body(cutoffBlocker);
    activeTick.afterInstalledTarget=body(installedTarget);
    activeTick.cutoffLoads=report?loads([cutoffBlocker.slot,installedTarget.slot],report):[];
    activeTick.workLedger=report?structuredClone(report.work):null;`);
replace("kind: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : null,",
 "kind: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : null, contactFit:plan(a)?.contactFit??null,");
replace("initialProjection, initialSha256: hash(initialProjection)","surfaceInstallation, initialProjection, initialSha256: hash(initialProjection)");
replace("schema: 'combo-attention-native-witness-v1'","schema:'cutoff-installed-surface-native-witness-v1'");
replace("collectorSha256: createHash('sha256').update(readFileSync('scripts/diag/combo-attention-witness.ts')).digest('hex'),",
 `collectorSha256: createHash('sha256').update(readFileSync('out/cutoff-surface/collect-four.ts')).digest('hex'),
  instrumentationSourceSha256:'${commonSha}',generatedInstrumentSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),`);
replace("'src/sim/behaviors/blocking.ts', 'src/sim/engagement.ts', 'src/physics/world.ts', 'src/players/physical.ts', 'src/sim/playsim.ts'",
 "'src/sim/agent.ts','src/sim/behaviors/blocking.ts','src/sim/behaviors/carrier.ts','src/sim/behaviors/defense.ts','src/sim/engagement.ts','src/physics/world.ts','src/players/physical.ts','src/sim/playsim.ts'");
replace("controls: 'Observed versus plain runs compare", "installedSurface: 'surfaceInstallation and initialProjection explicitly record the new target-bound desired contactFit before movement. Cached C has no equivalent field; absent historical state is not reconstructed. It is an intended installation change, while all common initial profiles, bodies, target/kind/drive assignments must match cached C.',\n    controls: 'Observed versus plain runs compare");
mkdirSync('out/cutoff-surface',{recursive:true});
const generatedPath='out/cutoff-surface/four-instrument.ts';
writeFileSync(generatedPath,instrument);
if(prepareOnly) console.log(JSON.stringify({prepared:generatedPath,generatedSha256:sha(instrument),commonSha256:commonSha}));
else {
  const result=spawnSync(process.execPath,['--import','tsx',generatedPath,output],{stdio:'inherit'});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
