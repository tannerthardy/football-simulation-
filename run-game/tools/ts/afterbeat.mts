import { Rng } from '/home/user/fs-develop/src/core/rng.js';
import { simulateGame } from '/home/user/fs-develop/src/game/game.js';
import { generateTeam } from '/home/user/fs-develop/src/league/team.js';
type R = { gap: number[]; bs: number[]; ds: number[]; back: number[]; ask: number[] };
const rows: R[] = [];
const hooks = { playResult: (sim: any) => {
  if (!sim.isPass) return sim.run();
  const open: { b: any; d: any; t0: number; r: R }[] = [];
  const ev = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => { ev(type, a, b, note);
    if (type === 'shed' && note === 'pass: turned the corner' && sim.throwAt < 0 && /^(DE|EDGE|OLB|LB)/.test(a.slot))
      open.push({ b, d: a, t0: sim.t, r: { gap: [], bs: [], ds: [], back: [], ask: [] } }); };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const o of [...open]) { const s = sim.t - o.t0;
      for (const [i, l] of [0.1, 0.3, 0.5].entries()) if (o.r.gap[i] === undefined && s >= l - 1e-9) {
        const b = o.b, d = o.d, sp = b.speed;
        o.r.gap[i] = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - b.profile.radius - d.profile.radius;
        o.r.bs[i] = sp; o.r.ds[i] = d.speed;
        o.r.back[i] = sp > .5 ? (Math.cos(b.body.facing) * b.vel.x + Math.sin(b.body.facing) * b.vel.y) / sp : NaN;
        const it = sim.intents[b.idx]; o.r.ask[i] = it ? Math.hypot(it.vel.x, it.vel.y) : NaN; }
      if (s >= .5 || sim.throwAt >= 0) { rows.push(o.r); open.splice(open.indexOf(o), 1); } } };
  return sim.run(); } };
for (const seed of [101, 102]) { const rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never); }
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`edge rushers past the corner before the throw: ${rows.length}`);
[0.1, 0.3, 0.5].forEach((l, i) => console.log(`+${l}s: gap to tackle ${med(rows.map(r => r.gap[i]))} yd | tackle speed ${med(rows.map(r => r.bs[i]))} (asked ${med(rows.map(r => r.ask[i]))}), rusher ${med(rows.map(r => r.ds[i]))} | tackle moving with facing (cos) ${med(rows.map(r => r.back[i]))}`));
