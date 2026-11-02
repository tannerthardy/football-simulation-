/** Sim snaps from saved captures (matched-restage seed<N>.json) as gap_soundness_reference.py's jsonl:
 * side/group and snap position (x yd past the LOS, defense +; y).
 * usage: npx tsx scripts/diag/align/snap-positions.mts <root> out.jsonl.gz capture.json... */
const [root, out, ...files] = process.argv.slice(2);
const { readFileSync, writeFileSync } = await import('node:fs');
const { gzipSync } = await import('node:zlib');
const { restoreSetup } = await import(`${root}/scripts/diag/saved-play.ts`);
const { PlaySim } = await import(`${root}/src/sim/playsim.ts`);
const G: Record<string, string> = { T: 'OL', G: 'OL', C: 'OL', OT: 'OL', OG: 'OL', OL: 'OL', TE: 'TE', WR: 'WR', RB: 'RB', FB: 'RB', HB: 'RB', QB: 'QB',
  DE: 'DL', DT: 'DL', NT: 'DL', DL: 'DL', EDGE: 'DL', LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB', CB: 'DB', S: 'DB', FS: 'DB', SS: 'DB', DB: 'DB', NB: 'DB' };
const lines: string[] = []; const miss = new Set<string>();
for (const f of files) for (const p of JSON.parse(readFileSync(f, 'utf8'))) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const players: any[] = [], xy: number[] = [];
  for (const a of sim.agents) {
    const off = a.team === 'O', pos = String(a.player.position);
    const g = off && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : G[pos] ?? (miss.add(pos), off ? 'WR' : 'DB');
    players.push({ side: off ? 'O' : 'D', group: g }); xy.push(+(a.pos.x - sim.los).toFixed(2), +a.pos.y.toFixed(2));
  }
  lines.push(JSON.stringify({ id: `${f}#${lines.length}`, kind: p.pass ? 'pass' : 'run', players, xy: [xy], ball_y: sim.ballY, pers: sim.defCall.personnel }));
}
writeFileSync(out, gzipSync(lines.join('\n') + '\n'));
console.error('snaps', lines.length, 'unmapped positions', [...miss]);
