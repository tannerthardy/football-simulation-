// Export zone completions from engine games in pre_release.py's record format (the same records
// pre_release_nfl.py builds from BDB tracking): every player's position from the snap to the catch at 10 Hz,
// normalised so the offence attacks +x from the line of scrimmage, the QB's body facing (math angle, same frame), every player's body facing (fo),
// release and catch frames, the target. Sim only; positions and facing are the bodies' true values, as tracking's are.
// usage: [COV=all] [TAIL=5] npx tsx scripts/diag/risk/attach-export.ts SEED GAMES OUT.jsonl.gz  (copy of Coverage's pre-release-export.ts, for attach.py)
// (COV=all: man and zone, with manzone; TAIL: 10 Hz frames kept after the catch)
import { createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8), outPath = process.argv[4] ?? 'out/pre-sim.jsonl.gz';
const COV = process.env.COV ?? 'zone', TAIL = Number(process.env.TAIL ?? 0);
const gz = createGzip(); gz.pipe(createWriteStream(outPath));
const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL', EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' };
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
let n = 0;
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b && this.__pr && this.__pr.release === undefined) { this.__pr.release = this.__pr.xy.length - 1; this.__pr.R = b; }
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  const all = [...this.offense, ...this.defense];
  if (!this.__pr) {
    const dir = this.attackDir(this.offense[0].team);
    this.__pr = { dir, all, xy: [] as any[], qbf: [] as any[], fo: [] as any[], lastK: -1 };
  }
  const r = tick0.call(this), S = this.__pr;
  if (S.done) return r;
  const k = Math.round(this.t / 0.1);
  if (k !== S.lastK) {
    S.lastK = k;
    const d = S.dir, row: number[] = [];
    for (const a of S.all) row.push(+((a.pos.x - this.los) * d).toFixed(2), +(d > 0 ? a.pos.y : FIELD_WIDTH - a.pos.y).toFixed(2));
    S.xy.push(row);
    S.fo.push(S.all.map((a: any) => { const g = a.body.facing + (d > 0 ? 0 : Math.PI); return +Math.atan2(Math.sin(g), Math.cos(g)).toFixed(2); }));
    const f = this.qb.body.facing + (d > 0 ? 0 : Math.PI);
    S.qbf.push(+Math.atan2(Math.sin(f), Math.cos(f)).toFixed(3));
    if (S.R && S.catch === undefined && this.ball.kind === 'held' && this.ball.carrier === S.R) S.catch = S.xy.length - 1;
  }
  if (this.phase !== 'live' || (S.catch !== undefined && S.xy.length - 1 >= S.catch + TAIL)) {
    S.done = true;
    if (S.catch !== undefined && S.release !== undefined && S.catch > S.release && (COV === 'all' || !this.defCall?.coverage?.man)) {
      const players = S.all.map((a: any) => ({ side: this.offense.includes(a) ? 'O' : 'D', group: GROUP[a.player?.position] ?? null }));
      gz.write(JSON.stringify({ src: 'sim', id: `${seed}-${n}`, dt: 0.1, players, xy: S.xy, qbf: S.qbf, fo: S.fo, release: S.release, catch: S.catch,
        target: S.all.indexOf(S.R), qb: S.all.indexOf(this.qb), coverage: this.defCall?.coverage?.id ?? null, manzone: this.defCall?.coverage?.man ? 'Man' : 'Zone',
        ball_y: +(S.dir > 0 ? this.ballY : FIELD_WIDTH - this.ballY).toFixed(2) }) + '\n');
      n++;
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
gz.end(); console.error(`seed ${seed}: ${n} zone completions written to ${outPath}`);
