// Who reads a picture that is older than a second (Integration, 2026-11-16: the unbounded ageing of an unseen man's picture). Wraps PlaySim.see and PlaySim.track (no
// source change): for every read, the age of the picture it returned, the observer's role, the call site (first caller outside playsim.ts), and for the old ones how far
// the pictured position is from where the man really is. usage: [SIGHT_PURE=1 SIGHT_STALE=bits] node --import tsx scripts/diag/effective-mass/stale-reads.mts FILE [max]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const [file, max] = [process.argv[2]!, Number(process.argv[3] ?? 60)];
const site = (): string => {
  const old = Error.prepareStackTrace, lim = Error.stackTraceLimit; Error.stackTraceLimit = 12; Error.prepareStackTrace = (_e, cs) => cs;
  const o: { stack?: unknown } = {}; Error.captureStackTrace(o, site);
  const cs = o.stack as { getFunctionName(): string | null; getTypeName(): string | null; getFileName(): string | null }[]; Error.prepareStackTrace = old; Error.stackTraceLimit = lim;
  for (const c of cs) {
    const file = (c.getFileName() ?? '?').replace(/.*[\\/]/, ''), fn = c.getFunctionName() ?? '<anonymous>', ty = c.getTypeName();
    if (file === 'stale-reads.mts' || (file.startsWith('playsim') && /(^|\.)(see|track|sighted)$/.test(fn))) continue;
    return `${file}:${ty && ty !== 'Object' && !fn.includes('.') ? ty + '.' : ''}${fn}`;
  }
  return '?';
};
const total = { reads: 0, old: 0, gt3: 0, marked: 0 }; const bySite = new Map<string, { reads: number; old: number; marked: number; err: number[]; age: number[]; errAll: number[]; roles: Set<string> }>();
const proto: any = PlaySim.prototype;
// SIGHT_STALE bit 4: which reads were answered from the alignment (a man not seen since the snap), and how far that guess was from the man, after the record's length (before it the record's oldest sample IS the alignment).
let branch: 'align' | 'lost' | null = null; const align = new Map<string, { n: number; late: number; err: number[] }>();
if (proto.staleOf) { const so = proto.staleOf; proto.staleOf = function (this: any, ...a: any[]) { branch = a[3] === true ? 'align' : 'lost'; return so.apply(this, a); }; }
for (const name of ['see', 'track'] as const) {
  const orig = proto[name];
  proto[name] = function (this: any, observer: any, target: any, ...rest: any[]) {
    branch = null;
    const r = orig.call(this, observer, target, ...rest);
    total.reads++;
    const age = r?.age ?? 0;
    const role = observer === this.carrier ? 'carrier' : observer.team === 'D' ? 'defender' : 'offence';
    const key = `${role} ${site()}`; let s = bySite.get(key); if (!s) bySite.set(key, s = { reads: 0, old: 0, marked: 0, err: [], age: [], errAll: [], roles: new Set() });
    s.reads++;
    if (branch === 'align') { let a = align.get(key); if (!a) align.set(key, a = { n: 0, late: 0, err: [] }); a.n++; if (this.t > 1.2) { a.late++; a.err.push(Math.hypot(r.pos.x - target.pos.x, r.pos.y - target.pos.y)); } }
    if (r?.stale) { total.marked++; s.marked++; s.errAll.push(Math.hypot(r.pos.x - target.pos.x, r.pos.y - target.pos.y)); }
    if (age > 1.0) { total.old++; if (age > 3) total.gt3++; s.old++; s.age.push(age); s.err.push(Math.hypot(r.pos.x - target.pos.x, r.pos.y - target.pos.y)); }
    return r;
  };
}
for (const [i, p] of (JSON.parse(readFileSync(file, 'utf8')) as any[]).entries()) { if (i >= max) break; try { new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))).run(); } catch {} }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
console.log(`${file}: ${max} plays; ${total.reads} reads; ${total.old} older than 1 s (${(100 * total.old / total.reads).toFixed(3)}%), ${total.gt3} older than 3 s; marked stale ${total.marked}`);
for (const [k, s] of [...bySite].sort((a, b) => b[1].old - a[1].old).slice(0, 14)) if (s.old || s.marked) console.log(`  ${k.padEnd(52)} reads ${String(s.reads).padStart(8)} old ${String(s.old).padStart(7)} (${(100 * s.old / s.reads).toFixed(2)}%) stale ${String(s.marked).padStart(7)} (off p50 ${s.errAll.length ? q(s.errAll, .5).toFixed(1) : '-'} p90 ${s.errAll.length ? q(s.errAll, .9).toFixed(1) : '-'}) | age p50 ${q(s.age, .5).toFixed(1)} p90 ${q(s.age, .9).toFixed(1)} max ${Math.max(...s.age).toFixed(1)} s | off the true position p50 ${q(s.err, .5).toFixed(1)} p90 ${q(s.err, .9).toFixed(1)} yd`);
if (align.size) { console.log('answered from the alignment (bit 4), by site; late = after 1.2 s, where the leak and the alignment differ:');
  for (const [k, a] of [...align].sort((x, y) => y[1].late - x[1].late).slice(0, 8)) console.log(`  ${k.padEnd(52)} reads ${String(a.n).padStart(7)} late ${String(a.late).padStart(6)} | off the true position (late) p50 ${a.err.length ? q(a.err, .5).toFixed(1) : '-'} p90 ${a.err.length ? q(a.err, .9).toFixed(1) : '-'} yd`); }
