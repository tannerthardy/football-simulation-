/** Read-compiler timing control for a route-follower change: every pass concept x formation family (flip off), the sampled
 * route windows (ready / best / last, s) and break time, written as JSON; run it with the flag off and on, then
 *   node --import tsx scripts/diag/route-speed/ready_times.ts out.json
 *   python3 -I scripts/diag/route-speed/ready_diff.py off.json on.json   (concepts whose ready moves by more than 0.1 s) */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { MENU_CONCEPTS, PASS_BY_ID, SCREEN_CONCEPTS } from '../../../src/playbook/concepts.js';
import { sampleRoutes } from '../../../src/playbook/read-compiler/features.js';
const FORMS: Record<string, string> = { '2x2': 'gun_doubles_11', '3x1': 'gun_trips_11', bunch: 'gun_bunch_11', empty: 'gun_empty_11', '12p': 'gun_wing_12' };
const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
const all = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS, ...SCREEN_CONCEPTS];
const rows: unknown[] = [];
for (const c of all) for (const [fam, form] of Object.entries(FORMS)) {
  let s;
  try { s = sampleRoutes(c, form, false, off, def); } catch { continue; }
  for (const r of s.routes) rows.push({ concept: c.id, form: fam, ref: r.ref, ready: r.window.ready, best: r.window.best, last: r.window.last, breakT: r.breakT ?? null, route: (r as any).route ?? null });
}
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(rows.length, 'route windows');
