// Who owns the outside on our wide open catches (sim only; engine instrumentation). Zone completions caught within
// 10 yd of a sideline, live 1.0 s after the catch, with no defender downfield of the catcher within 10 yd at the catch
// (in_front.py's "nobody in front"). Per play: the call, the catcher's slot and route, the time of the throw and catch;
// on the catcher's side every zone defender whose zone is a flat / curl-flat / deep-third / quarter-out (the outside
// owners): his zone, the receiver he was carrying (selectTarget) and the technique his zone command named at the catch,
// and where he is relative to the catcher (over him / toward the sideline / distance). Compared with the same counts on
// the wide catches with someone in front.
// usage: npx tsx scripts/diag/risk/wide-owner.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const Z: any = ZoneCoverage.prototype, up0 = Z.update, P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const last = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); last.set(a, facingTechnique(c)?.label ?? 'other'); return c; };
const OUT = /^(flat_|curl_flat_|deep_third_|quarter_._out)/;
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, n?: string) {
  if (type === 'throw' && b && !this.__wo) this.__wo = { R: b, tt: this.t, route: b.behavior?.route?.id ?? b.behavior?.fallback?.route?.id ?? b.behavior?.kind };
  return ev0.call(this, type, a, b, n);
};
P.tick = function () {
  const r = tick0.call(this), W = this.__wo;
  if (W && !W.done) {
    if (W.kc === undefined && this.ball.kind === 'held' && this.ball.carrier === W.R) {
      W.kc = this.t; const R = W.R, dir = this.attackDir(R.team);
      W.cx = R.pos.x; W.cy = R.pos.y;
      W.front = this.defense.some((d: any) => (d.pos.x - R.pos.x) * dir > 0 && Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) <= 10);
      const side = Math.sign(R.pos.y - this.ballY) || 1;
      W.owners = this.defense.filter((d: any) => { const z = (d.behavior as any)?.zone; return typeof z === 'string' && OUT.test(z) && (d.pos.y - this.ballY) * side > -3; })
        .map((d: any) => ({ zone: (d.behavior as any).zone, slot: d.slot, carrying: (d.behavior as any).target?.slot ?? '-', label: last.get(d) ?? '?',
          over: (d.pos.x - R.pos.x) * dir, out: (d.pos.y - R.pos.y) * side, dist: Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) }));
      W.wide = Math.min(R.pos.y, FIELD_WIDTH - R.pos.y) < 10;
    }
    if (W.kc !== undefined && (this.phase !== 'live' || this.t >= W.kc + 1.0)) {
      W.done = true;
      if (this.t >= W.kc + 1.0 - 1e-9 && W.wide && !this.defCall?.coverage?.man)
        rows.push({ call: this.defCall?.coverage?.id, slot: W.R.slot, route: W.route, tt: W.tt, kc: W.kc, front: W.front, owners: W.owners });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const p50 = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(1) : '-'; };
const cnt = (v: any[], f: (x: any) => string) => { const m = new Map<string, number>(); for (const x of v) m.set(f(x), (m.get(f(x)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '); };
console.log(`seed ${seed}, ${games} games: zone completions caught wide, live at +1 s: n ${rows.length}`);
for (const front of [false, true]) {
  const v = rows.filter(r => r.front === front);
  console.log(` ${front ? 'someone in front' : 'NOBODY in front'}: n ${v.length} | throw at p50 ${p50(v.map(r => r.tt))} s, catch ${p50(v.map(r => r.kc))} s | catcher ${cnt(v, r => r.slot)} | routes ${cnt(v, r => String(r.route))}`);
  console.log(`   calls: ${cnt(v, r => r.call)}`);
  const O = v.flatMap(r => r.owners);
  console.log(`   outside owners on his side (n ${O.length}): zones ${cnt(O, o => o.zone)}`);
  for (const z of ['flat', 'curl_flat', 'deep_third', 'quarter']) {
    const w = O.filter((o: any) => o.zone.startsWith(z)); if (!w.length) continue;
    console.log(`     ${z}: n ${w.length} | over the catcher p50 ${p50(w.map((o: any) => o.over))}, toward the sideline ${p50(w.map((o: any) => o.out))}, distance ${p50(w.map((o: any) => o.dist))} | technique ${cnt(w, (o: any) => o.label)} | carrying the catcher ${w.filter((o: any) => o.carrying === v.find(r => r.owners.includes(o))?.slot).length}, carrying ${cnt(w, (o: any) => o.carrying)}`);
  }
  const noFlat = v.filter(r => !r.owners.some((o: any) => /^(flat_|curl_flat_)/.test(o.zone)));
  console.log(`   plays with no flat / curl-flat owner on his side: ${noFlat.length} (calls ${cnt(noFlat, r => r.call)})`);
}
