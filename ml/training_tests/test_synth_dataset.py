"""Checks for the synth-v3 generator, grade function, gate and splits, on invented data only."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from synth_fixture import ML_DIR, OTHERS, fake_profile, make_taxonomy, write_dataset
import audit
import gate
import splits
from grades import GOALS, grade, proximity
from prompts import SYSTEM, avoid_words, batch_prompt, brief, template_for
from specs import STYLES, generate
from write_profiles import parse_reply

RELATED = {'11-1011.00': {'13-1111.00'}}


def mentee(goal='career_entry', target='11-1011.00', want=(), origin=None):
    return {'goal': goal, 'target': target, 'want_skills': list(want), 'origin': origin}


def mentor(occupation='11-1011.00', supports=('career_entry',), skills=(), past=None):
    return {'occupation': occupation, 'supports': list(supports), 'skills': list(skills), 'past_occupation': past}


class GradeTests(unittest.TestCase):
    def test_proximity_levels(self):
        self.assertEqual(proximity('11-1011.00', '11-1011.00', RELATED), 3)
        self.assertEqual(proximity('11-1011.00', '13-1111.00', RELATED), 2)
        self.assertEqual(proximity('13-1111.00', '11-1011.00', RELATED), 2, 'links count in both directions')
        self.assertEqual(proximity('11-1011.00', '11-1011.03', RELATED), 2, 'same six-digit group')
        self.assertEqual(proximity('11-1011.00', '11-1021.00', RELATED), 1, 'same cluster only')
        self.assertEqual(proximity('11-1011.00', '53-2011.00', RELATED), 0)

    def test_documented_field_specific_examples(self):
        self.assertEqual(grade(mentee(), mentor(), RELATED), 3)
        self.assertEqual(grade(mentee(), mentor('13-1111.00'), RELATED), 2)
        self.assertEqual(grade(mentee(), mentor(supports=['leadership']), RELATED), 1)
        self.assertEqual(grade(mentee(), mentor('53-2011.00'), RELATED), 0)
        self.assertEqual(grade(mentee(), mentor('13-1111.00', supports=['leadership']), RELATED), 1)
        self.assertEqual(grade(mentee(), mentor('11-1021.00'), RELATED), 1)
        self.assertEqual(grade(mentee(), mentor('11-1021.00', supports=['leadership']), RELATED), 0)

    def test_skills_only_move_borderline_cases(self):
        wanted = mentee(want=['x', 'y'])
        self.assertEqual(grade(wanted, mentor(supports=['leadership'], skills=['x', 'y']), RELATED), 2)
        self.assertEqual(grade(wanted, mentor(supports=['leadership'], skills=['x']), RELATED), 1)
        self.assertEqual(grade(wanted, mentor('53-2011.00', skills=['x', 'y']), RELATED), 1)
        self.assertEqual(grade(wanted, mentor('53-2011.00', supports=['leadership'], skills=['x', 'y']), RELATED), 0)

    def test_general_goals_need_the_offer_first(self):
        lead = mentee('leadership')
        self.assertEqual(grade(lead, mentor(supports=['leadership']), RELATED), 3)
        self.assertEqual(grade(lead, mentor('13-1111.00', supports=['leadership']), RELATED), 3)
        self.assertEqual(grade(lead, mentor('11-9199.00', supports=['leadership']), RELATED), 2, 'same family')
        self.assertEqual(grade(lead, mentor('53-2011.00', supports=['leadership']), RELATED), 1)
        self.assertEqual(grade(lead, mentor(), RELATED), 1)
        self.assertEqual(grade(lead, mentor('53-2011.00'), RELATED), 0)

    def test_previous_occupation_and_same_route(self):
        self.assertEqual(grade(mentee(), mentor('53-2011.00', past='11-1011.00'), RELATED), 2, 'a past job counts one level lower')
        changer = mentee('career_change', origin='29-1141.00')
        self.assertEqual(grade(changer, mentor('13-1111.00', ['career_change'], past='29-1141.00'), RELATED), 3)
        self.assertEqual(grade(changer, mentor('13-1111.00', ['career_change'], past='25-1011.00'), RELATED), 2)

    def test_grade_is_bounded_and_ignores_text_and_extra_fields(self):
        for goal in GOALS:
            for occupation in ('11-1011.00', '13-1111.00', '11-1021.00', '53-2011.00'):
                for supports in ([goal], ['postgraduate'], []):
                    self.assertIn(grade(mentee(goal), mentor(occupation, supports), RELATED), (0, 1, 2, 3))
        noisy = {**mentor(), 'headline': 'irrelevant', 'bio': 'grade 0', 'person_id': 'X', 'style': 'y'}
        self.assertEqual(grade({**mentee(), 'bio': 'text'}, noisy, RELATED), 3)
        with self.assertRaises(ValueError):
            grade(mentee('unknown'), mentor(), RELATED)


class SpecTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.taxonomy = make_taxonomy()
        cls.selection, cls.specs = generate(cls.taxonomy, seed=7, size='fixture', other_occupations=OTHERS)

    def test_generation_is_seeded(self):
        self.assertEqual(generate(self.taxonomy, seed=7, size='fixture', other_occupations=OTHERS)[1], self.specs)
        self.assertNotEqual(generate(self.taxonomy, seed=8, size='fixture', other_occupations=OTHERS)[1], self.specs)

    def test_sizes_roles_and_unique_people(self):
        ids = [spec['person_id'] for spec in self.specs]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(spec['split'] == 'train' and spec['role'] == 'mentor' for spec in self.specs), 60)
        self.assertEqual(sum(spec['split'] == 'test' and spec['role'] == 'mentee' for spec in self.specs), 12)

    def test_held_out_clusters_and_styles_are_disjoint(self):
        checks = gate.split_checks(self.specs, self.selection)
        for name, value in checks.items():
            if isinstance(value, bool):
                self.assertTrue(value, name)
        self.assertTrue(self.selection['held_out']['test'] and self.selection['held_out']['validation'])
        self.assertFalse(set(STYLES['test']) & (set(STYLES['train']) | set(STYLES['validation'])))
        self.assertFalse(set(STYLES['validation']) & set(STYLES['train']))

    def test_split_checks_catch_a_leaked_cluster_and_style(self):
        leaked = [dict(spec) for spec in self.specs]
        donor = next(spec for spec in leaked if spec['split'] == 'test' and spec['role'] == 'mentor'
                     and spec['occupation'][:4] in self.selection['held_out']['test'])
        victim = next(spec for spec in leaked if spec['split'] == 'train' and spec['role'] == 'mentor')
        victim['occupation'], victim['style'] = donor['occupation'], donor['style']
        checks = gate.split_checks(leaked, self.selection)
        self.assertFalse(checks['test_unseen_clusters_absent_from_train_and_validation'])
        self.assertFalse(checks['test_styles_disjoint_from_train_and_validation'])

    def test_special_cases_are_present(self):
        mentees = [spec for spec in generate(self.taxonomy, seed=7, size='floor', other_occupations=OTHERS)[1] if spec['role'] == 'mentee']
        self.assertTrue(any(spec['case'] == 'mismatch' for spec in mentees))
        self.assertTrue(any(spec['case'] == 'sparse' for spec in mentees))
        self.assertTrue(any(spec['origin'] for spec in mentees))
        self.assertTrue(any(spec['orphan_target'] for spec in mentees))


class PromptTests(unittest.TestCase):
    def test_briefs_never_show_ids_codes_or_grades_and_templates_differ_by_split(self):
        taxonomy = make_taxonomy()
        _, specs = generate(taxonomy, seed=7, size='fixture', other_occupations=OTHERS)
        for spec in specs[:40] + specs[-40:]:
            text = brief(spec, taxonomy, 3)
            self.assertNotIn(spec['person_id'], text)
            self.assertNotRegex(text, r'\d\d-\d{4}')
            self.assertNotIn('grade', text.lower())
            self.assertEqual(text, brief(spec, taxonomy, 3))
            self.assertEqual(text.startswith('Card'), spec['split'] == 'test')
        self.assertEqual(template_for('test'), 'B')
        self.assertEqual(template_for('train'), template_for('validation'))
        self.assertNotEqual(SYSTEM['A'], SYSTEM['B'])
        self.assertIn('Brief 2', batch_prompt(specs[:2], taxonomy))

    def test_avoid_words_keep_distinctive_title_words(self):
        self.assertEqual(avoid_words('Airline Pilots, Copilots, and Flight Engineers'), ['airline', 'pilot', 'copilot', 'flight'])
        self.assertEqual(avoid_words('Logistics Analysts'), ['logistic'])

    def test_reply_parser_requires_one_ordered_profile_per_brief(self):
        row = {'n': 1, 'headline': ' H ', 'bio': 'B', 'skills': ['s', ' '], 'industry': 'I'}
        self.assertEqual(parse_reply('note [' + json.dumps(row) + '] end', 1)[0],
                         {'headline': 'H', 'bio': 'B', 'skills': ['s'], 'industry': 'I'})
        for bad in ('nothing', json.dumps([row, row]), json.dumps([{**row, 'n': 2}]), json.dumps([{**row, 'skills': 'x'}])):
            with self.assertRaises(ValueError):
                parse_reply(bad, 1)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.taxonomy = make_taxonomy()
        _, specs = generate(self.taxonomy, seed=7, size='fixture', other_occupations=OTHERS)
        self.standard = next(spec for spec in specs if spec['case'] == 'standard' and spec['role'] == 'mentor')
        self.mismatch = next(spec for spec in specs if spec['case'] == 'mismatch')
        self.sparse = next(spec for spec in specs if spec['case'] == 'sparse')

    def test_clean_profiles_pass_and_each_fault_is_named(self):
        good = fake_profile(self.standard, self.taxonomy)
        self.assertEqual(gate.check_profile(good, self.standard, self.taxonomy), [])
        faults = {
            'leak:label_or_spec': {**good, 'bio': good['bio'] + ' This is a grade 3 match.'},
            'privacy:contact': {**good, 'bio': good['bio'] + ' Write to me at someone@example.org.'},
            'privacy:named_organisation': {**good, 'bio': good['bio'] + ' I spent years at Kenya Airways.'},
            'length:too_long': {**good, 'headline': 'x' * 200},
            'length:too_short': {**good, 'bio': 'Too short.'},
            'schema:skills': {**good, 'skills': 'not a list'},
        }
        for reason, profile in faults.items():
            self.assertIn(reason, gate.check_profile(profile, self.standard, self.taxonomy), reason)
        self.assertIn('leak:label_or_spec', gate.check_profile({**good, 'bio': good['bio'] + ' Code 17-2011.00.'},
                                                                 self.standard, self.taxonomy))
        ordinary = {**good, 'bio': good['bio'] + ' I review bid specifications and the relevance of standards.'}
        self.assertEqual(gate.check_profile(ordinary, self.standard, self.taxonomy), [], 'everyday words are not leaks')

    def test_case_rules(self):
        code = self.mismatch.get('occupation') or self.mismatch['target']
        stated = {**fake_profile(self.mismatch, self.taxonomy), 'headline': self.taxonomy[code]['title']}
        self.assertIn('case:title_stated', gate.check_profile(stated, self.mismatch, self.taxonomy))
        self.assertEqual(gate.check_profile(fake_profile(self.mismatch, self.taxonomy), self.mismatch, self.taxonomy), [])
        wordy = {'headline': 'Short', 'bio': 'word ' * 30, 'skills': [], 'industry': ''}
        self.assertIn('case:not_sparse', gate.check_profile(wordy, self.sparse, self.taxonomy))
        self.assertEqual(gate.check_profile(fake_profile(self.sparse, self.taxonomy), self.sparse, self.taxonomy), [])

    def test_exact_and_near_duplicates_keep_the_first(self):
        base = {'headline': 'Planner', 'skills': ['a'], 'industry': 'X',
                'bio': 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen'}
        rows = [{**base, 'person_id': 'P1'}, {**base, 'person_id': 'P2'},
                {**base, 'person_id': 'P3', 'bio': base['bio'] + ' fifteen', 'headline': 'Other'},
                {**base, 'person_id': 'P4', 'bio': 'completely different words appear in this particular biography text which shares nothing at all'}]
        self.assertEqual(gate.duplicates(rows), {'P2': 'duplicate:exact', 'P3': 'duplicate:near'})


class PipelineTests(unittest.TestCase):
    def test_gate_and_splits_end_to_end(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            taxonomy, selection, specs = write_dataset(folder)
            (folder / 'taxonomy.json').write_text(json.dumps({'occupations': taxonomy}))
            for extra in ([], ['--final']):
                subprocess.run([sys.executable, '-B', str(ML_DIR / 'synth' / 'gate.py'), str(folder / 'taxonomy.json'),
                                str(folder), *extra], check=True, capture_output=True)
            report = json.loads((folder / 'gate_report.json').read_text())
            self.assertEqual(report['accepted'] + report['dropped'], len(specs))
            manifest = splits.build(taxonomy, folder)
            again = splits.build(taxonomy, folder)
            self.assertEqual(manifest['files'], again['files'], 'splits are deterministic')
            load = lambda name: [json.loads(line) for line in (folder / name).read_text().splitlines()]
            for split in ('validation', 'test'):
                people = load(f'{split}_profiles.jsonl')
                mentors = sum(person['role'] == 'mentor' for person in people)
                mentees = len(people) - mentors
                pairs = load(f'{split}_pairs.jsonl')
                self.assertEqual(len(pairs), mentors * mentees, 'held-out pools are completely judged')
                self.assertEqual(len({(pair['mentee_id'], pair['mentor_id']) for pair in pairs}), len(pairs))
                self.assertEqual(len(load(f'{split}_queries.jsonl')), mentees)
            train_ids = {person['person_id'] for person in load('train_profiles.jsonl')}
            held_ids = {person['person_id'] for split in ('validation', 'test') for person in load(f'{split}_profiles.jsonl')}
            self.assertFalse(train_ids & held_ids)
            for pair in load('train_pairs.jsonl'):
                self.assertIn(pair['mentee_id'], train_ids)
                self.assertIn(pair['mentor_id'], train_ids)
                self.assertEqual(pair['relevance_score'] == 0, pair['sampling'] in ('hard', 'random'))
            for person in load('train_profiles.jsonl'):
                self.assertEqual(set(person), {'person_id', 'role', 'split', 'headline', 'bio', 'skills', 'industry'})
            sheet = (folder / 'human_review_sheet.csv').read_text()
            self.assertNotIn('generated_grade', sheet)
            self.assertNotIn('MTE-', sheet)
            self.assertIn('your_grade_0_to_3', sheet)
            self.assertIn('generated_grade', (folder / 'test_human_review_key.csv').read_text())
            archive = splits.backup(folder, folder / 'backup')
            self.assertTrue(archive.exists())

    def test_parser_runs_in_isolated_mode_on_an_invented_download(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            source = folder / 'download'
            source.mkdir()
            tab = lambda *cells: '\t'.join(cells) + '\n'
            codes = ['11-1000.00', '11-1000.01']
            (source / 'Read Me.txt').write_text('Invented Database 0.1\nTest Release\n')
            (source / 'Occupation Data.txt').write_text(tab('O*NET-SOC Code', 'Title', 'Description') + ''.join(
                tab(code, f'Title {code}', 'Invented.') for code in codes))
            (source / 'Job Zones.txt').write_text(tab('O*NET-SOC Code', 'Job Zone', 'Date', 'Domain Source') + ''.join(
                tab(code, '4', '01/2026', 'Test') for code in codes))
            (source / 'Task Statements.txt').write_text(tab('O*NET-SOC Code', 'Task ID', 'Task', 'Task Type') + ''.join(
                tab(code, str(n), f'Task {n}.', 'Core') for code in codes for n in range(5)))
            (source / 'Technology Skills.txt').write_text(
                tab('O*NET-SOC Code', 'Example', 'Commodity Code', 'Commodity Title', 'Hot Technology', 'In Demand') + ''.join(
                    tab(code, f'Tool {code} {n}', '1', 'Category', 'N', 'N') for code in codes for n in range(5)))
            (source / 'Alternate Titles.txt').write_text(tab('O*NET-SOC Code', 'Alternate Title', 'Short Title', 'Source(s)')
                                                         + tab(codes[0], 'Other name', 'n/a', '1'))
            (source / 'Related Occupations.txt').write_text(
                tab('O*NET-SOC Code', 'Related O*NET-SOC Code', 'Relatedness Tier', 'Index')
                + tab(codes[0], codes[1], 'Primary-Short', '1') + tab(codes[1], codes[0], 'Supplemental', '11'))
            header = tab('O*NET-SOC Code', 'Element ID', 'Element Name', 'Scale ID', 'Data Value', 'Recommend Suppress')
            for name in ('Skills.txt', 'Knowledge.txt'):
                (source / name).write_text(header + ''.join(tab(code, '1', 'Element', 'IM', '4.0', 'N') for code in codes))
            output = folder / 'taxonomy.json'
            subprocess.run([sys.executable, '-I', str(ML_DIR / 'synth' / 'parse_onet.py'), str(source), str(output)],
                           check=True, capture_output=True)
            parsed = json.loads(output.read_text())
            self.assertEqual(parsed['version'], 'Invented Database 0.1')
            self.assertEqual(parsed['occupations'][codes[0]]['related'], [codes[1]])
            self.assertEqual(parsed['occupations'][codes[1]]['related'], [], 'supplemental links are not used')


class AuditTests(unittest.TestCase):
    def test_weighted_kappa_hand_cases(self):
        self.assertEqual(audit.weighted_kappa([0, 1, 2, 3], [0, 1, 2, 3]), 1.0)
        # Two raters, grades (0,3) and (3,0): observed squared distance 9, expected 4.5, kappa -1.
        self.assertAlmostEqual(audit.weighted_kappa([0, 3], [3, 0]), -1.0)
        # (0,0),(3,3),(0,3),(3,0): observed 4.5, expected 4.5, so chance level.
        self.assertAlmostEqual(audit.weighted_kappa([0, 3, 0, 3], [0, 3, 3, 0]), 0.0)

    def test_agreement_summary(self):
        result = audit.agreement([0, 1, 2, 3], [0, 2, 2, 1])
        self.assertEqual(result['exact_agreement'], 0.5)
        self.assertEqual(result['within_one_grade'], 0.75)
        self.assertEqual(result['same_side_of_relevant'], 0.5)
        self.assertEqual(result['confusion_rows_generated_columns_judge'][1], [0, 0, 1, 0])

    def test_judge_prompt_shows_text_only(self):
        profile = {'person_id': 'MTR-TST-0001', 'headline': 'H', 'bio': '', 'skills': [], 'industry': 'I', 'split': 'test'}
        shown = audit.card(profile)
        self.assertNotIn('MTR', shown)
        self.assertNotIn('test', shown)
        self.assertNotIn('grade', audit.card(profile).lower())


if __name__ == '__main__':
    unittest.main()
