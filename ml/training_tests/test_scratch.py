import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import torch
from train_scratch_pilot import text,vocabulary,encode,Encoder,ranking_metrics,run

class ScratchTests(unittest.TestCase):
    def test_metadata_excluded(self):
        p={'headline':'goal','bio':'offer','skills':['skill'],'industry':'domain','relevance_score':3,'label_rationale':'SECRET','ambiguity_flag':True,'person_id':'PERSON'}
        result=text(p)
        self.assertNotIn('SECRET',result);self.assertNotIn('PERSON',result)
        self.assertEqual(result,'goal\noffer\nSkills: skill\nIndustry: domain')
    def test_unknown_characters_do_not_extend_vocabulary(self):
        v=vocabulary(['abc']);before=dict(v)
        self.assertEqual(encode(['z'],v,length=3).tolist(),[[1,0,0]])
        self.assertEqual(v,before)
    def test_perfect_and_zero_gain_metrics(self):
        r=ranking_metrics({'q':['m','n']},{'q':{'m':3,'n':0}})['aggregate']
        self.assertEqual(r['ndcg5'],1.);self.assertEqual(r['p5'],.2);self.assertEqual(r['mrr5'],1.)
        self.assertEqual(ranking_metrics({'q':['m']},{'q':{'m':0}})['aggregate']['ndcg5'],0.)
    def test_missing_candidate_not_compressed(self):
        with self.assertRaises(ValueError):ranking_metrics({'q':['m']},{'q':{'m':3,'n':0}})
    def test_machine_labels_require_explicit_opt_in(self):
        with self.assertRaises(ValueError):run('missing','missing')
    def test_random_encoder_gradients_and_vector_shape(self):
        torch.manual_seed(42);v=vocabulary(['abc def']);model=Encoder(len(v));x=encode(['abc','def'],v,length=32)
        q=model(x,True);m=model(x,False)
        self.assertEqual(tuple(q.shape),(2,64));self.assertTrue(torch.allclose(q.norm(dim=1),torch.ones(2),atol=1e-5))
        (q*m).sum().backward()
        self.assertTrue(torch.isfinite(model.embedding.weight.grad).all())
        self.assertGreater(float(model.embedding.weight.grad.abs().sum()),0)

if __name__=='__main__':unittest.main()
