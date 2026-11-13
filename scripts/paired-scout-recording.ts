/** Bounded ordinary-game capture paired with existing read-only scouts. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {serialize} from 'node:v8';
import {Rng} from '../src/core/rng.js';
import {Game,type PlaySetupContext} from '../src/game/game.js';
import {generateTeam} from '../src/league/team.js';
import {composeHooks} from './scorecard/hooks.js';
import {weirdObserver,uninstallPreSnapCapture} from './scorecard/weird/observe.js';
import {captureSetup,copySaved,executionIdentity,initialState,type SavedPlay,bytesHash} from './diag/saved-play.js';
import {originalFilm} from './diag/capture-game-play.js';
import type {PlayResult} from '../src/sim/types.js';

const out=process.argv[2]??'out/paired-scout';
const limit=Number(process.argv[3]??24);
if(!Number.isInteger(limit)||limit<1||limit>40)throw Error('prefix limit must be 1–40 steps');
const identity=executionIdentity();
type Capture={setup:Buffer;context:PlaySetupContext;initial?:ReturnType<typeof initialState>;result?:PlayResult};
function prefix(observe:boolean){
 const rng=new Rng(7),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
 const captures:Capture[]=[];let pending:Capture|undefined;
 const scout=observe?weirdObserver({idPrefix:'',game:1,cap:Infinity}):undefined;
 const hooks=observe?composeHooks({playSetup(setup,context){pending=context.kind==='scrimmage'?{setup:captureSetup(setup),context:copySaved(context)}:undefined;if(pending)captures.push(pending);},playResult(sim){const c=pending;if(!c)return undefined;c.initial=initialState(sim);const run=sim.run.bind(sim);sim.run=()=>{const result=run();c.result=copySaved(result);return result;};return undefined;}},scout!.hooks):undefined;
 const game=new Game(home,away,{seed:7,record:true,recordLevel:'full',hooks});game.kickoffToStart();
 for(let i=0;i<limit&&!game.state.over;i++)game.step();
 const result=game.result();const events=scout?.finish(result);
 uninstallPreSnapCapture();return {result,captures,events};
}
const plain=prefix(false),observed=prefix(true);
if(JSON.stringify(plain.result)!==JSON.stringify(observed.result))throw Error('Observer changed native game prefix');
mkdirSync(out,{recursive:true});
const events=observed.events!.events;
writeFileSync(`${out}/events.json`,JSON.stringify({identity,seed:7,prefixSteps:limit,gameComplete:false,logEntries:observed.result.log.length,events,counts:observed.events!.sums},null,2));
const chosen=new Set<number>();const selected:typeof events=[];
for(const detector of ['turned','stuck','backpedal','slide','presnap'])for(const e of events.filter(e=>e.detector===detector&&!e.nullified).slice(0,2)){selected.push(e);chosen.add(e.play);}
for(const c of observed.captures.slice(0,2))chosen.add(c.context.index+1);
const entries=[];
for(const c of observed.captures){
 const film=observed.result.log.find(p=>p.index===c.context.index);
 if(!film?.replay||!c.initial||!c.result||!chosen.has(film.index+1))continue;
 const id=`G1-P${String(film.index+1).padStart(3,'0')}`;
 const saved:SavedPlay={format:'constructor-play-v1',identity,game:{seed:7,steps:limit,complete:false,playId:id},context:c.context,setup:c.setup,setupSha256:bytesHash(c.setup),original:{initial:c.initial,result:c.result,replay:copySaved(film.replay)},film:copySaved(film)};
 mkdirSync(`${out}/${id}`,{recursive:true});writeFileSync(`${out}/${id}/play.bin`,serialize(saved));writeFileSync(`${out}/${id}/original.html`,originalFilm(saved));
 entries.push({id,setupSha256:saved.setupSha256,events:selected.filter(e=>e.play===film.index+1),actors:saved.original.initial.actors});
}
writeFileSync(`${out}/index.json`,JSON.stringify({identity,observerEquality:'complete GameResult JSON exact',prefixSteps:limit,gameCompleted:false,entries},null,2));
console.log(JSON.stringify({episodes:selected.length,types:[...new Set(selected.map(e=>e.detector))],plays:entries.length,observerEquality:true}));
