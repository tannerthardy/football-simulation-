import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed: 2, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
const sim: any = new PlaySim(setup); sim.throwBall = () => {}; const out: string[] = []; let last = -1;
const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); if (sim.t - last >= 0.099) { last = sim.t; const a = sim.offense.find((o: any) => o.behavior?.route?.id === 'slant'); if (a) out.push(`${sim.t.toFixed(1)}:${Math.hypot(a.vel.x, a.vel.y).toFixed(1)}@${Math.round(Math.atan2(a.vel.y, a.vel.x) * 57.3)}`); } if (sim.t > 2) sim.phase = 'dead'; };
try { sim.run(); } catch {} console.log('dt', sim.dt, out.join(' '));
