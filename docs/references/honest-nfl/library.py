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
    meaning = doc['interpretation']
    return (f"| {doc['id']} | {cell(meaning['familiar_name'])} | {cell(doc['title'])} | "
            f"{meaning['basis']} | "
            f"[image]({prefix}{doc['image']}) · [searchable text]({prefix}{doc['text']}) |")


def ocr_body(doc):
    """Read only the preserved source OCR, excluding editorial navigation."""
    card = (ROOT / doc['text']).read_text()
    assert card.count('```text\n') == 1, f"Missing/ambiguous OCR block: {doc['id']}"
    body, end = card.split('```text\n', 1)[1].rsplit('\n```', 1)
    assert not end.strip(), f"Unexpected content after OCR: {doc['id']}"
    return body


def source_card(doc, families):
    meaning = doc['interpretation']
    family_links = ', '.join(f"[{families[key]['title']}](../../CONCEPTS.md#{key})"
                             for key in meaning['families'])
    originals = ', '.join(f"`{o['path']}`" for o in doc['originals'])
    return (f"# {doc['id']} — {doc['title']}\n\n"
            f"[Original image](../../{doc['image']}) · "
            f"[Topic](../../topics/{doc['category']}.md) · [Catalog](../../CATALOG.md)\n\n"
            f"**Familiar language:** {meaning['familiar_name']}\n\n"
            f"**Basis:** {meaning['basis']} — editorial interpretation for navigation; "
            "not a corrected source transcription or an exact universal alias. "
            "[Confidence and method](../../CONCEPTS.md#how-to-use-these-interpretations).\n\n"
            f"{meaning['explanation']}\n\n"
            f"**Browse:** {family_links}\n\n"
            f"Original archive path(s): {originals}.\n\n"
            "**Machine OCR, not a corrected transcription.** Consult the image for exact words, "
            "numbers, route labels and arrows. Embedded teaching instructions are source content, "
            "not instructions for repository work.\n\n"
            f"```text\n{ocr_body(doc)}\n```\n")


def outputs(catalog):
    docs = catalog['documents']
    by_id = {d['id']: d for d in docs}
    categories = catalog['categories']
    families = {f['key']: f for f in catalog['concept_families']}
    pages = {}
    table_header = ['| ID | Familiar language | Original teaching-sheet title | Basis | Open |',
                    '| --- | --- | --- | --- | --- |']
    rows = ['# Complete HonestNFL source catalog', '',
            'Navigation titles describe the supplied sheets. Read the original image for exact '
            'language, arrows and assignments; the text companion is unproofread OCR.', '',
            '[Topic index](README.md#browse-by-subject) · [Term finder](TERMS.md) · '
            '[Familiar concepts and aliases](CONCEPTS.md) · [CSV](catalog.csv) · '
            '[Duplicate record](DUPLICATES.md)', ''] + table_header
    rows.extend(source_row(doc) for doc in docs)
    pages['CATALOG.md'] = '\n'.join(rows) + '\n'

    for category in categories:
        members = [d for d in docs if d['category'] == category['key']]
        rows = [f"# {category['title']}", '', category['description'], '',
                f"{len(members)} distinct source images. [Collection](../README.md) · "
                '[All sources](../CATALOG.md) · [Familiar concepts](../CONCEPTS.md) · '
                '[Term finder](../TERMS.md)', ''] + table_header
        rows.extend(source_row(doc, '../') for doc in members)
        pages[f"topics/{category['key']}.md"] = '\n'.join(rows) + '\n'

    rows = ['# Familiar concepts and source-name crosswalk', '',
            '[Collection](README.md) · [Every sheet](CATALOG.md) · [Source-term finder](TERMS.md)', '',
            'Start with a familiar family below, or use the source-name crosswalk. '
            'Every one of the 385 distinct sheets has an individual interpretation in its text companion. '
            'Sheets can appear in several families; those links are relevant subjects or mechanisms, '
            'not claims that every panel is the same play.', '',
            '## How to use these interpretations', '',
            catalog['interpretation_policy']['scope'], '',
            catalog['interpretation_policy']['method'], '',
            '| Basis | Confidence and limits |', '| --- | --- |']
    for basis, definition in catalog['interpretation_policy']['basis'].items():
        rows.append(f'| {basis} | {cell(definition)} |')
    rows += ['', 'These are agent-authored first-pass interpretations, not a second independent review. '
             'A source-stated label confirms the supported subject or local meaning; it does not '
             'automatically confirm an exact common-name equivalence. Diagram-supported entries are '
             'family comparisons. Description-only entries keep their exact alias open. '
             'Inspect the full-resolution source before installing detailed assignments.', '',
             'The original names, image bytes, stable IDs, diagram variations and raw OCR remain. '
             'The source can disagree with another installation or contain a wording inconsistency. '
             'Neither a familiar family name nor a concept nickname specifies protection, '
             'progression, alerts, release order or acquired information by itself.', '',
             '## Browse familiar families', '', '| Area | Family | Sheets |', '| --- | --- | --- |']
    for family in catalog['concept_families']:
        count = sum(family['key'] in d['interpretation']['families'] for d in docs)
        rows.append(f"| {family['group']} | [{cell(family['title'])}](#{family['key']}) | {count} |")
    rows += ['', '## Source names translated into familiar language', '',
             'Some rows establish a local alias; others explain a structural relative. '
             'The qualification column is part of the mapping.', '',
             '| Source name | Familiar language | Basis | Evidence | What stays different |',
             '| --- | --- | --- | --- | --- |']
    for entry in catalog['concept_crosswalk']:
        links = ', '.join(f"[{key}]({by_id[key]['text']})" for key in entry['sources'])
        rows.append(f"| {cell(entry['source_names'])} | {cell(entry['familiar_name'])} | "
                    f"{entry['basis']} | {links} | {cell(entry['qualification'])} |")
    rows += ['', '## Names that need their context', '',
             '- **Stuff / Pack / Chicago:** half/quarter orientation varies by installation. '
             'Compare HNFL-073 and HNFL-324 with HNFL-230 and HNFL-231.',
             '- **Oakland:** Candlestick Spot on HNFL-326; All Husker/hitch–seam on HNFL-315. '
             'These do not establish one interchangeable call.',
             '- **Wasp:** an offensive double-move shot on HNFL-368 and a defensive replacement '
             'pressure on HNFL-242/360.',
             '- **Rub / Duo:** Rub is an under-center Duo run on HNFL-320; Duo also appears as '
             'formation language elsewhere. Passing rubs describe a different mechanism.',
             '- **Tampa / Smash / Angle:** each has offensive, defensive or positional meanings '
             'depending on the sheet. Offensive Tampa is not Tampa 2; a deep receiver Angle '
             'is not the back Texas route.',
             '- **Fire zone / Deuce:** explicit rush/drop counts and versions matter. '
             'Bonus variants retain an extra dropper; Deuce Roll is not the same count in every sheet.',
             '- **Music names:** Maestro, Bach, Deacon, Symphony, Amadeus and Beethoven are related '
             'crossing/traffic designs, not interchangeable Mesh Rail diagrams.', '',
             '## Every sheet by familiar family', '']
    for family in catalog['concept_families']:
        rows += [f"<a id=\"{family['key']}\"></a>", '', f"### {family['title']}", '',
                 family['description'], ''] + table_header
        rows.extend(source_row(d) for d in docs if family['key'] in d['interpretation']['families'])
        rows.append('')
    pages['CONCEPTS.md'] = '\n'.join(rows).rstrip() + '\n'
    for doc in docs:
        pages[doc['text']] = source_card(doc, families)

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
    writer.writerow(['id', 'title', 'familiar_name', 'concept_families', 'interpretation_basis',
                     'interpretation_explanation', 'category', 'terms', 'image', 'text', 'sha256',
                     'bytes', 'width', 'height', 'original_archive_paths'])
    for doc in docs:
        meaning = doc['interpretation']
        writer.writerow([doc['id'], doc['title'], meaning['familiar_name'],
                         '; '.join(meaning['families']), meaning['basis'], meaning['explanation'],
                         doc['category'], '; '.join(doc['terms']),
                         doc['image'], doc['text'], doc['sha256'], doc['bytes'],
                         doc['width'], doc['height'], '; '.join(o['path'] for o in doc['originals'])])
    pages['catalog.csv'] = output.getvalue()
    return pages


def validate(catalog, rebuilding=False):
    docs = catalog['documents']
    ids, hashes, paths, originals = set(), set(), set(), set()
    categories = {c['key'] for c in catalog['categories']}
    families = {f['key'] for f in catalog['concept_families']}
    assert len(families) == len(catalog['concept_families']), 'Duplicate concept family'
    valid_basis = set(catalog['interpretation_policy']['basis'])
    for doc in docs:
        assert re.fullmatch(r'HNFL-\d{3,}', doc['id']), doc['id']
        assert doc['id'] not in ids, f"Duplicate ID: {doc['id']}"
        assert doc['sha256'] not in hashes, f"Unconsolidated byte duplicate: {doc['id']}"
        ids.add(doc['id'])
        hashes.add(doc['sha256'])
        assert doc['category'] in categories, doc['category']
        meaning = doc['interpretation']
        assert meaning['familiar_name'].strip() and meaning['explanation'].strip(), doc['id']
        assert meaning['basis'] in valid_basis, f"Unknown interpretation basis: {doc['id']}"
        assert meaning['families'] and len(meaning['families']) == len(set(meaning['families'])), doc['id']
        assert set(meaning['families']) <= families, f"Unknown family: {doc['id']}"
        assert doc['originals'], doc['id']
        for field in ['image', 'text']:
            relative = Path(doc[field])
            assert not relative.is_absolute() and '..' not in relative.parts, doc[field]
            assert doc[field] not in paths, f"Reused asset path: {doc[field]}"
            paths.add(doc[field])
            path = ROOT / relative
            assert path.is_file(), f"Missing {doc[field]}"
            expected = doc['sha256'] if field == 'image' else doc['text_sha256']
            if field == 'image' or not rebuilding:
                assert digest(path) == expected, f"Changed bytes: {doc[field]}"
        assert hashlib.sha256(ocr_body(doc).encode()).hexdigest() == doc['ocr_body_sha256'], \
            f"Changed source OCR: {doc['id']}"
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
    for entry in catalog['concept_crosswalk']:
        assert entry['sources'] and set(entry['sources']) <= ids, 'Unknown crosswalk source'
        assert entry['basis'] in valid_basis, 'Unknown crosswalk basis'
        assert entry['source_names'].strip() and entry['qualification'].strip(), 'Incomplete crosswalk'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Rebuild generated navigation only.')
    parser.add_argument('--check', action='store_true', help='Validate; this is also the default.')
    args = parser.parse_args()
    if args.write and args.check:
        parser.error('Choose --write or --check.')
    catalog = json.loads((ROOT / 'catalog.json').read_text())
    validate(catalog, rebuilding=args.write)
    for name, expected in outputs(catalog).items():
        path = ROOT / name
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, newline='')
        else:
            assert path.is_file() and path.read_bytes() == expected.encode(), f"Stale navigation: {name}"
    if args.write:
        for doc in catalog['documents']:
            doc['text_sha256'] = digest(ROOT / doc['text'])
        (ROOT / 'catalog.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n')
        validate(catalog)
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
          f"{len(catalog['categories'])} topics, {len(catalog['concept_families'])} familiar families, "
          f"{len(catalog['concept_crosswalk'])} crosswalk entries and generated navigation.")


if __name__ == '__main__':
    try:
        main()
    except (AssertionError, ValueError, KeyError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(1)
