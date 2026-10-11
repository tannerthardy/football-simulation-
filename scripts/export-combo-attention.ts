/** Twelve predeclared saved joined-combination clips; no simulation or outcome filter.
 * node --import tsx scripts/export-combo-attention.ts BEFORE.json.gz AFTER.json.gz OUTPUT.html
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
type Native = Record<string, any>;
const fixed=[['iz_strong','over',3],['duo','odd',11],['power','under',3]]
  .flatMap(([run,front,seed])=>['R','L'].map(side=>`CA-R1-${run}-${front}-${side}-S${seed}`));
const [beforePath,afterPath,output]=process.argv.slice(2);
if(process.argv.length!==5||![beforePath,afterPath].every(p=>p.endsWith('.json.gz'))||!output.endsWith('.html'))
  throw new Error('Usage: export-combo-attention.ts BEFORE.json.gz AFTER.json.gz OUTPUT.html');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const phases=[beforePath,afterPath].map(path=>({path,film:JSON.parse(gunzipSync(readFileSync(path)).toString()) as Native}));
const labels=['Baseline: shared joined attention','Candidate: each joined member reads his own work'];
for(const {film} of phases){
  if(film.schema!=='combo-attention-native-witness-v1'||film.sourceBefore!==film.sourceAfter
    ||!/^[a-f0-9]{64}$/.test(film.sourceBefore)||film.plays.map((p:Native)=>p.id).join('|')!==fixed.join('|'))
    throw new Error('Expected six unchanged-source predeclared ordinary witnesses');
  for(const p of film.plays)if(!p.observerVerified||p.observedSignature!==p.plainSignature||!p.naturalEnd
    ||p.selection!=='fixed-before-outcomes'||p.formation!=='ace_11'||p.players.length!==22
    ||p.result.outcome==='timeout'||p.result.telemetry?.level!=='full'||p.result.frames?.[0]?.t!==0
    ||p.climbs.length!==p.result.events.filter((e:Native)=>e.type==='block_climb').length
    ||!p.ticks.length||Math.abs(p.ticks.at(-1).completedAt-p.result.duration)>1e-8
    ||p.climbs.some((c:Native)=>!c.beforeCombination||!c.eventBoundaryCombination||!c.physicsStepRecorded
      ||!c.decisionImageOrdinalRange||Math.abs(c.completedAt-c.t-.05)>1e-8))
    throw new Error(`Invalid saved attention witness: ${p.id}`);
}
if(phases[0].film.sourceBefore===phases[1].film.sourceBefore
  ||phases[0].film.collectorSha256!==phases[1].film.collectorSha256
  ||hash(phases[0].film.cohort)!==hash(phases[1].film.cohort)
  ||['src/physics/world.ts','src/players/physical.ts','src/sim/engagement.ts'].some(key=>
    !/^[a-f0-9]{64}$/.test(phases[0].film.moduleSha256[key]??'')
    ||phases[0].film.moduleSha256[key]!==phases[1].film.moduleSha256[key]))
  throw new Error('Expected distinct controllers with identical cohort, collector and physical interactions');
for(let i=0;i<6;i++)for(const key of ['id','run','front','flip','seed','formation','selection','offCall','defCall',
  'los','firstDownX','initialSha256','initialProjection','profileSha256','players'])
  if(hash(phases[0].film.plays[i][key])!==hash(phases[1].film.plays[i][key]))throw new Error(`Input mismatch: ${fixed[i]}/${key}`);

function initialCombinations(p:Native):Native[]{
  const combos=new Map<number,Native>();
  for(const s of p.initialProjection.ownership){const c=s.plan?.combination;if(c&&!combos.has(c.id))combos.set(c.id,c);}
  if(!combos.size)throw new Error(`No installed combinations: ${p.id}`);
  return [...combos.values()];
}
function attentionBoundaries(p:Native){
  const rows:Native[]=[];
  for(const tick of p.ticks){
    const pre=tick.prepass;
    if(pre)for(const before of pre.beforeCombinations){
      const after=pre.afterCombinations.find((c:Native)=>c.id===before.id);
      if(!after||!before.genuinelyJoined)continue;
      const pictures=tick.consumedImages.filter((c:Native)=>c.ordinal>=pre.firstImageOrdinal&&c.ordinal<pre.endImageOrdinal
        &&before.members.includes(c.observer));
      if(!pictures.length&&hash(before.personalReads)===hash(after.personalReads)&&before.released===after.released)continue;
      rows.push({t:tick.t,phase:'joined-prepass',initiatingObserver:null,beforeCombination:before,afterCombination:after,consumedImages:pictures});
    }
    for(const command of tick.commands)for(const before of command.beforeCombinations){
      const after=command.afterCombinations.find((c:Native)=>c.id===before.id);
      if(!after||!before.genuinelyJoined||!before.members.includes(command.observer))continue;
      // A historical shared-clock change locates a command boundary. Only
      // its actual pictures establish who saw what; the clock is not a cue.
      if(hash(before.legacySchedule)===hash(after.legacySchedule)
        &&hash(before.personalReads)===hash(after.personalReads)&&before.released===after.released)continue;
      rows.push({t:tick.t,phase:'run-block-command',initiatingObserver:command.observer,
        beforeCombination:before,afterCombination:after,
        consumedImages:tick.consumedImages.filter((c:Native)=>c.ordinal>=command.firstImageOrdinal&&c.ordinal<command.endImageOrdinal)});
    }
  }
  return rows;
}
const comparison=phases.map(({path,film},i)=>({label:labels[i],sourceSha256:film.sourceBefore,
  inputRawSha256:fileHash(path),collectorSha256:film.collectorSha256,cohortSha256:hash(film.cohort),moduleSha256:film.moduleSha256,
  observerChecks:film.plays.map((p:Native)=>({id:p.id,initialSha256:p.initialSha256,profileSha256:p.profileSha256,
    observedSignature:p.observedSignature,plainSignature:p.plainSignature}))}));
const plays=phases.flatMap(({film},game)=>film.plays.map((p:Native,index:number)=>{
  const combos=initialCombinations(p), focus=combos.find(c=>c.members.includes('C'))?.members[1]??combos[0].members[1];
  const log:PlayLog={index,quarter:0,clock:0,offense:'OFF',down:1,distance:10,yardline:p.los-10,score:{home:0,away:0},kind:'run',
    yards:p.result.offenseYards,call:`${labels[game]} · ${p.offCall}`,defense:p.defCall,stats:p.result.stats,outcome:p.result.outcome,
    text:`${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0,12)} · fixed before candidate outcomes · natural ${p.result.outcome} at ${p.result.duration.toFixed(2)}s. Select either joined member to inspect his actual pictures, native read/proposal and the chosen departure. An intended climb does not prove successful movement or a won block. Historical shared attention, own proposals and completed physical loads are separate records.`,
    plan:{personnel:'11',formation:p.formation,qb:'under',concept:RUN_BY_ID[p.run].scheme,playAction:false,audible:false,
      defPersonnel:FRONT_BY_ID[p.front].personnel[0],front:p.front,coverage:'cover3',called:'cover3',family:'cover3',shell:'one-high',pressure:false},
    replay:{los:p.los,firstDownX:p.firstDownX,flip:p.flip,frames:p.result.frames,events:p.result.events,telemetry:p.result.telemetry,
      players:p.players.map((a:Native)=>({team:a.team,slot:a.slot,name:a.name,jersey:a.jersey,pos:a.position,weightLb:a.weightLb})),
      profiles:p.players.map((a:Native)=>({position:a.position,heightIn:a.heightIn,weightLb:a.weightLb,ratings:a.ratings}))}};
  return {...packReplayPlay(log,game),id:`${game?'FINAL':'BEFORE'}-${p.id}`,fixtureId:p.id,sourceLabel:labels[game],sourceSha256:film.sourceBefore,
    fixtureRun:p.run,fixtureSeed:p.seed,fixtureFlip:p.flip,filmSelection:p.selection,initialSha256:p.initialSha256,profileSha256:p.profileSha256,
    physicalSha256:p.observedSignature,recordingVerified:true,naturalResult:{...p.result,frames:undefined,telemetry:undefined},
    eventDetails:p.result.events,recordedPlayers:p.players,initialCombinations:combos,prepassAvailable:p.prepassAvailable,
    personalReadSchemaAvailable:p.personalReadSchemaAvailable,attentionBoundaries:attentionBoundaries(p),
    climbs:p.climbs,backerContacts:p.backerContacts,inspectedLineman:p.players.findIndex((a:Native)=>a.slot===focus)};
}));
const data={meta:{sourceSha256:phases[1].film.sourceBefore,sourceComparison:comparison,telemetryLevel:'full',filmSchema:'combo-attention-comparison-v1',
  predeterminedInputs:fixed,seed:3,
  cohort:'Twelve fixed ordinary clips: Inside Zone / Over R+L S3, Duo / Odd R+L S11, Power / Under R+L S3. Same roster seeds31/32 at strength0.55, Ace11 and Cover3. All twelve recording/observer controls match plain execution. This mechanism panel is not an NFL sample; every predeclared input, including no-climb cases, is retained. Actual pictures identify their observer and native phase. Native readAt records an attention attempt; only consumed pictures prove a visual read. Historical B has no personal-read/prepass state; missing fields are not invented. All combination member bodies/loads, including TE members, are captured. Original post-physics replay frames retain tick-start timestamps; completion-time filtering trails pictured state by one tick and leaves the final +0.05s solve outside the current seek range.',
  final:{home:0,away:0},quarters:[],home:{name:'Controlled Offense',abbr:'OFF',color:'#1d4f91',text:'#fff'},away:{name:'Controlled Defense',abbr:'DEF',color:'#a3302a',text:'#fff'}},
  games:phases.map(({film},i)=>({label:labels[i],seed:3,sourceSha256:film.sourceBefore,final:{home:0,away:0},quarters:[]})),
  plays:compactReplayPlays(plays),catalog:{coverage:{cover3:'Cover 3'},front:Object.fromEntries(FRONTS.map(f=>[f.id,f.name])),formation:{ace_11:'Singleback Ace'}}};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');let template=readFileSync(resolve(root,'viewer/replay.template.html'),'utf8');
const replace=(from:string,to:string)=>{if(!template.includes(from))throw new Error(`Missing viewer marker: ${from.slice(0,60)}`);template=template.replace(from,to);};
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`","key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}",'${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;","$('dd').textContent = 'Controlled joined-attention comparison';");
replace("inspectorStamp = '';\n    prepareTelemetry(p);","$('inspect-player').value=String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>','<section class="inspector"><h2>Joined attention: actual reader, own proposal and keeper</h2><small class="status-note">Read/proposal records are controller state; readAt records an attention attempt, while actual consumed pictures establish a visual read. Loads and achieved movement come from the real following solve. Legacy scheduling is bookkeeping, not a cue. Joint IDs are local to each play/source. Positions yd, impulses kg·yd/s, forces kg·yd/s², work kg·yd²/s². Original post-physics frames retain tick-start stamps; completed native loads trail pictured bodies by one tick. The final +0.05s solve is outside the current seek range.</small><div id="combo-attention" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
replace('if (stamp === inspectorStamp) return;','inspectComboAttention(p,player,t);\n    if (stamp === inspectorStamp) return;');
replace('  function drawLayers(p, frame, positions, X, Y, sc, selected) {',`  function inspectComboAttention(p,player,time){
    const panel=$('combo-attention'),slot=p.roster[player]?.[1];panel.dataset.fixture=p.id;panel.dataset.time=String(time);panel.dataset.slot=slot??'';
    const combo=p.initialCombinations.find(c=>c.members.includes(slot));
    if(!combo){panel.textContent='No installed combination for '+(slot??'this player')+'. Select either joined lineman.';return;}
    const f=n=>typeof n==='number'?n.toFixed(2):'unrecorded',v=a=>a?f(a.x)+', '+f(a.y):'unrecorded';
    const row=p.attentionBoundaries.findLast(r=>r.t<=time+1e-8&&r.beforeCombination.id===combo.id);
    const lines=['Installed double #'+combo.id+': '+combo.members.join(' + ')+' on '+combo.defender+'; second-level work '+(combo.backer??'none')];
    if(!p.prepassAvailable)lines.push('Historical shared attention: this source has no paired prepass/personal-read state.');
    const pictures=(cues,label)=>{
      const own=cues.filter(c=>c.observer===slot);if(!own.length)lines.push('No own consumed picture for '+slot+' in '+label+'.');
      for(const cue of own){const img=cue.image;lines.push('Actual observer '+cue.observer+' saw '+cue.target+' in '+cue.phase+': age '+f(img.age)+'s · depth '+f(img.pos.x-p.los)+' yd · velocity '+v(img.vel)+' yd/s');}
      const others=[...new Set(cues.filter(c=>c.observer!==slot).map(c=>c.observer))];if(others.length)lines.push('Other actual observers in '+label+': '+others.join(', '));
    };
    if(row){const c=row.afterCombination;
      lines.push('Recorded boundary '+row.phase+' at '+f(row.t)+'s'+(row.initiatingObserver?' · command actor '+row.initiatingObserver:' · paired prepass'));
      pictures(row.consumedImages,'this boundary');
      if(c.personalReads)for(const read of c.personalReads){const q=read.proposal;
        lines.push('Native attention attempt '+read.observer+': readAt '+f(read.readAt)+'s · next attention '+f(read.nextRead)+'s · confirmation since '+f(read.secureSince)+'s');
        lines.push(q?'Own proposal '+q.climber+' departs; keeper '+q.keeper+' on '+q.defender+' · hands #'+q.hands.id+' · normalized surfacePhi '+f(q.phi)+' · choice cost '+f(q.cost)+' at '+f(q.t)+'s':'No native proposal recorded for '+read.observer+' in this state.');
      }else lines.push('No native personal-read/proposal state recorded in this boundary.');
    }else lines.push('No retained joined attention boundary reached for this member.');
    const climb=p.climbs.findLast(c=>c.t<=time+1e-8&&c.beforeCombination?.id===combo.id);
    if(climb){const c=climb.eventBoundaryCombination,range=climb.decisionImageOrdinalRange;
      const cues=climb.consumedImages.filter(c=>c.ordinal>=range.first&&c.ordinal<range.end);
      lines.push('Actual departure '+climb.climber+' → '+climb.backer+' at '+f(climb.t)+'s in '+climb.phase,
        climb.initiatingObserver?'Decision inside '+climb.initiatingObserver+' command; departing player '+climb.climber+'.':'Decision resolved from the paired prepass.');
      if(climb.initiatingObserver&&climb.initiatingObserver!==climb.climber)lines.push('Remote departure: '+climb.initiatingObserver+' command releases partner '+climb.climber+'; their observers are separate records.');
      pictures(cues,'actual departure decision');
      const own=c.personalReads?.find(r=>r.observer===climb.climber)?.proposal;
      lines.push(own&&own.climber===climb.climber&&Math.abs(own.t-climb.t)<1e-8?'Chosen departure has '+climb.climber+'’s own current native proposal.':'No personal joined self-proposal record exists for this departure.');
      lines.push('Physical member bodies at decision: '+(climb.physicalBodiesUnchangedAtDecision===true?'unchanged':climb.physicalBodiesUnchangedAtDecision===false?'changed':'unrecorded'));
      const keeper=c.memberState.map(s=>s.engagement).find(e=>e&&e.defender===c.defender&&e.blocker!==climb.climber);
      if(keeper)lines.push('Actual keeper at decision '+keeper.blocker+' on '+keeper.defender+' · hands #'+(keeper.hands?.id??'none')+' · native axis '+v(keeper.axis)+' · control '+f(keeper.control));
      if(climb.physicsStepRecorded&&climb.completedAt<=time+1e-8){
        const n=climb.afterWholeTickCombination;
        for(const state of n.memberState){const load=climb.loads.find(l=>l.slot===state.slot);
          lines.push('Completed native tick '+f(climb.completedAt)+'s: '+state.slot+' '+(state.plan?.kind??'unrecorded')+' → '+(state.plan?.target??'none')+' · achieved center '+v(state.physical.pos)+' yd · velocity '+v(state.physical.vel)+' yd/s · support '+(state.physical.support?.state??'unrecorded'));
          if(load)lines.push(state.slot+' applied velocity intention '+v(load.appliedIntent.vel)+' yd/s · ground impulse '+v(load.groundImpulse)+' · arm impulse '+f(load.armImpulse)+' / '+f(load.armImpulseLimit)+' · arm work '+f(load.armWork)+' / '+f(load.armWorkLimit));
          if(state.slot===keeper?.blocker&&state.engagement?.hands){const j=state.engagement.hands;lines.push('Actual keeper hands after solve #'+j.id+' '+j.a+' ↔ '+j.b+' · '+(j.live?'live':'removed')+' · normal/tangent force '+f(j.state.normalForce)+' / '+f(j.state.tangentForce));}
        }
      }else lines.push('The following native solve has not completed at this visual time.');
      const contact=p.backerContacts.find(c=>c.climbT===climb.t&&c.climber===climb.climber&&c.backer===climb.backer&&c.completedAt<=time+1e-8);
      if(contact)lines.push('Actual loaded backer contact '+contact.climber+' → '+contact.backer+' at '+f(contact.completedAt)+'s: '+contact.hands.length+' loaded hands, '+contact.bodyContacts.length+' positive body impulses. Contact does not establish a won block.');
      else if(!p.backerContacts.some(c=>c.climbT===climb.t&&c.climber===climb.climber&&c.backer===climb.backer))lines.push('Full-play record: no actual loaded backer contact after this climb. The departure label does not establish successful second-level work.');
    }else lines.push('No actual block_climb reached for this combination; a retained read is not a climb.');
    panel.innerHTML=lines.map(line=>'<div>'+esc(line)+'</div>').join('');
  }

  function drawLayers(p, frame, positions, X, Y, sc, selected) {`);
template=template.replaceAll('All games','Both recorded sources');
const marker='/*__REPLAY_DATA__*/null';if(!template.includes(marker))throw new Error('Missing replay data marker');
const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  +template.replace(marker,()=>JSON.stringify(data).replace(/<\//g,'<\\/'))+'\n</body></html>\n';
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,html);
console.log(JSON.stringify({output,clips:plays.length,bytes:Buffer.byteLength(html),sources:comparison.map(c=>c.sourceSha256),fixedInputs:fixed},null,2));
