// What a defensive lineman's behaviour requests after he sheds on a designed run (2026-11-24). Measurement only.
// Population as Run Game's shed-recovery.mts (run/tackle-repair): a run engagement that ends while the carrier is
// still short of the defender's level; here DL only (DE/DT/NT/EDGE by position). For his next 0.5 s at 0.05 s:
//  - owner: behaviour class, and the source of the request: 'pursuit' when a pursuit trace was issued this tick
//    (chase / pursueIfLive), else 'fit' (executeRunFit's landmark), plus his run-fit tags this tick;
//  - his job (a.runFit kind / technique), commanded speed / vmax, the commanded facing off the commanded travel;
//  - the carrier: past the LOS (pursueIfLive's cue), within 2.5 yd of his gap's y (the fit's 'declared'), and the
//    angle between his command and the bearing to the carrier.
// Usage: node --import tsx dl-shed-tap.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { gapY } = await import(`${W}/src/playbook/alignment.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const deg = (a: number) => Math.round(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI);
const DL = /^(DE|DT|NT|EDGE)/;
const rows: any[] = []; const st = new WeakMap<any, any>(); const noop = () => undefined;
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.commandTraceFor = function (this: any, a: any) {
  const s = st.get(this);
  if (!s || a.team === this.offense[0].team) return undefined;
  return new Proxy({}, { get: (_o, name) => name === 'pursuit' ? () => { s.pursued.add(a.idx); } : noop });
};
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { track: [] as any[], pursued: new Set<number>() } : null; st.set(this, s); }
  const before: Set<any> | null = s ? new Set<any>(this.engagements.filter((e: any) => e.type === 'run')) : null;
  const tagsBefore = new Map<any, Set<string>>(this.defense.map((d: any) => [d, new Set<string>(d.tags ?? [])]));
  if (s) s.pursued = new Set<number>();
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const carrier = bc && bc.team === sim.offense[0].team && bc !== sim.qb ? bc : null;
  const dir = sim.attackDir(sim.offense[0].team);
  for (const e of before!) if (!sim.engagements.includes(e)) {
    const d = e.defender;
    if (!carrier || sim.bond || !DL.test(d.player.position)) continue;
    if ((d.pos.x - carrier.pos.x) * dir <= 0) continue;
    s.track.push({ d, t0: sim.t, pos: d.player.position, job: d.runFit ? { kind: d.runFit.kind, technique: d.runFit.technique ?? null } : null, ticks: [] as any[] });
  }
  for (const x of s.track) {
    if (x.done) continue;
    const el = sim.t - x.t0;
    if (el > 0.5 + 1e-9) { x.done = true; continue; }
    const d = x.d, cmd = sim.cmds?.[d.idx];
    const cv = cmd?.vel ?? { x: 0, y: 0 }, cs = Math.hypot(cv.x, cv.y);
    // Run-fit tags are added when issued and may persist: report those present, marking the ones new this tick.
    const tags = [...(d.tags ?? [])].filter((t: string) => /^fit-|^shed-|end-chase|edge-reach|run-blitz/.test(t)).map((t: string) => tagsBefore.get(d)?.has(t) ? t : `${t}*`);
    const toC = carrier ? Math.atan2(carrier.pos.y - d.pos.y, carrier.pos.x - d.pos.x) : null;
    let gy: number | null = null;
    try { if (gapY && d.runFit) gy = gapY(sim.offAlign, d.runFit.gap, d.runFit.side); } catch { gy = null; }
    x.ticks.push({ el: r2(el), beh: d.behavior?.constructor?.name ?? null, src: s.pursued.has(d.idx) ? 'pursuit' : 'fit', tags,
      cmdFrac: r2(cs / (d.profile.vmax * (d.speedScale ?? 1))), speed: r2(Math.hypot(d.vel.x, d.vel.y)),
      faceOff: cmd?.facing !== undefined && cs > 0.3 ? deg(cmd.facing - Math.atan2(cv.y, cv.x)) : null,
      bodyOff: cs > 0.3 ? deg(d.body.facing - Math.atan2(cv.y, cv.x)) : null,
      cmdToCarrier: toC !== null && cs > 0.3 ? deg(Math.atan2(cv.y, cv.x) - toC) : null,
      carrierPast: carrier ? (carrier.pos.x - sim.los) * dir > 0 : null,
      carrierInGap: carrier && gy !== null ? Math.abs(carrier.pos.y - gy) < 2.5 : null,
      carrierDist: carrier ? r2(Math.hypot(carrier.pos.x - d.pos.x, carrier.pos.y - d.pos.y)) : null, engaged: !!d.engagement });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const x of s.track) { delete x.d; rows.push(x); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} releases`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows })); console.log('releases', rows.length);
