// Commitment (Integration for the owner, 2026-11-12: our players re-request movement at a different angle nearly
// every tick, where real players go and stay with it). Measurement only, from the engine's own requests, every tick
// of every scrimmage play, per player, by controller (the behaviour's kind, grouped):
//  (1) request direction changes > 20 deg between consecutive ticks (both requests > 1 yd/s), per second of that
//      controller's moving time; behaviour-kind changes and engagement-partner changes per second;
//  (3) dither: a direction change undone within 0.3 s (a later request back within 20 deg of the one before the
//      change), against sustained re-decisions;
//  (4) cost: the change in achieved speed over the next tick after a request change, against ticks without one, in
//      the same controller (mean, yd/s per tick, and the share losing more than 0.2 yd/s).
// The achieved-heading side, ours against NFL tracking, is scripts/diag/pass-operators/heading-change.py.
// usage: [flags] node --import tsx scripts/diag/effective-mass/commitment-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const GROUP: Record<string, string> = { 'qb-pass': 'QB', 'qb-handoff': 'QB', mesh: 'QB', 'pa-fake': 'QB', 'pass-pro': 'block', 'run-block': 'block',
  'screen-block': 'block', 'downfield-block': 'block', 'block-look': 'block', rush: 'rush', blitz: 'rush', zone: 'coverage', man: 'coverage',
  pursuit: 'pursuit', 'run-fit': 'run fit', track: 'pursuit', route: 'route', carrier: 'carrier', 'scramble-ball': 'loose ball' };
type Acc = { time: number; changes: number; dither: number; kindChanges: number; partnerChanges: number; dvChange: number[]; dvSteady: number[] };
const acc: Record<string, Acc> = {};
const get = (k: string) => acc[k] ??= { time: 0, changes: 0, dither: 0, kindChanges: 0, partnerChanges: 0, dvChange: [], dvSteady: [] };
const ang = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180 / Math.PI + 540) % 360 - 180);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const prev = new Map<any, { req: any; kind: string; partner: any; speed: number; changed: boolean }>();
    const pending = new Map<any, { before: any; t: number; group: string }[]>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (sim.phase !== 'live') return;
      for (const a of sim.agents) {
        const it = sim.intents?.[a.idx]; if (!it) continue;
        const req = { x: it.vel.x, y: it.vel.y }, rs = Math.hypot(req.x, req.y);
        const k = a.behavior?.kind ?? 'none', g = GROUP[k] ?? k;
        const partner = a.engagement ? (a.engagement.blocker === a ? a.engagement.defender : a.engagement.blocker) : null;
        const speed = Math.hypot(a.vel.x, a.vel.y), p = prev.get(a);
        if (p) {
          const A = get(g);
          if (p.kind !== k) A.kindChanges++;
          if (p.partner !== partner && (p.partner || partner)) A.partnerChanges++;
          // The speed change over this tick, after the previous tick's request (changed or not).
          (p.changed ? A.dvChange : A.dvSteady).push(speed - p.speed);
          let changed = false;
          if (rs > 1 && Math.hypot(p.req.x, p.req.y) > 1) {
            A.time += sim.dt;
            if (ang(p.req, req) > 20) {
              changed = true; A.changes++;
              const list = pending.get(a) ?? []; list.push({ before: p.req, t: sim.t, group: g }); pending.set(a, list);
            }
            // Dither: a request back within 20 deg of the one before an earlier change, within 0.3 s of it.
            const list = pending.get(a);
            if (list) for (let i = list.length - 1; i >= 0; i--) {
              const c = list[i];
              if (sim.t - c.t > 0.3 + 1e-9) { list.splice(i, 1); continue; }
              if (sim.t > c.t && ang(c.before, req) <= 20) { get(c.group).dither++; list.splice(i, 1); }
            }
          }
          prev.set(a, { req, kind: k, partner, speed, changed });
        } else prev.set(a, { req, kind: k, partner, speed, changed: false });
      }
    };
    return sim.run(); } } });
}
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log('controller      moving s | direction changes >20 deg /s | dither (undone in 0.3 s) | behaviour changes /s | partner changes /s | speed change next tick: after a change / steady (lose > 0.2: after / steady)');
for (const [k, A] of Object.entries(acc).sort((a, b) => b[1].time - a[1].time)) {
  if (A.time < 5) continue;
  console.log(`${k.padEnd(14)} ${A.time.toFixed(0).padStart(8)} | ${(A.changes / A.time).toFixed(2).padStart(6)} | ${pc(A.dither, A.changes).padStart(4)} | ${(A.kindChanges / A.time).toFixed(2)} | ${(A.partnerChanges / A.time).toFixed(2)}`
    + ` | ${mean(A.dvChange).toFixed(3)} / ${mean(A.dvSteady).toFixed(3)} (${pc(A.dvChange.filter((v) => v < -0.2).length, A.dvChange.length)} / ${pc(A.dvSteady.filter((v) => v < -0.2).length, A.dvSteady.length)})`);
}
