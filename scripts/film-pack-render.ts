import type { packReplayPlay } from './replay-data.js';
import type { FilmPackPlay } from './film-pack-types.js';
import { GROUP_LABELS, GROUP_ORDER } from './film-pack-selection.js';

export type ReplayClip = ReturnType<typeof packReplayPlay>;
export interface FilmReplayContext {
  meta: Record<string, unknown>;
  games: Array<{ seed: number; final: { home: number; away: number };
    quarters: Array<{ home: number; away: number }> }>;
  catalog: Record<string, Record<string, string>>;
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const MAX_PART_BYTES = 15_000_000;

/** Reuse the unmodified replay renderer. A presentation-only plan key supplies
 * its existing generic grouping interface; actual football plan keys stay intact.
 * No new viewer, controller or observer behavior is installed.
 */
export function renderFilmPart(template: string, context: FilmReplayContext,
  items: Array<{ clip: ReplayClip; selection: FilmPackPlay }>): string {
  const marker = '/*__REPLAY_DATA__*/null';
  const groupSelect = '<select id="group-by">';
  if (!template.includes(marker) || !template.includes(groupSelect)) throw new Error('Replay template contract changed: data marker/group selector missing');
  const plays = items.map(({ clip, selection }) => ({ ...clip,
    plan: { ...clip.plan, _filmPackGroup: GROUP_LABELS[selection.group] } }));
  const data = { ...context, plays };
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  const banner = `<section class="app" aria-label="Film pack review order"><h1>Film review pack</h1><p>Watch in the listed order. Light film shows bodies, facing, ball and events; intent and applied forces need a trace. <a href="manifest.json">Manifest</a> · <a href="index.md">Pack index</a></p>`
    + GROUP_ORDER.filter(g => items.some(i => i.selection.group === g)).map(g => `<details><summary>${esc(GROUP_LABELS[g])}</summary><ol>${items.filter(i => i.selection.group === g).map(({ selection: p }) => `<li>${esc(p.id)} — ${esc(p.reason)}</li>`).join('')}</ol></details>`).join('')
    + '<p>Before/after: 20 pair slots reserved for F2; no pairs are included.</p></section>';
  const body = template.replace(marker, () => json).replace(groupSelect,
    `${groupSelect}<option value="_filmPackGroup" selected>Film review order</option>`);
  return `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>\n<body>\n${banner}\n${body}\n</body>\n</html>\n`;
}

/** Bound the actual standalone UTF-8 document, including renderer and labels.
 * A single oversized clip is an explicit failure, never silently truncated.
 */
export function splitFilmParts<T>(items: T[], render: (part: T[]) => string, maxBytes = MAX_PART_BYTES) {
  const parts: Array<{ items: T[]; html: string; bytes: number }> = [];
  let current: T[] = [], html = '';
  for (const item of items) {
    const trial = [...current, item];
    const next = render(trial);
    if (Buffer.byteLength(next) < maxBytes) {
      current = trial;
      html = next;
      continue;
    }
    if (current.length) parts.push({ items: current, html, bytes: Buffer.byteLength(html) });
    current = [item];
    html = render(current);
    if (Buffer.byteLength(html) >= maxBytes) throw new Error(`One film clip cannot fit below ${maxBytes} bytes`);
  }
  if (current.length) parts.push({ items: current, html, bytes: Buffer.byteLength(html) });
  return parts;
}
