// Defense: per-tick trace of named defenders on named plays (game seed / scrimmage play no / slot), Run Game's ahead-man
// numbering (teams from Rng(201), games in order, playNo counted on run() of non-compile sims with both calls).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const CM: any = await import(`${W}/src/sim/behaviors/common.ts`);
const ARM = process.env.GA_ARM; // '0' | '1': GATHER_ANGLE on the target plays only
const TARGETS: [number, number, string, string][] = JSON.parse(process.argv[2]); const OUT = process.argv[3];
const LAST = Math.max(...TARGETS.map(t => t[0]));
const r2 = (v: number) => Math.round(v * 100) / 100;
let gameSeed = 0, playNo = 0; const out: any[] = [];
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run, ev0 = proto.event;
proto.event = function (this: any, type: string, a: any, b: any, note?: string) { const rec = active.get(this); if (rec && rec.c && b === rec.c && /tackle_wrap|missed_tackle|broken_tackle/.test(type)) (rec.ev ??= []).push(`${a?.slot}:${type}@${r2(this.t - rec.t0)}`); return ev0.call(this, type, a, b, note); };
const active = new WeakMap<any, any>();
proto.run = function (this: any) {
  if (!compilingPlan() && this.offCall && this.defCall) {
    playNo++;
    const ts = TARGETS.filter(t => t[0] === gameSeed && t[1] === playNo);
    if (ts.length) {
      const rec: any = { seed: gameSeed, play: playNo, cls: ts.map(t => t[3]), slots: ts.map(t => t[2]), off: this.offCall?.label, def: this.defCall?.label, frames: [] as any[], t0: -1 };
      active.set(this, rec);
      const sim = this; const trace0 = sim.commandTraceFor?.bind(sim);
      rec.ptr = new Map<any, string>();
      sim.commandTraceFor = (a: any) => { const inner = trace0 ? trace0(a) : undefined; return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
        ? (t: any, d: any) => { if (rec.slots.includes(a.slot)) rec.ptr.set(a, (rec.ptr.get(a) ?? '') + `[${d?.kind}${d?.planner ? ':' + d.planner : ''}${d?.requests ? ':' + d.requests.map((q: any) => q.stage).join('>') : ''}${d?.gather !== undefined ? ':g' + r2(d.gather) : ''}${d?.leverage !== undefined ? ':lev' + r2(d.leverage) : ''}${d?.offset !== undefined ? ':off' + r2(d.offset) : ''}${d?.kind === 'intercept' ? `:ipT${r2(d.prediction?.t ?? NaN)}:bias${r2(d.timeBias ?? NaN)}:bt${r2(d.biasedTime ?? NaN)}:fp${r2(d.forecastPoint?.x ?? NaN)},${r2(d.forecastPoint?.y ?? NaN)}:sp${r2(d.steeringPoint?.x ?? NaN)},${r2(d.steeringPoint?.y ?? NaN)}:${d.prediction?.estimate?.status ?? ''}` : ''}]`); return o?.pursuit?.(t, d); }
        : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
    }
  }
  const isT = !!active.get(this); if (isT && ARM !== undefined) CM.setGatherAngle(ARM === '1');
  const r = run.call(this);
  if (isT && ARM !== undefined) CM.setGatherAngle(false);
  const rec = active.get(this); if (rec) { delete rec.ptr; rec.out = this.outcome?.kind ?? null; rec.yac = rec.c && rec.x0 !== undefined ? r2(((this.endSpot ? this.endSpot.x : rec.c.pos.x) - rec.x0) * this.attackDir(rec.c.team)) : null; out.push(rec); }
  return r;
};
proto.tick = function (this: any) {
  const rec = active.get(this);
  if (rec) rec.ptr.clear();
  const res = tick.call(this);
  if (!rec) return res;
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (rec.t0 < 0 && c && c.team === this.offense[0].team && c !== this.qb && this.phase === 'live') { rec.t0 = this.t; rec.car = c.slot; rec.c = c; rec.x0 = c.pos.x; }
  if (rec.t0 >= 0 && rec.c && this.phase === 'live' && rec.frames.length < 80) {
    const C = rec.c, dir = this.attackDir(C.team);
    const ds = this.defense.filter((d: any) => rec.slots.includes(d.slot)).map((d: any) => {
      const s = this.see(d, C), dd = Math.hypot(C.pos.x - d.pos.x, C.pos.y - d.pos.y), v = Math.hypot(d.vel.x, d.vel.y), cmd = this.intents[d.idx]?.vel;
      const ahead = ((d.pos.x - C.pos.x) * dir);
      return `${d.slot} ${d.behavior?.kind ?? '-'} d${r2(dd)} ah${r2(ahead)} v${r2(v)}/${r2(d.profile.vmax * (d.speedScale ?? 1))} cmd${cmd ? r2(Math.hypot(cmd.x, cmd.y)) + '@' + Math.round(Math.atan2(cmd.y, cmd.x) * 57.3) : '-'} vel@${Math.round(Math.atan2(d.vel.y, d.vel.x) * 57.3)} carry${s.carrying === true ? 1 : 0} age${r2(s.age ?? -1)} ${d.engagement ? 'ENG ' : ''}${[...d.tags].filter((x: string) => /gather|open-field|catch|trail|drive|look/.test(x)).join('/')} ${rec.ptr.get(d) ?? ''}`;
    });
    rec.frames.push(`t${r2(this.t - rec.t0)} C(${r2(C.pos.x)},${r2(C.pos.y)}) cv${r2(Math.hypot(C.vel.x, C.vel.y))}@${Math.round(Math.atan2(C.vel.y, C.vel.x) * 57.3)} | ${ds.join(' | ')}`);
  }
  return res;
};
const rng = new Rng(201);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let s = 201; s <= LAST; s++) { gameSeed = s; playNo = 0; simulateGame(home, away, { seed: s }); console.error(`game ${s} done, ${out.length} recorded`); }
for (const r of out) delete r.c;
writeFileSync(OUT, JSON.stringify(out, null, 1));
