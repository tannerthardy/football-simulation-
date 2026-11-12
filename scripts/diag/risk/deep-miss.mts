// Deep-throw placement split (risk diagnosis): for throws from deep-leaning concepts, at the ball's planned arrival,
// the ball against the point he aimed at as it left his hand (his throw's miss) and the receiver against that point
// (his lead), by aimed distance, with his own sigma belief and completion.
//   node --import tsx scripts/diag/risk/deep-miss.mts [first seed] [last seed] [--rows]   (--rows: one JSON row a throw)
const W = process.cwd();
const s0 = Number(process.argv[2] ?? 1), s1 = Number(process.argv[3] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { QBPass } = await import(`${W}/src/sim/behaviors/qb.ts`);
const P:any=QBPass.prototype, rel=P.release; let cur:any=null;
P.release=function(a:any,sim:any,ev:any){ const tb=sim.throwBall; sim.throwBall=(q:any,r:any,v0:any,pt:any,arr:number)=>{ cur={pt:{x:pt.x,y:pt.y}, arr, rel:sim.t, from:{x:q.pos.x,y:q.pos.y}, sigma:this.missSigma(a,sim,Math.hypot(pt.x-q.pos.x,pt.y-q.pos.y),0), r}; sim.throwBall=tb; return tb.call(sim,q,r,v0,pt,arr); }; return rel.call(this,a,sim,ev); };
const rows:any[]=[];
for (const concept of ['four_verts','verts_hitch','pa_shot','comebacks','dagger','smash','corner_flat','post_cross','seam_hitch','pa_post_dig','flood','y_cross','curl_flat','sail_corner']) for (const formation of ['gun_doubles_11','gun_trips_11']) for (const coverage of ['cover1','cover2','cover3','cover4']) for (let seed = s0; seed <= s1; seed++) for (const flip of [false,true]) {
  const sim:any=new PlaySim(nativeTraceSetup({coverage,concept,seed,roster:seed,formation,flip})); cur=null; let at:any=null;
  const tick=sim.tick.bind(sim); sim.tick=()=>{ tick(); if(cur&&!at&&sim.t>=cur.arr-1e-9){ const b=sim.ballPos(); at={ ballMiss: Math.hypot(b.x-cur.pt.x,b.y-cur.pt.y), inAir: sim.ball.kind==='air', recMiss: Math.hypot(cur.r.pos.x-cur.pt.x,cur.r.pos.y-cur.pt.y) }; } };
  sim.run(); if(cur&&at) { const row={ concept, coverage, seed, dist: Math.hypot(cur.pt.x-cur.from.x,cur.pt.y-cur.from.y), sigma:cur.sigma, ...at, cmp:!!sim.stats.completed }; rows.push(row); if (process.argv.includes('--rows')) process.stdout.write(JSON.stringify(row)+'\n'); }
}
const q=(v:number[],p:number)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.floor(p*(s.length-1))]:NaN;};
if (!process.argv.includes('--rows')) console.log('aimed distance | n | ball vs aim at arrival (in the air) p50/p75 | his sigma p50 | receiver vs aim at arrival p50/p75 | completion');
for (const [lo,hi] of [[10,20],[20,30],[30,40],[40,60]]) { const S=rows.filter(r=>r.dist>=lo&&r.dist<hi); if(!S.length) continue; const A=S.filter(r=>r.inAir);
  if (!process.argv.includes('--rows')) console.log(`${lo}-${hi} | ${S.length} (in air ${A.length}) | ${q(A.map(r=>r.ballMiss),.5).toFixed(2)}/${q(A.map(r=>r.ballMiss),.75).toFixed(2)} | ${q(S.map(r=>r.sigma),.5).toFixed(2)} | ${q(S.map(r=>r.recMiss),.5).toFixed(2)}/${q(S.map(r=>r.recMiss),.75).toFixed(2)} | ${(S.filter(r=>r.cmp).length/S.length).toFixed(3)}`); }
