// One operator for a receiver's redirect, for NFL tracking, sim common-format plays and isolated-body trajectories alike (10 Hz positions, x downfield).
// Velocity at frame k is the central difference over +/-0.1 s (the common format's own quantization is 0.1 yd, so the speed noise is about 0.35 yd/s).
// An event starts at an ONSET frame: the stem is four straight frames (headings within 8 deg of each other) at 4.5-5.5 yd/s; the turn begins at the first frame more than 12 deg
// off the stem, and the onset is the frame before it (his last straight one). The exit heading hf is that of the displacement from onset+8 to onset+14 (0.8-1.4 s on); the event counts when the turn from
// the stem to hf is 80-130 deg (the body that is asked 90 deg is still curving 0.8-1.4 s on, so its displacement heading is a few degrees short), the track holds hf within 20 deg over k+8..k+14 and his speed at k+10 is at least 3 yd/s. The time of the redirect is the first frame after k
// at which his velocity is within 30 deg of hf with at least 3 yd/s along hf. Returned also: speed and heading change at +0.3 and +0.6 s.
export interface Redirect { t30: number; turn: number; v0: number; v3: number; v6: number; a3: number; a6: number;
  /** from the onset: the time his heading is 60 deg or more off the stem (a 90 deg request is then within 30 deg), and the turn achieved and speed at +0.3 / +0.6 / +1.0 s, and his lowest speed in the first second */
  t60: number; r3: number; r6: number; r10: number; s10: number; vmin: number }
const wrap = (a: number) => ((a + 540) % 360) - 180;
/** The measures that need no exit heading, at onset frame k of track p. */
export function measureAt(p: Array<[number, number] | null>, k: number, dt = 0.1): Pick<Redirect, 't60' | 'r3' | 'r6' | 'r10' | 's10' | 'vmin'> | null {
  const vel = (j: number) => { const a = p[j - 1], b = p[j + 1]; return a && b ? [(b[0] - a[0]) / (2 * dt), (b[1] - a[1]) / (2 * dt)] as const : null; };
  const v0 = vel(k), vm = vel(k - 2); if (!v0 || !vm) return null;
  const h0 = Math.atan2(v0[1], v0[0]) * 180 / Math.PI;
  const turned = (j: number) => { const v = vel(k + j); return v ? Math.abs(wrap(Math.atan2(v[1], v[0]) * 180 / Math.PI - h0)) : NaN; };
  const speed = (j: number) => { const v = vel(k + j); return v ? Math.hypot(v[0], v[1]) : NaN; };
  let t60 = NaN, vmin = Infinity; for (let j = 1; j <= 10; j++) { const a = turned(j); if (Number.isNaN(t60) && a >= 60) t60 = j * dt; vmin = Math.min(vmin, speed(j)); }
  return { t60, r3: turned(3), r6: turned(6), r10: turned(10), s10: speed(10), vmin };
}
export function redirects(p: Array<[number, number] | null>, dt = 0.1): Redirect[] {
  const out: Redirect[] = [], n = p.length;
  const vel = (k: number) => { const a = p[k - 1], b = p[k + 1]; return a && b ? [(b[0] - a[0]) / (2 * dt), (b[1] - a[1]) / (2 * dt)] as const : null; };
  const head = (v: readonly [number, number]) => Math.atan2(v[1], v[0]) * 180 / Math.PI;
  const H = (j: number) => { const u = vel(j); return u ? head(u) : NaN; };
  for (let c = 6; c + 16 < n; c++) {
    // stem: four straight frames c-5 .. c-2 within 8 deg of each other at 4.5-5.5 yd/s; the turn starts at c, the first frame more than 12 deg off the stem; the onset is c-1.
    const hs = [c - 5, c - 4, c - 3, c - 2].map(H); if (hs.some(Number.isNaN)) continue;
    const stem = hs[0]!; if (hs.some((x) => Math.abs(wrap(x - stem)) > 8)) continue;
    const vs = vel(c - 2); if (!vs) continue; const s = Math.hypot(vs[0], vs[1]); if (s < 4.5 || s > 5.5) continue;
    if (!(Math.abs(wrap(H(c) - stem)) > 12) || Math.abs(wrap(H(c - 1) - stem)) > 12) continue;
    const k = c - 1, h0 = stem;
    const a = p[k + 8], b = p[k + 14]; if (!a || !b) continue;
    const hf = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, turn = Math.abs(wrap(hf - h0));
    if (turn < 80 || turn > 130) continue;
    let steady = true; for (let j = k + 8; j <= k + 14; j++) { const vj = vel(j); if (!vj || Math.abs(wrap(head(vj) - hf)) > 20) { steady = false; break; } }
    const v10 = vel(k + 10); if (!steady || !v10 || Math.hypot(v10[0], v10[1]) < 3) continue;
    let t30 = NaN; for (let j = k + 1; j <= k + 14; j++) { const vj = vel(j); if (!vj) continue; const along = vj[0] * Math.cos(hf * Math.PI / 180) + vj[1] * Math.sin(hf * Math.PI / 180); if (Math.abs(wrap(head(vj) - hf)) <= 30 && along >= 3) { t30 = (j - k) * dt; break; } }
    const at = (j: number) => { const vj = vel(k + j); return vj ? [Math.hypot(vj[0], vj[1]), Math.abs(wrap(head(vj) - hf))] : [NaN, NaN]; };
    const m = measureAt(p, k, dt); if (!m) continue;
    out.push({ t30, turn, v0: s, v3: at(3)[0]!, v6: at(6)[0]!, a3: at(3)[1]!, a6: at(6)[1]!, ...m });
    c += 15;
  }
  return out;
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))]! : NaN; };
export function summary(label: string, ev: Redirect[]): string {
  const f = (g: (r: Redirect) => number, d = 2) => [.25, .5, .75].map((x) => q(ev.map(g), x).toFixed(d)).join('/');
  return `${label.padEnd(34)} n ${String(ev.length).padStart(4)} | t to <=30 deg and >=3 yd/s along (s) p25/50/75 ${f((r) => r.t30)} (not by 1.4 s ${ev.filter((r) => Number.isNaN(r.t30)).length}) | speed at +0.3 / +0.6 s p50 ${q(ev.map((r) => r.v3)).toFixed(1)} / ${q(ev.map((r) => r.v6)).toFixed(1)} | off the exit heading at +0.3 / +0.6 s p50 ${q(ev.map((r) => r.a3)).toFixed(0)} / ${q(ev.map((r) => r.a6)).toFixed(0)} deg | turn p50 ${q(ev.map((r) => r.turn)).toFixed(0)} deg\n${''.padEnd(34)} from the onset, no exit heading: t to 60 deg turned p25/50/75 ${f((r) => r.t60)} | turned at +0.3 / +0.6 / +1.0 s p50 ${q(ev.map((r) => r.r3)).toFixed(0)} / ${q(ev.map((r) => r.r6)).toFixed(0)} / ${q(ev.map((r) => r.r10)).toFixed(0)} deg | speed at +1.0 s p50 ${q(ev.map((r) => r.s10)).toFixed(1)}, lowest in the first second p50 ${q(ev.map((r) => r.vmin)).toFixed(1)}`;
}
