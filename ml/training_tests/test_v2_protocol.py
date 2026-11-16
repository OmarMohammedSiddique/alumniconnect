"""Leakage and reproducibility checks shared by the v2 trainers, using invented profiles only."""
import builtins
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
import torch
import train_reweighted_tfidf
import train_scratch_v2
from ranker_features import fit_vectoriser
from train_gbdt_ranker import grouped_folds
from train_scratch_v2 import fit_vocabulary, fold_split, raw_features
from test_train_gbdt_ranker import fixture, write_data

TRAINERS = (('scratch_v2', train_scratch_v2), ('reweighted', train_reweighted_tfidf))


def shared_fixture():
    """Training pools where Mentors are shared between Mentees, as in the real data."""
    profiles, pairs = fixture('train', 8, 3)
    mentors = [p for p in profiles if p['role'] == 'mentor']
    for index, pair in enumerate(pairs):
        pair['mentor_id'] = mentors[(index * 5) % len(mentors)]['person_id']
    seen, unique = set(), []
    for pair in pairs:
        if (pair['mentee_id'], pair['mentor_id']) not in seen:
            seen.add((pair['mentee_id'], pair['mentor_id']))
            unique.append(pair)
    return profiles, unique


class FoldTests(unittest.TestCase):
    def test_held_out_mentees_and_their_mentors_never_reach_fitting(self):
        profiles, pairs = shared_fixture()
        for held_out in grouped_folds([p['mentee_id'] for p in pairs], 4, 42):
            fit_profiles, fit_pairs, held_profiles, held_pairs = fold_split(pairs, profiles, held_out)
            fit_ids = {p['person_id'] for p in fit_profiles}
            self.assertFalse(fit_ids & {p['person_id'] for p in held_profiles})
            self.assertFalse({p['mentor_id'] for p in fit_pairs} & {p['mentor_id'] for p in held_pairs})
            held_mentee = next(p for p in held_profiles if p['role'] == 'mentee')
            unique = {**held_mentee, 'headline': 'zzqqxx unique held out phrase'}
            vocabulary = fit_vocabulary([p if p['person_id'] != unique['person_id'] else unique for p in fit_profiles])
            self.assertNotIn('w:zzqqxx', vocabulary)


class RunProtocolTests(unittest.TestCase):
    def run_twice(self, module, change):
        outputs = []
        for variant in (False, True):
            with tempfile.TemporaryDirectory() as tmp:
                data = Path(tmp) / 'data'
                write_data(data)
                if variant:
                    change(data)
                runs = Path(tmp) / 'runs'
                summary = module.run(data, runs / 'out', runs_root=runs, seeds=(42,), allow_machine_labels=True)
                state = torch.load(runs / 'out' / 'model.pt', weights_only=False)['state_dict']
                outputs.append((summary, state))
        return outputs

    def test_validation_grades_never_change_selection_or_the_model(self):
        def scramble(data):
            path = data / 'validation_pairs.jsonl'
            rows = [json.loads(line) for line in path.read_text().splitlines()]
            for row in rows:
                row['relevance_score'] = 3 - row['relevance_score']
            path.write_text(''.join(json.dumps(row) + '\n' for row in rows))
        for name, module in TRAINERS:
            with self.subTest(name):
                (first, state_a), (second, state_b) = self.run_twice(module, scramble)
                self.assertEqual(first['chosen'], second['chosen'])
                self.assertEqual(first['selection'], second['selection'])
                for key in state_a:
                    self.assertTrue(torch.equal(state_a[key], state_b[key]), key)

    def test_runs_open_only_training_and_validation_files(self):
        allowed = {'train_profiles.jsonl', 'train_pairs.jsonl', 'validation_profiles.jsonl', 'validation_pairs.jsonl'}
        for name, module in TRAINERS:
            with self.subTest(name), tempfile.TemporaryDirectory() as tmp:
                data = Path(tmp) / 'data'
                write_data(data)
                (data / 'test_pairs.jsonl').write_text('never read\n')
                (data / 'test_profiles.jsonl').write_text('never read\n')
                opened = []
                real_open, real_io_open = builtins.open, io.open

                def spy(target, *args, _real=real_open, **kwargs):
                    opened.append(str(target))
                    return _real(target, *args, **kwargs)

                def io_spy(target, *args, **kwargs):
                    opened.append(str(target))
                    return real_io_open(target, *args, **kwargs)
                with mock.patch('builtins.open', spy), mock.patch('io.open', io_spy):
                    runs = Path(tmp) / 'runs'
                    module.run(data, runs / 'out', runs_root=runs, seeds=(42,), allow_machine_labels=True)
                data_reads = {Path(p).name for p in opened if str(data) in p}
                self.assertTrue(data_reads, 'the spy saw no data reads')
                self.assertLessEqual(data_reads, allowed)

    def test_same_seed_gives_identical_outputs(self):
        for name, module in TRAINERS:
            with self.subTest(name):
                (first, state_a), (second, state_b) = self.run_twice(module, lambda data: None)
                self.assertEqual(first['validation'], second['validation'])
                for key in state_a:
                    self.assertTrue(torch.equal(state_a[key], state_b[key]), key)


class ReloadTests(unittest.TestCase):
    def test_reweighted_checkpoint_reloads_with_its_preprocessing(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / 'data'
            write_data(data)
            runs = Path(tmp) / 'runs'
            train_reweighted_tfidf.run(data, runs / 'out', runs_root=runs, seeds=(42,), allow_machine_labels=True)
            saved = torch.load(runs / 'out' / 'model.pt', weights_only=False)
            from sklearn.feature_extraction.text import TfidfVectorizer
            profiles = [json.loads(line) for line in (data / 'train_profiles.jsonl').read_text().splitlines()]
            original = fit_vectoriser(profiles)
            rebuilt = TfidfVectorizer(analyzer='char', ngram_range=(3, 5), lowercase=True, vocabulary=saved['vocabulary'])
            rebuilt.idf_ = np.array(saved['idf'], dtype=np.float64)
            text = 'Pricing analyst with reserving experience'
            self.assertTrue(np.allclose(original.transform([text]).toarray(), rebuilt.transform([text]).toarray()))
            model = train_reweighted_tfidf.ReweightedTfidf(len(saved['vocabulary']))
            model.load_state_dict(saved['state_dict'])

    def test_empty_profiles_map_to_padding_not_a_real_feature(self):
        profiles, _ = fixture('train', 2, 2)
        vocabulary = fit_vocabulary(profiles)
        self.assertEqual(vocabulary['<PAD>'], 0)
        self.assertNotIn(0, train_scratch_v2.feature_ids(profiles[0], vocabulary))
        self.assertTrue(all(feature in vocabulary for feature in raw_features(profiles[0])))


if __name__ == '__main__':
    unittest.main()
