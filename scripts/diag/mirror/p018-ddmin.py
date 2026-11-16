import subprocess, os
S = os.path.dirname(os.path.abspath(__file__))
env = dict(os.environ, PATH=f"{S}/node/node-v22.23.3-linux-x64/bin:" + os.environ['PATH'], BRIEF='1')
def passes(off):
    args = ['node', 'scripts/ref.mjs'] + sum((['--flag', f'{f}=0'] for f in off), []) + ['--', 'npx', 'tsx', 'scripts/diag/mirror/_p018.mts']
    out = subprocess.run(args, cwd='/home/user/fs-wr', env=env, capture_output=True, text=True).stdout
    return out.count('PASS') == 2
off = "BACKSIDE_COMBO BACKSIDE_SWAP BLOCKER_NEXT CLIMB_PATH CLIMB_RIP CLIMB_RUNNER_SIDE CLIMB_SLIDE CUTOFF_RACE DOUBLE_FLOW DOUBLE_HANDOFF FB_PLAYSIDE GAP_CLIMB IZ_FLAT KEEPER_HIP LEVEL2_TIME NO_CROSS OWNER_KEEPS ZONE_GAP".split()
for order in (list(reversed(off)), list(off)):
    for f in order:
        if f not in off: continue
        trial = [x for x in off if x != f]
        if passes(trial): off = trial
print('minimal off-set:', ' '.join(off))
for f in off:
    print(f'  {f} back on -> pass={passes([x for x in off if x != f])}')
