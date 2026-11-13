/**
 * Restore a Play Lab note's moment headless and print what the engine did.
 *   npm run lab:replay -- out/lab/notes/<id>.json [--json out/lab/replay/<id>.json] [--pad 0.25]
 *   npm run lab:replay -- out/lab/scenarios/<id>.json --seed 3 --at 1.2 --players D:LB_M,O:RB
 * The note's engine switches are applied before the engine loads. The run is
 * an ordinary PlaySim run of the note's saved constructor input; the command
 * trace covers the note's players across its window.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^-?\d/.test(a));
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
if (!file) {
  console.error('Usage: npm run lab:replay -- <note.json | scenario.json> [--seed N --at T --players D:LB_M,O:RB] [--json out.json] [--pad 0.25]');
  process.exit(2);
}
const input = JSON.parse(readFileSync(file, 'utf8'));
const note = input.format === 'play-lab-note-v1' ? input : null;
const scenario = note ? note.scenario : input;
if (scenario?.format !== 'play-lab-scenario-v1') throw new Error(`${file} is not a Play Lab note or scenario`);

// Engine switches are read when the engine loads: set them first.
const flags: Record<string, string> = { ...(scenario.flags ?? {}), ...(note?.flags ?? {}) };
for (const [k, v] of Object.entries(flags)) process.env[k] = v;
const engine = await import('./engine.js');

const seed = opt('seed') !== undefined ? Number(opt('seed')) : note ? note.seed ?? undefined : undefined;
const at = opt('at') !== undefined ? Number(opt('at')) : note?.at ?? 0;
const pad = Number(opt('pad') ?? 0.25);
const window = note?.window ?? { from: Math.max(0, at - 0.5), to: at + 0.5 };
const players: Array<{ team: 'O' | 'D'; slot: string }> = note ? note.players.map((p: { team: 'O' | 'D'; slot: string }) => ({ team: p.team, slot: p.slot }))
  : (opt('players') ?? '').split(',').filter(Boolean).map(p => { const [team, slot] = p.split(':'); return { team: team as 'O' | 'D', slot }; });

// Identity: say plainly when the engine is not the one the note was written on.
const now = { ...engine.identity(), commit: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } })() };
const lines: string[] = [];
const say = (s = '') => { lines.push(s); console.log(s); };
say(`Play Lab replay · ${note ? `note ${note.id} (${note.category})` : 'scenario'} · ${scenario.name}`);
if (note) say(`Note: ${note.text}`);
if (note?.engine) {
  const same = note.engine.engineSha256 === now.engineSha256;
  say(`Engine: written on ${note.engine.commit ?? '?'}${note.engine.srcDirty ? ' (+uncommitted src)' : ''}; now ${now.commit ?? '?'} · engine source ${same ? 'IDENTICAL' : 'DIFFERENT (the play may not reproduce)'}`);
  const changed = Object.entries(now.settings).filter(([k, v]) => JSON.stringify(note.engine.settings?.[k]) !== JSON.stringify(v)).map(([k]) => k);
  if (changed.length) say(`Settings differ from the note's: ${changed.join(', ')}`);
}
if (scenario.interventions?.length) for (const iv of scenario.interventions)
  say(`Coach's hand: ${iv.team} ${iv.slot} placed at (${iv.to.x.toFixed(2)}, ${iv.to.y.toFixed(2)}) instead of (${iv.from.x.toFixed(2)}, ${iv.from.y.toFixed(2)}) before the snap`);

const run = engine.run(scenario, { seed });
const s = run.summary;
say(`Result: ${s.outcome} ${s.yards} yd in ${s.duration}s (seed ${run.seed ?? "play's own"})${s.penalty ? ` · flag ${s.penalty.kind}` : ''}`);
if (note?.result) say(`Note recorded: ${note.result.outcome} ${note.result.yards} yd → ${note.result.outcome === s.outcome && note.result.yards === s.yards ? 'REPRODUCED' : 'DIFFERENT'}`);

const roster = run.roster;
const idx = (p: { team: string; slot: string }) => roster.findIndex(r => r.team === p.team && r.slot === p.slot);
const tel = run.telemetry!;
const frameAt = (t: number) => tel.frames.reduce((best, f) => Math.abs(f.t - t) < Math.abs(best.t - t) ? f : best, tel.frames[0]);
const f = frameAt(at);
const n = roster.length, k = run.frames.t.findIndex(t => Math.abs(t - f.t) < 1e-6);
const v2 = (v?: [number, number] | null) => v ? `(${v[0].toFixed(2)}, ${v[1].toFixed(2)})` : '–';
const name = (i?: number | null) => i == null || i < 0 ? '–' : `${roster[i].team} ${roster[i].slot}`;

say(`\nMoment ${f.t.toFixed(2)}s (window ${window.from.toFixed(2)}–${window.to.toFixed(2)}s)`);
for (const p of players) {
  const i = idx(p); if (i < 0) { say(`${p.team} ${p.slot}: not in this play`); continue; }
  const ag = f.agents[i], r = roster[i];
  const pos = k >= 0 ? [run.frames.p[(k * n + i) * 3], run.frames.p[(k * n + i) * 3 + 1], run.frames.p[(k * n + i) * 3 + 2]] : [];
  say(`\n${r.team} ${r.slot} · #${r.jersey} ${r.name} (${r.position}, ${r.playerId})`);
  say(`  at (${pos[0]?.toFixed(2)}, ${pos[1]?.toFixed(2)}) facing ${pos[2]?.toFixed(2)} · job ${ag.job ?? ag.kind}${ag.target != null ? ' → ' + name(ag.target) : ''}`);
  say(`  asked vel ${v2(ag.intent?.velocity)}${ag.intent?.facing != null ? ` facing ${ag.intent.facing.toFixed(2)}` : ''} · achieved vel ${v2(ag.body?.velocity)}`);
  if (ag.body) say(`  support ${ag.body.state} · balance ${ag.body.balance} · posture ${ag.body.posture} · energy ${ag.body.energy}`);
  const seen = (f.perception ?? []).filter(q => q.a === i);
  if (seen.length) say(`  saw: ${seen.map(q => `${name(q.b)} @ (${q.position[0].toFixed(1)}, ${q.position[1].toFixed(1)}) ${q.age == null ? '' : q.age.toFixed(2) + 's old'}`).join('; ')}`);
  const tr = engine.trace(scenario, p, Math.max(0, window.from - pad), window.to + pad, seed);
  say(`  command trace ${Math.max(0, window.from - pad).toFixed(2)}–${(window.to + pad).toFixed(2)}s (${tr.steps.length} steps):`);
  for (const st of tr.steps) {
    const d = st.decision, rw = st.rewrites.map(x => x.stage).join('>');
    const purs = (st.pursuit ?? []).map(x => x.data.kind === 'intercept' ? `${x.data.prediction.estimate.status === 'estimated-feasible' ? 'feasible' : 'fallback'} intercept (${x.data.prediction.point.x.toFixed(1)}, ${x.data.prediction.point.y.toFixed(1)}) in ${x.data.prediction.t.toFixed(2)}s` : `chase ${x.data.planner}`).join('; ');
    say(`   ${st.stepStart.toFixed(2)}s ${d ? `${d.ownerAfterUpdate.controller}${d.ownerAfterUpdate.job ? ':' + d.ownerAfterUpdate.job : ''}` : '(no decision)'}`
      + `${st.final ? ` → vel (${st.final.vel.x.toFixed(2)}, ${st.final.vel.y.toFixed(2)})${st.final.effort != null ? ' effort ' + st.final.effort.toFixed(2) : ''}` : ''}${rw ? ' [rewritten: ' + rw + ']' : ''}${purs ? ' · ' + purs : ''}`);
    for (const { data: c } of st.carrier ?? []) {
      if (c.kind === 'design-exit') say(`     design exit: ${c.exit ? 'LEAVE' : 'stay'} · aim blocked ${c.aimBlocked} · best ${c.bestScore?.toFixed(2)} vs aim ${c.aimScore?.toFixed(2)} + ${c.margin.toFixed(2)}`);
      else say(`     runner lane ${c.selected?.heading.toFixed(2)} score ${c.selected?.score.toFixed(2)}${c.selected?.blocked ? ' blocked' : ''}${c.aim ? ` · aim ${c.aim.score.toFixed(2)}${c.aim.blocked ? ' blocked' : ''}` : ''}`
        + ` · held-up credit: ${c.arrival.filter(t => t.blockerBonus > 0).map(t => `${t.defender.slot} +${t.blockerBonus}`).join(', ') || 'none'}`);
    }
  }
}
const evs = run.events.filter(e => e.t >= window.from - pad && e.t <= window.to + pad);
say(`\nEvents ${(window.from - pad).toFixed(2)}–${(window.to + pad).toFixed(2)}s:`);
for (const e of evs) say(`  ${e.t.toFixed(2)}s ${e.type} ${name(e.a)}${e.b != null ? ' → ' + name(e.b) : ''}${e.note ? ' · ' + e.note : ''}`);

const out = opt('json');
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ note, now, run, at, window, players }, null, 1));
  console.log(`\nFull run (frames, telemetry, events) written to ${out}`);
}
