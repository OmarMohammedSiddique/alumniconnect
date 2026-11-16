"""Invented taxonomy and a template writer for synth-v3 tests. No O*NET data and no model calls."""
from pathlib import Path
import json
import sys

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR / 'synth'))
from specs import AVIATION, LOGISTICS, generate  # noqa: E402

EXTRA = ('11-2021.00', '11-9041.00', '13-2011.00', '13-2051.00', '15-1252.00', '15-1211.00', '15-2051.00',
         '17-2051.00', '17-2141.00', '17-2071.00', '19-2041.00', '27-3042.00', '41-3031.00', '49-9041.00',
         '19-3011.00', '25-1011.00', '29-1141.00', '21-1012.00', '23-1011.00', '27-1024.00')
ORPHANS = ('19-1099.00', '25-9099.00', '29-9099.00', '21-9099.00')
OTHERS = 14  # occupations sampled besides the forced lists, so some unlinked ones stay unused


def make_taxonomy():
    """Occupations with made-up titles, tasks and tools; links join neighbours in code order."""
    codes = sorted(AVIATION + LOGISTICS + EXTRA + ORPHANS)
    taxonomy = {}
    for number, code in enumerate(codes):
        linked = [] if code in ORPHANS else [other for other in (codes[number - 1], codes[(number + 1) % len(codes)])
                                               if other not in ORPHANS and other != code]
        taxonomy[code] = {
            'title': f'Zorbel {number} Planners', 'description': f'Invented occupation {number}.', 'job_zone': 4,
            'tasks': [f'Do invented task {number}-{task}.' for task in range(6)],
            'tools': [f'tool{number}x{tool}' for tool in range(8)] + ['sharedtool'],
            'skills': ['Listening'], 'knowledge': [f'field{number}', 'Mathematics', 'Management', 'Design', 'Safety'],
            'alternate_titles': [f'Zorbel {number} lead'], 'related': linked,
        }
    return taxonomy


def fake_profile(spec, taxonomy):
    """Template text standing in for the writing model. Sparse and indirect cases follow the gate's rules."""
    code = spec['occupation'] if spec['role'] == 'mentor' else spec['target']
    name = taxonomy[code]['title'] if spec['case'] != 'mismatch' else f'work on task area {code[-5:]}'
    aim = ' and '.join(spec['supports']).replace('_', ' ') if spec['role'] == 'mentor' else spec['goal'].replace('_', ' ')
    unique = spec['person_id'].lower().replace('-', ' ')
    if spec['case'] == 'sparse':
        return {'headline': f'{name[:20]} {unique[-4:]}', 'bio': '', 'skills': [], 'industry': ''}
    skills = spec['skills'] if spec['role'] == 'mentor' else spec['have_skills']
    bio = (f'Person {unique} here. My daily work is {name} in {spec["city"]}. I care about {aim}. '
           f'Notes {unique[::-1]} keep this text distinct from every other profile in the set.')
    return {'headline': f'{name} ({unique[-4:]})', 'bio': bio, 'skills': list(skills) or ['general'], 'industry': 'Invented'}


def write_dataset(folder, size='fixture', seed=7):
    """Generate specifications and template profiles into `folder` in the raw layout the gate reads."""
    folder = Path(folder)
    taxonomy = make_taxonomy()
    selection, specs = generate(taxonomy, seed=seed, size=size, other_occupations=OTHERS)
    (folder / 'raw').mkdir(parents=True, exist_ok=True)
    (folder / 'specs.jsonl').write_text(''.join(json.dumps(spec) + '\n' for spec in specs))
    (folder / 'selection.json').write_text(json.dumps(selection))
    profiles = [{'person_id': spec['person_id'], **fake_profile(spec, taxonomy)} for spec in specs]
    (folder / 'raw' / 'round1_batch0000.json').write_text(json.dumps({'profiles': profiles, 'cost_usd': 0}))
    return taxonomy, selection, specs
