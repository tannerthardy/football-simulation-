/** Four explicitly POST-HOC adverse mechanisms, using the pinned six-play tap.
 * node --import tsx scripts/diag/combo-attention-adverse-witness.ts OUTPUT.json.gz
 * Only fixture setup, provenance and read-only physical trace hashes differ.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = process.argv[2];
if (process.argv.length !== 3 || !output?.endsWith('.json.gz')) throw new Error('Usage: combo-attention-adverse-witness.ts OUTPUT.json.gz');
const commonPath = 'scripts/diag/combo-attention-witness.ts';
const commonSha256 = '46e3be84d1e29f81f4d2be60b94e7ae6759587ceef266a16d0581d1a82149ccb';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
let instrument = readFileSync(commonPath, 'utf8');
if (sha(instrument) !== commonSha256) throw new Error('Frozen common witness tap changed');
function replaceExactlyOnce(old: string, replacement: string) {
  if (instrument.split(old).length !== 2) throw new Error(`Pinned instrument boundary changed: ${old.slice(0, 90)}`);
  instrument = instrument.replace(old, replacement);
}
replaceExactlyOnce("import { sourceVersion } from '../source-version.js';", "import { sourceVersion } from '../../scripts/source-version.js';");
replaceExactlyOnce("const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', {strength: .55});\nconst defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', {strength: .55});\nconst fixed = [{run: 'iz_strong', front: 'over', seed: 3}, {run: 'duo', front: 'odd', seed: 11}, {run: 'power', front: 'under', seed: 3}];",
  `const rosterSeeds = [[31,32],[41,42]];
const rosterPairs = rosterSeeds.map(([o,d],i) => ({offense:generateTeam(new Rng(o),'Panel offense '+(i+1),'O'+(i+1),{strength:.55}),
  defense:generateTeam(new Rng(d),'Panel defense '+(i+1),'D'+(i+1),{strength:.55})}));
const {offense,defense}=rosterPairs[0];
const fixed = [{run:'oz_strong',front:'odd',seed:3,flip:true,roster:0},
  {run:'power',front:'under',seed:11,flip:true,roster:0},
  {run:'split_zone',front:'bear',seed:11,flip:false,roster:0},
  {run:'oz_strong',front:'over',seed:11,flip:true,roster:1}];`);
replaceExactlyOnce("rosterSeeds: [31, 32], rosterSha256: hash({offense, defense})", "rosterSeeds, rosterSha256: hash(rosterPairs)");
replaceExactlyOnce("fixtures: fixed.flatMap(c => [false, true].map(flip => ({...c, flip})))", "fixtures: fixed");
replaceExactlyOnce("selection: 'Six ordinary inputs fixed before candidate outcomes: IZ Over R/L seed3, Duo Odd R/L seed11, Power Under R/L seed3. This is a mechanism panel, not an NFL sample.'",
  "selection: 'POST-HOC adverse cases selected after C162 completed: ordinary OZ Odd L S3, Power Under L S11, Split Bear R S11, supplemental roster41/42 OZ Over L S11. These are causal inspection cases and are excluded from the fixed-six and balanced160 populations.'");
replaceExactlyOnce("function collect(input: PlaySetup, run: string, front: string, flip: boolean, seed: number)", "function collect(input: PlaySetup, run: string, front: string, flip: boolean, seed: number, roster: number)");
replaceExactlyOnce('`CA-R1-${run}-${front}-${flip ? \'L\' : \'R\'}-S${seed}`', '`CAP-R${roster+1}-${run}-${front}-${flip ? \'L\' : \'R\'}-S${seed}`');
replaceExactlyOnce("const plays = fixed.flatMap(c => [false, true].map(flip => {\n  const formation = FORMATION_BY_ID.ace_11, personnel = FRONT_BY_ID[c.front].personnel[0];",
  "const plays = fixed.map(c => {\n  const flip = c.flip, {offense,defense}=rosterPairs[c.roster];\n  const formation = FORMATION_BY_ID[c.run==='split_zone'?'gun_wing_12':'ace_11'], personnel = FRONT_BY_ID[c.front].personnel[0];");
replaceExactlyOnce("}, c.run, c.front, flip, c.seed);\n}));", "}, c.run, c.front, flip, c.seed, c.roster);\n});");
replaceExactlyOnce("selection: 'fixed-before-outcomes'", "selection: 'post-hoc-adverse-case'");
replaceExactlyOnce("schema: 'combo-attention-native-witness-v1'", "schema: 'combo-attention-posthoc-adverse-witness-v1'");
replaceExactlyOnce("readFileSync('scripts/diag/combo-attention-witness.ts')", "readFileSync('scripts/diag/combo-attention-adverse-witness.ts')");
replaceExactlyOnce("moduleSha256: Object.fromEntries", `instrumentationSourceSha256: '${commonSha256}',
  generatedInstrumentSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  moduleSha256: Object.fromEntries`);
replaceExactlyOnce("activeTick = {t: this.t, beforeCombinations:", "activeTick = {t: this.t, beforeAllBodiesSha256: hash(this.agents.map(a=>a.body)), beforeAllAssignmentsSha256: hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)}))), beforeCombinations:");
replaceExactlyOnce("activeTick.completedAt = this.t;", "activeTick.completedAt = this.t;\n    activeTick.afterAllBodiesSha256 = hash(this.agents.map(a=>a.body));\n    activeTick.completedIntentSha256 = hash(this.intents);\n    activeTick.afterAllAssignmentsSha256 = hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)})));");
const generatedPath = 'out/combo-attention/posthoc-adverse-instrument.ts';
mkdirSync(dirname(generatedPath), {recursive: true}); writeFileSync(generatedPath, instrument);
const result = spawnSync(process.execPath, ['--import', 'tsx', generatedPath, output], {stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
