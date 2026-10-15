/** Pure reduction of preserved all-player traces. No controller or World. */
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{createHash}from'node:crypto';
const[nativePath,witnessPath,originalPath,outPath]=process.argv.slice(2);
const hash=b=>createHash('sha256').update(b).digest('hex'),load=p=>JSON.parse(gunzipSync(readFileSync(p)));
const n=load(nativePath),w=load(witnessPath),original=load(originalPath),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const refs=w.games.find(g=>g.id==='zone-reference').selected;
function contacts(frames,teammate){return frames.flatMap(f=>f.report.contacts.filter(c=>c.impulse>1e-8&&(teammate?c.i<11&&c.j<11:(c.i===6&&c.j>=11||c.j===6&&c.i>=11)))
 .map(c=>({step:f.t,reportedBy:Math.round((f.t+.05)*100)/100,...c})));}
function loads(frames){const sums=new Map();for(const f of frames)for(const j of f.joints){if(j.kind!=='hands'||j.a>=11||j.b<11)continue;
 const key=j.a+'>'+j.b,row=sums.get(key)??{blocker:j.a,defender:j.b,normalImpulse:0,absoluteTangentImpulse:0,firstSample:f.t,lastSample:f.t};
 row.normalImpulse+=(j.normalForce??0)*.05;row.absoluteTangentImpulse+=Math.abs(j.tangentForce??0)*.05;row.lastSample=f.t;sums.set(key,row);}return[...sums.values()];}
function crossing(frames,los){const f=frames.find(f=>f.after[6].pos.x>=los);return f?Math.round((f.t+.05)*100)/100:null;}
const cases=n.rows.map(row=>{const index=row.nativePlay-1,ref=refs.find(r=>r.index===index),old=ref.frames.filter(f=>f.t<3-1e-9),film=original.log.find(l=>l.index===index);
 const offBefore=contacts(old,true),offAfter=contacts(row.frames,true);
 const reportsEqual=old.every((f,i)=>same(f.report,row.frames[i].report));
 const jointsEqual=old.every((f,i)=>same(f.joints,row.frames[i].joints));
 if(row.role==='waiting-control')assert(reportsEqual&&jointsEqual&&!row.comparison.firstChangedRequest&&!row.comparison.firstChangedBody);
 return{nativePlay:row.nativePlay,collectorIndex:index,call:film.call,role:row.role,los:row.los,
  frameCount:row.frames.length,comparison:row.comparison,reportsEqual,jointsEqual,
  before:{firstCarrierContact:film.replay.events.find(e=>e.type==='carrier_contact'&&e.a===6)??null,firstRBBodyCollision:contacts(old,false)[0]??null,teammateImpacts:offBefore,losCrossing:crossing(old,row.los),rbAt3:old.at(-1).after[6].pos,blockingLoad:loads(old)},
  after:{firstCarrierContact:row.events.find(e=>e.type==='carrier_contact'&&e.a===6)??null,firstRBBodyCollision:contacts(row.frames,false)[0]??null,teammateImpacts:offAfter,losCrossing:crossing(row.frames,row.los),rbAt3:row.frames.at(-1).after[6].pos,blockingLoad:loads(row.frames)},
  completedControl:row.completedResult?{endedAt:row.end,events:row.events.filter(e=>['tackle','fall','climb'].includes(e.type))}:null,
  unfinished:row.censored};});
const result={schema:'run-entry-cues-review-v1',recommendation:'Reject entry-risk candidate for adoption as tested; keep portable gap fix independent.',
 pins:{portableGap:'d63bf4504e1a17e2f6a32738009a532838fc5e20',portableGapEvidence:'92566b3b650bb2e855487cbf1eae6a2dbf60918b',
  trialCode:'cfc2fc9bdc1bc293d9686e85bf23631a581a5367',trialWithCorrectParentControls:'7f9d9a4b2e40946129281ae382c8483f717e8c5d',
  recordedEngine:'f62511a513f2187884d74ae3b94435835e43309c',referenceEvidence:'e8a76a7f7cdc19dece85288f93a8d1e1273be0db',inputs:'4ae667e29b3ce085f43c5cb911b294349cda2b8f'},
 sources:{rootCandidate:n.rootSourceSha256,isolatedDiagnostic:n.isolatedSourceSha256,recorded:n.originalSource},
 inputs:{nativeSha256:hash(readFileSync(nativePath)),manifestSha256:n.manifestSha256,witnessSha256:hash(readFileSync(witnessPath)),originalGameSha256:hash(readFileSync(originalPath)),node:n.node,flags:n.flags,worldDefaults:n.worldDefaults},
 measurement:'Blocking impulses integrate already-resolved pre-step hands-joint normalForce and absolute tangentForce at 50ms samples, t0..2.95. Contacts retain World step timestamps; carrier_contact events use their own recorded timestamps. Do not equate engagement count with load.',
 limitations:['Native diagnostic isolates the exact risk-loop change on the recorded engine; it does not include the portable gap correction or the unadopted 6122 navigation stack.',
  'The opening intervention stops at 3s. P032 is censored, not a completed snap or yardage claim. P019 returns to original behavior after 3s and retains its recorded finish.',
  'Same-cue tests cover exact-parent gap-corrected entry decisions, not coupled combined-engine verification. Integration owns that verification.',
  'Public get-up/reach capacity is a coarse threat model, not empirical NFL calibration. Own arrival remains a distance/current-speed estimate.',
  'This does not repair all legacy carrier information callers. It changes only runReadAim opponent-risk inputs.'],
 cost:{physicalScrimmages:n.physicalScrimmages,matchedEarlierLogEntries:n.matchedEarlierEntries,earlierPrefixMatches:n.earlierPrefixMatches,
  completedGames:n.completedGames,nativeSeconds:n.elapsedSeconds,nativeLauncherSeconds:8.582424364,
  focusedChecks:{entryCues:4,otherCompatiblePassing:39,uniquePassing:43,allInOneGreenRun:false,initialCandidateResult:'42/43; contrasting assertion used old-gap expectation. Preserve failure and corrected-parent diagnostic.'},
  fullSuiteRuns:0,typecheckRuns:0,newRosters:0},cases};
assert.equal(result.inputs.originalGameSha256,n.originalGameSha256);assert.equal(result.inputs.witnessSha256,n.witnessSha256);
writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({recommendation:result.recommendation,cases:cases.map(c=>({play:c.nativePlay,firstContactBefore:c.before.firstCarrierContact?.t,firstContactAfter:c.after.firstCarrierContact?.t,teammateHitsBefore:c.before.teammateImpacts.length,teammateHitsAfter:c.after.teammateImpacts.length,losBefore:c.before.losCrossing,losAfter:c.after.losCrossing,controlReportsEqual:c.reportsEqual})),cost:result.cost}));
