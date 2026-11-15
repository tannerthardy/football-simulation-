// usage: npx tsx scripts/diag/possession/ball-cue-size.ts SEED GAMES   (reference stack)
// Sizes the release-evidence ball-cue defect: the ball cue is looked for at the time of his QB sighting (t - age(QB)).
// Each flight tick, for each coverage defender (man / zone): is his QB sighting older than the flight so far (then the
// cue looks before the throw and cannot fire)? Per flight: zone / man defenders whose closest approach to the ball's
// ground track is within 8 yd, and the share of them with no ball cue (releaseBelief.ballAt) by the flight's end; of
// those, the share whose QB sighting was older than the flight for most of it. Diagnostic only (the probe reads
// sim.see(defender, qb) at delayScale 1, the same query releaseEvidence makes each tick).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
let ticks = 0, stale = 0; const fl: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.ball.kind === 'air' && this.offCall?.kind === 'pass') {
    if (!this.__f) this.__f = { t0: this.t, d: new Map() };
    const F = this.__f, b = this.ball.flight.pos;
    for (const d of this.defense) {
      const k = d.behavior?.kind; if (k !== 'zone' && k !== 'man') continue;
      const age = this.see(d, this.qb).age ?? 0, s = age > this.t - F.t0 + 1e-9;
      ticks++; if (s) stale++;
      const x = F.d.get(d) ?? { k, deep: !!d.behavior.deep, min: 99, staleT: 0, n: 0 };
      if (x.det === undefined && releaseBelief(this, d).ballAt !== undefined) x.det = this.t - F.t0;
      x.min = Math.min(x.min, Math.hypot(b.x - d.pos.x, b.y - d.pos.y)); x.n++; if (s) x.staleT++;
      F.d.set(d, x);
    }
  } else if (this.__f && !this.__f.done) {
    this.__f.done = true;
    for (const [d, x] of this.__f.d) { const ba = releaseBelief(this, d).ballAt; fl.push({ ...x, cue: ba !== undefined, lag: x.det ?? null, flight: this.t - this.__f.t0 }); }
  }
  return r;
};
P.buildResult = function () { const r = b0.call(this); this.__f = undefined; return r; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
console.log(`BC defender-flight-ticks ${ticks}: QB sighting older than the flight so far ${(stale / ticks).toFixed(2)}`);
for (const k of ['zone', 'man']) {
  const T = fl.filter(x => x.k === k && x.min <= 8), N = T.filter(x => !x.cue);
  console.log(`BC ${k} within 8 yd of the ball: n ${T.length} | no ball cue by the end ${(N.length / Math.max(1, T.length)).toFixed(2)} | of those, QB sighting stale most of the flight ${(N.filter(x => x.staleT > x.n / 2).length / Math.max(1, N.length)).toFixed(2)} | with a cue, stale most of the flight ${(T.filter(x => x.cue && x.staleT > x.n / 2).length / Math.max(1, T.filter(x => x.cue).length)).toFixed(2)}`);
}
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)].toFixed(2) : '-';
for (const [nm, f] of [['zone under', (x: any) => x.k === 'zone' && !x.deep], ['zone deep', (x: any) => x.k === 'zone' && x.deep], ['man', (x: any) => x.k === 'man']] as const) {
  const T = fl.filter((x: any) => f(x) && x.min <= 8), L = T.filter((x: any) => x.lag !== null).map((x: any) => x.lag);
  console.log(`BC ${nm} within 8 yd: n ${T.length} | ball cue noticed, from the release: median ${med(L)} s, p75 ${L.length ? [...L].sort((a, b) => a - b)[Math.floor(L.length * 0.75)].toFixed(2) : '-'} | none ${(T.filter((x: any) => x.lag === null).length / Math.max(1, T.length)).toFixed(2)} | flight ${med(T.map((x: any) => x.flight))}`);
}
