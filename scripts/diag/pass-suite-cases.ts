/** Frozen inputs for an explicit major-change checkpoint; no simulations. */
import { createHash } from 'node:crypto';
import { Rng } from '../../src/core/rng.js';
import { FIELD_WIDTH } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS, PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { ROUTES } from '../../src/playbook/routes.js';
import { auditSchematicFormation, STATIC_QUAD_DIAMOND, SCHEMATIC_EDGE_DROP } from '../../src/lab/schematic-stress.js';
import { pressureIsInstallable, coverageHasNamedZonePlayers } from '../../src/playbook/call-integrity.js';
import type { DefensivePlayCall, Formation, PassConcept, RouteDef } from '../../src/playbook/types.js';
import type { PlaySetup } from '../../src/sim/playsim.js';
import { ScoutingReport, type SnapContext } from '../../src/sim/recognition.js';

export const sha = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export interface Scenario {
  id: string; groups: string[]; concept: string; formation: string; look: string;
  roster: string; seed: number; mirror: boolean; context: string; inputSha256: string;
}
export interface Manifest {
  schema: 'pass-game-manifest-v1'; reference: { commit: string; source: string; reason?: string };
  budgets: { simulationSeconds: number; caseMs: number; campaignMs: number };
  rosters: Record<string, { description: string; offense: Record<string, PlaySetup['offense']>; defense: Record<string, PlaySetup['defense']> }>;
  formations: Record<string, Formation>; passes: Record<string, PassConcept>; routes: Record<string, RouteDef>;
  looks: Record<string, DefensivePlayCall>;
  contexts: Record<string, { los: number; ballY: number; down: number; distance: number; hurry?: boolean;
    history?: boolean[]; wind?: { x: number; y: number }; energy?: number; audibles?: boolean }>;
  cases: Scenario[];
  pairs: Array<{ id: string; question: string; a: string; b: string; changed: string[] }>;
  limitations: string[];
}

export const CORE_COVERAGES = ['cover0', 'cover1', 'cover1_off', 'cover1_robber', 'cover2man',
  'cover2', 'cover2_match', 'cover3', 'cover3_match', 'cover4', 'cover4_palms', 'cover6'];
export const TRANSFER: Array<[string, string]> = [
  ['gun_trips_11','four_verts'], ['gun_trips_11','mesh'], ['gun_trips_11','stick'], ['gun_trips_11','flood'],
  ['gun_trey_11','dagger'], ['gun_trey_11','y_cross'], ['gun_bunch_11','mesh'], ['gun_bunch_11','drive'], ['gun_bunch_11','smash'],
  ['gun_empty_11','quick_outs'], ['gun_empty_11','four_verts'], ['gun_empty_11','stick'],
  ['ace_11','comebacks'], ['ace_11','pa_post_dig'], ['pistol_11','y_cross'], ['ace_trips_11','stick'],
  ['gun_spread_10','four_verts'], ['gun_trips_10','mesh'], ['ace_12','pa_post_dig'], ['ace_12','smash'],
  ['gun_wing_12','pa_flood'], ['pistol_12','pa_shot'], ['i_pro_21','pa_shot'], ['i_twins_21','pa_flood'],
  ['offset_i_21','y_cross'], ['i_jumbo_22','smash'], ['heavy_13','pa_post_dig'],
];
const LABS: PassConcept[] = [
  {id:'lab_wheel_switch',name:'Lab wheel/vertical/under',family:'dropback',drop:'gun5',strong:{1:'go',2:'wheel',3:'flat'},weak:{1:'post',2:'shallow'},back:'swing',progression:['S2','S3','W1','B'],beats:[]},
  {id:'lab_snag',name:'Lab snag/corner/flat',family:'quick',drop:'gun3',strong:{1:'short_in',2:'corner',3:'flat'},weak:{1:'hitch',2:'stick'},back:'block',progression:['S1','S2','S3','W2'],beats:[]},
  {id:'lab_back_angle',name:'Lab back angle with shallow',family:'dropback',drop:'gun5',strong:{1:'go',2:'stick'},weak:{1:'go',2:'shallow'},back:'angle',progression:['B','W2','S2','S1'],beats:[]},
  {id:'lab_double_post',name:'Lab double post/seam',family:'dropback',drop:'seven',strong:{1:'post',2:'seam'},weak:{1:'post',2:'deep_out'},back:'block',progression:['S1','W1','W2','S2'],beats:[]},
  {id:'lab_empty_choice',name:'Lab empty stick/hook',family:'quick',drop:'gun3',strong:{1:'quick_out',2:'stick',3:'seam'},weak:{1:'slant',2:'hook'},back:'block',progression:['S2','W2','S3','S1','W1'],beats:[]},
  {id:'lab_back_wheel',name:'Lab back wheel/inside windows',family:'dropback',drop:'gun5',strong:{1:'go',2:'hook'},weak:{1:'go',2:'seam'},back:'wheel',progression:['B','S2','W2','W1'],beats:[]},
];

export function frozenInput(m: Manifest, c: Omit<Scenario, 'inputSha256'> | Scenario) {
  const form = structuredClone(m.formations[c.formation]), look = structuredClone(m.looks[c.look]);
  const ctx = m.contexts[c.context], roster = m.rosters[c.roster];
  if (!form || !look || !ctx || !roster || !m.passes[c.concept]) throw new Error('Unknown frozen input');
  const offense = structuredClone(roster.offense[form.personnel]), defense = structuredClone(roster.defense[look.personnel]);
  const setup: PlaySetup = {offense, defense,
    offCall:{formation:form,flip:c.mirror,kind:'pass',pass:structuredClone(m.passes[c.concept]),label:c.concept},
    defCall:look,los:ctx.los,ballY:c.mirror?FIELD_WIDTH-ctx.ballY:ctx.ballY,
    firstDownX:ctx.los+ctx.distance,down:ctx.down,hurry:ctx.hurry??false,
    wind:ctx.wind?{x:ctx.wind.x,y:ctx.wind.y*(c.mirror?-1:1)}:{x:0,y:0},seed:c.seed,audibles:ctx.audibles??false,record:false};
  const history = [...(ctx.history??[])];
  return {setup,history,energy:ctx.energy??1};
}

export function instantiate(m: Manifest, c: Scenario, record = false): PlaySetup {
  const input = frozenInput(m,c);
  if (sha(input)!==c.inputSha256) throw new Error(`Frozen input drift: ${c.id}`);
  const setup = input.setup;
  if (input.energy!==1) setup.energy = new Map([...Object.values(setup.offense),...Object.values(setup.defense)]
    .map(p=>[p!.id,input.energy]));
  if (input.history.length) {
    const scouting = new ScoutingReport(), f=setup.offCall.formation;
    const context: SnapContext={down:setup.down!,distance:setup.firstDownX-setup.los,yardline:setup.los-10,
      personnel:f.personnel,qb:f.qb,empty:f.tags.includes('empty'),hurry:setup.hurry??false};
    for (const pass of input.history) scouting.observe(context,pass);
    setup.scouting=scouting;
  }
  return {...setup,record,recordEvery:1,recordLevel:'full'};
}

export function buildManifest(reference: Manifest['reference']): Manifest {
  const m: Manifest={schema:'pass-game-manifest-v1',reference,
    budgets:{simulationSeconds:20,caseMs:5000,campaignMs:1800000},rosters:{},
    formations:structuredClone(FORMATION_BY_ID),passes:structuredClone(PASS_BY_ID),routes:structuredClone(ROUTES),looks:{},
    contexts:{neutral:{los:40,ballY:FIELD_WIDTH/2,down:1,distance:10},
      backed_up:{los:12,ballY:FIELD_WIDTH/2,down:1,distance:10},redzone:{los:102,ballY:FIELD_WIDTH/2,down:2,distance:6},
      goal:{los:108,ballY:FIELD_WIDTH/2,down:3,distance:2},third_short:{los:55,ballY:FIELD_WIDTH/2,down:3,distance:2},
      third_long:{los:40,ballY:FIELD_WIDTH/2,down:3,distance:15},fourth_down:{los:65,ballY:FIELD_WIDTH/2,down:4,distance:4},
      hurry:{los:60,ballY:FIELD_WIDTH/2,down:2,distance:8,hurry:true},boundary:{los:40,ballY:4,down:1,distance:10},
      crosswind:{los:40,ballY:FIELD_WIDTH/2,down:1,distance:10,wind:{x:0,y:6}},
      fatigued:{los:40,ballY:FIELD_WIDTH/2,down:1,distance:10,energy:.65},
      run_heavy:{los:40,ballY:FIELD_WIDTH/2,down:1,distance:10,history:[...Array(18).fill(false),...Array(6).fill(true)]},
      pass_alert:{los:40,ballY:FIELD_WIDTH/2,down:3,distance:8,history:[]}},cases:[],pairs:[],
    limitations:[
      'Stress matrix, not NFL frequency-weighted sampling; favorable/unfavorable calls have no required winner.',
      'Static formations only. Live motion, communication acknowledgment, complete screens and installed seam/middle option reads are absent; do not claim them as covered.',
      'Stick/hook exercise the existing conversion model, including its information limitations; this suite does not repair it.',
      'Native PA/plain controls change existing action policy and generic OL/QB/RB sell, not a fully installed named run fake or boot.',
      'Hurry is an available flag, not a modeled two-minute game clock; fresh scouting is reconstructed per case.',
      'Native concepts can lose intended route participants after formation numbering. Record installed roles rather than invent missing routes.',
    ]};
  for (const [id,os,ds,ostr,dstr] of [
    ['ordinaryA',211,212,.6,.6],['ordinaryB',421,422,.6,.6],['offenseEdge',631,632,.72,.45],['defenseEdge',841,842,.45,.72],
  ] as const) {
    const o=generateTeam(new Rng(os),id+' O',id+'O',{strength:ostr}),d=generateTeam(new Rng(ds),id+' D',id+'D',{strength:dstr});
    const personnel=[...new Set(Object.values(m.formations).map(f=>f.personnel))];
    m.rosters[id]={description:`Generated seeds ${os}/${ds}, strengths ${ostr}/${dstr}; no hand-edited ratings`,
      offense:Object.fromEntries(personnel.map(p=>[p,pickOffense(o,p)])),
      defense:Object.fromEntries((['nickel','dime','base43','base34','goalline'] as const).map(p=>[p,pickDefense(d,p)]))};
  }
  for (const coverage of Object.keys(COVERAGE_BY_ID)) m.looks[coverage]={personnel:'nickel',front:FRONT_BY_ID.over,
    coverage:structuredClone(COVERAGE_BY_ID[coverage]),pressure:null,zoneStyle:'match',label:coverage};
  const byInput=new Map<string,Scenario>();
  const add=(group:string,concept:string,look:string,roster='ordinaryA',seed=17001,mirror=false,formation='gun_doubles_11',context='neutral')=>{
    const base={id:'',groups:[group],concept,formation,look,roster,seed,mirror,context};
    const inputSha256=sha(frozenInput(m,base)),existing=byInput.get(inputSha256);
    if(existing){if(!existing.groups.includes(group))existing.groups.push(group);return existing.id;}
    const c={...base,id:'P-'+inputSha256.slice(0,20),inputSha256};m.cases.push(c);byInput.set(inputSha256,c);return c.id;
  };
  const ordinary=['ordinaryA','ordinaryB'];
  for(const p of PASS_CONCEPTS)for(const look of CORE_COVERAGES)for(const roster of ordinary)
    for(const seed of [17001,29003])for(const mirror of [false,true])add('catalog',p.id,look,roster,seed,mirror);
  for(const look of Object.keys(COVERAGE_BY_ID).filter(c=>!CORE_COVERAGES.includes(c)))
    for(const concept of ['four_verts','mesh','smash'])for(const roster of ordinary)for(const mirror of [false,true])
      add('coverage',concept,look,roster,17001,mirror,/poach|stubbie|mable/.test(look)?'gun_trips_11':'gun_doubles_11');
  for(const [formation,concept] of TRANSFER)for(const look of ['cover1','cover2_match','cover3_match','cover4'])
    for(const mirror of [false,true])add('formation',concept,look,'ordinaryA',17001,mirror,formation);
  const pressureCov:Record<string,string>={mike_a:'cover1',will_b:'cover3_match',double_a:'cover0',nickel_edge:'cover1_off',fire_zone:'cover3',zero_6:'cover0'};
  for(const [pressure,cov] of Object.entries(pressureCov)){
    const key='pressure:'+pressure;m.looks[key]={...structuredClone(m.looks[cov]),pressure:structuredClone(PRESSURE_BY_ID[pressure]),label:key};
    for(const concept of ['slant_flat','mesh','four_verts','comebacks'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('pressure',concept,cov,roster,17001,mirror),b=add('pressure',concept,key,roster,17001,mirror);
      m.pairs.push({id:`pressure/${pressure}/${concept}/${roster}/${mirror}`,question:'Does the installed pressure alter protection/release/coverage?',a,b,changed:['pressure package']});
    }
  }
  for(const [front,personnel,base]of [['wide9','nickel','over'],['under','nickel','over'],['tite','base34','odd']]as const){
    for(const f of [front,base]){const key='front:'+f;m.looks[key]={...structuredClone(m.looks.cover3),personnel,front:FRONT_BY_ID[f],label:key};}
    for(const concept of ['slant_flat','dagger','pa_flood'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('front',concept,'front:'+base,roster,17001,mirror),b=add('front',concept,'front:'+front,roster,17001,mirror);
      m.pairs.push({id:`front/${front}/${concept}/${roster}/${mirror}`,question:'What changes with the same personnel and a different rush/front geometry?',a,b,changed:['front']});
    }
  }
  for(const context of ['backed_up','redzone','goal','third_short','third_long','fourth_down','hurry','boundary','crosswind','fatigued'])
    for(const concept of ['slant_flat','four_verts','drive','smash'])for(const look of ['cover1_off','cover2_match','cover4'])for(const mirror of [false,true])
      add('situation',concept,look,'ordinaryA',17001,mirror,'gun_doubles_11',context);
  m.looks.bear0={...structuredClone(m.looks.cover0),personnel:'goalline',front:FRONT_BY_ID.bear,label:'bear0'};
  for(const mirror of [false,true])for(const concept of ['slant_flat','smash','pa_post_dig'])add('situation',concept,'bear0','ordinaryB',17001,mirror,'heavy_13','goal');
  for(const roster of ['offenseEdge','defenseEdge'])for(const concept of ['four_verts','mesh','drive','stick','smash','comebacks'])
    for(const look of ['cover1_off','cover2man','cover3_match','cover4'])for(const seed of [17001,29003])for(const mirror of [false,true])
      add('capability',concept,look,roster,seed,mirror);
  for(const lab of LABS){m.passes[lab.id]=structuredClone(lab);
    for(const look of ['cover1_robber','cover2_match','cover3_match','cover4_palms'])for(const roster of ordinary)for(const mirror of [false,true])
      add('concept-lab',lab.id,look,roster,17001,mirror,lab.id==='lab_empty_choice'?'gun_empty_11':'gun_trips_11');}
  for(const id of ['pa_post_dig','pa_flood','pa_shot']){
    const plain=structuredClone(m.passes[id]);delete plain.fake;plain.family='dropback';plain.id=id+'_plain';plain.name+=' no fake';m.passes[plain.id]=plain;
    for(const look of ['cover1_off','cover3_match','cover4'])for(const context of ['neutral','run_heavy','pass_alert'])
      for(const roster of ordinary)for(const mirror of [false,true]){
        const a=add('playaction',plain.id,look,roster,17001,mirror,'ace_12',context),b=add('playaction',id,look,roster,17001,mirror,'ace_12',context);
        m.pairs.push({id:`action/${id}/${look}/${context}/${roster}/${mirror}`,question:'How does native action change recognition, protection and pass result?',a,b,changed:['native PA versus plain policy; routes/protection/drop preserved']});
      }
  }
  for(const look of ['cover2','cover3','cover4','tampa2']){const key='spot:'+look;m.looks[key]={...structuredClone(m.looks[look]),zoneStyle:'spot',label:key};
    for(const concept of ['curl_flat','levels','flood'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('zone-style',concept,look,roster,17001,mirror),b=add('zone-style',concept,key,roster,17001,mirror);
      m.pairs.push({id:`style/${look}/${concept}/${roster}/${mirror}`,question:'How does the available zone-style input affect actual installed techniques?',a,b,changed:['zone style']});
    }
  }
  for(const personnel of ['base43','dime'] as const)for(const cov of ['cover2man','cover3_match','cover4']){
    const key=personnel+':'+cov;m.looks[key]={...structuredClone(m.looks[cov]),personnel,label:key};
    for(const concept of ['mesh','four_verts','pa_shot'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('personnel',concept,cov,roster,17001,mirror),b=add('personnel',concept,key,roster,17001,mirror);
      m.pairs.push({id:`personnel/${key}/${concept}/${roster}/${mirror}`,question:'Can the same call function with different installed defenders?',a,b,changed:['defensive personnel and their capabilities']});
    }
  }
  m.formations[STATIC_QUAD_DIAMOND.id]=structuredClone(STATIC_QUAD_DIAMOND);
  m.looks.edge_drop={...structuredClone(m.looks.cover4),pressure:structuredClone(SCHEMATIC_EDGE_DROP),label:'edge_drop'};
  for(const concept of ['four_verts','mesh','smash'])for(const roster of ordinary)for(const mirror of [false,true]){
    const a=add('unbalanced-drop',concept,'cover4',roster,17001,mirror,STATIC_QUAD_DIAMOND.id),
      b=add('unbalanced-drop',concept,'edge_drop',roster,17001,mirror,STATIC_QUAD_DIAMOND.id);
    m.pairs.push({id:`drop/${concept}/${roster}/${mirror}`,question:'How does a legal static 4x1 surface stress three-rush/eight-cover versus four-rush?',a,b,changed:['installed edge drop']});
  }
  for(const [actual,shown] of [['cover1_robber','cover2'],['cover3_match','cover4'],['cover2_match','cover3'],['cover4_palms','cover1']]){
    const key=`disguise:${actual}:${shown}`;m.looks[key]={...structuredClone(m.looks[actual]),shown:structuredClone(COVERAGE_BY_ID[shown]),label:key};
    for(const concept of ['slant_flat','four_verts','mesh','smash'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('disguise',concept,actual,roster,17001,mirror),b=add('disguise',concept,key,roster,17001,mirror);
      m.pairs.push({id:`disguise/${key}/${concept}/${roster}/${mirror}`,question:'Does the native shown shell and subsequent rotation alter acquired QB reads and coverage?',a,b,changed:['shown coverage; actual call held']});
    }
  }
  m.contexts.audible_enabled={...m.contexts.neutral,audibles:true};
  for(const concept of ['four_verts','comebacks','pa_shot'])for(const look of ['cover0','cover1_off','cover3_match','cover4'])
    for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('audible',concept,look,roster,17001,mirror),b=add('audible',concept,look,roster,17001,mirror,'gun_doubles_11','audible_enabled');
      m.pairs.push({id:`audible/${concept}/${look}/${roster}/${mirror}`,question:'What changes when the existing QB pre-snap audible policy is permitted?',a,b,changed:['audibles enabled; record effective call']});
    }
  for(const [key,base] of [['stem','cover3_match'],['creep','pressure:mike_a']]){
    const lookKey='presnap:'+key;m.looks[lookKey]={...structuredClone(m.looks[base]),label:lookKey};
    if(key==='stem')m.looks[lookKey].frontStem={from:FRONT_BY_ID.under,secondsBeforeSnap:.8};
    else m.looks[lookKey].creep={slot:'LB_M',secondsBeforeSnap:.6};
    for(const concept of ['slant_flat','mesh','four_verts'])for(const roster of ordinary)for(const mirror of [false,true]){
      const a=add('presnap',concept,base,roster,17001,mirror),b=add('presnap',concept,lookKey,roster,17001,mirror);
      m.pairs.push({id:`presnap/${key}/${concept}/${roster}/${mirror}`,question:'Does installed pre-snap defensive movement preserve achievable post-snap responsibilities?',a,b,changed:[key]});
    }
  }
  return m;
}

export function validateManifest(m: Manifest): void {
  if(m.schema!=='pass-game-manifest-v1'||!m.cases.length||m.cases.length>5000||!m.reference.source||!m.reference.commit)
    throw new Error('Invalid pass manifest');
  if(new Set(m.cases.map(c=>c.id)).size!==m.cases.length||new Set(m.cases.map(c=>c.inputSha256)).size!==m.cases.length)
    throw new Error('Duplicate case/input; use group aliases');
  if(!Number.isFinite(m.budgets.simulationSeconds)||m.budgets.simulationSeconds<=0||m.budgets.simulationSeconds>30
    ||!Number.isFinite(m.budgets.caseMs)||m.budgets.caseMs<=0||!Number.isFinite(m.budgets.campaignMs)||m.budgets.campaignMs<=0)
    throw new Error('Invalid budgets');
  for(const f of Object.values(m.formations))auditSchematicFormation(f);
  for(const c of m.cases){const {setup}=frozenInput(m,c),d=setup.defCall;
    if(sha(frozenInput(m,c))!==c.inputSha256||c.id!=='P-'+c.inputSha256.slice(0,20))throw new Error('Input drift '+c.id);
    if(!d.front.personnel.includes(d.personnel)||!coverageHasNamedZonePlayers(d.personnel,d.coverage)
      ||(d.pressure&&!pressureIsInstallable(d.personnel,d.front,d.coverage,d.pressure)))throw new Error('Uninstallable defense '+c.id);
    for(const players of [setup.offense,setup.defense])if(Object.keys(players).length!==11||new Set(Object.values(players).map(p=>p!.id)).size!==11)
      throw new Error('Incomplete or duplicate lineup '+c.id);
    if(new Set([...Object.values(setup.offense),...Object.values(setup.defense)].map(p=>p!.id)).size!==22)throw new Error('Cross-team duplicate identity');
  }
  const ids=new Set(m.cases.map(c=>c.id));
  for(const pair of m.pairs)if(!ids.has(pair.a)||!ids.has(pair.b)||pair.a===pair.b)throw new Error('Invalid opposing pair');
}
