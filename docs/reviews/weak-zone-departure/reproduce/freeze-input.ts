import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeSim,rosters} from '../../scripts/diag/box-defense-review/inputs.js';
import {PlaySim} from '../../src/sim/playsim.js';
const sim=makeSim({concept:'wz',dir:'weak',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},rosters());
const setup={offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
 offCall:sim.offCall,defCall:sim.defCall,los:40,ballY:26.67,firstDownX:50,down:1,seed:77,audibles:false,hurry:false};
const frozen=new PlaySim(structuredClone(setup));
const initial=frozen.agents.map(a=>({slot:a.slot,body:a.body,profile:a.profile}));
const saved=JSON.parse(gunzipSync(readFileSync('out/weak-departure/baseline.json.gz')).toString()).rows[0].initial;
if(JSON.stringify(initial)!==JSON.stringify(saved))throw Error('frozen setup initial bodies/profiles do not match saved native');
mkdirSync('data/reviews/current/weak-zone-departure',{recursive:true});
const bytes=gzipSync(JSON.stringify({setup,initialSha256:createHash('sha256').update(JSON.stringify(initial)).digest('hex'),
 note:'zero-tick export; all22 initial bodies/profiles exactly match the saved accepted native; replay from snap rebuilds legitimate observation/mind history'}));
writeFileSync('data/reviews/current/weak-zone-departure/ace-weak-over3.setup.json.gz',bytes);
console.log(JSON.stringify({simulationTicks:0,bytes:bytes.length,all22InitialExact:true,sha256:createHash('sha256').update(bytes).digest('hex')}));
