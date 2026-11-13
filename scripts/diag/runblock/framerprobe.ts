/** Blocked line defenders framing an inside-run crease: requested against
 * achieved (observation only; flags from the environment). At the tick the
 * carrier crosses the line, the nearest line defender on each side within
 * 1.5 yd of the carrier's depth frames the hole (creasewho.py's framer).
 * For framers engaged then, over the last 1.0 s: mean lateral velocity toward
 * the hole requested (his intent) and achieved, the share of ticks working
 * off (a shed attempt held), and of ticks with the carrier declared to him;
 * plus his blocker's lateral velocity. Rows by run result (<10, 10+).
 * node --import tsx scripts/diag/runblock/framerprobe.ts [--seed 301] [--games 2] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '301')), games = Number(arg('--games', '2'));
const INSIDE = new Set(['insideZone', 'splitZone', 'duo', 'power', 'counter', 'trap']);
type Sample = { t: number; y: number; vy: number; ivy: number; ivx: number; engaged: boolean; blockerVy: number; shed: boolean; declared: boolean; workOff: boolean; helpers: number; control: number; tan: number; steer: number; push: number };
type Row = { off: number; req: number; got: number; blk: number; shed: number; yards: number; slot: string; declared: number; workOff: number; helped: number; control: number; tan: number; steer: number; push: number; ivx: number };
const rows: Row[] = [];
let runs = 0;
const hooks = {
  playResult: (sim: PlaySim) => {
    const concept = sim.offCall.run?.scheme;
    if (sim.isPass || !concept || !INSIDE.has(concept)) return sim.run();
    const hist = new Map<Agent, Sample[]>();
    const seen = new Map<Agent, { declared: boolean; workOff: boolean; t: number }>();
    runContactObservers.set(sim, (rep, phase, data) => {
      if (phase === 'defender-movement') seen.set(rep.defender, { declared: !!data.declared, workOff: !!data.workOff, t: sim.t });
    });
    type Found = Array<{ d: Agent; hole: number; t: number }>;
    let found: Found | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const d of sim.defense) {
        const h = hist.get(d) ?? [];
        const e = d.engagement;
        const ix = (sim.intents[d.idx]?.vel.x ?? 0) * -sim.attackDir('O');
        h.push({ t: sim.t, y: d.pos.y, vy: d.vel.y, ivy: sim.intents[d.idx]?.vel.y ?? 0, ivx: ix, engaged: !!e,
          blockerVy: e ? e.blocker.vel.y : 0, shed: d.tags.has('shed-attempt'), declared: !!(e && seen.get(d)?.declared), workOff: !!(e && seen.get(d)?.workOff), helpers: e ? e.helpers.length : 0,
          control: e ? e.control : 0, tan: e?.hands?.tangentForce ?? 0, steer: e?.hands?.steer ?? 0, push: e?.hands?.push ?? 0 });
        if (h.length > 200) h.shift();
        hist.set(d, h);
      }
      const c = sim.carrier;
      if (found || !c || c.team !== 'O' || c === sim.qb || (c.pos.x - sim.los) * sim.attackDir('O') < 0) return;
      found = [];
      const near = sim.defense.filter(d => Math.abs(d.pos.x - c.pos.x) <= 1.5 && Math.abs(d.pos.y - c.pos.y) <= 8);
      for (const s of [-1, 1]) {
        const side = near.filter(d => (d.pos.y - c.pos.y) * s > 0);
        if (!side.length) continue;
        const d = side.reduce((p, q) => Math.abs(q.pos.y - c.pos.y) < Math.abs(p.pos.y - c.pos.y) ? q : p);
        // Line defenders only (0-2 yd past the line at the snap), engaged now.
        const h0 = hist.get(d)!;
        if (!d.engagement || !h0.length) continue;
        found.push({ d, hole: c.pos.y, t: sim.t });
      }
    };
    const r = sim.run();
    runs++;
    for (const f of (found as Found | null) ?? []) {
      const h = hist.get(f.d)!.filter(s => s.t > f.t - 1.0 && s.t <= f.t);
      if (!h.length) continue;
      const toward = (s: Sample) => Math.sign(f.hole - s.y);
      const mean = (g: (s: Sample) => number) => h.reduce((a, s) => a + g(s), 0) / h.length;
      rows.push({ off: Math.abs(f.d.pos.y - f.hole), req: mean(s => s.ivy * toward(s)), got: mean(s => s.vy * toward(s)),
        blk: mean(s => s.blockerVy * toward(s)), shed: mean(s => s.shed ? 1 : 0), yards: r.yards, slot: f.d.slot, declared: mean(s => s.declared ? 1 : 0), workOff: mean(s => s.workOff ? 1 : 0),
        helped: mean(s => s.helpers > 0 ? 1 : 0), control: mean(s => s.control), tan: mean(s => Math.abs(s.tan)), steer: mean(s => s.steer),
        push: mean(s => s.push), ivx: mean(s => s.ivx) });
    }
    return r;
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`inside runs ${runs}, engaged framers ${rows.length}`);
for (const [name, R] of [['<10', rows.filter(r => r.yards < 10)], ['10+', rows.filter(r => r.yards >= 10)]] as const) {
  if (!R.length) continue;
  console.log(`  ${name}: n ${R.length} | off the hole ${med(R.map(r => r.off))} yd | toward the hole over the last 1 s: requested ${med(R.map(r => r.req))}, achieved ${med(R.map(r => r.got))}, his blocker ${med(R.map(r => r.blk))} yd/s | has tried a shed ${med(R.map(r => r.shed))} of ticks`);
  console.log(`      declared ${med(R.map(r => r.declared))}, working off ${med(R.map(r => r.workOff))} of ticks | doubled ${med(R.map(r => r.helped))} of ticks | blocker hand control ${med(R.map(r => r.control))} | hand tangent force ${med(R.map(r => r.tan))} of steer limit ${med(R.map(r => r.steer))}, push limit ${med(R.map(r => r.push))} | his depth request (+ = into the blocker) ${med(R.map(r => r.ivx))} yd/s`);
}
