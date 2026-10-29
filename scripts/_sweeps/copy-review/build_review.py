import json, glob, html, re, sys
D = __import__('os').path.dirname(__import__('os').path.abspath(__file__))

AREA = {
    'vague-comms.json': 'Communication Styles',
    'vague-coupletype.json': 'Couple type, home and app screens',
    'vague-expectations.json': 'Expectations, Physical Intimacy, Conflict Patterns',
    'vague-reflection-workbook.json': 'Relationship Reflection, workbook, website',
}
rows = []
seen = {}
for f, area in AREA.items():
    try:
        data = json.load(open(f'{D}/{f}'))
    except FileNotFoundError:
        print('missing', f, file=sys.stderr); continue
    for i, r in enumerate(data):
        cur = (r.get('current') or '').strip()
        if not cur: continue
        if cur in seen:
            # The same sentence in a second place: one decision applies to both.
            seen[cur]['files'] = sorted(set(seen[cur]['files'] + [r.get('file', '')]))
            continue
        rid = 'v-' + f.split('-', 1)[1].split('.')[0] + '-' + str(i)
        rows.append({'id': rid, 'area': area, 'file': r.get('file', ''), 'key': r.get('key', ''),
                     'where': r.get('where', ''), 'current': cur, 'proposed': (r.get('proposed') or '').strip(),
                     'why': r.get('why', ''), 'files': [r.get('file', '')]})
        seen[cur] = rows[-1]
beh = json.load(open(f'{D}/behaviors.json'))
for b in beh:
    b['id'] = 'b-' + b['id']

payload = json.dumps({'vague': rows, 'behaviors': beh}, ensure_ascii=False).replace('</', '<\\/')
tpl = open(f'{D}/review_template.html').read()
out = tpl.replace('/*__DATA__*/null', payload)
assert '/*__DATA__*/' not in out and len(out) > 5000
with open(f'{D}/copy-review.html', 'w') as fh:
    fh.write(out)
# What apply.mjs reads to put a decision into the product.
with open(f'{D}/rows.json', 'w') as fh:
    json.dump({r['id']: {'files': r['files'], 'current': r['current']} for r in rows}, fh, indent=1)
print(len(rows), 'vague rows,', len(beh), 'behaviors')
