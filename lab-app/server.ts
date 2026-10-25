/**
 * Play Lab: `npm run lab`, then open the printed address.
 * A small local server. The engine runs in worker threads, one pool per set
 * of engine switches; scenarios and notes are files under out/lab/.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { cpus } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import { SCENARIO_FORMAT, sha256, type Scenario } from './engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
process.chdir(root);
const OUT = resolve(root, process.env.LAB_OUT ?? 'out/lab');
const dirs = { scenarios: join(OUT, 'scenarios'), notes: join(OUT, 'notes'), handoff: join(OUT, 'handoff') };
for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true });
const PORT = Number(process.env.LAB_PORT ?? 4173);
const POOL = Math.max(1, Math.min(4, cpus().length - 1));

// ------------------------------------------------------------------ engine pool

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }
class Pool {
  private readonly workers: Array<{ w: Worker; busy: number; pending: Map<number, Pending> }> = [];
  private next = 1;
  constructor(readonly flags: Record<string, string>) {
    for (let i = 0; i < POOL; i++) {
      const w = new Worker(new URL('./worker-entry.mjs', import.meta.url), { env: { ...process.env, ...flags }, execArgv: [] });
      const slot = { w, busy: 0, pending: new Map<number, Pending>() };
      w.on('message', ({ id, value, error }) => {
        const p = slot.pending.get(id); if (!p) return;
        slot.pending.delete(id); slot.busy--;
        if (error) p.reject(new Error(error)); else p.resolve(value);
      });
      w.on('error', (e) => { for (const p of slot.pending.values()) p.reject(e); slot.pending.clear(); slot.busy = 0; });
      this.workers.push(slot);
    }
  }
  call<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
    const slot = this.workers.reduce((a, b) => b.busy < a.busy ? b : a);
    const id = this.next++;
    slot.busy++;
    return new Promise<T>((resolve, reject) => {
      slot.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      slot.w.postMessage({ id, op, args });
    });
  }
  close() { for (const s of this.workers) void s.w.terminate(); }
}
const pools = new Map<string, Pool>();
/** Only engine switches (UPPER_CASE names) reach a worker's environment. */
function pool(flags: Record<string, string> = {}): Pool {
  const clean = Object.fromEntries(Object.entries(flags).filter(([k, v]) => /^[A-Z][A-Z0-9_]*$/.test(k) && typeof v === 'string').sort());
  const key = JSON.stringify(clean);
  let p = pools.get(key);
  if (!p) {
    if (pools.size >= 4) { const [oldest, old] = pools.entries().next().value!; if (oldest !== '{}') { old.close(); pools.delete(oldest); } }
    p = new Pool(clean); pools.set(key, p);
  }
  return p;
}

function commit() {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src'], { encoding: 'utf8' }).trim() !== '';
    return { commit: head, srcDirty: dirty };
  } catch { return { commit: null, srcDirty: null }; }
}

// ------------------------------------------------------------------ files

const safeId = (id: string) => { if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) throw new HttpError(400, 'Bad id'); return id; };
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const list = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
function writeJson(path: string, value: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 1) + '\n'); }

class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }

// ------------------------------------------------------------------ batch jobs

interface Job { id: string; total: number; done: number; failed: number; results: unknown[]; started: number; finished?: number; label: string }
const jobs = new Map<string, Job>();

function startBatch(scenario: Scenario, seeds: number[], label: string, flags: Record<string, string>) {
  if (!seeds.length || seeds.length > 2000) throw new HttpError(400, 'Batch needs 1–2000 seeds');
  const job: Job = { id: Math.random().toString(36).slice(2, 10), total: seeds.length, done: 0, failed: 0, results: [], started: Date.now(), label };
  jobs.set(job.id, job);
  const p = pool(flags);
  void Promise.all(seeds.map(seed => p.call('batch', { scenario, seed })
    .then(r => { job.results.push(r); }, e => { job.failed++; job.results.push({ seed, error: (e as Error).message }); })
    .finally(() => { job.done++; }))).then(() => { job.finished = Date.now(); });
  return job;
}

// ------------------------------------------------------------------ http

async function body(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function send(req: IncomingMessage, res: ServerResponse, status: number, value: unknown, type = 'application/json') {
  let data: Buffer = Buffer.isBuffer(value) ? value : Buffer.from(type === 'application/json' ? JSON.stringify(value) : String(value));
  const headers: Record<string, string> = { 'content-type': type, 'cache-control': 'no-store' };
  if (data.length > 2048 && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) { data = gzipSync(data); headers['content-encoding'] = 'gzip'; }
  res.writeHead(status, headers).end(data);
}

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
function staticFile(req: IncomingMessage, res: ServerResponse, path: string) {
  const pub = join(here, 'public');
  const file = resolve(pub, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(pub + sep) || !existsSync(file) || !statSync(file).isFile()) return send(req, res, 404, 'Not found', 'text/plain');
  send(req, res, 200, readFileSync(file), TYPES[extname(file)] ?? 'application/octet-stream');
}

/** Notes keep the exact run identity, so an agent can restore the moment. */
function saveNote(note: any) {
  if (!note || typeof note.text !== 'string' || !note.scenarioId) throw new HttpError(400, 'A note needs text and a scenario');
  const categories = ['bad decision', 'impossible physics', 'wrong information', 'missing technique', 'looks great', 'other'];
  if (!categories.includes(note.category)) throw new HttpError(400, 'Unknown note category');
  const scenarioPath = join(dirs.scenarios, `${safeId(note.scenarioId)}.json`);
  if (!existsSync(scenarioPath)) throw new HttpError(400, 'Save the scenario before writing notes on it');
  const id = note.id ? safeId(note.id) : `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const saved = { format: 'play-lab-note-v1', ...note, id, saved: new Date().toISOString(),
    scenarioFile: relative(root, scenarioPath), replay: `npm run lab:replay -- ${relative(root, join(dirs.notes, `${id}.json`))}` };
  writeJson(join(dirs.notes, `${id}.json`), saved);
  return saved;
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = url.pathname, method = req.method ?? 'GET';
  const parts = path.split('/').filter(Boolean).slice(1);
  if (path === '/api/catalog') return { ...(await pool().call('catalog') as object), pool: POOL, ...commit() };
  if (path === '/api/rosters') return pool().call('rosters', { rosterSeed: Number(url.searchParams.get('seed') ?? 7), strength: Number(url.searchParams.get('strength') ?? 0.6) });
  if (path === '/api/build' && method === 'POST') { const b = await body(req); return pool(b.base?.flags).call('build', b); }
  if (path === '/api/preview' && method === 'POST') { const b = await body(req); return pool(b.scenario?.flags).call('preview', b); }
  if (path === '/api/run' && method === 'POST') {
    const b = await body(req);
    const run = await pool(b.scenario?.flags).call<Record<string, unknown>>('run', b);
    return { ...run, engine: { ...commit(), ...(run.identity as object) }, scenarioId: b.scenario?.id, setupSha256: b.scenario?.setup?.sha256,
      interventions: b.scenario?.interventions ?? [], flags: b.scenario?.flags ?? {}, ranAt: new Date().toISOString() };
  }
  if (path === '/api/trace' && method === 'POST') { const b = await body(req); return pool(b.scenario?.flags).call('trace', b); }
  if (path === '/api/batch' && method === 'POST') {
    const b = await body(req);
    const job = startBatch(b.scenario, b.seeds, b.label ?? 'batch', b.scenario?.flags ?? {});
    return { id: job.id, total: job.total };
  }
  if (parts[0] === 'jobs' && parts[1]) {
    const job = jobs.get(parts[1]); if (!job) throw new HttpError(404, 'No such job');
    const since = Number(url.searchParams.get('since') ?? 0);
    return { ...job, results: job.results.slice(since), since };
  }
  if (parts[0] === 'scenarios') {
    if (!parts[1] && method === 'GET') return list(dirs.scenarios).map(f => { const s = readJson<Scenario & { saved?: string }>(f);
      return { id: s.id, name: s.name, saved: s.saved, created: s.created, interventions: s.interventions.length, source: s.source?.kind,
        play: s.recipe ? `${s.recipe.offense.concept} vs ${s.recipe.defense.coverage}` : 'saved play' }; })
      .sort((a, b) => String(b.saved).localeCompare(String(a.saved)));
    const id = safeId(parts[1]), file = join(dirs.scenarios, `${id}.json`);
    if (method === 'GET') { if (!existsSync(file)) throw new HttpError(404, 'No such scenario'); return readJson(file); }
    if (method === 'PUT') {
      const s = await body(req) as Scenario;
      if (s.format !== SCENARIO_FORMAT || s.id !== id) throw new HttpError(400, 'Not a Play Lab scenario');
      if (sha256(Buffer.from(s.setup.bytes, 'base64')) !== s.setup.sha256) throw new HttpError(400, 'Setup checksum mismatch');
      const saved = { ...s, saved: new Date().toISOString() }; writeJson(file, saved); return saved;
    }
    if (method === 'DELETE') { rmSync(file, { force: true }); return { deleted: id }; }
  }
  if (parts[0] === 'notes') {
    if (!parts[1] && method === 'GET') {
      const scenario = url.searchParams.get('scenario');
      return list(dirs.notes).map(f => readJson<any>(f)).filter(n => !scenario || n.scenarioId === scenario)
        .sort((a, b) => String(a.saved).localeCompare(String(b.saved)));
    }
    if (!parts[1] && method === 'POST') return saveNote(await body(req));
    const file = join(dirs.notes, `${safeId(parts[1])}.json`);
    if (method === 'GET') return readJson(file);
    if (method === 'DELETE') { rmSync(file, { force: true }); return { deleted: parts[1] }; }
  }
  if (path === '/api/import-saved' && method === 'POST') return importSaved((await body(req)).path);
  if (path === '/api/saved-plays') return savedPlays();
  throw new HttpError(404, `No API route ${method} ${path}`);
}

/** #254 constructor captures (play.bin) under out/ become setup-only scenarios. */
async function importSaved(path: string) {
  const { readSavedPlay } = await import('../scripts/diag/saved-play.js');
  const file = resolve(root, path);
  if (!file.startsWith(resolve(root, 'out') + sep)) throw new HttpError(400, 'Saved plays are read from out/');
  const saved = readSavedPlay(file);
  const scenario: Scenario = { format: SCENARIO_FORMAT, id: `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Saved ${saved.game.playId} (game seed ${saved.game.seed})`, created: new Date().toISOString(),
    // The saved bytes themselves stay the authority.
    setup: { encoding: 'v8-base64', sha256: saved.setupSha256, bytes: saved.setup.toString('base64') }, interventions: [], flags: {},
    source: { kind: 'saved-play', playId: saved.game.playId, identity: saved.identity, text: saved.film.text,
      original: { outcome: saved.original.result.outcome, yards: Math.round(saved.original.result.yards * 100) / 100, events: saved.original.result.events.length } } };
  return scenario;
}

function savedPlays() {
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 5 || !existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1); else if (e.name.endsWith('.bin')) found.push(relative(root, p));
    }
  };
  walk(resolve(root, 'out'), 0);
  return found.slice(0, 200);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return staticFile(req, res, url.pathname);
  api(req, res, url).then(v => send(req, res, 200, v), (e: Error) => send(req, res, e instanceof HttpError ? e.status : 500, { error: e.message }));
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Play Lab: http://localhost:${PORT}/   (engine workers: ${POOL}; files under ${relative(root, OUT)}/)`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { for (const p of pools.values()) p.close(); server.close(); process.exit(0); });
