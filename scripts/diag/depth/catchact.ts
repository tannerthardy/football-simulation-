/** The first tackle act on a receiver after the catch in simulated games
 * (observation only; flags from the environment): its kind (form / reach /
 * lunge / dive grasp, or a miss), the gap between bodies and the closing
 * speed at that moment, the receiver's speed, and whether he got away
 * (metrics' proxy: >= 4 yd/s 0.5 s later and >= 5 more yards). Same team
 * generation as depth/games.ts. Pairs with depth/catchbreak.py (tracking).
 * node --import tsx scripts/diag/depth/catchact.ts [--seed 101] [--games 4] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '4'));
type Row = { kind: string; gap: number; reach: number; closing: number; cs: number; ts: number; broke: boolean; after: number;
  pos: string; vmax: number; hist: { ts: number; ask: number; ahead: number; side: number; cs: number; askAlong: number; velAlong: number }[] };
const LAGS = [1.0, .6, .3];
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    let caughtAt = -1, act: (Row & { t: number; x: number }) | null = null, kept = NaN;
    // Per tick after the catch: each defender's speed, requested speed, and
    // place relative to the carrier (ahead along his heading, to the side).
    const buf: { t: number; d: Map<number, { ts: number; ask: number; ahead: number; side: number; cs: number; askAlong: number; velAlong: number }> }[] = [];
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      if (type === 'catch' && a?.team === 'O') caughtAt = sim.t;
      if (caughtAt < 0 || act || !a || !b || a.team !== 'D' || b !== sim.carrier) return;
      if (type !== 'tackle_wrap' && type !== 'missed_tackle' && !(type === 'hit' && note === 'diving tackle')) return;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, gap = Math.hypot(dx, dy) || 1;
      const closing = ((a.vel.x - b.vel.x) * dx + (a.vel.y - b.vel.y) * dy) / gap;
      const joint = [...sim.world.joints].reverse().find(j => j.kind === 'grasp' && j.a === a.body && j.b === b.body) as { origin?: string } | undefined;
      const kind = type === 'missed_tackle' ? `miss${note === 'dive' ? '-dive' : ''}` : (joint?.origin ?? type).replace(/\+.*/, '');
      const hist = LAGS.map(l => { const f = buf.find(x => x.t >= sim.t - l - 1e-9); return f?.d.get(a.idx) ?? { ts: NaN, ask: NaN, ahead: NaN, side: NaN, cs: NaN, askAlong: NaN, velAlong: NaN }; });
      act = { kind, gap, pos: a.slot.replace(/_.*/, ''), vmax: a.profile.vmax * a.speedScale, hist, reach: gap - a.profile.radius - b.profile.radius - a.profile.reach, closing, cs: b.speed, ts: a.speed, broke: false, after: 0, t: sim.t, x: b.pos.x };
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const c = sim.carrier;
      if (caughtAt >= 0 && !act && c && c.team === 'O') {
        const cs = c.speed, hx = cs > .5 ? c.vel.x / cs : sim.attackDir('O'), hy = cs > .5 ? c.vel.y / cs : 0;
        const d = new Map<number, { ts: number; ask: number; ahead: number; side: number; cs: number; askAlong: number; velAlong: number }>();
        for (const o of sim.opponents(c)) {
          const rx = o.pos.x - c.pos.x, ry = o.pos.y - c.pos.y, ask = sim.intents[o.idx]?.vel;
          d.set(o.idx, { ts: o.speed, ask: ask ? Math.hypot(ask.x, ask.y) : NaN, ahead: rx * hx + ry * hy, side: Math.abs(-rx * hy + ry * hx), cs,
            askAlong: ask ? ask.x * hx + ask.y * hy : NaN, velAlong: o.vel.x * hx + o.vel.y * hy });
        }
        buf.push({ t: sim.t, d }); if (buf.length > 40) buf.shift();
      } if (act && Number.isNaN(kept) && sim.t >= act.t + .5 - 1e-9) kept = sim.carrier ? sim.carrier.speed : 0; };
    const r = sim.run();
    if (act) {
      const a = act as Row & { t: number; x: number };
      a.after = ((sim.endSpot?.x ?? a.x) - a.x) * sim.attackDir('O');
      a.broke = (kept || 0) >= 4 && a.after >= 5;
      rows.push(a);
    }
    return r;
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`first acts after the catch: ${rows.length}, got away ${pct(rows.filter(r => r.broke).length, rows.length)}`);
for (const [band, lo, hi] of [['all', 0, 99], ['slow <3', 0, 3], ['mid 3-5.5', 3, 5.5], ['fast 5.5+', 5.5, 99]] as const) {
  const R = rows.filter(r => r.cs >= lo && r.cs < hi);
  console.log(`${band}: n ${R.length}, got away ${pct(R.filter(r => r.broke).length, R.length)}`);
  for (const k of [...new Set(R.map(r => r.kind))].sort()) {
    const K = R.filter(r => r.kind === k);
    console.log(`  ${k.padEnd(10)} ${pct(K.length, R.length).padStart(4)} got away ${pct(K.filter(r => r.broke).length, K.length).padStart(4)} | gap ${med(K.map(r => r.gap))} past reach ${med(K.map(r => r.reach))} closing ${med(K.map(r => r.closing))} carrier ${med(K.map(r => r.cs))} tackler ${med(K.map(r => r.ts))}`);
  }
}
const fast = rows.filter(r => r.cs >= 5.5);
for (const k of ['lunge', 'reach', 'form']) {
  const K = fast.filter(r => r.kind === k);
  console.log(`fast ${k} n ${K.length}: pos ${[...new Set(K.map(r => r.pos))].map(p => `${p} ${K.filter(r => r.pos === p).length}`).join(' ')} | vmax ${med(K.map(r => r.vmax))}`);
  LAGS.forEach((l, i) => console.log(`   -${l}s: tackler ${med(K.map(r => r.hist[i].ts))} asked ${med(K.map(r => r.hist[i].ask))} carrier ${med(K.map(r => r.hist[i].cs))} | along asked ${med(K.map(r => r.hist[i].askAlong))} moving ${med(K.map(r => r.hist[i].velAlong))} | tackler ahead ${med(K.map(r => r.hist[i].ahead))} side ${med(K.map(r => r.hist[i].side))}`));
}
