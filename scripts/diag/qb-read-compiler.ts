/**
 * Read-plan compiler, Phase 0 audit (docs/research/2026-11-11-qb-read-compiler-design.md §21). Report only:
 * for every ordinary pass concept (the 17 installed plus CONCEPT_MENU's 15) × formation family × flip, the
 * eligible routes and their throw windows (from the engine with defenders parked), the motifs found, candidates
 * accepted and rejected with reasons, and the chosen plan under the default pure-leaning profile; then how the
 * chosen pure order compares with the hand-written progression. QBPass is untouched.
 *
 *   node --import tsx scripts/diag/qb-read-compiler.ts [--json out/read-compiler/audit.json] [--concepts a,b] [--brief]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { MENU_CONCEPTS, PASS_BY_ID, SCREEN_CONCEPTS } from '../../src/playbook/concepts.js';
import { compile } from '../../src/playbook/read-compiler/compile.js';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const brief = process.argv.includes('--brief');
const only = arg('--concepts')?.split(',');
const FORMS: Record<string, string> = { '2x2': 'gun_doubles_11', '3x1': 'gun_trips_11', bunch: 'gun_bunch_11', empty: 'gun_empty_11', '12p': 'gun_wing_12' };
const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
const base = Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c));
const all = [...base, ...MENU_CONCEPTS, ...SCREEN_CONCEPTS].filter((c) => !only || only.includes(c.id));

const rows: unknown[] = [];
const agree = { n: 0, first: 0, firstTwo: 0, same: 0 };
const summary: string[] = [];
let plays = 0, withPlan = 0, multi = 0, badKey = 0, dup = 0, blockedTarget = 0;
for (const c of all) {
  for (const [fam, form] of Object.entries(FORMS)) for (const flip of [false, true]) {
    const p = compile(c, form, flip, off, def);
    plays++;
    if (p.bypass) { if (!flip && fam === '2x2') summary.push(`${c.id}: bypassed (${p.bypass})`); rows.push(p); continue; }
    const valid = p.candidates.filter((x) => x.valid);
    if (p.chosen) withPlan++;
    if (valid.length >= 2) multi++;
    badKey += p.candidates.filter((x) => x.valid && x.style === 'defender_key' && !x.key?.role).length;
    const order = p.chosen?.order.map((s) => s.ref) ?? [];
    if (new Set(order).size !== order.length) dup++;
    const routeRefs = new Set(p.routes.map((r) => r.ref));
    if (order.some((r) => !routeRefs.has(r))) blockedTarget++;
    // Against the hand-written progression, among receivers who exist in this formation.
    const hand = c.progression.filter((r) => routeRefs.has(r));
    agree.n++; if (hand[0] === order[0]) agree.first++;
    if (hand.slice(0, 2).join() === order.slice(0, 2).join()) agree.firstTwo++;
    if (hand.slice(0, 3).join() === order.slice(0, 3).join()) agree.same++;
    rows.push({ ...p, routes: p.routes.map(({ trajectory, ...r }) => r), hand });
    if (brief && !(fam === '2x2' && !flip) && !(fam === '3x1' && !flip)) continue;
    console.log(`\n=== ${c.id} | ${fam} (${form})${flip ? ' flipped' : ''} | QB set ${p.qbSetAt} s`);
    for (const r of [...p.routes].sort((a, b) => a.window.ready - b.window.ready))
      console.log(`  ${r.ref.padEnd(3)} ${r.slot.padEnd(3)} ${r.routeId.padEnd(13)} break ${r.breakT === null ? '  —  ' : r.breakT.toFixed(2)} @ ${r.breakAt ? r.breakAt.x.toFixed(1) : ' — '} yd | window ${r.window.ready.toFixed(2)}–${r.window.last.toFixed(2)} s at ${r.depthAtReady} yd${r.crossesField ? ' | crosses' : ''}`);
    for (const e of p.excluded) console.log(`  (out) ${e.ref}: ${e.why}`);
    for (const m of p.motifs) console.log(`  motif ${m.kind}${m.role ? ` [${m.role}]` : ''} ${m.refs.join('+')}: ${m.why}`);
    for (const x of p.candidates) console.log(`  ${x === p.chosen ? '*' : x.valid ? '+' : '-'} ${x.style.padEnd(15)} ${x.score.toFixed(2)} | ${x.order.map((s) => `${s.ref}(${s.rhythm})`).join(' → ')}${x.outlet ? ` → outlet ${x.outlet}` : ''}${x.alert ? ` | alert ${x.alert}` : ''}${x.key ? ` | key ${x.key.role}: cue → ${x.key.onCue}, else ${x.key.otherwise}, by ${x.key.cueBy} s` : ''}${x.halves ? ` | halves S ${x.halves.strong.join(',')} / W ${x.halves.weak.join(',')}` : ''}${x.hardFailures.length ? ` | rejected: ${x.hardFailures.join('; ')}` : ''}${x.warnings.length ? ` | warn: ${x.warnings.join('; ')}` : ''}`);
    console.log(`  hand-written: ${hand.join(' → ')}`);
  }
}
console.log(`\n== ${plays} compiles (${all.length} concepts × ${Object.keys(FORMS).length} formations × 2 flips)`);
console.log(`   at least one plan: ${withPlan} of ${plays - all.filter((c) => c.screen).length * 10} non-screen; two or more valid plans: ${multi}`);
console.log(`   invalid defender keys chosen: ${badKey}; duplicate receivers in a plan: ${dup}; non-route targets: ${blockedTarget}`);
console.log(`   versus the hand-written progression: first read agrees ${agree.first}/${agree.n}, first two ${agree.firstTwo}/${agree.n}, first three ${agree.same}/${agree.n}`);
for (const s of summary) console.log(`   ${s}`);
const json = arg('--json');
if (json) { mkdirSync(dirname(json), { recursive: true }); writeFileSync(json, JSON.stringify(rows, null, 1)); }
