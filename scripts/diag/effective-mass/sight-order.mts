// Query-order invariance of the sight memo (Integration, 2026-11-15: the QB lane found `sightAt` freezing a past tick's line of sight with the heights of the
// moment it was first asked). Each play runs twice from the same saved setup: as is, and with extra sight questions before every tick: for every observer and
// every opponent, `sighted()` at several delays (earlier and later than the consumers' own) in each of its three views. The extra questions draw no random numbers
// and change nothing a consumer reads except through the memo, so a play that moves was moved by the memo. Prints, per file, how many plays differ and the first
// tick of each difference. usage: [SIGHT_PURE=1] node --import tsx scripts/diag/effective-mass/sight-order.mts out/matched-restage/seed11-run.json [max]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const [file, max] = [process.argv[2], Number(process.argv[3] ?? 1e9)];
const plays = JSON.parse(readFileSync(file, 'utf8')) as any[];
const fingerprint = (sim: any, r: any) => JSON.stringify([r.outcome, +r.yards.toFixed(4), sim.agents.map((a: any) => [+a.pos.x.toFixed(4), +a.pos.y.toFixed(4)])]);
let moved = 0, n = 0; const firsts: string[] = [];
for (const [i, p] of plays.entries()) {
  if (n >= max) break; n++;
  let a: any, ra: any, b: any, rb: any, firstA: string[] = [], firstB: string[] = [];
  try {
    a = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const ta = a.tick.bind(a); a.tick = () => { ta(); firstA.push(`${a.t}:${a.agents.map((q: any) => q.pos.x.toFixed(3)).join(',')}`); }; ra = a.run();
    b = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    let extra = false;
    if (process.env.NO_KEPT_FROM_EXTRA === '1') { const real = new Map(); b.sightKept = { get: (k: string) => real.get(k), set: (k: string, v: any) => { if (!extra) real.set(k, v); return real; }, has: (k: string) => real.has(k), clear: () => real.clear() }; }
    // The extra questions come right after the tick's perception record, where the consumers ask (a question before it would be about a record one tick old).
    const rec = b.perception.record.bind(b.perception); let asking = false;
    b.perception.record = (...args: any[]) => {
      rec(...args);
      if (asking || !(b.t > 0.2) || process.env.EXTRA === '0') return;
      asking = true; extra = true; const before = new Set<string>(b.sightAt ? b.sightAt.keys() : []);
      for (const o of b.agents) for (const t of b.agents) {
        if (o === t || o.team === t.team) continue;
        for (const d of [0.05, 0.2, 0.45]) {
          const seen = b.perception.perceive(t.idx, d);
          b.sighted(o, t, seen, false); b.sighted(o, t, seen, true); b.sighted(o, t, seen, true, true);
        }
      }
      if (process.env.UNDO_MEMO === '1' && b.sightAt) for (const k of [...b.sightAt.keys()]) if (!before.has(k)) b.sightAt.delete(k);
      extra = false; asking = false;
    };
    rb = b.run();
  } catch (e: any) { console.log(`${i} error ${String(e?.message ?? e).slice(0, 100)}`); continue; }
  if (fingerprint(a, ra) !== fingerprint(b, rb)) { moved++; const k = firstA.findIndex((x, j) => x !== firstB[j]); firsts.push(`${i}@${(firstA[k] ?? '').split(':')[0]}`); }
}
console.log(`${file}: ${moved} of ${n} plays differ with extra sight questions (SIGHT_PURE=${process.env.SIGHT_PURE ?? 0}, NO_KEPT_FROM_EXTRA=${process.env.NO_KEPT_FROM_EXTRA ?? 0}); first differing tick (play@t): ${firsts.slice(0, 12).join(' ')}`);
