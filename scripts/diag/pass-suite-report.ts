/** Reports are descriptive comparisons, never a yardage-based acceptance gate. */
import type { Scenario, Manifest } from './pass-suite-cases.js';
import type { Measurement } from './pass-suite-measure.js';

export interface SummaryRow {
  case:Scenario;status:string;error:string|null;elapsedMs:number;steps:number;
  metrics:Measurement['metrics'];physicalSignature:string;initialSha256:string;
  contact:{firstLoadedAt:number|null;firstHolder:string|null;origin:string|null;loadedSeconds:number;brokenGrasps:number;
    firstBodyContact:unknown;firstLoaded:unknown;catchPicture:unknown};
  cache:string;rowSha256:string;
}
export interface Index {
  schema:'pass-game-index-v1';provenance:Record<string,any>;checkout:Record<string,unknown>;checkpoint:string;
  status:string;manifestCases:number;selection:string[];rows:SummaryRow[];skipped:string[];failure:unknown;
  runtime:{wallMs:number;newCases:number;cachedCases:number;newSimulationMs:number;cachedOriginalSimulationMs:number;newSteps:number};
  baseline:string|null;routeChangeReason:string|null;settingsChangeReason:string|null;
}
export function compact(r:Measurement,cache:string,rowSha256:string):SummaryRow {
  const load=r.observation.firstLoaded as {interval:number[];holder:{id:string};origin:string|null}|null;
  return {case:r.case,status:r.status,error:r.error,elapsedMs:r.elapsedMs,steps:r.steps,metrics:r.metrics,
    physicalSignature:r.physicalSignature,initialSha256:r.initialSha256,contact:{firstLoadedAt:load?.interval[1]??null,
      firstHolder:load?.holder.id??null,origin:load?.origin??null,
      loadedSeconds:r.observation.grasps.reduce((n,g)=>n+g.loadedSeconds,0),
      brokenGrasps:r.observation.grasps.filter(g=>g.brokenAt!==null).length,
      firstBodyContact:r.observation.firstBodyContact,firstLoaded:r.observation.firstLoaded,catchPicture:r.observation.catchPicture},cache,rowSha256};
}
export function distribution(values:Array<number|null|undefined>) {
  const v=values.filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)).sort((a,b)=>a-b);
  const at=(p:number)=>v.length?v[Math.ceil(p*v.length)-1]:null;
  return {n:v.length,mean:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,median:at(.5),p90:at(.9),max:v.at(-1)??null};
}
export function aggregate(rows:SummaryRow[]) {
  const ended=rows.filter(r=>r.status==='native'&&r.metrics.completedOutcome);
  return {cases:rows.length,finished:ended.length,unfinished:rows.filter(r=>r.status.startsWith('censored')).length,
    failed:rows.filter(r=>r.status==='failed').length,attempts:rows.filter(r=>r.metrics.attempted).length,
    catches:rows.filter(r=>r.metrics.completed).length,cleanYacCatches:rows.filter(r=>r.metrics.yac!==null).length,
    sacks:rows.filter(r=>r.metrics.sacked).length,interceptions:rows.filter(r=>r.metrics.interception!==null).length,
    scrambles:rows.filter(r=>r.metrics.scramble).length,throwaways:rows.filter(r=>r.metrics.throwaway).length,
    nativePressures:rows.filter(r=>r.metrics.pressured).length,oob:ended.filter(r=>r.metrics.oob).length,
    touchdowns:ended.filter(r=>r.metrics.score?.kind==='TD'&&r.metrics.score.team==='O').length,
    noPostCatchContact:rows.filter(r=>r.metrics.completed&&r.metrics.firstPostCatchContactAt===null).length,
    gain:distribution(ended.map(r=>r.metrics.gain)),yac:distribution(rows.map(r=>r.metrics.yac)),
    release:distribution(rows.map(r=>r.metrics.throwAt)),
    catchToContact:distribution(rows.map(r=>r.metrics.catchAt!==null&&r.metrics.firstPostCatchContactAt!==null?
      r.metrics.firstPostCatchContactAt-r.metrics.catchAt:null)),
    catchToLoad:distribution(rows.map(r=>r.metrics.catchAt!==null&&r.contact.firstLoadedAt!==null?
      r.contact.firstLoadedAt-r.metrics.catchAt:null))};
}
function compare(a:SummaryRow,b:SummaryRow) {
  const delta=(x:number|null,y:number|null)=>x===null||y===null?null:y-x;
  return {id:b.case.id,case:b.case,statusBefore:a.status,statusAfter:b.status,
    outcomeBefore:a.metrics.outcome,outcomeAfter:b.metrics.outcome,
    outcomeChanged:JSON.stringify([a.status,a.metrics.outcome,a.metrics.score,a.metrics.interception])!==JSON.stringify([b.status,b.metrics.outcome,b.metrics.score,b.metrics.interception]),
    catcherBefore:a.metrics.receiver,catcherAfter:b.metrics.receiver,catcherChanged:a.metrics.receiver!==b.metrics.receiver,
    tacklerChanged:JSON.stringify(a.metrics.tacklers)!==JSON.stringify(b.metrics.tacklers),
    initialStateChanged:a.initialSha256!==b.initialSha256,physicalChanged:a.physicalSignature!==b.physicalSignature,
    gainBefore:a.metrics.gain,gainAfter:b.metrics.gain,gainDelta:delta(a.metrics.gain,b.metrics.gain),
    yacBefore:a.metrics.yac,yacAfter:b.metrics.yac,yacDelta:delta(a.metrics.yac,b.metrics.yac),
    releaseDelta:delta(a.metrics.throwAt,b.metrics.throwAt),
    loadBefore:a.contact.firstLoadedAt,loadAfter:b.contact.firstLoadedAt,
    firstHolderBefore:a.contact.firstHolder,firstHolderAfter:b.contact.firstHolder};
}
export function makeReport(index:Index,m:Manifest,baseline?:Index) {
  const by=(key:(r:SummaryRow)=>string[])=>{
    const groups:Record<string,SummaryRow[]>={};for(const row of index.rows)for(const k of key(row))(groups[k]??=[]).push(row);
    return Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,aggregate(v)]));};
  const base=new Map(baseline?.rows.map(r=>[r.case.id,r])??[]),rows=new Map(index.rows.map(r=>[r.case.id,r]));
  const comparisons=index.rows.filter(r=>base.has(r.case.id)).map(r=>compare(base.get(r.case.id)!,r));
  const pairs=m.pairs.filter(p=>rows.has(p.a)&&rows.has(p.b)).map(p=>({...p,comparison:compare(rows.get(p.a)!,rows.get(p.b)!)}));
  return {schema:'pass-game-report-v1',status:index.status,checkpoint:index.checkpoint,
    provenance:index.provenance,checkout:index.checkout,baseline:baseline?{provenance:baseline.provenance,checkout:baseline.checkout}:null,
    coverage:{manifestCases:index.manifestCases,selected:index.selection.length,collected:index.rows.length,skipped:index.skipped},
    runtime:index.runtime,summary:aggregate(index.rows),baselineSummary:baseline?aggregate(baseline.rows.filter(r=>rows.has(r.case.id))):null,
    byGroup:by(r=>r.case.groups),byConcept:by(r=>[r.case.concept]),byCoverage:by(r=>[m.looks[r.case.look].coverage.id]),
    byFormation:by(r=>[r.case.formation]),byRoster:by(r=>[r.case.roster]),bySituation:by(r=>[r.case.context]),
    pairs,comparisons,rows:index.rows,limitations:[...m.limitations,
      'Counts are unweighted stress exposures. Aliased groups overlap; never add their totals. No statistical population claim.',
      'Release is among throws; clean terminal YAC excludes penalties, fumbles, returns and all censors. Native pressure and geometric QB proximity are separate measures.',
      'A live no-contact prefix is unfinished, not a missed tackle. No contact and a failed loaded grasp are separate observations.',
      'Changed endings, increased YAC and reduced YAC require football interpretation; no automatic outcome target. Same seed does not guarantee identical execution draws after decisions diverge.',
      'A same-input comparison may change effective profiles, stance or assignments; initialStateChanged flags this for review. Request/achieved and cue evidence is in per-case caches.',
      'Reference/candidate route or settings exceptions, if declared, change the comparison contract; inspect index reasons before interpreting deltas.'],
    failure:index.failure};
}
export function markdown(r:ReturnType<typeof makeReport>) {
  const s=r.summary;return `# Pass-game checkpoint\n\n${r.checkpoint}\n\nStatus: **${r.status}**. ${r.coverage.collected}/${r.coverage.selected} selected; ${r.coverage.manifestCases} in manifest.\n\n`+
    `Source: \`${r.provenance.source}\`. New/cached cases: ${r.runtime.newCases}/${r.runtime.cachedCases}; wall ${(r.runtime.wallMs/1000).toFixed(2)} s; new native steps ${r.runtime.newSteps}.\n\n`+
    `Finished ${s.finished}; censored ${s.unfinished}; failed ${s.failed}. Attempts ${s.attempts}; catches ${s.catches}; clean terminal YAC denominator ${s.cleanYacCatches}.\n\n`+
    `Release median/p90: ${s.release.median??'—'} / ${s.release.p90??'—'} s (${s.release.n} throws). YAC median/p90: ${s.yac.median??'—'} / ${s.yac.p90??'—'} yd.\n\n`+
    `Comparison rows ${r.comparisons.length}; changed ending ${r.comparisons.filter(c=>c.outcomeChanged).length}; changed catcher ${r.comparisons.filter(c=>c.catcherChanged).length}; changed initial state ${r.comparisons.filter(c=>c.initialStateChanged).length}.\n\n`+
    `Use report.html for searchable cases and report.json for grouped distributions and paired controls. Inspect cache evidence before assigning a cause.\n\n`+
    r.limitations.map(l=>'- '+l).join('\n')+'\n';
}
export function html(r:ReturnType<typeof makeReport>) {
  // Escape HTML/script delimiters even when user-provided checkpoint labels are included.
  const json=JSON.stringify(r).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Pass-game checkpoint</title>
<style>body{font:15px system-ui;margin:2rem;background:#f5f7fa;color:#182332}table{border-collapse:collapse;width:100%;background:white}td,th{padding:.55rem;text-align:left;border-bottom:1px solid #ddd}th{cursor:pointer;position:sticky;top:0;background:#dfe8ef}input,select{padding:.7rem;margin:.4rem}pre{white-space:pre-wrap}summary{cursor:pointer}small{color:#485568}</style>
<h1>Pass-game checkpoint</h1><p id="summary"></p><p><small>Descriptive stress evidence. A changed football ending is a review flag, not an automatic failure.</small></p>
<input id="search" placeholder="Search concept, coverage, formation, case ID" size="55"><select id="view"><option value="all">All collected cases</option><option value="changed">Changed physical result</option><option value="ending">Changed ending</option><option value="unfinished">Unfinished / failed</option></select>
<p id="count"></p><table><thead><tr id="heads"></tr></thead><tbody id="rows"></tbody></table><details><summary>Provenance, limits and group summaries</summary><pre id="details"></pre></details>
<script>const data=${json};const comparisons=new Map(data.comparisons.map(r=>[r.id,r]));const cols=['id','concept','look','formation','roster','context','status','outcome','gain','yac','throwAt','firstContact','firstLoad','gainDelta','yacDelta'];
let sort='id',ascending=true;const text=(e,t)=>e.textContent=t;const value=(r,k)=>({firstContact:r.metrics.firstPostCatchContactAt,firstLoad:r.contact.firstLoadedAt,...r.case,...r,...r.metrics,...comparisons.get(r.case.id)})[k];
text(document.getElementById('summary'),data.checkpoint+' — '+data.status+'; '+data.coverage.collected+'/'+data.coverage.selected+' selected; YAC denominator '+data.summary.cleanYacCatches+'; source '+data.provenance.source);
for(const k of cols){const th=document.createElement('th');text(th,k);th.onclick=()=>{ascending=sort===k?!ascending:true;sort=k;render()};document.getElementById('heads').append(th)}
function render(){const search=document.getElementById('search').value.toLowerCase(),view=document.getElementById('view').value;const rows=data.rows.filter(r=>JSON.stringify(r.case).toLowerCase().includes(search)&&
(view==='all'||view==='changed'&&comparisons.get(r.case.id)?.physicalChanged||view==='ending'&&comparisons.get(r.case.id)?.outcomeChanged||view==='unfinished'&&r.status!=='native'));
rows.sort((a,b)=>{let x=value(a,sort),y=value(b,sort);return (typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??'')))*(ascending?1:-1)});
const body=document.getElementById('rows');body.replaceChildren();for(const r of rows){const tr=document.createElement('tr');for(const k of cols){const td=document.createElement('td'),v=value(r,k);text(td,v==null?'—':typeof v==='number'?Math.round(v*1000)/1000:v);tr.append(td)}tr.title='Catcher: '+r.metrics.receiver+'; first holder: '+r.contact.firstHolder+'; cache: '+r.cache;body.append(tr)}text(document.getElementById('count'),rows.length+' rows')}
document.getElementById('search').oninput=render;document.getElementById('view').onchange=render;text(document.getElementById('details'),JSON.stringify({provenance:data.provenance,checkout:data.checkout,runtime:data.runtime,limits:data.limitations,groups:data.byGroup,concepts:data.byConcept,pairs:data.pairs,failure:data.failure},null,2));render();</script></html>`;
}
