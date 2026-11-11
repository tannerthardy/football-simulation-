// Defenders within 6 yd of the catcher at the catch, from 0.6 s before to 0.5 s after: requested vs achieved speed
// (share of vmax and speed along the line to the catcher), heading (cos to the catcher), behaviour/job/sub, and the
// hand-over: the tick his request first points at the catcher (cos > 0.7) and ticks of 'no drive' (request < 1 yd/s).
// League-sampled games (sim-export identities). usage: OUT=out/catch-window.json node --import tsx scripts/diag/defense-yards/catch-window.mts [games]  (records cmd, final intent, achieved, posture; analysis is per-tick JSON)
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, withIdentity } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const games = Number(process.argv[2] ?? 8);
const S = new WeakMap<any, any>(); const out: any[] = [];
const t0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  t0.call(this); const sim = this;
  let s = S.get(sim); if (!s) { s = { hist: new Map<any, any[]>(), catchT: -1, catcher: null, done: false }; S.set(sim, s); }
  if (s.done) return;
  const c = sim.carrier;
  if (s.catchT < 0 && c && c !== sim.qb && c.team === 'O' && sim.offCall?.kind !== 'run' && sim.ball?.kind === 'held') { s.catchT = sim.t; s.catcher = c; }
  const ref = s.catcher ?? (sim.ball?.kind === 'air' ? null : null);
  for (const d of sim.defense) {
    const cmd = sim.cmds[d.idx]; const b = d.behavior;
    const tgt = s.catcher ?? null;
    const row: any = { t: sim.t, kind: b?.kind, job: b?.job ?? null, sub: b?.sub?.constructor?.name ?? null,
      req: cmd?.vel ? Math.hypot(cmd.vel.x, cmd.vel.y) : 0, ach: Math.hypot(d.vel.x, d.vel.y), vmax: d.profile.vmax,
      reqv: cmd?.vel ? { ...cmd.vel } : { x: 0, y: 0 }, intv: sim.intents?.[d.idx]?.vel ? { ...sim.intents[d.idx].vel } : null, intPost: sim.intents?.[d.idx]?.posture ?? null, cmdPost: (cmd as any)?.posture ?? null, post: d.body.support?.posture ?? null, cut: (cmd as any)?.cutSkill ?? null, spd: (cmd as any)?.speed ?? null, achv: { ...d.vel }, pos: { ...d.pos }, ball: sim.ball?.kind, eng: !!d.engagement };
    const h = s.hist.get(d) ?? []; h.push(row); if (h.length > 60) h.shift(); s.hist.set(d, h);
    if (s.catchT >= 0) { (row as any).afterCatch = true; }
  }
  if (s.catchT >= 0 && sim.t - s.catchT >= 0.5 - 1e-9) {
    const c0 = s.catcher;
    for (const d of sim.defense) {
      const h = s.hist.get(d)!; const at = h.find((r: any) => Math.abs(r.t - s.catchT) < 1e-6) ?? h[h.length - 6];
      if (!at) continue;
      out.push({ catchT: s.catchT, slot: d.slot, rows: h.map((r: any) => ({ ...r, rel: +(r.t - s.catchT).toFixed(2) })), catcher: c0.idx });
    }
    s.done = true;
  }
};
// need catcher positions over the window: record catcher track separately
const CT = new WeakMap<any, any[]>();
const t1 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  t1.call(this); const sim = this; const s = S.get(sim);
  const arr = CT.get(sim) ?? []; CT.set(sim, arr);
  // track every eligible receiver; resolve the catcher afterwards
  arr.push({ t: sim.t, o: sim.offense.map((o: any) => ({ idx: o.idx, x: o.pos.x, y: o.pos.y, vx: o.vel.x, vy: o.vel.y })) });
  if (arr.length > 60) arr.shift();
  if (s?.done && !s.flushed) { s.flushed = true;
    for (const rec of out.filter(r => r.catchT === s.catchT && !r.track)) rec.track = arr.map((f: any) => ({ t: f.t, rel: +(f.t - s.catchT).toFixed(2), ...f.o.find((o: any) => o.idx === rec.catcher) })); }
};
const rng = new Rng(101); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(withIdentity(home, 101 + g), withIdentity(away, 101 + g), { seed: 101 + g, record: false });
const fs = await import('node:fs'); fs.writeFileSync(process.env.OUT ?? 'out/catchwin.json', JSON.stringify(out));
console.log('defender windows', out.length);
