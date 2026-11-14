// Where TRACK_PURSUIT's extra request turn falls under PURSUIT_COMMIT (Defense, 2026-11-14): post-catch pursuers on
// pursuit-commit.test.ts's staged set, the reference stack's on-flags, argv overrides. Per pursuer tick (intercept
// planner aimed at the catcher, request > 1 yd/s): the request turn (deg/s) by true distance band, split by the tracked
// picture's age this tick: 're-acquire' (age fell back to the loop latency this tick or the one before, from > 0.15 s),
// 'occluded' (age > 0.15 s), 'clear' (otherwise). Run with TRACK_PURSUIT=0 / 1.
//   node --import tsx scripts/diag/eyes/reacquire-turn.mts [FLAG=value ...]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const flags: Record<string, string> = JSON.parse(readFileSync(`${root}/config/reference-stack.json`, 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) process.env[k] = v === 'on' ? '1' : '0';
for (const kv of process.argv.slice(2)) { const [k, v] = kv.split('='); process.env[k] = v; }
const { Rng } = await import(`${root}/src/core/rng.js`);
const { generateTeam, pickDefense, pickOffense } = await import(`${root}/src/league/team.js`);
const { PASS_BY_ID } = await import(`${root}/src/playbook/concepts.js`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${root}/src/playbook/defense.js`);
const { FORMATION_BY_ID } = await import(`${root}/src/playbook/formations.js`);
const { PlaySim } = await import(`${root}/src/sim/playsim.js`);
const offense = generateTeam(new Rng(101), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DEF', { strength: .55 });
const q = (v: number[], p: number) => { const w = [...v].sort((a, b) => a - b); return w.length ? w[Math.floor(p * (w.length - 1))] : NaN; };
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const BANDS = ['0-3', '3-8', '8-15', '15+'], KINDS = ['clear', 're-acquire', 'occluded'];
const bandOf = (d: number) => d < 3 ? '0-3' : d < 8 ? '3-8' : d < 15 ? '8-15' : '15+';
const T: Record<string, number[]> = {}; for (const b of BANDS) for (const k of KINDS) T[`${b}|${k}`] = [];
const ageNow = new Map<string, number>();
const tr0 = (PlaySim.prototype as any).track;
(PlaySim.prototype as any).track = function (this: any, o: any, t: any, s = 1, g = false) {
  const r = tr0.call(this, o, t, s, g); if (o.team !== t.team) ageNow.set(`${o.idx}>${t.idx}`, r.age ?? 0); return r; };
for (const pass of ['stick', 'slant_flat', 'curl_flat', 'smash']) for (let seed = 1; seed <= 4; seed++) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 't' },
    los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
  const rec = new Map<any, any>(), prev = new Map<any, { h: number; age: number; age2: number }>(); let caught = false;
  const tc0 = sim.commandTraceFor.bind(sim);
  sim.commandTraceFor = (a: unknown) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: unknown, d: any) => { if (d?.kind === 'intercept') rec.set(a, t); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
  while (sim.phase !== 'dead' && sim.t < 12) {
    const wasAir = sim.ball.kind === 'air'; rec.clear(); ageNow.clear();
    sim.tick();
    const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (wasAir && !caught && c && c.team === 'O' && c !== sim.qb) caught = true;
    if (!caught || !c) { prev.clear(); continue; }
    for (const [a, target] of rec) {
      const v = sim.intents[a.idx].vel; if (target !== c || Math.hypot(v.x, v.y) < 1) { prev.delete(a); continue; }
      const age = ageNow.get(`${a.idx}>${c.idx}`) ?? 0, h = Math.atan2(v.y, v.x), p = prev.get(a);
      prev.set(a, { h, age, age2: p?.age ?? age });
      if (!p) continue;
      const kind = age > 0.15 + 1e-9 ? 'occluded' : (p.age > 0.15 + 1e-9 || p.age2 > 0.15 + 1e-9) ? 're-acquire' : 'clear';
      T[`${bandOf(Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y))}|${kind}`].push(ang(h, p.h) / sim.dt);
    }
    for (const a of [...prev.keys()]) if (!rec.has(a)) prev.delete(a);
  }
}
console.log(`TRACK_PURSUIT=${process.env.TRACK_PURSUIT} PURSUIT_COMMIT=${process.env.PURSUIT_COMMIT}`);
for (const b of BANDS) console.log(`${b.padEnd(5)} ` + KINDS.map((k) => { const v = T[`${b}|${k}`]; return `${k} n ${String(v.length).padStart(4)} p50 ${q(v, .5).toFixed(1).padStart(5)} mean ${(v.reduce((x, y) => x + y, 0) / Math.max(1, v.length)).toFixed(1).padStart(5)}`; }).join(' | '));
