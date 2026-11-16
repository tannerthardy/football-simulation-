// [QB_CALL_ROUTES=1] node --import tsx scripts/diag/eyes/call-routes-panel.ts > rows.jsonl
// QB_CALL_ROUTES' consequential cases, staged (the dropback set cannot see it): play action with a back's route after
// the fake, check-release backs (screens are not in the play pool yet: screen lab only). One row a play: his reads when he first reads (slots), for each check-release
// man the first tick he counted him on a route and the first his picture had him out, his protection count as used and
// the live protector count over the play, and the result. Passive except calling his own onRoute (pure).
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
export const PANEL: [string, string][] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot', 'stick', 'hitches', 'curl_flat'])
  for (const formation of ['gun_doubles_11', 'ace_11', 'i_pro_21', 'gun_trips_11']) PANEL.push([concept, formation]);
export function panelRows() {
  const rows: any[] = [];
  for (const [concept, formation] of PANEL) for (const coverage of ['cover1', 'cover3']) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation, flip: false })); } catch { continue; }
    let qb: any = null, reads: string[] | null = null, early = 0, checks = 0;
    const counted = new Map<any, number>(), seen = new Map<any, number>(), live: number[] = [];
    for (let i = 0; i < 600 && sim.phase === 'live'; i++) {
      sim.tick(); const b: any = sim.qb.behavior;
      const coord = sim.offense.map((o: any) => o.behavior?.coord).find((c: any) => c?.protectors);
      if (coord) live.push(coord.protectors.length);
      if (b?.kind !== 'qb-pass' || sim.carrier !== sim.qb) continue;
      qb ??= b; reads ??= b.reads.map((r: any) => r.slot);
      for (const r of b.reads) {
        if (b.receiverForecasts.get(r)?.prior.startDelay !== null || b.concept.family === 'screen' || b.concept.screen) continue;
        if (!counted.has(r) && b.onRoute(r)) counted.set(r, sim.t);
        if (!seen.has(r) && b.outSeen.has(r)) seen.set(r, sim.t);
      }
    }
    for (const [r, t] of counted) { checks++; if (!seen.has(r) || seen.get(r)! > t + 1e-9) early++; }
    if (!qb) continue;
    rows.push({ concept, formation, coverage, seed, reads, checks, early, used: qb.callBlockers ?? null,
      liveMin: live.length ? Math.min(...live) : null, liveMax: live.length ? Math.max(...live) : null,
      cmp: sim.events.some((e: any) => e.type === 'catch' || e.type === 'completion'), sack: sim.events.some((e: any) => e.type === 'sack') });
  }
  return rows;
}
if (process.argv[1]?.endsWith('call-routes-panel.ts')) for (const r of panelRows()) console.log(JSON.stringify(r));
