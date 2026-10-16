#!/usr/bin/env python3
"""Validate this source collection and rebuild its navigation (Python stdlib only)."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell(value):
    return str(value).replace('|', '\\|').replace('\n', ' ')


def source_row(doc, prefix=''):
    return (f"| {doc['id']} | {cell(doc['title'])} | "
            f"[image]({prefix}{doc['image']}) · [searchable text]({prefix}{doc['text']}) |")


def outputs(catalog):
    docs = catalog['documents']
    by_id = {d['id']: d for d in docs}
    categories = catalog['categories']
    pages = {}
    rows = ['# Complete HonestNFL source catalog', '',
            'Navigation titles describe the supplied sheets. Read the original image for exact '
            'language, arrows and assignments; the text companion is unproofread OCR.', '',
            '[Topic index](README.md#browse-by-subject) · [Term finder](TERMS.md) · '
            '[CSV](catalog.csv) · [Duplicate record](DUPLICATES.md)', '',
            '| ID | Teaching sheet | Open |', '| --- | --- | --- |']
    rows.extend(source_row(doc) for doc in docs)
    pages['CATALOG.md'] = '\n'.join(rows) + '\n'

    for category in categories:
        members = [d for d in docs if d['category'] == category['key']]
        rows = [f"# {category['title']}", '', category['description'], '',
                f"{len(members)} distinct source images. [Collection](../README.md) · "
                '[All sources](../CATALOG.md) · [Term finder](../TERMS.md)', '',
                '| ID | Teaching sheet | Open |', '| --- | --- | --- |']
        rows.extend(source_row(doc, '../') for doc in members)
        pages[f"topics/{category['key']}.md"] = '\n'.join(rows) + '\n'

    terms = sorted({term for doc in docs for term in doc['terms']}, key=str.casefold)
    rows = ['# Term and named-concept finder', '',
            'These are navigation matches in machine OCR, not universal definitions. '
            'A term can have different meanings across installations; verify its source image. '
            'Heading matches are listed first; body matches may use the word in another sense. '
            'OCR can miss or misread a term. For definitions as supplied, start with '
            '[terminology and glossaries](topics/terminology.md).', '',
            '[Collection](README.md) · [All sources](CATALOG.md)', '',
            '| Term / concept | Matching sheets |', '| --- | --- |']
    for term in terms:
        members = [d for d in docs if term in d['terms']]
        members.sort(key=lambda d: (not bool(re.search(r'\b' + re.escape(term) + r'\b', d['title'], re.I)), d['id']))
        links = [f"[{d['id']}]({d['text']})" for d in members]
        rows.append(f"| {cell(term)} | {', '.join(links)} |")
    pages['TERMS.md'] = '\n'.join(rows) + '\n'

    duplicates = [doc for doc in docs if len(doc['originals']) > 1]
    extra = sum(len(doc['originals']) - 1 for doc in duplicates)
    rows = ['# Duplicate and variant record', '',
            f"The archive has {sum(len(d['originals']) for d in docs)} image files. "
            f"{extra} additional copies in {len(duplicates)} groups have identical SHA-256 "
            f"content; one original payload per group is retained. All original paths remain "
            'in [catalog.json](catalog.json). No non-identical image was deleted.', '',
            '## Verified identical copies', '',
            '| Retained sheet | SHA-256 | Original archive filenames |',
            '| --- | --- | --- |']
    for doc in duplicates:
        names = '<br>'.join(cell(o['path']) for o in doc['originals'])
        rows.append(f"| [{doc['id']}]({doc['image']}) | `{doc['sha256']}` | {names} |")
    rows += ['', '## Similar images retained', '',
             'The following pairs are screening candidates from a 256-bit difference hash '
             '(distance at most 10). Similarity does not prove identical teaching content. '
             'Recompression, crops, team branding and small revisions can differ. Both '
             'payloads are retained and linked; do not collapse these by title or hash distance.', '',
             '| First image | Second image | Screening distance |', '| --- | --- | --- |']
    for pair in catalog['similarity_candidates']:
        a, b = by_id[pair['left']], by_id[pair['right']]
        rows.append(f"| [{a['id']}: {cell(a['title'])}]({a['image']}) | "
                    f"[{b['id']}: {cell(b['title'])}]({b['image']}) | {pair['distance']} |")
    pages['DUPLICATES.md'] = '\n'.join(rows) + '\n'

    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(['id', 'title', 'category', 'terms', 'image', 'text', 'sha256',
                     'bytes', 'width', 'height', 'original_archive_paths'])
    for doc in docs:
        writer.writerow([doc['id'], doc['title'], doc['category'], '; '.join(doc['terms']),
                         doc['image'], doc['text'], doc['sha256'], doc['bytes'],
                         doc['width'], doc['height'], '; '.join(o['path'] for o in doc['originals'])])
    pages['catalog.csv'] = output.getvalue()
    return pages


def validate(catalog):
    docs = catalog['documents']
    ids, hashes, paths, originals = set(), set(), set(), set()
    categories = {c['key'] for c in catalog['categories']}
    for doc in docs:
        assert re.fullmatch(r'HNFL-\d{3,}', doc['id']), doc['id']
        assert doc['id'] not in ids, f"Duplicate ID: {doc['id']}"
        assert doc['sha256'] not in hashes, f"Unconsolidated byte duplicate: {doc['id']}"
        ids.add(doc['id'])
        hashes.add(doc['sha256'])
        assert doc['category'] in categories, doc['category']
        assert doc['originals'], doc['id']
        for field in ['image', 'text']:
            relative = Path(doc[field])
            assert not relative.is_absolute() and '..' not in relative.parts, doc[field]
            assert doc[field] not in paths, f"Reused asset path: {doc[field]}"
            paths.add(doc[field])
            path = ROOT / relative
            assert path.is_file(), f"Missing {doc[field]}"
            expected = doc['sha256'] if field == 'image' else doc['text_sha256']
            assert digest(path) == expected, f"Changed bytes: {doc[field]}"
        assert (ROOT / doc['image']).stat().st_size == doc['bytes'], doc['id']
        for original in doc['originals']:
            assert original['sha256'] == doc['sha256'], doc['id']
            assert original['bytes'] == doc['bytes'], doc['id']
            key = (original['batch'], original['path'])
            assert key not in originals, f"Repeated archive member: {key}"
            originals.add(key)
    assert len(originals) == sum(b['original_files'] for b in catalog['batches']), 'Incomplete provenance'
    actual = {str(p.relative_to(ROOT)) for folder in ['images', 'text']
              for p in (ROOT / folder).rglob('*') if p.is_file()}
    assert actual == paths, f"Unindexed/missing assets: {actual ^ paths}"
    for pair in catalog['similarity_candidates']:
        assert pair['left'] in ids and pair['right'] in ids and pair['left'] != pair['right']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Rebuild generated navigation only.')
    parser.add_argument('--check', action='store_true', help='Validate; this is also the default.')
    args = parser.parse_args()
    if args.write and args.check:
        parser.error('Choose --write or --check.')
    catalog = json.loads((ROOT / 'catalog.json').read_text())
    validate(catalog)
    for name, expected in outputs(catalog).items():
        path = ROOT / name
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, newline='')
        else:
            assert path.is_file() and path.read_bytes() == expected.encode(), f"Stale navigation: {name}"
    # Local Markdown links, including the original image link in every OCR companion.
    for page in ROOT.rglob('*.md'):
        for target in re.findall(r'\]\(([^)]+)\)', page.read_text()):
            if target.startswith(('https://', 'http://', '#')):
                continue
            target = target.split('#', 1)[0]
            if target:
                assert (page.parent / target).resolve().exists(), f"Broken link in {page}: {target}"
    print(f"Validated {len(catalog['documents'])} unique images, "
          f"{sum(len(d['originals']) for d in catalog['documents'])} original mappings, "
          f"{len(catalog['categories'])} topics and generated navigation.")


if __name__ == '__main__':
    try:
        main()
    except (AssertionError, ValueError, KeyError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(1)
