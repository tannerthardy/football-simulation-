// QB_BODY_SEEN pursuit table agreed between Defense and Rules+Coaching (Integration, 2026-11-13): post-catch pursuers
// only (intercept planner fired on the catcher, request > 1 yd/s), pursuit-commit.test.ts's staged set, reference-stack
// on-flags, PURSUIT_COMMIT on. Turn p50 (deg/s) and n by true distance to the carrier, share of ticks re-aiming over
// 20 deg, and for those re-aims the stage that moved first:
//   picture   the observed carrier heading moved > 20 deg since his last tick
//   meeting   the planned meeting time moved > 0.3 s
//   planner   the steering point's bearing moved > 20 deg for another reason (leverage, forecast speed)
//   control   the steering point's bearing moved < 10 deg but the request turned > 20 deg
//   node --import tsx scripts/diag/eyes/body-seen-reconcile.mts [FLAG=value ...]   (arm only: QB_BODY_SEEN=1 SCRATCH_HEAD=0)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const flags: Record<string, string> = JSON.parse(readFileSync(`${root}/config/reference-stack.json`, 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
process.env.PURSUIT_COMMIT = '1';
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
const BANDS = ['0-3', '3-8', '8-15', '15+'];
const bandOf = (d: number) => d < 3 ? '0-3' : d < 8 ? '3-8' : d < 15 ? '8-15' : '15+';
const turns: Record<string, number[]> = {}, stages: Record<string, Record<string, number>> = {};
for (const b of BANDS) { turns[b] = []; stages[b] = { picture: 0, meeting: 0, planner: 0, control: 0 }; }
let plays = 0, catches = 0; const perPlay: string[] = [];
for (const pass of ['stick', 'slant_flat', 'curl_flat', 'smash']) for (let seed = 1; seed <= 4; seed++) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 't' },
    los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
  if ((process.env.SCRATCH_DROP ?? '').split(',').includes(`${pass}:${seed}`)) continue;
  plays++;
  const mine: number[] = []; let catchT = NaN, catcher = '', end = '';
  const rec = new Map<any, any>(); const prev = new Map<any, any>(); let caught = false;
  const tc0 = sim.commandTraceFor.bind(sim);
  sim.commandTraceFor = (a: unknown) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: unknown, d: any) => { if (d?.kind === 'intercept') rec.set(a, { target: t, d }); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
  while (sim.phase !== 'dead' && sim.t < 12) {
    const wasAir = sim.ball.kind === 'air'; rec.clear();
    sim.tick();
    const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (wasAir && !caught && c && c.team === 'O' && c !== sim.qb) { caught = true; catches++; catchT = sim.t; catcher = c.slot; }
    if (!caught || !c) { prev.clear(); continue; }
    for (const [a, { target, d }] of rec) {
      const v = sim.intents[a.idx].vel; if (target !== c || Math.hypot(v.x, v.y) < 1) { prev.delete(a); continue; }
      const cur = { h: Math.atan2(v.y, v.x), oh: Math.atan2(d.observed.vel.y, d.observed.vel.x), ov: Math.hypot(d.observed.vel.x, d.observed.vel.y),
        sb: Math.atan2(d.steeringPoint.y - a.pos.y, d.steeringPoint.x - a.pos.x), bt: d.biasedTime };
      const p = prev.get(a); prev.set(a, cur);
      if (!p) continue;
      const turn = ang(cur.h, p.h), b = bandOf(Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y));
      turns[b].push(turn / sim.dt); mine.push(turn / sim.dt);
      if (turn <= 20) continue;
      const sbTurn = ang(cur.sb, p.sb);
      const st = cur.ov > 1 && p.ov > 1 && ang(cur.oh, p.oh) > 20 ? 'picture' : Math.abs(cur.bt - p.bt) > 0.3 ? 'meeting'
        : sbTurn > 20 ? 'planner' : sbTurn < 10 ? 'control' : 'planner';
      stages[b][st]++;
    }
    for (const a of [...prev.keys()]) if (!rec.has(a)) prev.delete(a);
  }
  const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  perPlay.push(`${pass.padEnd(10)} s${seed} catch ${catcher.padEnd(4)} at ${catchT.toFixed(2)} end ${sim.t.toFixed(2)} x ${bc ? bc.pos.x.toFixed(1) : '-'}  n ${String(mine.length).padStart(4)} p50 ${q(mine, .5).toFixed(1)}`);
}
for (const l of perPlay) console.log(l);
console.log(`plays ${plays} catches ${catches}`);
const all = Object.values(turns).flat();
console.log(`all bands: n ${all.length} turn p50 ${q(all, .5).toFixed(1)}`);
for (const b of BANDS) { const v = turns[b], r = Object.values(stages[b]).reduce((x, y) => x + y, 0);
  console.log(`${b.padEnd(5)} n ${String(v.length).padStart(4)} p50 ${q(v, .5).toFixed(1).padStart(6)}  re-aims>20 ${r} (${(100 * r / Math.max(1, v.length)).toFixed(1)}%)  ${JSON.stringify(stages[b])}`); }
