// Formation scene: inside zone, RG (covered) + C (helper) on DT_S, backer LB_W. Real controllers from stance; QB/RB run
// the play; everyone else parked. Every 0.1 s: both members' lateral off the DT (+ away from partner), depth in front,
// member gap, engagement (owner+helpers), DT displacement, climber state. argv: worktree [flip]
const W = process.argv[2], flip = process.argv[3] === 'flip', quiet = process.argv[4] === 'summary'; if (process.argv[5] === 'gate') (globalThis as any).__hipGate = true;
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const sim: any = new PlaySim(structuredClone(nativeTraceSetup({ coverage: 'cover3_buzz', concept: process.env.SCENE_CONCEPT ?? 'iz_strong', seed: 1, roster: 7, formation: 'ace_11', flip })));
const square = process.argv[6] === 'square';
const keep = new Set(square ? ['RG', 'C', 'DT_S', 'LB_W', 'QB'] : ['RG', 'C', 'DT_S', 'LB_W', 'LB_M', 'QB', 'RB']);
let park = 0;
for (const a of sim.agents) if (!keep.has(a.slot)) { a.body.pos = { x: 90 + (park % 6) * 2, y: 3 + Math.floor(park++ / 6) * 2 }; a.body.vel = { x: 0, y: 0 };
  a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
const o = sim.slot('RG'), h = sim.slot('C'), d = sim.slot('DT_S'), lb = sim.slot('LB_W'), dir = sim.attackDir('O');
const c = (o.behavior as any).plan.combination;
if (!c || !c.members.includes(h) || c.defender !== d) throw new Error('scene: expected RG+C double on DT_S');
const d0 = { ...d.pos }, f = (v: number) => v.toFixed(2);
const rows: any[] = [];
const sample = () => { const side = Math.sign(h.pos.y - o.pos.y) || 1, e = d.engagement;
  return { t: sim.t, oLat: (o.pos.y - d.pos.y) * -side, oDep: (d.pos.x - o.pos.x) * dir, hLat: (h.pos.y - d.pos.y) * side, hDep: (d.pos.x - h.pos.x) * dir,
    gap: Math.hypot(h.pos.x - o.pos.x, h.pos.y - o.pos.y), eng: e ? `${e.blocker.slot}${e.helpers.length ? '+' + e.helpers.map((x: any) => x.slot) : ''}` : '-',
    dtBack: (d.pos.x - d0.x) * dir, dtLat: (d.pos.y - d0.y), released: c.released, hv: Math.hypot(h.vel.x, h.vel.y), hreq: sim.intents[h.idx] ? Math.hypot(sim.intents[h.idx].vel.x, sim.intents[h.idx].vel.y) : 0, hlat: h.vel.y, coll: !!Reflect.get(h.behavior, 'collectionRead')?.choice, hipAim: (() => { const hp = (h.behavior as any).comboHip?.(h, sim, d, sim.see(h, d)); return hp ? `${f((hp.spot.y - d.pos.y))}/${hp.ready}` : 'none'; })(), eng2: h.engagement ? 'H-ENG' : '', pol: c.helpPolicy?.kind ?? '-', dlat: d.vel.y,
    climber: c.released ? [o, h].find((m: any) => (m.behavior as any).plan.target === lb)?.slot ?? '?' : '', lbDist: Math.min(...[o, h].map((m: any) => Math.hypot(m.pos.x - lb.pos.x, m.pos.y - lb.pos.y))), tgts: `${(o.behavior as any).plan.target?.slot}/${(h.behavior as any).plan.target?.slot}`, lbw: `${f(sim.slot('LB_W').pos.x - sim.los)},${f(sim.slot('LB_W').pos.y - d0.y)}`, lbm: `${f(sim.slot('LB_M').pos.x - sim.los)},${f(sim.slot('LB_M').pos.y - d0.y)}` }; };
(globalThis as any).__jr = [];
for (let k = 0; k < (Number(process.env.T_END) || 2.0) / sim.dt + 1e-6; k++) { sim.tick(); if (Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6 && sim.t >= .3) rows.push(sample()); }
if (!quiet) for (const r of rows) console.log(`t=${f(r.t)} owner(${f(r.oLat)},${f(r.oDep)}) helper(${f(r.hLat)},${f(r.hDep)}) gap ${f(r.gap)} eng ${r.eng.padEnd(8)} DT back ${f(r.dtBack)} lat ${f(r.dtLat)} ${r.released ? 'RELEASED climber ' + r.climber : ''} tgts RG/C ${r.tgts} LB_W ${r.lbw} LB_M ${r.lbm} lbDist ${f(r.lbDist)} | coll ${r.coll} hip ${r.hipAim} ${r.eng2} pol ${r.pol} | C speed req ${f(r.hreq)} got ${f(r.hv)} latV ${f(r.hlat)} DT latV ${f(r.dlat)}`);
if (process.env.JRALL) for (const l of (globalThis as any).__jr) if (l.includes(' RG ') && Number(l.split(' ')[0]) > 1.7) console.log('JRA', l);
if (process.env.JR) { const seen = new Map<string,string>(); for (const l of (globalThis as any).__jr) { const [t, who, ...st] = l.split(' '); const k = who + st.join(' '); if (!seen.has(k)) { seen.set(k, t); console.log('JR', l); } } }
const at = (t: number) => rows.find(r => Math.abs(r.t - t) < .051);
const joined = rows.find(r => r.eng.includes('+')), rel = rows.find(r => r.released);
console.log(JSON.stringify({ flip, joinT: joined?.t ?? null, releaseT: rel?.t ?? null, climber: rel?.climber ?? null,
  gap10: at(1.0)?.gap, hDep10: at(1.0)?.hDep, oLat10: at(1.0)?.oLat, hLat10: at(1.0)?.hLat, dtBack15: at(1.5)?.dtBack, lbDist20: at(2.0)?.lbDist }, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v));
