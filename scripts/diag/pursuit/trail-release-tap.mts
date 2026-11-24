// TRAIL_LEVERAGE release trace (2026-11-24), measurement only: when a trail man lets his lead go, where is the lead?
// Needs a build with trailStateOf (defense/trail-leverage). Each tick, for each defender whose trail lead was set on the
// previous tick and is cleared now: the lead's true distance to the carrier, whether the lead is down, whether he is in
// the tackle bond, whether the carrier is past him along the carrier's travel, and what the lead does next (his next
// attempt event within 1.0 s: made / missed / none). Usage: TRAIL_LEVERAGE=1 node --import tsx trail-release-tap.mts GAMES OUT.json [FIRST]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { trailStateOf } = (await import(`${W}/src/sim/behaviors/common.ts`)) as any;
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const rows: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { prev: new Map<any, any>(), open: [] as any[], seen: this.events.length } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (!['missed_tackle', 'tackle_wrap'].includes(e.type) || (e.type === 'tackle_wrap' && e.note === 'assist')) continue;
    for (const o of s.open) if (!o.next && sim.agents[e.a] === o.lead && sim.t - o.t <= 1.0) o.next = e.type === 'tackle_wrap' ? 'made' : 'missed';
  }
  for (const d of sim.defense) {
    const now = trailStateOf(d)?.lead ?? null, was = s.prev.get(d) ?? null;
    if (was && !now && c && c.team === sim.offense[0].team) {
      const cs = Math.hypot(c.vel.x, c.vel.y), ux = cs > 1 ? c.vel.x / cs : 0, uy = cs > 1 ? c.vel.y / cs : 0;
      const along = (was.pos.x - c.pos.x) * ux + (was.pos.y - c.pos.y) * uy;
      const o = { t: sim.t, lead: was, next: null as string | null, rec: { leadDist: r2(Math.hypot(was.pos.x - c.pos.x, was.pos.y - c.pos.y)), leadDown: !!was.isDown?.(sim.t),
        leadInBond: !!sim.bond?.tacklers?.includes(was), carrierPast: cs > 1 ? along < -0.5 : null, trailDist: r2(Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y)) } };
      s.open.push(o);
    }
    s.prev.set(d, now);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const o of s.open) rows.push({ ...o.rec, leadNext: o.next ?? 'none within 1 s' });
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} releases`); }
writeFileSync(OUT, JSON.stringify(rows)); console.log('releases', rows.length);
const q = (v: number[]) => { const y = v.filter(x => x !== null).sort((a, b) => a - b); return y.length ? y[Math.floor(y.length / 2)] : null; };
const C = (k: string) => rows.reduce((m: any, r: any) => (m[String(r[k])] = (m[String(r[k])] ?? 0) + 1, m), {});
console.log('lead distance to carrier at release p50', q(rows.map(r => r.leadDist)), '| <= 1.2 yd', rows.filter(r => r.leadDist <= 1.2).length,
  '| lead down', C('leadDown'), '| lead in bond', C('leadInBond'), '| carrier past the lead', C('carrierPast'), '| lead next', C('leadNext'), '| trail distance p50', q(rows.map(r => r.trailDist)));
