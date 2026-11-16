// A receiver's redirects (redirect-op.mts) in a common-format export (NFL or sim): offensive WR / TE / RB tracks on pass plays from the snap to the throw's arrival
// (for the targeted receiver until the catch, for the others until the whistle), 10 Hz. usage: node --import tsx scripts/diag/route-speed/redirect-tracks.mts FILE.jsonl.gz [LABEL]
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
const W = process.cwd();
const { redirects, summary } = await import(`${W}/scripts/diag/route-speed/redirect-op.mts`);
const file = process.argv[2]!, label = process.argv[3] ?? file.replace(/.*\//, '').slice(0, 24);
const all: any[] = []; let plays = 0, tracks = 0;
for await (const line of createInterface({ input: createReadStream(file).pipe(createGunzip()) })) {
  let raw = JSON.parse(line); if (raw.common) raw = raw.common;
  if (raw.kind !== 'pass') continue;
  const ev = raw.events ?? {}, dt = raw.dt ?? 0.1, endAll = Math.min(raw.end ?? ev.end ?? 99, (raw.xy.length - 1) * dt), endTarget = Math.min(ev.catch ?? ev.pass_arrived ?? endAll, endAll);
  plays++;
  raw.players.forEach((pl: any, i: number) => {
    if (pl.side !== 'O' || !['WR', 'TE', 'RB'].includes(pl.group)) return;
    const n = Math.floor((i === raw.target ? endTarget : endAll) / dt) + 1, tr: Array<[number, number] | null> = [];
    for (let k = 0; k < n; k++) { const x = raw.xy[k]?.[2 * i], y = raw.xy[k]?.[2 * i + 1]; tr.push(x == null || y == null ? null : [x, y]); }
    tracks++; all.push(...redirects(tr, dt));
  });
}
console.log(`${plays} pass plays, ${tracks} tracks`);
console.log(summary(label, all));
