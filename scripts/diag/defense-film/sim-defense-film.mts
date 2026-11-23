// The defense's assignment on film (Integration, 2026-11-23, the user's film room: alignment, disguise, motion, play
// action, run fits). The sim's side of one operator: whole games (generated teams at strength 0.55, leagueSample per
// seed), every scrimmage snap written in the common defense-film format that nfl-defense-film.py writes for BDB 2025,
// so defense_film.py reads both.
// Per play, one JSON line:
//   src, id, kind ('run' | 'pass'), pa (a play-action fake), dropback (pass, not screen), form (formation id),
//   cov: { id, fam (cover0 / cover1 / cover2 / cover2man / cover3 / cover4 / cover6 / tampa2), shell, look, man },
//   blitz (pressure call's blitzer slots), motion (the motion man's index or null),
//   players: [{ side 'O' | 'D', pos (roster position), slot, k0 / k15 (behavior kind at the snap + 0.3 s / + 1.5 s),
//               tags15 (defenders' tags at 1.5 s) }],
//   t: seconds from the snap per frame (0.1 s from the first pre-snap tick, at most 3 s before, to 3.5 s after),
//   xy: per frame [x0, y0, x1, y1, ...], x yards past the line toward the defense, y across the field (absolute),
//   ballY (the ball's y at the snap), handoff / throw (s from the snap, or null), carrier (index or null).
// usage: node --import tsx scripts/diag/defense-film/sim-defense-film.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'film.jsonl'));
let n = 0;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; const frames: { t: number; xy: number[] }[] = []; let last = -1e9;
  // Pre-snap: the constructor plays the line set, motion, stems and creeps at negative t into the snap at t = 0, and
  // records them when recording is on (playsim.ts); the snap is t = 0.
  const dir0 = sim.attackDir(sim.offense[0].team);
  for (const f of sim.frames ?? []) if (f.t <= 1e-9 && f.t - last >= 0.1 - 1e-9) {
    last = f.t; const xy: number[] = [];
    for (let i = 0; i < sim.agents.length; i++) xy.push(+((f.agents[i * 3] - sim.los) * dir0).toFixed(2), +f.agents[i * 3 + 1].toFixed(2));
    frames.push({ t: f.t, xy });
  }
  // The snap frame: the bodies as they stand when the play starts (t = 0), when no recorded frame has it.
  if (!frames.length || frames[frames.length - 1].t < -1e-9) {
    const xy: number[] = []; for (const a of sim.agents) xy.push(+((a.pos.x - sim.los) * dir0).toFixed(2), +a.pos.y.toFixed(2));
    frames.push({ t: 0, xy }); last = 0;
  }
  const k0 = new Map<number, string>(), k15 = new Map<number, string>(), tags15 = new Map<number, string[]>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const rel = sim.t;
    if (rel > 3.5) return;
    if (sim.t - last >= 0.1 - 1e-9) {
      last = sim.t;
      const dir = sim.attackDir(sim.offense[0].team), xy: number[] = [];
      for (const a of sim.agents) xy.push(+((a.pos.x - sim.los) * dir).toFixed(2), +a.pos.y.toFixed(2));
      frames.push({ t: sim.t, xy });
    }
    for (const a of sim.agents) {
      if (rel >= 0.3 && !k0.has(a.idx)) k0.set(a.idx, a.behavior?.kind ?? '');
      if (rel >= 1.5 && !k15.has(a.idx)) { k15.set(a.idx, a.behavior?.kind ?? ''); if (a.team === 'D') tags15.set(a.idx, [...(a.tags ?? [])]); }
    }
  };
  const res: any = orig.apply(this);
  const snap = 0;
  if (frames.length) {
    const F = frames.filter((f) => f.t - snap >= -3.0 - 1e-9);
    const ev = sim.events, at = (ty: string) => { const e = ev.find((x: any) => x.type === ty); return e ? +(e.t - snap).toFixed(2) : null; };
    const ho = ev.find((x: any) => x.type === 'handoff' || x.type === 'pitch_catch');
    const c = sim.defCall.coverage, oc = sim.offCall;
    const row = {
      src: 'sim', id: `S${seed}-${++n}`, kind: oc.kind, pa: !!(oc.kind === 'pass' && (oc.pass?.family === 'playaction' || oc.pass?.fake)),
      dropback: oc.kind === 'pass' && oc.pass?.family !== 'screen', form: oc.formation?.id ?? null, run: oc.run?.id ?? null,
      cov: { id: c.id, fam: c.family ?? c.id, shell: c.shell, look: c.look ?? c.shell, man: !!c.man },
      blitz: sim.defCall.pressure ? Object.keys(sim.defCall.pressure.blitzers ?? {}) : [],
      motion: sim.motion?.plan?.slot ? sim.agents.findIndex((a: any) => a.team === 'O' && a.slot === sim.motion.plan.slot) : null,
      players: sim.agents.map((a: any) => ({ side: a.team, pos: a.player.position, slot: a.slot, k0: k0.get(a.idx) ?? '', k15: k15.get(a.idx) ?? '', ...(a.team === 'D' ? { tags15: tags15.get(a.idx) ?? [] } : {}) })),
      t: F.map((f) => +(f.t - snap).toFixed(2)), xy: F.map((f) => f.xy), ballY: +sim.ballY.toFixed(2),
      handoff: ho ? +(ho.t - snap).toFixed(2) : null, throw: at('throw'), carrier: ho ? (ho.type === 'handoff' ? ho.b : ho.a) ?? null : null,
    };
    out.write(JSON.stringify(row) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
console.log('plays', n);
