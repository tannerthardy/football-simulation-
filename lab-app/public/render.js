// Field drawing. Reads only what the engine recorded; derived marks say so.
export const COLORS = { O: '#d2453a', D: '#2f74c9', Oalt: '#ffd9d4', Dalt: '#d6e6ff' };
const FIELD_W = 160 / 3;
const lerp = (a, b, f) => a + (b - a) * f;
const angLerp = (a, b, f) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * f;

/** Frame bracket for time t: [index a, index b, fraction]. */
export function frameAt(run, t) {
  const T = run.frames.t;
  if (t <= T[0]) return [0, 0, 0];
  if (t >= T[T.length - 1]) return [T.length - 1, T.length - 1, 0];
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  return [lo, hi, (t - T[lo]) / (T[hi] - T[lo] || 1)];
}

export function nearestIndex(times, t) {
  if (!times.length) return -1;
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  return Math.abs(times[hi] - t) < Math.abs(times[lo] - t) ? hi : lo;
}

/** Interpolated [x, y, facing] for every player, the ball [x, y, z] and the carrier. */
export function stateAt(run, t) {
  const [a, b, f] = frameAt(run, t), n = run.roster.length, P = run.frames.p, B = run.frames.b;
  const players = [];
  for (let i = 0; i < n; i++) {
    const ia = (a * n + i) * 3, ib = (b * n + i) * 3;
    players.push([lerp(P[ia], P[ib], f), lerp(P[ia + 1], P[ib + 1], f), angLerp(P[ia + 2], P[ib + 2], f)]);
  }
  const ball = [lerp(B[a * 3], B[b * 3], f), lerp(B[a * 3 + 1], B[b * 3 + 1], f), lerp(B[a * 3 + 2], B[b * 3 + 2], f)];
  const k = f < 0.5 ? a : b;
  return { players, ball, carrier: run.frames.c[k], frame: k, posture: [run.frames.s[k * 2], run.frames.s[k * 2 + 1]] };
}

export function telemetryAt(run, t) {
  const tel = run.telemetry;
  if (!tel?.frames?.length) return null;
  if (!tel._times) tel._times = tel.frames.map(f => f.t);
  return tel.frames[nearestIndex(tel._times, t)];
}

const GROUPS = {
  QB: s => s === 'QB', OL: s => ['LT', 'LG', 'C', 'RG', 'RT'].includes(s), backs: s => ['RB', 'F'].includes(s),
  receivers: s => ['X', 'Z', 'Y', 'H'].includes(s), DL: s => /^(DE_|DT_|NT)/.test(s), LB: s => /^LB_/.test(s),
  DB: s => /^(CB_|NB|DB|FS|SS)/.test(s),
};
export const GROUP_NAMES = { all: 'Everyone', QB: 'Quarterback', OL: 'Offensive line', backs: 'Backs', receivers: 'Receivers & TEs', DL: 'Defensive line', LB: 'Linebackers', DB: 'Secondary' };

/** Who is lit by the current filter (the rest are dimmed, never hidden). */
export function litSet(run, state, filter) {
  return run.roster.map((r, i) => {
    if (filter.team !== 'all' && r.team !== filter.team) return false;
    if (filter.group !== 'all' && !GROUPS[filter.group](r.slot)) return false;
    if (filter.near > 0) {
      const p = state.players[i];
      if (Math.hypot(p[0] - state.ball[0], p[1] - state.ball[1]) > filter.near) return false;
    }
    return true;
  });
}

// ------------------------------------------------------------------ top-down

/** Top-down camera: world yards -> screen px. rot turns the view (player cam). */
export function topCamera(W, H, cx, cy, yardsAcross, rot = 0) {
  const sc = W / yardsAcross, c = Math.cos(rot), s = Math.sin(rot);
  const X = (x, y) => { const dx = x - cx, dy = y - cy; return W / 2 + (dx * c - dy * s) * sc; };
  const Y = (x, y) => { const dx = x - cx, dy = y - cy; return H / 2 - (dx * s + dy * c) * sc; };
  const inv = (px, py) => { const u = (px - W / 2) / sc, v = (H / 2 - py) / sc; return [cx + u * c + v * s, cy - u * s + v * c]; };
  const V = (vx, vy, k = 1) => [(vx * c - vy * s) * sc * k, -(vx * s + vy * c) * sc * k];
  return { sc, rot, X, Y, P: (x, y) => [X(x, y), Y(x, y)], V, inv };
}

function drawTurf(ctx, cam, W, H, los, firstDownX) {
  ctx.fillStyle = '#2d6b3a'; ctx.fillRect(0, 0, W, H);
  const seg = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(cam.X(x1, y1), cam.Y(x1, y1)); ctx.lineTo(cam.X(x2, y2), cam.Y(x2, y2)); ctx.stroke(); };
  ctx.fillStyle = '#336f40';
  for (let x = 10; x < 110; x += 10) {
    ctx.beginPath(); for (const [px, py] of [[x, 0], [x + 5, 0], [x + 5, FIELD_W], [x, FIELD_W]]) ctx.lineTo(cam.X(px, py), cam.Y(px, py)); ctx.fill();
  }
  ctx.fillStyle = 'rgba(15,40,25,0.55)';
  for (const x0 of [0, 110]) { ctx.beginPath(); for (const [px, py] of [[x0, 0], [x0 + 10, 0], [x0 + 10, FIELD_W], [x0, FIELD_W]]) ctx.lineTo(cam.X(px, py), cam.Y(px, py)); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  for (let x = 10; x <= 110; x += 5) { ctx.lineWidth = x % 10 === 0 ? 1.6 : 1; seg(x, 0, x, FIELD_W); }
  ctx.lineWidth = 2; seg(0, 0, 120, 0); seg(0, FIELD_W, 120, FIELD_W); seg(0, 0, 0, FIELD_W); seg(120, 0, 120, FIELD_W);
  ctx.lineWidth = 1;
  for (let x = 11; x < 110; x++) if (x % 5) for (const hy of [70.75 / 3, FIELD_W - 70.75 / 3, 0.6, FIELD_W - 0.6]) seg(x, hy - 0.3, x, hy + 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.max(10, cam.sc * 1.7)}px system-ui`;
  for (let x = 20; x <= 100; x += 10) for (const ny of [9, FIELD_W - 9]) ctx.fillText(String(x - 10 <= 50 ? x - 10 : 110 - x), cam.X(x, ny), cam.Y(x, ny));
  ctx.lineWidth = 3; ctx.strokeStyle = '#7fb2ff'; seg(los, 0, los, FIELD_W);
  if (firstDownX < 110) { ctx.strokeStyle = '#ffd34d'; seg(firstDownX, 0, firstDownX, FIELD_W); }
}

/** The duty span in force at time t (the last span stays in force to the end of the play). */
export function dutySpanAt(spans, t) {
  let hit = null;
  for (const s of spans) if (s.from <= t + 1e-9) hit = s;
  return hit;
}
function nearestTick(times, t) {
  let best = -1, bd = Infinity;
  for (let k = 0; k < times.length; k++) { const d = Math.abs(times[k] - t); if (d < bd) { bd = d; best = k; } }
  return best;
}

function arrow(ctx, x1, y1, x2, y2, color, width = 2, dash = []) {
  const len = Math.hypot(x2 - x1, y2 - y1); if (len < 2) return;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1), h = Math.min(8, len * 0.4);
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)); ctx.lineTo(x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
}

function tag(ctx, x, y, text, color = '#fff', bg = 'rgba(0,0,0,0.72)') {
  ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - 8, w, 16); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const slotLabel = (r) => r.slot.replace('_', '');

/**
 * Draw one top-down scene. opts: { run, t, cam, layers, filter, selected, second, trace, arrange, placed, native, interventions }
 */
export function drawTop(ctx, W, H, opts) {
  const { run, t, cam, layers } = opts;
  drawTurf(ctx, cam, W, H, run.los, run.firstDownX);
  const st = opts.arrange ? { players: opts.placed.map(p => [p.x, p.y, p.facing]), ball: [run.los, run.ballY, 0], carrier: -1, frame: 0 } : stateAt(run, t);
  const tel = opts.arrange ? null : telemetryAt(run, t);
  const lit = litSet(run, st, opts.filter);
  const sel = opts.selected, sec = opts.second;
  const focus = (i) => sel < 0 ? lit[i] : i === sel || i === sec;
  const pos = st.players, P = (i) => cam.P(pos[i][0], pos[i][1]);
  const R = (i) => Math.max(6.5, run.roster[i].physical.radius * cam.sc);

  // Coach's hand: from the engine's own spot to where the coach put him.
  if (layers.coach) for (const iv of opts.interventions ?? []) {
    const i = run.roster.findIndex(r => r.team === iv.team && r.slot === iv.slot); if (i < 0) continue;
    if (opts.arrange || t < 1.5) {
      const [x1, y1] = cam.P(iv.from.x, iv.from.y), [x2, y2] = cam.P(iv.to.x, iv.to.y);
      ctx.strokeStyle = '#ff9d2e'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x1, y1, R(i), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      arrow(ctx, x1, y1, x2, y2, '#ff9d2e', 2, [6, 4]);
    }
  }

  // Ball flight: the whole recorded path, plus intended and catch points.
  if (layers.ball && !opts.arrange) {
    const B = run.frames.b, n = run.frames.t.length;
    ctx.strokeStyle = 'rgba(255,230,160,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
    let flying = false;
    for (let k = 0; k < n; k++) {
      const air = run.frames.c[k] < 0 && B[k * 3 + 2] > 0.3;
      const [x, y] = cam.P(B[k * 3], B[k * 3 + 1]);
      if (air) { if (!flying) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      flying = air;
    }
    ctx.stroke();
    const throwEv = run.events.find(e => e.type === 'throw');
    const catchEv = run.events.find(e => ['catch', 'interception', 'drop', 'pbu', 'incomplete'].includes(e.type) && e.pos);
    const intended = run.telemetry?.frames?.find(f => f.ball?.intended)?.ball;
    if (intended?.intended) {
      const [x, y] = cam.P(intended.intended[0], intended.intended[1]);
      ctx.strokeStyle = '#ffe6a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke();
      tag(ctx, x, y - 16, `aimed${intended.arrivalT != null ? ' · arrives ' + intended.arrivalT.toFixed(2) + 's' : ''}`, '#ffe6a0');
    }
    if (catchEv?.pos) { const [x, y] = cam.P(catchEv.pos.x, catchEv.pos.y); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); tag(ctx, x, y + 16, `${catchEv.type} ${catchEv.t.toFixed(2)}s`); }
    if (throwEv?.pos) { const [x, y] = cam.P(throwEv.pos.x, throwEv.pos.y); tag(ctx, x, y + 16, `throw ${throwEv.t.toFixed(2)}s`, '#ffe6a0'); }
    const pending = tel?.qb?.pending;
    if (pending) { const [x, y] = cam.P(pending.point[0], pending.point[1]); ctx.strokeStyle = 'rgba(255,230,160,0.8)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      tag(ctx, x, y - 16, `QB eyeing ${slotLabel(run.roster[pending.target])} · ${(pending.completion * 100).toFixed(0)}% / int ${(pending.interceptionRisk * 100).toFixed(0)}%`, '#ffe6a0'); }
  }

  // Trails for lit skill players or the selected pair.
  if (layers.trails && !opts.arrange) {
    const n = run.roster.length, Pp = run.frames.p;
    for (let i = 0; i < n; i++) {
      if (!focus(i)) continue;
      ctx.strokeStyle = run.roster[i].team === 'O' ? 'rgba(255,170,160,0.45)' : 'rgba(160,200,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k <= st.frame; k++) { const [x, y] = cam.P(Pp[(k * n + i) * 3], Pp[(k * n + i) * 3 + 1]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
  }

  // Run fits, blocking assignments and gaps (gaps are drawn from OL spots at the snap).
  if (layers.fits && !opts.arrange) {
    const ol = run.roster.map((r, i) => [r, i]).filter(([r]) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot));
    const n = run.roster.length, Pp = run.frames.p;
    const ys = ol.map(([, i]) => Pp[i * 3 + 1]).sort((a, b) => a - b);
    if (ys.length === 5) {
      const mids = [ys[0] - 1.3, (ys[0] + ys[1]) / 2, (ys[1] + ys[2]) / 2, (ys[2] + ys[3]) / 2, (ys[3] + ys[4]) / 2, ys[4] + 1.3];
      const names = ['C', 'B', 'A', 'A', 'B', 'C'];
      mids.forEach((y, k) => { const [x, py] = cam.P(run.los + 0.6, y); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(names[k], x, py); });
    }
    tel?.agents?.forEach((ag, i) => {
      if (!focus(i)) return;
      const [x, y] = P(i);
      if (ag.runFit) tag(ctx, x, y + R(i) + 9, `${ag.runFit.gap}${ag.runFit.side > 0 ? '+' : ag.runFit.side < 0 ? '−' : ''} ${ag.runFit.technique}`, '#b8f7c8');
      if (ag.runBlock) {
        if (ag.runBlock.target != null && pos[ag.runBlock.target]) { const [tx, ty] = P(ag.runBlock.target); ctx.strokeStyle = '#b8f7c8'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
        const d = ag.runBlock.drive; if (d) { const [ux, uy] = cam.V(d[0], d[1], 18 / cam.sc); arrow(ctx, x, y, x + ux, y + uy, '#7be39a', 1.5); }
        if (ag.runBlock.pullPath?.length) { ctx.strokeStyle = 'rgba(123,227,154,0.7)'; ctx.beginPath(); ag.runBlock.pullPath.forEach(([px, py], k) => { const [sx, sy] = cam.P(px, py); if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); ctx.stroke(); }
        tag(ctx, x, y + R(i) + 9, ag.runBlock.kind + (ag.runBlock.pullRole ? ' · ' + ag.runBlock.pullRole : ''), '#b8f7c8');
      }
      if (ag.passSet) { const [lx, ly] = cam.P(pos[i][0], ag.passSet.laneY); ctx.fillStyle = '#b8f7c8'; ctx.fillRect(lx - 2, ly - 2, 4, 4); }
    });
    void n;
  }

  // Responsibility ledger: each blocker's current duty against the one he was given at the snap. A recorder, not a grade.
  if (layers.duty && !opts.arrange && run.responsibility) {
    for (const b of run.responsibility.timeline) {
      const i = b.actor;
      if (!focus(i) || !pos[i]) continue;
      const span = dutySpanAt(b.spans, t), first = b.spans[0];
      if (!span) continue;
      const tick = run.responsibility.ticks.find(k => k.actor === i), k = tick ? nearestTick(tick.endpoint, t) : -1;
      const cur = k >= 0 ? tick.loadCurrent[k] : null, ini = k >= 0 ? tick.loadInitial[k] : null;
      const [x, y] = P(i);
      if (first.target != null && first.target !== span.target && pos[first.target]) {
        const [tx, ty] = P(first.target); ctx.strokeStyle = 'rgba(190,190,190,0.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      }
      if (span.target != null && pos[span.target]) {
        const [tx, ty] = P(span.target); ctx.strokeStyle = '#63f2f5'; ctx.lineWidth = cur != null && cur > 1 ? 3.5 : 1.5; ctx.setLineDash(span.departure ? [8, 3] : []); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      }
      const name = (j) => j == null ? 'nobody' : slotLabel(run.roster[j]);
      const loads = [cur != null && cur > 1 ? `load ${cur.toFixed(1)} on ${name(span.target)}` : null, first.target !== span.target && ini != null && ini > 1 ? `${ini.toFixed(1)} on ${name(first.target)}` : null].filter(Boolean);
      tag(ctx, x, y - R(i) - 10, `${span.kind} → ${name(span.target)}${span.departure ? ' (departing)' : ''}${first.target !== span.target ? ` · was ${name(first.target)}` : ''}${loads.length ? ' · ' + loads.join(', ') : ''}`, '#63f2f5');
    }
  }

  // Job and target.
  if (layers.job && !opts.arrange) {
    for (const link of tel?.links ?? []) {
      if (!['man', 'target', 'bracket'].includes(link.kind) || !(focus(link.a))) continue;
      const [x1, y1] = P(link.a), [x2, y2] = P(link.b);
      ctx.strokeStyle = link.kind === 'man' ? '#63f2f5' : '#c8e2e0'; ctx.lineWidth = 1.4; ctx.setLineDash(link.kind === 'bracket' ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    }
    tel?.agents?.forEach((ag, i) => {
      if (!focus(i)) return;
      if (ag.landmark) { const [lx, ly] = cam.P(ag.landmark[0], ag.landmark[1]), [x, y] = P(i); ctx.strokeStyle = 'rgba(99,242,245,0.6)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#63f2f5'; ctx.fillRect(lx - 3, ly - 3, 6, 6); }
      const [x, y] = P(i); tag(ctx, x, y - R(i) - 10, ag.job ?? ag.kind, '#63f2f5');
    });
  }

  // Command owner from the selected player's trace (who actually decided his command).
  if (layers.owner && !opts.arrange && sel >= 0 && opts.trace) {
    const step = traceStepAt(opts.trace, t);
    if (step?.decision) {
      const [x, y] = P(sel), owner = step.decision.ownerAfterUpdate;
      const last = step.rewrites.length ? step.rewrites[step.rewrites.length - 1].stage : null;
      tag(ctx, x, y + R(sel) + 24, `${owner.controller}${owner.job ? ':' + owner.job : ''}${last ? ' → rewritten by ' + last : ''}`, '#ffcf8a');
    }
  }

  // Requested vs achieved: yellow is what the controller asked for, white what the body did.
  if (layers.motion && !opts.arrange) tel?.agents?.forEach((ag, i) => {
    if (!focus(i)) return;
    const [x, y] = P(i);
    const req = ag.intent?.velocity, got = ag.body?.velocity;
    if (got) { const [ux, uy] = cam.V(got[0], got[1], 0.4); arrow(ctx, x, y, x + ux, y + uy, '#ffffff', 2); }
    if (req) { const [ux, uy] = cam.V(req[0], req[1], 0.4); arrow(ctx, x, y, x + ux, y + uy, '#ffd34d', 2, [5, 3]); }
    if (ag.intent?.facing != null) {
      const f = ag.intent.facing + cam.rot, r = R(i);
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.setLineDash([2, 2]); ctx.beginPath();
      ctx.moveTo(x + Math.cos(f) * r, y - Math.sin(f) * r); ctx.lineTo(x + Math.cos(f) * r * 2.1, y - Math.sin(f) * r * 2.1); ctx.stroke(); ctx.setLineDash([]);
    }
  });

  // Reach, contact, grasps, holds and engagements.
  if (layers.contact && !opts.arrange) {
    run.roster.forEach((r, i) => {
      if (!focus(i)) return;
      const [x, y] = P(i); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(x, y, r.physical.reach * cam.sc, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    });
    for (const c of tel?.contacts ?? []) {
      if (!focus(c.a) && !focus(c.b)) continue;
      const [x1, y1] = P(c.a), [x2, y2] = P(c.b);
      ctx.strokeStyle = '#ff7ad9'; ctx.lineWidth = 1 + Math.min(4, c.impulse * 0.05); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (const bl of tel?.blocks ?? []) {
      if (!focus(bl.a) && !focus(bl.b)) continue;
      const [x1, y1] = P(bl.a), [x2, y2] = P(bl.b);
      ctx.strokeStyle = '#ff9add'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 2]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      const hold = bl.hands?.hold ? ` · hold ${bl.hands.hold.toFixed(2)}` : '';
      tag(ctx, (x1 + x2) / 2, (y1 + y2) / 2, `${bl.move} · ctrl ${bl.control.toFixed(2)}${hold}`, '#ffb9e6');
    }
    const tk = tel?.tackle;
    if (tk) for (const g of tk.tacklers) {
      if (!pos[g.a] || !pos[tk.carrier]) continue;
      const [x1, y1] = P(g.a), [x2, y2] = P(tk.carrier);
      ctx.strokeStyle = g.slipping ? '#ffb347' : '#ff4f7a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      tag(ctx, x1, y1 - R(g.a) - 10, `grip ${g.grip == null ? '?' : g.grip.toFixed(2)} · legs ${g.legs.toFixed(2)}${g.slipping ? ' · slipping' : ''}`, '#ffb9cc');
    }
  }

  // What the selected player saw: the delayed picture and its age.
  if (layers.perception && !opts.arrange && sel >= 0) {
    const seen = (tel?.perception ?? []).filter(p => p.a === sel);
    const key = tel?.agents?.[sel]?.target;
    for (const p of seen) {
      const [px, py] = cam.P(p.position[0], p.position[1]);
      const [tx, ty] = P(p.b);
      const important = p.b === st.carrier || p.b === key;
      ctx.strokeStyle = important ? '#ffffff' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = important ? 2 : 1;
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(px, py, R(p.b), 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      if (p.velocity) { const [ux, uy] = cam.V(p.velocity[0], p.velocity[1], 0.4); arrow(ctx, px, py, px + ux, py + uy, 'rgba(255,255,255,0.7)', 1.2); }
      if (important || seen.length <= 4) tag(ctx, px, py - R(p.b) - 10, `${slotLabel(run.roster[p.b])} seen ${p.age == null ? 'age ?' : p.age.toFixed(2) + 's old'}${p.source === 'qb' ? ' (QB)' : ''}`);
    }
  }

  // Pursuit intercepts from the selected player's trace.
  if (layers.pursuit && !opts.arrange && sel >= 0 && opts.trace) {
    const step = traceStepAt(opts.trace, t);
    for (const rec of step?.pursuit ?? []) {
      const d = rec.data;
      if (d.kind === 'intercept') {
        const feasible = d.prediction.estimate.status === 'estimated-feasible';
        const [ix, iy] = cam.P(d.prediction.point.x, d.prediction.point.y), [x, y] = P(sel);
        ctx.strokeStyle = feasible ? '#5cff8d' : '#ffa54a'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ix, iy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = feasible ? '#5cff8d' : '#ffa54a'; ctx.beginPath(); ctx.arc(ix, iy, 5, 0, Math.PI * 2); ctx.fill();
        const [sx, sy] = cam.P(d.steeringPoint.x, d.steeringPoint.y); ctx.strokeStyle = '#63f2f5'; ctx.strokeRect(sx - 3, sy - 3, 6, 6);
        tag(ctx, ix, iy - 14, `${feasible ? 'feasible' : 'fallback'} intercept ${d.prediction.t.toFixed(2)}s`, feasible ? '#5cff8d' : '#ffa54a');
      } else tag(ctx, P(sel)[0], P(sel)[1] + R(sel) + 38, `chase · ${d.planner} · ${d.distance.toFixed(1)} yd`, '#ffa54a');
    }
  }

  // Players.
  for (let i = 0; i < run.roster.length; i++) {
    const r = run.roster[i], [x, y] = P(i), rad = R(i);
    const body = tel?.agents?.[i]?.body;
    ctx.globalAlpha = lit[i] ? 1 : 0.22;
    const down = body?.state === 'down';
    ctx.beginPath();
    if (down) ctx.ellipse(x, y, rad * 1.35, rad * 0.6, -(pos[i][2] + cam.rot), 0, Math.PI * 2); else ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[r.team]; ctx.fill();
    ctx.lineWidth = i === st.carrier ? 3 : 1.4; ctx.strokeStyle = i === st.carrier ? '#ffd34d' : COLORS[r.team + 'alt']; ctx.stroke();
    const f = pos[i][2] + cam.rot;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x + Math.cos(f) * rad * 0.5, y - Math.sin(f) * rad * 0.5); ctx.lineTo(x + Math.cos(f) * rad * 1.6, y - Math.sin(f) * rad * 1.6); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.max(8, rad * 0.85)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opts.labels === 'jersey' ? String(r.jersey) : slotLabel(r), x, y + 0.5);
    if (layers.support && body && focus(i)) {
      if (body.state !== 'up') { ctx.strokeStyle = body.state === 'down' ? '#ff4040' : body.state === 'falling' ? '#ff9d2e' : '#ffe14d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, Math.PI * 2); ctx.stroke(); tag(ctx, x, y + rad + 22, body.state, '#ffcfcf'); }
      if (body.balance < 0.85) { const w = rad * 2.4; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y + rad + 3, w, 4); ctx.fillStyle = body.balance > 0.5 ? '#ffd34d' : '#ff4f4f'; ctx.fillRect(x - w / 2, y + rad + 3, w * Math.max(0, body.balance), 4); }
      const dev = body.supportDeviation; if (dev && Math.hypot(dev[0], dev[1]) > 0.05) { const [ux, uy] = cam.V(dev[0], dev[1], 2); arrow(ctx, x, y, x + ux, y + uy, '#c58cff', 1.5); }
    }
    if (layers.coach && (opts.interventions ?? []).some(iv => iv.team === r.team && iv.slot === r.slot)) {
      ctx.fillStyle = '#ff9d2e'; ctx.fillRect(x + rad * 0.6, y - rad * 1.5, 9, 9); ctx.fillStyle = '#000'; ctx.font = 'bold 8px system-ui'; ctx.fillText('H', x + rad * 0.6 + 4.5, y - rad * 1.5 + 5);
    }
    if (i === sel || i === sec) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash(i === sec ? [3, 3] : []); ctx.beginPath(); ctx.arc(x, y, rad + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.globalAlpha = 1;
  }

  // Ball.
  if (!opts.arrange) {
    const [bx, by, bz] = st.ball;
    if (st.carrier < 0 || bz > 1.5) {
      const [x, y] = cam.P(bx, by), lift = bz * cam.sc * 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, cam.sc * 0.35, cam.sc * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a5326'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - lift, cam.sc * 0.32 * (1 + bz * 0.08), cam.sc * 0.2 * (1 + bz * 0.08), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  } else { const [x, y] = cam.P(run.los, run.ballY); ctx.fillStyle = '#8a5326'; ctx.beginPath(); ctx.ellipse(x, y, cam.sc * 0.32, cam.sc * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
  return { positions: pos.map((p, i) => [...P(i), R(i)]), state: st, telemetry: tel, lit };
}

export function traceStepAt(trace, t) {
  if (!trace?.steps?.length) return null;
  if (!trace._times) trace._times = trace.steps.map(s => s.stepStart);
  const i = nearestIndex(trace._times, t);
  return Math.abs(trace._times[i] - t) < 0.06 ? trace.steps[i] : null;
}

/** Camera for all-22: the bodies' extent with a margin, the full field width. */
export function allCamera(run, W, H, t, zoom = 1, pan = [0, 0]) {
  const n = run.roster.length, P = run.frames.p;
  let lo = Infinity, hi = -Infinity, bot = Infinity, top = -Infinity;
  for (let k = 0; k < run.frames.t.length; k += 2) for (let i = 0; i < n; i++) {
    const x = P[(k * n + i) * 3], y = P[(k * n + i) * 3 + 1];
    lo = Math.min(lo, x); hi = Math.max(hi, x); bot = Math.min(bot, y); top = Math.max(top, y);
  }
  // Fit every body over the whole play, with room for labels; never tighter than 24 yd.
  const across = Math.max(24, hi - lo + 8, (Math.min(FIELD_W + 2, top - bot + 7)) * W / H) / zoom;
  const cy = Math.max(Math.min((bot + top) / 2, FIELD_W), 0);
  return topCamera(W, H, (lo + hi) / 2 + pan[0], cy + pan[1], across);
}

// ------------------------------------------------------------------ end zone

/** Behind-the-offense perspective. A projection of recorded positions; heights come from measurables. */
export function drawEndZone(ctx, W, H, run, t, opts) {
  const st = stateAt(run, t), tel = telemetryAt(run, t);
  const camX = run.los - 13, camY = 0.7 * run.ballY + 0.3 * st.ball[1], camZ = 7.5, f = H * 0.62, horizon = H * 0.16;
  const proj = (x, y, z) => { const d = x - camX; if (d < 0.8) return null; return [W / 2 - (y - camY) * f / d, horizon + (camZ - z) * f / d, f / d]; };
  const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, '#0d1520'); sky.addColorStop(1, '#25384e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon); ctx.fillStyle = '#2d6b3a'; ctx.fillRect(0, horizon, W, H - horizon);
  const line = (x1, y1, x2, y2, color, width) => {
    const steps = 12; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); let started = false;
    for (let k = 0; k <= steps; k++) { const p = proj(lerp(x1, x2, k / steps), lerp(y1, y2, k / steps), 0); if (!p) { started = false; continue; } if (started) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); started = true; } }
    ctx.stroke();
  };
  for (let x = 10; x <= 110; x += 5) line(x, 0, x, FIELD_W, 'rgba(255,255,255,0.6)', 1);
  line(camX + 1, 0, 120, 0, '#fff', 2); line(camX + 1, FIELD_W, 120, FIELD_W, '#fff', 2);
  line(run.los, 0, run.los, FIELD_W, '#7fb2ff', 3); if (run.firstDownX < 110) line(run.firstDownX, 0, run.firstDownX, FIELD_W, '#ffd34d', 3);
  const lit = litSet(run, st, opts.filter);
  const order = run.roster.map((_, i) => i).sort((a, b) => st.players[b][0] - st.players[a][0]);
  const hit = [];
  for (const i of order) {
    const r = run.roster[i], [x, y] = st.players[i];
    const body = tel?.agents?.[i]?.body, down = body?.state === 'down';
    const height = (r.heightIn / 36) * (down ? 0.25 : 1 - 0.25 * (body?.posture ?? 0.3));
    const foot = proj(x, y, 0), head = proj(x, y, height); if (!foot || !head) continue;
    const w = Math.max(3, r.physical.radius * foot[2] * 1.6);
    ctx.globalAlpha = opts.selected < 0 ? (lit[i] ? 1 : 0.25) : (i === opts.selected || i === opts.second ? 1 : 0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(foot[0], foot[1], w, w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS[r.team]; ctx.strokeStyle = i === st.carrier ? '#ffd34d' : COLORS[r.team + 'alt']; ctx.lineWidth = i === st.carrier ? 3 : 1.2;
    if (down) { ctx.beginPath(); ctx.ellipse(foot[0], foot[1] - w * 0.3, w * 1.8, w * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.roundRect(foot[0] - w / 2, head[1], w, foot[1] - head[1], w / 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.max(8, w * 0.55)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opts.labels === 'jersey' ? String(r.jersey) : slotLabel(r), foot[0], (head[1] + foot[1]) / 2);
    if (i === opts.selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(foot[0] - w, head[1] - 4, w * 2, foot[1] - head[1] + 8); }
    ctx.globalAlpha = 1;
    hit.push([i, foot[0], (head[1] + foot[1]) / 2, Math.max(w, (foot[1] - head[1]) / 2)]);
  }
  const [bx, by, bz] = st.ball;
  if (st.carrier < 0 || bz > 1.5) { const p = proj(bx, by, bz); if (p) { ctx.fillStyle = '#8a5326'; ctx.beginPath(); ctx.ellipse(p[0], p[1], Math.max(2, 0.3 * p[2]), Math.max(1.5, 0.18 * p[2]), 0, 0, Math.PI * 2); ctx.fill(); } }
  return { hit, state: st, telemetry: tel, lit };
}
