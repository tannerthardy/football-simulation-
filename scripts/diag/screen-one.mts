// One screen snap: print events and the screen receiver/blockers around the throw.
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
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
const res = sim.run();
if (rbSlot) for (const st of (globalThis as any).__tr.steps) { if (Math.abs(st.stepStart * 10 - Math.round(st.stepStart * 10)) > 1e-6) continue;
  const raw = st.decision?.raw?.vel, fin = st.final?.vel, v = st.endpoint?.body?.velocity ?? st.endpoint?.velocity;
  const sp = (q: any) => q ? Math.hypot(q.x, q.y).toFixed(2) : '-';
  console.log(`  ${rbSlot} ${st.stepStart.toFixed(1)} raw ${sp(raw)} final ${sp(fin)} achieved ${sp(v)} rewrites ${(st.rewrites ?? []).map((w: any) => w.stage + ':' + sp(w.command.vel)).join(',')}`); }
console.log('result', res.outcome, res.yards);
for (const e of sim.events) if (!/block_contact|snap$|carrier_contact/.test(e.type)) console.log(`  ${e.t} ${e.type} ${e.a !== undefined ? sim.agents[e.a].team + sim.agents[e.a].slot : ''} ${e.b !== undefined ? sim.agents[e.b].team + sim.agents[e.b].slot : ''} ${e.note ?? ''}`);
