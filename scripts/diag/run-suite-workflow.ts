/** Selection/receipts around the frozen v1 operator. No engine changes.
 * Default: plan, zero snaps. See docs/RUN_SUITE.md for explicit execution.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { caseKey, frozenInput, measure, provenance, readJSON, sha, validateCache, validateManifest,
  type Case, type Manifest } from './run-action-suite.js';

export const CATALOG = 'data/reviews/current/run-action-suite/accepted-manifest.json.gz';
const FOCUS = 'config/run-suite-focus.json', RESERVE = 'config/run-suite-reserve.json';
const SELF = 'scripts/diag/run-suite-workflow.ts';
const fileSha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
type Provenance = ReturnType<typeof provenance>;
export type Partition = 'accepted-runs' | 'shared-pa' | 'all-accepted' | 'prototypes';
export interface Selection { partition?: Partition; ids?: string[] }
export interface ReserveSpec {
  schema: 'run-suite-reserve-v1'; catalogSha256: string; status: 'unrun'; seed: number;
  cases: Array<{ baseId: string; reason: string; inputSha256: string }>;
}

export function pairId(c: Case): string {
  return 'shared-pa/' + [c.family,c.formation,c.look,c.roster,c.seed,c.direction,c.context,c.package].join('/');
}
export function sharedRegistry(m: Manifest) {
  const pairs = new Map<string, Case[]>();
  for (const c of m.cases.filter(c => c.phase === 'pa')) {
    const id = pairId(c); pairs.set(id, [...(pairs.get(id) ?? []), c]);
  }
  return { schema: 'shared-play-action-registry-v1', catalogSha256: sha(m),
    measurement: 'run-action-v1', pairs: [...pairs].map(([id, cases]) => {
      if (cases.length !== 2 || new Set(cases.map(c => c.arm)).size !== 2
        || !cases.some(c => c.arm === 'pa') || !cases.some(c => c.arm === 'plain')) throw new Error('Incomplete PA pair ' + id);
      const c = cases[0];
      const counterpart = m.cases.find(r => r.arm === 'run' &&
        ['family','formation','look','roster','seed','direction','context'].every(k => r[k as keyof Case] === c[k as keyof Case]));
      if (!counterpart) throw new Error('Missing run counterpart ' + id);
      return { id, cases: cases.map(c => ({ id: c.id, inputSha256: c.inputSha256 })),
        runCounterpart: { id: counterpart.id, inputSha256: counterpart.inputSha256 } };
    }) };
}

/** Select from the ORIGINAL manifest: selection never changes its cache identity.
 * Close PA pairs automatically; report the added control instead of double billing it.
 */
export function selectCases(m: Manifest, selection: Selection): { cases: Case[]; addedControls: string[] } {
  if (Boolean(selection.partition) === Boolean(selection.ids)) throw new Error('Choose one partition or explicit case list');
  let cases: Case[];
  if (selection.ids) {
    const wanted = new Set(selection.ids);
    if (!wanted.size || wanted.size !== selection.ids.length) throw new Error('Empty or duplicate case list');
    for (const id of wanted) if (!m.cases.some(c => c.id === id)) throw new Error('Unknown case ' + id);
    cases = m.cases.filter(c => wanted.has(c.id));
  } else {
    const p = selection.partition!;
    if (!['accepted-runs','shared-pa','all-accepted','prototypes'].includes(p)) throw new Error('Unknown partition ' + p);
    if ((m.host === 'perimeter') !== (p === 'prototypes')) throw new Error('Partition/host mismatch');
    cases = m.cases.filter(c => p === 'all-accepted' || p === 'prototypes' || (p === 'shared-pa' ? c.phase === 'pa' : c.arm === 'run'));
  }
  if (!cases.length) throw new Error('Empty selection');
  const original = new Set(cases.map(c => c.id)), wanted = new Set(original);
  for (const c of cases.filter(c => c.phase === 'pa')) {
    const pair = m.cases.filter(p => p.phase === 'pa' && pairId(p) === pairId(c));
    if (pair.length !== 2 || new Set(pair.map(p => p.arm)).size !== 2) throw new Error('Incomplete PA pair ' + c.id);
    for (const control of pair) wanted.add(control.id);
  }
  return { cases: m.cases.filter(c => wanted.has(c.id)), addedControls: [...wanted].filter(id => !original.has(id)) };
}

/** Frozen athletes, new execution seeds. This is NOT new roster/front coverage. */
export function reserveManifest(m: Manifest, spec: ReserveSpec): Manifest {
  if (spec.schema !== 'run-suite-reserve-v1' || spec.status !== 'unrun' || sha(m) !== spec.catalogSha256
    || !Number.isSafeInteger(spec.seed) || spec.seed < 0) throw new Error('Invalid reserve declaration');
  const reserved = structuredClone(m); reserved.cases = [];
  for (const item of spec.cases) {
    const base = m.cases.find(c => c.id === item.baseId);
    if (!base || base.arm !== 'run') throw new Error('Invalid reserve base ' + item.baseId);
    const c = { ...base, id: 'reserve-v1/' + base.id, seed: spec.seed, inputSha256: undefined as string | undefined };
    c.inputSha256 = sha(frozenInput(reserved, c));
    if (c.inputSha256 !== item.inputSha256 || m.cases.some(old => old.inputSha256 === c.inputSha256)) throw new Error('Reserve drift or previously surveyed input');
    reserved.cases.push(c);
  }
  validateManifest(reserved);
  if (!reserved.cases.length) throw new Error('Empty reserve');
  return reserved;
}

export function preflightEvidence(m: Manifest, cases: Case[], p: Provenance, index: any) {
  // A candidate can intentionally change source/flags. Inputs, operator and
  // environment must match. Never recollect an absent/stale baseline implicitly.
  const { source: a, flags: af, ...measurement } = p;
  const { source: b, flags: bf, ...oldMeasurement } = index.provenance ?? {};
  if (index.status !== 'complete' || sha(measurement) !== sha(oldMeasurement)) throw new Error('Incompatible comparison measurement/environment');
  const entries = new Map<string, any>((index.rows ?? []).map((r: any) => [r.id, r]));
  const rows = new Map<string, any>();
  for (const c of cases) {
    const entry = entries.get(c.id);
    if (!entry || !existsSync(entry.path)) throw new Error('Missing comparison evidence ' + c.id);
    const value = readJSON(entry.path);
    const key = caseKey(m, c, index.provenance);
    if (entry.key !== key) throw new Error('Stale comparison key ' + c.id);
    validateCache(value, key, c); rows.set(c.id, value.row);
  }
  return rows;
}

export function checkExecution(m: Manifest, cases: Case[], p: Provenance,
  settings: { mode: string; reason?: string; pin?: string; source?: string }, head: string) {
  if (!settings.reason?.trim()) throw new Error('Execution requires a question/checkpoint reason');
  if (!settings.pin || !/^[a-f0-9]{40}$/.test(settings.pin) || head !== settings.pin
    || !settings.source || !/^[a-f0-9]{64}$/.test(settings.source) || p.source !== settings.source) throw new Error('Exact HEAD/source pin required');
  if (!['focus','checkpoint'].includes(settings.mode)) throw new Error('Explicit focus or checkpoint execution required');
  if (settings.mode === 'focus' && cases.length > 32) throw new Error('Focused selection exceeds 32 cases; narrow the question');
  const profile = readJSON('config/baseline.json');
  if (p.node !== 'v' + profile.nodeVersion || sha(p.flags) !== sha(profile.flags)) throw new Error('Use the pinned Node and baseline launcher settings');
  if (m.host === 'perimeter' && cases.some(c => c.phase !== 'perimeter')) throw new Error('Prototype host mixed with accepted cases');
  if (m.host === 'perimeter' && cases.some(c => !RUN_BY_ID[m.runs[c.family]?.id]
    || RUN_BY_ID[m.runs[c.family].id].scheme !== m.runs[c.family].scheme)) throw new Error('Prototype calls absent from this engine host');
}

function save(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true }); const tmp = path + '.tmp';
  const bytes = JSON.stringify(value, null, 2) + '\n';
  writeFileSync(tmp, path.endsWith('.gz') ? gzipSync(bytes) : bytes); renameSync(tmp, path);
}
function parse(args: string[]) {
  const [mode = 'plan', ...tail] = args, options: Record<string, string | boolean> = {};
  const flags = new Set(['reuse-only']);
  const values = new Set(['manifest','set','cases','partition','out','cache-dir','compare','reason','pin','source','unlock-reserve','reserve-cases']);
  while (tail.length) {
    const key = tail.shift()!;
    if (!key.startsWith('--') || Object.hasOwn(options, key.slice(2))) throw new Error('Invalid/repeated argument ' + key);
    const name = key.slice(2);
    if (flags.has(name)) options[name] = true;
    else if (values.has(name) && tail.length && !tail[0].startsWith('--')) options[name] = tail.shift()!;
    else throw new Error('Unknown/missing argument ' + key);
  }
  return { mode, options };
}

async function main() {
  const { mode, options: o } = parse(process.argv.slice(2));
  if (!['plan','focus','checkpoint','registry'].includes(mode)) throw new Error('Use plan, focus, checkpoint or registry');
  let m = readJSON(String(o.manifest ?? CATALOG)) as Manifest; validateManifest(m);
  if (mode === 'registry') {
    if (!o.out) throw new Error('Registry export requires --out');
    const registry = sharedRegistry(m); save(String(o.out), registry);
    console.log(JSON.stringify({ pairs: registry.pairs.length, simulatedSnaps: 0, out: o.out })); return;
  }
  let selection: Selection | undefined, question: string | undefined;
  if ([o.set, o.cases, o.partition].filter(Boolean).length > 1) throw new Error('Choose one --set, --cases or --partition');
  if (o.set === 'reserve') {
    m = reserveManifest(m, readJSON(RESERVE));
    selection = { ids: o['reserve-cases'] ? readJSON(String(o['reserve-cases'])) : m.cases.map(c => c.id) };
    question = 'Untouched execution-seed transfer after a supported mechanism change';
  } else if (o['reserve-cases']) throw new Error('--reserve-cases requires --set reserve');
  else if (o.set) {
    const focus = readJSON(FOCUS);
    if (focus.catalogSha256 !== sha(m)) throw new Error('Focused-set catalog drift');
    const set = focus.sets[String(o.set)]; if (!set) throw new Error('Unknown focused set ' + o.set);
    selection = { ids: set.ids }; question = set.question;
  } else if (o.cases) selection = { ids: readJSON(String(o.cases)) };
  else if (o.partition) selection = { partition: String(o.partition) as Partition };
  if (!selection) {
    if (mode !== 'plan') throw new Error('Explicit selection required');
    console.log(JSON.stringify({ catalogSha256: sha(m), host: m.host, cases: m.cases.length,
      partitions: m.host === 'accepted' ? { 'accepted-runs': m.cases.filter(c => c.arm === 'run').length,
        'shared-pa': m.cases.filter(c => c.phase === 'pa').length } : { prototypes: m.cases.length },
      sets: m.host === 'accepted' ? [...Object.keys(readJSON(FOCUS).sets), 'reserve'] : [], simulatedSnaps: 0 }, null, 2)); return;
  }
  const selected = selectCases(m, selection), p = provenance(m);
  const plan = { schema: 'run-suite-selection-v1', mode, host: m.host, question,
    selection, catalogSha256: sha(m), addedControls: selected.addedControls,
    cases: selected.cases.map(c => ({ id: c.id, inputSha256: c.inputSha256 })),
    count: selected.cases.length, provenance: p, simulatedSnaps: 0 };
  if (mode === 'plan') { if (o.out) save(String(o.out), plan); console.log(JSON.stringify(plan, null, 2)); return; }
  const head = git('rev-parse','HEAD');
  checkExecution(m, selected.cases, p, { mode, reason: o.reason as string, pin: o.pin as string, source: o.source as string }, head);
  // Actual runtime/operator must be committed at the supplied pin. Docs may differ.
  execFileSync('git',['diff','--exit-code',head,'--','src','config/baseline.json','package-lock.json',
    'scripts/diag/run-action-suite.ts','scripts/source-version.ts',SELF,FOCUS,RESERVE], { stdio: 'pipe' });
  if (!o.out) throw new Error('Execution requires a dedicated --out directory');
  const out = String(o.out), reportPath = join(out, 'index.json');
  if (existsSync(reportPath)) throw new Error('Keep the old receipt; choose a new --out (reuse the same --cache-dir)');
  const guard = () => sha([fileSha(SELF),fileSha(FOCUS),fileSha(RESERVE),fileSha(String(o.manifest ?? CATALOG)),
    ...[o.cases,o['reserve-cases'],o.compare].filter(Boolean).map(path => fileSha(String(path)))]);
  const orchestration = { sha256: fileSha(SELF), inputsSha256: guard(), selectionSha256: sha(plan.cases) };
  const ledger = 'out/run-suite-reserve-consumption.json';
  if (o.set === 'reserve') {
    if (!String(o['unlock-reserve'] ?? '').trim() || o['reuse-only']) throw new Error('Reserve execution needs --unlock-reserve QUESTION; plan it without revealing outcomes');
    if (existsSync(ledger)) throw new Error('Reserve already opened locally; publish its receipt and declare a new reserve before further tuning');
  }
  // Preflight EVERY requested comparison/cache before any candidate simulation.
  const comparisonIndex = o.compare ? readJSON(String(o.compare)) : undefined;
  const baseline = comparisonIndex ? preflightEvidence(m, selected.cases, p, comparisonIndex) : undefined;
  const cacheDir = String(o['cache-dir'] ?? join(out,'cache'));
  const ready = new Map<string, any>();
  for (const c of selected.cases) {
    const key = caseKey(m,c,p), path = join(cacheDir,key + '.json.gz');
    if (existsSync(path)) { const value = readJSON(path); validateCache(value,key,c); ready.set(c.id,value); }
    else if (o['reuse-only']) throw new Error('Missing compatible cache; reuse-only runs zero new snaps: ' + c.id);
  }
  const started = performance.now(), rows: any[] = [], pending: Array<{ path: string; value: any }> = [];
  if (o.set === 'reserve') save(ledger, { head, source: p.source, out, reason: o['unlock-reserve'],
    openedAt: new Date().toISOString(), cases: plan.cases });
  let status = 'complete', failure: string | null = null, executed = 0, cached = 0;
  const budgetMs = mode === 'focus' ? Math.min(30000,m.budgets.campaignMs) : m.budgets.campaignMs;
  for (const c of selected.cases) {
    if (performance.now() - started > budgetMs) { status = 'budget-exhausted'; break; }
    const key = caseKey(m,c,p), path = join(cacheDir,key + '.json.gz');
    try {
      let value = ready.get(c.id);
      if (value) cached++;
      else {
        const row = measure(m,c); value = { key, row, rowSha256: sha(row) }; executed++;
        if (row.status === 'censored-wall') {
          save(join(out,'rejected',key+'.json.gz'),{ reason:'wall-censored',...value });
          throw new Error('Per-case wall budget exhausted: ' + c.id);
        }
        pending.push({ path, value });
      }
      const old = baseline?.get(c.id);
      rows.push({ id: c.id, key, path, status: value.row.status, metrics: value.row.metrics,
        comparison: old ? { status: old.status, metrics: old.metrics,
          physicalIdentity: old.physicalSignature === value.row.physicalSignature } : null });
    } catch (error) { status = 'failed'; failure = String(error); break; }
  }
  const stable = sha(p) === sha(provenance(m)) && head === git('rev-parse','HEAD') && orchestration.inputsSha256 === guard();
  if (!stable) { status = 'failed'; failure = 'Source/input/operator/settings drift; new cache entries discarded'; }
  if (stable) for (const item of pending) save(item.path,item.value);
  else for (const item of pending) {
    const rejected = join(out,'rejected',item.value.key+'.json.gz');
    save(rejected,{reason:'collection-drift',...item.value});
    const entry = rows.find(r => r.key === item.value.key); if (entry) entry.path = rejected;
  }
  const report = { schema: 'run-suite-workflow-v1', head, provenance: p, orchestration,
    selection: plan, reason: o.reason, checkpoint: mode === 'checkpoint', status, failure,
    comparisonProvenance: comparisonIndex?.provenance ?? null,
    budgetMs, caseMs: m.budgets.caseMs, simulationSeconds: m.budgets.simulationSeconds,
    planned: selected.cases.length, executed, cached, elapsedSeconds: (performance.now()-started)/1000,
    censored: rows.filter(r => r.status !== 'native').length, skipped: selected.cases.slice(rows.length).map(c => c.id), rows };
  save(reportPath,report);
  console.log(JSON.stringify({ ...report, selection: undefined, rows: undefined, skipped: report.skipped.length },null,2));
  if (status !== 'complete') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
