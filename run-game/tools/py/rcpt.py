import json, sys
for f in sys.argv[1:]:
    try: d = json.load(open(f))
    except Exception as e: print('ERR', f, e); continue
    for c in d.get('commands', []):
        a = c['command']
        if 'replay' in a:
            i = a.index('replay'); print(a[i + 2], a[i + 1], f, d['commit'][:8], d['sourceSha256'], d['exitCode'])
