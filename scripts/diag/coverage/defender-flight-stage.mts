/** Defender's flight picture (Flex, 2026-11-25, Integration's scope of BALL_EST bit 4096): with the default (receivers
 * only) every defender past throw recognition copies the true flight; with the estimator on for the defense he has only
 * what he has seen. Per thrown play, the defender nearest the true landing at the throw: his coverage kind, whether his
 * back was to the passer at the release (facing > 90 deg off the passer), when he first had a flight recorded
 * (acquireFlight's store) and his own first sample of the ball, and how far his recorded landing is from the true one.
 * Read-only observers (hasObservedFlight, rememberedFlight, firstSeenAt). usage: BALL_EST=<mask> node --import tsx scripts/diag/coverage/defender-flight-stage.mts */
import { nativeTraceSetup } from '../command-trace.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { hasObservedFlight, rememberedFlight } from '../../../src/sim/possession-read.js';
const med = (a: number[]) => { const b = a.filter(Number.isFinite).sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)].toFixed(2) : '-'; };
const byWatch: Record<string, number[]> = {};
const rows: Record<string, { n: number; never: number; tRec: number[]; tSeen: number[]; err: number[] }> = {};
for (const [concept, coverage] of [['curl_flat', 'cover3'], ['stick', 'cover3'], ['curl_flat', 'cover2'], ['four_verts', 'cover1'], ['slant_flat', 'cover1']] as const) for (let seed = 1; seed <= 16; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  let D: any = null, kind = '', back = false, landing: any = null, tRec = NaN, t0 = NaN;
  for (let i = 0; i < 400 && sim.phase === 'live'; i++) {
    sim.tick();
    if (sim.throwAt >= 0 && !D && sim.ball.kind === 'air' && sim.ballPath?.length) {
      t0 = sim.throwAt; landing = sim.ballPath.at(-1);
      D = sim.defense.filter((d: any) => !/^(DE|DT|NT)/.test(d.slot)).sort((a: any, b: any) => Math.hypot(a.pos.x - landing.x, a.pos.y - landing.y) - Math.hypot(b.pos.x - landing.x, b.pos.y - landing.y))[0];
      kind = D.behavior?.kind ?? '?';
      const toQb = Math.atan2(sim.qb.pos.y - D.pos.y, sim.qb.pos.x - D.pos.x), off = Math.abs(Math.atan2(Math.sin(D.body.facing - toQb), Math.cos(D.body.facing - toQb)));
      back = off > Math.PI / 2;
    }
    if (D && Number.isNaN(tRec) && hasObservedFlight(D)) tRec = sim.t - t0;
    const fs = D ? sim.ballEstimates?.firstSeenAt?.(D) : undefined, rp = D && fs !== undefined ? rememberedFlight(D, 0) : null;
    if (rp?.length && sim.ball.kind === 'air') { const at = rp.reduce((b: any, p: any) => Math.abs(p.t - landing.t) < Math.abs(b.t - landing.t) ? p : b, rp[0]); const w = sim.t - fs!; const k = w < 0.2 ? '0.0-0.2 s' : w < 0.4 ? '0.2-0.4 s' : w < 0.6 ? '0.4-0.6 s' : '0.6+ s'; (byWatch[k] ??= []).push(Math.hypot(at.x - landing.x, at.y - landing.y)); }
    if (D && sim.ball.kind !== 'air') break;
  }
  if (!D) continue;
  const key = `${concept} vs ${coverage} | ${kind} | back ${back ? 'turned' : 'to QB'}`;
  const r = (rows[key] ??= { n: 0, never: 0, tRec: [], tSeen: [], err: [] }); r.n++;
  const seen = sim.ballEstimates?.firstSeenAt?.(D); if (seen !== undefined) r.tSeen.push(seen - t0);
  if (Number.isNaN(tRec)) r.never++; else r.tRec.push(tRec);
  // His recorded flight at the true flight's end time (the catch or landing), against where the ball truly was then.
  const path = rememberedFlight(D, 0) ?? null;
  if (path?.length) { const at = path.reduce((b: any, p: any) => Math.abs(p.t - landing.t) < Math.abs(b.t - landing.t) ? p : b, path[0]); r.err.push(Math.hypot(at.x - landing.x, at.y - landing.y)); }
}
console.log(`BALL_EST=${process.env.BALL_EST ?? 'default 6145'}\n| case | n | no flight recorded | flight recorded after release (s) | own first sample after release (s) | his recorded flight at the true arrival time, off the ball (yd) |\n|---|---|---|---|---|---|`);
for (const [k, r] of Object.entries(rows).sort()) console.log(`| ${k} | ${r.n} | ${r.never} | ${med(r.tRec)} | ${med(r.tSeen)} (${r.tSeen.length}) | ${med(r.err)} |`);
console.log('\n| time since his own first sample | ticks | his recorded flight at the true arrival, off the ball (yd, median) |\n|---|---|---|');
for (const k of ['0.0-0.2 s', '0.2-0.4 s', '0.4-0.6 s', '0.6+ s']) if (byWatch[k]) console.log(`| ${k} | ${byWatch[k].length} | ${med(byWatch[k])} |`);
