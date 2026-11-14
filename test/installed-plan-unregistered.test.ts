/** The installed read plan (playbook/read-compiler/runtime.ts) is compiled from an on-air rep of a registered
 * formation. A formation built for one play (a lab or stress scene) is not registered: nothing was installed for it,
 * so there is no plan and the quarterback runs the play without one. It used to throw. */
import { describe, expect, it } from 'vitest';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { installedPlan } from '../src/playbook/read-compiler/runtime.js';

describe('installedPlan', () => {
  it('is null for a formation that is not registered, and does not throw', () => {
    expect(FORMATION_BY_ID.scene_only_formation).toBeUndefined();
    expect(installedPlan(PASS_BY_ID.curl_flat, 'scene_only_formation')).toBeNull();
    // Asked again (the cached path), still null.
    expect(installedPlan(PASS_BY_ID.curl_flat, 'scene_only_formation')).toBeNull();
  });

  it('still compiles a plan for a registered formation', () => {
    expect(installedPlan(PASS_BY_ID.curl_flat, 'gun_doubles_11')).not.toBeNull();
  });
});
