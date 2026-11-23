// Underneath seats on dropbacks, the sim's side (Integration, 2026-11-23; nfl-flat-seat.py is the NFL side, same
// format, flat_seat.py reads both). Whole games (generated teams at strength 0.55, leagueSample per seed). Per dropback
// (pass, not screen), one JSON line per defender whose installed behavior after the snap is man coverage or an
// underneath zone: cls man (ManCoverage, his target) / hook (hook_s, hook_w, curl_s, curl_w) / curl_flat / flat / hole
// (hook_mid, hole, robber). Positions every 0.1 s from the snap to 3.0 s (null after the play ends), depth past the line
// toward the defense. rpos / rslot for a man target as the NFL side classifies them (back: 2.5+ yd behind the line within
// 4.5 yd of the ball; inline: within 4.5 yd of the ball; else wide (outermost on his side) or slot).
// Also, per frame, the defender's movement label and tags (lab, tags) for the code diagnosis.
// usage: [FLAG=1] node --import tsx scripts/diag/flat-seat/sim-flat-seat.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'seat.jsonl'));
const CLS = (z: string) => z.startsWith('curl_flat') ? 'curl_flat' : z.startsWith('flat') ? 'flat'
  : z.startsWith('hook_s') || z.startsWith('hook_w') || z.startsWith('curl_') ? 'hook' : z === 'hook_mid' || z === 'hole' || z === 'robber' ? 'hole' : null;
let n = 0, plays = 0;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, oc = sim.offCall;
  if (oc.kind !== 'pass' || oc.pass?.family === 'screen') return orig.apply(this);
  const dir = sim.attackDir(sim.offense[0].team), by = sim.ballY;
  const D = (a: any) => [+((a.pos.x - sim.los) * dir).toFixed(2), +a.pos.y.toFixed(2)];
  const seat = new Map<any, { cls: string; target: any; zone?: string }>();
  const fr: { t: number; xy: Map<any, number[]>; lab: Map<any, string> }[] = [];
  let next = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.t > 3.0 + 1e-9) return;
    for (const a of sim.defense) if (!seat.has(a) && sim.t >= 0.05) {
      const b: any = a.behavior;
      if (b?.kind === 'man' && b.target) seat.set(a, { cls: 'man', target: b.target });
      else if (b?.kind === 'zone' && CLS(b.zone ?? '')) seat.set(a, { cls: CLS(b.zone)!, target: null, zone: b.zone });
      else seat.set(a, { cls: '', target: null });
    }
    if (sim.t >= next - 1e-9) {
      const xy = new Map<any, number[]>(), lab = new Map<any, string>();
      for (const a of sim.agents) xy.set(a, D(a));
      for (const a of sim.defense) lab.set(a, [a.behavior?.kind ?? '', ...[...(a.tags ?? [])]].join(','));
      fr.push({ t: +next.toFixed(1), xy, lab }); next += 0.1;
    }
  };
  // The snap frame.
  { const xy = new Map<any, number[]>(), lab = new Map<any, string>(); for (const a of sim.agents) xy.set(a, D(a)); fr.push({ t: 0, xy, lab }); next = 0.1; }
  const res: any = orig.apply(this);
  plays++;
  const thr = sim.events.find((e: any) => e.type === 'throw');
  const TS = Array.from({ length: 31 }, (_, i) => +(i / 10).toFixed(1));
  const at = (t: number) => fr.find((f) => Math.abs(f.t - t) < 0.051);
  const elig = sim.offense.filter((a: any) => ['RB', 'FB', 'TE', 'WR'].includes(a.player.position));
  const path = (a: any) => TS.map((t) => at(t)?.xy.get(a) ?? null);
  const rec = elig.map(path);
  const pa = !!(oc.pass?.family === 'playaction' || oc.pass?.fake);
  for (const [a, s] of seat) {
    if (!s.cls) continue;
    const row: any = { src: 'sim', id: `S${seed}-${plays}-${a.slot}`, cls: s.cls, zone: s.zone ?? null, slot: a.slot, pa, throw: thr ? +thr.t.toFixed(1) : null,
      t: TS, d: path(a), r: null, rpos: null, rslot: null, route: null, rec, ballY: +by.toFixed(2), lab: TS.map((t) => at(t)?.lab.get(a) ?? null) };
    if (s.cls === 'man') {
      const R = s.target, r0 = path(R)[0]!;
      row.r = path(R); row.rpos = R.player.position; row.rslotName = R.slot;
      if (r0[0] < -2.5 && Math.abs(r0[1] - by) < 4.5) row.rslot = 'back';
      else if (Math.abs(r0[1] - by) < 4.5) row.rslot = 'inline';
      else {
        const side = elig.filter((e: any) => (path(e)[0]![1] - by) * (r0[1] - by) > 0);
        row.rslot = side.some((e: any) => Math.abs(path(e)[0]![1] - by) > Math.abs(r0[1] - by) + 0.1) ? 'slot' : 'wide';
      }
    }
    out.write(JSON.stringify(row) + '\n'); n++;
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
console.log('dropbacks', plays, 'rows', n);
