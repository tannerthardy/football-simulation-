/** Sim dropbacks in the open-census play format (see nfl_plays.py), read-only tap on PlaySim.tick: no RNG draw, no behavior change.
 *   [FLAGS] node --import tsx scripts/diag/census/sim_plays.mts [--seed 101] [--games 4] [--first 0] [--out out/census/sim-plays.jsonl.gz]
 * Every pass play (not screens): positions every 0.1 s from the snap to the release (the first tick the ball is in the air) or, with no throw, to the end or 4.0 s;
 * x = yards past the line (the offense moves +x), y across. players[i] = {side, pos, slot, route (his behavior was a route at any sampled frame), target (the pending throw's receiver at release)}.
 * labels: cov (coverage id), fam (coverage family), man (the call's man flag), pa (play-action fake), motion (the motion was played), form, concept.
 * def[k] (at release and at 1.5 / 2.0 / 2.5 / 3.0 s): each defender's seat and technique as the engine holds it: behavior kind; man: target slot and recordedTechnique();
 * zone: landmark, style and current target. For Coverage's attribution of wide-open receivers. */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import * as KIN from '../../../src/physics/kinematics.js';
import * as SUP from '../../../src/physics/support.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ALL = process.argv.includes('--all'); // with --full: every dropback, not only completions
const RUNS = process.argv.includes('--runs'); // --runs (with --full): run plays instead of passes; `catch` = the frame the ball is first held by a back who is not the passer (the handoff), recv = him
const FULL = process.argv.includes('--full'); // --full: completions only, recorded through the end of the play (14 s at most) with the catch frame and the catcher; screens kept (tagged)
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), first = Number(arg('--first', '0')), out = arg('--out', 'out/census/sim-plays.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); gz.pipe(createWriteStream(out));
const r2 = (v: number) => Math.round(v * 100) / 100;
const MOMENTS = [15, 20, 25, 30];
interface Rec { av: number[][]; pa: number[][]; pn: number[][]; en: number[][]; sl: number[][]; xi: number[][]; fc: number[][]; dc: number[][]; ln: number[][]; qx: number[][]; qy: number[][]; ef: number[][]; cs: number[][]; routes: Record<number, { id: string; wp: number[][] }>; catchK: number | null; recv: number; sim: any; x: number[][]; y: number[][]; rel: number | null; done: boolean; route: boolean[]; target: number; def: Record<string, any[]>; meta: any; players: any[] }
const recs = new Map<object, Rec | null>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick0 = proto.tick;
const seats = (sim: any) => sim.agents.filter((a: any) => a.team === 'D').map((a: any) => {
  const b = a.behavior, o: any = { slot: a.slot, kind: b?.kind ?? null };
  try {
    if (b?.kind === 'man') { o.target = b.target?.slot ?? b.opts?.target?.slot ?? null; o.tech = { press: !!b.press, hipsOpen: !!b.hipsOpen, cushion: b.initialCushion ?? null, lev: b.opts?.lev ?? null, trail: !!b.opts?.trail, overTop: !!b.opts?.overTop, routeRead: !!b.routeRead }; }
    else if (b?.kind === 'zone') { const lm = b.recordedLandmark?.(); o.lm = lm ? [r2(lm.x - sim.los), r2(lm.y)] : null; o.style = b.style ?? null; o.target = b.target?.slot ?? null; }
  } catch { /* read-only */ }
  try { o.tags = [...(a.tags ?? [])]; } catch { /* read-only */ }
  return o;
});
proto.tick = function (this: any) {
  if (!recs.has(this)) {
    let rec: Rec | null = null;
    if (!compilingPlan() && this.offCall?.kind === (RUNS ? 'run' : 'pass') && this.defCall && (RUNS || FULL || !this.offCall.pass?.screen)) {
      const n = this.agents.length;
      rec = { routes: {}, catchK: null, recv: -1, sim: this, x: Array.from({ length: n }, () => []), y: Array.from({ length: n }, () => []), qx: Array.from({ length: n }, () => []), fc: Array.from({ length: n }, () => []), en: Array.from({ length: n }, () => []), av: Array.from({ length: n }, () => []), pa: Array.from({ length: n }, () => []), pn: Array.from({ length: n }, () => []), sl: Array.from({ length: n }, () => []), xi: Array.from({ length: n }, () => []), dc: Array.from({ length: n }, () => []), ln: Array.from({ length: n }, () => []), qy: Array.from({ length: n }, () => []), ef: Array.from({ length: n }, () => []), cs: Array.from({ length: n }, () => []), rel: null, done: false, route: this.agents.map(() => false), target: -1, def: {},
        meta: { screen: !!this.offCall.pass?.screen, cov: this.defCall.coverage.id, fam: this.defCall.coverage.family, man: !!this.defCall.coverage.man, pa: RUNS ? false : !!this.offCall.pass?.fake, form: this.offCall.formation.id, concept: RUNS ? (this.offCall.run?.scheme ?? this.offCall.label) : this.offCall.pass.id, press: this.defCall.pressure?.name ?? null },
        players: this.agents.map((a: any) => ({ side: a.team, slot: a.slot, pos: a.player?.position ?? a.player?.pos ?? '?', route: false, target: false })) };
    }
    recs.set(this, rec);
  }
  const rec = recs.get(this) as Rec | null;
  if (rec && !rec.done) {
    // The tick below advances time; sample the state after it, on the 0.1 s grid.
    const res = tick0.call(this);
    try {
      const k = Math.round(this.t * 10), have = rec.x[0].length;
      if (k >= 0 && k >= have) {
        if (this.motion) rec.meta.motion = true;
        // One sample per 0.1 s grid point; a tick that crosses a grid point records the state it reaches (the first tick of a play covers frame 0 too).
        for (let g = have; g <= k; g++) this.agents.forEach((a: any, i: number) => { rec.x[i].push(r2(a.pos.x - this.los)); rec.y[i].push(r2(a.pos.y)); { const q = this.intents[i]; rec.qx[i].push(r2(q?.vel?.x ?? 0)); rec.qy[i].push(r2(q?.vel?.y ?? 0)); rec.ef[i].push(r2(q?.effort ?? 1)); rec.cs[i].push(r2(q?.cutSkill ?? 1)); rec.fc[i].push(r2(a.body.facing)); rec.en[i].push(r2(a.body.energy)); { const W = this.world as any; let av = NaN, pa = NaN, pn = NaN; try { av = SUP.availability(a.body.support, W.sp[i], W.fat[i]); const pl = W.plans[i], sp = Math.hypot(a.body.vel.x, a.body.vel.y); if (pl && sp > 0.5) { const tx = a.body.vel.x / sp, ty = a.body.vel.y / sp; pa = pl.ax * tx + pl.ay * ty; pn = -pl.ax * ty + pl.ay * tx; } } catch { /* read-only */ } rec.av[i].push(r2(av)); rec.pa[i].push(r2(pa)); rec.pn[i].push(r2(pn)); } rec.sl[i].push(r2(a.body.sprintLoad ?? 0)); rec.xi[i].push(r2(a.body.support ? Math.hypot(a.body.support.xi.x, a.body.support.xi.y) : 0)); { const v = q?.vel; const hd = v && (v.x || v.y) ? Math.atan2(v.y, v.x) : a.body.facing; let df = a.body.facing - hd; df = Math.atan2(Math.sin(df), Math.cos(df)); rec.dc[i].push(r2(KIN.directionalSpeedFactor(a.profile, df) * KIN.trunkPrice(a.body))); const su = a.body.support; rec.ln[i].push(r2(su ? Math.hypot(su.lean.x, su.lean.y) : 0)); } } if (a.behavior?.kind === 'route') { rec.route[i] = true; if (!rec.routes[i] && a.behavior.route) rec.routes[i] = { id: String(a.behavior.route.id), wp: (a.behavior.path ?? []).map((w: any) => [r2(w.p.x - this.los), r2(w.p.y)]) }; } });
        const air = this.ball?.kind === 'air';
        if (FULL) {
          if (have === 0 || rec.def.snap === undefined) rec.def.snap = seats(this); // each defender's assignment as the engine holds it on the first tick: the call as installed
          if (air && rec.rel === null) { rec.rel = k; rec.def.rel = seats(this); const tg = this.ball?.target; if (tg) rec.target = this.agents.indexOf(tg); }
          if (RUNS && rec.rel === null) rec.rel = 0;
          if (RUNS && rec.catchK === null && this.ball?.kind === 'held' && this.ball.carrier?.team === 'O' && this.ball.carrier !== this.qb) { rec.catchK = k; rec.recv = this.agents.indexOf(this.ball.carrier); }
          else if (!RUNS && rec.rel !== null && rec.catchK === null && this.ball?.kind === 'held') {
            if (this.ball.carrier?.team === 'O') { rec.catchK = k; rec.recv = this.agents.indexOf(this.ball.carrier); rec.def.catch = seats(this); }
            else rec.done = true; // taken away: not a completion
          }
          if (k >= 140) rec.done = true;
        } else {
        if (MOMENTS.includes(k) && !air) rec.def[String(k)] = seats(this);
        if (air) {
          rec.rel = k; rec.done = true; rec.def.rel = seats(this);
          const tg = this.ball?.target; if (tg) rec.target = this.agents.indexOf(tg);
        } else if (k >= 40) rec.done = true;
        }
      }
    } catch { rec.done = true; }
    return res;
  }
  return tick0.call(this);
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let kept = 0;
for (let i = 0; i < games; i++) {
  recs.clear();
  simulateGame(home, away, { seed: seed + first + i });
  let n = 0;
  for (const rec of recs.values()) {
    if (!rec || rec.x[0].length < 10 || (FULL && !ALL && rec.catchK === null)) continue;
    const players = rec.players.map((p, j) => ({ ...p, route: rec.route[j], target: j === rec.target }));
    const qb = rec.sim.agents.findIndex((a: any) => a === rec.sim.qb);
    gz.write(JSON.stringify({ src: 'sim', id: `${seed}-${first + i}-${n}`, ...rec.meta, players, qb, rel: rec.rel, catch: rec.catchK, recv: rec.recv, routes: rec.routes, x: rec.x, y: rec.y, qx: rec.qx, qy: rec.qy, fc: rec.fc, av: rec.av, pa: rec.pa, pn: rec.pn, en: rec.en, sl: rec.sl, xi: rec.xi, dc: rec.dc, ln: rec.ln, ef: rec.ef, cs: rec.cs, def: rec.def }) + '\n'); n++; kept++;
  }
  console.error(`game ${i + 1}/${games} (seed ${seed + first + i}): ${n} dropbacks`);
}
gz.end();
console.error(`${kept} dropbacks -> ${out}`);
