"""Checks for the v3 tokeniser and trainer, on an invented dataset with template text."""
from pathlib import Path
import builtins
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from synth_fixture import ML_DIR, write_dataset
sys.path.insert(0, str(ML_DIR))
import torch
import bpe_tokenizer
import gate
import splits
import train_scratch_v3 as v3
import lock_v3
import score_locked_test_v3
import select_v3

SMALL = {'epochs': 3, 'patience': 9, 'pretrain_epochs': 1, 'vocabulary_size': 260, 'max_length': 48,
         'batch_queries': 8, 'warmup_steps': 2}
CONFIG = {'encoder': 'transformer', 'width': 16, 'pretrain': True}


def build_dataset(folder):
    """Specifications, template profiles, gate and splits, exactly as the real pipeline runs them."""
    folder = Path(folder)
    taxonomy, selection, specs = write_dataset(folder)
    written, _, _ = gate.load_written(folder)
    lines = [json.dumps({'person_id': s['person_id'], 'role': s['role'], 'split': s['split'],
                         **{k: written[s['person_id']][k] for k in ('headline', 'bio', 'skills', 'industry')}}) for s in specs]
    (folder / 'profiles.jsonl').write_text('\n'.join(lines) + '\n')
    splits.build(taxonomy, folder)
    return folder


class TokenizerTests(unittest.TestCase):
    texts = ['Runway planner in Nairobi', 'Planning runway slots', 'Runway planning and planners', 'Ledger keeper']

    def test_training_is_deterministic_and_uses_only_given_text(self):
        first = bpe_tokenizer.train(self.texts, 80, 16)
        self.assertEqual(first, bpe_tokenizer.train(self.texts, 80, 16))
        self.assertEqual(list(first['vocabulary'])[:3], ['<pad>', '<unk>', '<mask>'])
        self.assertFalse(any('zebra' in piece for piece in first['vocabulary']))
        self.assertLessEqual(len(first['vocabulary']), 80)

    def test_encoding_contract(self):
        tokenizer = bpe_tokenizer.Tokenizer(bpe_tokenizer.train(self.texts, 80, 6))
        self.assertEqual(tokenizer.ids(''), [1])
        self.assertEqual(tokenizer.ids('   \n '), [1])
        self.assertEqual(tokenizer.ids('RUNWAY'), tokenizer.ids('runway'))
        self.assertEqual(tokenizer.ids('ÉCOLE'), tokenizer.ids('École'.replace('É', 'É')), 'non-ASCII case is left alone')
        self.assertIn(1, tokenizer.ids('未知'))
        self.assertEqual(len(tokenizer.ids('runway planner ' * 20)), 6)
        row = tokenizer.encode(['runway'])[0]
        self.assertEqual(len(row), 6)
        self.assertEqual(row[len(tokenizer.ids('runway')):], [0] * (6 - len(tokenizer.ids('runway'))))
        self.assertEqual(bpe_tokenizer.words('C++ and A/B, x_y'), ['c', '+', '+', 'and', 'a', '/', 'b', ',', 'x', '_', 'y'])

    def test_save_and_load_round_trip(self):
        tokenizer = bpe_tokenizer.Tokenizer(bpe_tokenizer.train(self.texts, 80, 16))
        with tempfile.TemporaryDirectory() as folder:
            tokenizer.save(Path(folder) / 'tokenizer.json')
            again = bpe_tokenizer.Tokenizer.load(Path(folder) / 'tokenizer.json')
        for sample in self.texts + ['unseen words here', '']:
            self.assertEqual(tokenizer.ids(sample), again.ids(sample))
        with self.assertRaises(ValueError):
            bpe_tokenizer.Tokenizer({'format': 'other'})


class ModelTests(unittest.TestCase):
    def test_heads_have_no_bias_and_outputs_are_unit_length_and_directional(self):
        for kind in v3.GRID['encoder']:
            torch.manual_seed(0)
            model = v3.Encoder(50, kind, 16, 12)
            self.assertIsNone(model.query_head.bias)
            self.assertIsNone(model.mentor_head.bias)
            self.assertTrue(torch.equal(model.query_head.weight, model.mentor_head.weight), 'heads share one random start')
            self.assertFalse(model.query_norm.affine or model.mentor_norm.affine, 'no learned offset after pooling')
            with torch.no_grad():  # stand in for training: separate the heads and give the centring layers statistics
                model.mentor_head.weight.add_(torch.randn_like(model.mentor_head.weight))
                model.train()
                rows = torch.randint(3, 50, (32, 5))
                model(rows, True), model(rows, False)
            model.eval()
            tokens = torch.tensor([[5, 6, 7, 0, 0], [8, 9, 0, 0, 0]])
            query, mentor = model(tokens, True), model(tokens, False)
            self.assertEqual(query.shape, (2, 64))
            self.assertTrue(torch.allclose(query.norm(dim=1), torch.ones(2), atol=1e-5))
            self.assertFalse(torch.allclose(query, mentor))
            padded = torch.cat([tokens, torch.zeros(2, 4, dtype=torch.long)], dim=1)
            self.assertTrue(torch.allclose(model(padded, True), query, atol=1e-5), 'padding must not change a vector')

    def test_centred_queries_cannot_give_every_mentee_the_same_order(self):
        # In training mode the Mentee vectors are centred across the batch, so before the final
        # length normalisation each Mentor's average score over the batch is zero by construction.
        torch.manual_seed(0)
        model = v3.Encoder(50, 'conv', 16, 12).train()
        rows = torch.randint(3, 50, (64, 6))
        centred = model.query_head(model.query_norm(model.pooled(rows)))
        self.assertLess(float(centred.mean(0).abs().max()), 1e-5)

    def test_listwise_loss_hand_cases(self):
        # One Mentee, two candidates with equal scores: grade 3 and grade 0. Target is all on the first.
        self.assertAlmostEqual(float(v3.listwise_loss(torch.zeros(1, 2), torch.tensor([[3, 0]]))), 0.693147, places=5)
        # Gains 7 and 1 share the target 7/8 and 1/8; equal scores still give ln 2.
        self.assertAlmostEqual(float(v3.listwise_loss(torch.zeros(1, 2), torch.tensor([[3, 1]]))), 0.693147, places=5)
        good = v3.listwise_loss(torch.tensor([[4.0, 0.0, 0.0]]), torch.tensor([[3, 0, 0]]))
        bad = v3.listwise_loss(torch.tensor([[0.0, 4.0, 0.0]]), torch.tensor([[3, 0, 0]]))
        self.assertLess(float(good), float(bad))
        # A Mentee with nothing graded above 0 in the batch is skipped, not treated as all-negative.
        mixed = v3.listwise_loss(torch.zeros(2, 2), torch.tensor([[3, 0], [0, 0]]))
        self.assertAlmostEqual(float(mixed), 0.693147, places=5)
        self.assertEqual(float(v3.listwise_loss(torch.zeros(1, 2), torch.tensor([[0, 0]]))), 0.0)

    def test_ranking_loss_orders_by_grade(self):
        grades = torch.tensor([3, 0, 1])
        good, bad = torch.tensor([2.0, -2.0, 0.0]), torch.tensor([-2.0, 2.0, 0.0])
        self.assertLess(float(v3.ranking_loss(good, grades)), float(v3.ranking_loss(bad, grades)))
        self.assertEqual(float(v3.ranking_loss(good, torch.tensor([1, 1, 1]))), 0.0)
        # Two candidates, grades 2 and 0, equal scores: softplus(0) = ln 2.
        self.assertAlmostEqual(float(v3.ranking_loss(torch.zeros(2), torch.tensor([2, 0]))), 0.693147, places=5)

    def test_grid_is_the_declared_one(self):
        self.assertEqual(v3.GRID, {'encoder': ('transformer', 'conv'), 'width': (64, 128), 'pretrain': (False, True)})
        self.assertGreaterEqual(len(v3.SEEDS), 3)
        self.assertIn(v3.FIXED['output'], (64, 128))
        self.assertEqual(v3.FIXED['loss'], 'listwise')


class SelectionTests(unittest.TestCase):
    def run_record(self, encoder, seed, score, width=64, pretrain=False):
        ok = score is not None
        return {'run': f'{encoder}-{seed}', 'config': {'encoder': encoder, 'width': width, 'pretrain': pretrain}, 'seed': seed,
                'parameters': 10, 'train_fraction': 1.0, 'status': 'ok' if ok else 'collapsed', 'best_epoch': 3 if ok else None,
                'seconds_total': 60, **({'validation': {'ndcg5': {'mean': score}}, 'collapse': {'mentor_mean_variance_share': 0.1}} if ok else {})}

    def test_rule_picks_best_mean_then_best_seed_and_skips_collapsed_runs(self):
        runs = [self.run_record('transformer', 42, 0.50), self.run_record('transformer', 43, 0.40),
                self.run_record('transformer', 44, 0.42), self.run_record('conv', 42, 0.48),
                self.run_record('conv', 43, 0.47), self.run_record('conv', 44, 0.49),
                self.run_record('conv', 42, None, width=128), self.run_record('transformer', 42, 0.30, width=128)]
        rows = select_v3.summarise(runs)
        order = select_v3.stage_one(rows)
        self.assertEqual(order[:2], ['transformer-w64-nopre', 'conv-w64-nopre'])
        self.assertNotIn('conv-w128-nopre', order, 'a collapsed run has no figure to rank')
        chosen = select_v3.select(rows, order[:2], (42, 43, 44))
        self.assertEqual((chosen['configuration'], chosen['locked_seed']), ('conv-w64-nopre', 44))
        self.assertIsNone(select_v3.select(rows, ['transformer-w128-nopre'], (42, 43, 44)), 'finalists need every seed')


class TrainerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.data = build_dataset(Path(cls.temp.name) / 'data')
        cls.runs = Path(cls.temp.name) / 'runs'
        cls.record = v3.run(cls.data, 'a', CONFIG, 42, device='cpu', overrides=SMALL, runs_root=cls.runs)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def log(self, name):
        return [e for e in json.loads((self.runs / name / 'log.json').read_text()) if e['stage'] == 'train']

    def test_run_records_everything_needed_to_trace_it(self):
        record = self.record
        for key in ('config', 'settings', 'seed', 'commit', 'data', 'tokenizer_sha256', 'parameters', 'environment',
                    'seconds_total', 'checkpoint_last_sha256'):
            self.assertIn(key, record)
        self.assertEqual(record['pretrained_components'], [])
        self.assertEqual(set(record['data']['sha256']), {'train_profiles.jsonl', 'train_pairs.jsonl', 'train_grades.json',
                                                         'validation_profiles.jsonl', 'validation_pairs.jsonl'})
        for name in ('run.json', 'log.json', 'loss_curves.png', 'tokenizer.json', 'checkpoint_last.pt'):
            self.assertTrue((self.runs / 'a' / name).exists(), name)
        rows = self.log('a')
        self.assertEqual(len(rows), 3)
        for row in rows:
            self.assertIn('train_loss', row)
            self.assertIn('validation_loss', row)
            self.assertEqual(row['validation_ndcg5'] is not None, row['collapse_passed'])
        stages = [e['stage'] for e in json.loads((self.runs / 'a' / 'log.json').read_text())]
        self.assertEqual(stages.count('pretrain'), 1)
        with self.assertRaises(FileExistsError):
            v3.run(self.data, 'a', CONFIG, 42, device='cpu', overrides=SMALL, runs_root=self.runs)

    def test_same_seed_gives_identical_weights_and_another_seed_does_not(self):
        v3.run(self.data, 'b', CONFIG, 42, device='cpu', overrides=SMALL, runs_root=self.runs)
        v3.run(self.data, 'c', CONFIG, 43, device='cpu', overrides=SMALL, runs_root=self.runs)
        hashes = lambda name: [row['weights_sha256'] for row in self.log(name)]
        self.assertEqual(hashes('a'), hashes('b'))
        self.assertNotEqual(hashes('a'), hashes('c'))

    def test_changing_validation_grades_does_not_change_weights(self):
        other = Path(self.temp.name) / 'data-flipped'
        other.mkdir()
        for path in list(self.data.glob('*.jsonl')) + [self.data / 'train_grades.json']:
            content = path.read_text()
            if path.name == 'validation_pairs.jsonl':
                rows = [json.loads(line) for line in content.splitlines()]
                for row in rows:
                    row['relevance_score'] = 3 - row['relevance_score']
                content = ''.join(json.dumps(row) + '\n' for row in rows)
            (other / path.name).write_text(content)
        flipped = v3.run(other, 'flipped', CONFIG, 42, device='cpu', overrides=SMALL, runs_root=self.runs)
        self.assertEqual([row['weights_sha256'] for row in self.log('a')], [row['weights_sha256'] for row in self.log('flipped')])
        self.assertNotEqual([row['validation_loss'] for row in self.log('a')], [row['validation_loss'] for row in self.log('flipped')])
        last = lambda name: torch.load(self.runs / name / 'checkpoint_last.pt', weights_only=True)['state_dict']
        for key, value in last('a').items():
            self.assertTrue(torch.equal(value, last('flipped')[key]), key)
        self.assertNotEqual(flipped['data']['sha256']['validation_pairs.jsonl'], self.record['data']['sha256']['validation_pairs.jsonl'])

    def test_trainer_never_opens_a_test_file(self):
        opened, real_open, real_read_text, real_read_bytes = [], builtins.open, Path.read_text, Path.read_bytes

        def spy_open(file, *args, **kwargs):
            opened.append(str(file))
            return real_open(file, *args, **kwargs)

        def spy_text(path, *args, **kwargs):
            opened.append(str(path))
            return real_read_text(path, *args, **kwargs)

        def spy_bytes(path, *args, **kwargs):
            opened.append(str(path))
            return real_read_bytes(path, *args, **kwargs)

        builtins.open, Path.read_text, Path.read_bytes = spy_open, spy_text, spy_bytes
        try:
            v3.run(self.data, 'spy', {**CONFIG, 'pretrain': False}, 42, device='cpu', overrides=SMALL, runs_root=self.runs)
        finally:
            builtins.open, Path.read_text, Path.read_bytes = real_open, real_read_text, real_read_bytes
        names = {Path(name).name for name in opened}
        self.assertIn('train_pairs.jsonl', names)
        self.assertIn('validation_pairs.jsonl', names)
        self.assertFalse([name for name in names if 'test_' in name], 'no test split file may be opened')
        self.assertTrue((self.data / 'test_pairs.jsonl').exists(), 'the test files were there to be opened')
        with self.assertRaises(ValueError):
            v3.load_jsonl(self.data / 'test_pairs.jsonl')

    def test_save_and_reload_gives_identical_vectors(self):
        for name in ('checkpoint_last.pt', 'checkpoint_best.pt'):
            path = self.runs / 'a' / name
            if not path.exists():
                continue
            model, tokenizer, saved = v3.load_checkpoint(path)
            again, tokenizer_again, _ = v3.load_checkpoint(path)
            profiles = [{'headline': 'Zorbel 3 Planners', 'bio': 'My daily work.', 'skills': ['tool3x1'], 'industry': ''},
                        {'headline': '', 'bio': '', 'skills': [], 'industry': ''}]
            for query in (True, False):
                self.assertTrue(torch.equal(v3.embed_profiles(model, tokenizer, profiles, query),
                                            v3.embed_profiles(again, tokenizer_again, profiles, query)))
            self.assertEqual(saved['config'], CONFIG)
            self.assertEqual(tokenizer.payload, json.loads((self.runs / 'a' / 'tokenizer.json').read_text()))

    def test_test_split_stays_closed_without_a_committed_lock(self):
        run_dir = self.runs / 'a'
        with self.assertRaises(SystemExit) as refused:
            score_locked_test_v3.score(self.data, run_dir)
        self.assertIn('no LOCK.json', str(refused.exception))
        if (run_dir / 'checkpoint_best.pt').exists():
            lock = lock_v3.write_lock(self.data, run_dir)
            self.assertEqual(lock['model']['sha256'], lock_v3.sha256(run_dir / 'checkpoint_best.pt'))
            self.assertEqual(set(lock['data']['test_files']), {'test_profiles.jsonl', 'test_pairs.jsonl', 'test_queries.jsonl'})
            self.assertEqual(lock['protocol']['primary_metric'], 'ndcg5')
            with self.assertRaises(FileExistsError):
                lock_v3.write_lock(self.data, run_dir)
            with self.assertRaises(SystemExit) as refused:
                score_locked_test_v3.score(self.data, run_dir)
            self.assertIn('inside the repository', str(refused.exception), 'an uncommitted lock opens nothing')
        self.assertFalse((run_dir / 'test').exists())
        (run_dir / 'test').mkdir()
        with self.assertRaises(SystemExit) as refused:
            score_locked_test_v3.score(self.data, run_dir)
        self.assertIn('once only', str(refused.exception))
        (run_dir / 'test').rmdir()
        (run_dir / 'LOCK.json').unlink(missing_ok=True)

    def test_training_grades_must_agree_with_the_pair_file(self):
        other = Path(self.temp.name) / 'data-inconsistent'
        other.mkdir()
        for path in list(self.data.glob('*.jsonl')) + [self.data / 'train_grades.json']:
            (other / path.name).write_text(path.read_text())
        matrix = json.loads((other / 'train_grades.json').read_text())
        matrix['rows'] = [''.join('3' if digit == '0' else '0' for digit in row) for row in matrix['rows']]
        (other / 'train_grades.json').write_text(json.dumps(matrix))
        with self.assertRaises(ValueError):
            v3.run(other, 'inconsistent', CONFIG, 42, device='cpu', overrides=SMALL, runs_root=self.runs)

    def test_smaller_training_fraction_uses_fewer_pairs_and_same_validation(self):
        part = v3.run(self.data, 'part', {**CONFIG, 'pretrain': False}, 42, train_fraction=0.5, device='cpu',
                      overrides=SMALL, runs_root=self.runs)
        self.assertLess(part['data']['counts']['train_pairs'], self.record['data']['counts']['train_pairs'])
        self.assertEqual(part['data']['counts']['validation_mentees'], self.record['data']['counts']['validation_mentees'])

    def test_conv_encoder_trains(self):
        record = v3.run(self.data, 'conv', {'encoder': 'conv', 'width': 16, 'pretrain': False}, 42, device='cpu',
                        overrides=SMALL, runs_root=self.runs)
        self.assertIn(record['status'].split(':')[0], ('ok', 'collapsed'))


if __name__ == '__main__':
    unittest.main()
