/** CALL_COMPOSE step 2 (src/playbook/calls/axes.ts; docs/reviews/2026-11-24-call-composition.md §5). Covers:
 * - the axes' NFL shares (a copy of config/call-shares.json);
 * - #896's five changes, which are now settings;
 * - base weights by NFL share;
 * - the variants the engine runs (id kept, routes, reads);
 * - the call checks, each shown to bind on a constructed case. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { AXES, baseWeight, buildVariant, COMPOSITION_BY_ID, drawSetting, dropFits, eligibilityFits, nflShare, protectionFits, variantOf } from '../src/playbook/calls/axes.js';
import type { ReceiverRef } from '../src/playbook/types.js';
import { NFL_CALL_SHARES } from '../src/playbook/calls/shares.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import type { PassConcept } from '../src/playbook/types.js';

const has = <T>(opts: { value: T }[] | undefined, f: (v: T) => boolean) => !!opts?.some((o) => f(o.value));

describe('CALL_COMPOSE step 2: the axes', () => {
  it('the shares are the NFL block of config/call-shares.json', () => {
    const cfg = JSON.parse(readFileSync(new URL('../config/call-shares.json', import.meta.url), 'utf8')).NFL;
    for (const k of ['core_share', 'core_share_given_room', 'room', 'full_share', 'full_share_given_room', 'mesh_outside', 'mesh_back', 'core_partner', 'core_back'] as const)
      expect(NFL_CALL_SHARES[k], k).toStrictEqual(cfg[k]);
  });

  it("each axis's shares sum to 1", () => {
    for (const [id, a] of Object.entries(AXES)) for (const axis of [a.strong, a.weak, a.back, a.tags]) {
      if (!axis) continue;
      expect(axis.reduce((s, o) => s + o.share, 0), id).toBeCloseTo(1, 6);
    }
  });

  it("#896's five changes are settings beside the authored versions", () => {
    // levels: both named versions, the outside short in at the NFL's ~70%
    const lv = AXES.levels.strong!;
    expect(lv.map((o) => o.value).sort()).toEqual(['levels_outside_deep', 'levels_outside_short']);
    expect(lv.find((o) => o.value === 'levels_outside_short')!.share).toBeGreaterThan(0.6);
    // slant_flat: the back released (check) as well as in
    expect(has(AXES.slant_flat.back, (b) => 'release' in b && b.release === 'check')).toBe(true);
    expect(has(AXES.slant_flat.back, (b) => 'stay' in b)).toBe(true);
    // quick_outs: the back's shoot (back_flat) as well as in
    expect(has(AXES.quick_outs.back, (b) => 'release' in b && b.route === 'back_flat')).toBe(true);
    expect(has(AXES.quick_outs.back, (b) => 'stay' in b)).toBe(true);
    // flood: a backside slant as well as the dig-shallow
    expect(has(AXES.flood.weak, (h) => h === 'slant_go')).toBe(true);
    expect(has(AXES.flood.weak, (h) => h === 'dig_shallow')).toBe(true);
    // mesh: the backside #1 on the corner as well as the go
    expect(has(AXES.mesh.tags, (t) => t.length === 1 && t[0].who === 'W1' && t[0].route === 'corner')).toBe(true);
    expect(has(AXES.mesh.tags, (t) => t.length === 0)).toBe(true);
  });

  it('base weights: NFL share relative to the mean, play action at 1, four verticals below the mean', () => {
    const ids = Object.keys(COMPOSITION_BY_ID).filter((id) => nflShare(id) !== undefined);
    expect(ids.reduce((s, id) => s + baseWeight(id), 0) / ids.length).toBeCloseTo(1, 6);
    expect(baseWeight('pa_shot')).toBe(1);
    expect(baseWeight('four_verts')).toBeLessThan(0.6);
    expect(baseWeight('stick')).toBeGreaterThan(baseWeight('four_verts') * 3);
  });
});

describe('CALL_COMPOSE step 2: the variant the engine runs', () => {
  it('keeps the id; the backside half and its reads replace the authored backside', () => {
    const base = PASS_BY_ID.slant_flat;
    const v = buildVariant(base, { weak: 'slant_go' });
    expect(v.id).toBe('slant_flat');
    expect(v.weak).toEqual({ 1: 'slant', 2: 'go' });
    expect(v.strong).toEqual(base.strong);
    // authored S1,S2,W1,W2,S3: the new backside reads its slant (the go is a clear-out)
    expect(v.progression).toEqual(['S1', 'S2', 'W1', 'S3']);
    expect(v.name).toMatch(/backside Slant-Go/);
  });

  it("the back: in is not read; released is read last", () => {
    const mesh = PASS_BY_ID.mesh;
    expect(buildVariant(mesh, { back: { stay: true } }).progression).not.toContain('B');
    expect(buildVariant(mesh, { back: { stay: true } }).back).toBe('block');
    const so = buildVariant(PASS_BY_ID.quick_outs, { back: { release: 'check', route: 'back_flat' } });
    expect(so.back).toBe('back_flat');
    expect(so.progression.at(-1)).toBe('B');
  });

  it('levels, outside short in: the routes swap; a quick-family half gets the quick hitch', () => {
    const lv = buildVariant(PASS_BY_ID.levels, { strong: 'levels_outside_short' });
    expect(lv.strong[1]).toBe('short_in');
    expect(lv.strong[2]).toBe('dig');
    expect(lv.strong[3]).toBe(PASS_BY_ID.levels.strong[3]);
    const qo = buildVariant(PASS_BY_ID.quick_outs, { weak: 'hitches' });
    expect(Object.values(qo.weak).every((r) => r === 'quick_hitch')).toBe(true);
  });

  it('a setting equal to the authored call returns the pool concept itself', () => {
    const c = PASS_BY_ID.flood;
    expect(variantOf(c, { weak: 'dig_shallow', back: { release: 'check' } })).toBe(c);
  });

  it('draws are deterministic per stream', () => {
    const a = drawSetting('quick_outs', new Rng(5)), b = drawSetting('quick_outs', new Rng(5));
    expect(a).toStrictEqual(b);
  });
});

describe('CALL_COMPOSE step 2: the call checks bind', () => {
  it('every authored concept passes both checks', () => {
    for (const id of Object.keys(COMPOSITION_BY_ID)) {
      expect(dropFits(PASS_BY_ID[id]), id).toBe(true);
      expect(protectionFits(PASS_BY_ID[id], COMPOSITION_BY_ID[id].back), id).toBe(true);
    }
  });

  it('drop: a quick drop cannot lead with a 10-yd dig', () => {
    const c: PassConcept = { ...PASS_BY_ID.slant_flat, strong: { 1: 'dig', 2: 'flat' }, progression: ['S1', 'S2'] };
    expect(dropFits(c)).toBe(false);
    expect(dropFits({ ...c, drop: 'five' })).toBe(true);
  });

  it('protection: a free-released back leaves five; each side then needs a hot route', () => {
    const allDeep: PassConcept = { ...PASS_BY_ID.four_verts, teBlock: false };
    expect(protectionFits(allDeep, { release: 'scat', route: 'wheel' })).toBe(false);
    expect(protectionFits(allDeep, { release: 'check', route: 'wheel' })).toBe(true);
    expect(protectionFits(PASS_BY_ID.slant_flat, { release: 'scat', route: 'back_flat' })).toBe(true);
  });

  it('eligibility (Flex\'s adapter): a covered player cannot take a route; an illegal formation refuses the variant', () => {
    const all = new Set<ReceiverRef>(['S1', 'S2', 'S3', 'W1', 'W2', 'B']);
    const ok = { eligible: all, refs: all, problems: [] as string[] };
    const v = buildVariant(PASS_BY_ID.slant_flat, { weak: 'slant_go' });
    expect(eligibilityFits(v, ok)).toBe(true);
    const covered = new Set(all); covered.delete('S3');
    expect(eligibilityFits(v, { ...ok, eligible: covered })).toBe(false);
    expect(variantOf(PASS_BY_ID.slant_flat, { weak: 'slant_go' }, { ...ok, eligible: covered })).toBe(PASS_BY_ID.slant_flat);
    expect(eligibilityFits(v, { ...ok, problems: ['6 on the line (at least seven)'] })).toBe(false);
    // a ref the formation does not field (3x1: no W2) runs nothing and is not checked
    const noW2 = new Set(all); noW2.delete('W2');
    expect(eligibilityFits(v, { eligible: noW2, refs: noW2, problems: [] })).toBe(true);
  });
});
