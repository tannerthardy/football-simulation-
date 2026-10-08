import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';

const games = Number(process.argv[2] ?? 10);
const rng = new Rng(Number(process.argv[3] ?? 11));
type B = { n: number; c: number; y: number; sep: number; sepN: number; yac: number; int: number };
const nb = (): B => ({ n: 0, c: 0, y: 0, sep: 0, sepN: 0, yac: 0, int: 0 });
const byDepth: Record<string, B> = {};
const byCov: Record<string, B> = {};
const byConcept: Record<string, B> = {};
const ttt: number[] = [];
const yacs: number[] = [];
let att = 0;
for (let g = 0; g < games; g++) {
  const h = generateTeam(rng, 'H', 'HHH', { strength: 0.55 });
  const a = generateTeam(rng, 'A', 'AAA', { strength: 0.55 });
  const res = simulateGame(h, a, { seed: rng.nextU32() });
  for (const p of res.log) {
    const s = p.stats;
    if (!s || !s.attempted || s.throwaway) continue;
    att++;
    if (s.timeToThrow !== undefined) ttt.push(s.timeToThrow);
    const ay = s.airYards ?? 0;
    const k = ay < 0 ? '<0' : ay < 10 ? '0-9' : ay < 20 ? '10-19' : '20+';
    const cov = (p.defense.match(/Cover [0-9]( Man)?|Tampa 2|Cover 6/i)?.[0] ?? p.defense).trim();
    const con = p.call.split('—').pop()!.trim();
    for (const [m, key] of [[byDepth, k], [byCov, cov], [byConcept, con]] as const) {
      const b = (m[key] ??= nb());
      b.n++;
      if (s.completed) { b.c++; b.y += p.yards; b.yac += s.yac ?? 0; }
      if (s.interceptedBy) b.int++;
      if (s.separation !== undefined) { b.sep += s.separation; b.sepN++; }
    }
    if (s.completed && s.yac !== undefined) yacs.push(s.yac);
  }
}
const show = (title: string, m: Record<string, B>) => {
  console.log(`\n${title}`);
  for (const [k, b] of Object.entries(m).sort((x, y) => y[1].n - x[1].n))
    console.log(`  ${k.padEnd(22)} n=${String(b.n).padStart(4)} share=${(100 * b.n / att).toFixed(1).padStart(5)}% comp=${(100 * b.c / b.n).toFixed(1).padStart(5)}% Y/A=${(b.y / b.n).toFixed(2).padStart(6)} sep=${(b.sep / Math.max(1, b.sepN)).toFixed(2)} yac=${(b.yac / Math.max(1, b.c)).toFixed(2)} int=${(100 * b.int / b.n).toFixed(1)}%`);
};
show('By air yards', byDepth);
show('By coverage', byCov);
show('By concept', byConcept);
ttt.sort((a, b) => a - b);
yacs.sort((a, b) => a - b);
const q = (arr: number[], f: number) => arr[Math.floor(f * (arr.length - 1))].toFixed(2);
console.log(`\nTTT p10 ${q(ttt, 0.1)} p50 ${q(ttt, 0.5)} p90 ${q(ttt, 0.9)}`);
console.log(`YAC p25 ${q(yacs, 0.25)} p50 ${q(yacs, 0.5)} p75 ${q(yacs, 0.75)} p90 ${q(yacs, 0.9)} share>=20 ${(100 * yacs.filter((v) => v >= 20).length / yacs.length).toFixed(1)}%`);
