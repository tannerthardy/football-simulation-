| sample | n | curl-flat width 1.5 s | 2.0 s | 3.0 s | #2 width at the snap | #2 width at 1.5 s |
|---|---|---|---|---|---|---|
| NFL | 2103 | 6.3 / 8.9 / 11.4 | 7.1 / 9.8 / 12.3 | 7.9 / 11.4 / 14.6 | 4.8 / 7.9 / 10.5 | 5.4 / 7.9 / 10.6 |
| wa-stop-all.jsonl | 451 | 5.2 / 7.4 / 9.6 | 6.2 / 7.9 / 10.0 | 6.4 / 9.1 / 11.5 | 4.8 / 7.5 / 9.9 | 4.8 / 7.5 / 9.7 |

curl-flat width at 3.0 s p50 (n) by #2 width at 1.5 s:
| sample | 0-8 | 8-12 | 12-+ |
|---|---|---|---|
| NFL | 9.4 (1075) | 12.6 (694) | 15.8 (334) |
| wa-stop-all.jsonl | 7.9 (265) | 9.4 (156) | 15.4 (30) |

curl-flat width at 3.0 s p50 (n) by #2 width at the snap:
| sample | 0-6 | 6-9 | 9-+ |
|---|---|---|---|
| NFL | 9.4 (790) | 11.0 (465) | 13.7 (848) |
| wa-stop-all.jsonl | 8.9 (177) | 7.8 (139) | 9.7 (135) |

ours: curl-flat width at 3.0 s by what he is playing at 1.5 s (tags), p25/50/75 (n); #2 width at 1.5 s p50 in that class:
| wa-stop-all.jsonl | carry | 7.9 / 11.6 / 13.8 (140) | #2 at 1.5 s 6.8 | width at 1.5 s 7.0 |
| wa-stop-all.jsonl | man | 4.7 / 6.7 / 9.2 (106) | #2 at 1.5 s 7.8 | width at 1.5 s 7.2 |
| wa-stop-all.jsonl | settled | 9.5 / 10.6 / 11.8 (6) | #2 at 1.5 s 10.6 | width at 1.5 s 11.6 |
| wa-stop-all.jsonl | zone | 5.5 / 6.4 / 7.8 (21) | #2 at 1.5 s 4.9 | width at 1.5 s 5.3 |
| wa-stop-all.jsonl | other | 6.6 / 9.1 / 11.1 (178) | #2 at 1.5 s 7.7 | width at 1.5 s 7.9 |
