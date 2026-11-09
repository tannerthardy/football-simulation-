// One screen snap: print events and the screen receiver/blockers around the throw.
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { catchSpot } from '../../src/sim/behaviors/receiver.js';
const [id, form, cov, seedS, pres] = process.argv.slice(2);
const concept = SCREEN_BY_ID[id], formation = FORMATION_BY_ID[form], seed = Number(seedS);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: pres ? PRESSURE_BY_ID[pres] : null, label: cov },
  los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
const t0 = sim.tick.bind(sim); let last = -1;
sim.tick = () => { t0(); const k = Math.round(sim.t * 4); if (k !== last && Math.abs(sim.t * 4 - k) < 1e-6) { last = k;
  const off = sim.offense.filter((a: any) => a.slot === "RB" || a.behavior?.kind === "screen-block" || ['route','track-ball','carrier'].includes(a.behavior?.kind) || a === sim.carrier);
  console.log(`t ${sim.t.toFixed(2)} ball ${sim.ball.kind} | ` + off.map((a: any) => `${a.slot}:${a.behavior.kind}@(${(a.pos.x - sim.los).toFixed(1)},${a.pos.y.toFixed(1)})${a.behavior.target ? '->' + a.behavior.target.slot : ''}${a.engagement ? '[E ' + a.engagement.defender.slot + ']' : ''}`).join(' ')); } };
const rbSlot = process.env.TRACE_SLOT;
if (rbSlot) { const tr = sim.recordCommands({ actor: { team: 'O', slot: rbSlot }, from: 0, to: 3 }); (globalThis as any).__tr = tr; }
if (process.env.TRACE_QB) { const qb: any = sim.qb, b: any = qb.behavior; const ev0 = b.evaluate.bind(b), rd0 = b.ready.bind(b);
  b.evaluate = (a: any, s2: any, r: any, u: number) => { const e = ev0(a, s2, r, u); if (s2.t > 1.6) console.log(`  QB eval t ${s2.t.toFixed(2)} ${r.slot} u ${u.toFixed(2)} -> ${e ? `P ${e.P.toFixed(2)} int ${e.intRisk.toFixed(3)} T ${e.T.toFixed(2)}` : 'null'}`); return e; };
  b.ready = (r: any, s2: any) => { const x = rd0(r, s2); if (s2.t > 1.6 && Math.abs(s2.t * 10 - Math.round(s2.t * 10)) < 1e-6) console.log(`  QB ready t ${s2.t.toFixed(2)} ${r.slot} ${x}`); return x; }; }
(globalThis as any).__QBDBG = !!process.env.TRACE_QB;
if (process.env.TRACE_FC) { const qbB: any = sim.qb.behavior; const rel0 = qbB.release.bind(qbB);
  qbB.release = (a: any, s2: any, ev: any) => { const f: any = qbB.receiverForecasts.get(ev.target); const p = f?.predict(s2.t, ev.T); const c = f?.cache;
    console.log(`  FC t ${s2.t.toFixed(2)} T ${ev.T.toFixed(2)} predicted (${p ? (p.x - s2.los).toFixed(2) + ',' + p.y.toFixed(2) : '-'}) estimate ${JSON.stringify(c?.estimate)} picture pos (${c?.picture ? (c.picture.pos.x - s2.los).toFixed(2) + ',' + c.picture.pos.y.toFixed(2) : '-'}) vel (${c?.picture ? c.picture.vel.x.toFixed(1) + ',' + c.picture.vel.y.toFixed(1) : '-'}) | true pos (${(ev.target.pos.x - s2.los).toFixed(2)},${ev.target.pos.y.toFixed(2)}) vel (${ev.target.vel.x.toFixed(1)},${ev.target.vel.y.toFixed(1)}) | prior start (${(f.prior.start.x - s2.los).toFixed(2)},${f.prior.start.y.toFixed(2)}) path ${f.prior.path.map((q: any) => '(' + (q.p.x - s2.los).toFixed(1) + ',' + q.p.y.toFixed(1) + ')').join(' ')} delay ${f.prior.startDelay}`);
    return rel0(a, s2, ev); }; }
if (process.env.TRACE_CATCH) { const t2 = sim.tick.bind(sim); sim.tick = () => { t2(); const b: any = sim.ball; if (b.kind !== 'air' || !b.target) return; const r = b.target, sp: any = catchSpot(r, sim);
  console.log(`  C t ${sim.t.toFixed(2)} ball (${(b.flight.pos.x - sim.los).toFixed(2)},${b.flight.pos.y.toFixed(2)},${b.flight.pos.z.toFixed(2)}) ${r.slot} (${(r.pos.x - sim.los).toFixed(2)},${r.pos.y.toFixed(2)}) v (${r.vel.x.toFixed(1)},${r.vel.y.toFixed(1)}) ${r.behavior.kind} spot ${sp ? `(${(sp.p.x - sim.los).toFixed(2)},${sp.p.y.toFixed(2)},z${sp.z.toFixed(2)}) in ${(sp.t - sim.t).toFixed(2)}` : '-'} dist ${Math.hypot(b.flight.pos.x - r.pos.x, b.flight.pos.y - r.pos.y).toFixed(2)}`); }; }
if (process.env.TRACE_BALL) { const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, tgt: any, v0: any, intended: any, arr: number, ...rest: any[]) => {
  console.log(`  THROW t ${sim.t.toFixed(2)} to ${tgt?.slot} intended (${(intended.x - sim.los).toFixed(1)},${intended.y.toFixed(1)},${intended.z.toFixed(1)}) arrive ${arr.toFixed(2)} | target now (${tgt ? (tgt.pos.x - sim.los).toFixed(1) + ',' + tgt.pos.y.toFixed(1) : ''}) vel (${tgt ? tgt.vel.x.toFixed(1) + ',' + tgt.vel.y.toFixed(1) : ''}) behavior ${tgt?.behavior?.kind}`);
  (globalThis as any).__MISS = { tgt, arr }; return tb(q, tgt, v0, intended, arr, ...rest); };
  const t1 = sim.tick.bind(sim); sim.tick = () => { t1(); const m = (globalThis as any).__MISS; if (m && Math.abs(sim.t - m.arr) < 0.026) { const b: any = sim.ball; console.log(`  ARRIVE t ${sim.t.toFixed(2)} ball ${b.kind} ${b.flight ? '(' + (b.flight.pos.x - sim.los).toFixed(1) + ',' + b.flight.pos.y.toFixed(1) + ',' + b.flight.pos.z.toFixed(1) + ') vz ' + b.flight.vel.z.toFixed(1) : ''} target (${(m.tgt.pos.x - sim.los).toFixed(1)},${m.tgt.pos.y.toFixed(1)}) behavior ${m.tgt.behavior.kind}`); } }; }
const res = sim.run();
if (rbSlot) for (const st of (globalThis as any).__tr.steps) { if (Math.abs(st.stepStart * 10 - Math.round(st.stepStart * 10)) > 1e-6) continue;
  const raw = st.decision?.raw?.vel, fin = st.final?.vel, v = st.endpoint?.body?.velocity ?? st.endpoint?.velocity;
  const sp = (q: any) => q ? Math.hypot(q.x, q.y).toFixed(2) : '-';
  console.log(`  ${rbSlot} ${st.stepStart.toFixed(1)} raw ${sp(raw)} final ${sp(fin)} achieved ${sp(v)} rewrites ${(st.rewrites ?? []).map((w: any) => w.stage + ':' + sp(w.command.vel)).join(',')}`); }
console.log('result', res.outcome, res.yards);
for (const e of sim.events) if (!/block_contact|snap$|carrier_contact/.test(e.type)) console.log(`  ${e.t} ${e.type} ${e.a !== undefined ? sim.agents[e.a].team + sim.agents[e.a].slot : ''} ${e.b !== undefined ? sim.agents[e.b].team + sim.agents[e.b].slot : ''} ${e.note ?? ''}`);
