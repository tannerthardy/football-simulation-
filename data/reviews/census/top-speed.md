## Speed by position, NFL vs ours (0.2 s centred difference; frames at 1.5 yd/s and over)

### dropbacks to the release, open movement

| group | NFL n | NFL p50 / p90 / p99 / max | ours n | ours p50 / p90 / p99 / max | p99 ours - NFL |
|---|---|---|---|---|---|
| WR | 463082 | 5.4 / 7.7 / 9.0 / 11.7 | 116757 | 4.7 / 7.3 / 8.5 / 9.6 | -0.5 |
| TE | 161904 | 4.8 / 7.0 / 8.2 / 9.7 | 28103 | 4.4 / 6.4 / 7.8 / 8.9 | -0.4 |
| RB | 156342 | 4.2 / 6.6 / 7.9 / 9.6 | 42567 | 3.9 / 5.4 / 7.4 / 9.2 | -0.6 |
| QB | 128813 | 2.6 / 5.2 / 7.6 / 9.4 | 24562 | 2.7 / 3.7 / 8.3 / 9.2 | +0.6 |
| OL | 189704 | 2.4 / 3.5 / 4.9 / 7.3 | 38963 | 2.3 / 3.3 / 4.5 / 6.5 | -0.4 |
| DL | 143864 | 2.9 / 5.0 / 7.0 / 9.2 | 9944 | 2.5 / 4.6 / 6.5 / 7.2 | -0.6 |
| LB | 384666 | 3.2 / 5.2 / 7.2 / 9.3 | 82793 | 3.1 / 4.9 / 7.0 / 8.9 | -0.2 |
| CB | 386079 | 3.5 / 6.0 / 7.9 / 257.4 | 104311 | 3.1 / 5.0 / 7.8 / 9.6 | -0.2 |
| S | 391905 | 3.3 / 5.4 / 7.2 / 13.0 | 96665 | 3.5 / 5.1 / 6.9 / 9.2 | -0.4 |

### after the catch, the carrier and the defenders (completions, to the end of the play)

| group | NFL n | NFL p50 / p90 / p99 / max | ours n | ours p50 / p90 / p99 / max | p99 ours - NFL |
|---|---|---|---|---|---|
| WR | 44228 | 5.0 / 8.0 / 9.5 / 13.1 | 15026 | 4.6 / 8.7 / 9.7 / 10.2 | +0.1 |
| TE | 19333 | 5.0 / 7.5 / 8.8 / 11.9 | 6175 | 4.6 / 7.3 / 8.8 / 9.2 | +0.0 |
| RB | 26436 | 4.9 / 7.5 / 9.2 / 10.4 | 5506 | 5.2 / 8.3 / 9.3 / 9.6 | +0.1 |
| DL | 249850 | 3.9 / 5.9 / 7.4 / 9.4 | 41239 | 4.7 / 6.4 / 7.1 / 8.4 | -0.3 |
| LB | 272166 | 4.8 / 7.0 / 8.4 / 10.1 | 76149 | 5.7 / 7.7 / 8.7 / 9.5 | +0.3 |
| CB | 243487 | 4.4 / 6.8 / 8.9 / 28.6 | 82546 | 6.0 / 8.3 / 9.4 / 10.6 | +0.6 |
| S | 206123 | 5.1 / 7.2 / 8.7 / 15.0 | 59994 | 5.9 / 8.0 / 9.3 / 10.1 | +0.5 |

### Time to reach 90% of the group's p99 from the first frame at 3 yd/s (dropbacks, snap to release, any movement), seconds

| group | NFL: n starts / reach 90% | NFL median time | ours: n / reach | ours median time | 90% of p99 (NFL / ours, yd/s) |
|---|---|---|---|---|---|
| WR | 25307 / 4340 | 1.6 | 6499 / 1396 | 1.4 | 8.0 / 7.6 |
| TE | 10685 / 1749 | 1.3 | 1891 / 258 | 1.4 | 7.2 / 6.9 |
| RB | 9208 / 1186 | 1.1 | 2329 / 193 | 1.3 | 7.0 / 6.5 |
| QB | 4305 / 499 | 1.6 | 1594 / 39 | 3.1 | 6.5 / 6.3 |
| OL | 21213 / 5070 | 0.5 | 4079 / 1482 | 0.4 | 4.0 / 3.9 |
| DL | 20985 / 2557 | 0.9 | 979 / 399 | 0.5 | 5.3 / 4.5 |
| LB | 24011 / 2648 | 1.0 | 5322 / 554 | 1.0 | 6.1 / 5.9 |
| CB | 22054 / 2784 | 1.3 | 6001 / 588 | 1.7 | 7.2 / 7.0 |
| S | 17304 / 2049 | 1.2 | 4336 / 373 | 1.4 | 6.4 / 6.1 |

### Pursuit speed against the carrier on completions with a 15+ yd run after the catch

| sample | plays | carry length median (yd) | carrier p90 speed over the carry | mean of the three fastest defenders' p90 speeds (same frames, defenders that started within 15 yd) | ratio defender / carrier (median) | share of plays a defender's p90 beats the carrier's |
|---|---|---|---|---|---|---|
| NFL | 295 | 20 | 8.05 | 7.25 | 0.91 | 0.56 |
| ours | 116 | 26 | 8.40 | 8.32 | 0.99 | 0.68 |