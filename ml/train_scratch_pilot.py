"""From-scratch character CNN pilot. Training/validation only; never final-test scoring."""
import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import random
import subprocess

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from sklearn.feature_extraction.text import TfidfVectorizer

INPUT_FIELDS = ('headline', 'bio', 'skills', 'industry')

def text(profile):
    """Whitelist text construction; IDs/rationales/ambiguity cannot enter inputs."""
    return '\n'.join(filter(None,[profile['headline'],profile['bio'],
        'Skills: '+', '.join(profile['skills']) if profile['skills'] else '',
        'Industry: '+profile['industry'] if profile['industry'] else '']))

def vocabulary(texts):
    return {'<PAD>':0,'<UNK>':1,**{c:i+2 for i,c in enumerate(sorted(set(''.join(texts).casefold())))}}

def encode(texts, vocab, length=512):
    result=torch.zeros((len(texts),length),dtype=torch.long)
    for i,s in enumerate(texts):
        ids=[vocab.get(c,1) for c in s.casefold()[:length]] or [1]
        result[i,:len(ids)]=torch.tensor(ids)
    return result

class Encoder(nn.Module):
    """Random character embeddings + convolution/max pooling; two directional heads."""
    def __init__(self, size):
        super().__init__()
        self.embedding=nn.Embedding(size,32,padding_idx=0)
        self.conv=nn.Conv1d(32,32,5,padding=2)
        self.query_head=nn.Linear(32,64)
        self.mentor_head=nn.Linear(32,64)
    def forward(self,x,query=False):
        z=self.embedding(x).transpose(1,2)
        z=F.relu(self.conv(z)).amax(dim=2)
        return F.normalize((self.query_head if query else self.mentor_head)(z),dim=1)

def ranking_metrics(rankings, labels, k=5):
    """Macro metrics on complete judged pools; zero ideal gain -> zero nDCG."""
    queries=sorted(labels)
    if set(rankings)!=set(labels):raise ValueError('Missing queries')
    rows=[]
    for q in queries:
        ranking=rankings[q]
        if len(ranking)!=len(labels[q]) or set(ranking)!=set(labels[q]):raise ValueError('Incomplete/duplicate candidate pool')
        grades=[labels[q][m] for m in ranking[:k]]
        dcg=sum((2**g-1)/math.log2(i+2) for i,g in enumerate(grades))
        ideal=sorted(labels[q].values(),reverse=True)[:k]
        idcg=sum((2**g-1)/math.log2(i+2) for i,g in enumerate(ideal))
        first=next((i+1 for i,g in enumerate(grades) if g>=2),None)
        rows.append({'query_id':q,'ndcg5':dcg/idcg if idcg else 0.,
            'p1':float(grades[0]>=2) if grades else 0.,'p3':sum(g>=2 for g in grades[:3])/3,
            'p5':sum(g>=2 for g in grades)/5,'mrr5':1/first if first else 0.,
            'hit5':float(first is not None)})
    return {'per_query':rows,'aggregate':{key:sum(r[key] for r in rows)/len(rows) for key in ['ndcg5','p1','p3','p5','mrr5','hit5']}}

def evaluate(profiles,pairs,score_matrix):
    queries=sorted(p['person_id'] for p in profiles if p['role']=='mentee')
    mentors=sorted(p['person_id'] for p in profiles if p['role']=='mentor')
    labels=defaultdict(dict)
    for p in pairs:labels[p['mentee_id']][p['mentor_id']]=p['relevance_score']
    rankings={q:sorted(mentors,key=lambda m:(-float(score_matrix[i,mentors.index(m)]),m)) for i,q in enumerate(queries)}
    result=ranking_metrics(rankings,labels)
    result['predictions']=[{'query_id':q,'mentor_id':m,'rank':rank+1,'score':float(score_matrix[i,mentors.index(m)]),'grade':labels[q][m]} for i,q in enumerate(queries) for rank,m in enumerate(rankings[q])]
    return result

def run(data_dir,output,epochs=10,seed=42,allow_machine_labels=False):
    if not allow_machine_labels:raise ValueError('Unreviewed pilot requires explicit allow_machine_labels=True')
    if epochs<1:raise ValueError('epochs must be positive')
    root=Path(data_dir);output=Path(output)
    if output.exists():raise FileExistsError('Choose a fresh run directory')
    manifest=json.loads((root/'manifest.json').read_text())
    def load(name):
        p=root/name
        if hashlib.sha256(p.read_bytes()).hexdigest()!=manifest['files'][name]:raise ValueError('Data hash mismatch: '+name)
        return [json.loads(x) for x in p.read_text().splitlines() if x.strip()]
    # Deliberately no test-profile or test-label loading here.
    train_profiles=load('train_profiles.jsonl');train_pairs=load('train_pairs.jsonl')
    val_profiles=load('validation_profiles.jsonl');val_pairs=load('validation_pairs.jsonl')
    for split,profiles,pairs in [('train',train_profiles,train_pairs),('validation',val_profiles,val_pairs)]:
        ids={p['person_id']:p for p in profiles}
        if len(ids)!=len(profiles) or not pairs:raise ValueError('Invalid/empty pool')
        for pair in pairs:
            if type(pair['relevance_score']) is not int or pair['relevance_score'] not in range(4):raise ValueError('Invalid grade')
            if pair['split']!=split:raise ValueError('Pair split mismatch')
            for key,role in [('mentee_id','mentee'),('mentor_id','mentor')]:
                if ids[pair[key]]['role']!=role or ids[pair[key]]['split']!=split:raise ValueError('Invalid reference')
    if {p['person_id'] for p in train_profiles}&{p['person_id'] for p in val_profiles}:raise ValueError('Split overlap')
    random.seed(seed);np.random.seed(seed);torch.manual_seed(seed)
    torch.set_num_threads(1);torch.use_deterministic_algorithms(True)
    device=torch.device('cpu')  # Tiny pilot: deterministic CPU execution, also in Colab.
    vocab=vocabulary([text(p) for p in train_profiles])
    model=Encoder(len(vocab)).to(device)
    initial={k:v.detach().clone() for k,v in model.state_dict().items()}
    lookup={p['person_id']:p for p in train_profiles+val_profiles}
    def tensors(pairs):
        return (encode([text(lookup[p['mentee_id']]) for p in pairs],vocab),
                encode([text(lookup[p['mentor_id']]) for p in pairs],vocab),
                torch.tensor([p['relevance_score']/3 for p in pairs],dtype=torch.float32))
    xq,xm,y=tensors(train_pairs);vq,vm,vy=tensors(val_pairs)
    output.mkdir(parents=True)
    vectoriser=TfidfVectorizer(analyzer='char',ngram_range=(3,5),lowercase=True)
    vectoriser.fit([text(p) for p in train_profiles])
    val_q=sorted((p for p in val_profiles if p['role']=='mentee'),key=lambda p:p['person_id'])
    val_m=sorted((p for p in val_profiles if p['role']=='mentor'),key=lambda p:p['person_id'])
    baseline_scores=(vectoriser.transform([text(p) for p in val_q])@vectoriser.transform([text(p) for p in val_m]).T).toarray()
    baseline=evaluate(val_profiles,val_pairs,baseline_scores)
    optimizer=torch.optim.Adam(model.parameters(),lr=1e-3)
    history=[];best=[];wait=0;best_loss=float('inf')
    for epoch in range(1,epochs+1):
        model.train();order=torch.randperm(len(y));total=0.
        for start in range(0,len(y),16):
            idx=order[start:start+16];optimizer.zero_grad()
            score=(model(xq[idx],True)*model(xm[idx],False)).sum(1)
            loss=F.mse_loss(score,y[idx]);loss.backward();optimizer.step();total+=float(loss.detach())*len(idx)
        model.eval()
        with torch.no_grad():val_loss=float(F.mse_loss((model(vq,True)*model(vm,False)).sum(1),vy))
        if not math.isfinite(val_loss):raise ValueError('Nonfinite loss')
        history.append({'epoch':epoch,'training_loss':total/len(y),'validation_loss':val_loss})
        path=output/f'checkpoint-{epoch}.pt'
        torch.save({'state_dict':model.state_dict(),'vocabulary':vocab,'max_length':512,'epoch':epoch,'validation_loss':val_loss},path)
        best.append((val_loss,epoch,path));best.sort(key=lambda item:(item[0],item[1]))
        if len(best)>3:best.pop()[2].unlink()
        if val_loss<best_loss-1e-6:best_loss=val_loss;wait=0
        else:wait+=1
        if wait>=3:break
    checkpoint=torch.load(best[0][2],map_location='cpu',weights_only=True)
    reloaded=Encoder(len(checkpoint['vocabulary']));reloaded.load_state_dict(checkpoint['state_dict']);reloaded.eval()
    with torch.no_grad():
        q=reloaded(encode([text(p) for p in val_q],vocab),True)
        m=reloaded(encode([text(p) for p in val_m],vocab),False)
        scores=(q@m.T).numpy()
    if not np.isfinite(scores).all():raise ValueError('Invalid reload output')
    delta=sum(float((model.state_dict()[k]-v).abs().sum()) for k,v in initial.items())
    if delta<=0:raise ValueError('Weights did not change')
    trained=evaluate(val_profiles,val_pairs,scores)
    try:commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    except subprocess.SubprocessError:commit='unknown'
    result={'engineering_pilot_only':True,'human_reviewed':False,'test_performance_accessed':False,
        'architecture':'random character Embedding(32) -> Conv1d(32,k5) -> max pool -> directional Linear(64) -> L2 normalize; cosine regression',
        'loss':'MSE against grade / 3; validation loss selects checkpoints','seed':seed,'epochs_requested':epochs,'epochs_completed':len(history),
        'batch_size':16,'learning_rate':.001,'patience':3,'max_length_characters':512,'device':str(device),'code_commit':commit,'implementation_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'python':platform.python_version(),'torch':torch.__version__,'vocabulary_size':len(vocab),
        'parameters':sum(p.numel() for p in model.parameters()),'weight_change_l1':delta,'reload_verified':True,
        'data_manifest_sha256':hashlib.sha256((root/'manifest.json').read_bytes()).hexdigest(),
        'best_checkpoint':best[0][2].name,'top_checkpoints':[{'file':p.name,'epoch':e,'validation_loss':v} for v,e,p in best],
        'baseline_validation':baseline['aggregate'],'neural_validation':trained['aggregate'],
        'caveat':'60 unreviewed training pairs and 5 validation queries; no adequacy, improvement or real-user suitability claim.'}
    (output/'implementation.py').write_bytes(Path(__file__).read_bytes())
    for name,value in [('run.json',result),('history.json',history),('baseline-validation.json',baseline),('neural-validation.json',trained),('vocabulary.json',vocab)]:
        (output/name).write_text(json.dumps(value,indent=2)+'\n')
    (output/'requirements-resolved.txt').write_text(subprocess.check_output([__import__('sys').executable,'-m','pip','freeze'],text=True))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,ax=plt.subplots(figsize=(7,4))
    for field,label in [('training_loss','Training (batch average)'),('validation_loss','Validation (epoch end)')]:
        ax.plot([r['epoch'] for r in history],[r[field] for r in history],label=label)
    ax.set(xlabel='Epoch',ylabel='MSE on grade / 3',title='Machine-labelled engineering pilot');ax.legend();fig.tight_layout();fig.savefig(output/'loss.png',dpi=150);plt.close(fig)
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('data_dir');parser.add_argument('output');parser.add_argument('--epochs',type=int,default=10);parser.add_argument('--allow-machine-labels',action='store_true');args=parser.parse_args()
    print(json.dumps(run(args.data_dir,args.output,args.epochs,allow_machine_labels=args.allow_machine_labels),indent=2))
