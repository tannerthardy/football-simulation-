// Man defenders' dither before the throw: on called pass plays, every defender in a man behaviour (behavior.kind
// 'man') from the snap to the throw: the number of changes of his technique label (orientation.ts facingTechnique,
// e.g. man-pedal / turn-run / open-carry), of his facing-request sign (left/right flips of a turn), and of his target
// receiver, per defender-play; also per second. Split by his receiver's route family.
// usage: [FLAG=...] npx tsx scripts/diag/risk/man-dither.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const ad = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = this.__md ?? (this.__md = { snap: this.t, m: new Map(), done: false });
  if (S.done) return r;
  if (this.ball.kind === 'air' || (this.ball.kind === 'held' && this.ball.carrier !== this.qb)) {
    S.done = true;
    for (const [d, e] of S.m) rows.push({ ...e, secs: this.t - e.from, fam: String(e.target?.behavior?.route?.family ?? e.target?.behavior?.fallback?.route?.family ?? '-') });
    return r;
  }
  for (const d of this.defense) {
    const b: any = d.behavior; if (b?.kind !== 'man') continue;
    const cmd = this.cmds?.[d.idx]; const lab = facingTechnique(cmd ?? {})?.label ?? '-';
    const turn = cmd?.facing !== undefined ? Math.sign(ad(cmd.facing - d.facing)) : 0;
    const tgt = b.target ?? b.man ?? null;
    const e = S.m.get(d) ?? { from: this.t, lab, turn, tgt, labs: 0, flips: 0, swaps: 0, target: tgt };
    if (e.lab !== lab) { e.labs++; e.lab = lab; }
    if (turn !== 0 && e.turn !== 0 && turn !== e.turn) e.flips++;
    if (turn !== 0) e.turn = turn;
    if (tgt !== e.tgt) { e.swaps++; e.tgt = tgt; e.target = tgt; }
    S.m.set(d, e);
  }
  return r;
};
P.buildResult = function () { const res = b0.call(this); this.__md = undefined; return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75, .9].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== seed ${seed} man defenders before the throw: defender-plays ${rows.length} | label changes ${q(rows.map(r => r.labs))} (p25/50/75/90), per s ${q(rows.map(r => r.labs / Math.max(0.5, r.secs)))} | turn-side flips ${q(rows.map(r => r.flips))} | target swaps ${q(rows.map(r => r.swaps))}`);
for (const fam of ['quick', 'intermediate', 'deep', 'flat', 'cross', 'back']) { const V = rows.filter(r => r.fam === fam); if (V.length >= 5) console.log(`   ${fam}: n ${V.length} | label changes ${q(V.map(r => r.labs))} | flips ${q(V.map(r => r.flips))}`); }
