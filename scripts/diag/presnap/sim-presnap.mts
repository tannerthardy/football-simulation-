// Pre-snap movement, the sim's side (Integration, 2026-11-23; nfl-presnap.py is the NFL side, same format, presnap.py
// reads both). Whole recorded games (generated teams at strength 0.55, leagueSample per seed), every scrimmage snap:
//   src 'sim', id, kind, down, togo, form, cov (coverage id), man,
//   t: s from the snap per 0.1 s frame, from the first pre-snap tick (the constructor plays motion, stems, creeps and
//      the snap count at negative t, recorded when recording is on) to 1.5 s after; a play with no pre-snap phase starts
//      at the snap (t = 0), with ls null;
//   ls: the first pre-snap frame's t, or null; events: [[t, name]]: 'stem' (the front stem's start), 'creep' (the
//      called creep's start), 'man_in_motion' (the motion's start), 'ball_snap';
//   players: [{ side, pos (roster position), slot, rush (behavior rush / blitz at +0.3 s), assign (zone id, 'MAN', or
//      null), motion (the motion man) }],
//   xy per frame [x0, y0, ...]: x yards past the line toward the defense, y yards from the ball's y, flipped with the
//      attack direction as on the NFL side.
// usage: node --import tsx scripts/diag/presnap/sim-presnap.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'presnap.jsonl'));
let n = 0;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, dir = sim.attackDir(sim.offense[0].team), by = sim.ballY;
  const frame = (ag: number[]) => { const xy: number[] = []; for (let i = 0; i < sim.agents.length; i++) xy.push(+((ag[i * 3] - sim.los) * dir).toFixed(2), +((ag[i * 3 + 1] - by) * dir).toFixed(2)); return xy; };
  const frames: { t: number; xy: number[] }[] = []; let last = -1e9;
  for (const f of sim.frames ?? []) if (f.t <= 1e-9 && f.t - last >= 0.1 - 1e-9) { last = f.t; frames.push({ t: +f.t.toFixed(1), xy: frame(f.agents) }); }
  const pre = frames.length && frames[0].t < -1e-9 ? frames[0].t : null;
  if (!frames.length || frames[frames.length - 1].t < -1e-9) {
    const ag: number[] = []; for (const a of sim.agents) ag.push(a.pos.x, a.pos.y, 0);
    frames.push({ t: 0, xy: frame(ag) }); last = 0;
  }
  const k3 = new Map<number, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.t > 1.5 + 1e-9) return;
    if (sim.t - last >= 0.1 - 1e-9) { last = sim.t; const ag: number[] = []; for (const a of sim.agents) ag.push(a.pos.x, a.pos.y, 0); frames.push({ t: +sim.t.toFixed(1), xy: frame(ag) }); }
    if (sim.t >= 0.3) for (const a of sim.agents) if (!k3.has(a.idx)) k3.set(a.idx, a.behavior?.kind ?? '');
  };
  const res: any = orig.apply(this);
  const dc = sim.defCall, oc = sim.offCall, events: [number, string][] = [];
  if (dc.frontStem) events.push([-+dc.frontStem.secondsBeforeSnap.toFixed(1), 'stem']);
  if (dc.creep) events.push([-+dc.creep.secondsBeforeSnap.toFixed(1), 'creep']);
  if (sim.motion?.plan) events.push([-+(sim.motion.plan.seconds ?? 0).toFixed(1), 'man_in_motion']);
  events.push([0, 'ball_snap']); events.sort((p, q) => p[0] - q[0]);
  const mslot = sim.motion?.plan?.slot ?? null;
  const players = sim.agents.map((a: any) => {
    const role = a.team === 'D' ? sim.defAlign.spots[a.slot]?.role : null;
    return { side: a.team, pos: a.player.position, slot: a.slot, rush: ['rush', 'blitz'].includes(k3.get(a.idx) ?? ''),
      assign: role ? (role.kind === 'zone' ? role.zone : role.kind === 'man' ? 'MAN' : null) : null, motion: a.slot === mslot };
  });
  out.write(JSON.stringify({ src: 'sim', id: `S${seed}-${++n}`, kind: oc.kind, down: sim.down, togo: +(sim.firstDownX - sim.los).toFixed(1),
    form: oc.formation?.id ?? null, cov: dc.coverage?.id ?? null, man: dc.coverage?.man ? 'Man' : 'Zone',
    t: frames.map((f) => f.t), ls: pre, events, players, xy: frames.map((f) => f.xy) }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
console.log('plays', n);
