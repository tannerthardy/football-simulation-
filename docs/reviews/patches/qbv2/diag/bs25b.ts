import { PlaySim } from '../wt950/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt950/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt950/scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
for (const seed of [25]) {
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1; const out: string[] = []; let lastCmd: any = null; let wrapped = false;
const t0 = sim.tick.bind(sim);
sim.tick = () => { const bq0: any = sim.qb.behavior; if (bq0?.v2wire && !wrapped) { wrapped = true; const st = bq0.v2wire.step.bind(bq0.v2wire); bq0.v2wire.step = (...a: any[]) => { const c = st(...a); lastCmd = c; return c; }; } t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || v2.cycle.readIdx !== 1 || sim.t - last < 0.099) return; last = sim.t;
  const t = v2.cycle.looks.current; const role = v2.roles.resolve(v2.picture(h), 'flat', 'W'); const j = v2.lastJudged.get('W2');
  const g = v2.gaze(h), a = sim.qb, hd = a.head ?? a.body.facing, ang = g ? Math.round(Math.atan2(Math.sin(Math.atan2(g.y - a.pos.y, g.x - a.pos.x) - hd), Math.cos(Math.atan2(g.y - a.pos.y, g.x - a.pos.x) - hd)) * 57.3) : null; const tgt = v2.target(h, 'W2'), wp = tgt ? h.estimate(tgt).pos : null;
  const bq: any = sim.qb.behavior; const yy = sim.offense.find((o: any) => o.slot === bq.shoulderOn?.slot); const bf = yy ? bq.bodyFacing(sim.qb, sim, yy) : null; const hp = yy ? bq.has(sim, yy) : null; out.push(`bodyFacing(Y) ${bf !== null ? Math.round(bf * 57.3) : '-'} has(Y) ${hp ? r2(hp.x) + ',' + r2(hp.y) : '-'} qb ${r2(sim.qb.pos.x)},${r2(sim.qb.pos.y)} | cmd facing ${lastCmd?.facing !== undefined ? Math.round(lastCmd.facing * 57.3) : lastCmd === null ? 'null' : 'none'} vel ${lastCmd?.vel ? r2(lastCmd.vel.x) + ',' + r2(lastCmd.vel.y) : '-'} phase ${bq.phase} shoulderOn ${bq.shoulderOn?.slot ?? "-"} drift ${bq.v2Drift?.()} | gaze ${g ? r2(g.x) + ',' + r2(g.y) : null} W2 ${wp ? r2(wp.x) + ',' + r2(wp.y) : null} head-gaze ${ang} body ${Math.round(a.body.facing * 57.3)} head ${Math.round(hd * 57.3)} inClear ${g ? h.inClear(g) : null} | ${r2(sim.t)} look ${JSON.stringify(t)} res ${r2(t ? v2.cycle.looks.resolved(t) : 0)} need ${r2(h.need)} Wflat ${role ? sim.agents[role.id].slot : 'none'} cue ${v2.cue.get('W:flat') ?? '-'} W2 ${j ? r2(j.P) + '/' + r2(j.risk) + (j.early ? 'e' : '') : '-'} state ${v2.cycle.state}`); };
try { sim.run(); } catch {}
console.log('seed', seed, '\n ', out.join('\n  '));
}
