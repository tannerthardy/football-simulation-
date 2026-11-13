// QB_BODY_SEEN's pursuit regression (Defense, 2026-11-13): pursuit-commit.test.ts's staged set (stick, slant_flat,
// curl_flat, smash x seeds 1-4, nickel over, cover 3 / cover 1), reference stack on-flags, PURSUIT_COMMIT on. For each
// pursuer tick (intercept planner fired, request > 1 yd/s): the request heading turn (deg/s), split before / after the
// catch; per defender the time he first keys the arm ('readArm') relative to the release, and the time his flight
// acquisition shows. Run with QB_BODY_SEEN=0 / 1 as argv overrides.
//   node --import tsx scripts/diag/eyes/body-seen-pursuit.mts [FLAG=value ...]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const flags: Record<string, string> = JSON.parse(readFileSync(`${root}/config/reference-stack.json`, 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
for (const kv of process.argv.slice(2)) { const [k, v] = kv.split('='); process.env[k] = v; }
const { Rng } = await import(`${root}/src/core/rng.js`);
const { generateTeam, pickDefense, pickOffense } = await import(`${root}/src/league/team.js`);
const { PASS_BY_ID } = await import(`${root}/src/playbook/concepts.js`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${root}/src/playbook/defense.js`);
const { FORMATION_BY_ID } = await import(`${root}/src/playbook/formations.js`);
const { PlaySim } = await import(`${root}/src/sim/playsim.js`);
const offense = generateTeam(new Rng(101), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DEF', { strength: .55 });
const q = (v: number[], p: number) => { const w = [...v].sort((a, b) => a - b); return w.length ? w[Math.floor(p * (w.length - 1))] : NaN; };
const pre: number[] = [], post: number[] = [], keyT: number[] = []; const band: Record<string, number[]> = { '0-3': [], '3-6': [], '6-15': [], '15+': [] }; const yac: number[] = []; const near6: number[] = [], near10: number[] = []; let plays = 0, catches = 0, kinds: Record<string, number> = {};
for (const pass of ['stick', 'slant_flat', 'curl_flat', 'smash']) for (let seed = 1; seed <= 4; seed++) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 't' },
    los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
  plays++;
  const meet = new Set<any>(); const head = new Map<any, number>(); let caughtAt: number | null = null, release: number | null = null;
  const keyed = new Map<any, number>();
  const tc0 = sim.commandTraceFor.bind(sim);
  sim.commandTraceFor = (a: unknown) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: unknown, d: any) => { if (d?.kind === 'intercept') meet.add(a); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
  while (sim.phase !== 'dead' && sim.t < 12) {
    const wasAir = sim.ball.kind === 'air'; meet.clear();
    sim.tick();
    if (release === null && sim.ball.kind === 'air') release = sim.t;
    const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (wasAir && caughtAt === null && c && c.team === 'O' && c !== sim.qb) { caughtAt = sim.t; catches++;
      near6.push(sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 6).length);
      near10.push(sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 10).length); }
    for (const d of sim.defense) if (!keyed.has(d) && d.tags.has('readArm')) keyed.set(d, sim.t);
    for (const a of meet) {
      const v = sim.intents[a.idx].vel; if (Math.hypot(v.x, v.y) < 1) { head.delete(a); continue; }
      kinds[a.behavior?.kind ?? '?'] = (kinds[a.behavior?.kind ?? '?'] ?? 0) + 1;
      const h = Math.atan2(v.y, v.x), p = head.get(a);
      const turn = p !== undefined ? Math.abs(((h - p) * 180 / Math.PI + 540) % 360 - 180) / sim.dt : null;
      if (turn !== null) (caughtAt === null ? pre : post).push(turn);
      if (turn !== null && caughtAt !== null && sim.ball.kind === 'held') { const c = sim.ball.carrier, dd = Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y);
        band[dd < 3 ? '0-3' : dd < 6 ? '3-6' : dd < 15 ? '6-15' : '15+'].push(turn); }
      head.set(a, h);
    }
    for (const a of [...head.keys()]) if (!meet.has(a)) head.delete(a);
  }
  if (release !== null) for (const t of keyed.values()) keyT.push(t - release);
  if (caughtAt !== null) yac.push(sim.t - caughtAt);
}
console.log(`plays ${plays} catches ${catches}`);
console.log(`turn before catch: n ${pre.length} p50 ${q(pre, .5).toFixed(1)} p75 ${q(pre, .75).toFixed(1)}`);
console.log(`turn after catch:  n ${post.length} p50 ${q(post, .5).toFixed(1)} p75 ${q(post, .75).toFixed(1)}`);
console.log(`readArm keyed: n ${keyT.length}, t - release p25/50/75 ${q(keyT, .25).toFixed(2)}/${q(keyT, .5).toFixed(2)}/${q(keyT, .75).toFixed(2)}`);
console.log(`pursuer-tick behaviours: ${JSON.stringify(kinds)}`);
for (const [k, v] of Object.entries(band)) console.log(`after catch, carrier ${k} yd: n ${v.length} turn p50 ${q(v, .5).toFixed(1)}`);
console.log(`defenders near the catcher at the catch: within 6 yd mean ${(near6.reduce((x, y) => x + y, 0) / Math.max(1, near6.length)).toFixed(2)}, within 10 yd mean ${(near10.reduce((x, y) => x + y, 0) / Math.max(1, near10.length)).toFixed(2)}`);
console.log(`time from catch to the play's end p50 ${q(yac, .5).toFixed(2)} s (n ${yac.length})`);
