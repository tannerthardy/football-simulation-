/** Join the producer's exact selected episodes to the existing offline review consumer.
 * No sampling, simulation, controller calls or automatic football dispositions. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { deserialize } from 'node:v8';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { hash, attachFilms, applyNotes, report, type Queue, type Episode, type FilmManifest } from './film-scout-review.js';
import type { SavedPlay } from './diag/saved-play.js';
import type { WeirdEvent, DetectorId } from './scorecard/weird/types.js';
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const ids: DetectorId[] = ['presnap', 'turned', 'stuck', 'backpedal', 'slide'];
type Index = { identity: SavedPlay['identity']; prefixSteps: number; entries: Array<{
  id: string; setupSha256: string; actors: SavedPlay['original']['initial']['actors']; events: WeirdEvent[] }> };

export function pairedQueue(directory: string): Queue {
  const root = resolve(directory);
  const read = (name: string) => {
    const path = resolve(root, name);
    if (!path.startsWith(root + '/')) throw Error('Evidence path escapes bundle');
    return readFileSync(path);
  };
  const manifest = JSON.parse(read('manifest.json').toString()) as Record<string, string>;
  for (const [name, digest] of Object.entries(manifest)) if (hash(read(name)) !== digest) throw Error(`Evidence checksum mismatch: ${name}`);
  const checked = (name: string) => {
    if (!Object.hasOwn(manifest, name)) throw Error(`Evidence missing from manifest: ${name}`);
    return read(name);
  };
  const bytes = checked('index.json'), index = JSON.parse(bytes.toString()) as Index;
  const all = JSON.parse(checked('events.json').toString()) as { identity: Index['identity']; seed: number; events: WeirdEvent[]; counts: Record<string, number> };
  if (!equal(index.identity, all.identity)) throw Error('Index/events identity mismatch');
  const q: Queue = { version: 1, cardSha256: hash(bytes), recipe: { seed: all.seed,
    quotas: {presnap: 0, turned: 0, stuck: 0, backpedal: 0, slide: 0},
    selection: 'Exact producer-selected episodes in index order; no resampling.',
    controls: 'Original early approach controls retained beside each play; not detector negatives or a recall sample.',
    source: `Paired ordinary prefix (${index.prefixSteps} steps), not a complete game. Historical18 recordings remain unavailable; their dispositions are unchanged.` },
    population: ids.map(detector => { const events = all.events.filter(e => e.detector === detector); return {detector,
      stored: events.length, officialStored: events.filter(e => !e.nullified).length,
      officialCount: all.counts[`${detector}.events`] ?? null, omittedAtLeast: null, controlCandidates: 0}; }),
    episodes: [], warnings: ['Small selected sample; no population precision or recall claim.',
      'Constructor and saved trace identities checked offline. Recorded restoration claims are not a fresh execution.',
      'Original frame positions are center coordinates in yards; commands are yd/s; facing radians; stepStart and endpointTime are distinct seconds.'] };
  const films: FilmManifest = {entries: [], traces: []};
  const seen = new Set<string>();
  for (const entry of index.entries) {
    if (seen.has(entry.id)) throw Error('Duplicate play identity'); seen.add(entry.id);
    const saved = deserialize(checked(`${entry.id}/play.bin`)) as SavedPlay;
    if (saved.format !== 'constructor-play-v1' || !Buffer.isBuffer(saved.setup)
      || hash(saved.setup) !== entry.setupSha256 || saved.setupSha256 !== entry.setupSha256
      || saved.game.playId !== entry.id || !equal(saved.identity, index.identity)
      || !equal(saved.original.initial.actors, entry.actors)) throw Error('Saved input/actor/source mismatch');
    for (const [n, event] of entry.events.entries()) {
      if (event.id !== entry.id || event.nullified || !all.events.some(e => equal(e, event))) throw Error('Selected event mismatch');
      const traceName = `${entry.id}/trace-${n}.json`, trace = JSON.parse(checked(traceName).toString());
      const verify = trace.verification;
      if (!verify || verify.originalVsPlain !== null || verify.originalVsTrace !== null || verify.traceVsPlain !== null
        || verify.setupSha256 !== saved.setupSha256 || !equal(verify.originalIdentity, saved.identity)
        || trace.meta.node !== saved.identity.node) throw Error('Trace restoration/input identity mismatch');
      const from = event.t0, to = event.t1 + .05;
      const steps = trace.steps.filter((s: {stepStart: number}) => s.stepStart >= from - 1e-8 && s.stepStart < to - 1e-8);
      if (steps.length !== Math.round((to - from) / .05) || steps.some((s: {stepStart: number; endpointTime: number}, i: number) =>
        Math.abs(s.stepStart - (from + i * .05)) > 1e-8 || Math.abs(s.endpointTime - s.stepStart - .05) > 1e-8)) throw Error('Trace interval gap');
      const actor = steps[0].actor, original = entry.actors[actor.index];
      if (!original || original.team !== actor.team || original.slot !== actor.slot || original.playerId !== actor.playerId
        || actor.slot !== event.players[0] || steps.some((s: {actor: unknown}) => !equal(s.actor, actor))) throw Error('Trace actor identity mismatch');
      const key = hash(canonical([q.cardSha256, entry.id, event])).slice(0,20);
      if (q.episodes.some(e => e.key === key)) throw Error('Duplicate selected episode');
      const episode: Episode = {key, kind: 'alert', detector: event.detector, play: entry.id,
        actor, from, to, event, source: {commit: saved.identity.commit, engineSha256: saved.identity.engineSha256,
          measurementSha256: null, settings: saved.identity.settings, settingsSha256: hash(canonical(saved.identity.settings)),
          inputSha256: saved.setupSha256, arm: 'original-paired-prefix', game: 1, seed: all.seed, node: saved.identity.node},
        context: {responsibility: null, rawRequest: null, finalRequest: null, achieved: null, contactSupport: null, observations: null, opportunity: null},
        review: null, film: null};
      q.episodes.push(episode);
      // This consumer preserves the original five-detector cohort; new scout
      // families do not silently change its declared sampling recipe.
      if (event.detector in q.recipe.quotas) q.recipe.quotas[event.detector as keyof typeof q.recipe.quotas]++;
      const filmName = `${entry.id}/original.html`; checked(filmName);
      films.entries.push({key, path: filmName, sha256: manifest[filmName], engineSha256: saved.identity.engineSha256,
        settingsSha256: episode.source.settingsSha256!, inputSha256: saved.setupSha256, playId: entry.id});
      films.traces!.push({key, path: traceName, sha256: manifest[traceName], inputSha256: saved.setupSha256});
    }
  }
  attachFilms(q, films, root);
  for (const e of q.episodes) {
    e.film!.sourceQualification = 'Manifest bytes and constructor/source/settings/input/actor/interval joined; original film preserved.';
    e.trace!.sourceQualification = 'Complete selected 20Hz interval; saved original/plain/traced equality checked. Fresh execution is a separate verification.';
    // Replace originating workspace paths with a command usable after relocation.
    e.trace!.command = ['node', '--import', 'tsx', 'scripts/diag/command-trace.ts', '--capture', `${e.play}/play.bin`,
      '--actor', `${e.actor.team}:${e.actor.slot}`, '--from', String(e.from), '--to', String(e.to), '--out', `${e.play}/regenerated.json`];
  }
  return q;
}
function main() {
  const {values:v} = parseArgs({options:{paired:{type:'string'},out:{type:'string'},notes:{type:'string'}}});
  if (!v.paired || !v.out) throw Error('Use --paired original-bundle-directory --out review-directory [--notes notes.json]');
  const q = pairedQueue(v.paired), out = resolve(v.out); mkdirSync(out,{recursive:true});
  if (v.notes) applyNotes(q,JSON.parse(readFileSync(v.notes,'utf8')));
  writeFileSync(resolve(out,'review.md'), report(q,out));
  for (const e of q.episodes) {e.film!.path=relative(out,e.film!.path);e.trace!.path=relative(out,e.trace!.path);}
  writeFileSync(resolve(out,'queue.json'),JSON.stringify(q,null,2)+'\n');
  console.log(`${q.episodes.length} exact paired episodes joined; zero simulated games.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
