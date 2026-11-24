// The passer's pre-snap read (QB decision plan §1.6: QB_SCAN, QB_CANON_SEEN): per scrimmage play, his top pre-snap coverage
// belief against the coverage the defense played (and the look it showed), and the audible made. Read-only.
// usage: [FLAGS] node --import tsx scripts/diag/eyes/qb-presnap-read.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'presnap.jsonl'));
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, res: any = orig.apply(this);
  const r = sim.stats?.qbRead ?? sim.qbMind?.report;
  if (r) out.write(JSON.stringify({ seed, kind: sim.offCall?.kind, pre: r.pre ?? null, actual: r.actual ?? null, shown: r.shown ?? null, audible: r.audible ?? null,
    fam: sim.defCall?.coverage?.family ?? null, man: !!sim.defCall?.coverage?.man, blitz: !!sim.qbMind?.blitzExpected, yards: res?.yards ?? null }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
