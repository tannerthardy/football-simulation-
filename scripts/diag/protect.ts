import { Rng } from '../../src/core/rng.js';
import { CENTER_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { goTo } from '../../src/sim/behaviors/common.js';
const rng = new Rng(1);
const SKIP = Number(process.env.SKIP ?? 0);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.5 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.5 });
const formation = FORMATION_BY_ID.gun_doubles_11;
for (let k = 0; k < SKIP; k++) rng.nextU32();
const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'), offCall: { formation, flip: false, kind: 'pass', pass: { ...PASS_BY_ID.four_verts, back: 'block' }, label: 'lab' }, defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() }) as any;
const qb = sim.qb;
qb.behavior = { kind: 'qb-hold', update: (a: any) => goTo(a, { x: 33, y: CENTER_Y }, { facing: 0, speed: 0.5 }) };
for (const d of sim.defense) console.log('D', d.slot, (d.pos.x - 40).toFixed(1), (d.pos.y - CENTER_Y).toFixed(1), d.behavior.kind);
for (const o of sim.offense) console.log('O', o.slot, (o.pos.x - 40).toFixed(1), (o.pos.y - CENTER_Y).toFixed(1), o.behavior.kind);
sim.event('snap', qb);
while (sim.t < 3.0 && sim.phase === 'live') {
  sim.tick();
  if (Math.round(sim.t * 20) % 4 === 0) {
    const coord = sim.offense.find((o: any) => o.behavior.coord)?.behavior.coord;
    const asg = coord ? [...coord.assigned.entries()].map(([b, r]: any) => `${b.slot}->${r ? r.slot : '-'}`).join(' ') : '';
    const eng = sim.engagements.map((e: any) => `${e.blocker.slot}x${e.defender.slot}[phi ${e.phi.toFixed(2)} c ${e.control.toFixed(2)} bB ${e.baseB.toFixed(2)} ${e.move}${e.helpers.length ? '+' + e.helpers.map((h: any) => h.slot).join(',') : ''}]`).join(' ');
    const f = (sl: string) => { const a = sim.slot(sl); return `${sl}(${(a.pos.x - 40).toFixed(1)},${(a.pos.y - CENTER_Y).toFixed(1)} v${a.speed.toFixed(1)})`; };
    console.log(`t=${sim.t.toFixed(2)} ${asg} | eng ${eng} | ${f('RG')} ${f('DT_S')} ${f('RT')} QB(${(qb.pos.x - 40).toFixed(1)})`);
  }
}
import { traits } from '../../src/sim/engagement.js';
for (const sl of ['LT', 'LG', 'C', 'RG', 'RT', 'DE_W', 'DT_W', 'DT_S', 'DE_S']) {
  const a = sim.slot(sl);
  const t = traits(a);
  const R = (k: string) => a.r(k).toFixed(2);
  console.log(sl.padEnd(5), a.player.position, 'kg', a.profile.massKg.toFixed(0), 'power', a.profile.power.toFixed(0), 'pad', t.pad.toFixed(2), 'bend', t.bend.toFixed(2), 'feet', t.feet.toFixed(2), 'hands', t.hands.toFixed(2), 'str', R('strength'), 'pb', R('passBlock'), 'prp', R('passRushPower'), 'prf', R('passRushFinesse'));
}
