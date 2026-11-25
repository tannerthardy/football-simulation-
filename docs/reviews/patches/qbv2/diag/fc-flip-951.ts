import { PlaySim } from '../../../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../../../../../scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed: 4, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1; const out: string[] = [];
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h; if (!v2 || !h || sim.t < 1.1 || sim.t > 2.3 || sim.t - last < 0.049) return; last = sim.t;
  const r = v2.target(h, 'S2'), f = b.receiverForecasts.get(r); const est = f.estimate, lp = f.lastPicture(), c = (f as any).cache, ch = (f as any).choice;
  const p0 = f.predict(sim.t, 0); const pic: any = (f as any).picture; const pr: any = f.prior; const legs = [pr.start, ...pr.path.map((q: any) => q.p)].slice(0, 5).map((q: any) => `(${r2(q.x)},${r2(q.y)})`).join(' '); if (sim.t > 1.55 && sim.t < 1.62) console.log('PIC', JSON.stringify({ pos: pic.pos, vel: pic.vel, sampledAt: pic.sampledAt, sigP: pic.sigP, sigV: pic.sigV, acq: pic.acquiredAt }), 'carry', f.shapeCarry, 'legs', legs);
  out.push(`${r2(sim.t)} motion ${est?.motion} choice ${ch?.answer ?? '-'}/${ch?.reason ?? '-'} pic@${r2(lp?.sampledAt)} spd ${r2(lp?.speed)} est (${r2(est?.pos?.x)},${r2(est?.pos?.y)}) v(${r2(est?.vel?.x)},${r2(est?.vel?.y)}) pred0 (${r2(p0?.x)},${r2(p0?.y)}) true (${r2(r.pos.x)},${r2(r.pos.y)}) v(${r2(r.vel.x)},${r2(r.vel.y)}) route ${r.behavior?.route?.id} rstate ${r.behavior?.phase ?? r.behavior?.state ?? '-'}`); };
try { sim.run(); } catch {}
console.log(out.join('\n'));
