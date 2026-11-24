// Who asks a defender for a facing off his travel after a run shed (2026-11-24). Measurement only.
// Population as Run Game's shed-recovery.mts: a run engagement ends while the carrier is short of the defender's level;
// positions by POS (regex, default LB). For his next 0.5 s at each tick, from a passive ledger stub (as dither-core):
// each pipeline stage's command (decision, containment, coverage-orientation, open-to-ball, technique-intents,
// engagement, tackle-bond, spacing, snap-guard). Per tick:
//  - his achieved velocity vs the final requested velocity (deg) and speeds;
//  - the decision's facing off the decision's travel; the final facing off the final travel;
//  - the stage that set the final facing (the first stage whose facing differs from the decision's by > 10 deg, or
//    'decision' when the decision's own facing is already off its travel by > 20 deg);
//  - behaviour class / kind, run-fit job, the decision command's facing technique label, and his body facing off his travel.
// Usage: POS=LB node --import tsx shed-facing-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const POS = new RegExp(process.env.POS ?? '^(LB|ILB|OLB|MLB)');
const r2 = (v: number) => Math.round(v * 100) / 100;
const ang = (a: number) => Math.round(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI);
const head = (v: any) => Math.atan2(v.y, v.x), sp = (v: any) => Math.hypot(v.x, v.y);
const ORDER = ['decision', 'containment', 'coverage-orientation', 'open-to-ball', 'technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard'];
const rows: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { track: [] as any[], stages: new Map<any, any>(), tech: new Map<any, any>() } : null;
    st.set(this, s);
    if (s) {
      const put = (a: any, k: string, c: any) => { if (!c?.vel) return; const m = s.stages.get(a) ?? {}; m[k] = { vel: { ...c.vel }, facing: c.facing }; s.stages.set(a, m); };
      this.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: any, _b: unknown, c: any) => { put(a, 'decision', c); s.tech.set(a, c ? facingTechnique(c)?.label ?? null : null); }
        : k === 'stage' ? (stg: string, a: any, c: any) => put(a, stg, c)
        : k === 'stageAll' ? (stg: string, I: any[]) => I.forEach((c, i) => put(this.agents[i], stg, c))
        : () => undefined });
    }
  }
  if (s) s.stages = new Map();
  const before: any[] | null = s ? this.engagements.filter((e: any) => e.type === 'run') : null;
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const carrier = bc && bc.team === sim.offense[0].team && bc !== sim.qb ? bc : null;
  const dir = sim.attackDir(sim.offense[0].team);
  for (const e of before!) if (!sim.engagements.includes(e)) {
    const d = e.defender;
    if (!carrier || sim.bond || !POS.test(d.player.position) || (d.pos.x - carrier.pos.x) * dir <= 0) continue;
    s.track.push({ d, t0: sim.t, pos: d.player.position, job: d.runFit?.kind ?? null, ticks: [] as any[] });
  }
  for (const x of s.track) {
    if (x.done) continue;
    const el = sim.t - x.t0;
    if (el > 0.5 + 1e-9) { x.done = true; continue; }
    const d = x.d, S = s.stages.get(d); if (!S?.decision) continue;
    const fin = sim.intents[d.idx], dec = S.decision;
    const finOff = fin?.facing !== undefined && sp(fin.vel) > 0.5 ? ang(fin.facing - head(fin.vel)) : null;
    const decOff = dec.facing !== undefined && sp(dec.vel) > 0.5 ? ang(dec.facing - head(dec.vel)) : null;
    let setter: string | null = null;
    if (fin?.facing !== undefined) {
      if (dec.facing !== undefined && decOff !== null && decOff > 20 && ang(fin.facing - dec.facing) <= 10) setter = 'decision';
      else for (const k of ORDER.slice(1)) { const c = S[k]; if (c?.facing !== undefined && (dec.facing === undefined || ang(c.facing - dec.facing) > 10)) { setter = k; break; } }
      setter ??= dec.facing === undefined ? 'no facing asked' : 'decision';
    }
    x.ticks.push({ el: r2(el), beh: d.behavior?.constructor?.name ?? null, kind: d.behavior?.kind ?? null, tech: s.tech.get(d) ?? null,
      vOff: sp(d.vel) > 0.3 && fin && sp(fin.vel) > 0.3 ? ang(head(d.vel) - head(fin.vel)) : null, speed: r2(sp(d.vel)), req: fin ? r2(sp(fin.vel)) : null,
      decOff, finOff, setter, bodyOffTravel: sp(d.vel) > 0.3 ? ang(d.body.facing - head(d.vel)) : null, bodyOffReq: fin?.facing !== undefined ? ang(d.body.facing - fin.facing) : null,
      engaged: !!d.engagement });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const x of s.track) { const { d, ...rest } = x; rows.push(rest); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} releases`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows })); console.log('releases', rows.length);
