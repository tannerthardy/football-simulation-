// Engine assignment cards, the catalog half (Coverage, 2026-11-23; reads only): every coverage we can call, every seat
// it names and every underneath seat in fill order, with the fields the catalog itself sets (role kind, landmark,
// match rule, man target preference and technique, pre-snap depth, shown shell, press, formation and structure checks).
// The behaviour behind each landmark, rule and man technique is in docs/reviews/2026-11-23-coverage-cards-engine.md.
// usage: node --import tsx scripts/diag/coverage/seat-cards.mts > out/seat-cards.md   (run from the checkout root)
import { COVERAGES } from '../../../src/playbook/coverages.js';
const cell = (v: unknown) => v === undefined || v === null || v === '' ? '-' : String(v);
const out: string[] = [];
for (const c of COVERAGES) {
  out.push(`### ${c.id}: ${c.name}`, '');
  out.push(`family ${cell(c.family)} | shell ${c.shell}${c.look ? ` (shown ${c.look})` : ''} | man call ${c.man} | press ${c.press}`
    + (c.needs?.length ? ` | needs ${c.needs.join(', ')}` : ''));
  const checks = Object.entries(c.checks ?? {}).map(([k, v]) => `${k} → ${(v as string[]).join('/')}`);
  const sc = (c.structureChecks ?? []).map((s: any) => `${(s.when ?? []).join('+')} → ${(s.to ?? []).join('/')}`);
  out.push(`formation checks: ${checks.join('; ') || 'none'} | structure checks: ${sc.join('; ') || 'none'}`);
  if (c.note) out.push(`note: ${c.note}`);
  out.push('', '| seat | kind | landmark / target | match rule | technique | pre-snap depth |', '|---|---|---|---|---|---|');
  for (const [slot, r] of Object.entries(c.roles) as [string, any][]) {
    if (r.kind === 'zone') out.push(`| ${slot} | zone${r.style ? ` (${r.style})` : ''} | ${r.zone} | ${cell(r.rule)} | - | ${cell(r.depth)} |`);
    else if (r.kind === 'man') out.push(`| ${slot} | man | ${(r.prefer ?? []).join(' > ') || 'nearest'} | - | ${['lev:' + (r.lev ?? 'inside'), r.trail && 'trail', r.overTop && 'overTop', r.protectDepth && 'protectDepth', r.double && 'double', r.press && 'press'].filter(Boolean).join(', ')} | - |`);
    else if (r.kind === 'blitz') out.push(`| ${slot} | blitz | ${r.gap} ${r.side} | - | - | - |`);
    else out.push(`| ${slot} | ${r.kind} | - | - | - | - |`);
  }
  c.underneath.forEach((u: any, i: number) => {
    const z = typeof u === 'string' ? { zone: u } : u;
    out.push(`| under #${i + 1} (next free defender) | zone${z.style ? ` (${z.style})` : ''} | ${z.zone} | ${cell(z.rule)} | - | - |`);
  });
  out.push('');
}
console.log(out.join('\n'));
