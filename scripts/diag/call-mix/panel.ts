// Playbook matched panel (used for FLAT_FIRST, kept on branch rules/flat-first): replay the saved pass snaps of matched-restage seeds 7 and 11 under 4 dice shifts
// (Coverage's panel), one row per dropback, so a read-order change is judged play by play. The calls are the
// saved ones; CALL_MIX cannot act here (judge it on games with collect.ts). A saved setup carries its concept
// object, read order included, so each replay re-resolves the concept by id from this checkout's playbook.
//   node --import tsx scripts/diag/matched-restage.ts capture 7; ... capture 11
//   [ARM ENV] node --import tsx scripts/diag/call-mix/panel.ts <arm>   -> out/call-mix/panel-<arm>.jsonl
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';

const arm = process.argv[2] ?? 'x';
mkdirSync('out/call-mix', { recursive: true });
function routeOf(sim: any, a: any): string | null {
  const c = sim.offCall.pass; if (!c) return null;
  const ref = sim.offAlign.refOf[a.slot], spot = sim.offAlign.spots[a.slot];
  if (ref === 'B') return c.back === 'block' ? 'block' : c.back === 'check' ? 'checkdown' : c.back;
  if (ref === 'B2' || !ref) return 'checkdown*';
  if (spot?.inline && c.teBlock) return 'block';
  const side = ref[0] === 'S' ? c.strong : c.weak, n = Number(ref[1]);
  return side[n] ?? (n === 1 ? 'go' : 'seam');
}
const rows: string[] = [];
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, i: number) => {
    if (!p.pass) return;
    const setup: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (setup.offCall?.pass) setup.offCall = { ...setup.offCall, pass: PASS_BY_ID[setup.offCall.pass.id] ?? setup.offCall.pass };
    const sim: any = new PlaySim(setup);
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    const r = sim.run(), s = sim.stats;
    const tgt = s.target ? sim.offense.find((a: any) => a.player.id === s.target) : null;
    rows.push(JSON.stringify({ rec: 'play', callKind: sim.offCall.kind, key: `${seed}:${i}:${k}`, concept: sim.offCall.pass?.id ?? null,
      target: tgt ? { slot: tgt.slot, ref: sim.offAlign.refOf[tgt.slot] ?? null, route: routeOf(sim, tgt) } : null,
      yards: +r.yards.toFixed(2), att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked,
      int: !!s.interceptedBy || r.events.some((e: any) => e.type === 'interception'), air: s.airYards ?? null, yac: s.yac ?? null, ttt: s.timeToThrow ?? null,
      events: r.events.length }));
  });
}
writeFileSync(`out/call-mix/panel-${arm}.jsonl`, rows.join('\n') + '\n');
console.log(arm, 'dropbacks', rows.length);
