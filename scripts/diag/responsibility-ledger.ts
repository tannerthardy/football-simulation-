/** Run the responsibility ledger over saved constructor sets and report the initial-job census, the dynamic
 * duty changes and whether recording changed anything.
 *   node --import tsx scripts/diag/responsibility-ledger.ts census <set.bin> <outDir> [--ids S9-P062,S10-P009] [--compare job-ledger.csv]
 *   node --import tsx scripts/diag/responsibility-ledger.ts time <set.bin> [--reps 3]
 *   node --import tsx scripts/diag/responsibility-ledger.ts restage 7,8        (after matched-restage.ts capture 7 / 8)
 *   node --import tsx scripts/diag/responsibility-ledger.ts saved out/a/play.bin,out/b/play.bin
 * <set.bin> is a V8-serialized array of { id, setup } (Phase I `current-zone-set.bin`, or
 * `zone-climb-ordinary.ts capture`). Raw per-play ledgers go to <outDir>; nothing is committed. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { gzipSync } from 'node:zlib';
import { parseArgs } from 'node:util';
import { PlaySim } from '../../src/sim/playsim.js';
import { dutyTimeline, initialJobCensus } from '../../src/sim/responsibility-views.js';
import { executionIdentity, restoreSetup } from './saved-play.js';

type Entry = { id: string; setup: Buffer; concept?: string; front?: string };
const { values: v, positionals } = parseArgs({ allowPositionals: true, options: { ids: { type: 'string' }, compare: { type: 'string' }, reps: { type: 'string', default: '3' } } });
const [mode, setPath, outDir] = positionals;
const entries = (mode === 'census' || mode === 'time' ? deserialize(readFileSync(setPath)) as Entry[] : []).filter(p => !v.ids || v.ids.split(',').includes(p.id));
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

/** Everything a recorder could disturb: the full result, every event, the RNG, every body and the last intents. */
function fingerprint(sim: PlaySim, result: unknown) {
  return sha({ result, events: sim.events, rng: { ...sim.rng }, t: sim.t, phase: sim.phase,
    bodies: sim.agents.map(a => ({ p: a.body.pos, v: a.body.vel, f: a.body.facing, e: a.body.energy, s: a.body.support?.state })),
    intents: sim.intents, minds: sim.agents.map(a => a.mind) });
}

function play(e: Entry, ledger: boolean) {
  const sim = new PlaySim(restoreSetup(Buffer.from(e.setup)));
  const l = ledger ? sim.recordResponsibility() : null;
  const t0 = performance.now(), result = sim.run(), ms = performance.now() - t0;
  return { sim, result, l, ms, fp: fingerprint(sim, result) };
}

if (mode === 'census') {
  mkdirSync(outDir, { recursive: true });
  const rows: any[] = [], play0: any[] = [];
  let changedPlays = 0, unattributed = 0;
  for (const e of entries) {
    const plain = play(e, false), led = play(e, true);
    const same = plain.fp === led.fp;
    if (!same) changedPlays++;
    const d = led.l!.data, census = initialJobCensus(d), timeline = dutyTimeline(d);
    unattributed += d.changes.filter(c => c.reason === 'unattributed').length;
    const slot = (i: number | null) => i === null ? null : d.actors[i].slot;
    writeFileSync(`${outDir}/${e.id}.json.gz`, gzipSync(JSON.stringify({ id: e.id, ledger: d, census, timeline })));
    play0.push({ id: e.id, same, snapPermitted: d.play.snapPermitted, censored: d.play.censored, jobs: census.length, changes: d.changes.length,
      unattributed: d.changes.filter(c => c.reason === 'unattributed').length, plainFp: plain.fp, ledgerFp: led.fp });
    for (const j of census) rows.push({ play: e.id, ...j, slots: { members: j.members.map(slot), backer: slot(j.backer), defender: slot(j.defender) } });
  }
  const count = (f: (r: any) => boolean) => rows.filter(f).length;
  const threat = (r: any) => r.responsibility.threatRereadAfterRelease, other = (r: any) => r.responsibility.otherClimbTargets.length > 0;
  const summary = {
    identity: executionIdentity(), plays: entries.length, snapsRun: play0.filter(p => p.snapPermitted).length,
    preventedSnaps: play0.filter(p => !p.snapPermitted).map(p => p.id), changedPlays, unattributedChanges: unattributed,
    jobs: rows.length, strata: { L: count(r => r.stratum === 'L'), U: count(r => r.stratum === 'U'), '?': count(r => r.stratum === '?') },
    memberLoadedByFirstCarrierContact: count(r => r.loadByFirstContact === true),
    responsibility: { laterThreatReread: count(threat), otherClimbTarget: count(other), both: count(r => threat(r) && other(r)) },
    plays0: play0,
  };
  writeFileSync(`${outDir}/summary.json`, JSON.stringify({ summary, rows }, null, 1));
  console.log(JSON.stringify({ ...summary, plays0: undefined }, null, 1));
  if (v.compare) {
    const csv = readFileSync(v.compare, 'utf8').trim().split('\n'), head = csv[0].split(',');
    const col = (name: string) => head.indexOf(name);
    const mine = new Map(rows.map(r => [`${r.play}-J${r.id}`, r]));
    let loadMatch = 0, loadMiss: string[] = [], targetMatch = 0;
    for (const line of csv.slice(1)) {
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map(c => c.replace(/,$/, '').replace(/^"|"$/g, ''));
      const r = mine.get(cells[0]);
      if (!r) { loadMiss.push(cells[0] + ' (missing)'); continue; }
      const theirLoad = cells[col('current_member_first_load_s')], theirTarget = cells[col('current_target_first_contact_s')];
      const ok = (theirLoad === '' ? r.firstMemberLoad === null : r.firstMemberLoad !== null && Math.abs(Number(theirLoad) - r.firstMemberLoad) < 1e-6);
      if (ok) loadMatch++; else loadMiss.push(`${cells[0]} theirs=${theirLoad || '-'} mine=${r.firstMemberLoad ?? '-'}`);
      const mineTarget = r.targetCarrierContacts.length ? Math.min(...r.targetCarrierContacts.map((c: any) => c.t)) : null;
      if (theirTarget === '' ? mineTarget === null : mineTarget !== null && Math.abs(Number(theirTarget) - mineTarget) < 1e-6) targetMatch++;
    }
    console.log(JSON.stringify({ comparedWith: v.compare, jobsMatchingCurrentFirstMemberLoad: loadMatch, jobsMatchingCurrentTargetContact: targetMatch, loadMismatches: loadMiss }, null, 1));
  }
} else if (mode === 'time') {
  const reps = Number(v.reps), t = { off: [] as number[], on: [] as number[] };
  for (let r = 0; r < reps; r++) for (const arm of (r % 2 ? ['on', 'off'] : ['off', 'on']) as Array<'on' | 'off'>) {
    let total = 0;
    for (const e of entries) total += play(e, arm === 'on').ms;
    t[arm].push(total);
  }
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(JSON.stringify({ plays: entries.length, reps, offMs: t.off.map(Math.round), onMs: t.on.map(Math.round), medianOffMs: Math.round(med(t.off)), medianOnMs: Math.round(med(t.on)) }));
} else if (mode === 'restage') {
  // Matched restage (scripts/diag/matched-restage.ts capture <seed>): every saved snap, plain vs plain (the control that
  // must change 0 plays) and plain vs ledger (+ the selected-actor trace) on the same constructor bytes.
  const out: any = { identity: executionIdentity(), seeds: {} };
  for (const seed of setPath.split(',')) {
    const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8')) as Array<{ pass: boolean; call: string; setup: string }>;
    const stats = { snaps: plays.length, runs: plays.filter(p => !p.pass).length, passes: plays.filter(p => p.pass).length, controlChanged: 0, ledgerChanged: 0, bothRecordersChanged: 0,
      ledgerPlaysWithRows: 0, ledgerRows: 0, unattributed: 0, changed: [] as string[] };
    plays.forEach((p, i) => {
      const bytes = Buffer.from(p.setup, 'base64');
      const fp = (arm: 'plain' | 'ledger' | 'both') => {
        const sim = new PlaySim(restoreSetup(bytes));
        const l = arm === 'plain' ? null : sim.recordResponsibility();
        if (arm === 'both') sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 0, to: 10 });
        const r = sim.run();
        return { fp: fingerprint(sim, r), l };
      };
      const a = fp('plain'), b = fp('plain'), c = fp('ledger'), d = fp('both');
      if (a.fp !== b.fp) stats.controlChanged++;
      if (a.fp !== c.fp) { stats.ledgerChanged++; stats.changed.push(`${seed}#${i} ${p.call}`); }
      if (a.fp !== d.fp) stats.bothRecordersChanged++;
      if (c.l!.data.rows.length) { stats.ledgerPlaysWithRows++; stats.ledgerRows += c.l!.data.rows.length; }
      stats.unattributed += c.l!.data.changes.filter(x => x.reason === 'unattributed').length;
    });
    out.seeds[seed] = stats;
  }
  console.log(JSON.stringify(out, null, 1));
} else if (mode === 'saved') {
  // Saved plays (capture-game-play.ts): the ledger-on run must reproduce the saved execution exactly.
  const { readSavedPlay, compareExecution, replayState, initialState } = await import('./saved-play.js');
  const rows: any[] = [];
  for (const file of setPath.split(',')) {
    const saved = readSavedPlay(file), sim = new PlaySim(restoreSetup(saved.setup));
    const l = sim.recordResponsibility(), initial = initialState(sim), result = sim.run();
    const difference = compareExecution(saved.original, { initial, result, replay: replayState(sim, result, saved.context) });
    rows.push({ file, play: saved.game.playId, difference, ledgerRows: l.data.rows.length, jobs: l.data.initialJobs.length });
  }
  console.log(JSON.stringify(rows, null, 1));
} else throw new Error('usage: census <set.bin> <outDir> | time <set.bin> | restage <seed,seed> | saved <play.bin,...>');
