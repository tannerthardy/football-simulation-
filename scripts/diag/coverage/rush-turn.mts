// The pass rusher's turn on a throw (Coverage C14, 2026-11-25; Integration's item (c)). Reads only. Same operator as
// Tools' NFL run: on completions, P = the catcher's position at the catch; for each defender rushing at the release, the
// turn is the first tick from the release at which his velocity toward P, v . unit(P - rusher), is 1.5 yd/s or more on
// two consecutive 0.1 s samples (0 if already at the release; never if not by the catch + 0.5 s or 2.5 s). Grouped by his
// distance to P at the release and by whether an offensive non-route player (OL, TE/back in protection) is within
// 1.5 yd of him at the release (geometric, as on the NFL side), with his release-belief source at the turn.
//   [env] node --import tsx scripts/diag/coverage/rush-turn.mts SEED GAMES out.jsonl
//   node --import tsx scripts/diag/coverage/rush-turn.mts --report a.jsonl [b.jsonl]
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const q = (v: (number | null | undefined)[], d = 2) => { const w = v.filter((x): x is number => Number.isFinite(x as number)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map((f) => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
const band = (d: number) => (d < 5 ? '0-5' : d < 10 ? '5-10' : d < 15 ? '10-15' : '15+');

if (process.argv[2] === '--report') {
  for (const f of process.argv.slice(3)) {
    const R = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    console.log(`== ${f}: rushers ${R.length} on completions; air time p50 ${q(R.map((r) => r.air))} s`);
    for (const [name, X] of [['all', R], ['lineman alongside at the release', R.filter((r) => r.alongside)], ['free at the release', R.filter((r) => !r.alongside)]] as const) {
      console.log(` ${name} (n ${X.length}): turn ${q(X.map((r) => r.turn))} s, never ${(X.filter((r) => r.turn === null).length / Math.max(1, X.length)).toFixed(2)}; c at release / +0.5 / +1.0 p50 ${q(X.map((r) => r.c0)).split('/')[1] ?? '-'} / ${q(X.map((r) => r.c5)).split('/')[1] ?? '-'} / ${q(X.map((r) => r.c10)).split('/')[1] ?? '-'}`);
      for (const b of ['0-5', '5-10', '10-15', '15+']) { const B = X.filter((r) => band(r.dist) === b); if (B.length) console.log(`    ${b.padEnd(5)} n ${String(B.length).padStart(4)} turn ${q(B.map((r) => r.turn)).padEnd(15)} never ${(B.filter((r) => r.turn === null).length / B.length).toFixed(2)}`); }
    }
    const src = new Map<string, any[]>(); for (const r of R.filter((r) => !r.alongside)) { const k = r.srcAtTurn ?? '(none)'; if (!src.has(k)) src.set(k, []); src.get(k)!.push(r); }
    console.log(' free rushers by release belief at the turn (or at the catch if never): ' + [...src].map(([k, X]) => `${k} ${X.length} (turn ${q(X.map((r) => r.turn))})`).join('; '));
  }
  process.exit(0);
}

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8), out = process.argv[4] ?? `out/diag/coverage/rush-turn-${seed}.jsonl`;
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, '');
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const P: any = PlaySim.prototype, ev0 = P.event, tick0 = P.tick, b0 = P.buildResult;
const step = 0.1;
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__rt ??= {});
  if (S.relT === undefined && this.ball?.kind === 'air' && this.ball.thrower) {
    S.relT = this.t; S.next = this.t;
    const BLOCK = new Set(['pass-pro', 'run-block', 'screen-block', 'block-look', 'downfield-block']);
    S.rush = (this.defense as any[]).filter((d: any) => /rush/.test(d.behavior?.kind ?? '')).map((d: any) => ({
      d, alongside: (this.offense as any[]).some((o: any) => BLOCK.has(o.behavior?.kind) && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.5),
      samples: [] as any[],
    }));
  }
  if (S.relT !== undefined && this.t >= S.next - 1e-9 && this.t - S.relT <= 2.5 + 1e-9 && (S.catchT === undefined || this.t <= S.catchT + 0.5 + 1e-9)) {
    S.next += step;
    for (const n of S.rush) { const rb = releaseBelief(this, n.d); n.samples.push({ t: +(this.t - S.relT).toFixed(2), p: { ...n.d.pos }, v: { ...n.d.vel }, src: rb.source ?? null, eng: !!n.d.engagement }); }
  }
  return r;
};
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  const S = this.__rt;
  if (S && type === 'catch' && a?.team === 'O' && S.catchT === undefined && S.relT !== undefined) { S.catchT = this.t; S.P = { ...a.pos };
    for (const n of S.rush) { n.atCatch = { armRun: n.d.tags?.has?.('arm-run') ?? false, engaged: !!n.d.engagement, sampled: (this.ballEstimates?.samplesOf?.(n.d) ?? 0) > 0, src: releaseBelief(this, n.d).source ?? null }; } }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__rt;
  if (S?.P && this.stats?.completed) {
    for (const n of S.rush) {
      const c = n.samples.map((s: any) => { const dx = S.P.x - s.p.x, dy = S.P.y - s.p.y, l = Math.hypot(dx, dy) || 1; return (s.v.x * dx + s.v.y * dy) / l; });
      let turn: number | null = null, srcAtTurn: string | null = null;
      for (let i = 0; i < c.length; i++) if (c[i] >= 1.5 && (i === 0 || (c[i + 1] ?? -1) >= 1.5)) { turn = n.samples[i].t; srcAtTurn = n.samples[i].src; break; }
      if (turn === null) srcAtTurn = n.samples.at(-1)?.src ?? null;
      const at = (t: number) => { const i = n.samples.findIndex((s: any) => s.t >= t - 1e-6); return i >= 0 ? +c[i].toFixed(2) : null; };
      appendFileSync(out, JSON.stringify({ air: +(S.catchT - S.relT).toFixed(2), dist: +Math.hypot(S.P.x - n.samples[0].p.x, S.P.y - n.samples[0].p.y).toFixed(1), alongside: n.alongside, turn, srcAtTurn, c0: at(0), c5: at(0.5), c10: at(1.0), atCatch: n.atCatch ?? null, engagedTicks: n.samples.filter((x: any) => x.eng).length, n: n.samples.length }) + '\n');
    }
  }
  this.__rt = undefined;
  return res;
};
if (process.env.STAGED) {
  // Staged: SEED is the seed count; every quick and dropback concept against four-man-rush coverages, flip both ways.
  const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
  for (const concept of ['hitches', 'curl_flat', 'stick', 'slant_flat', 'smash', 'mesh', 'four_verts', 'hitch_out'])
    for (const coverage of ['cover3', 'cover2', 'cover4', 'cover1', 'cover6']) for (let sd = 1; sd <= seed; sd++) for (const flip of [false, true])
      new PlaySim(nativeTraceSetup({ coverage, concept, seed: sd, roster: sd, formation: 'gun_doubles_11', flip })).run();
} else {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
}
console.log(`wrote ${out}`);
