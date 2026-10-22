/** The zone defender nearest the target at the throw when the ball is
 * thrown near him (target's spot at the ball's arrival within 4 yd of him at
 * the throw), observation only: his zone and depth past his landmark, his
 * velocity toward that point, what he asked for 0.1 s before the throw, and
 * the target's speed and depth relative to him. Pairs with
 * depth/breakpoint.py (tracking and sim alike).
 * node --import tsx scripts/diag/depth/dropprobe.ts [--seed 101] [--games 3] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '3'));
type Row = { zone: string; style: string; pastLm: number; toward: number; speed: number; askBefore: number; askToward: number; rSpeed: number; rDepthRel: number; rToward: number };
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    let prev: { ask: { x: number; y: number }[] } | null = null;
    let snap: { d: Agent; r: Agent; ask: { x: number; y: number }; pos: { x: number; y: number }; vel: { x: number; y: number }; rpos: { x: number; y: number }; rvel: { x: number; y: number } } | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.throwAt < 0) { prev = { ask: sim.intents.map(i => ({ ...(i?.vel ?? { x: 0, y: 0 }) })) }; return; }
      if (!snap && sim.ball.kind === 'air') {
        const r = (sim.ball as { target?: Agent | null }).target;
        if (!r) { snap = {} as never; return; }
        const d = sim.defense.reduce((p, q) => Math.hypot(q.pos.x - r.pos.x, q.pos.y - r.pos.y) < Math.hypot(p.pos.x - r.pos.x, p.pos.y - r.pos.y) ? q : p);
        snap = { d, r, ask: prev?.ask[d.idx] ?? { x: NaN, y: NaN }, pos: { ...d.pos }, vel: { ...d.vel }, rpos: { ...r.pos }, rvel: { ...r.vel } };
      }
      if (snap && snap.d && sim.ball.kind !== 'air' && !(snap as { done?: boolean }).done) {
        (snap as { done?: boolean }).done = true;
        const { d, r } = snap, b = d.behavior as { kind?: string; zone?: string; style?: string; recordedLandmark?: () => { x: number; y: number } };
        if (b?.kind !== 'zone') return;
        const cp = r.pos, gx = cp.x - snap.pos.x, gy = cp.y - snap.pos.y, n = Math.hypot(gx, gy);
        if (n >= 4) return;
        const dir = sim.attackDir('O'), lm = b.recordedLandmark?.();
        const u = { x: gx / (n || 1), y: gy / (n || 1) };
        const rs = Math.hypot(snap.rvel.x, snap.rvel.y);
        rows.push({ zone: b.zone ?? '?', style: b.style ?? '?', pastLm: lm ? (snap.pos.x - lm.x) * dir : NaN,
          toward: snap.vel.x * u.x + snap.vel.y * u.y, speed: Math.hypot(snap.vel.x, snap.vel.y),
          askBefore: Math.hypot(snap.ask.x, snap.ask.y), askToward: snap.ask.x * u.x + snap.ask.y * u.y,
          rSpeed: rs, rDepthRel: (snap.rpos.x - snap.pos.x) * dir, rToward: rs > .3 ? -(snap.rvel.x * u.x + snap.rvel.y * u.y) : 0 });
      }
    };
    return sim.run();
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`zone defender, ball thrown within 4 yd of him: n ${rows.length}`);
console.log(`  zones ${[...new Set(rows.map(r => r.zone))].map(z => `${z} ${rows.filter(r => r.zone === z).length}`).join(', ')} | styles ${[...new Set(rows.map(r => r.style))].map(z => `${z} ${rows.filter(r => r.style === z).length}`).join(', ')}`);
console.log(`  at the throw: speed ${med(rows.map(r => r.speed))}, toward the point ${med(rows.map(r => r.toward))} | 0.1 s before he asked ${med(rows.map(r => r.askBefore))} yd/s, toward the point ${med(rows.map(r => r.askToward))}`);
console.log(`  depth past his landmark ${med(rows.map(r => r.pastLm))} yd | receiver speed ${med(rows.map(r => r.rSpeed))}, depth relative to him ${med(rows.map(r => r.rDepthRel))} (+ deeper), receiver moving toward the point ${med(rows.map(r => r.rToward))}`);
